import { Pool } from "pg";
import { Artifact } from "./artifactIngestion";
import { PoWProfile } from "./scoringEngine";

// Force IPv4 for WebSocket connections — WSL2 has unreachable IPv6 routes
// which cause Node.js happy-eyeballs to time out before falling back to IPv4
export interface Badge {
  id: number;
  username: string;
  tokenId: number | null;
  skillType: number;
  tier: number;
  transactionHash: string | null;
  stacksPrincipal: string | null;
  mintedAt: Date;
}

export interface GithubBadge {
  id: number;
  username: string;
  badgeKey: string;
  earnedAt: Date;
}

export function calculateJobMatch(
  developerSkills: string[],
  powrScore: number,
  requirements: { requiredSkills: string[]; preferredSkills: string[]; minimumPowrScore?: number | null }
) {
  const normalizedSkills = developerSkills.map((skill) => skill.toLowerCase());
  const requiredSkills = requirements.requiredSkills.map((skill) => skill.toLowerCase());
  const preferredSkills = requirements.preferredSkills.map((skill) => skill.toLowerCase());
  const matchedRequiredSkills = requiredSkills.filter((skill) => normalizedSkills.includes(skill));
  const matchedPreferredSkills = preferredSkills.filter((skill) => normalizedSkills.includes(skill));
  const missingRequiredSkills = requiredSkills.filter((skill) => !normalizedSkills.includes(skill));
  const requiredFit = requiredSkills.length ? matchedRequiredSkills.length / requiredSkills.length : 1;
  const preferredFit = preferredSkills.length ? matchedPreferredSkills.length / preferredSkills.length : 1;
  const scoreFit = requirements.minimumPowrScore
    ? Math.min(1, powrScore / requirements.minimumPowrScore)
    : powrScore / 100;

  return {
    jobMatchScore: Math.round((requiredFit * 0.6 + preferredFit * 0.2 + scoreFit * 0.2) * 100),
    explanation: {
      matchedRequiredSkills,
      missingRequiredSkills,
      matchedPreferredSkills,
      requiredSkillCoverage: Math.round(requiredFit * 100),
    },
  };
}

// Initialize PostgreSQL connection pool via Neon serverless WebSocket driver
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

// Prevent unhandled pool errors from crashing the process
pool.on("error", (err: Error) => {
  console.error("[DB] Pool error:", err.message);
});

// Initialize tables on startup
async function initializeTables() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        github_id INTEGER,
        access_token_encrypted TEXT,
        last_updated TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        username TEXT REFERENCES users(username),
        type TEXT,
        data JSONB,
        timestamp TEXT,
        repository_owner TEXT,
        repository_name TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS profiles (
        username TEXT PRIMARY KEY REFERENCES users(username),
        profile_data JSONB,
        artifacts_count INTEGER,
        last_analyzed TIMESTAMP,
        current_artifact_hash TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Migrations: safe for both fresh and existing databases
      DO $$ BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS github_id INTEGER;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP DEFAULT NOW();
        ALTER TABLE users ADD COLUMN IF NOT EXISTS stacks_principal TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS nostr_pubkey TEXT;
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_artifact_hash TEXT;
        -- Drop NOT NULL on legacy password column only if it exists
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'password'
        ) THEN
          ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
        END IF;
        -- Alter recruiters only if the table already exists (skip on fresh install)
        IF EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'recruiters'
        ) THEN
          ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS company_size TEXT;
          ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
          ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS nostr_pubkey TEXT;
          BEGIN
            ALTER TABLE recruiters ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';
          EXCEPTION WHEN duplicate_column THEN NULL;
          END;
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS blockchain_proofs (
        id SERIAL PRIMARY KEY,
        username TEXT REFERENCES users(username),
        transaction_hash TEXT UNIQUE,
        artifact_hash TEXT,
        block_number INTEGER,
        timestamp BIGINT,
        skill_scores JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS subscriptions (
        username TEXT PRIMARY KEY REFERENCES users(username),
        plan_type TEXT NOT NULL DEFAULT 'free',
        status TEXT NOT NULL DEFAULT 'active',
        payment_address TEXT,
        last_payment_tx_hash TEXT,
        next_update_date TIMESTAMP,
        webhook_secret TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS update_schedule (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL REFERENCES users(username),
        scheduled_date TIMESTAMP NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        plan_type TEXT NOT NULL,
        error TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS payment_transactions (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL REFERENCES users(username),
        tx_hash TEXT UNIQUE NOT NULL,
        amount TEXT NOT NULL,
        currency TEXT NOT NULL,
        plan_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        block_number INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS badges (
        id SERIAL PRIMARY KEY,
        username TEXT REFERENCES users(username),
        token_id INTEGER,
        skill_type INTEGER NOT NULL,
        tier INTEGER NOT NULL,
        transaction_hash TEXT,
        stacks_principal TEXT,
        minted_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS recruiters (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        company_name TEXT NOT NULL,
        company_size TEXT,
        plan TEXT NOT NULL DEFAULT 'free',
        created_at TIMESTAMP DEFAULT NOW(),
        last_login TIMESTAMP
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;

      CREATE TABLE IF NOT EXISTS recruiter_payment_intents (
        id SERIAL PRIMARY KEY,
        recruiter_id INTEGER NOT NULL REFERENCES recruiters(id),
        payment_hash TEXT UNIQUE NOT NULL,
        plan TEXT NOT NULL,
        amount_sats BIGINT NOT NULL,
        amount_usd NUMERIC(12,2) NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        confirmed_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS recruiter_views (
        id SERIAL PRIMARY KEY,
        recruiter_id INTEGER REFERENCES recruiters(id),
        developer_username TEXT NOT NULL,
        viewed_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS outreach (
        id SERIAL PRIMARY KEY,
        recruiter_id INTEGER REFERENCES recruiters(id),
        developer_username TEXT NOT NULL,
        message TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS saved_pools (
        id SERIAL PRIMARY KEY,
        recruiter_id INTEGER REFERENCES recruiters(id),
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS pool_members (
        id SERIAL PRIMARY KEY,
        pool_id INTEGER REFERENCES saved_pools(id) ON DELETE CASCADE,
        developer_username TEXT NOT NULL,
        added_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(pool_id, developer_username)
      );

      CREATE INDEX IF NOT EXISTS idx_recruiter_views_recruiter ON recruiter_views(recruiter_id);
      CREATE INDEX IF NOT EXISTS idx_recruiter_views_viewed_at ON recruiter_views(viewed_at);
      CREATE INDEX IF NOT EXISTS idx_outreach_recruiter ON outreach(recruiter_id);
      CREATE INDEX IF NOT EXISTS idx_saved_pools_recruiter ON saved_pools(recruiter_id);

      CREATE INDEX IF NOT EXISTS idx_artifacts_username ON artifacts(username);
      CREATE INDEX IF NOT EXISTS idx_artifacts_timestamp ON artifacts(timestamp);
      CREATE INDEX IF NOT EXISTS idx_proofs_username ON blockchain_proofs(username);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
      CREATE INDEX IF NOT EXISTS idx_update_schedule_date ON update_schedule(scheduled_date);
      CREATE INDEX IF NOT EXISTS idx_badges_username ON badges(username);

      CREATE TABLE IF NOT EXISTS github_badges (
        id SERIAL PRIMARY KEY,
        username TEXT REFERENCES users(username),
        badge_key TEXT NOT NULL,
        earned_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(username, badge_key)
      );

      CREATE INDEX IF NOT EXISTS idx_github_badges_username ON github_badges(username);

      CREATE TABLE IF NOT EXISTS jobs (
        id SERIAL PRIMARY KEY,
        recruiter_id INTEGER REFERENCES recruiters(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        location TEXT NOT NULL,
        salary TEXT,
        type TEXT NOT NULL DEFAULT 'full-time',
        description TEXT,
        tags TEXT[],
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
      CREATE INDEX IF NOT EXISTS idx_jobs_recruiter ON jobs(recruiter_id);

      CREATE TABLE IF NOT EXISTS job_applications (
        id SERIAL PRIMARY KEY,
        job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        developer_username TEXT NOT NULL,
        applicant_email TEXT NOT NULL,
        cover_note TEXT,
        consent_given BOOLEAN NOT NULL DEFAULT false,
        stage TEXT NOT NULL DEFAULT 'applied',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(job_id, developer_username)
      );
      CREATE INDEX IF NOT EXISTS idx_job_applications_job ON job_applications(job_id, stage);
      ALTER TABLE job_applications
        ADD COLUMN IF NOT EXISTS access_token UUID,
        ADD COLUMN IF NOT EXISTS screening_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS shared_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS consent_revoked_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMP;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_job_applications_access_token ON job_applications(access_token) WHERE access_token IS NOT NULL;

      CREATE TABLE IF NOT EXISTS job_application_events (
        id BIGSERIAL PRIMARY KEY,
        application_id INTEGER NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
        actor_type TEXT NOT NULL,
        actor_id TEXT,
        event_type TEXT NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_job_application_events_application ON job_application_events(application_id, created_at);

      CREATE TABLE IF NOT EXISTS job_application_scorecards (
        id SERIAL PRIMARY KEY,
        application_id INTEGER NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
        recruiter_id INTEGER NOT NULL REFERENCES recruiters(id) ON DELETE CASCADE,
        score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
        recommendation TEXT NOT NULL,
        feedback TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(application_id, recruiter_id)
      );

      CREATE TABLE IF NOT EXISTS job_application_notes (
        id SERIAL PRIMARY KEY,
        application_id INTEGER NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
        recruiter_id INTEGER NOT NULL REFERENCES recruiters(id) ON DELETE CASCADE,
        note TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_job_application_notes_application ON job_application_notes(application_id, created_at);

      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL,
        source_application_id INTEGER UNIQUE REFERENCES job_applications(id) ON DELETE SET NULL,
        developer_username TEXT NOT NULL,
        work_email TEXT NOT NULL,
        job_title TEXT NOT NULL,
        employment_status TEXT NOT NULL DEFAULT 'onboarding',
        start_date DATE,
        created_by_recruiter_id INTEGER REFERENCES recruiters(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_employees_organization_status ON employees(organization_id, employment_status);
      ALTER TABLE employees
        ADD COLUMN IF NOT EXISTS employment_type TEXT,
        ADD COLUMN IF NOT EXISTS department TEXT,
        ADD COLUMN IF NOT EXISTS manager_name TEXT,
        ADD COLUMN IF NOT EXISTS onboarding_notes TEXT;

      CREATE TABLE IF NOT EXISTS gigs (
        id SERIAL PRIMARY KEY,
        recruiter_id INTEGER REFERENCES recruiters(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        client TEXT NOT NULL,
        location TEXT NOT NULL,
        rate TEXT,
        duration TEXT,
        description TEXT,
        tags TEXT[],
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_gigs_status ON gigs(status);
      CREATE INDEX IF NOT EXISTS idx_gigs_recruiter ON gigs(recruiter_id);

      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        profile JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by_recruiter_id INTEGER UNIQUE REFERENCES recruiters(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT organizations_status_check CHECK (status IN ('pending', 'active', 'suspended', 'archived'))
      );

      CREATE TABLE IF NOT EXISTS organization_domains (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        hostname TEXT NOT NULL UNIQUE,
        kind TEXT NOT NULL DEFAULT 'powr_subdomain',
        verified_at TIMESTAMP,
        is_primary BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_organization_primary_domain
        ON organization_domains(organization_id) WHERE is_primary = true;

      CREATE TABLE IF NOT EXISTS organization_members (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        recruiter_id INTEGER NOT NULL REFERENCES recruiters(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'recruiter',
        status TEXT NOT NULL DEFAULT 'active',
        invited_by INTEGER REFERENCES recruiters(id),
        joined_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(organization_id, recruiter_id),
        CONSTRAINT organization_members_role_check CHECK (role IN ('owner', 'admin', 'recruiter', 'hiring_manager', 'interviewer')),
        CONSTRAINT organization_members_status_check CHECK (status IN ('invited', 'active', 'suspended', 'removed'))
      );

      CREATE INDEX IF NOT EXISTS idx_organization_members_recruiter
        ON organization_members(recruiter_id, status);

      CREATE TABLE IF NOT EXISTS organization_invitations (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'recruiter',
        token_hash TEXT NOT NULL UNIQUE,
        invited_by INTEGER NOT NULL REFERENCES recruiters(id),
        expires_at TIMESTAMP NOT NULL,
        accepted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT organization_invitations_role_check CHECK (role IN ('admin', 'recruiter', 'hiring_manager', 'interviewer'))
      );

      CREATE INDEX IF NOT EXISTS idx_organization_invitations_email
        ON organization_invitations(lower(email), accepted_at);

      CREATE TABLE IF NOT EXISTS audit_events (
        id BIGSERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        actor_recruiter_id INTEGER REFERENCES recruiters(id),
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_audit_events_organization_created
        ON audit_events(organization_id, created_at DESC);

      ALTER TABLE jobs
        ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
      ALTER TABLE jobs
        ADD COLUMN IF NOT EXISTS public_slug TEXT,
        ADD COLUMN IF NOT EXISTS department TEXT,
        ADD COLUMN IF NOT EXISTS remote_policy TEXT,
        ADD COLUMN IF NOT EXISTS seniority TEXT,
        ADD COLUMN IF NOT EXISTS closing_date DATE,
        ADD COLUMN IF NOT EXISTS screening_questions JSONB NOT NULL DEFAULT '[]'::jsonb;
      ALTER TABLE gigs
        ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
      ALTER TABLE saved_pools
        ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;

      CREATE INDEX IF NOT EXISTS idx_jobs_organization_status
        ON jobs(organization_id, status);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_organization_public_slug
        ON jobs(organization_id, public_slug) WHERE public_slug IS NOT NULL;
      UPDATE jobs
        SET public_slug = trim(BOTH '-' FROM lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g'))) || '-' || id::text
        WHERE public_slug IS NULL;
      CREATE INDEX IF NOT EXISTS idx_gigs_organization_status
        ON gigs(organization_id, status);
      CREATE INDEX IF NOT EXISTS idx_saved_pools_organization
        ON saved_pools(organization_id);

      INSERT INTO organizations (slug, display_name, created_by_recruiter_id)
      SELECT
        COALESCE(
          NULLIF(
            trim(BOTH '-' FROM lower(regexp_replace(company_name, '[^a-zA-Z0-9]+', '-', 'g'))),
            ''
          ),
          'company'
        ) || '-' || id::text,
        company_name,
        id
      FROM recruiters
      WHERE NOT EXISTS (
        SELECT 1
        FROM organizations existing
        WHERE existing.created_by_recruiter_id = recruiters.id
      );

      INSERT INTO organization_domains (organization_id, hostname, is_primary, verified_at)
      SELECT o.id, o.slug || '.powr.dev', true, NOW()
      FROM organizations o
      WHERE NOT EXISTS (
        SELECT 1
        FROM organization_domains d
        WHERE d.organization_id = o.id AND d.is_primary = true
      );

      INSERT INTO organization_members (organization_id, recruiter_id, role, status)
      SELECT o.id, o.created_by_recruiter_id, 'owner', 'active'
      FROM organizations o
      WHERE o.created_by_recruiter_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM organization_members m
          WHERE m.organization_id = o.id AND m.recruiter_id = o.created_by_recruiter_id
        );

      UPDATE jobs j
      SET organization_id = o.id
      FROM organizations o
      WHERE o.created_by_recruiter_id = j.recruiter_id
        AND j.organization_id IS NULL;

      UPDATE gigs g
      SET organization_id = o.id
      FROM organizations o
      WHERE o.created_by_recruiter_id = g.recruiter_id
        AND g.organization_id IS NULL;

      UPDATE saved_pools p
      SET organization_id = o.id
      FROM organizations o
      WHERE o.created_by_recruiter_id = p.recruiter_id
        AND p.organization_id IS NULL;

      INSERT INTO schema_migrations (version)
      VALUES ('recruiting_organizations_v1')
      ON CONFLICT (version) DO NOTHING;
    `);
    console.log("PostgreSQL tables initialized successfully");
  } catch (error) {
    console.error("Failed to initialize PostgreSQL tables:", error);
  } finally {
    client.release();
  }
}

// Initialize tables when module loads — retry on failure (e.g. cold Neon start)
function initializeTablesWithRetry(retries = 5, delayMs = 3000) {
  initializeTables().catch((err) => {
    console.error(`[DB] Table init failed (${retries} retries left):`, err.message);
    if (retries > 0) {
      setTimeout(() => initializeTablesWithRetry(retries - 1, delayMs), delayMs);
    }
  });
}
initializeTablesWithRetry();

export class DatabaseService {
  // User management
  async upsertUser(username: string, githubId: number, accessToken?: string, stacksPrincipal?: string) {
    await pool.query(`
      INSERT INTO users (username, github_id, access_token_encrypted, stacks_principal, last_updated)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT(username) DO UPDATE SET
        github_id = COALESCE($2, users.github_id),
        access_token_encrypted = COALESCE($3, users.access_token_encrypted),
        stacks_principal = COALESCE($4, users.stacks_principal),
        last_updated = NOW()
    `, [username, githubId, accessToken, stacksPrincipal || null]);
  }

  async getUser(username: string) {
    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );
    return result.rows[0] || null;
  }

  async updateStacksPrincipal(username: string, principal: string): Promise<void> {
    await pool.query(
      "UPDATE users SET stacks_principal = $2, last_updated = NOW() WHERE username = $1",
      [username, principal]
    );
  }

  async getUserStacksPrincipal(username: string): Promise<string | null> {
    const result = await pool.query(
      "SELECT stacks_principal FROM users WHERE username = $1",
      [username]
    );
    return result.rows[0]?.stacks_principal || null;
  }

  // Artifact management
  async saveArtifacts(username: string, artifacts: Artifact[]) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM artifacts WHERE username = $1", [username]);

      for (const artifact of artifacts) {
        await client.query(`
          INSERT INTO artifacts (id, username, type, data, timestamp, repository_owner, repository_name)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          artifact.id,
          username,
          artifact.type,
          JSON.stringify(artifact.data),
          artifact.timestamp,
          artifact.repository?.owner || null,
          artifact.repository?.name || null,
        ]);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getArtifacts(username: string, since?: Date): Promise<Artifact[]> {
    let query = "SELECT * FROM artifacts WHERE username = $1";
    const params: any[] = [username];

    if (since) {
      query += " AND timestamp >= $2";
      params.push(since.toISOString());
    }
    query += " ORDER BY timestamp DESC";

    const result = await pool.query(query, params);
    return result.rows.map((row) => ({
      type: row.type as "repo" | "commit" | "pull_request",
      id: row.id,
      data: row.data,
      timestamp: row.timestamp,
      repository: row.repository_owner && row.repository_name
        ? { owner: row.repository_owner, name: row.repository_name }
        : undefined,
    }));
  }

  // Profile management
  async saveProfile(username: string, profile: PoWProfile, artifactsCount: number, artifactHash?: string) {
    if (artifactHash) {
      await pool.query(`
        INSERT INTO profiles (username, profile_data, artifacts_count, current_artifact_hash, last_analyzed, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT(username) DO UPDATE SET
          profile_data = $2,
          artifacts_count = $3,
          current_artifact_hash = $4,
          last_analyzed = NOW(),
          updated_at = NOW()
      `, [username, JSON.stringify(profile), artifactsCount, artifactHash]);
    } else {
      await pool.query(`
        INSERT INTO profiles (username, profile_data, artifacts_count, last_analyzed, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT(username) DO UPDATE SET
          profile_data = $2,
          artifacts_count = $3,
          last_analyzed = NOW(),
          updated_at = NOW()
      `, [username, JSON.stringify(profile), artifactsCount]);
    }
  }

  async getProfile(username: string): Promise<PoWProfile | null> {
    const result = await pool.query(
      "SELECT * FROM profiles WHERE username = $1",
      [username]
    );
    if (!result.rows[0]) return null;
    return result.rows[0].profile_data;
  }

  async getProfileWithMeta(username: string): Promise<{
    profile: PoWProfile;
    lastAnalyzed: Date | null;
    artifactsCount: number;
    currentArtifactHash: string | null;
  } | null> {
    const result = await pool.query(
      "SELECT profile_data, last_analyzed, artifacts_count, current_artifact_hash FROM profiles WHERE username = $1",
      [username]
    );
    if (!result.rows[0]) return null;
    return {
      profile: result.rows[0].profile_data,
      lastAnalyzed: result.rows[0].last_analyzed ? new Date(result.rows[0].last_analyzed) : null,
      artifactsCount: result.rows[0].artifacts_count || 0,
      currentArtifactHash: result.rows[0].current_artifact_hash || null
    };
  }

  async shouldRefreshProfile(username: string, maxAgeHours: number = 24): Promise<boolean> {
    const result = await pool.query(
      "SELECT last_analyzed FROM profiles WHERE username = $1",
      [username]
    );
    if (!result.rows[0]?.last_analyzed) return true;
    const lastAnalyzed = new Date(result.rows[0].last_analyzed);
    const hoursSince = (Date.now() - lastAnalyzed.getTime()) / (1000 * 60 * 60);
    return hoursSince >= maxAgeHours;
  }

  // Blockchain proof management
  async saveBlockchainProof(
    username: string,
    transactionHash: string,
    artifactHash: string,
    blockNumber: number,
    timestamp: number,
    skillScores: number[]
  ) {
    await pool.query(`
      INSERT INTO blockchain_proofs (username, transaction_hash, artifact_hash, block_number, timestamp, skill_scores)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT(transaction_hash) DO NOTHING
    `, [username, transactionHash, artifactHash, blockNumber, timestamp, JSON.stringify(skillScores)]);
  }

  async getBlockchainProofs(username: string): Promise<any[]> {
    const result = await pool.query(
      "SELECT * FROM blockchain_proofs WHERE username = $1 ORDER BY timestamp DESC",
      [username]
    );
    return result.rows.map((row) => ({
      id: row.id,
      transactionHash: row.transaction_hash,
      artifactHash: row.artifact_hash,
      blockNumber: row.block_number,
      timestamp: row.timestamp,
      skillScores: row.skill_scores,
      createdAt: row.created_at,
    }));
  }

  async getLatestBlockchainProof(username: string): Promise<any | null> {
    const result = await pool.query(
      "SELECT * FROM blockchain_proofs WHERE username = $1 ORDER BY timestamp DESC LIMIT 1",
      [username]
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      transactionHash: row.transaction_hash,
      artifactHash: row.artifact_hash,
      blockNumber: row.block_number,
      timestamp: row.timestamp,
      skillScores: row.skill_scores,
      createdAt: row.created_at,
    };
  }

  // Subscription management
  async saveSubscription(username: string, subscription: any) {
    await pool.query(`
      INSERT INTO subscriptions (username, plan_type, status, payment_address, last_payment_tx_hash, next_update_date, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT(username) DO UPDATE SET
        plan_type = COALESCE($2, subscriptions.plan_type),
        status = COALESCE($3, subscriptions.status),
        payment_address = COALESCE($4, subscriptions.payment_address),
        last_payment_tx_hash = COALESCE($5, subscriptions.last_payment_tx_hash),
        next_update_date = COALESCE($6, subscriptions.next_update_date),
        updated_at = NOW()
    `, [
      username,
      subscription.plan_type || "free",
      subscription.status || "active",
      subscription.payment_address || null,
      subscription.last_payment_tx_hash || null,
      subscription.next_update_date || null,
    ]);
  }

  async createSubscription(username: string, planType: string, paymentAddress?: string, paymentTxHash?: string) {
    await this.saveSubscription(username, {
      plan_type: planType,
      status: "active",
      payment_address: paymentAddress,
      last_payment_tx_hash: paymentTxHash,
    });
  }

  async updateSubscription(username: string, updates: any) {
    const fields: string[] = [];
    const values: any[] = [username];
    let paramIndex = 2;

    if (updates.plan_type !== undefined) {
      fields.push(`plan_type = $${paramIndex++}`);
      values.push(updates.plan_type);
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.nextUpdateDate !== undefined) {
      fields.push(`next_update_date = $${paramIndex++}`);
      values.push(updates.nextUpdateDate);
    }
    if (updates.payment_address !== undefined) {
      fields.push(`payment_address = $${paramIndex++}`);
      values.push(updates.payment_address);
    }
    fields.push("updated_at = NOW()");

    if (fields.length > 1) {
      await pool.query(
        `UPDATE subscriptions SET ${fields.join(", ")} WHERE username = $1`,
        values
      );
    }
  }

  async cancelSubscription(username: string) {
    await pool.query(
      "UPDATE subscriptions SET status = 'cancelled', updated_at = NOW() WHERE username = $1",
      [username]
    );
  }

  async getSubscription(username: string): Promise<any | null> {
    const result = await pool.query(
      "SELECT * FROM subscriptions WHERE username = $1",
      [username]
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      username: row.username,
      planType: row.plan_type,
      status: row.status,
      paymentAddress: row.payment_address,
      lastPaymentTxHash: row.last_payment_tx_hash,
      nextUpdateDate: row.next_update_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateSubscriptionNextUpdate(username: string, nextUpdateDate: Date) {
    await pool.query(
      "UPDATE subscriptions SET next_update_date = $2, updated_at = NOW() WHERE username = $1",
      [username, nextUpdateDate]
    );
  }

  // Scheduled updates
  async scheduleUpdate(username: string, scheduledDate: Date, planType: string) {
    await pool.query(`
      INSERT INTO update_schedule (username, scheduled_date, status, plan_type)
      VALUES ($1, $2, 'pending', $3)
    `, [username, scheduledDate, planType]);
  }

  async getScheduledUpdates(beforeDate?: Date): Promise<any[]> {
    let query = "SELECT * FROM update_schedule WHERE status = 'pending'";
    const params: any[] = [];

    if (beforeDate) {
      query += " AND scheduled_date <= $1";
      params.push(beforeDate);
    }
    query += " ORDER BY scheduled_date ASC";

    const result = await pool.query(query, params);
    return result.rows.map((row) => ({
      id: row.id,
      username: row.username,
      scheduledDate: row.scheduled_date,
      status: row.status,
      planType: row.plan_type,
    }));
  }

  async getPendingUpdates(): Promise<any[]> {
    return this.getScheduledUpdates(new Date());
  }

  async markUpdateComplete(id: number) {
    await pool.query(
      "UPDATE update_schedule SET status = 'completed' WHERE id = $1",
      [id]
    );
  }

  async markScheduledUpdateComplete(id: number) {
    await this.markUpdateComplete(id);
  }

  async markUpdateFailed(id: number, error: string) {
    await pool.query(
      "UPDATE update_schedule SET status = 'failed', error = $2 WHERE id = $1",
      [id, error]
    );
  }

  async markScheduledUpdateFailed(id: number, error?: string) {
    await this.markUpdateFailed(id, error || "Unknown error");
  }

  // Payment management
  async savePaymentTransaction(
    username: string,
    txHash: string,
    amount: string,
    currency: string,
    planType: string,
    blockNumber?: number
  ) {
    await pool.query(`
      INSERT INTO payment_transactions (username, tx_hash, amount, currency, plan_type, block_number, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      ON CONFLICT(tx_hash) DO NOTHING
    `, [username, txHash, amount, currency, planType, blockNumber || null]);
  }

  async getPaymentTransaction(txHash: string): Promise<any | null> {
    const result = await pool.query(
      "SELECT * FROM payment_transactions WHERE tx_hash = $1",
      [txHash]
    );
    return result.rows[0] || null;
  }

  async updatePaymentStatus(txHash: string, status: string, blockNumber?: number) {
    await pool.query(
      "UPDATE payment_transactions SET status = $2, block_number = COALESCE($3, block_number) WHERE tx_hash = $1",
      [txHash, status, blockNumber]
    );
  }

  async updatePaymentTransactionStatus(txHash: string, status: string, blockNumber?: number) {
    await this.updatePaymentStatus(txHash, status, blockNumber);
  }

  async saveRecruiterPaymentIntent(recruiterId: number, paymentHash: string, plan: string, amountSats: number, amountUsd: number) {
    await pool.query(
      `INSERT INTO recruiter_payment_intents (recruiter_id, payment_hash, plan, amount_sats, amount_usd)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (payment_hash) DO NOTHING`,
      [recruiterId, paymentHash, plan, amountSats, amountUsd],
    );
  }

  async getRecruiterPaymentIntent(paymentHash: string): Promise<any | null> {
    const result = await pool.query("SELECT * FROM recruiter_payment_intents WHERE payment_hash = $1", [paymentHash]);
    return result.rows[0] || null;
  }

  async rotateDeveloperSession(username: string): Promise<number> {
    const result = await pool.query("UPDATE users SET session_version = session_version + 1 WHERE username = $1 RETURNING session_version", [username]);
    return Number(result.rows[0]?.session_version || 0);
  }

  async getDeveloperSessionVersion(username: string): Promise<number | null> {
    const result = await pool.query("SELECT session_version FROM users WHERE username = $1", [username]);
    return result.rowCount ? Number(result.rows[0].session_version) : null;
  }

  async confirmRecruiterPaymentIntent(paymentHash: string): Promise<any | null> {
    const result = await pool.query(
      `UPDATE recruiter_payment_intents
       SET status = 'confirmed', confirmed_at = NOW()
       WHERE payment_hash = $1 AND status = 'pending'
       RETURNING *`,
      [paymentHash],
    );
    return result.rows[0] || null;
  }

  // Badge management
  async saveBadge(
    username: string,
    tokenId: number | null,
    skillType: number,
    tier: number,
    txHash: string | null,
    stacksPrincipal: string | null
  ): Promise<void> {
    await pool.query(`
      INSERT INTO badges (username, token_id, skill_type, tier, transaction_hash, stacks_principal)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [username, tokenId, skillType, tier, txHash, stacksPrincipal]);
  }

  async getUserBadges(username: string): Promise<Badge[]> {
    const result = await pool.query(
      "SELECT * FROM badges WHERE username = $1 ORDER BY minted_at DESC",
      [username]
    );
    return result.rows.map((row) => ({
      id: row.id,
      username: row.username,
      tokenId: row.token_id,
      skillType: row.skill_type,
      tier: row.tier,
      transactionHash: row.transaction_hash,
      stacksPrincipal: row.stacks_principal,
      mintedAt: row.minted_at,
    }));
  }

  async saveGithubBadge(username: string, badgeKey: string): Promise<void> {
    await pool.query(
      `INSERT INTO github_badges (username, badge_key)
       VALUES ($1, $2)
       ON CONFLICT (username, badge_key) DO NOTHING`,
      [username, badgeKey]
    );
  }

  async getGithubBadges(username: string): Promise<GithubBadge[]> {
    const result = await pool.query(
      "SELECT * FROM github_badges WHERE username = $1 ORDER BY earned_at DESC",
      [username]
    );
    return result.rows.map((row) => ({
      id: row.id,
      username: row.username,
      badgeKey: row.badge_key,
      earnedAt: row.earned_at,
    }));
  }

  // Recruiter management
  async getRecruiterByEmail(email: string): Promise<any | null> {
    const result = await pool.query(
      "SELECT * FROM recruiters WHERE email = $1",
      [email]
    );
    return result.rows[0] || null;
  }

  async getRecruiterById(id: number): Promise<any | null> {
    const result = await pool.query(
      "SELECT id, email, company_name, company_size, plan, created_at, last_login FROM recruiters WHERE id = $1",
      [id]
    );
    return result.rows[0] || null;
  }

  async getOrganizationForRecruiter(recruiterId: number): Promise<{ organization_id: number; role: string } | null> {
    const result = await pool.query(
      `SELECT organization_id, role
       FROM organization_members
       WHERE recruiter_id = $1 AND status = 'active'
       ORDER BY CASE WHEN role = 'owner' THEN 0 ELSE 1 END
       LIMIT 1`,
      [recruiterId],
    );
    return result.rows[0] || null;
  }

  async rotateRecruiterSession(id: number): Promise<number> {
    const result = await pool.query("UPDATE recruiters SET session_version = session_version + 1 WHERE id = $1 RETURNING session_version", [id]);
    return Number(result.rows[0]?.session_version || 0);
  }

  async getRecruiterSessionVersion(id: number): Promise<number | null> {
    const result = await pool.query("SELECT session_version FROM recruiters WHERE id = $1", [id]);
    return result.rowCount ? Number(result.rows[0].session_version) : null;
  }

  async getOrganizationByHostname(hostname: string): Promise<any | null> {
    const result = await pool.query(
      `SELECT o.id, o.slug, o.display_name, o.status, o.profile,
              d.hostname, d.kind, d.is_primary
       FROM organization_domains d
       JOIN organizations o ON o.id = d.organization_id
       WHERE lower(d.hostname) = lower($1) AND o.status = 'active'
       LIMIT 1`,
      [hostname],
    );
    return result.rows[0] || null;
  }

  async getOrganizationById(organizationId: number): Promise<any | null> {
    const result = await pool.query(
      `SELECT o.*, d.hostname
       FROM organizations o
       LEFT JOIN organization_domains d ON d.organization_id = o.id AND d.is_primary = true
       WHERE o.id = $1`,
      [organizationId],
    );
    return result.rows[0] || null;
  }

  async updateOrganizationProfile(organizationId: number, displayName: string, profile: Record<string, unknown>): Promise<any> {
    const result = await pool.query(
      `UPDATE organizations
       SET display_name = $2, profile = COALESCE(profile, '{}'::jsonb) || $3::jsonb, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [organizationId, displayName, JSON.stringify(profile)],
    );
    return result.rows[0];
  }

  async recordAuditEvent(organizationId: number, actorRecruiterId: number, action: string, entityType: string, entityId?: string, metadata: Record<string, unknown> = {}): Promise<void> {
    await pool.query(
      `INSERT INTO audit_events (organization_id, actor_recruiter_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [organizationId, actorRecruiterId, action, entityType, entityId || null, JSON.stringify(metadata)],
    );
  }

  async createOrganizationInvitation(organizationId: number, invitedBy: number, email: string, role: string, tokenHash: string, expiresAt: Date): Promise<any> {
    const result = await pool.query(
      `INSERT INTO organization_invitations (organization_id, email, role, token_hash, invited_by, expires_at)
       VALUES ($1, lower($2), $3, $4, $5, $6) RETURNING id, organization_id, email, role, expires_at, created_at`,
      [organizationId, email, role, tokenHash, invitedBy, expiresAt],
    );
    return result.rows[0];
  }

  async getOrganizationMembers(organizationId: number): Promise<any[]> {
    const result = await pool.query(
      `SELECT m.id, m.recruiter_id, r.email, r.company_name, m.role, m.status, m.joined_at
       FROM organization_members m JOIN recruiters r ON r.id = m.recruiter_id
       WHERE m.organization_id = $1 ORDER BY m.joined_at ASC`,
      [organizationId],
    );
    return result.rows;
  }

  async updateOrganizationMember(organizationId: number, memberId: number, role: string): Promise<any | null> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query(
        `SELECT id, role, status FROM organization_members WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [memberId, organizationId],
      );
      if (!current.rowCount) { await client.query("ROLLBACK"); return null; }
      if (current.rows[0].role === "owner" && role !== "owner") {
        const owners = await client.query(
          `SELECT COUNT(*)::int AS count FROM organization_members WHERE organization_id = $1 AND role = 'owner' AND status = 'active'`,
          [organizationId],
        );
        if (owners.rows[0].count <= 1) throw new Error("The organization must retain an owner");
      }
      const updated = await client.query(
        `UPDATE organization_members SET role = $3 WHERE id = $1 AND organization_id = $2 RETURNING id, recruiter_id, role, status, joined_at`,
        [memberId, organizationId, role],
      );
      await client.query("COMMIT");
      return updated.rows[0] || null;
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }

  async removeOrganizationMember(organizationId: number, memberId: number): Promise<any | null> {
    const current = await pool.query(
      `SELECT id, role FROM organization_members WHERE id = $1 AND organization_id = $2`,
      [memberId, organizationId],
    );
    if (!current.rowCount) return null;
    if (current.rows[0].role === "owner") throw new Error("The organization owner cannot be removed");
    const removed = await pool.query(
      `UPDATE organization_members SET status = 'removed' WHERE id = $1 AND organization_id = $2 RETURNING id, recruiter_id, role, status`,
      [memberId, organizationId],
    );
    return removed.rows[0] || null;
  }

  async acceptOrganizationInvitation(tokenHash: string, recruiterId: number, email: string): Promise<any | null> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const invitation = await client.query(
        `SELECT * FROM organization_invitations
         WHERE token_hash = $1 AND lower(email) = lower($2) AND accepted_at IS NULL AND expires_at > NOW()
         FOR UPDATE`,
        [tokenHash, email],
      );
      if (!invitation.rowCount) { await client.query("ROLLBACK"); return null; }
      const row = invitation.rows[0];
      await client.query(
        `INSERT INTO organization_members (organization_id, recruiter_id, role, status, invited_by)
         VALUES ($1, $2, $3, 'active', $4)
         ON CONFLICT (organization_id, recruiter_id) DO UPDATE SET role = EXCLUDED.role, status = 'active'`,
        [row.organization_id, recruiterId, row.role, row.invited_by],
      );
      await client.query("UPDATE organization_invitations SET accepted_at = NOW() WHERE id = $1", [row.id]);
      await client.query("COMMIT");
      return row;
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }

  async createRecruiter(email: string, passwordHash: string, companyName: string, companySize?: string): Promise<any> {
    const result = await pool.query(`
      INSERT INTO recruiters (email, password_hash, company_name, company_size)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, company_name, company_size, plan, created_at, session_version
    `, [email, passwordHash, companyName, companySize || null]);
    return result.rows[0];
  }

  async ensureRecruiterOrganization(recruiterId: number, companyName: string): Promise<any> {
    const slugBase = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "company";
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const organization = await client.query(
        `INSERT INTO organizations (slug, display_name, created_by_recruiter_id)
         VALUES ($1 || '-' || $2::text, $3, $2)
         ON CONFLICT (created_by_recruiter_id) DO UPDATE SET display_name = EXCLUDED.display_name
         RETURNING *`,
        [slugBase, recruiterId, companyName],
      );
      const row = organization.rows[0];
      await client.query(
        `INSERT INTO organization_domains (organization_id, hostname, is_primary, verified_at)
         VALUES ($1, $2, true, NOW()) ON CONFLICT (hostname) DO NOTHING`,
        [row.id, `${row.slug}.powr.dev`],
      );
      await client.query(
        `INSERT INTO organization_members (organization_id, recruiter_id, role, status)
         VALUES ($1, $2, 'owner', 'active') ON CONFLICT (organization_id, recruiter_id) DO NOTHING`,
        [row.id, recruiterId],
      );
      await client.query("COMMIT");
      return row;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async updateRecruiterLastLogin(id: number): Promise<void> {
    await pool.query(
      "UPDATE recruiters SET last_login = NOW() WHERE id = $1",
      [id]
    );
  }

  async updateRecruiterPlan(id: number, plan: string): Promise<void> {
    await pool.query(
      "UPDATE recruiters SET plan = $2 WHERE id = $1",
      [id, plan]
    );
  }

  async getRecruiterViewCount(recruiterId: number, since: Date): Promise<number> {
    const result = await pool.query(
      "SELECT COUNT(DISTINCT developer_username) FROM recruiter_views WHERE recruiter_id = $1 AND viewed_at >= $2",
      [recruiterId, since]
    );
    return parseInt(result.rows[0].count, 10);
  }

  async logRecruiterView(recruiterId: number, developerUsername: string): Promise<void> {
    await pool.query(
      "INSERT INTO recruiter_views (recruiter_id, developer_username) VALUES ($1, $2)",
      [recruiterId, developerUsername]
    );
  }

  async getTalentLists(organizationId: number): Promise<any[]> {
    const result = await pool.query(`
      SELECT tl.*, COUNT(tlm.developer_username)::INTEGER AS member_count
      FROM organization_talent_lists tl
      LEFT JOIN organization_talent_list_members tlm ON tlm.talent_list_id = tl.id
      WHERE tl.organization_id = $1
      GROUP BY tl.id
      ORDER BY tl.created_at DESC
    `, [organizationId]);
    return result.rows;
  }

  async createTalentList(organizationId: number, recruiterId: number, name: string): Promise<any> {
    const result = await pool.query(
      `INSERT INTO organization_talent_lists (organization_id, name, created_by_recruiter_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [organizationId, name, recruiterId]
    );
    return result.rows[0];
  }

  async getTalentListMembers(organizationId: number, listId: number): Promise<any[] | null> {
    const result = await pool.query(
      `SELECT tlm.developer_username, tlm.added_at, tlm.source, tlm.match_snapshot_id
       FROM organization_talent_list_members tlm
       JOIN organization_talent_lists tl ON tl.id = tlm.talent_list_id
       WHERE tlm.talent_list_id = $1 AND tl.organization_id = $2
       ORDER BY tlm.added_at DESC`,
      [listId, organizationId]
    );
    const exists = await pool.query(
      "SELECT 1 FROM organization_talent_lists WHERE id = $1 AND organization_id = $2",
      [listId, organizationId]
    );
    return exists.rowCount ? result.rows : null;
  }

  async addTalentListMember(organizationId: number, listId: number, username: string, recruiterId: number): Promise<boolean> {
    const result = await pool.query(
      `INSERT INTO organization_talent_list_members
         (talent_list_id, developer_username, added_by_recruiter_id)
       SELECT tl.id, $3, $4
       FROM organization_talent_lists tl
       JOIN developer_recruiting_preferences pref ON pref.developer_username = $3
       WHERE tl.id = $1 AND tl.organization_id = $2 AND pref.discoverable = TRUE
       ON CONFLICT DO NOTHING
       RETURNING developer_username`,
      [listId, organizationId, username, recruiterId]
    );
    return Boolean(result.rowCount);
  }

  async removeTalentListMember(organizationId: number, listId: number, username: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM organization_talent_list_members tlm
       USING organization_talent_lists tl
       WHERE tlm.talent_list_id = tl.id
         AND tl.id = $1 AND tl.organization_id = $2
         AND tlm.developer_username = $3`,
      [listId, organizationId, username]
    );
    return Boolean(result.rowCount);
  }

  async deleteTalentList(organizationId: number, listId: number): Promise<boolean> {
    const result = await pool.query(
      "DELETE FROM organization_talent_lists WHERE id = $1 AND organization_id = $2",
      [listId, organizationId]
    );
    return Boolean(result.rowCount);
  }

  async canDiscoverDeveloper(username: string, requireContact = false): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1 FROM developer_recruiting_preferences
       WHERE developer_username = $1 AND discoverable = TRUE
         AND ($2::BOOLEAN = FALSE OR contactable = TRUE)`,
      [username, requireContact]
    );
    return Boolean(result.rowCount);
  }

  async createOutreach(recruiterId: number, developerUsername: string, message: string): Promise<any> {
    const result = await pool.query(`
      INSERT INTO outreach (recruiter_id, developer_username, message)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [recruiterId, developerUsername, message]);
    return result.rows[0];
  }

  async getOutreachCount(recruiterId: number, since: Date): Promise<number> {
    const result = await pool.query(
      "SELECT COUNT(*) FROM outreach WHERE recruiter_id = $1 AND created_at >= $2",
      [recruiterId, since]
    );
    return parseInt(result.rows[0].count, 10);
  }

  // Talent search for recruiters
  async searchDevelopers(params: {
    organizationId: number;
    recruiterId: number;
    jobId?: number;
    skills?: string[];
    minScore?: number;
    maxScore?: number;
    activeWithinDays?: number;
    hasOnChainProof?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ developers: any[]; total: number }> {
    const { organizationId, recruiterId, jobId, skills, minScore, maxScore, activeWithinDays, hasOnChainProof, page = 1, limit = 20 } = params;
    const conditions: string[] = [];
    const values: any[] = [];
    let requirements: any = null;

    if (jobId) {
      const requirementsResult = await pool.query(
        `SELECT j.id, COALESCE(r.required_skills, j.tags, '{}') AS required_skills,
                COALESCE(r.preferred_skills, '{}') AS preferred_skills,
                r.minimum_powr_score
         FROM jobs j
         LEFT JOIN job_sourcing_requirements r ON r.job_id = j.id
         WHERE j.id = $1 AND j.organization_id = $2`,
        [jobId, organizationId]
      );
      requirements = requirementsResult.rows[0];
      if (!requirements) return { developers: [], total: 0 };
    }

    // Base: must have a profile
    let query = `
      SELECT
        u.username,
        p.profile_data,
        p.last_analyzed,
        p.artifacts_count,
        EXISTS(SELECT 1 FROM blockchain_proofs bp WHERE bp.username = u.username) AS has_on_chain_proof,
        s.plan_type
      FROM users u
      JOIN profiles p ON p.username = u.username
      JOIN developer_recruiting_preferences pref
        ON pref.developer_username = u.username AND pref.discoverable = TRUE
      LEFT JOIN subscriptions s ON s.username = u.username
    `;

    if (activeWithinDays) {
      conditions.push(`p.last_analyzed >= NOW() - INTERVAL '${activeWithinDays} days'`);
    }

    if (hasOnChainProof === true) {
      conditions.push(`EXISTS(SELECT 1 FROM blockchain_proofs bp WHERE bp.username = u.username)`);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += ` ORDER BY p.last_analyzed DESC NULLS LAST`;

    const dataResult = await pool.query(query, values);
    const matchedDevelopers: any[] = dataResult.rows
      .map((row: any) => {
        const profile = row.profile_data;
        if (!profile) return null;

        const topSkills = (profile.skills || [])
          .sort((a: any, b: any) => b.score - a.score)
          .slice(0, 3);

        // Filter by score if needed
        if (minScore !== undefined && profile.overallIndex < minScore) return null;
        if (maxScore !== undefined && profile.overallIndex > maxScore) return null;

        // Filter by skills
        if (skills && skills.length > 0) {
          const devSkillNames = (profile.skills || []).map((s: any) => s.skill.toLowerCase());
          const hasAllSkills = skills.some((sk) => devSkillNames.includes(sk.toLowerCase()));
          if (!hasAllSkills) return null;
        }

        const powrScore = Math.max(0, Math.min(100, Math.round(profile.overallIndex || 0)));
        const match = calculateJobMatch(
          (profile.skills || []).map((item: any) => String(item.skill)),
          powrScore,
          {
            requiredSkills: requirements?.required_skills || [],
            preferredSkills: requirements?.preferred_skills || [],
            minimumPowrScore: requirements?.minimum_powr_score,
          }
        );

        return {
          username: row.username,
          topSkills,
          overallIndex: powrScore,
          powrScore,
          ...(jobId ? { jobMatchScore: match.jobMatchScore, matchExplanation: match.explanation } : {}),
          lastActive: row.last_analyzed,
          hasOnChainProof: row.has_on_chain_proof,
          proofCount: 0,
          artifactSummary: profile.artifactSummary || {},
        };
      })
      .filter(Boolean) as any[];

    const total = matchedDevelopers.length;
    const offset = (page - 1) * limit;
    const developers = matchedDevelopers.slice(offset, offset + limit);

    if (jobId) {
      for (const developer of developers) {
        const snapshot = await pool.query(
          `INSERT INTO sourcing_match_snapshots
             (organization_id, job_id, developer_username, powr_score, job_match_score, explanation, created_by_recruiter_id)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
           RETURNING id`,
          [organizationId, jobId, developer.username, developer.powrScore, developer.jobMatchScore, JSON.stringify(developer.matchExplanation), recruiterId]
        );
        developer.matchSnapshotId = snapshot.rows[0].id;
      }
    }

    return { developers, total };
  }

  async upsertJobSourcingRequirements(
    organizationId: number,
    jobId: number,
    recruiterId: number,
    data: { requiredSkills?: string[]; preferredSkills?: string[]; minimumPowrScore?: number | null }
  ): Promise<any | null> {
    const result = await pool.query(
      `INSERT INTO job_sourcing_requirements
         (job_id, organization_id, required_skills, preferred_skills, minimum_powr_score, updated_by_recruiter_id)
       SELECT j.id, j.organization_id, $3, $4, $5, $6
       FROM jobs j WHERE j.id = $1 AND j.organization_id = $2
       ON CONFLICT (job_id) DO UPDATE SET
         required_skills = EXCLUDED.required_skills,
         preferred_skills = EXCLUDED.preferred_skills,
         minimum_powr_score = EXCLUDED.minimum_powr_score,
         updated_by_recruiter_id = EXCLUDED.updated_by_recruiter_id,
         updated_at = NOW()
       RETURNING *`,
      [jobId, organizationId, data.requiredSkills || [], data.preferredSkills || [], data.minimumPowrScore ?? null, recruiterId]
    );
    return result.rows[0] || null;
  }

  async addSourcedCandidateToJob(
    organizationId: number,
    jobId: number,
    username: string,
    matchSnapshotId: number,
    recruiterId: number
  ): Promise<any | null> {
    const result = await pool.query(
      `INSERT INTO job_sourced_candidates
         (organization_id, job_id, developer_username, match_snapshot_id, sourced_by_recruiter_id)
       SELECT $1, j.id, s.developer_username, s.id, $5
       FROM jobs j
       JOIN sourcing_match_snapshots s ON s.id = $4
       JOIN developer_recruiting_preferences pref ON pref.developer_username = s.developer_username
       WHERE j.id = $2 AND j.organization_id = $1
         AND s.organization_id = $1 AND s.job_id = j.id
         AND s.developer_username = $3 AND pref.discoverable = TRUE
       ON CONFLICT (job_id, developer_username) DO UPDATE SET
         match_snapshot_id = EXCLUDED.match_snapshot_id,
         sourced_by_recruiter_id = EXCLUDED.sourced_by_recruiter_id,
         updated_at = NOW()
       RETURNING *`,
      [organizationId, jobId, username, matchSnapshotId, recruiterId]
    );
    return result.rows[0] || null;
  }

  // Cleanup
  async cleanupOldArtifacts(olderThanDays: number) {
    await pool.query(
      "DELETE FROM artifacts WHERE created_at < NOW() - INTERVAL '$1 days'",
      [olderThanDays]
    );
  }

  async cleanupOldProofs(olderThanDays: number) {
    await pool.query(
      "DELETE FROM blockchain_proofs WHERE created_at < NOW() - INTERVAL '$1 days'",
      [olderThanDays]
    );
  }

  // ── Jobs CRUD ──────────────────────────────────────────────────────────────
  async createJob(recruiterId: number, data: { title: string; company: string; location: string; salary?: string; type?: string; description?: string; tags?: string[]; department?: string; remote_policy?: string; seniority?: string; closing_date?: string; screening_questions?: string[]; status?: string }): Promise<any> {
    const result = await pool.query(`
      INSERT INTO jobs (recruiter_id, organization_id, title, company, location, salary, type, description, tags, department, remote_policy, seniority, closing_date, screening_questions, status)
      SELECT $1, organization_id, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::date, $13::jsonb, $14
      FROM organization_members
      WHERE recruiter_id = $1 AND status = 'active'
      ORDER BY CASE WHEN role = 'owner' THEN 0 ELSE 1 END
      LIMIT 1
      RETURNING *
    `, [recruiterId, data.title, data.company, data.location, data.salary || null, data.type || 'full-time', data.description || null, data.tags || [], data.department || null, data.remote_policy || null, data.seniority || null, data.closing_date || null, JSON.stringify(data.screening_questions || []), data.status || 'draft']);
    const job = result.rows[0];
    if (!job) return null;
    const slugBase = data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "job";
    const slugResult = await pool.query("UPDATE jobs SET public_slug = $2 WHERE id = $1 RETURNING *", [job.id, `${slugBase}-${job.id}`]);
    return slugResult.rows[0];
  }

  async getJobs(params?: { status?: string; limit?: number; offset?: number }): Promise<{ jobs: any[]; total: number }> {
    const { status = 'active', limit = 20, offset = 0 } = params || {};
    const [dataResult, countResult] = await Promise.all([
      pool.query("SELECT j.*, r.company_name AS recruiter_company FROM jobs j LEFT JOIN recruiters r ON r.id = j.recruiter_id JOIN organizations o ON o.id = j.organization_id WHERE j.status = $1 AND o.status = 'active' AND (j.closing_date IS NULL OR j.closing_date >= CURRENT_DATE) ORDER BY j.created_at DESC LIMIT $2 OFFSET $3", [status, limit, offset]),
      pool.query("SELECT COUNT(*) FROM jobs j JOIN organizations o ON o.id = j.organization_id WHERE j.status = $1 AND o.status = 'active' AND (j.closing_date IS NULL OR j.closing_date >= CURRENT_DATE)", [status]),
    ]);
    return { jobs: dataResult.rows, total: parseInt(countResult.rows[0].count, 10) };
  }

  async getOrganizationJobs(organizationId: number, params?: { status?: string; limit?: number; offset?: number }): Promise<{ jobs: any[]; total: number }> {
    const { status = "active", limit = 20, offset = 0 } = params || {};
    const [dataResult, countResult] = await Promise.all([
      pool.query("SELECT j.*, r.company_name AS recruiter_company FROM jobs j LEFT JOIN recruiters r ON r.id = j.recruiter_id JOIN organizations o ON o.id = j.organization_id WHERE j.organization_id = $1 AND j.status = $2 AND o.status = 'active' AND (j.closing_date IS NULL OR j.closing_date >= CURRENT_DATE) ORDER BY j.created_at DESC LIMIT $3 OFFSET $4", [organizationId, status, limit, offset]),
      pool.query("SELECT COUNT(*) FROM jobs j JOIN organizations o ON o.id = j.organization_id WHERE j.organization_id = $1 AND j.status = $2 AND o.status = 'active' AND (j.closing_date IS NULL OR j.closing_date >= CURRENT_DATE)", [organizationId, status]),
    ]);
    return { jobs: dataResult.rows, total: parseInt(countResult.rows[0].count, 10) };
  }

  async getJobsByRecruiter(recruiterId: number): Promise<any[]> {
    const result = await pool.query("SELECT j.* FROM jobs j JOIN organization_members m ON m.organization_id = j.organization_id WHERE m.recruiter_id = $1 AND m.status = 'active' ORDER BY j.created_at DESC", [recruiterId]);
    return result.rows;
  }

  async getJobByIdentifier(identifier: string): Promise<any | null> {
    const result = await pool.query("SELECT j.*, r.company_name AS recruiter_company, o.slug AS organization_slug FROM jobs j LEFT JOIN recruiters r ON r.id = j.recruiter_id JOIN organizations o ON o.id = j.organization_id WHERE (j.id::text = $1 OR j.public_slug = $1) AND j.status = 'active' AND o.status = 'active' AND (j.closing_date IS NULL OR j.closing_date >= CURRENT_DATE)", [identifier]);
    return result.rows[0] || null;
  }

  async getOrganizationJobByIdentifier(organizationId: number, identifier: string): Promise<any | null> {
    const result = await pool.query("SELECT j.*, r.company_name AS recruiter_company, o.slug AS organization_slug FROM jobs j LEFT JOIN recruiters r ON r.id = j.recruiter_id JOIN organizations o ON o.id = j.organization_id WHERE j.organization_id = $1 AND (j.id::text = $2 OR j.public_slug = $2) AND j.status = 'active' AND o.status = 'active' AND (j.closing_date IS NULL OR j.closing_date >= CURRENT_DATE)", [organizationId, identifier]);
    return result.rows[0] || null;
  }

  async createJobApplication(jobId: number, username: string, email: string, coverNote: string | undefined, consentGiven: boolean, accessToken: string, screeningAnswers: Record<string, string>, sharedEvidence: string[]): Promise<any> {
    const result = await pool.query(`INSERT INTO job_applications (job_id, developer_username, applicant_email, cover_note, consent_given, access_token, screening_answers, shared_evidence) SELECT j.id, $2, $3, $4, $5, $6::uuid, $7::jsonb, $8::jsonb FROM jobs j JOIN organizations o ON o.id = j.organization_id WHERE j.id = $1 AND j.status = 'active' AND o.status = 'active' AND (j.closing_date IS NULL OR j.closing_date >= CURRENT_DATE) RETURNING *`, [jobId, username, email, coverNote || null, consentGiven, accessToken, JSON.stringify(screeningAnswers || {}), JSON.stringify(sharedEvidence || [])]);
    const application = result.rows[0];
    if (application) await pool.query("INSERT INTO job_application_events (application_id, actor_type, actor_id, event_type) VALUES ($1, 'developer', $2, 'application.created')", [application.id, username]);
    return application;
  }

  async updateDeveloperApplication(accessToken: string, action: "withdraw" | "revoke_consent"): Promise<any | null> {
    const result = action === "withdraw"
      ? await pool.query("UPDATE job_applications SET stage = 'withdrawn', withdrawn_at = NOW(), updated_at = NOW() WHERE access_token = $1::uuid AND stage NOT IN ('hired', 'rejected', 'withdrawn') RETURNING *", [accessToken])
      : await pool.query("UPDATE job_applications SET consent_given = false, shared_evidence = '[]'::jsonb, consent_revoked_at = NOW(), updated_at = NOW() WHERE access_token = $1::uuid RETURNING *", [accessToken]);
    const application = result.rows[0];
    if (application) await pool.query("INSERT INTO job_application_events (application_id, actor_type, actor_id, event_type) VALUES ($1, 'developer', $2, $3)", [application.id, application.developer_username, action === "withdraw" ? "application.withdrawn" : "application.consent_revoked"]);
    return application || null;
  }

  async getOrganizationApplications(organizationId: number): Promise<any[]> {
    const result = await pool.query(
      `SELECT
         a.*,
         j.title AS job_title,
         j.company,
         COALESCE((p.profile_data->>'overallIndex')::int, 0) AS powr_score,
         COALESCE(p.profile_data->'skills', '[]'::jsonb) AS skills,
         COALESCE(p.profile_data->>'summary', '') AS profile_summary,
         COALESCE(p.profile_data->>'availability', '') AS availability,
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
             'id', n.id,
             'note', n.note,
             'created_at', n.created_at,
             'recruiter_email', r.email
           ) ORDER BY n.created_at DESC)
           FROM job_application_notes n
           JOIN recruiters r ON r.id = n.recruiter_id
           WHERE n.application_id = a.id
         ), '[]'::jsonb) AS notes,
         COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.updated_at DESC) FROM job_application_scorecards s WHERE s.application_id = a.id), '[]'::jsonb) AS scorecards,
         COALESCE((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC) FROM job_application_events e WHERE e.application_id = a.id), '[]'::jsonb) AS events
       FROM job_applications a
       JOIN jobs j ON j.id = a.job_id
       LEFT JOIN profiles p ON p.username = a.developer_username
       WHERE j.organization_id = $1
       ORDER BY a.created_at DESC`,
      [organizationId],
    );
    return result.rows;
  }

  async updateApplicationStage(organizationId: number, applicationId: number, stage: string): Promise<any | null> {
    const result = await pool.query(`UPDATE job_applications a SET stage = $3, updated_at = NOW() FROM jobs j WHERE a.job_id = j.id AND a.id = $1 AND j.organization_id = $2 RETURNING a.*`, [applicationId, organizationId, stage]);
    return result.rows[0] || null;
  }

  async addApplicationEvent(applicationId: number, actorId: string, eventType: string, metadata: Record<string, unknown> = {}): Promise<void> {
    await pool.query("INSERT INTO job_application_events (application_id, actor_type, actor_id, event_type, metadata) VALUES ($1, 'recruiter', $2, $3, $4::jsonb)", [applicationId, actorId, eventType, JSON.stringify(metadata)]);
  }

  async upsertApplicationScorecard(organizationId: number, applicationId: number, recruiterId: number, score: number, recommendation: string, feedback?: string): Promise<any | null> {
    const result = await pool.query(`
      INSERT INTO job_application_scorecards (application_id, recruiter_id, score, recommendation, feedback)
      SELECT a.id, $3, $4, $5, $6 FROM job_applications a JOIN jobs j ON j.id = a.job_id
      WHERE a.id = $1 AND j.organization_id = $2
      ON CONFLICT (application_id, recruiter_id) DO UPDATE SET score = EXCLUDED.score, recommendation = EXCLUDED.recommendation, feedback = EXCLUDED.feedback, updated_at = NOW()
      RETURNING *
    `, [applicationId, organizationId, recruiterId, score, recommendation, feedback || null]);
    return result.rows[0] || null;
  }

  async addApplicationNote(organizationId: number, applicationId: number, recruiterId: number, note: string): Promise<any | null> {
    const result = await pool.query(
      `INSERT INTO job_application_notes (application_id, recruiter_id, note)
       SELECT a.id, $3, $4
       FROM job_applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.id = $1 AND j.organization_id = $2
       RETURNING *`,
      [applicationId, organizationId, recruiterId, note],
    );
    return result.rows[0] || null;
  }

  async createEmployeeFromApplication(organizationId: number, applicationId: number, recruiterId: number, data: { startDate?: string; employmentType?: string; department?: string; managerName?: string; onboardingNotes?: string }): Promise<any | null> {
    const result = await pool.query(
      `INSERT INTO employees (
         organization_id,
         source_application_id,
         developer_username,
         work_email,
         job_title,
         start_date,
         employment_type,
         department,
         manager_name,
         onboarding_notes,
         created_by_recruiter_id
       )
       SELECT
         j.organization_id,
         a.id,
         a.developer_username,
         a.applicant_email,
         j.title,
         $4::date,
         $5,
         $6,
         $7,
         $8,
         $3
       FROM job_applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.id = $1 AND j.organization_id = $2 AND a.stage = 'hired'
       ON CONFLICT (source_application_id) DO NOTHING
       RETURNING *`,
      [applicationId, organizationId, recruiterId, data.startDate || null, data.employmentType || null, data.department || null, data.managerName || null, data.onboardingNotes || null],
    );
    return result.rows[0] || null;
  }

  async getOrganizationEmployees(organizationId: number): Promise<any[]> {
    const result = await pool.query(
      `SELECT e.*, COALESCE((p.profile_data->>'overallIndex')::int, 0) AS powr_score
       FROM employees e
       LEFT JOIN profiles p ON p.username = e.developer_username
       WHERE e.organization_id = $1
       ORDER BY e.created_at DESC`,
      [organizationId],
    );
    return result.rows;
  }

  async updateOrganizationEmployee(organizationId: number, employeeId: number, data: { employmentStatus?: string; startDate?: string; employmentType?: string; department?: string; managerName?: string; onboardingNotes?: string }): Promise<any | null> {
    const result = await pool.query(`
      UPDATE employees SET
        employment_status = COALESCE($3, employment_status),
        start_date = COALESCE($4::date, start_date),
        employment_type = COALESCE($5, employment_type),
        department = COALESCE($6, department),
        manager_name = COALESCE($7, manager_name),
        onboarding_notes = COALESCE($8, onboarding_notes),
        updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING *
    `, [employeeId, organizationId, data.employmentStatus || null, data.startDate || null, data.employmentType || null, data.department || null, data.managerName || null, data.onboardingNotes || null]);
    return result.rows[0] || null;
  }

  async updateJob(id: number, recruiterId: number, data: Partial<{ title: string; company: string; location: string; salary: string; type: string; description: string; tags: string[]; status: string; department: string; remote_policy: string; seniority: string; closing_date: string; screening_questions: string[] }>): Promise<any> {
    const fields: string[] = [];
    const values: any[] = [id, recruiterId];
    let idx = 3;
    if (data.title !== undefined) { fields.push(`title = $${idx++}`); values.push(data.title); }
    if (data.company !== undefined) { fields.push(`company = $${idx++}`); values.push(data.company); }
    if (data.location !== undefined) { fields.push(`location = $${idx++}`); values.push(data.location); }
    if (data.salary !== undefined) { fields.push(`salary = $${idx++}`); values.push(data.salary); }
    if (data.type !== undefined) { fields.push(`type = $${idx++}`); values.push(data.type); }
    if (data.description !== undefined) { fields.push(`description = $${idx++}`); values.push(data.description); }
    if (data.tags !== undefined) { fields.push(`tags = $${idx++}`); values.push(data.tags); }
    if (data.department !== undefined) { fields.push(`department = $${idx++}`); values.push(data.department || null); }
    if (data.remote_policy !== undefined) { fields.push(`remote_policy = $${idx++}`); values.push(data.remote_policy || null); }
    if (data.seniority !== undefined) { fields.push(`seniority = $${idx++}`); values.push(data.seniority || null); }
    if (data.closing_date !== undefined) { fields.push(`closing_date = $${idx++}::date`); values.push(data.closing_date || null); }
    if (data.screening_questions !== undefined) { fields.push(`screening_questions = $${idx++}::jsonb`); values.push(JSON.stringify(data.screening_questions)); }
    if (data.status !== undefined) { fields.push(`status = $${idx++}`); values.push(data.status); }
    fields.push('updated_at = NOW()');
    const result = await pool.query(`UPDATE jobs SET ${fields.join(', ')} WHERE id = $1 AND organization_id IN (SELECT organization_id FROM organization_members WHERE recruiter_id = $2 AND status = 'active') RETURNING *`, values);
    return result.rows[0] || null;
  }

  async duplicateJob(id: number, recruiterId: number): Promise<any | null> {
    const result = await pool.query(`
      INSERT INTO jobs (recruiter_id, organization_id, title, company, location, salary, type, description, tags, status, department, remote_policy, seniority, closing_date, screening_questions)
      SELECT $2, j.organization_id, j.title || ' (Copy)', j.company, j.location, j.salary, j.type, j.description, j.tags, 'draft', j.department, j.remote_policy, j.seniority, j.closing_date, j.screening_questions
      FROM jobs j
      WHERE j.id = $1 AND j.organization_id IN (SELECT organization_id FROM organization_members WHERE recruiter_id = $2 AND status = 'active')
      RETURNING *
    `, [id, recruiterId]);
    const job = result.rows[0];
    if (!job) return null;
    const slugBase = job.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "job";
    const slugResult = await pool.query("UPDATE jobs SET public_slug = $2 WHERE id = $1 RETURNING *", [job.id, `${slugBase}-${job.id}`]);
    return slugResult.rows[0];
  }

  async deleteJob(id: number, organizationId: number): Promise<boolean> {
    const result = await pool.query(
      "DELETE FROM jobs WHERE id = $1 AND organization_id = $2",
      [id, organizationId]
    );
    return Boolean(result.rowCount);
  }

  // ── Gigs CRUD ──────────────────────────────────────────────────────────────
  async createGig(recruiterId: number, data: { title: string; client: string; location: string; rate?: string; duration?: string; description?: string; tags?: string[] }): Promise<any> {
    const result = await pool.query(`
      INSERT INTO gigs (recruiter_id, organization_id, title, client, location, rate, duration, description, tags)
      SELECT $1, organization_id, $2, $3, $4, $5, $6, $7, $8
      FROM organization_members
      WHERE recruiter_id = $1 AND status = 'active'
      ORDER BY CASE WHEN role = 'owner' THEN 0 ELSE 1 END
      LIMIT 1
      RETURNING *
    `, [recruiterId, data.title, data.client, data.location, data.rate || null, data.duration || null, data.description || null, data.tags || []]);
    return result.rows[0];
  }

  async getGigs(params?: { status?: string; limit?: number; offset?: number }): Promise<{ gigs: any[]; total: number }> {
    const { status = 'active', limit = 20, offset = 0 } = params || {};
    const [dataResult, countResult] = await Promise.all([
      pool.query('SELECT g.*, r.company_name AS recruiter_company FROM gigs g LEFT JOIN recruiters r ON r.id = g.recruiter_id WHERE g.status = $1 ORDER BY g.created_at DESC LIMIT $2 OFFSET $3', [status, limit, offset]),
      pool.query('SELECT COUNT(*) FROM gigs WHERE status = $1', [status]),
    ]);
    return { gigs: dataResult.rows, total: parseInt(countResult.rows[0].count, 10) };
  }

  async getGigsByRecruiter(recruiterId: number): Promise<any[]> {
    const result = await pool.query('SELECT * FROM gigs WHERE recruiter_id = $1 ORDER BY created_at DESC', [recruiterId]);
    return result.rows;
  }

  async getGigById(id: number): Promise<any | null> {
    const result = await pool.query('SELECT g.*, r.company_name AS recruiter_company FROM gigs g LEFT JOIN recruiters r ON r.id = g.recruiter_id WHERE g.id = $1', [id]);
    return result.rows[0] || null;
  }

  async updateGig(id: number, recruiterId: number, data: Partial<{ title: string; client: string; location: string; rate: string; duration: string; description: string; tags: string[]; status: string }>): Promise<any> {
    const fields: string[] = [];
    const values: any[] = [id, recruiterId];
    let idx = 3;
    if (data.title !== undefined) { fields.push(`title = $${idx++}`); values.push(data.title); }
    if (data.client !== undefined) { fields.push(`client = $${idx++}`); values.push(data.client); }
    if (data.location !== undefined) { fields.push(`location = $${idx++}`); values.push(data.location); }
    if (data.rate !== undefined) { fields.push(`rate = $${idx++}`); values.push(data.rate); }
    if (data.duration !== undefined) { fields.push(`duration = $${idx++}`); values.push(data.duration); }
    if (data.description !== undefined) { fields.push(`description = $${idx++}`); values.push(data.description); }
    if (data.tags !== undefined) { fields.push(`tags = $${idx++}`); values.push(data.tags); }
    if (data.status !== undefined) { fields.push(`status = $${idx++}`); values.push(data.status); }
    fields.push('updated_at = NOW()');
    const result = await pool.query(`UPDATE gigs SET ${fields.join(', ')} WHERE id = $1 AND recruiter_id = $2 RETURNING *`, values);
    return result.rows[0] || null;
  }

  async deleteGig(id: number, recruiterId: number): Promise<void> {
    await pool.query('DELETE FROM gigs WHERE id = $1 AND recruiter_id = $2', [id, recruiterId]);
  }

  // ── Nostr pubkey helpers ───────────────────────────────────────────────────
  async updateUserNostrPubkey(username: string, pubkey: string): Promise<void> {
    await pool.query('UPDATE users SET nostr_pubkey = $2, last_updated = NOW() WHERE username = $1', [username, pubkey]);
  }

  async getUserNostrPubkey(username: string): Promise<string | null> {
    const result = await pool.query('SELECT nostr_pubkey FROM users WHERE username = $1', [username]);
    return result.rows[0]?.nostr_pubkey || null;
  }

  async updateRecruiterNostrPubkey(recruiterId: number, pubkey: string): Promise<void> {
    await pool.query('UPDATE recruiters SET nostr_pubkey = $2 WHERE id = $1', [recruiterId, pubkey]);
  }
}

export const dbService = new DatabaseService();
