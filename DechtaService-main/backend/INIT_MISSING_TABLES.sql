-- ============================================================
-- CREATE ALL MISSING TABLES FOR DECHTA APPLICATION
-- ============================================================
-- Run this file to initialize all missing database tables
-- Command: psql -h localhost -U postgres -d dechta -f INIT_MISSING_TABLES.sql

-- ============================================================
-- DELIVERY & ORDER TRACKING
-- ============================================================

CREATE TABLE IF NOT EXISTS delivery_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  driver_id BIGINT NOT NULL,
  status VARCHAR(50) DEFAULT 'accepted',
  payout_amount NUMERIC(15, 2) DEFAULT 0.00,
  delivery_fee NUMERIC(15, 2) DEFAULT 0.00,
  delivery_otp VARCHAR(4),
  otp_verified BOOLEAN DEFAULT FALSE,
  distance_text VARCHAR(50),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  arrived_pickup_at TIMESTAMPTZ,
  departed_pickup_at TIMESTAMPTZ,
  arrived_dropoff_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id, driver_id)
);

CREATE INDEX IF NOT EXISTS idx_delivery_trips_driver_id ON delivery_trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_trips_order_id ON delivery_trips(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_trips_status ON delivery_trips(status);
CREATE INDEX IF NOT EXISTS idx_delivery_trips_driver_status ON delivery_trips(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_trips_started_at ON delivery_trips(started_at DESC);

-- ============================================================
-- DRIVER STATISTICS & PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS driver_stats (
  id BIGSERIAL PRIMARY KEY,
  driver_id BIGINT NOT NULL UNIQUE REFERENCES driver_profiles(id) ON DELETE CASCADE,
  total_trips BIGINT DEFAULT 0,
  total_earnings NUMERIC(15, 2) DEFAULT 0.00,
  total_gross_earnings NUMERIC(15, 2) DEFAULT 0.00,
  total_commission_paid NUMERIC(15, 2) DEFAULT 0.00,
  total_distance_km NUMERIC(10, 2) DEFAULT 0.00,
  average_rating NUMERIC(3, 2) DEFAULT 0.00,
  total_ratings_count BIGINT DEFAULT 0,
  on_time_delivery_percentage NUMERIC(5, 2) DEFAULT 0.00,
  cancellation_count BIGINT DEFAULT 0,
  weekly_earnings NUMERIC(15, 2) DEFAULT 0.00,
  weekly_gross_earnings NUMERIC(15, 2) DEFAULT 0.00,
  weekly_commission_paid NUMERIC(15, 2) DEFAULT 0.00,
  weekly_orders_completed BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_stats_driver_id ON driver_stats(driver_id);

-- ============================================================
-- DRIVER VEHICLES
-- ============================================================

CREATE TABLE IF NOT EXISTS driver_vehicles (
  id BIGSERIAL PRIMARY KEY,
  driver_id BIGINT NOT NULL UNIQUE REFERENCES driver_profiles(id) ON DELETE CASCADE,
  vehicle_type VARCHAR(50),
  vehicle_number VARCHAR(50),
  registration_number VARCHAR(50),
  model_id VARCHAR(100),
  body_type VARCHAR(50),
  weight_capacity_kg NUMERIC(10, 2),
  dimensions_length_cm NUMERIC(10, 2),
  dimensions_width_cm NUMERIC(10, 2),
  dimensions_height_cm NUMERIC(10, 2),
  year_manufactured INT,
  fuel_type VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_vehicles_driver_id ON driver_vehicles(driver_id);

-- ============================================================
-- DRIVER BANK ACCOUNTS
-- ============================================================

CREATE TABLE IF NOT EXISTS driver_bank_accounts (
  id BIGSERIAL PRIMARY KEY,
  driver_id BIGINT NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  account_holder_name VARCHAR(255),
  bank_name VARCHAR(100),
  account_number VARCHAR(50),
  ifsc_code VARCHAR(20),
  account_type VARCHAR(50),
  is_primary BOOLEAN DEFAULT FALSE,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_bank_accounts_driver_id ON driver_bank_accounts(driver_id);

-- ============================================================
-- DRIVER DOCUMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS driver_documentss (
  id BIGSERIAL PRIMARY KEY,
  driver_id BIGINT NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  document_type VARCHAR(100),
  document_number VARCHAR(100),
  document_url VARCHAR(500),
  expiry_date DATE,
  verification_status VARCHAR(50),
  rejected_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_documentss_driver_id ON driver_documentss(driver_id);

-- ============================================================
-- DRIVER WALLETS & TRANSACTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS driver_wallets (
  id BIGSERIAL PRIMARY KEY,
  driver_id BIGINT NOT NULL UNIQUE REFERENCES driver_profiles(id) ON DELETE CASCADE,
  balance NUMERIC(15, 2) DEFAULT 0.00,
  outstanding_dues NUMERIC(15, 2) DEFAULT 0.00,
  dues_limit NUMERIC(15, 2) DEFAULT 300.00,
  today_earnings NUMERIC(15, 2) DEFAULT 0.00,
  total_trips BIGINT DEFAULT 0,
  total_commission_deducted NUMERIC(15, 2) DEFAULT 0.00,
  total_earned NUMERIC(15, 2) DEFAULT 0.00,
  total_withdrawn NUMERIC(15, 2) DEFAULT 0.00,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_wallets_driver_id ON driver_wallets(driver_id);

CREATE TABLE IF NOT EXISTS driver_transactions (
  id BIGSERIAL PRIMARY KEY,
  driver_id BIGINT NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  wallet_id BIGINT REFERENCES driver_wallets(id) ON DELETE CASCADE,
  type VARCHAR(50),
  transaction_type VARCHAR(50),
  amount NUMERIC(15, 2),
  description TEXT,
  reference_id VARCHAR(100),
  balance_after NUMERIC(15, 2),
  status VARCHAR(50) DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_transactions_driver_id ON driver_transactions(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_transactions_status ON driver_transactions(status);

-- ============================================================
-- DRIVER NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS driver_notifications (
  id BIGSERIAL PRIMARY KEY,
  driver_id BIGINT NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255),
  message TEXT,
  type VARCHAR(50),
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_notifications_driver_id ON driver_notifications(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_notifications_created_at ON driver_notifications(created_at DESC);

CREATE TABLE IF NOT EXISTS driver_notification_prefs (
  id BIGSERIAL PRIMARY KEY,
  driver_id BIGINT NOT NULL UNIQUE REFERENCES driver_profiles(id) ON DELETE CASCADE,
  push_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  order_notifications BOOLEAN DEFAULT TRUE,
  payment_notifications BOOLEAN DEFAULT TRUE,
  promotional_notifications BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DRIVER GPS & TRACKING
-- ============================================================

CREATE TABLE IF NOT EXISTS driver_gps_locations (
  id BIGSERIAL PRIMARY KEY,
  driver_id BIGINT NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  accuracy NUMERIC(10, 2),
  speed NUMERIC(10, 2),
  heading NUMERIC(6, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_gps_locations_driver_id ON driver_gps_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_gps_locations_created_at ON driver_gps_locations(created_at DESC);

-- ============================================================
-- DRIVER DELIVERY MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS driver_package_photos (
  id BIGSERIAL PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES delivery_trips(id) ON DELETE CASCADE,
  driver_id BIGINT NOT NULL,
  photo_type VARCHAR(50),
  photo_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_package_photos_trip_id ON driver_package_photos(trip_id);
CREATE INDEX IF NOT EXISTS idx_driver_package_photos_driver_id ON driver_package_photos(driver_id);

CREATE TABLE IF NOT EXISTS driver_order_ignores (
  id BIGSERIAL PRIMARY KEY,
  driver_id BIGINT NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  order_id BIGINT,
  ignored_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_order_ignores_driver_id ON driver_order_ignores(driver_id);

-- ============================================================
-- DRIVER SESSIONS & PAYMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS driver_login_sessions (
  id BIGSERIAL PRIMARY KEY,
  driver_id BIGINT NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  session_token VARCHAR(500),
  login_at TIMESTAMPTZ DEFAULT NOW(),
  logout_at TIMESTAMPTZ,
  ip_address VARCHAR(50),
  device_info VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_driver_login_sessions_driver_id ON driver_login_sessions(driver_id);

CREATE TABLE IF NOT EXISTS driver_payment_orders (
  id BIGSERIAL PRIMARY KEY,
  driver_id BIGINT NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  order_id VARCHAR(100),
  amount NUMERIC(15, 2),
  status VARCHAR(50),
  payment_method VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_payment_orders_driver_id ON driver_payment_orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_payment_orders_status ON driver_payment_orders(status);

CREATE TABLE IF NOT EXISTS driver_withdrawal_requests (
  id BIGSERIAL PRIMARY KEY,
  driver_id BIGINT NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2),
  bank_account_id BIGINT REFERENCES driver_bank_accounts(id),
  status VARCHAR(50) DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  rejection_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_driver_withdrawal_requests_driver_id ON driver_withdrawal_requests(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_withdrawal_requests_status ON driver_withdrawal_requests(status);

-- ============================================================
-- DRIVER COMMUNICATION
-- ============================================================

CREATE TABLE IF NOT EXISTS driver_chat_messages (
  id BIGSERIAL PRIMARY KEY,
  driver_id BIGINT NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  conversation_id BIGINT REFERENCES conversations(id),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_chat_messages_driver_id ON driver_chat_messages(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_chat_messages_conversation_id ON driver_chat_messages(conversation_id);

-- ============================================================
-- DRIVER ACHIEVEMENTS & GAMIFICATION
-- ============================================================

CREATE TABLE IF NOT EXISTS driver_leaderboard_cache (
  id BIGSERIAL PRIMARY KEY,
  driver_id BIGINT NOT NULL UNIQUE REFERENCES driver_profiles(id) ON DELETE CASCADE,
  rank_position INT,
  weekly_earnings NUMERIC(15, 2) DEFAULT 0.00,
  weekly_orders_completed BIGINT DEFAULT 0,
  went_online_at TIMESTAMPTZ,
  went_offline_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_leaderboard_cache_rank_position ON driver_leaderboard_cache(rank_position);
CREATE INDEX IF NOT EXISTS idx_driver_leaderboard_cache_weekly_earnings ON driver_leaderboard_cache(weekly_earnings DESC);

CREATE TABLE IF NOT EXISTS driver_achievements (
  id BIGSERIAL PRIMARY KEY,
  driver_id BIGINT NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  achievement_name VARCHAR(255),
  achievement_type VARCHAR(100),
  description TEXT,
  badge_url VARCHAR(500),
  unlocked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_achievements_driver_id ON driver_achievements(driver_id);

CREATE TABLE IF NOT EXISTS driver_referrals (
  id BIGSERIAL PRIMARY KEY,
  driver_id BIGINT NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  referred_driver_id BIGINT REFERENCES driver_profiles(id),
  referral_code VARCHAR(50),
  reward_status VARCHAR(50),
  reward_amount NUMERIC(15, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_referrals_driver_id ON driver_referrals(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_referrals_referral_code ON driver_referrals(referral_code);

-- ============================================================
-- DRIVER EMERGENCY & SUPPORT
-- ============================================================

CREATE TABLE IF NOT EXISTS driver_sos_alerts (
  id BIGSERIAL PRIMARY KEY,
  driver_id BIGINT NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  alert_type VARCHAR(100),
  description TEXT,
  location_lat NUMERIC(10, 8),
  location_lng NUMERIC(11, 8),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_sos_alerts_driver_id ON driver_sos_alerts(driver_id);

CREATE TABLE IF NOT EXISTS driver_support_tickets (
  id BIGSERIAL PRIMARY KEY,
  driver_id BIGINT NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  subject VARCHAR(255),
  description TEXT,
  status VARCHAR(50) DEFAULT 'open',
  priority VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_support_tickets_driver_id ON driver_support_tickets(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_support_tickets_status ON driver_support_tickets(status);

-- ============================================================
-- DRIVER ADS & PROMOTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS driver_ads (
  id BIGSERIAL PRIMARY KEY,
  driver_id BIGINT NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255),
  description TEXT,
  image_url VARCHAR(500),
  ad_type VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_driver_ads_driver_id ON driver_ads(driver_id);

-- ============================================================
-- AVIATION RANKS (Leaderboard)
-- ============================================================

CREATE TABLE IF NOT EXISTS aviation_ranks (
  id BIGSERIAL PRIMARY KEY,
  driver_id BIGINT NOT NULL UNIQUE REFERENCES driver_profiles(id) ON DELETE CASCADE,
  rank_name VARCHAR(100),
  rank_level INT,
  display_order INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aviation_ranks_driver_id ON aviation_ranks(driver_id);
CREATE INDEX IF NOT EXISTS idx_aviation_ranks_rank_level ON aviation_ranks(rank_level);

-- ============================================================
-- PRODUCTS CATALOG
-- ============================================================

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

CREATE INDEX IF NOT EXISTS idx_products_vendor ON products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_vendor_active ON products(vendor_id, is_active);

-- ============================================================
-- VENDOR PRODUCTS & INVOICES
-- ============================================================

CREATE TABLE IF NOT EXISTS vendor_products (
  id BIGSERIAL PRIMARY KEY,
  vendor_id BIGINT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  product_name VARCHAR(255),
  product_sku VARCHAR(100),
  description TEXT,
  price NUMERIC(15, 2),
  cost NUMERIC(15, 2),
  quantity_in_stock BIGINT DEFAULT 0,
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_products_vendor_id ON vendor_products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_products_category ON vendor_products(category);

CREATE TABLE IF NOT EXISTS vendor_invoices (
  id BIGSERIAL PRIMARY KEY,
  vendor_id BIGINT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  order_id BIGINT REFERENCES orders(id),
  invoice_number VARCHAR(100),
  invoice_date DATE,
  total_amount NUMERIC(15, 2),
  tax_amount NUMERIC(15, 2),
  net_amount NUMERIC(15, 2),
  status VARCHAR(50) DEFAULT 'pending',
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_invoices_vendor_id ON vendor_invoices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_status ON vendor_invoices(status);

-- ============================================================
-- VENDOR SETTLEMENTS & SUPPORT
-- ============================================================

CREATE TABLE IF NOT EXISTS vendor_settlements (
  id BIGSERIAL PRIMARY KEY,
  vendor_id BIGINT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  settlement_period VARCHAR(50),
  total_orders BIGINT,
  total_amount NUMERIC(15, 2),
  commission_amount NUMERIC(15, 2),
  net_amount NUMERIC(15, 2),
  status VARCHAR(50) DEFAULT 'pending',
  settled_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_settlements_vendor_id ON vendor_settlements(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_settlements_status ON vendor_settlements(status);

CREATE TABLE IF NOT EXISTS vendor_support_tickets (
  id BIGSERIAL PRIMARY KEY,
  vendor_id BIGINT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  subject VARCHAR(255),
  description TEXT,
  status VARCHAR(50) DEFAULT 'open',
  priority VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_support_tickets_vendor_id ON vendor_support_tickets(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_support_tickets_status ON vendor_support_tickets(status);

-- ============================================================
-- ALTER EXISTING TABLES (ADD MISSING COLUMNS)
-- ============================================================

-- Add commission_rate to driver_profiles if it doesn't exist
ALTER TABLE driver_profiles
ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5, 3) DEFAULT 0.10;

-- ============================================================
-- COMPLETION MESSAGE
-- ============================================================

SELECT 'All missing tables created successfully!' AS status;
