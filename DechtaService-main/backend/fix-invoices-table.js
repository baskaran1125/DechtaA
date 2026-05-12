const db = require('./src/config/database');

async function fix() {
  try {
    console.log('======================================================================');
    console.log('  FIXING INVOICES TABLE SCHEMA');
    console.log('======================================================================\n');

    // Check if invoices table exists
    const tableCheck = await db.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'invoices'
    `);

    if (tableCheck.rows.length === 0) {
      console.log('❌ invoices table does not exist. Creating...\n');

      // Create the invoices table with UUID primary key (matches controller schema)
      await db.query(`
        CREATE TABLE IF NOT EXISTS invoices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          vendor_id BIGINT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
          order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
          invoice_number VARCHAR(255) UNIQUE NOT NULL,
          items JSONB NOT NULL DEFAULT '[]'::jsonb,
          subtotal NUMERIC(15, 2) DEFAULT 0,
          tax_amount NUMERIC(15, 2) DEFAULT 0,
          tax_rate NUMERIC(5, 2) DEFAULT 18,
          total_amount NUMERIC(15, 2) NOT NULL,
          customer_name VARCHAR(255),
          customer_phone VARCHAR(20),
          customer_gst VARCHAR(50),
          customer_address TEXT,
          status VARCHAR(50) DEFAULT 'generated',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      console.log('✅ invoices table created\n');

      // Create indexes
      await db.query('CREATE INDEX IF NOT EXISTS idx_invoices_vendor_id ON invoices(vendor_id)');
      await db.query('CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id)');
      await db.query('CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)');
      console.log('✅ Indexes created\n');
    } else {
      console.log('✅ invoices table already exists\n');

      // Check if it has all required columns
      const colResult = await db.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'invoices'
      `);
      const cols = new Set(colResult.rows.map(r => r.column_name));

      // Add missing columns if needed
      const columnsToAdd = [
        { name: 'items', sql: 'items JSONB DEFAULT \'[]\'::jsonb', check: 'items' },
        { name: 'subtotal', sql: 'subtotal NUMERIC(15, 2) DEFAULT 0', check: 'subtotal' },
        { name: 'tax_rate', sql: 'tax_rate NUMERIC(5, 2) DEFAULT 18', check: 'tax_rate' },
        { name: 'customer_name', sql: 'customer_name VARCHAR(255)', check: 'customer_name' },
        { name: 'customer_phone', sql: 'customer_phone VARCHAR(20)', check: 'customer_phone' },
        { name: 'customer_gst', sql: 'customer_gst VARCHAR(50)', check: 'customer_gst' },
        { name: 'customer_address', sql: 'customer_address TEXT', check: 'customer_address' },
      ];

      for (const col of columnsToAdd) {
        if (!cols.has(col.check)) {
          console.log(`   ⏳ Adding ${col.name}...`);
          try {
            await db.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS ${col.sql}`);
            console.log(`   ✅ ${col.name} added\n`);
          } catch (e) {
            console.log(`   ⚠️  ${col.name} - ${e.message}\n`);
          }
        }
      }
    }

    // Verify final structure
    const finalResult = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'invoices' 
      ORDER BY ordinal_position
    `);

    console.log('📋 Final invoices table structure:');
    finalResult.rows.forEach(r => {
      const nullable = r.is_nullable === 'YES' ? '(nullable)' : '(required)';
      console.log(`   ✅ ${r.column_name.padEnd(20)} ${r.data_type.padEnd(20)} ${nullable}`);
    });

    console.log('\n======================================================================');
    console.log('✅ INVOICES TABLE IS READY');
    console.log('======================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

fix();
