'use strict';

/**
 * OTP Service
 * ─────────────────────────────────────────────────────────────
 * Currently: MOCK mode — OTP is always 1234 for testing.
 * Table aligned with UNIFIED_SCHEMA.sql:
 *   otp_verifications(phone_number, otp, is_verified, attempts, created_at, expires_at, verified_at)
 * ─────────────────────────────────────────────────────────────
 */

const pool = require('../config/db');
const { randomUUID } = require('crypto');

const MOCK_OTP = '1234';

async function insertOtpRecord(phone, otp, expiresAt) {
  try {
    await pool.query(
      `INSERT INTO otp_verifications (phone_number, otp, is_verified, created_at, expires_at)
       VALUES ($1, $2, false, NOW(), $3)`,
      [phone, otp, expiresAt]
    );
    return;
  } catch (error) {
    const message = String(error?.message || '');
    if (!message.includes('null value in column "id"')) {
      throw error;
    }
  }

  const { rows } = await pool.query(
    `SELECT data_type, udt_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'otp_verifications'
       AND column_name = 'id'
     LIMIT 1`
  );

  const idType = rows[0]?.data_type || rows[0]?.udt_name || '';

  if (idType.includes('int')) {
    await pool.query(
      `INSERT INTO otp_verifications (id, phone_number, otp, is_verified, created_at, expires_at)
       SELECT COALESCE(MAX(id), 0) + 1, $1, $2, false, NOW(), $3
       FROM otp_verifications`,
      [phone, otp, expiresAt]
    );
    return;
  }

  await pool.query(
    `INSERT INTO otp_verifications (id, phone_number, otp, is_verified, created_at, expires_at)
     VALUES ($1, $2, $3, false, NOW(), $4)`,
    [randomUUID(), phone, otp, expiresAt]
  );
}

// ── Generate & store OTP ─────────────────────────────────────
async function generateOtp(phone) {
  const otp       = MOCK_OTP;
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

  // Delete existing OTPs for this phone (safe whether or not unique constraint exists)
  await pool.query(`DELETE FROM otp_verifications WHERE phone_number = $1`, [phone]);

  // Insert fresh OTP record (aligned column: otp)
  await insertOtpRecord(phone, otp, expiresAt);

  // TODO: Replace with MSG91 when going live:
  // await msg91Service.sendOtp(phone, otp);

  console.log(`[MOCK OTP] Phone: ${phone} → OTP: ${otp}`);
  return otp;
}

// ── Verify OTP ───────────────────────────────────────────────
async function verifyOtp(phone, otpInput) {
  const { rows } = await pool.query(
    `SELECT * FROM otp_verifications
     WHERE phone_number = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [phone]
  );

  if (!rows.length)
    return { valid: false, reason: 'OTP not found. Please request a new OTP.' };

  const record = rows[0];

  if (record.is_verified)
    return { valid: false, reason: 'OTP already used. Please request a new one.' };

  if (new Date() > new Date(record.expires_at))
    return { valid: false, reason: 'OTP expired. Please request a new one.' };

  if (record.otp !== String(otpInput))
    return { valid: false, reason: 'Invalid OTP.' };

  // Mark verified
  await pool.query(
     `UPDATE otp_verifications
      SET is_verified = true, verified_at = NOW()
     WHERE phone_number = $1 AND otp = $2`,
    [phone, String(otpInput)]
  );

  return { valid: true };
}

module.exports = { generateOtp, verifyOtp };
