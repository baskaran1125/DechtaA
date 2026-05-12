const db = require('./src/config/database');

(async () => {
  try {
    const result = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      ORDER BY ordinal_position
    `);
    
    console.log('Columns in orders table:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });
    
    const hasDeliveryCompleted = result.rows.some(r => r.column_name === 'delivery_completed_at');
    console.log(`\nHas delivery_completed_at: ${hasDeliveryCompleted}`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
