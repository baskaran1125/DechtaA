import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
try {
  const result = await pool.query(
    "INSERT INTO users (name, email, password, role) VALUES ('Arjunan', 'arjunan@gmail.com', 'Aju@2005', 'admin') ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role, name = EXCLUDED.name RETURNING *"
  );
  if (result.rows.length > 0) {
    console.log('Admin user created:', result.rows[0]);
  } else {
    console.log('Admin user already exists.');
  }
} catch (e) {
  const message = e instanceof Error ? e.message : String(e);
  console.error('Error:', message);
} finally {
  await pool.end();
}
