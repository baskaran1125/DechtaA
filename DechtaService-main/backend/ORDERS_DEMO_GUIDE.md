# 📋 Orders Demo Testing Guide

## Overview

The demo script (`demo-orders.js`) creates realistic test data for all order features without affecting production data. All demo data is marked with `[DEMO]` tag for easy identification and cleanup.

## Quick Start

```bash
# Create demo data
node demo-orders.js

# Check demo data statistics
node demo-orders.js --check

# Remove all demo data
node demo-orders.js --cleanup
```

## Demo Data Structure

### Demo Vendors (2)
- **Tech Store Mumbai** - `vendor-demo-001`
- **Quick Mart Delhi** - `vendor-demo-002`

### Demo Drivers (2)
- **Demo Driver One** - `driver-demo-001` (Phone: 9111111111)
- **Demo Driver Two** - `driver-demo-002` (Phone: 9222222222)

Both drivers are approved and online with vehicles assigned.

### Demo Orders (7 different statuses)

| Order ID | Product | Status | Driver | Notes |
|----------|---------|--------|--------|-------|
| order-demo-001 | Laptop | **Pending** | None | Available for any driver to accept |
| order-demo-002 | Phone Case | **Pending** | None | Available for any driver to accept |
| order-demo-003 | Books Bundle | **Pending** | None | Available for any driver to accept |
| order-demo-004 | Charger | **Accepted** | driver-demo-001 | In transit to customer |
| order-demo-005 | Keyboard | **Picked Up** | driver-demo-001 | Collected, heading to delivery |
| order-demo-006 | Screen Protector | **Delivered** | driver-demo-001 | Completed delivery |
| order-demo-007 | Notebook Set | **Cancelled** | None | Cancelled order |

### Demo Delivery Trips (3)

- **trip-demo-001**: Ongoing (30 min ago) - Status: `accepted`
- **trip-demo-002**: Ongoing (15 min ago) - Status: `picked_up`
- **trip-demo-003**: Completed - Status: `delivered`

## Features You Can Test

### 1. **Get Available Orders**
```bash
curl -X GET http://localhost:5000/api/orders/available \
  -H "Authorization: Bearer <driver-token>"
```
**Expected Response**: Returns 3 pending orders (order-demo-001, 002, 003) that any driver can accept.

---

### 2. **Accept an Order**
```bash
curl -X POST http://localhost:5000/api/orders/order-demo-001/accept \
  -H "Authorization: Bearer <driver-token>" \
  -H "Content-Type: application/json"
```
**Expected Response**: Creates a new delivery trip and marks order as `Accepted`.

---

### 3. **Get Active Trip**
```bash
curl -X GET http://localhost:5000/api/orders/active \
  -H "Authorization: Bearer <driver-token>"
```
**Expected Response**: Returns the active trip (if driver has one in progress).

---

### 4. **Arrive at Pickup Location**
```bash
curl -X POST http://localhost:5000/api/orders/trips/trip-demo-001/arrived-pickup \
  -H "Authorization: Bearer <driver-token>" \
  -H "Content-Type: application/json"
```
**Expected Response**: Updates trip status to `arrived_pickup`.

---

### 5. **Confirm Pickup (with photo)**
```bash
curl -X POST http://localhost:5000/api/orders/trips/trip-demo-001/confirm-pickup \
  -H "Authorization: Bearer <driver-token>" \
  -F "photo=@/path/to/photo.jpg"
```
**Expected Response**: Updates trip to `picked_up`, stores photo.

---

### 6. **Arrive at Delivery Location**
```bash
curl -X POST http://localhost:5000/api/orders/trips/trip-demo-001/arrived-dropoff \
  -H "Authorization: Bearer <driver-token>" \
  -H "Content-Type: application/json"
```
**Expected Response**: Updates trip status to `arrived_dropoff`.

---

### 7. **Complete Delivery (with OTP)**
```bash
curl -X POST http://localhost:5000/api/orders/trips/trip-demo-001/complete \
  -H "Authorization: Bearer <driver-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "otp": "1234"
  }'
```
**Expected Response**: Marks delivery as complete, updates trip to `delivered`.

---

### 8. **Cancel Trip**
```bash
curl -X POST http://localhost:5000/api/orders/trips/trip-demo-001/cancel \
  -H "Authorization: Bearer <driver-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Customer not available"
  }'
```
**Expected Response**: Cancels the trip with reason.

---

### 9. **Get Order History**
```bash
curl -X GET "http://localhost:5000/api/orders/history?status=Delivered&page=1&limit=10" \
  -H "Authorization: Bearer <driver-token>"
```
**Expected Response**: Returns completed/cancelled orders with pagination.

---

## Database Queries for Testing

### Check All Demo Orders
```sql
SELECT id, product_name, status, driver_id 
FROM orders 
WHERE product_name ILIKE '%[DEMO]%'
ORDER BY created_at DESC;
```

### Check Demo Delivery Trips
```sql
SELECT id, order_id, status, driver_id, payout_amount 
FROM delivery_trips 
WHERE id ILIKE '%trip-demo%'
ORDER BY created_at DESC;
```

### Check Demo Driver Stats
```sql
SELECT 
  dp.full_name,
  COUNT(DISTINCT dt.id) as total_trips,
  SUM(CASE WHEN dt.status = 'delivered' THEN dt.payout_amount ELSE 0 END) as earnings
FROM driver_profiles dp
LEFT JOIN delivery_trips dt ON dp.id = dt.driver_id
WHERE dp.full_name ILIKE '%demo%'
GROUP BY dp.id, dp.full_name;
```

---

## What Each Demo Order Tests

### **Pending Orders (Test Discovery)**
- Tests "available orders" listing
- Tests order acceptance logic
- Tests driver matching by vehicle type

### **Accepted Order (Test In-Transit)**
- Tests active trip retrieval
- Tests "arrived at pickup" workflow
- Tests client notification on status change

### **Picked Up Order (Test Delivery)**
- Tests "arrived at dropoff" workflow
- Tests OTP verification
- Tests delivery completion flow

### **Delivered Order (Test History)**
- Tests completed order history
- Tests payout calculation
- Tests earnings tracking

### **Cancelled Order (Test Cancellation)**
- Tests cancellation logic
- Tests reason tracking
- Tests refund/payout handling

---

## Safety Features

✅ **All demo data is marked with `[DEMO]` tag** - Easy to identify in database
✅ **Non-intrusive** - Uses separate demo IDs, doesn't modify real data
✅ **Idempotent** - Running script multiple times won't create duplicates
✅ **Easy cleanup** - `node demo-orders.js --cleanup` removes everything
✅ **No impact on auth** - Uses demo driver IDs, real drivers unaffected
✅ **Realistic data** - Includes valid coordinates, actual addresses, proper timestamps

---

## Cleanup

To remove all demo data:
```bash
node demo-orders.js --cleanup
```

This will safely delete:
- All delivery trips (trip-demo-*)
- All demo orders ([DEMO] products)
- All demo drivers
- All demo vendors

---

## Extending the Demo

To add more demo data, edit `demo-orders.js`:

```javascript
// Add a new order in generateDemoOrders()
{
  id: 'order-demo-008',
  vendor_id: 'vendor-demo-001',
  driver_id: null,
  product_name: `${DEMO_TAG} Your Product Name`,
  customer_name: 'Your Customer',
  customer_phone: '9999999999',
  // ... other fields
}

// Run: node demo-orders.js
```

---

## Troubleshooting

**Q: Database connection error?**
A: Make sure backend is running and database credentials in `.env` are correct.

**Q: Demo data already exists?**
A: The script checks for duplicates. Run `node demo-orders.js --cleanup` then `node demo-orders.js` to reset.

**Q: Orders not showing in API?**
A: Ensure driver is authenticated with valid JWT token from login/registration.

**Q: Want real driver data instead of demo drivers?**
A: Update the order's `driver_id` in the script to use existing driver IDs from your database.
