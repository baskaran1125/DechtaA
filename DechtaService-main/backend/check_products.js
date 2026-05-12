require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const p = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

async function main() {
  const r = await p.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='products' ORDER BY ordinal_position`
  );
  fs.writeFileSync('products_schema.json', JSON.stringify(r.rows, null, 2), 'utf8');
  await p.end();
}
main().catch(console.error);
