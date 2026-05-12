// src/routes/billing.js
'use strict';

const {
  getInvoices, getInvoiceById, createInvoice, deleteInvoice,
  getSettlements, createSettlement, getSettlementStatus, verifySettlementPayment,
  createTicket,
} = require('../controllers/billingController');
const { authenticateVendor } = require('../middleware/vendorAuth');

async function billingRoutes(fastify, options) {
  // Public callback used by Cashfree return_url
  fastify.get('/settlements/verify', { handler: verifySettlementPayment });

  fastify.addHook('preHandler', authenticateVendor);

  // Invoices
  fastify.get('/invoices',      { handler: getInvoices });
  fastify.get('/invoices/:id',  { handler: getInvoiceById });
  fastify.post('/invoices',     { handler: createInvoice });
  fastify.delete('/invoices/:id', { handler: deleteInvoice });

  // Settlements
  fastify.get('/settlements', { handler: getSettlements });
  fastify.post('/settlements', { handler: createSettlement });
  fastify.get('/settlements/:id/status', { handler: getSettlementStatus });

  // Support Tickets
  fastify.post('/tickets', { handler: createTicket });
}

module.exports = billingRoutes;
