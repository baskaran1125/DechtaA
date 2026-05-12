import pg from "pg";
const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:Quickconstruct@12@localhost:5432/dechta"
});
console.log('Resetting product statuses...\n');
async function resetProducts() {
    try {
        // Reset both products to pending for UI testing
        const result = await pool.query(`UPDATE products SET approval_status='pending', rejection_reason=NULL 
       WHERE id IN (6, 7) 
       RETURNING id, product_name, approval_status`);
        console.log('✅ Reset the following products to pending:');
        result.rows.forEach(p => console.log(`   - ID ${p.id}: ${p.product_name}`));
    }
    catch (err) {
        console.error('❌ Error:', err.message);
    }
    finally {
        await pool.end();
        process.exit(0);
    }
}
resetProducts();
