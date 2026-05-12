#!/usr/bin/env node
/**
 * Check what's in the delivery_trips table for driver 4
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

async function checkDeliveryTrips() {
  const client = await pool.connect();
  try {
    console.log('\n' + '='.repeat(70));
    console.log('  DELIVERY TRIPS FOR DRIVER 4');
    console.log('='.repeat(70) + '\n');
    
    // Check all trips for driver 4
    const result = await client.query(`
      SELECT 
        dt.id,
        dt.order_id,
        dt.driver_id,
        dt.status,
        dt.payout_amount,
        dt.started_at,
        dt.completed_at,
        o.total_amount,
        o.product_name,
        o.status as order_status
      FROM delivery_trips dt
      LEFT JOIN orders o ON dt.order_id = o.id
      WHERE dt.driver_id = 4
      ORDER BY dt.created_at DESC
    `);
    
    console.log(`Found ${result.rows.length} trips for driver 4\n`);
    
    if (result.rows.length === 0) {
      console.log('❌ No delivery trips found for driver 4!');
      console.log('This means orders might not be creating delivery_trips records.\n');
      return;
    }
    
    // Group by status
    const byStatus = {};
    result.rows.forEach(trip => {
      if (!byStatus[trip.status]) byStatus[trip.status] = [];
      byStatus[trip.status].push(trip);
    });
    
    for (const [status, trips] of Object.entries(byStatus)) {
      console.log(`📋 Status: ${status} (${trips.length} trips)\n`);
      trips.forEach(trip => {
        console.log(`   Trip ID: ${trip.id}`);
        console.log(`   Order ID: ${trip.order_id} (${trip.product_name})`);
        console.log(`   Payout: ₹${trip.payout_amount}`);
        console.log(`   Started: ${trip.started_at}`);
        console.log(`   Completed: ${trip.completed_at || 'NOT SET'}`);
        console.log(`   Order Status: ${trip.order_status}\n`);
      });
    }
    
    // Check specifically for 'delivered' trips
    const deliveredCount = result.rows.filter(r => r.status === 'delivered').length;
    console.log('='.repeat(70));
    console.log(`\n✅ Delivered trips: ${deliveredCount}`);
    console.log(`\nIf delivered trips = 0, completed orders aren't being marked 'delivered'`);
    console.log(`If delivered trips > 0 but not showing in app, the query might be wrong.\n`);
    
  } finally {
    client.release();
    pool.end();
  }
}

checkDeliveryTrips();
