require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
});

async function cleanOtpTable() {
  try {
    console.log('Cleaning old OTP records...');
    
    // Delete all expired OTPs
    await pool.query(`DELETE FROM otp_verification WHERE expires_at < NOW();`);
    console.log('✅ Deleted expired OTPs');
    
    // Delete all OTPs (fresh start for testing)
    await pool.query(`DELETE FROM otp_verification;`);
    console.log('✅ Cleaned all OTPs');
    
    // Verify table is empty
    const result = await pool.query(`SELECT COUNT(*) as count FROM otp_verification;`);
    console.log(`✅ OTP table now has ${result.rows[0].count} records`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

cleanOtpTable();
