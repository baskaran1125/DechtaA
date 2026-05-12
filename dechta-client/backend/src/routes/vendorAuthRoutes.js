'use strict';

const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { authenticateVendor } = require('../middleware/vendorAuth');

// ── Public Routes (No Authentication) ─────────────────────────

/**
 * POST /api/vendors/auth/send-otp
 * Send OTP to vendor phone
 */
router.post('/auth/send-otp', vendorController.sendOtp);

/**
 * POST /api/vendors/auth/verify-otp
 * Verify OTP and get JWT token (or indicate new vendor)
 */
router.post('/auth/verify-otp', vendorController.verifyOtp);

/**
 * POST /api/vendors/auth/register
 * Register new vendor account
 */
router.post('/auth/register', vendorController.register);

// ── Protected Routes (Authentication Required) ────────────────

/**
 * GET /api/vendors/me
 * Get current vendor profile
 */
router.get('/me', authenticateVendor, vendorController.getProfile);

/**
 * PUT /api/vendors/me
 * Update current vendor profile
 */
router.put('/me', authenticateVendor, vendorController.updateProfile);

/**
 * GET /api/vendors/dashboard
 * Get vendor dashboard stats
 */
router.get('/dashboard', authenticateVendor, vendorController.getDashboard);

module.exports = router;
