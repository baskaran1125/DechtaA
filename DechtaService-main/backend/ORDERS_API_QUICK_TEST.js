/**
 * ══════════════════════════════════════════════════════════════════════════════
 * ORDERS API - QUICK TESTING REFERENCE
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * This file shows all orders endpoints and their expected responses.
 * Copy these into Postman, Insomnia, or VS Code REST Client for testing.
 * 
 * Base URL: http://localhost:5000/api
 * ══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ✅ SETUP: Get JWT Token for Testing
// ═══════════════════════════════════════════════════════════════════════════════

/*
STEP 1: Send OTP
POST /auth/send-otp
Content-Type: application/json

{
  "mobile": "9111111111"
}

Response:
{
  "success": true,
  "message": "OTP sent to 9111111111!"
}

---

STEP 2: Verify OTP & Get Token
POST /auth/verify-otp
Content-Type: application/json

{
  "mobile": "9111111111",
  "otp": "1111"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "isNewDriver": false,
  "driver": {
    "id": "...",
    "fullName": "Demo Driver One",
    "mobile": "9111111111",
    "isApproved": true
  }
}

💾 SAVE THIS TOKEN - Use in all requests below as:
Authorization: Bearer {token}
*/

// ═══════════════════════════════════════════════════════════════════════════════
// 1️⃣ GET AVAILABLE ORDERS
// ═══════════════════════════════════════════════════════════════════════════════

/*
GET /orders/available
Authorization: Bearer {TOKEN}

Response (200):
{
  "success": true,
  "data": [
    {
      "id": 1,
      "product_name": "[DEMO] Laptop - Available for Delivery",
      "customer_name": "Arjun Kumar",
      "customer_phone": "9999999901",
      "status": "Pending",
      "delivery_fee": 150,
      "total_amount": 45150,
      "vehicle_type": "Bike",
      "pickup_address": "Tech Store Mumbai, Fort Area",
      "delivery_address": "Bandra, Mumbai",
      "delivery_latitude": 19.0596,
      "delivery_longitude": 72.8295,
      "items": [{"name": "Laptop", "qty": 1, "price": 45000}],
      "created_at": "2026-03-16T10:00:00Z"
    },
    {
      "id": 2,
      "product_name": "[DEMO] Phone Case - Available for Delivery",
      "customer_name": "Priya Sharma",
      "customer_phone": "9999999902",
      "status": "Pending",
      ...
    },
    {
      "id": 3,
      "product_name": "[DEMO] Books Bundle - Available for Delivery",
      "customer_name": "Vikram Das",
      ...
    }
  ]
}

✅ Test expectations:
- Returns 3 pending orders
- All have status "Pending"
- All have no driver assigned
- Contains delivery address & fee
*/

// ═══════════════════════════════════════════════════════════════════════════════
// 2️⃣ ACCEPT AN ORDER
// ═══════════════════════════════════════════════════════════════════════════════

/*
POST /orders/1/accept
Authorization: Bearer {TOKEN}
Content-Type: application/json

Response (200):
{
  "success": true,
  "message": "Order accepted successfully",
  "trip": {
    "id": "550e8400-e29b-41d4-a716-446655440100",
    "order_id": 1,
    "driver_id": "64a8c08b-fa04-4ef7-b4ef-285a13791ae1",
    "status": "accepted",
    "distance_text": "5.2 km",
    "payout_amount": 150,
    "started_at": "2026-03-16T10:05:00Z",
    "created_at": "2026-03-16T10:05:00Z"
  }
}

✅ Test expectations:
- Trip created with status "accepted"
- Trip payout_amount = order delivery_fee
- Trip started_at = current time
- Order status changes from "Pending" to "Assigned"

❌ Error scenario:
If you try to accept a 2nd order:
Response (409):
{
  "success": false,
  "message": "You already have an active trip. Complete it before accepting another."
}
*/

// ═══════════════════════════════════════════════════════════════════════════════
// 3️⃣ GET ACTIVE TRIP
// ═══════════════════════════════════════════════════════════════════════════════

/*
GET /orders/active
Authorization: Bearer {TOKEN}

Response (200):
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440100",
    "order_id": 1,
    "driver_id": "64a8c08b-fa04-4ef7-b4ef-285a13791ae1",
    "status": "accepted",
    "product_name": "[DEMO] Laptop - Available for Delivery",
    "customer_name": "Arjun Kumar",
    "customer_phone": "9999999901",
    "delivery_fee": 150,
    "pickup_address": "Tech Store Mumbai, Fort Area",
    "delivery_address": "Bandra, Mumbai",
    "delivery_latitude": 19.0596,
    "delivery_longitude": 72.8295,
    "delivery_otp": null,
    "items": [{"name": "Laptop", "qty": 1, "price": 45000}],
    "started_at": "2026-03-16T10:05:00Z"
  }
}

✅ Test expectations:
- Returns current active trip
- Includes full order details
- delivery_otp is null until customer is at location
- status is one of: accepted, picked_up
*/

// ═══════════════════════════════════════════════════════════════════════════════
// 4️⃣ ARRIVE AT PICKUP LOCATION
// ═══════════════════════════════════════════════════════════════════════════════

/*
POST /orders/trips/{trip-id}/arrived-pickup
Authorization: Bearer {TOKEN}
Content-Type: application/json

{
  "latitude": 18.9520,
  "longitude": 72.8347
}

Response (200):
{
  "success": true,
  "message": "Arrived at pickup location",
  "trip": {
    "id": "550e8400-e29b-41d4-a716-446655440100",
    "status": "arrived_pickup",
    "arrived_at": "2026-03-16T10:10:00Z"
  }
}

✅ Test expectations:
- status remains as-is (still 'accepted' or updates to 'arrived_pickup')
- Marks driver arrival time in database
*/

// ═══════════════════════════════════════════════════════════════════════════════
// 5️⃣ CONFIRM PICKUP (Upload Photo)
// ═══════════════════════════════════════════════════════════════════════════════

/*
POST /orders/trips/{trip-id}/confirm-pickup
Authorization: Bearer {TOKEN}
Content-Type: multipart/form-data

Form data:
- photo: (binary image file)

Response (200):
{
  "success": true,
  "message": "Pickup confirmed",
  "trip": {
    "id": "550e8400-e29b-41d4-a716-446655440100",
    "status": "picked_up",
    "pickup_photo": "uploads/trips/550e8400-e29b-41d4-a716-446655440100/photo.jpg",
    "picked_up_at": "2026-03-16T10:12:00Z"
  }
}

✅ Test expectations:
- status changes to "picked_up"
- Photo URL stored in database
- Photo accessible via API

Using curl:
curl -X POST http://localhost:5000/api/orders/trips/{trip-id}/confirm-pickup \
  -H "Authorization: Bearer {TOKEN}" \
  -F "photo=@/path/to/photo.jpg"
*/

// ═══════════════════════════════════════════════════════════════════════════════
// 6️⃣ ARRIVE AT DELIVERY LOCATION
// ═══════════════════════════════════════════════════════════════════════════════

/*
POST /orders/trips/{trip-id}/arrived-dropoff
Authorization: Bearer {TOKEN}
Content-Type: application/json

{
  "latitude": 19.0596,
  "longitude": 72.8295
}

Response (200):
{
  "success": true,
  "message": "Arrived at delivery location",
  "trip": {
    "id": "550e8400-e29b-41d4-a716-446655440100",
    "status": "arrived_dropoff",
    "arrived_at_dropoff": "2026-03-16T10:20:00Z"
  }
}

✅ Test expectations:
- Trip status recorded as "arrived_dropoff"
- OTP now active for customer verification
- Ready for delivery completion
*/

// ═══════════════════════════════════════════════════════════════════════════════
// 7️⃣ COMPLETE DELIVERY (OTP Verification)
// ═══════════════════════════════════════════════════════════════════════════════

/*
POST /orders/trips/{trip-id}/complete
Authorization: Bearer {TOKEN}
Content-Type: application/json

{
  "otp": "1234"
}

Response (200):
{
  "success": true,
  "message": "Delivery completed successfully",
  "trip": {
    "id": "550e8400-e29b-41d4-a716-446655440100",
    "order_id": 1,
    "status": "delivered",
    "payout_amount": 150,
    "completed_at": "2026-03-16T10:22:00Z"
  }
}

❌ Error scenario (wrong OTP):
POST /orders/trips/{trip-id}/complete
{
  "otp": "9999"
}

Response (401):
{
  "success": false,
  "message": "Invalid delivery OTP"
}

✅ Test expectations:
- With correct OTP (1234): status → "delivered", order marked complete
- With wrong OTP: 401 error, trip remains active
- Payout registered in driver wallet/earnings
*/

// ═══════════════════════════════════════════════════════════════════════════════
// 8️⃣ GET ORDER HISTORY
// ═══════════════════════════════════════════════════════════════════════════════

/*
GET /orders/history?status=Delivered&page=1&limit=10
Authorization: Bearer {TOKEN}

Response (200):
{
  "success": true,
  "data": [
    {
      "id": 1,
      "product_name": "[DEMO] Laptop - Available for Delivery",
      "customer_name": "Arjun Kumar",
      "customer_phone": "9999999901",
      "status": "Delivered",
      "delivery_fee": 150,
      "total_amount": 45150,
      "completed_at": "2026-03-16T10:22:00Z",
      "items": [{"name": "Laptop", "qty": 1, "price": 45000}]
    },
    {
      "id": 6,
      "product_name": "[DEMO] Screen Protector - Delivered",
      "customer_name": "Anjali Nair",
      "status": "Delivered",
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2
  }
}

✅ Query parameters:
- status: "Completed", "Cancelled", "Missed" (optional)
- page: 1, 2, 3... (default 1)
- limit: 1-50 (default 20)

✅ Test expectations:
- Returns delivered orders
- Includes pagination info
- Filters by status correctly
*/

// ═══════════════════════════════════════════════════════════════════════════════
// 9️⃣ IGNORE AN ORDER
// ═══════════════════════════════════════════════════════════════════════════════

/*
POST /orders/{orderId}/ignore
Authorization: Bearer {TOKEN}
Content-Type: application/json

Response (200):
{
  "success": true,
  "message": "Order ignored"
}

✅ Test expectations:
- Order remains available for other drivers
- Driver won't see it again (in some implementations)
*/

// ═══════════════════════════════════════════════════════════════════════════════
// 🟠 CANCEL DELIVERY TRIP
// ═══════════════════════════════════════════════════════════════════════════════

/*
POST /orders/trips/{trip-id}/cancel
Authorization: Bearer {TOKEN}
Content-Type: application/json

{
  "reason": "Customer not available at location"
}

Response (200):
{
  "success": true,
  "message": "Trip cancelled",
  "trip": {
    "id": "550e8400-e29b-41d4-a716-446655440100",
    "status": "cancelled",
    "cancellation_reason": "Customer not available at location",
    "cancelled_at": "2026-03-16T10:25:00Z"
  }
}

✅ Test expectations:
- Trip status → "cancelled"
- Reason stored for analytics
- Payout may be adjusted
- Order becomes "Pending" again (available for other drivers)
*/

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 DEMO DATA STATUS REFERENCE
// ═══════════════════════════════════════════════════════════════════════════════

/*
After running: node demo-orders.js

Available Orders (Pending):
- ID 1: Laptop (₹150 fee)
- ID 2: Phone Case (₹50 fee)
- ID 3: Books Bundle (₹100 fee)

Assigned Orders (with driver):
- ID 4: Charger (₹75 fee) - trip status: accepted
- ID 5: Keyboard (₹80 fee) - trip status: picked_up
- ID 6: Screen Protector (₹40 fee) - trip status: delivered

Cancelled Orders:
- ID 7: Notebook Set

Ready To Test:
1. Accept order 1 (GET available → POST accept order)
2. Complete full workflow (arrive pickup → confirm → arrive dropoff → complete)
3. Check history (GET history with different filters)
4. Test errors (wrong OTP, multiple orders, etc.)
*/

// ═══════════════════════════════════════════════════════════════════════════════
// 🛠️ POSTMAN SETUP
// ═══════════════════════════════════════════════════════════════════════════════

/*
In Postman:

1. Create Collection: "Orders Demo Testing"

2. Create Environment Variables:
   - base_url: http://localhost:5000/api
   - token: (retrieve from verify-otp endpoint and paste)
   - order_id: 1
   - trip_id: (retrieve from accept order response)

3. Create Requests:

   [GET] {{base_url}}/orders/available
   Headers: Authorization: Bearer {{token}}

   [POST] {{base_url}}/orders/{{order_id}}/accept
   Headers: Authorization: Bearer {{token}}

   [GET] {{base_url}}/orders/active
   Headers: Authorization: Bearer {{token}}

   etc...

4. Use tests to automatically extract IDs:
   
   pm.environment.set("trip_id", pm.response.json().trip.id);
   pm.environment.set("order_id", pm.response.json().data.id);
*/
