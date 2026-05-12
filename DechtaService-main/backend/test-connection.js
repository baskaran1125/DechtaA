const { Pool } = require('pg');

console.log('Testing PostgreSQL connection...');

// Hardcoded values for testing
const pool = new Pool({
  user: 'postgres',
  password: '0901',
  host: 'localhost',
  port: 5432,
  database: 'dechta',
  connectionTimeoutMillis: 5000,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Connection successful!');
    console.log('Server time:', res.rows[0].now);
    process.exit(0);
  }
});

setTimeout(() => {
  console.error('❌ Connection timed out after 10 seconds');
  process.exit(1);
}, 10000);
