// src/config/database.js
const { Pool } = require('pg');

// Enable SSL when DB_SSL=true or in production (required for GCP Cloud SQL)
const useSSL = process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production';

let poolConfig;

if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: useSSL ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
} else {
  poolConfig = {
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    ssl: useSSL ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
}

const pool = new Pool(poolConfig);

// ── SQL-injection guard: allowlist of valid tables and sortable columns ─────
const ALLOWED_TABLES = new Set([
  // Core shared tables
  'users','otp_verification','otp_records','otp_verifications','addresses','location_updates',
  'bank_accounts','user_documents','jobs','catalog_items','products','vendor_inventory','vehicles',
  'orders','deliveries','wallets','transactions','ratings','support_tickets',
  'conversations','messages','notifications','vehicle_pricing','service_pricing',
  'banners','app_settings','admin_profiles','admin_activity_logs',

  // Driver tables
  'driver_profiles','driver_stats','driver_vehicles','driver_bank_accounts',
  'driver_documentss','driver_wallets','driver_transactions','driver_notifications',
  'driver_gps_locations','driver_chat_messages','driver_package_photos',
  'driver_login_sessions','driver_leaderboard_cache','driver_referrals',
  'driver_ads','driver_achievements','driver_sos_alerts','driver_order_ignores',
  'driver_notification_prefs','otp_verification','orders','delivery_trips',
  'aviation_ranks','driver_payment_orders',
  'driver_withdrawal_requests','driver_support_tickets',
  // Vendor tables
  'vendors','vendor_profiles','vendor_products','vendor_invoices','vendor_wallets',
  'vendor_payment_orders','vendor_withdrawals','vendor_settlements',
  'vendor_support_tickets','vendor_queries',
  // Worker tables
  'worker_profiles','worker_auth_users','worker_notifications','worker_bank_accounts',
  'worker_documents','worker_jobs','worker_job_chats','worker_location_logs','worker_support_tickets',
  'worker_support_messages','worker_withdrawals','worker_payment_orders',
  'worker_transactions',
]);

const ALLOWED_ORDER_BY = new Set([
  'created_at DESC','created_at ASC','updated_at DESC','completed_at DESC',
  'started_at DESC','rank_position ASC','display_order ASC','weekly_earnings DESC',
  'weekly_orders_completed DESC','went_online_at DESC','went_offline_at DESC',
  'ignored_at DESC',
]);

function assertTable(table) {
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(`Disallowed table name: "${table}"`);
  }
}

function assertOrderBy(orderBy) {
  if (orderBy && !ALLOWED_ORDER_BY.has(orderBy)) {
    throw new Error(`Disallowed ORDER BY: "${orderBy}"`);
  }
}

class Database {
  async nextNumericId(client, table) {
    const result = await client.query(`SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM ${table}`);
    return Number(result.rows?.[0]?.next_id || 1);
  }

  async selectOne(table, filters = {}) {
    assertTable(table);
    let query = `SELECT * FROM ${table}`;
    const values = [];
    const conditions = [];
    let i = 1;

    for (const [key, value] of Object.entries(filters)) {
      if (value === null) {
        conditions.push(`${key} IS NULL`);
      } else {
        conditions.push(`${key} = $${i++}`);
        values.push(value);
      }
    }
    if (conditions.length) query += ` WHERE ${conditions.join(' AND ')}`;
    query += ` LIMIT 1;`;

    try {
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`selectOne error on ${table}: ${error.message}`);
    }
  }

  async selectMany(table, filters = {}, options = {}) {
    assertTable(table);
    assertOrderBy(options.orderBy);

    let query = `SELECT * FROM ${table}`;
    const values = [];
    const conditions = [];
    let i = 1;

    for (const [key, value] of Object.entries(filters)) {
      if (value === null) {
        conditions.push(`${key} IS NULL`);
      } else {
        conditions.push(`${key} = $${i++}`);
        values.push(value);
      }
    }
    if (conditions.length) query += ` WHERE ${conditions.join(' AND ')}`;
    if (options.orderBy) query += ` ORDER BY ${options.orderBy}`;
    if (options.limit)   query += ` LIMIT ${parseInt(options.limit, 10)}`;
    if (options.offset)  query += ` OFFSET ${parseInt(options.offset, 10)}`;
    query += ';';

    try {
      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      throw new Error(`selectMany error on ${table}: ${error.message}`);
    }
  }

  async insert(table, data) {
    assertTable(table);
    const columns = Object.keys(data);
    const values  = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *;`;

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      const missingIdDefault =
        !Object.prototype.hasOwnProperty.call(data || {}, 'id') &&
        /null value in column "id" of relation ".*" violates not-null constraint/i.test(String(error?.message || ''));

      if (!missingIdDefault) {
        throw new Error(`insert error on ${table}: ${error.message}`);
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(`LOCK TABLE ${table} IN SHARE ROW EXCLUSIVE MODE`);

        const nextId = await this.nextNumericId(client, table);
        const patchedData = { id: nextId, ...data };
        const patchedColumns = Object.keys(patchedData);
        const patchedValues = Object.values(patchedData);
        const patchedPlaceholders = patchedValues.map((_, i) => `$${i + 1}`).join(', ');

        const retryResult = await client.query(
          `INSERT INTO ${table} (${patchedColumns.join(', ')}) VALUES (${patchedPlaceholders}) RETURNING *;`,
          patchedValues
        );

        await client.query('COMMIT');
        return retryResult.rows[0];
      } catch (retryError) {
        try { await client.query('ROLLBACK'); } catch {}
        throw new Error(`insert error on ${table}: ${retryError.message}`);
      } finally {
        client.release();
      }
    }
  }

  async update(table, data, filters = {}) {
    assertTable(table);
    const dataEntries   = Object.entries(data);
    const filterEntries = Object.entries(filters);

    if (dataEntries.length === 0) throw new Error('No data provided for update');

    const values = [];
    let i = 1;
    const setClauses = dataEntries.map(([key, value]) => {
      values.push(value);
      return `${key} = $${i++}`;
    });

    const conditions = [];
    filterEntries.forEach(([key, value]) => {
      if (value === null) {
        conditions.push(`${key} IS NULL`);
      } else {
        values.push(value);
        conditions.push(`${key} = $${i++}`);
      }
    });

    let query = `UPDATE ${table} SET ${setClauses.join(', ')}`;
    if (conditions.length) query += ` WHERE ${conditions.join(' AND ')}`;
    query += ' RETURNING *;';

    try {
      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      throw new Error(`update error on ${table}: ${error.message}`);
    }
  }

  async delete(table, filters = {}) {
    assertTable(table);
    if (Object.keys(filters).length === 0) {
      throw new Error('Cannot delete without filters (safety check)');
    }

    const values = [];
    const conditions = [];
    let i = 1;

    for (const [key, value] of Object.entries(filters)) {
      if (value === null) {
        conditions.push(`${key} IS NULL`);
      } else {
        conditions.push(`${key} = $${i++}`);
        values.push(value);
      }
    }

    const query = `DELETE FROM ${table} WHERE ${conditions.join(' AND ')} RETURNING *;`;

    try {
      const result = await pool.query(query, values);
      return result.rows.length;
    } catch (error) {
      throw new Error(`delete error on ${table}: ${error.message}`);
    }
  }

  // Raw parameterized query — use for JOINs and complex WHERE clauses
  async query(sql, values = []) {
    try {
      return await pool.query(sql, values);
    } catch (error) {
      throw new Error(`query error: ${error.message}`);
    }
  }

  // Transaction helper — returns a client you can use for multi-step atomic ops
  // Usage:
  //   const client = await db.beginTransaction();
  //   try {
  //     await client.query('UPDATE ...');
  //     await client.query('INSERT ...');
  //     await client.query('COMMIT');
  //   } catch (e) {
  //     await client.query('ROLLBACK');
  //     throw e;
  //   } finally {
  //     client.release();
  //   }
  async beginTransaction() {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      return client;
    } catch (error) {
      client.release();
      throw error;
    }
  }

  async healthCheck() {
    try {
      const result = await pool.query('SELECT NOW()');
      return !!result.rows[0];
    } catch (error) {
      console.error('Database health check failed:', error.message);
      return false;
    }
  }

  async close() {
    await pool.end();
  }
}

module.exports = new Database();
