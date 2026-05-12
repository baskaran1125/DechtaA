#!/usr/bin/env node
/**
 * Initialize delivery_trips table
 * Run this once to set up the delivery tracking table for orders
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

async function initializeTable() {
  const client = await pool.connect();
  try {
    console.log('Creating delivery_trips table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS delivery_trips (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        driver_id BIGINT NOT NULL,
        status VARCHAR(50) DEFAULT 'accepted',
        payout_amount NUMERIC(15, 2) DEFAULT 0.00,
        started_at TIMESTAMPTZ DEFAULT NOW(),
        arrived_pickup_at TIMESTAMPTZ,
        departed_pickup_at TIMESTAMPTZ,
        arrived_dropoff_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        cancelled_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(order_id, driver_id)
      )
    `);
    console.log('✓ delivery_trips table created');

    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_delivery_trips_driver_id ON delivery_trips(driver_id)');
    console.log('✓ Index: driver_id');
    
    await client.query('CREATE INDEX IF NOT EXISTS idx_delivery_trips_order_id ON delivery_trips(order_id)');
    console.log('✓ Index: order_id');
    
    await client.query('CREATE INDEX IF NOT EXISTS idx_delivery_trips_status ON delivery_trips(status)');
    console.log('✓ Index: status');
    
    await client.query('CREATE INDEX IF NOT EXISTS idx_delivery_trips_driver_status ON delivery_trips(driver_id, status)');
    console.log('✓ Index: driver_id + status');
    
    await client.query('CREATE INDEX IF NOT EXISTS idx_delivery_trips_started_at ON delivery_trips(started_at DESC)');
    console.log('✓ Index: started_at DESC');

    console.log('\n✅ Database initialized successfully!');
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

initializeTable();
