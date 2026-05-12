#!/usr/bin/env node
/**
 * Force add the remaining missing columns to driver_wallets
 * This directly adds the 3 columns that the wallet controller expects
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

async function addRemainingColumns() {
  const client = await pool.connect();
  try {
    console.log('\n' + '='.repeat(70));
    console.log('  ADDING REMAINING MISSING WALLET COLUMNS');
    console.log('='.repeat(70) + '\n');
    
    // Add the 3 missing columns
    const commands = [
      {
        name: 'outstanding_dues',
        sql: `ALTER TABLE driver_wallets ADD COLUMN IF NOT EXISTS outstanding_dues NUMERIC(15, 2) DEFAULT 0.00;`
      },
      {
        name: 'dues_limit',
        sql: `ALTER TABLE driver_wallets ADD COLUMN IF NOT EXISTS dues_limit NUMERIC(15, 2) DEFAULT 300.00;`
      },
      {
        name: 'total_commission_deducted',
        sql: `ALTER TABLE driver_wallets ADD COLUMN IF NOT EXISTS total_commission_deducted NUMERIC(15, 2) DEFAULT 0.00;`
      }
    ];
    
    for (const cmd of commands) {
      console.log(`⏳ Adding column: ${cmd.name}...`);
      await client.query(cmd.sql);
      console.log(`   ✅ Added ${cmd.name}\n`);
    }
    
    // Verify all columns now exist
    console.log('📋 Verifying driver_wallets schema...\n');
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'driver_wallets'
      ORDER BY ordinal_position
    `);
    
    result.rows.forEach(row => {
      console.log(`   ✅ ${row.column_name} (${row.data_type})`);
    });
    
    console.log('\n' + '='.repeat(70));
    console.log('🎉 ALL WALLET COLUMNS NOW COMPLETE');
    console.log('='.repeat(70) + '\n');
    
    console.log('📋 NEXT STEPS:\n');
    console.log('1. Restart the backend:');
    console.log('   npm start\n');
    console.log('2. Test the wallet endpoint:');
    console.log('   curl http://localhost:5000/api/wallet -H "Authorization: Bearer TOKEN"\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

addRemainingColumns();
