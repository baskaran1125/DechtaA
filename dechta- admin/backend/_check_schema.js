import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const r = await pool.query(
  `SELECT table_name, column_name, data_type
   FROM information_schema.columns
   WHERE table_schema='public'
     AND table_name IN ('products','users','orders','catalog_items','banners','support_tickets')
   ORDER BY table_name, ordinal_position`
);

const grouped = {};
for (const row of r.rows) {
  if (!grouped[row.table_name]) grouped[row.table_name] = [];
  grouped[row.table_name].push(`${row.column_name} (${row.data_type})`);
}
for (const [t, cols] of Object.entries(grouped)) {
  console.log(`\n=== ${t} ===`);
  cols.forEach(c => console.log(`  ${c}`));
}

await pool.end();
