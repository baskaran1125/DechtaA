# 🏪 Vendor Dashboard Audit Report
**Date:** April 21, 2026  
**Status:** ⚠️ CRITICAL ISSUES FOUND | Connectivity with Client & Driver Apps At Risk  
**Scope:** DechtaService-main/vendor-dashboard/src

---

## 🎯 Executive Summary

Vendor dashboard has **30+ runtime, connectivity, and data synchronization issues** that impact real-time order management and cross-app communication. Most critical: **30-second polling without proper error handling and no real-time WebSocket connection to client/driver apps**.

### Critical Findings:
- 🔴 **Vendor-Client Connectivity:** BROKEN (polling-based, 30s delay, silent failures)
- 🔴 **Vendor-Driver Connectivity:** MISSING (no integration)
- 🔴 **Payment Flow:** RISKY (settlement polling silent failures)
- 🟡 **Real-time Updates:** Inefficient (polling instead of WebSocket)
- ⚠️ **Error Handling:** Gaps in API error recovery

---

## 🔴 CRITICAL ISSUES

### Issue #1: Order Polling Interval Without Proper Error Handling
**File:** `src/App.jsx`  
**Lines:** 130-145  
**Severity:** CRITICAL

#### Problem:
```javascript
// BEFORE: 30-second polling without error cleanup
useEffect(() => {
  if (!isAuth) return;
  const interval = setInterval(async () => {
    try {
      const oRes = await getOrders();
      setOrders(oRes.data.data || oRes.data.orders || []);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('dechta_token');
        setIsAuth(false);
      }
      // ← SILENT FAILURE: Other errors not logged or reported
      // ← NO CLEANUP: Interval continues running even if API fails repeatedly
    }
  }, 30000); // poll every 30 seconds
  return () => clearInterval(interval);
}, [isAuth]);
```

**Impact:**
- Silent API failures accumulate without user awareness
- Order updates may be missed or delayed
- No exponential backoff for failing requests
- Vendor remains unaware of connectivity issues
- Wastes bandwidth polling failed endpoints
- Stale order data shown to vendor

#### Root Cause:
- No error state tracking
- No retry mechanism with backoff
- Silent catch blocks
- No 401/403/5xx differentiation

---

### Issue #2: Missing Cross-App Connectivity Layer
**Status:** BROKEN  
**Severity:** CRITICAL

#### Problem:
The vendor app has **no real-time connection** to:
- ❌ Client app order placements
- ❌ Driver app delivery updates  
- ❌ Worker app status changes

#### Current Flow (Inefficient):
```
Client app places order → Backend stores → Vendor polls every 30s → Vendor sees order
```

**Expected Flow (What's Missing):**
```
Client app places order → Backend stores → WebSocket to Vendor → Real-time update
                                        → WebSocket to Driver → Real-time update
```

#### Impact:
- 30-second delay before vendor sees new orders
- Drivers don't get real-time order updates
- No live tracking between apps
- Can't sync order status between vendor/driver in real-time
- Race conditions between manual updates and polling

---

### Issue #3: Settlement Polling with Silent Error Catches
**File:** `src/pages/WalletPage.jsx`  
**Lines:** 60-75  
**Severity:** CRITICAL

#### Problem:
```javascript
// BEFORE: Silent error catches in settlement polling
const waitForSettlementConfirmation = async (settlementId) => {
  const maxAttempts = 40;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const statusRes = await getSettlementStatus(settlementId);
      const status = String(payload.status || payload.settlement?.status || '').toLowerCase();
      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        return { status, settlement: payload.settlement };
      }
    } catch {} // ← SILENT FAIL: No error logging, continues polling
    await sleep(3000);
  }
  return { status: 'pending', settlement: null };
};
```

**Impact:**
- Payment status never confirmed if API fails
- Vendor thinks payment is pending when it's actually failed
- Financial reconciliation impossible
- Multiple payment attempts may occur

---

### Issue #4: No API Error State Tracking
**File:** `src/pages/Dashboard.jsx`, `src/pages/WalletPage.jsx`, `src/pages/OrdersPage.jsx`  
**Severity:** HIGH

#### Problem:
API calls don't track error state:
```javascript
// No error state
const [stats, setStats] = useState(null);
const [loading, setLoading] = useState(true);
// ← Missing: const [error, setError] = useState(null);

useEffect(() => {
  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/vendors/dashboard', { params: { period } });
      setStats(res?.data || null);
    } catch {
      setStats(null);  // ← No error recorded, user doesn't know what failed
    }
    setLoading(false);
  };
}, [period]);
```

**Impact:**
- Loading spinner disappears, leaving stale data or blank view
- User doesn't know if API failed or data is actually empty
- Can't distinguish between "no data" and "failed to load"

---

### Issue #5: Settlement Payment Race Condition
**File:** `src/pages/WalletPage.jsx`  
**Lines:** 77-120  
**Severity:** HIGH

#### Problem:
```javascript
// BEFORE: No concurrency protection
const handleSettle = async () => {
  // User can click "Settle" multiple times
  // Multiple settlements created simultaneously
  // setState called on potentially unmounted component
  
  setSettling(true);
  try {
    const res = await createSettlement(due);  // ← Can be called multiple times
    // ...payment flow...
  } finally {
    setSettling(false);
  }
};
```

**Impact:**
- Multiple settlement requests if user rapid-clicks button
- Duplicate payments possible
- Race conditions in state updates

---

### Issue #6: Missing Token Refresh Mechanism
**File:** `src/api/apiClient.js`  
**Severity:** HIGH

#### Problem:
```javascript
// BEFORE: No token refresh
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('dechta_token');
      window.location.reload();  // ← Hard reload, terrible UX
    }
    return Promise.reject(err);
  }
);
```

**Impact:**
- Session expires → Hard reload → User loses work
- No graceful token refresh
- Poor user experience
- Data loss if user has unsaved changes

---

## 🟡 HIGH-PRIORITY ISSUES

### Issue #7: Vendor to Driver Connectivity Missing
**Status:** NOT IMPLEMENTED  
**Severity:** HIGH

#### Problem:
No mechanism to communicate order status to drivers in real-time.

**Current state:**
- Drivers don't know order is assigned
- Driver can't get real-time delivery instructions
- No status feedback from driver to vendor

---

### Issue #8: Vendor to Worker Connectivity Missing
**Status:** UNCLEAR  
**Severity:** HIGH

#### Problem:
No verification or integration with worker app endpoints.

---

### Issue #9: Props Drilling Without Context
**File:** `src/App.jsx`  
**Severity:** HIGH

#### Problem:
Passing props through 5+ levels without Context API:
```javascript
// BEFORE: Props drilled through many components
<Dashboard 
  products={products} 
  orders={orders} 
  setView={setView} 
  notify={notify}
  // ... more props
/>
```

**Impact:**
- Hard to maintain
- Prop updates cause unnecessary re-renders
- Difficult to access global state from nested components

---

### Issue #10: No Loading State for Async Operations
**File:** Multiple pages  
**Severity:** MEDIUM

#### Problem:
Missing proper UX during async operations:
- Settlement initiation has no loading feedback
- Product creation/update shows no progress
- Order status updates unresponsive

---

## 📊 Real-Time Communication Status

| Connection | Status | Issue |
|-----------|--------|-------|
| Vendor ↔ Client | ❌ BROKEN | 30s polling, silent failures |
| Vendor ↔ Driver | ❌ MISSING | No integration |
| Vendor ↔ Worker | ⚠️ LIMITED | Unclear endpoints |
| Vendor → Backend | ✅ Working | HTTP, but no recovery |

---

## ✅ Clean Components (No Issues)

- `src/components/ui/*` - UI components clean
- `src/components/layout/*` - Layout components clean
- `src/data/*` - Data files clean
- `src/components/charts/*` - Charts component clean

---

## 📋 Priority Fix Checklist

### Week 1 (CRITICAL):
- [ ] Fix order polling with error state tracking
- [ ] Add error boundaries
- [ ] Fix settlement payment race condition
- [ ] Implement proper error handling in API calls

### Week 2 (HIGH):
- [ ] Implement WebSocket connection for real-time order updates
- [ ] Add token refresh mechanism
- [ ] Implement proper loading states
- [ ] Add error reporting system

### Week 3 (MEDIUM):
- [ ] Implement Context API for state management
- [ ] Add vendor-driver connectivity
- [ ] Add vendor-worker connectivity verification
- [ ] Add form validation

---

## 🚀 Recommended Architecture Changes

### 1. Real-Time Updates (Replace 30s Polling)
```javascript
// Use Socket.IO or similar
const socket = io(API_BASE);
socket.on('order:new', (order) => setOrders(prev => [order, ...prev]));
socket.on('order:updated', (order) => updateOrderInList(order));
```

### 2. Context API for Global State
```javascript
<VendorProvider>
  <App />
</VendorProvider>
```

### 3. Error Boundary & Retry Logic
```javascript
const handleApiCall = async (fn) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === 2) throw err;
      await sleep(1000 * Math.pow(2, attempt)); // exponential backoff
    }
  }
};
```

---

## 📞 Immediate Actions Required

1. **Today:** Fix order polling error handling
2. **Tomorrow:** Add error state UI feedback
3. **This week:** Fix settlement payment race condition
4. **Next week:** Begin WebSocket implementation

---

**Audit Status:** ⚠️ Production deployment NOT RECOMMENDED until critical issues fixed
