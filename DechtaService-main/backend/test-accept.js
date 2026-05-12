require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ user: process.env.DB_USER, password: process.env.DB_PASSWORD, host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT)||5432, database: process.env.DB_NAME, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    const cols = await p.query(`SELECT column_name FROM information_schema.columns WHERE table_name='delivery_trips'`);
    console.log('delivery_trips columns:', cols.rows.map(r => r.column_name).join(', '));
    
    const driverId = 1;
    const orderId = 1;
    console.log('Testing accepting order...');
    
    // Simulate accepting order as per controller logic
    const tripCheck = await p.query(
      `SELECT id FROM delivery_trips WHERE driver_id = $1 AND LOWER(COALESCE(status::text, '')) NOT IN ('delivered', 'cancelled', 'missed') LIMIT 1`,
      [driverId]
    );
    console.log('Trip check:', tripCheck.rows);

    const existTrip = await p.query(
      `SELECT dt.id, dt.driver_id, dt.status FROM delivery_trips dt WHERE dt.order_id = $1 AND LOWER(COALESCE(dt.status::text, '')) NOT IN ('delivered', 'cancelled', 'missed') LIMIT 1`,
      [orderId]
    );
    console.log('Exist trip check:', existTrip.rows);

  } catch(e) {
    console.error('❌ ERROR:', e.message);
  }
  await p.end();
}
run();
