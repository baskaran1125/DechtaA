import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

// Try connecting as postgres to run grants
const pgPass = process.argv[2] || 'Quickqc@2026';
const connString = `postgresql://postgres:${encodeURIComponent(pgPass)}@136.116.32.214:5432/dechta`;

const pool = new pg.Pool({ connectionString: connString });

const grants = `
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO appuser;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO appuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO appuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO appuser;
`;

try {
  const client = await pool.connect();
  console.log('Connected as postgres — running grants...');
  await client.query(grants);
  console.log('GRANTS applied successfully!');
  client.release();
} catch (e) {
  console.error('ERROR:', e.message);
} finally {
  await pool.end();
}
