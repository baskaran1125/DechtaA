-- filepath: FIX_SCHEMA_ISSUES.sql
-- Fix missing columns and schema mismatches

-- ============================================================
-- 1. ADD MISSING COLUMNS TO delivery_trips
-- ============================================================
ALTER TABLE IF EXISTS delivery_trips
ADD COLUMN IF NOT EXISTS delivery_otp VARCHAR(4);

ALTER TABLE IF EXISTS delivery_trips
ADD COLUMN IF NOT EXISTS otp_verified BOOLEAN DEFAULT FALSE;

ALTER TABLE IF EXISTS delivery_trips
ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(15, 2) DEFAULT 0.00;

ALTER TABLE IF EXISTS delivery_trips
ADD COLUMN IF NOT EXISTS distance_text VARCHAR(50);

-- ============================================================
-- 2. FIX driver_wallets TABLE - Add missing columns  
-- ============================================================
ALTER TABLE IF EXISTS driver_wallets
ADD COLUMN IF NOT EXISTS outstanding_dues NUMERIC(15, 2) DEFAULT 0.00;

ALTER TABLE IF EXISTS driver_wallets
ADD COLUMN IF NOT EXISTS dues_limit NUMERIC(15, 2) DEFAULT 300.00;

ALTER TABLE IF EXISTS driver_wallets
ADD COLUMN IF NOT EXISTS today_earnings NUMERIC(15, 2) DEFAULT 0.00;

ALTER TABLE IF EXISTS driver_wallets
ADD COLUMN IF NOT EXISTS total_trips BIGINT DEFAULT 0;

ALTER TABLE IF EXISTS driver_wallets
ADD COLUMN IF NOT EXISTS total_commission_deducted NUMERIC(15, 2) DEFAULT 0.00;

ALTER TABLE IF EXISTS driver_wallets
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT NOW();

-- ============================================================
-- 3. FIX driver_stats TABLE - Add missing columns
-- ============================================================
ALTER TABLE IF EXISTS driver_stats
ADD COLUMN IF NOT EXISTS total_gross_earnings NUMERIC(15, 2) DEFAULT 0.00;

ALTER TABLE IF EXISTS driver_stats
ADD COLUMN IF NOT EXISTS total_commission_paid NUMERIC(15, 2) DEFAULT 0.00;

ALTER TABLE IF EXISTS driver_stats
ADD COLUMN IF NOT EXISTS weekly_earnings NUMERIC(15, 2) DEFAULT 0.00;

ALTER TABLE IF EXISTS driver_stats
ADD COLUMN IF NOT EXISTS weekly_gross_earnings NUMERIC(15, 2) DEFAULT 0.00;

ALTER TABLE IF EXISTS driver_stats
ADD COLUMN IF NOT EXISTS weekly_commission_paid NUMERIC(15, 2) DEFAULT 0.00;

ALTER TABLE IF EXISTS driver_stats
ADD COLUMN IF NOT EXISTS weekly_orders_completed BIGINT DEFAULT 0;

-- ============================================================
-- 4. FIX driver_transactions TABLE - Add wallet_id reference
-- ============================================================
ALTER TABLE IF EXISTS driver_transactions
ADD COLUMN IF NOT EXISTS wallet_id BIGINT;

ALTER TABLE IF EXISTS driver_transactions
ADD COLUMN IF NOT EXISTS type VARCHAR(50);

-- ============================================================
-- 5. FIX driver_profiles - Add commission_rate if missing
-- ============================================================
ALTER TABLE IF EXISTS driver_profiles
ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5, 4) DEFAULT 0.1;

-- ============================================================
-- VERIFICATION - Show delivery_trips columns
-- ============================================================
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'delivery_trips' 
ORDER BY ordinal_position;

SELECT 'Schema fixes applied successfully!' AS status;
