// src/routes/orders.js
const { authenticate, requireApproved } = require('../middleware/auth');
const {
  getAvailableOrders,
  getActiveTrip,
  acceptOrder,
  ignoreOrder,
  arrivedAtPickup,
  confirmPickup,
  arrivedAtDropoff,
  completeDelivery,
  cancelTrip,
  getOrderHistory,
  debugVehicleMatch,
} = require('../controllers/ordersController');

async function orderRoutes(fastify) {
  fastify.addHook('preHandler', authenticate);

  // GET /api/orders/available
  fastify.get('/available', {
    preHandler: [requireApproved],
    handler: getAvailableOrders,
  });

  // GET /api/orders/debug/vehicle-match - Diagnostic endpoint
  fastify.get('/debug/vehicle-match', {
    preHandler: [requireApproved],
    handler: debugVehicleMatch,
  });

  // GET /api/orders/history
  fastify.get('/history', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['Completed', 'Cancelled', 'Missed'] },
          page: { type: 'integer', minimum: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 50 },
        },
      },
    },
    handler: getOrderHistory,
  });

  // GET /api/orders/active
  fastify.get('/active', { handler: getActiveTrip });

  // POST /api/orders/:orderId/accept
  fastify.post('/:orderId/accept', {
    preHandler: [requireApproved],
    handler: acceptOrder,
  });

  // POST /api/orders/:orderId/ignore
  fastify.post('/:orderId/ignore', { handler: ignoreOrder });

  // Trip lifecycle
  fastify.post('/trips/:tripId/arrived-pickup', { handler: arrivedAtPickup });
  fastify.post('/trips/:tripId/confirm-pickup', { handler: confirmPickup });
  fastify.post('/trips/:tripId/arrived-dropoff', { handler: arrivedAtDropoff });

  fastify.post('/trips/:tripId/complete', {
    schema: {
      body: {
        type: 'object',
        required: ['otp'],
        properties: { otp: { type: 'string', minLength: 4, maxLength: 4 } },
      },
    },
    attachValidation: true,
    handler: completeDelivery,
  });

  fastify.post('/trips/:tripId/cancel', {
    preHandler: [requireApproved],
    schema: {
      body: {
        type: 'object',
        required: ['reason'],
        properties: { reason: { type: 'string', minLength: 3 } },
      },
    },
    attachValidation: true,
    handler: cancelTrip,
  });
}

module.exports = orderRoutes;
