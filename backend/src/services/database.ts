import { Pool } from "pg";
import { Artifact } from "./artifactIngestion";
import { PoWProfile } from "./scoringEngine";

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

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : false,
});

// Prevent unhandled pool errors from crashing the process
pool.on("error", (err) => {
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

      -- Migrations: add columns / relax constraints from older schema versions
      ALTER TABLE users ADD COLUMN IF NOT EXISTS github_id INTEGER;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP DEFAULT NOW();
      ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_artifact_hash TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS stacks_principal TEXT;
      ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS company_size TEXT;
      ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
      ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';

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

  async createRecruiter(email: string, passwordHash: string, companyName: string, companySize?: string): Promise<any> {
    const result = await pool.query(`
      INSERT INTO recruiters (email, password_hash, company_name, company_size)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, company_name, company_size, plan, created_at
    `, [email, passwordHash, companyName, companySize || null]);
    return result.rows[0];
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

  async getSavedPools(recruiterId: number): Promise<any[]> {
    const result = await pool.query(`
      SELECT sp.*, COUNT(pm.id) AS member_count
      FROM saved_pools sp
      LEFT JOIN pool_members pm ON pm.pool_id = sp.id
      WHERE sp.recruiter_id = $1
      GROUP BY sp.id
      ORDER BY sp.created_at DESC
    `, [recruiterId]);
    return result.rows;
  }

  async createSavedPool(recruiterId: number, name: string): Promise<any> {
    const result = await pool.query(
      "INSERT INTO saved_pools (recruiter_id, name) VALUES ($1, $2) RETURNING *",
      [recruiterId, name]
    );
    return result.rows[0];
  }

  async getPoolMembers(poolId: number): Promise<string[]> {
    const result = await pool.query(
      "SELECT developer_username FROM pool_members WHERE pool_id = $1 ORDER BY added_at DESC",
      [poolId]
    );
    return result.rows.map((r: any) => r.developer_username);
  }

  async addToPool(poolId: number, username: string): Promise<void> {
    await pool.query(
      "INSERT INTO pool_members (pool_id, developer_username) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [poolId, username]
    );
  }

  async removeFromPool(poolId: number, username: string): Promise<void> {
    await pool.query(
      "DELETE FROM pool_members WHERE pool_id = $1 AND developer_username = $2",
      [poolId, username]
    );
  }

  async deleteSavedPool(poolId: number, recruiterId: number): Promise<void> {
    await pool.query(
      "DELETE FROM saved_pools WHERE id = $1 AND recruiter_id = $2",
      [poolId, recruiterId]
    );
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
    skills?: string[];
    minScore?: number;
    maxScore?: number;
    activeWithinDays?: number;
    hasOnChainProof?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ developers: any[]; total: number }> {
    const { skills, minScore, maxScore, activeWithinDays, hasOnChainProof, page = 1, limit = 20 } = params;
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

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

    const countQuery = `SELECT COUNT(*) FROM (${query}) sub`;
    const [dataResult, countResult] = await Promise.all([
      pool.query(query + ` LIMIT $${idx} OFFSET $${idx + 1}`, [...values, limit, offset]),
      pool.query(countQuery, values),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);

    const developers = dataResult.rows
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

        return {
          username: row.username,
          topSkills,
          overallIndex: profile.overallIndex || 0,
          lastActive: row.last_analyzed,
          hasOnChainProof: row.has_on_chain_proof,
          proofCount: 0,
          artifactSummary: profile.artifactSummary || {},
        };
      })
      .filter(Boolean);

    return { developers, total };
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
}

export const dbService = new DatabaseService();
