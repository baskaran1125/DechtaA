-- ============================================================
-- DECHTA CLIENT BACKEND — Schema Fixes
-- PostgreSQL-safe version (no ADD CONSTRAINT IF NOT EXISTS)
-- Run once in Supabase SQL Editor or psql
-- ============================================================

-- ── Fix 1: Add phone_text column to cprofiles ────────────────
ALTER TABLE cprofiles
  ADD COLUMN IF NOT EXISTS phone_text VARCHAR(20);

-- ── Fix 2: Backfill phone_text from existing NUMERIC phone ───
UPDATE cprofiles
  SET phone_text = phone::text
  WHERE phone_text IS NULL AND phone IS NOT NULL;

-- ── Fix 3: Add verified_at to otp_verifications ──────────────
ALTER TABLE otp_verifications
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- ── Fix 4: Add unique constraint on otp_verifications.phone_number
-- (PostgreSQL does not support ADD CONSTRAINT IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'otp_verifications'
      AND constraint_name = 'otp_verifications_phone_number_key'
      AND constraint_type = 'UNIQUE'
  ) THEN
    ALTER TABLE otp_verifications
      ADD CONSTRAINT otp_verifications_phone_number_key
      UNIQUE (phone_number);
  END IF;
END $$;

-- ── Fix 5: Add unique constraint on cprofiles.phone_text ─────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'cprofiles'
      AND constraint_name = 'cprofiles_phone_text_key'
      AND constraint_type = 'UNIQUE'
  ) THEN
    ALTER TABLE cprofiles
      ADD CONSTRAINT cprofiles_phone_text_key
      UNIQUE (phone_text);
  END IF;
END $$;

-- ── Fix 6: Indexes ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cprofiles_phone_text
  ON cprofiles(phone_text);

CREATE INDEX IF NOT EXISTS idx_products_status_active
  ON products(status, is_active);

-- ══════════════════════════════════════════════════════════════
-- ── Fix 7: Google OAuth columns ──────────────────────────────
-- ══════════════════════════════════════════════════════════════
ALTER TABLE cprofiles
  ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);

ALTER TABLE cprofiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE cprofiles
  ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Unique index on google_id (partial — only non-null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cprofiles_google_id
  ON cprofiles(google_id) WHERE google_id IS NOT NULL;

-- Index on email for fast lookup during Google auth
CREATE INDEX IF NOT EXISTS idx_cprofiles_email
  ON cprofiles(email) WHERE email IS NOT NULL;

-- ── Verify: Run this to confirm everything worked ─────────────
SELECT 'cprofiles.phone_text column' AS check_name,
       COUNT(*) > 0 AS passed
FROM information_schema.columns
WHERE table_name = 'cprofiles' AND column_name = 'phone_text'

UNION ALL

SELECT 'otp_verifications unique constraint',
       COUNT(*) > 0
FROM information_schema.table_constraints
WHERE table_name = 'otp_verifications'
  AND constraint_type = 'UNIQUE'

UNION ALL

SELECT 'cprofiles phone_text unique constraint',
       COUNT(*) > 0
FROM information_schema.table_constraints
WHERE table_name = 'cprofiles'
  AND constraint_name = 'cprofiles_phone_text_key'

UNION ALL

SELECT 'cprofiles.google_id column',
       COUNT(*) > 0
FROM information_schema.columns
WHERE table_name = 'cprofiles' AND column_name = 'google_id';