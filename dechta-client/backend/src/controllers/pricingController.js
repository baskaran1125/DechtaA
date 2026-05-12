'use strict';

const pool         = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { ok, err }  = require('../utils/response');
const { getDistanceKm } = require('../utils/distanceCalc');

// ─────────────────────────────────────────────────────────────
// GET /api/pricing/delivery
// Query params: vehicle_type, origin_lat, origin_lng, dest_lat, dest_lng
// Returns: { delivery_charge, distance_km, vehicle_type, base_fare, rate_per_km, extra_km }
// ─────────────────────────────────────────────────────────────
const getDeliveryCharge = asyncHandler(async (req, res) => {
  const { vehicle_type, origin_lat, origin_lng, dest_lat, dest_lng } = req.query;

  // ── Validate inputs ──────────────────────────────────────────
  if (!vehicle_type) return err(res, 'vehicle_type is required', 400);
  if (!origin_lat || !origin_lng || !dest_lat || !dest_lng) {
    return err(res, 'origin_lat, origin_lng, dest_lat, dest_lng are all required', 400);
  }

  const oLat = parseFloat(origin_lat);
  const oLng = parseFloat(origin_lng);
  const dLat = parseFloat(dest_lat);
  const dLng = parseFloat(dest_lng);

  if ([oLat, oLng, dLat, dLng].some(isNaN)) {
    return err(res, 'Coordinates must be valid numbers', 400);
  }

  // ── Fetch pricing from DB ────────────────────────────────────
  const { rows } = await pool.query(
    `SELECT base_fare, rate_per_km, min_km, display_name
     FROM vehicle_pricing
     WHERE vehicle_type = $1 AND is_active = true
     LIMIT 1`,
    [vehicle_type.toLowerCase()]
  );

  if (!rows.length) return err(res, `No pricing found for vehicle type: ${vehicle_type}`, 404);

  const { base_fare, rate_per_km, min_km, display_name } = rows[0];

  // ── Compute distance ─────────────────────────────────────────
  const distance_km = await getDistanceKm(oLat, oLng, dLat, dLng);
  const extra_km    = Math.max(0, distance_km - Number(min_km));

  // ── Apply formula: base_fare + (rate_per_km × extra_km) ───
  const delivery_charge = parseFloat(
    (Number(base_fare) + Number(rate_per_km) * extra_km).toFixed(2)
  );

  return ok(res, {
    vehicle_type,
    display_name,
    distance_km,
    base_fare:      Number(base_fare),
    rate_per_km:    Number(rate_per_km),
    min_km:         Number(min_km),
    extra_km,
    delivery_charge,
  });
});

// ─────────────────────────────────────────────────────────────
// GET /api/pricing/vehicles
// Returns all active vehicle types and their base pricing
// (used by CheckoutModal to render the vehicle selector)
// ─────────────────────────────────────────────────────────────
const getVehiclePricing = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT vehicle_type, display_name, base_fare, rate_per_km, min_km
     FROM vehicle_pricing
     WHERE is_active = true
     ORDER BY base_fare ASC`
  );
  return ok(res, rows);
});

function toServiceKey(value) {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized.includes('mason') || normalized.includes('masonry') || normalized.includes('tiles')) return 'mason';
  if (normalized.includes('clean')) return 'cleaning';
  if (normalized.includes('paint')) return 'paint';
  if (normalized.includes('plumb')) return 'plumbing';
  if (normalized.includes('ac') || normalized.includes('air condition') || normalized.includes('refriger')) return 'ac';
  if (normalized.includes('carpent')) return 'carpenter';
  if (normalized.includes('electric')) return 'electrician';
  if (normalized.includes('construct') || normalized.includes('loadman') || normalized.includes('helper')) return 'construction';
  if (normalized.includes('fabricat') || normalized.includes('weld')) return 'fabricator';
  if (normalized.includes('garden')) return 'gardening';
  if (normalized.includes('appli') || normalized.includes('repair')) return 'appliance';

  return normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'general';
}

// ─────────────────────────────────────────────────────────────
// GET /api/pricing/manpower-services
// Returns active admin-configured manpower services from manpower_pricing table
// ─────────────────────────────────────────────────────────────
const getManpowerServices = asyncHandler(async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         id,
         service_category,
         service_name,
         service_code,
         description,
         base_price,
         rate_per_hour,
         min_hours,
         estimated_duration
       FROM manpower_pricing
       WHERE is_active = true
       ORDER BY service_category ASC, service_name ASC`
    );
    const services = result.rows.map((row) => {
      const category = String(row.service_category || row.service_name || 'General').trim();
      const serviceName = String(row.service_name || category).trim();
      const categoryKey = toServiceKey(`${category} ${serviceName}`);

      return {
        id: row.id,
        category,
        categoryKey,
        serviceName,
        serviceCode: row.service_code,
        description: row.description || '',
        basePrice: Number(row.base_price || 0),
        ratePerHour: Number(row.rate_per_hour || 0),
        minHours: Number(row.min_hours || 1),
        estimatedDuration: row.estimated_duration || '',
      };
    });

    return ok(res, { services });
  } catch (e) {
    // Table may not exist yet
    if (String(e.message).includes('does not exist')) {
      return ok(res, { services: [] });
    }
    throw e;
  }
});

module.exports = { getDeliveryCharge, getVehiclePricing, getManpowerServices };
