#!/usr/bin/env node
/**
 * Check which columns exist in delivery_trips
 * The history query might be trying to select columns that don't exist
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

const EXPECTED_COLUMNS = [
  'id', 'order_id', 'driver_id', 'status',
  'payout_amount', 'delivery_fee', 'delivery_otp', 'otp_verified',
  'distance_text', 'started_at', 'arrived_pickup_at', 'departed_pickup_at',
  'arrived_dropoff_at', 'completed_at', 'cancelled_at',
  'cancel_reason', 'created_at', 'updated_at'
];

async function checkDeliveryTripsSchema() {
  const client = await pool.connect();
  try {
    console.log('\n' + '='.repeat(70));
    console.log('  DELIVERY_TRIPS TABLE SCHEMA CHECK');
    console.log('='.repeat(70) + '\n');
    
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'delivery_trips'
      ORDER BY ordinal_position
    `);
    
    const actualColumns = new Set(result.rows.map(r => r.column_name));
    
    console.log(`Actual columns in table (${result.rows.length}):\n`);
    result.rows.forEach(row => {
      console.log(`   ✅ ${row.column_name} (${row.data_type})`);
    });
    
    console.log('\n' + '-'.repeat(70) + '\n');
    
    // Check which expected columns are missing
    const missingColumns = EXPECTED_COLUMNS.filter(col => !actualColumns.has(col));
    
    if (missingColumns.length > 0) {
      console.log(`❌ Missing columns (${missingColumns.length}):\n`);
      missingColumns.forEach(col => console.log(`   ✗ ${col}`));
    } else {
      console.log('✅ All expected columns exist!');
    }
    
    console.log('\n' + '-'.repeat(70) + '\n');
    
    // Check the history query columns
    const historyQueryColumns = [
      'dt.id', 'dt.status', 'dt.payout_amount', 'dt.distance_text',
      'dt.started_at', 'dt.completed_at', 'dt.cancel_reason'
    ];
    
    console.log('Columns used in history query:\n');
    historyQueryColumns.forEach(col => {
      const colName = col.split('.')[1];
      if (actualColumns.has(colName)) {
        console.log(`   ✅ ${col}`);
      } else {
        console.log(`   ❌ ${col} - NOT FOUND`);
      }
    });
    
  } finally {
    client.release();
    pool.end();
  }
}

checkDeliveryTripsSchema();
