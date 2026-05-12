const { Client } = require('pg');

(async () => {
  const client = new Client({
    user: 'postgres',
    password: 'Quickqc2026',
    host: '34.68.84.193',
    port: 5432,
    database: 'dechta',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected as postgres! Granting privileges...");
    await client.query('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO appuser');
    await client.query('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO appuser');
    await client.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO appuser');
    console.log("Success! Granted privileges to appuser.");
  } catch (err) {
    console.error("Failed as postgres:", err.message);
  } finally {
    await client.end();
  }
})();
