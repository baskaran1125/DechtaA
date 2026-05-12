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

async function authenticateVendor(request, reply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.code(401).send({ success: false, message: 'Unauthorized. Invalid or expired token.' });
  }

  const token = request.user || {};
  const role = String(token.role || token.userType || '').trim().toLowerCase();

  if (role !== 'vendor') {
    return reply.code(403).send({ success: false, message: 'Forbidden: vendor access only' });
  }

  const vendorId = normalizePositiveInt(token.vendorId ?? token.vendor_id ?? token.id ?? token.sub);
  const phone = firstNonEmpty(token.mobile, token.phone);

  if (!vendorId && !phone) {
    return reply.code(401).send({ success: false, message: 'Unauthorized. Invalid vendor token payload.' });
  }

  try {
    let vendor = null;

    if (vendorId) {
      const result = await db.query(
        'SELECT * FROM vendors WHERE id = $1 LIMIT 1',
        [vendorId]
      );
      vendor = result.rows[0] || null;
    }

    // Support older tokens that only carry the vendor phone number.
    if (!vendor && phone) {
      const result = await db.query(
        'SELECT * FROM vendors WHERE phone = $1 LIMIT 1',
        [phone]
      );
      vendor = result.rows[0] || null;
    }

    if (!vendor) {
      return reply.code(401).send({ success: false, message: 'Vendor not found' });
    }

    request.vendor = vendor;
  } catch (err) {
    request.log.error({ err, token }, 'Vendor auth lookup failed');
    return reply.code(503).send({ success: false, message: 'Database is unavailable. Please try again shortly.' });
  }
}

module.exports = { authenticateVendor };
