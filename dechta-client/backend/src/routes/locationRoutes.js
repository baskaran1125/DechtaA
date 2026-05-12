'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/locationController');

router.get('/search',          ctrl.searchLocation);
router.get('/reverse-geocode', ctrl.reverseGeocode);
router.get('/place-details',   ctrl.placeDetails);
router.get('/maps-key',        ctrl.getMapsKey);

module.exports = router;
