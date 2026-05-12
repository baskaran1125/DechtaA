#!/usr/bin/env node

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
});

async function clearRecords() {
  const client = await pool.connect();
  try {
    console.log('🗑️  Clearing all OTP records...\n');
    
    const result = await client.query('DELETE FROM otp_verification;');
    
    console.log(`✅ Deleted ${result.rowCount} OTP records\n`);
  } catch (error) {
    console.error('❌ Error clearing records:', error.message);
  } finally {
    await client.end();
  }
}

clearRecords().catch(console.error);
