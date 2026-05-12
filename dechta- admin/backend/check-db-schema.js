import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  user: 'postgres',
  password: 'Quickconstruct@12',
  host: 'localhost',
  port: 5432,
  database: 'dechta'
});

console.log('Checking dechta database structure...\n');

// Check if products table exists
pool.query(
  `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='products' ORDER BY ordinal_position;`,
  (err, res) => {
    if (err) {
      console.error('Error checking products table:', err.message);
      pool.end();
      process.exit(1);
    }
    
    console.log('Products table columns:');
    if (res.rows.length === 0) {
      console.log('ERROR: Products table not found in dechta database!');
    } else {
      res.rows.forEach(row => 
        console.log(`  - ${row.column_name}: ${row.data_type}`)
      );
    }
    
    // Check a sample product record
    pool.query(
      `SELECT id, product_name, approval_status, status FROM products LIMIT 1;`,
      (err2, res2) => {
        if (err2) {
          console.log('\nError querying products:', err2.message);
        } else {
          console.log('\nSample product record:');
          console.log(JSON.stringify(res2.rows[0] || 'No products', null, 2));
        }
        pool.end();
      }
    );
  }
);
