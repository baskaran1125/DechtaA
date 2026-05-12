-- Add driver suspension fields used by the cancellation limit feature.

ALTER TABLE IF EXISTS driver_profiles
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS driver_profiles
ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;

ALTER TABLE IF EXISTS driver_profiles
ADD COLUMN IF NOT EXISTS suspension_reason TEXT;