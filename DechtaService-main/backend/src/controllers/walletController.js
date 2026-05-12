// src/controllers/walletController.js
const db = require('../config/database');

// ──────────────────────────────────────────────────────────────
// GET /api/wallet
// Returns balance, dues, today earnings, commission breakdown,
// and last 30 transactions
// ──────────────────────────────────────────────────────────────
async function getWallet(request, reply) {
  const driverId = request.driver.id;

  try {
    // Single JOIN — wallet + stats + driver commission rate
    const result = await db.query(
      `SELECT
          w.id                          AS wallet_id,
          w.balance,
          w.outstanding_dues,
          w.dues_limit,
          w.today_earnings,
          w.total_trips,
          w.total_commission_deducted,
          w.last_updated,

          -- All-time earnings breakdown from driver_stats
          COALESCE(ds.total_earnings, 0)             AS total_net_earnings,
          COALESCE(ds.total_gross_earnings, 0)       AS total_gross_earnings,
          COALESCE(ds.total_commission_paid, 0)      AS total_commission_paid,

          -- This week's breakdown
          COALESCE(ds.weekly_earnings, 0)            AS weekly_net,
          COALESCE(ds.weekly_gross_earnings, 0)      AS weekly_gross_earnings,
          COALESCE(ds.weekly_commission_paid, 0)     AS weekly_commission_paid,
          COALESCE(ds.weekly_orders_completed, 0)    AS weekly_orders_completed,

          -- Driver's commission rate
          COALESCE(dp.commission_rate, 0.10) * 100 AS commission_rate_pct

       FROM driver_wallets   w
       LEFT JOIN driver_stats    ds ON ds.driver_id = w.driver_id
       LEFT JOIN driver_profiles dp ON dp.id        = w.driver_id
       WHERE w.driver_id = $1`,
      [driverId]
    );

    let row = result.rows[0];

    // Auto-create wallet if missing (new driver)
    if (!row) {
      await db.insert('driver_wallets', { driver_id: driverId });
      const retry = await db.query(
        `SELECT w.*, 0 AS total_net_earnings, 0 AS total_gross_earnings,
                0 AS total_commission_paid, 0 AS weekly_net,
                0 AS weekly_gross_earnings, 0 AS weekly_commission_paid,
                0 AS weekly_orders_completed, 10 AS commission_rate_pct
         FROM driver_wallets w WHERE w.driver_id = $1`,
        [driverId]
      );
      row = retry.rows[0] || {};
    }

    // Fetch last 30 transactions
    const transactions = await db.selectMany(
      'driver_transactions',
      { wallet_id: row.wallet_id },
      { orderBy: 'created_at DESC', limit: 30 }
    );

    return reply.send({
      success: true,
      data: {
        // Core balance
        balance:         parseFloat(row.balance          || 0),
        outstandingDues: parseFloat(row.outstanding_dues || 0),
        duesLimit:       parseFloat(row.dues_limit       || 300),
        todayEarnings:   parseFloat(row.today_earnings   || 0),
        totalTrips:      parseInt(row.total_trips        || 0, 10),
        lastUpdated:     row.last_updated,

        // Commission breakdown — what the wallet screen needs
        commission: {
          ratePct:          parseFloat(row.commission_rate_pct || 10),

          // All-time
          totalGross:       parseFloat(row.total_gross_earnings        || 0),
          totalDeducted:    parseFloat(row.total_commission_deducted   || 0),
          totalNet:         parseFloat(row.total_net_earnings          || 0),

          // This week
          weeklyGross:      parseFloat(row.weekly_gross_earnings       || 0),
          weeklyDeducted:   parseFloat(row.weekly_commission_paid      || 0),
          weeklyNet:        parseFloat(row.weekly_net                  || 0),
          weeklyOrders:     parseInt(row.weekly_orders_completed       || 0, 10),
        },

        transactions: (transactions || []).map((t) => ({
          id:          t.id,
          type:        t.type,
          amount:      parseFloat(t.amount),
          description: t.description || t.type,
          date:        t.created_at,
          balanceAfter: parseFloat(t.balance_after || 0),
        })),
      },
    });
  } catch (error) {
    request.log.error('getWallet error:', error);
    return reply.code(500).send({ success: false, message: 'Failed to fetch wallet' });
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/wallet/withdraw — atomic, race-condition safe
// ──────────────────────────────────────────────────────────────
async function requestWithdrawal(request, reply) {
  const driverId     = request.driver.id;
  const { amount, upiId } = request.body;
  const withdrawAmount = parseFloat(amount);

  if (!withdrawAmount || withdrawAmount < 100) {
    return reply.code(400).send({ success: false, message: 'Minimum withdrawal amount is ₹100' });
  }

  try {
    const wallet = await db.selectOne('driver_wallets', { driver_id: driverId });
    if (!wallet) return reply.code(404).send({ success: false, message: 'Wallet not found' });

    const dues = parseFloat(wallet.outstanding_dues || 0);
    if (dues > parseFloat(wallet.dues_limit || 300)) {
      return reply.code(400).send({
        success: false,
        message: `You have ₹${dues.toFixed(0)} in outstanding dues. Please clear dues before withdrawing.`,
      });
    }

    // ATOMIC deduction — prevents concurrent overdraw
    const result = await db.query(
      `UPDATE driver_wallets
       SET balance      = balance - $1,
           last_updated = NOW()
       WHERE driver_id = $2
         AND balance   >= $1
       RETURNING balance`,
      [withdrawAmount, driverId]
    );

    if (result.rows.length === 0) {
      const fresh = await db.selectOne('driver_wallets', { driver_id: driverId });
      return reply.code(400).send({
        success: false,
        message: `Insufficient balance. Available: ₹${parseFloat(fresh?.balance || 0).toFixed(2)}`,
      });
    }

    const newBalance = parseFloat(result.rows[0].balance);

    await db.insert('driver_transactions', {
      wallet_id:     wallet.id,
      amount:        withdrawAmount,
      type:          'withdrawal',
      description:   `Bank Withdrawal${upiId ? ` via ${upiId}` : ''}`,
      balance_after: newBalance,
    });

    return reply.send({
      success:    true,
      message:    `Withdrawal of ₹${withdrawAmount} initiated. Will be processed within 24 hours.`,
      newBalance,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ success: false, message: 'Failed to process withdrawal' });
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/wallet/pay-dues — atomic
// ──────────────────────────────────────────────────────────────
async function payDues(request, reply) {
  const driverId  = request.driver.id;
  const { amount } = request.body;
  const payAmount  = parseFloat(amount);

  if (!payAmount || payAmount <= 0) {
    return reply.code(400).send({ success: false, message: 'Valid amount required' });
  }

  try {
    const wallet = await db.selectOne('driver_wallets', { driver_id: driverId });
    if (!wallet) return reply.code(404).send({ success: false, message: 'Wallet not found' });

    const dues       = parseFloat(wallet.outstanding_dues || 0);
    const actualPay  = Math.min(payAmount, dues);

    if (actualPay <= 0) {
      return reply.send({ success: true, message: 'No outstanding dues.', remainingDues: 0 });
    }

    const result = await db.query(
      `UPDATE driver_wallets
       SET balance          = balance - $1,
           outstanding_dues = GREATEST(0, outstanding_dues - $1),
           last_updated     = NOW()
       WHERE driver_id = $2
         AND balance   >= $1
       RETURNING balance, outstanding_dues`,
      [actualPay, driverId]
    );

    if (result.rows.length === 0) {
      return reply.code(400).send({
        success: false,
        message: `Insufficient balance. Available: ₹${parseFloat(wallet.balance || 0).toFixed(2)}`,
      });
    }

    const { balance: newBalance, outstanding_dues: remainingDues } = result.rows[0];

    await db.insert('driver_transactions', {
      wallet_id:     wallet.id,
      amount:        actualPay,
      type:          'commission',
      description:   'Commission Dues Payment',
      balance_after: parseFloat(newBalance),
    });

    return reply.send({
      success:       true,
      message:       `₹${actualPay} dues cleared successfully.`,
      newBalance:    parseFloat(newBalance),
      remainingDues: parseFloat(remainingDues),
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ success: false, message: 'Failed to pay dues' });
  }
}
// ──────────────────────────────────────────────────────────────
// POST /api/wallet/add-money
// Generates a payment link and adds money to the wallet
// ──────────────────────────────────────────────────────────────
async function addMoney(request, reply) {
  const driverId = request.driver.id; 
  const { amount } = request.body;
  const addAmt = parseFloat(amount);

  if (!addAmt || addAmt <= 0) {
    return reply.code(400).send({ success: false, message: 'Invalid amount entered.' });
  }

  try {
    // 1. Get the wallet for this driver
    const walletResult = await db.query('SELECT id FROM driver_wallets WHERE driver_id = $1', [driverId]);
    if (walletResult.rows.length === 0) {
      return reply.code(404).send({ success: false, message: 'Wallet not found for this driver.' });
    }
    const wallet = walletResult.rows[0];

    // 2. Add the money to the wallet balance
    const updateResult = await db.query(
      `UPDATE driver_wallets
       SET balance = balance + $1,
           last_updated = NOW()
       WHERE id = $2
       RETURNING balance`,
      [addAmt, wallet.id]
    );
    const newBalance = updateResult.rows[0].balance;

    // 3. Create a Transaction Record in the database
    // "credit" is the exact string your frontend uses for the Green "Earned" icon
    await db.insert('driver_transactions', {
      wallet_id:     wallet.id,
      amount:        addAmt,
      type:          'credit', 
      description:   'Added money via Payment Gateway',
      balance_after: parseFloat(newBalance),
    });

    // 4. Return Success and the Fake Payment Link to trigger the UI!
    return reply.send({
      success: true,
      message: `₹${addAmt} added successfully.`,
      newBalance: parseFloat(newBalance),
      payment_link: "https://razorpay.com/demo-payment-link" // 👈 This forces the frontend to open the browser!
    });

  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ success: false, message: 'Server error while adding money.' });
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/wallet/withdraw
// Deducts money from the wallet and sends to bank
// ──────────────────────────────────────────────────────────────
async function withdrawMoney(request, reply) {
  const driverId = request.driver.id;
  const { amount } = request.body;
  const withdrawAmt = parseFloat(amount);

  if (!withdrawAmt || withdrawAmt <= 0) {
    return reply.code(400).send({ success: false, message: 'Invalid withdrawal amount.' });
  }

  try {
    // 1. Deduct the balance ONLY if they have enough money
    const updateResult = await db.query(
      `UPDATE driver_wallets
       SET balance = balance - $1,
           last_updated = NOW()
       WHERE driver_id = $2
         AND balance >= $1
       RETURNING id, balance`,
      [withdrawAmt, driverId]
    );

    // If no rows returned, it means balance was lower than $1 (amount)
    if (updateResult.rows.length === 0) {
      return reply.code(400).send({ success: false, message: 'Insufficient wallet balance!' });
    }

    const walletId = updateResult.rows[0].id;
    const newBalance = updateResult.rows[0].balance;

    // 2. Create a Transaction Record
    // "withdrawal" is the exact string your frontend uses for the Purple "Send" icon
    await db.insert('driver_transactions', {
      wallet_id:     walletId,
      amount:        withdrawAmt,
      type:          'withdrawal',
      description:   'Transferred to Bank Account',
      balance_after: parseFloat(newBalance),
    });

    return reply.send({
      success: true,
      message: `Withdrawal of ₹${withdrawAmt} successful!`,
      newBalance: parseFloat(newBalance)
    });

  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ success: false, message: 'Server error while withdrawing.' });
  }
}

module.exports = { getWallet, requestWithdrawal, payDues,addMoney,withdrawMoney };
