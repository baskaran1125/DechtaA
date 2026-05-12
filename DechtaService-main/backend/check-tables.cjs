const { Pool } = require('pg');

// Using same creds as DechtaService .env
const pool = new Pool({
  user:     'postgres.jmiieugkhztbvprxgdhd',
  password: 'Arjunan@2005AJU',
  host:     'aws-1-ap-south-1.pooler.supabase.com',
  port:     6543,
  database: 'postgres',
  ssl:      { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function main() {
  try {
    console.log('Testing connection...');
    await pool.query('SELECT 1');
    console.log('Connection OK');

    // Check critical tables
    const tables = ['vendors', 'vendor_profiles', 'worker_profiles', 'orders', 'worker_notifications'];
    for (const t of tables) {
      const r = await pool.query(
        "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1)",
        [t]
      );
      console.log(`  ${t}: ${r.rows[0].exists ? 'EXISTS' : 'MISSING'}`);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
