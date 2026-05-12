/**
 * ticketService.js
 * Demo ticket system — localStorage backed.
 * Handles: ticket creation, daily limit (3/day), ticket ID generation.
 */

const STORAGE_KEY  = 'dechta_tickets';
const MESSAGES_KEY = 'dechta_ticket_messages';
export const DAILY_LIMIT = 3;

// ── Ticket ID counter ─────────────────────────────────────────
const _nextId = () => {
  const stored = parseInt(localStorage.getItem('dechta_tkt_counter') || '1000', 10);
  const next   = stored + 1;
  localStorage.setItem('dechta_tkt_counter', String(next));
  return `TKT-${next}`;
};

// ── Load/save helpers ─────────────────────────────────────────
export const loadTickets = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
};

const saveTickets = (tickets) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));

export const loadMessages = (ticketId) => {
  try {
    const all = JSON.parse(localStorage.getItem(MESSAGES_KEY) || '{}');
    return all[ticketId] || [];
  } catch { return []; }
};

export const saveMessage = (ticketId, msg) => {
  try {
    const all = JSON.parse(localStorage.getItem(MESSAGES_KEY) || '{}');
    if (!all[ticketId]) all[ticketId] = [];
    all[ticketId].push(msg);
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
};

// ── Rolling 24-hour limit check ───────────────────────────────
// Counts tickets raised in the last 24 hours (not calendar day).
// Each user gets exactly 3 tickets per rolling 24-hour window.
export const getTodayCount = () => {
  const tickets = loadTickets();
  const cutoff  = Date.now() - 24 * 60 * 60 * 1000;
  return tickets.filter(t => new Date(t.createdAt).getTime() > cutoff).length;
};

export const isLimitReached = () => getTodayCount() >= DAILY_LIMIT;

// Returns the Date when the oldest ticket in the window expires (i.e. when the
// user can raise the next ticket). Returns null if limit is not reached.
export const getResetTime = () => {
  const tickets = loadTickets();
  const cutoff  = Date.now() - 24 * 60 * 60 * 1000;
  const recent  = tickets.filter(t => new Date(t.createdAt).getTime() > cutoff);
  if (recent.length < DAILY_LIMIT) return null;
  // Oldest recent ticket — its 24h expires first
  const oldest  = recent.reduce((min, t) =>
    new Date(t.createdAt).getTime() < new Date(min.createdAt).getTime() ? t : min
  );
  return new Date(new Date(oldest.createdAt).getTime() + 24 * 60 * 60 * 1000);
};

// ── Create ticket ─────────────────────────────────────────────
export const createTicket = ({ issueType, subject, description }) => {
  if (isLimitReached()) return { error: 'limit' };

  const ticket = {
    id:          _nextId(),
    issueType,
    subject,
    description,
    status:      'open',
    createdAt:   new Date().toISOString(),
  };

  const tickets = loadTickets();
  tickets.unshift(ticket);
  saveTickets(tickets);
  return { ticket };
};

// ── Now() helper ──────────────────────────────────────────────
export const nowTime = () =>
  new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });