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
    await pool.query('ALTER TABLE delivery_trips ADD COLUMN IF NOT EXISTS cancel_reason TEXT;');
    await pool.query(
      `SELECT
        dt.id, dt.status, dt.payout_amount, dt.distance_text, dt.started_at, dt.completed_at,
        dt.cancel_reason,
        o.id as order_id, o.product_name, o.customer_name as client_name, o.pickup_address,
        o.delivery_address, o.total_amount as final_total, o.order_date
       FROM delivery_trips dt
       LEFT JOIN orders o ON dt.order_id = o.id
       LIMIT 1`
    );
    console.log('Query OK');
  } catch (err) {
    console.error('SQL Error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
