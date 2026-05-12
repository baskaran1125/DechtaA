require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
});

async function createOtpTable() {
  try {
    console.log('Creating otp_verification table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS otp_verification (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        mobile_number varchar(20) UNIQUE NOT NULL,
        phone varchar(20),
        otp varchar(6) NOT NULL,
        is_verified boolean DEFAULT false,
        attempts integer DEFAULT 0,
        expires_at timestamp NOT NULL,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_otp_mobile ON otp_verification(mobile_number);
      CREATE INDEX IF NOT EXISTS idx_otp_expires_at ON otp_verification(expires_at);
    `);
    
    console.log('✅ otp_verification table created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating table:', err.message);
    process.exit(1);
  }
}

createOtpTable();
