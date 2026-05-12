/**
 * ══════════════════════════════════════════════════════════════════════════════
 * ORDERS DEMO SCRIPT - Safe Testing Without Affecting Production Data
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * This script creates demo orders for testing all order features:
 * - Available orders (unassigned)
 * - Accepted orders (driver assigned)
 * - Orders in different statuses (pending, picked up, in transit, delivered, cancelled)
 * - Delivery trips with various states
 * 
 * SAFETY:
 * - Uses test demo data only
 * - Easily rollbackable with included cleanup script
 * - Does NOT affect existing driver or user data
 * - Can run multiple times (checks for duplicates)
 * 
 * USAGE:
 * node demo-orders.js              # Create demo data
 * node demo-orders.js --cleanup    # Remove demo data
 * node demo-orders.js --check      # Show demo data stats
 * ══════════════════════════════════════════════════════════════════════════════
 */

require('dotenv').config();
const db = require('./src/config/database');

// ──────────────────────────────────────────────────────────────────────────────
// CONSTANTS & CONFIGURATION
// ──────────────────────────────────────────────────────────────────────────────

const DEMO_TAG = '[DEMO]'; // Mark all demo data with this tag

// Vendor IDs (as valid UUIDs)
const VENDOR_ID_1 = '550e8400-e29b-41d4-a716-446655440000';
const VENDOR_ID_2 = '550e8400-e29b-41d4-a716-446655440001';

const DEMO_DRIVERS = [
  {
    mobile_number: '9111111111',
    full_name: 'Demo Driver One',
    status: 'online',
    is_approved: true,
    is_online: true,
  },
  {
    mobile_number: '9222222222',
    full_name: 'Demo Driver Two',
    status: 'online',
    is_approved: true,
    is_online: true,
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// DEMO ORDERS WITH DIFFERENT STATUSES
// ──────────────────────────────────────────────────────────────────────────────

function generateDemoOrders() {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 3600000);
  const twoHoursAgo = new Date(now.getTime() - 7200000);
  const oneDayAgo = new Date(now.getTime() - 86400000);

  return [
    // ─── AVAILABLE ORDERS (NO DRIVER ASSIGNED) ───────────────────────────────
    {
      vendor_id: VENDOR_ID_1,
      driver_id: null, // ← Not assigned to any driver
      product_name: `${DEMO_TAG} Laptop - Available for Delivery`,
      customer_name: 'Arjun Kumar',
      customer_phone: '9999999901',
      status: 'Pending', // Waiting for driver to accept
      delivery_fee: 150,
      total_amount: 45150,
      vehicle_type: 'Bike',
      pickup_address: 'Tech Store Mumbai, Fort Area',
      delivery_address: 'Bandra, Mumbai',
      delivery_latitude: 19.0596,
      delivery_longitude: 72.8295,
      vendor_shop_name: 'Tech Store Mumbai',
      items: JSON.stringify([{ name: 'Laptop', qty: 1, price: 45000 }]),
      order_date: now,
      created_at: now,
      updated_at: now,
    },
    {
      vendor_id: VENDOR_ID_1,
      driver_id: null,
      product_name: `${DEMO_TAG} Phone Case - Available for Delivery`,
      customer_name: 'Priya Sharma',
      customer_phone: '9999999902',
      status: 'Pending',
      delivery_fee: 50,
      total_amount: 550,
      vehicle_type: 'Bike',
      pickup_address: 'Tech Store Mumbai, Fort Area',
      delivery_address: 'Dadar, Mumbai',
      delivery_latitude: 19.0176,
      delivery_longitude: 72.8298,
      vendor_shop_name: 'Tech Store Mumbai',
      items: JSON.stringify([{ name: 'Phone Case', qty: 2, price: 500 }]),
      order_date: now,
      created_at: now,
      updated_at: now,
    },
    {
      vendor_id: VENDOR_ID_2,
      driver_id: null,
      product_name: `${DEMO_TAG} Books Bundle - Available for Delivery`,
      customer_name: 'Vikram Das',
      customer_phone: '9999999903',
      status: 'Pending',
      delivery_fee: 100,
      total_amount: 1100,
      vehicle_type: 'Bike',
      pickup_address: 'Quick Mart Delhi, Connaught Place',
      delivery_address: 'Greater Kailash, Delhi',
      delivery_latitude: 28.5244,
      delivery_longitude: 77.2067,
      vendor_shop_name: 'Quick Mart Delhi',
      items: JSON.stringify([{ name: 'Books', qty: 5, price: 1000 }]),
      order_date: now,
      created_at: now,
      updated_at: now,
    },

    // ─── ACCEPTED ORDERS (DRIVER ASSIGNED, IN TRANSIT) ─────────────────────────
    {
      vendor_id: VENDOR_ID_1,
      // driver_id will be set after we create drivers
      product_name: `${DEMO_TAG} Charger - Accepted & In Transit`,
      customer_name: 'Sneha Verma',
      customer_phone: '9999999904',
      status: 'Assigned',
      delivery_fee: 75,
      total_amount: 575,
      vehicle_type: 'Bike',
      pickup_address: 'Tech Store Mumbai, Fort Area',
      delivery_address: 'Colaba, Mumbai',
      delivery_latitude: 18.9380,
      delivery_longitude: 72.8329,
      vendor_shop_name: 'Tech Store Mumbai',
      items: JSON.stringify([{ name: 'Phone Charger', qty: 1, price: 500 }]),
      delivery_otp: '1234',
      order_date: oneHourAgo,
      created_at: oneHourAgo,
      updated_at: oneHourAgo,
    },

    // ─── PICKED UP ORDERS (DRIVER AT DELIVERY LOCATION) ─────────────────────────
    {
      vendor_id: VENDOR_ID_1,
      // driver_id will be set after we create drivers
      product_name: `${DEMO_TAG} Keyboard - Picked Up, Going to Delivery`,
      customer_name: 'Rohit Iyer',
      customer_phone: '9999999905',
      status: 'Out for Delivery',
      delivery_fee: 80,
      total_amount: 2080,
      vehicle_type: 'Bike',
      pickup_address: 'Tech Store Mumbai, Fort Area',
      delivery_address: 'Worli, Mumbai',
      delivery_latitude: 19.0176,
      delivery_longitude: 72.8194,
      vendor_shop_name: 'Tech Store Mumbai',
      items: JSON.stringify([{ name: 'Mechanical Keyboard', qty: 1, price: 2000 }]),
      delivery_otp: '5678',
      order_date: twoHoursAgo,
      created_at: twoHoursAgo,
      updated_at: oneHourAgo,
    },

    // ─── DELIVERED ORDERS (COMPLETED) ─────────────────────────────────────────
    {
      vendor_id: VENDOR_ID_1,
      // driver_id will be set after we create drivers
      product_name: `${DEMO_TAG} Screen Protector - Delivered`,
      customer_name: 'Anjali Nair',
      customer_phone: '9999999906',
      status: 'Delivered',
      delivery_fee: 40,
      total_amount: 340,
      vehicle_type: 'Bike',
      pickup_address: 'Tech Store Mumbai, Fort Area',
      delivery_address: 'Santa Cruz, Mumbai',
      delivery_latitude: 19.0833,
      delivery_longitude: 72.8333,
      vendor_shop_name: 'Tech Store Mumbai',
      items: JSON.stringify([{ name: 'Screen Protector', qty: 3, price: 300 }]),
      delivery_otp: '9012',
      order_date: oneDayAgo,
      created_at: oneDayAgo,
      updated_at: oneDayAgo,
    },

    // ─── CANCELLED ORDERS ────────────────────────────────────────────────────────
    {
      vendor_id: VENDOR_ID_2,
      driver_id: null,
      product_name: `${DEMO_TAG} Notebook Set - Cancelled`,
      customer_name: 'Karan Malhotra',
      customer_phone: '9999999907',
      status: 'Cancelled',
      delivery_fee: 50,
      total_amount: 350,
      vehicle_type: 'Bike',
      pickup_address: 'Quick Mart Delhi, Connaught Place',
      delivery_address: 'Lajpat Nagar, Delhi',
      delivery_latitude: 28.5684,
      delivery_longitude: 77.2315,
      vendor_shop_name: 'Quick Mart Delhi',
      items: JSON.stringify([{ name: 'Notebook Set', qty: 1, price: 300 }]),
      order_date: oneDayAgo,
      created_at: oneDayAgo,
      updated_at: oneDayAgo,
    },
  ];
}

// ──────────────────────────────────────────────────────────────────────────────
// CREATE DEMO DATA
// ──────────────────────────────────────────────────────────────────────────────

async function createDemoData() {
  console.log('\n🚀 Creating demo orders for testing...\n');

  try {
    // ─── Insert Demo Drivers ──────────────────────────────────────────────────
    console.log('👤 Creating demo drivers...');
    let driverIds = [];
    
    for (const driver of DEMO_DRIVERS) {
      const existing = await db.selectOne('driver_profiles', { mobile_number: driver.mobile_number });
      if (!existing) {
        // Insert driver
        const result = await db.query(
          `INSERT INTO driver_profiles (mobile_number, full_name, status, is_approved, is_online)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [driver.mobile_number, driver.full_name, driver.status, driver.is_approved, driver.is_online]
        );
        const driverId = result.rows[0].id;
        driverIds.push(driverId);
        
        // Also create vehicle for driver
        await db.query(
          `INSERT INTO driver_vehicles (driver_id, vehicle_type, model_name)
           VALUES ($1, $2, $3)`,
          [driverId, 'Bike', 'Hero Honda']
        );
        console.log(`  ✅ Created driver: ${driver.full_name} (${driverId})`);
      } else {
        console.log(`  ⚠️  Driver already exists: ${driver.full_name}`);
        driverIds.push(existing.id);
      }
    }

    // ─── Insert Demo Orders ───────────────────────────────────────────────────
    console.log('\n📋 Inserting demo orders...');
    const demoOrders = generateDemoOrders();
    
    // Assign driver IDs to orders that need them
    if (driverIds.length > 0) {
      demoOrders[3].driver_id = driverIds[0]; // Charger - Assigned to first driver
      demoOrders[4].driver_id = driverIds[0]; // Keyboard - Assigned to first driver
      demoOrders[5].driver_id = driverIds[0]; // Screen Protector - Assigned to first driver
    }

    const insertedOrderIds = [];
    for (const order of demoOrders) {
      const existing = await db.selectOne('orders', { 
        product_name: order.product_name 
      });
      
      if (!existing) {
        const result = await db.query(
          `INSERT INTO orders (
            vendor_id, driver_id, product_name, customer_name, customer_phone,
            status, delivery_fee, total_amount, vehicle_type, pickup_address,
            delivery_address, delivery_latitude, delivery_longitude,
            vendor_shop_name, items, delivery_otp, order_date, created_at, updated_at
           ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
           )
           RETURNING id`,
          [
            order.vendor_id, order.driver_id, order.product_name, order.customer_name,
            order.customer_phone, order.status, order.delivery_fee, order.total_amount,
            order.vehicle_type, order.pickup_address, order.delivery_address,
            order.delivery_latitude, order.delivery_longitude, order.vendor_shop_name,
            order.items, order.delivery_otp, order.order_date, order.created_at, order.updated_at
          ]
        );
        insertedOrderIds.push(result.rows[0].id);
        console.log(`  ✅ Created order: ${order.product_name}`);
      } else {
        console.log(`  ⚠️  Order already exists: ${order.product_name}`);
        insertedOrderIds.push(existing.id);
      }
    }

    // ─── Insert Demo Delivery Trips ───────────────────────────────────────────
    console.log('\n🚗 Inserting demo delivery trips...');
    if (insertedOrderIds.length >= 3 && driverIds.length > 0) {
      const demoTrips = [
        {
          order_id: insertedOrderIds[3], // Charger order
          driver_id: driverIds[0],
          status: 'accepted',
          distance_text: '5.2 km',
          payout_amount: 75,
        },
        {
          order_id: insertedOrderIds[4], // Keyboard order
          driver_id: driverIds[0],
          status: 'picked_up',
          distance_text: '3.8 km',
          payout_amount: 80,
        },
        {
          order_id: insertedOrderIds[5], // Screen Protector order
          driver_id: driverIds[0],
          status: 'delivered',
          distance_text: '4.1 km',
          payout_amount: 40,
        },
      ];

      for (const trip of demoTrips) {
        const existing = await db.selectOne('delivery_trips', { order_id: trip.order_id });
        if (!existing) {
          await db.query(
            `INSERT INTO delivery_trips (order_id, driver_id, status, distance_text, payout_amount)
             VALUES ($1, $2, $3, $4, $5)`,
            [trip.order_id, trip.driver_id, trip.status, trip.distance_text, trip.payout_amount]
          );
          console.log(`  ✅ Created trip for order ID: ${trip.order_id} (Status: ${trip.status})`);
        } else {
          console.log(`  ⚠️  Trip already exists for order: ${trip.order_id}`);
        }
      }
    }

    console.log('\n✨ Demo data created successfully!\n');
    await printDemoStats();
  } catch (error) {
    console.error('\n❌ Error creating demo data:', error.message);
    process.exit(1);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// CLEANUP - REMOVE ALL DEMO DATA
// ──────────────────────────────────────────────────────────────────────────────

async function cleanupDemoData() {
  console.log('\n🧹 Removing demo data...\n');

  try {
    // Remove in order of dependencies
    // Delete delivery trips first (foreign key)
    console.log('🗑️  Deleting delivery trips for demo orders...');
    await db.query(
      `DELETE FROM delivery_trips 
       WHERE order_id IN (
         SELECT id FROM orders WHERE product_name ILIKE $1
       )`,
      [`%${DEMO_TAG}%`]
    );
    console.log(`  ✅ Deleted delivery trips`);

    // Delete orders
    console.log('\n🗑️  Deleting demo orders...');
    const orderResult = await db.query(
      `DELETE FROM orders WHERE product_name ILIKE $1 RETURNING id`,
      [`%${DEMO_TAG}%`]
    );
    console.log(`  ✅ Deleted ${orderResult.rows.length} orders`);

    // Delete demo drivers
    console.log('\n🗑️  Deleting demo drivers...');
    for (const driver of DEMO_DRIVERS) {
      const driverResult = await db.query(
        'DELETE FROM driver_profiles WHERE mobile_number = $1 AND full_name ILIKE $2 RETURNING id',
        [driver.mobile_number, `%${DEMO_TAG}%`]
      );
      if (driverResult.rows.length > 0) {
        console.log(`  ✅ Deleted driver: ${driver.full_name}`);
      }
    }

    console.log('\n✨ Demo data cleaned up successfully!\n');
  } catch (error) {
    console.error('\n❌ Error cleaning up demo data:', error.message);
    process.exit(1);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// SHOW DEMO DATA STATISTICS
// ──────────────────────────────────────────────────────────────────────────────

async function printDemoStats() {
  try {
    const orderResult = await db.query(
      "SELECT COUNT(*) as count FROM orders WHERE product_name ILIKE $1",
      [`%${DEMO_TAG}%`]
    );
    const driverResult = await db.query(
      "SELECT COUNT(*) as count FROM driver_profiles WHERE full_name ILIKE $1",
      [`%${DEMO_TAG}%`]
    );
    const tripResult = await db.query(
      "SELECT COUNT(*) as count FROM delivery_trips WHERE order_id IN (SELECT id FROM orders WHERE product_name ILIKE $1)",
      [`%${DEMO_TAG}%`]
    );

    console.log('📊 DEMO DATA STATISTICS:');
    console.log(`  Drivers:  ${driverResult.rows[0].count}`);
    console.log(`  Orders:   ${orderResult.rows[0].count}`);
    console.log(`  Trips:    ${tripResult.rows[0].count}`);
    console.log('');

    // Show order statuses
    const statusStats = await db.query(
      "SELECT status, COUNT(*) FROM orders WHERE product_name ILIKE $1 GROUP BY status",
      [`%${DEMO_TAG}%`]
    );
    console.log('📋 ORDERS BY STATUS:');
    statusStats.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count}`);
    });
    console.log('');
  } catch (error) {
    console.error('Error fetching stats:', error.message);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN SCRIPT EXECUTION
// ──────────────────────────────────────────────────────────────────────────────

async function main() {
  const command = process.argv[2];

  if (command === '--cleanup') {
    await cleanupDemoData();
    process.exit(0);
  } else if (command === '--check') {
    await printDemoStats();
    process.exit(0);
  } else {
    await createDemoData();
    process.exit(0);
  }
}

main().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
