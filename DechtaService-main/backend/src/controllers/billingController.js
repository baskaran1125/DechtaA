// src/controllers/billingController.js
'use strict';

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

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

function getApiBaseUrl(request) {
  const fromEnv = String(process.env.PUBLIC_API_URL || '').trim();
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
  const secret = String(process.env.CASHFREE_SECRET_KEY || '').trim();
  if (!appId || !secret) return false;
  if (appId.includes('your_') || secret.includes('your_')) return false;
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

function mapCashfreeOrderStatus(orderStatus) {
  const normalized = String(orderStatus || '').toUpperCase();
  if (normalized === 'PAID') return 'completed';
  if (FAILURE_STATUSES.has(normalized)) return 'failed';
  return 'pending';
}

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

async function syncSettlementWithCashfree(settlement) {
  if (!settlement) return null;
  const currentStatus = String(settlement.status || '').toLowerCase();

  if (currentStatus === 'completed' || currentStatus === 'failed') {
    return { settlement, providerStatus: null };
  }

  if (!settlement.transaction_id || !hasCashfreeCredentials()) {
    return { settlement, providerStatus: null };
  }

  const response = await fetch(
    `${getCashfreeBaseUrl()}/pg/orders/${encodeURIComponent(settlement.transaction_id)}`,
    { method: 'GET', headers: getCashfreeHeaders() }
  );

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.message || `Cashfree settlement status check failed (${response.status})`);
  }

  const providerStatus = String(data.order_status || '').toUpperCase();
  const mappedStatus = mapCashfreeOrderStatus(providerStatus);

  if (mappedStatus === 'completed' && currentStatus !== 'completed') {
    const updated = await db.query(
      `UPDATE settlements
       SET status = 'completed', settled_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [settlement.id]
    );
    return { settlement: updated.rows[0] || { ...settlement, status: 'completed' }, providerStatus };
  }

  if (mappedStatus === 'failed' && currentStatus !== 'failed') {
    const updated = await db.query(
      `UPDATE settlements
       SET status = 'failed'
       WHERE id = $1
       RETURNING *`,
      [settlement.id]
    );
    return { settlement: updated.rows[0] || { ...settlement, status: 'failed' }, providerStatus };
  }

  return { settlement, providerStatus };
}

// INVOICES
async function getInvoices(request, reply) {
  try {
    const result = await db.query(
      `SELECT * FROM invoices WHERE vendor_id = $1 ORDER BY created_at DESC`,
      [request.vendor.id]
    );
    return reply.send({ success: true, invoices: result.rows });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: err.message });
  }
}

async function getInvoiceById(request, reply) {
  const { id } = request.params;
  try {
    const result = await db.query(
      `SELECT * FROM invoices WHERE id = $1 AND vendor_id = $2 LIMIT 1`,
      [id, request.vendor.id]
    );
    if (!result.rows[0]) return reply.code(404).send({ success: false, message: 'Invoice not found' });
    return reply.send({ success: true, invoice: result.rows[0] });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: err.message });
  }
}

async function createInvoice(request, reply) {
  const {
    orderId,
    items,
    subtotal,
    tax_amount,
    total_amount,
    tax_rate,
    customer_name,
    customer_phone,
    customer_gst,
    customer_address,
  } = request.body;

  if (!items || !total_amount) {
    return reply.code(400).send({ success: false, message: 'items and total_amount are required' });
  }

  const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

  try {
    const result = await db.query(
      `INSERT INTO invoices
         (vendor_id, order_id, invoice_number, items, subtotal, tax_amount,
          total_amount, tax_rate, customer_name, customer_phone, customer_gst, customer_address, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'Generated',NOW())
       RETURNING *`,
      [
        request.vendor.id,
        orderId || null,
        invoiceNumber,
        items ? JSON.stringify(items) : JSON.stringify([]),
        parseFloat(subtotal || 0),
        parseFloat(tax_amount || 0),
        parseFloat(total_amount),
        tax_rate || 18,
        customer_name || null,
        customer_phone || null,
        customer_gst || null,
        customer_address || null,
      ]
    );
    return reply.code(201).send({ success: true, invoice: result.rows[0] });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: err.message });
  }
}

async function deleteInvoice(request, reply) {
  const { id } = request.params;
  try {
    const result = await db.query(
      `DELETE FROM invoices WHERE id = $1 AND vendor_id = $2 RETURNING id`,
      [id, request.vendor.id]
    );
    if (!result.rows[0]) return reply.code(404).send({ success: false, message: 'Invoice not found' });
    return reply.send({ success: true, message: 'Invoice deleted' });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: err.message });
  }
}

// SETTLEMENTS
async function getSettlements(request, reply) {
  try {
    const result = await db.query(
      `SELECT * FROM settlements WHERE vendor_id = $1 ORDER BY created_at DESC`,
      [request.vendor.id]
    );
    return reply.send({ success: true, settlements: result.rows });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: err.message });
  }
}

async function createSettlement(request, reply) {
  const amount = Number(request.body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return reply.code(400).send({ success: false, message: 'Valid amount is required' });
  }

  if (!hasCashfreeCredentials()) {
    return reply.code(503).send({
      success: false,
      message:
        'Cashfree test credentials are missing. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY and retry.',
    });
  }

  const settlementId = uuidv4();
  const orderId = `VND_SET_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  try {
    const insertRes = await db.query(
      `INSERT INTO settlements (id, vendor_id, amount, status, transaction_id, created_at)
       VALUES ($1, $2, $3, 'pending', $4, NOW())
       RETURNING *`,
      [settlementId, request.vendor.id, amount, orderId]
    );
    const settlement = insertRes.rows[0];

    const returnUrl = `${getApiBaseUrl(request)}/api/billing/settlements/verify?order_id=${encodeURIComponent(orderId)}`;

    const customerPhone =
      request.vendor.phone || request.vendor.owner_phone || request.vendor.mobile || '9999999999';
    const customerName = request.vendor.owner_name || request.vendor.shop_name || 'Vendor Partner';

    const cashfreeRes = await fetch(`${getCashfreeBaseUrl()}/pg/orders`, {
      method: 'POST',
      headers: getCashfreeHeaders(),
      body: JSON.stringify({
        order_id: orderId,
        order_amount: amount,
        order_currency: 'INR',
        customer_details: {
          customer_id: `VENDOR_${request.vendor.id}`,
          customer_phone: customerPhone,
          customer_name: customerName,
        },
        order_meta: { return_url: returnUrl },
      }),
    });

    let cashfreeData = {};
    try {
      cashfreeData = await cashfreeRes.json();
    } catch {
      cashfreeData = {};
    }

    if (!cashfreeRes.ok) {
      await db.query(`UPDATE settlements SET status = 'failed' WHERE id = $1`, [settlementId]);
      throw new Error(cashfreeData.message || 'Failed to create Cashfree settlement order');
    }

    const paymentLink =
      cashfreeData.payment_link ||
      cashfreeData.order_meta?.payment_link ||
      cashfreeData.order_meta?.payment_url;

    if (!paymentLink) {
      throw new Error('Cashfree order created but payment link was not returned');
    }

    return reply.code(201).send({
      success: true,
      settlement,
      order_id: orderId,
      payment_link: paymentLink,
      status: 'pending',
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: err.message });
  }
}

async function getSettlementStatus(request, reply) {
  const settlementId = String(request.params.id || '').trim();
  if (!settlementId) {
    return reply.code(400).send({ success: false, message: 'Settlement id is required' });
  }

  try {
    const result = await db.query(
      `SELECT * FROM settlements WHERE id = $1 AND vendor_id = $2 LIMIT 1`,
      [settlementId, request.vendor.id]
    );

    const settlement = result.rows[0];
    if (!settlement) {
      return reply.code(404).send({ success: false, message: 'Settlement not found' });
    }

    const { settlement: synced, providerStatus } = await syncSettlementWithCashfree(settlement);

    return reply.send({
      success: true,
      settlement: synced,
      status: String(synced.status || 'pending').toLowerCase(),
      provider_status: providerStatus || null,
      order_id: synced.transaction_id || null,
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: err.message });
  }
}

async function verifySettlementPayment(request, reply) {
  const orderId = String(request.query.order_id || '').trim();

  if (!/^VND_SET_[A-Z0-9_-]+$/i.test(orderId)) {
    return reply.type('text/html').send(
      paymentHtml({
        success: false,
        title: 'Invalid Payment Reference',
        message: 'The settlement reference is invalid. Please retry from the vendor dashboard.',
      })
    );
  }

  try {
    const result = await db.query(
      `SELECT * FROM settlements WHERE transaction_id = $1 LIMIT 1`,
      [orderId]
    );
    const settlement = result.rows[0];

    if (!settlement) {
      return reply.type('text/html').send(
        paymentHtml({
          success: false,
          title: 'Settlement Not Found',
          message: 'No matching settlement request was found.',
        })
      );
    }

    const { settlement: synced } = await syncSettlementWithCashfree(settlement);
    const status = String(synced.status || 'pending').toLowerCase();

    if (status === 'completed') {
      return reply.type('text/html').send(
        paymentHtml({
          success: true,
          title: 'Payment Successful',
          message: 'Settlement payment is complete. You can return to the vendor dashboard.',
        })
      );
    }

    if (status === 'failed') {
      return reply.type('text/html').send(
        paymentHtml({
          success: false,
          title: 'Payment Failed',
          message: 'Settlement payment was not completed. Please try again from the vendor dashboard.',
        })
      );
    }

    return reply.type('text/html').send(
      paymentHtml({
        success: false,
        title: 'Payment Pending',
        message: 'Payment confirmation is still pending. Complete payment and refresh this page.',
      })
    );
  } catch (err) {
    request.log.error(err);
    return reply.type('text/html').send(
      paymentHtml({
        success: false,
        title: 'Verification Error',
        message: 'An error occurred while checking settlement payment status.',
      })
    );
  }
}

// SUPPORT TICKETS
async function createTicket(request, reply) {
  const { subject, message } = request.body;
  if (!subject || !message) {
    return reply.code(400).send({ success: false, message: 'subject and message are required' });
  }

  try {
    const result = await db.query(
      `INSERT INTO tickets
         (vendor_id, subject, message, status, created_at)
       VALUES ($1,$2,$3,'Open',NOW())
       RETURNING *`,
      [request.vendor.id, subject, message]
    );
    return reply.code(201).send({ success: true, ticket: result.rows[0] });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: err.message });
  }
}

module.exports = {
  getInvoices,
  getInvoiceById,
  createInvoice,
  deleteInvoice,
  getSettlements,
  createSettlement,
  getSettlementStatus,
  verifySettlementPayment,
  createTicket,
};
