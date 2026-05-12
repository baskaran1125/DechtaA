'use strict';

const pool = require('../config/db');

const DEFAULT_CITY_CENTER = {
  lat: 13.0827,
  lng: 80.2707,
};
const LIVE_LOCATION_WINDOW_MS = 5 * 60 * 1000;

function parseSkillList(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue.map((item) => String(item || '').trim()).filter(Boolean);
  }

  const value = String(rawValue || '').trim();
  if (!value) return [];

  if (value.startsWith('{') && value.endsWith('}')) {
    return value
      .slice(1, -1)
      .split(',')
      .map((item) => item.replace(/^"|"$/g, '').trim())
      .filter(Boolean);
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pickPrimarySkill(row) {
  const list = parseSkillList(row.skill_categories);
  if (list.length > 0) return list[0];
  return String(row.skill_category || '').trim() || 'General Work';
}

function mapCategory(skill) {
  const normalized = String(skill || '').trim().toLowerCase();

  if (normalized.includes('mason') || normalized.includes('masonry') || normalized.includes('tiles')) return 'mason';
  if (normalized.includes('clean')) return 'cleaning';
  if (normalized.includes('paint')) return 'paint';
  if (normalized.includes('plumb')) return 'plumbing';
  if (normalized.includes('ac') || normalized.includes('air condition') || normalized.includes('refriger')) return 'ac';
  if (normalized.includes('carpent')) return 'carpenter';
  if (normalized.includes('electric')) return 'electrician';
  if (normalized.includes('construct') || normalized.includes('helper') || normalized.includes('loadman')) return 'construction';
  if (normalized.includes('fabricat') || normalized.includes('weld')) return 'fabricator';
  if (normalized.includes('garden')) return 'gardening';
  if (normalized.includes('appli') || normalized.includes('repair')) return 'appliance';

  return normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'general';
}

function formatDistance(lat, lng) {
  if (lat === null || lng === null) return 'Location unavailable';
  const earthRadiusKm = 6371;
  const dLat = ((lat - DEFAULT_CITY_CENTER.lat) * Math.PI) / 180;
  const dLng = ((lng - DEFAULT_CITY_CENTER.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((DEFAULT_CITY_CENTER.lat * Math.PI) / 180) *
      Math.cos((lat * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return `${(earthRadiusKm * c).toFixed(1)} km`;
}

function mapWorker(row, index) {
  const primarySkill = pickPrimarySkill(row);
  const lat = toFiniteNumber(row.current_latitude);
  const lng = toFiniteNumber(row.current_longitude);
  const lastLocationAt = row.last_location_at ? new Date(row.last_location_at) : null;
  const hasRecentLocation = lastLocationAt instanceof Date
    && !Number.isNaN(lastLocationAt.getTime())
    && (Date.now() - lastLocationAt.getTime()) <= LIVE_LOCATION_WINDOW_MS;
  const hasLiveLocation = lat !== null && lng !== null && hasRecentLocation;

  return {
    id: Number(row.id),
    name: String(row.full_name || row.phone || `Worker #${row.id}`).trim(),
    category: mapCategory(primarySkill),
    skill: primarySkill,
    rating: Number(row.rating || 0).toFixed(1),
    distance: formatDistance(hasLiveLocation ? lat : null, hasLiveLocation ? lng : null),
    phone: row.phone || '',
    lat: hasLiveLocation ? lat : null,
    lng: hasLiveLocation ? lng : null,
    hasLiveLocation,
    lastLocationAt: lastLocationAt ? lastLocationAt.toISOString() : null,
    state: row.state || '',
    city: row.city || '',
    area: row.area || '',
    photoUrl: row.photo_url || null,
    status: row.is_online ? (hasLiveLocation ? 'Available' : 'Location Off') : 'Offline',
  };
}

// Ensure photo_url column exists (safe — runs once per server start)
let photoUrlColumnReady = false;
async function ensurePhotoUrlColumn() {
  if (photoUrlColumnReady) return;
  photoUrlColumnReady = true;
  await pool.query(
    `ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS photo_url TEXT`
  ).catch(() => {});
}

async function getApprovedWorkers(req, res, next) {
  try {
    await ensurePhotoUrlColumn();
    const { rows } = await pool.query(
      `
        SELECT
          wp.id,
          wp.full_name,
          wp.phone,
          wp.skill_category,
          wp.skill_categories,
          wp.state,
          wp.city,
          wp.area,
          wp.current_latitude,
          wp.current_longitude,
          wp.last_location_at,
          wp.is_online,
          wp.rating,
          wp.photo_url
        FROM worker_profiles wp
        JOIN users u ON u.id = wp.user_id
        WHERE COALESCE(wp.is_approved, u.is_approved, false) = true
          AND COALESCE(u.status, 'active') = 'active'
          AND COALESCE(wp.is_profile_complete, false) = true
        ORDER BY COALESCE(wp.is_online, false) DESC, wp.updated_at DESC NULLS LAST, wp.id DESC
      `
    );

    res.json({
      workers: rows.map((row, index) => mapWorker(row, index)),
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/workers/:id/hire
// Sends a job-request alarm notification to the worker's notification feed
async function hireWorker(req, res, next) {
  try {
    const workerId = Number(req.params.id);
    if (!workerId) return res.status(400).json({ success: false, message: 'Invalid worker id' });

    const {
      jobDescription = 'General work request',
      categoryLabel  = '',
      serviceName    = '',
      clientName     = 'Client',
      bookingRef     = '',
    } = req.body || {};

    // Verify the worker exists and is approved
    const { rows: wRows } = await pool.query(
      `SELECT id, full_name FROM worker_profiles WHERE id = $1 AND COALESCE(is_approved, false) = true LIMIT 1`,
      [workerId]
    );
    if (!wRows.length) return res.status(404).json({ success: false, message: 'Worker not found or not approved' });

    const workerName = wRows[0].full_name || `Worker #${workerId}`;

    // Ensure tables exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS worker_notifications (
        id BIGSERIAL PRIMARY KEY,
        worker_id BIGINT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        status VARCHAR(20) NOT NULL DEFAULT 'unread',
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        read_at TIMESTAMP
      )
    `).catch(() => {});

    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_requests (
        id BIGSERIAL PRIMARY KEY,
        booking_ref VARCHAR(50),
        worker_id BIGINT NOT NULL,
        client_name VARCHAR(255) DEFAULT 'Client',
        job_description TEXT,
        category_label VARCHAR(255),
        service_name VARCHAR(255),
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        notif_id BIGINT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        accepted_at TIMESTAMP
      )
    `).catch(() => {});

    const title   = `New Job Request${categoryLabel ? ` — ${categoryLabel}` : ''}`;
    const message = jobDescription || 'A client wants to hire you. Open the app to respond.';

    // Insert job_request row first so we have a jobId for the metadata
    const jobResult = await pool.query(
      `INSERT INTO job_requests (booking_ref, worker_id, client_name, job_description, category_label, service_name, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING id`,
      [bookingRef, workerId, clientName, jobDescription, categoryLabel, serviceName]
    );
    const jobId = jobResult.rows[0].id;

    const meta = JSON.stringify({
      clientName,
      jobDescription,
      categoryLabel,
      serviceName,
      bookingRef,
      jobId,
      hiredAt: new Date().toISOString(),
    });

    const notifResult = await pool.query(
      `INSERT INTO worker_notifications (worker_id, title, message, type, status, metadata)
       VALUES ($1, $2, $3, 'job_request', 'unread', $4::jsonb)
       RETURNING id`,
      [workerId, title, message, meta]
    );
    const notifId = notifResult.rows[0].id;

    // Link notification back to the job request
    await pool.query(
      `UPDATE job_requests SET notif_id = $1 WHERE id = $2`,
      [notifId, jobId]
    ).catch(() => {});

    res.json({ success: true, message: `Notification sent to ${workerName}`, jobId });
  } catch (error) {
    next(error);
  }
}

// GET /api/workers/jobs/:jobId
// Client polls this to check if worker accepted or declined
async function getJobStatus(req, res, next) {
  try {
    const jobId = Number(req.params.jobId);
    if (!jobId) return res.status(400).json({ message: 'Invalid job id' });

    const { rows } = await pool.query(
      `SELECT jr.id, jr.status, jr.accepted_at, jr.worker_id,
              wp.full_name AS worker_name, wp.phone AS worker_phone
       FROM job_requests jr
       JOIN worker_profiles wp ON wp.id = jr.worker_id
       WHERE jr.id = $1
       LIMIT 1`,
      [jobId]
    );

    if (!rows.length) return res.status(404).json({ message: 'Job not found' });

    const row = rows[0];
    res.json({
      jobId:       Number(row.id),
      status:      row.status,
      workerName:  row.worker_name  || `Worker #${row.worker_id}`,
      workerPhone: row.worker_phone || '',
      workerId:    Number(row.worker_id),
      acceptedAt:  row.accepted_at ? new Date(row.accepted_at).toISOString() : null,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getApprovedWorkers,
  hireWorker,
  getJobStatus,
};
