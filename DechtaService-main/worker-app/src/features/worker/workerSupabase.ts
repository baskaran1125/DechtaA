// Worker API helper:
// - preferred: VITE_WORKER_API_URL (dedicated worker backend)
// - fallback: VITE_API_URL (legacy shared backend)
// - local dev fallback: Vite proxy (/api)
const WORKER_API_ORIGIN = (
  import.meta.env.VITE_WORKER_API_URL || import.meta.env.VITE_API_URL || ''
).replace(/\/+$/, '');
const API_BASE = WORKER_API_ORIGIN ? `${WORKER_API_ORIGIN}/api/worker` : '/api/worker';

function getWorkerAssetBaseUrl() {
  const runtimeOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  return (WORKER_API_ORIGIN || runtimeOrigin).replace(/\/+$/, '');
}

export function resolveWorkerAssetUrl(value: string) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (raw.startsWith('blob:') || raw.startsWith('data:')) {
    return raw;
  }

  const baseUrl = getWorkerAssetBaseUrl();

  if (raw.startsWith('/uploads/')) {
    return baseUrl ? `${baseUrl}${raw}` : raw;
  }

  if (raw.startsWith('uploads/')) {
    return baseUrl ? `${baseUrl}/${raw}` : `/${raw}`;
  }

  try {
    const parsed = new URL(raw);
    const shouldRewriteHost =
      /your-public-backend-url\.com/i.test(parsed.hostname) ||
      ((parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') &&
        baseUrl &&
        !baseUrl.includes(parsed.hostname));

    if (!shouldRewriteHost || !baseUrl) {
      return raw;
    }

    return `${baseUrl}${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return raw;
  }
}

const isNgrokHost = /(^|\.)ngrok(-free)?\.app$|(^|\.)ngrok(-free)?\.dev$/i.test(
  (() => {
    try {
      return WORKER_API_ORIGIN ? new URL(WORKER_API_ORIGIN).hostname : '';
    } catch {
      return '';
    }
  })()
);

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('dechta_worker_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path: string, options?: RequestInit) {
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...(options?.headers as Record<string, string> || {}),
  };

  if (isNgrokHost) {
    baseHeaders['ngrok-skip-browser-warning'] = 'true';
  }

  const fetchOptions: RequestInit = {
    credentials: 'include',
    ...options,
    headers: baseHeaders,
  };

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, fetchOptions);
  } catch (error) {
    // One immediate retry helps with transient ngrok tunnel resets in browser.
    res = await fetch(`${API_BASE}${path}`, fetchOptions).catch(() => {
      throw error;
    });
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }
  return res.json();
}

// ===== AUTH (OTP — no password) =====
export async function workerSendOtp(mobile: string) {
  return request('/auth/send-otp', { method: 'POST', body: JSON.stringify({ mobile }) });
}

export async function workerVerifyOtp(mobile: string, otp: string) {
  return request('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ mobile, otp }) });
}

export async function workerRegisterProfile(data: {
  mobile: string; otp: string; name: string;
  skillCategory?: string; state?: string; city?: string; area?: string; address?: string;
}) {
  return request('/auth/register', { method: 'POST', body: JSON.stringify(data) });
}

export async function workerLogout() {
  localStorage.removeItem('dechta_worker_token');
  return request('/auth/logout', { method: 'POST' }).catch(() => {}); // best-effort
}


export async function getWorkerProfile() {
  return request('/profile');
}

// ===== PROFILE =====
export async function updateWorkerProfile(data: { name?: string; state?: string; city?: string; area?: string }) {
  return request('/profile', { method: 'PUT', body: JSON.stringify(data) });
}

export async function completeWorkerProfile(data: {
  qualification?: string;
  aadharNumber?: string;
  panNumber?: string;
  state: string;
  city: string;
  area: string;
  address?: string;
  skillCategory: string;
  selectedSkills?: string[];
  bankAccount?: string;
  ifsc?: string;
  bankName?: string;
  branch?: string;
}) {
  return request('/profile/complete', { method: 'POST', body: JSON.stringify(data) });
}

export async function submitProfileDocuments(data: { skills: string[]; idProofType: string }) {
  return request('/profile/documents', { method: 'POST', body: JSON.stringify(data) });
}

export async function uploadWorkerDocuments(documents: {
  qualification?: string;
  aadharNumber?: string;
  panNumber?: string;
  photoFile?: File | null;
  aadharFile?: File | null;
  aadharFrontFile?: File | null;
  aadharBackFile?: File | null;
  panFile?: File | null;
  panFrontFile?: File | null;
  panBackFile?: File | null;
  passbookFile?: File | null;
}) {
  const formData = new FormData();

  if (documents.qualification) formData.append('qualification', documents.qualification);
  if (documents.aadharNumber) formData.append('aadharNumber', documents.aadharNumber);
  if (documents.panNumber) formData.append('panNumber', documents.panNumber);
  
  if (documents.photoFile) formData.append('photoFile', documents.photoFile);
  if (documents.aadharFile) formData.append('aadharFile', documents.aadharFile);
  if (documents.aadharFrontFile) formData.append('aadharFrontFile', documents.aadharFrontFile);
  if (documents.aadharBackFile) formData.append('aadharBackFile', documents.aadharBackFile);
  if (documents.panFile) formData.append('panFile', documents.panFile);
  if (documents.panFrontFile) formData.append('panFrontFile', documents.panFrontFile);
  if (documents.panBackFile) formData.append('panBackFile', documents.panBackFile);
  if (documents.passbookFile) formData.append('passbookFile', documents.passbookFile);

  const headers: Record<string, string> = {
    ...getAuthHeaders(),
  };
  if (isNgrokHost) {
    headers['ngrok-skip-browser-warning'] = 'true';
  }

  const res = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: formData,
  });
  if (!res.ok) throw new Error('Document upload failed');
  return res.json();
}

// ===== BANK DETAILS =====
export async function submitBankDetails(data: { bankName: string; branch: string; accountNumber: string; ifscCode: string }) {
  return request('/bank-details', { method: 'POST', body: JSON.stringify(data) });
}

export async function getBankDetails() {
  return request('/bank-details');
}

// ===== JOBS =====
export async function recordJobCompletion(data: { serviceType: string; amount: number; paymentMethod: string; elapsedSeconds: number }) {
  return request('/jobs', { method: 'POST', body: JSON.stringify(data) });
}

// ===== TRANSACTIONS =====
export async function recordTransaction(data: { amount: number; description: string; transactionType: 'credit' | 'debit' }) {
  return request('/transactions', { method: 'POST', body: JSON.stringify(data) });
}

export async function getTransactions() {
  return request('/transactions');
}

// ===== FILE UPLOAD =====
export async function uploadFile(file: File, bucket: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', bucket);

  const headers: Record<string, string> = {
    ...getAuthHeaders(),
  };
  if (isNgrokHost) {
    headers['ngrok-skip-browser-warning'] = 'true';
  }

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: formData,
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

// ===== NOTIFICATIONS =====
export async function getNotifications() {
  return request('/notifications');
}

export async function getUnreadNotificationCount() {
  return request('/notifications/unread-count');
}

export async function markNotificationRead(id: number) {
  return request(`/notifications/${id}/read`, { method: 'PUT' });
}

export async function markAllNotificationsRead() {
  return request('/notifications/mark-all-read', { method: 'PUT' });
}

export async function acceptJobRequest(notifId: number) {
  return request(`/notifications/${notifId}/accept`, { method: 'PUT' });
}

export async function declineJobRequest(notifId: number) {
  return request(`/notifications/${notifId}/decline`, { method: 'PUT' });
}

// ===== SUPPORT TICKETS =====
export async function createSupportTicket(data: { subject: string; message: string; category?: string; priority?: string }) {
  return request('/support/tickets', { method: 'POST', body: JSON.stringify(data) });
}

export async function getSupportTickets() {
  return request('/support/tickets');
}

export async function getTicketMessages(ticketId: number) {
  return request(`/support/tickets/${ticketId}/messages`);
}

export async function sendTicketMessage(ticketId: number, message: string) {
  return request(`/support/tickets/${ticketId}/messages`, { method: 'POST', body: JSON.stringify({ message }) });
}

// ===== JOB CHAT =====
export async function getJobChatMessages(jobId: number) {
  return request(`/jobs/${jobId}/chat`);
}

export async function sendJobChatMessage(jobId: number, message: string, customerId?: string) {
  return request(`/jobs/${jobId}/chat`, { method: 'POST', body: JSON.stringify({ message, customerId }) });
}

// ===== GPS TRACKING =====
export async function updateLocation(data: { latitude: number; longitude: number; accuracy?: number; speed?: number; heading?: number; isOnJob?: boolean; jobId?: number }) {
  return request('/location', { method: 'POST', body: JSON.stringify(data) });
}

export async function getWorkerLocation() {
  return request('/location');
}

export async function getJobLocationHistory(jobId: number) {
  return request(`/jobs/${jobId}/location-history`);
}

// ===== INCENTIVES =====
export async function getActiveIncentives() {
  return request('/incentives');
}

export async function getIncentiveProgress() {
  return request('/incentives/progress');
}

export async function getSurgePricing(city: string, area: string) {
  return request(`/surge-pricing?city=${encodeURIComponent(city)}&area=${encodeURIComponent(area)}`);
}

export async function getDailyTarget() {
  return request('/daily-target');
}

export async function updateDailyTarget(data: { jobsCompleted?: number; earningsAchieved?: number; hoursWorked?: number }) {
  return request('/daily-target', { method: 'PUT', body: JSON.stringify(data) });
}

// ===== HELP CENTER & FAQ =====
export async function getFaqs(category?: string, language = 'en') {
  const params = new URLSearchParams({ language });
  if (category) params.append('category', category);
  return request(`/faqs?${params}`);
}

export async function getFaqCategories() {
  return request('/faqs/categories');
}

export async function markFaqHelpful(id: number) {
  return request(`/faqs/${id}/helpful`, { method: 'POST' });
}

export async function getHelpArticles(category?: string, language = 'en') {
  const params = new URLSearchParams({ language });
  if (category) params.append('category', category);
  return request(`/help-articles?${params}`);
}

export async function getHelpArticleBySlug(slug: string) {
  return request(`/help-articles/${slug}`);
}

// ===== WITHDRAWALS =====
export async function createWithdrawal(amount: number) {
  return request('/withdrawals', { method: 'POST', body: JSON.stringify({ amount }) });
}

export async function getWithdrawals() {
  return request('/withdrawals');
}

// ===== ONLINE STATUS =====
export async function toggleOnlineStatus(isActive: boolean) {
  return request('/status', { method: 'PUT', body: JSON.stringify({ isActive }) });
}

// ===== WALLET OPERATIONS =====
export async function addMoneyToWallet(amount: number, description: string) {
  return request('/wallet/add-money', { method: 'POST', body: JSON.stringify({ amount, description }) });
}

export async function getWorkerWalletOrderStatus(orderId: string) {
  return request(`/wallet/orders/${encodeURIComponent(orderId)}/status`);
}

export async function updateWalletBalance(gross: number, fees: number, net: number) {
  return request('/wallet/balance', { method: 'PUT', body: JSON.stringify({ gross, fees, net }) });
}

// ===== SETTINGS =====
export async function updateWorkerSettings(settings: { theme?: string; language?: string; isVoiceEnabled?: boolean }) {
  return request('/settings', { method: 'PUT', body: JSON.stringify(settings) });
}

// ===== JOB RATE SETTINGS =====
export async function getJobRateSettings(skillCategory?: string) {
  const params = skillCategory ? `?skillCategory=${encodeURIComponent(skillCategory)}` : '';
  return request(`/job-rate-settings${params}`);
}
