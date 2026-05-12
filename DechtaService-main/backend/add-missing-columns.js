#!/usr/bin/env node
/**
 * Add missing columns to existing tables
 * This is the critical fix for wallet endpoint
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

async function addMissingColumns() {
  const client = await pool.connect();
  try {
    console.log('\n' + '='.repeat(70));
    console.log('  ADDING MISSING COLUMNS TO EXISTING TABLES');
    console.log('='.repeat(70) + '\n');
    
    console.log('📝 Executing ADD_MISSING_COLUMNS.sql...\n');
    
    const sqlPath = path.join(__dirname, 'ADD_MISSING_COLUMNS.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    await client.query(sql);
    
    console.log('\n✅ All missing columns added successfully!\n');
    console.log('='.repeat(70));
    console.log('🎉 DATABASE SCHEMA IS NOW COMPLETE');
    console.log('='.repeat(70) + '\n');
    
    console.log('📋 NEXT STEPS:\n');
    console.log('1. Restart the backend:');
    console.log('   npm start\n');
    console.log('2. Test the wallet endpoint:');
    console.log('   curl http://localhost:5000/api/wallet \\');
    console.log('     -H "Authorization: Bearer YOUR_TOKEN"\n');
    console.log('Expected response: 200 OK with wallet data\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

addMissingColumns();
