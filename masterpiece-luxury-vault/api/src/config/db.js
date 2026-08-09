const { Pool } = require('pg');

// In production (RDS) this reads from env vars injected via Kubernetes Secrets.
// Locally, it reads from a .env file — see .env.example.
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'masterpiece_vault',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  // RDS requires SSL in production; disabled for local dev.
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 10,                      // max connections in the pool
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  // Prevents an idle client error from crashing the whole process —
  // important in production where a dropped connection shouldn't take down the pod.
  console.error('Unexpected error on idle database client', err);
});

module.exports = pool;
