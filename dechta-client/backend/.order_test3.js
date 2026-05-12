
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const envPath = path.join(__dirname, '.env');
const envText = fs.readFileSync(envPath, 'utf8');
const vars = {};
for (const line of envText.split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const idx = line.indexOf('=');
  if (idx < 0) continue;
  vars[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
}
const rawUrl = vars.DATABASE_URL;
const prefix = rawUrl.startsWith('postgresql://') ? 'postgresql://' : rawUrl.startsWith('postgres://') ? 'postgres://' : null;
if (!prefix) {
  console.error('Unsupported DATABASE_URL prefix');
  process.exit(1);
}
const rest = rawUrl.slice(prefix.length);
const user = rest.slice(0, rest.indexOf(':'));
const afterUser = rest.slice(rest.indexOf(':') + 1);
const lastAt = afterUser.lastIndexOf('@');
const password = afterUser.slice(0, lastAt);
const hostPart = afterUser.slice(lastAt + 1);
const host = hostPart.slice(0, hostPart.indexOf(':'));
const portAndDb = hostPart.slice(hostPart.indexOf(':') + 1);
const port = Number(portAndDb.slice(0, portAndDb.indexOf('/')));
const database = portAndDb.slice(portAndDb.indexOf('/') + 1);
const pool = new Pool({ user, password, host, port, database, ssl: false });
(async () => {
  try {
    await pool.query('SELECT 1');
    const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' ORDER BY column_name`);
    console.log('ORDERS_COLUMNS=' + JSON.stringify(cols.rows.map(r => r.column_name), null, 2));
    const coordCount = await pool.query(`SELECT COUNT(*)::int AS count FROM orders WHERE pickup_latitude IS NOT NULL OR pickup_longitude IS NOT NULL`);
    console.log('ORDERS_WITH_COORDS=' + coordCount.rows[0].count);
    const sampleProduct = await pool.query(`
      SELECT p.id, p.product_name, p.selling_price, p.vendor_id, p.vendor_id IS NOT NULL as has_vendor,
             vp.business_latitude, vp.business_longitude
      FROM products p
      LEFT JOIN vendor_profiles vp ON vp.id = p.vendor_id
      WHERE (COALESCE(p.is_active, false) = true OR COALESCE(p.status_active, false) = true)
        AND LOWER(COALESCE(p.approval_status, p.status, '')) = 'approved'
      LIMIT 1
    `);
    if (sampleProduct.rows.length === 0) {
      console.error('No approved active product found');
      process.exit(1);
    }
    const prod = sampleProduct.rows[0];
    console.log('SAMPLE_PRODUCT=' + JSON.stringify(prod, null, 2));
  } catch (err) {
    console.error('ERROR', err && err.message ? err.message : err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
