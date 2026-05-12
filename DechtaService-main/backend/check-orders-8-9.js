const db = require('./src/config/database');

(async () => {
  try {
    console.log('\n📊 CHECKING CURRENT ORDER STATUS\n');
    
    const result = await db.query(`
      SELECT 
        o.id,
        o.status,
        o.vendor_id,
        o.customer_name,
        o.total_amount,
        dt.status as trip_status,
        dt.completed_at
      FROM orders o
      LEFT JOIN delivery_trips dt ON o.id = dt.order_id
      WHERE o.id IN (8, 9)
      ORDER BY o.id DESC
    `);

    result.rows.forEach(row => {
      console.log(`Order #${row.id}:`);
      console.log(`  Status: ${row.status}`);
      console.log(`  Trip Status: ${row.trip_status}`);
      console.log(`  Completed: ${row.completed_at ? 'Yes' : 'No'}`);
      console.log(`  Vendor: ${row.vendor_id}`);
      console.log(`  Amount: ${row.total_amount}`);
      console.log();
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
