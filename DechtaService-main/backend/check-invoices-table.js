const db = require('./src/config/database');

async function check() {
  try {
    console.log('======================================================================');
    console.log('  CHECKING INVOICES TABLE');
    console.log('======================================================================\n');

    // Check if table exists
    const tableCheck = await db.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'invoices'
    `);

    if (tableCheck.rows.length === 0) {
      console.log('❌ INVOICES TABLE DOES NOT EXIST!\n');
      console.log('Creating invoices table...\n');

      // Create the table
      await db.query(`
        CREATE TABLE IF NOT EXISTS invoices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          vendor_id BIGINT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
          order_id BIGINT,
          invoice_number VARCHAR(255) UNIQUE NOT NULL,
          items JSONB NOT NULL DEFAULT '[]'::jsonb,
          subtotal NUMERIC(12, 2) DEFAULT 0,
          tax_amount NUMERIC(12, 2) DEFAULT 0,
          tax_rate NUMERIC(5, 2) DEFAULT 18,
          total_amount NUMERIC(12, 2) NOT NULL,
          customer_name VARCHAR(255),
          customer_phone VARCHAR(20),
          customer_gst VARCHAR(50),
          customer_address TEXT,
          status VARCHAR(50) DEFAULT 'generated',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      console.log('✅ Invoices table created!\n');
    } else {
      console.log('✅ Invoices table exists\n');
    }

    // Check columns
    const colResult = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'invoices' 
      ORDER BY ordinal_position
    `);

    console.log('📋 Columns:');
    colResult.rows.forEach(r => {
      const nullable = r.is_nullable === 'YES' ? '(nullable)' : '(required)';
      console.log(`   ✅ ${r.column_name.padEnd(20)} ${r.data_type.padEnd(20)} ${nullable}`);
    });

    console.log('\n======================================================================');
    console.log('✅ INVOICES TABLE IS READY');
    console.log('======================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

check();
