require('dotenv').config();
const db = require('./src/config/database');

const setupVendorWallet = async () => {
  try {
    console.log('Setting up vendor wallet tables...\n');

    // Create vendor_wallets table
    await db.query(`
      CREATE TABLE IF NOT EXISTS vendor_wallets (
        id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        vendor_id       UUID          NOT NULL UNIQUE REFERENCES vendors(id) ON DELETE CASCADE,
        balance         NUMERIC(12,2) DEFAULT 0,
        last_updated    TIMESTAMPTZ   DEFAULT NOW(),
        created_at      TIMESTAMPTZ   DEFAULT NOW()
      )
    `);
    console.log('✓ vendor_wallets table created');

    await db.query(`CREATE INDEX IF NOT EXISTS idx_vendor_wallet_vendor ON vendor_wallets(vendor_id)`);

    // Create vendor_payment_orders table
    await db.query(`
      CREATE TABLE IF NOT EXISTS vendor_payment_orders (
        id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        vendor_id           UUID          NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
        cashfree_order_id   VARCHAR(120)  NOT NULL UNIQUE,
        amount              NUMERIC(10,2) NOT NULL,
        status              VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
        completed_at        TIMESTAMPTZ,
        created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✓ vendor_payment_orders table created');

    await db.query(`CREATE INDEX IF NOT EXISTS idx_pay_vendor ON vendor_payment_orders(vendor_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_pay_cf_id ON vendor_payment_orders(cashfree_order_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_pay_pending ON vendor_payment_orders(status) WHERE status = 'PENDING'`);

    // Create vendor_withdrawals table
    await db.query(`
      CREATE TABLE IF NOT EXISTS vendor_withdrawals (
        id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        vendor_id       UUID          NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
        amount          NUMERIC(12,2) NOT NULL,
        method          VARCHAR(20)   NOT NULL,
        upi_id          VARCHAR(100),
        account_number  VARCHAR(20),
        ifsc_code       VARCHAR(20),
        account_name    VARCHAR(100),
        status          VARCHAR(30)   DEFAULT 'PENDING',
        reference_id    VARCHAR(50),
        created_at      TIMESTAMPTZ   DEFAULT NOW()
      )
    `);
    console.log('✓ vendor_withdrawals table created');

    await db.query(`CREATE INDEX IF NOT EXISTS idx_withdrawal_vendor ON vendor_withdrawals(vendor_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_withdrawal_status ON vendor_withdrawals(status)`);

    console.log('\n✅ All vendor wallet tables setup successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
};

setupVendorWallet();
