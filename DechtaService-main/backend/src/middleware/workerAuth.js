'use strict';

const db = require('../config/database');

function normalizePositiveInt(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const normalized = String(value || '').trim();
    if (normalized) return normalized;
  }
  return null;
}

async function authenticateWorker(request, reply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.code(401).send({ success: false, message: 'Unauthorized. Invalid or expired token.' });
  }

  const token = request.user || {};
  const role = String(token.role || token.userType || '').trim().toLowerCase();

  if (role !== 'worker') {
    return reply.code(403).send({ success: false, message: 'Forbidden: worker access only' });
  }

  const workerId = normalizePositiveInt(token.workerId ?? token.worker_id ?? token.id ?? token.sub);
  const phone = firstNonEmpty(token.mobile, token.phone);

  if (!workerId && !phone) {
    return reply.code(401).send({ success: false, message: 'Unauthorized. Invalid worker token payload.' });
  }

  try {
    let worker = null;

    // Prefer the latest/most complete profile when token carries both workerId and phone.
    // This handles stale tokens that still point to an older incomplete profile row.
    if (workerId && phone) {
      const result = await db.query(
        `SELECT *
         FROM worker_profiles
         WHERE id = $1 OR phone = $2
         ORDER BY is_profile_complete DESC,
                  is_approved DESC,
                  updated_at DESC NULLS LAST,
                  created_at DESC NULLS LAST,
                  id DESC
         LIMIT 1`,
        [workerId, phone]
      );
      worker = result.rows[0] || null;
    }

    if (!worker && workerId) {
      const result = await db.query(
        'SELECT * FROM worker_profiles WHERE id = $1 LIMIT 1',
        [workerId]
      );
      worker = result.rows[0] || null;
    }

    // Support worker tokens that only carry phone/mobile.
    if (!worker && phone) {
      const result = await db.query(
        `SELECT *
         FROM worker_profiles
         WHERE phone = $1
         ORDER BY is_profile_complete DESC,
                  is_approved DESC,
                  updated_at DESC NULLS LAST,
                  created_at DESC NULLS LAST,
                  id DESC
         LIMIT 1`,
        [phone]
      );
      worker = result.rows[0] || null;
    }

    if (!worker) {
      return reply.code(401).send({ success: false, message: 'Worker not found' });
    }

    request.worker = worker;
  } catch (err) {
    request.log.error({ err, token }, 'Worker auth lookup failed');
    return reply.code(503).send({ success: false, message: 'Database is unavailable. Please try again shortly.' });
  }
}

module.exports = { authenticateWorker };
