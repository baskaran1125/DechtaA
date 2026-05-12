'use strict';

const jwt = require('jsonwebtoken');
const pool = require('../config/db');

/**
 * Middleware: Authenticate vendor via JWT token
 * Verifies token and attaches vendor info to req.vendor
 */
exports.authenticateVendor = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.userType !== 'vendor') {
      return res.status(403).json({
        success: false,
        message: 'This endpoint is for vendors only'
      });
    }

    // Verify vendor exists in database
    const { rows: vendors } = await pool.query(
      'SELECT * FROM vendor_profiles WHERE id = $1',
      [decoded.vendorId]
    );

    if (vendors.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Attach vendor info to request
    req.vendor = {
      id: decoded.vendorId,
      userId: decoded.userId,
      phone: decoded.phone,
      profile: vendors[0]
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    console.error('❌ authenticateVendor error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};

/**
 * Middleware: Optional vendor authentication
 * Attaches vendor info if token present, otherwise continues
 */
exports.optionalVendorAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.userType === 'vendor') {
      req.vendor = {
        id: decoded.vendorId,
        userId: decoded.userId,
        phone: decoded.phone
      };
    }

    next();
  } catch (error) {
    // Silently continue if token invalid
    next();
  }
};
