// src/middleware/auth.js
const db = require('../config/database');
const {
  getDriverSuspensionState,
  clearExpiredSuspension,
} = require('../services/driverSuspension');

// ──────────────────────────────────────────────────────────────
// Fastify preHandler — verifies JWT and attaches driver to request
// ──────────────────────────────────────────────────────────────
async function authenticate(request, reply) {
  try {
    console.log('[Auth] Headers:', request.headers);
    await request.jwtVerify();
    console.log('[Auth] Decoded User:', request.user);

    const tokenDriverId = request.user?.driverId ?? request.user?.id ?? null;
    const tokenUserId = request.user?.userId ?? request.user?.user_id ?? null;

    let driver = null;

    // Try resolving by driver profile id when present in token
    if (tokenDriverId) {
      driver = await db.selectOne('driver_profiles', { id: tokenDriverId });
      console.log('[Auth] Found Driver by tokenDriverId:', driver ? driver.id : 'NOT FOUND');
    }

    // Fallback: some tokens only carry user id
    if (!driver && tokenUserId) {
      driver = await db.selectOne('driver_profiles', { user_id: tokenUserId });
      console.log('[Auth] Found Driver by tokenUserId:', driver ? driver.id : 'NOT FOUND');
    }

    if (!driver) {
      console.error('[Auth] Driver not found in DB for user payload:', request.user);
      return reply.code(401).send({ success: false, message: 'Driver not found' });
    }

    // Unified schema stores approval on users, while legacy schemas may keep it on driver_profiles.
    // Treat driver as approved if either source says approved, unless user is explicitly rejected.
    const user = driver.user_id ? await db.selectOne('users', { id: driver.user_id }) : null;
    const userStatus = String(user?.status || '').toLowerCase();
    const userVerification = String(user?.verification_status || '').toLowerCase();
    const userRejected = userStatus === 'suspended' || userStatus === 'banned' || userVerification === 'rejected';
    const driverApproved = !!driver.is_approved;
    const userApproved = !!(user?.is_approved) || userVerification === 'verified';
    driver.is_approved = !userRejected && (driverApproved || userApproved);
    if (driver.is_approved && !driverApproved) {
      db.update('driver_profiles', { is_approved: true }, { id: driver.id }).catch(() => {});
    }

    const suspension = await getDriverSuspensionState(driver.id);
    if (driver.suspended_until && !suspension.isSuspended) {
      await clearExpiredSuspension(driver.id);
    }

    driver.is_suspended = suspension.isSuspended;
    driver.suspended_until = suspension.suspendedUntil;
    driver.suspension_reason = suspension.suspensionReason;
    driver.cancellation_count_today = suspension.cancellationCount;
    driver.max_daily_cancellations = suspension.maxDailyCancellations;
    driver.suspension_duration_hours = suspension.suspensionDurationHours;
    driver.suspension_remaining_ms = suspension.remainingMs;
    driver.suspension = {
      is_suspended: suspension.isSuspended,
      suspended_until: suspension.suspendedUntil,
      remaining_ms: suspension.remainingMs,
      suspension_reason: suspension.suspensionReason,
      cancellation_count_today: suspension.cancellationCount,
      max_daily_cancellations: suspension.maxDailyCancellations,
      suspension_duration_hours: suspension.suspensionDurationHours,
    };

    // Attach driver to request for downstream use
    request.driver = driver;
  } catch (err) {
    require('fs').appendFileSync('auth-debug.log', `[Auth Error]: ${err.message}\nHeaders: ${JSON.stringify(request.headers)}\n`);
    console.error('[Auth Error]:', err.message);
    reply.code(401).send({ success: false, message: 'Unauthorized. Invalid or expired token.', error: err.message });
  }
}

// ──────────────────────────────────────────────────────────────
// Check if driver is approved before allowing sensitive actions
// Returns pendingApproval: true so the frontend can show a
// clear "pending approval" message instead of a generic error.
// ──────────────────────────────────────────────────────────────
async function requireApproved(request, reply) {
  if (!request.driver) {
    return reply.code(401).send({ success: false, message: 'Not authenticated' });
  }
  if (!request.driver.is_approved) {
    return reply.code(403).send({
      success: false,
      pendingApproval: true,
      message: 'Your account is pending admin approval. You will be notified once approved.',
    });
  }

  if (request.driver.is_suspended) {
    return reply.code(403).send({
      success: false,
      suspended: true,
      suspendedUntil: request.driver.suspended_until,
      remainingMs: request.driver.suspension_remaining_ms || 0,
      cancellationCountToday: request.driver.cancellation_count_today || 0,
      maxDailyCancellations: request.driver.max_daily_cancellations || 5,
      suspensionDurationHours: request.driver.suspension_duration_hours || 8,
      message: 'Your driver account is suspended because you cancelled too many orders today. It will unlock automatically after 8 hours.',
    });
  }
}

module.exports = { authenticate, requireApproved };
