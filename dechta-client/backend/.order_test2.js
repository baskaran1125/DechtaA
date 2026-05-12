
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
    const countRes = await pool.query(`SELECT COUNT(*)::int AS count FROM vendor_profiles WHERE business_latitude IS NOT NULL AND business_longitude IS NOT NULL`);
    console.log('VENDOR_COORD_COUNT=' + countRes.rows[0].count);
    const sampleVendor = await pool.query(`SELECT id, business_name, business_address, business_latitude, business_longitude FROM vendor_profiles WHERE business_latitude IS NOT NULL AND business_longitude IS NOT NULL LIMIT 3`);
    console.log('VENDOR_SAMPLE=' + JSON.stringify(sampleVendor.rows, null, 2));
    const sampleProduct = await pool.query(`
      SELECT p.id, p.product_name, p.vendor_id, vp.business_latitude, vp.business_longitude
      FROM products p
      LEFT JOIN vendor_profiles vp ON vp.id = p.vendor_id
      WHERE vp.business_latitude IS NOT NULL AND vp.business_longitude IS NOT NULL
      LIMIT 5
    `);
    console.log('PRODUCT_SAMPLE_COUNT=' + sampleProduct.rows.length);
    console.log('PRODUCT_SAMPLE=' + JSON.stringify(sampleProduct.rows, null, 2));
  } catch (err) {
    console.error('ERROR', err && err.message ? err.message : err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
