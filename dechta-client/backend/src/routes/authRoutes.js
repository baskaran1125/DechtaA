'use strict';

const router  = require('express').Router();
const ctrl    = require('../controllers/authController');
const protect = require('../middleware/authMiddleware');

// Public
router.post('/send-otp',    ctrl.sendOtp);
router.post('/verify-otp',  ctrl.verifyOtp);
router.post('/google',      ctrl.googleAuth);

// Protected
router.get('/profile',             protect, ctrl.getProfile);
router.put('/profile',             protect, ctrl.updateProfile);
router.put('/google/complete',     protect, ctrl.completeGoogleProfile);

module.exports = router;
