#!/usr/bin/env node
/**
 * Add missing cancel_reason column to delivery_trips
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

async function addCancelReasonColumn() {
  const client = await pool.connect();
  try {
    console.log('\n' + '='.repeat(70));
    console.log('  FIXING ORDER HISTORY - ADDING cancel_reason COLUMN');
    console.log('='.repeat(70) + '\n');
    
    console.log('⏳ Adding cancel_reason column to delivery_trips...\n');
    
    await client.query(`
      ALTER TABLE delivery_trips
      ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
    `);
    
    console.log('✅ Column added successfully!\n');
    console.log('='.repeat(70));
    console.log('✅ ORDER HISTORY QUERY SHOULD NOW WORK');
    console.log('='.repeat(70) + '\n');
    
    console.log('📋 NEXT STEPS:\n');
    console.log('1. Restart backend:');
    console.log('   taskkill /F /IM node.exe');
    console.log('   npm start\n');
    console.log('2. Check order history in app:');
    console.log('   Navigate to History > Completed tab\n');
    console.log('Completed orders should now appear!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

addCancelReasonColumn();
