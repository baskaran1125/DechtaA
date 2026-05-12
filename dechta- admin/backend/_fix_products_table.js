import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const alterStatements = [
  // Relax NOT NULL on migration-only columns so Drizzle inserts work
  `ALTER TABLE "products" ALTER COLUMN "vendor_id" DROP NOT NULL`,
  `ALTER TABLE "products" ALTER COLUMN "catalog_item_id" DROP NOT NULL`,
  `ALTER TABLE "products" ALTER COLUMN "price" DROP NOT NULL`,

  // Add all columns present in the Drizzle schema but missing from migration
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "uuid" uuid`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "product_name" text`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "category" text`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "description" text`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "image_url" text`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "mrp" numeric`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "cost_price" numeric`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "gst_percent" numeric`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "discount_percent" numeric`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_bulk" boolean`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "bulk_discount" numeric`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_active" boolean`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "status_active" boolean`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "search_tags" text`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "fts_vector" text`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "created_at" timestamp`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "updated_at" timestamp`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "name" text`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "detailed_description" text`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "stock_quantity" integer`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "unit" text`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "weight_kg" numeric`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "images" text`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "brand" text`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "warranty" text`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "total_price" numeric`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "status" text`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_boosted" boolean`,
];

async function run() {
  const client = await pool.connect();
  try {
    for (const sql of alterStatements) {
      try {
        await client.query(sql);
        const col = sql.match(/COLUMN\s+(?:IF NOT EXISTS\s+)?"?(\w+)"?/i)?.[1] || sql;
        console.log(`  OK  ${col}`);
      } catch (e) {
        console.error(`  ERR ${e.message.split('\n')[0]}`);
      }
    }
    console.log('\nDone.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
