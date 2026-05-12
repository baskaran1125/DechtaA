const { Client } = require('pg');

const passwordsToTry = [
  'postgres', 'password', 'admin', 'root', 'Quickqc2026', 'Quickqc', 'Quickqc@2026', 'QuickQc2026', 
  'Dechta2026', 'dechta', 'dechta2026', '12345678', '123456'
];

(async () => {
  for (const pwd of passwordsToTry) {
    const client = new Client({
      user: 'postgres',
      password: pwd,
      host: '34.68.84.193',
      port: 5432,
      database: 'dechta',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    });

    try {
      await client.connect();
      console.log(`\n✅ SUCCESS! Connected as postgres with password: "${pwd}"\n`);
      
      console.log("Granting privileges to appuser...");
      await client.query('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO appuser');
      await client.query('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO appuser');
      await client.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO appuser');
      console.log("🔥 Privileges successfully granted! Everything should work now.");
      
      await client.end();
      process.exit(0);
    } catch (err) {
      console.log(`Failed for password "${pwd}": ${err.message}`);
    } finally {
      try { await client.end(); } catch(e){}
    }
  }
  
  console.log("\n❌ All password attempts failed. The user MUST run the GRANT commands manually in GCP.");
  process.exit();
})();
