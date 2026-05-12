#!/usr/bin/env node

/**
 * All-in-One Fix & Verification Script
 * 
 * This script:
 * 1. Checks database connection
 * 2. Creates all missing tables
 * 3. Adds all missing columns
 * 4. Verifies everything works
 * 5. Generates comprehensive report
 * 
 * Run with: node fix-all.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'dechta',
});

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(symbol, message, color = 'reset') {
  console.log(`${colors[color]}${symbol} ${message}${colors.reset}`);
}

function header(text) {
  console.log('\n' + colors.bright + '='.repeat(70) + colors.reset);
  console.log(colors.bright + text + colors.reset);
  console.log(colors.bright + '='.repeat(70) + colors.reset + '\n');
}

async function main() {
  try {
    header('🔧 DECHTA DATABASE FIX & VERIFICATION');
    
    // Test connection
    log('⏳', 'Connecting to database...');
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    log('✅', 'Connected to database', 'green');
    
    // Create tables
    header('📚 Step 1: Creating Missing Tables');
    log('⏳', 'Reading INIT_MISSING_TABLES.sql...');
    
    try {
      const initSQL = fs.readFileSync(path.join(__dirname, 'INIT_MISSING_TABLES.sql'), 'utf8');
      const statements = initSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));
      
      let created = 0;
      let skipped = 0;
      
      for (const statement of statements) {
        try {
          await client.query(statement);
          created++;
        } catch (error) {
          if (error.message.includes('already exists')) {
            skipped++;
          } else if (!error.message.includes('does not exist')) {
            log('⚠️', `${error.message.split('\n')[0]}`);
          }
        }
      }
      
      log('✅', `Tables ready: ${created} created, ${skipped} already existed`, 'green');
    } catch (error) {
      log('❌', `Error reading SQL file: ${error.message}`, 'red');
      throw error;
    }
    
    // Add columns
    header('📝 Step 2: Adding Missing Columns');
    log('⏳', 'Adding columns to existing tables...');
    
    const columns = [
      { table: 'delivery_trips', name: 'delivery_fee', type: 'NUMERIC(15, 2)', default: '0.00' },
      { table: 'delivery_trips', name: 'delivery_otp', type: 'VARCHAR(4)', default: null },
      { table: 'delivery_trips', name: 'otp_verified', type: 'BOOLEAN', default: 'FALSE' },
      { table: 'delivery_trips', name: 'distance_text', type: 'VARCHAR(50)', default: null },
      { table: 'driver_wallets', name: 'today_earnings', type: 'NUMERIC(15, 2)', default: '0.00' },
      { table: 'driver_wallets', name: 'total_trips', type: 'BIGINT', default: '0' },
      { table: 'driver_wallets', name: 'last_updated', type: 'TIMESTAMPTZ', default: 'NOW()' },
      { table: 'driver_transactions', name: 'wallet_id', type: 'BIGINT', default: null },
      { table: 'driver_transactions', name: 'trip_id', type: 'UUID', default: null },
      { table: 'driver_transactions', name: 'type', type: 'VARCHAR(50)', default: null },
      { table: 'driver_transactions', name: 'balance_after', type: 'NUMERIC(15, 2)', default: null },
    ];
    
    let added = 0;
    let existed = 0;
    
    for (const col of columns) {
      const query = `ALTER TABLE IF EXISTS ${col.table} ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}${col.default ? ` DEFAULT ${col.default}` : ''}`;
      try {
        await client.query(query);
        added++;
      } catch (error) {
        if (error.message.includes('already exists')) {
          existed++;
        } else {
          log('⚠️', `${col.table}.${col.name}: ${error.message.split('\n')[0]}`);
        }
      }
    }
    
    log('✅', `Columns ready: ${added} added, ${existed} already existed`, 'green');
    
    // Verify structure
    header('🔍 Step 3: Verifying Table Structure');
    
    const tables = ['delivery_trips', 'driver_wallets', 'driver_transactions', 'orders'];
    const verification = {};
    
    for (const tableName of tables) {
      try {
        const result = await client.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);
        
        verification[tableName] = result.rows.length;
        log('✅', `${tableName}: ${result.rows.length} columns`, 'green');
      } catch (error) {
        log('❌', `${tableName}: ${error.message}`, 'red');
      }
    }
    
    // Data summary
    header('📊 Step 4: Data Summary');
    
    const queries = [
      { name: 'Orders', query: 'SELECT COUNT(*) as count FROM orders' },
      { name: 'Delivery Trips', query: 'SELECT COUNT(*) as count FROM delivery_trips' },
      { name: 'Drivers', query: 'SELECT COUNT(*) as count FROM driver_profiles' },
      { name: 'Driver Vehicles', query: 'SELECT COUNT(*) as count FROM driver_vehicles' },
      { name: 'Driver Wallets', query: 'SELECT COUNT(*) as count FROM driver_wallets' },
    ];
    
    for (const item of queries) {
      try {
        const result = await client.query(item.query);
        log('📈', `${item.name}: ${result.rows[0].count} records`, 'blue');
      } catch (error) {
        log('⚠️', `${item.name}: Query failed`);
      }
    }
    
    // Verify critical columns
    header('✅ Step 5: Critical Columns Verification');
    
    const criticalChecks = [
      { table: 'delivery_trips', columns: ['id', 'driver_id', 'status', 'delivery_otp', 'otp_verified'] },
      { table: 'driver_wallets', columns: ['balance', 'total_earned', 'today_earnings'] },
      { table: 'orders', columns: ['id', 'status', 'vehicle_type', 'delivery_fee'] },
    ];
    
    let allOk = true;
    for (const check of criticalChecks) {
      for (const col of check.columns) {
        try {
          await client.query(`SELECT ${col} FROM ${check.table} LIMIT 1`);
          log('✅', `${check.table}.${col}`, 'green');
        } catch (error) {
          log('❌', `${check.table}.${col} - MISSING`, 'red');
          allOk = false;
        }
      }
    }
    
    // Final summary
    header('📋 COMPLETION SUMMARY');
    
    if (allOk) {
      log('✅', 'ALL FIXES APPLIED SUCCESSFULLY!', 'green');
      log('✅', 'Database is ready for use', 'green');
      console.log('\n' + colors.yellow + '📌 NEXT STEPS:' + colors.reset);
      console.log('   1. Restart backend: npm run dev');
      console.log('   2. Test endpoints with driver app');
      console.log('   3. Verify no 500 errors in logs');
    } else {
      log('⚠️', 'Some issues remain - review above', 'yellow');
      console.log('\n' + colors.yellow + 'TROUBLESHOOTING:' + colors.reset);
      console.log('   - Check PostgreSQL is running');
      console.log('   - Verify .env database settings');
      console.log('   - Try running: node db-diagnostics.js');
    }
    
    console.log('\n' + '='.repeat(70) + '\n');
    
    await client.end();
    process.exit(0);
    
  } catch (error) {
    log('❌', `Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
