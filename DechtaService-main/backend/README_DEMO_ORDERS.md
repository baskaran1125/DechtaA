# 📦 Orders Demo - Complete Testing Guide

## ✨ What's Included

The demo script creates **7 realistic test orders** with different statuses to safely test all order features:

```
✅ 3 PENDING Orders       → Test available orders listing
✅ 1 ASSIGNED Order      → Test accepted orders
✅ 1 IN DELIVERY Order   → Test picked up orders  
✅ 1 DELIVERED Order     → Test completed orders
✅ 1 CANCELLED Order     → Test cancellation handling
```

Plus **3 Delivery Trips** with different statuses to test the complete workflow.

## 🚀 Quick Start

```bash
# Create demo data (safe - checks for duplicates)
node demo-orders.js

# Check demo data statistics
node demo-orders.js --check

# Remove all demo data
node demo-orders.js --cleanup
```

## 📊 Demo Data Overview

### Demo Drivers (Auto-Created)
- **Demo Driver One** → 9111111111
- **Demo Driver Two** → 9222222222

Both are pre-approved and have Bike vehicles assigned.

### Demo Orders Created

| # | Product | Status | Driver | Purpose |
|---|---------|--------|--------|---------|
| 1 | Laptop | Pending | None | Test available orders API |
| 2 | Phone Case | Pending | None | Test order discovery |
| 3 | Books Bundle | Pending | None | Test driver can find orders |
| 4 | Charger | Assigned | Driver 1 | Test accepted/in-transit status |
| 5 | Keyboard | Out for Delivery | Driver 1 | Test picked up status |
| 6 | Screen Protector | Delivered | Driver 1 | Test completed delivery |
| 7 | Notebook Set | Cancelled | None | Test cancellation |

### Demo Delivery Trips
- **Trip 1**: Charger order → Status: `accepted` (In progress)
- **Trip 2**: Keyboard order → Status: `picked_up` (En route)
- **Trip 3**: Screen Protector → Status: `delivered` (Completed)

## 🧪 Testing Workflows

### Test 1: Get Available Orders
```bash
curl -X GET http://localhost:5000/api/orders/available \
  -H "Authorization: Bearer <driver-token>"
```
**Should return:** 3 pending orders (Laptop, Phone Case, Books Bundle)

---

### Test 2: Accept an Order
```bash
curl -X POST http://localhost:5000/api/orders/1/accept \
  -H "Authorization: Bearer <driver-token>"
```
**Should create:** New delivery trip, mark order as Assigned

---

### Test 3: Get Active Trip
```bash
curl -X GET http://localhost:5000/api/orders/active \
  -H "Authorization: Bearer <driver-token>"
```
**Should return:** Current active trip with all order details

---

### Test 4: Arrive at Pickup
```bash
curl -X POST http://localhost:5000/api/orders/trips/{trip-id}/arrived-pickup \
  -H "Authorization: Bearer <driver-token>" \
  -H "Content-Type: application/json" \
  -d '{"latitude": 18.9520, "longitude": 72.8347}'
```

---

### Test 5: Confirm Pickup (Upload Photo)
```bash
curl -X POST http://localhost:5000/api/orders/trips/{trip-id}/confirm-pickup \
  -H "Authorization: Bearer <driver-token>" \
  -F "photo=@photo.jpg"
```

---

### Test 6: Arrive at Delivery Location
```bash
curl -X POST http://localhost:5000/api/orders/trips/{trip-id}/arrived-dropoff \
  -H "Authorization: Bearer <driver-token>" \
  -H "Content-Type: application/json" \
  -d '{"latitude": 19.0596, "longitude": 72.8295}'
```

---

### Test 7: Complete Delivery with OTP
```bash
curl -X POST http://localhost:5000/api/orders/trips/{trip-id}/complete \
  -H "Authorization: Bearer <driver-token>" \
  -H "Content-Type: application/json" \
  -d '{"otp": "1234"}'
```

---

### Test 8: Get Order History
```bash
curl -X GET "http://localhost:5000/api/orders/history?status=Delivered&page=1" \
  -H "Authorization: Bearer <driver-token>"
```
**Should show:** Completed and cancelled orders with pagination

---

## 🗄️ SQL Queries for Verification

### Check All Demo Orders
```sql
SELECT id, product_name, status, driver_id 
FROM orders 
WHERE product_name ILIKE '%[DEMO]%'
ORDER BY id;
```

### Check Delivery Trips
```sql
SELECT id, order_id, status, payout_amount, driver_id 
FROM delivery_trips 
WHERE order_id IN (SELECT id FROM orders WHERE product_name ILIKE '%[DEMO]%')
ORDER BY id;
```

### Check Demo Drivers
```sql
SELECT id, full_name, mobile_number, is_approved, is_online
FROM driver_profiles
WHERE full_name ILIKE '%demo%';
```

### Check Trip Statuses
```sql
SELECT 
  o.id as order_id,
  o.product_name,
  o.status as order_status,
  dt.status as trip_status,
  dt.payout_amount
FROM orders o
LEFT JOIN delivery_trips dt ON o.id = dt.order_id
WHERE o.product_name ILIKE '%[DEMO]%'
ORDER BY o.id;
```

## 🔒 Safety Features

✅ **All demo data marked with [DEMO] tag** - Easy to identify & filter  
✅ **Non-intrusive** - Uses separate demo drivers, doesn't modify real data  
✅ **Idempotent** - Running multiple times won't create duplicates  
✅ **Easy cleanup** - `node demo-orders.js --cleanup` removes everything  
✅ **Real statuses** - Uses actual PostgreSQL order status values  
✅ **Proper UUIDs** - All IDs are valid PostgreSQL UUIDs

## 📋 File Structure

```
backend/
├── demo-orders.js              ← Main demo creation script (this creates the demo data)
├── ORDERS_DEMO_GUIDE.md        ← This file (testing guide)
├── ORDERS_API_TESTING.js       ← Detailed API endpoint testing workflow
├── sql/
│   ├── 002_postgres_schema.sql ← Database schema (orders & trips tables)
│   └── ORDER_CHECKING_QUERIES.sql ← SQL queries for order checking
```

## 🛠️ Customizing Demo Data

To add more demo orders, edit `demo-orders.js`:

```javascript
// In generateDemoOrders() function, add:
{
  vendor_id: VENDOR_ID_1,
  driver_id: null,
  product_name: `${DEMO_TAG} Your Product Name`,
  customer_name: 'Customer Name',
  customer_phone: '9999999999',
  status: 'Pending',
  delivery_fee: 100,
  total_amount: 1100,
  // ... other fields
}
```

Then run: `node demo-orders.js`

## ❌ Error Scenarios

The demo includes data to test error cases:

```
1. Accept multiple orders simultaneously
   → Should return: 409 Conflict ("Already have active trip")

2. Complete without pickup confirmation
   → Should return: 422 Unprocessable Entity

3. Use wrong OTP on delivery
   → Should return: 401 Unauthorized ("Invalid OTP")

4. Cancel completed trip
   → Should return: 422 Unprocessable Entity
```

## 🧹 Cleanup

```bash
# Remove ALL demo data (safe, only removes marked data)
node demo-orders.js --cleanup

# Verify cleanup
node demo-orders.js --check
# Should show: Orders: 0, Trips: 0
```

## 📱 Frontend Testing

### Login with Demo Driver
1. Go to login screen
2. Enter: `9111111111` (Demo Driver One)
3. Verify OTP: Check database or use the OTP from script output

### Accept Pending Order
1. After login, go to "Orders" tab
2. Should see 3 pending orders from demo data
3. Click "Accept" to test workflow

### Track Delivery
1. Go to "Dashboard" tab
2. Should show active trip (if order was accepted)
3. Test each status update button (Pickup, Dropoff, Complete)

## 🐛 Troubleshooting

**Q: Database connection error?**
A: Ensure PostgreSQL is running and `.env` has correct credentials.

**Q: Demo data not showing in API?**
A: Run `node demo-orders.js --check` to verify data exists, then check JWT token.

**Q: Want to reset demo data?**
A: 
```bash
node demo-orders.js --cleanup
node demo-orders.js
```

**Q: Orders showing but no delivery trips?**
A: Run the script again - it checks for existing driver IDs before creating trips.

## 📞 Support

- Check `ORDERS_API_TESTING.js` for detailed endpoint testing workflow
- Check `ORDER_CHECKING_QUERIES.sql` for SQL query examples
- Database schema: `sql/002_postgres_schema.sql`

---

**Created:** March 16, 2026  
**Status:** ✅ Ready for testing
