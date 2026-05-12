'use strict';

const {
  getVehiclePricing,
  getDeliveryCharge,
} = require('../controllers/pricingController');

async function pricingRoutes(fastify) {
  // Public pricing list for checkout vehicle cards.
  fastify.get('/vehicles', {
    handler: getVehiclePricing,
  });

  // Public distance-based delivery charge calculator.
  fastify.get('/delivery', {
    schema: {
      querystring: {
        type: 'object',
        required: ['vehicle_type', 'origin_lat', 'origin_lng', 'dest_lat', 'dest_lng'],
        properties: {
          vehicle_type: { type: 'string', minLength: 1 },
          origin_lat: { type: 'number' },
          origin_lng: { type: 'number' },
          dest_lat: { type: 'number' },
          dest_lng: { type: 'number' },
        },
      },
    },
    attachValidation: true,
    handler: async (request, reply) => {
      if (request.validationError) {
        return reply.code(400).send({
          success: false,
          message: 'vehicle_type, origin_lat, origin_lng, dest_lat, dest_lng are required',
        });
      }
      return getDeliveryCharge(request, reply);
    },
  });
}

module.exports = pricingRoutes;
