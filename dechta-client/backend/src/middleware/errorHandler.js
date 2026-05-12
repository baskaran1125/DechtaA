'use strict';

module.exports = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  if (err.name === 'JsonWebTokenError')
    return res.status(401).json({ success: false, message: 'Invalid token' });

  if (err.name === 'TokenExpiredError')
    return res.status(401).json({ success: false, message: 'Token expired. Please login again.' });

  if (err.code === '23505')
    return res.status(409).json({ success: false, message: 'Duplicate entry' });

  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'Internal server error';
  res.status(status).json({ success: false, message });
};
