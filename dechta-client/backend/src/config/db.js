'use strict';

require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set!');
  process.exit(1);
}

// Enable SSL when DB_SSL=true or in production (required for GCP Cloud SQL)
const useSSL = process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  statement_timeout: 30000,
});

pool.on('connect', () => console.log('✅ PostgreSQL connected'));
pool.on('error',   (err) => console.error('❌ Pool error:', err.message));

pool.query('SELECT NOW()')
  .then(() => {
    console.log('✅ PostgreSQL connection verified');
    console.log('✅ Unified schema mode enabled');
  })
  .catch((err) => console.error('❌ DB startup check failed:', err.message));

module.exports = pool;

