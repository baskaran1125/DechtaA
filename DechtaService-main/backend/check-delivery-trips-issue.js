const db = require('./src/config/database');

(async () => {
  console.log('\n' + '='.repeat(70));
  console.log('  🔍 CHECKING DELIVERY_TRIPS FOR ISSUES');
  console.log('='.repeat(70) + '\n');

  try {
    // Check all delivery trips that are marked as delivered
    const trips = await db.query(`
      SELECT 
        id,
        order_id,
        driver_id,
        status,
        completed_at,
        created_at
      FROM delivery_trips
      WHERE status = 'delivered'
      ORDER BY completed_at DESC
      LIMIT 5
    `);

    console.log(`Found ${trips.rows.length} delivered trips:\n`);

    trips.rows.forEach((trip, idx) => {
      console.log(`Trip ${idx + 1}:`);
      console.log(`  ├─ Trip ID: ${trip.id}`);
      console.log(`  ├─ Order ID: ${trip.order_id} ${trip.order_id ? '✅' : '❌ NULL!'}`);
      console.log(`  ├─ Status: ${trip.status}`);
      console.log(`  ├─ Completed: ${trip.completed_at}`);
      console.log(`  └─ Driver: ${trip.driver_id}\n`);

      if (!trip.order_id) {
        console.log(`  ⚠️  WARNING: order_id is NULL!`);
        console.log(`  This trip cannot be matched to an order\n`);
      }
    });

    // Now check if these orders exist and their status
    console.log('\n' + '-'.repeat(70) + '\n');
    console.log('MATCHING ORDERS:\n');

    const tripOrderIds = trips.rows.filter(t => t.order_id).map(t => t.order_id);
    
    if (tripOrderIds.length > 0) {
      const orders = await db.query(
        `SELECT id, status, vendor_id FROM orders WHERE id = ANY($1::bigint[])`,
        [tripOrderIds]
      );

      orders.rows.forEach(order => {
        console.log(`Order #${order.id}:`);
        console.log(`  ├─ Status: "${order.status}"`);
        console.log(`  └─ Vendor: ${order.vendor_id}\n`);

        if (order.status !== 'delivered') {
          console.log(`  ⚠️  ORDER NOT UPDATED TO "delivered"!`);
          console.log(`  Current status: "${order.status}"\n`);
        }
      });
    }

    console.log('='.repeat(70));
    console.log('\n💡 CONCLUSION:\n');
    
    const nullOrderIds = trips.rows.filter(t => !t.order_id);
    const mismatchedOrders = [];

    for (const trip of trips.rows) {
      if (trip.order_id) {
        const order = await db.query(`SELECT status FROM orders WHERE id = $1`, [trip.order_id]);
        if (order.rows[0] && order.rows[0].status !== 'delivered') {
          mismatchedOrders.push(trip.order_id);
        }
      }
    }

    if (nullOrderIds.length > 0) {
      console.log(`⚠️  ${nullOrderIds.length} trip(s) have NULL order_id`);
      console.log('   These cannot be updated\n');
    }

    if (mismatchedOrders.length > 0) {
      console.log(`❌ ${mismatchedOrders.length} order(s) have mismatched status`);
      console.log(`   Order IDs: ${mismatchedOrders.join(', ')}`);
      console.log('\n   This means:');
      console.log('   - Trip is marked "delivered"');
      console.log('   - But order.status was never updated');
      console.log('   - Backend is running OLD CODE\n');
      console.log('🚀 SOLUTION: Restart backend with: npm start\n');
    } else if (nullOrderIds.length === 0) {
      console.log('✅ All trips have order_id');
      console.log('✅ All orders have correct status\n');
      console.log('   Issue might be on vendor dashboard side');
      console.log('   Try hard refresh: Ctrl+Shift+R\n');
    }

    console.log('='.repeat(70) + '\n');

  } catch (err) {
    console.error('ERROR:', err.message);
  }

  process.exit(0);
})();
