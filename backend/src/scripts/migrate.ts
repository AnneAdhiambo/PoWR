import "dotenv/config";
import { readFile, readdir } from "fs/promises";
import { join, resolve } from "path";
import { Pool } from "pg";
import { closeDatabasePool, initializeTables } from "../services/database";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run database migrations.");
}

if (!/^postgres(?:ql)?:\/\//i.test(connectionString)) {
  throw new Error("DATABASE_URL must be a PostgreSQL connection string.");
}

const migrationPool = new Pool({
  connectionString,
  ssl: connectionString.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

async function migrate() {
  const client = await migrationPool.connect();
  let lockAcquired = false;

  try {
    await client.query("SELECT pg_advisory_lock(hashtext('powr_schema_migrations'))");
    lockAcquired = true;

    // Creates the idempotent base schema required by numbered migrations.
    await initializeTables();

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const directory = resolve(process.cwd(), "migrations");
    const files = (await readdir(directory))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const version = file.replace(/\.sql$/, "");
      const applied = await client.query(
        "SELECT 1 FROM schema_migrations WHERE version = $1",
        [version],
      );

      if (applied.rowCount) {
        console.log(`Already applied ${version}`);
        continue;
      }

      await client.query("BEGIN");
      try {
        await client.query(await readFile(join(directory, file), "utf8"));
        await client.query(
          "INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING",
          [version],
        );
        await client.query("COMMIT");
        console.log(`Applied migration ${version}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    console.log("Database schema is ready.");
  } finally {
    if (lockAcquired) {
      await client.query("SELECT pg_advisory_unlock(hashtext('powr_schema_migrations'))");
    }
    client.release();
    await Promise.all([migrationPool.end(), closeDatabasePool()]);
  }
}

migrate().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Database migration failed: ${message}`);
  process.exitCode = 1;
});
