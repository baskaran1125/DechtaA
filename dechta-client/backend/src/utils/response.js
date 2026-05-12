'use strict';
const ok  = (res, data, message = 'Success', status = 200) =>
  res.status(status).json({ success: true, message, data });
const err = (res, message = 'Error', status = 400, details = null) =>
  res.status(status).json({ success: false, message, ...(details && { details }) });
module.exports = { ok, err };
