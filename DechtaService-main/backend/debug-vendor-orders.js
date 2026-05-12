const db = require('./src/config/database');

async function debug() {
  console.log('🔍 DEBUGGING VENDOR ORDER STATUS ISSUE\n');

  try {
    // Check orders #8 and #9
    console.log('1️⃣  Checking order status in database...\n');
    const orders = await db.query(`
      SELECT 
        o.id,
        o.status as order_status,
        o.vendor_id,
        dt.id as trip_id,
        dt.status as trip_status,
        dt.completed_at,
        dt.driver_id
      FROM orders o
      LEFT JOIN delivery_trips dt ON o.id = dt.order_id
      WHERE o.id IN (8, 9)
      ORDER BY o.id DESC
    `);

    console.log('Orders found:');
    orders.rows.forEach(row => {
      console.log(`\n  Order #${row.id}:`);
      console.log(`    - orders.status: "${row.order_status}"`);
      console.log(`    - Trip status: "${row.trip_status}"`);
      console.log(`    - Trip completed_at: ${row.completed_at}`);
      console.log(`    - Vendor ID: ${row.vendor_id}`);
      
      if (row.trip_status === 'delivered' && row.order_status !== 'delivered') {
        console.log(`    ⚠️  MISMATCH: Trip is "delivered" but order is "${row.order_status}"`);
        console.log(`    💡 FIX NOT APPLIED - Need to update orders.status manually`);
      } else if (row.order_status === 'delivered') {
        console.log(`    ✅ Order status is correctly "delivered"`);
      }
    });

    // Check if completeDelivery function exists and has the fix
    console.log('\n\n2️⃣  Checking if fix is in ordersController.js...\n');
    const fs = require('fs');
    const controllerCode = fs.readFileSync('./src/controllers/ordersController.js', 'utf8');
    
    if (controllerCode.includes('Update orders table so vendor sees order as')) {
      console.log('✅ Fix code is present in ordersController.js');
      console.log('   Check lines 601-612');
    } else {
      console.log('❌ Fix code NOT FOUND in ordersController.js');
      console.log('   Need to add the fix again!');
    }

    // Check if backend is running the latest code
    console.log('\n\n3️⃣  Checking backend process...\n');
    console.log('⚠️  Backend must be RESTARTED for changes to take effect!');
    console.log('   If you modified ordersController.js, restart with: npm start\n');

    // Summary
    console.log('='.repeat(60));
    console.log('\n📋 SUMMARY:\n');
    
    const mismatchOrders = orders.rows.filter(r => r.trip_status === 'delivered' && r.order_status !== 'delivered');
    
    if (mismatchOrders.length > 0) {
      console.log(`❌ Found ${mismatchOrders.length} order(s) with mismatched status`);
      console.log('   Trip = delivered, but Order ≠ delivered\n');
      console.log('🔧 SOLUTION:\n');
      console.log('   Option A: Backend not restarted');
      console.log('     1. Kill old backend: taskkill /PID <pid>');
      console.log('     2. Run: npm start\n');
      console.log('   Option B: Fix not applied');
      console.log('     1. Check ordersController.js lines 601-612');
      console.log('     2. If missing, add the fix again\n');
    } else {
      console.log('✅ All order statuses are correct');
      console.log('   Check if vendor dashboard cache needs refresh\n');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  }

  process.exit(0);
}

debug();
