require('dotenv').config();
const db = require('./src/config/database');
const fs = require('fs');

async function dumpSchemas() {
  const tables = ['delivery_trips', 'orders'];
  let output = '';
  for (const table of tables) {
    try {
      const res = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [table]);
      output += `\n--- ${table} ---\n` + res.rows.map(r => r.column_name).join(', ');
    } catch (e) {}
  }
  fs.writeFileSync('schema2.txt', output);
  process.exit(0);
}
dumpSchemas();
