-- ═══════════════════════════════════════════════════════════════
-- DECHTA Task Migration — Run once in your PostgreSQL DB
-- ═══════════════════════════════════════════════════════════════

-- ── Task 1: vehicle_pricing table ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.vehicle_pricing (
    id SERIAL PRIMARY KEY,
    vehicle_type TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    base_fare NUMERIC NOT NULL,
    rate_per_km NUMERIC NOT NULL,
    min_km NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Seed default pricing (safe: INSERT only if not present)
INSERT INTO public.vehicle_pricing (vehicle_type, display_name, base_fare, rate_per_km, min_km)
VALUES
  ('2w',  'Two-Wheeler',   29,  4,   0),
  ('3w',  'Three-Wheeler', 149, 8,   0),
  ('4w', '4 Wheeler Cargo',    399, 15,  0)
ON CONFLICT (vehicle_type) DO NOTHING;

-- ── Task 4: addresses table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.addresses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.cprofiles(id) ON DELETE CASCADE,
    tag TEXT NOT NULL DEFAULT 'other',
    address_text TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);

-- ── Category-Aware Search & Auto-Suggest ──────────────────────────
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS search_tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS fts_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(category, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
) STORED;

CREATE INDEX IF NOT EXISTS idx_products_fts ON public.products USING GIN(fts_vector);
CREATE INDEX IF NOT EXISTS idx_products_search_tags ON public.products USING GIN(search_tags jsonb_path_ops);
