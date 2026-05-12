const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'dechta',
});

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('Starting database migrations...\n');
    
    // Read and execute INIT_MISSING_TABLES.sql
    const initSQL = fs.readFileSync(path.join(__dirname, 'INIT_MISSING_TABLES.sql'), 'utf8');
    console.log('Running INIT_MISSING_TABLES.sql...');
    await client.query(initSQL);
    console.log('✅ INIT_MISSING_TABLES completed\n');
    
    // Read and execute ADD_MISSING_COLUMNS.sql
    const addColsSQL = fs.readFileSync(path.join(__dirname, 'ADD_MISSING_COLUMNS.sql'), 'utf8');
    console.log('Running ADD_MISSING_COLUMNS.sql...');
    await client.query(addColsSQL);
    console.log('✅ ADD_MISSING_COLUMNS completed\n');
    
    // Verify tables exist
    console.log('Verifying tables...');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log(`✅ Found ${tables.rows.length} tables`);
    console.log('Tables:', tables.rows.map(r => r.table_name).join(', '));
    
    // Check delivery_trips columns
    console.log('\nVerifying delivery_trips columns...');
    const cols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'delivery_trips'
      ORDER BY ordinal_position;
    `);
    console.log('delivery_trips columns:');
    cols.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });
    
    console.log('\n✅ All migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
