import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:Quickconstruct@12@localhost:5432/postgres' });
try {
    // Add catalog_item_id column to products
    await pool.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS catalog_item_id integer");
    console.log("Added catalog_item_id column to products");
    // Drop old columns from products that now belong in catalog_items
    await pool.query("ALTER TABLE products DROP COLUMN IF EXISTS name");
    await pool.query("ALTER TABLE products DROP COLUMN IF EXISTS category");
    await pool.query("ALTER TABLE products DROP COLUMN IF EXISTS description");
    await pool.query("ALTER TABLE products DROP COLUMN IF EXISTS image_url");
    console.log("Dropped old columns (name, category, description, image_url) from products");
    // Verify final structure
    const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='products' ORDER BY ordinal_position");
    console.log("Products table now:", cols.rows);
}
catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('Error:', message);
}
finally {
    await pool.end();
}
