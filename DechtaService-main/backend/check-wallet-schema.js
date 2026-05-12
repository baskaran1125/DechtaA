#!/usr/bin/env node
/**
 * Comprehensive check of all wallet-related tables and columns
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

const REQUIRED_COLUMNS = {
  driver_wallets: [
    'balance', 'outstanding_dues', 'dues_limit', 'today_earnings', 
    'total_trips', 'total_commission_deducted', 'last_updated'
  ],
  driver_stats: [
    'total_earnings', 'total_gross_earnings', 'total_commission_paid',
    'weekly_earnings', 'weekly_gross_earnings', 'weekly_commission_paid', 'weekly_orders_completed'
  ],
  driver_transactions: [
    'wallet_id', 'type', 'balance_after'
  ],
  driver_profiles: [
    'commission_rate'
  ]
};

async function checkAllColumns() {
  const client = await pool.connect();
  try {
    console.log('\n' + '='.repeat(70));
    console.log('  COMPREHENSIVE WALLET SCHEMA CHECK');
    console.log('='.repeat(70) + '\n');
    
    let allGood = true;
    
    for (const [table, requiredCols] of Object.entries(REQUIRED_COLUMNS)) {
      console.log(`📋 Checking ${table}:\n`);
      
      const result = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = $1
      `, [table]);
      
      const existingCols = new Set(result.rows.map(r => r.column_name));
      
      for (const col of requiredCols) {
        if (existingCols.has(col)) {
          console.log(`   ✅ ${col}`);
        } else {
          console.log(`   ❌ ${col} - MISSING`);
          allGood = false;
        }
      }
      console.log('');
    }
    
    if (allGood) {
      console.log('='.repeat(70));
      console.log('✅ ALL REQUIRED COLUMNS EXIST!');
      console.log('='.repeat(70) + '\n');
      console.log('🎉 Schema is complete. Restart backend and test wallet endpoint.\n');
    } else {
      console.log('='.repeat(70));
      console.log('❌ SOME COLUMNS ARE STILL MISSING');
      console.log('='.repeat(70) + '\n');
      console.log('Run: node add-all-wallet-columns.js\n');
    }
    
  } finally {
    client.release();
    pool.end();
  }
}

checkAllColumns();
