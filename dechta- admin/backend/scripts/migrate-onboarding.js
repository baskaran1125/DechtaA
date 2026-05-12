import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS owner_name TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS business_address TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS warehouse_address TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_maps_location TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS years_of_business_experience TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS business_type TEXT;

      ALTER TABLE drivers ADD COLUMN IF NOT EXISTS photo_url TEXT;
      ALTER TABLE drivers ADD COLUMN IF NOT EXISTS driver_type TEXT;
      ALTER TABLE drivers ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
      ALTER TABLE drivers ADD COLUMN IF NOT EXISTS bank_ifsc TEXT;
      ALTER TABLE drivers ADD COLUMN IF NOT EXISTS bank_name TEXT;
      ALTER TABLE drivers ADD COLUMN IF NOT EXISTS bank_branch TEXT;

      ALTER TABLE worker_skills ADD COLUMN IF NOT EXISTS qualification TEXT;
      ALTER TABLE worker_skills ADD COLUMN IF NOT EXISTS aadhar_number TEXT;
      ALTER TABLE worker_skills ADD COLUMN IF NOT EXISTS pan_number TEXT;
      ALTER TABLE worker_skills ADD COLUMN IF NOT EXISTS service_address TEXT;
      ALTER TABLE worker_skills ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
      ALTER TABLE worker_skills ADD COLUMN IF NOT EXISTS bank_ifsc TEXT;
      ALTER TABLE worker_skills ADD COLUMN IF NOT EXISTS bank_name TEXT;
      ALTER TABLE worker_skills ADD COLUMN IF NOT EXISTS bank_branch TEXT;

      ALTER TABLE worker_documents ADD COLUMN IF NOT EXISTS photo_url TEXT;
      ALTER TABLE worker_documents ADD COLUMN IF NOT EXISTS bank_mandate_url TEXT;

      ALTER TABLE vendor_documents ADD COLUMN IF NOT EXISTS gst_number TEXT;
      ALTER TABLE vendor_documents ADD COLUMN IF NOT EXISTS pan_number TEXT;
      ALTER TABLE vendor_documents ADD COLUMN IF NOT EXISTS udyam_registration_number TEXT;
      ALTER TABLE vendor_documents ADD COLUMN IF NOT EXISTS bank_account_details TEXT;
      ALTER TABLE vendor_documents ADD COLUMN IF NOT EXISTS cancelled_cheque_url TEXT;
      ALTER TABLE vendor_documents ADD COLUMN IF NOT EXISTS gst_certificate_url TEXT;
      ALTER TABLE vendor_documents ADD COLUMN IF NOT EXISTS shop_license_url TEXT;

      CREATE TABLE IF NOT EXISTS driver_documents (
        id SERIAL PRIMARY KEY,
        driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
        photo_url TEXT,
        aadhar_url TEXT,
        address_proof_url TEXT,
        rc_book_url TEXT,
        license_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Onboarding migration completed successfully!');
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
