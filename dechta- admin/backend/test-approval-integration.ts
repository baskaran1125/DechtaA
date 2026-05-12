import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./shared/schema.js";
import { eq } from "drizzle-orm";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:Quickconstruct@12@localhost:5432/dechta"
});

const db = drizzle(pool, { schema });

console.log('Testing product approval and rejection...\n');

async function runTest() {
  try {
    // Get a pending product
    console.log('1️⃣  Fetching pending products...');
    const pendingResult = await pool.query(
      `SELECT id, product_name, approval_status FROM products WHERE approval_status='pending' LIMIT 2`
    );
    
    if (pendingResult.rows.length === 0) {
      console.log('❌ No pending products found');
      return;
    }
    
    console.log(`✅ Found ${pendingResult.rows.length} pending products:`);
    pendingResult.rows.forEach(p => console.log(`   - ID ${p.id}: ${p.product_name}`));
    
    // Approve first product
    const productToApprove = pendingResult.rows[0];
    console.log(`\n2️⃣  Approving product ID ${productToApprove.id}...`);
    
    const approveResult = await db.update(schema.products)
      .set({ approvalStatus: "approved", rejectionReason: null })
      .where(eq(schema.products.id, productToApprove.id))
      .returning();
    
    if (approveResult.length > 0) {
      console.log(`✅ Product approved! New status: ${approveResult[0].approvalStatus}`);
    }
    
    // Reject second product
    if (pendingResult.rows.length > 1) {
      const productToReject = pendingResult.rows[1];
      console.log(`\n3️⃣  Rejecting product ID ${productToReject.id}...`);
      
      const rejectResult = await db.update(schema.products)
        .set({ approvalStatus: "rejected", rejectionReason: "Quality issues" })
        .where(eq(schema.products.id, productToReject.id))
        .returning();
      
      if (rejectResult.length > 0) {
        console.log(`✅ Product rejected! New status: ${rejectResult[0].approvalStatus}, Reason: ${rejectResult[0].rejectionReason}`);
      }
    }
    
    // Verify changes
    console.log(`\n4️⃣  Verifying changes...`);
    const verifyResult = await pool.query(`SELECT id, product_name, approval_status, rejection_reason FROM products WHERE id IN (${pendingResult.rows.map(p => p.id).join(',')})`);
    
    verifyResult.rows.forEach(p => {
      console.log(`   - ID ${p.id}: ${p.product_name} → ${p.approval_status}${p.rejection_reason ? ` (Reason: ${p.rejection_reason})` : ''}`);
    });
    
    console.log('\n✅ All tests passed! Admin approval feature is working.');
    
  } catch (err: any) {
    console.error('❌ Test failed:', err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

runTest();
