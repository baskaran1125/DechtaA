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
    console.log('--- Patching missing columns in driver_stats ---');
    await pool.query(`ALTER TABLE driver_stats ADD COLUMN IF NOT EXISTS weekly_login_minutes INTEGER DEFAULT 0;`);
    await pool.query(`ALTER TABLE driver_stats ADD COLUMN IF NOT EXISTS total_login_minutes INTEGER DEFAULT 0;`);
    console.log('Columns injected securely.');

    // Rerun the EXACT query from getEarningsSummary to prove it works
    console.log('Testing query...');
    const res = await pool.query('SELECT id FROM driver_profiles LIMIT 1');
    const driverId = res.rows[0]?.id || 'f091b987-2936-4665-8bb9-0e4620a87994'; // mock fallback
    
    // I will use to test my newly patched controller query
    await pool.query(
      `SELECT
          COALESCE(w.today_earnings, 0)         AS today_net,
          (COALESCE(ds.weekly_gross_earnings, 0) - COALESCE(ds.weekly_commission_paid, 0)) AS weekly_net,
          COALESCE(ds.weekly_gross_earnings, 0) AS weekly_gross,
          COALESCE(ds.weekly_commission_paid, 0) AS weekly_commission,
          COALESCE(ds.weekly_orders_completed, 0) AS weekly_orders_completed,
          COALESCE(ds.weekly_login_minutes, 0) AS weekly_login_minutes,
          COALESCE(ds.weekly_completion_score, 0) AS weekly_completion_score,
          COALESCE(ds.rating, 5.0)              AS rating,
          (COALESCE(ds.total_gross_earnings, 0) - COALESCE(ds.total_commission_paid, 0)) AS total_net,
          COALESCE(ds.total_gross_earnings, 0)  AS total_gross,
          COALESCE(ds.total_commission_paid, 0) AS total_commission,
          COALESCE(ds.total_orders_completed, 0) AS total_orders_completed,
          COALESCE(dp.commission_rate, 0.10) * 100 AS commission_rate_pct,
          COALESCE(dp.is_pilot_this_week, FALSE) AS is_pilot_this_week
       FROM driver_profiles dp
       LEFT JOIN driver_stats    ds ON ds.driver_id = dp.id
       LEFT JOIN driver_wallets   w ON w.driver_id  = dp.id
       WHERE dp.id = $1
       LIMIT 1`,
      [driverId]
    );
    console.log('SUCCESS! ALL COLUMNS RESOLVED');
  } catch(e) {
    console.log("SQL_ERROR_MESSAGE_IS: >>>", e.message, "<<<");
  } finally {
    pool.end();
  }
}
run();
