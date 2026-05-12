# QC Logistics Driver App — Full Stack Setup Guide

## Project Structure
```
qc-driver-backend/     ← Node.js + Fastify backend (deploy to Render)
MobileDriver-main/     ← Expo React Native app (deploy to Vercel/EAS)
sql/                   ← Supabase migration SQL
```

---

## STEP 1 — Supabase Setup

### 1a. Create Storage Buckets
Go to **Supabase Dashboard → Storage** and create these 4 buckets:

| Bucket Name         | Public? |
|---------------------|---------|
| `driver-avatars`    | ✅ Yes  |
| `driver-documents`  | ❌ No   |
| `package-photos`    | ❌ No   |
| `promo-images`      | ✅ Yes  |

### 1b. Run the SQL Migration
Go to **Supabase Dashboard → SQL Editor** and run the file:
```
sql/001_missing_tables.sql
```

This creates 7 missing tables and enables Realtime on all key tables.

### 1c. Enable Realtime
Go to **Supabase Dashboard → Database → Replication** and enable the following tables:
- `orders`
- `delivery_trips`
- `driver_profiles`
- `driver_notifications`
- `driver_stats`
- `driver_wallets`

---

## STEP 2 — Backend Setup (Render)

### 2a. Local Development

```bash
cd qc-driver-backend

# Install dependencies
npm install

# Copy env file
cp .env.example .env

# Fill in your values in .env:
#   SUPABASE_URL=https://xxx.supabase.co
#   SUPABASE_ANON_KEY=...
#   SUPABASE_SERVICE_ROLE_KEY=...
#   JWT_SECRET=any-long-random-string-min-32-chars

# Start dev server
npm run dev
```

Server runs at: `http://localhost:3000`

Health check: `http://localhost:3000/health`

### 2b. Deploy to Render

1. Push `qc-driver-backend/` to a GitHub repo
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your GitHub repo
4. Settings:
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`
   - **Node version**: 18+
5. Add Environment Variables in Render dashboard:
   ```
   NODE_ENV=production
   PORT=3000
   SUPABASE_URL=your-url
   SUPABASE_ANON_KEY=your-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-key
   JWT_SECRET=your-secret
   OTP_PROVIDER=mock
   ```
6. Deploy — your URL will be: `https://qc-driver-backend.onrender.com`

---

## STEP 3 — Frontend Setup (Expo)

### 3a. Install new dependencies

```bash
cd MobileDriver-main
npm install
```

New packages added:
- `socket.io-client` — real-time order pings
- `@react-native-async-storage/async-storage` — token storage

### 3b. Update API URL

Edit `MobileDriver-main/.env`:
```
EXPO_PUBLIC_API_URL=https://qc-driver-backend.onrender.com
```

### 3c. Run the app

```bash
npx expo start
```

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/send-otp` | Send OTP to mobile |
| POST | `/api/auth/verify-otp` | Verify OTP, get JWT |
| POST | `/api/auth/refresh` | Refresh JWT token |

### Driver
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/driver/profile` | Get full profile |
| PUT | `/api/driver/profile` | Update profile |
| POST | `/api/driver/register` | Complete onboarding |
| PUT | `/api/driver/online-status` | Go online/offline |
| POST | `/api/driver/gps` | GPS ping |
| POST | `/api/driver/upload-avatar` | Upload profile photo |
| POST | `/api/driver/upload-document` | Upload KYC doc |
| GET | `/api/driver/notifications` | Get alerts |
| PUT | `/api/driver/notifications/mark-read` | Mark all read |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders/available` | Get available orders |
| GET | `/api/orders/active` | Get active trip |
| GET | `/api/orders/history` | Order history |
| POST | `/api/orders/:id/accept` | Accept order |
| POST | `/api/orders/:id/ignore` | Ignore order |
| POST | `/api/orders/trips/:id/arrived-pickup` | Arrived at pickup |
| POST | `/api/orders/trips/:id/confirm-pickup` | Pickup photo + confirm |
| POST | `/api/orders/trips/:id/arrived-dropoff` | Arrived at dropoff |
| POST | `/api/orders/trips/:id/complete` | Complete with OTP |
| POST | `/api/orders/trips/:id/cancel` | Cancel trip |

### Earnings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/earnings?timeframe=daily` | Earnings by timeframe |
| GET | `/api/earnings/summary` | Today/week/total summary |

### Wallet
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wallet` | Balance + transactions |
| POST | `/api/wallet/withdraw` | Request withdrawal |
| POST | `/api/wallet/pay-dues` | Pay outstanding dues |

### Misc
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leaderboard` | Weekly leaderboard |
| GET | `/api/promos` | Promo slider images |
| GET | `/api/achievements` | Ranks + pilot status |
| GET | `/api/trips/:id/chat` | Get chat messages |
| POST | `/api/trips/:id/chat` | Send chat message |

---

## OTP Configuration

Currently in **MOCK mode** — OTP is printed to the server console.

To switch to real SMS via MSG91:
1. Get your API key from [msg91.com](https://msg91.com)
2. Create an OTP template
3. Update `.env`:
   ```
   OTP_PROVIDER=msg91
   MSG91_AUTH_KEY=your-key
   MSG91_TEMPLATE_ID=your-template-id
   ```

---

## Socket.io Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `driver:register` | `{ driverId }` | Register after connect |
| `driver:status` | `{ driverId, isOnline }` | Online/offline |
| `driver:gps_ping` | `{ driverId, tripId, lat, lng }` | Live GPS |
| `trip:join` | `{ tripId }` | Join trip chat room |
| `trip:chat_message` | `{ tripId, message }` | Send chat |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `order:new` | order object | New order available |
| `order:updated` | `{ tripId, status }` | Trip status change |
| `notification:new` | notification object | Push alert |
| `trip:chat_message` | message object | Incoming chat |

---

## Missing Tables Added (SQL migration)

1. `driver_notifications` — bell icon alerts
2. `driver_gps_locations` — live GPS pings
3. `driver_chat_messages` — in-trip chat
4. `driver_package_photos` — pickup photos
5. `driver_referrals` — referral tracking
6. `driver_leaderboard_cache` — weekly rank cache
7. `driver_ads` columns: `display_order`, `target_driver_type`
