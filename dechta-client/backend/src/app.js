'use strict';

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const compression = require('compression');
const rateLimit  = require('express-rate-limit');

const authRoutes       = require('./routes/authRoutes');
const productRoutes    = require('./routes/productRoutes');
const orderRoutes      = require('./routes/orderRoutes');
const vendorAuthRoutes = require('./routes/vendorAuthRoutes');
const vendorRoutes     = require('./routes/vendorRoutes');
const workerRoutes     = require('./routes/workerRoutes');
const locationRoutes   = require('./routes/locationRoutes');
const pricingRoutes    = require('./routes/pricingRoutes');
const addressRoutes    = require('./routes/addressRoutes');
const errorHandler     = require('./middleware/errorHandler');

const app = express();

// ── Security & Performance ────────────────────────────────────
app.use(helmet());
app.use(compression());

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = [
  ...(process.env.CLIENT_URL || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean),
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:5173',
  'http://localhost:5178',
  'http://localhost:5175',
  'http://localhost:4173',
  'http://localhost:3000',
].filter(Boolean);

const localDevOriginPattern = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || localDevOriginPattern.test(origin)) {
      return cb(null, true);
    }
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

// ── Rate Limiting ─────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 300,
  message: { error: 'Too many requests. Try again in 15 minutes.' },
});

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, max: 20,
  message: { error: 'Too many auth attempts. Wait 10 minutes.' },
});

// ── Body Parsing ──────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',      authLimiter, authRoutes);
app.use('/api/products',  apiLimiter,  productRoutes);
app.use('/api/orders',    apiLimiter,  orderRoutes);
app.use('/api/vendors',   apiLimiter,  vendorAuthRoutes);
app.use('/api/vendors',   apiLimiter,  vendorRoutes);
app.use('/api/workers',   apiLimiter,  workerRoutes);
app.use('/api/location',  apiLimiter,  locationRoutes);
app.use('/api/pricing',   apiLimiter,  pricingRoutes);
app.use('/api/addresses', apiLimiter,  addressRoutes);

// ── Health Check ──────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    const pool = require('./config/db');
    const { rows } = await pool.query('SELECT NOW() AS time');
    return res.json({ status: 'ok', dbTime: rows[0].time, server: 'dechta-client-backend' });
  } catch (e) {
    return res.status(503).json({ status: 'error', message: e.message });
  }
});

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` })
);

// ── Global Error Handler ──────────────────────────────────────
app.use(errorHandler);

module.exports = app;
