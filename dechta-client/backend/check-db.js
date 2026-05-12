const pool = require('./src/config/db');

pool.query(
  'SELECT id, product_name, approval_status, status, is_active, status_active FROM products LIMIT 5',
  (err, res) => {
    if (err) {
      console.error('DB Error:', err.message);
    } else {
      console.log('Products in DB:');
      res.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));
    }
    process.exit();
  }
);
