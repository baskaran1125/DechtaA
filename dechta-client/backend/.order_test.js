
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
if (!rawUrl) {
  console.error('No DATABASE_URL in .env');
  process.exit(1);
}
const prefix = rawUrl.startsWith('postgresql://') ? 'postgresql://' : rawUrl.startsWith('postgres://') ? 'postgres://' : null;
if (!prefix) {
  console.error('Unsupported DATABASE_URL prefix:', rawUrl);
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
    const prodRes = await pool.query(`
      SELECT p.id, p.product_name, p.selling_price, p.mrp, p.vendor_id,
             vp.owner_name, vp.business_name, vp.business_address,
             vp.business_latitude, vp.business_longitude
      FROM products p
      LEFT JOIN vendor_profiles vp ON vp.id = p.vendor_id
      WHERE (COALESCE(p.is_active, false) = true OR COALESCE(p.status_active, false) = true)
        AND LOWER(COALESCE(p.approval_status, p.status, '')) = 'approved'
        AND vp.business_latitude IS NOT NULL
        AND vp.business_longitude IS NOT NULL
      LIMIT 1
    `);
    if (prodRes.rows.length === 0) {
      console.error('No product found with vendor coordinates.');
      process.exit(1);
    }
    const prod = prodRes.rows[0];
    const productResponse = {
      id: prod.id,
      name: prod.product_name,
      selling_price: prod.selling_price != null ? Number(prod.selling_price) : null,
      price: prod.selling_price != null ? Number(prod.selling_price) : null,
      vendor_id: prod.vendor_id,
      vendorName: prod.owner_name,
      shop_name: prod.business_name,
      vendor_location: prod.business_address,
      vendor_lat: prod.business_latitude != null ? Number(prod.business_latitude) : null,
      vendor_lng: prod.business_longitude != null ? Number(prod.business_longitude) : null,
    };
    console.log('PRODUCT_RESPONSE_SHAPE');
    console.log(JSON.stringify(productResponse, null, 2));
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const addrRes = await client.query(
        `INSERT INTO addresses (user_id, tag, address_text, is_default, lat, lng, area, city, state, pincode, landmark)
         VALUES ($1,$2,$3,false,$4,$5,$6,$7,$8,$9,$10)
         RETURNING id`,
        [1, 'test', 'Test Order Address', 12.9716, 77.5946, 'MG Road', 'Bengaluru', 'Karnataka', '560001', 'Test landmark']
      );
      const deliveryAddressId = addrRes.rows[0].id;
      const pickupLat = productResponse.vendor_lat;
      const pickupLng = productResponse.vendor_lng;
      const itemsJson = JSON.stringify([{ id: prod.id, name: prod.product_name, qty: 1, price: Number(prod.selling_price) }]);
      const orderMeta = {
        vehicle: null,
        schedule: null,
        instructions: null,
        gst: null,
        delivery_address_details: {
          tag: 'other', area: 'MG Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', landmark: 'Test landmark', lat: 12.9716, lng: 77.5946
        },
        cart_item: {
          id: prod.id, name: prod.product_name, qty: 1, unit_price: Number(prod.selling_price), vendor_lat: pickupLat, vendor_lng: pickupLng, dest_lat: 12.9716, dest_lng: 77.5946, shop_name: prod.business_name
        }
      };
      const orderRes = await client.query(
        `INSERT INTO orders (user_id, product_id, vendor_id, quantity, status, order_amount, final_amount, delivery_address_id,
                               customer_name, customer_phone, client_id, client_name, client_phone, vendor_shop_name, pickup_address,
                               delivery_address, pickup_latitude, pickup_longitude, drop_latitude, drop_longitude,
                               delivery_latitude, delivery_longitude, order_type, delivery_fee, tip_amount,
                               items_total, final_total, items, order_meta)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30)
         RETURNING id, pickup_latitude, pickup_longitude, delivery_latitude, delivery_longitude, order_meta, items`,
        [
          1, prod.id, prod.vendor_id, 1, 'pending', Number(prod.selling_price), Number(prod.selling_price), deliveryAddressId,
          'Test User', '9999999999', '1', 'Test User', '9999999999', prod.business_name, prod.business_name,
          'Test Order Address', pickupLat, pickupLng, 12.9716, 77.5946, 12.9716, 77.5946, 'delivery', 0, 0,
          Number(prod.selling_price), Number(prod.selling_price), itemsJson, JSON.stringify(orderMeta)
        ]
      );
      console.log('ORDER_INSERT_RESULT');
      console.log(JSON.stringify(orderRes.rows[0], null, 2));
      await client.query('ROLLBACK');
      console.log('TRANSACTION rolled back');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('ERROR', err && err.message ? err.message : err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
