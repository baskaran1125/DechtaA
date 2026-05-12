const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

async function run() {
  try {
    // 1. Ensure table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settlements (
        id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        vendor_id      UUID,
        amount         NUMERIC(12,2),
        status         TEXT,
        transaction_id TEXT,
        settled_at     TIMESTAMPTZ,
        processed_by   UUID,
        created_at     TIMESTAMPTZ   DEFAULT NOW()
      );
    `);
    console.log('Ensure settlements table exists: OK');

    // 2. Add missing column
    await pool.query(`
      ALTER TABLE settlements
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    `);
    console.log('Ensure created_at column exists: OK');

  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await pool.end();
  }
}

run();
