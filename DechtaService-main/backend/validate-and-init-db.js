#!/usr/bin/env node
/**
 * Complete Database Schema Validation and Initialization
 * This script validates the database schema and creates any missing tables/columns
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

const REQUIRED_TABLES = {
  driver_wallets: ['balance', 'outstanding_dues', 'dues_limit', 'today_earnings', 'total_trips', 'total_commission_deducted', 'last_updated'],
  driver_stats: ['total_earnings', 'total_gross_earnings', 'total_commission_paid', 'weekly_earnings', 'weekly_gross_earnings', 'weekly_commission_paid', 'weekly_orders_completed'],
  driver_transactions: ['wallet_id', 'type', 'balance_after'],
  delivery_trips: ['otp_verified', 'delivery_otp'],
};

async function validateAndInitialize() {
  const client = await pool.connect();
  try {
    console.log('🔍 Database Schema Validation & Initialization\n');
    console.log(`Database: ${process.env.DB_NAME}`);
    console.log(`Host: ${process.env.DB_HOST}\n`);
    
    // Step 1: Check existing tables
    const tableResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    const existingTables = tableResult.rows.map(r => r.table_name);
    console.log(`📊 Total tables in database: ${existingTables.length}\n`);
    
    // Step 2: Check for missing tables
    const missingTables = Object.keys(REQUIRED_TABLES).filter(t => !existingTables.includes(t));
    
    if (missingTables.length > 0) {
      console.log(`⚠️  Missing tables: ${missingTables.join(', ')}\n`);
      console.log(`Running INIT_MISSING_TABLES.sql...\n`);
      
      const sqlPath = path.join(__dirname, 'INIT_MISSING_TABLES.sql');
      const sql = fs.readFileSync(sqlPath, 'utf-8');
      await client.query(sql);
      
      console.log('✅ Database initialization completed!\n');
    } else {
      console.log('✅ All required tables exist\n');
    }
    
    // Step 3: Validate columns for each critical table
    console.log('🔎 Validating table schemas...\n');
    
    for (const [tableName, requiredColumns] of Object.entries(REQUIRED_TABLES)) {
      if (!existingTables.includes(tableName)) {
        console.log(`⏭️  Skipping ${tableName} (table will be created by INIT_MISSING_TABLES.sql)`);
        continue;
      }
      
      const colResult = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [tableName]);
      
      const existingColumns = colResult.rows.map(r => r.column_name);
      const missingColumns = requiredColumns.filter(c => !existingColumns.includes(c));
      
      if (missingColumns.length > 0) {
        console.log(`❌ ${tableName}: Missing columns: ${missingColumns.join(', ')}`);
        console.log(`   ⚠️  Please run INIT_MISSING_TABLES.sql to add missing columns`);
      } else {
        console.log(`✅ ${tableName}: All required columns exist`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 Next Steps:');
    console.log('1. If any tables or columns are missing, they will be created');
    console.log('2. Restart the backend service');
    console.log('3. Test the wallet endpoint: GET /api/wallet');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

validateAndInitialize();
