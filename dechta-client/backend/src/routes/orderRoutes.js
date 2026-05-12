'use strict';

const router  = require('express').Router();
const ctrl    = require('../controllers/orderController');
const protect = require('../middleware/authMiddleware');

router.post('/',      protect, ctrl.createOrder);
router.get('/my',     protect, ctrl.getMyOrders);
router.get('/:id',    protect, ctrl.getOrderById);

module.exports = router;
