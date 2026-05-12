/**
 * demoSupportService.js
 * In-memory demo support chat service.
 * No backend required — all state lives in this module during the session.
 *
 * Flow:
 *  1. Vendor sends message  → stored in session, triggers simulated admin reply after 2s
 *  2. Admin "reply" fires   → calls registered onAdminReply callback
 *  3. SupportModal shows notification banner; vendor clicks → chat opens
 */

const DEMO_ADMIN_REPLIES = [
  'Yes, what help do you need?',
  'Sure! Could you provide more details?',
  'I can help with that. Please share the product name.',
  'Got it! Let me check and get back to you shortly.',
  'Understood. Our team will resolve this within 24 hours.',
  'Thank you for reaching out. Can you share an order ID?',
  'I see the issue. Please allow me 5 minutes to look into this.',
];

let _messages   = [];        // { id, sender:'vendor'|'admin', text, time }
let _listeners  = [];        // callbacks registered by UI components
let _replyTimer = null;

const _now = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

const _notify = () => _listeners.forEach(fn => fn([..._messages]));

/** Register a callback — called whenever messages change */
export const onMessagesChange = (fn) => {
  _listeners.push(fn);
  fn([..._messages]);                            // immediate snapshot
  return () => { _listeners = _listeners.filter(l => l !== fn); };
};

/** Vendor sends a message */
export const vendorSend = (text) => {
  if (!text.trim()) return;
  _messages.push({ id: Date.now(), sender: 'vendor', text: text.trim(), time: _now() });
  _notify();
  _scheduleAdminReply();
};

/** Admin sends a message (demo trigger, can be called from UI) */
export const adminSend = (text) => {
  _messages.push({ id: Date.now() + 1, sender: 'admin', text: text.trim(), time: _now() });
  _notify();
};

/** Clear all messages (for testing/reset) */
export const clearMessages = () => { _messages = []; _notify(); };

/** Simulate admin typing and replying */
const _scheduleAdminReply = () => {
  clearTimeout(_replyTimer);
  _replyTimer = setTimeout(() => {
    const reply = DEMO_ADMIN_REPLIES[Math.floor(Math.random() * DEMO_ADMIN_REPLIES.length)];
    adminSend(reply);
  }, 2000);
};