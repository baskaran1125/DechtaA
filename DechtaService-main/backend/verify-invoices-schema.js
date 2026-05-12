const db = require('./src/config/database');

async function verify() {
  try {
    console.log('======================================================================');
    console.log('  VERIFYING INVOICES TABLE SCHEMA');
    console.log('======================================================================\n');

    // Check columns
    const colResult = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'invoices' 
      ORDER BY ordinal_position
    `);

    if (colResult.rows.length === 0) {
      console.log('❌ invoices table has no columns!\n');
      process.exit(1);
    }

    console.log('📋 Existing invoices table columns:');
    const columnNames = new Set();
    colResult.rows.forEach(r => {
      columnNames.add(r.column_name);
      const nullable = r.is_nullable === 'YES' ? '(nullable)' : '(required)';
      console.log(`   ✅ ${r.column_name.padEnd(20)} ${r.data_type.padEnd(20)} ${nullable}`);
    });

    console.log('\n📋 Checking for columns needed by billingController:\n');

    const requiredColumns = ['id', 'vendor_id', 'order_id', 'invoice_number', 'items', 'subtotal', 'tax_amount', 'tax_rate', 'total_amount', 'customer_name', 'customer_phone', 'customer_gst', 'customer_address', 'status', 'created_at'];
    let allPresent = true;

    for (const col of requiredColumns) {
      if (columnNames.has(col)) {
        console.log(`   ✅ ${col}`);
      } else {
        console.log(`   ❌ ${col} - MISSING!`);
        allPresent = false;
      }
    }

    console.log('\n======================================================================');
    if (allPresent) {
      console.log('✅ ALL REQUIRED COLUMNS PRESENT - BILLING API SHOULD WORK');
    } else {
      console.log('❌ SOME COLUMNS MISSING - ADD THEM BEFORE RESTARTING BACKEND');
    }
    console.log('======================================================================\n');

    process.exit(allPresent ? 0 : 1);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

verify();
