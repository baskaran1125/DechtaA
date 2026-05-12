import { pool } from "../db";

async function createVehiclePricingTable() {
  const client = await pool.connect();
  try {
    console.log("Creating vehicle_pricing table...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS vehicle_pricing (
        id SERIAL PRIMARY KEY,
        vehicle_type TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        base_fare NUMERIC NOT NULL,
        rate_per_km NUMERIC NOT NULL,
        min_km NUMERIC DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("vehicle_pricing table created successfully!");
  } catch (error) {
    console.error("Error creating table:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

createVehiclePricingTable();
