#!/usr/bin/env node

/**
 * ENDPOINT TEST SCRIPT
 * Tests all fixed endpoints to verify 500 errors are resolved
 * 
 * Run: node test-endpoints.js
 * 
 * Prerequisites:
 * - Backend must be running on localhost:5000
 * - A test driver JWT token is needed (or use a real one from the app)
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
const TIMEOUT = 5000;

// Test driver - you'll need to provide a valid JWT token
// Get this from the driver app's localStorage after login, or from your auth endpoint
const TEST_DRIVER_ID = process.env.TEST_DRIVER_ID || '550e8400-e29b-41d4-a716-446655440000';
const TEST_JWT_TOKEN = process.env.TEST_JWT_TOKEN || 'your-jwt-token-here';

const client = axios.create({
  baseURL: API_BASE,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth header if token exists
if (TEST_JWT_TOKEN !== 'your-jwt-token-here') {
  client.defaults.headers.common['Authorization'] = `Bearer ${TEST_JWT_TOKEN}`;
}

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║         DECHTA BACKEND — ENDPOINT TEST SUITE                ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const tests = [
  {
    name: 'GET /earnings/summary — Daily/Weekly/Total Earnings',
    method: 'GET',
    url: '/earnings/summary?timeframe=daily&date=2026-04-02',
    expectedCode: 200,
  },
  {
    name: 'GET /earnings — All Earnings with Timeframe',
    method: 'GET',
    url: '/earnings?timeframe=daily&date=2026-04-02',
    expectedCode: 200,
  },
  {
    name: 'GET /wallet — Wallet Balance & Commission Breakdown',
    method: 'GET',
    url: '/wallet',
    expectedCode: 200,
  },
  {
    name: 'GET /orders/history — Completed Orders',
    method: 'GET',
    url: '/orders/history?status=Completed&page=1&limit=20',
    expectedCode: 200,
  },
];

// Simple color output for terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

async function runTests() {
  let passed = 0;
  let failed = 0;

  console.log(`INFO: Using API Base: ${API_BASE}`);
  console.log(`INFO: Driver ID: ${TEST_DRIVER_ID}`);
  console.log(`INFO: Auth Token: ${TEST_JWT_TOKEN === 'your-jwt-token-here' ? 'NOT SET' : '***'}\n`);

  if (TEST_JWT_TOKEN === 'your-jwt-token-here') {
    console.log(`${colors.yellow}⚠️  WARNING: No JWT token provided. Setting TEST_JWT_TOKEN env var for auth.${colors.reset}\n`);
  }

  for (const test of tests) {
    process.stdout.write(`Testing: ${test.name}... `);

    try {
      let response;

      if (test.method === 'GET') {
        response = await client.get(test.url);
      } else if (test.method === 'POST') {
        response = await client.post(test.url, test.body || {});
      }

      if (response.status === test.expectedCode) {
        console.log(`${colors.green}✓ PASS${colors.reset}`);
        console.log(`  └─ Status: ${response.status}, Data Keys: ${Object.keys(response.data).join(', ')}`);
        passed++;
      } else {
        console.log(`${colors.red}✗ FAIL${colors.reset}`);
        console.log(`  └─ Expected ${test.expectedCode}, got ${response.status}`);
        failed++;
      }
    } catch (error) {
      console.log(`${colors.red}✗ ERROR${colors.reset}`);

      if (error.code === 'ECONNREFUSED') {
        console.log(`  └─ Cannot connect to ${API_BASE}`);
        console.log(`     Make sure backend is running: npm run dev`);
      } else if (error.response?.status === 401) {
        console.log(`  └─ Unauthorized (401) — JWT token invalid or not provided`);
      } else if (error.response?.status === 500) {
        console.log(`  └─ Server Error (500): ${error.response?.data?.message || 'Unknown error'}`);
        if (error.response?.data?.stack) {
          console.log(`     Error Stack: ${error.response.data.stack.split('\n')[0]}`);
        }
      } else {
        console.log(`  └─ ${error.message}`);
      }
      failed++;
    }

    console.log();
  }

  // Summary
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log(`║  Results: ${colors.green}${passed} passed${colors.reset} | ${colors.red}${failed} failed${colors.reset}                              ║`);
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (failed === 0) {
    console.log(`${colors.green}✓ All tests passed! Your API is working correctly.${colors.reset}\n`);
  } else {
    console.log(`${colors.red}✗ Some tests failed. Check the errors above.${colors.reset}\n`);
  }

  process.exit(failed === 0 ? 0 : 1);
}

// Run tests
runTests().catch((error) => {
  console.error('Test suite error:', error);
  process.exit(1);
});
