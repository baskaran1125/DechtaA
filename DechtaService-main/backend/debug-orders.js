require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ user: process.env.DB_USER, password: process.env.DB_PASSWORD, host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT)||5432, database: process.env.DB_NAME, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    const orderId = 1;
    const driverId = 1; // Assuming some driver ID
    
    // Check if the orders table has the required structure
    const cols = await p.query(`SELECT column_name FROM information_schema.columns WHERE table_name='orders'`);
    console.log('Orders columns:', cols.rows.map(r => r.column_name).join(', '));
    
    // Check what happens during an accept order query
    console.log('Testing accept order...');
    
  } catch(e) {
    console.error('❌ ERROR:', e.message);
  }
  await p.end();
}
run();
