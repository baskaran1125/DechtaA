# Dechta Client Backend

Node.js + Express + PostgreSQL backend for the Dechta client app.

---

## Folder Structure

```
client-backend/
├── src/
│   ├── config/
│   │   └── db.js                  # PostgreSQL pool
│   ├── controllers/
│   │   ├── authController.js      # OTP login + JWT
│   │   ├── productController.js   # Products + vendors + nearby
│   │   └── orderController.js     # Bookings / orders
│   ├── middleware/
│   │   ├── authMiddleware.js      # JWT guard
│   │   └── errorHandler.js        # Global error handler
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── productRoutes.js
│   │   ├── orderRoutes.js
│   │   └── vendorRoutes.js
│   ├── services/
│   │   ├── otp.service.js         # Mock OTP (1234)
│   │   └── msg91.service.js       # MSG91 — commented, ready to enable
│   ├── utils/
│   │   ├── asyncHandler.js
│   │   └── response.js
│   └── app.js                     # Express setup
├── server.js                      # Entry point
├── package.json
├── .env.example
└── .gitignore
```

---

## Environment Variables

Copy `.env.example` → `.env` and fill in:

| Variable        | Description                               |
|-----------------|-------------------------------------------|
| `DATABASE_URL`  | PostgreSQL connection string (same as vendor backend) |
| `JWT_SECRET`    | Min 32-char random string                 |
| `JWT_EXPIRES_IN`| Token expiry e.g. `30d`                   |
| `PORT`          | Default `5001`                            |
| `CLIENT_URL`    | Frontend URL for CORS e.g. `http://localhost:5173` |

---

## ⚠️ IMPORTANT: Run Migration First

Before starting the backend, run this SQL in your PostgreSQL / Supabase SQL Editor:

```
client-backend/src/db/migration.sql
```

This fixes 3 real schema issues found in the original DB:
1. `otp_verifications` had no unique constraint on `phone_number` — ON CONFLICT would crash
2. `cprofiles.phone` is `NUMERIC` with no unique constraint — adds `phone_text VARCHAR UNIQUE`
3. Adds performance indexes for `products.status` filtering

**Without this migration, OTP login WILL crash.**

---

## How to Start

```bash
cd client-backend
npm install
cp .env.example .env
# Fill in DATABASE_URL and JWT_SECRET in .env
npm run dev        # development (nodemon)
npm start          # production
```

Health check: http://localhost:5001/api/health

---

## API Endpoints

### Auth
| Method | Endpoint                | Auth | Description        |
|--------|-------------------------|------|--------------------|
| POST   | /api/auth/send-otp      | No   | Send OTP to phone  |
| POST   | /api/auth/verify-otp    | No   | Verify OTP + login |
| GET    | /api/auth/profile       | JWT  | Get user profile   |
| PUT    | /api/auth/profile       | JWT  | Update profile     |

### Products
| Method | Endpoint                    | Auth | Description              |
|--------|-----------------------------|------|--------------------------|
| GET    | /api/products               | No   | All approved products    |
| GET    | /api/products/:id           | No   | Single product           |
| GET    | /api/products/nearby        | No   | Products near lat/lng    |
| GET    | /api/products/categories    | No   | Category list            |

### Vendors
| Method | Endpoint                        | Auth | Description           |
|--------|---------------------------------|------|-----------------------|
| GET    | /api/vendors/active             | No   | Vendors with products |
| GET    | /api/vendors/:vendorId/products | No   | Vendor's products     |

### Orders
| Method | Endpoint       | Auth | Description       |
|--------|----------------|------|-------------------|
| POST   | /api/orders    | JWT  | Place order       |
| GET    | /api/orders/my | JWT  | My order history  |

---

## Sample cURL Requests

### 1. Health Check
```bash
curl http://localhost:5001/api/health
```

### 2. Send OTP
```bash
curl -X POST http://localhost:5001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210"}'
```

### 3. Verify OTP (Mock OTP = 1234)
```bash
curl -X POST http://localhost:5001/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","otp":"1234","name":"Test User"}'
```
→ Returns `token`. Copy it for protected requests below.

### 4. Get All Products
```bash
curl http://localhost:5001/api/products
```

### 5. Get Products by Category
```bash
curl "http://localhost:5001/api/products?category=hardware"
```

### 6. Search Products
```bash
curl "http://localhost:5001/api/products?search=cement"
```

### 7. Nearby Products
```bash
curl "http://localhost:5001/api/products/nearby?lat=13.0827&lng=80.2707"
```

### 8. Active Vendors
```bash
curl http://localhost:5001/api/vendors/active
```

### 9. My Orders (replace TOKEN)
```bash
curl http://localhost:5001/api/orders/my \
  -H "Authorization: Bearer TOKEN_HERE"
```

### 10. Place Order (replace TOKEN)
```bash
curl -X POST http://localhost:5001/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_HERE" \
  -d '{
    "items": [{"id":1,"name":"Cement Bag","price":350,"qty":2,"vendor_id":"uuid-here"}],
    "total_amount": 700,
    "delivery_address": "123 Main St, Chennai",
    "customer_name": "Test User",
    "customer_phone": "9876543210"
  }'
```

---

## Database Rules

- Products are fetched with `status = 'approved'` ONLY
- The `status` column in the `products` table holds: `pending` | `approved`
- Admin module will approve products → they automatically appear in client

## Sample Mode

When no approved products exist, the backend returns all active products for testing.

**REMOVE SAMPLE MODE AFTER ADMIN MODULE READY** — search for this comment in `productController.js`

---

## Frontend Connection

The frontend (`dechta-client-main`) connects via `VITE_API_URL` in its `.env`:

```
VITE_API_URL=http://localhost:5001
```

For production, set this to your deployed backend URL (e.g. Render).

Files modified in frontend:
- `src/App.jsx` — added `fetchProducts`, `fetchActiveVendors`, `fetchVendorProducts` calls
- `src/components/LoginModal.jsx` — wired to real OTP API with fallback
- `src/api/apiClient.js` — new file, all API calls

---

## Enable MSG91 (Production OTP)

1. Add to `.env`:
   ```
   MSG91_AUTH_KEY=your_key
   MSG91_TEMPLATE_ID=your_template_id
   ```
2. In `src/services/msg91.service.js` — uncomment the function bodies
3. In `src/services/otp.service.js` — uncomment the `await msg91Service.sendOtp()` line

---

## Disable Sample Mode

In `src/controllers/productController.js`, remove all blocks marked:
```
// ── SAMPLE MODE ──
// REMOVE SAMPLE MODE AFTER ADMIN MODULE READY
...
// ── END SAMPLE MODE ──
```
