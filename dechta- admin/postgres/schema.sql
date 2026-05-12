CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('buyer', 'vendor', 'admin')),
  verification_status TEXT NOT NULL DEFAULT 'verified' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  rejection_reason TEXT,
  phone TEXT,
  owner_name TEXT,
  whatsapp_number TEXT,
  business_address TEXT,
  warehouse_address TEXT,
  google_maps_location TEXT,
  years_of_business_experience TEXT,
  business_type TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS catalog_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  catalog_item_id INTEGER NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS drivers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  vehicle_number TEXT NOT NULL,
  license_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  photo_url TEXT,
  driver_type TEXT,
  bank_account_number TEXT,
  bank_ifsc TEXT,
  bank_name TEXT,
  bank_branch TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS driver_documents (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  photo_url TEXT,
  aadhar_url TEXT,
  address_proof_url TEXT,
  rc_book_url TEXT,
  license_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS worker_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  state TEXT,
  city TEXT,
  area TEXT,
  referral_code TEXT,
  rating NUMERIC DEFAULT 0,
  reviews_count NUMERIC DEFAULT 0,
  is_approved BOOLEAN DEFAULT false,
  is_online BOOLEAN DEFAULT false,
  is_frozen BOOLEAN DEFAULT false,
  approved_by UUID,
  qualification TEXT,
  aadhar_number TEXT,
  pan_number TEXT,
  service_address TEXT,
  bank_account_number TEXT,
  bank_ifsc TEXT,
  bank_name TEXT,
  bank_branch TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS worker_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES worker_skills(id) ON DELETE CASCADE,
  skill_name TEXT,
  experience TEXT,
  category TEXT
);

CREATE TABLE IF NOT EXISTS wallets (
  worker_id UUID PRIMARY KEY REFERENCES worker_skills(id) ON DELETE CASCADE,
  total_earned NUMERIC DEFAULT 0,
  platform_fees NUMERIC DEFAULT 0,
  wallet_balance NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  company TEXT,
  area TEXT NOT NULL,
  address TEXT,
  service_type TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'cancelled')),
  assigned_driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
  assigned_worker_id UUID REFERENCES worker_skills(id) ON DELETE SET NULL,
  deadline TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Onboarding: document tables
CREATE TABLE IF NOT EXISTS vendor_documents (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gst_number TEXT,
  pan_number TEXT,
  udyam_registration_number TEXT,
  bank_account_details TEXT,
  gst_url TEXT,
  pan_url TEXT,
  aadhar_url TEXT,
  cancelled_cheque_url TEXT,
  gst_certificate_url TEXT,
  shop_license_url TEXT,
  business_license_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS worker_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES worker_skills(id) ON DELETE CASCADE,
  photo_url TEXT,
  aadhar_url TEXT,
  pan_url TEXT,
  skill_certificate_url TEXT,
  bank_mandate_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS banners (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  target_pages TEXT NOT NULL DEFAULT 'all',
  position TEXT NOT NULL DEFAULT 'hero' CHECK (position IN ('hero', 'sidebar', 'inline', 'popup')),
  active TEXT NOT NULL DEFAULT 'true' CHECK (active IN ('true', 'false')),
  display_order INTEGER NOT NULL DEFAULT 0,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_settings (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS location_updates (
  id SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('driver', 'worker')),
  entity_id TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  heading NUMERIC DEFAULT 0,
  speed NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_location_entity ON location_updates (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_location_updated ON location_updates (updated_at DESC);

-- Vehicle pricing for delivery charges
CREATE TABLE IF NOT EXISTS vehicle_pricing (
  id SERIAL PRIMARY KEY,
  vehicle_type TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  base_fare NUMERIC NOT NULL,
  rate_per_km NUMERIC NOT NULL,
  min_km NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Manpower/Service pricing (like Urban Company)
CREATE TABLE IF NOT EXISTS manpower_pricing (
  id SERIAL PRIMARY KEY,
  service_category TEXT NOT NULL,
  service_name TEXT NOT NULL,
  service_code TEXT NOT NULL UNIQUE,
  description TEXT,
  base_price NUMERIC NOT NULL,
  rate_per_hour NUMERIC NOT NULL,
  min_hours NUMERIC DEFAULT 1,
  estimated_duration TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_manpower_pricing_category ON manpower_pricing (service_category);

-- Notifications for all apps
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_app TEXT NOT NULL,
  target_users TEXT,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'promo', 'alert', 'update')),
  image_url TEXT,
  link_url TEXT,
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled')),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications (status);
CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications (target_app);

-- Track notification reads
CREATE TABLE IF NOT EXISTS notification_reads (
  id SERIAL PRIMARY KEY,
  notification_id INTEGER NOT NULL REFERENCES notifications(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(notification_id, user_id)
);

-- Seed: Ops Admin User
INSERT INTO users (name, email, password, role)
VALUES ('Admin', 'admin@example.com', 'password123', 'admin')
ON CONFLICT (email) DO NOTHING;
