'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/pricingController');

// GET /api/pricing/delivery?vehicle_type=bike&origin_lat=...&origin_lng=...&dest_lat=...&dest_lng=...
router.get('/delivery', ctrl.getDeliveryCharge);

// GET /api/pricing/vehicles  — list all active vehicle types
router.get('/vehicles', ctrl.getVehiclePricing);

// GET /api/pricing/manpower-services  — list admin-approved service categories
router.get('/manpower-services', ctrl.getManpowerServices);

module.exports = router;
