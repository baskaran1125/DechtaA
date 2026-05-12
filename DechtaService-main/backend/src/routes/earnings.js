// src/routes/earnings.js
const { authenticate } = require('../middleware/auth');
const { getEarnings, getEarningsSummary } = require('../controllers/earningsController');

async function earningsRoutes(fastify, options) {
  fastify.addHook('preHandler', authenticate);

  // GET /api/earnings?timeframe=daily|weekly|monthly|yearly&date=2026-03-05
  fastify.get('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          timeframe: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom'] },
          date: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
        },
      },
    },
    handler: getEarnings,
  });

  // GET /api/earnings/summary
  fastify.get('/summary', { handler: getEarningsSummary });
}

module.exports = earningsRoutes;
