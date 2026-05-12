// src/services/socketService.js
const db = require('../config/database');

let io = null;
const socketToDriver = new Map();

function parseBearerToken(value) {
  if (!value) return null;
  if (value.startsWith('Bearer ')) return value.slice(7).trim();
  return value.trim();
}

function isAllowedOrigin(origin, allowedOrigins) {
  if (!origin) return true;
  if (!Array.isArray(allowedOrigins) || allowedOrigins.length === 0) return false;
  return allowedOrigins.includes(origin);
}

async function driverOwnsTrip(tripId, driverId) {
  const result = await db.query(
    'SELECT id FROM delivery_trips WHERE id = $1 AND driver_id = $2 LIMIT 1',
    [tripId, driverId]
  );
  return result.rows.length > 0;
}

function initSocket(httpServer, fastify, options = {}) {
  const { Server } = require('socket.io');
  const allowedOrigins = options.corsOrigins || [];

  io = new Server(httpServer, {
    cors: {
      origin: (origin, cb) => {
        if (isAllowedOrigin(origin, allowedOrigins)) return cb(null, true);
        return cb(new Error('Socket origin not allowed'), false);
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.use((socket, next) => {
    try {
      const handshakeToken = parseBearerToken(socket.handshake?.auth?.token);
      const headerToken = parseBearerToken(socket.handshake?.headers?.authorization || '');
      const token = handshakeToken || headerToken;

      if (!token) {
        return next(new Error('Unauthorized socket connection'));
      }

      const payload = fastify.jwt.verify(token);
      socket.user = payload;
      return next();
    } catch (_) {
      return next(new Error('Unauthorized socket connection'));
    }
  });

  io.on('connection', (socket) => {
    const driverId = socket.user?.driverId ? String(socket.user.driverId) : null;

    if (driverId) {
      socket.join(`driver:${driverId}`);
      socketToDriver.set(socket.id, driverId);
    }

    console.log(`[Socket] Client connected: ${socket.id}${driverId ? ` (driver ${driverId})` : ''}`);

    // Backward-compatible no-op registration event (identity comes from JWT).
    socket.on('driver:register', () => {
      if (!driverId) return;
      socket.join(`driver:${driverId}`);
      socketToDriver.set(socket.id, driverId);
    });

    socket.on('driver:status', ({ isOnline } = {}) => {
      if (!driverId) return;
      socket.broadcast.emit('driver:status_changed', { driverId, isOnline: !!isOnline });
    });

    socket.on('driver:gps_ping', ({ tripId, latitude, longitude } = {}) => {
      if (!driverId) return;
      io.to('admin').emit('gps:update', {
        driverId,
        tripId: tripId || null,
        latitude,
        longitude,
        timestamp: new Date(),
      });
    });

    socket.on('trip:join', async ({ tripId } = {}) => {
      if (!driverId || !tripId) return;
      try {
        const allowed = await driverOwnsTrip(tripId, driverId);
        if (!allowed) return;
        socket.join(`trip:${tripId}`);
      } catch (error) {
        console.error('[Socket] Failed trip join check:', error.message);
      }
    });

    socket.on('trip:chat_message', async (data = {}) => {
      if (!driverId || !data.tripId || !data.message) return;

      try {
        const allowed = await driverOwnsTrip(data.tripId, driverId);
        if (!allowed) return;

        const payload = {
          tripId: data.tripId,
          message: String(data.message),
          senderId: driverId,
          senderType: 'driver',
          timestamp: data.timestamp || new Date().toISOString(),
        };

        io.to(`trip:${data.tripId}`).emit('trip:chat_message', payload);
      } catch (error) {
        console.error('[Socket] Failed chat send:', error.message);
      }
    });

    socket.on('disconnect', () => {
      socketToDriver.delete(socket.id);
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

function pushOrderToDriver(driverId, order) {
  if (!io) return;
  io.to(`driver:${driverId}`).emit('order:new', order);
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

function isLikelyModelIdToken(token) {
  if (!token) return false;
  return token.startsWith('2w') || token.startsWith('3w') || token.startsWith('4w');
}

function deriveModelIdFromVehicleClassAndWeight(vehicleClass, weightCapacity) {
  if (vehicleClass !== '4w') return '';
  const weight = toNumberOrNull(weightCapacity);
  if (weight == null) return '';
  const rounded = Math.round(weight);
  const buckets = [750, 1200, 1700, 2500];
  const exact = buckets.find((x) => x === rounded);
  if (exact) return `4w${exact}kg`;
  return '';
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

function matchesOrderForBroadcast(order, driverVehicle) {
  const orderVehicleClass = canonicalVehicleClass(order?.vehicle_type);
  const driverVehicleClass = canonicalVehicleClass(driverVehicle?.vehicle_type);
  if (!orderVehicleClass || !driverVehicleClass || orderVehicleClass !== driverVehicleClass) {
    return false;
  }

  const orderWeight = toNumberOrNull(order?.weight_capacity_requested);
  const driverWeight = toNumberOrNull(driverVehicle?.weight_capacity ?? driverVehicle?.weight_capacity_kg);
  if (orderWeight != null && driverWeight != null && driverWeight < orderWeight) {
    return false;
  }

  const orderModel = normalizeModelId(order?.model_id_requested);
  const driverModelCandidates = new Set([
    normalizeModelId(driverVehicle?.model_id),
    normalizeModelId(driverVehicle?.selected_model_id),
    normalizeModelId(driverVehicle?.specific_model_id),
    normalizeModelId(driverVehicle?.option_id),
    deriveModelIdFromVehicleClassAndWeight(driverVehicleClass, driverWeight),
  ].filter((token) => isLikelyModelIdToken(token)));
  if (orderModel && driverModelCandidates.size > 0 && !driverModelCandidates.has(orderModel)) {
    return false;
  }

  const orderDimensions = normalizeDimension(order?.dimensions_requested);
  const driverDimensions = normalizeDimension(driverVehicle?.dimensions || driverVehicle?.cargo_dimensions || driverVehicle?.load_dimensions);
  if (orderDimensions && driverDimensions && orderDimensions !== driverDimensions) {
    return false;
  }

  const orderBodyType = String(order?.body_type_requested || '').trim().toLowerCase();
  const driverBodyType = String(driverVehicle?.body_type || '').trim().toLowerCase();
  if (isStrictBodyType(orderBodyType)) {
    if (!isStrictBodyType(driverBodyType)) return false;
    if (orderBodyType !== driverBodyType) return false;
  }

  return true;
}

async function broadcastNewOrderToOnlineDrivers(order, dbClient) {
  if (!io) return;

  try {
    const requiredVendorStatus = String(order?.v_status || '').trim().toLowerCase();
    if (requiredVendorStatus !== 'accepted') {
      return;
    }

    const result = await dbClient.query(
      `SELECT dp.id,
              COALESCE(v.vehicle_type, dv.vehicle_type) AS vehicle_type,
              COALESCE(v.model_id, dv.model_id) AS model_id,
              COALESCE(v.weight_capacity, dv.weight_capacity) AS weight_capacity,
              COALESCE(v.body_type, dv.body_type) AS body_type,
              COALESCE(v.dimensions, dv.dimensions) AS dimensions
       FROM driver_profiles dp
       JOIN driver_vehicles dv ON dv.driver_id = dp.id
       LEFT JOIN vehicles v ON v.driver_id = dp.id
       WHERE dp.is_online = TRUE
         AND dp.is_approved = TRUE
         AND ($1::boolean IS NULL OR $1 = FALSE)`,
      [order.self_delivery ?? null]
    );

    const matchedDrivers = (result.rows || []).filter((driver) => matchesOrderForBroadcast(order, driver));

    console.log(
      `[Socket] Order ${order.id} | vehicle=${order.vehicle_type} | ` +
      `capacity=${order.weight_capacity_requested}kg | body=${order.body_type_requested} | ` +
      `dimensions=${order.dimensions_requested} | matched ${matchedDrivers.length} online drivers`
    );

    matchedDrivers.forEach((driver) => {
      io.to(`driver:${driver.id}`).emit('order:new', order);
    });
  } catch (error) {
    console.error('[Socket] Error broadcasting to matched drivers:', error.message);
  }
}

function broadcastNewOrder(order) {
  if (!io) return;
  io.emit('order:new', order);
}

function notifyOrderUpdate(driverId, tripId, status, data = {}) {
  if (!io) return;
  io.to(`driver:${driverId}`).emit('order:updated', { tripId, status, ...data });
}

function pushNotification(driverId, notification) {
  if (!io) return;
  io.to(`driver:${driverId}`).emit('notification:new', notification);
}

function getIo() {
  return io;
}

module.exports = {
  initSocket,
  pushOrderToDriver,
  broadcastNewOrder,
  broadcastNewOrderToOnlineDrivers,
  notifyOrderUpdate,
  pushNotification,
  getIo,
};
