'use strict';

/**
 * MSG91 Service
 * ─────────────────────────────────────────────────────────────
 * STATUS: DISABLED — All logic is written but commented out.
 *
 * HOW TO ENABLE:
 *   1. Add MSG91_AUTH_KEY, MSG91_TEMPLATE_ID, MSG91_SENDER_ID to .env
 *   2. Uncomment the sendOtp() function body below
 *   3. In otp.service.js, replace the mock block with:
 *        await msg91Service.sendOtp(phone, otp);
 * ─────────────────────────────────────────────────────────────
 */

// const axios = require('axios');

// const MSG91_BASE_URL = 'https://api.msg91.com/api/v5';

// async function sendOtp(phone, otp) {
//   const authKey    = process.env.MSG91_AUTH_KEY;
//   const templateId = process.env.MSG91_TEMPLATE_ID;
//   const senderId   = process.env.MSG91_SENDER_ID || 'DECHTA';
//
//   if (!authKey) throw new Error('MSG91_AUTH_KEY not set in environment');
//
//   const payload = {
//     template_id: templateId,
//     mobile:      `91${phone}`,  // India country code prefix
//     authkey:     authKey,
//     otp:         otp,
//   };
//
//   const response = await axios.post(
//     `${MSG91_BASE_URL}/otp?template_id=${templateId}&mobile=91${phone}&authkey=${authKey}&otp=${otp}`,
//     {},
//     { headers: { 'Content-Type': 'application/json' } }
//   );
//
//   if (response.data.type !== 'success') {
//     throw new Error(`MSG91 error: ${JSON.stringify(response.data)}`);
//   }
//
//   return response.data;
// }

// async function resendOtp(phone, retryType = 'text') {
//   const authKey = process.env.MSG91_AUTH_KEY;
//   const response = await axios.get(
//     `${MSG91_BASE_URL}/otp/retry?authkey=${authKey}&mobile=91${phone}&retrytype=${retryType}`
//   );
//   return response.data;
// }

// module.exports = { sendOtp, resendOtp };

// ── Placeholder export (remove when enabling) ────────────────
module.exports = {
  sendOtp:   async () => { throw new Error('MSG91 is disabled. Use mock OTP.'); },
  resendOtp: async () => { throw new Error('MSG91 is disabled.'); },
};
