'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/productController');

// NOTE: /nearby must come BEFORE /:id — Express matches in order
router.get('/categories',          ctrl.getCategories);
router.get('/grouped',             ctrl.getGroupedProducts);
router.get('/search',              ctrl.getSearchResults);
router.get('/nearby',              ctrl.getNearbyProducts);
router.get('/',                    ctrl.getProducts);
router.get('/:id',                 ctrl.getProductById);

module.exports = router;
