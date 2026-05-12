'use strict';

require('dotenv').config();
const app  = require('./src/app');
const START_PORT = Number(process.env.PORT || 5001);
const MAX_PORT_ATTEMPTS = 10;

function listenOnPort(port, attempt = 0) {
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Dechta CLIENT backend running on port ${port} [${process.env.NODE_ENV || 'development'}]`);
    console.log(`📡 Health: http://localhost:${port}/api/health`);
    console.log(`📦 Products: http://localhost:${port}/api/products`);
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE' && attempt < MAX_PORT_ATTEMPTS - 1) {
      const nextPort = port + 1;
      console.warn(`⚠️ Port ${port} is already in use, trying ${nextPort}...`);
      listenOnPort(nextPort, attempt + 1);
      return;
    }

    console.error(`❌ Failed to start client backend on port ${port}:`, err);
    process.exit(1);
  });

  return server;
}

listenOnPort(START_PORT);

module.exports = app;
