// services/api.js
// ──────────────────────────────────────────────────────────────
// QC Driver App — Centralized API Service
// All backend calls go through this file.
// Replace BASE_URL with your actual Render deployment URL.
// ──────────────────────────────────────────────────────────────

import { createKeyedStorage } from '../utils/storage';
import { Platform } from 'react-native';

// ── Config ───────────────────────────────────────────────────
const resolveDriverBackendUrl = () => {
  const raw =
    process.env.EXPO_PUBLIC_DRIVER_API_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    'http://localhost:5003';
  return raw.replace(/\/+$/, '');
};

export const DRIVER_BACKEND_URL = resolveDriverBackendUrl();
// Backward-compatible alias used across existing screens/components.
export const BASE_URL = DRIVER_BACKEND_URL;

/**
 * Converts a stored document path (relative or absolute) into a full URL.
 * The backend serves uploaded files at: <BACKEND_URL>/uploads/<relative-path>
 * e.g. "driver-documents/abc/file/xyz.jpg" → "http://localhost:5003/uploads/driver-documents/abc/file/xyz.jpg"
 */
export function resolveDocUrl(path) {
  if (!path) return null;
  // Already a full URL (http/https or data: URI from camera) — return as-is
  if (path.startsWith('data:') || path.startsWith('file:')) return path;
  if (/^https?:\/\//i.test(path)) {
    const uploadMatch = path.replace(/\\/g, '/').match(/\/uploads\/(.+)$/i);
    if (uploadMatch?.[1]) return `${DRIVER_BACKEND_URL}/uploads/${uploadMatch[1]}`;
    return path;
  }
  // Already has /uploads prefix — just prepend backend host
  if (path.startsWith('/uploads/')) return `${DRIVER_BACKEND_URL}${path}`;
  // Raw relative path from uploadService.js — prepend backend + /uploads/
  return `${DRIVER_BACKEND_URL}/uploads/${path}`;
}


// ── Storage ──────────────────────────────────────────────────
const storage = createKeyedStorage('qc_driver');

// ── Token Management ─────────────────────────────────────────
export const TokenStore = {
  async get() {
    return await storage.get('token');
  },
  async set(token) {
    await storage.set('token', token);
  },
  async remove() {
    await storage.remove('token');
  },
};

export const DriverStore = {
  async get() {
    const raw = await storage.get('data');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  async set(driver) {
    await storage.set('data', JSON.stringify(driver));
  },
  async remove() {
    await storage.remove('data');
  },
};

// ── Core Fetch Wrapper ────────────────────────────────────────
async function apiRequest(endpoint, options = {}) {
  const token = await TokenStore.get();

  const config = {
    method: options.method || 'GET',
    headers: {
      // Only set Content-Type when sending a body — Fastify rejects empty JSON bodies
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  };

  // For multipart (file uploads) — don't set Content-Type, let fetch set boundary
  if (options.isMultipart) {
    delete config.headers['Content-Type'];
    config.body = options.formData;
  }

  // ── Timeout: abort any request that hangs longer than 15 seconds ──────
  // This is critical for logout — setOnlineStatus must not block navigation.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  config.signal = controller.signal;

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        // Clear stale auth locally so app can route back to login cleanly.
        try { await TokenStore.remove(); } catch (_) {}
        try { await DriverStore.remove(); } catch (_) {}
        throw new Error('Session expired. Please login again.');
      }
      const errorMsg = data?.message || `HTTP ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection.');
    }
    if (err.message === 'Network request failed') {
      throw new Error('No internet connection. Please check your network.');
    }
    throw err;
  }
}

// ═════════════════════════════════════════════════════════════
// AUTH APIs
// ═════════════════════════════════════════════════════════════

export const AuthAPI = {
  // Send OTP to mobile number
  sendOtp: (mobile) =>
    apiRequest('/api/auth/send-otp', {
      method: 'POST',
      body: { mobile: String(mobile).trim() }
    }),

  // Verify OTP and get token
  verifyOtp: async (mobile, otp) => {
    const cleanMobile = String(mobile).trim();
    const cleanOtp = String(otp).trim();

    const result = await apiRequest('/api/auth/verify-otp', {
      method: 'POST',
      body: { mobile: cleanMobile, otp: cleanOtp },
    });
    if (result.success && result.token) {
      await TokenStore.set(result.token);
      await DriverStore.set(result.driver);
    }
    return result;
  },

  // ── Logout ───────────────────────────────────────────────────────────
  // IMPORTANT: This function NEVER throws.
  // Token is removed first — the user is logged out the moment that
  // completes. All remaining steps are best-effort and non-fatal.
  logout: async () => {
    try { await TokenStore.remove(); } catch (_) {}
    try { await DriverStore.remove(); } catch (_) {}
    // Best-effort full wipe — non-fatal if storage.clear() is not implemented
    try { await storage.clear(); } catch (_) {}
  },

  // Check if logged in
  isLoggedIn: async () => {
    const token = await TokenStore.get();
    return !!token;
  },
};

// ═════════════════════════════════════════════════════════════
// DRIVER APIs
// ═════════════════════════════════════════════════════════════

export const DriverAPI = {
  // Get full profile
  getProfile: () => apiRequest('/api/driver/profile'),

  // Update personal profile fields
  updateProfile: (data) =>
    apiRequest('/api/driver/profile', { method: 'PUT', body: data }),

  // Update bank account details
  updateBankAccount: (data) =>
    apiRequest('/api/driver/bank', { method: 'PUT', body: data }),

  // Update vehicle registration number
  updateVehicle: (data) =>
    apiRequest('/api/driver/vehicle', { method: 'PUT', body: data }),

  // Complete registration (onboarding form)
  register: (data) =>
    apiRequest('/api/driver/register', { method: 'POST', body: data }),

  // Toggle online/offline
  setOnlineStatus: (isOnline) =>
    apiRequest('/api/driver/online-status', { method: 'PUT', body: { isOnline } }),

  // Send GPS ping
  sendGps: (tripId, latitude, longitude, accuracy, speed, heading) =>
    apiRequest('/api/driver/gps', {
      method: 'POST',
      body: { tripId, latitude, longitude, accuracy, speed, heading },
    }),

  // Upload avatar (multipart)
  uploadAvatar: async (imageUri) => {
    const formData = new FormData();
    if (Platform.OS === 'web') {
      const res = await fetch(imageUri);
      const blob = await res.blob();
      formData.append('avatar', blob, 'avatar.jpg');
    } else {
      formData.append('avatar', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      });
    }
    return apiRequest('/api/driver/upload-avatar', { method: 'POST', isMultipart: true, formData });
  },

  // Upload KYC document (multipart)
  uploadDocument: async (imageUris, docType) => {
    const urisArray = Array.isArray(imageUris) ? imageUris : [imageUris];
    const formData = new FormData();
    for (let index = 0; index < urisArray.length; index++) {
      const uri = urisArray[index];
      if (Platform.OS === 'web') {
        const res = await fetch(uri);
        const blob = await res.blob();
        formData.append('file', blob, `${docType}_${index}.jpg`);
      } else {
        formData.append('file', {
          uri: uri,
          type: 'image/jpeg',
          name: `${docType}_${index}.jpg`,
        });
      }
    }
    formData.append('docType', docType);
    return apiRequest('/api/driver/upload-document', { method: 'POST', isMultipart: true, formData });
  },

  // Get notifications
  getNotifications: () => apiRequest('/api/driver/notifications'),

  // Mark all notifications read
  markNotificationsRead: () => apiRequest('/api/driver/notifications/mark-read', { method: 'PUT' }),

  // Update KYC document (re-upload with front and back images)
  updateDocument: async (docType, { front, back }) => {
    const formData = new FormData();

    if (front) {
      if (Platform.OS === 'web') {
        const res = await fetch(front);
        const blob = await res.blob();
        formData.append('frontImage', blob, `${docType}_front.jpg`);
      } else {
        formData.append('frontImage', {
          uri: front,
          type: 'image/jpeg',
          name: `${docType}_front.jpg`,
        });
      }
    }

    if (back) {
      if (Platform.OS === 'web') {
        const res = await fetch(back);
        const blob = await res.blob();
        formData.append('backImage', blob, `${docType}_back.jpg`);
      } else {
        formData.append('backImage', {
          uri: back,
          type: 'image/jpeg',
          name: `${docType}_back.jpg`,
        });
      }
    }

    formData.append('docType', docType);

    return apiRequest(`/api/driver/update-document/${docType}`, {
      method: 'PUT',
      isMultipart: true,
      formData,
    });
  },
};

// ═════════════════════════════════════════════════════════════
// ORDERS APIs
// ═════════════════════════════════════════════════════════════

export const OrdersAPI = {
  // Get available orders
  getAvailable: () => apiRequest('/api/orders/available'),

  // Get active trip
  getActive: () => apiRequest('/api/orders/active'),

  // Accept an order
  accept: (orderId) =>
    apiRequest(`/api/orders/${orderId}/accept`, { method: 'POST' }),

  // Ignore/miss an order
  ignore: (orderId) =>
    apiRequest(`/api/orders/${orderId}/ignore`, { method: 'POST' }),

  // Mark arrived at pickup
  arrivedPickup: (tripId) =>
    apiRequest(`/api/orders/trips/${tripId}/arrived-pickup`, { method: 'POST' }),

  // Confirm pickup with photo (multipart)
  confirmPickup: async (tripId, photoUri) => {
    const formData = new FormData();
    
    if (Platform.OS === 'web') {
      try {
        const response = await fetch(photoUri);
        const blob = await response.blob();
        formData.append('photo', blob, 'pickup_photo.jpg');
      } catch (err) {
        formData.append('photo', photoUri);
      }
    } else {
      formData.append('photo', {
        uri: photoUri,
        type: 'image/jpeg',
        name: 'pickup_photo.jpg',
      });
    }

    return apiRequest(`/api/orders/trips/${tripId}/confirm-pickup`, {
      method: 'POST',
      isMultipart: true,
      formData,
    });
  },

  // Mark arrived at dropoff
  arrivedDropoff: (tripId) =>
    apiRequest(`/api/orders/trips/${tripId}/arrived-dropoff`, { method: 'POST' }),

  // Complete delivery with OTP
  complete: (tripId, otp) =>
    apiRequest(`/api/orders/trips/${tripId}/complete`, { method: 'POST', body: { otp } }),

  // Cancel trip
  cancel: (tripId, reason) =>
    apiRequest(`/api/orders/trips/${tripId}/cancel`, { method: 'POST', body: { reason } }),

  // Get order history
  getHistory: (status = 'Completed', page = 1) =>
    apiRequest(`/api/orders/history?status=${status}&page=${page}`),
};

// ═════════════════════════════════════════════════════════════
// EARNINGS APIs
// ═════════════════════════════════════════════════════════════

export const EarningsAPI = {
  get: (timeframe = 'daily', date = null, startDate = null, endDate = null) => {
    const params = new URLSearchParams({ timeframe });
    if (date) params.set('date', date);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return apiRequest(`/api/earnings?${params.toString()}`);
  },

  getSummary: () => apiRequest('/api/earnings/summary'),
};

// ═════════════════════════════════════════════════════════════
// WALLET APIs
// ═════════════════════════════════════════════════════════════

export const WalletAPI = {
  get: () => apiRequest('/api/wallet'),
  withdraw: (amount, upiId) =>
    apiRequest('/api/wallet/withdraw', { method: 'POST', body: { amount, upiId } }),
  payDues: (amount) =>
    apiRequest('/api/wallet/pay-dues', { method: 'POST', body: { amount } }),
  addMoney: (amount) =>
    apiRequest('/api/wallet/add-money', { method: 'POST', body: { amount } }),
  getOrderStatus: (orderId) =>
    apiRequest(`/api/wallet/orders/${encodeURIComponent(orderId)}/status`),
};

// ═════════════════════════════════════════════════════════════
// MISC APIs
// ═════════════════════════════════════════════════════════════

export const MiscAPI = {
  getLeaderboard: () => apiRequest('/api/leaderboard'),
  getPromos: () => apiRequest('/api/promos'),
  getAchievements: () => apiRequest('/api/achievements'),
  getChatMessages: (tripId) => apiRequest(`/api/trips/${tripId}/chat`),
  sendChatMessage: (tripId, message) =>
    apiRequest(`/api/trips/${tripId}/chat`, { method: 'POST', body: { message } }),
};

export default apiRequest;
