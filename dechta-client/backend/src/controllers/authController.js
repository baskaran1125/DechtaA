'use strict';

const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const otpService = require('../services/otp.service');
const asyncHandler = require('../utils/asyncHandler');
const { ok, err } = require('../utils/response');

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
}

async function ensureClientUserAndProfile({ phone, name = '', email = null, avatarUrl = null }) {
  const phoneText = String(phone);

  const userRes = await pool.query(
    `SELECT id, phone_number, email
     FROM users
     WHERE phone_number = $1
     LIMIT 1`,
    [phoneText]
  );

  let userId;
  if (userRes.rows.length) {
    const existingUser = userRes.rows[0];
    userId = existingUser.id;

    await pool.query(
      `UPDATE users
       SET email = COALESCE($1, email),
           is_verified = true,
           status = 'active'
       WHERE id = $2`,
      [email, userId]
    );
  } else {
    const insertedUser = await pool.query(
      `INSERT INTO users (phone_number, email, user_type, status, is_verified, is_approved, profile_complete)
       VALUES ($1, $2, 'client', 'active', true, true, true)
       RETURNING id`,
      [phoneText, email]
    );
    userId = insertedUser.rows[0].id;
  }

  const profileRes = await pool.query(
    `SELECT id, full_name, avatar_url
     FROM client_profiles
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );

  if (profileRes.rows.length) {
    await pool.query(
      `UPDATE client_profiles
       SET full_name = COALESCE(NULLIF($1, ''), full_name),
           avatar_url = COALESCE($2, avatar_url)
       WHERE user_id = $3`,
      [name || '', avatarUrl, userId]
    );
  } else {
    await pool.query(
      `INSERT INTO client_profiles (user_id, full_name, avatar_url)
       VALUES ($1, $2, $3)`,
      [userId, name || 'Client User', avatarUrl]
    );
  }

  const finalUser = await pool.query(
    `SELECT
        u.id,
        u.phone_number AS phone,
        u.email,
        cp.full_name,
        cp.avatar_url
     FROM users u
     LEFT JOIN client_profiles cp ON cp.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );

  return finalUser.rows[0];
}

// POST /api/auth/send-otp
const sendOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone || !/^\d{10}$/.test(String(phone))) {
    return err(res, 'Valid 10-digit phone number required', 400);
  }

  await otpService.generateOtp(String(phone));
  return ok(res, { phone: String(phone) }, 'OTP sent. Use 1234 for testing.');
});

// POST /api/auth/verify-otp
const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp, name } = req.body;

  if (!phone || !otp) return err(res, 'Phone and OTP are required', 400);

  const result = await otpService.verifyOtp(String(phone), String(otp));
  if (!result.valid) return err(res, result.reason, 400);

  const user = await ensureClientUserAndProfile({
    phone: String(phone),
    name: name || '',
  });

  const token = signToken({
    userId: user.id,
    phone: user.phone,
    name: user.full_name || '',
    email: user.email || '',
    userType: 'client',
  });

  return ok(
    res,
    {
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.full_name || '',
        email: user.email || null,
        avatar_url: user.avatar_url || null,
      },
    },
    'Login successful'
  );
});

// POST /api/auth/google
const googleAuth = asyncHandler(async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return err(res, 'Google ID token is required', 400);

  let payload;
  try {
    const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`;
    const response = await fetch(verifyUrl);
    payload = await response.json();

    if (payload.error_description) {
      return err(res, 'Invalid Google token', 401);
    }
  } catch (e) {
    return err(res, 'Failed to verify Google token', 500);
  }

  const googleId = payload.sub;
  const email = payload.email || null;
  const fullName = payload.name || '';
  const avatarUrl = payload.picture || null;

  if (!googleId || !email) {
    return err(res, 'Invalid token payload — missing sub or email', 400);
  }

  const user = await ensureClientUserAndProfile({
    phone: payload.phone_number || `g-${googleId.slice(0, 10)}`,
    name: fullName,
    email,
    avatarUrl,
  });

  // Keep OAuth linkage in unified schema
  await pool.query(
    `INSERT INTO oauth_credentials (user_id, provider, provider_id, provider_email, avatar_url)
     VALUES ($1, 'google', $2, $3, $4)
     ON CONFLICT (provider_id)
     DO UPDATE SET
       provider_email = EXCLUDED.provider_email,
       avatar_url = EXCLUDED.avatar_url,
       updated_at = NOW()`,
    [user.id, googleId, email, avatarUrl]
  );

  const token = signToken({
    userId: user.id,
    phone: user.phone,
    name: user.full_name || '',
    email: user.email || '',
    userType: 'client',
  });

  return ok(
    res,
    {
      token,
      isNewUser: false,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.full_name || fullName,
        email: user.email || email,
        avatar_url: user.avatar_url || avatarUrl,
        google_id: googleId,
      },
    },
    'Google login successful'
  );
});

// PUT /api/auth/google/complete
const completeGoogleProfile = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { phone, name } = req.body;

  if (!phone || !/^\d{10}$/.test(String(phone))) {
    return err(res, 'Valid 10-digit phone number required', 400);
  }

  const phoneStr = String(phone);

  const existing = await pool.query(
    `SELECT id FROM users WHERE phone_number = $1 AND id != $2 LIMIT 1`,
    [phoneStr, userId]
  );

  if (existing.rows.length > 0) {
    return err(res, 'This phone number is already linked to another account', 409);
  }

  await pool.query(
    `UPDATE users SET phone_number = $1 WHERE id = $2`,
    [phoneStr, userId]
  );

  await pool.query(
    `UPDATE client_profiles
     SET full_name = COALESCE(NULLIF($1, ''), full_name)
     WHERE user_id = $2`,
    [name || '', userId]
  );

  const { rows } = await pool.query(
    `SELECT
        u.id,
        u.phone_number AS phone,
        u.email,
        cp.full_name,
        cp.avatar_url
     FROM users u
     LEFT JOIN client_profiles cp ON cp.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );

  if (!rows.length) return err(res, 'User not found', 404);

  const user = rows[0];
  const token = signToken({
    userId: user.id,
    phone: user.phone,
    name: user.full_name || '',
    email: user.email || '',
    userType: 'client',
  });

  return ok(res, { token, user }, 'Profile completed');
});

// GET /api/auth/profile
const getProfile = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT
        u.id,
        u.phone_number AS phone,
        u.email,
        cp.full_name,
        cp.avatar_url,
        u.created_at
     FROM users u
     LEFT JOIN client_profiles cp ON cp.user_id = u.id
     WHERE u.id = $1`,
    [req.user.userId]
  );

  if (!rows.length) return err(res, 'User not found', 404);
  return ok(res, rows[0]);
});

// PUT /api/auth/profile
const updateProfile = asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  const userId = req.user.userId;

  await pool.query(
    `UPDATE users
     SET email = COALESCE(NULLIF($1, ''), email)
     WHERE id = $2`,
    [email || '', userId]
  );

  await pool.query(
    `UPDATE client_profiles
     SET full_name = COALESCE(NULLIF($1, ''), full_name)
     WHERE user_id = $2`,
    [name || '', userId]
  );

  const { rows } = await pool.query(
    `SELECT
        u.id,
        u.phone_number AS phone,
        u.email,
        cp.full_name,
        cp.avatar_url
     FROM users u
     LEFT JOIN client_profiles cp ON cp.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );

  if (!rows.length) return err(res, 'User not found', 404);
  return ok(res, rows[0], 'Profile updated');
});

module.exports = {
  sendOtp,
  verifyOtp,
  googleAuth,
  completeGoogleProfile,
  getProfile,
  updateProfile,
};

