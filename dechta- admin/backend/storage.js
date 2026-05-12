import { db, pool } from "./db";
import { users, products, orders, catalogItems, drivers, driverDocuments, workerSkills, workerDetails, walletTable, clients, jobs, supportTickets, vendorDocuments, workerDocuments, banners, appSettings, vehiclePricing, notifications, notificationReads, conversations, messages } from "./shared/schema";
import { eq, sql, and, or, asc, desc } from "drizzle-orm";
function normalizeUnifiedOrderStatus(status) {
    const key = String(status || '').trim().toLowerCase();
    if (!key)
        return 'pending';
    if (['pending', 'placed'].includes(key))
        return 'pending';
    if (['confirmed', 'processing', 'packed'].includes(key))
        return 'confirmed';
    if (['assigned', 'accepted'].includes(key))
        return 'assigned';
    if (['picked_up', 'arrived_pickup', 'out for delivery', 'arrived_dropoff', 'shipped', 'dispatched'].includes(key))
        return 'in_transit';
    if (['delivered', 'completed'].includes(key))
        return 'delivered';
    if (['cancelled', 'canceled', 'missed', 'returned'].includes(key))
        return 'cancelled';
    return key;
}
function mapOrderStatusForStorage(status) {
    const key = String(status || '').trim().toLowerCase();
    if (!key)
        return 'Pending';
    const map = {
        pending: 'Pending',
        placed: 'Pending',
        confirmed: 'Confirmed',
        processing: 'Confirmed',
        packed: 'Packed',
        assigned: 'Assigned',
        accepted: 'Assigned',
        in_transit: 'Out for Delivery',
        shipped: 'Out for Delivery',
        dispatched: 'Out for Delivery',
        'out for delivery': 'Out for Delivery',
        picked_up: 'Out for Delivery',
        arrived_pickup: 'Out for Delivery',
        arrived_dropoff: 'Out for Delivery',
        delivered: 'Delivered',
        completed: 'Delivered',
        cancelled: 'Cancelled',
        canceled: 'Cancelled',
        returned: 'Cancelled',
        missed: 'Cancelled',
    };
    return map[key] || status || 'Pending';
}
function pickImageCandidate(value) {
    if (!value)
        return null;
    if (Array.isArray(value)) {
        const first = value.find((v) => typeof v === 'string' && v.trim().length > 0);
        return first ? first.trim() : null;
    }
    if (typeof value === 'string') {
        const s = value.trim();
        if (!s)
            return null;
        if (s.startsWith('data:image') || s.startsWith('http://') || s.startsWith('https://') || s.startsWith('/')) {
            return s;
        }
        try {
            const parsed = JSON.parse(s);
            const nested = pickImageCandidate(parsed);
            if (nested)
                return nested;
        }
        catch {
            // Not JSON - ignore.
        }
        return null;
    }
    return null;
}
function extractImageUrlFromRow(row) {
    return (pickImageCandidate(row?.image_url) ||
        pickImageCandidate(row?.imageUrl) ||
        pickImageCandidate(row?.images) ||
        null);
}
function toFiniteNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}
function firstNonEmpty(...values) {
    for (const value of values) {
        if (value == null)
            continue;
        const str = String(value).trim();
        if (str)
            return str;
    }
    return null;
}
async function tableExistsInPublic(tableName) {
    const result = await pool
        .query(`SELECT to_regclass($1) AS table_name`, [`public.${tableName}`])
        .catch(() => ({ rows: [] }));
    return !!result.rows?.[0]?.table_name;
}
let locationIdColumnPromise = null;
let manpowerPricingCleanupDone = false;
async function getLocationIdColumn() {
    if (!locationIdColumnPromise) {
        locationIdColumnPromise = pool
            .query(`SELECT column_name
           FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'location_updates'
            AND column_name IN ('user_id', 'entity_id')`)
            .then((result) => {
            const columns = new Set((result.rows || []).map((row) => String(row.column_name)));
            if (columns.has("user_id"))
                return "user_id";
            if (columns.has("entity_id"))
                return "entity_id";
            throw new Error("location_updates is missing both user_id and entity_id columns");
        })
            .catch((error) => {
            locationIdColumnPromise = null;
            throw error;
        });
    }
    return locationIdColumnPromise;
}
function toLocationIdValue(column, entityId) {
    if (column === "user_id") {
        const parsed = Number(entityId);
        if (!Number.isFinite(parsed)) {
            throw new Error(`Invalid numeric entityId for location_updates.user_id: ${entityId}`);
        }
        return parsed;
    }
    return String(entityId);
}
async function ensureAdminOnboardingCompatibilitySchema() {
    if (await tableExistsInPublic('users')) {
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50)`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS rejection_reason TEXT`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE`).catch(() => ({ rows: [] }));
    }
    const hasVendors = await tableExistsInPublic('vendors');
    if (hasVendors) {
        await pool.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS shop_address TEXT`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS shop_latitude NUMERIC(10,8)`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS shop_longitude NUMERIC(11,8)`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS location_label TEXT`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS gst_number VARCHAR(20)`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS email VARCHAR(255)`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`).catch(() => ({ rows: [] }));
    }
    if (await tableExistsInPublic('vendor_profiles')) {
        await pool.query(`ALTER TABLE vendor_profiles ALTER COLUMN user_id DROP NOT NULL`).catch(() => ({ rows: [] }));
    }
    if (await tableExistsInPublic('driver_profiles')) {
        await pool.query(`ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(20)`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20)`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(50)`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(50)`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS license_number VARCHAR(100)`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS preferred_zone VARCHAR(120)`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 0`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT`).catch(() => ({ rows: [] }));
    }
    if (await tableExistsInPublic('driver_vehicles')) {
        await pool.query(`ALTER TABLE driver_vehicles ADD COLUMN IF NOT EXISTS model_id VARCHAR(100)`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE driver_vehicles ADD COLUMN IF NOT EXISTS model_name VARCHAR(100)`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE driver_vehicles ADD COLUMN IF NOT EXISTS weight_capacity NUMERIC(10,2)`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE driver_vehicles ADD COLUMN IF NOT EXISTS dimensions VARCHAR(100)`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE driver_vehicles ADD COLUMN IF NOT EXISTS body_type VARCHAR(50)`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE driver_vehicles ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(50)`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE driver_vehicles ADD COLUMN IF NOT EXISTS registration_number VARCHAR(50)`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE driver_vehicles ADD COLUMN IF NOT EXISTS license_number VARCHAR(100)`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE driver_vehicles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`).catch(() => ({ rows: [] }));
    }
    if (await tableExistsInPublic('vehicles')) {
        await pool.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS model_id VARCHAR(100)`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS model_name VARCHAR(100)`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS dimensions VARCHAR(100)`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`).catch(() => ({ rows: [] }));
    }
    // Ensure manpower_pricing table has all required columns
    await pool.query(`
    CREATE TABLE IF NOT EXISTS manpower_pricing (
      id SERIAL PRIMARY KEY,
      service_category TEXT,
      service_name TEXT NOT NULL,
      service_code TEXT,
      description TEXT,
      base_price NUMERIC,
      rate_per_hour NUMERIC,
      min_hours NUMERIC DEFAULT 1,
      estimated_duration TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => ({ rows: [] }));
    if (await tableExistsInPublic('manpower_pricing')) {
        await pool.query(`ALTER TABLE manpower_pricing ADD COLUMN IF NOT EXISTS service_category TEXT`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE manpower_pricing ADD COLUMN IF NOT EXISTS service_code TEXT`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE manpower_pricing ADD COLUMN IF NOT EXISTS base_price NUMERIC`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE manpower_pricing ADD COLUMN IF NOT EXISTS rate_per_hour NUMERIC`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE manpower_pricing ADD COLUMN IF NOT EXISTS min_hours NUMERIC DEFAULT 1`).catch(() => ({ rows: [] }));
        await pool.query(`ALTER TABLE manpower_pricing ADD COLUMN IF NOT EXISTS estimated_duration TEXT`).catch(() => ({ rows: [] }));
        // Remove corrupt entries where essential fields are NULL (created by old buggy code)
        await pool.query(`
      DELETE FROM manpower_pricing
      WHERE service_category IS NULL OR service_code IS NULL OR base_price IS NULL OR rate_per_hour IS NULL
    `).catch(() => ({ rows: [] }));
    }
}
function normalizeStatusToken(value) {
    return String(value || "").trim().toLowerCase();
}
function deriveVendorVerificationStatus(row) {
    const profileStatus = normalizeStatusToken(row?.verification_status || row?.verificationStatus);
    const userVerification = normalizeStatusToken(row?.user_verification_status || row?.userVerificationStatus);
    const userStatus = normalizeStatusToken(row?.user_status || row?.userStatus);
    const vendorStatus = normalizeStatusToken(row?.vendor_status || row?.vendorStatus || row?.status);
    const userApproved = row?.user_is_approved === true || row?.user_is_approved === 1 || row?.is_approved === true;
    const rejectedSet = new Set(["rejected", "suspended", "banned", "inactive"]);
    if (profileStatus === "rejected" ||
        userVerification === "rejected" ||
        rejectedSet.has(userStatus) ||
        rejectedSet.has(vendorStatus)) {
        return "rejected";
    }
    if (profileStatus === "verified" ||
        profileStatus === "approved" ||
        userVerification === "verified" ||
        userVerification === "approved" ||
        userApproved) {
        return "verified";
    }
    return "pending";
}
export class DatabaseStorage {
    mapVendorProfileRow(vp, productCount = 0, email = "") {
        const verificationStatus = deriveVendorVerificationStatus(vp);
        const resolvedEmail = email || vp.user_email || vp.vendor_email || "";
        const resolvedPhone = vp.vendor_phone || vp.mobile || vp.phone || vp.phone_number || vp.user_phone || "";
        const resolvedName = vp.shop_name || vp.business_name || `Vendor #${vp.id}`;
        const resolvedOwner = vp.vendor_owner_name || vp.owner_name || null;
        const resolvedAddress = vp.shop_address || vp.business_address || null;
        const resolvedYears = vp.years_of_experience ?? vp.years_of_business_experience ?? null;
        const resolvedLatitude = toFiniteNumber(vp.shop_latitude) ??
            toFiniteNumber(vp.business_latitude) ??
            toFiniteNumber(vp.latitude) ??
            null;
        const resolvedLongitude = toFiniteNumber(vp.shop_longitude) ??
            toFiniteNumber(vp.business_longitude) ??
            toFiniteNumber(vp.longitude) ??
            null;
        const rejectionReason = firstNonEmpty(vp.rejection_reason, vp.user_rejection_reason, vp.vendor_rejection_reason);
        return {
            id: Number(vp.id),
            userId: vp.user_id ? Number(vp.user_id) : null,
            name: resolvedName,
            shopName: resolvedName,
            email: resolvedEmail,
            role: "vendor",
            phone: resolvedPhone,
            ownerName: resolvedOwner,
            whatsappNumber: vp.whatsapp_number || null,
            businessAddress: resolvedAddress,
            shopAddress: resolvedAddress,
            warehouseAddress: vp.warehouse_address || null,
            googleMapsLocation: vp.google_maps_location || null,
            yearsOfBusinessExperience: resolvedYears ? String(resolvedYears) : null,
            businessType: vp.business_type || null,
            gstNumber: vp.gst_number || vp.vendor_gst_number || null,
            shopLatitude: resolvedLatitude,
            shopLongitude: resolvedLongitude,
            locationLabel: vp.location_label || null,
            locationUpdatedAt: vp.location_updated_at || null,
            verificationStatus,
            rejectionReason,
            createdAt: vp.created_at || null,
            totalProducts: Number(productCount || 0),
            walletDue: "0",
        };
    }
    async getUser(id) {
        try {
            const result = await pool.query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [id]);
            if (!result.rows[0])
                return undefined;
            return this.mapUserRow(result.rows[0]);
        }
        catch (_error) {
            return undefined;
        }
    }
    async getUserByEmail(email) {
        try {
            const result = await pool.query(`SELECT * FROM users WHERE email = $1 LIMIT 1`, [email]);
            if (!result.rows[0])
                return undefined;
            return this.mapUserRow(result.rows[0]);
        }
        catch (error) {
            console.error("storage.getUserByEmail error:", error);
            return undefined;
        }
    }
    mapUserRow(u) {
        const role = u.role || u.user_type || "buyer";
        const verificationStatus = u.verification_status || (u.is_approved ? "verified" : "pending");
        return {
            id: Number(u.id),
            name: u.name || u.full_name || u.owner_name || u.business_name || u.email || `User #${u.id}`,
            email: u.email || null,
            password: u.password || u.password_hash || null,
            role,
            verificationStatus,
            rejectionReason: u.rejection_reason || null,
            phone: u.phone || u.phone_number || null,
            ownerName: u.owner_name || null,
            whatsappNumber: u.whatsapp_number || null,
            businessAddress: u.business_address || null,
            warehouseAddress: u.warehouse_address || null,
            googleMapsLocation: u.google_maps_location || null,
            yearsOfBusinessExperience: u.years_of_business_experience || null,
            businessType: u.business_type || null,
            createdAt: u.created_at || null,
        };
    }
    async createUser(insertUser) {
        const [user] = await db.insert(users).values(insertUser).returning();
        return user;
    }
    async getProducts() {
        try {
            const result = await pool.query(`
        SELECT
          p.id,
          p.vendor_id,
          p.catalog_item_id,
          COALESCE(p.selling_price::text, p.mrp::text, '0') AS price,
          p.selling_price::text AS selling_price,
          p.stock,
          p.images,
          p.approval_status,
          p.rejection_reason,
          COALESCE(c.name, p.product_name) AS name,
          COALESCE(c.category, p.category) AS category,
          COALESCE(c.description, p.description) AS description,
          COALESCE(c.image_url, p.image_url, p.images ->> 0) AS image_url
        FROM products p
        LEFT JOIN catalog_items c ON c.id = p.catalog_item_id
        ORDER BY p.id DESC
      `);
            return result.rows.map((r) => ({
                id: Number(r.id),
                vendorId: Number(r.vendor_id),
                catalogItemId: r.catalog_item_id ? Number(r.catalog_item_id) : null,
                price: r.price,
                sellingPrice: r.selling_price,
                stock: Number(r.stock || 0),
                name: r.name,
                category: r.category,
                description: r.description,
                imageUrl: extractImageUrlFromRow(r),
                approvalStatus: r.approval_status || "pending",
                rejectionReason: r.rejection_reason || null,
            }));
        }
        catch (_error) {
            // Fall back to legacy drizzle schema.
        }
        return await db.select({
            id: products.id,
            vendorId: products.vendorId,
            price: products.sellingPrice,
            catalogItemId: products.catalogItemId,
            name: catalogItems.name,
            category: catalogItems.category,
            description: catalogItems.description,
            imageUrl: catalogItems.imageUrl,
            approvalStatus: products.approvalStatus,
            rejectionReason: products.rejectionReason,
        })
            .from(products)
            .innerJoin(catalogItems, eq(products.catalogItemId, catalogItems.id));
    }
    async getApprovedProducts() {
        try {
            const result = await pool.query(`
        SELECT
          p.id,
          p.vendor_id,
          p.catalog_item_id,
          COALESCE(p.selling_price::text, p.mrp::text, '0') AS price,
          p.images,
          COALESCE(c.name, p.product_name) AS name,
          COALESCE(c.category, p.category) AS category,
          COALESCE(c.description, p.description) AS description,
          COALESCE(c.image_url, p.image_url, p.images ->> 0) AS image_url
        FROM products p
        LEFT JOIN catalog_items c ON c.id = p.catalog_item_id
        WHERE COALESCE(p.approval_status, 'pending') = 'approved'
        ORDER BY p.id DESC
      `);
            return result.rows.map((r) => ({
                id: Number(r.id),
                vendorId: Number(r.vendor_id),
                catalogItemId: r.catalog_item_id ? Number(r.catalog_item_id) : null,
                price: r.price,
                name: r.name,
                category: r.category,
                description: r.description,
                imageUrl: extractImageUrlFromRow(r),
            }));
        }
        catch (_error) {
            // Fall back to legacy drizzle schema.
        }
        return await db.select({
            id: products.id,
            vendorId: products.vendorId,
            price: products.sellingPrice,
            catalogItemId: products.catalogItemId,
            name: catalogItems.name,
            category: catalogItems.category,
            description: catalogItems.description,
            imageUrl: catalogItems.imageUrl,
        })
            .from(products)
            .innerJoin(catalogItems, eq(products.catalogItemId, catalogItems.id))
            .where(eq(products.approvalStatus, "approved"));
    }
    async getPendingProducts() {
        try {
            const result = await pool.query(`
        SELECT
          p.id,
          p.vendor_id,
          p.catalog_item_id,
          COALESCE(p.selling_price::text, p.mrp::text, '0') AS price,
          p.images,
          COALESCE(c.name, p.product_name) AS name,
          COALESCE(c.category, p.category) AS category,
          COALESCE(c.description, p.description) AS description,
          COALESCE(c.image_url, p.image_url, p.images ->> 0) AS image_url,
          p.approval_status,
          p.rejection_reason
        FROM products p
        LEFT JOIN catalog_items c ON c.id = p.catalog_item_id
        WHERE COALESCE(p.approval_status, 'pending') = 'pending'
        ORDER BY p.id DESC
      `);
            return result.rows.map((r) => ({
                id: Number(r.id),
                vendorId: Number(r.vendor_id),
                catalogItemId: r.catalog_item_id ? Number(r.catalog_item_id) : null,
                price: r.price,
                name: r.name,
                category: r.category,
                description: r.description,
                imageUrl: extractImageUrlFromRow(r),
                approvalStatus: r.approval_status || "pending",
                rejectionReason: r.rejection_reason || null,
            }));
        }
        catch (_error) {
            // Fall back to legacy drizzle schema.
        }
        return await db.select({
            id: products.id,
            vendorId: products.vendorId,
            price: products.sellingPrice,
            catalogItemId: products.catalogItemId,
            name: catalogItems.name,
            category: catalogItems.category,
            description: catalogItems.description,
            imageUrl: catalogItems.imageUrl,
            approvalStatus: products.approvalStatus,
            rejectionReason: products.rejectionReason,
        })
            .from(products)
            .innerJoin(catalogItems, eq(products.catalogItemId, catalogItems.id))
            .where(eq(products.approvalStatus, "pending"));
    }
    async approveProduct(id) {
        const [updated] = await db.update(products)
            .set({ approvalStatus: "approved", rejectionReason: null })
            .where(eq(products.id, id))
            .returning();
        return updated;
    }
    async rejectProduct(id, reason) {
        const [updated] = await db.update(products)
            .set({ approvalStatus: "rejected", rejectionReason: reason })
            .where(eq(products.id, id))
            .returning();
        return updated;
    }
    async getProductsByVendor(vendorId) {
        return await db.select({
            id: products.id,
            vendorId: products.vendorId,
            price: products.sellingPrice,
            sellingPrice: products.sellingPrice,
            hsnCode: catalogItems.hsnCode,
            gst: products.gstPercent,
            stock: products.stock,
            catalogItemId: products.catalogItemId,
            name: catalogItems.name,
            category: catalogItems.category,
            description: catalogItems.description,
            imageUrl: catalogItems.imageUrl,
            approvalStatus: products.approvalStatus,
            rejectionReason: products.rejectionReason,
        })
            .from(products)
            .innerJoin(catalogItems, eq(products.catalogItemId, catalogItems.id))
            .where(eq(products.vendorId, vendorId));
    }
    async createProduct(product) {
        const [newProduct] = await db.insert(products).values(product).returning();
        return newProduct;
    }
    async getCatalogItems() {
        try {
            const result = await pool.query(`
        SELECT id, name, category, description, image_url, created_at
        FROM catalog_items
        ORDER BY id DESC
      `);
            return result.rows.map((r) => ({
                id: Number(r.id),
                name: r.name,
                category: r.category,
                description: r.description || null,
                imageUrl: r.image_url || null,
                createdAt: r.created_at || null,
            }));
        }
        catch (_error) {
            // Fall back to legacy drizzle schema.
        }
        return await db.select().from(catalogItems);
    }
    async createCatalogItem(item) {
        const { vendorId, ...catalogData } = item;
        const [newItem] = await db.insert(catalogItems).values(catalogData).returning();
        if (vendorId) {
            await db.insert(products).values({
                vendorId,
                catalogItemId: newItem.id,
                sellingPrice: catalogData.sellingPrice || "0",
                gstPercent: catalogData.gstPercent || "18",
                stock: catalogData.stock || 0,
                approvalStatus: "approved"
            });
        }
        return newItem;
    }
    async getStats(dateFilter) {
        try {
            const { startDate, endDate } = dateFilter || {};
            const dateFilterSql = startDate && endDate
                ? `WHERE created_at >= $1 AND created_at <= $2`
                : startDate
                    ? `WHERE created_at >= $1`
                    : "";
            const params = startDate && endDate ? [startDate, endDate] : startDate ? [startDate] : [];
            const usersCountRes = await pool.query(`SELECT COUNT(*)::int AS count FROM users ${dateFilterSql}`, params);
            const ordersCountRes = await pool.query(`SELECT COUNT(*)::int AS count FROM orders`);
            const recentUsersRes = await pool.query(`
        SELECT id, COALESCE(email, 'User #' || id::text) AS name, email, COALESCE(user_type::text, 'buyer') AS role
        FROM users
        ORDER BY id DESC
        LIMIT 5
      `);
            const recentOrdersRes = await pool.query(`
        SELECT
          o.id,
          o.quantity,
          o.status,
          COALESCE(p.product_name, 'Product #' || COALESCE(o.product_id, 0)::text) AS product_name,
          COALESCE(p.selling_price::text, '0') AS product_price,
          COALESCE(u.email, 'Buyer #' || u.id::text) AS buyer_name,
          u.email AS buyer_email
        FROM orders o
        LEFT JOIN products p ON p.id = o.product_id
        LEFT JOIN users u ON u.id = o.user_id
        ORDER BY o.id DESC
        LIMIT 5
      `);
            let previousPeriodUsers;
            if (startDate && endDate) {
                const periodMs = endDate.getTime() - startDate.getTime();
                const prevStart = new Date(startDate.getTime() - periodMs);
                const prevEnd = new Date(startDate.getTime() - 1);
                const prevRes = await pool.query(`SELECT COUNT(*)::int AS count FROM users WHERE created_at >= $1 AND created_at <= $2`, [prevStart, prevEnd]);
                previousPeriodUsers = Number(prevRes.rows[0]?.count || 0);
            }
            return {
                totalUsers: Number(usersCountRes.rows[0]?.count || 0),
                totalOrders: Number(ordersCountRes.rows[0]?.count || 0),
                recentUsers: recentUsersRes.rows.map((r) => ({
                    id: Number(r.id),
                    name: r.name,
                    email: r.email,
                    role: r.role,
                })),
                recentOrders: recentOrdersRes.rows.map((r) => ({
                    id: Number(r.id),
                    quantity: Number(r.quantity || 1),
                    status: r.status,
                    product: { name: r.product_name, price: r.product_price },
                    buyer: { name: r.buyer_name, email: r.buyer_email },
                })),
                previousPeriodUsers,
            };
        }
        catch (_error) {
            // Fall back to legacy drizzle schema.
        }
        const { startDate, endDate } = dateFilter || {};
        // Build date condition for users
        let userCount;
        if (startDate && endDate) {
            const [{ count }] = await db.select({ count: sql `count(*)`.mapWith(Number) })
                .from(users)
                .where(and(sql `${users.createdAt} >= ${startDate}`, sql `${users.createdAt} <= ${endDate}`));
            userCount = count;
        }
        else if (startDate) {
            const [{ count }] = await db.select({ count: sql `count(*)`.mapWith(Number) })
                .from(users)
                .where(sql `${users.createdAt} >= ${startDate}`);
            userCount = count;
        }
        else {
            const [{ count }] = await db.select({ count: sql `count(*)`.mapWith(Number) }).from(users);
            userCount = count;
        }
        const [{ count: orderCount }] = await db.select({ count: sql `count(*)`.mapWith(Number) }).from(orders);
        const recentUsers = await db.select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role
        }).from(users).orderBy(sql `${users.id} DESC`).limit(5);
        const recentOrders = await db.select({
            id: orders.id,
            quantity: orders.quantity,
            status: orders.status,
            product: {
                name: catalogItems.name,
                price: products.sellingPrice
            },
            buyer: {
                name: users.name,
                email: users.email
            }
        })
            .from(orders)
            .innerJoin(products, eq(orders.productId, products.id))
            .innerJoin(catalogItems, eq(products.catalogItemId, catalogItems.id))
            .innerJoin(users, eq(orders.buyerId, users.id))
            .orderBy(sql `${orders.id} DESC`)
            .limit(5);
        // Calculate previous period for trend comparison
        let previousPeriodUsers;
        if (startDate && endDate) {
            const periodMs = endDate.getTime() - startDate.getTime();
            const prevStart = new Date(startDate.getTime() - periodMs);
            const prevEnd = new Date(startDate.getTime() - 1);
            const [{ count: prevUserCount }] = await db.select({ count: sql `count(*)`.mapWith(Number) })
                .from(users)
                .where(and(sql `${users.createdAt} >= ${prevStart}`, sql `${users.createdAt} <= ${prevEnd}`));
            previousPeriodUsers = prevUserCount;
        }
        return { totalUsers: userCount, totalOrders: orderCount, recentUsers, recentOrders, previousPeriodUsers };
    }
    async getOrdersForBuyer(buyerId) {
        const results = await db.select({
            id: orders.id,
            quantity: orders.quantity,
            status: orders.status,
            product: {
                id: products.id,
                price: products.sellingPrice,
                name: catalogItems.name,
                category: catalogItems.category,
                imageUrl: catalogItems.imageUrl
            },
            buyer: { id: users.id, name: users.name, email: users.email }
        })
            .from(orders)
            .innerJoin(products, eq(orders.productId, products.id))
            .innerJoin(catalogItems, eq(products.catalogItemId, catalogItems.id))
            .innerJoin(users, eq(orders.buyerId, users.id))
            .where(eq(orders.buyerId, buyerId));
        return results;
    }
    async getOrdersForVendor(vendorId) {
        const results = await db.select({
            id: orders.id,
            quantity: orders.quantity,
            status: orders.status,
            product: {
                id: products.id,
                price: products.sellingPrice,
                name: catalogItems.name,
                category: catalogItems.category,
                imageUrl: catalogItems.imageUrl
            },
            buyer: { id: users.id, name: users.name, email: users.email }
        })
            .from(orders)
            .innerJoin(products, eq(orders.productId, products.id))
            .innerJoin(catalogItems, eq(products.catalogItemId, catalogItems.id))
            .innerJoin(users, eq(orders.buyerId, users.id))
            .where(eq(products.vendorId, vendorId));
        return results;
    }
    async createOrder(order) {
        const [newOrder] = await db.insert(orders).values(order).returning();
        return newOrder;
    }
    // Drivers
    async getDrivers() {
        try {
            await ensureAdminOnboardingCompatibilitySchema();
            await pool.query(`ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE`).catch(() => ({ rows: [] }));
            const hasDriverVehicles = await tableExistsInPublic("driver_vehicles");
            const hasVehicles = await tableExistsInPublic("vehicles");
            const hasDriverGps = await tableExistsInPublic("driver_gps_locations");
            const driverVehiclesJoin = hasDriverVehicles
                ? `
        LEFT JOIN LATERAL (
          SELECT
            dv.vehicle_type,
            COALESCE(dv.vehicle_number, dv.registration_number) AS vehicle_number,
            dv.license_number,
            dv.model_id,
            dv.model_name,
            dv.weight_capacity,
            dv.dimensions,
            dv.body_type
          FROM driver_vehicles dv
          WHERE dv.driver_id = dp.id
          ORDER BY dv.updated_at DESC NULLS LAST, dv.id DESC
          LIMIT 1
        ) dv ON TRUE
      `
                : `
        LEFT JOIN LATERAL (
          SELECT
            NULL::text AS vehicle_type,
            NULL::text AS vehicle_number,
            NULL::text AS license_number,
            NULL::text AS model_id,
            NULL::text AS model_name,
            NULL::numeric AS weight_capacity,
            NULL::text AS dimensions,
            NULL::text AS body_type
        ) dv ON TRUE
      `;
            const vehiclesJoin = hasVehicles
                ? `
        LEFT JOIN LATERAL (
          SELECT
            v.vehicle_type,
            COALESCE(v.vehicle_number, v.registration_number) AS vehicle_number,
            v.license_plate,
            v.model_id,
            v.model_name,
            v.weight_capacity,
            v.dimensions,
            v.body_type
          FROM vehicles v
          WHERE v.driver_id = dp.id
          ORDER BY v.updated_at DESC NULLS LAST, v.id DESC
          LIMIT 1
        ) uv ON TRUE
      `
                : `
        LEFT JOIN LATERAL (
          SELECT
            NULL::text AS vehicle_type,
            NULL::text AS vehicle_number,
            NULL::text AS license_plate,
            NULL::text AS model_id,
            NULL::text AS model_name,
            NULL::numeric AS weight_capacity,
            NULL::text AS dimensions,
            NULL::text AS body_type
        ) uv ON TRUE
      `;
            const gpsJoin = hasDriverGps
                ? `
        LEFT JOIN LATERAL (
          SELECT
            g.latitude,
            g.longitude,
            g.created_at AS recorded_at
          FROM driver_gps_locations g
          WHERE g.driver_id = dp.id
          ORDER BY g.created_at DESC NULLS LAST, g.id DESC
          LIMIT 1
        ) gps ON TRUE
      `
                : `
        LEFT JOIN LATERAL (
          SELECT
            NULL::numeric AS latitude,
            NULL::numeric AS longitude,
            NULL::timestamptz AS recorded_at
        ) gps ON TRUE
      `;
            const unified = await pool.query(`
        SELECT
          dp.id,
          COALESCE(dp.full_name, u.email, 'Driver #' || dp.id::text) AS name,
          COALESCE(u.email, '') AS email,
          COALESCE(u.phone_number::text, dp.mobile_number::text, dp.phone_number::text, '') AS phone,
          COALESCE(dv.vehicle_type::text, uv.vehicle_type::text, dp.vehicle_type::text, '') AS vehicle_type,
          COALESCE(dv.vehicle_number::text, uv.vehicle_number::text, dp.vehicle_number::text, '') AS vehicle_number,
          COALESCE(dv.license_number::text, dp.license_number::text, uv.license_plate::text, '') AS license_number,
          COALESCE(dv.model_id, uv.model_id, NULL) AS vehicle_model_id,
          COALESCE(dv.model_name, uv.model_name, NULL) AS vehicle_model_name,
          COALESCE(dv.weight_capacity::text, uv.weight_capacity::text, NULL) AS vehicle_weight,
          COALESCE(dv.dimensions, uv.dimensions, NULL) AS vehicle_dimensions,
          COALESCE(dv.body_type, uv.body_type, NULL) AS body_type,
          COALESCE(gps.latitude, NULL) AS latitude,
          COALESCE(gps.longitude, NULL) AS longitude,
          COALESCE(gps.recorded_at, NULL) AS location_updated_at,
          CASE WHEN COALESCE(u.status::text, 'active') = 'active' THEN 'active' ELSE 'inactive' END AS status,
          CASE WHEN COALESCE(u.status::text, 'active') IN ('suspended','banned') THEN true ELSE false END AS is_rejected,
          COALESCE(dp.is_approved, u.is_approved, false) AS is_approved,
          COALESCE(u.verification_status::text, CASE WHEN COALESCE(dp.is_approved, u.is_approved, false) THEN 'verified' ELSE 'pending' END) AS verification_status,
          COALESCE(u.rejection_reason, NULL) AS rejection_reason,
          COALESCE(dp.avatar_url, NULL) AS photo_url,
          NULL::text AS driver_type,
          NULL::text AS bank_account_number,
          NULL::text AS bank_ifsc,
          NULL::text AS bank_name,
          NULL::text AS bank_branch,
          COALESCE(dp.preferred_zone, NULL) AS location,
          COALESCE(dp.rating::text, '0') AS service_rating,
          COALESCE(dp.created_at, NOW()) AS created_at
        FROM driver_profiles dp
        LEFT JOIN users u ON u.id = dp.user_id
        ${driverVehiclesJoin}
        ${vehiclesJoin}
        ${gpsJoin}
        ORDER BY dp.id DESC
      `).catch(() => ({ rows: [] }));
            const sourceRows = unified.rows && unified.rows.length
                ? unified.rows
                : (await pool.query(`SELECT * FROM drivers ORDER BY id DESC`).catch(() => ({ rows: [] }))).rows;
            return (sourceRows || []).map((r) => ({
                id: Number(r.id),
                name: r.name || `Driver #${r.id}`,
                email: r.email || "",
                phone: r.phone || "",
                vehicleType: r.vehicle_type || r.vehicleType || "",
                vehicleNumber: r.vehicle_number || r.vehicleNumber || "",
                licenseNumber: r.license_number || r.licenseNumber || "",
                vehicleModelId: r.vehicle_model_id || r.vehicleModelId || null,
                vehicleModelName: r.vehicle_model_name || r.vehicleModelName || null,
                vehicleWeight: r.vehicle_weight || r.vehicleWeight || null,
                vehicleDimensions: r.vehicle_dimensions || r.vehicleDimensions || null,
                bodyType: r.body_type || r.bodyType || null,
                status: r.status || "active",
                verificationStatus: r.verification_status || r.verificationStatus || null,
                rejectionReason: r.rejection_reason || r.rejectionReason || null,
                isApproved: !!(r.is_approved ?? r.isApproved),
                is_approved: !!(r.is_approved ?? r.isApproved),
                isRejected: !!(r.is_rejected ?? r.isRejected),
                is_rejected: !!(r.is_rejected ?? r.isRejected),
                photoUrl: r.photo_url || r.photoUrl || null,
                driverType: r.driver_type || r.driverType || null,
                bankAccountNumber: r.bank_account_number || r.bankAccountNumber || null,
                bankIFSC: r.bank_ifsc || r.bankIFSC || null,
                bankName: r.bank_name || r.bankName || null,
                bankBranch: r.bank_branch || r.bankBranch || null,
                location: r.location || null,
                latitude: toFiniteNumber(r.latitude),
                longitude: toFiniteNumber(r.longitude),
                locationUpdatedAt: r.location_updated_at || r.locationUpdatedAt || null,
                serviceRating: r.service_rating || r.serviceRating || "0",
                createdAt: r.created_at || r.createdAt || null,
            }));
        }
        catch (_error) {
            return [];
        }
    }
    async getDriver(id) {
        const [driver] = await db.select().from(drivers).where(eq(drivers.id, id));
        return driver;
    }
    async createDriver(driver) {
        const [newDriver] = await db.insert(drivers).values(driver).returning();
        return newDriver;
    }
    async updateDriverStatus(id, status) {
        const normalized = String(status || '').toLowerCase();
        // Unified schema path (users + driver_profiles)
        if (['verified', 'approve', 'approved', 'active'].includes(normalized)) {
            await pool.query(`
          UPDATE users u
          SET is_approved = true,
              status = 'active'
          FROM driver_profiles dp
          WHERE dp.id = $1 AND dp.user_id = u.id
        `, [id]).catch(() => ({ rows: [] }));
        }
        else if (['rejected', 'reject', 'suspended', 'inactive', 'banned'].includes(normalized)) {
            const userStatus = normalized === 'inactive' ? 'inactive' : 'suspended';
            await pool.query(`
          UPDATE users u
          SET is_approved = false,
              status = $2
          FROM driver_profiles dp
          WHERE dp.id = $1 AND dp.user_id = u.id
        `, [id, userStatus]).catch(() => ({ rows: [] }));
        }
        // Legacy fallback path (drivers table)
        try {
            const [updated] = await db.update(drivers)
                .set({ status: status })
                .where(eq(drivers.id, id))
                .returning();
            if (updated)
                return updated;
        }
        catch {
            // ignore legacy table failures in unified schema deployments
        }
        const rows = await this.getDrivers();
        return (rows.find((r) => Number(r?.id) === Number(id)) || { id, status: normalized });
    }
    async getDriverDocuments(driverId) {
        const normalizeDocValue = (value) => {
            const text = String(value || '').trim();
            if (!text)
                return null;
            if (text.startsWith('data:')) {
                const duplicateData = text.indexOf(',data:');
                return duplicateData > 0 ? text.slice(0, duplicateData) : text;
            }
            const commaIdx = text.indexOf(',');
            if (commaIdx > 0 && !text.includes('://')) {
                return text.slice(0, commaIdx).trim();
            }
            if (commaIdx > 0 && text.slice(commaIdx + 1).trim().startsWith('http')) {
                return text.slice(0, commaIdx).trim();
            }
            return text;
        };
        try {
            const [doc] = await db.select().from(driverDocuments).where(eq(driverDocuments.driverId, driverId));
            if (doc) {
                return {
                    ...doc,
                    photoUrl: normalizeDocValue(doc.photoUrl),
                    aadharUrl: normalizeDocValue(doc.aadharUrl),
                    addressProofUrl: normalizeDocValue(doc.addressProofUrl),
                    rcBookUrl: normalizeDocValue(doc.rcBookUrl),
                    licenseUrl: normalizeDocValue(doc.licenseUrl),
                };
            }
        }
        catch {
            // Continue fallback path.
        }
        const hasLegacyDriverDocss = await pool.query(`SELECT to_regclass('public.driver_documentss') AS table_name`).catch(() => ({ rows: [] }));
        if (hasLegacyDriverDocss.rows?.[0]?.table_name) {
            const legacyRes = await pool.query(`
          SELECT
            driver_id,
            photo_url,
            aadhar_url,
            address_proof_url,
            pan_url,
            rc_url,
            rc_book_url,
            license_url
          FROM driver_documentss
          WHERE driver_id = $1
          ORDER BY id DESC
          LIMIT 1
        `, [driverId]).catch(() => ({ rows: [] }));
            const row = legacyRes.rows?.[0];
            if (row) {
                return {
                    driverId,
                    photoUrl: normalizeDocValue(row.photo_url),
                    aadharUrl: normalizeDocValue(row.aadhar_url),
                    addressProofUrl: normalizeDocValue(row.address_proof_url) || normalizeDocValue(row.pan_url),
                    rcBookUrl: normalizeDocValue(row.rc_book_url) || normalizeDocValue(row.rc_url),
                    licenseUrl: normalizeDocValue(row.license_url),
                };
            }
        }
        const profileRes = await pool.query(`SELECT user_id FROM driver_profiles WHERE id = $1 LIMIT 1`, [driverId]).catch(() => ({ rows: [] }));
        const userId = Number(profileRes.rows?.[0]?.user_id || 0);
        if (!userId)
            return undefined;
        const docsRes = await pool.query(`
        SELECT
          LOWER(document_type) AS document_type,
          document_url,
          front_url,
          back_url
        FROM user_documents
        WHERE user_id = $1
      `, [userId]).catch(async () => {
            return await pool.query(`
          SELECT
            LOWER(document_type) AS document_type,
            document_url,
            NULL::text AS front_url,
            NULL::text AS back_url
          FROM user_documents
          WHERE user_id = $1
        `, [userId]).catch(() => ({ rows: [] }));
        });
        const map = new Map();
        for (const row of docsRes.rows || []) {
            const type = String(row?.document_type || '').toLowerCase();
            if (!type)
                continue;
            const preferred = normalizeDocValue(row?.front_url) ||
                normalizeDocValue(row?.document_url) ||
                normalizeDocValue(row?.back_url);
            if (preferred)
                map.set(type, preferred);
        }
        return {
            driverId,
            photoUrl: map.get('photo') || map.get('profile_photo') || null,
            aadharUrl: map.get('aadhar') || map.get('aadhaar') || null,
            addressProofUrl: map.get('address_proof') || map.get('address') || map.get('pan') || null,
            rcBookUrl: map.get('rc_book') || map.get('vehicle_rc') || map.get('registration') || map.get('rc') || null,
            licenseUrl: map.get('license') || map.get('driving_license') || null,
        };
    }
    async upsertDriverDocuments(driverId, docs) {
        const existing = await this.getDriverDocuments(driverId);
        if (existing) {
            const [updated] = await db.update(driverDocuments)
                .set(docs)
                .where(eq(driverDocuments.driverId, driverId))
                .returning();
            return updated;
        }
        const [created] = await db.insert(driverDocuments).values({ driverId, ...docs }).returning();
        return created;
    }
    // Manpower (worker_skills + worker_details)
    async getManpower(dateFilter) {
        try {
            const unified = await pool.query(`
        SELECT
          wp.id,
          COALESCE(wp.full_name, u.email, 'Worker #' || wp.id::text) AS full_name,
          COALESCE(u.phone_number, '') AS phone,
          COALESCE(wp.state, NULL) AS state,
          COALESCE(wp.city, NULL) AS city,
          COALESCE(wp.area, NULL) AS area,
          COALESCE(wp.qualification, NULL) AS qualification,
          COALESCE(wp.aadhar_number, NULL) AS aadhar_number,
          COALESCE(wp.pan_number, NULL) AS pan_number,
          COALESCE(wp.address, NULL) AS service_address,
          COALESCE(wp.rating::text, '0') AS rating,
          CASE WHEN COALESCE(wp.is_approved, u.is_approved, false) THEN true ELSE false END AS is_approved,
          CASE WHEN COALESCE(u.status::text, 'inactive') = 'active' THEN true ELSE false END AS is_online,
          CASE WHEN COALESCE(u.status::text, 'active') IN ('suspended','banned') THEN true ELSE false END AS is_frozen,
          wp.created_at,
          COALESCE(array_to_string(wp.skill_categories, ', '), NULL) AS skill
        FROM worker_profiles wp
        INNER JOIN users u ON u.id = wp.user_id
        ORDER BY wp.id DESC
      `).catch(() => ({ rows: [] }));
            const { startDate, endDate } = dateFilter || {};
            return (unified.rows || [])
                .filter((r) => {
                if (!startDate && !endDate)
                    return true;
                const createdAt = r.created_at ? new Date(r.created_at) : null;
                if (!createdAt)
                    return true;
                if (startDate && createdAt < startDate)
                    return false;
                if (endDate && createdAt > endDate)
                    return false;
                return true;
            })
                .map((r) => ({
                id: r.id,
                fullName: r.full_name,
                phone: r.phone,
                state: r.state,
                city: r.city,
                area: r.area,
                qualification: r.qualification,
                aadharNumber: r.aadhar_number,
                panNumber: r.pan_number,
                serviceAddress: r.service_address,
                bankAccountNumber: null,
                bankIFSC: null,
                bankName: null,
                bankBranch: null,
                rating: r.rating,
                reviewsCount: 0,
                isApproved: r.is_approved,
                isOnline: r.is_online,
                isFrozen: r.is_frozen,
                createdAt: r.created_at,
                skill: r.skill,
                experience: null,
                category: null,
                status: r.is_frozen ? 'inactive' : (r.is_approved && r.is_online ? 'available' : 'busy'),
            }));
        }
        catch (_error) {
            // fall through to legacy tables
        }
        const { startDate, endDate } = dateFilter || {};
        let query = db.select({
            id: workerSkills.id,
            fullName: workerSkills.fullName,
            phone: workerSkills.phone,
            state: workerSkills.state,
            city: workerSkills.city,
            area: workerSkills.area,
            qualification: workerSkills.qualification,
            aadharNumber: workerSkills.aadharNumber,
            panNumber: workerSkills.panNumber,
            serviceAddress: workerSkills.serviceAddress,
            bankAccountNumber: workerSkills.bankAccountNumber,
            bankIFSC: workerSkills.bankIFSC,
            bankName: workerSkills.bankName,
            bankBranch: workerSkills.bankBranch,
            rating: workerSkills.rating,
            reviewsCount: workerSkills.reviewsCount,
            isApproved: workerSkills.isApproved,
            isOnline: workerSkills.isOnline,
            isFrozen: workerSkills.isFrozen,
            createdAt: workerSkills.createdAt,
            skill: workerDetails.skillName,
            experience: workerDetails.experience,
            category: workerDetails.category,
        })
            .from(workerSkills)
            .leftJoin(workerDetails, eq(workerDetails.workerId, workerSkills.id));
        let rows;
        if (startDate && endDate) {
            rows = await query
                .where(and(sql `${workerSkills.createdAt} >= ${startDate}`, sql `${workerSkills.createdAt} <= ${endDate}`))
                .orderBy(sql `${workerSkills.createdAt} DESC`);
        }
        else if (startDate) {
            rows = await query
                .where(sql `${workerSkills.createdAt} >= ${startDate}`)
                .orderBy(sql `${workerSkills.createdAt} DESC`);
        }
        else {
            rows = await query.orderBy(sql `${workerSkills.createdAt} DESC`);
        }
        return rows.map(r => ({
            ...r,
            status: r.isFrozen ? 'inactive' : (r.isApproved && r.isOnline ? 'available' : 'busy'),
        }));
    }
    async createManpower(worker, skillData) {
        const [newWorker] = await db.insert(workerSkills).values(worker).returning();
        if (skillData && (skillData.skillName || skillData.experience || skillData.category)) {
            await db.insert(workerDetails).values({
                workerId: newWorker.id,
                skillName: skillData.skillName || null,
                experience: skillData.experience || null,
                category: skillData.category || null,
            });
        }
        // Create wallet entry
        await db.insert(walletTable).values({ workerId: newWorker.id }).onConflictDoNothing();
        return newWorker;
    }
    async updateManpowerStatus(id, status) {
        const updates = {};
        if (status === 'available') {
            updates.isOnline = true;
            updates.isFrozen = false;
        }
        else if (status === 'busy') {
            updates.isOnline = false;
        }
        else if (status === 'inactive') {
            updates.isFrozen = true;
            updates.isOnline = false;
        }
        const [updated] = await db.update(workerSkills)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(workerSkills.id, id))
            .returning();
        return updated;
    }
    async getManpowerById(id) {
        const [worker] = await db.select({
            id: workerSkills.id,
            fullName: workerSkills.fullName,
            phone: workerSkills.phone,
            state: workerSkills.state,
            city: workerSkills.city,
            area: workerSkills.area,
            qualification: workerSkills.qualification,
            isApproved: workerSkills.isApproved,
            isOnline: workerSkills.isOnline,
            isFrozen: workerSkills.isFrozen,
            rating: workerSkills.rating,
            reviewsCount: workerSkills.reviewsCount,
        }).from(workerSkills).where(eq(workerSkills.id, id));
        if (!worker)
            return undefined;
        return {
            ...worker,
            status: worker.isFrozen ? 'inactive' : (worker.isApproved && worker.isOnline ? 'available' : 'busy'),
        };
    }
    // Clients
    async getClients(dateFilter) {
        try {
            const unified = await pool.query(`
        SELECT
          cp.id,
          COALESCE(cp.full_name, u.email, 'Client #' || cp.id::text) AS name,
          COALESCE(u.email, '') AS email,
          COALESCE(u.phone_number, '') AS phone,
          COALESCE(cp.company, NULL) AS company,
          NULL::text AS area,
          NULL::text AS address,
          COALESCE(cp.service_preference, 'vendor') AS service_type,
          cp.created_at
        FROM client_profiles cp
        INNER JOIN users u ON u.id = cp.user_id
        ORDER BY cp.id DESC
      `).catch(() => ({ rows: [] }));
            const { startDate, endDate } = dateFilter || {};
            return (unified.rows || [])
                .filter((r) => {
                if (!startDate && !endDate)
                    return true;
                const createdAt = r.created_at ? new Date(r.created_at) : null;
                if (!createdAt)
                    return true;
                if (startDate && createdAt < startDate)
                    return false;
                if (endDate && createdAt > endDate)
                    return false;
                return true;
            })
                .map((r) => ({
                id: Number(r.id),
                name: r.name,
                email: r.email,
                phone: r.phone,
                company: r.company,
                area: r.area,
                address: r.address,
                serviceType: r.service_type,
                createdAt: r.created_at,
            }));
        }
        catch (_error) {
            // fallback to legacy table
        }
        const { startDate, endDate } = dateFilter || {};
        if (startDate && endDate) {
            return await db.select().from(clients)
                .where(and(sql `${clients.createdAt} >= ${startDate}`, sql `${clients.createdAt} <= ${endDate}`))
                .orderBy(sql `${clients.id} DESC`);
        }
        else if (startDate) {
            return await db.select().from(clients)
                .where(sql `${clients.createdAt} >= ${startDate}`)
                .orderBy(sql `${clients.id} DESC`);
        }
        return await db.select().from(clients).orderBy(sql `${clients.id} DESC`);
    }
    async getClient(id) {
        const [client] = await db.select().from(clients).where(eq(clients.id, id));
        return client;
    }
    async createClient(client) {
        const [newClient] = await db.insert(clients).values(client).returning();
        return newClient;
    }
    // Jobs
    async getJobs(dateFilter) {
        try {
            const result = await pool.query(`
        SELECT
          j.id,
          COALESCE(j.job_title, j.description, 'Job #' || j.id::text) AS title,
          j.description,
          j.job_type,
          j.status,
          j.deadline,
          j.created_at,
          cp.id AS client_id,
          COALESCE(cp.full_name, u.email, 'Client #' || cp.id::text) AS client_name,
          u.email AS client_email,
          u.phone_number AS client_phone,
          cp.area AS client_area,
          j.assigned_user_id,
          j.assigned_user_type
        FROM jobs j
        LEFT JOIN client_profiles cp ON cp.id = j.client_id
        LEFT JOIN users u ON u.id = cp.user_id
        ORDER BY j.id DESC
      `).catch(() => ({ rows: [] }));
            const { startDate, endDate } = dateFilter || {};
            return (result.rows || [])
                .filter((r) => {
                if (!startDate && !endDate)
                    return true;
                const createdAt = r.created_at ? new Date(r.created_at) : null;
                if (!createdAt)
                    return true;
                if (startDate && createdAt < startDate)
                    return false;
                if (endDate && createdAt > endDate)
                    return false;
                return true;
            })
                .map((r) => ({
                id: Number(r.id),
                title: r.title,
                description: r.description,
                jobType: r.job_type,
                status: r.status,
                deadline: r.deadline,
                createdAt: r.created_at,
                client: {
                    id: r.client_id ? Number(r.client_id) : null,
                    name: r.client_name,
                    email: r.client_email || "",
                    phone: r.client_phone || "",
                    area: r.client_area || null,
                },
                assignedDriverId: r.assigned_user_type === "driver" ? Number(r.assigned_user_id) : null,
                assignedWorkerId: r.assigned_user_type === "worker" ? String(r.assigned_user_id) : null,
            }));
        }
        catch (_error) {
            // Fall back to legacy tables.
        }
        const { startDate, endDate } = dateFilter || {};
        const baseSelect = {
            id: jobs.id,
            title: jobs.title,
            description: jobs.description,
            jobType: jobs.jobType,
            status: jobs.status,
            deadline: jobs.deadline,
            createdAt: jobs.createdAt,
            client: {
                id: clients.id,
                name: clients.name,
                email: clients.email,
                phone: clients.phone,
                area: clients.area
            },
            assignedDriverId: jobs.assignedDriverId,
            assignedWorkerId: jobs.assignedWorkerId
        };
        if (startDate && endDate) {
            return await db.select(baseSelect)
                .from(jobs)
                .innerJoin(clients, eq(jobs.clientId, clients.id))
                .where(and(sql `${jobs.createdAt} >= ${startDate}`, sql `${jobs.createdAt} <= ${endDate}`))
                .orderBy(sql `${jobs.id} DESC`);
        }
        else if (startDate) {
            return await db.select(baseSelect)
                .from(jobs)
                .innerJoin(clients, eq(jobs.clientId, clients.id))
                .where(sql `${jobs.createdAt} >= ${startDate}`)
                .orderBy(sql `${jobs.id} DESC`);
        }
        return await db.select(baseSelect)
            .from(jobs)
            .innerJoin(clients, eq(jobs.clientId, clients.id))
            .orderBy(sql `${jobs.id} DESC`);
    }
    async getOpsOrders(dateFilter) {
        try {
            const ordersRes = await pool.query(`SELECT * FROM orders ORDER BY id DESC`);
            const allOrders = ordersRes.rows || [];
            const { startDate, endDate } = dateFilter || {};
            const filtered = allOrders.filter((o) => {
                const createdAtRaw = o.created_at || o.createdAt;
                if (!createdAtRaw)
                    return true;
                const createdAt = new Date(createdAtRaw);
                if (startDate && createdAt < startDate)
                    return false;
                if (endDate && createdAt > endDate)
                    return false;
                return true;
            });
            const productIds = Array.from(new Set(filtered.map((o) => o.product_id ?? o.productId).filter(Boolean)));
            const buyerIds = Array.from(new Set(filtered.map((o) => {
                const v = o.user_id ?? o.buyer_id ?? o.buyerId ?? o.client_id;
                const n = Number(v);
                return Number.isFinite(n) && n > 0 ? n : null;
            }).filter(Boolean)));
            const driverIds = Array.from(new Set(filtered.map((o) => o.assigned_driver_id ?? o.assignedDriverId ?? o.driver_id).filter(Boolean)));
            const [productsRes, usersRes, driversRes, vendorProfilesRes] = await Promise.all([
                productIds.length ? pool.query(`SELECT * FROM products WHERE id = ANY($1)`, [productIds]).catch(() => ({ rows: [] })) : Promise.resolve({ rows: [] }),
                buyerIds.length ? pool.query(`SELECT * FROM users WHERE id = ANY($1)`, [buyerIds]).catch(() => ({ rows: [] })) : Promise.resolve({ rows: [] }),
                driverIds.length ? pool.query(`SELECT * FROM drivers WHERE id = ANY($1)`, [driverIds]).catch(() => ({ rows: [] })) : Promise.resolve({ rows: [] }),
                pool.query(`SELECT * FROM vendor_profiles`).catch(() => ({ rows: [] })),
            ]);
            const productMap = new Map();
            for (const p of productsRes.rows)
                productMap.set(Number(p.id), p);
            const userMap = new Map();
            for (const u of usersRes.rows)
                userMap.set(Number(u.id), u);
            const driverMap = new Map();
            for (const d of driversRes.rows)
                driverMap.set(Number(d.id), d);
            const vpMap = new Map();
            for (const vp of vendorProfilesRes.rows)
                vpMap.set(Number(vp.id), vp);
            return filtered.map((o) => {
                const productId = Number(o.product_id ?? o.productId ?? 0);
                const buyerId = Number(o.user_id ?? o.buyer_id ?? o.buyerId ?? o.client_id ?? 0);
                const assignedDriverId = o.assigned_driver_id ?? o.assignedDriverId ?? o.driver_id ?? null;
                const p = productMap.get(productId) || null;
                const buyer = userMap.get(buyerId) || null;
                const driver = assignedDriverId ? driverMap.get(Number(assignedDriverId)) : null;
                const orderVendorId = o.vendor_id ?? p?.vendor_id ?? null;
                const vp = orderVendorId ? vpMap.get(Number(orderVendorId)) : null;
                return {
                    id: Number(o.id),
                    status: o.status || "pending",
                    normalizedStatus: normalizeUnifiedOrderStatus(o.status),
                    quantity: Number(o.quantity || 1),
                    createdAt: o.created_at || o.createdAt || null,
                    orderDate: o.order_date || null,
                    assignedDriverId: assignedDriverId ? Number(assignedDriverId) : null,
                    assignedWorkerId: o.assigned_worker_id ?? o.assignedWorkerId ?? null,
                    buyerId,
                    productId,
                    vendorId: orderVendorId ? Number(orderVendorId) : null,
                    customerName: o.customer_name || o.client_name || buyer?.name || null,
                    customerPhone: o.customer_phone || o.client_phone || buyer?.phone || null,
                    pickupAddress: o.pickup_address || null,
                    deliveryAddress: o.delivery_address || o.address_text || null,
                    pickupLatitude: o.pickup_latitude ?? o.pickup_latitude ?? null,
                    pickupLongitude: o.pickup_longitude ?? o.pickup_longitude ?? null,
                    deliveryLatitude: o.delivery_latitude ?? o.drop_latitude ?? null,
                    deliveryLongitude: o.delivery_longitude ?? o.drop_longitude ?? null,
                    vehicleType: o.vehicle_type || null,
                    vehicleOptionId: o.vehicle_option_id || o.model_id_requested || null,
                    vehicleName: o.vehicle_name || o.model_name_requested || null,
                    vehicleDesc: o.vehicle_desc || o.dimensions_requested || null,
                    addressTag: o.address_tag || null,
                    deliveryArea: o.delivery_area || null,
                    deliveryCity: o.delivery_city || null,
                    deliveryState: o.delivery_state || null,
                    deliveryPincode: o.delivery_pincode || null,
                    deliveryLandmark: o.delivery_landmark || null,
                    deliveryFee: Number(o.delivery_fee || 0),
                    itemsTotal: Number(o.items_total || o.order_amount || 0),
                    finalTotal: Number(o.final_total || o.final_amount || o.total_amount || 0),
                    tipAmount: Number(o.tip_amount || 0),
                    scheduleTime: o.schedule_time || null,
                    instructions: o.instructions_json || null,
                    gst: o.gst_json || null,
                    orderMeta: o.order_meta || null,
                    itemsRaw: o.items || null,
                    product: {
                        id: p?.id ?? productId,
                        name: p?.product_name || p?.name || `Product #${productId || 'N/A'}`,
                        price: p?.selling_price || p?.price || "0",
                        category: p?.category || "other",
                        vendorId: p?.vendor_id || orderVendorId || null,
                    },
                    buyer: {
                        id: buyer?.id ?? buyerId,
                        name: buyer?.name || `Buyer #${buyerId || 'N/A'}`,
                        phone: buyer?.phone || "",
                        email: buyer?.email || "",
                    },
                    vendor: {
                        id: vp?.id ?? null,
                        name: vp?.business_name || (p?.vendor_id ? `Vendor #${p.vendor_id}` : "Unknown"),
                    },
                    driver: driver ? {
                        id: driver.id,
                        name: driver.name || `Driver #${driver.id}`,
                        phone: driver.phone || "",
                    } : null,
                };
            });
        }
        catch (_error) {
            return [];
        }
    }
    async updateOrderStatus(id, status) {
        const storedStatus = mapOrderStatusForStorage(status);
        const result = await pool.query(`UPDATE orders SET status = $2 WHERE id = $1 RETURNING *`, [id, storedStatus]);
        const row = result.rows[0] || null;
        return row ? { ...row, normalizedStatus: normalizeUnifiedOrderStatus(row.status) } : null;
    }
    async assignOrderDriver(orderId, driverId) {
        const result = await pool.query(`UPDATE orders SET assigned_driver_id = $2 WHERE id = $1 RETURNING *`, [orderId, driverId]);
        return result.rows[0] || null;
    }
    async createJob(job) {
        const [newJob] = await db.insert(jobs).values(job).returning();
        return newJob;
    }
    async updateJobStatus(id, status) {
        const [updated] = await db.update(jobs)
            .set({ status: status })
            .where(eq(jobs.id, id))
            .returning();
        return updated;
    }
    async assignJobDriver(jobId, driverId) {
        const [updated] = await db.update(jobs)
            .set({ assignedDriverId: driverId })
            .where(eq(jobs.id, jobId))
            .returning();
        return updated;
    }
    async assignJobWorker(jobId, workerId) {
        const [updated] = await db.update(jobs)
            .set({ assignedWorkerId: workerId })
            .where(eq(jobs.id, jobId))
            .returning();
        return updated;
    }
    // Support
    async getSupportTickets() {
        try {
            const result = await pool.query(`
        SELECT
          st.id,
          st.subject,
          st.description,
          st.status,
          st.priority,
          st.created_at,
          st.updated_at,
          u.id AS user_id,
          COALESCE(u.email, 'User #' || u.id::text) AS user_name,
          u.email AS user_email,
          COALESCE(u.user_type::text, 'user') AS user_role
        FROM support_tickets st
        LEFT JOIN users u ON u.id = st.user_id
        ORDER BY st.id DESC
      `);
            return result.rows.map((r) => ({
                id: Number(r.id),
                subject: r.subject,
                description: r.description,
                status: r.status,
                priority: r.priority,
                createdAt: r.created_at,
                updatedAt: r.updated_at,
                user: {
                    id: Number(r.user_id || 0),
                    name: r.user_name,
                    email: r.user_email,
                    role: r.user_role,
                },
            }));
        }
        catch (_error) {
            // Fall back to legacy drizzle schema.
        }
        return await db.select({
            id: supportTickets.id,
            subject: supportTickets.subject,
            description: supportTickets.description,
            status: supportTickets.status,
            priority: supportTickets.priority,
            createdAt: supportTickets.createdAt,
            updatedAt: supportTickets.updatedAt,
            user: {
                id: users.id,
                name: users.name,
                email: users.email,
                role: users.role
            }
        })
            .from(supportTickets)
            .innerJoin(users, eq(supportTickets.userId, users.id))
            .orderBy(sql `${supportTickets.id} DESC`);
    }
    async createSupportTicket(ticket) {
        const [newTicket] = await db.insert(supportTickets).values(ticket).returning();
        return newTicket;
    }
    async updateTicketStatus(id, status) {
        const [updated] = await db.update(supportTickets)
            .set({ status: status, updatedAt: sql `CURRENT_TIMESTAMP` })
            .where(eq(supportTickets.id, id))
            .returning();
        return updated;
    }
    // Conversations
    async getConversation(id) {
        const [conversation] = await db
            .select()
            .from(conversations)
            .where(eq(conversations.id, id));
        if (!conversation)
            return null;
        // Get unread count
        const unreadCount = await db
            .select({ count: sql `count(*)` })
            .from(messages)
            .where(and(eq(messages.conversationId, id), sql `${messages.readAt} IS NULL`));
        return { ...conversation, unreadCount: unreadCount[0]?.count || 0 };
    }
    async getConversations(entityType, entityId) {
        const convos = await db
            .select()
            .from(conversations)
            .where(or(and(eq(conversations.participant1Type, entityType), eq(conversations.participant1Id, entityId)), and(eq(conversations.participant2Type, entityType), eq(conversations.participant2Id, entityId))))
            .orderBy(desc(conversations.lastMessageAt));
        // Get last message and unread count for each
        return await Promise.all(convos.map(async (convo) => {
            const lastMsg = await db
                .select()
                .from(messages)
                .where(eq(messages.conversationId, convo.id))
                .orderBy(desc(messages.createdAt))
                .limit(1);
            const unreadCount = await db
                .select({ count: sql `count(*)` })
                .from(messages)
                .where(and(eq(messages.conversationId, convo.id), sql `${messages.readAt} IS NULL`, 
            // Not sent by current user
            sql `NOT (${messages.senderType} = ${entityType} AND ${messages.senderId} = ${entityId})`));
            return {
                ...convo,
                lastMessage: lastMsg[0] || null,
                unreadCount: unreadCount[0]?.count || 0,
            };
        }));
    }
    async findOrCreateConversation(p1Type, p1Id, p2Type, p2Id, metadata) {
        // Try to find existing conversation (bidirectional)
        const existing = await db
            .select()
            .from(conversations)
            .where(or(and(eq(conversations.participant1Type, p1Type), eq(conversations.participant1Id, p1Id), eq(conversations.participant2Type, p2Type), eq(conversations.participant2Id, p2Id)), and(eq(conversations.participant1Type, p2Type), eq(conversations.participant1Id, p2Id), eq(conversations.participant2Type, p1Type), eq(conversations.participant2Id, p1Id))))
            .limit(1);
        if (existing[0])
            return existing[0];
        // Create new conversation
        const [newConvo] = await db
            .insert(conversations)
            .values({
            participant1Type: p1Type,
            participant1Id: p1Id,
            participant2Type: p2Type,
            participant2Id: p2Id,
            ...metadata,
        })
            .returning();
        return newConvo;
    }
    async updateConversationLastMessage(conversationId) {
        await db
            .update(conversations)
            .set({ lastMessageAt: sql `NOW()` })
            .where(eq(conversations.id, conversationId));
    }
    async archiveConversation(id) {
        const [archived] = await db
            .update(conversations)
            .set({ status: "archived" })
            .where(eq(conversations.id, id))
            .returning();
        return archived;
    }
    // Messages
    async getMessages(conversationId, limit = 50, before) {
        const msgs = before
            ? await db
                .select()
                .from(messages)
                .where(and(eq(messages.conversationId, conversationId), sql `${messages.id} < ${before}`))
                .orderBy(desc(messages.createdAt))
                .limit(limit)
            : await db
                .select()
                .from(messages)
                .where(eq(messages.conversationId, conversationId))
                .orderBy(desc(messages.createdAt))
                .limit(limit);
        return msgs.reverse(); // Chronological order
    }
    async createMessage(message) {
        const [newMsg] = await db
            .insert(messages)
            .values(message)
            .returning();
        // Update conversation's lastMessageAt
        await this.updateConversationLastMessage(message.conversationId);
        return newMsg;
    }
    async markMessageAsRead(messageId) {
        const [updated] = await db
            .update(messages)
            .set({ readAt: sql `NOW()` })
            .where(eq(messages.id, messageId))
            .returning();
        return updated;
    }
    async markConversationAsRead(conversationId, readerType, readerId) {
        await db
            .update(messages)
            .set({ readAt: sql `NOW()` })
            .where(and(eq(messages.conversationId, conversationId), sql `${messages.readAt} IS NULL`, 
        // Not sent by reader
        sql `NOT (${messages.senderType} = ${readerType} AND ${messages.senderId} = ${readerId})`));
    }
    async getSupportConversations() {
        try {
            const convosRes = await pool.query(`
        SELECT *
        FROM conversations
        WHERE COALESCE(conversation_type, 'direct') = 'support'
        ORDER BY last_message_at DESC NULLS LAST, id DESC
      `);
            return await Promise.all((convosRes.rows || []).map(async (convo) => {
                const lastMsgRes = await pool.query(`
              SELECT id, conversation_id, sender_id, message_text, is_read, created_at
              FROM messages
              WHERE conversation_id = $1
              ORDER BY created_at DESC, id DESC
              LIMIT 1
            `, [convo.id]).catch(() => ({ rows: [] }));
                const unreadRes = await pool.query(`
              SELECT COUNT(*)::int AS count
              FROM messages
              WHERE conversation_id = $1
                AND COALESCE(is_read, false) = false
                AND sender_id <> 0
            `, [convo.id]).catch(() => ({ rows: [{ count: 0 }] }));
                let ticket = null;
                if (convo.support_ticket_id) {
                    const ticketRes = await pool.query(`SELECT * FROM support_tickets WHERE id = $1 LIMIT 1`, [convo.support_ticket_id]).catch(() => ({ rows: [] }));
                    ticket = ticketRes.rows[0] || null;
                }
                const participant1Id = String(convo.participant1_id);
                const participant2Id = String(convo.participant2_id);
                const isAdminP1 = participant1Id === "0";
                const otherId = isAdminP1 ? participant2Id : participant1Id;
                const lastRow = lastMsgRes.rows[0] || null;
                return {
                    id: Number(convo.id),
                    participant1Type: "user",
                    participant1Id,
                    participant2Type: "user",
                    participant2Id,
                    title: convo.title,
                    conversationType: convo.conversation_type || "support",
                    supportTicketId: convo.support_ticket_id ? Number(convo.support_ticket_id) : null,
                    relatedEntityType: convo.related_entity_type || null,
                    relatedEntityId: convo.related_entity_id ? Number(convo.related_entity_id) : null,
                    lastMessageAt: convo.last_message_at || null,
                    status: convo.status || "active",
                    createdAt: convo.created_at || null,
                    lastMessage: lastRow
                        ? {
                            id: Number(lastRow.id),
                            conversationId: Number(lastRow.conversation_id),
                            senderType: "user",
                            senderId: String(lastRow.sender_id),
                            content: lastRow.message_text,
                            messageType: "text",
                            readAt: lastRow.is_read ? (lastRow.created_at || null) : null,
                            createdAt: lastRow.created_at,
                        }
                        : null,
                    unreadCount: Number(unreadRes.rows[0]?.count || 0),
                    supportTicket: ticket,
                    _otherType: "user",
                    _otherId: otherId,
                };
            }));
        }
        catch (_error) {
            return [];
        }
    }
    // Onboarding - Vendors
    async getPendingVendors() {
        try {
            await ensureAdminOnboardingCompatibilitySchema();
            const hasVendorProfiles = await tableExistsInPublic('vendor_profiles');
            const hasVendors = await tableExistsInPublic('vendors');
            if (!hasVendorProfiles && !hasVendors) {
                return [];
            }
            const [vendorsRes, countsRes] = await Promise.all([
                hasVendorProfiles ? pool.query(`
          SELECT
            vp.*,
            vp.user_id,
            u.email AS user_email,
            u.phone_number AS user_phone,
            u.is_approved AS user_is_approved,
            u.status AS user_status,
            u.verification_status AS user_verification_status,
            u.rejection_reason AS user_rejection_reason,
            ${hasVendors ? `
            v.shop_name,
            v.owner_name AS vendor_owner_name,
            v.phone AS vendor_phone,
            v.email AS vendor_email,
            v.status AS vendor_status,
            v.shop_address,
            v.shop_latitude,
            v.shop_longitude,
            v.location_label,
            v.location_updated_at,
            v.gst_number AS vendor_gst_number` : `
            NULL::text AS shop_name,
            NULL::text AS vendor_owner_name,
            NULL::text AS vendor_phone,
            NULL::text AS vendor_email,
            NULL::text AS vendor_status,
            NULL::text AS shop_address,
            NULL::numeric AS shop_latitude,
            NULL::numeric AS shop_longitude,
            NULL::text AS location_label,
            NULL::timestamptz AS location_updated_at,
            NULL::text AS vendor_gst_number`}
          FROM vendor_profiles vp
          LEFT JOIN users u ON u.id = vp.user_id
          ${hasVendors ? `LEFT JOIN vendors v ON v.id = vp.id` : ``}
          ORDER BY vp.created_at DESC NULLS LAST, vp.id DESC
        `) : pool.query(`
          SELECT
            v.id,
            NULL::bigint AS user_id,
            NULL::text AS user_email,
            NULL::text AS user_phone,
            NULL::boolean AS user_is_approved,
            NULL::text AS user_status,
            NULL::text AS user_verification_status,
            NULL::text AS user_rejection_reason,
            v.shop_name,
            v.owner_name AS vendor_owner_name,
            v.phone AS vendor_phone,
            v.email AS vendor_email,
            v.status AS vendor_status,
            v.shop_address,
            v.shop_latitude,
            v.shop_longitude,
            v.location_label,
            v.location_updated_at,
            v.gst_number AS vendor_gst_number,
            v.created_at,
            NULL::text AS verification_status,
            NULL::text AS rejection_reason,
            v.gst_number
          FROM vendors v
          ORDER BY v.created_at DESC NULLS LAST, v.id DESC
        `),
                pool.query(`SELECT vendor_id, COUNT(*)::int AS total_products FROM products GROUP BY vendor_id`).catch(() => ({ rows: [] })),
            ]);
            const countMap = new Map();
            for (const row of countsRes.rows) {
                countMap.set(Number(row.vendor_id), Number(row.total_products || 0));
            }
            return vendorsRes.rows
                .map((vp) => this.mapVendorProfileRow(vp, countMap.get(Number(vp.id)) || 0))
                .filter((v) => (v.verificationStatus || "pending") === "pending");
        }
        catch (_error) {
            return [];
        }
    }
    async getAllVendorsWithStatus() {
        try {
            await ensureAdminOnboardingCompatibilitySchema();
            const hasVendorProfiles = await tableExistsInPublic('vendor_profiles');
            const hasVendors = await tableExistsInPublic('vendors');
            if (!hasVendorProfiles && !hasVendors) {
                return [];
            }
            const [vendorsRes, countsRes] = await Promise.all([
                hasVendorProfiles ? pool.query(`
          SELECT
            vp.*,
            vp.user_id,
            u.email AS user_email,
            u.phone_number AS user_phone,
            u.is_approved AS user_is_approved,
            u.status AS user_status,
            u.verification_status AS user_verification_status,
            u.rejection_reason AS user_rejection_reason,
            ${hasVendors ? `
            v.shop_name,
            v.owner_name AS vendor_owner_name,
            v.phone AS vendor_phone,
            v.email AS vendor_email,
            v.status AS vendor_status,
            v.shop_address,
            v.shop_latitude,
            v.shop_longitude,
            v.location_label,
            v.location_updated_at,
            v.gst_number AS vendor_gst_number` : `
            NULL::text AS shop_name,
            NULL::text AS vendor_owner_name,
            NULL::text AS vendor_phone,
            NULL::text AS vendor_email,
            NULL::text AS vendor_status,
            NULL::text AS shop_address,
            NULL::numeric AS shop_latitude,
            NULL::numeric AS shop_longitude,
            NULL::text AS location_label,
            NULL::timestamptz AS location_updated_at,
            NULL::text AS vendor_gst_number`}
          FROM vendor_profiles vp
          LEFT JOIN users u ON u.id = vp.user_id
          ${hasVendors ? `LEFT JOIN vendors v ON v.id = vp.id` : ``}
          ORDER BY vp.created_at DESC NULLS LAST, vp.id DESC
        `) : pool.query(`
          SELECT
            v.id,
            NULL::bigint AS user_id,
            NULL::text AS user_email,
            NULL::text AS user_phone,
            NULL::boolean AS user_is_approved,
            NULL::text AS user_status,
            NULL::text AS user_verification_status,
            NULL::text AS user_rejection_reason,
            v.shop_name,
            v.owner_name AS vendor_owner_name,
            v.phone AS vendor_phone,
            v.email AS vendor_email,
            v.status AS vendor_status,
            v.shop_address,
            v.shop_latitude,
            v.shop_longitude,
            v.location_label,
            v.location_updated_at,
            v.gst_number AS vendor_gst_number,
            v.created_at,
            NULL::text AS verification_status,
            NULL::text AS rejection_reason,
            v.gst_number
          FROM vendors v
          ORDER BY v.created_at DESC NULLS LAST, v.id DESC
        `),
                pool.query(`SELECT vendor_id, COUNT(*)::int AS total_products FROM products GROUP BY vendor_id`).catch(() => ({ rows: [] })),
            ]);
            const countMap = new Map();
            for (const row of countsRes.rows) {
                countMap.set(Number(row.vendor_id), Number(row.total_products || 0));
            }
            return vendorsRes.rows.map((vp) => this.mapVendorProfileRow(vp, countMap.get(Number(vp.id)) || 0));
        }
        catch (_error) {
            return [];
        }
    }
    async getVendorDocuments(vendorId) {
        try {
            const [doc] = await db.select().from(vendorDocuments).where(eq(vendorDocuments.vendorId, vendorId));
            if (doc)
                return doc;
        }
        catch {
            // Fall back to unified user_documents path when legacy vendor_documents is unavailable.
        }
        const profileRes = await pool.query(`SELECT user_id FROM vendor_profiles WHERE id = $1 LIMIT 1`, [vendorId]).catch(() => ({ rows: [] }));
        const userId = Number(profileRes.rows?.[0]?.user_id || 0);
        const settingRows = (await pool.query(`SELECT key, value
       FROM app_settings
       WHERE key = ANY($1)`, [[
                `vendor_profile_${vendorId}`,
                `vendor_company_${vendorId}`,
                `vendor_bank_${vendorId}`,
                `vendor_address_${vendorId}`,
                `vendor_documents_${vendorId}`,
            ]]).catch(() => ({ rows: [] }))).rows || [];
        const parseSettingJson = (key) => {
            const row = settingRows.find((r) => String(r?.key || '') === key);
            if (!row?.value)
                return null;
            try {
                return JSON.parse(String(row.value));
            }
            catch {
                return null;
            }
        };
        const profileDetails = parseSettingJson(`vendor_profile_${vendorId}`);
        const companyDetails = parseSettingJson(`vendor_company_${vendorId}`);
        const bankDetails = parseSettingJson(`vendor_bank_${vendorId}`);
        const addressDetails = parseSettingJson(`vendor_address_${vendorId}`);
        const rawDocuments = parseSettingJson(`vendor_documents_${vendorId}`) || {};
        if (!userId) {
            return {
                vendorId,
                gstUrl: null,
                panUrl: null,
                aadharUrl: null,
                businessLicenseUrl: null,
                profileDetails,
                companyDetails,
                bankDetails,
                addressDetails,
            };
        }
        const docsRes = await pool.query(`
        SELECT
          LOWER(document_type) AS document_type,
          document_url,
          front_url,
          back_url
        FROM user_documents
        WHERE user_id = $1
      `, [userId]).catch(async () => {
            return await pool.query(`
          SELECT
            LOWER(document_type) AS document_type,
            document_url,
            NULL::text AS front_url,
            NULL::text AS back_url
          FROM user_documents
          WHERE user_id = $1
        `, [userId]).catch(() => ({ rows: [] }));
        });
        const normalizeDocValue = (value) => {
            const text = String(value || '').trim();
            if (!text)
                return null;
            if (text.startsWith('data:')) {
                const duplicateData = text.indexOf(',data:');
                return duplicateData > 0 ? text.slice(0, duplicateData) : text;
            }
            const commaIdx = text.indexOf(',');
            if (commaIdx > 0 && !text.includes('://')) {
                return text.slice(0, commaIdx).trim();
            }
            if (commaIdx > 0 && text.slice(commaIdx + 1).trim().startsWith('http')) {
                return text.slice(0, commaIdx).trim();
            }
            return text;
        };
        const map = new Map();
        for (const row of docsRes.rows || []) {
            const type = String(row?.document_type || '').toLowerCase();
            if (!type)
                continue;
            const preferred = normalizeDocValue(row?.front_url) ||
                normalizeDocValue(row?.document_url) ||
                normalizeDocValue(row?.back_url);
            if (preferred) {
                map.set(type, preferred);
            }
        }
        const pickByType = (...types) => {
            for (const type of types) {
                const value = map.get(type.toLowerCase());
                if (value)
                    return value;
            }
            return null;
        };
        const pickFromRaw = (...keys) => {
            for (const key of keys) {
                const value = rawDocuments?.[key];
                if (Array.isArray(value)) {
                    const first = String(value[0] || '').trim();
                    if (first)
                        return first;
                }
                const text = String(value || '').trim();
                if (text)
                    return text;
            }
            return null;
        };
        return {
            vendorId,
            gstUrl: pickByType('gst', 'gst_certificate', 'gstin') || pickFromRaw('gst_certificate'),
            panUrl: pickByType('pan', 'pan_card') || pickFromRaw('pan_front', 'pan'),
            aadharUrl: pickByType('aadhar', 'aadhaar') || pickFromRaw('aadhaar_front', 'aadhar_front', 'aadhaar', 'aadhar'),
            cancelledChequeUrl: pickByType('bank_proof', 'cancelled_cheque', 'passbook_cancelled_cheque', 'bank_details') || pickFromRaw('bank_proofs', 'cancelled_cheque', 'passbook_cancelled_cheque'),
            gstCertificateUrl: pickByType('gst_certificate', 'gst', 'gstin') || pickFromRaw('gst_certificate'),
            shopLicenseUrl: pickByType('shop_license', 'business_license', 'vendor_shop', 'registration_certificate') || pickFromRaw('vendor_shop', 'registration_certificate'),
            businessLicenseUrl: pickByType('business_license', 'shop_license', 'registration_certificate') || pickFromRaw('business_license', 'registration_certificate', 'vendor_shop'),
            panImageUrl: pickByType('pan_image', 'pan', 'pan_card') || pickFromRaw('pan_front', 'pan'),
            registrationCertificateUrl: pickByType('registration_certificate', 'business_license', 'shop_license') || pickFromRaw('registration_certificate', 'vendor_shop'),
            passbookCancelledChequeUrl: pickByType('passbook_cancelled_cheque', 'bank_proof', 'cancelled_cheque') || pickFromRaw('bank_proofs', 'passbook_cancelled_cheque', 'cancelled_cheque'),
            profileDetails,
            companyDetails,
            bankDetails,
            addressDetails,
            rawDocuments,
        };
    }
    async upsertVendorDocuments(vendorId, docs) {
        const profileRes = await pool.query(`SELECT user_id FROM vendor_profiles WHERE id = $1 LIMIT 1`, [vendorId]).catch(() => ({ rows: [] }));
        const userId = Number(profileRes.rows?.[0]?.user_id || 0);
        if (!userId) {
            throw new Error("Vendor profile user link not found");
        }
        // Best-effort legacy write for deployments still using vendor_documents.
        try {
            const existingLegacy = await db.select().from(vendorDocuments).where(eq(vendorDocuments.vendorId, vendorId));
            if (existingLegacy?.length) {
                await db.update(vendorDocuments)
                    .set(docs)
                    .where(eq(vendorDocuments.vendorId, vendorId))
                    .returning();
            }
            else {
                await db.insert(vendorDocuments).values({ vendorId, ...docs }).returning();
            }
        }
        catch {
            // Ignore if legacy table is unavailable.
        }
        const docRows = [
            { type: "gst", url: docs.gstUrl || docs.gstCertificateUrl },
            { type: "pan", url: docs.panUrl || docs.panImageUrl },
            { type: "aadhar", url: docs.aadharUrl },
            { type: "bank_proof", url: docs.cancelledChequeUrl || docs.passbookCancelledChequeUrl },
            { type: "business_license", url: docs.businessLicenseUrl || docs.shopLicenseUrl || docs.registrationCertificateUrl },
        ];
        for (const row of docRows) {
            if (!row.url)
                continue;
            const docUrl = String(row.url).trim();
            if (!docUrl)
                continue;
            const existing = await pool.query(`
          SELECT id
          FROM user_documents
          WHERE user_id = $1
            AND LOWER(document_type) = LOWER($2)
          ORDER BY id DESC
          LIMIT 1
        `, [userId, row.type]).catch(() => ({ rows: [] }));
            if (existing.rows?.[0]?.id) {
                const updatedWithFrontUrl = await pool.query(`
            UPDATE user_documents
            SET
              document_url = $1,
              front_url = COALESCE(front_url, $1),
              status = 'pending',
              updated_at = NOW()
            WHERE id = $2
          `, [docUrl, existing.rows[0].id]).catch(() => null);
                if (!updatedWithFrontUrl) {
                    await pool.query(`
              UPDATE user_documents
              SET
                document_url = $1,
                status = 'pending',
                updated_at = NOW()
              WHERE id = $2
            `, [docUrl, existing.rows[0].id]).catch(() => { });
                }
            }
            else {
                const insertedWithFrontUrl = await pool.query(`
            INSERT INTO user_documents (user_id, document_type, document_url, front_url, status)
            VALUES ($1, $2, $3, $3, 'pending')
          `, [userId, row.type, docUrl]).catch(() => null);
                if (!insertedWithFrontUrl) {
                    await pool.query(`
              INSERT INTO user_documents (user_id, document_type, document_url, status)
              VALUES ($1, $2, $3, 'pending')
            `, [userId, row.type, docUrl]).catch(() => { });
                }
            }
        }
        const merged = await this.getVendorDocuments(vendorId);
        return (merged || { vendorId, ...docs });
    }
    async verifyVendor(id) {
        try {
            await pool.query(`UPDATE vendor_profiles SET verification_status = 'verified', rejection_reason = NULL WHERE id = $1`, [id]);
            await pool.query(`UPDATE users u
         SET verification_status = 'verified',
             rejection_reason = NULL,
             is_approved = true,
             status = 'active'
         FROM vendor_profiles vp
         WHERE vp.id = $1 AND vp.user_id = u.id`, [id]).catch(() => { });
            await pool.query(`UPDATE vendors SET status = 'active' WHERE id = $1`, [id]).catch(() => { });
            const rows = await this.getAllVendorsWithStatus();
            return (rows.find((r) => Number(r.id) === Number(id)) || null);
        }
        catch (_error) {
            const [updated] = await db.update(users)
                .set({ verificationStatus: "verified", rejectionReason: null })
                .where(eq(users.id, id))
                .returning();
            return updated;
        }
    }
    async rejectVendor(id, reason) {
        try {
            await pool.query(`UPDATE vendor_profiles SET verification_status = 'rejected', rejection_reason = $2 WHERE id = $1`, [id, reason]);
            await pool.query(`UPDATE users u
         SET verification_status = 'rejected',
             rejection_reason = $2,
             is_approved = false,
             status = 'suspended'
         FROM vendor_profiles vp
         WHERE vp.id = $1 AND vp.user_id = u.id`, [id, reason]).catch(() => { });
            await pool.query(`UPDATE vendors SET status = 'rejected' WHERE id = $1`, [id]).catch(() => { });
            const rows = await this.getAllVendorsWithStatus();
            return (rows.find((r) => Number(r.id) === Number(id)) || null);
        }
        catch (_error) {
            const [updated] = await db.update(users)
                .set({ verificationStatus: "rejected", rejectionReason: reason })
                .where(eq(users.id, id))
                .returning();
            return updated;
        }
    }
    // Onboarding - Manpower
    async getPendingManpower() {
        try {
            const result = await pool.query(`
        SELECT
          wp.id,
          wp.user_id,
          COALESCE(wp.full_name, u.email, 'Worker #' || wp.id::text) AS full_name,
          COALESCE(u.phone_number, '') AS phone,
          wp.state,
          wp.city,
          wp.area,
          wp.qualification,
          wp.aadhar_number,
          wp.pan_number,
          wp.address,
          wp.created_at,
          COALESCE(NULLIF(array_to_string(wp.skill_categories, ', '), ''), wp.skill_category, NULL) AS skill,
          COALESCE(wp.experience_years::text, NULL) AS experience,
          COALESCE(wp.is_approved, u.is_approved, false) AS is_approved,
          CASE WHEN COALESCE(u.status::text, 'active') IN ('suspended','banned') THEN true ELSE false END AS is_frozen,
          wd.aadhar_url,
          wd.pan_url,
          wd.skill_certificate_url,
          wd.photo_url,
          wd.bank_mandate_url,
          wba.account_number,
          wba.ifsc_code,
          wba.bank_name,
          wba.branch_name
        FROM worker_profiles wp
        INNER JOIN users u ON u.id = wp.user_id
        LEFT JOIN LATERAL (
          SELECT *
          FROM worker_documents wd
          WHERE wd.worker_id::text = wp.id::text
             OR (wp.user_id IS NOT NULL AND wd.worker_id::text = wp.user_id::text)
          ORDER BY wd.created_at DESC NULLS LAST
          LIMIT 1
        ) wd ON TRUE
        LEFT JOIN LATERAL (
          SELECT account_number, ifsc_code, bank_name, branch_name
          FROM worker_bank_accounts wba
          WHERE wba.worker_id = wp.id
          ORDER BY wba.updated_at DESC NULLS LAST, wba.created_at DESC NULLS LAST
          LIMIT 1
        ) wba ON TRUE
        ORDER BY wp.created_at DESC NULLS LAST, wp.id DESC
      `).catch(() => ({ rows: [] }));
            return (result.rows || [])
                .filter((r) => !r.is_approved && !r.is_frozen)
                .map((r) => ({
                id: String(r.id),
                fullName: r.full_name,
                phone: r.phone,
                state: r.state,
                city: r.city,
                area: r.area,
                qualification: r.qualification,
                aadharNumber: r.aadhar_number,
                panNumber: r.pan_number,
                serviceAddress: r.address,
                isApproved: r.is_approved,
                isFrozen: r.is_frozen,
                createdAt: r.created_at,
                skill: r.skill,
                experience: r.experience,
                verificationStatus: "pending",
                aadharUrl: r.aadhar_url,
                panUrl: r.pan_url,
                skillCertificateUrl: r.skill_certificate_url,
                photoUrl: r.photo_url,
                bankMandateUrl: r.bank_mandate_url,
                bankAccountNumber: r.account_number,
                bankIfsc: r.ifsc_code,
                bankName: r.bank_name,
                bankBranch: r.branch_name,
            }));
        }
        catch (_error) {
            // Fall back to legacy tables.
        }
        const rows = await db.select({
            id: workerSkills.id,
            fullName: workerSkills.fullName,
            phone: workerSkills.phone,
            state: workerSkills.state,
            city: workerSkills.city,
            area: workerSkills.area,
            qualification: workerSkills.qualification,
            aadharNumber: workerSkills.aadharNumber,
            panNumber: workerSkills.panNumber,
            serviceAddress: workerSkills.serviceAddress,
            isApproved: workerSkills.isApproved,
            isFrozen: workerSkills.isFrozen,
            createdAt: workerSkills.createdAt,
            skill: workerDetails.skillName,
            experience: workerDetails.experience,
        })
            .from(workerSkills)
            .leftJoin(workerDetails, eq(workerDetails.workerId, workerSkills.id))
            .where(and(eq(workerSkills.isApproved, false), eq(workerSkills.isFrozen, false)))
            .orderBy(sql `${workerSkills.createdAt} DESC`);
        return rows.map(r => ({
            ...r,
            verificationStatus: 'pending',
        }));
    }
    async getAllManpowerWithStatus() {
        try {
            const result = await pool.query(`
        SELECT
          wp.id,
          COALESCE(wp.full_name, u.email, 'Worker #' || wp.id::text) AS full_name,
          COALESCE(u.phone_number, '') AS phone,
          wp.state,
          wp.city,
          wp.area,
          wp.qualification,
          wp.aadhar_number,
          wp.pan_number,
          wp.address,
          wp.created_at,
          COALESCE(NULLIF(array_to_string(wp.skill_categories, ', '), ''), wp.skill_category, NULL) AS skill,
          COALESCE(wp.experience_years::text, NULL) AS experience,
          COALESCE(wp.is_approved, u.is_approved, false) AS is_approved,
          CASE WHEN COALESCE(u.status::text, 'active') IN ('suspended','banned') THEN true ELSE false END AS is_frozen,
          wd.aadhar_url,
          wd.pan_url,
          wd.skill_certificate_url,
          wd.photo_url,
          wd.bank_mandate_url,
          wba.account_number,
          wba.ifsc_code,
          wba.bank_name,
          wba.branch_name
        FROM worker_profiles wp
        INNER JOIN users u ON u.id = wp.user_id
        LEFT JOIN LATERAL (
          SELECT *
          FROM worker_documents wd
          WHERE wd.worker_id::text = wp.id::text
             OR (wp.user_id IS NOT NULL AND wd.worker_id::text = wp.user_id::text)
          ORDER BY wd.created_at DESC NULLS LAST
          LIMIT 1
        ) wd ON TRUE
        LEFT JOIN LATERAL (
          SELECT account_number, ifsc_code, bank_name, branch_name
          FROM worker_bank_accounts wba
          WHERE wba.worker_id = wp.id
          ORDER BY wba.updated_at DESC NULLS LAST, wba.created_at DESC NULLS LAST
          LIMIT 1
        ) wba ON TRUE
        ORDER BY wp.created_at DESC NULLS LAST, wp.id DESC
      `).catch(() => ({ rows: [] }));
            return (result.rows || []).map((r) => ({
                id: String(r.id),
                fullName: r.full_name,
                phone: r.phone,
                state: r.state,
                city: r.city,
                area: r.area,
                qualification: r.qualification,
                aadharNumber: r.aadhar_number,
                panNumber: r.pan_number,
                serviceAddress: r.address,
                isApproved: r.is_approved,
                isFrozen: r.is_frozen,
                createdAt: r.created_at,
                skill: r.skill,
                experience: r.experience,
                verificationStatus: r.is_approved ? "verified" : (r.is_frozen ? "rejected" : "pending"),
                aadharUrl: r.aadhar_url,
                panUrl: r.pan_url,
                skillCertificateUrl: r.skill_certificate_url,
                photoUrl: r.photo_url,
                bankMandateUrl: r.bank_mandate_url,
                bankAccountNumber: r.account_number,
                bankIfsc: r.ifsc_code,
                bankName: r.bank_name,
                bankBranch: r.branch_name,
            }));
        }
        catch (_error) {
            // Fall back to legacy tables.
        }
        const rows = await db.select({
            id: workerSkills.id,
            fullName: workerSkills.fullName,
            phone: workerSkills.phone,
            state: workerSkills.state,
            city: workerSkills.city,
            area: workerSkills.area,
            qualification: workerSkills.qualification,
            aadharNumber: workerSkills.aadharNumber,
            panNumber: workerSkills.panNumber,
            serviceAddress: workerSkills.serviceAddress,
            isApproved: workerSkills.isApproved,
            isFrozen: workerSkills.isFrozen,
            createdAt: workerSkills.createdAt,
            skill: workerDetails.skillName,
            experience: workerDetails.experience,
        })
            .from(workerSkills)
            .leftJoin(workerDetails, eq(workerDetails.workerId, workerSkills.id))
            .orderBy(sql `${workerSkills.createdAt} DESC`);
        return rows.map(r => ({
            ...r,
            verificationStatus: r.isApproved ? 'verified' : (r.isFrozen ? 'rejected' : 'pending'),
        }));
    }
    async getManpowerDocuments(workerId) {
        try {
            const result = await pool.query(`
          SELECT
            wd.id,
            wd.worker_id,
            wd.photo_url,
            wd.aadhar_url,
            wd.pan_url,
            wd.skill_certificate_url,
            wd.bank_mandate_url,
            wd.created_at
          FROM worker_profiles wp
          LEFT JOIN LATERAL (
            SELECT *
            FROM worker_documents wd
            WHERE wd.worker_id::text = wp.id::text
               OR (wp.user_id IS NOT NULL AND wd.worker_id::text = wp.user_id::text)
            ORDER BY wd.created_at DESC NULLS LAST
            LIMIT 1
          ) wd ON TRUE
          WHERE wp.id::text = $1
          LIMIT 1
        `, [workerId]).catch(() => ({ rows: [] }));
            const row = result.rows?.[0];
            if (row?.id || row?.photo_url || row?.aadhar_url || row?.pan_url || row?.skill_certificate_url || row?.bank_mandate_url) {
                return {
                    id: row.id,
                    workerId: row.worker_id,
                    photoUrl: row.photo_url || null,
                    aadharUrl: row.aadhar_url || null,
                    panUrl: row.pan_url || null,
                    skillCertificateUrl: row.skill_certificate_url || null,
                    bankMandateUrl: row.bank_mandate_url || null,
                    createdAt: row.created_at || null,
                };
            }
        }
        catch (_error) {
            // Fall back to drizzle path.
        }
        const [doc] = await db.select().from(workerDocuments).where(eq(workerDocuments.workerId, workerId));
        return doc;
    }
    async upsertManpowerDocuments(workerId, docs) {
        const existing = await this.getManpowerDocuments(workerId);
        if (existing) {
            const [updated] = await db.update(workerDocuments)
                .set(docs)
                .where(eq(workerDocuments.workerId, workerId))
                .returning();
            return updated;
        }
        const [created] = await db.insert(workerDocuments).values({ workerId, ...docs }).returning();
        return created;
    }
    async verifyManpowerWorker(id) {
        try {
            const profileResult = await pool.query(`
          SELECT wp.id, wp.user_id
          FROM worker_profiles wp
          WHERE wp.id::text = $1 OR wp.user_id::text = $1
          ORDER BY CASE WHEN wp.id::text = $1 THEN 0 ELSE 1 END
          LIMIT 1
        `, [id]);
            const profile = profileResult.rows[0];
            if (profile) {
                await pool.query(`
            UPDATE worker_profiles
            SET is_approved = true,
                updated_at = NOW()
            WHERE id = $1
          `, [profile.id]).catch(() => { });
                if (profile.user_id != null) {
                    await pool.query(`
              UPDATE users
              SET is_approved = true,
                  verification_status = 'verified',
                  rejection_reason = NULL,
                  status = 'active'
              WHERE id = $1
            `, [profile.user_id]).catch(() => { });
                }
                return { id: String(profile.id), userId: profile.user_id ?? null, verificationStatus: "verified" };
            }
        }
        catch (_error) {
            // Fall back to legacy tables.
        }
        const [updated] = await db.update(workerSkills)
            .set({ isApproved: true, isFrozen: false, updatedAt: new Date() })
            .where(eq(workerSkills.id, id))
            .returning();
        return updated;
    }
    async rejectManpowerWorker(id, reason) {
        try {
            const profileResult = await pool.query(`
          SELECT wp.id, wp.user_id
          FROM worker_profiles wp
          WHERE wp.id::text = $1 OR wp.user_id::text = $1
          ORDER BY CASE WHEN wp.id::text = $1 THEN 0 ELSE 1 END
          LIMIT 1
        `, [id]);
            const profile = profileResult.rows[0];
            if (profile) {
                await pool.query(`
            UPDATE worker_profiles
            SET is_approved = false,
                updated_at = NOW()
            WHERE id = $1
          `, [profile.id]).catch(() => { });
                if (profile.user_id != null) {
                    await pool.query(`
              UPDATE users
              SET is_approved = false,
                  verification_status = 'rejected',
                  rejection_reason = $2,
                  status = 'suspended'
              WHERE id = $1
            `, [profile.user_id, reason]).catch(() => { });
                }
                return { id: String(profile.id), userId: profile.user_id ?? null, verificationStatus: "rejected", rejectionReason: reason };
            }
        }
        catch (_error) {
            // Fall back to legacy tables.
        }
        const [updated] = await db.update(workerSkills)
            .set({ isFrozen: true, isApproved: false, updatedAt: new Date() })
            .where(eq(workerSkills.id, id))
            .returning();
        return updated;
    }
    // Settings
    async getSetting(key) {
        const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key));
        return row?.value ?? null;
    }
    async upsertSetting(key, value) {
        const existing = await db.select().from(appSettings).where(eq(appSettings.key, key));
        if (existing.length > 0) {
            const [updated] = await db.update(appSettings).set({ value, updatedAt: new Date() }).where(eq(appSettings.key, key)).returning();
            return updated;
        }
        const [created] = await db.insert(appSettings).values({ key, value }).returning();
        return created;
    }
    // Banners
    async getBanners() {
        try {
            const result = await pool.query(`
        SELECT id, title, subtitle, image_url, link_url, target_pages, position, is_active, display_order, start_date, end_date, created_at
        FROM banners
        ORDER BY display_order ASC, id DESC
      `);
            return result.rows.map((r) => ({
                id: Number(r.id),
                title: r.title,
                subtitle: r.subtitle || null,
                imageUrl: r.image_url,
                linkUrl: r.link_url || null,
                targetPages: r.target_pages || "all",
                position: r.position || "hero",
                active: r.is_active ? "true" : "false",
                displayOrder: Number(r.display_order || 0),
                startDate: r.start_date || null,
                endDate: r.end_date || null,
                createdAt: r.created_at || null,
            }));
        }
        catch (_error) {
            return await db.select().from(banners).orderBy(asc(banners.displayOrder), desc(banners.id));
        }
    }
    async getActiveBanners(page) {
        const now = new Date();
        let active = [];
        try {
            const result = await pool.query(`
        SELECT id, title, subtitle, image_url, link_url, target_pages, position, is_active, display_order, start_date, end_date, created_at
        FROM banners
        WHERE COALESCE(is_active, true) = true
        ORDER BY display_order ASC, id DESC
      `);
            active = result.rows.map((r) => ({
                id: Number(r.id),
                title: r.title,
                subtitle: r.subtitle || null,
                imageUrl: r.image_url,
                linkUrl: r.link_url || null,
                targetPages: r.target_pages || "all",
                position: r.position || "hero",
                active: r.is_active ? "true" : "false",
                displayOrder: Number(r.display_order || 0),
                startDate: r.start_date || null,
                endDate: r.end_date || null,
                createdAt: r.created_at || null,
            }));
        }
        catch (_error) {
            active = await db.select().from(banners)
                .where(eq(banners.active, "true"))
                .orderBy(asc(banners.displayOrder), desc(banners.id));
        }
        return active.filter((banner) => {
            const startOk = !banner.startDate || new Date(banner.startDate) <= now;
            const endOk = !banner.endDate || new Date(banner.endDate) >= now;
            const targets = (banner.targetPages || 'all')
                .split(',')
                .map((p) => p.trim())
                .filter(Boolean);
            const pageOk = !page || targets.includes('all') || targets.includes(page);
            return startOk && endOk && pageOk;
        });
    }
    async getBanner(id) {
        try {
            const result = await pool.query(`
          SELECT id, title, subtitle, image_url, link_url, target_pages, position, is_active, display_order, start_date, end_date, created_at
          FROM banners
          WHERE id = $1
          LIMIT 1
        `, [id]);
            const r = result.rows[0];
            if (!r)
                return undefined;
            return {
                id: Number(r.id),
                title: r.title,
                subtitle: r.subtitle || null,
                imageUrl: r.image_url,
                linkUrl: r.link_url || null,
                targetPages: r.target_pages || "all",
                position: r.position || "hero",
                active: r.is_active ? "true" : "false",
                displayOrder: Number(r.display_order || 0),
                startDate: r.start_date || null,
                endDate: r.end_date || null,
                createdAt: r.created_at || null,
            };
        }
        catch (_error) {
            const [banner] = await db.select().from(banners).where(eq(banners.id, id));
            return banner;
        }
    }
    async createBanner(banner) {
        try {
            const result = await pool.query(`
          INSERT INTO banners (title, subtitle, image_url, link_url, target_pages, position, is_active, display_order, start_date, end_date)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id, title, subtitle, image_url, link_url, target_pages, position, is_active, display_order, start_date, end_date, created_at
        `, [
                banner.title,
                banner.subtitle || null,
                banner.imageUrl,
                banner.linkUrl || null,
                banner.targetPages || "all",
                banner.position || "hero",
                banner.active === "false" ? false : true,
                banner.displayOrder ?? 0,
                banner.startDate || null,
                banner.endDate || null,
            ]);
            return this.getBanner(Number(result.rows[0].id));
        }
        catch (_error) {
            const [newBanner] = await db.insert(banners).values(banner).returning();
            return newBanner;
        }
    }
    async updateBanner(id, data) {
        try {
            const updates = [];
            const params = [];
            let i = 1;
            if (data.title !== undefined) {
                updates.push(`title = $${i++}`);
                params.push(data.title);
            }
            if (data.subtitle !== undefined) {
                updates.push(`subtitle = $${i++}`);
                params.push(data.subtitle);
            }
            if (data.imageUrl !== undefined) {
                updates.push(`image_url = $${i++}`);
                params.push(data.imageUrl);
            }
            if (data.linkUrl !== undefined) {
                updates.push(`link_url = $${i++}`);
                params.push(data.linkUrl);
            }
            if (data.targetPages !== undefined) {
                updates.push(`target_pages = $${i++}`);
                params.push(data.targetPages);
            }
            if (data.position !== undefined) {
                updates.push(`position = $${i++}`);
                params.push(data.position);
            }
            if (data.active !== undefined) {
                updates.push(`is_active = $${i++}`);
                params.push(data.active === "true");
            }
            if (data.displayOrder !== undefined) {
                updates.push(`display_order = $${i++}`);
                params.push(data.displayOrder);
            }
            if (data.startDate !== undefined) {
                updates.push(`start_date = $${i++}`);
                params.push(data.startDate);
            }
            if (data.endDate !== undefined) {
                updates.push(`end_date = $${i++}`);
                params.push(data.endDate);
            }
            if (!updates.length) {
                return this.getBanner(id);
            }
            params.push(id);
            await pool.query(`UPDATE banners SET ${updates.join(", ")} WHERE id = $${i}`, params);
            return this.getBanner(id);
        }
        catch (_error) {
            const [updated] = await db.update(banners).set(data).where(eq(banners.id, id)).returning();
            return updated;
        }
    }
    async deleteBanner(id) {
        try {
            await pool.query(`DELETE FROM banners WHERE id = $1`, [id]);
            return;
        }
        catch (_error) {
            await db.delete(banners).where(eq(banners.id, id));
        }
    }
    // ═══════════════════════════════════════════════
    // LOCATION TRACKING
    // ═══════════════════════════════════════════════
    async upsertLocation(data) {
        const idColumn = await getLocationIdColumn();
        const idValue = toLocationIdValue(idColumn, String(data.entityId));
        await pool.query(`DELETE FROM location_updates WHERE entity_type = $1 AND ${idColumn} = $2`, [data.entityType, idValue]);
        const result = await pool.query(`
        INSERT INTO location_updates (${idColumn}, entity_type, latitude, longitude, heading, speed)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, ${idColumn} AS resolved_entity_id, entity_type, latitude, longitude, heading, speed, updated_at
      `, [
            idValue,
            data.entityType,
            data.latitude,
            data.longitude,
            data.heading || "0",
            data.speed || "0",
        ]);
        const r = result.rows[0];
        return {
            id: Number(r.id),
            entityType: r.entity_type,
            entityId: String(r.resolved_entity_id),
            latitude: String(r.latitude),
            longitude: String(r.longitude),
            heading: String(r.heading || "0"),
            speed: String(r.speed || "0"),
            updatedAt: r.updated_at,
        };
    }
    async getLatestLocations() {
        const idColumn = await getLocationIdColumn();
        const result = await pool.query(`
      SELECT id, ${idColumn} AS resolved_entity_id, entity_type, latitude, longitude, heading, speed, updated_at
      FROM location_updates
      ORDER BY updated_at DESC, id DESC
    `);
        return result.rows.map((r) => ({
            id: Number(r.id),
            entityType: r.entity_type,
            entityId: String(r.resolved_entity_id),
            latitude: String(r.latitude),
            longitude: String(r.longitude),
            heading: String(r.heading || "0"),
            speed: String(r.speed || "0"),
            updatedAt: r.updated_at,
        }));
    }
    // ═══════════════════════════════════════════════
    // ANALYTICS
    // ═══════════════════════════════════════════════
    async getAnalytics() {
        const countQuery = async (table) => {
            const res = await pool.query(`SELECT COUNT(*)::int AS count FROM ${table}`).catch(() => ({ rows: [{ count: 0 }] }));
            return Number(res.rows[0]?.count || 0);
        };
        const groupQuery = async (table, field) => {
            const res = await pool.query(`SELECT ${field} AS name, COUNT(*)::int AS value FROM ${table} GROUP BY ${field}`).catch(() => ({ rows: [] }));
            return (res.rows || []).map((r) => ({ name: r.name, value: Number(r.value || 0) }));
        };
        const [userCount, orderCount, driverCount, workerCount, clientCount, jobCount, productCount, ticketCount, ordersByStatus, jobsByStatus, usersByRole, ticketsByStatus, ticketsByPriority, driversByStatus, workersApproved, workersPending, userGrowthRes, jobsOverTimeRes,] = await Promise.all([
            countQuery("users"),
            countQuery("orders"),
            countQuery("driver_profiles"),
            countQuery("worker_profiles"),
            countQuery("client_profiles"),
            countQuery("jobs"),
            countQuery("products"),
            countQuery("support_tickets"),
            groupQuery("orders", "status"),
            groupQuery("jobs", "status"),
            groupQuery("users", "COALESCE(user_type::text, 'user')"),
            groupQuery("support_tickets", "status"),
            groupQuery("support_tickets", "priority"),
            groupQuery("users", "status"),
            pool.query(`
        SELECT COUNT(*)::int AS count
        FROM users u
        INNER JOIN worker_profiles wp ON wp.user_id = u.id
        WHERE COALESCE(u.is_approved, false) = true
      `).catch(() => ({ rows: [{ count: 0 }] })),
            pool.query(`
        SELECT COUNT(*)::int AS count
        FROM users u
        INNER JOIN worker_profiles wp ON wp.user_id = u.id
        WHERE COALESCE(u.is_approved, false) = false
      `).catch(() => ({ rows: [{ count: 0 }] })),
            pool.query(`
        SELECT to_char(created_at, 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
        FROM users
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY to_char(created_at, 'YYYY-MM-DD')
        ORDER BY to_char(created_at, 'YYYY-MM-DD')
      `).catch(() => ({ rows: [] })),
            pool.query(`
        SELECT to_char(created_at, 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
        FROM jobs
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY to_char(created_at, 'YYYY-MM-DD')
        ORDER BY to_char(created_at, 'YYYY-MM-DD')
      `).catch(() => ({ rows: [] })),
        ]);
        return {
            totals: {
                users: userCount,
                orders: orderCount,
                drivers: driverCount,
                workers: workerCount,
                clients: clientCount,
                jobs: jobCount,
                products: productCount,
                tickets: ticketCount,
            },
            ordersByStatus,
            jobsByStatus,
            usersByRole,
            ticketsByStatus,
            ticketsByPriority,
            userGrowth: (userGrowthRes.rows || []).map((r) => ({ date: r.date, count: Number(r.count || 0) })),
            jobsOverTime: (jobsOverTimeRes.rows || []).map((r) => ({ date: r.date, count: Number(r.count || 0) })),
            driversByStatus,
            workersByApproval: [
                { name: "Approved", value: Number(workersApproved.rows[0]?.count || 0) },
                { name: "Pending", value: Number(workersPending.rows[0]?.count || 0) },
            ],
        };
    }
    // ═══════════════════════════════════════════════
    // VEHICLE PRICING
    // ═══════════════════════════════════════════════
    async getVehiclePricing() {
        return await db.select().from(vehiclePricing).orderBy(asc(vehiclePricing.id));
    }
    async getVehiclePricingByType(vehicleType) {
        const [pricing] = await db.select().from(vehiclePricing).where(eq(vehiclePricing.vehicleType, vehicleType));
        return pricing;
    }
    async createVehiclePricing(pricing) {
        const [created] = await db.insert(vehiclePricing).values(pricing).returning();
        return created;
    }
    async updateVehiclePricing(id, data) {
        const [updated] = await db.update(vehiclePricing)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(vehiclePricing.id, id))
            .returning();
        return updated;
    }
    async deleteVehiclePricing(id) {
        await db.update(vehiclePricing).set({ isActive: false }).where(eq(vehiclePricing.id, id));
    }
    // ═══════════════════════════════════════════════
    // MANPOWER PRICING
    // ═══════════════════════════════════════════════
    mpSelect = `
    SELECT id,
      service_category   AS "serviceCategory",
      service_name       AS "serviceName",
      service_code       AS "serviceCode",
      description,
      base_price         AS "basePrice",
      rate_per_hour      AS "ratePerHour",
      min_hours          AS "minHours",
      estimated_duration AS "estimatedDuration",
      is_active          AS "isActive",
      created_at         AS "createdAt",
      updated_at         AS "updatedAt"
    FROM manpower_pricing`;
    async getManpowerPricing() {
        if (!manpowerPricingCleanupDone) {
            manpowerPricingCleanupDone = true;
            await ensureAdminOnboardingCompatibilitySchema().catch(() => { });
        }
        const r = await pool.query(`${this.mpSelect} ORDER BY service_category ASC, service_name ASC`);
        return r.rows;
    }
    async getManpowerPricingByCode(code) {
        const r = await pool.query(`${this.mpSelect} WHERE service_code = $1 LIMIT 1`, [code]);
        return r.rows[0];
    }
    async getManpowerPricingByCategory(category) {
        const r = await pool.query(`${this.mpSelect} WHERE service_category = $1 ORDER BY service_name ASC`, [category]);
        return r.rows;
    }
    async createManpowerPricing(pricing) {
        const r = await pool.query(`INSERT INTO manpower_pricing
         (service_category, service_name, service_code, description, base_price, rate_per_hour, min_hours, estimated_duration, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)
       RETURNING id,
         service_category   AS "serviceCategory",
         service_name       AS "serviceName",
         service_code       AS "serviceCode",
         description,
         base_price         AS "basePrice",
         rate_per_hour      AS "ratePerHour",
         min_hours          AS "minHours",
         estimated_duration AS "estimatedDuration",
         is_active          AS "isActive",
         created_at         AS "createdAt",
         updated_at         AS "updatedAt"`, [
            pricing.serviceCategory,
            pricing.serviceName,
            pricing.serviceCode,
            pricing.description || null,
            pricing.basePrice,
            pricing.ratePerHour,
            pricing.minHours ?? '1',
            pricing.estimatedDuration || null,
        ]);
        return r.rows[0];
    }
    async updateManpowerPricing(id, data) {
        const map = {
            serviceCategory: 'service_category',
            serviceName: 'service_name',
            serviceCode: 'service_code',
            description: 'description',
            basePrice: 'base_price',
            ratePerHour: 'rate_per_hour',
            minHours: 'min_hours',
            estimatedDuration: 'estimated_duration',
            isActive: 'is_active',
        };
        const sets = [];
        const vals = [];
        for (const [key, col] of Object.entries(map)) {
            if (data[key] !== undefined) {
                vals.push(data[key]);
                sets.push(`${col} = $${vals.length}`);
            }
        }
        if (sets.length === 0)
            throw new Error('No fields to update');
        vals.push(new Date());
        sets.push(`updated_at = $${vals.length}`);
        vals.push(id);
        const r = await pool.query(`UPDATE manpower_pricing SET ${sets.join(', ')} WHERE id = $${vals.length}
       RETURNING id,
         service_category   AS "serviceCategory",
         service_name       AS "serviceName",
         service_code       AS "serviceCode",
         description,
         base_price         AS "basePrice",
         rate_per_hour      AS "ratePerHour",
         min_hours          AS "minHours",
         estimated_duration AS "estimatedDuration",
         is_active          AS "isActive",
         created_at         AS "createdAt",
         updated_at         AS "updatedAt"`, vals);
        return r.rows[0];
    }
    async deleteManpowerPricing(id) {
        await pool.query('DELETE FROM manpower_pricing WHERE id = $1', [id]);
    }
    async deleteAllManpowerPricing() {
        await pool.query('DELETE FROM manpower_pricing');
    }
    // ═══════════════════════════════════════════════
    // NOTIFICATIONS
    // ═══════════════════════════════════════════════
    mapLegacyNotificationRow(row) {
        return {
            id: Number(row.id),
            title: row.title || "",
            message: row.message || "",
            targetApp: row.target_app || "all",
            targetUsers: "all",
            type: row.notification_type || "info",
            imageUrl: row.image_url || null,
            linkUrl: row.link_url || null,
            scheduledAt: null,
            sentAt: row.read_at || row.created_at || null,
            status: "sent",
            createdBy: row.user_id ? Number(row.user_id) : null,
            createdAt: row.created_at || null,
        };
    }
    async getNotifications() {
        try {
            return await db.select().from(notifications).orderBy(desc(notifications.createdAt));
        }
        catch (_error) {
            const result = await pool.query(`
        SELECT id, user_id, title, message, notification_type, target_app, image_url, link_url, read_at, created_at
        FROM notifications
        ORDER BY created_at DESC
      `);
            return result.rows.map((row) => this.mapLegacyNotificationRow(row));
        }
    }
    async getNotificationById(id) {
        try {
            const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
            return notification;
        }
        catch (_error) {
            const result = await pool.query(`
          SELECT id, user_id, title, message, notification_type, target_app, image_url, link_url, read_at, created_at
          FROM notifications
          WHERE id = $1
          LIMIT 1
        `, [id]);
            if (!result.rows[0])
                return undefined;
            return this.mapLegacyNotificationRow(result.rows[0]);
        }
    }
    async getNotificationsForApp(app) {
        try {
            return await db.select().from(notifications)
                .where(and(eq(notifications.status, "sent"), sql `(${notifications.targetApp} = 'all' OR ${notifications.targetApp} = ${app})`))
                .orderBy(desc(notifications.createdAt));
        }
        catch (_error) {
            const result = await pool.query(`
          SELECT id, user_id, title, message, notification_type, target_app, image_url, link_url, read_at, created_at
          FROM notifications
          WHERE target_app = 'all' OR target_app = $1
          ORDER BY created_at DESC
        `, [app]);
            return result.rows.map((row) => this.mapLegacyNotificationRow(row));
        }
    }
    async createNotification(notification) {
        try {
            const [created] = await db.insert(notifications).values(notification).returning();
            return created;
        }
        catch (_error) {
            const result = await pool.query(`
          INSERT INTO notifications (
            user_id,
            title,
            message,
            notification_type,
            target_app,
            image_url,
            link_url,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          RETURNING id, user_id, title, message, notification_type, target_app, image_url, link_url, read_at, created_at
        `, [
                notification.createdBy ?? null,
                notification.title,
                notification.message,
                notification.type || "info",
                notification.targetApp,
                notification.imageUrl ?? null,
                notification.linkUrl ?? null,
            ]);
            return this.mapLegacyNotificationRow(result.rows[0]);
        }
    }
    async updateNotification(id, data) {
        try {
            const [updated] = await db.update(notifications)
                .set(data)
                .where(eq(notifications.id, id))
                .returning();
            return updated;
        }
        catch (_error) {
            const result = await pool.query(`
          UPDATE notifications
          SET
            title = COALESCE($2, title),
            message = COALESCE($3, message),
            notification_type = COALESCE($4, notification_type),
            target_app = COALESCE($5, target_app),
            image_url = COALESCE($6, image_url),
            link_url = COALESCE($7, link_url)
          WHERE id = $1
          RETURNING id, user_id, title, message, notification_type, target_app, image_url, link_url, read_at, created_at
        `, [
                id,
                data.title ?? null,
                data.message ?? null,
                data.type ?? null,
                data.targetApp ?? null,
                data.imageUrl ?? null,
                data.linkUrl ?? null,
            ]);
            if (!result.rows[0]) {
                throw new Error("Notification not found");
            }
            return this.mapLegacyNotificationRow(result.rows[0]);
        }
    }
    async deleteNotification(id) {
        try {
            await db.delete(notificationReads).where(eq(notificationReads.notificationId, id));
            await db.delete(notifications).where(eq(notifications.id, id));
        }
        catch (_error) {
            await pool.query(`DELETE FROM notifications WHERE id = $1`, [id]);
        }
    }
    async markNotificationSent(id) {
        try {
            const [updated] = await db.update(notifications)
                .set({ status: "sent", sentAt: new Date() })
                .where(eq(notifications.id, id))
                .returning();
            return updated;
        }
        catch (_error) {
            const notification = await this.getNotificationById(id);
            if (!notification) {
                throw new Error("Notification not found");
            }
            return notification;
        }
    }
    async markNotificationRead(notificationId, userId) {
        try {
            const [existing] = await db.select()
                .from(notificationReads)
                .where(and(eq(notificationReads.notificationId, notificationId), eq(notificationReads.userId, userId)));
            if (existing) {
                return existing;
            }
            const [read] = await db.insert(notificationReads)
                .values({ notificationId, userId })
                .returning();
            return read;
        }
        catch (_error) {
            const result = await pool.query(`
          UPDATE notifications
          SET is_read = true, read_at = NOW()
          WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)
          RETURNING id, read_at
        `, [notificationId, userId]);
            const row = result.rows[0];
            if (!row) {
                throw new Error("Notification not found");
            }
            return {
                id: Number(row.id),
                notificationId,
                userId,
                readAt: row.read_at || new Date(),
            };
        }
    }
    async getUserNotifications(userId, app) {
        try {
            const sentNotifications = await this.getNotificationsForApp(app);
            const reads = await db.select({ notificationId: notificationReads.notificationId })
                .from(notificationReads)
                .where(eq(notificationReads.userId, userId));
            const readIds = new Set(reads.map((r) => r.notificationId));
            return sentNotifications.filter((notification) => {
                if (readIds.has(notification.id)) {
                    return false;
                }
                if (!notification.targetUsers || notification.targetUsers === "all") {
                    return true;
                }
                const targetUsers = notification.targetUsers
                    .split(",")
                    .map((part) => Number(part.trim()))
                    .filter((id) => Number.isInteger(id) && id > 0);
                return targetUsers.includes(userId);
            });
        }
        catch (_error) {
            const result = await pool.query(`
          SELECT id, user_id, title, message, notification_type, target_app, image_url, link_url, read_at, created_at
          FROM notifications
          WHERE (target_app = 'all' OR target_app = $1)
            AND (user_id IS NULL OR user_id = $2)
            AND COALESCE(is_read, false) = false
          ORDER BY created_at DESC
        `, [app, userId]);
            return result.rows.map((row) => this.mapLegacyNotificationRow(row));
        }
    }
}
export const storage = new DatabaseStorage();
