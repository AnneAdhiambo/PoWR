import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

async function validateTenantMigration() {
  const client = await pool.connect();
  try {
    const result = await client.query<{
      recruiters: string;
      organizations: string;
      members: string;
      jobs_without_organization: string;
      gigs_without_organization: string;
      pools_without_organization: string;
      talent_lists: string;
      talent_list_members: string;
      pools_without_talent_list: string;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM recruiters)::text AS recruiters,
        (SELECT COUNT(*) FROM organizations)::text AS organizations,
        (SELECT COUNT(*) FROM organization_members WHERE role = 'owner')::text AS members,
        (SELECT COUNT(*) FROM jobs WHERE organization_id IS NULL)::text AS jobs_without_organization,
        (SELECT COUNT(*) FROM gigs WHERE organization_id IS NULL)::text AS gigs_without_organization,
        (SELECT COUNT(*) FROM saved_pools WHERE organization_id IS NULL)::text AS pools_without_organization,
        (SELECT COUNT(*) FROM organization_talent_lists)::text AS talent_lists,
        (SELECT COUNT(*) FROM organization_talent_list_members)::text AS talent_list_members,
        (SELECT COUNT(*) FROM saved_pools p LEFT JOIN organization_talent_lists l ON l.source_saved_pool_id = p.id WHERE l.id IS NULL)::text AS pools_without_talent_list
    `);

    const counts = result.rows[0];
    const failures = [
      Number(counts.recruiters) !== Number(counts.organizations),
      Number(counts.recruiters) !== Number(counts.members),
      Number(counts.jobs_without_organization) !== 0,
      Number(counts.gigs_without_organization) !== 0,
      Number(counts.pools_without_organization) !== 0,
      Number(counts.pools_without_talent_list) !== 0,
    ];

    console.table(counts);
    if (failures.some(Boolean)) {
      throw new Error("Tenant migration validation failed");
    }

    console.log("Tenant migration validation passed");
  } finally {
    client.release();
    await pool.end();
  }
}

validateTenantMigration().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
