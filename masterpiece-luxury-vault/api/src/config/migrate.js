// Simple migration runner — reads .sql files from /migrations in order
// and applies any that haven't run yet, tracked in a migrations_log table.
// This is intentionally minimal (no rollback support) — good enough for
// this project's purposes; production systems typically use a tool like
// node-pg-migrate or Flyway once things get more complex.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations_log (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function getAppliedMigrations() {
  const result = await pool.query('SELECT filename FROM migrations_log');
  return new Set(result.rows.map((r) => r.filename));
}

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '..', '..', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip (already applied): ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`applying: ${file}`);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO migrations_log (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`applied: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`failed: ${file}`, err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log('all migrations up to date.');
  await pool.end();
}

runMigrations().catch((err) => {
  console.error('migration run failed:', err);
  process.exit(1);
});
