const db = require('./src/config/database');

async function approveDrivers() {
  try {
    console.log('\n🔓 Approving drivers for orders access...\n');

    // Get all drivers first
    const drivers = await db.selectMany('driver_profiles', {});
    
    if (!drivers || drivers.length === 0) {
      console.log('⚠️  No drivers found in database');
      process.exit(1);
    }

    console.log(`Found ${drivers.length} drivers. Approving all...\n`);

    let approvedCount = 0;
    for (const driver of drivers) {
      if (!driver.is_approved) {
        await db.update('driver_profiles', { id: driver.id }, { is_approved: true, is_online: true });
        console.log(`✅ Approved: ${driver.full_name} (${driver.mobile_number})`);
        approvedCount++;
      } else {
        console.log(`✓ Already approved: ${driver.full_name} (${driver.mobile_number})`);
      }
    }

    console.log(`\n✨ Approved ${approvedCount} drivers! Orders API is now accessible.\n`);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

approveDrivers();
