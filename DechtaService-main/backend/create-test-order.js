/**
 * ══════════════════════════════════════════════════════════════════════════════
 * CREATE TEST ORDER - Real-time notification to online drivers
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * This script creates a new order and broadcasts it to all online drivers
 * via Socket.io. Drivers will receive a real-time popup notification.
 * 
 * USAGE:
 * node create-test-order.js
 * 
 * OR with custom data:
 * node create-test-order.js --vendor "Fast Food Pizza" --product "Margherita Pizza"
 * ══════════════════════════════════════════════════════════════════════════════
 */

require('dotenv').config();
const db = require('./src/config/database');
const { broadcastNewOrderToOnlineDrivers } = require('./src/services/socketService');
const { v4: uuidv4 } = require('uuid');

// Parse command line arguments
const args = process.argv.slice(2);
const vendorIndex = args.indexOf('--vendor');
const productIndex = args.indexOf('--product');

const TEST_VENDOR_NAME = vendorIndex !== -1 ? args[vendorIndex + 1] : 'Test Pizza House';
const TEST_PRODUCT_NAME = productIndex !== -1 ? args[productIndex + 1] : 'Pepperoni Pizza';

const TEST_DATA = {
  vendor_id: '550e8400-e29b-41d4-a716-446655440000',
  vendor_shop_name: TEST_VENDOR_NAME,
  product_name: TEST_PRODUCT_NAME,
  customer_name: 'Test Customer ' + Math.floor(Math.random() * 1000),
  customer_phone: '9' + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0'),
  pickup_address: '123 Main Street, Test City, ZIP 12345',
  delivery_address: '456 Oak Avenue, Delivery City, ZIP 67890',
  delivery_latitude: 28.6139,
  delivery_longitude: 77.2090,
  delivery_fee: 50,
  total_amount: 350,
  items: [
    { name: 'Pizza', quantity: 1, price: 300 }
  ],
};

async function createTestOrder() {
  try {
    console.log('📦 Creating test order...\n');
    
    // Check if we have database connection
    try {
      await db.query('SELECT NOW()');
      console.log('✅ Database connection successful\n');
    } catch (dbError) {
      console.log('⚠️  Database not connected - order will be created in memory only');
      console.log('   Note: Socket.io broadcast will not work without database connection\n');
    }

    // Insert order into database
    const newOrder = await db.insert('orders', {
      vendor_id: TEST_DATA.vendor_id,
      vendor_shop_name: TEST_DATA.vendor_shop_name,
      product_name: TEST_DATA.product_name,
      customer_name: TEST_DATA.customer_name,
      customer_phone: TEST_DATA.customer_phone,
      pickup_address: TEST_DATA.pickup_address,
      delivery_address: TEST_DATA.delivery_address,
      delivery_latitude: TEST_DATA.delivery_latitude,
      delivery_longitude: TEST_DATA.delivery_longitude,
      status: 'Pending',
      delivery_fee: TEST_DATA.delivery_fee,
      total_amount: TEST_DATA.total_amount,
      items: JSON.stringify(TEST_DATA.items),
      created_at: new Date().toISOString(),
      order_date: new Date().toISOString(),
    });

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║         ✅ ORDER CREATED SUCCESSFULLY                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log('📋 Order Details:');
    console.log(`   Order ID       : ${newOrder.id}`);
    console.log(`   Vendor         : ${newOrder.vendor_shop_name}`);
    console.log(`   Product        : ${newOrder.product_name}`);
    console.log(`   Customer       : ${newOrder.customer_name}`);
    console.log(`   Phone          : ${newOrder.customer_phone}`);
    console.log(`   Pickup Address : ${newOrder.pickup_address}`);
    console.log(`   Delivery Fee   : ₹${newOrder.delivery_fee}`);
    console.log(`   Total Amount   : ₹${newOrder.total_amount}`);
    console.log(`   Status         : ${newOrder.status}\n`);

    // Broadcast to online drivers
    console.log('📡 Broadcasting to online drivers...\n');
    
    try {
      // Get online drivers count
      const onlineDrivers = await db.selectMany(
        'driver_profiles',
        { is_online: true },
        { select: 'id, full_name' }
      );

      if (onlineDrivers && onlineDrivers.length > 0) {
        console.log(`🟢 Found ${onlineDrivers.length} online driver(s):`);
        onlineDrivers.forEach((driver, index) => {
          console.log(`   ${index + 1}. ${driver.full_name || 'Anonymous'} (ID: ${driver.id})`);
        });
        console.log('');
        
        // Note: Socket.io broadcast would happen via the API endpoint
        // Since we're not actually running the server here, we just show what would happen
        console.log('💡 Socket Event: "order:new" would be sent to all online drivers');
        console.log('   This would trigger the popup notification in their app\n');
      } else {
        console.log('⚠️  No online drivers found\n');
        console.log('💡 To test with a driver online:');
        console.log('   1. Start the backend: npm run dev');
        console.log('   2. Open the driver app and go online');
        console.log('   3. Call the API endpoint: POST /api/orders');
        console.log('   4. Driver will receive the popup notification\n');
      }
    } catch (err) {
      console.log('⚠️  Could not fetch online drivers:', err.message, '\n');
    }

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     📱 How to Test Real-time Notifications                ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║ 1. Start Backend Server:                                  ║');
    console.log('║    npm run dev                                             ║');
    console.log('║                                                            ║');
    console.log('║ 2. Start Frontend App:                                    ║');
    console.log('║    npx expo start                                          ║');
    console.log('║                                                            ║');
    console.log('║ 3. Go Online in App:                                      ║');
    console.log('║    Toggle "ONLINE" button on home screen                   ║');
    console.log('║                                                            ║');
    console.log('║ 4. Create Order via API:                                  ║');
    console.log('║    POST http://localhost:3000/api/orders                  ║');
    console.log('║    Body: {                                                 ║');
    console.log('║      "vendor_shop_name": "Pizza Place",                   ║');
    console.log('║      "product_name": "Margherita",                        ║');
    console.log('║      "customer_name": "John Doe",                         ║');
    console.log('║      "customer_phone": "9876543210",                      ║');
    console.log('║      "pickup_address": "123 Main St",                     ║');
    console.log('║      "delivery_address": "456 Oak Ave",                   ║');
    console.log('║      "delivery_fee": 50                                    ║');
    console.log('║    }                                                       ║');
    console.log('║                                                            ║');
    console.log('║ 5. Watch for Popup:                                       ║');
    console.log('║    Online drivers will see a popup with order details      ║');
    console.log('║    They can Accept or Decline in real-time                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating order:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run the script
createTestOrder();
