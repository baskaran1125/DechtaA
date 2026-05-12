/**
 * Database Diagnostic & Verification Tool
 * Checks schema, runs migrations, and fetches all data
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

async function checkConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connected:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
}

async function alterDeliveryTripsTable(client) {
  console.log('\n📝 Adding missing columns to delivery_trips...');
  const columns = [
    { name: 'delivery_fee', type: 'NUMERIC(15, 2)', default: '0.00' },
    { name: 'delivery_otp', type: 'VARCHAR(4)', default: null },
    { name: 'otp_verified', type: 'BOOLEAN', default: 'FALSE' },
    { name: 'distance_text', type: 'VARCHAR(50)', default: null },
  ];
  
  for (const col of columns) {
    try {
      const query = `ALTER TABLE delivery_trips ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}${col.default ? ` DEFAULT ${col.default}` : ''}`;
      await client.query(query);
      console.log(`  ✅ ${col.name}`);
    } catch (error) {
      console.log(`  ⚠️  ${col.name}: ${error.message.split('\n')[0]}`);
    }
  }
}

async function verifyTableStructure(client) {
  console.log('\n🔍 Verifying table structures...');
  
  const tables = ['delivery_trips', 'driver_wallets', 'driver_transactions', 'orders'];
  
  for (const tableName of tables) {
    console.log(`\n  📋 ${tableName}:`);
    try {
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);
      
      if (result.rows.length === 0) {
        console.log(`    ⚠️  Table not found!`);
      } else {
        result.rows.forEach(row => {
          console.log(`    - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'}`);
        });
      }
    } catch (error) {
      console.log(`    ❌ Error: ${error.message}`);
    }
  }
}

async function fetchAllData(client) {
  console.log('\n📊 Fetching data...\n');
  
  // Orders
  try {
    const orders = await client.query(`SELECT COUNT(*) as count FROM orders`);
    console.log(`📦 Orders: ${orders.rows[0].count}`);
  } catch (e) { console.log(`⚠️  Orders: ${e.message}`); }
  
  // Delivery Trips
  try {
    const trips = await client.query(`SELECT COUNT(*) as count FROM delivery_trips`);
    console.log(`🚗 Delivery Trips: ${trips.rows[0].count}`);
    
    if (trips.rows[0].count > 0) {
      const tripDetails = await client.query(`
        SELECT id, driver_id, order_id, status, created_at 
        FROM delivery_trips 
        LIMIT 5
      `);
      console.log('\n   Recent trips:');
      tripDetails.rows.forEach(trip => {
        console.log(`   - Trip ${trip.id.substring(0, 8)}: driver ${trip.driver_id}, order ${trip.order_id}, status ${trip.status}`);
      });
    }
  } catch (e) { console.log(`⚠️  Delivery Trips: ${e.message}`); }
  
  // Drivers
  try {
    const drivers = await client.query(`SELECT COUNT(*) as count FROM driver_profiles`);
    console.log(`👥 Drivers: ${drivers.rows[0].count}`);
  } catch (e) { console.log(`⚠️  Drivers: ${e.message}`); }
  
  // Driver Vehicles
  try {
    const vehicles = await client.query(`SELECT COUNT(*) as count FROM driver_vehicles`);
    console.log(`🛞 Driver Vehicles: ${vehicles.rows[0].count}`);
  } catch (e) { console.log(`⚠️  Driver Vehicles: ${e.message}`); }
  
  // Driver Wallets
  try {
    const wallets = await client.query(`SELECT COUNT(*) as count FROM driver_wallets`);
    console.log(`💰 Driver Wallets: ${wallets.rows[0].count}`);
  } catch (e) { console.log(`⚠️  Driver Wallets: ${e.message}`); }
  
  // Driver Transactions
  try {
    const trans = await client.query(`SELECT COUNT(*) as count FROM driver_transactions`);
    console.log(`💳 Driver Transactions: ${trans.rows[0].count}`);
  } catch (e) { console.log(`⚠️  Driver Transactions: ${e.message}`); }
}

async function runDiagnostics() {
  console.log('\n🔧 DATABASE DIAGNOSTICS & REPAIR\n');
  console.log('='.repeat(50));
  
  const connected = await checkConnection();
  if (!connected) {
    console.log('\nCannot proceed without database connection.');
    process.exit(1);
  }
  
  const client = await pool.connect();
  
  try {
    // Step 1: Create missing tables
    console.log('\n📚 Creating missing tables...');
    const initSQL = fs.readFileSync(path.join(__dirname, 'INIT_MISSING_TABLES.sql'), 'utf8');
    
    // Split by ; and filter empty statements
    const statements = initSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));
    
    for (const statement of statements) {
      try {
        await client.query(statement);
      } catch (error) {
        // Ignore "already exists" errors
        if (!error.message.includes('already exists')) {
          console.log(`   ⚠️  ${error.message.split('\n')[0]}`);
        }
      }
    }
    console.log('  ✅ Tables created/verified');
    
    // Step 2: Alter tables to add missing columns
    await alterDeliveryTripsTable(client);
    
    // Step 3: Verify structure
    await verifyTableStructure(client);
    
    // Step 4: Fetch data
    await fetchAllData(client);
    
    console.log('\n' + '='.repeat(50));
    console.log('\n✅ Database diagnostics complete!\n');
    
  } catch (error) {
    console.error('\n❌ Error during diagnostics:', error);
  } finally {
    await client.end();
    await pool.end();
  }
}

runDiagnostics().catch(console.error);
