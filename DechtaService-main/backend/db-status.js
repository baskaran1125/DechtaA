const { Pool } = require('pg');

async function checkDatabaseConnection() {
  console.log('🔍 Checking database connection...\n');

  // Hardcoded connection details for testing
  const config = {
    user: 'postgres',
    password: '0901',
    host: 'localhost',
    port: 5432,
    database: 'dechta',
    connectionTimeoutMillis: 5000,
  };

  console.log('Connection Details:');
  console.log(`  Host: ${config.host}`);
  console.log(`  Port: ${config.port}`);
  console.log(`  Database: ${config.database}`);
  console.log(`  User: ${config.user}`);
  console.log('');

  const pool = new Pool(config);

  try {
    console.log('⏳ Attempting to connect to database...');

    // Test the connection with a simple query
    const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
    const { current_time, db_version } = result.rows[0];

    console.log('');
    console.log('✅ DATABASE CONNECTED SUCCESSFULLY!');
    console.log(`  Server Time: ${current_time}`);
    console.log(`  Database Version: ${db_version.split(' ')[0]} ${db_version.split(' ')[1]}`);
    console.log('');

    // Close the pool
    await pool.end();
    process.exit(0);

  } catch (error) {
    console.log('');
    console.log('❌ DATABASE CONNECTION FAILED!');
    console.log(`  Error: ${error.message}`);
    console.log('');

    // Provide helpful troubleshooting info
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Troubleshooting:');
      console.log('  - Make sure PostgreSQL is installed and running');
      console.log('  - Check if the database server is started');
      console.log('  - Verify the host and port are correct');
    } else if (error.code === '42P01') {
      console.log('💡 Troubleshooting:');
      console.log('  - The database does not exist');
      console.log('  - Create the database first');
    } else if (error.code === '28P01') {
      console.log('💡 Troubleshooting:');
      console.log('  - Authentication failed');
      console.log('  - Check username and password');
    }

    // Close the pool
    await pool.end();
    process.exit(1);
  }
}

// Run the check
checkDatabaseConnection();