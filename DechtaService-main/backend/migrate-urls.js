require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ user: process.env.DB_USER, password: process.env.DB_PASSWORD, host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT)||5432, database: process.env.DB_NAME, ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await p.connect();
  const baseUrl = process.env.PUBLIC_API_URL || 'http://localhost:5003';
  
  try {
    console.log(`Migrating existing relative upload URLs to absolute URLs using baseUrl: ${baseUrl}`);
    await client.query('BEGIN');

    // 1. driver_profiles.avatar_url
    const profiles = await client.query(`SELECT id, avatar_url FROM driver_profiles WHERE avatar_url LIKE '/uploads/%'`);
    let profileCount = 0;
    for(const row of profiles.rows) {
      const newUrl = `${baseUrl}${row.avatar_url}`;
      await client.query(`UPDATE driver_profiles SET avatar_url = $1 WHERE id = $2`, [newUrl, row.id]);
      profileCount++;
    }
    console.log(`Updated ${profileCount} driver_profiles avatars`);

    // 2. Skipped driver_stats as it may not have avatar_url
    // 3. user_documents.document_url, front_url, back_url
    const docsCheck = await client.query(`SELECT to_regclass('public.user_documents') AS table_name`);
    if (docsCheck.rows[0]?.table_name) {
      const docs = await client.query(`SELECT id, document_url, front_url, back_url FROM user_documents`);
      let docsCount = 0;
      for(const row of docs.rows) {
        let changed = false;
        let newDocs = { ...row };
        
        ['document_url', 'front_url', 'back_url'].forEach(col => {
          if (newDocs[col]) {
            // handle comma separated URLs
            const parts = newDocs[col].split(',').map(url => {
              url = url.trim();
              if (url.startsWith('/uploads/')) {
                changed = true;
                return `${baseUrl}${url}`;
              }
              return url;
            });
            newDocs[col] = parts.join(',');
          }
        });
        
        if (changed) {
          await client.query(
            `UPDATE user_documents SET document_url = $1, front_url = $2, back_url = $3 WHERE id = $4`,
            [newDocs.document_url, newDocs.front_url, newDocs.back_url, row.id]
          );
          docsCount++;
        }
      }
      console.log(`Updated ${docsCount} user_documents`);
    }

    // 4. Skipped driver_documentss
    await client.query('COMMIT');
    console.log('Migration complete.');
  } catch(e) {
    await client.query('ROLLBACK');
    console.error('❌ ERROR:', e.message);
  } finally {
    client.release();
    await p.end();
  }
}
run();
