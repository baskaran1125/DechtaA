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
    console.log('Migrating driver_profiles...');
    await pool.query(`
      ALTER TABLE driver_profiles
      ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,4) DEFAULT 0.10,
      ADD COLUMN IF NOT EXISTS is_pilot_this_week BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS pilot_week_start DATE;
    `);

    console.log('Migrating driver_stats...');
    await pool.query(`
      ALTER TABLE driver_stats
      ADD COLUMN IF NOT EXISTS total_gross_earnings NUMERIC(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_commission_paid NUMERIC(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS weekly_gross_earnings NUMERIC(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS weekly_commission_paid NUMERIC(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS weekly_completion_score NUMERIC(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS weekly_active_minutes INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS pilot_eligible_next_week BOOLEAN DEFAULT FALSE;
    `);

    console.log('Migrating driver_wallets...');
    await pool.query(`
      ALTER TABLE driver_wallets
      ADD COLUMN IF NOT EXISTS total_commission_deducted NUMERIC(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS dues_limit NUMERIC(10,2) DEFAULT 300,
      ADD COLUMN IF NOT EXISTS today_earnings NUMERIC(10,2) DEFAULT 0;
    `);

    console.log('Migrating delivery_trips...');
    await pool.query(`
      ALTER TABLE delivery_trips
      ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS payout_amount NUMERIC(10,2) DEFAULT 0;
    `);

    console.log('All missing columns added successfully.');
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
