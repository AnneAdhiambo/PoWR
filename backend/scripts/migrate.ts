import "dotenv/config";
import { readFile } from "fs/promises";
import { readdir } from "fs/promises";
import { join, resolve } from "path";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMP DEFAULT NOW())");
    const directory = resolve(__dirname, "../migrations");
    const files = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();

    for (const file of files) {
      const version = file.replace(/\.sql$/, "");
      const applied = await client.query("SELECT 1 FROM schema_migrations WHERE version = $1", [version]);
      if (applied.rowCount) continue;

      await client.query("BEGIN");
      try {
        await client.query(await readFile(join(directory, file), "utf8"));
        await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [version]);
        await client.query("COMMIT");
        console.log(`Applied migration ${version}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
