## 🔧 FIX FOR 500 ERRORS ON CONFIRM-PICKUP & COMPLETE

### What Was Happening
```
POST /api/orders/trips/.../confirm-pickup 500 (Internal Server Error)
POST /api/orders/trips/.../complete 500 (Internal Server Error)
```

### Root Causes

**confirm-pickup endpoint:**
1. **Column doesn't exist:** Code tried to set `pickup_photo_url` which doesn't exist in `delivery_trips` table
2. **Invalid enum value:** Code tried to set order status to `'Out for Delivery'` which isn't a valid order status enum
3. **Wrong timestamp field:** Code was using `picked_up_at` instead of `departed_pickup_at`

**complete endpoint:**
- Had similar OTP column reference issues (already partially fixed)

### What Got Fixed

**File:** `backend/src/controllers/ordersController.js`

**confirmPickup function (lines 484-505):**

Before:
```javascript
await db.update(
  'delivery_trips',
  {
    status:      'picked_up',
    picked_up_at: new Date().toISOString(),
    ...(photoPath ? { pickup_photo_url: photoPath } : {}),  // ❌ Column doesn't exist
  },
  { id: tripId, driver_id: driverId }
);

if (trip?.order_id) {
  await db.update('orders', { status: 'Out for Delivery' }, { id: trip.order_id });  // ❌ Invalid enum
}
```

After:
```javascript
await db.update(
  'delivery_trips',
  {
    status:      'picked_up',
    departed_pickup_at: new Date().toISOString(),  // ✅ Correct field
  },
  { id: tripId, driver_id: driverId }
);

if (trip?.order_id) {
  await db.update('orders', { status: 'shipped' }, { id: trip.order_id });  // ✅ Valid enum
}
```

### Valid Order Status Enum Values

**From database schema:**
```sql
CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'))
```

**Mapping for code:**
- `pending` - Order created, waiting for driver
- `confirmed` - Driver accepted (but we use 'processing' for this)
- `processing` - Driver has been assigned
- `shipped` - Driver picked up package (changed from "Out for Delivery")
- `delivered` - Driver completed delivery
- `cancelled` - Order cancelled

### Updated Column Fields

**delivery_trips valid columns:**
```sql
✅ id, driver_id, order_id, status
✅ started_at, arrived_pickup_at, departed_pickup_at  -- CORRECT
❌ picked_up_at, pickup_photo_url  -- DON'T USE
✅ arrived_dropoff_at, completed_at, cancelled_at
✅ delivery_otp, otp_verified, delivery_fee, distance_text
```

### Testing Steps

```bash
# 1. Restart backend
npm run dev

# 2. Test driver flow in app
# Accept order → Arrive at pickup → Confirm pickup
# Should return 200 OK, not 500

# 3. Check logs for any errors
# Should see: "[Fastify] server listening on 0.0.0.0:5000"
```

### Related Fixes in This Update

| Endpoint | Issue | Status |
|----------|-------|--------|
| /api/orders/trips/:id/confirm-pickup | pickup_photo_url column doesn't exist | ✅ FIXED |
| /api/orders/trips/:id/confirm-pickup | 'Out for Delivery' invalid enum | ✅ FIXED |
| /api/orders/trips/:id/confirm-pickup | Wrong timestamp field | ✅ FIXED |
| /api/orders/trips/:id/complete | OTP fallback logic | ✅ FIXED (earlier) |
| /api/orders/trips/:id/arrived-dropoff | OTP fallback logic | ✅ FIXED (earlier) |
| /api/orders/:id/accept | Conflict handling | ✅ FIXED (earlier) |

### Files Modified
- `backend/src/controllers/ordersController.js` - Fixed confirmPickup function

### Next Steps
1. Backend auto-reloads with `npm run dev` (if nodemon running)
2. Or restart: `npm run dev`
3. Test driver app confirm-pickup flow
4. Should work without 500 errors

### Database Enum Validation

The enum constraint is defined as:
```sql
-- This is enforced at database level
ALTER TABLE orders 
ADD CONSTRAINT valid_order_status 
CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'));
```

Any attempt to insert/update with invalid status like 'Out for Delivery' will fail at the database level with constraint violation.

### Complete Order Status Lifecycle

```
pending          → User creates order
   ↓
processing       → Driver accepts (acceptOrder sets this)
   ↓
shipped          → Driver confirms pickup (confirmPickup sets this)
   ↓
delivered        → Driver completes delivery (completeDelivery sets this)
   ↓
[Final State]

OR

pending/processing/shipped → cancelled    → Order cancelled
```
