#!/usr/bin/env node
/**
 * COMPLETE FIX FOR WALLET ENDPOINT 500 ERROR
 * 
 * This script:
 * 1. Checks current database schema
 * 2. Initializes all missing tables
 * 3. Validates the fix was successful
 * 4. Provides next steps
 * 
 * Usage: node fix-wallet-endpoint.js
 */

const { Pool } = require('pg');
const fs = require('fs');
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

const CRITICAL_TABLES = [
  'driver_wallets',
  'driver_stats',
  'driver_transactions',
  'delivery_trips',
];

const WALLET_COLUMNS = [
  'balance',
  'outstanding_dues',
  'dues_limit',
  'today_earnings',
  'total_trips',
  'total_commission_deducted',
];

async function main() {
  const client = await pool.connect();
  try {
    console.log('\n' + '='.repeat(70));
    console.log('  DECHTA WALLET ENDPOINT - DATABASE INITIALIZATION');
    console.log('='.repeat(70) + '\n');
    
    // STEP 1: Status Check
    console.log('📊 STEP 1: Checking Current Database Status\n');
    
    const tableResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    const existingTables = new Set(tableResult.rows.map(r => r.table_name));
    console.log(`   Total tables in database: ${existingTables.size}`);
    
    const missingTables = CRITICAL_TABLES.filter(t => !existingTables.has(t));
    if (missingTables.length > 0) {
      console.log(`   ❌ Missing tables: ${missingTables.join(', ')}`);
    } else {
      console.log(`   ✅ All critical tables exist`);
    }
    
    // Check wallet columns
    let walletMissingColumns = [];
    if (existingTables.has('driver_wallets')) {
      const colResult = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'driver_wallets'
      `);
      const walletColumns = new Set(colResult.rows.map(r => r.column_name));
      walletMissingColumns = WALLET_COLUMNS.filter(c => !walletColumns.has(c));
      
      if (walletMissingColumns.length > 0) {
        console.log(`   ❌ driver_wallets missing columns: ${walletMissingColumns.join(', ')}`);
      } else {
        console.log(`   ✅ driver_wallets has all required columns`);
      }
    }
    
    const needsInit = missingTables.length > 0 || walletMissingColumns.length > 0;
    
    if (needsInit) {
      // STEP 2: Initialize Database
      console.log('\n📝 STEP 2: Initializing Database Schema\n');
      
      const sqlPath = path.join(__dirname, 'INIT_MISSING_TABLES.sql');
      if (!fs.existsSync(sqlPath)) {
        throw new Error(`INIT_MISSING_TABLES.sql not found at ${sqlPath}`);
      }
      
      const sql = fs.readFileSync(sqlPath, 'utf-8');
      console.log('   Executing INIT_MISSING_TABLES.sql...');
      
      await client.query(sql);
      console.log('   ✅ Database schema initialized successfully!\n');
      
      // STEP 3: Validate
      console.log('✅ STEP 3: Validating Schema\n');
      
      const tableResult2 = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      const updatedTables = new Set(tableResult2.rows.map(r => r.table_name));
      
      let allGood = true;
      for (const table of CRITICAL_TABLES) {
        if (updatedTables.has(table)) {
          console.log(`   ✅ ${table}: exists`);
        } else {
          console.log(`   ❌ ${table}: MISSING`);
          allGood = false;
        }
      }
      
      if (updatedTables.has('driver_wallets')) {
        const colResult2 = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'driver_wallets'
          ORDER BY column_name
        `);
        const walletCols = colResult2.rows.map(r => r.column_name);
        console.log(`   ✅ driver_wallets columns: ${walletCols.length} total`);
        
        for (const col of WALLET_COLUMNS) {
          if (walletCols.includes(col)) {
            console.log(`      ✅ ${col}`);
          } else {
            console.log(`      ❌ ${col} - MISSING`);
            allGood = false;
          }
        }
      }
      
      if (allGood) {
        console.log('\n' + '='.repeat(70));
        console.log('🎉 SUCCESS! Database schema is now complete');
        console.log('='.repeat(70) + '\n');
        console.log('📋 NEXT STEPS:\n');
        console.log('1. Restart the backend service:');
        console.log('   npm start\n');
        console.log('2. Test the wallet endpoint:');
        console.log('   curl http://localhost:5000/api/wallet \\');
        console.log('     -H "Authorization: Bearer YOUR_TOKEN"\n');
        console.log('3. Run full integration test:');
        console.log('   - Accept an order');
        console.log('   - Complete the delivery');
        console.log('   - Check wallet for updated balance\n');
      } else {
        console.log('\n⚠️  Some issues remain. Please check the output above.');
      }
    } else {
      console.log('\n' + '='.repeat(70));
      console.log('✅ DATABASE IS ALREADY INITIALIZED');
      console.log('='.repeat(70) + '\n');
      console.log('The wallet endpoint should be working.');
      console.log('If you\'re still getting 500 errors, restart the backend:\n');
      console.log('   npm start\n');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.detail) console.error('   Detail:', error.detail);
    console.error('\nTroubleshooting:');
    console.error('- Make sure PostgreSQL is running');
    console.error('- Check .env file has correct database credentials');
    console.error('- Verify database user has CREATE TABLE privileges');
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

main();
