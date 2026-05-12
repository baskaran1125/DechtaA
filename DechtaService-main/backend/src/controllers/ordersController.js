// src/controllers/ordersController.js
const db = require('../config/database');
const { uploadFile } = require('../services/uploadService');
const { notifyOrderUpdate } = require('../services/socketService');
const { calculateDeliveryCharge, toFiniteNumber } = require('../services/pricingService');
const {
  MAX_DAILY_CANCELLATIONS,
  SUSPENSION_DURATION_HOURS,
  ensureDriverSuspensionSchema,
  getDriverSuspensionState,
} = require('../services/driverSuspension');

const tableColumnsCache = new Map();

function normalizeOrderStatus(status) {
  const key = String(status || '').trim().toLowerCase();
  if (!key) return 'pending';

  if (['pending', 'placed'].includes(key)) return 'pending';
  if (['confirmed', 'processing', 'packed'].includes(key)) return 'confirmed';
  if (['assigned', 'accepted'].includes(key)) return 'assigned';
  if (['picked_up', 'arrived_pickup', 'out for delivery', 'arrived_dropoff', 'shipped', 'dispatched'].includes(key)) return 'in_transit';
  if (['delivered', 'completed'].includes(key)) return 'delivered';
  if (['cancelled', 'canceled', 'missed', 'returned'].includes(key)) return 'cancelled';
  return key;
}

async function tableExists(tableName) {
  const result = await db.query('SELECT to_regclass($1) AS table_name', [`public.${tableName}`]);
  return !!result.rows[0]?.table_name;
}

async function getTableColumns(tableName) {
  if (tableColumnsCache.has(tableName)) {
    return tableColumnsCache.get(tableName);
  }

  const result = await db.query(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1`,
    [tableName]
  );

  const columns = new Set((result.rows || []).map((row) => row.column_name));
  tableColumnsCache.set(tableName, columns);
  return columns;
}

function removeUndefinedFields(data) {
  return Object.fromEntries(
    Object.entries(data || {}).filter(([, value]) => value !== undefined)
  );
}

async function filterDataForTable(tableName, data) {
  const cleaned = removeUndefinedFields(data);
  const columns = await getTableColumns(tableName);
  if (!columns || columns.size === 0) return cleaned;
  return Object.fromEntries(
    Object.entries(cleaned).filter(([key]) => columns.has(key))
  );
}

function toNumberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-]+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function canonicalVehicleClass(value) {
  const token = normalizeToken(value);
  if (!token) return '';
  if (token.includes('2w') || token.includes('2wheel') || token.includes('bike') || token.includes('motorcycle')) return '2w';
  if (token.includes('3w') || token.includes('3wheel') || token.includes('auto') || token.includes('autorickshaw')) return '3w';
  if (token.includes('4w') || token.includes('4wheel') || token.includes('truck') || token.includes('van')) return '4w';
  return token;
}

function normalizeModelId(value) {
  const token = normalizeToken(value);
  if (!token) return '';

  const aliases = {
    '3wstandard': '3w500kg',
    '4w14ton': '4w1200kg',
    '4w17ton': '4w1700kg',
    '4w25ton': '4w2500kg',
  };

  return aliases[token] || token;
}

const VEHICLE_MODEL_SPECS = {
  '2w_standard': { weight: 20, dimensions: '3 ft', bodyType: 'Open' },
  '3w_500kg': { weight: 500, dimensions: '5.5 ft', bodyType: 'Open' },
  '4w_750kg': { weight: 750, dimensions: '6 ft', bodyType: 'Closed' },
  '4w_1200kg': { weight: 1200, dimensions: '7 ft', bodyType: 'Closed' },
  '4w_1700kg': { weight: 1700, dimensions: '8 ft', bodyType: 'Closed' },
  '4w_2500kg': { weight: 2500, dimensions: '10 ft', bodyType: 'Closed' },
};

const MODEL_TOKEN_TO_CANONICAL = Object.fromEntries(
  Object.keys(VEHICLE_MODEL_SPECS).map((key) => [normalizeToken(key), key])
);

const MODEL_ALIASES = {
  '3wstandard': '3w_500kg',
  '4w14ton': '4w_1200kg',
  '4w17ton': '4w_1700kg',
  '4w25ton': '4w_2500kg',
};

function parseJsonObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function normalizeModelIdForStorage(modelId, vehicleType) {
  const token = normalizeToken(modelId);
  if (token) {
    if (MODEL_ALIASES[token]) return MODEL_ALIASES[token];
    if (MODEL_TOKEN_TO_CANONICAL[token]) return MODEL_TOKEN_TO_CANONICAL[token];
  }

  const klass = canonicalVehicleClass(vehicleType);
  if (klass === '2w') return '2w_standard';
  if (klass === '3w') return '3w_500kg';
  if (klass === '4w') return '4w_750kg';
  return null;
}

function normalizePhysicalDimension(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return null;
  const compact = raw.replace(/\s+/g, ' ');
  const hasNumber = /\d/.test(compact);
  const hasUnit = /(ft|feet|foot|cm|mm|m|inch|in)\b/.test(compact);
  if (!hasNumber || !hasUnit) return null;

  const normalized = compact
    .replace(/feet|foot/g, 'ft')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized;
}

function normalizeBodyTypeForStorage(value, fallback) {
  const token = String(value || '').trim().toLowerCase();
  if (token === 'open' || token === 'closed') return token[0].toUpperCase() + token.slice(1);
  return fallback || null;
}

function isLikelyModelIdToken(token) {
  if (!token) return false;
  return token.startsWith('2w') || token.startsWith('3w') || token.startsWith('4w');
}

function deriveWeightFromModelToken(modelToken) {
  const token = normalizeModelId(modelToken);
  if (!token) return null;
  const match = token.match(/(\d{3,4})kg$/);
  if (!match) return null;
  return toNumberOrNull(match[1]);
}

function deriveModelIdFromVehicleClassAndWeight(vehicleClass, weightCapacity) {
  if (vehicleClass !== '4w') return '';
  const weight = toNumberOrNull(weightCapacity);
  if (weight == null) return '';

  const rounded = Math.round(weight);
  const buckets = [750, 1200, 1700, 2500];
  const exact = buckets.find((x) => x === rounded);
  if (exact) return `4w${exact}kg`;

  const nearest = buckets.reduce((best, current) => (
    Math.abs(current - rounded) < Math.abs(best - rounded) ? current : best
  ), buckets[0]);
  return `4w${nearest}kg`;
}

function normalizeDimension(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  return raw
    .replace(/feet|foot/g, 'ft')
    .replace(/\s+/g, '')
    .replace(/\.$/, '');
}

function isStrictBodyType(value) {
  const token = normalizeToken(value);
  return token === 'open' || token === 'closed';
}

function buildDriverVehicleMatcher(vehicle) {
  const vehicleClass = canonicalVehicleClass(vehicle?.vehicle_type);
  const explicitWeight = toNumberOrNull(vehicle?.weight_capacity ?? vehicle?.weight_capacity_kg);

  const explicitModelCandidates = [
    normalizeModelId(vehicle?.model_id),
    normalizeModelId(vehicle?.selected_model_id),
    normalizeModelId(vehicle?.specific_model_id),
    normalizeModelId(vehicle?.vehicle_option_id),
    normalizeModelId(vehicle?.option_id),
  ].filter((token) => isLikelyModelIdToken(token));

  const derivedWeightFromModels = explicitModelCandidates
    .map((candidate) => deriveWeightFromModelToken(candidate))
    .find((value) => value != null);

  const weightCapacity = explicitWeight ?? derivedWeightFromModels ?? null;
  const derivedModel = deriveModelIdFromVehicleClassAndWeight(vehicleClass, weightCapacity);
  const modelCandidates = new Set(explicitModelCandidates);
  if (derivedModel) modelCandidates.add(derivedModel);

  return {
    vehicleClass,
    weightCapacity,
    bodyType: String(vehicle?.body_type || '').trim().toLowerCase(),
    dimensions: normalizeDimension(
      vehicle?.dimensions ||
      vehicle?.cargo_dimensions ||
      vehicle?.load_dimensions ||
      ''
    ),
    modelCandidates,
  };
}

function matchesOrderWithDriverVehicle(order, matcher) {
  const orderVehicleClass = canonicalVehicleClass(order?.vehicle_type);
  if (!orderVehicleClass || !matcher?.vehicleClass || orderVehicleClass !== matcher.vehicleClass) {
    return false;
  }

  const orderWeight = toNumberOrNull(order?.weight_capacity_requested);
  if (orderWeight != null && matcher.weightCapacity != null && matcher.weightCapacity < orderWeight) {
    return false;
  }

  const orderModel = normalizeModelId(order?.model_id_requested);
  if (orderModel && matcher.modelCandidates.size > 0 && !matcher.modelCandidates.has(orderModel)) {
    return false;
  }

  const orderDimensions = normalizeDimension(order?.dimensions_requested);
  if (orderDimensions && matcher.dimensions && orderDimensions !== matcher.dimensions) {
    return false;
  }

  const orderBodyType = String(order?.body_type_requested || '').trim().toLowerCase();
  if (isStrictBodyType(orderBodyType)) {
    if (!isStrictBodyType(matcher.bodyType)) return false;
    if (orderBodyType !== matcher.bodyType) return false;
  }

  return true;
}

function isSchemaDriftError(error) {
  const msg = String(error?.message || '').toLowerCase();
  return msg.includes('relation') && msg.includes('does not exist')
    || msg.includes('column') && msg.includes('does not exist');
}

async function getDriverVehicleProfile(driverId) {
  const hasLegacy = await tableExists('driver_vehicles');
  const hasUnified = await tableExists('vehicles');

  const legacyVehicle = hasLegacy ? await db.selectOne('driver_vehicles', { driver_id: driverId }) : null;
  const unifiedVehicle = hasUnified ? await db.selectOne('vehicles', { driver_id: driverId }) : null;

  if (!legacyVehicle && !unifiedVehicle) return null;

  const pick = (...values) => {
    for (const value of values) {
      if (value === undefined || value === null) continue;
      const text = String(value).trim();
      if (text) return value;
    }
    return null;
  };

  return {
    vehicle_type: pick(unifiedVehicle?.vehicle_type, legacyVehicle?.vehicle_type),
    model_id: pick(
      unifiedVehicle?.model_id,
      unifiedVehicle?.selected_model_id,
      unifiedVehicle?.specific_model_id,
      unifiedVehicle?.option_id,
      unifiedVehicle?.vehicle_option_id,
      legacyVehicle?.model_id,
      legacyVehicle?.selected_model_id,
      legacyVehicle?.specific_model_id,
      legacyVehicle?.option_id,
      legacyVehicle?.vehicle_option_id
    ),
    weight_capacity: pick(
      unifiedVehicle?.weight_capacity,
      unifiedVehicle?.weight_capacity_kg,
      legacyVehicle?.weight_capacity,
      legacyVehicle?.weight_capacity_kg
    ),
    dimensions: pick(
      unifiedVehicle?.dimensions,
      unifiedVehicle?.cargo_dimensions,
      unifiedVehicle?.load_dimensions,
      legacyVehicle?.dimensions,
      legacyVehicle?.cargo_dimensions,
      legacyVehicle?.load_dimensions
    ),
    body_type: pick(unifiedVehicle?.body_type, legacyVehicle?.body_type),
    vehicle_number: pick(unifiedVehicle?.vehicle_number, legacyVehicle?.vehicle_number, unifiedVehicle?.registration_number, legacyVehicle?.registration_number),
    registration_number: pick(unifiedVehicle?.registration_number, legacyVehicle?.registration_number, unifiedVehicle?.vehicle_number, legacyVehicle?.vehicle_number),
  };
}

// ──────────────────────────────────────────────────────────────
// GET /api/orders/available
// ──────────────────────────────────────────────────────────────
async function getAvailableOrders(request, reply) {
  const driverId = request.driver.id;

  try {
    if (!request.driver.is_online) {
      return reply.send({ success: true, data: [], isOnline: false });
    }

    if (!(await tableExists('orders'))) {
      return reply.send({ success: true, data: [], isOnline: true });
    }

    const vehicle = await getDriverVehicleProfile(driverId);
    if (!vehicle) {
      return reply.send({ success: true, data: [], isOnline: true });
    }

    const vehicleMatcher = buildDriverVehicleMatcher(vehicle);

    // Validation: driver must have at least vehicle class + capacity for matching.
    if (!vehicleMatcher.vehicleClass) {
      request.log.warn({ driverId, rawVehicleType: vehicle.vehicle_type }, 'Driver has no valid vehicle_type registered. Cannot fetch orders.');
      return reply.send({ success: true, data: [], isOnline: true });
    }

    const orderColumns = await getTableColumns('orders');
    const hasVendorStatusColumn = orderColumns.has('v_status');

    if (!hasVendorStatusColumn) {
      request.log.warn({ driverId }, 'orders.v_status column missing. Cannot apply vendor-accept visibility rule.');
      return reply.send({ success: true, data: [], isOnline: true });
    }

    const result = await db.query(
      `SELECT o.*
       FROM orders o
       WHERE LOWER(COALESCE(o.status::text, '')) = 'pending'
         AND o.driver_id IS NULL
         AND LOWER(COALESCE(o.v_status::text, 'pending')) = 'accepted'
       ORDER BY o.created_at DESC
       LIMIT 100`
    );

    const mapped = (result.rows || [])
      .filter((o) => matchesOrderWithDriverVehicle(o, vehicleMatcher))
      .slice(0, 20)
      .map((o) => ({
        ...o,
        normalized_status: normalizeOrderStatus(o.status),
      }));

    const totalCandidates = (result.rows || []).length;

    // Log matching details for debugging
    request.log.debug({
      driverId,
      driverVehicleClass: vehicleMatcher.vehicleClass,
      driverModelCandidates: Array.from(vehicleMatcher.modelCandidates),
      driverBodyType: vehicleMatcher.bodyType,
      driverDimensions: vehicleMatcher.dimensions,
      driverWeightCapacity: vehicleMatcher.weightCapacity,
      totalCandidates,
      matchedOrdersCount: mapped.length,
    }, 'Orders fetched and matched');

    return reply.send({ success: true, data: mapped, isOnline: true });
  } catch (error) {
    request.log.error(error);
    if (isSchemaDriftError(error)) {
      return reply.send({ success: true, data: [], isOnline: !!request.driver.is_online });
    }
    return reply.code(500).send({ success: false, message: 'Failed to fetch orders' });
  }
}

// ──────────────────────────────────────────────────────────────
// GET /api/orders/debug/vehicle-match
// Diagnostic endpoint to debug why orders aren't matching driver vehicle
// ──────────────────────────────────────────────────────────────
async function debugVehicleMatch(request, reply) {
  const driverId = request.driver.id;

  try {
    // Get driver's vehicle profile
    const vehicle = await getDriverVehicleProfile(driverId);
    if (!vehicle) {
      return reply.send({
        success: true,
        debug: {
          driverId,
          vehicleProfile: null,
          message: 'No vehicle profile found for driver'
        }
      });
    }

    const vehicleMatcher = buildDriverVehicleMatcher(vehicle);

    // Get sample orders
    const result = await db.query(
      `SELECT id, vehicle_type, model_id_requested, weight_capacity_requested, 
              body_type_requested, dimensions_requested, status, v_status
       FROM orders
       WHERE LOWER(COALESCE(status::text, '')) = 'pending'
         AND driver_id IS NULL
         AND LOWER(COALESCE(v_status::text, 'pending')) = 'accepted'
       LIMIT 10`
    );

    const orders = result.rows || [];
    const matchDetails = orders.map(order => ({
      orderId: order.id,
      orderVehicleType: order.vehicle_type,
      orderVehicleClass: canonicalVehicleClass(order.vehicle_type),
      orderModelId: order.model_id_requested,
      orderWeight: order.weight_capacity_requested,
      orderBodyType: order.body_type_requested,
      orderDimensions: order.dimensions_requested,
      matched: matchesOrderWithDriverVehicle(order, vehicleMatcher),
      failureReasons: getMatchFailureReasons(order, vehicleMatcher)
    }));

    return reply.send({
      success: true,
      debug: {
        driverId,
        driverVehicle: vehicle,
        vehicleMatcher: {
          vehicleClass: vehicleMatcher.vehicleClass,
          modelCandidates: Array.from(vehicleMatcher.modelCandidates),
          weightCapacity: vehicleMatcher.weightCapacity,
          bodyType: vehicleMatcher.bodyType,
          dimensions: vehicleMatcher.dimensions,
        },
        totalOrdersChecked: orders.length,
        matchedCount: matchDetails.filter(m => m.matched).length,
        orderMatchDetails: matchDetails
      }
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      success: false,
      message: 'Failed to debug vehicle match',
      error: error.message
    });
  }
}

// Helper function to get detailed failure reasons
function getMatchFailureReasons(order, matcher) {
  const reasons = [];
  
  const orderVehicleClass = canonicalVehicleClass(order?.vehicle_type);
  if (!orderVehicleClass || !matcher?.vehicleClass) {
    reasons.push('Vehicle class missing');
  } else if (orderVehicleClass !== matcher.vehicleClass) {
    reasons.push(`Vehicle class mismatch: order needs ${orderVehicleClass}, driver has ${matcher.vehicleClass}`);
  }

  const orderWeight = toNumberOrNull(order?.weight_capacity_requested);
  if (orderWeight != null && matcher.weightCapacity != null && matcher.weightCapacity < orderWeight) {
    reasons.push(`Weight capacity insufficient: order needs ${orderWeight}kg, driver has ${matcher.weightCapacity}kg`);
  }

  const orderModel = normalizeModelId(order?.model_id_requested);
  if (orderModel && matcher.modelCandidates.size > 0 && !matcher.modelCandidates.has(orderModel)) {
    reasons.push(`Model mismatch: order needs ${orderModel}, driver models: ${Array.from(matcher.modelCandidates).join(', ')}`);
  }

  const orderDimensions = normalizeDimension(order?.dimensions_requested);
  if (orderDimensions && matcher.dimensions && orderDimensions !== matcher.dimensions) {
    reasons.push(`Dimensions mismatch: order needs ${orderDimensions}, driver has ${matcher.dimensions}`);
  }

  const orderBodyType = String(order?.body_type_requested || '').trim().toLowerCase();
  if (isStrictBodyType(orderBodyType)) {
    if (!isStrictBodyType(matcher.bodyType)) {
      reasons.push(`Body type strict but driver has none`);
    } else if (orderBodyType !== matcher.bodyType) {
      reasons.push(`Body type mismatch: order needs ${orderBodyType}, driver has ${matcher.bodyType}`);
    }
  }

  return reasons.length === 0 ? ['All checks passed - should match'] : reasons;
}

// ──────────────────────────────────────────────────────────────
// GET /api/orders/active
// FIX: alias all order columns explicitly so client receives a
//      flat row with no ambiguous column names.
// ──────────────────────────────────────────────────────────────
async function getActiveTrip(request, reply) {
  const driverId = request.driver.id;

  try {
    if (!(await tableExists('delivery_trips'))) {
      return reply.send({ success: true, data: null });
    }

    const result = await db.query(
      `SELECT
        dt.*,
        o.id              AS order_id,
        o.product_name,
        o.customer_name   AS client_name,
        o.customer_phone  AS client_phone,
        o.pickup_address,
        o.delivery_address,
        o.pickup_latitude,
        o.pickup_longitude,
        o.delivery_latitude,
        o.delivery_longitude,
        o.vendor_shop_name,
        o.delivery_fee,
        o.total_amount    AS final_total,
        o.delivery_otp,
        o.items,
        o.vehicle_type
       FROM delivery_trips dt
       LEFT JOIN orders o ON dt.order_id = o.id
       WHERE dt.driver_id = $1
         AND LOWER(COALESCE(dt.status::text, '')) NOT IN ('delivered', 'cancelled', 'missed')
       ORDER BY dt.started_at DESC
       LIMIT 1`,
      [driverId]
    );

    const row = result.rows[0] || null;
    const mapped = row
      ? {
          ...row,
          normalized_status: normalizeOrderStatus(row.status),
          normalized_order_status: normalizeOrderStatus(row.order_status || row.status),
        }
      : null;

    return reply.send({ success: true, data: mapped });
  } catch (error) {
    request.log.error(error);
    if (isSchemaDriftError(error)) {
      return reply.send({ success: true, data: null });
    }
    return reply.code(500).send({ success: false, message: 'Failed to fetch active trip' });
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/orders/:orderId/accept
// FIX: atomic UPDATE prevents two drivers accepting the same order
// ──────────────────────────────────────────────────────────────
async function acceptOrder(request, reply) {
  const driverId = request.driver.id;
  const orderId  = parseInt(request.params.orderId, 10);

  if (isNaN(orderId) || orderId <= 0) {
    return reply.code(400).send({ success: false, message: 'Invalid order ID' });
  }

  // Check driver doesn't already have an active trip
  const activeTripCheck = await db.query(
    `SELECT id FROM delivery_trips
     WHERE driver_id = $1
       AND LOWER(COALESCE(status::text, '')) NOT IN ('delivered', 'cancelled', 'missed')
     LIMIT 1`,
    [driverId]
  );

  if (activeTripCheck.rows.length > 0) {
    return reply.code(409).send({
      success: false,
      message: 'You already have an active trip. Complete it before accepting another.',
    });
  }

  // Check if order already has an active trip with another driver
  const existingTrip = await db.query(
    `SELECT dt.id, dt.driver_id, dt.status 
     FROM delivery_trips dt
     WHERE dt.order_id = $1
       AND LOWER(COALESCE(dt.status::text, '')) NOT IN ('delivered', 'cancelled', 'missed')
     LIMIT 1`,
    [orderId]
  );

  if (existingTrip.rows.length > 0) {
    return reply.code(409).send({
      success: false,
      message: 'This order is already being handled by another driver.',
    });
  }

  const client = await db.beginTransaction();
  try {
    const orderColumns = await getTableColumns('orders');
    const profile = await db.selectOne('driver_profiles', { id: driverId });
    const vehicle = await getDriverVehicleProfile(driverId);

    const resolvedDriverName =
      String(
        profile?.full_name ||
        profile?.name ||
        request.driver?.full_name ||
        request.driver?.name ||
        ''
      ).trim();
    const resolvedDriverPhone =
      String(
        profile?.mobile_number ||
        profile?.phone_number ||
        request.driver?.mobile_number ||
        request.driver?.phone_number ||
        request.driver?.phone ||
        ''
      ).trim();

    // Generate OTP inline (don't use db.update which uses pool, not transaction)
    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

    const setClauses = [
      'driver_id     = $1',
      'driver_name   = $2',
      'driver_number = $3',
      "status        = 'accepted'",
      'delivery_otp  = $4',
    ];
    const values = [
      driverId,
      resolvedDriverName,
      resolvedDriverPhone,
      deliveryOtp,
    ];

    const optionalDriverFields = [
      ['driver_vehicle_type', vehicle?.vehicle_type],
      ['driver_model_id', vehicle?.model_id],
      ['driver_vehicle_model_id', vehicle?.model_id],
      ['driver_weight_capacity', vehicle?.weight_capacity],
      ['driver_vehicle_weight_capacity', vehicle?.weight_capacity],
      ['driver_dimensions', vehicle?.dimensions],
      ['driver_vehicle_dimensions', vehicle?.dimensions],
      ['driver_body_type', vehicle?.body_type],
      ['driver_vehicle_body_type', vehicle?.body_type],
      ['driver_vehicle_number', vehicle?.vehicle_number || vehicle?.registration_number || null],
      ['driver_registration_number', vehicle?.registration_number || vehicle?.vehicle_number || null],
    ];

    optionalDriverFields.forEach(([columnName, columnValue]) => {
      if (!orderColumns.has(columnName)) return;
      if (columnValue === undefined || columnValue === null || String(columnValue).trim() === '') return;
      values.push(columnValue);
      setClauses.push(`${columnName} = $${values.length}`);
    });

    const orderIdPlaceholder = values.length + 1;

    // ATOMIC: only succeeds if order is still Pending with no driver assigned
    const claimed = await client.query(
      `UPDATE orders
       SET ${setClauses.join(',\n           ')}
       WHERE id = $${orderIdPlaceholder}
         AND LOWER(COALESCE(status::text, '')) = 'pending'
         AND driver_id IS NULL
       RETURNING *`,
      [...values, orderId]
    );

    if (claimed.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return reply.code(409).send({ success: false, message: 'Order no longer available. It may have been taken.' });
    }

    const order = claimed.rows[0];

    const trip = await client.query(
      `INSERT INTO delivery_trips (order_id, driver_id, status, payout_amount, started_at)
       VALUES ($1, $2, 'accepted', $3, NOW())
       RETURNING *`,
      [orderId, driverId, order.delivery_fee || order.total_amount || 0]
    );

    await client.query('COMMIT');
    client.release();

    notifyOrderUpdate(driverId, trip.rows[0].id, 'accepted', { orderId });

    return reply.send({
      success: true,
      message: 'Order accepted successfully',
      trip: {
        ...trip.rows[0],
        normalized_status: normalizeOrderStatus(trip.rows[0]?.status),
        order: {
          ...order,
          normalized_status: normalizeOrderStatus(order.status),
        }
      },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Failed to accept order' });
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/orders/:orderId/ignore
// ──────────────────────────────────────────────────────────────
async function ignoreOrder(request, reply) {
  const driverId = request.driver.id;
  const { orderId } = request.params;

  try {
    await db.insert('driver_order_ignores', {
      driver_id:  driverId,
      order_id:   parseInt(orderId, 10) || null,
      ignored_at: new Date().toISOString(),
    });
  } catch (_) {
    // Non-fatal — ignore insert errors silently
  }

  return reply.send({ success: true, message: 'Order ignored', orderId });
}

// ──────────────────────────────────────────────────────────────
// POST /api/orders/trips/:tripId/arrived-pickup
// ──────────────────────────────────────────────────────────────
async function arrivedAtPickup(request, reply) {
  const driverId = request.driver.id;
  const { tripId } = request.params;

  try {
    const trip = await db.selectOne('delivery_trips', { id: tripId, driver_id: driverId });

    if (!trip) {
      return reply.code(404).send({ success: false, message: 'Trip not found' });
    }

    if (trip.status !== 'accepted') {
      return reply.code(400).send({
        success: false,
        message: `Cannot mark arrival. Current status: ${trip.status}`,
      });
    }

    await db.update(
      'delivery_trips',
      { status: 'arrived_pickup', arrived_pickup_at: new Date().toISOString() },
      { id: tripId, driver_id: driverId }
    );

    notifyOrderUpdate(driverId, tripId, 'arrived_pickup');

    return reply.send({
      success: true,
      message: 'Arrived at pickup. Please take a package photo to confirm.',
      requiresPhoto: true,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ success: false, message: 'Failed to update trip status' });
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/orders/trips/:tripId/confirm-pickup
// ──────────────────────────────────────────────────────────────
async function confirmPickup(request, reply) {
  const driverId = request.driver.id;
  const { tripId } = request.params;

  try {
    let photoPath = null;
    try {
      const data = await request.file();
      if (data) {
        const buffer = await data.toBuffer();
        const result = await uploadFile({
          bucket:   process.env.STORAGE_BUCKET_PACKAGE_PHOTOS || 'package-photos',
          folder:   `${tripId}/pickup`,
          filename: data.filename,
          buffer,
          mimetype: data.mimetype,
        });
        photoPath = result.path;
        await db.insert('driver_package_photos', {
          trip_id:    tripId,
          driver_id:  driverId,
          photo_url:  photoPath,
          photo_type: 'pickup',
        });
      }
    } catch (_) {
      // Photo is optional — web clients may not send one
    }

    await db.update(
      'delivery_trips',
      {
        status:      'picked_up',
        departed_pickup_at: new Date().toISOString(),
      },
      { id: tripId, driver_id: driverId }
    );

    const trip = await db.selectOne('delivery_trips', { id: tripId });
    if (trip?.order_id) {
      await db.update('orders', { status: 'shipped' }, { id: trip.order_id });
    }

    notifyOrderUpdate(driverId, tripId, 'picked_up');
    return reply.send({ success: true, message: 'Pickup confirmed. Navigate to delivery location.' });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Failed to confirm pickup' });
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/orders/trips/:tripId/arrived-dropoff
// ──────────────────────────────────────────────────────────────
async function arrivedAtDropoff(request, reply) {
  const driverId = request.driver.id;
  const { tripId } = request.params;

  try {
    const result = await db.query(
      `SELECT dt.*, o.customer_phone, o.delivery_otp as order_delivery_otp
       FROM delivery_trips dt
       LEFT JOIN orders o ON dt.order_id = o.id
       WHERE dt.id = $1 AND dt.driver_id = $2`,
      [tripId, driverId]
    );

    const trip = result.rows[0];
    if (!trip) {
      return reply.code(404).send({ success: false, message: 'Trip not found' });
    }

    await db.update(
      'delivery_trips',
      { status: 'arrived_dropoff', arrived_dropoff_at: new Date().toISOString() },
      { id: tripId, driver_id: driverId }
    );

    return reply.send({
      success: true,
      message: 'OTP sent to customer. Ask customer for the 4-digit PIN.',
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ success: false, message: 'Failed to update dropoff status' });
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/orders/trips/:tripId/complete
// FIX: allow 'arrived_pickup' status in addition to 'picked_up'
//      and 'arrived_dropoff' — driver may complete from any
//      post-pickup step.
// ──────────────────────────────────────────────────────────────
async function completeDelivery(request, reply) {
  const driverId = request.driver.id;
  const { tripId } = request.params;
  const { otp } = request.body;

  request.log.info(`🔄 completeDelivery START - Trip: ${tripId}, Driver: ${driverId}`);

  if (!otp || otp.length !== 4) {
    return reply.code(400).send({ success: false, message: '4-digit OTP required' });
  }

  try {
    const tripResult = await db.query(
      `SELECT dt.*, o.id as order_id, o.delivery_otp as order_delivery_otp, o.delivery_fee, o.customer_name
       FROM delivery_trips dt
       LEFT JOIN orders o ON dt.order_id = o.id
       WHERE dt.id = $1 AND dt.driver_id = $2`,
      [tripId, driverId]
    );

    const trip = tripResult.rows[0];
    if (!trip) {
      return reply.code(404).send({ success: false, message: 'Trip not found' });
    }

    // FIX: 'arrived_pickup' added — driver could skip to OTP step from there
    if (!['picked_up', 'arrived_pickup', 'arrived_dropoff'].includes(trip.status)) {
      return reply.code(400).send({
        success: false,
        message: `Cannot complete trip. Current status: ${trip.status}`,
      });
    }

    // Check OTP from delivery_trips table first, fallback to orders table
    const storedOtp = trip.delivery_otp || trip.order_delivery_otp;
    if (!storedOtp || String(storedOtp).trim() !== String(otp).trim()) {
      return reply.code(400).send({ success: false, message: 'Incorrect OTP. Please try again.' });
    }

    // Single update — DB trigger handles everything else
    await db.update(
      'delivery_trips',
      {
        status:       'delivered',
        completed_at: new Date().toISOString(),
        otp_verified: true,
      },
      { id: tripId }
    );

    // ✅ CRITICAL: Update orders table so vendor sees order as 'delivered'
    try {
      const updateResult = await db.update(
        'orders',
        {
          status: 'delivered',
        },
        { id: trip.order_id }
      );
      request.log.info(`✅ Order #${trip.order_id} status updated to "delivered"`);
    } catch (orderErr) {
      request.log.warn({ err: orderErr }, `❌ Order #${trip.order_id} status update failed (non-critical)`);
    }

    const payoutAmount = trip.payout_amount || trip.delivery_fee || 0;

    if ((await tableExists('driver_wallets')) && (await tableExists('driver_transactions'))) {
      try {
        // Check if wallet exists
        const existingWallet = await db.query(
          `SELECT id, balance FROM driver_wallets WHERE driver_id = $1 LIMIT 1`,
          [driverId]
        );

        let walletId;
        if (existingWallet.rows.length > 0) {
          // Update existing wallet
          const walletId_val = existingWallet.rows[0].id;
          await db.query(
            `UPDATE driver_wallets 
             SET balance = balance + $1,
                 total_earned = total_earned + $1,
                 today_earnings = today_earnings + $1,
                 total_trips = total_trips + 1,
                 last_updated = NOW()
             WHERE id = $2`,
            [payoutAmount, walletId_val]
          );
          walletId = walletId_val;
        } else {
          // Create new wallet
          const newWallet = await db.query(
            `INSERT INTO driver_wallets (driver_id, balance, total_earned, today_earnings, total_trips, last_updated)
             VALUES ($1, $2, $3, $4, 1, NOW())
             RETURNING id`,
            [driverId, payoutAmount, payoutAmount, payoutAmount]
          );
          walletId = newWallet.rows[0]?.id;
        }

        // Add transaction record if wallet exists
        if (walletId) {
          try {
            await db.query(
              `INSERT INTO driver_transactions (driver_id, transaction_type, amount, description, status)
               VALUES ($1, 'credit', $2, $3, 'completed')`,
              [driverId, payoutAmount, `Trip payout for order #${trip.order_id}`]
            );
          } catch (txErr) {
            request.log.warn({ err: txErr }, 'Transaction record failed (non-critical)');
          }
        }
      } catch (walletErr) {
        request.log.warn({ err: walletErr }, 'Delivery completed but wallet sync failed');
      }
    }

    if (await tableExists('driver_stats')) {
      try {
        const statsRes = await db.query(`SELECT id FROM driver_stats WHERE driver_id = $1 LIMIT 1`, [driverId]);
        if (statsRes.rows.length > 0) {
          await db.query(`
            UPDATE driver_stats
            SET total_earnings = total_earnings + $1,
                total_orders_completed = total_orders_completed + 1,
                weekly_orders_completed = weekly_orders_completed + 1,
                weekly_earnings = weekly_earnings + $1,
                last_updated_at = NOW()
            WHERE driver_id = $2
          `, [payoutAmount, driverId]);
        } else {
          await db.query(`
            INSERT INTO driver_stats (driver_id, total_earnings, total_orders_completed, weekly_orders_completed, weekly_earnings)
            VALUES ($1, $2, 1, 1, $2)
          `, [driverId, payoutAmount]);
        }
      } catch (statsErr) {
        request.log.warn({ err: statsErr }, 'Failed to update driver_stats');
      }
    }

    notifyOrderUpdate(driverId, tripId, 'delivered', { payout: payoutAmount });

    request.log.info(`✅ completeDelivery SUCCESS - Order #${trip.order_id}, Payout: ${payoutAmount}`);
    
    return reply.send({
      success: true,
      message: 'Delivery completed successfully!',
      payout:  payoutAmount,
      tripId,
    });
  } catch (err) {
    request.log.error(`❌ completeDelivery ERROR: ${err.message}`);
    return reply.code(500).send({ success: false, message: 'Failed to complete delivery' });
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/orders/trips/:tripId/cancel
// ──────────────────────────────────────────────────────────────
async function cancelTrip(request, reply) {
  const driverId = request.driver.id;
  const { tripId } = request.params;
  const { reason } = request.body;

  if (!reason) {
    return reply.code(400).send({ success: false, message: 'Cancellation reason is required' });
  }

  try {
    await ensureDriverSuspensionSchema();

    const suspension = await getDriverSuspensionState(driverId);
    if (suspension.isSuspended) {
      return reply.code(403).send({
        success: false,
        suspended: true,
        suspendedUntil: suspension.suspendedUntil,
        remainingMs: suspension.remainingMs,
        cancellationCountToday: suspension.cancellationCount,
        maxDailyCancellations: suspension.maxDailyCancellations,
        suspensionDurationHours: suspension.suspensionDurationHours,
        message: 'Your driver account is suspended because you cancelled too many orders today. Please try again after the lockout ends.',
      });
    }

    const client = await db.beginTransaction();
    let suspensionResponse = null;

    try {
      const tripResult = await client.query(
        'SELECT * FROM delivery_trips WHERE id = $1 AND driver_id = $2 FOR UPDATE',
        [tripId, driverId]
      );
      const trip = tripResult.rows[0] || null;

      if (!trip) {
        await client.query('ROLLBACK');
        return reply.code(404).send({ success: false, message: 'Trip not found' });
      }

      if (['delivered', 'cancelled'].includes(trip.status)) {
        await client.query('ROLLBACK');
        return reply.code(400).send({ success: false, message: `Trip already ${trip.status}` });
      }

      await client.query(
        `UPDATE delivery_trips
            SET status = 'cancelled',
                cancelled_at = NOW(),
                cancel_reason = $1
          WHERE id = $2`,
        [reason, tripId]
      );

      const countResult = await client.query(
        `SELECT COUNT(*)::int AS cancellation_count
           FROM delivery_trips
          WHERE driver_id = $1
            AND status = 'cancelled'
            AND cancelled_at >= date_trunc('day', NOW())`,
        [driverId]
      );
      const cancellationCount = Number(countResult.rows[0]?.cancellation_count || 0);

      if (cancellationCount >= MAX_DAILY_CANCELLATIONS) {
        const suspendedAt = new Date();
        const suspendedUntil = new Date(suspendedAt.getTime() + SUSPENSION_DURATION_HOURS * 60 * 60 * 1000);
        const suspensionReason = `Cancelled ${MAX_DAILY_CANCELLATIONS} orders today`;

        await client.query(
          `UPDATE driver_profiles
              SET is_online = FALSE,
                  suspended_at = $1,
                  suspended_until = $2,
                  suspension_reason = $3
            WHERE id = $4`,
          [suspendedAt.toISOString(), suspendedUntil.toISOString(), suspensionReason, driverId]
        );

        suspensionResponse = {
          isSuspended: true,
          suspendedUntil: suspendedUntil.toISOString(),
          remainingMs: suspendedUntil.getTime() - suspendedAt.getTime(),
          suspensionReason,
          cancellationCount,
          maxDailyCancellations: MAX_DAILY_CANCELLATIONS,
          suspensionDurationHours: SUSPENSION_DURATION_HOURS,
        };
      }

      await client.query('COMMIT');

      notifyOrderUpdate(driverId, tripId, 'cancelled', { reason });
      return reply.send({
        success: true,
        message: suspensionResponse
          ? 'Trip cancelled. Driver suspension applied for 8 hours.'
          : 'Trip cancelled',
        reason,
        cancellationCountToday: cancellationCount,
        maxDailyCancellations: MAX_DAILY_CANCELLATIONS,
        suspension: suspensionResponse,
      });
    } catch (transactionError) {
      try { await client.query('ROLLBACK'); } catch {}
      throw transactionError;
    } finally {
      client.release();
    }
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ success: false, message: 'Failed to cancel trip' });
  }
}

// ──────────────────────────────────────────────────────────────
// GET /api/orders/history
// ──────────────────────────────────────────────────────────────
async function getOrderHistory(request, reply) {
  const driverId = request.driver.id;
  const { status = 'Completed', page = 1, limit = 20 } = request.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const statusMap = { Completed: 'delivered', Cancelled: 'cancelled', Missed: 'missed' };
  const dbStatus = statusMap[status] || 'delivered';

  try {
    if (!(await tableExists('delivery_trips'))) {
      return reply.send({
        success: true,
        data: [],
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total: 0,
          totalPages: 0,
        },
      });
    }

    const countResult = await db.query(
      `SELECT COUNT(*) as count FROM delivery_trips WHERE driver_id = $1 AND status = $2`,
      [driverId, dbStatus]
    );
    const count = parseInt(countResult.rows[0]?.count || 0, 10);

    const trips = await db.query(
      `SELECT
        dt.id, dt.status, dt.payout_amount, dt.distance_text, dt.started_at, dt.completed_at,
        dt.cancel_reason,
        o.id as order_id, o.product_name, o.customer_name as client_name, o.pickup_address,
        o.delivery_address, o.total_amount as final_total, o.order_date
       FROM delivery_trips dt
       LEFT JOIN orders o ON dt.order_id = o.id
       WHERE dt.driver_id = $1 AND dt.status = $2
       ORDER BY dt.completed_at DESC NULLS LAST, dt.started_at DESC
       LIMIT $3 OFFSET $4`,
      [driverId, dbStatus, parseInt(limit, 10), offset]
    );

    const historyRows = (trips.rows || []).map((row) => ({
      ...row,
      normalized_status: normalizeOrderStatus(row.status),
    }));

    return reply.send({
      success: true,
      data: historyRows,
      pagination: {
        page:       parseInt(page, 10),
        limit:      parseInt(limit, 10),
        total:      count,
        totalPages: Math.ceil(count / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    request.log.error('getOrderHistory error:', error);
    if (isSchemaDriftError(error)) {
      return reply.send({
        success: true,
        data: [],
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total: 0,
          totalPages: 0,
        },
      });
    }
    return reply.code(500).send({ success: false, message: 'Failed to fetch history' });
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/orders
// FIX: route schema uses customer_name/customer_phone but controller
//      was inserting client_name/client_phone — now aligned.
// ──────────────────────────────────────────────────────────────
async function createOrder(request, reply) {
  const body = request.body || {};
  const {
    vendor_id, vendor_shop_name, product_name,
    // FIX: accept both customer_name (route schema) and client_name (legacy)
    customer_name, customer_phone,
    client_name, client_phone,
    pickup_address, pickup_latitude, pickup_longitude,
    delivery_address, delivery_latitude, delivery_longitude,
    delivery_fee, delivery_distance_km, delivery_pricing,
    items_total, final_total, items,
    vehicle_type, model_id_requested, weight_capacity_requested,
    body_type_requested, dimensions_requested,
  } = body;

  // Normalise: prefer customer_name (new), fall back to client_name (legacy)
  const resolvedClientName  = customer_name  || client_name;
  const resolvedClientPhone = customer_phone || client_phone;
  const resolvedVendorId = request.vendor?.id || vendor_id || null;
  const resolvedVendorShopName = request.vendor?.shop_name || vendor_shop_name || null;
  const resolvedPickupAddress = pickup_address || request.vendor?.shop_address || null;
  const resolvedPickupLatitude =
    pickup_latitude ??
    request.vendor?.shop_latitude ??
    null;
  const resolvedPickupLongitude =
    pickup_longitude ??
    request.vendor?.shop_longitude ??
    null;

  if (!resolvedVendorShopName || !product_name || !resolvedPickupAddress || !delivery_address) {
    return reply.code(400).send({ success: false, message: 'Missing required order fields' });
  }

  if (!resolvedClientName || !resolvedClientPhone) {
    return reply.code(400).send({ success: false, message: 'Customer name and phone are required' });
  }

  try {
    const resolvedDeliveryLatitude = toNumberOrNull(delivery_latitude);
    const resolvedDeliveryLongitude = toNumberOrNull(delivery_longitude);
    const resolvedPickupLatNum = toNumberOrNull(resolvedPickupLatitude);
    const resolvedPickupLngNum = toNumberOrNull(resolvedPickupLongitude);

    const checkoutMeta = parseJsonObject(
      body.order_meta || body.order_metadata || body.metadata || body.delivery_meta || body.checkout_meta
    );
    const vehicleMeta = parseJsonObject(body.vehicle || checkoutMeta.vehicle);
    const resolvedVehicleType = vehicle_type || vehicleMeta.type || null;
    const resolvedModelId = normalizeModelIdForStorage(
      model_id_requested || body.vehicle_option_id || body.option_id || vehicleMeta.option_id,
      resolvedVehicleType
    );
    const modelSpec = resolvedModelId ? (VEHICLE_MODEL_SPECS[resolvedModelId] || null) : null;
    const resolvedWeightRequested =
      toNumberOrNull(weight_capacity_requested) ??
      toNumberOrNull(vehicleMeta.weight_capacity_kg ?? vehicleMeta.weight_capacity) ??
      modelSpec?.weight ??
      null;
    const resolvedDimensionsRequested =
      normalizePhysicalDimension(
        dimensions_requested ||
        body.vehicle_desc ||
        body.option_desc ||
        vehicleMeta.option_desc ||
        vehicleMeta.option_name
      ) || modelSpec?.dimensions || null;
    const resolvedBodyTypeRequested = normalizeBodyTypeForStorage(
      body_type_requested || vehicleMeta.body_type,
      modelSpec?.bodyType || null
    );

    let resolvedDistanceKm = toNumberOrNull(delivery_distance_km);
    let resolvedDeliveryFee = toNumberOrNull(delivery_fee) || 0;
    let resolvedDeliveryPricing = delivery_pricing || null;

    if (
      vehicle_type &&
      resolvedPickupLatNum != null &&
      resolvedPickupLngNum != null &&
      resolvedDeliveryLatitude != null &&
      resolvedDeliveryLongitude != null
    ) {
      try {
        const calculated = await calculateDeliveryCharge({
          vehicleType: vehicle_type,
          originLat: resolvedPickupLatNum,
          originLng: resolvedPickupLngNum,
          destLat: resolvedDeliveryLatitude,
          destLng: resolvedDeliveryLongitude,
        });

        resolvedDistanceKm = calculated.distanceKm;
        resolvedDeliveryFee = calculated.deliveryCharge;
        resolvedDeliveryPricing = {
          vehicle_type: calculated.vehicleType,
          display_name: calculated.displayName,
          distance_km: calculated.distanceKm,
          base_fare: calculated.baseFare,
          rate_per_km: calculated.ratePerKm,
          min_km: calculated.minKm,
          extra_km: calculated.extraKm,
          delivery_charge: calculated.deliveryCharge,
        };
      } catch (pricingError) {
        request.log.warn({ err: pricingError }, 'Delivery pricing fallback: using provided delivery_fee');
      }
    }

    const fallbackItemsTotal =
      toNumberOrNull(items_total) ||
      ((Array.isArray(items) ? items : []).reduce((sum, item) => {
        const qty = toFiniteNumber(item?.qty) || 1;
        const price = toFiniteNumber(item?.price ?? item?.selling_price) || 0;
        return sum + qty * price;
      }, 0));

    const resolvedFinalTotal =
      toNumberOrNull(final_total) ??
      roundNumber(fallbackItemsTotal + resolvedDeliveryFee);

    const orderPayload = await filterDataForTable('orders', {
      vendor_id:                 resolvedVendorId,
      vendor_shop_name:          resolvedVendorShopName,
      product_name,
      customer_name:             resolvedClientName,
      customer_phone:            resolvedClientPhone,
      pickup_address:            resolvedPickupAddress,
      pickup_latitude:           resolvedPickupLatNum,
      pickup_longitude:          resolvedPickupLngNum,
      delivery_address,
      delivery_latitude:         resolvedDeliveryLatitude,
      delivery_longitude:        resolvedDeliveryLongitude,
      status:                    'Pending',
      v_status:                  'pending',
      delivery_fee:              resolvedDeliveryFee,
      delivery_distance_km:      resolvedDistanceKm,
      delivery_pricing_json:     resolvedDeliveryPricing ? JSON.stringify(resolvedDeliveryPricing) : null,
      total_amount:              resolvedFinalTotal,
      items_total:               roundNumber(fallbackItemsTotal),
      final_total:               resolvedFinalTotal,
      items:                     items ? JSON.stringify(items) : null,
      vehicle_type:              resolvedVehicleType,
      model_id_requested:        resolvedModelId,
      weight_capacity_requested: resolvedWeightRequested,
      body_type_requested:       resolvedBodyTypeRequested,
      dimensions_requested:      resolvedDimensionsRequested,
      order_date:                new Date().toISOString(),
    });

    const newOrder = await db.insert('orders', orderPayload);

    return reply.code(201).send({
      success: true,
      message: 'Order created. It will be visible to drivers after vendor acceptance.',
      data:    newOrder,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ success: false, message: 'Failed to create order' });
  }
}

function roundNumber(value) {
  return Number(Number(value || 0).toFixed(2));
}

module.exports = {
  getAvailableOrders,
  getActiveTrip,
  acceptOrder,
  ignoreOrder,
  arrivedAtPickup,
  confirmPickup,
  arrivedAtDropoff,
  completeDelivery,
  cancelTrip,
  getOrderHistory,
  createOrder,
  debugVehicleMatch,
};
