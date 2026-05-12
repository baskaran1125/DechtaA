// src/server.js
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Fastify = require('fastify');
const isProduction = process.env.NODE_ENV === 'production';

function parseOriginList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isLocalDevOrigin(origin) {
  try {
    const parsedOrigin = new URL(origin);
    const isLocalHost = parsedOrigin.hostname === 'localhost' || parsedOrigin.hostname === '127.0.0.1';
    const isHttpProtocol = parsedOrigin.protocol === 'http:' || parsedOrigin.protocol === 'https:';
    return isLocalHost && isHttpProtocol;
  } catch {
    return false;
  }
}

const configuredOrigins = parseOriginList(process.env.FRONTEND_URL);
const devOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5001',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:8081',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:5001',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:5176',
  'http://127.0.0.1:8081',
];
const allowedOrigins = isProduction
  ? configuredOrigins
  : Array.from(new Set([...configuredOrigins, ...devOrigins]));

function isAllowedOrigin(origin) {
  if (!origin) return true; // mobile/native clients may not send Origin
  if (!isProduction && isLocalDevOrigin(origin)) return true;
  return allowedOrigins.includes(origin);
}

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production.');
}

if (isProduction && allowedOrigins.length === 0) {
  throw new Error('FRONTEND_URL must be set in production.');
}

if (!isProduction && !process.env.JWT_SECRET) {
  console.warn('[Security] JWT_SECRET is not set. Falling back to development-only secret.');
}

// ──────────────────────────────────────────────────────────────
// Create Fastify instance
// ──────────────────────────────────────────────────────────────
const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    transport:
      process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
  // Vendor route bootstrap performs compatibility DDL on startup, which can exceed Fastify's default plugin timeout.
  pluginTimeout: parseInt(process.env.FASTIFY_PLUGIN_TIMEOUT || '120000', 10),
  trustProxy: true,
  bodyLimit: 25 * 1024 * 1024,
});

// ──────────────────────────────────────────────────────────────
// Register plugins
// ──────────────────────────────────────────────────────────────
async function registerPlugins() {
  const jwtSecret = process.env.JWT_SECRET || 'dev-only-change-me';

  await fastify.register(require('@fastify/cors'), {
    origin: (origin, cb) => {
      if (isAllowedOrigin(origin)) return cb(null, true);
      return cb(new Error('Origin not allowed'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'ngrok-skip-browser-warning'],
    credentials: true,
  });

  // Helmet — security headers
  await fastify.register(require('@fastify/helmet'), {
    contentSecurityPolicy: false, // disable for API
    crossOriginResourcePolicy: { policy: "cross-origin" }
  });

  // JWT
  await fastify.register(require('@fastify/jwt'), {
    secret: jwtSecret,
    sign: { expiresIn: '30d' },
  });

  // Rate limiting
  await fastify.register(require('@fastify/rate-limit'), {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip,
    errorResponseBuilder: () => ({
      success: false,
      message: 'Too many requests. Please slow down.',
    }),
  });

  // Multipart (for file uploads)
  await fastify.register(require('@fastify/multipart'), {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max per file
      files: 10,
    },
  });

  // Serve uploaded files statically
  await fastify.register(require('@fastify/static'), {
    root: path.join(__dirname, '..', 'uploads'),
    prefix: '/uploads/',
  });
}

// ──────────────────────────────────────────────────────────────
// Register routes under /api prefix
// ──────────────────────────────────────────────────────────────
async function registerRoutes() {
  // ── Driver routes ──────────────────────────────────────────
  await fastify.register(require('./routes/auth'),     { prefix: '/api/auth' });
  await fastify.register(require('./routes/driver'),   { prefix: '/api/driver' });
  await fastify.register(require('./routes/orders'),   { prefix: '/api/orders' });
  await fastify.register(require('./routes/earnings'), { prefix: '/api/earnings' });
  await fastify.register(require('./routes/wallet'),   { prefix: '/api/wallet' });
  await fastify.register(require('./routes/location'),  { prefix: '/api/location' });
  await fastify.register(require('./routes/misc'),     { prefix: '/api' });

  // ── Vendor routes ──────────────────────────────────────────
  await fastify.register(require('./routes/vendors'),  { prefix: '/api/vendors' });
  await fastify.register(require('./routes/products'), { prefix: '/api/products' });
  await fastify.register(require('./routes/billing'),  { prefix: '/api/billing' });
  await fastify.register(require('./routes/pricing'),  { prefix: '/api/pricing' });

  // ── Worker routes ──────────────────────────────────────────
  await fastify.register(require('./routes/worker'),   { prefix: '/api/worker' });
}

// ──────────────────────────────────────────────────────────────
// Health check
// ──────────────────────────────────────────────────────────────
fastify.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'QC Driver Backend',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  };
});

fastify.get('/', async (request, reply) => {
  return { message: 'QC Logistics Driver API is running 🚚', docs: '/api/docs' };
});

// ──────────────────────────────────────────────────────────────
// Global error handler
// ──────────────────────────────────────────────────────────────
fastify.setErrorHandler((error, request, reply) => {
  request.log.error(error);

  // Validation errors
  if (error.validation) {
    return reply.code(400).send({
      success: false,
      message: 'Validation error',
      details: error.validation,
    });
  }

  // Rate limit
  if (error.statusCode === 429) {
    return reply.code(429).send({
      success: false,
      message: error.message,
    });
  }

  // JWT errors
  if (error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER' || error.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED') {
    return reply.code(401).send({ success: false, message: 'Unauthorized' });
  }

  // Generic server error
  return reply.code(error.statusCode || 500).send({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
  });
});

// 404 handler
fastify.setNotFoundHandler((request, reply) => {
  reply.code(404).send({
    success: false,
    message: `Route ${request.method} ${request.url} not found`,
  });
});

// ──────────────────────────────────────────────────────────────
// Bootstrap — create HTTP server, attach Socket.io, start
// ──────────────────────────────────────────────────────────────
async function checkDatabaseConnection() {
  try {
    const { Pool } = require('pg');
    // Must match database.js — SSL required for GCP Cloud SQL
    const useSSL = process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production';
    const pool = new Pool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      ssl: useSSL ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000,
    });

    console.log('🔍 Checking database connection...');
    const result = await pool.query('SELECT NOW() as current_time');
    await pool.end();

    console.log('✅ Database connected successfully!');
    console.log(`📅 Server time: ${result.rows[0].current_time}`);
    return true;
  } catch (error) {
    console.log('❌ Database connection failed!');
    console.log(`❌ Error: ${error?.message || error?.code || JSON.stringify(error)}`);
    console.log(`   Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    console.log(`   Database: ${process.env.DB_NAME}`);
    console.log('⚠️  Server will start but database operations will fail');
    return false;
  }
}

async function start() {
  try {
    // Check database connection before starting server
    const dbConnected = await checkDatabaseConnection();
    console.log('');

    await registerPlugins();
    await registerRoutes();

    // Get Fastify's underlying Node HTTP server
    await fastify.ready();
    const httpServer = fastify.server;

    // Initialize Socket.io on the same HTTP server
    const { initSocket } = require('./services/socketService');
    initSocket(httpServer, fastify, { corsOrigins: allowedOrigins });

    // Initialize PostgreSQL polling for new orders (alternative to Supabase Realtime)
    // Drivers receive new orders through REST polling or Socket.io messaging
    // Optional: Implement polling here if needed for real-time updates
    // For now, relies on client-side polling via /api/orders/available

    const PORT = parseInt(process.env.PORT || '3000', 10);

    await fastify.listen({ port: PORT, host: '0.0.0.0' });

    console.log(`
╔════════════════════════════════════════════════╗
║   🚚 QC Driver Backend is running              ║
║   Port    : ${PORT}                             
║   Env     : ${process.env.NODE_ENV || 'development'}                      
║   Database: ${dbConnected ? '✅ Connected' : '❌ Not Connected'}
║   Health  : http://localhost:${PORT}/health      
╚════════════════════════════════════════════════╝
    `);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  fastify.log.info('SIGTERM received. Shutting down gracefully...');
  await fastify.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await fastify.close();
  process.exit(0);
});

start();
