const db = require('./src/config/database');

(async () => {
  console.log('\n' + '='.repeat(70));
  console.log('  📊 ANALYZING VENDOR ORDER STATUS VALUES');
  console.log('='.repeat(70) + '\n');

  try {
    // Check all distinct status values in orders
    console.log('1️⃣  ALL DISTINCT STATUS VALUES IN ORDERS TABLE:\n');
    
    const statuses = await db.query(`
      SELECT DISTINCT status, COUNT(*) as count
      FROM orders
      GROUP BY status
      ORDER BY count DESC
    `);

    statuses.rows.forEach(row => {
      console.log(`  "${row.status}" - ${row.count} order(s)`);
    });

    // Check what vendor dashboard expects for "Completed" tab
    console.log('\n\n2️⃣  VENDOR DASHBOARD MAPPING (from OrdersPage.jsx):\n');
    
    console.log('  normalizeOrderStatus() checks for:');
    console.log('    - "delivered"');
    console.log('    - "completed"');
    console.log('    - "done"\n');
    
    console.log('  All of these map to: "delivered"');
    console.log('  Which then maps to UI tab: "Completed"\n');

    // Check what orders 8 and 9 currently have
    console.log('\n3️⃣  ORDERS #8 AND #9 CURRENT STATUS:\n');
    
    const targetOrders = await db.query(`
      SELECT id, status
      FROM orders
      WHERE id IN (8, 9)
      ORDER BY id DESC
    `);

    targetOrders.rows.forEach(order => {
      console.log(`Order #${order.id}: status = "${order.status}"`);
      
      // Check if it would map to "Live" or "Completed"
      const normalized = ['delivered', 'completed', 'done'].includes(String(order.status || '').toLowerCase())
        ? 'delivered'
        : String(order.status || '').toLowerCase();
      
      const uiTab = ['in_transit', 'assigned', 'confirmed'].includes(normalized) ? 'LIVE' : normalized === 'delivered' ? 'COMPLETED' : 'PENDING';
      
      console.log(`  → Maps to: "${uiTab}" tab`);
      
      if (uiTab === 'LIVE') {
        console.log(`  ❌ Currently in LIVE (wrong!)\n`);
      }
    });

    // Check delivery_trips status
    console.log('\n4️⃣  MATCHING DELIVERY_TRIPS STATUS:\n');
    
    const trips = await db.query(`
      SELECT dt.order_id, dt.status
      FROM delivery_trips dt
      WHERE dt.order_id IN (8, 9)
      ORDER BY dt.order_id DESC
    `);

    trips.rows.forEach(trip => {
      console.log(`Trip for order #${trip.order_id}: status = "${trip.status}"`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('\n🔍 ANALYSIS:\n');

    const mismatch = [];
    for (const order of targetOrders.rows) {
      const trip = trips.rows.find(t => t.order_id === order.id);
      if (trip && trip.status === 'delivered' && order.status !== 'delivered') {
        mismatch.push({
          orderId: order.id,
          orderStatus: order.status,
          tripStatus: trip.status
        });
      }
    }

    if (mismatch.length > 0) {
      console.log(`⚠️  MISMATCH FOUND: ${mismatch.length} order(s)`);
      mismatch.forEach(m => {
        console.log(`\n   Order #${m.orderId}:`);
        console.log(`   - Trip status: "${m.tripStatus}" (delivered)`);
        console.log(`   - Order status: "${m.orderStatus}" (NOT delivered)`);
        console.log(`   - Shows in vendor as: LIVE ❌`);
        console.log(`   - Should show as: COMPLETED ✅`);
      });
      
      console.log('\n\n💡 ROOT CAUSE: orders.status was never updated\n');
      console.log('🔧 This happens when:');
      console.log('   1. Backend completes delivery');
      console.log('   2. Updates delivery_trips ✅');
      console.log('   3. Does NOT update orders ❌ ← CURRENT ISSUE\n');
      
      console.log('🚀 SOLUTION:\n');
      console.log('   The fix has been applied to ordersController.js');
      console.log('   But backend must be RESTARTED to use it\n');
      
      console.log('   Steps:');
      console.log('   1. Stop backend: Ctrl+C (in terminal where npm start is running)');
      console.log('   2. Start backend: npm start');
      console.log('   3. Wait for: "🚚 QC Driver Backend is running"');
      console.log('   4. Run: node check-delivery-trips-issue.js');
      console.log('   5. Verify orders now show as "delivered"\n');
    } else {
      console.log('✅ All orders have correct status\n');
      console.log('   If still showing as LIVE in vendor dashboard:');
      console.log('   - Hard refresh: Ctrl+Shift+R');
      console.log('   - Clear browser cache');
      console.log('   - Check if vendor is using correct vendor_id\n');
    }

    console.log('='.repeat(70) + '\n');

  } catch (err) {
    console.error('ERROR:', err.message);
  }

  process.exit(0);
})();
