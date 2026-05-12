require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function runMigration() {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
  });

  try {
    const sqlPath = path.join(__dirname, '../sql/vendor_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Running vendor_tables.sql migration...');
    await pool.query(sql);
    console.log('✅ Migration successful!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await pool.end();
  }
}

runMigration();
