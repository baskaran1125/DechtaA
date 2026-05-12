require('dotenv').config();
const db = require('./src/config/database');

(async () => {
  try {
    const res = await db.query(`
      SELECT tablename as table_name, tableowner as table_owner 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY table_name;
    `);
    
    console.log("Tables in database:");
    if (res.rows.length === 0) {
      console.log("No tables found! Database is empty.");
    } else {
      res.rows.forEach(r => console.log(`- ${r.table_name} (Owned by: ${r.table_owner})`));
    }
  } catch (err) {
    console.error("Error listed tables:", err.message);
  } finally {
    process.exit();
  }
})();
