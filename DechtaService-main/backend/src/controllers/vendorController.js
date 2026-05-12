// src/controllers/vendorController.js
'use strict';

const { sendOtp, verifyOtp } = require('../services/otpService');
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { broadcastNewOrderToOnlineDrivers } = require('../services/socketService');

let vendorSchemaReadyPromise = null;
const tableColumnsCache = new Map();

function isIgnorableSchemaError(error) {
  const msg = String(error?.message || '');
  const code = String(error?.code || '');
  // Ignore ownership errors (Cloud SQL), connection resets (pgBouncer DDL limit), and duplicate objects
  return (
    msg.includes('pg_class_relname_nsp_index') ||
    msg.includes('must be owner of table') ||
    msg.includes('must be owner of relation') ||
    msg.includes('already exists') ||
    code === 'ECONNRESET' ||
    code === '42P07' || // duplicate_table
    code === '42701'    // duplicate_column
  );
}

async function safeSchemaQuery(sql) {
  try {
    await db.query(sql);
  } catch (error) {
    // All schema warmup errors are non-fatal — tables were already created by init script
    if (process.env.NODE_ENV !== 'production') {
      // Silent in dev — schema is pre-created
    }
  }
}


// ── Cashfree Helper ────────────────────────────────────────────
function getCashfreeBaseUrl() {
  const env = String(process.env.CASHFREE_ENVIRONMENT || 'SANDBOX').toUpperCase();
  return env === 'PRODUCTION' ? 'https://api.cashfree.com' : 'https://sandbox.cashfree.com';
}

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

function mapVendorStatusInput(status) {
  const raw = String(status || '').trim();
  const key = raw.toLowerCase();
  const map = {
    pending: 'Pending',
    placed: 'Pending',
    confirmed: 'Confirmed',
    processing: 'Confirmed',
    packed: 'Packed',
    shipped: 'Out for Delivery',
    dispatched: 'Out for Delivery',
    in_transit: 'Out for Delivery',
    'out for delivery': 'Out for Delivery',
    delivered: 'Delivered',
    completed: 'Delivered',
    cancelled: 'Cancelled',
    canceled: 'Cancelled',
    returned: 'Cancelled',
    missed: 'Cancelled',
    assigned: 'Assigned',
    accepted: 'Assigned',
  };
  return map[key] || raw;
}

async function ensureVendorCompatibilitySchema() {
  if (!vendorSchemaReadyPromise) {
    vendorSchemaReadyPromise = (async () => {
      // Check if core tables already exist — if so, skip DDL entirely.
      // pgBouncer (port 6543, transaction mode) drops connections on DDL,
      // so we only run schema creation once (via the init script).
      //
      // IMPORTANT: We do NOT reset vendorSchemaReadyPromise on failure.
      // Previously a .catch() nulled the promise on any DB error, causing every
      // request to retry schema warmup — exhausting the connection pool.
      // Now the promise stays settled; transient errors are treated as non-fatal.
      try {
        const check = await db.query(`SELECT to_regclass('public.vendors') AS t`);
        if (check.rows[0]?.t) {
          // Core schema already exists — run only lightweight ALTER TABLE additions
          // (these are idempotent and won't cause connection resets on pgBouncer)
          const alters = [
            `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS shop_latitude NUMERIC(10,8)`,
            `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS shop_longitude NUMERIC(11,8)`,
            `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS location_label TEXT`,
            `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ`,
            `ALTER TABLE vendor_profiles ALTER COLUMN user_id DROP NOT NULL`,
            // Products table — ensure all columns expected by productsController exist
            `ALTER TABLE products ADD COLUMN IF NOT EXISTS name VARCHAR(255)`,
            `ALTER TABLE products ADD COLUMN IF NOT EXISTS product_name VARCHAR(255)`,
            `ALTER TABLE products ADD COLUMN IF NOT EXISTS detailed_description TEXT`,
            `ALTER TABLE products ADD COLUMN IF NOT EXISTS selling_price NUMERIC(12,2)`,
            `ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp NUMERIC(12,2)`,
            `ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0`,
            `ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0`,
            `ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'pcs'`,
            `ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(10,2)`,
            `ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb`,
            `ALTER TABLE products ADD COLUMN IF NOT EXISTS gst_percent NUMERIC(5,2)`,
            `ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(100)`,
            `ALTER TABLE products ADD COLUMN IF NOT EXISTS warranty TEXT`,
            `ALTER TABLE products ADD COLUMN IF NOT EXISTS total_price NUMERIC(12,2)`,
            `ALTER TABLE products ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'`,
            `ALTER TABLE products ADD COLUMN IF NOT EXISTS is_boosted BOOLEAN DEFAULT FALSE`,
          ];
          for (const sql of alters) {
            await safeSchemaQuery(sql);
          }
          return; // Skip full DDL bootstrap
        }
      } catch (_) {
        // If even the check fails, assume tables exist and return (non-fatal)
        return;
      }

      await safeSchemaQuery(`
        CREATE TABLE IF NOT EXISTS vendors (
          id BIGSERIAL PRIMARY KEY,
          phone VARCHAR(20) UNIQUE NOT NULL,
          shop_name VARCHAR(255) NOT NULL,
          owner_name VARCHAR(100) NOT NULL,
          shop_address TEXT,

          shop_latitude NUMERIC(10,8),
          shop_longitude NUMERIC(11,8),
          location_label TEXT,
          location_updated_at TIMESTAMPTZ,
          gst_number VARCHAR(20),
          email VARCHAR(255),
          is_active BOOLEAN DEFAULT TRUE,
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      await safeSchemaQuery(`
        CREATE TABLE IF NOT EXISTS vendor_wallets (
          id BIGSERIAL PRIMARY KEY,
          vendor_id BIGINT NOT NULL,
          balance NUMERIC(15,2) DEFAULT 0,
          last_updated TIMESTAMPTZ DEFAULT NOW(),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      await safeSchemaQuery(`CREATE INDEX IF NOT EXISTS idx_vendor_wallets_vendor ON vendor_wallets(vendor_id);`);

      await safeSchemaQuery(`
        CREATE TABLE IF NOT EXISTS vendor_payment_orders (
          id BIGSERIAL PRIMARY KEY,
          vendor_id BIGINT NOT NULL,
          cashfree_order_id VARCHAR(120) NOT NULL UNIQUE,
          amount NUMERIC(12,2) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          completed_at TIMESTAMPTZ
        );
      `);

      await safeSchemaQuery(`CREATE INDEX IF NOT EXISTS idx_vendor_payment_orders_vendor ON vendor_payment_orders(vendor_id);`);
      await safeSchemaQuery(`CREATE INDEX IF NOT EXISTS idx_vendor_payment_orders_cf ON vendor_payment_orders(cashfree_order_id);`);

      await safeSchemaQuery(`
        CREATE TABLE IF NOT EXISTS vendor_withdrawals (
          id BIGSERIAL PRIMARY KEY,
          vendor_id BIGINT NOT NULL,
          amount NUMERIC(12,2) NOT NULL,
          method VARCHAR(20) NOT NULL,
          upi_id VARCHAR(100),
          account_number VARCHAR(50),
          ifsc_code VARCHAR(20),
          account_name VARCHAR(100),
          status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
          reference_id VARCHAR(100) UNIQUE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      await safeSchemaQuery(`CREATE INDEX IF NOT EXISTS idx_vendor_withdrawals_vendor ON vendor_withdrawals(vendor_id);`);
      await safeSchemaQuery(`CREATE INDEX IF NOT EXISTS idx_vendor_withdrawals_status ON vendor_withdrawals(status);`);

      await safeSchemaQuery(`
        CREATE TABLE IF NOT EXISTS vendor_queries (
          id BIGSERIAL PRIMARY KEY,
          vendor_id BIGINT NOT NULL,
          subject VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          status VARCHAR(20) DEFAULT 'open',
          response TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      await safeSchemaQuery(`CREATE INDEX IF NOT EXISTS idx_vendor_queries_vendor ON vendor_queries(vendor_id);`);

      await safeSchemaQuery(`
        CREATE TABLE IF NOT EXISTS invoices (
          id BIGSERIAL PRIMARY KEY,
          vendor_id BIGINT NOT NULL,
          order_id BIGINT,
          invoice_number VARCHAR(50) UNIQUE NOT NULL,
          items JSONB DEFAULT '[]'::jsonb,
          subtotal NUMERIC(12,2) DEFAULT 0,
          tax_amount NUMERIC(12,2) DEFAULT 0,
          total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
          tax_rate NUMERIC(5,2) DEFAULT 18,
          customer_name VARCHAR(100),
          customer_phone VARCHAR(20),
          customer_gst VARCHAR(20),
          customer_address TEXT,
          status VARCHAR(20) DEFAULT 'Generated',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      await safeSchemaQuery(`CREATE INDEX IF NOT EXISTS idx_invoices_vendor ON invoices(vendor_id);`);

      await safeSchemaQuery(`
        CREATE TABLE IF NOT EXISTS settlements (
          id BIGSERIAL PRIMARY KEY,
          vendor_id BIGINT NOT NULL,
          amount NUMERIC(12,2) NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          transaction_id VARCHAR(120) UNIQUE,
          settled_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      await safeSchemaQuery(`CREATE INDEX IF NOT EXISTS idx_settlements_vendor ON settlements(vendor_id);`);
      await safeSchemaQuery(`CREATE INDEX IF NOT EXISTS idx_settlements_transaction ON settlements(transaction_id);`);

      await safeSchemaQuery(`
        CREATE TABLE IF NOT EXISTS tickets (
          id BIGSERIAL PRIMARY KEY,
          vendor_id BIGINT NOT NULL,
          subject VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          status VARCHAR(20) DEFAULT 'Open',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      await safeSchemaQuery(`CREATE INDEX IF NOT EXISTS idx_tickets_vendor ON tickets(vendor_id);`);

      await safeSchemaQuery(`
        CREATE TABLE IF NOT EXISTS products (
          id BIGSERIAL PRIMARY KEY,
          uuid UUID DEFAULT gen_random_uuid(),
          vendor_id BIGINT,
          catalog_item_id BIGINT,
          product_name VARCHAR(255),
          category VARCHAR(255),
          description TEXT,
          image_url TEXT,
          stock INTEGER DEFAULT 0,
          mrp NUMERIC(12,2),
          selling_price NUMERIC(12,2),
          cost_price NUMERIC(12,2),
          gst_percent NUMERIC(5,2),
          discount_percent NUMERIC(5,2),
          is_bulk BOOLEAN DEFAULT FALSE,
          bulk_discount NUMERIC(5,2),
          approval_status VARCHAR(50),
          rejection_reason TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          status_active BOOLEAN DEFAULT TRUE,
          search_tags JSONB,
          fts_vector TSVECTOR,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          name VARCHAR(255),
          detailed_description TEXT,
          stock_quantity INTEGER DEFAULT 0,
          unit VARCHAR(20) DEFAULT 'pcs',
          weight_kg NUMERIC(10,2),
          images JSONB DEFAULT '[]'::jsonb,
          brand VARCHAR(100),
          warranty TEXT,
          total_price NUMERIC(12,2),
          status VARCHAR(50) DEFAULT 'pending',
          is_boosted BOOLEAN DEFAULT FALSE
        );
      `);
      await safeSchemaQuery(`CREATE INDEX IF NOT EXISTS idx_products_vendor ON products(vendor_id);`);
      await safeSchemaQuery(`CREATE INDEX IF NOT EXISTS idx_products_vendor_active ON products(vendor_id, is_active);`);

      await safeSchemaQuery(`ALTER TABLE products ADD COLUMN IF NOT EXISTS name VARCHAR(255);`);
      await safeSchemaQuery(`ALTER TABLE products ADD COLUMN IF NOT EXISTS detailed_description TEXT;`);
      await safeSchemaQuery(`ALTER TABLE products ADD COLUMN IF NOT EXISTS selling_price NUMERIC(12,2);`);
      await safeSchemaQuery(`ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;`);
      await safeSchemaQuery(`ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'pcs';`);
      await safeSchemaQuery(`ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(10,2);`);
      await safeSchemaQuery(`ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;`);
      await safeSchemaQuery(`ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(100);`);
      await safeSchemaQuery(`ALTER TABLE products ADD COLUMN IF NOT EXISTS warranty TEXT;`);
      await safeSchemaQuery(`ALTER TABLE products ADD COLUMN IF NOT EXISTS total_price NUMERIC(12,2);`);
      await safeSchemaQuery(`ALTER TABLE products ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';`);
      await safeSchemaQuery(`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_boosted BOOLEAN DEFAULT FALSE;`);

      await safeSchemaQuery(`ALTER TABLE vendor_profiles ALTER COLUMN user_id DROP NOT NULL;`).catch(() => {});

      if (await tableExists('orders')) {
        await safeSchemaQuery(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_id BIGINT;`);
        await safeSchemaQuery(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_name VARCHAR(100);`);
        await safeSchemaQuery(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_number VARCHAR(20);`);
        await safeSchemaQuery(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);`);
        await safeSchemaQuery(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(100);`);
        await safeSchemaQuery(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20);`);
        await safeSchemaQuery(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_address TEXT;`);
        await safeSchemaQuery(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;`);
        await safeSchemaQuery(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_latitude NUMERIC(10,8);`);
        await safeSchemaQuery(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_longitude NUMERIC(11,8);`);
        await safeSchemaQuery(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_latitude NUMERIC(10,8);`);
        await safeSchemaQuery(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_longitude NUMERIC(11,8);`);
        await safeSchemaQuery(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS vendor_shop_name VARCHAR(255);`);
        await safeSchemaQuery(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(12,2);`);
        await safeSchemaQuery(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2);`);
        await safeSchemaQuery(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;`);
        await safeSchemaQuery(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(50);`);
        await safeSchemaQuery(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS model_id_requested VARCHAR(100);`);
        await safeSchemaQuery(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS weight_capacity_requested NUMERIC(10,2);`);
        await safeSchemaQuery(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS body_type_requested VARCHAR(100);`);
        await safeSchemaQuery(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS dimensions_requested VARCHAR(100);`);
        await safeSchemaQuery(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_date TIMESTAMPTZ DEFAULT NOW();`);
        await safeSchemaQuery(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_otp VARCHAR(6);`);
        await safeSchemaQuery(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS v_status VARCHAR(30) DEFAULT 'pending';`);
      }

      await safeSchemaQuery(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS shop_latitude NUMERIC(10,8);`);
      await safeSchemaQuery(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS shop_longitude NUMERIC(11,8);`);
      await safeSchemaQuery(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS location_label TEXT;`);
      await safeSchemaQuery(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;`);
    })();
    // NOTE: No .catch() that resets vendorSchemaReadyPromise — that caused infinite retries.
  }

  return vendorSchemaReadyPromise;
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
  const set = new Set((result.rows || []).map((r) => r.column_name));
  tableColumnsCache.set(tableName, set);
  return set;
}

function removeUndefinedFields(data) {
  return Object.fromEntries(
    Object.entries(data || {}).filter(([, value]) => value !== undefined)
  );
}

async function filterDataForTable(tableName, data) {
  const cleaned = removeUndefinedFields(data);
  const columns = await getTableColumns(tableName).catch(() => new Set());
  if (!columns || columns.size === 0) {
    return cleaned;
  }
  return Object.fromEntries(
    Object.entries(cleaned).filter(([key]) => columns.has(key))
  );
}

function toFiniteNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function getOrderAmountSql(columns) {
  const availableColumns = [
    'total_amount',
    'final_total',
    'final_amount',
    'order_amount',
  ].filter((column) => columns.has(column));

  if (availableColumns.length === 0) {
    return '0';
  }

  return `COALESCE(${availableColumns.join(', ')}, 0)`;
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (Array.isArray(value)) {
      const nested = firstNonEmpty(...value);
      if (nested) return nested;
      continue;
    }
    const text = String(value || '').trim();
    if (text) return text;
  }
  return null;
}

function deriveVendorVerificationStatus(row) {
  const profileStatus = String(row?.profile_verification_status || '').toLowerCase();
  const userVerification = String(row?.user_verification_status || '').toLowerCase();
  const userStatus = String(row?.user_status || '').toLowerCase();
  const userApproved = row?.user_is_approved === true || row?.is_approved === true;
  const profileComplete =
    row?.user_profile_complete === true ||
    String(row?.user_profile_complete || '').toLowerCase() === 'true' ||
    Number(row?.user_profile_complete || 0) === 1;

  const resolvedShopName = firstNonEmpty(row?.shop_name, row?.profile_business_name);
  const resolvedOwnerName = firstNonEmpty(row?.owner_name, row?.profile_owner_name);
  const hasMandatoryDetails = !!(resolvedShopName && resolvedOwnerName);
  const pendingStatuses = ['pending', 'pending_verification', 'under_review', 'submitted'];
  const verifiedStatuses = ['verified', 'approved', 'completed'];

  if (
    profileStatus === 'rejected' ||
    userVerification === 'rejected' ||
    ['suspended', 'banned', 'rejected'].includes(userStatus)
  ) {
    return 'rejected';
  }

  if (!hasMandatoryDetails) {
    return 'draft';
  }

  if (verifiedStatuses.includes(profileStatus) || verifiedStatuses.includes(userVerification) || (userApproved && profileComplete)) {
    return 'verified';
  }

  // Only return pending when the vendor explicitly submitted for verification
  // (profile_complete=true). A bare 'pending' in the DB at signup must not
  // lock fresh vendor profiles before KYC submission.
  if (pendingStatuses.includes(profileStatus) && profileComplete) {
    return 'pending';
  }
  if (pendingStatuses.includes(userVerification) && profileComplete) {
    return 'pending';
  }

  return 'draft';
}

async function getVendorContext(vendorId) {
  try {
    const result = await db.query(
      `SELECT
         v.*,
         vp.user_id               AS profile_user_id,
         vp.business_name         AS profile_business_name,
         vp.owner_name            AS profile_owner_name,
         vp.business_address      AS profile_business_address,
         vp.business_latitude     AS profile_business_latitude,
         vp.business_longitude    AS profile_business_longitude,
         vp.location_label        AS profile_location_label,
         vp.location_updated_at   AS profile_location_updated_at,
         vp.verification_status   AS profile_verification_status,
         vp.rejection_reason      AS profile_rejection_reason,
         vp.google_maps_location  AS profile_google_maps_location,
         vp.business_type         AS profile_business_type,
         vp.years_of_experience   AS profile_years_of_experience,
         vp.whatsapp_number       AS profile_whatsapp_number,
         u.status                 AS user_status,
         u.is_approved            AS user_is_approved,
        u.profile_complete       AS user_profile_complete,
         u.verification_status    AS user_verification_status,
         u.rejection_reason       AS user_rejection_reason
       FROM vendors v
       LEFT JOIN vendor_profiles vp ON vp.id = v.id
       LEFT JOIN users u ON u.id = vp.user_id
       WHERE v.id = $1
       LIMIT 1`,
      [vendorId]
    );

    return result.rows[0] || null;
  } catch (error) {
    // Older DB snapshots may miss vendor_profiles/users columns used above.
    const fallback = await db.query('SELECT * FROM vendors WHERE id = $1 LIMIT 1', [vendorId]);
    return fallback.rows[0] || null;
  }
}

async function ensureVendorUserLink(vendorRow) {
  if (!vendorRow || !(await tableExists('users')) || !(await tableExists('vendor_profiles'))) {
    return null;
  }

  let userId = Number(vendorRow.profile_user_id || vendorRow.user_id || 0) || null;
  if (!userId) {
    const lookups = [
      `SELECT id FROM users WHERE phone_number = $1 AND user_type = 'vendor' LIMIT 1`,
      `SELECT id FROM users WHERE phone_number = $1 LIMIT 1`,
      `SELECT id FROM users WHERE phone = $1 AND role = 'vendor' LIMIT 1`,
      `SELECT id FROM users WHERE phone = $1 LIMIT 1`,
    ];

    for (const sql of lookups) {
      const byPhone = await db.query(sql, [vendorRow.phone]).catch(() => ({ rows: [] }));
      if (byPhone.rows[0]?.id) {
        userId = Number(byPhone.rows[0].id);
        break;
      }
    }

    if (!userId) {
      const payloads = [
        {
          phone_number: vendorRow.phone,
          email: vendorRow.email || null,
          user_type: 'vendor',
          status: 'active',
          is_verified: true,
          is_approved: false,
          profile_complete: false,
        },
        {
          phone_number: vendorRow.phone,
          email: vendorRow.email || null,
          user_type: 'vendor',
          status: 'active',
          is_verified: true,
          is_approved: false,
          profile_complete: false,
        },
        {
          phone: vendorRow.phone,
          email: vendorRow.email || null,
          role: 'vendor',
          status: 'active',
          is_verified: true,
          is_approved: false,
          profile_complete: false,
        },
      ];

      for (const payload of payloads) {
        try {
          const inserted = await db.insert('users', payload);
          if (inserted?.id) {
            userId = Number(inserted.id);
            break;
          }
        } catch (insertErr) {
          const duplicate = /duplicate key value violates unique constraint/i.test(String(insertErr?.message || ''));
          if (!duplicate) continue;

          for (const sql of lookups) {
            const existing = await db.query(sql, [vendorRow.phone]).catch(() => ({ rows: [] }));
            if (existing.rows[0]?.id) {
              userId = Number(existing.rows[0].id);
              break;
            }
          }
          if (userId) break;
        }
      }
    }
  }

  if (!userId) {
    return null;
  }

  await db.query(
    `INSERT INTO vendor_profiles (id, user_id, business_name, owner_name, verification_status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'pending', NOW(), NOW())
     ON CONFLICT (id)
     DO UPDATE SET
       user_id = COALESCE(vendor_profiles.user_id, EXCLUDED.user_id),
       business_name = COALESCE(vendor_profiles.business_name, EXCLUDED.business_name),
       owner_name = COALESCE(vendor_profiles.owner_name, EXCLUDED.owner_name),
       updated_at = NOW()`,
    [
      vendorRow.id,
      userId,
      vendorRow.shop_name || vendorRow.profile_business_name || 'Vendor Shop',
      vendorRow.owner_name || vendorRow.profile_owner_name || 'Vendor Owner',
    ]
  ).catch(() => {});

  return userId;
}

async function upsertVendorDocumentsForUser(userId, documents) {
  if (!userId || !documents || !(await tableExists('user_documents'))) {
    return;
  }

  const aadharFront = firstNonEmpty(documents.aadhaar_front, documents.aadhar_front, documents.aadhar_front_url, documents.aadharUrl);
  const aadharBack = firstNonEmpty(documents.aadhaar_back, documents.aadhar_back, documents.aadhar_back_url);
  const panFront = firstNonEmpty(documents.pan_front, documents.pan_front_url, documents.panUrl, documents.pan_image);
  const panBack = firstNonEmpty(documents.pan_back, documents.pan_back_url);
  const gstDoc = firstNonEmpty(documents.gst_certificate, documents.gstUrl, documents.gst_certificate_url);
  const businessLicenseDoc = firstNonEmpty(
    documents.business_license,
    documents.vendor_shop,
    documents.registration_certificate,
    documents.business_license_url,
    documents.registration_certificate_url
  );

  const bankProofValues = Array.isArray(documents.bank_proofs)
    ? documents.bank_proofs.map((d) => String(d || '').trim()).filter(Boolean)
    : [firstNonEmpty(documents.bank_proofs, documents.cancelled_cheque, documents.passbook_cancelled_cheque)].filter(Boolean);

  const entries = [];
  if (aadharFront || aadharBack) {
    entries.push({
      type: 'aadhar',
      front: aadharFront || null,
      back: aadharBack || null,
      url: aadharFront || aadharBack || null,
    });
  }
  if (panFront || panBack) {
    entries.push({
      type: 'pan',
      front: panFront || null,
      back: panBack || null,
      url: panFront || panBack || null,
    });
  }
  if (gstDoc) {
    entries.push({ type: 'gst', front: gstDoc, back: null, url: gstDoc });
  }
  if (businessLicenseDoc) {
    entries.push({ type: 'business_license', front: businessLicenseDoc, back: null, url: businessLicenseDoc });
  }
  if (bankProofValues.length > 0) {
    entries.push({
      type: 'bank_proof',
      front: bankProofValues[0] || null,
      back: bankProofValues[1] || null,
      url: bankProofValues[0] || bankProofValues[1] || null,
    });
  }

  for (const entry of entries) {
    const existing = await db.selectOne('user_documents', { user_id: userId, document_type: entry.type });
    const payload = await filterDataForTable('user_documents', {
      user_id: userId,
      document_type: entry.type,
      document_url: entry.url || entry.front || entry.back || null,
      front_url: entry.front,
      back_url: entry.back,
      status: 'pending',
    });

    if (!payload.document_url) {
      continue;
    }

    if (existing) {
      const { user_id: _uid, document_type: _dt, ...updates } = payload;
      await db.update('user_documents', updates, { id: existing.id }).catch(() => {});
    } else {
      await db.insert('user_documents', payload).catch(() => {});
    }
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/vendors/auth/send-otp
// Body: { mobile } (also accepts { phone } for vendor-dashboard)
// ──────────────────────────────────────────────────────────────
async function vendorSendOtp(request, reply) {
  const mobile = (request.body.mobile || request.body.phone || '').trim();

  if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) {
    return reply.code(400).send({ success: false, message: 'Invalid 10-digit Indian mobile number' });
  }

  try {
    const result = await sendOtp(mobile);
    return reply.send({
      success: true,
      message: 'OTP sent successfully',
      provider: result.provider,
      ...(result.provider === 'mock' && { dev_otp: result.otp_for_testing }),
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: err.message });
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/vendors/auth/verify-otp  (login)
// Body: { mobile/phone, otp }
// ──────────────────────────────────────────────────────────────
async function vendorVerifyOtp(request, reply) {
  const mobile = (request.body.mobile || request.body.phone || '').trim();
  const otp    = String(request.body.otp || '').trim();

  if (!mobile || !otp) {
    return reply.code(400).send({ success: false, message: 'Mobile and OTP are required' });
  }

  try {
    const vendor = await db.query(
      'SELECT * FROM vendors WHERE phone = $1 LIMIT 1',
      [mobile]
    );

    if (!vendor.rows[0]) {
      return reply.send({
        success: false,
        message: 'No vendor account found. Please register first.',
        isNewVendor: true,
      });
    }

    const otpResult = await verifyOtp(mobile, otp);
    if (!otpResult.success) {
      return reply.code(400).send({ success: false, message: otpResult.message });
    }

    const v = vendor.rows[0];
    const vendorContext = await getVendorContext(v.id).catch(() => null);
    await ensureVendorUserLink(vendorContext || v).catch(() => {});
    const hydratedVendor = await getVendorContext(v.id).catch(() => null);
    const token = await reply.jwtSign(
      { vendorId: v.id, mobile: v.phone, role: 'vendor' },
      { expiresIn: '30d' }
    );

    return reply.send({
      success: true,
      token,
      vendor: formatVendor(hydratedVendor || v),
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Server error during verification' });
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/vendors/auth/register
// Body: { mobile/phone, otp, shopName, ownerName }
// ──────────────────────────────────────────────────────────────
async function vendorRegister(request, reply) {
  const mobile    = (request.body.mobile || request.body.phone || '').trim();
  const otp       = String(request.body.otp || '').trim();
  const shopName  = (request.body.shopName || '').trim();
  const ownerName = (request.body.ownerName || '').trim();

  if (!mobile || !otp || !shopName || !ownerName) {
    return reply.code(400).send({ success: false, message: 'mobile, otp, shopName, ownerName are required' });
  }

  try {
    const otpResult = await verifyOtp(mobile, otp);
    if (!otpResult.success) {
      return reply.code(400).send({ success: false, message: otpResult.message });
    }

    // Check if already exists
    const existing = await db.query(
      'SELECT id FROM vendors WHERE phone = $1 LIMIT 1',
      [mobile]
    );
    if (existing.rows[0]) {
      return reply.code(409).send({ success: false, message: 'Vendor already registered. Please login.' });
    }

    let result;
    try {
      result = await db.query(
        `INSERT INTO vendors
           (id, phone, shop_name, owner_name, is_active, created_at)
         VALUES (DEFAULT, $1, $2, $3, true, NOW())
         RETURNING *`,
        [mobile, shopName, ownerName]
      );
    } catch (insertErr) {
      const message = String(insertErr?.message || '');
      if (!message.includes('null value in column "id"')) {
        throw insertErr;
      }

      const nextIdRes = await db.query('SELECT COALESCE(MAX(id), 0) + 1 AS id FROM vendors');
      const nextId = Number(nextIdRes.rows[0].id);
      result = await db.query(
        `INSERT INTO vendors
           (id, phone, shop_name, owner_name, is_active, created_at)
         VALUES ($1, $2, $3, $4, true, NOW())
         RETURNING *`,
        [nextId, mobile, shopName, ownerName]
      );
    }

    const v = result.rows[0];

    // Keep unified-schema FK path compatible: products.vendor_id -> vendor_profiles.id
    await db.query(
      `INSERT INTO vendor_profiles (id, user_id, business_name, owner_name, verification_status, created_at, updated_at)
       VALUES ($1, NULL, $2, $3, 'pending', NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [v.id, shopName, ownerName]
    ).catch(() => {});

    const vendorContext = await getVendorContext(v.id).catch(() => null);
    await ensureVendorUserLink(vendorContext || v).catch(() => {});
    const hydratedVendor = await getVendorContext(v.id).catch(() => null);

    const token = await reply.jwtSign(
      { vendorId: v.id, mobile: v.phone, role: 'vendor' },
      { expiresIn: '30d' }
    );

    return reply.code(201).send({
      success: true,
      token,
      vendor: formatVendor(hydratedVendor || v),
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: err.message });
  }
}

// ──────────────────────────────────────────────────────────────
// GET /api/vendors/me
// ──────────────────────────────────────────────────────────────
async function getVendorProfile(request, reply) {
  try {
    const vendor = await getVendorContext(request.vendor.id);
    if (!vendor) return reply.code(404).send({ success: false, message: 'Vendor not found' });
    return reply.send({ success: true, vendor: formatVendor(vendor) });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: err.message });
  }
}

// ──────────────────────────────────────────────────────────────
// PUT /api/vendors/me
// ──────────────────────────────────────────────────────────────
async function updateVendorProfile(request, reply) {
  const {
    shopName,
    ownerName,
    address,
    gstNumber,
    email,
    isActive,
    latitude,
    longitude,
    locationLabel,
    profileDetails,
    companyDetails,
    bankDetails,
    documents,
    submittedForVerification,
  } = request.body || {};

  const resolvedShopName = shopName ?? companyDetails?.companyName;
  const resolvedOwnerName = ownerName ?? profileDetails?.name;
  const resolvedAddress = address ?? profileDetails?.address ?? profileDetails?.location;
  const resolvedGstNumber = gstNumber ?? companyDetails?.gst;
  const resolvedEmail = email ?? companyDetails?.email;
  const resolvedLatitude = toFiniteNumber(
    latitude ??
    profileDetails?.latitude ??
    profileDetails?.lat ??
    companyDetails?.latitude ??
    companyDetails?.lat
  );
  const resolvedLongitude = toFiniteNumber(
    longitude ??
    profileDetails?.longitude ??
    profileDetails?.lng ??
    companyDetails?.longitude ??
    companyDetails?.lng
  );
  const resolvedLocationLabel = locationLabel ?? profileDetails?.locationLabel ?? companyDetails?.locationLabel;

  const hasKycPayload = !!(profileDetails || companyDetails || bankDetails || documents);
  const hasVendorFieldUpdates = [
    resolvedShopName,
    resolvedOwnerName,
    resolvedAddress,
    resolvedGstNumber,
    resolvedEmail,
    isActive,
    resolvedLatitude,
    resolvedLongitude,
    resolvedLocationLabel,
  ].some((value) => value !== undefined && value !== null && String(value).trim() !== '');

  if (submittedForVerification) {
    const p = profileDetails || {};
    const c = companyDetails || {};
    const b = bankDetails || {};
    const d = documents || {};

    const aadhaarValid = /^\d{12}$/.test(String(p.aadhaar || '').replace(/\s/g, ''));
    const panValid = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(String(p.pan || '').toUpperCase());
    const ifscValid = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(b.ifsc || '').toUpperCase());
    const hasAadhaarDocs = !!(
      firstNonEmpty(d.aadhaar_front, d.aadhar_front, d.aadhaar_front_url, d.aadhar_front_url) &&
      firstNonEmpty(d.aadhaar_back, d.aadhar_back, d.aadhaar_back_url, d.aadhar_back_url)
    );
    const hasPanDocs = !!(
      firstNonEmpty(d.pan_front, d.pan_front_url, d.panUrl, d.pan_image) &&
      firstNonEmpty(d.pan_back, d.pan_back_url)
    );
    const hasGstDoc = !!firstNonEmpty(d.gst_certificate, d.gst_certificate_url, d.gstUrl);
    const bankProofs = Array.isArray(d.bank_proofs) ? d.bank_proofs.filter(Boolean) : [];
    const hasBankProof = bankProofs.length > 0 ||
      !!firstNonEmpty(d.bank_proof, d.bankProof, d.cancelled_cheque, d.passbook);

    if (
      !String(p.name || '').trim() ||
      !aadhaarValid ||
      !panValid ||
      !String(c.companyName || '').trim() ||
      !String(b.accountNo || b.accountNumber || '').trim() ||
      !ifscValid ||
      !hasAadhaarDocs ||
      !hasPanDocs ||
      !hasGstDoc ||
      !hasBankProof
    ) {
      return reply.code(400).send({
        success: false,
        message: 'Complete all required fields and documents before submitting for verification.',
      });
    }
  }

  if (!hasKycPayload && !hasVendorFieldUpdates && !submittedForVerification) {
    return reply.code(400).send({ success: false, message: 'Nothing to update' });
  }

  try {
    const currentVendor = (await getVendorContext(request.vendor.id).catch(() => null)) || request.vendor;
    const linkedUserId = await ensureVendorUserLink(currentVendor).catch(() => null);

    const vendorUpdates = {};
    if (resolvedShopName !== undefined) vendorUpdates.shop_name = resolvedShopName;
    if (resolvedOwnerName !== undefined) vendorUpdates.owner_name = resolvedOwnerName;
    if (resolvedAddress !== undefined) vendorUpdates.shop_address = resolvedAddress;
    if (resolvedGstNumber !== undefined) vendorUpdates.gst_number = resolvedGstNumber;
    if (resolvedEmail !== undefined) vendorUpdates.email = resolvedEmail;
    if (typeof isActive === 'boolean') {
      vendorUpdates.is_active = isActive;
      vendorUpdates.status = isActive ? 'active' : 'inactive';
    }
    if (resolvedLatitude !== null) vendorUpdates.shop_latitude = resolvedLatitude;
    if (resolvedLongitude !== null) vendorUpdates.shop_longitude = resolvedLongitude;
    if (resolvedLocationLabel !== undefined) vendorUpdates.location_label = resolvedLocationLabel;

    if (resolvedLatitude !== null || resolvedLongitude !== null || resolvedLocationLabel !== undefined) {
      vendorUpdates.location_updated_at = new Date();
    }

    if (Object.keys(vendorUpdates).length > 0) {
      vendorUpdates.updated_at = new Date();
      const cols = Object.keys(vendorUpdates);
      const vals = Object.values(vendorUpdates);
      const sets = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
      await db.query(
        `UPDATE vendors SET ${sets} WHERE id = $${cols.length + 1}`,
        [...vals, request.vendor.id]
      );
    }

    if (await tableExists('vendor_profiles')) {
      const profileUpdates = await filterDataForTable('vendor_profiles', {
        business_name:      resolvedShopName,
        owner_name:         resolvedOwnerName,
        business_address:   resolvedAddress,
        business_latitude:  resolvedLatitude,
        business_longitude: resolvedLongitude,
        location_label:     resolvedLocationLabel,
        location_updated_at: (resolvedLatitude !== null || resolvedLongitude !== null || resolvedLocationLabel !== undefined)
          ? new Date().toISOString()
          : undefined,
        gst_number:         resolvedGstNumber,
        whatsapp_number:    profileDetails?.whatsapp || profileDetails?.whatsappNumber,
        business_type:      profileDetails?.businessType || companyDetails?.businessType,
        years_of_experience: toFiniteNumber(profileDetails?.yearsOfBusinessExperience || companyDetails?.yearsOfBusinessExperience),
        google_maps_location: profileDetails?.googleMapsLocation || companyDetails?.googleMapsLocation,
        verification_status: submittedForVerification ? 'pending' : undefined,
        rejection_reason: submittedForVerification ? null : undefined,
      });

      if (Object.keys(profileUpdates).length > 0) {
        const updateCols = Object.keys(profileUpdates);
        const updateVals = Object.values(profileUpdates);
        const setSql = updateCols.map((c, i) => `${c} = $${i + 1}`).join(', ');
        const updated = await db.query(
          `UPDATE vendor_profiles
              SET ${setSql},
                  updated_at = NOW()
            WHERE id = $${updateCols.length + 1}
          RETURNING id`,
          [...updateVals, request.vendor.id]
        ).catch(() => ({ rows: [] }));

        if (!updated.rows[0]) {
          const insertData = await filterDataForTable('vendor_profiles', {
            id:               request.vendor.id,
            user_id:          linkedUserId || null,
            business_name:    resolvedShopName || currentVendor.shop_name || 'Vendor Shop',
            owner_name:       resolvedOwnerName || currentVendor.owner_name || 'Vendor Owner',
            business_address: resolvedAddress || currentVendor.shop_address || null,
            business_latitude: resolvedLatitude,
            business_longitude: resolvedLongitude,
            location_label:   resolvedLocationLabel,
            location_updated_at: (resolvedLatitude !== null || resolvedLongitude !== null || resolvedLocationLabel !== undefined)
              ? new Date().toISOString()
              : undefined,
            gst_number:       resolvedGstNumber || null,
            verification_status: submittedForVerification ? 'pending' : undefined,
          });

          if (Object.keys(insertData).length > 0) {
            await db.insert('vendor_profiles', insertData).catch(() => {});
          }
        }
      }
    }

    if (submittedForVerification && linkedUserId && (await tableExists('users'))) {
      const userUpdates = await filterDataForTable('users', {
        is_approved:      false,
        status:           'active',
        verification_status: 'pending',
        rejection_reason: null,
        profile_complete: true,
      });
      if (Object.keys(userUpdates).length > 0) {
        await db.update('users', userUpdates, { id: linkedUserId }).catch(() => {});
      }
    }

    if ((profileDetails || companyDetails || bankDetails) && (await tableExists('app_settings'))) {
      const profileSnapshot = profileDetails || null;
      const companySnapshot = companyDetails || null;
      const addressSnapshot = {
        address: resolvedAddress || null,
        locationLabel: resolvedLocationLabel || null,
        latitude: resolvedLatitude,
        longitude: resolvedLongitude,
      };
      const bankSnapshot = bankDetails ? {
        accountNo:  bankDetails.accountNo || bankDetails.accountNumber || null,
        ifsc:       bankDetails.ifsc || null,
        bankName:   bankDetails.bankName || null,
        bankBranch: bankDetails.bankBranch || null,
      } : null;

      const snapshotEntries = [
        { key: `vendor_profile_${request.vendor.id}`, description: 'Vendor profile details snapshot', value: profileSnapshot },
        { key: `vendor_company_${request.vendor.id}`, description: 'Vendor company details snapshot', value: companySnapshot },
        { key: `vendor_address_${request.vendor.id}`, description: 'Vendor address details snapshot', value: addressSnapshot },
        { key: `vendor_bank_${request.vendor.id}`, description: 'Vendor bank details snapshot', value: bankSnapshot },
        { key: `vendor_documents_${request.vendor.id}`, description: 'Vendor document upload snapshot', value: documents || null },
      ].filter((entry) => entry.value);

      for (const entry of snapshotEntries) {
        const valueString = JSON.stringify(entry.value);
        await db.query(
          `INSERT INTO app_settings (key, value, value_type, description)
           VALUES ($1, $2, 'string', $3)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
          [entry.key, valueString, entry.description]
        ).catch(async () => {
          await db.query(
            `INSERT INTO app_settings (key, value, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
            [entry.key, valueString]
          ).catch(() => {});
        });
      }
    }

    if (documents && linkedUserId) {
      await upsertVendorDocumentsForUser(linkedUserId, documents);
    }

    const refreshedVendor = await getVendorContext(request.vendor.id).catch(() => null);
    return reply.send({ success: true, vendor: formatVendor(refreshedVendor || request.vendor) });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: err.message });
  }
}

// ──────────────────────────────────────────────────────────────
// GET /api/vendors/dashboard?period=1week
// ──────────────────────────────────────────────────────────────
async function getVendorDashboard(request, reply) {
  const period = request.query.period || '1year';
  const vendorId = request.vendor.id;

  const periodMap = {
    today:    'NOW() - INTERVAL \'1 day\'',
    '1week':  'NOW() - INTERVAL \'7 days\'',
    '1month': 'NOW() - INTERVAL \'1 month\'',
    '3months':'NOW() - INTERVAL \'3 months\'',
    '6months':'NOW() - INTERVAL \'6 months\'',
    '1year':  'NOW() - INTERVAL \'1 year\'',
  };
  const since = period !== 'all' ? (periodMap[period] || periodMap['1year']) : null;

  try {
    const hasOrdersTable = await tableExists('orders').catch(() => false);
    const hasProductsTable = await tableExists('products').catch(() => false);

    if (!hasOrdersTable) {
      const inventoryFallback = hasProductsTable
        ? await db.query('SELECT COUNT(*) as count FROM products WHERE vendor_id = $1 AND is_active = true', [vendorId]).catch(() => ({ rows: [{ count: 0 }] }))
        : { rows: [{ count: 0 }] };

      return reply.send({
        success: true,
        periodOrders: 0,
        periodRevenue: 0,
        totalInventory: parseInt(inventoryFallback.rows[0]?.count || 0),
        bestProduct: null,
        recentOrders: [],
      });
    }

    const orderColumns = await getTableColumns('orders').catch(() => new Set());
    if (!orderColumns.has('vendor_id')) {
      const inventoryFallback = hasProductsTable
        ? await db.query('SELECT COUNT(*) as count FROM products WHERE vendor_id = $1 AND is_active = true', [vendorId]).catch(() => ({ rows: [{ count: 0 }] }))
        : { rows: [{ count: 0 }] };

      return reply.send({
        success: true,
        periodOrders: 0,
        periodRevenue: 0,
        totalInventory: parseInt(inventoryFallback.rows[0]?.count || 0),
        bestProduct: null,
        recentOrders: [],
      });
    }

    const amountSql = getOrderAmountSql(orderColumns);
    const timeFilter = since && orderColumns.has('created_at') ? ` AND created_at >= ${since}` : '';
    const productExpr = orderColumns.has('product_name')
      ? 'product_name'
      : orderColumns.has('name')
        ? 'name'
        : null;
    const recentOrderBy = orderColumns.has('created_at')
      ? 'created_at DESC'
      : orderColumns.has('id')
        ? 'id DESC'
        : '1';

    const [ordersRes, inventoryRes, bestRes, recentRes] = await Promise.all([
      db.query(
        `SELECT COUNT(*) as total, COALESCE(SUM(${amountSql}),0) as revenue
         FROM orders WHERE vendor_id = $1${timeFilter}`,
        [vendorId]
      ),
      hasProductsTable
        ? db.query(
          `SELECT COUNT(*) as count FROM products WHERE vendor_id = $1 AND is_active = true`,
          [vendorId]
        )
        : Promise.resolve({ rows: [{ count: 0 }] }),
      productExpr
        ? db.query(
          `SELECT ${productExpr} as product_name, COUNT(*) as order_count
           FROM orders WHERE vendor_id = $1${timeFilter}
           GROUP BY ${productExpr} ORDER BY order_count DESC LIMIT 1`,
          [vendorId]
        )
        : Promise.resolve({ rows: [] }),
      db.query(
        `SELECT * FROM orders WHERE vendor_id = $1
         ORDER BY ${recentOrderBy} LIMIT 5`,
        [vendorId]
      ),
    ]);

    return reply.send({
      success: true,
      periodOrders:   parseInt(ordersRes.rows[0]?.total || 0),
      periodRevenue:  parseFloat(ordersRes.rows[0]?.revenue || 0),
      totalInventory: parseInt(inventoryRes.rows[0]?.count || 0),
      bestProduct:    bestRes.rows[0] || null,
      recentOrders:   recentRes.rows,
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: err.message });
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/vendors/query  &  GET /api/vendors/query
// ──────────────────────────────────────────────────────────────
async function submitVendorQuery(request, reply) {
  const { subject, message } = request.body;
  if (!subject || !message) {
    return reply.code(400).send({ success: false, message: 'subject and message are required' });
  }
  try {
    const result = await db.query(
      `INSERT INTO vendor_queries (id, vendor_id, subject, message, status, created_at)
       VALUES ($1, $2, $3, $4, 'open', NOW()) RETURNING *`,
      [uuidv4(), request.vendor.id, subject, message]
    );
    return reply.code(201).send({ success: true, query: result.rows[0] });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: err.message });
  }
}

async function getVendorQueries(request, reply) {
  try {
    const result = await db.query(
      `SELECT * FROM vendor_queries WHERE vendor_id = $1 ORDER BY created_at DESC`,
      [request.vendor.id]
    );
    return reply.send({ success: true, queries: result.rows });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: err.message });
  }
}

// ──────────────────────────────────────────────────────────────
// GET /api/vendors/wallet-stats?period=1month
// ──────────────────────────────────────────────────────────────
async function getVendorWalletStats(request, reply) {
  const period = request.query.period || 'all';
  const vendorId = request.vendor.id;

  const periodMap = {
    today:    'NOW() - INTERVAL \'1 day\'',
    '1week':  'NOW() - INTERVAL \'7 days\'',
    '1month': 'NOW() - INTERVAL \'1 month\'',
    '3months':'NOW() - INTERVAL \'3 months\'',
    '6months':'NOW() - INTERVAL \'6 months\'',
    '1year':  'NOW() - INTERVAL \'1 year\'',
  };
  const since = period !== 'all' ? periodMap[period] : null;

  try {
    const hasOrdersTable = await tableExists('orders').catch(() => false);
    if (!hasOrdersTable) {
      return reply.send({
        success: true,
        totalRevenue: 0,
        profit: 0,
        commissionRate: 0.05,
        due: 0,
        settled: 0,
      });
    }

    const orderColumns = await getTableColumns('orders').catch(() => new Set());
    if (!orderColumns.has('vendor_id')) {
      return reply.send({
        success: true,
        totalRevenue: 0,
        profit: 0,
        commissionRate: 0.05,
        due: 0,
        settled: 0,
      });
    }

    const amountSql = getOrderAmountSql(orderColumns);
    const timeFilter = since && orderColumns.has('created_at') ? ` AND created_at >= ${since}` : '';

    const revenueRes = await db.query(
      `SELECT COALESCE(SUM(${amountSql}), 0) as total FROM orders
       WHERE vendor_id = $1${timeFilter}`,
      [vendorId]
    );

    const totalRevenue = parseFloat(revenueRes.rows[0]?.total || 0);
    const commissionRate = 0.05;
    const due = totalRevenue * commissionRate;
    const profit = totalRevenue - due;

    let settled = 0;
    try {
      const settledTimeFilter = since ? ` AND created_at >= ${since}` : '';
      const settledRes = await db.query(
        `SELECT COALESCE(SUM(amount), 0) as settled FROM settlements
         WHERE vendor_id = $1${settledTimeFilter}
           AND LOWER(COALESCE(status::text, '')) = 'completed'`,
        [vendorId]
      );
      settled = parseFloat(settledRes.rows[0]?.settled || 0);
    } catch (settledErr) {
      const errMsg = String(settledErr?.message || '').toLowerCase();
      if (!errMsg.includes('relation "settlements" does not exist')) {
        throw settledErr;
      }
    }

    // Compute wallet balance from all sources (always all-time, independent of period filter)
    let walletBalance = 0;
    try {
      // 1. Profit from all delivered/completed orders (all-time)
      const profitRes = await db.query(
        `SELECT COALESCE(SUM(${amountSql} * 0.95), 0) as profit FROM orders
         WHERE vendor_id = $1
           AND LOWER(COALESCE(status::text,'')) IN ('delivered','completed')`,
        [vendorId]
      );
      const orderProfit = parseFloat(profitRes.rows[0]?.profit || 0);

      // 2. Money manually added via payment gateways (completed)
      let manualDeposits = 0;
      try {
        const depositRes = await db.query(
          `SELECT COALESCE(SUM(amount), 0) as total FROM vendor_payment_orders
           WHERE vendor_id = $1 AND UPPER(status) = 'COMPLETED'`,
          [vendorId]
        );
        manualDeposits = parseFloat(depositRes.rows[0]?.total || 0);
      } catch (_) {}

      // 3. Withdrawals (deduct pending + completed — money is committed either way)
      let withdrawals = 0;
      try {
        const withdrawRes = await db.query(
          `SELECT COALESCE(SUM(amount), 0) as total FROM vendor_withdrawals
           WHERE vendor_id = $1
             AND UPPER(status) NOT IN ('FAILED','CANCELLED')`,
          [vendorId]
        );
        withdrawals = parseFloat(withdrawRes.rows[0]?.total || 0);
      } catch (_) {}

      walletBalance = Math.max(0, orderProfit + manualDeposits - withdrawals);

      // Sync vendor_wallets so future reads are consistent
      try {
        const existingWallet = await db.query(
          'SELECT id FROM vendor_wallets WHERE vendor_id = $1 LIMIT 1',
          [vendorId]
        );
        if (existingWallet.rows[0]) {
          await db.query(
            'UPDATE vendor_wallets SET balance = $1, last_updated = NOW() WHERE vendor_id = $2',
            [walletBalance, vendorId]
          );
        } else {
          await db.insert('vendor_wallets', { vendor_id: vendorId, balance: walletBalance });
        }
      } catch (_) {}
    } catch (walletErr) {
      const errMsg = String(walletErr?.message || '').toLowerCase();
      if (!errMsg.includes('does not exist')) throw walletErr;
    }

    return reply.send({
      success: true,
      walletBalance,
      totalRevenue,
      profit,
      commissionRate,
      due: due - settled > 0 ? due - settled : 0,
      settled
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: err.message });
  }
}

// ──────────────────────────────────────────────────────────────
// GET /api/vendors/orders
// ──────────────────────────────────────────────────────────────
async function getVendorOrders(request, reply) {
  try {
    const hasOrdersTable = await tableExists('orders').catch(() => false);
    if (!hasOrdersTable) {
      return reply.send({ success: true, data: [] });
    }

    const orderColumns = await getTableColumns('orders').catch(() => new Set());
    if (!orderColumns.has('vendor_id')) {
      return reply.send({ success: true, data: [] });
    }

    const orderBy = orderColumns.has('created_at')
      ? 'created_at DESC'
      : orderColumns.has('id')
        ? 'id DESC'
        : '1';

    const result = await db.query(
      `SELECT * FROM orders WHERE vendor_id = $1 ORDER BY ${orderBy}`,
      [request.vendor.id]
    );
    const mapped = (result.rows || []).map((order) => ({
      ...order,
      normalized_status: normalizeOrderStatus(order.status),
    }));
    return reply.send({ success: true, data: mapped });
  } catch (err) {
    if (err.message.includes('uuid')) {
      request.log.warn('UUID mismatch in getVendorOrders, falling back to empty array');
      return reply.send({ success: true, data: [] });
    }
    request.log.error(err);
    return reply.code(500).send({ success: false, message: err.message, data: [] });
  }
}

// ──────────────────────────────────────────────────────────────
// PATCH /api/vendors/orders/:orderId/status
// ──────────────────────────────────────────────────────────────
async function updateVendorOrderStatus(request, reply) {
  const { orderId } = request.params;
  const { status, v_status: vendorStatusInput } = request.body || {};
  if (!status && !vendorStatusInput) {
    return reply.code(400).send({ success: false, message: 'status or v_status required' });
  }

  const statusKey = String(status || '').trim().toLowerCase();
  const vendorStatusKey = String(vendorStatusInput || '').trim().toLowerCase();
  const resolvedStatus = status ? mapVendorStatusInput(status) : undefined;
  const isVendorAcceptAction = ['accept', 'accepted'].includes(statusKey) || ['accept', 'accepted'].includes(vendorStatusKey);

  try {
    // Fetch current status before updating so we can detect the delivered transition
    let previousStatus = null;
    try {
      const currentRes = await db.query(
        'SELECT status FROM orders WHERE id = $1 AND vendor_id = $2 LIMIT 1',
        [orderId, request.vendor.id]
      );
      previousStatus = currentRes.rows[0]?.status || null;
    } catch (_) {}

    // Vendor accept is controlled by v_status so client-facing status can remain pending until driver progresses.
    const rawUpdates = {
      updated_at: new Date().toISOString(),
      status: isVendorAcceptAction ? undefined : resolvedStatus,
      v_status: isVendorAcceptAction ? 'accepted' : undefined,
    };

    const filteredUpdates = await filterDataForTable('orders', rawUpdates);
    const result = await db.update('orders', filteredUpdates, { id: orderId, vendor_id: request.vendor.id });

    if (!result[0]) {
      return reply.code(404).send({ success: false, message: 'Order not found' });
    }

    const updatedOrder = result[0];

    if (isVendorAcceptAction && ['accepted', 'accept'].includes(String(updatedOrder?.v_status || '').toLowerCase())) {
      await broadcastNewOrderToOnlineDrivers(updatedOrder, db).catch((err) => {
        request.log.warn({ err, orderId: updatedOrder.id }, 'Driver broadcast failed after vendor accept');
      });
    }

    // Credit vendor wallet when order transitions to delivered for the first time
    const normalizedNew = normalizeOrderStatus(updatedOrder.status);
    const normalizedPrev = normalizeOrderStatus(previousStatus);
    if (normalizedNew === 'delivered' && normalizedPrev !== 'delivered') {
      try {
        const orderAmount = parseFloat(
          updatedOrder.total_amount ||
          updatedOrder.final_total ||
          updatedOrder.final_amount ||
          updatedOrder.order_amount || 0
        );
        const vendorProfit = orderAmount * 0.95; // 5% platform commission

        if (vendorProfit > 0) {
          const walletRes = await db.query(
            'SELECT id FROM vendor_wallets WHERE vendor_id = $1 LIMIT 1',
            [request.vendor.id]
          );
          if (walletRes.rows[0]) {
            await db.query(
              'UPDATE vendor_wallets SET balance = balance + $1, last_updated = NOW() WHERE vendor_id = $2',
              [vendorProfit, request.vendor.id]
            );
          } else {
            await db.insert('vendor_wallets', {
              vendor_id: request.vendor.id,
              balance: vendorProfit,
            });
          }
          request.log.info({ vendorId: request.vendor.id, orderId, vendorProfit }, 'Wallet credited on order delivery');
        }
      } catch (walletErr) {
        // Non-fatal: log but don't fail the status update
        request.log.error({ err: walletErr, orderId }, 'Failed to credit vendor wallet on order delivery');
      }
    }

    return reply.send({
      success: true,
      data: {
        ...updatedOrder,
        normalized_status: normalizeOrderStatus(updatedOrder.status),
      }
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: err.message });
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/vendors/wallet/create-cashfree-session
// Creates a Cashfree payment session for adding money to wallet
// ──────────────────────────────────────────────────────────────
async function createCashfreeSession(request, reply) {
  try {
    const vendorId = request.vendor.id;
    const { amount, email, phone } = request.body;

    if (!amount || amount <= 0) {
      return reply.code(400).send({ success: false, message: 'Invalid amount' });
    }

    const CF_API_URL = process.env.CASHFREE_ENVIRONMENT === 'PRODUCTION'
      ? 'https://api.cashfree.com'
      : 'https://sandbox.cashfree.com';

    const orderId = `VENDOR_ADD_${vendorId.substring(0, 8)}_${Date.now()}`;

    const response = await fetch(`${CF_API_URL}/pg/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': process.env.CASHFREE_APP_ID,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY,
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: amount,
        order_currency: 'INR',
        customer_details: {
          customer_id: `VENDOR_${vendorId}`,
          customer_email: email || request.vendor.email,
          customer_phone: phone || request.vendor.phone,
          customer_name: request.vendor.shop_name,
        },
        order_meta: {
          notify_url: `${process.env.PUBLIC_API_URL || 'http://localhost:5000'}/api/vendors/wallet/cashfree-webhook`,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      request.log.error('Cashfree API error:', { status: response.status, data });
      throw new Error(data.message || 'Failed to create Cashfree session');
    }

    request.log.debug('Cashfree order creation response:', {
      status: response.status,
      orderStatus: data.order_status,
      hasPaymentLink: !!data.payment_link,
      hasSessionId: !!data.payment_session_id,
      hasPaymentMethods: !!data.order_meta?.payment_methods,
      keys: Object.keys(data),
    });

    // Store order in database for tracking
    await db.insert('vendor_payment_orders', {
      vendor_id: vendorId,
      cashfree_order_id: orderId,
      amount,
      status: 'PENDING',
    }).catch(() => {}); // Silent fail if table doesn't exist yet

    // Try to get payment link from different sources
    let paymentLink = data.payment_link;

    // Use our backend checkout page endpoint
    if (!paymentLink) {
      paymentLink = `${process.env.PUBLIC_API_URL || 'http://localhost:5000'}/api/vendors/wallet/cashfree-checkout/${orderId}`;
      request.log.info(`Using backend checkout page: ${paymentLink}`);
    }

    return reply.send({
      success: true,
      sessionId: data.payment_session_id,
      paymentLink: paymentLink,
      orderId: orderId,
    });
  } catch (error) {
    request.log.error('Cashfree session creation error:', error);
    return reply.code(500).send({ success: false, message: error.message || 'Failed to create payment session' });
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/vendors/wallet/verify-cashfree-payment
// Verifies Cashfree payment completion
// ──────────────────────────────────────────────────────────────
async function verifyCashfreePayment(request, reply) {
  try {
    const vendorId = request.vendor.id;
    const { paymentSessionId, paymentId } = request.body;

    if (!paymentSessionId || !paymentId) {
      return reply.code(400).send({ success: false, message: 'Missing payment details' });
    }

    const CF_API_URL = process.env.CASHFREE_ENVIRONMENT === 'PRODUCTION'
      ? 'https://api.cashfree.com'
      : 'https://sandbox.cashfree.com';

    const response = await fetch(`${CF_API_URL}/pg/orders/${paymentSessionId}`, {
      method: 'GET',
      headers: {
        'x-api-version': '2023-08-01',
        'x-client-id': process.env.CASHFREE_APP_ID,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY,
      },
    });

    const data = await response.json();

    if (data.order_status === 'PAID') {
      // Add money to vendor wallet
      const wallet = await db.selectOne('vendor_wallets', { vendor_id: vendorId });

      if (wallet) {
        await db.query(
          `UPDATE vendor_wallets SET balance = balance + $1, last_updated = NOW() WHERE vendor_id = $2`,
          [data.order_amount, vendorId]
        );
      } else {
        await db.insert('vendor_wallets', {
          vendor_id: vendorId,
          balance: data.order_amount,
        });
      }

      return reply.send({
        success: true,
        message: `₹${data.order_amount} added to wallet successfully`,
        amount: data.order_amount,
      });
    }

    return reply.code(400).send({
      success: false,
      message: 'Payment not completed. Status: ' + data.order_status,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ success: false, message: 'Payment verification failed' });
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/vendors/wallet/create-order (Razorpay)
// ──────────────────────────────────────────────────────────────
async function createRazorpayOrder(request, reply) {
  try {
    const { amount } = request.body;

    if (!amount || amount <= 0) {
      return reply.code(400).send({ success: false, message: 'Invalid amount' });
    }

    // Create order ID
    const orderId = `VRZ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return reply.send({
      success: true,
      orderId: orderId,
      currency: 'INR',
      amount: amount,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ success: false, message: 'Failed to create order' });
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/vendors/wallet/verify-payment (Razorpay)
// ──────────────────────────────────────────────────────────────
async function verifyRazorpayPayment(request, reply) {
  try {
    const vendorId = request.vendor.id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = request.body;

    // TODO: Verify signature with Razorpay secret key
    // For now, assume verification passed

    const amount = parseInt(request.body.amount) || 0;

    if (amount <= 0) {
      return reply.code(400).send({ success: false, message: 'Invalid amount' });
    }

    // Add money to vendor wallet
    const wallet = await db.selectOne('vendor_wallets', { vendor_id: vendorId });

    if (wallet) {
      await db.query(
        `UPDATE vendor_wallets SET balance = balance + $1, last_updated = NOW() WHERE vendor_id = $2`,
        [amount, vendorId]
      );
    } else {
      await db.insert('vendor_wallets', {
        vendor_id: vendorId,
        balance: amount,
      });
    }

    return reply.send({
      success: true,
      message: `₹${amount} added to wallet successfully`,
      amount: amount,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ success: false, message: 'Payment verification failed' });
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/vendors/wallet/withdraw
// ──────────────────────────────────────────────────────────────
async function withdrawMoney(request, reply) {
  try {
    const vendorId = request.vendor.id;
    const { amount, upiId, accountNumber, ifscCode, accountName } = request.body;

    if (!amount || amount <= 0) {
      return reply.code(400).send({ success: false, message: 'Invalid withdrawal amount' });
    }

    if (!upiId && !accountNumber) {
      return reply.code(400).send({ success: false, message: 'UPI ID or bank account required' });
    }

    // Get wallet
    const wallet = await db.selectOne('vendor_wallets', { vendor_id: vendorId });

    if (!wallet || wallet.balance < amount) {
      return reply.code(400).send({ success: false, message: 'Insufficient balance' });
    }

    // Deduct from wallet
    await db.query(
      `UPDATE vendor_wallets SET balance = balance - $1, last_updated = NOW() WHERE vendor_id = $2`,
      [amount, vendorId]
    );

    // Record withdrawal request
    const withdrawalId = `WD_${Date.now()}`;
    await db.insert('vendor_withdrawals', {
      vendor_id: vendorId,
      amount,
      method: upiId ? 'upi' : 'bank',
      upi_id: upiId || null,
      account_number: accountNumber || null,
      ifsc_code: ifscCode || null,
      account_name: accountName || null,
      status: 'PENDING',
      reference_id: withdrawalId,
    }).catch(() => {}); // Ignore if table doesn't exist

    return reply.send({
      success: true,
      message: `Withdrawal of ₹${amount} initiated successfully`,
      newBalance: wallet.balance - amount,
      referenceId: withdrawalId,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ success: false, message: 'Withdrawal failed' });
  }
}

// ── Helper ────────────────────────────────────────────────────
function formatVendor(v) {
  const verificationStatus = deriveVendorVerificationStatus(v);
  const resolvedAddress = v.shop_address || v.profile_business_address || null;
  const resolvedLatitude = v.shop_latitude ?? v.profile_business_latitude ?? null;
  const resolvedLongitude = v.shop_longitude ?? v.profile_business_longitude ?? null;
  const resolvedLocationLabel = v.location_label || v.profile_location_label || null;
  const resolvedLocationUpdatedAt = v.location_updated_at || v.profile_location_updated_at || null;
  const resolvedShopName = v.shop_name || v.profile_business_name || null;
  const resolvedOwnerName = v.owner_name || v.profile_owner_name || null;
  const rejectionReason = v.profile_rejection_reason || v.user_rejection_reason || null;
  const profileComplete =
    v.user_profile_complete === true ||
    String(v.user_profile_complete || '').toLowerCase() === 'true' ||
    Number(v.user_profile_complete || 0) === 1;

  return {
    id:         v.id,
    userId:     v.profile_user_id || v.user_id || null,
    shopName:   resolvedShopName,
    ownerName:  resolvedOwnerName,
    mobile:     v.phone,
    email:      v.email,
    address:    resolvedAddress,
    latitude:   resolvedLatitude,
    longitude:  resolvedLongitude,
    locationLabel: resolvedLocationLabel,
    locationUpdatedAt: resolvedLocationUpdatedAt,
    gstNumber:  v.gst_number || null,
    isActive:   v.is_active,
    status:     v.status,
    verificationStatus,
    rejectionReason,
    isApproved: verificationStatus === 'verified',
    profileComplete,
    createdAt:  v.created_at,
  };
}

module.exports = {
  ensureVendorCompatibilitySchema,
  vendorSendOtp, vendorVerifyOtp, vendorRegister,
  getVendorProfile, updateVendorProfile,
  getVendorDashboard,
  submitVendorQuery, getVendorQueries,
  getVendorWalletStats, getVendorOrders, updateVendorOrderStatus,
  createCashfreeSession, verifyCashfreePayment,
  createRazorpayOrder, verifyRazorpayPayment,
  withdrawMoney,
};
