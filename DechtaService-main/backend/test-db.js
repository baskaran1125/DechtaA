require('dotenv').config();
const db = require('./src/config/database');

(async () => {
  try {
    console.log("Checking vendor auth lookup:");
    const res = await db.query("SELECT * FROM vendors LIMIT 1");
    console.log("Success! Found", res.rows.length, "rows.");
  } catch (err) {
    console.error("Error querying vendors:", err.message);
  } finally {
    process.exit();
  }
})();
