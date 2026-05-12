# Real-Time Order Notifications System

## Overview

Your QC Driver App now has a complete real-time order notification system. When a new order is added to the database, **all online drivers automatically receive a popup notification** via Socket.io.

---

## How It Works

### Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Admin/Vendor Creates Order                                 │
│  POST /api/orders                                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend (ordersController.createOrder)                      │
│  1. Insert order into database                               │
│  2. Get all ONLINE drivers from database                    │
│  3. Call broadcastNewOrderToOnlineDrivers()                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Socket.io Server (socketService)                           │
│  Emit 'order:new' event to each  online driver              │
│  io.to(`driver:${driverId}`).emit('order:new', order)      │
└────────────────────┬────────────────────────────────────────┘
                     │
            ┌────────┴────────┐
            │                 │
            ▼                 ▼
     ┌────────────┐    ┌────────────┐
     │  Driver 1  │    │  Driver 2  │
     │  (Online)  │    │  (Online)  │
     └─────┬──────┘    └─────┬──────┘
           │                 │
           ▼                 ▼
   ┌──────────────────┐  ┌──────────────────┐
   │ useSocket Hook   │  │ useSocket Hook   │
   │ onNewOrder()     │  │ onNewOrder()     │
   └────────┬─────────┘  └────────┬─────────┘
            │                      │
            ▼                      ▼
   ┌──────────────────┐  ┌──────────────────┐
   │ setRingingOrder  │  │ setRingingOrder  │
   └────────┬─────────┘  └────────┬─────────┘
            │                      │
            ▼                      ▼
   ┌──────────────────────────────────────┐
   │  NewOrderPopup Component             │
   │  Shows order details with           │
   │  Accept/Decline buttons             │
   └──────────────────────────────────────┘
```

---

## Components Involved

### 1. Backend Files

#### `src/services/socketService.js`
**New Function:**
```javascript
broadcastNewOrderToOnlineDrivers(order, db)
```
- Fetches all drivers with `is_online = true` from the database
- Emits `'order:new'` event to each online driver's socket room
- Only online drivers receive the broadcast

#### `src/controllers/ordersController.js`
**New Endpoint Handler:**
```javascript
async function createOrder(request, reply)
```
- Receives POST request with order details
- Validates all required fields
- Inserts order into `orders` table
- Calls `broadcastNewOrderToOnlineDrivers()` to notify drivers

#### `src/routes/orders.js`
**New Route:**
```
POST /api/orders
```
- Creates a new order
- Automatically broadcasts to online drivers

### 2. Frontend Files

#### `app/(tabs)/index.tsx` (Home Screen)
**New Hook:**
```javascript
useSocket({
  onNewOrder: (order) => {
    if (isOnline) {
      setRingingOrder(order);
    }
  },
  ...
})
```
- Listens for `'order:new'` socket event
- Only sets the order if driver is online
- Triggers the NewOrderPopup component

#### `hooks/useSocket.js`
**Socket Event Listener:**
```javascript
socket.on('order:new', (order) => {
  onNewOrder?.(order);
})
```
- Receives real-time order broadcasts
- Calls the `onNewOrder` callback

#### `components/NewOrderPopup.tsx`
- Displays the order details
- Shows countdown timer (10 seconds for non-Prime, 0 for Prime)
- Buttons to Accept or Decline order

---

## API Endpoint

### POST /api/orders - Create Order and Notify Drivers

**URL:** `http://localhost:3000/api/orders`

**Request Body:**
```json
{
  "vendor_shop_name": "Pizza Palace",
  "product_name": "Margherita Pizza",
  "customer_name": "John Doe",
  "customer_phone": "9876543210",
  "pickup_address": "123 Main Street, City",
  "delivery_address": "456 Oak Avenue, City",
  "delivery_latitude": 28.6139,
  "delivery_longitude": 77.2090,
  "delivery_fee": 50,
  "total_amount": 350,
  "items": [
    {
      "name": "Margherita Pizza",
      "quantity": 1,
      "price": 300
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Order created and broadcasted to online drivers",
  "data": {
    "id": 123,
    "vendor_shop_name": "Pizza Palace",
    "product_name": "Margherita Pizza",
    "customer_name": "John Doe",
    "status": "Pending",
    "created_at": "2024-03-18T10:30:00Z"
  }
}
```

---

## Testing the System

### Prerequisites
- PostgreSQL running locally with QC Driver database
- Backend server running: `npm run dev`
- Driver app running: `npx expo start`

### Step-by-Step Test

#### Step 1: Start Backend Server
```bash
cd backend
npm run dev
```

You should see:
```
🔍 Checking database connection...
✅ Database connected successfully!
✅ QC Driver Backend is running
   Port: 3000
   Database: ✅ Connected
```

#### Step 2: Start Frontend App
```bash
cd frontend
npx expo start
```

#### Step 3: Make Driver Online
1. Open the driver app
2. Click the **ONLINE** toggle button
3. You should see "ONLINE" status with green dot

#### Step 4: Create Test Order
**Option A: Using create-test-order.js Script**
```bash
cd backend
node create-test-order.js
```

Output:
```
📦 Creating test order...

✅ DATABASE CONNECTED SUCCESSFULLY
✅ ORDER CREATED SUCCESSFULLY

📋 Order Details:
   Order ID: 123
   Vendor: Test Pizza House
   ...

📡 Broadcasting to online drivers...
🟢 Found 1 online driver(s):
   1. John Driver (ID: abc123...)
```

**Option B: Using API Directly (cURL)**
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "vendor_shop_name": "Test Pizza",
    "product_name": "Margherita Pizza",
    "customer_name": "Test Customer",
    "customer_phone": "9876543210",
    "pickup_address": "123 Main St",
    "delivery_address": "456 Oak Ave",
    "delivery_fee": 50
  }'
```

**Option C: Using Postman**
1. Create new POST request
2. URL: `http://localhost:3000/api/orders`
3. Headers: `Authorization: Bearer <driver_token>`
4. Body (JSON): Paste the example from above

#### Step 5: Watch for Popup
When the order is created, the driver should see:
1. **NewOrderPopup** appears on screen
2. Shows order details (vendor, product, price, location)
3. Countdown timer (10 seconds for regular drivers)
4. Two buttons: **Decline** and **Accept**

---

## Key Features

### 1. Online-Only Broadcast
- Orders are **only sent to online drivers**
- Offline drivers do NOT receive the popup
- Drivers set their online status via the app

### 2. Real-Time Socket.io
- Uses WebSocket for instant delivery
- Fallback to polling for compatibility
- No delays when driver is connected

### 3. Automatic Notification
- No manual action needed
- Happens automatically when order is created
- Works across all connected drivers

### 4. Prime Partner Support
- Prime partners (50+ weekly orders) have **no countdown timer**
- Regular drivers have 10-second timer to respond
- Different acceptance windows for different tiers

---

## Database Tables Involved

### `orders` table
Stores all orders. New Status: `'Pending'`

Key fields:
- `id` - Order ID
- `vendor_shop_name` - Vendor name
- `product_name` - Product/item
- `customer_name` - Customer name
- `customer_phone` - Customer phone
- `status` - Order status (Pending → Assigned → ...)
- `delivery_fee` - Delivery fee
- `created_at` - Creation timestamp

### `driver_profiles` table
Stores driver information including online status.

Key field:
- `is_online` - Boolean indicating if driver is online

---

## Common Issues & Solutions

### Issue: Driver Not Receiving Popup
**Solution:**
1. Check if driver is marked as `is_online = true`
2. Verify backend is running: `npm run dev`
3. Check Socket.io console logs
4. Ensure driver has approved account (`is_approved = true`)

### Issue: Database Connection Failed
**Solution:**
1. Ensure PostgreSQL is running
2. Check `.env` file has correct DB credentials
3. Run `node db-status.js` to verify connection

### Issue: Socket Not Connecting
**Solution:**
1. Check CORS settings in backend
2. Verify frontend API URL matches backend URL
3. Check browser console for Socket.io errors

---

## Integration with Existing System

The new system integrates seamlessly with:
- ✅ Existing order acceptance flow (`acceptOrder`)
- ✅ Trip creation and delivery tracking
- ✅ OTP generation and verification
- ✅ Photo uploads at pickup/delivery
- ✅ Payment processing

---

## Next Steps

1. **Test the system** following the steps above
2. **Monitor logs** to verify orders are being broadcast
3. **Customize** popup UI if needed (in `NewOrderPopup.tsx`)
4. **Add admin panel** to create orders (optional)
5. **Deploy to production** with proper authentication

---

## Code Example: Creating Order from Backend

```javascript
// In your admin panel or backend script
const response = await fetch('http://localhost:3000/api/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${driverToken}`,
  },
  body: JSON.stringify({
    vendor_shop_name: 'Best Pizza',
    product_name: 'Cheese Pizza',
    customer_name: 'Alice Johnson',
    customer_phone: '9988776655',
    pickup_address: '123 Pizza Lane',
    delivery_address: '456 Customer Street',
    delivery_fee: 50,
    total_amount: 350,
  }),
});

const result = await response.json();
console.log('Order created:', result.data.id);
// All online drivers will now see the popup!
```

---

## Summary

Your system now supports:
- ✅ Real-time order creation
- ✅ Automatic notification to online drivers only
- ✅ Gorgeous popup with order details
- ✅ Instant acceptance/decline
- ✅ Seamless integration with existing flow

Enjoy! 🚀
