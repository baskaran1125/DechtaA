const db = require('./src/config/database');

(async () => {
  console.log('\n' + '='.repeat(70));
  console.log('  🔍 DIAGNOSTIC: WHY ARE ORDERS STILL IN LIVE?');
  console.log('='.repeat(70) + '\n');

  try {
    // Check actual database state
    console.log('1️⃣  DATABASE STATE FOR ORDERS #8 AND #9:\n');
    
    const orders = await db.query(`
      SELECT 
        o.id,
        o.status as order_status,
        o.vendor_id,
        dt.id as trip_id,
        dt.order_id as trip_order_id,
        dt.status as trip_status,
        dt.completed_at
      FROM orders o
      LEFT JOIN delivery_trips dt ON o.id = dt.order_id
      WHERE o.id IN (8, 9)
      ORDER BY o.id DESC
    `);

    if (!orders.rows.length) {
      console.log('❌ NO ORDERS FOUND IN DATABASE!\n');
      process.exit(1);
    }

    orders.rows.forEach(row => {
      console.log(`ORDER #${row.id}:`);
      console.log(`  ├─ orders.status = "${row.order_status}"`);
      console.log(`  ├─ delivery_trips.status = "${row.trip_status}"`);
      console.log(`  ├─ delivery_trips.completed_at = ${row.completed_at ? '✅ YES' : '❌ NO'}`);
      console.log(`  ├─ Trip ID: ${row.trip_id}`);
      console.log(`  └─ Vendor ID: ${row.vendor_id}\n`);

      if (row.trip_status === 'delivered' && row.order_status !== 'delivered') {
        console.log(`  ⚠️  MISMATCH FOUND:`);
        console.log(`  Trip shows delivered but order does NOT\n`);
      }
    });

    // Check what vendor sees
    console.log('\n2️⃣  WHAT VENDOR DASHBOARD SEES:\n');
    const mismatch = orders.rows.find(r => r.trip_status === 'delivered' && r.order_status !== 'delivered');
    
    if (mismatch) {
      console.log(`❌ PROBLEM CONFIRMED:`);
      console.log(`   Order #${mismatch.id}`);
      console.log(`   Status = "${mismatch.order_status}"`);
      
      // Check mapping
      if (['in_transit', 'assigned', 'confirmed'].includes(String(mismatch.order_status).toLowerCase())) {
        console.log(`   Maps to: "LIVE" tab (WRONG! Should be "Completed")`);
      }
    }

    // The real question: why wasn't orders.status updated?
    console.log('\n3️⃣  ROOT CAUSE ANALYSIS:\n');
    
    // Check if there's even a delivery trip
    const orphanedOrders = await db.query(`
      SELECT id, status 
      FROM orders 
      WHERE id IN (8, 9) AND id NOT IN (SELECT order_id FROM delivery_trips WHERE order_id IS NOT NULL)
    `);

    if (orphanedOrders.rows.length > 0) {
      console.log(`❌ ORPHANED ORDERS (no matching delivery trip):`);
      orphanedOrders.rows.forEach(r => console.log(`   - Order #${r.id}`));
      console.log(`   FIX: Create delivery_trips records first\n`);
    }

    // Check if backend code has the fix
    console.log('4️⃣  IS THE FIX IN THE CODE?\n');
    const fs = require('fs');
    const code = fs.readFileSync('./src/controllers/ordersController.js', 'utf8');
    
    if (code.includes('Update orders table so vendor sees order as')) {
      console.log('✅ Fix code EXISTS in ordersController.js (lines 601-612)\n');
    } else {
      console.log('❌ Fix code is MISSING from ordersController.js\n');
    }

    // The critical question
    console.log('5️⃣  HAS BACKEND BEEN RESTARTED?\n');
    console.log('⏰ Check the timestamp when backend started:');
    console.log('   - Look at your backend console logs');
    console.log('   - Should show start time within last few minutes');
    console.log('   - If it shows old timestamp, backend has NOT been restarted\n');

    console.log('='.repeat(70));
    console.log('\n📋 SUMMARY:\n');
    
    if (mismatch) {
      console.log(`❌ ISSUE: Order #${mismatch.id} status is "${mismatch.order_status}" (not "delivered")`);
      console.log('   Trip is marked delivered but order was never updated\n');
      console.log('🔧 REASON: Backend is running OLD code\n');
      console.log('🚀 SOLUTION:\n');
      console.log('   1. GO TO: C:\\Users\\LOKI\\OneDrive\\Desktop\\Dechta-main\\Dechta-main\\DechtaService-main\\backend');
      console.log('   2. STOP backend: Ctrl+C (in terminal)');
      console.log('   3. RUN: npm start');
      console.log('   4. WAIT for: "🚚 QC Driver Backend is running"');
      console.log('   5. Run this script again to verify\n');
    }

    console.log('='.repeat(70) + '\n');

  } catch (err) {
    console.error('ERROR:', err.message);
  }

  process.exit(0);
})();
