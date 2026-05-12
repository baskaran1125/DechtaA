// src/controllers/authController.js
const { sendOtp, verifyOtp } = require('../services/otpService');
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

function makeDriverCode(mobile) {
  const suffix = String(mobile).slice(-4);
  return `DRV${suffix}${uuidv4().slice(0, 4).toUpperCase()}`;
}

function isMissingAutoIdError(error) {
  return /null value in column "id" of relation ".*" violates not-null constraint/i.test(String(error?.message || ''));
}

async function insertWithManualId(table, data) {
  const client = await db.beginTransaction();
  try {
    await client.query(`LOCK TABLE ${table} IN SHARE ROW EXCLUSIVE MODE`);
    const nextIdResult = await client.query(`SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM ${table}`);
    const nextId = Number(nextIdResult.rows?.[0]?.next_id || 1);

    const payload = { id: nextId, ...data };
    const columns = Object.keys(payload);
    const values = Object.values(payload);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const inserted = await client.query(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    );

    await client.query('COMMIT');
    return inserted.rows[0];
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    throw error;
  } finally {
    client.release();
  }
}

async function createUserRecord(mobile) {
  const payload = {
    phone_number: mobile,
    user_type: 'driver',
    status: 'active',
    is_approved: false,
    is_verified: true,
    profile_complete: false,
  };

  try {
    return await db.insert('users', payload);
  } catch (error) {
    if (!isMissingAutoIdError(error)) throw error;
    return insertWithManualId('users', payload);
  }
}

async function createDriverProfileRecord(userId, mobile) {
  const payload = {
    user_id:       userId,
    driver_id:     makeDriverCode(mobile),
    full_name:     '',
    referral_code: `QC${String(mobile).slice(-4)}${uuidv4().slice(0, 4).toUpperCase()}`,
    is_registered: false,
    is_online:     false,
  };

  try {
    return await db.insert('driver_profiles', payload);
  } catch (error) {
    if (!isMissingAutoIdError(error)) throw error;
    return insertWithManualId('driver_profiles', payload);
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/auth/send-otp
// Body: { mobile: "9876543210" }
// ──────────────────────────────────────────────────────────────
async function sendOtpHandler(request, reply) {
  const { mobile } = request.body;

  if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) {
    return reply.code(400).send({ success: false, message: 'Invalid Indian mobile number' });
  }

  try {
    const result = await sendOtp(mobile);
    return reply.send({
      success: true,
      message: 'OTP sent successfully',
      provider: result.provider,
      // Only expose test OTP in mock/dev mode
      ...(result.provider === 'mock' && { otp_for_testing: result.otp_for_testing }),
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: err.message });
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/auth/verify-otp
// Body: { mobile: "9876543210", otp: "1234" }
// Returns: { token, driver, isNewDriver }
// ──────────────────────────────────────────────────────────────
async function verifyOtpHandler(request, reply) {
  const { mobile, otp } = request.body;

  if (!mobile || !otp) {
    return reply.code(400).send({ success: false, message: 'Mobile and OTP are required' });
  }

  try {
    request.log.info(`[Verify OTP Handler] Attempting to verify - Mobile: ${mobile}, OTP: ${otp}`);
    const otpResult = await verifyOtp(mobile, otp);
    
    request.log.info(`[Verify OTP Handler] OTP verification result: ${JSON.stringify(otpResult)}`);
    
    if (!otpResult.success) {
      return reply.code(400).send({ success: false, message: otpResult.message });
    }

    // Check if the user already exists in the live schema
    let user = await db.selectOne('users', { phone_number: mobile });
    if (!user) {
      try {
        user = await createUserRecord(mobile);
      } catch (error) {
        // Race-safe fallback: if another request already created this user, reuse it.
        const duplicatePhone = /duplicate key value violates unique constraint/i.test(String(error?.message || ''));
        if (duplicatePhone) {
          user = await db.selectOne('users', { phone_number: mobile });
        }
        if (!user) {
          request.log.error({ err: error }, '[Auth] users insert failed');
          return reply.code(500).send({
            success: false,
            message: 'Failed to create user record: ' + error.message,
          });
        }
      }
    }

    // Check if driver profile exists for the linked user
    let driver = await db.selectOne('driver_profiles', { user_id: user.id });

    let isNewDriver = false;

    if (!driver) {
      // New driver — create a minimal profile
      isNewDriver = true;

      // Step 1: Create driver_profiles row
      try {
        driver = await createDriverProfileRecord(user.id, mobile);
      } catch (error) {
        const duplicateUserId = /duplicate key value violates unique constraint/i.test(String(error?.message || ''));
        if (duplicateUserId) {
          driver = await db.selectOne('driver_profiles', { user_id: user.id });
        }
        if (!driver) {
          request.log.error({ err: error }, '[Auth] driver_profiles insert failed');
          return reply.code(500).send({
            success: false,
            message: 'Failed to create driver profile: ' + error.message,
          });
        }
      }

      // Step 2: Create driver_stats row (best-effort — non-fatal)
      try {
        const statsTable = await db.query(`SELECT to_regclass('public.driver_stats') AS table_name`);
        if (statsTable.rows[0]?.table_name) {
          await db.query(
            `INSERT INTO driver_stats (driver_id) VALUES ($1) ON CONFLICT (driver_id) DO NOTHING`,
            [driver.id]
          );
        }
      } catch (error) {
        request.log.error({ err: error }, '[Auth] driver_stats insert failed (non-fatal)');
        // Non-fatal — profile was created, continue
      }
    }

    // Issue JWT
    const token = await reply.jwtSign(
      {
        driverId:     driver.id,
        mobile:       user.phone_number,
        isApproved:   user.is_approved     || false,
        isRegistered: driver.is_registered || false,
      },
      { expiresIn: '30d' }
    );

    return reply.send({
      success: true,
      token,
      isNewDriver,
      driver: {
        id:           driver.id,
        driverId:     driver.driver_id,
        fullName:     driver.full_name,
        mobile:       user.phone_number,
        isApproved:   user.is_approved     || false,
        isRegistered: driver.is_registered || false,  // ← key routing field
        isOnline:     driver.is_online     || false,
        status:       driver.status,
        avatarUrl:    driver.avatar_url,
        referralCode: driver.referral_code,
      },
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Server error during verification' });
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/auth/refresh-token
// Refreshes JWT for already-authenticated driver
// ──────────────────────────────────────────────────────────────
async function refreshTokenHandler(request, reply) {
  try {
    await request.jwtVerify();
    const { driverId } = request.user;

    const driver = await db.selectOne('driver_profiles', { id: driverId });

    if (!driver) {
      return reply.code(404).send({ success: false, message: 'Driver not found' });
    }

    const user = await db.selectOne('users', { id: driver.user_id });

    const token = await reply.jwtSign(
      { driverId: driver.id, mobile: user?.phone_number || request.user.mobile, isApproved: user?.is_approved || false },
      { expiresIn: '30d' }
    );

    return reply.send({ success: true, token });
  } catch (err) {
    return reply.code(401).send({ success: false, message: 'Invalid token' });
  }
}

module.exports = { sendOtpHandler, verifyOtpHandler, refreshTokenHandler };
