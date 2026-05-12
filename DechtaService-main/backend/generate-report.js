/**
 * Comprehensive Data Fetch & Validation Report
 * Generates a detailed report of all data and potential issues
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'dechta',
});

async function generateReport() {
  const client = await pool.connect();
  const report = [];
  
  try {
    report.push('DATABASE COMPREHENSIVE REPORT');
    report.push('='.repeat(80));
    report.push(`Generated: ${new Date().toISOString()}\n`);
    
    // 1. Schema Summary
    report.push('1. TABLE STRUCTURE');
    report.push('-'.repeat(80));
    
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    for (const table of tables.rows) {
      const cols = await client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_name = $1
      `, [table.table_name]);
      
      const rows = await client.query(`SELECT COUNT(*) as count FROM ${table.table_name}`);
      report.push(`${table.table_name}: ${cols.rows[0].count} columns, ${rows.rows[0].count} rows`);
    }
    
    // 2. Orders Analysis
    report.push('\n2. ORDERS SUMMARY');
    report.push('-'.repeat(80));
    
    const orderStats = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
      FROM orders
    `);
    
    const stats = orderStats.rows[0];
    report.push(`Total Orders: ${stats.total}`);
    report.push(`  - Pending: ${stats.pending}`);
    report.push(`  - Processing: ${stats.processing}`);
    report.push(`  - Delivered: ${stats.delivered}`);
    report.push(`  - Cancelled: ${stats.cancelled}`);
    
    // 3. Delivery Trips Analysis
    report.push('\n3. DELIVERY TRIPS');
    report.push('-'.repeat(80));
    
    const tripStats = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT driver_id) as unique_drivers,
        COUNT(DISTINCT order_id) as unique_orders,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
        COUNT(CASE WHEN status = 'picked_up' THEN 1 END) as picked_up,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
      FROM delivery_trips
    `);
    
    const tripSt = tripStats.rows[0];
    report.push(`Total Trips: ${tripSt.total}`);
    report.push(`Unique Drivers: ${tripSt.unique_drivers}`);
    report.push(`Unique Orders: ${tripSt.unique_orders}`);
    report.push(`Status Breakdown:`);
    report.push(`  - Accepted: ${tripSt.accepted}`);
    report.push(`  - Picked Up: ${tripSt.picked_up}`);
    report.push(`  - Delivered: ${tripSt.delivered}`);
    report.push(`  - Cancelled: ${tripSt.cancelled}`);
    
    // 4. Driver Statistics
    report.push('\n4. DRIVER STATISTICS');
    report.push('-'.repeat(80));
    
    const driverStats = await client.query(`
      SELECT 
        COUNT(*) as total_drivers,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive
      FROM driver_profiles
    `);
    
    const drivSt = driverStats.rows[0];
    report.push(`Total Drivers: ${drivSt.total_drivers}`);
    report.push(`  - Active: ${drivSt.active}`);
    report.push(`  - Inactive: ${drivSt.inactive}`);
    
    // 5. Vehicle Type Distribution
    report.push('\n5. VEHICLE TYPE DISTRIBUTION');
    report.push('-'.repeat(80));
    
    const vehicleTypes = await client.query(`
      SELECT vehicle_type, COUNT(*) as count
      FROM driver_vehicles
      GROUP BY vehicle_type
      ORDER BY count DESC
    `);
    
    vehicleTypes.rows.forEach(row => {
      report.push(`${row.vehicle_type}: ${row.count}`);
    });
    
    // 6. Recent Orders
    report.push('\n6. RECENT ORDERS (Last 10)');
    report.push('-'.repeat(80));
    
    const recentOrders = await client.query(`
      SELECT 
        id, 
        vendor_id, 
        customer_name, 
        status, 
        vehicle_type,
        delivery_fee,
        created_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    recentOrders.rows.forEach(order => {
      report.push(`Order #${order.id} | ${order.customer_name} | ${order.vehicle_type} | Status: ${order.status} | Fee: ${order.delivery_fee}`);
      report.push(`  Created: ${order.created_at}`);
    });
    
    // 7. Potential Issues
    report.push('\n7. DATA VALIDATION CHECKS');
    report.push('-'.repeat(80));
    
    // Check for orders without delivery_fee
    const noFeeOrders = await client.query(`
      SELECT COUNT(*) as count FROM orders 
      WHERE delivery_fee IS NULL OR delivery_fee = 0
    `);
    if (noFeeOrders.rows[0].count > 0) {
      report.push(`⚠️  Orders without delivery fee: ${noFeeOrders.rows[0].count}`);
    }
    
    // Check for orphaned delivery trips
    const orphanTrips = await client.query(`
      SELECT COUNT(*) as count 
      FROM delivery_trips dt
      LEFT JOIN orders o ON dt.order_id = o.id
      WHERE o.id IS NULL
    `);
    if (orphanTrips.rows[0].count > 0) {
      report.push(`⚠️  Orphaned delivery trips: ${orphanTrips.rows[0].count}`);
    }
    
    // Check vehicle type format consistency
    const vehicleFormats = await client.query(`
      SELECT DISTINCT vehicle_type FROM driver_vehicles
    `);
    report.push(`\nVehicle formats in DB: ${vehicleFormats.rows.map(r => r.vehicle_type).join(', ')}`);
    
    const orderFormats = await client.query(`
      SELECT DISTINCT vehicle_type FROM orders
    `);
    report.push(`Vehicle formats in orders: ${orderFormats.rows.map(r => r.vehicle_type).join(', ')}`);
    
    // 8. Table Column Checks
    report.push('\n8. CRITICAL COLUMNS CHECK');
    report.push('-'.repeat(80));
    
    const criticalColumns = {
      'delivery_trips': ['id', 'driver_id', 'order_id', 'status', 'delivery_otp', 'otp_verified', 'delivery_fee', 'distance_text'],
      'orders': ['id', 'status', 'vehicle_type', 'delivery_fee', 'delivery_otp'],
      'driver_vehicles': ['id', 'driver_id', 'vehicle_type', 'weight_capacity_kg', 'dimensions_length_cm'],
      'driver_wallets': ['id', 'driver_id', 'balance', 'total_earned', 'today_earnings', 'total_trips'],
    };
    
    for (const [tableName, columns] of Object.entries(criticalColumns)) {
      for (const col of columns) {
        try {
          await client.query(`SELECT ${col} FROM ${tableName} LIMIT 1`);
          report.push(`✅ ${tableName}.${col}`);
        } catch (error) {
          report.push(`❌ ${tableName}.${col} - MISSING OR ERROR`);
        }
      }
    }
    
    report.push('\n' + '='.repeat(80));
    report.push('END OF REPORT\n');
    
    const reportText = report.join('\n');
    console.log(reportText);
    
    // Save to file
    fs.writeFileSync(path.join(__dirname, 'DATABASE_REPORT.txt'), reportText);
    console.log(`\n📄 Report saved to DATABASE_REPORT.txt`);
    
  } catch (error) {
    console.error('Error generating report:', error);
  } finally {
    await client.end();
    await pool.end();
  }
}

generateReport().catch(console.error);
