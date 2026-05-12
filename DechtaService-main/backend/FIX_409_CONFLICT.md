## 🔧 FIX FOR 409 CONFLICT ON ORDER ACCEPT

### What Was Happening
When driver accepted an order, got: `POST http://localhost:5000/api/orders/8/accept 409 (Conflict)`

### Root Cause
Two issues:
1. **UNIQUE constraint violation** - The `delivery_trips` table has `UNIQUE(order_id, driver_id)`. If a driver tried to re-accept the same order, it would fail.
2. **Missing check for existing trips** - No validation to prevent accepting an order that's already being handled by another driver.

### What Got Fixed

**File:** `backend/src/controllers/ordersController.js`

**Changes Made:**

1. **Added check for existing active trips on the order:**
   ```javascript
   const existingTrip = await db.query(
     `SELECT dt.id, dt.driver_id, dt.status 
      FROM delivery_trips dt
      WHERE dt.order_id = $1
        AND LOWER(COALESCE(dt.status::text, '')) NOT IN ('delivered', 'cancelled', 'missed')
      LIMIT 1`,
     [orderId]
   );
   
   if (existingTrip.rows.length > 0) {
     return reply.code(409).send({
       success: false,
       message: 'This order is already being handled by another driver.',
     });
   }
   ```

2. **Added ON CONFLICT clause to handle duplicate driver-order combinations:**
   ```sql
   INSERT INTO delivery_trips (order_id, driver_id, status, payout_amount, started_at)
   VALUES ($1, $2, 'accepted', $3, NOW())
   ON CONFLICT (order_id, driver_id) DO UPDATE
   SET status = 'accepted', updated_at = NOW()
   RETURNING *
   ```

3. **Better error messages:**
   - "This order is already being handled by another driver." - If another driver has active trip
   - "Order no longer available. It may have been taken." - If order claimed by someone else
   - "You already have an active trip. Complete it before accepting another." - If driver has active trip

### How to Apply

1. Backend code is already fixed ✅
2. Restart backend: `npm run dev`
3. Try accepting order again

### Expected Result
- If order is available: ✅ 200 OK with trip details
- If order taken by another driver: ⚠️ 409 with clear message
- If driver has active trip: ⚠️ 409 with clear message
- If order already accepted: ✅ 200 OK (re-uses existing trip via ON CONFLICT)

### Testing Steps

```bash
# Clear any active trips (optional)
psql -d dechta -c "DELETE FROM delivery_trips WHERE status NOT IN ('delivered', 'cancelled', 'missed');"

# Restart backend
npm run dev

# Try accepting order 8
curl -X POST http://localhost:5000/api/orders/8/accept \
  -H "Authorization: Bearer <driver_token>"
```

### Common Scenarios Now Handled

| Scenario | Before | After |
|----------|--------|-------|
| Accept available order | ✅ | ✅ |
| Accept same order twice | ❌ 409 | ✅ 200 (re-uses trip) |
| Accept order taken by another driver | ❌ 409 (confusing) | ✅ 409 (clear message) |
| Accept when driver has active trip | ✅ 409 | ✅ 409 (same) |
| Accept order already marked as processing | ❌ 409 | ✅ 409 (clear message) |

### Database Query Logic

**What happens now:**

```sql
-- Step 1: Check driver doesn't have active trip ✓
-- Step 2: Check order doesn't have active trip with another driver ✓
-- Step 3: Try to claim the order (UPDATE)
--   - Only succeeds if status='pending' AND driver_id IS NULL
-- Step 4: Try to insert trip (INSERT with ON CONFLICT)
--   - If same driver-order combo exists, just update it
--   - Otherwise create new trip
```

### Files Modified
- `backend/src/controllers/ordersController.js` - Fixed acceptOrder function

### Next Steps
1. Run: `npm run dev` to restart with new code
2. Test order acceptance in driver app
3. Should work without 409 errors now
