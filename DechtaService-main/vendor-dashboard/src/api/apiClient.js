import axios from 'axios';
import { VENDOR_API_BASE } from './apiBase';
const isNgrokBase = /https:\/\/[a-z0-9-]+\.ngrok(-free)?\.dev/i.test(VENDOR_API_BASE);

// ✅ In production: VITE_VENDOR_API_URL
// ✅ Backward compatibility: VITE_API_URL
// ✅ In local dev: proxy via vite.config.js → /api → vendor backend
const api = axios.create({
  baseURL: VENDOR_API_BASE,
  timeout: 15000,
  headers: isNgrokBase ? { 'ngrok-skip-browser-warning': 'true' } : {},
});

// Attach JWT token to every request
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('dechta_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Global response error handler
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('dechta_token');
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

export const sendOTP = (phone) => {
  const mobile = String(phone || '').trim();
  return api.post('/vendors/auth/send-otp', { phone: mobile, mobile });
};

export const loginAPI = (phone, otp) => {
  const mobile = String(phone || '').trim();
  return api.post('/vendors/auth/verify-otp', { phone: mobile, mobile, otp });
};

export const registerAPI = (data = {}) => {
  const mobile = String(data.phone || data.mobile || '').trim();
  return api.post('/vendors/auth/register', {
    ...data,
    phone: mobile,
    mobile,
    shopName: data.shopName || data.businessName,
    ownerName: data.ownerName,
  });
};

export const uploadVendorDocument = (file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/vendors/upload-document', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getProfile    = ()     => api.get('/vendors/me');
export const updateProfile = (data) => api.put('/vendors/me', data);

export const getProducts   = ()         => api.get('/products');
const mapProductPayload = (data) => ({
  name: data.name,
  description: data.description,
  detailed_description: data.detailedDescription,
  category: data.category,
  selling_price: data.price,
  mrp: data.mrp,
  stock_quantity: data.stock,
  unit: data.unit,
  weight_kg: data.weight,
  images: data.images,
  gst_percent: data.gstPercent,
  brand: data.brand,
  warranty: data.warranty
});

export const createProduct = (data)     => api.post('/products', mapProductPayload(data));
export const updateProduct = (id, data) => api.put(`/products/${id}`, mapProductPayload(data));
export const toggleActive  = (id)       => api.patch(`/products/${id}/toggle`);
export const boostProduct  = (id)       => api.patch(`/products/${id}/boost`);

export const getGSTByCategory = (category) =>
  api.get(`/products/gst/by-category?category=${encodeURIComponent(category)}`);

// ── Vendor → Admin Query ──────────────────────────────────────
export const sendVendorQuery = (data) => api.post('/vendors/query', data);
export const getVendorQueries = ()    => api.get('/vendors/query');

export const getOrders         = ()           => api.get('/vendors/orders');
export const createOrder       = (data)       => api.post('/vendors/orders', data);
export const updateOrderStatus = (id, status) => {
  const key = String(status || '').trim().toLowerCase();
  const payload = ['accept', 'accepted'].includes(key)
    ? { status, v_status: 'accepted' }
    : { status };
  return api.patch(`/vendors/orders/${id}/status`, payload);
};

export const getInvoices    = ()     => api.get('/billing/invoices');
export const getInvoiceById = (id)   => api.get(`/billing/invoices/${id}`);
export const createInvoice  = (data) => api.post('/billing/invoices', data);
export const deleteInvoice  = (id)   => api.delete(`/billing/invoices/${id}`);

export const getSettlements   = ()       => api.get('/billing/settlements');
export const createSettlement = (amount) => api.post('/billing/settlements', { amount });
export const getSettlementStatus = (settlementId) => api.get(`/billing/settlements/${settlementId}/status`);

export const createTicket = (data) => api.post('/billing/tickets', data);

// Wallet & Payment APIs
export const createCashfreeSession = (amount, email, phone) =>
  api.post('/vendors/wallet/create-cashfree-session', { amount, email, phone });

export const verifyCashfreePayment = (paymentSessionId, paymentId) =>
  api.post('/vendors/wallet/verify-cashfree-payment', { paymentSessionId, paymentId });

export const createRazorpayOrder = (amount) =>
  api.post('/vendors/wallet/create-order', { amount });

export const verifyRazorpayPayment = (orderData) =>
  api.post('/vendors/wallet/verify-payment', orderData);

export const withdrawalRequest = (withdrawalData) =>
  api.post('/vendors/wallet/withdraw', withdrawalData);

export default api;
