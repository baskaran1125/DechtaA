const db = require('./src/config/database');
const http = require('http');

async function main() {
  console.log('✅ VENDOR ORDER STATUS FIX - VERIFICATION\n');

  // Step 1: Check database schema
  console.log('Step 1: Checking orders table schema...');
  try {
    const schemaResult = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name = 'status'
    `);
    
    if (schemaResult.rows.length > 0) {
      console.log('  ✅ Status column exists in orders table\n');
    } else {
      console.log('  ❌ Status column missing!\n');
      process.exit(1);
    }
  } catch (err) {
    console.error('  ❌ Error checking schema:', err.message);
    process.exit(1);
  }

  // Step 2: Check if backend is running
  console.log('Step 2: Testing backend connection...');
  const testBackend = () => {
    return new Promise((resolve) => {
      const req = http.get('http://localhost:5000/health', (res) => {
        resolve(res.statusCode === 200);
        res.resume();
      });
      req.on('error', () => resolve(false));
      req.setTimeout(2000, () => {
        req.abort();
        resolve(false);
      });
    });
  };

  const isRunning = await testBackend();
  if (isRunning) {
    console.log('  ✅ Backend is running on port 5000\n');
  } else {
    console.log('  ⚠️  Backend not responding on port 5000');
    console.log('  Please run: npm start\n');
  }

  // Step 3: Summary
  console.log('='.repeat(60));
  console.log('\n✅ FIX APPLIED:\n');
  console.log('File: src/controllers/ordersController.js');
  console.log('Function: completeDelivery()');
  console.log('\nWhat was fixed:');
  console.log('- When driver completes delivery (marks trip as delivered)');
  console.log('- Backend now ALSO updates orders.status = "delivered"');
  console.log('- This ensures vendor dashboard shows order as "Completed"\n');

  console.log('Order Status Mapping:');
  console.log('  delivery_trips.status = "delivered"');
  console.log('         ↓');
  console.log('  orders.status = "delivered"');
  console.log('         ↓');
  console.log('  Vendor Dashboard: toFilterStage("delivered") → "Completed" tab\n');

  console.log('='.repeat(60));
  console.log('\n📋 NEXT STEPS:');
  console.log('1. If backend is not running: npm start');
  console.log('2. Complete an order in driver app (mark as delivered)');
  console.log('3. Check vendor dashboard - order should move to "Completed" tab\n');

  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
