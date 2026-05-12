// src/routes/vendors.js
'use strict';

const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

const {
  ensureVendorCompatibilitySchema,
  vendorSendOtp, vendorVerifyOtp, vendorRegister,
  getVendorProfile, updateVendorProfile,
  getVendorDashboard,
  submitVendorQuery, getVendorQueries,
  getVendorWalletStats, getVendorOrders, updateVendorOrderStatus,
  createCashfreeSession, verifyCashfreePayment,
  createRazorpayOrder, verifyRazorpayPayment,
  withdrawMoney,
} = require('../controllers/vendorController');

const { createOrder } = require('../controllers/ordersController');
const { authenticateVendor } = require('../middleware/vendorAuth');

async function ensureVendorSchemaReady(request, reply) {
  try {
    await ensureVendorCompatibilitySchema();
  } catch (error) {
    // Schema warmup failures (e.g. ownership errors on Cloud SQL) are non-fatal.
    // Log and continue — the tables already exist on the hosted DB.
    request.log.warn({ err: error }, 'Vendor schema warmup warning (non-fatal, continuing)');
  }
}

async function vendorRoutes(fastify, options) {
  ensureVendorCompatibilitySchema().catch((error) => {
    fastify.log.warn({ err: error }, 'Vendor schema warmup skipped during startup');
  });

  fastify.addHook('preHandler', ensureVendorSchemaReady);

  const vendorUploadDir = path.join(process.cwd(), 'uploads', 'vendor-documents');
  fs.mkdirSync(vendorUploadDir, { recursive: true });

  // ── Public auth routes (no auth required) ─────────────────
  fastify.post('/auth/send-otp', {
    schema: {
      body: {
        type: 'object',
        properties: {
          mobile: { type: 'string' },
          phone:  { type: 'string' },
        },
      },
    },
    handler: vendorSendOtp,
  });

  fastify.post('/auth/verify-otp', {
    schema: {
      body: {
        type: 'object',
        properties: {
          mobile: { type: 'string' },
          phone:  { type: 'string' },
          otp:    { type: 'string' },
        },
      },
    },
    handler: vendorVerifyOtp,
  });

  fastify.post('/auth/register', {
    schema: {
      body: {
        type: 'object',
        properties: {
          mobile:    { type: 'string' },
          phone:     { type: 'string' },
          otp:       { type: 'string' },
          shopName:  { type: 'string' },
          ownerName: { type: 'string' },
        },
      },
    },
    handler: vendorRegister,
  });

  // ── Protected vendor routes ────────────────────────────────
  // Register protected routes (directly under /api/vendors)
  await fastify.register(async (protectedFastify) => {
    // Add auth middleware only to this sub-plugin
    protectedFastify.addHook('preHandler', authenticateVendor);

    // Profile
    protectedFastify.get('/me',  { handler: getVendorProfile });
    protectedFastify.put('/me',  { handler: updateVendorProfile });

    // Dashboard stats
    protectedFastify.get('/dashboard', {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['today','1week','1month','3months','6months','1year'] },
          },
        },
      },
      handler: getVendorDashboard,
    });

    // Wallet Stats
    protectedFastify.get('/wallet-stats', {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['all','today','1week','1month','3months','6months','1year'] },
          },
        },
      },
      handler: getVendorWalletStats,
    });

    // Vendor Orders
    protectedFastify.get('/orders', { handler: getVendorOrders });
    protectedFastify.post('/orders', { handler: createOrder });
    protectedFastify.patch('/orders/:orderId/status', { handler: updateVendorOrderStatus });

    // Queries / Support
    protectedFastify.post('/query', { handler: submitVendorQuery });
    protectedFastify.get('/query',  { handler: getVendorQueries });

    protectedFastify.post('/upload-document', async (request, reply) => {
      try {
        const data = await request.file();
        if (!data) {
          return reply.code(400).send({ success: false, message: 'No file provided' });
        }

        const { v4: uuidv4 } = require('uuid');
        const ext = path.extname(data.filename || '') || '.bin';
        const filename = `${uuidv4()}${ext}`;
        const destPath = path.join(vendorUploadDir, filename);

        await pipeline(data.file, fs.createWriteStream(destPath));

        const host = request.headers.host;
        const fallbackBase = `${request.protocol}://${host}`;
        const baseUrl = (process.env.PUBLIC_API_URL || fallbackBase).replace(/\/$/, '');
        const relativePath = `/uploads/vendor-documents/${filename}`;

        return reply.send({
          success: true,
          url: `${baseUrl}${relativePath}`,
          path: relativePath,
        });
      } catch (err) {
        request.log.error(err);
        return reply.code(500).send({ success: false, message: 'Upload failed' });
      }
    });

    // ── Wallet Routes ────────────────────────────────────────
    protectedFastify.post('/wallet/create-cashfree-session', { handler: createCashfreeSession });
    protectedFastify.post('/wallet/verify-cashfree-payment', { handler: verifyCashfreePayment });
    protectedFastify.post('/wallet/create-order', { handler: createRazorpayOrder });
    protectedFastify.post('/wallet/verify-payment', { handler: verifyRazorpayPayment });
    protectedFastify.post('/wallet/withdraw', { handler: withdrawMoney });

    // Direct checkout page with auto-submitting form
    protectedFastify.get('/wallet/cashfree-checkout/:orderId', {
      handler: async (request, reply) => {
        const { orderId } = request.params;
        const vendorId = request.vendor.id;

        try {
          // Fetch the order from our database
          const db = require('../config/database');
          const orderRes = await db.query(
            'SELECT * FROM vendor_payment_orders WHERE cashfree_order_id = $1 AND vendor_id = $2',
            [orderId, vendorId]
          );

          if (!orderRes.rows[0]) {
            return reply.code(404).send({ success: false, message: 'Payment order not found' });
          }

          const order = orderRes.rows[0];

          // Return HTML with auto-submitting form to Cashfree
          const CF_API_URL = process.env.CASHFREE_ENVIRONMENT === 'PRODUCTION'
            ? 'https://api.cashfree.com'
            : 'https://sandbox.cashfree.com';

          const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Processing Payment...</title>
    <style>
      body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
      .loading { color: #666; }
    </style>
  </head>
  <body>
    <div class="loading">
      <h2>Redirecting to Cashfree...</h2>
      <p>Please wait while we process your payment.</p>
    </div>

    <form id="cashfreeForm" method="POST" action="${CF_API_URL}/pg/pay" style="display:none;">
      <input type="hidden" name="order_id" value="${orderId}" />
      <input type="hidden" name="order_amount" value="${order.amount}" />
      <input type="hidden" name="order_currency" value="INR" />
      <input type="hidden" name="customer_details" value='{"customer_id":"VENDOR_${vendorId}","customer_email":"${request.vendor.email}","customer_phone":"${request.vendor.phone}"}' />
      <input type="hidden" name="order_meta" value='{"notify_url":"${process.env.PUBLIC_API_URL || 'http://localhost:5000'}/api/vendors/wallet/cashfree-webhook","return_url":"${process.env.PUBLIC_API_URL || 'http://localhost:5000'}/api/vendors/wallet/success"}' />
      <input type="hidden" name="x-api-version" value="2023-08-01" />
      <input type="hidden" name="x-client-id" value="${process.env.CASHFREE_APP_ID}" />
      <input type="hidden" name="x-client-secret" value="${process.env.CASHFREE_SECRET_KEY}" />
    </form>

    <script>
      document.getElementById('cashfreeForm').submit();
    </script>
  </body>
</html>
          `;

          reply.type('text/html').send(html);
        } catch (error) {
          request.log.error('Cashfree checkout error:', error);
          reply.code(500).send({ success: false, message: 'Checkout failed' });
        }
      }
    });
  });

}

module.exports = vendorRoutes;
