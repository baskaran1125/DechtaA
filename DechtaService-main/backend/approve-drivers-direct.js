/**
 * Direct PostgreSQL connection to approve drivers
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'dechtadriver',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function approveDrivers() {
  const client = await pool.connect();
  try {
    console.log('\n🔓 Approving drivers for orders access...\n');
    console.log(`Connecting to: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}\n`);

    // Get current drivers
    const beforeResult = await client.query(
      'SELECT id, full_name, mobile_number, is_approved FROM driver_profiles ORDER BY created_at DESC LIMIT 10'
    );

    console.log('Current drivers:');
    beforeResult.rows.forEach(driver => {
      const status = driver.is_approved ? '✅' : '❌';
      console.log(`${status} ${driver.full_name} (${driver.mobile_number})`);
    });

    // Approve all drivers
    const updateResult = await client.query(
      'UPDATE driver_profiles SET is_approved = true, is_online = true WHERE is_approved = false RETURNING id, full_name, mobile_number'
    );

    console.log(`\n✅ Approved ${updateResult.rows.length} drivers\n`);

    if (updateResult.rows.length > 0) {
      updateResult.rows.forEach(driver => {
        console.log(`  ✓ ${driver.full_name} (${driver.mobile_number})`);
      });
    }

    // Verify all are approved now
    const afterResult = await client.query(
      'SELECT COUNT(*) as total, SUM(CASE WHEN is_approved THEN 1 ELSE 0 END) as approved FROM driver_profiles'
    );

    const { total, approved } = afterResult.rows[0];
    console.log(`\n📊 Summary: ${approved}/${total} drivers approved`);
    console.log('\n✨ Orders API is now accessible!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

approveDrivers();
