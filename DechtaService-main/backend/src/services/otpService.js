// src/services/otpService.js
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

let otpTableReadyPromise = null;

async function ensureOtpTable() {
  if (!otpTableReadyPromise) {
    otpTableReadyPromise = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS otp_records (
          id uuid PRIMARY KEY,
          mobile_number varchar(20) UNIQUE NOT NULL,
          phone varchar(20),
          otp varchar(6) NOT NULL,
          is_verified boolean DEFAULT false,
          attempts integer DEFAULT 0,
          expires_at timestamptz NOT NULL,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        );
      `);

      // If the table already existed with timestamp (without timezone),
      // convert to timestamptz to avoid instant-expiry bugs in non-UTC timezones.
      await db.query(`
        ALTER TABLE otp_records
        ALTER COLUMN expires_at TYPE timestamptz
        USING expires_at AT TIME ZONE 'UTC';
      `).catch(() => {});

      await db.query(`
        ALTER TABLE otp_records
        ALTER COLUMN created_at TYPE timestamptz
        USING created_at AT TIME ZONE 'UTC';
      `).catch(() => {});

      await db.query(`
        ALTER TABLE otp_records
        ALTER COLUMN updated_at TYPE timestamptz
        USING updated_at AT TIME ZONE 'UTC';
      `).catch(() => {});

      await db.query(
        'CREATE INDEX IF NOT EXISTS idx_otp_mobile ON otp_records(mobile_number);'
      ).catch(() => {});

      await db.query(
        'CREATE INDEX IF NOT EXISTS idx_otp_expires_at ON otp_records(expires_at);'
      ).catch(() => {});
    })().catch((error) => {
      otpTableReadyPromise = null;
      throw error;
    });
  }

  return otpTableReadyPromise;
}

// ──────────────────────────────────────────────────────────────
// Generate a 4-digit OTP
// ──────────────────────────────────────────────────────────────
function generateOtp() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// ──────────────────────────────────────────────────────────────
// Send OTP via MSG91 (India SMS — current production option)
// ──────────────────────────────────────────────────────────────
async function sendViaMSG91(mobileNumber, otp) {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  const senderId = process.env.MSG91_SENDER_ID || 'QCLOGX';

  const response = await axios.post(
    'https://api.msg91.com/api/v5/otp',
    {
      template_id: templateId,
      mobile: `91${mobileNumber}`,
      authkey: authKey,
      otp,
    },
    { headers: { 'Content-Type': 'application/json' } }
  );

  return response.data;
}

// ══════════════════════════════════════════════════════════════
// FUTURE TWILIO INTEGRATION START
// ══════════════════════════════════════════════════════════════
//
// STEP 1 — Install Twilio package:
//   npm install twilio
//
// STEP 2 — Add to your .env file:
//   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
//   TWILIO_AUTH_TOKEN=your_auth_token_here
//   TWILIO_PHONE_NUMBER=+1XXXXXXXXXX   (your Twilio number)
//
// STEP 3 — Add to Render environment variables (same keys above)
//
// STEP 4 — Uncomment and use this function:
//
// const twilio = require('twilio');
//
// async function sendViaTwilio(mobileNumber, otp) {
//   const client = twilio(
//     process.env.TWILIO_ACCOUNT_SID,
//     process.env.TWILIO_AUTH_TOKEN
//   );
//   const message = await client.messages.create({
//     body: `Your QC Logistics OTP is: ${otp}. Valid for 5 minutes.`,
//     from: process.env.TWILIO_PHONE_NUMBER,
//     to: `+91${mobileNumber}`,
//   });
//   return message.sid;
// }
//
// STEP 5 — In sendOtp() below, add this case in the provider switch:
//
//   if (provider === 'twilio') {
//     try {
//       const sid = await sendViaTwilio(mobileNumber, otp);
//       return { success: true, provider: 'twilio', messageSid: sid };
//     } catch (err) {
//       console.error('[Twilio Error]', err.message);
//       throw new Error('Failed to send SMS via Twilio. Please try again.');
//     }
//   }
//
// STEP 6 — Update OTP_PROVIDER in .env:
//   OTP_PROVIDER=twilio
//
// ══════════════════════════════════════════════════════════════
// FUTURE TWILIO INTEGRATION END
// ══════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────
// Send OTP — switches between mock / msg91 / twilio based on env
// ──────────────────────────────────────────────────────────────
async function sendOtp(mobileNumber) {
  // STEP 3 — Backend validation: Indian mobile number format
  if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
    throw new Error('Invalid Indian mobile number. Must be 10 digits starting with 6-9.');
  }

  const otp = generateOtp();
  
  // Calculate expiration: add 5 minutes to current time (use epoch milliseconds for reliability)
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '5');
  const expiresAtMs = Date.now() + expiryMinutes * 60 * 1000;
  const expiresAt = new Date(expiresAtMs);
  const expiresAtISO = expiresAt.toISOString();
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[OTP] Creating OTP - Expires: ${expiresAtISO} (${expiresAtMs}ms), Expiry Minutes: ${expiryMinutes}`);
  }

  await ensureOtpTable();

  // Store OTP in DB (upsert on mobile_number)
  try {
    // Try to update existing OTP record
    const existingOtp = await db.selectOne('otp_records', { mobile_number: mobileNumber });
    
    if (existingOtp) {
      const updateResult = await db.update('otp_records', 
        {
          otp,
          is_verified: false,
          attempts: 0,
          expires_at: expiresAtISO,
          updated_at: new Date().toISOString(),
        },
        { mobile_number: mobileNumber }
      );
      if (!updateResult) {
        throw new Error('Failed to update OTP record in database');
      }
    } else {
      // Insert new record if doesn't exist
      const insertResult = await db.insert('otp_records', {
        id: uuidv4(),
        mobile_number: mobileNumber,
        phone: mobileNumber,
        otp,
        is_verified: false,
        attempts: 0,
        expires_at: expiresAtISO,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (!insertResult || !insertResult.id) {
        throw new Error('Failed to insert OTP record in database');
      }
    }
  } catch (dbError) {
    console.error('[OTP DB Error]', dbError);
    throw new Error('Failed to store OTP in database');
  }

  const provider = process.env.OTP_PROVIDER || 'mock';

  // ── MOCK MODE (Demo / Development) ────────────────────────
  if (provider === 'mock') {
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `\n[MOCK OTP] Mobile: ${mobileNumber} | OTP: ${otp} | Expires: ${expiresAt.toLocaleString()}\n`
      );
    }
    // otp_for_testing is returned so frontend can display it on screen in demo mode
    return { success: true, provider: 'mock', otp_for_testing: otp };
  }

  // ── MSG91 (India SMS) ──────────────────────────────────────
  if (provider === 'msg91') {
    try {
      const result = await sendViaMSG91(mobileNumber, otp);
      return { success: true, provider: 'msg91', msgResult: result };
    } catch (err) {
      console.error('[MSG91 Error]', err.message);
      throw new Error('Failed to send SMS. Please try again.');
    }
  }

  // ── TWILIO (uncomment block above and add case here when ready) ──
  // if (provider === 'twilio') { ... }

  throw new Error(`Unknown OTP_PROVIDER: "${provider}". Valid options: mock, msg91`);
}

// ──────────────────────────────────────────────────────────────
// Verify OTP
// ──────────────────────────────────────────────────────────────
async function verifyOtp(mobileNumber, enteredOtp) {
  // Backend validation
  if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
    return { success: false, message: 'Invalid mobile number format.' };
  }
  
  // Ensure OTP is in string format and is numeric
  const otpString = String(enteredOtp).trim();
  if (!/^\d{3,6}$/.test(otpString)) {
    return { success: false, message: 'OTP must be 3-6 digits.' };
  }

  try {
    await ensureOtpTable();

    const isExpired = (record) => {
      const expiresAtTime = new Date(record.expires_at).getTime();
      const nowTime = Date.now();

      if (isNaN(expiresAtTime)) {
        console.error(`[OTP] Invalid expires_at timestamp for mobile: ${mobileNumber}, value: ${record.expires_at}`);
        return { invalid: true, expired: false };
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[OTP] Expiry check - Expires: ${new Date(expiresAtTime).toISOString()} (${expiresAtTime}ms), Now: ${new Date(nowTime).toISOString()} (${nowTime}ms)`);
      }

      return { invalid: false, expired: expiresAtTime < nowTime };
    };

    // Fetch the MOST RECENT unverified OTP for this mobile (not expired)
    const records = await db.selectMany('otp_records', 
      { 
        mobile_number: mobileNumber,
        is_verified: false 
      },
      { orderBy: 'created_at DESC', limit: 1 }
    );

    const record = records && records[0];

    if (!record) {
      // Idempotent verification: allow the same OTP to be reused briefly in the
      // immediate follow-up register step after /verify-otp has already marked it verified.
      const verifiedRecords = await db.selectMany(
        'otp_records',
        {
          mobile_number: mobileNumber,
          is_verified: true,
        },
        { orderBy: 'updated_at DESC', limit: 1 }
      );

      const verifiedRecord = verifiedRecords && verifiedRecords[0];
      if (verifiedRecord) {
        const storedOtp = String(verifiedRecord.otp || '').trim();
        const expiryState = isExpired(verifiedRecord);

        if (expiryState.invalid) {
          return { success: false, message: 'Invalid OTP record. Please request a new one.' };
        }

        if (expiryState.expired) {
          return { success: false, message: 'OTP has expired. Please request a new one.' };
        }

        if (storedOtp === otpString) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[OTP] Reusing already-verified OTP for mobile: ${mobileNumber}`);
          }
          return { success: true, message: 'OTP already verified.' };
        }
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[OTP] No unverified record found for mobile: ${mobileNumber}`);
      }
      return { success: false, message: 'OTP not found. Please request a new one.' };
    }

    const expiryState = isExpired(record);
    if (expiryState.invalid) {
      return { success: false, message: 'Invalid OTP record. Please request a new one.' };
    }

    if (expiryState.expired) {
      if (process.env.NODE_ENV !== 'production') {
        const expiresAtTime = new Date(record.expires_at).getTime();
        const nowTime = Date.now();
        console.log(`[OTP] OTP expired for mobile: ${mobileNumber}, expires_at: ${record.expires_at}, time diff: ${nowTime - expiresAtTime}ms`);
      }
      return { success: false, message: 'OTP has expired. Please request a new one.' };
    }

    // Check attempts (max 3)
    if (record.attempts >= 3) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[OTP] Too many attempts (${record.attempts}) for mobile: ${mobileNumber}`);
      }
      return { success: false, message: 'Too many attempts. Please request a new OTP.' };
    }

    // Increment attempts first — validate record.id exists
    if (!record.id) {
      console.error(`[OTP] Missing record.id for mobile: ${mobileNumber}`);
      return { success: false, message: 'OTP record error. Please request a new one.' };
    }
    
    const updateResult = await db.update('otp_records', 
      { attempts: record.attempts + 1 },
      { id: record.id }
    );
    
    if (!updateResult) {
      console.error(`[OTP] Failed to update attempts for mobile: ${mobileNumber}`);
      return { success: false, message: 'Error updating OTP status. Please try again.' };
    }

    // Verify OTP value — ensure both are strings for comparison
    const storedOtp = String(record.otp).trim();
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[OTP] Verification attempt - Mobile: ${mobileNumber}`);
    }
    
    if (storedOtp !== otpString) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[OTP] Mismatch for mobile: ${mobileNumber}`);
      }
      return { success: false, message: 'Incorrect OTP. Please try again.' };
    }

    // Mark as verified
    const verifyResult = await db.update('otp_records', 
      { is_verified: true },
      { id: record.id }
    );
    
    if (!verifyResult) {
      console.error(`[OTP] Failed to mark OTP as verified for mobile: ${mobileNumber}`);
      return { success: false, message: 'Error verifying OTP. Please try again.' };
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[OTP] Successfully verified for mobile: ${mobileNumber}`);
    }
    return { success: true, message: 'OTP verified successfully.' };
  } catch (err) {
    console.error('[OTP Verification Error]', err);
    return { success: false, message: 'Error verifying OTP. Please try again.' };
  }
}

// ──────────────────────────────────────────────────────────────
// Generate delivery OTP — stored on orders.delivery_otp (orderId is bigint)
// DO NOT update delivery_trips — its id is UUID, orderId is bigint
// ──────────────────────────────────────────────────────────────
async function generateDeliveryOtp(orderId) {
  const otp = generateOtp();

  try {
    const result = await db.update('orders',
      { delivery_otp: otp },
      { id: orderId }   // bigint matching orders.id — NOT delivery_trips UUID
    );
    // db.update() returns array of rows; check if at least one row was updated
    if (!result || result.length === 0) {
      throw new Error(`Order ${orderId} not found`);
    }
    return otp;
  } catch (err) {
    console.error('[Generate Delivery OTP Error]', err);
    throw new Error('Failed to generate delivery OTP');
  }
}

module.exports = { sendOtp, verifyOtp, generateDeliveryOtp };
