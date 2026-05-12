import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./shared/schema.js";
import { eq } from "drizzle-orm";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:Quickconstruct@12@localhost:5432/dechta"
});

const db = drizzle(pool, { schema });

console.log('Testing product approval update...\n');

try {
  // Test updating product 6
  const updated = await db.update(schema.products)
    .set({ approvalStatus: "approved", rejectionReason: null })
    .where(eq(schema.products.id, 6))
    .returning();
  
  console.log('✅ Approval update successful!');
  console.log('Updated product:', JSON.stringify(updated, null, 2));
} catch (err: any) {
  console.error('❌ Error updating product:', err.message);
  console.error('Full error:', err);
} finally {
  await pool.end();
  process.exit(0);
}
