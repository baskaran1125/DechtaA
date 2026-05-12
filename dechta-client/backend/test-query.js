const pool = require('./src/config/db');

const isActiveFilter = (alias = 'p') =>
  `(COALESCE(${alias}.is_active, false) = true OR COALESCE(${alias}.status_active, false) = true)`;

const isApprovedFilter = (alias = 'p') =>
  `LOWER(COALESCE(${alias}.approval_status, ${alias}.status, '')) = 'approved'`;

const BASE_SELECT = `
  SELECT
    p.id,
    p.product_name,
    p.approval_status,
    p.status,
    p.is_active,
    p.status_active,
    vp.owner_name,
    vp.business_name,
    vp.business_address
  FROM products p
  LEFT JOIN vendor_profiles vp ON vp.id = p.vendor_id
  WHERE ${isActiveFilter('p')}
    AND ${isApprovedFilter('p')}
`;

console.log('Executing query:');
console.log(BASE_SELECT);
console.log('\n\nResults:');

pool.query(BASE_SELECT, (err, res) => {
  if (err) {
    console.error('DB Error:', err.message);
  } else {
    console.log('Found', res.rows.length, 'products');
    res.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));
  }
  process.exit();
});
