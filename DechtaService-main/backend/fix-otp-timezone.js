#!/usr/bin/env node

/**
 * Migration Script: Fix OTP Timezone Issue
 * 
 * This script converts the expires_at column from 'timestamp' (local time, timezone-unaware)
 * to 'timestamp with time zone' (UTC, timezone-aware).
 * 
 * Why this is needed:
 * - The original schema used 'timestamp' which stores local server time
 * - When storing ISO UTC strings, PostgreSQL strips the timezone info
 * - This causes a 5.5-hour offset in IST timezone, making all OTPs appear expired
 * 
 * Run with: node fix-otp-timezone.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
});

async function fixTimezone() {
  const client = await pool.connect();
  try {
    console.log('🔄 Starting OTP timezone fix...\n');

    // Step 1: Check current column type
    console.log('Step 1: Checking current expires_at column type...');
    const checkResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'otp_verification' AND column_name = 'expires_at';
    `);

    if (checkResult.rows.length === 0) {
      console.log('⚠️  otp_verification table does not exist. Skipping migration.');
      return;
    }

    const currentType = checkResult.rows[0].data_type;
    console.log(`   Current type: ${currentType}`);

    if (currentType === 'timestamp with time zone' || currentType === 'timestamp without time zone') {
      if (currentType === 'timestamp with time zone') {
        console.log('   ✅ Column already uses timezone-aware type. No changes needed.\n');
        return;
      }

      // Step 2: Back up existing data
      console.log('\nStep 2: Creating backup of OTP data...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS otp_verification_backup AS
        SELECT * FROM otp_verification;
      `);
      console.log('   ✅ Backup created: otp_verification_backup\n');

      // Step 3: Remove the old column constraint and recreate
      console.log('Step 3: Migrating expires_at column to timezone-aware type...');
      await client.query(`
        ALTER TABLE otp_verification
        ALTER COLUMN expires_at TYPE timestamp with time zone
        USING expires_at AT TIME ZONE 'UTC';
      `);
      console.log('   ✅ Column converted to timestamp with time zone\n');

      // Step 4: Verify
      console.log('Step 4: Verifying migration...');
      const verifyResult = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'otp_verification' AND column_name = 'expires_at';
      `);
      console.log(`   ✅ Verification successful. New type: ${verifyResult.rows[0].data_type}\n`);

      console.log('🎉 OTP timezone fix completed successfully!\n');
      console.log('📝 Next steps:');
      console.log('   1. Stop your backend server (Ctrl+C)');
      console.log('   2. Delete all existing OTP records: DELETE FROM otp_verification;');
      console.log('   3. Restart the backend: npm run dev');
      console.log('   4. Test with a fresh OTP request\n');
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n💡 If you see "column type is not supported" error:');
    console.log('   This means the column constraints prevent automatic conversion.');
    console.log('   Please manually run this SQL:\n');
    console.log('   ALTER TABLE otp_verification DROP CONSTRAINT otp_verification_pkey;');
    console.log('   ALTER TABLE otp_verification ALTER COLUMN expires_at TYPE timestamp with time zone USING expires_at AT TIME ZONE \'UTC\';');
    console.log('   DELETE FROM otp_verification;  -- Clear expired OTPs\n');
  } finally {
    await client.end();
  }
}

fixTimezone().catch(console.error);
