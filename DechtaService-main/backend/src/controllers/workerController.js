// src/controllers/workerController.js
'use strict';

const { sendOtp, verifyOtp } = require('../services/otpService');
const db = require('../config/database');
const uploadService = require('../services/uploadService');

const CASHFREE_API_VERSION = '2023-08-01';
const WORKER_ORDER_PREFIX = 'WKR_ADD_';
const WORKER_FAILURE_STATUSES = new Set([
  'FAILED',
  'CANCELLED',
  'EXPIRED',
  'TERMINATED',
  'REJECTED',
  'DECLINED',
  'VOIDED',
  'USER_DROPPED',
]);

let workerPaymentOrdersTableReady = false;
let workerCoreSchemaReady = false;

function isMissingAutoIdError(error) {
  return /null value in column "id" of relation ".*" violates not-null constraint/i.test(String(error?.message || ''));
}

function isIgnorableSchemaError(error) {
  const msg = String(error?.message || '');
  return msg.includes('pg_class_relname_nsp_index') || msg.includes('must be owner of table') || msg.includes('must be owner of relation');
}

async function safeSchemaQuery(sql) {
  try {
    await db.query(sql);
  } catch (error) {
    if (isIgnorableSchemaError(error)) return;
    throw error;
  }
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

async function createWorkerUserRecord(mobile) {
  const payloadVariants = [
    {
      phone_number: mobile,
      user_type: 'worker',
      status: 'active',
      is_approved: false,
      is_verified: true,
      profile_complete: false,
      verification_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      phone_number: mobile,
      user_type: 'worker',
      status: 'active',
      is_approved: false,
      is_verified: true,
      profile_complete: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      phone: mobile,
      role: 'worker',
      status: 'active',
      is_approved: false,
      is_verified: true,
      profile_complete: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      phone: mobile,
      role: 'worker',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  let lastError = null;
  for (const payload of payloadVariants) {
    try {
      return await db.insert('users', payload);
    } catch (error) {
      if (isMissingAutoIdError(error)) {
        try {
          return await insertWithManualId('users', payload);
        } catch (manualError) {
          lastError = manualError;
          continue;
        }
      }
      lastError = error;
    }
  }

  throw lastError || new Error('Failed to create worker user record');
}

async function createWorkerProfileRecord(userId, mobile) {
  const payload = {
    user_id: userId,
    phone: mobile,
    full_name: '',
    is_approved: false,
    is_profile_complete: false,
    wallet_balance: 0,
    total_jobs: 0,
    role: 'worker',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    return await db.insert('worker_profiles', payload);
  } catch (error) {
    if (!isMissingAutoIdError(error)) throw error;
    return insertWithManualId('worker_profiles', payload);
  }
}

async function findWorkerUserByMobile(mobile) {
  const lookups = [
    `SELECT * FROM users WHERE phone_number = $1 AND user_type = 'worker' LIMIT 1`,
    `SELECT * FROM users WHERE phone_number = $1 AND role = 'worker' LIMIT 1`,
    `SELECT * FROM users WHERE phone = $1 AND role = 'worker' LIMIT 1`,
    `SELECT * FROM users WHERE phone = $1 AND user_type = 'worker' LIMIT 1`,
    `SELECT * FROM users WHERE phone_number = $1 LIMIT 1`,
    `SELECT * FROM users WHERE phone = $1 LIMIT 1`,
  ];

  for (const sql of lookups) {
    try {
      const res = await db.query(sql, [mobile]);
      if (res.rows[0]) return res.rows[0];
    } catch {
      // Try next query variant for schema compatibility.
    }
  }

  return null;
}

async function ensureWorkerCoreSchema() {
  if (workerCoreSchemaReady) return;

  await safeSchemaQuery(`
    CREATE TABLE IF NOT EXISTS worker_profiles (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT,
      phone VARCHAR(20),
      full_name VARCHAR(120),
      skill_category VARCHAR(100),
      state VARCHAR(100),
      city VARCHAR(100),
      area VARCHAR(120),
      address TEXT,
      is_approved BOOLEAN DEFAULT false,
      is_profile_complete BOOLEAN DEFAULT false,
      wallet_balance NUMERIC(10,2) DEFAULT 0,
      total_jobs INTEGER DEFAULT 0,
      role VARCHAR(30) DEFAULT 'worker',
      is_online BOOLEAN DEFAULT false,
      current_latitude NUMERIC(10,8),
      current_longitude NUMERIC(11,8),
      last_location_at TIMESTAMP,
      last_seen_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await safeSchemaQuery(`
    CREATE TABLE IF NOT EXISTS worker_notifications (
      id BIGSERIAL PRIMARY KEY,
      worker_id BIGINT NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) DEFAULT 'info',
      status VARCHAR(20) NOT NULL DEFAULT 'unread',
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      read_at TIMESTAMP
    )
  `);

  await safeSchemaQuery(`
    CREATE TABLE IF NOT EXISTS worker_bank_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      worker_id BIGINT NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
      account_holder_name VARCHAR(120),
      account_number VARCHAR(40),
      ifsc_code VARCHAR(20),
      bank_name VARCHAR(120),
      upi_id VARCHAR(120),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(worker_id)
    )
  `);

  await safeSchemaQuery(`
    CREATE TABLE IF NOT EXISTS worker_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      worker_id TEXT NOT NULL,
      photo_url TEXT,
      aadhar_url TEXT,
      pan_url TEXT,
      skill_certificate_url TEXT,
      bank_mandate_url TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  // Widen worker_id to TEXT if it was created as BIGINT or UUID by an older migration
  await safeSchemaQuery(`
    ALTER TABLE worker_documents ALTER COLUMN worker_id TYPE TEXT USING worker_id::text
  `);

  await safeSchemaQuery(`
    CREATE TABLE IF NOT EXISTS worker_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      worker_id BIGINT NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
      service_type VARCHAR(120),
      amount NUMERIC(10,2) DEFAULT 0,
      payment_method VARCHAR(30),
      status VARCHAR(30) DEFAULT 'completed',
      elapsed_seconds INTEGER DEFAULT 0,
      customer_name VARCHAR(120),
      customer_phone VARCHAR(20),
      address TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      started_at TIMESTAMP,
      completed_at TIMESTAMP
    )
  `);

  await safeSchemaQuery(`
    CREATE TABLE IF NOT EXISTS worker_job_chats (
      id BIGSERIAL PRIMARY KEY,
      job_id UUID NOT NULL REFERENCES worker_jobs(id) ON DELETE CASCADE,
      worker_id BIGINT NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
      sender_type VARCHAR(30) NOT NULL DEFAULT 'worker',
      message TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await safeSchemaQuery(`
    CREATE TABLE IF NOT EXISTS worker_location_logs (
      id BIGSERIAL PRIMARY KEY,
      worker_id BIGINT NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
      job_id UUID REFERENCES worker_jobs(id) ON DELETE SET NULL,
      latitude NUMERIC(10,8),
      longitude NUMERIC(11,8),
      accuracy NUMERIC(10,2),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await safeSchemaQuery(`
    CREATE TABLE IF NOT EXISTS worker_support_tickets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      worker_id BIGINT NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
      subject VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'open',
      priority VARCHAR(20) NOT NULL DEFAULT 'normal',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await safeSchemaQuery(`
    CREATE TABLE IF NOT EXISTS worker_support_messages (
      id BIGSERIAL PRIMARY KEY,
      ticket_id UUID NOT NULL REFERENCES worker_support_tickets(id) ON DELETE CASCADE,
      sender_type VARCHAR(30) NOT NULL DEFAULT 'worker',
      message TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await safeSchemaQuery(`
    CREATE TABLE IF NOT EXISTS worker_withdrawals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      worker_id BIGINT NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
      amount NUMERIC(10,2) NOT NULL,
      method VARCHAR(20) DEFAULT 'bank',
      upi_id VARCHAR(120),
      account_number VARCHAR(40),
      ifsc_code VARCHAR(20),
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      remarks TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      processed_at TIMESTAMP
    )
  `);

  await safeSchemaQuery(`
    CREATE TABLE IF NOT EXISTS worker_transactions (
      id BIGSERIAL PRIMARY KEY,
      worker_id BIGINT NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
      amount NUMERIC(10,2) NOT NULL,
      description TEXT,
      transaction_type VARCHAR(30) NOT NULL,
      related_ref VARCHAR(120),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await safeSchemaQuery(`
    ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS current_latitude NUMERIC(10,8)
  `);
  await safeSchemaQuery(`
    ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS current_longitude NUMERIC(11,8)
  `);
  await safeSchemaQuery(`
    ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS last_location_at TIMESTAMP
  `);
  await safeSchemaQuery(`
    ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false
  `);
  await safeSchemaQuery(`
    ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP
  `);
  await safeSchemaQuery(`
    ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(20)
  `);
  await safeSchemaQuery(`
    ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS skill_category VARCHAR(100)
  `);
  await safeSchemaQuery(`
    ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false
  `);
  await safeSchemaQuery(`
    ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS is_profile_complete BOOLEAN DEFAULT false
  `);
  await safeSchemaQuery(`
    ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(10,2) DEFAULT 0
  `);
  await safeSchemaQuery(`
    ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS full_name VARCHAR(120)
  `);
  await safeSchemaQuery(`
    ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS total_jobs INTEGER DEFAULT 0
  `);
  await safeSchemaQuery(`
    ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS role VARCHAR(30) DEFAULT 'worker'
  `);
  await safeSchemaQuery(`
    ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS qualification VARCHAR(120)
  `);
  await safeSchemaQuery(`
    ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS aadhar_number VARCHAR(20)
  `);
  await safeSchemaQuery(`
    ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS pan_number VARCHAR(20)
  `);
  await safeSchemaQuery(`
    ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS skill_categories TEXT[] DEFAULT ARRAY[]::TEXT[]
  `);
  await safeSchemaQuery(`
    ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS experience_years NUMERIC(4,1)
  `);
  await safeSchemaQuery(`
    ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS is_documents_submitted BOOLEAN DEFAULT false
  `);
  await safeSchemaQuery(`
    ALTER TABLE worker_bank_accounts ADD COLUMN IF NOT EXISTS branch_name VARCHAR(120)
  `);

  await safeSchemaQuery(`
    UPDATE worker_profiles wp
    SET phone = u.phone_number
    FROM users u
    WHERE wp.user_id = u.id
      AND (wp.phone IS NULL OR wp.phone = '')
  `).catch(() => {});

  await safeSchemaQuery('CREATE INDEX IF NOT EXISTS idx_worker_notifications_worker ON worker_notifications(worker_id, created_at DESC)');
  await safeSchemaQuery('CREATE INDEX IF NOT EXISTS idx_worker_jobs_worker ON worker_jobs(worker_id, created_at DESC)');
  await safeSchemaQuery('CREATE INDEX IF NOT EXISTS idx_worker_transactions_worker ON worker_transactions(worker_id, created_at DESC)');
  await safeSchemaQuery('CREATE INDEX IF NOT EXISTS idx_worker_withdrawals_worker ON worker_withdrawals(worker_id, created_at DESC)');
  await safeSchemaQuery('CREATE INDEX IF NOT EXISTS idx_worker_locations_worker ON worker_location_logs(worker_id, created_at DESC)');

  workerCoreSchemaReady = true;
}

function getApiBaseUrl(request) {
  const fromEnv = String(process.env.PUBLIC_API_URL || '').trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const protocol = request.protocol || 'http';
  const host = request.headers.host;
  return `${protocol}://${host}`;
}

function getCashfreeBaseUrl() {
  const env = String(process.env.CASHFREE_ENVIRONMENT || 'SANDBOX').toUpperCase();
  return env === 'PRODUCTION' ? 'https://api.cashfree.com' : 'https://sandbox.cashfree.com';
}

function hasCashfreeCredentials() {
  const appId = String(process.env.CASHFREE_APP_ID || '').trim();
  const secret = String(process.env.CASHFREE_SECRET_KEY || '').trim();
  if (!appId || !secret) return false;
  if (appId.includes('your_') || secret.includes('your_')) return false;
  return true;
}

function getCashfreeHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-api-version': CASHFREE_API_VERSION,
    'x-client-id': process.env.CASHFREE_APP_ID,
    'x-client-secret': process.env.CASHFREE_SECRET_KEY,
  };
}

function isValidWorkerOrderId(orderId) {
  return /^WKR_ADD_[A-Z0-9_-]+$/i.test(String(orderId || '').trim());
}

function normalizeWorkerOrderStatus(status) {
  const normalized = String(status || '').toUpperCase();
  if (!normalized) return 'PENDING';
  return normalized;
}

function mapCashfreeOrderStatus(orderStatus) {
  const normalized = String(orderStatus || '').toUpperCase();
  if (normalized === 'PAID') return 'SUCCESS';
  if (WORKER_FAILURE_STATUSES.has(normalized)) return 'FAILED';
  return 'PENDING';
}

function paymentHtml({ success, title, message }) {
  const bg = success ? '#F0FDF4' : '#FEF2F2';
  const fg = success ? '#166534' : '#991B1B';
  const icon = success ? '&#9989;' : '&#10060;';

  return `
    <html>
      <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background-color:${bg};color:${fg};margin:0;">
        <div style="background:white;padding:40px;border-radius:20px;box-shadow:0 10px 25px rgba(0,0,0,0.1);text-align:center;max-width:520px;">
          <h1 style="font-size:64px;margin:0;">${icon}</h1>
          <h2 style="margin-top:20px;">${title}</h2>
          <p style="color:#475569;">${message}</p>
        </div>
      </body>
    </html>
  `;
}

async function ensureWorkerPaymentOrdersTable() {
  if (workerPaymentOrdersTableReady) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS worker_payment_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      worker_id BIGINT NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
      cashfree_order_id VARCHAR(120) NOT NULL UNIQUE,
      amount NUMERIC(10,2) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      completed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_worker_payment_orders_worker ON worker_payment_orders(worker_id)`
  );
  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_worker_payment_orders_cf ON worker_payment_orders(cashfree_order_id)`
  );

  workerPaymentOrdersTableReady = true;
}

async function finalizeWorkerOrder(orderId) {
  const client = await db.beginTransaction();
  try {
    const orderRes = await client.query(
      'SELECT * FROM worker_payment_orders WHERE cashfree_order_id = $1 FOR UPDATE',
      [orderId]
    );
    const lockedOrder = orderRes.rows[0];
    if (!lockedOrder) throw new Error('Payment order not found during finalization');

    const currentStatus = normalizeWorkerOrderStatus(lockedOrder.status);
    if (currentStatus === 'SUCCESS') {
      await client.query('COMMIT');
      client.release();
      return lockedOrder;
    }

    if (currentStatus !== 'PENDING') {
      await client.query('COMMIT');
      client.release();
      return lockedOrder;
    }

    const amount = Number(lockedOrder.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Invalid payment amount');
    }

    await client.query(
      'UPDATE worker_payment_orders SET status = $1, completed_at = NOW() WHERE id = $2',
      ['SUCCESS', lockedOrder.id]
    );

    await client.query(
      `UPDATE worker_profiles
       SET wallet_balance = COALESCE(wallet_balance, 0) + $1
       WHERE id = $2`,
      [amount, lockedOrder.worker_id]
    );

    await client.query(
      `INSERT INTO worker_transactions (worker_id, amount, description, transaction_type, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [lockedOrder.worker_id, amount, 'Wallet top-up via Cashfree', 'credit']
    );

    const finalOrderRes = await client.query(
      'SELECT * FROM worker_payment_orders WHERE id = $1 LIMIT 1',
      [lockedOrder.id]
    );

    await client.query('COMMIT');
    client.release();
    return finalOrderRes.rows[0] || { ...lockedOrder, status: 'SUCCESS' };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    throw error;
  }
}

async function syncWorkerOrderWithCashfree(orderId, knownOrder = null) {
  let order = knownOrder;
  if (!order) {
    const orderRes = await db.query(
      'SELECT * FROM worker_payment_orders WHERE cashfree_order_id = $1 LIMIT 1',
      [orderId]
    );
    order = orderRes.rows[0] || null;
  }

  if (!order) return { order: null, providerStatus: null };
  if (normalizeWorkerOrderStatus(order.status) === 'SUCCESS') {
    return { order, providerStatus: null };
  }
  if (!hasCashfreeCredentials()) {
    return { order, providerStatus: null };
  }

  const response = await fetch(`${getCashfreeBaseUrl()}/pg/orders/${encodeURIComponent(orderId)}`, {
    method: 'GET',
    headers: getCashfreeHeaders(),
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.message || `Cashfree worker order status check failed (${response.status})`);
  }

  const providerStatus = String(data.order_status || '').toUpperCase();
  const mappedStatus = mapCashfreeOrderStatus(providerStatus);

  if (mappedStatus === 'SUCCESS') {
    const finalized = await finalizeWorkerOrder(orderId);
    return { order: finalized, providerStatus };
  }

  if (mappedStatus === 'FAILED' && normalizeWorkerOrderStatus(order.status) === 'PENDING') {
    const updated = await db.query(
      'UPDATE worker_payment_orders SET status = $1 WHERE id = $2 RETURNING *',
      ['FAILED', order.id]
    );
    order = updated.rows[0] || { ...order, status: 'FAILED' };
  }

  return { order, providerStatus };
}

// ──────────────────────────────────────────────────────────────
// POST /api/worker/auth/send-otp
// Body: { mobile }
// ──────────────────────────────────────────────────────────────
async function workerSendOtp(request, reply) {
  const mobile = (request.body.mobile || request.body.phone || '').trim();

  if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) {
    return reply.code(400).send({ success: false, message: 'Invalid 10-digit Indian mobile number' });
  }

  try {
    const result = await sendOtp(mobile);
    return reply.send({
      success: true,
      message: 'OTP sent successfully',
      provider: result.provider,
      ...(result.provider === 'mock' && { dev_otp: result.otp_for_testing }),
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: err.message });
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/worker/auth/verify-otp  (login)
// Body: { mobile/phone, otp }
// Returns: { token, worker, isNewWorker }
// ──────────────────────────────────────────────────────────────
async function workerVerifyOtp(request, reply) {
  const mobile = (request.body.mobile || request.body.phone || '').trim();
  const otp    = String(request.body.otp || '').trim();

  if (!mobile || !otp) {
    return reply.code(400).send({ success: false, message: 'Mobile and OTP are required' });
  }

  try {
    await ensureWorkerCoreSchema();

    const otpResult = await verifyOtp(mobile, otp);
    if (!otpResult.success) {
      return reply.code(400).send({ success: false, message: otpResult.message });
    }

    // Ensure user row exists for worker
    let user = await findWorkerUserByMobile(mobile);
    if (!user) {
      try {
        user = await createWorkerUserRecord(mobile);
      } catch (error) {
        const duplicatePhone = /duplicate key value violates unique constraint/i.test(String(error?.message || ''));
        if (duplicatePhone) {
          user = await findWorkerUserByMobile(mobile);
        }
        if (!user) {
          request.log.error({ err: error }, '[Worker] users insert failed');
          return reply.code(500).send({
            success: false,
            message: 'Failed to create worker user: ' + error.message,
          });
        }
      }
    }

    // Look up worker profile by user_id/phone
    let worker = null;
    let isNewWorker = false;

    try {
      const res = await db.query(
        `SELECT *
         FROM worker_profiles
         WHERE user_id = $1 OR phone = $2
         ORDER BY id ASC
         LIMIT 1`,
        [user.id, mobile]
      );
      worker = res.rows[0] || null;
    } catch (dbErr) {
      // Table may not exist yet — treat as new worker to allow self-registration
      request.log.warn({ err: dbErr }, '[Worker] worker_profiles query failed — treating as new worker');
    }

    if (!worker) {
      // New worker — create profile row directly (id is BIGSERIAL in existing schema)
      isNewWorker = true;
      try {
        worker = await createWorkerProfileRecord(user.id, mobile);
      } catch (insertErr) {
        request.log.error({ err: insertErr }, '[Worker] worker profile creation failed');
        return reply.code(500).send({
          success: false,
          message: 'Failed to create worker profile: ' + insertErr.message,
        });
      }
    } else if (worker.user_id !== user.id || worker.phone !== mobile) {
      const updated = await db.query(
        `UPDATE worker_profiles
         SET user_id = $1,
             phone = $2,
             updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [user.id, mobile, worker.id]
      );
      worker = updated.rows[0] || worker;
    }

    const token = await reply.jwtSign(
      {
        workerId:     worker.id,
        mobile:       worker.phone,
        role:         'worker',
        isRegistered: worker.is_profile_complete || false,
      },
      { expiresIn: '30d' }
    );

    return reply.send({
      success: true,
      token,
      isNewWorker,
      worker: formatWorker(worker),
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Server error during verification' });
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/worker/auth/register
// Body: { mobile/phone, otp, name, skillCategory, state, city, area }
// ──────────────────────────────────────────────────────────────
async function workerRegister(request, reply) {
  const mobile        = (request.body.mobile || request.body.phone || '').trim();
  const otp           = String(request.body.otp || '').trim();
  const name          = (request.body.name || '').trim();
  const skillCategory = (request.body.skillCategory || '').trim();
  const state         = (request.body.state || '').trim();
  const city          = (request.body.city || '').trim();
  const area          = (request.body.area || '').trim();
  const address       = (request.body.address || '').trim();

  if (!mobile || !otp || !name) {
    return reply.code(400).send({ success: false, message: 'mobile, otp and name are required' });
  }

  try {
    const otpResult = await verifyOtp(mobile, otp);
    if (!otpResult.success) {
      return reply.code(400).send({ success: false, message: otpResult.message });
    }

    // Upsert worker profile (created on verify-otp, now completing registration)
    const result = await db.query(
      `UPDATE worker_profiles
       SET full_name = $1, skill_category = $2,
           state = $3, city = $4, area = $5, address = $6,
         is_profile_complete = true,
         updated_at = NOW()
       WHERE phone = $7
       RETURNING *`,
      [name, skillCategory, state, city, area, address, mobile]
    );

    if (!result.rows[0]) {
      return reply.code(404).send({ success: false, message: 'Worker profile not found. Verify OTP first.' });
    }

    const w = result.rows[0];
    const token = await reply.jwtSign(
      { workerId: w.id, mobile: w.phone, role: 'worker', isRegistered: true },
      { expiresIn: '30d' }
    );

    return reply.code(200).send({
      success: true,
      token,
      worker: formatWorker(w),
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: err.message });
  }
}

// ──────────────────────────────────────────────────────────────
// GET /api/worker/me
// ──────────────────────────────────────────────────────────────
async function getWorkerProfile(request, reply) {
  try {
    await ensureWorkerCoreSchema();
    const result = await db.query(
      'SELECT * FROM worker_profiles WHERE id = $1 LIMIT 1',
      [request.worker.id]
    );
    if (!result.rows[0]) return reply.code(404).send({ success: false, message: 'Worker not found' });
    return reply.send({ success: true, worker: formatWorker(result.rows[0]) });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: err.message });
  }
}

// ──────────────────────────────────────────────────────────────
// GET /api/worker/profile
// ──────────────────────────────────────────────────────────────
async function getProfile(request, reply) {
  try {
    await ensureWorkerCoreSchema();
    const result = await db.query(
      'SELECT * FROM worker_profiles WHERE id = $1 LIMIT 1',
      [request.worker.id]
    );
    if (!result.rows[0]) return reply.code(404).send({ success: false, message: 'Worker not found' });
    return reply.send({ success: true, worker: formatWorker(result.rows[0]) });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: err.message });
  }
}

// ──────────────────────────────────────────────────────────────
// PUT /api/worker/profile
// ──────────────────────────────────────────────────────────────
async function updateProfile(request, reply) {
  const { name, state, city, area } = request.body || {};
  try {
    const result = await db.query(
      `UPDATE worker_profiles
       SET full_name = COALESCE($1, full_name),
           state = COALESCE($2, state),
           city = COALESCE($3, city),
           area = COALESCE($4, area)
       WHERE id = $5 RETURNING *`,
      [name, state, city, area, request.worker.id]
    );
    return reply.send({ success: true, worker: formatWorker(result.rows[0]) });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: err.message });
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/worker/profile/complete
// ──────────────────────────────────────────────────────────────
async function completeProfile(request, reply) {
  const b = request.body || {};
  try {
    await ensureWorkerCoreSchema();

    const selectedSkills = Array.isArray(b.selectedSkills)
      ? b.selectedSkills.map((skill) => String(skill || '').trim()).filter(Boolean)
      : [];
    const primarySkill = String(b.skillCategory || selectedSkills[0] || '').trim() || null;
    const qualification = String(b.qualification || '').trim() || null;
    const aadharNumber = String(b.aadharNumber || '').trim() || null;
    const panNumber = String(b.panNumber || '').trim().toUpperCase() || null;
    const state = String(b.state || '').trim() || null;
    const city = String(b.city || '').trim() || null;
    const area = String(b.area || '').trim() || null;
    const address = String(b.address || '').trim() || null;

    const result = await db.query(
      `UPDATE worker_profiles
       SET skill_category = COALESCE($1, skill_category),
           qualification = COALESCE($2, qualification),
           aadhar_number = COALESCE($3, aadhar_number),
           pan_number = COALESCE($4, pan_number),
           state = COALESCE($5, state),
           city = COALESCE($6, city),
           area = COALESCE($7, area),
           address = COALESCE($8, address),
           skill_categories = CASE
             WHEN COALESCE(array_length($9::text[], 1), 0) > 0 THEN $9::text[]
             ELSE COALESCE(skill_categories, ARRAY[]::text[])
           END,
           is_profile_complete = true,
           updated_at = NOW()
       WHERE id = $10 RETURNING *`,
      [primarySkill, qualification, aadharNumber, panNumber, state, city, area, address, selectedSkills, request.worker.id]
    );

    if (result.rows[0] && (b.bankAccount || b.ifsc || b.bankName || b.branch)) {
      const bankValues = [
        result.rows[0].full_name || null,
        String(b.bankAccount || '').trim() || null,
        String(b.ifsc || '').trim().toUpperCase() || null,
        String(b.bankName || '').trim() || null,
        String(b.branch || '').trim() || null,
        request.worker.id,
      ];

      const existingBank = await db.query(
        `SELECT id
         FROM worker_bank_accounts
         WHERE worker_id = $1
         ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
         LIMIT 1`,
        [request.worker.id]
      );

      if (existingBank.rows[0]) {
        await db.query(
          `UPDATE worker_bank_accounts
           SET account_holder_name = $1,
               account_number = $2,
               ifsc_code = $3,
               bank_name = $4,
               branch_name = $5,
               updated_at = NOW()
           WHERE id = $6`,
          [
            bankValues[0],
            bankValues[1],
            bankValues[2],
            bankValues[3],
            bankValues[4],
            existingBank.rows[0].id,
          ]
        );
      } else {
        await db.query(
          `INSERT INTO worker_bank_accounts
            (worker_id, account_holder_name, account_number, ifsc_code, bank_name, branch_name, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            request.worker.id,
            bankValues[0],
            bankValues[1],
            bankValues[2],
            bankValues[3],
            bankValues[4],
          ]
        );
      }
    }

    return reply.send({ success: true, worker: formatWorker(result.rows[0]) });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: err.message });
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/worker/profile/documents
// ──────────────────────────────────────────────────────────────
async function submitDocuments(request, reply) {
  return reply.send({ success: true, message: 'Documents submitted for review' });
}

// ──────────────────────────────────────────────────────────────
// POST /api/worker/documents - Upload worker documents
// ──────────────────────────────────────────────────────────────
async function uploadWorkerDocuments(request, reply) {
  try {
    await ensureWorkerCoreSchema();

    const workerId = String(request.worker.id);
    if (!workerId) {
      return reply.code(400).send({ success: false, message: 'Worker ID is required' });
    }

    // Read all multipart parts and save each file to disk
    const uploadedUrls = {};
    const uploadedFields = {};
    for await (const part of request.parts()) {
      if (part.type === 'field') {
        uploadedFields[part.fieldname] = String(part.value || '').trim();
        continue;
      }

      if (part.type === 'file') {
        const buffer = await part.toBuffer();
        if (!buffer || buffer.length === 0) continue;
        try {
          const result = await uploadService.uploadFile({
            bucket: 'worker-documents',
            folder: workerId,
            filename: part.filename || `${part.fieldname}.jpg`,
            buffer,
            mimetype: part.mimetype,
          });
          uploadedUrls[part.fieldname] = result.publicUrl;
        } catch (uploadErr) {
          request.log.error({ fieldname: part.fieldname, err: uploadErr }, 'File upload failed');
        }
      }
    }

    const documentData = {
      aadhar_url:            uploadedUrls.aadharFile || uploadedUrls.aadharFrontFile || null,
      pan_url:               uploadedUrls.panFile    || uploadedUrls.panFrontFile    || null,
      skill_certificate_url: uploadedUrls.skillCertFile                              || null,
      photo_url:             uploadedUrls.photoFile                                  || null,
      bank_mandate_url:      uploadedUrls.passbookFile                               || null,
    };

    const qualification = String(uploadedFields.qualification || '').trim() || null;
    const aadharNumber = String(uploadedFields.aadharNumber || '').trim() || null;
    const panNumber = String(uploadedFields.panNumber || '').trim().toUpperCase() || null;

    // Upsert worker_documents — worker_id stored as TEXT to be compatible with all DB setups
    const existingRes = await db.query(
      `SELECT id FROM worker_documents WHERE worker_id = $1 LIMIT 1`,
      [workerId]
    );

    if (existingRes.rows.length > 0) {
      await db.query(
        `UPDATE worker_documents
         SET aadhar_url            = COALESCE($1, aadhar_url),
             pan_url               = COALESCE($2, pan_url),
             skill_certificate_url = COALESCE($3, skill_certificate_url),
             photo_url             = COALESCE($4, photo_url),
             bank_mandate_url      = COALESCE($5, bank_mandate_url)
         WHERE worker_id = $6`,
        [
          documentData.aadhar_url,
          documentData.pan_url,
          documentData.skill_certificate_url,
          documentData.photo_url,
          documentData.bank_mandate_url,
          workerId,
        ]
      );
    } else {
      await db.query(
        `INSERT INTO worker_documents
           (worker_id, aadhar_url, pan_url, skill_certificate_url, photo_url, bank_mandate_url, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          workerId,
          documentData.aadhar_url,
          documentData.pan_url,
          documentData.skill_certificate_url,
          documentData.photo_url,
          documentData.bank_mandate_url,
        ]
      );
    }

    // Also update photo_url on worker_profiles so the admin worker list shows the photo
    if (documentData.photo_url) {
      await db.query(
        `ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS photo_url TEXT`
      ).catch(() => {});
      await db.query(
        `UPDATE worker_profiles SET photo_url = $1 WHERE id = $2`,
        [documentData.photo_url, workerId]
      ).catch(() => {});
    }

    await db.query(
      `UPDATE worker_profiles
         SET qualification = COALESCE($1, qualification),
             aadhar_number = COALESCE($2, aadhar_number),
             pan_number = COALESCE($3, pan_number),
             updated_at = NOW()
       WHERE id = $4`,
      [qualification, aadharNumber, panNumber, workerId]
    ).catch((err) => {
      request.log.error({ err }, 'Failed to persist worker document text fields');
    });

    // Mark documents as submitted
    await db.query(
      `UPDATE worker_profiles SET is_documents_submitted = true, updated_at = NOW() WHERE id = $1`,
      [workerId]
    ).catch(() => {});

    return reply.code(200).send({
      success: true,
      message: 'Documents uploaded successfully',
      urls: uploadedUrls,
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: err.message });
  }
}

// ──────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ──────────────────────────────────────────────────────────────
async function getNotifications(request, reply) {
  try {
    await ensureWorkerCoreSchema();
    const result = await db.query(
      `SELECT id, title, message, type, status, metadata, created_at, read_at
       FROM worker_notifications
       WHERE worker_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [request.worker.id]
    );
    return reply.send({ success: true, data: result.rows });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Failed to fetch notifications' });
  }
}

async function getUnreadCount(request, reply) {
  try {
    await ensureWorkerCoreSchema();
    const result = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM worker_notifications
       WHERE worker_id = $1 AND status = 'unread'`,
      [request.worker.id]
    );
    return reply.send({ success: true, count: result.rows[0]?.count || 0 });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Failed to fetch unread count' });
  }
}

async function markNotificationRead(request, reply) {
  try {
    await ensureWorkerCoreSchema();
    const { id } = request.params;
    await db.query(
      `UPDATE worker_notifications
       SET status = 'read', read_at = NOW()
       WHERE id = $1 AND worker_id = $2`,
      [id, request.worker.id]
    );
    return reply.send({ success: true });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Failed to mark notification as read' });
  }
}

async function markAllNotificationsRead(request, reply) {
  try {
    await ensureWorkerCoreSchema();
    await db.query(
      `UPDATE worker_notifications
       SET status = 'read', read_at = NOW()
       WHERE worker_id = $1 AND status = 'unread'`,
      [request.worker.id]
    );
    return reply.send({ success: true });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Failed to mark all notifications as read' });
  }
}

// ──────────────────────────────────────────────────────────────
// DAILY TARGET & INCENTIVES
// ──────────────────────────────────────────────────────────────
async function getDailyTarget(request, reply) {
  return reply.send({
    success: true,
    data: {
      jobsTarget: 5, jobsCompleted: 0,
      earningsTarget: 1000, earningsAchieved: 0,
      hoursTarget: 8, hoursWorked: 0,
    },
  });
}

async function updateDailyTarget(request, reply) {
  return reply.send({ success: true, message: 'Target updated' });
}

async function getIncentives(request, reply) {
  return reply.send({ success: true, data: [] });
}

async function getIncentiveProgress(request, reply) {
  return reply.send({ success: true, data: { progress: 0, milestones: [] } });
}

async function getSurgePricing(request, reply) {
  return reply.send({ success: true, data: { multiplier: 1.0, isActive: false } });
}

// ──────────────────────────────────────────────────────────────
// JOB RATE SETTINGS
// ──────────────────────────────────────────────────────────────
async function getJobRateSettings(request, reply) {
  return reply.send({ success: true, data: { rates: [], currency: 'INR' } });
}

// ──────────────────────────────────────────────────────────────
// BANK DETAILS
// ──────────────────────────────────────────────────────────────
async function getBankDetails(request, reply) {
  try {
    await ensureWorkerCoreSchema();
    const result = await db.query(
      `SELECT account_holder_name, account_number, ifsc_code, bank_name, branch_name, upi_id, updated_at
       FROM worker_bank_accounts
       WHERE worker_id = $1
       ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
       LIMIT 1`,
      [request.worker.id]
    );
    return reply.send({ success: true, data: result.rows[0] || null });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Failed to fetch bank details' });
  }
}

async function submitBankDetails(request, reply) {
  try {
    await ensureWorkerCoreSchema();
    const b = request.body || {};
    const existingBank = await db.query(
      `SELECT id
       FROM worker_bank_accounts
       WHERE worker_id = $1
       ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
       LIMIT 1`,
      [request.worker.id]
    );

    const bankPayload = [
      b.accountHolderName || b.account_holder_name || null,
      b.accountNumber || b.account_number || null,
      b.ifscCode || b.ifsc_code || null,
      b.bankName || b.bank_name || null,
      b.branchName || b.branch_name || null,
      b.upiId || b.upi_id || null,
    ];

    if (existingBank.rows[0]) {
      await db.query(
        `UPDATE worker_bank_accounts
         SET account_holder_name = $1,
             account_number = $2,
             ifsc_code = $3,
             bank_name = $4,
             branch_name = $5,
             upi_id = $6,
             updated_at = NOW()
         WHERE id = $7`,
        [...bankPayload, existingBank.rows[0].id]
      );
    } else {
      await db.query(
        `INSERT INTO worker_bank_accounts
          (worker_id, account_holder_name, account_number, ifsc_code, bank_name, branch_name, upi_id, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [request.worker.id, ...bankPayload]
      );
    }

    return reply.send({ success: true, message: 'Bank details saved' });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Failed to save bank details' });
  }
}

async function getJobs(request, reply) {
  try {
    await ensureWorkerCoreSchema();
    const result = await db.query(
      `SELECT *
       FROM worker_jobs
       WHERE worker_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [request.worker.id]
    );
    return reply.send({ success: true, data: result.rows });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Failed to fetch jobs' });
  }
}

// ──────────────────────────────────────────────────────────────
// JOBS
// ──────────────────────────────────────────────────────────────
async function recordJob(request, reply) {
  const { serviceType, amount, paymentMethod, elapsedSeconds } = request.body || {};
  const workerId = request.worker.id;

  // db is required at the top of this file
  try {
    await ensureWorkerCoreSchema();
    const client = await db.beginTransaction();
    const res = await client.query('SELECT wallet_balance FROM worker_profiles WHERE id = $1 FOR UPDATE', [workerId]);
    const worker = res.rows[0];
    
    if (!worker) {
      await client.query('ROLLBACK');
      return reply.code(404).send({ success: false, message: 'Worker not found' });
    }

    const newAmount = Number(amount) || 0;
    const newBalance = parseFloat(worker.wallet_balance || 0) + newAmount;

    await client.query(
      'UPDATE worker_profiles SET wallet_balance = $1, total_jobs = COALESCE(total_jobs, 0) + 1 WHERE id = $2',
      [newBalance, workerId]
    );

    await client.query(
      `INSERT INTO worker_jobs
        (worker_id, service_type, amount, payment_method, status, elapsed_seconds, created_at, updated_at, completed_at)
       VALUES ($1, $2, $3, $4, 'completed', $5, NOW(), NOW(), NOW())`,
      [workerId, serviceType || 'General', newAmount, paymentMethod || 'cash', Number(elapsedSeconds) || 0]
    );

    // Save transaction
    if (newAmount > 0) {
      const hours = ((Number(elapsedSeconds) || 0) / 3600).toFixed(2);
      await client.query(
        `INSERT INTO worker_transactions (worker_id, amount, description, transaction_type, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [workerId, newAmount.toFixed(2), `Job Earnings - ${serviceType || 'Service'} (${hours}h)`, 'credit']
      );
    }
    
    await client.query('COMMIT');
    return reply.send({ success: true, message: 'Job recorded and earnings added to wallet', new_balance: newBalance });
  } catch(err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Failed to record job' });
  }
}

// ──────────────────────────────────────────────────────────────
// TRANSACTIONS
// ──────────────────────────────────────────────────────────────
async function getTransactions(request, reply) {
  try {
    await ensureWorkerCoreSchema();
    const result = await db.query(
      `SELECT id, amount, description, transaction_type, related_ref, created_at
       FROM worker_transactions
       WHERE worker_id = $1
       ORDER BY created_at DESC
       LIMIT 200`,
      [request.worker.id]
    );
    return reply.send({ success: true, data: result.rows });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Failed to fetch transactions' });
  }
}

async function recordTransaction(request, reply) {
  return reply.send({ success: true, message: 'Transaction recorded' });
}

// ──────────────────────────────────────────────────────────────
// SUPPORT TICKETS
// ──────────────────────────────────────────────────────────────
async function createTicket(request, reply) {
  try {
    await ensureWorkerCoreSchema();
    const { subject, message, priority } = request.body || {};
    if (!subject || !message) {
      return reply.code(400).send({ success: false, message: 'Subject and message are required' });
    }

    const created = await db.query(
      `INSERT INTO worker_support_tickets
        (worker_id, subject, message, status, priority, created_at, updated_at)
       VALUES ($1, $2, $3, 'open', COALESCE($4, 'normal'), NOW(), NOW())
       RETURNING *`,
      [request.worker.id, subject, message, priority || 'normal']
    );

    await db.query(
      `INSERT INTO worker_support_messages (ticket_id, sender_type, message, created_at)
       VALUES ($1, 'worker', $2, NOW())`,
      [created.rows[0].id, message]
    );

    return reply.send({ success: true, message: 'Ticket created', data: created.rows[0] });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Failed to create support ticket' });
  }
}

async function getTickets(request, reply) {
  try {
    await ensureWorkerCoreSchema();
    const result = await db.query(
      `SELECT *
       FROM worker_support_tickets
       WHERE worker_id = $1
       ORDER BY updated_at DESC
       LIMIT 100`,
      [request.worker.id]
    );
    return reply.send({ success: true, data: result.rows });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Failed to fetch support tickets' });
  }
}

async function getTicketMessages(request, reply) {
  try {
    await ensureWorkerCoreSchema();
    const { ticketId } = request.params;
    const ticket = await db.query(
      'SELECT id FROM worker_support_tickets WHERE id = $1 AND worker_id = $2 LIMIT 1',
      [ticketId, request.worker.id]
    );
    if (!ticket.rows[0]) {
      return reply.code(404).send({ success: false, message: 'Support ticket not found' });
    }

    const result = await db.query(
      `SELECT id, sender_type, message, created_at
       FROM worker_support_messages
       WHERE ticket_id = $1
       ORDER BY created_at ASC`,
      [ticketId]
    );
    return reply.send({ success: true, data: result.rows });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Failed to fetch ticket messages' });
  }
}

async function sendTicketMessage(request, reply) {
  try {
    await ensureWorkerCoreSchema();
    const { ticketId } = request.params;
    const message = String(request.body?.message || '').trim();
    if (!message) {
      return reply.code(400).send({ success: false, message: 'Message is required' });
    }

    const ticket = await db.query(
      'SELECT id FROM worker_support_tickets WHERE id = $1 AND worker_id = $2 LIMIT 1',
      [ticketId, request.worker.id]
    );
    if (!ticket.rows[0]) {
      return reply.code(404).send({ success: false, message: 'Support ticket not found' });
    }

    await db.query(
      `INSERT INTO worker_support_messages (ticket_id, sender_type, message, created_at)
       VALUES ($1, 'worker', $2, NOW())`,
      [ticketId, message]
    );
    await db.query('UPDATE worker_support_tickets SET updated_at = NOW() WHERE id = $1', [ticketId]);

    return reply.send({ success: true, message: 'Message sent' });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Failed to send message' });
  }
}

// ──────────────────────────────────────────────────────────────
// JOB CHAT
// ──────────────────────────────────────────────────────────────
async function getJobChat(request, reply) {
  try {
    await ensureWorkerCoreSchema();
    const { jobId } = request.params;
    const job = await db.query(
      'SELECT id FROM worker_jobs WHERE id = $1 AND worker_id = $2 LIMIT 1',
      [jobId, request.worker.id]
    );
    if (!job.rows[0]) return reply.code(404).send({ success: false, message: 'Job not found' });

    const result = await db.query(
      `SELECT id, sender_type, message, created_at
       FROM worker_job_chats
       WHERE job_id = $1
       ORDER BY created_at ASC`,
      [jobId]
    );
    return reply.send({ success: true, data: result.rows });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Failed to fetch job chat' });
  }
}

async function sendJobChat(request, reply) {
  try {
    await ensureWorkerCoreSchema();
    const { jobId } = request.params;
    const message = String(request.body?.message || '').trim();
    if (!message) return reply.code(400).send({ success: false, message: 'Message is required' });

    const job = await db.query(
      'SELECT id FROM worker_jobs WHERE id = $1 AND worker_id = $2 LIMIT 1',
      [jobId, request.worker.id]
    );
    if (!job.rows[0]) return reply.code(404).send({ success: false, message: 'Job not found' });

    const inserted = await db.query(
      `INSERT INTO worker_job_chats (job_id, worker_id, sender_type, message, created_at)
       VALUES ($1, $2, 'worker', $3, NOW())
       RETURNING id, sender_type, message, created_at`,
      [jobId, request.worker.id, message]
    );
    return reply.send({ success: true, message: 'Chat message sent', data: inserted.rows[0] });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Failed to send job chat message' });
  }
}

// ──────────────────────────────────────────────────────────────
// GPS / LOCATION
// ──────────────────────────────────────────────────────────────
async function updateLocation(request, reply) {
  try {
    await ensureWorkerCoreSchema();
    const latitude = Number(request.body?.latitude);
    const longitude = Number(request.body?.longitude);
    const accuracy = Number(request.body?.accuracy || 0);
    const jobId = request.body?.jobId || null;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return reply.code(400).send({ success: false, message: 'Valid latitude and longitude are required' });
    }

    await db.query(
      `UPDATE worker_profiles
       SET current_latitude = $1,
           current_longitude = $2,
           last_location_at = NOW(),
           last_seen_at = NOW()
       WHERE id = $3`,
      [latitude, longitude, request.worker.id]
    );

    await db.query(
      `INSERT INTO worker_location_logs (worker_id, job_id, latitude, longitude, accuracy, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [request.worker.id, jobId, latitude, longitude, Number.isFinite(accuracy) ? accuracy : null]
    );

    return reply.send({ success: true });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Failed to update location' });
  }
}

async function getLocation(request, reply) {
  try {
    await ensureWorkerCoreSchema();
    const result = await db.query(
      `SELECT current_latitude, current_longitude, last_location_at
       FROM worker_profiles
       WHERE id = $1
       LIMIT 1`,
      [request.worker.id]
    );
    const row = result.rows[0] || null;
    return reply.send({ success: true, data: row });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Failed to fetch location' });
  }
}

async function getJobLocationHistory(request, reply) {
  try {
    await ensureWorkerCoreSchema();
    const { jobId } = request.params;
    const job = await db.query(
      'SELECT id FROM worker_jobs WHERE id = $1 AND worker_id = $2 LIMIT 1',
      [jobId, request.worker.id]
    );
    if (!job.rows[0]) return reply.code(404).send({ success: false, message: 'Job not found' });

    const result = await db.query(
      `SELECT latitude, longitude, accuracy, created_at
       FROM worker_location_logs
       WHERE worker_id = $1 AND job_id = $2
       ORDER BY created_at ASC`,
      [request.worker.id, jobId]
    );
    return reply.send({ success: true, data: result.rows });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Failed to fetch job location history' });
  }
}

// ──────────────────────────────────────────────────────────────
// UPLOAD
// ──────────────────────────────────────────────────────────────
async function uploadFile(request, reply) {
  return reply.send({ success: true, url: '' });
}

// ──────────────────────────────────────────────────────────────
// WITHDRAWALS
// ──────────────────────────────────────────────────────────────
async function createWithdrawal(request, reply) {
  try {
    await ensureWorkerCoreSchema();
    const amount = Number(request.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return reply.code(400).send({ success: false, message: 'Valid amount is required' });
    }

    const method = String(request.body?.method || 'bank').toLowerCase();
    const upiId = request.body?.upiId || null;
    const accountNumber = request.body?.accountNumber || null;
    const ifscCode = request.body?.ifscCode || null;

    const client = await db.beginTransaction();
    const walletRes = await client.query(
      'SELECT wallet_balance FROM worker_profiles WHERE id = $1 FOR UPDATE',
      [request.worker.id]
    );
    const profile = walletRes.rows[0];
    if (!profile) {
      await client.query('ROLLBACK');
      client.release();
      return reply.code(404).send({ success: false, message: 'Worker not found' });
    }

    const currentBalance = Number(profile.wallet_balance || 0);
    if (currentBalance < amount) {
      await client.query('ROLLBACK');
      client.release();
      return reply.code(400).send({ success: false, message: 'Insufficient wallet balance' });
    }

    await client.query(
      `UPDATE worker_profiles
       SET wallet_balance = wallet_balance - $1
       WHERE id = $2`,
      [amount, request.worker.id]
    );

    const inserted = await client.query(
      `INSERT INTO worker_withdrawals
        (worker_id, amount, method, upi_id, account_number, ifsc_code, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
       RETURNING *`,
      [request.worker.id, amount, method, upiId, accountNumber, ifscCode]
    );

    await client.query(
      `INSERT INTO worker_transactions (worker_id, amount, description, transaction_type, related_ref, created_at)
       VALUES ($1, $2, $3, 'debit', $4, NOW())`,
      [request.worker.id, amount, 'Withdrawal request', inserted.rows[0].id]
    );

    await client.query('COMMIT');
    client.release();

    return reply.send({ success: true, message: 'Withdrawal request submitted', data: inserted.rows[0] });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Failed to create withdrawal request' });
  }
}

async function getWithdrawals(request, reply) {
  try {
    await ensureWorkerCoreSchema();
    const result = await db.query(
      `SELECT *
       FROM worker_withdrawals
       WHERE worker_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [request.worker.id]
    );
    return reply.send({ success: true, data: result.rows });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Failed to fetch withdrawals' });
  }
}

// ──────────────────────────────────────────────────────────────
// ONLINE STATUS
// ──────────────────────────────────────────────────────────────
async function toggleStatus(request, reply) {
  try {
    await ensureWorkerCoreSchema();
    const isOnline = !!request.body?.isOnline;
    await db.query(
      `UPDATE worker_profiles
       SET is_online = $1,
           last_seen_at = NOW()
       WHERE id = $2`,
      [isOnline, request.worker.id]
    );
    return reply.send({ success: true, isOnline });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Failed to update online status' });
  }
}

// ──────────────────────────────────────────────────────────────
// WALLET
// ──────────────────────────────────────────────────────────────
async function addMoney(request, reply) {
  const amount = Number(request.body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return reply.code(400).send({ success: false, message: 'Valid amount is required' });
  }

  if (!hasCashfreeCredentials()) {
    return reply.code(503).send({
      success: false,
      message:
        'Cashfree test credentials are missing. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY and retry.',
    });
  }

  try {
    await ensureWorkerPaymentOrdersTable();
    const workerId = request.worker.id;
    const orderId = `${WORKER_ORDER_PREFIX}${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    await db.query(
      `INSERT INTO worker_payment_orders (worker_id, cashfree_order_id, amount, status)
       VALUES ($1, $2, $3, 'PENDING')`,
      [workerId, orderId, amount]
    );

    const returnUrl = `${getApiBaseUrl(request)}/api/worker/wallet/verify?order_id=${encodeURIComponent(orderId)}`;
    const customerPhone = request.worker.phone || '9999999999';
    const customerName = request.worker.full_name || 'Worker Partner';

    const cashfreeRes = await fetch(`${getCashfreeBaseUrl()}/pg/orders`, {
      method: 'POST',
      headers: getCashfreeHeaders(),
      body: JSON.stringify({
        order_id: orderId,
        order_amount: amount,
        order_currency: 'INR',
        customer_details: {
          customer_id: `WORKER_${workerId}`,
          customer_phone: customerPhone,
          customer_name: customerName,
        },
        order_meta: { return_url: returnUrl },
      }),
    });

    let cashfreeData = {};
    try {
      cashfreeData = await cashfreeRes.json();
    } catch {
      cashfreeData = {};
    }

    if (!cashfreeRes.ok) {
      await db.query(
        `UPDATE worker_payment_orders SET status = 'FAILED' WHERE cashfree_order_id = $1`,
        [orderId]
      );
      throw new Error(cashfreeData.message || 'Failed to create Cashfree payment order');
    }

    const paymentLink =
      cashfreeData.payment_link ||
      cashfreeData.order_meta?.payment_link ||
      cashfreeData.order_meta?.payment_url;

    if (!paymentLink) {
      throw new Error('Cashfree order created but payment link was not returned');
    }

    return reply.send({
      success: true,
      order_id: orderId,
      payment_link: paymentLink,
      status: 'PENDING',
    });
  } catch (err) {
    request.log.error({ err }, 'Worker add money error');
    return reply.code(500).send({ success: false, message: err.message || 'Failed to start payment' });
  }
}

async function getWorkerPaymentOrderStatus(request, reply) {
  const orderId = String(request.params.orderId || '').trim();
  if (!isValidWorkerOrderId(orderId)) {
    return reply.code(400).send({ success: false, message: 'Invalid order id' });
  }

  try {
    await ensureWorkerPaymentOrdersTable();

    const orderRes = await db.query(
      `SELECT * FROM worker_payment_orders
       WHERE cashfree_order_id = $1 AND worker_id = $2
       LIMIT 1`,
      [orderId, request.worker.id]
    );

    const existingOrder = orderRes.rows[0];
    if (!existingOrder) {
      return reply.code(404).send({ success: false, message: 'Payment order not found' });
    }

    const shouldSync = normalizeWorkerOrderStatus(existingOrder.status) === 'PENDING';
    const { order, providerStatus } = shouldSync
      ? await syncWorkerOrderWithCashfree(orderId, existingOrder)
      : { order: existingOrder, providerStatus: null };

    const finalOrder = order || existingOrder;
    return reply.send({
      success: true,
      order_id: finalOrder.cashfree_order_id,
      status: normalizeWorkerOrderStatus(finalOrder.status),
      amount: Number(finalOrder.amount || 0),
      completed_at: finalOrder.completed_at || null,
      provider_status: providerStatus || null,
    });
  } catch (err) {
    request.log.error({ err }, 'Worker payment status error');
    return reply.code(500).send({ success: false, message: err.message || 'Failed to check payment status' });
  }
}

async function verifyWorkerWalletPayment(request, reply) {
  const orderId = String(request.query.order_id || '').trim();
  if (!isValidWorkerOrderId(orderId)) {
    return reply.type('text/html').send(
      paymentHtml({
        success: false,
        title: 'Invalid Payment Reference',
        message: 'The payment reference is invalid. Retry from the worker app.',
      })
    );
  }

  try {
    await ensureWorkerPaymentOrdersTable();
    const orderRes = await db.query(
      'SELECT * FROM worker_payment_orders WHERE cashfree_order_id = $1 LIMIT 1',
      [orderId]
    );
    const existingOrder = orderRes.rows[0];

    if (!existingOrder) {
      return reply.type('text/html').send(
        paymentHtml({
          success: false,
          title: 'Payment Not Found',
          message: 'No matching worker payment request was found.',
        })
      );
    }

    const { order } = await syncWorkerOrderWithCashfree(orderId, existingOrder);
    const finalOrder = order || existingOrder;
    const status = normalizeWorkerOrderStatus(finalOrder.status);

    if (status === 'SUCCESS') {
      return reply.type('text/html').send(
        paymentHtml({
          success: true,
          title: 'Payment Successful',
          message: 'Worker wallet top-up completed. You may return to the app.',
        })
      );
    }

    if (status === 'FAILED' || status === 'CANCELLED') {
      return reply.type('text/html').send(
        paymentHtml({
          success: false,
          title: 'Payment Failed',
          message: 'Payment could not be completed. Retry from the worker app.',
        })
      );
    }

    return reply.type('text/html').send(
      paymentHtml({
        success: false,
        title: 'Payment Pending',
        message: 'Confirmation is still pending. Complete payment and refresh this page.',
      })
    );
  } catch (err) {
    request.log.error({ err }, 'Worker verify payment error');
    return reply.type('text/html').send(
      paymentHtml({
        success: false,
        title: 'Verification Error',
        message: 'Could not verify worker payment right now. Please retry from the app.',
      })
    );
  }
}

async function updateWalletBalance(request, reply) {
  try {
    await ensureWorkerCoreSchema();
    const balance = Number(request.body?.balance);
    if (!Number.isFinite(balance) || balance < 0) {
      return reply.code(400).send({ success: false, message: 'Valid balance is required' });
    }

    await db.query(
      'UPDATE worker_profiles SET wallet_balance = $1, last_seen_at = NOW() WHERE id = $2',
      [balance, request.worker.id]
    );
    return reply.send({ success: true, balance });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Failed to update wallet balance' });
  }
}

// ──────────────────────────────────────────────────────────────
// SETTINGS
// ──────────────────────────────────────────────────────────────
async function updateSettings(request, reply) {
  return reply.send({ success: true, message: 'Settings updated' });
}

// ──────────────────────────────────────────────────────────────
// FAQ / HELP
// ──────────────────────────────────────────────────────────────
async function getFaqs(request, reply) {
  return reply.send({ success: true, data: [] });
}

async function getFaqCategories(request, reply) {
  return reply.send({ success: true, data: [] });
}

async function markFaqHelpful(request, reply) {
  return reply.send({ success: true });
}

async function getHelpArticles(request, reply) {
  return reply.send({ success: true, data: [] });
}

async function getHelpArticleBySlug(request, reply) {
  return reply.send({ success: true, data: null });
}

// AUTH LOGOUT
async function workerLogout(request, reply) {
  return reply.send({ success: true, message: 'Logged out' });
}

// ── Helper ────────────────────────────────────────────────────
function formatWorker(w) {
  return {
    id:               w.id,
    phone:            w.phone,
    mobile:           w.phone,
    fullName:         w.full_name || w.name || '',
    skillCategory:    w.skill_category || '',
    skillCategories:  Array.isArray(w.skill_categories) ? w.skill_categories : [],
    qualification:    w.qualification || '',
    aadharNumber:     w.aadhar_number || '',
    panNumber:        w.pan_number || '',
    state:            w.state || '',
    city:             w.city || '',
    area:             w.area || '',
    address:          w.address || '',
    isApproved:       w.is_approved || false,
    isRegistered:     w.is_profile_complete || false,
    isProfileComplete: w.is_profile_complete || false,
    isDocumentsSubmitted: w.is_documents_submitted || false,
    walletBalance:    w.wallet_balance || '0',
    totalJobs:        w.total_jobs || '0',
    rating:           w.rating || '0',
    isPremium:        false,
    isFrozen:         false,
    createdAt:        w.created_at,
  };
}

// ──────────────────────────────────────────────────────────────
// JOB REQUEST ACCEPT / DECLINE
// PUT /api/worker/notifications/:id/accept
// PUT /api/worker/notifications/:id/decline
// ──────────────────────────────────────────────────────────────
async function acceptJobRequest(request, reply) {
  try {
    const notifId = Number(request.params.id);
    if (!notifId) return reply.code(400).send({ success: false, message: 'Invalid notification id' });

    // Get jobId from notification metadata
    const notifResult = await db.query(
      `SELECT metadata FROM worker_notifications WHERE id = $1 AND worker_id = $2 LIMIT 1`,
      [notifId, request.worker.id]
    );
    if (!notifResult.rows.length) return reply.code(404).send({ success: false, message: 'Notification not found' });

    const meta = notifResult.rows[0].metadata || {};
    const jobId = meta.jobId;

    if (jobId) {
      await db.query(
        `UPDATE job_requests SET status = 'accepted', accepted_at = NOW() WHERE id = $1`,
        [jobId]
      ).catch(() => {});
    } else {
      // fallback: match by notif_id column
      await db.query(
        `UPDATE job_requests SET status = 'accepted', accepted_at = NOW() WHERE notif_id = $1`,
        [notifId]
      ).catch(() => {});
    }

    await db.query(
      `UPDATE worker_notifications SET status = 'read', read_at = NOW() WHERE id = $1 AND worker_id = $2`,
      [notifId, request.worker.id]
    ).catch(() => {});

    return reply.send({ success: true });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: err.message });
  }
}

async function declineJobRequest(request, reply) {
  try {
    const notifId = Number(request.params.id);
    if (!notifId) return reply.code(400).send({ success: false, message: 'Invalid notification id' });

    const notifResult = await db.query(
      `SELECT metadata FROM worker_notifications WHERE id = $1 AND worker_id = $2 LIMIT 1`,
      [notifId, request.worker.id]
    );
    if (!notifResult.rows.length) return reply.code(404).send({ success: false, message: 'Notification not found' });

    const meta = notifResult.rows[0].metadata || {};
    const jobId = meta.jobId;

    if (jobId) {
      await db.query(
        `UPDATE job_requests SET status = 'declined' WHERE id = $1`,
        [jobId]
      ).catch(() => {});
    } else {
      await db.query(
        `UPDATE job_requests SET status = 'declined' WHERE notif_id = $1`,
        [notifId]
      ).catch(() => {});
    }

    await db.query(
      `UPDATE worker_notifications SET status = 'read', read_at = NOW() WHERE id = $1 AND worker_id = $2`,
      [notifId, request.worker.id]
    ).catch(() => {});

    return reply.send({ success: true });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: err.message });
  }
}

module.exports = {
  workerSendOtp,
  workerVerifyOtp,
  workerRegister,
  getWorkerProfile,
  getProfile,
  updateProfile,
  completeProfile,
  submitDocuments,
  uploadWorkerDocuments,
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  getDailyTarget,
  updateDailyTarget,
  getIncentives,
  getIncentiveProgress,
  getSurgePricing,
  getJobRateSettings,
  getBankDetails,
  submitBankDetails,
  getJobs,
  recordJob,
  getTransactions,
  recordTransaction,
  createTicket,
  getTickets,
  getTicketMessages,
  sendTicketMessage,
  getJobChat,
  sendJobChat,
  updateLocation,
  getLocation,
  getJobLocationHistory,
  uploadFile,
  createWithdrawal,
  getWithdrawals,
  toggleStatus,
  addMoney,
  getWorkerPaymentOrderStatus,
  verifyWorkerWalletPayment,
  updateWalletBalance,
  updateSettings,
  getFaqs,
  getFaqCategories,
  markFaqHelpful,
  getHelpArticles,
  getHelpArticleBySlug,
  workerLogout,
  ensureWorkerCoreSchema,
  acceptJobRequest,
  declineJobRequest,
};

