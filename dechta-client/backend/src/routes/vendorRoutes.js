'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/productController');

router.get('/active',              ctrl.getActiveVendors);
router.get('/:vendorId/products',  ctrl.getVendorProducts);

module.exports = router;
