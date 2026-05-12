const db = require('./src/config/database');

(async () => {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('  COMPREHENSIVE ORDERS STATUS CHECK FOR ORDERS #8 AND #9');
    console.log('='.repeat(70) + '\n');

    // Get all details about these orders
    const result = await db.query(`
      SELECT 
        o.id,
        o.status as order_status,
        o.vendor_id,
        o.customer_name,
        o.total_amount,
        o.created_at,
        dt.id as trip_id,
        dt.status as trip_status,
        dt.completed_at,
        dt.driver_id,
        dt.created_at as trip_created_at
      FROM orders o
      LEFT JOIN delivery_trips dt ON o.id = dt.order_id
      WHERE o.id IN (8, 9)
      ORDER BY o.id DESC
    `);

    console.log(`Found ${result.rows.length} order(s)\n`);

    result.rows.forEach((row, idx) => {
      console.log(`📦 Order #${row.id}:`);
      console.log(`   ├─ Order Status: "${row.order_status}"`);
      console.log(`   ├─ Trip Status: "${row.trip_status}"`);
      console.log(`   ├─ Completed At: ${row.completed_at || 'null'}`);
      console.log(`   ├─ Vendor ID: ${row.vendor_id}`);
      console.log(`   ├─ Driver ID: ${row.driver_id}`);
      console.log(`   ├─ Amount: ${row.total_amount}`);
      console.log(`   └─ Trip ID: ${row.trip_id}`);

      // Check status mapping
      console.log(`\n   🔍 Vendor Dashboard Mapping:`);
      const normalized = ['delivered', 'completed', 'done'].includes(String(row.order_status || '').toLowerCase())
        ? 'delivered'
        : String(row.order_status || '').toLowerCase();
      const uiStatus = normalized === 'delivered' ? 'COMPLETED' : normalized === 'in_transit' || normalized === 'assigned' || normalized === 'confirmed' ? 'LIVE' : 'PENDING';
      
      console.log(`   Status: "${row.order_status}" → "${uiStatus}" tab`);
      
      if (row.trip_status === 'delivered' && row.order_status !== 'delivered') {
        console.log(`\n   ⚠️  ISSUE DETECTED:`);
        console.log(`   Trip is "delivered" (completed at ${row.completed_at})`);
        console.log(`   But order status is "${row.order_status}" (NOT "delivered")`);
        console.log(`\n   REASON: Backend has NOT been updated yet`);
        console.log(`   FIX: completeDelivery() needs to UPDATE orders.status`);
        console.log(`\n   🚀 SOLUTION: Restart backend with: npm start`);
      } else if (row.order_status === 'delivered' && row.trip_status === 'delivered') {
        console.log(`\n   ✅ STATUS CORRECT`);
        console.log(`   Both trip and order show as "delivered"`);
      }

      console.log('\n' + '-'.repeat(70) + '\n');
    });

    // Summary
    const mismatch = result.rows.filter(r => r.trip_status === 'delivered' && r.order_status !== 'delivered');
    
    console.log('📊 SUMMARY:\n');
    console.log(`Total orders checked: ${result.rows.length}`);
    console.log(`Status mismatches: ${mismatch.length}`);
    
    if (mismatch.length > 0) {
      console.log(`\n❌ PROBLEM: ${mismatch.length} order(s) not updated`);
      console.log('\n🔧 SOLUTION:');
      console.log('   1. Kill backend: taskkill /PID <pid> /F');
      console.log('   2. Restart: npm start');
      console.log('   3. Run this script again to verify');
    } else {
      console.log('\n✅ ALL ORDERS CORRECT');
      console.log('   Check vendor dashboard refresh (might need 30 sec auto-poll)');
    }

    console.log('\n' + '='.repeat(70) + '\n');
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
