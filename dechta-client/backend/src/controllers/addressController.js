'use strict';

const pool         = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { ok, err }  = require('../utils/response');

const ADDRESS_SCHEMA_PATCHES = [
  `ALTER TABLE addresses ADD COLUMN IF NOT EXISTS lat NUMERIC(10,7)`,
  `ALTER TABLE addresses ADD COLUMN IF NOT EXISTS lng NUMERIC(10,7)`,
  `ALTER TABLE addresses ADD COLUMN IF NOT EXISTS area TEXT`,
  `ALTER TABLE addresses ADD COLUMN IF NOT EXISTS city TEXT`,
  `ALTER TABLE addresses ADD COLUMN IF NOT EXISTS state TEXT`,
  `ALTER TABLE addresses ADD COLUMN IF NOT EXISTS pincode VARCHAR(20)`,
  `ALTER TABLE addresses ADD COLUMN IF NOT EXISTS landmark TEXT`
];

let addressSchemaReady = false;

const toNumberOrNull = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const ensureAddressSchema = async () => {
  if (addressSchemaReady) return;
  try {
    for (const sql of ADDRESS_SCHEMA_PATCHES) {
      await pool.query(sql);
    }
  } catch (e) {
    console.warn('[addressController] Address schema patch warning:', e.message);
  }
  addressSchemaReady = true;
};

// ── POST /api/addresses ──────────────────────────────────────
const saveAddress = asyncHandler(async (req, res) => {
  const {
    tag,
    address_text,
    is_default = false,
    lat,
    lng,
    area,
    city,
    state,
    pincode,
    landmark,
  } = req.body;
  const userId = req.user.userId;

  await ensureAddressSchema();

  if (!address_text || !address_text.trim())
    return err(res, 'address_text is required', 400);

  const validTags = ['home', 'office', 'other'];
  const normalizedTag = (tag || 'other').toLowerCase();
  if (!validTags.includes(normalizedTag))
    return err(res, `tag must be one of: ${validTags.join(', ')}`, 400);

  // If this address is set as default, unset all others first
  if (is_default) {
    await pool.query(
      `UPDATE addresses SET is_default = false WHERE user_id = $1`,
      [userId]
    );
  }

  const { rows } = await pool.query(
    `INSERT INTO addresses (user_id, tag, address_text, is_default, lat, lng, area, city, state, pincode, landmark, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
     RETURNING *`,
    [
      userId,
      normalizedTag,
      address_text.trim(),
      is_default,
      toNumberOrNull(lat),
      toNumberOrNull(lng),
      area || null,
      city || null,
      state || null,
      pincode || null,
      landmark || null,
    ]
  );

  return ok(res, rows[0], 'Address saved', 201);
});

// ── GET /api/addresses ───────────────────────────────────────
const getAddresses = asyncHandler(async (req, res) => {
  await ensureAddressSchema();
  const { rows } = await pool.query(
     `SELECT *
      FROM addresses
      WHERE user_id = $1
      ORDER BY is_default DESC, created_at DESC`,
    [req.user.userId]
  );
  return ok(res, rows);
});

// ── PUT /api/addresses/:id ───────────────────────────────────
const updateAddress = asyncHandler(async (req, res) => {
  const { id }   = req.params;
  const userId   = req.user.userId;
  const { tag, address_text, is_default, lat, lng, area, city, state, pincode, landmark } = req.body;

  await ensureAddressSchema();

  // Ownership check
  const existing = await pool.query(
    `SELECT id FROM addresses WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  if (!existing.rows.length) return err(res, 'Address not found', 404);

  const validTags = ['home', 'office', 'other'];
  const normalizedTag = tag ? tag.toLowerCase() : undefined;
  if (normalizedTag && !validTags.includes(normalizedTag))
    return err(res, `tag must be one of: ${validTags.join(', ')}`, 400);

  // Unset other defaults if setting this as default
  if (is_default) {
    await pool.query(
      `UPDATE addresses SET is_default = false WHERE user_id = $1`,
      [userId]
    );
  }

  const { rows } = await pool.query(
    `UPDATE addresses
     SET tag          = COALESCE($1, tag),
         address_text = COALESCE($2, address_text),
         is_default   = COALESCE($3, is_default),
         lat          = COALESCE($4, lat),
         lng          = COALESCE($5, lng),
         area         = COALESCE($6, area),
         city         = COALESCE($7, city),
         state        = COALESCE($8, state),
         pincode      = COALESCE($9, pincode),
         landmark     = COALESCE($10, landmark)
     WHERE id = $11 AND user_id = $12
     RETURNING *`,
    [
      normalizedTag || null,
      address_text?.trim() || null,
      is_default ?? null,
      lat !== undefined ? toNumberOrNull(lat) : null,
      lng !== undefined ? toNumberOrNull(lng) : null,
      area ?? null,
      city ?? null,
      state ?? null,
      pincode ?? null,
      landmark ?? null,
      id,
      userId,
    ]
  );

  return ok(res, rows[0], 'Address updated');
});

// ── DELETE /api/addresses/:id ────────────────────────────────
const deleteAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  const { rowCount } = await pool.query(
    `DELETE FROM addresses WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );

  if (!rowCount) return err(res, 'Address not found', 404);
  return ok(res, null, 'Address deleted');
});

module.exports = { saveAddress, getAddresses, updateAddress, deleteAddress };
