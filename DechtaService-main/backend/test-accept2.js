require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ user: process.env.DB_USER, password: process.env.DB_PASSWORD, host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT)||5432, database: process.env.DB_NAME, ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await p.connect();
  try {
    const driverId = 1;
    const orderId = 1;
    await client.query('BEGIN');
    
    console.log('Testing accepting order UPDATE...');
    const setClauses = [
      'driver_id     = $1',
      'driver_name   = $2',
      'driver_number = $3',
      "status        = 'accepted'",
      'delivery_otp  = $4',
    ];
    const values = [
      driverId,
      'Test Driver',
      '9876543210',
      '1234',
    ];
    
    // ATOMIC: only succeeds if order is still Pending with no driver assigned
    const claimed = await client.query(
      `UPDATE orders
       SET ${setClauses.join(',\n           ')}
       WHERE id = $5
         AND LOWER(COALESCE(status::text, '')) = 'pending'
         AND driver_id IS NULL
       RETURNING *`,
      [...values, orderId]
    );
    console.log('Update result rows:', claimed.rows.length);

    if (claimed.rows.length > 0) {
      const order = claimed.rows[0];
      console.log('Testing INSERT INTO delivery_trips...');
      const trip = await client.query(
        `INSERT INTO delivery_trips (order_id, driver_id, status, payout_amount, started_at)
         VALUES ($1, $2, 'accepted', $3, NOW())
         RETURNING *`,
        [orderId, driverId, order.delivery_fee || order.total_amount || 0]
      );
      console.log('Trip insert rows:', trip.rows.length);
    }

    await client.query('ROLLBACK');
    console.log('Done.');
  } catch(e) {
    console.error('❌ ERROR:', e.message);
  } finally {
    client.release();
    await p.end();
  }
}
run();
