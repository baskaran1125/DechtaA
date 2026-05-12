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
    const res = await pool.query('SELECT id FROM driver_profiles LIMIT 1');
    const driverId = res.rows[0]?.id;
    if (!driverId) {
      console.log('No drivers found to test');
      return;
    }
    
    console.log('Testing driverId:', driverId);

    console.log('--- Query ---');
    await pool.query('ALTER TABLE driver_wallets ADD COLUMN IF NOT EXISTS total_trips INTEGER DEFAULT 0;');
    await pool.query(
      `SELECT
          w.id                          AS wallet_id,
          w.balance,
          w.outstanding_dues,
          w.dues_limit,
          w.today_earnings,
          w.total_trips,
          w.total_commission_deducted,
          w.last_updated,

          -- All-time earnings breakdown from driver_stats
          COALESCE(ds.total_earnings, 0)             AS total_net_earnings,
          COALESCE(ds.total_gross_earnings, 0)       AS total_gross_earnings,
          COALESCE(ds.total_commission_paid, 0)      AS total_commission_paid,

          -- This week's breakdown
          COALESCE(ds.weekly_earnings, 0)            AS weekly_net,
          COALESCE(ds.weekly_gross_earnings, 0)      AS weekly_gross_earnings,
          COALESCE(ds.weekly_commission_paid, 0)     AS weekly_commission_paid,
          COALESCE(ds.weekly_orders_completed, 0)    AS weekly_orders_completed,

          -- Driver's commission rate
          COALESCE(dp.commission_rate, 0.10) * 100 AS commission_rate_pct

       FROM driver_wallets   w
       LEFT JOIN driver_stats    ds ON ds.driver_id = w.driver_id
       LEFT JOIN driver_profiles dp ON dp.id        = w.driver_id
       WHERE w.driver_id = $1`,
      [driverId]
    );
    console.log('Query OK');
  } catch (err) {
    console.error('SQL Error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
