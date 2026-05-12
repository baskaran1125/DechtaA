// src/controllers/productsController.js
'use strict';

const db  = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const GST_RATES = {
  'Electronics':       18,
  'Clothing':           5,
  'Food & Beverages':   5,
  'Hardware':          12,
  'Construction':      18,
  'Furniture':         12,
  'Pharmaceuticals':    5,
  'Automobiles':       28,
  'Books & Stationery': 0,
  'Other':             18,
};

const MAX_PRODUCT_IMAGES = 3;
const MAX_IMAGE_DATA_URL_LENGTH = 2_800_000; // ~2 MB file after base64 encoding

function sanitizeProductImages(images) {
  if (!images) return null;
  if (!Array.isArray(images)) {
    throw Object.assign(new Error('images must be an array'), { statusCode: 400 });
  }

  const normalized = images
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, MAX_PRODUCT_IMAGES);

  for (const image of normalized) {
    if (image.length > MAX_IMAGE_DATA_URL_LENGTH) {
      throw Object.assign(
        new Error('One or more images are too large. Please upload smaller images.'),
        { statusCode: 413 }
      );
    }
  }

  return normalized.length ? normalized : null;
}

async function vendorCanAccessCatalog(vendorId) {
  const result = await db.query(
    `SELECT
       vp.id,
       vp.verification_status AS profile_verification_status,
       u.verification_status AS user_verification_status,
       u.is_approved
     FROM vendor_profiles vp
     LEFT JOIN users u ON u.id = vp.user_id
     WHERE vp.id = $1
     LIMIT 1`,
    [vendorId]
  ).catch(() => ({ rows: [] }));

  const row = result.rows[0];
  // If no vendor_profile row exists at all, deny access
  if (!row) return false;

  // Deny only explicitly rejected vendors
  const profileStatus = String(row.profile_verification_status || '').toLowerCase();
  const userStatus = String(row.user_verification_status || '').toLowerCase();
  if (profileStatus === 'rejected' || userStatus === 'rejected') {
    return false;
  }

  // Allow: verified, approved, pending, draft — vendors can always manage their own catalog
  // Products will be stored with status='pending' and require admin approval to go live
  return true;
}

async function ensureCatalogAccess(request, reply) {
  // Auto-create vendor_profiles row if missing (so fresh registrations always work)
  await db.query(
    `INSERT INTO vendor_profiles (id, user_id, business_name, owner_name, verification_status, created_at, updated_at)
     VALUES ($1, NULL, $2, $3, 'pending', NOW(), NOW())
     ON CONFLICT (id) DO NOTHING`,
    [
      request.vendor.id,
      request.vendor.shop_name || 'Vendor Shop',
      request.vendor.owner_name || 'Vendor Owner',
    ]
  ).catch(() => {});

  const allowed = await vendorCanAccessCatalog(request.vendor.id);
  if (!allowed) {
    reply.code(403).send({
      success: false,
      message: 'Your account has been rejected. Please contact support.',
    });
    return false;
  }
  return true;
}


// ──────────────────────────────────────────────────────────────
// GET /api/products
// ──────────────────────────────────────────────────────────────
async function getProducts(request, reply) {
  if (!(await ensureCatalogAccess(request, reply))) return;
  try {
    const result = await db.query(
      `SELECT
         p.*,
         COALESCE(p.name, p.product_name) AS name,
         COALESCE(p.product_name, p.name) AS product_name,
         COALESCE(p.stock_quantity, p.stock, 0) AS stock_quantity
       FROM products p
       WHERE p.vendor_id = $1
       ORDER BY p.created_at DESC`,
      [request.vendor.id]
    );
    return reply.send({ success: true, products: result.rows });
  } catch (err) {
    request.log.error(err);
    return reply.code(err.statusCode || 500).send({ success: false, message: err.message });
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/products
// ──────────────────────────────────────────────────────────────
async function createProduct(request, reply) {
  if (!(await ensureCatalogAccess(request, reply))) return;
  const {
    name, description, category, selling_price, mrp, stock_quantity, unit,
    weight_kg, images, gst_percent, brand, detailed_description, warranty,
  } = request.body;

  if (!name || !category || selling_price === undefined) {
    return reply.code(400).send({ success: false, message: 'name, category, selling_price are required' });
  }

  try {
    const normalizedImages = sanitizeProductImages(images);

    // products.vendor_id references vendor_profiles.id in unified schema.
    // Current auth still uses vendors.id, so ensure profile linkage exists.
    await db.query(
      `INSERT INTO vendor_profiles (id, user_id, business_name, owner_name, verification_status, created_at, updated_at)
       VALUES ($1, NULL, $2, $3, 'pending', NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [
        request.vendor.id,
        request.vendor.shop_name || request.vendor.business_name || 'Vendor Shop',
        request.vendor.owner_name || 'Vendor Owner',
      ]
    ).catch(() => {});

    const total_price = parseFloat(selling_price) + (parseFloat(selling_price) * parseFloat(gst_percent || 18) / 100);
    const stockQty = parseInt(stock_quantity || 0, 10);
    const result = await db.query(
      `INSERT INTO products
         (vendor_id, name, product_name, description, detailed_description, category, brand, warranty,
          selling_price, mrp, total_price, stock, stock_quantity, unit,
          weight_kg, images, gst_percent, is_active, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,true,'pending',NOW())
       RETURNING *`,
      [
        request.vendor.id, name, name, description || null, detailed_description || null, category, brand || null, warranty || null,
        parseFloat(selling_price), mrp ? parseFloat(mrp) : parseFloat(selling_price),
        total_price, stockQty, stockQty, unit || 'pcs',
        weight_kg ? parseFloat(weight_kg) : null,
        normalizedImages ? JSON.stringify(normalizedImages) : null,
        gst_percent !== undefined ? parseFloat(gst_percent) : 18,
      ]
    );
    return reply.code(201).send({ success: true, product: result.rows[0] });
  } catch (err) {
    request.log.error(err);
    return reply.code(err.statusCode || 500).send({ success: false, message: err.message });
  }
}

// ──────────────────────────────────────────────────────────────
// PUT /api/products/:id
// ──────────────────────────────────────────────────────────────
async function updateProduct(request, reply) {
  if (!(await ensureCatalogAccess(request, reply))) return;
  const { id } = request.params;
  const updates = {};
  const body = request.body;

  if (body.name             !== undefined) {
    updates.name = body.name;
    updates.product_name = body.name;
  }
  if (body.description      !== undefined) updates.description       = body.description;
  if (body.category         !== undefined) updates.category          = body.category;
  if (body.selling_price    !== undefined) updates.selling_price     = parseFloat(body.selling_price);
  if (body.mrp              !== undefined) updates.mrp               = parseFloat(body.mrp);
  if (body.stock_quantity   !== undefined) {
    const qty = parseInt(body.stock_quantity, 10);
    updates.stock_quantity = qty;
    updates.stock = qty;
  }
  if (body.unit             !== undefined) updates.unit              = body.unit;
  if (body.weight_kg        !== undefined) updates.weight_kg         = parseFloat(body.weight_kg);
  if (body.images           !== undefined) updates.images            = JSON.stringify(body.images);
  if (body.gst_percent      !== undefined) updates.gst_percent       = parseFloat(body.gst_percent);
  if (body.brand            !== undefined) updates.brand             = body.brand;

  // Recalculate total_price if selling_price or gst_percent changed
  if (body.selling_price !== undefined || body.gst_percent !== undefined) {
    const sp = body.selling_price !== undefined ? parseFloat(body.selling_price) : null;
    const gst = body.gst_percent !== undefined ? parseFloat(body.gst_percent) : 18;
    if (sp) updates.total_price = sp + (sp * gst / 100);
  }

  if (!Object.keys(updates).length) {
    return reply.code(400).send({ success: false, message: 'Nothing to update' });
  }
  updates.updated_at = new Date();

  try {
    const cols = Object.keys(updates);
    const vals = Object.values(updates);
    const sets = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');

    const result = await db.query(
      `UPDATE products SET ${sets}
       WHERE id = $${cols.length + 1} AND vendor_id = $${cols.length + 2}
       RETURNING *`,
      [...vals, id, request.vendor.id]
    );

    if (!result.rows[0]) return reply.code(404).send({ success: false, message: 'Product not found' });
    return reply.send({ success: true, product: result.rows[0] });
  } catch (err) {
    request.log.error(err);
    return reply.code(err.statusCode || 500).send({ success: false, message: err.message });
  }
}

// ──────────────────────────────────────────────────────────────
// PATCH /api/products/:id/toggle
// ──────────────────────────────────────────────────────────────
async function toggleProductActive(request, reply) {
  if (!(await ensureCatalogAccess(request, reply))) return;
  const { id } = request.params;
  try {
    const result = await db.query(
      `UPDATE products SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1 AND vendor_id = $2 RETURNING *`,
      [id, request.vendor.id]
    );
    if (!result.rows[0]) return reply.code(404).send({ success: false, message: 'Product not found' });
    return reply.send({ success: true, product: result.rows[0] });
  } catch (err) {
    request.log.error(err);
    return reply.code(err.statusCode || 500).send({ success: false, message: err.message });
  }
}

// ──────────────────────────────────────────────────────────────
// PATCH /api/products/:id/boost
// ──────────────────────────────────────────────────────────────
async function boostProduct(request, reply) {
  if (!(await ensureCatalogAccess(request, reply))) return;
  const { id } = request.params;
  try {
    const result = await db.query(
      `UPDATE products SET is_boosted = true, updated_at = NOW()
       WHERE id = $1 AND vendor_id = $2 RETURNING *`,
      [id, request.vendor.id]
    );
    if (!result.rows[0]) return reply.code(404).send({ success: false, message: 'Product not found' });
    return reply.send({ success: true, product: result.rows[0] });
  } catch (err) {
    request.log.error(err);
    return reply.code(err.statusCode || 500).send({ success: false, message: err.message });
  }
}

// ──────────────────────────────────────────────────────────────
// GET /api/products/gst/by-category?category=Electronics
// ──────────────────────────────────────────────────────────────
async function getGstByCategory(request, reply) {
  if (!(await ensureCatalogAccess(request, reply))) return;
  const { category } = request.query;
  const rate = GST_RATES[category] ?? GST_RATES['Other'];
  return reply.send({ success: true, category, gst_rate: rate });
}

module.exports = {
  getProducts, createProduct, updateProduct,
  toggleProductActive, boostProduct, getGstByCategory,
};
