/**
 * Quick Validation & Status Check
 * Minimal script to verify all fixes are in place
 */

const { Pool } = require('pg');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'dechta',
});

const checks = [];

async function runChecks() {
  console.log('\n🔍 DATABASE VALIDATION CHECKS\n');
  console.log('='.repeat(60));
  
  const client = await pool.connect();
  
  try {
    // Check 1: Connection
    console.log('\n1️⃣  Database Connection');
    const connTest = await client.query('SELECT NOW()');
    console.log('✅ Connected to database');
    checks.push(true);
    
    // Check 2: delivery_trips table exists
    console.log('\n2️⃣  delivery_trips Table');
    try {
      const result = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'delivery_trips'
      `);
      console.log(`✅ Table exists with ${result.rows.length} columns`);
      checks.push(result.rows.length >= 13);
    } catch (e) {
      console.log('❌ Table missing');
      checks.push(false);
    }
    
    // Check 3: Required columns
    console.log('\n3️⃣  Required Columns in delivery_trips');
    const requiredCols = ['id', 'driver_id', 'order_id', 'status', 'delivery_otp', 'otp_verified', 'delivery_fee', 'distance_text'];
    for (const col of requiredCols) {
      try {
        await client.query(`SELECT ${col} FROM delivery_trips LIMIT 1`);
        console.log(`✅ ${col}`);
      } catch (e) {
        console.log(`❌ ${col} - MISSING`);
        checks.push(false);
      }
    }
    checks.push(true);
    
    // Check 4: driver_wallets columns
    console.log('\n4️⃣  driver_wallets Table');
    const walletCols = ['balance', 'total_earned', 'today_earnings', 'total_trips'];
    let walletOk = true;
    for (const col of walletCols) {
      try {
        await client.query(`SELECT ${col} FROM driver_wallets LIMIT 1`);
        console.log(`✅ ${col}`);
      } catch (e) {
        console.log(`⚠️  ${col} - may not exist yet`);
        walletOk = false;
      }
    }
    checks.push(walletOk);
    
    // Check 5: Data counts
    console.log('\n5️⃣  Data Summary');
    const orders = await client.query('SELECT COUNT(*) as count FROM orders');
    const trips = await client.query('SELECT COUNT(*) as count FROM delivery_trips');
    const drivers = await client.query('SELECT COUNT(*) as count FROM driver_profiles');
    
    console.log(`📦 Orders: ${orders.rows[0].count}`);
    console.log(`🚗 Delivery Trips: ${trips.rows[0].count}`);
    console.log(`👥 Drivers: ${drivers.rows[0].count}`);
    checks.push(true);
    
    // Summary
    console.log('\n' + '='.repeat(60));
    const passed = checks.filter(c => c).length;
    const total = checks.length;
    
    if (passed === total) {
      console.log(`\n✅ ALL CHECKS PASSED (${passed}/${total})\n`);
      console.log('Your database is ready to use!');
      console.log('Next: npm run dev (to start backend server)\n');
    } else {
      console.log(`\n⚠️  SOME CHECKS NEED ATTENTION (${passed}/${total})\n`);
      console.log('Run: node db-diagnostics.js');
      console.log('This will create/fix missing tables and columns\n');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.log('\nMake sure:');
    console.log('  1. PostgreSQL is running');
    console.log('  2. .env file has correct DB_* variables');
    console.log('  3. Database "dechta" exists\n');
  } finally {
    await client.end();
    await pool.end();
  }
}

runChecks().catch(console.error);
