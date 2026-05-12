#!/usr/bin/env node
/**
 * Check which tables exist and which are missing
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const REQUIRED_TABLES = [
  'delivery_trips',
  'driver_stats',
  'driver_vehicles',
  'driver_bank_accounts',
  'driver_documentss',
  'driver_wallets',
  'driver_transactions',
  'driver_notifications',
  'driver_notification_prefs',
  'driver_gps_locations',
  // Add more as needed
];

async function checkTables() {
  const client = await pool.connect();
  try {
    console.log('🔍 Checking database tables...\n');
    
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const existingTables = result.rows.map(r => r.table_name);
    console.log(`📊 Total tables in database: ${existingTables.length}\n`);
    
    const missingTables = REQUIRED_TABLES.filter(t => !existingTables.includes(t));
    const existingRequired = REQUIRED_TABLES.filter(t => existingTables.includes(t));
    
    console.log(`✅ Tables that exist (${existingRequired.length}):`);
    existingRequired.forEach(t => console.log(`   ✓ ${t}`));
    
    if (missingTables.length > 0) {
      console.log(`\n❌ Missing tables (${missingTables.length}):`);
      missingTables.forEach(t => console.log(`   ✗ ${t}`));
      console.log('\n⚠️  CRITICAL: Run INIT_MISSING_TABLES.sql to create missing tables');
    } else {
      console.log('\n✅ All required tables exist!');
    }
    
    // Check driver_wallets columns
    if (existingTables.includes('driver_wallets')) {
      const cols = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'driver_wallets'
        ORDER BY ordinal_position
      `);
      console.log('\n📋 driver_wallets columns:');
      cols.rows.forEach(c => console.log(`   - ${c.column_name} (${c.data_type})`));
    }
    
  } finally {
    client.release();
    pool.end();
  }
}

checkTables().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
