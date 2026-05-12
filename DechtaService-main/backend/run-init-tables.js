#!/usr/bin/env node
/**
 * Run INIT_MISSING_TABLES.sql against the database
 * Usage: node run-init-tables.js
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

async function runInitSQL() {
  const client = await pool.connect();
  try {
    const sqlPath = path.join(__dirname, 'INIT_MISSING_TABLES.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    console.log('⏳ Running INIT_MISSING_TABLES.sql...');
    console.log('Database:', process.env.DB_NAME);
    console.log('Host:', process.env.DB_HOST);
    
    await client.query(sql);
    
    console.log('✅ Database initialization completed successfully!');
    console.log('\n📊 Tables created. Backend is ready to restart.');
    
  } catch (error) {
    console.error('❌ Error executing SQL:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

runInitSQL();
