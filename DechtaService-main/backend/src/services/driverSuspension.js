const db = require('../config/database');

const MAX_DAILY_CANCELLATIONS = 5;
const SUSPENSION_DURATION_HOURS = 8;
const SUSPENSION_DURATION_MS = SUSPENSION_DURATION_HOURS * 60 * 60 * 1000;

let suspensionSchemaReadyPromise = null;

async function tableExists(tableName) {
  const result = await db.query('SELECT to_regclass($1) AS table_name', [`public.${tableName}`]);
  return !!result.rows[0]?.table_name;
}

async function ensureDriverSuspensionSchema() {
  if (!suspensionSchemaReadyPromise) {
    suspensionSchemaReadyPromise = (async () => {
      if (!(await tableExists('driver_profiles'))) {
        return;
      }

      await db.query('ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;');
      await db.query('ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;');
      await db.query('ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS suspension_reason TEXT;');
    })().catch((error) => {
      console.warn('[driverSuspension] Schema compatibility patch warning:', error.message);
    });
  }

  return suspensionSchemaReadyPromise;
}

async function clearExpiredSuspension(driverId) {
  await ensureDriverSuspensionSchema();
  await db.update(
    'driver_profiles',
    {
      suspended_at: null,
      suspended_until: null,
      suspension_reason: null,
    },
    { id: driverId }
  ).catch(() => {});
}

async function getTodayCancellationCount(driverId) {
  if (!(await tableExists('delivery_trips'))) {
    return 0;
  }

  const result = await db.query(
    `SELECT COUNT(*)::int AS cancellation_count
       FROM delivery_trips
      WHERE driver_id = $1
        AND status = 'cancelled'
        AND cancelled_at >= date_trunc('day', NOW())`,
    [driverId]
  );

  return Number(result.rows[0]?.cancellation_count || 0);
}

async function getDriverSuspensionState(driverId) {
  await ensureDriverSuspensionSchema();

  const driver = await db.selectOne('driver_profiles', { id: driverId });
  if (!driver) {
    return {
      isSuspended: false,
      suspendedUntil: null,
      remainingMs: 0,
      suspensionReason: null,
      cancellationCount: 0,
      maxDailyCancellations: MAX_DAILY_CANCELLATIONS,
      suspensionDurationHours: SUSPENSION_DURATION_HOURS,
    };
  }

  const now = Date.now();
  const suspendedUntilValue = driver.suspended_until ? new Date(driver.suspended_until) : null;
  const isSuspended = Boolean(suspendedUntilValue && suspendedUntilValue.getTime() > now);

  if (driver.suspended_until && !isSuspended) {
    await clearExpiredSuspension(driverId);
  }

  const cancellationCount = await getTodayCancellationCount(driverId);

  return {
    isSuspended,
    suspendedUntil: isSuspended ? suspendedUntilValue.toISOString() : null,
    remainingMs: isSuspended ? Math.max(0, suspendedUntilValue.getTime() - now) : 0,
    suspensionReason: isSuspended ? (driver.suspension_reason || 'Too many cancellations today') : null,
    cancellationCount,
    maxDailyCancellations: MAX_DAILY_CANCELLATIONS,
    suspensionDurationHours: SUSPENSION_DURATION_HOURS,
  };
}

async function applyDriverSuspension(driverId, reason) {
  await ensureDriverSuspensionSchema();

  const suspendedAt = new Date();
  const suspendedUntil = new Date(suspendedAt.getTime() + SUSPENSION_DURATION_MS);
  const suspensionReason = reason || `Cancelled ${MAX_DAILY_CANCELLATIONS} orders today`;

  await db.update(
    'driver_profiles',
    {
      is_online: false,
      suspended_at: suspendedAt.toISOString(),
      suspended_until: suspendedUntil.toISOString(),
      suspension_reason: suspensionReason,
    },
    { id: driverId }
  );

  return {
    isSuspended: true,
    suspendedUntil: suspendedUntil.toISOString(),
    remainingMs: SUSPENSION_DURATION_MS,
    suspensionReason,
    cancellationCount: MAX_DAILY_CANCELLATIONS,
    maxDailyCancellations: MAX_DAILY_CANCELLATIONS,
    suspensionDurationHours: SUSPENSION_DURATION_HOURS,
  };
}

async function getDriverSuspensionSummary(driverId) {
  const state = await getDriverSuspensionState(driverId);
  return {
    is_suspended: state.isSuspended,
    suspended_until: state.suspendedUntil,
    remaining_ms: state.remainingMs,
    suspension_reason: state.suspensionReason,
    cancellation_count_today: state.cancellationCount,
    max_daily_cancellations: state.maxDailyCancellations,
    suspension_duration_hours: state.suspensionDurationHours,
  };
}

module.exports = {
  MAX_DAILY_CANCELLATIONS,
  SUSPENSION_DURATION_HOURS,
  ensureDriverSuspensionSchema,
  getDriverSuspensionState,
  getDriverSuspensionSummary,
  getTodayCancellationCount,
  applyDriverSuspension,
  clearExpiredSuspension,
};