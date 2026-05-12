// src/routes/products.js
'use strict';

const {
  getProducts, createProduct, updateProduct,
  toggleProductActive, boostProduct, getGstByCategory,
} = require('../controllers/productsController');
const { authenticateVendor } = require('../middleware/vendorAuth');

async function productRoutes(fastify, options) {
  fastify.addHook('preHandler', authenticateVendor);

  // GST lookup (no auth scope issue — still needs vendor auth)
  fastify.get('/gst/by-category', { handler: getGstByCategory });

  // Products CRUD
  fastify.get('/',           { handler: getProducts });
  fastify.post('/',          { handler: createProduct });
  fastify.put('/:id',        { handler: updateProduct });
  fastify.patch('/:id/toggle', { handler: toggleProductActive });
  fastify.patch('/:id/boost',  { handler: boostProduct });
}

module.exports = productRoutes;
