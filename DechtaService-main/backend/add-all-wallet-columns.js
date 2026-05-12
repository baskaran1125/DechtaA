#!/usr/bin/env node
/**
 * Add ALL missing columns to ALL wallet-related tables
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

const COLUMNS_TO_ADD = [
  // driver_stats columns
  { table: 'driver_stats', column: 'total_gross_earnings', type: 'NUMERIC(15, 2) DEFAULT 0.00' },
  { table: 'driver_stats', column: 'total_commission_paid', type: 'NUMERIC(15, 2) DEFAULT 0.00' },
  { table: 'driver_stats', column: 'weekly_earnings', type: 'NUMERIC(15, 2) DEFAULT 0.00' },
  { table: 'driver_stats', column: 'weekly_gross_earnings', type: 'NUMERIC(15, 2) DEFAULT 0.00' },
  { table: 'driver_stats', column: 'weekly_commission_paid', type: 'NUMERIC(15, 2) DEFAULT 0.00' },
  { table: 'driver_stats', column: 'weekly_orders_completed', type: 'BIGINT DEFAULT 0' },
  
  // driver_transactions columns
  { table: 'driver_transactions', column: 'wallet_id', type: 'BIGINT' },
  { table: 'driver_transactions', column: 'type', type: 'VARCHAR(50)' },
  { table: 'driver_transactions', column: 'balance_after', type: 'NUMERIC(15, 2)' },
  
  // driver_profiles columns
  { table: 'driver_profiles', column: 'commission_rate', type: 'NUMERIC(5, 3) DEFAULT 0.10' },
];

async function addAllMissingColumns() {
  const client = await pool.connect();
  try {
    console.log('\n' + '='.repeat(70));
    console.log('  ADDING ALL MISSING COLUMNS TO WALLET TABLES');
    console.log('='.repeat(70) + '\n');
    
    for (const col of COLUMNS_TO_ADD) {
      console.log(`⏳ Adding ${col.table}.${col.column}...`);
      try {
        const sql = `ALTER TABLE ${col.table} ADD COLUMN IF NOT EXISTS ${col.column} ${col.type};`;
        await client.query(sql);
        console.log(`   ✅ Added\n`);
      } catch (error) {
        console.log(`   ⚠️  ${error.message}\n`);
      }
    }
    
    console.log('='.repeat(70));
    console.log('✅ ALL COLUMNS PROCESSED');
    console.log('='.repeat(70) + '\n');
    
    console.log('Run verification:');
    console.log('  node check-wallet-schema.js\n');
    
  } finally {
    client.release();
    pool.end();
  }
}

addAllMissingColumns();
