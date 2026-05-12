// Load environment variables FIRST
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const db = require('./src/config/database');

async function checkSchema() {
  try {
    console.log('======================================================================');
    console.log('  CHECKING INVOICES TABLE SCHEMA IN DETAIL');
    console.log('======================================================================\n');

    const result = await db.query(`
      SELECT 
        column_name, 
        data_type, 
        column_default,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'invoices' 
      ORDER BY ordinal_position
    `);

    console.log('Detailed column information:\n');
    result.rows.forEach((r, i) => {
      console.log(`${i + 1}. ${r.column_name}`);
      console.log(`   Type:    ${r.data_type}`);
      console.log(`   Default: ${r.column_default || '(none)'}`);
      console.log(`   Null:    ${r.is_nullable}\n`);
    });

    // Check specifically the id column
    const idCol = result.rows.find(r => r.column_name === 'id');
    if (idCol) {
      console.log('================================================================================');
      console.log(`ID Column Type: ${idCol.data_type}`);
      console.log(`ID Column Default: ${idCol.column_default}`);
      
      if (idCol.data_type === 'bigint') {
        console.log('\n⚠️  PROBLEM FOUND!');
        console.log('   ID column is BIGINT but controller tries to insert UUID!');
        console.log('   Need to change controller to not pass UUID.\n');
      } else if (idCol.data_type.includes('uuid')) {
        console.log('\n✅ ID column is UUID - controller code is correct\n');
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkSchema();
