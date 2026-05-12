require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

async function main() {
  // Check vendor ID
  const vRes = await p.query('SELECT id FROM vendors LIMIT 1');
  const vendorId = vRes.rows[0]?.id;
  console.log('Vendor ID:', vendorId, '(type:', typeof vendorId, ')');

  // Check orders table columns
  const cols = await p.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='orders' ORDER BY ordinal_position`
  );
  console.log('\nOrders columns:');
  cols.rows.forEach(c => console.log('  ', c.column_name, ':', c.data_type));

  // Test the exact query
  try {
    const r = await p.query('SELECT * FROM orders WHERE vendor_id = $1 ORDER BY created_at DESC', [vendorId]);
    console.log('\nQuery OK, rows:', r.rows.length);
  } catch (e) {
    console.log('\nQuery FAILED:', e.message);
  }

  // Test settlements
  try {
    const r = await p.query('SELECT * FROM settlements WHERE vendor_id = $1 ORDER BY created_at DESC', [vendorId]);
    console.log('Settlements OK, rows:', r.rows.length);
  } catch (e) {
    console.log('Settlements FAILED:', e.message);
  }

  // Test invoices
  try {
    const r = await p.query('SELECT * FROM invoices WHERE vendor_id = $1 ORDER BY created_at DESC', [vendorId]);
    console.log('Invoices OK, rows:', r.rows.length);
  } catch (e) {
    console.log('Invoices FAILED:', e.message);
  }

  await p.end();
}
main().catch(e => { console.error('ERR:', e.message); p.end(); });
