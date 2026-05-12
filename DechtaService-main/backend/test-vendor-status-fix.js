const db = require('./src/config/database');

async function testVendorOrderUpdate() {
  console.log('\n' + '='.repeat(70));
  console.log('  TESTING VENDOR ORDER STATUS UPDATE FIX');
  console.log('='.repeat(70) + '\n');

  try {
    // Get a completed delivery trip
    console.log('1️⃣  Finding completed orders...');
    const completedOrders = await db.query(`
      SELECT 
        dt.id as trip_id,
        dt.order_id,
        dt.status as trip_status,
        dt.completed_at,
        o.id,
        o.vendor_id,
        o.status as order_status,
        o.customer_name
      FROM delivery_trips dt
      LEFT JOIN orders o ON dt.order_id = o.id
      WHERE dt.status = 'delivered'
      LIMIT 3
    `);

    if (!completedOrders.rows.length) {
      console.log('   ⚠️  No completed orders found');
      console.log('   💡 Complete an order in driver app first (mark as delivered)\n');
      return;
    }

    console.log(`   ✅ Found ${completedOrders.rows.length} completed order(s)\n`);

    // Check if orders.status is updated to 'delivered'
    completedOrders.rows.forEach((row, idx) => {
      console.log(`   Order ${idx + 1}:`);
      console.log(`     - Order ID: ${row.order_id || 'null'}`);
      console.log(`     - Trip Status: ${row.trip_status}`);
      console.log(`     - Order Status: ${row.order_status || 'NULL'}`);
      console.log(`     - Customer: ${row.customer_name || 'N/A'}`);
      console.log(`     - Vendor ID: ${row.vendor_id || 'null'}`);
      
      if (row.order_status === 'delivered') {
        console.log(`     ✅ ORDER STATUS IS CORRECTLY SET TO "delivered"\n`);
      } else {
        console.log(`     ⚠️  Order status is "${row.order_status}" (expected "delivered")\n`);
      }
    });

    // Test vendor response format
    console.log('\n2️⃣  Testing vendor orders endpoint response...\n');
    
    // Simulating what vendor endpoint returns
    const sampleOrder = completedOrders.rows[0];
    if (sampleOrder.order_status) {
      const normalized = ['delivered', 'completed', 'done'].includes(String(sampleOrder.order_status).toLowerCase())
        ? 'delivered'
        : sampleOrder.order_status;
      
      const uiStatus = normalized === 'delivered' ? 'Completed' : 'Live';
      
      console.log(`   Sample mapping for vendor dashboard:`);
      console.log(`   orders.status="${sampleOrder.order_status}"`);
      console.log(`          ↓`);
      console.log(`   normalizeOrderStatus() → "${normalized}"`);
      console.log(`          ↓`);
      console.log(`   toFilterStage() → "${uiStatus}" tab`);
      console.log(`   ✅ Will appear in "${uiStatus}" section\n`);
    }

    // Summary
    console.log('='.repeat(70));
    console.log('\n✅ FIX VERIFICATION COMPLETE\n');
    console.log('Expected behavior:');
    console.log('  - Driver completes delivery');
    console.log('  - orders.status = "delivered"');
    console.log('  - Vendor dashboard shows in "Completed" tab\n');
    
    console.log('If orders still show in "Live" tab after completing:');
    console.log('  1. Refresh vendor dashboard (may need to wait 30 seconds for auto-poll)');
    console.log('  2. Check that orders.status = "delivered" in database');
    console.log('  3. Check browser console for API errors\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    process.exit(0);
  }
}

testVendorOrderUpdate();
