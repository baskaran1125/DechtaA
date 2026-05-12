// src/api/apiClient.js
// ─────────────────────────────────────────────────────────────
// Dechta Client — API helper
// All backend calls go through here.
// In development, use the Vite proxy so requests stay same-origin.
// In production, VITE_API_URL points to the backend host.
// ─────────────────────────────────────────────────────────────

const DEFAULT_API_BASE_URL = 'http://localhost:5002';
const BASE_URL = String(import.meta.env.VITE_API_URL || DEFAULT_API_BASE_URL).trim().replace(/\/+$/, '');
export const CLIENT_TOKEN_KEY = 'dechta_client_token';
const isNgrokHost = /https:\/\/[a-z0-9-]+\.ngrok(-free)?\.dev/i.test(BASE_URL);

function getToken() {
  return localStorage.getItem(CLIENT_TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(isNgrokHost ? { 'ngrok-skip-browser-warning': 'true' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await res.json()
    : { message: await res.text() };

  if (!res.ok) {
    const error = new Error(data.message || `Request failed: ${res.status}`);
    error.status = res.status;
    error.payload = data;
    throw error;
  }

  return data;
}

// ── Auth ─────────────────────────────────────────────────────
export const sendOtp = (phone) =>
  request('/api/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, mobile: phone }),
  });

export const verifyOtp = (phone, otp, name) =>
  request('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, mobile: phone, otp, name }),
  });

export const getProfile = () => request('/api/auth/profile');

export const updateProfile = (updates) =>
  request('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });

// ── Google OAuth ─────────────────────────────────────────────
export const googleAuth = (idToken) =>
  request('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });

export const completeGoogleProfile = (phone, name) =>
  request('/api/auth/google/complete', {
    method: 'PUT',
    body: JSON.stringify({ phone, name }),
  });

// ── Location ─────────────────────────────────────────────────
export const searchLocations = (query, opts = {}) => {
  const params = new URLSearchParams({ q: query });

  if (typeof opts.lat === 'number' && typeof opts.lng === 'number') {
    params.set('lat', String(opts.lat));
    params.set('lng', String(opts.lng));
  }

  return request(`/api/location/search?${params.toString()}`);
};

export const reverseGeocode = (lat, lng) =>
  request(`/api/location/reverse-geocode?lat=${lat}&lng=${lng}`);

export const fetchPlaceDetails = (placeId) =>
  request(`/api/location/place-details?place_id=${encodeURIComponent(placeId)}`);

export const getMapsKey = () =>
  request('/api/location/maps-key');

// ── Products ─────────────────────────────────────────────────
export const fetchProducts = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/products${qs ? `?${qs}` : ''}`);
};

export const fetchProductById = (id) => request(`/api/products/${id}`);

export const fetchNearbyProducts = (lat, lng, radius = 20) =>
  request(`/api/products/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);

export const fetchCategories = () => request('/api/products/categories');

export const fetchSearchResults = (query) =>
  request(`/api/products/search?q=${encodeURIComponent(query)}`);

// ── Vendor Auth ──────────────────────────────────────────
export const vendorSendOtp = (phone) =>
  request('/api/vendors/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });

export const vendorVerifyOtp = (phone, otp) =>
  request('/api/vendors/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, otp }),
  });

export const vendorRegister = (phone, otp, businessName, ownerName, email, category, businessAddress) =>
  request('/api/vendors/auth/register', {
    method: 'POST',
    body: JSON.stringify({ phone, otp, businessName, ownerName, email, category, businessAddress }),
  });

export const vendorGetProfile = () => request('/api/vendors/me');

export const vendorUpdateProfile = (updates) =>
  request('/api/vendors/me', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });

export const vendorGetDashboard = () => request('/api/vendors/dashboard');

// ── Vendors ──────────────────────────────────────────────────
export const fetchActiveVendors = () => request('/api/vendors/active');

export const fetchActiveWorkers = () => request('/api/workers/active');

export const hireWorker = (workerId, jobDetails) =>
  request(`/api/workers/${workerId}/hire`, {
    method: 'POST',
    body: JSON.stringify(jobDetails),
  });

export const getJobStatus = (jobId) =>
  request(`/api/workers/jobs/${jobId}`);

export const fetchManpowerServices = () => request('/api/pricing/manpower-services');

export const fetchVendorProducts = (vendorId) =>
  request(`/api/vendors/${vendorId}/products`);

// ── Orders ───────────────────────────────────────────────────
export const placeOrder = (orderData) =>
  request('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });

export const fetchMyOrders = () => request('/api/orders/my');

// ── Health ───────────────────────────────────────────────────
export const checkHealth = () => request('/api/health');

// ── Products (grouped for homepage) ──────────────────────────
export const fetchGroupedProducts = (limit = 12) =>
  request(`/api/products/grouped?limit=${limit}`);

// ── Pricing ───────────────────────────────────────────────────
export const fetchVehiclePricing = () =>
  request('/api/pricing/vehicles');

export const fetchDeliveryCharge = (vehicleType, originLat, originLng, destLat, destLng) =>
  request(
    `/api/pricing/delivery?vehicle_type=${vehicleType}` +
    `&origin_lat=${originLat}&origin_lng=${originLng}` +
    `&dest_lat=${destLat}&dest_lng=${destLng}`
  );

// ── Addresses ─────────────────────────────────────────────────
export const fetchAddresses = () => request('/api/addresses');

export const saveAddress = (tagOrPayload, address_text, is_default = false) => {
  const body = typeof tagOrPayload === 'object' && tagOrPayload !== null
    ? tagOrPayload
    : { tag: tagOrPayload, address_text, is_default };

  return request('/api/addresses', {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

export const updateAddress = (id, updates) =>
  request(`/api/addresses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });

export const deleteAddress = (id) =>
  request(`/api/addresses/${id}`, { method: 'DELETE' });
