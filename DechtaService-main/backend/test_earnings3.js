const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
// We use the same mock secret 'qc-driver-super-secret-change-in-production'
// We don't have jsonwebtoken installed, so we'll just inject the token into fastify context
// Wait, we can just require 'http' and do a request if we had a token.
// Instead, let's just write a script that connects to PG and runs the EXACT JS logic.
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
    if (!driverId) return console.log('No drivers');
    
    // exact logic from getEarningsSummary
    const result = await pool.query(
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

    const todayResult = await pool.query(
      `SELECT
          COUNT(*) FILTER (WHERE dt.completed_at AT TIME ZONE 'Asia/Kolkata' >= CURRENT_DATE) AS today_orders,
          COALESCE(SUM(CASE
            WHEN dt.completed_at AT TIME ZONE 'Asia/Kolkata' >= CURRENT_DATE
            THEN dt.payout_amount ELSE 0 END), 0) AS today_gross
       FROM delivery_trips dt
       WHERE dt.driver_id = $1 AND dt.status = 'delivered'`,
      [driverId]
    );

    const r = result.rows[0] || {};
    const todayData = todayResult.rows[0] || {};
    const commPct = parseFloat(r.commission_rate_pct || 10);

    const data = {
      commissionRatePct: commPct,
      today: {
        gross:          parseFloat(todayData.today_gross || 0),
        commission:     0,
        net:            parseFloat(r.today_net || 0),
        orders:         parseInt(todayData.today_orders || 0, 10),
        active_minutes: 0,
      },
      weekly: {
        gross:            parseFloat(r.weekly_gross || 0),
        commission:       parseFloat(r.weekly_commission || 0),
        net:              parseFloat(r.weekly_net || 0),
        earnings:         parseFloat(r.weekly_net || 0),
        orders:           parseInt(r.weekly_orders_completed || 0, 10),
        accepted:         0,
        completed:        parseInt(r.weekly_orders_completed || 0, 10),
        login_minutes:    parseInt(r.weekly_login_minutes || 0, 10),
        login_hours:      parseFloat(((r.weekly_login_minutes || 0) / 60).toFixed(2)),
        completion_score: parseFloat(r.weekly_completion_score || 0),
      },
      total: {
        gross:      parseFloat(r.total_gross || 0),
        commission: parseFloat(r.total_commission || 0),
        net:        parseFloat(r.total_net || 0),
        earnings:   parseFloat(r.total_net || 0),
        orders:     parseInt(r.total_orders_completed || 0, 10),
      },
      is_pilot_this_week: r.is_pilot_this_week || false,
      rating:             parseFloat(r.rating || 5.0),
    };
    console.log("PAYLOAD BUILD SUCCESSFUL", data.total);
  } catch(e) {
    console.log("SQL_ERROR_MESSAGE_IS: >>>", e.message, "<<<");
  } finally {
    pool.end();
  }
}
run();
