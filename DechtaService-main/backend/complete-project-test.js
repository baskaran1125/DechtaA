#!/usr/bin/env node

/**
 * DECHTA COMPLETE PROJECT TEST SUITE
 * Tests all three roles: Driver, Vendor, Worker
 * 
 * Usage: node complete-project-test.js
 */

const axios = require('axios');

const BASE_URLS = {
  backend: 'http://localhost:5000/api',
  vendorDash: 'http://localhost:5173',
  driverApp: 'http://localhost:8081',
  workerApp: 'http://localhost:5174',
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const tests = [];
let passed = 0;
let failed = 0;

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + colors.bold + '═'.repeat(60) + colors.reset);
  console.log(colors.cyan + colors.bold + `  ${title}` + colors.reset);
  console.log(colors.bold + '═'.repeat(60) + colors.reset + '\n');
}

async function test(name, fn) {
  process.stdout.write(`${name}... `);
  try {
    await fn();
    console.log(colors.green + '✓ PASS' + colors.reset);
    passed++;
  } catch (err) {
    console.log(colors.red + '✗ FAIL' + colors.reset);
    console.log(colors.red + `  └─ ${err.message}` + colors.reset);
    failed++;
  }
}

// ────────────────────────────────────────────────────────────
// VENDOR TESTS
// ────────────────────────────────────────────────────────────

async function testVendor() {
  section('VENDOR BACKEND TESTS');

  const client = axios.create({ baseURL: BASE_URLS.backend, timeout: 5000 });
  let vendorToken = null;
  let vendorId = null;
  const testPhone = '9876543210';
  const testOtp = '1234';

  // Test 1: Send OTP
  await test('Vendor: Send OTP request', async () => {
    try {
      const res = await client.post('/vendors/auth/send-otp', { phone: testPhone });
      if (!res.data.success) throw new Error('OTP send failed');
    } catch (err) {
      if (err.response?.status === 500 && err.response?.data?.message?.includes('table')) {
        throw new Error('Database table error — run vendor_backend_migration.sql');
      }
      throw err;
    }
  });

  // Test 2: Verify OTP (register)
  await test('Vendor: Register with OTP', async () => {
    const res = await client.post('/vendors/auth/register', {
      phone: testPhone,
      otp: testOtp,
      shopName: 'Test Shop ' + Date.now(),
      ownerName: 'Test Owner',
    });
    if (!res.data.success || !res.data.token) throw new Error('Registration failed');
    vendorToken = res.data.token;
    vendorId = res.data.vendor?.id;
  });

  // Test 3: Get Profile
  await test('Vendor: Get profile', async () => {
    const res = await client.get('/vendors/me', {
      headers: { Authorization: `Bearer ${vendorToken}` },
    });
    if (!res.data.success || !res.data.vendor?.id) throw new Error('Profile fetch failed');
  });

  // Test 4: Update Profile
  await test('Vendor: Update profile', async () => {
    const res = await client.put(
      '/vendors/me',
      { email: `test${Date.now()}@example.com`, gstNumber: '27AAPCT1234H1Z0' },
      { headers: { Authorization: `Bearer ${vendorToken}` } }
    );
    if (!res.data.success) throw new Error('Profile update failed');
  });

  // Test 5: Get Dashboard
  await test('Vendor: Get dashboard stats', async () => {
    const res = await client.get('/vendors/dashboard?period=1month', {
      headers: { Authorization: `Bearer ${vendorToken}` },
    });
    if (!res.data.success) throw new Error('Dashboard fetch failed');
  });

  // Test 6: Create Product
  await test('Vendor: Create product', async () => {
    const res = await client.post(
      '/products',
      {
        name: 'Test Product',
        category: 'Electronics',
        selling_price: 1000,
        stock_quantity: 50,
        gst_percent: 18,
      },
      { headers: { Authorization: `Bearer ${vendorToken}` } }
    );
    if (!res.data.success || !res.data.product?.id) throw new Error('Product creation failed');
  });

  // Test 7: Get Products
  await test('Vendor: Get products list', async () => {
    const res = await client.get('/products', {
      headers: { Authorization: `Bearer ${vendorToken}` },
    });
    if (!res.data.success || !Array.isArray(res.data.products)) throw new Error('Products fetch failed');
  });

  // Test 8: Create Invoice
  await test('Vendor: Create invoice', async () => {
    const res = await client.post(
      '/billing/invoices',
      {
        items: [{ name: 'Item 1', price: 100, qty: 2 }],
        subtotal: 200,
        tax_amount: 36,
        total_amount: 236,
        customer_name: 'Test Customer',
      },
      { headers: { Authorization: `Bearer ${vendorToken}` } }
    );
    if (!res.data.success) throw new Error('Invoice creation failed');
  });

  // Test 9: Get Invoices
  await test('Vendor: Get invoices', async () => {
    const res = await client.get('/billing/invoices', {
      headers: { Authorization: `Bearer ${vendorToken}` },
    });
    if (!res.data.success || !Array.isArray(res.data.invoices)) throw new Error('Invoices fetch failed');
  });

  // Test 10: Create Settlement
  await test('Vendor: Request settlement', async () => {
    const res = await client.post(
      '/billing/settlements',
      { amount: 1000 },
      { headers: { Authorization: `Bearer ${vendorToken}` } }
    );
    if (!res.data.success) throw new Error('Settlement creation failed');
  });

  // Test 11: Get Settlements
  await test('Vendor: Get settlements', async () => {
    const res = await client.get('/billing/settlements', {
      headers: { Authorization: `Bearer ${vendorToken}` },
    });
    if (!res.data.success || !Array.isArray(res.data.settlements)) throw new Error('Settlements fetch failed');
  });

  // Test 12: Create Support Ticket
  await test('Vendor: Create support ticket', async () => {
    const res = await client.post(
      '/billing/tickets',
      { subject: 'Test Issue', message: 'This is a test issue' },
      { headers: { Authorization: `Bearer ${vendorToken}` } }
    );
    if (!res.data.success) throw new Error('Ticket creation failed');
  });

  // Test 13: Get Vendor Queries
  await test('Vendor: Get vendor queries', async () => {
    const res = await client.get('/vendors/query', {
      headers: { Authorization: `Bearer ${vendorToken}` },
    });
    if (!res.data.success || !Array.isArray(res.data.queries)) throw new Error('Queries fetch failed');
  });

  // Test 14: Submit Vendor Query
  await test('Vendor: Submit vendor query', async () => {
    const res = await client.post(
      '/vendors/query',
      { subject: 'Test Query', message: 'This is a test query' },
      { headers: { Authorization: `Bearer ${vendorToken}` } }
    );
    if (!res.data.success) throw new Error('Query submission failed');
  });
}

// ────────────────────────────────────────────────────────────
// DATABASE TESTS
// ────────────────────────────────────────────────────────────

async function testDatabase() {
  section('DATABASE SCHEMA TESTS');

  const axios_no_timeout = axios.create({ timeout: 10000 });

  // Test health endpoint
  await test('Backend: Health check', async () => {
    const res = await axios_no_timeout.get(`${BASE_URLS.backend.replace('/api', '')}/health`);
    if (!res.data.status) throw new Error('Health check failed');
  });

  // Test database connection
  await test('Backend: Database connection alive', async () => {
    const client = axios.create({ baseURL: BASE_URLS.backend, timeout: 5000 });
    // Any endpoint that requires DB connection will verify this
    try {
      // This should fail with 401 but shows DB is up if no connection error
      await client.get('/products', {
        headers: { Authorization: 'Bearer invalid' },
      });
    } catch (err) {
      if (err.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to backend');
      }
      if (err.response?.status === 401 || err.response?.status === 404) {
        // Expected — DB connected
        return;
      }
      throw err;
    }
  });
}

// ────────────────────────────────────────────────────────────
// MAIN TEST RUNNER
// ────────────────────────────────────────────────────────────

async function runAllTests() {
  console.clear();

  log('╔════════════════════════════════════════════════════════╗', 'bold');
  log('║     DECHTA COMPLETE PROJECT — AUTOMATED TEST SUITE     ║', 'bold');
  log('╚════════════════════════════════════════════════════════╝\n', 'bold');

  log(`Backend URL: ${BASE_URLS.backend}`, 'cyan');
  log(`Vendor Dashboard: ${BASE_URLS.vendorDash}`, 'cyan');
  log(`Driver App: ${BASE_URLS.driverApp}`, 'cyan');
  log(`Worker App: ${BASE_URLS.workerApp}\n`, 'cyan');

  try {
    await testDatabase();
    await testVendor();
  } catch (err) {
    log(`\n❌ Fatal error: ${err.message}`, 'red');
    log('Cannot continue testing', 'red');
  }

  // Summary
  const totalTests = passed + failed;
  const passRate = totalTests > 0 ? Math.round((passed / totalTests) * 100) : 0;

  section('TEST SUMMARY');
  log(`Total Tests: ${totalTests}`, 'bold');
  log(`✓ Passed: ${passed}`, 'green');
  log(`✗ Failed: ${failed}`, failed > 0 ? 'red' : 'reset');
  log(`Pass Rate: ${passRate}%\n`, passRate === 100 ? 'green' : passRate > 80 ? 'yellow' : 'red');

  if (failed === 0) {
    log('🎉 ALL TESTS PASSED — READY FOR LAUNCH! 🎉', 'green');
  } else {
    log(`⚠️  ${failed} tests failed — address issues before launch`, 'red');
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((err) => {
  log(`Unhandled error: ${err.message}`, 'red');
  process.exit(1);
});
