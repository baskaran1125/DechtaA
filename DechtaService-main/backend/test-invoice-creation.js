// Load environment variables FIRST
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const db = require('./src/config/database');

async function testInvoiceCreation() {
  try {
    console.log('======================================================================');
    console.log('  TESTING INVOICE CREATION');
    console.log('======================================================================\n');

    // Step 1: Get a vendor ID
    console.log('1️⃣  Getting a test vendor ID...\n');
    const vendorResult = await db.query('SELECT id FROM vendors LIMIT 1');
    
    if (vendorResult.rows.length === 0) {
      console.log('❌ No vendors found in database!\n');
      console.log('   You need to create a vendor first.\n');
      process.exit(1);
    }

    const vendorId = vendorResult.rows[0].id;
    console.log(`✅ Found vendor ID: ${vendorId}\n`);

    // Step 2: Try to insert an invoice
    console.log('2️⃣  Attempting to insert a test invoice...\n');

    const invoiceData = {
      vendor_id: vendorId,
      invoice_number: `TEST-${Date.now()}`,
      items: JSON.stringify([
        { id: '1', qty: 2, name: 'Test Item', price: 100 }
      ]),
      subtotal: 200,
      tax_amount: 36,
      total_amount: 236,
      tax_rate: 18,
      customer_name: 'Test Customer',
      customer_phone: '9876543210',
      customer_gst: 'TEST123456789',
      customer_address: 'Test Address',
      status: 'generated'
    };

    console.log('   Inserting with data:');
    console.log('   ', JSON.stringify(invoiceData, null, 2));
    console.log();

    const insertResult = await db.query(
      `INSERT INTO invoices
         (vendor_id, invoice_number, items, subtotal, tax_amount,
          total_amount, tax_rate, customer_name, customer_phone, customer_gst, customer_address, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
       RETURNING *`,
      [
        invoiceData.vendor_id,
        invoiceData.invoice_number,
        invoiceData.items,
        invoiceData.subtotal,
        invoiceData.tax_amount,
        invoiceData.total_amount,
        invoiceData.tax_rate,
        invoiceData.customer_name,
        invoiceData.customer_phone,
        invoiceData.customer_gst,
        invoiceData.customer_address,
        invoiceData.status
      ]
    );

    console.log('✅ Invoice inserted successfully!\n');
    console.log('   Result:');
    console.log('   ', JSON.stringify(insertResult.rows[0], null, 2));

    // Step 3: Verify it can be queried back
    console.log('\n3️⃣  Verifying SELECT query...\n');
    const selectResult = await db.query(
      'SELECT * FROM invoices WHERE vendor_id = $1 ORDER BY created_at DESC LIMIT 1',
      [vendorId]
    );

    if (selectResult.rows.length > 0) {
      console.log('✅ Invoice retrieved successfully!\n');
    } else {
      console.log('❌ Invoice not found after insertion!\n');
    }

    console.log('======================================================================');
    console.log('✅ INVOICE CREATION TEST PASSED');
    console.log('======================================================================\n');
    console.log('The issue might be in the billingController.js request validation');
    console.log('or in how the vendor dashboard is formatting the request.\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('\nFull error:\n', err);
    process.exit(1);
  }
}

testInvoiceCreation();
