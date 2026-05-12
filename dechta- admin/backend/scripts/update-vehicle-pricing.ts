import { pool } from "../db";

async function checkAndUpdatePricing() {
  const client = await pool.connect();
  try {
    // Check current entries
    const checkResult = await client.query('SELECT vehicle_type, display_name FROM vehicle_pricing ORDER BY id');
    console.log('Current vehicle pricing entries:');
    if (checkResult.rows.length === 0) {
      console.log('  (No entries yet - run Seed Default Pricing first)');
    } else {
      checkResult.rows.forEach(row => console.log(`  - ${row.vehicle_type}: ${row.display_name}`));
    }

    // Update 1.2ton to 1.4ton if exists
    const updateResult = await client.query(
      "UPDATE vehicle_pricing SET vehicle_type = '4W-1.4ton', display_name = '4 Wheeler - 1.4 Ton' WHERE vehicle_type = '4W-1.2ton' RETURNING *"
    );

    if (updateResult.rows.length > 0) {
      console.log('\nUpdated 1.2ton to 1.4ton successfully!');
    } else {
      console.log('\nNo 1.2ton entry found (already updated or not seeded)');
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkAndUpdatePricing();
