-- ============================================================
-- ADD MISSING COLUMNS TO DELIVERY_TRIPS TABLE
-- ============================================================
-- This migration adds missing columns that the application code expects

BEGIN;

-- Add delivery_fee column if it doesn't exist
ALTER TABLE IF EXISTS delivery_trips
ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(15, 2) DEFAULT 0.00;

-- Add delivery_otp column if it doesn't exist
ALTER TABLE IF EXISTS delivery_trips
ADD COLUMN IF NOT EXISTS delivery_otp VARCHAR(4);

-- Add otp_verified column if it doesn't exist
ALTER TABLE IF EXISTS delivery_trips
ADD COLUMN IF NOT EXISTS otp_verified BOOLEAN DEFAULT FALSE;

-- Add distance_text column if it doesn't exist
ALTER TABLE IF EXISTS delivery_trips
ADD COLUMN IF NOT EXISTS distance_text VARCHAR(50);

-- Also update driver_wallets table if it exists to match expected schema
ALTER TABLE IF EXISTS driver_wallets
ADD COLUMN IF NOT EXISTS today_earnings NUMERIC(15, 2) DEFAULT 0.00;

ALTER TABLE IF EXISTS driver_wallets
ADD COLUMN IF NOT EXISTS total_trips BIGINT DEFAULT 0;

ALTER TABLE IF EXISTS driver_wallets
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT NOW();

-- Update driver_transactions table if it exists
ALTER TABLE IF EXISTS driver_transactions
ADD COLUMN IF NOT EXISTS wallet_id BIGINT;

ALTER TABLE IF EXISTS driver_transactions
ADD COLUMN IF NOT EXISTS trip_id UUID;

ALTER TABLE IF EXISTS driver_transactions
ADD COLUMN IF NOT EXISTS type VARCHAR(50);

ALTER TABLE IF EXISTS driver_transactions
ADD COLUMN IF NOT EXISTS balance_after NUMERIC(15, 2);

-- Create foreign key if wallet_id exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'driver_transactions' AND constraint_name = 'fk_wallet_id'
  ) THEN
    ALTER TABLE driver_transactions
    ADD CONSTRAINT fk_wallet_id FOREIGN KEY (wallet_id) REFERENCES driver_wallets(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMIT;

SELECT 'Missing columns added successfully!' AS status;
