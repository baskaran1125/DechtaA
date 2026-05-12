// Load environment variables FIRST
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const db = require('./src/config/database');

async function test() {
  try {
    console.log('======================================================================');
    console.log('  TESTING INVOICES TABLE');
    console.log('======================================================================\n');

    // Test 1: Check if table exists
    console.log('1️⃣  Checking if invoices table exists...\n');
    const tableCheck = await db.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'invoices'
    `);

    if (tableCheck.rows.length === 0) {
      console.log('❌ invoices table does not exist!\n');
      process.exit(1);
    }
    console.log('✅ invoices table EXISTS\n');

    // Test 2: Check columns
    console.log('2️⃣  Checking invoices table columns...\n');
    const colResult = await db.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'invoices' 
      ORDER BY ordinal_position
    `);

    console.log(`✅ Table has ${colResult.rows.length} columns:\n`);
    colResult.rows.forEach(r => {
      console.log(`   • ${r.column_name.padEnd(25)} (${r.data_type})`);
    });

    // Test 3: Check if we can query it
    console.log('\n3️⃣  Testing SELECT query...\n');
    const selectResult = await db.query('SELECT COUNT(*) FROM invoices');
    const count = parseInt(selectResult.rows[0].count, 10);
    console.log(`✅ Query successful - ${count} invoices in database\n`);

    // Test 4: Verify schema matches controller expectations
    console.log('4️⃣  Verifying schema matches billingController.js...\n');
    const requiredCols = [
      'id', 'vendor_id', 'order_id', 'invoice_number', 'items',
      'subtotal', 'tax_amount', 'tax_rate', 'total_amount',
      'customer_name', 'customer_phone', 'customer_gst', 'customer_address',
      'status', 'created_at'
    ];

    const existingCols = new Set(colResult.rows.map(r => r.column_name));
    let allGood = true;

    requiredCols.forEach(col => {
      if (existingCols.has(col)) {
        console.log(`   ✅ ${col}`);
      } else {
        console.log(`   ❌ ${col} - MISSING!`);
        allGood = false;
      }
    });

    console.log('\n======================================================================');
    if (allGood) {
      console.log('✅ ALL TESTS PASSED - BILLING API SHOULD WORK NOW');
      console.log('\n📝 Next step: Test in vendor dashboard');
      console.log('   1. Go to Billing page');
      console.log('   2. Create an Offline Bill');
      console.log('   3. You should see it appear without 500 error');
    } else {
      console.log('❌ SOME TESTS FAILED - SCHEMA MISMATCH');
    }
    console.log('======================================================================\n');

    process.exit(allGood ? 0 : 1);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

test();
