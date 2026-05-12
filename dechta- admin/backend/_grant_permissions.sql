-- Run this as the postgres (superuser) in GCP Cloud SQL
-- Either via GCP Console > Cloud SQL Studio, or psql -h 136.116.32.214 -U postgres -d dechta

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  users,
  products,
  orders,
  catalog_items,
  banners,
  support_tickets,
  app_settings,
  conversations,
  messages,
  jobs,
  location_updates,
  manpower_pricing,
  notification_reads,
  notifications,
  vehicle_pricing,
  wallets,
  worker_skills
TO appuser;

-- Also grant on sequences so INSERT (serial IDs) works
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO appuser;

-- Grant on any future tables created by postgres
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO appuser;
