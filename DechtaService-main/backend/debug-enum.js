require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ user: process.env.DB_USER, password: process.env.DB_PASSWORD, host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT)||5432, database: process.env.DB_NAME, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    const res = await p.query(`SELECT enumlabel FROM pg_enum WHERE enumtypid = 'order_status_enum'::regtype`);
    console.log('Valid order_status_enum values:', res.rows.map(r => r.enumlabel).join(', '));
  } catch (e) {
    console.error('Error fetching enum:', e.message);
  }
  await p.end();
}
run();
