// src/routes/wallet.js
'use strict';

const { authenticate } = require('../middleware/auth');
const { getWallet } = require('../controllers/walletController');
const db = require('../config/database');

const CASHFREE_API_VERSION = '2023-08-01';
const FAILURE_STATUSES = new Set([
  'FAILED',
  'CANCELLED',
  'EXPIRED',
  'TERMINATED',
  'REJECTED',
  'DECLINED',
  'VOIDED',
  'USER_DROPPED',
]);

let driverPaymentOrdersTableReady = false;

function paymentHtml({ success, title, message }) {
  const bg = success ? '#F0FDF4' : '#FEF2F2';
  const fg = success ? '#166534' : '#991B1B';
  const icon = success ? '&#9989;' : '&#10060;';

  return `
    <html>
      <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background-color:${bg};color:${fg};margin:0;">
        <div style="background:white;padding:40px;border-radius:20px;box-shadow:0 10px 25px rgba(0,0,0,0.1);text-align:center;max-width:520px;">
          <h1 style="font-size:64px;margin:0;">${icon}</h1>
          <h2 style="margin-top:20px;">${title}</h2>
          <p style="color:#475569;">${message}</p>
        </div>
      </body>
    </html>
  `;
}

function getApiBaseUrl(request) {
  const fromEnv = (process.env.PUBLIC_API_URL || '').trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const protocol = request.protocol || 'http';
  const host = request.headers.host;
  return `${protocol}://${host}`;
}

function getCashfreeBaseUrl() {
  const env = String(process.env.CASHFREE_ENVIRONMENT || 'SANDBOX').toUpperCase();
  return env === 'PRODUCTION' ? 'https://api.cashfree.com' : 'https://sandbox.cashfree.com';
}

function hasCashfreeCredentials() {
  const appId = String(process.env.CASHFREE_APP_ID || '').trim();
  const secretKey = String(process.env.CASHFREE_SECRET_KEY || '').trim();
  if (!appId || !secretKey) return false;
  if (appId.includes('your_') || secretKey.includes('your_')) return false;
  return true;
}

function getCashfreeHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-api-version': CASHFREE_API_VERSION,
    'x-client-id': process.env.CASHFREE_APP_ID,
    'x-client-secret': process.env.CASHFREE_SECRET_KEY,
  };
}

function sanitizeCustomerPhone(rawPhone) {
  const digits = String(rawPhone || '').replace(/\D/g, '');
  const tenDigit = digits.length >= 10 ? digits.slice(-10) : '';
  if (/^[6-9]\d{9}$/.test(tenDigit)) return tenDigit;
  return '9999999999';
}

function isValidOrderId(orderId) {
  return /^(ADD|DUES)_[A-Z0-9_-]+$/i.test(orderId);
}

function normalizeOrderStatus(status) {
  const normalized = String(status || '').toUpperCase();
  if (!normalized) return 'PENDING';
  return normalized;
}

function mapCashfreeOrderStatus(orderStatus) {
  const normalized = String(orderStatus || '').toUpperCase();
  if (normalized === 'PAID') return 'SUCCESS';
  if (FAILURE_STATUSES.has(normalized)) return 'FAILED';
  return 'PENDING';
}

function getOrderPurpose(orderId) {
  return String(orderId || '').startsWith('DUES_') ? 'PAY_DUES' : 'ADD_MONEY';
}

async function ensureDriverPaymentOrdersTable() {
  if (driverPaymentOrdersTableReady) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS driver_payment_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
      cashfree_order_id VARCHAR(120) NOT NULL UNIQUE,
      amount NUMERIC(10,2) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      completed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_pay_driver ON driver_payment_orders(driver_id)`
  );
  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_pay_cf_id ON driver_payment_orders(cashfree_order_id)`
  );
  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_pay_pending ON driver_payment_orders(status) WHERE status = 'PENDING'`
  );

  driverPaymentOrdersTableReady = true;
}

function formatOrderStatusPayload(order, providerStatus) {
  return {
    success: true,
    order_id: order.cashfree_order_id,
    status: normalizeOrderStatus(order.status),
    amount: Number(order.amount || 0),
    purpose: getOrderPurpose(order.cashfree_order_id),
    completed_at: order.completed_at || null,
    provider_status: providerStatus || null,
  };
}

async function fetchOrderByCashfreeId(orderId) {
  await ensureDriverPaymentOrdersTable();
  return db.selectOne('driver_payment_orders', { cashfree_order_id: orderId });
}

async function finalizeSuccessfulOrder(orderId) {
  await ensureDriverPaymentOrdersTable();
  const client = await db.beginTransaction();

  try {
    const orderRes = await client.query(
      'SELECT * FROM driver_payment_orders WHERE cashfree_order_id = $1 FOR UPDATE',
      [orderId]
    );
    const lockedOrder = orderRes.rows[0];
    if (!lockedOrder) throw new Error('Payment order not found during finalization');

    const currentStatus = normalizeOrderStatus(lockedOrder.status);
    if (currentStatus === 'SUCCESS') {
      await client.query('COMMIT');
      client.release();
      return lockedOrder;
    }

    if (currentStatus !== 'PENDING') {
      await client.query('COMMIT');
      client.release();
      return lockedOrder;
    }

    const amountToApply = Number(lockedOrder.amount || 0);
    if (!Number.isFinite(amountToApply) || amountToApply <= 0) {
      throw new Error('Invalid order amount');
    }

    await client.query(
      'UPDATE driver_payment_orders SET status = $1, completed_at = NOW() WHERE id = $2',
      ['SUCCESS', lockedOrder.id]
    );

    await client.query(
      `INSERT INTO driver_wallets (driver_id)
       VALUES ($1)
       ON CONFLICT (driver_id) DO NOTHING`,
      [lockedOrder.driver_id]
    );

    if (String(orderId).startsWith('ADD_')) {
      const updateRes = await client.query(
        `UPDATE driver_wallets
         SET balance = balance + $1, last_updated = NOW()
         WHERE driver_id = $2
         RETURNING *`,
        [amountToApply, lockedOrder.driver_id]
      );
      const wallet = updateRes.rows[0];
      if (!wallet) throw new Error('Wallet not found for add-money transaction');

      await client.query(
        `INSERT INTO driver_transactions (wallet_id, amount, type, description, balance_after)
         VALUES ($1, $2, $3, $4, $5)`,
        [wallet.id, amountToApply, 'credit', 'Added money via Cashfree', wallet.balance]
      );
    } else {
      const updateRes = await client.query(
        `UPDATE driver_wallets
         SET outstanding_dues = GREATEST(0, outstanding_dues - $1), last_updated = NOW()
         WHERE driver_id = $2
         RETURNING *`,
        [amountToApply, lockedOrder.driver_id]
      );
      const wallet = updateRes.rows[0];
      if (!wallet) throw new Error('Wallet not found for dues transaction');

      await client.query(
        `INSERT INTO driver_transactions (wallet_id, amount, type, description, balance_after)
         VALUES ($1, $2, $3, $4, $5)`,
        [wallet.id, amountToApply, 'commission', 'Commission dues cleared via Cashfree', wallet.balance]
      );
    }

    const finalizedRes = await client.query(
      'SELECT * FROM driver_payment_orders WHERE id = $1 LIMIT 1',
      [lockedOrder.id]
    );

    await client.query('COMMIT');
    client.release();
    return finalizedRes.rows[0] || { ...lockedOrder, status: 'SUCCESS' };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    throw error;
  }
}

async function syncOrderWithCashfree(orderId, knownOrder = null) {
  let order = knownOrder || (await fetchOrderByCashfreeId(orderId));
  if (!order) return { order: null, providerStatus: null };

  if (normalizeOrderStatus(order.status) === 'SUCCESS') {
    return { order, providerStatus: null };
  }

  if (!hasCashfreeCredentials()) {
    return { order, providerStatus: null };
  }

  const response = await fetch(`${getCashfreeBaseUrl()}/pg/orders/${encodeURIComponent(orderId)}`, {
    method: 'GET',
    headers: getCashfreeHeaders(),
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.message || `Cashfree order status check failed (${response.status})`);
  }

  const providerStatus = String(data.order_status || '').toUpperCase();
  const mappedStatus = mapCashfreeOrderStatus(providerStatus);

  if (mappedStatus === 'SUCCESS') {
    const finalizedOrder = await finalizeSuccessfulOrder(orderId);
    return { order: finalizedOrder, providerStatus };
  }

  if (mappedStatus === 'FAILED' && normalizeOrderStatus(order.status) === 'PENDING') {
    const updated = await db.update('driver_payment_orders', { status: 'FAILED' }, { id: order.id });
    order = updated?.[0] || { ...order, status: 'FAILED' };
  }

  return { order, providerStatus };
}

async function walletRoutes(fastify) {
  // GET /api/wallet
  fastify.get('/', { preHandler: [authenticate], handler: getWallet });

  // POST /api/wallet/withdraw
  fastify.post('/withdraw', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['amount'],
        properties: {
          amount: { type: 'number', minimum: 1 },
          upiId: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const driverId = request.driver.id;
      const { amount, upiId } = request.body;
      const withdrawAmount = Number(amount);

      if (!Number.isFinite(withdrawAmount) || withdrawAmount <= 0) {
        return reply.code(400).send({ success: false, message: 'Invalid withdrawal amount' });
      }

      const client = await db.beginTransaction();
      let wallet = null;
      let requestId = null;

      try {
        const walletResult = await client.query(
          'SELECT * FROM driver_wallets WHERE driver_id = $1 FOR UPDATE',
          [driverId]
        );
        wallet = walletResult.rows[0];

        if (!wallet || Number(wallet.balance) < withdrawAmount) {
          await client.query('ROLLBACK');
          client.release();
          return reply.code(400).send({ success: false, message: 'Insufficient balance' });
        }

        const dues = Number(wallet.outstanding_dues || 0);
        const duesLimit = Number(wallet.dues_limit || 300);
        if (dues > duesLimit) {
          await client.query('ROLLBACK');
          client.release();
          return reply
            .code(400)
            .send({ success: false, message: 'Please clear your dues before withdrawing.' });
        }

        const newBalance = Number(wallet.balance) - withdrawAmount;
        await client.query(
          'UPDATE driver_wallets SET balance = $1, last_updated = NOW() WHERE id = $2',
          [newBalance, wallet.id]
        );

        await client.query(
          `INSERT INTO driver_transactions (wallet_id, amount, type, description, balance_after)
           VALUES ($1, $2, $3, $4, $5)`,
          [wallet.id, withdrawAmount, 'withdrawal', 'Transferred to Bank Account', newBalance]
        );

        const insertReq = await client.query(
          `INSERT INTO driver_withdrawal_requests (driver_id, wallet_id, amount, upi_id, status)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [driverId, wallet.id, withdrawAmount, upiId || 'Bank', 'processing']
        );
        requestId = insertReq.rows[0]?.id || null;

        await client.query('COMMIT');
        client.release();

        // Best effort payout call; wallet transaction is already committed.
        if (
          process.env.CASHFREE_PAYOUT_CLIENT_ID &&
          process.env.CASHFREE_PAYOUT_SECRET_KEY &&
          !process.env.CASHFREE_PAYOUT_CLIENT_ID.includes('your_')
        ) {
          try {
            const transferId = `WD_${Date.now()}`;
            const authRes = await fetch('https://payout-api.cashfree.com/payout/v1/authorize', {
              method: 'POST',
              headers: {
                'X-Client-Id': process.env.CASHFREE_PAYOUT_CLIENT_ID,
                'X-Client-Secret': process.env.CASHFREE_PAYOUT_SECRET_KEY,
              },
            });

            const authData = await authRes.json();
            if (authData.status === 'SUCCESS') {
              await fetch('https://payout-api.cashfree.com/payout/v1/requestAsyncTransfer', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${authData.data.token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  transferId,
                  transferMode: 'upi',
                  vpa: upiId,
                  amount: withdrawAmount,
                }),
              });
            } else if (requestId) {
              await db.query(
                'UPDATE driver_withdrawal_requests SET status = $1 WHERE id = $2',
                ['pending_manual', requestId]
              );
            }
          } catch (payoutError) {
            request.log.error({ err: payoutError }, 'Cashfree payout call failed');
            if (requestId) {
              await db.query(
                'UPDATE driver_withdrawal_requests SET status = $1 WHERE id = $2',
                ['pending_manual', requestId]
              );
            }
          }
        }

        return reply.send({
          success: true,
          message: `Withdrawal of INR ${withdrawAmount} initiated successfully.`,
          newBalance: Number(wallet.balance) - withdrawAmount,
        });
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
        request.log.error({ err }, 'Withdrawal error');
        return reply.code(500).send({ success: false, message: 'Failed to process withdrawal' });
      }
    },
  });

  const generatePaymentLink = async (request, reply, isDues) => {
    try {
      const amount = Number(request.body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return reply.code(400).send({ success: false, message: 'Invalid amount' });
      }

      if (!hasCashfreeCredentials()) {
        return reply.code(503).send({
          success: false,
          message:
            'Cashfree test credentials are missing. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY and retry.',
        });
      }

      await ensureDriverPaymentOrdersTable();

      const mobileNumber = sanitizeCustomerPhone(
        request.body.mobileNumber || request.driver.mobile_number || request.driver.phone
      );
      const driverId = request.driver.id;
      const orderId = `${isDues ? 'DUES' : 'ADD'}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

      await db.insert('driver_payment_orders', {
        driver_id: driverId,
        cashfree_order_id: orderId,
        amount,
        status: 'PENDING',
      });

      const apiBaseUrl = getApiBaseUrl(request);
      const returnUrl = `${apiBaseUrl}/api/wallet/verify?order_id=${encodeURIComponent(orderId)}`;

      const response = await fetch(`${getCashfreeBaseUrl()}/pg/orders`, {
        method: 'POST',
        headers: getCashfreeHeaders(),
        body: JSON.stringify({
          order_id: orderId,
          order_amount: amount,
          order_currency: 'INR',
          customer_details: {
            customer_id: `CUST_${driverId}`,
            customer_phone: mobileNumber,
            customer_name: 'Driver Partner',
          },
          order_meta: { return_url: returnUrl },
        }),
      });

      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        await db.update('driver_payment_orders', { status: 'FAILED' }, { cashfree_order_id: orderId });
        throw new Error(data.message || 'Failed to create Cashfree order');
      }

      const paymentLink = data.payment_link || data.order_meta?.payment_link || data.order_meta?.payment_url;
      if (!paymentLink) {
        throw new Error('Cashfree order created but payment link was not returned');
      }

      return reply.code(200).send({
        success: true,
        payment_link: paymentLink,
        order_id: orderId,
        status: 'PENDING',
      });
    } catch (err) {
      request.log.error({ err }, 'PG order error');
      return reply.code(500).send({ success: false, message: err.message || 'Payment init failed' });
    }
  };

  // POST /api/wallet/add-money
  fastify.post(
    '/add-money',
    {
      preHandler: [authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['amount'],
          properties: { amount: { type: 'number', minimum: 1 } },
        },
      },
    },
    (req, res) => generatePaymentLink(req, res, false)
  );

  // POST /api/wallet/pay-dues
  fastify.post(
    '/pay-dues',
    {
      preHandler: [authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['amount'],
          properties: { amount: { type: 'number', minimum: 1 } },
        },
      },
    },
    (req, res) => generatePaymentLink(req, res, true)
  );

  // GET /api/wallet/orders/:orderId/status
  fastify.get('/orders/:orderId/status', { preHandler: [authenticate] }, async (request, reply) => {
    const orderId = String(request.params.orderId || '').trim();
    if (!isValidOrderId(orderId)) {
      return reply.code(400).send({ success: false, message: 'Invalid order id' });
    }

    await ensureDriverPaymentOrdersTable();

    const existingOrder = await db.selectOne('driver_payment_orders', {
      cashfree_order_id: orderId,
      driver_id: request.driver.id,
    });

    if (!existingOrder) {
      return reply.code(404).send({ success: false, message: 'Payment order not found' });
    }

    try {
      const shouldSync = normalizeOrderStatus(existingOrder.status) === 'PENDING';
      const { order, providerStatus } = shouldSync
        ? await syncOrderWithCashfree(orderId, existingOrder)
        : { order: existingOrder, providerStatus: null };

      return reply.send(formatOrderStatusPayload(order || existingOrder, providerStatus));
    } catch (err) {
      request.log.error({ err, orderId }, 'Wallet order status sync error');
      return reply.code(500).send({
        success: false,
        message: err.message || 'Unable to check payment status',
      });
    }
  });

  // GET /api/wallet/verify (public callback)
  fastify.get('/verify', async (request, reply) => {
    const orderId = String(request.query.order_id || '').trim();

    if (!isValidOrderId(orderId)) {
      return reply.type('text/html').send(
        paymentHtml({
          success: false,
          title: 'Invalid Payment Reference',
          message: 'The payment reference is invalid. Please retry from the app.',
        })
      );
    }

    try {
      const existingOrder = await fetchOrderByCashfreeId(orderId);
      if (!existingOrder) {
        return reply.type('text/html').send(
          paymentHtml({
            success: false,
            title: 'Payment Not Found',
            message: 'No matching payment request was found.',
          })
        );
      }

      const { order } = await syncOrderWithCashfree(orderId, existingOrder);
      const finalOrder = order || existingOrder;
      const status = normalizeOrderStatus(finalOrder.status);

      if (status === 'SUCCESS') {
        return reply.type('text/html').send(
          paymentHtml({
            success: true,
            title: 'Payment Successful',
            message: 'Your wallet update is complete. You can safely close this screen.',
          })
        );
      }

      if (status === 'FAILED' || status === 'CANCELLED') {
        return reply.type('text/html').send(
          paymentHtml({
            success: false,
            title: 'Payment Failed',
            message: 'Transaction was not completed. Please close this page and retry from the app.',
          })
        );
      }

      return reply.type('text/html').send(
        paymentHtml({
          success: false,
          title: 'Payment Pending',
          message: 'We are still waiting for confirmation. Complete payment and refresh this page.',
        })
      );
    } catch (err) {
      request.log.error({ err }, 'Wallet verify error');
      return reply.type('text/html').send(
        paymentHtml({
          success: false,
          title: 'Verification Error',
          message: 'An error occurred while checking your payment. Please retry from the app.',
        })
      );
    }
  });
}

module.exports = walletRoutes;
