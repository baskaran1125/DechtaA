// src/controllers/earningsController.js
const db = require('../config/database');

async function tableExists(tableName) {
  const result = await db.query('SELECT to_regclass($1) AS table_name', [`public.${tableName}`]);
  return !!result.rows[0]?.table_name;
}

function isSchemaDriftError(error) {
  const msg = String(error?.message || '').toLowerCase();
  return msg.includes('relation') && msg.includes('does not exist')
    || msg.includes('column') && msg.includes('does not exist');
}

function emptyEarningsSummary() {
  return {
    commissionRatePct: 10,
    today: {
      gross: 0,
      commission: 0,
      net: 0,
      orders: 0,
      active_minutes: 0,
    },
    weekly: {
      gross: 0,
      commission: 0,
      net: 0,
      earnings: 0,
      orders: 0,
      accepted: 0,
      completed: 0,
      login_minutes: 0,
      login_hours: 0,
      completion_score: 0,
    },
    total: {
      gross: 0,
      commission: 0,
      net: 0,
      earnings: 0,
      orders: 0,
    },
    is_pilot_this_week: false,
    rating: 5,
  };
}

// ──────────────────────────────────────────────────────────────
// GET /api/earnings
// Returns trips with gross, commission, and net breakdown
// ──────────────────────────────────────────────────────────────
async function getEarnings(request, reply) {
  const driverId = request.driver.id;
  const { timeframe = 'daily', date, startDate, endDate } = request.query;

  let rangeStart, rangeEnd;
  const now = new Date();

  const parseLocalDate = (s) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  if (timeframe === 'daily') {
    const d = date ? parseLocalDate(date) : now;
    rangeStart = new Date(d); rangeStart.setHours(0,0,0,0);
    rangeEnd   = new Date(d); rangeEnd.setHours(23,59,59,999);
  } else if (timeframe === 'weekly') {
    const d = date ? parseLocalDate(date) : now;
    const dow = d.getDay();
    rangeStart = new Date(d);
    rangeStart.setDate(d.getDate() - dow + (dow === 0 ? -6 : 1));
    rangeStart.setHours(0,0,0,0);
    rangeEnd = new Date(rangeStart);
    rangeEnd.setDate(rangeStart.getDate() + 6);
    rangeEnd.setHours(23,59,59,999);
  } else if (timeframe === 'monthly') {
    const d = date ? parseLocalDate(date) : now;
    rangeStart = new Date(d.getFullYear(), d.getMonth(), 1);
    rangeEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    rangeEnd.setHours(23,59,59,999);
  } else if (timeframe === 'yearly') {
    const d = date ? parseLocalDate(date) : now;
    rangeStart = new Date(d.getFullYear(), 0, 1);
    rangeEnd   = new Date(d.getFullYear(), 11, 31);
    rangeEnd.setHours(23,59,59,999);
  } else if (timeframe === 'custom') {
    if (!startDate || !endDate) {
      return reply.code(400).send({ success: false, message: 'startDate and endDate required' });
    }
    rangeStart = parseLocalDate(startDate); rangeStart.setHours(0,0,0,0);
    rangeEnd   = parseLocalDate(endDate);   rangeEnd.setHours(23,59,59,999);
  } else {
    return reply.code(400).send({ success: false, message: 'Invalid timeframe' });
  }

  try {
    const result = await db.query(
      `SELECT
          dt.id,
          dt.payout_amount       AS gross_amount,
          0                      AS commission_amount,
          dt.payout_amount       AS net_amount,
          dt.completed_at,
          0                      AS active_minutes,
          o.id                   AS order_id,
          o.product_name,
          o.customer_name        AS client_name,
          COALESCE(dp.commission_rate, 0.10) * 100 AS commission_rate_pct
       FROM delivery_trips   dt
       LEFT JOIN orders        o  ON o.id  = dt.order_id
       LEFT JOIN driver_profiles dp ON dp.id = dt.driver_id
       WHERE dt.driver_id     = $1
         AND dt.status        = 'delivered'
         AND dt.completed_at >= $2
         AND dt.completed_at <= $3
       ORDER BY dt.completed_at DESC`,
      [driverId, rangeStart.toISOString(), rangeEnd.toISOString()]
    );

    const trips = result.rows || [];

    // Aggregate totals
    const totalGross      = trips.reduce((s, t) => s + parseFloat(t.gross_amount      || 0), 0);
    const totalCommission = trips.reduce((s, t) => s + parseFloat(t.commission_amount || 0), 0);
    const totalNet        = trips.reduce((s, t) => s + parseFloat(t.net_amount        || 0), 0);
    const tripCount       = trips.length;

    return reply.send({
      success: true,
      data: {
        timeframe,
        rangeStart:      rangeStart.toISOString(),
        rangeEnd:        rangeEnd.toISOString(),
        // Summary figures
        totalGross,
        totalCommission,
        totalNet,
        totalAmount:     totalNet,           // backward compat alias
        tripCount,
        avgGrossPerTrip: tripCount > 0 ? Math.round(totalGross / tripCount) : 0,
        avgNetPerTrip:   tripCount > 0 ? Math.round(totalNet   / tripCount) : 0,
        commissionRatePct: trips[0]?.commission_rate_pct || 10,

        trips: trips.map((t) => ({
          id:              t.id,
          type:            t.product_name || 'Delivery',
          customerName:    t.client_name  || '',
          orderId:         t.order_id,
          date:            formatDisplayDate(t.completed_at),
          // Earnings breakdown
          gross:           parseFloat(t.gross_amount      || 0),
          commission:      parseFloat(t.commission_amount || 0),
          net:             parseFloat(t.net_amount        || 0),
          amount:          parseFloat(t.net_amount        || 0), // backward compat
          commissionPct:   parseFloat(t.commission_rate_pct || 10),
        })),
      },
    });
  } catch (error) {
    request.log.error(error);
    if (isSchemaDriftError(error)) {
      return reply.send({
        success: true,
        data: {
          timeframe,
          rangeStart: rangeStart.toISOString(),
          rangeEnd: rangeEnd.toISOString(),
          totalGross: 0,
          totalCommission: 0,
          totalNet: 0,
          totalAmount: 0,
          tripCount: 0,
          avgGrossPerTrip: 0,
          avgNetPerTrip: 0,
          commissionRatePct: 10,
          trips: [],
        },
      });
    }
    return reply.code(500).send({ success: false, message: 'Failed to fetch earnings' });
  }
}

// ──────────────────────────────────────────────────────────────
// GET /api/earnings/summary
// Full breakdown: today, weekly, total — all with commission
// ──────────────────────────────────────────────────────────────
async function getEarningsSummary(request, reply) {
  const driverId = request.driver.id;

  try {
    const profile = await db.selectOne('driver_profiles', { id: driverId });
    const commPct = parseFloat(((profile && profile.commission_rate) || 0.10) * 100);

    let agg = {
      today_orders: 0,
      today_gross: 0,
      weekly_orders: 0,
      weekly_gross: 0,
      total_orders: 0,
      total_gross: 0,
    };

    if (await tableExists('delivery_trips')) {
      const aggResult = await db.query(
        `SELECT
            COUNT(*) FILTER (WHERE status = 'delivered' AND completed_at AT TIME ZONE 'Asia/Kolkata' >= CURRENT_DATE) AS today_orders,
            COALESCE(SUM(CASE WHEN status = 'delivered' AND completed_at AT TIME ZONE 'Asia/Kolkata' >= CURRENT_DATE THEN payout_amount ELSE 0 END), 0) AS today_gross,
            COUNT(*) FILTER (WHERE status = 'delivered' AND completed_at >= date_trunc('week', NOW())) AS weekly_orders,
            COALESCE(SUM(CASE WHEN status = 'delivered' AND completed_at >= date_trunc('week', NOW()) THEN payout_amount ELSE 0 END), 0) AS weekly_gross,
            COUNT(*) FILTER (WHERE status = 'delivered') AS total_orders,
            COALESCE(SUM(CASE WHEN status = 'delivered' THEN payout_amount ELSE 0 END), 0) AS total_gross
         FROM delivery_trips
         WHERE driver_id = $1`,
        [driverId]
      );
      agg = aggResult.rows[0] || agg;
    }

    const todayGross = parseFloat(agg.today_gross || 0);
    const weeklyGross = parseFloat(agg.weekly_gross || 0);
    const totalGross = parseFloat(agg.total_gross || 0);

    const todayCommission = parseFloat((todayGross * (commPct / 100)).toFixed(2));
    const weeklyCommission = parseFloat((weeklyGross * (commPct / 100)).toFixed(2));
    const totalCommission = parseFloat((totalGross * (commPct / 100)).toFixed(2));

    const todayNet = parseFloat((todayGross - todayCommission).toFixed(2));
    const weeklyNet = parseFloat((weeklyGross - weeklyCommission).toFixed(2));
    const totalNet = parseFloat((totalGross - totalCommission).toFixed(2));

    return reply.send({
      success: true,
      data: {
        commissionRatePct: commPct,

        today: {
          gross:          todayGross,
          commission:     todayCommission,
          net:            todayNet,
          orders:         parseInt(agg.today_orders || 0, 10),
          active_minutes: 0,
        },

        weekly: {
          gross:            weeklyGross,
          commission:       weeklyCommission,
          net:              weeklyNet,
          earnings:         weeklyNet, // alias
          orders:           parseInt(agg.weekly_orders || 0, 10),
          accepted:         0,
          completed:        parseInt(agg.weekly_orders || 0, 10),
          login_minutes:    0,
          login_hours:      0,
          completion_score: 0,
        },

        total: {
          gross:      totalGross,
          commission: totalCommission,
          net:        totalNet,
          earnings:   totalNet, // alias
          orders:     parseInt(agg.total_orders || 0, 10),
        },

        is_pilot_this_week: false,
        rating:             parseFloat((profile && profile.rating) || 5.0),
      },
    });
  } catch (error) {
    request.log.error('getEarningsSummary error:', error);
    if (isSchemaDriftError(error)) {
      return reply.send({ success: true, data: emptyEarningsSummary() });
    }
    return reply.code(500).send({ success: false, message: 'Failed to fetch summary: ' + error.message });
  }
}

function formatDisplayDate(isoString) {
  if (!isoString) return '';
  const d     = new Date(isoString);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return `Today, ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

module.exports = { getEarnings, getEarningsSummary };
