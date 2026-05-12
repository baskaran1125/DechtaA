'use strict';

const router  = require('express').Router();
const ctrl    = require('../controllers/addressController');
const protect = require('../middleware/authMiddleware');

// All address routes require authentication
router.use(protect);

router.get('/',     ctrl.getAddresses);
router.post('/',    ctrl.saveAddress);
router.put('/:id',  ctrl.updateAddress);
router.delete('/:id', ctrl.deleteAddress);

module.exports = router;
