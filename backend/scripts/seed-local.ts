import "dotenv/config";
import bcrypt from "bcrypt";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

const recruiters = [
  { email: "recruiter@contoso.test", company: "Contoso Labs", slug: "contoso-labs-1001" },
  { email: "hiring@acme.test", company: "Acme Systems", slug: "acme-systems-1002" },
];

const developers = [
  { username: "ada-lovelace", githubId: 910001, score: 94, skills: ["TypeScript", "React", "Systems Design"] },
  { username: "alan-turing", githubId: 910002, score: 88, skills: ["Python", "ML", "Backend"] },
  { username: "grace-hopper", githubId: 910003, score: 91, skills: ["Go", "Distributed Systems", "Kubernetes"] },
];

async function seedLocalData() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const passwordHash = await bcrypt.hash("Password123!", 10);
    const recruiterIds: number[] = [];

    for (const recruiter of recruiters) {
      const result = await client.query<{ id: number }>(
        `INSERT INTO recruiters (email, password_hash, company_name, company_size)
         VALUES ($1, $2, $3, '11-50')
         ON CONFLICT (email) DO UPDATE SET company_name = EXCLUDED.company_name
         RETURNING id`,
        [recruiter.email, passwordHash, recruiter.company],
      );
      recruiterIds.push(result.rows[0].id);
    }

    for (let index = 0; index < recruiters.length; index += 1) {
      const recruiter = recruiters[index];
      const recruiterId = recruiterIds[index];
      const organization = await client.query<{ id: number }>(
        `INSERT INTO organizations (slug, display_name, created_by_recruiter_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO UPDATE SET display_name = EXCLUDED.display_name
         RETURNING id`,
        [recruiter.slug, recruiter.company, recruiterId],
      );
      const organizationId = organization.rows[0].id;

      await client.query(
        `INSERT INTO organization_domains (organization_id, hostname, is_primary, verified_at)
         VALUES ($1, $2, true, NOW())
         ON CONFLICT (hostname) DO NOTHING`,
        [organizationId, `${recruiter.slug}.powr.dev`],
      );
      await client.query(
        `INSERT INTO organization_members (organization_id, recruiter_id, role, status)
         VALUES ($1, $2, 'owner', 'active')
         ON CONFLICT (organization_id, recruiter_id) DO NOTHING`,
        [organizationId, recruiterId],
      );

      const job = await client.query<{ id: number }>(
        `INSERT INTO jobs (recruiter_id, organization_id, title, company, location, salary, type, description, tags)
         SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9
         WHERE NOT EXISTS (SELECT 1 FROM jobs WHERE recruiter_id = $1 AND title = $3)
         RETURNING id`,
        [recruiterId, organizationId, index === 0 ? "Senior Full-Stack Engineer" : "Platform Engineer", recruiter.company, "Remote", "$120k-$160k", "full-time", "Build reliable products with a high-trust engineering team.", index === 0 ? ["TypeScript", "React", "PostgreSQL"] : ["Go", "Kubernetes", "AWS"]],
      );
      if (job.rowCount === 0) {
        await client.query("SELECT id FROM jobs WHERE recruiter_id = $1 AND title = $2", [recruiterId, index === 0 ? "Senior Full-Stack Engineer" : "Platform Engineer"]);
      }

      await client.query(
        `INSERT INTO saved_pools (recruiter_id, organization_id, name)
         SELECT $1, $2, 'Top Power Score Candidates'
         WHERE NOT EXISTS (SELECT 1 FROM saved_pools WHERE recruiter_id = $1 AND name = 'Top Power Score Candidates')`,
        [recruiterId, organizationId],
      );
    }

    for (const developer of developers) {
      await client.query(
        `INSERT INTO users (username, github_id, last_updated)
         VALUES ($1, $2, NOW())
         ON CONFLICT (username) DO UPDATE SET github_id = EXCLUDED.github_id, last_updated = NOW()`,
        [developer.username, developer.githubId],
      );
      await client.query(
        `INSERT INTO profiles (username, profile_data, artifacts_count, last_analyzed)
         VALUES ($1, $2, 12, NOW())
         ON CONFLICT (username) DO UPDATE SET profile_data = EXCLUDED.profile_data, artifacts_count = EXCLUDED.artifacts_count, last_analyzed = NOW()`,
        [developer.username, JSON.stringify({
          overallIndex: developer.score,
          skills: developer.skills.map((skill, index) => ({
            skill,
            score: Math.max(developer.score - index * 3, 70),
            percentile: Math.max(developer.score - index * 2, 70),
            confidence: 90,
            artifactCount: 12 - index,
          })),
          artifactSummary: { repos: 8, commits: 320, pullRequests: 74, mergedPRs: 61 },
          summary: "Power Score fixture profile for local recruiting workflows.",
          availability: "open",
        })],
      );
    }

    await client.query("COMMIT");
    console.log("Local seed complete. Recruiter password: Password123!");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedLocalData().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
