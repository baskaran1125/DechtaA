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
      console.log('No drivers found');
      return;
    }
    console.log('Testing driverId:', driverId);

    console.log('--- Query 1: dp/ds/w ---');
    await pool.query(
      `SELECT
          w.today_earnings                      AS today_net,
          ds.weekly_gross_earnings              AS weekly_gross,
          ds.weekly_commission_paid             AS weekly_commission,
          ds.weekly_earnings                    AS weekly_net,
          ds.weekly_orders_completed            AS weekly_orders_completed,
          ds.weekly_active_minutes              AS weekly_login_minutes,
          ds.weekly_completion_score            AS weekly_completion_score,
          ds.total_orders_completed             AS total_orders_completed,
          COALESCE(ds.rating, 5.0)              AS rating,
          COALESCE(ds.total_earnings, 0)        AS total_net,
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
    console.log('Query 1 OK');

    console.log('--- Query 2: delivery_trips today ---');
    await pool.query(
      `SELECT
          COUNT(*) FILTER (WHERE dt.completed_at AT TIME ZONE 'Asia/Kolkata' >= CURRENT_DATE) AS today_orders,
          COALESCE(SUM(CASE
            WHEN dt.completed_at AT TIME ZONE 'Asia/Kolkata' >= CURRENT_DATE
            THEN dt.payout_amount ELSE 0 END), 0) AS today_gross
       FROM delivery_trips dt
       WHERE dt.driver_id = $1 AND dt.status = 'delivered'`,
      [driverId]
    );
    console.log('Query 2 OK');

  } catch (err) {
    console.error('SQL Error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
