// src/routes/misc.js
const { authenticate } = require('../middleware/auth');
const {
  getLeaderboard, getPromoSlides,
  getChatMessages, sendChatMessage,
  getAchievements,
} = require('../controllers/leaderboardController');

async function miscRoutes(fastify, options) {
  fastify.addHook('preHandler', authenticate);

  // GET /api/leaderboard
  fastify.get('/leaderboard', { handler: getLeaderboard });

  // GET /api/promos
  fastify.get('/promos', { handler: getPromoSlides });

  // GET /api/achievements
  fastify.get('/achievements', { handler: getAchievements });

  // GET /api/trips/:tripId/chat
  fastify.get('/trips/:tripId/chat', { handler: getChatMessages });

  // POST /api/trips/:tripId/chat
  fastify.post('/trips/:tripId/chat', {
    schema: {
      body: {
        type: 'object',
        required: ['message'],
        properties: { message: { type: 'string', minLength: 1, maxLength: 1000 } },
      },
    },
    handler: sendChatMessage,
  });
}

module.exports = miscRoutes;
