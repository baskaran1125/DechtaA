'use strict';

const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { ok, err } = require('../utils/response');

function mapProduct(p) {
  const imageList = Array.isArray(p.images)
    ? p.images
    : (typeof p.images === 'string' && p.images.trim().startsWith('[')
      ? (() => {
          try { return JSON.parse(p.images); } catch (_) { return []; }
        })()
      : []);

  const imageUrl = p.image_url || imageList[0] || null;
  return {
    id: p.id,
    name: p.product_name,
    brand: p.brand || null,
    description: p.description || '',
    detailed_description: p.detailed_description || null,
    category: p.category || 'hardware',
    mrp: p.mrp ? Number(p.mrp) : null,
    selling_price: p.selling_price ? Number(p.selling_price) : null,
    price: p.selling_price ? Number(p.selling_price) : null,
    stock_quantity: p.stock != null ? Number(p.stock) : 0,
    unit: p.unit || 'pcs',
    images: imageList.length ? imageList : (imageUrl ? [imageUrl] : []),
    img: imageUrl,
    is_bulk: !!p.is_bulk,
    gst_percent: p.gst_percent ? Number(p.gst_percent) : 18,
    vendor_id: p.vendor_id,
    vendorName: p.owner_name || null,
    shop_name: p.business_name || null,
    vendor_location: p.business_address || null,
    vendor_lat: p.vendor_lat != null ? Number(p.vendor_lat) : null,
    vendor_lng: p.vendor_lng != null ? Number(p.vendor_lng) : null,
    created_at: p.created_at,
  };
}

const isActiveFilter = (alias = 'p') =>
  `(COALESCE(${alias}.is_active, false) = true OR COALESCE(${alias}.status_active, false) = true)`;

const isApprovedFilter = (alias = 'p') =>
  `LOWER(COALESCE(${alias}.approval_status, ${alias}.status, '')) = 'approved'`;

const BASE_SELECT = `
  SELECT
    p.*,
    COALESCE(v.owner_name, vp.owner_name) AS owner_name,
    COALESCE(v.shop_name, vp.business_name) AS business_name,
    COALESCE(v.shop_address, vp.business_address) AS business_address,
    COALESCE(v.shop_latitude, vp.business_latitude) AS vendor_lat,
    COALESCE(v.shop_longitude, vp.business_longitude) AS vendor_lng
  FROM products p
  LEFT JOIN vendor_profiles vp ON vp.id = p.vendor_id
  LEFT JOIN vendors v ON v.id = p.vendor_id
  WHERE ${isActiveFilter('p')}
    AND ${isApprovedFilter('p')}
`;

const getProducts = asyncHandler(async (req, res) => {
  const { category, search, page = 1, limit = 50 } = req.query;

  let query = BASE_SELECT;
  const vals = [];
  let idx = 1;

  if (category && category !== 'all') {
    query += ` AND LOWER(p.category) = LOWER($${idx++})`;
    vals.push(category);
  }

  if (search) {
    query += ` AND (p.product_name ILIKE $${idx} OR p.description ILIKE $${idx} OR p.brand ILIKE $${idx})`;
    vals.push(`%${search}%`);
    idx++;
  }

  query += ` ORDER BY p.created_at DESC`;
  const offset = (Number(page) - 1) * Number(limit);
  query += ` LIMIT $${idx++} OFFSET $${idx++}`;
  vals.push(Number(limit), offset);

  const { rows } = await pool.query(query, vals);
  return ok(res, rows.map(mapProduct));
});

const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rows } = await pool.query(`${BASE_SELECT} AND p.id = $1`, [id]);
  if (!rows.length) return err(res, 'Product not found', 404);
  return ok(res, mapProduct(rows[0]));
});

const getCategories = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT DISTINCT LOWER(category) AS category, COUNT(*) AS count
     FROM products p
     WHERE ${isActiveFilter('p')} AND ${isApprovedFilter('p')}
     GROUP BY LOWER(category)
     ORDER BY count DESC`
  );
  return ok(res, rows);
});

const getGroupedProducts = asyncHandler(async (req, res) => {
  const perCat = Math.min(Number(req.query.limit) || 12, 30);
  const { rows } = await pool.query(`${BASE_SELECT} ORDER BY p.created_at DESC LIMIT 500`);

  const map = new Map();
  for (const row of rows) {
    const cat = (row.category || 'other').toLowerCase();
    if (!map.has(cat)) map.set(cat, []);
    if (map.get(cat).length < perCat) map.get(cat).push(mapProduct(row));
  }

  const grouped = Array.from(map.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .map(([category, products]) => ({
      category,
      display_name: category.charAt(0).toUpperCase() + category.slice(1),
      count: products.length,
      products,
    }));

  return ok(res, grouped);
});

const getNearbyProducts = asyncHandler(async (req, res) => {
  // Unified schema currently stores vendor business address text, not mandatory lat/lng.
  // Return approved active products; frontend can still render.
  const { rows } = await pool.query(`${BASE_SELECT} ORDER BY p.created_at DESC LIMIT 200`);
  return ok(res, rows.map(mapProduct));
});

const getSearchResults = asyncHandler(async (req, res) => {
  const keyword = req.query.q?.trim() || '';
  if (!keyword) return ok(res, { suggested_categories: [], products: [] });

  const catRes = await pool.query(
    `SELECT DISTINCT category
     FROM products
     WHERE category ILIKE $1
     LIMIT 3`,
    [`%${keyword}%`]
  );

  const prodRes = await pool.query(
    `SELECT p.*, 
            COALESCE(v.owner_name, vp.owner_name) AS owner_name, 
            COALESCE(v.shop_name, vp.business_name) AS business_name, 
            COALESCE(v.shop_address, vp.business_address) AS business_address
     FROM products p
     LEFT JOIN vendor_profiles vp ON vp.id = p.vendor_id
     LEFT JOIN vendors v ON v.id = p.vendor_id
     WHERE ${isActiveFilter('p')}
       AND ${isApprovedFilter('p')}
       AND (p.product_name ILIKE $1 OR p.category ILIKE $1 OR p.description ILIKE $1)
     ORDER BY p.created_at DESC
     LIMIT 6`,
    [`%${keyword}%`]
  );

  return ok(res, {
    suggested_categories: catRes.rows.map((r) => ({
      id: r.category,
      name: r.category.charAt(0).toUpperCase() + r.category.slice(1),
    })),
    products: prodRes.rows.map(mapProduct),
  });
});

const getActiveVendors = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT DISTINCT 
            COALESCE(v.id, vp.id) AS id, 
            COALESCE(v.shop_name, vp.business_name) AS shop_name, 
            COALESCE(v.owner_name, vp.owner_name) AS owner_name, 
            COALESCE(v.shop_address, vp.business_address) AS location
     FROM vendor_profiles vp
     LEFT JOIN vendors v ON v.id = vp.id
     INNER JOIN products p ON p.vendor_id = vp.id
     WHERE ${isApprovedFilter('p')} AND ${isActiveFilter('p')}
     ORDER BY shop_name`
  );
  return ok(res, rows);
});

const getVendorProducts = asyncHandler(async (req, res) => {
  const { vendorId } = req.params;
  const { rows } = await pool.query(
    `${BASE_SELECT} AND p.vendor_id = $1 ORDER BY p.created_at DESC`,
    [vendorId]
  );
  return ok(res, rows.map(mapProduct));
});

module.exports = {
  getProducts,
  getNearbyProducts,
  getProductById,
  getCategories,
  getGroupedProducts,
  getSearchResults,
  getActiveVendors,
  getVendorProducts,
};

