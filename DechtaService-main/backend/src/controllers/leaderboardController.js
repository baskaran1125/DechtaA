// src/controllers/leaderboardController.js
const db = require('../config/database');

async function tableExists(tableName) {
  const result = await db.query('SELECT to_regclass($1) AS table_name', [`public.${tableName}`]);
  return !!result.rows[0]?.table_name;
}

async function tableHasColumn(tableName, columnName) {
  const result = await db.query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
      LIMIT 1`,
    [tableName, columnName]
  );
  return result.rows.length > 0;
}

function isSchemaDriftError(error) {
  const msg = String(error?.message || '').toLowerCase();
  return msg.includes('relation') && msg.includes('does not exist')
    || msg.includes('column') && msg.includes('does not exist');
}

// ──────────────────────────────────────────────────────────────
// GET /api/leaderboard
// Returns weekly leaderboard; highlights current driver's rank
// ──────────────────────────────────────────────────────────────
async function getLeaderboard(request, reply) {
  const driverId = request.driver.id;

  try {
    // Get start of current week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek + 1);
    weekStart.setHours(0, 0, 0, 0);

    // Try cache first
    const weekStartDate = weekStart.toISOString().split('T')[0];

    let cached = [];
    if (await tableExists('driver_leaderboard_cache')) {
      cached = await db.selectMany(
        'driver_leaderboard_cache',
        { week_start: weekStartDate },
        { orderBy: 'rank_position ASC', limit: 20 }
      );
    }

    if (cached && cached.length > 0) {
      const normalized = (cached || []).map((r) => ({
        rank: r.rank_position,
        driverId: r.driver_id,
        fullName: r.driver_name || 'Unknown Driver',
        avatarUrl: r.avatar_url || null,
        weeklyEarnings: parseFloat(r.weekly_earnings || 0),
        weeklyTrips: parseInt(r.weekly_orders_completed || 0, 10),
        isMe: r.driver_id === driverId,
      }));
      const myRank = normalized.find((r) => r.driverId === driverId) || null;
      return reply.send({ success: true, data: normalized, myRank });
    }

    // Build live leaderboard from driver_stats (legacy)
    let stats = [];
    if (await tableExists('driver_stats')) {
      stats = await db.selectMany(
        'driver_stats',
        {},
        { orderBy: 'weekly_earnings DESC', limit: 20 }
      );
    }

    let leaderboard = (stats || []).map((s, index) => ({
      rank: index + 1,
      driverId: s.driver_id,
      fullName: s.driver_name || 'Unknown Driver',
      avatarUrl: s.avatar_url || null,
      weeklyEarnings: parseFloat(s.weekly_earnings || 0),
      weeklyTrips: parseInt(s.weekly_orders_completed || 0, 10),
      isMe: s.driver_id === driverId,
    }));

    // Unified schema fallback: derive from deliveries + driver_profiles
    if ((!leaderboard || leaderboard.length === 0) && (await tableExists('deliveries'))) {
      const result = await db.query(
        `SELECT
            dp.id AS driver_id,
            COALESCE(NULLIF(dp.full_name, ''), 'Unknown Driver') AS driver_name,
            dp.avatar_url,
            COALESCE(SUM(CASE WHEN d.status = 'delivered' AND d.created_at >= date_trunc('week', NOW()) THEN d.payment_amount ELSE 0 END), 0) AS weekly_earnings,
            COUNT(*) FILTER (WHERE d.status = 'delivered' AND d.created_at >= date_trunc('week', NOW())) AS weekly_orders_completed
         FROM driver_profiles dp
         LEFT JOIN deliveries d ON d.driver_id = dp.id
         GROUP BY dp.id, dp.full_name, dp.avatar_url
         ORDER BY weekly_earnings DESC, weekly_orders_completed DESC
         LIMIT 20`
      );

      leaderboard = (result.rows || []).map((s, index) => ({
        rank: index + 1,
        driverId: s.driver_id,
        fullName: s.driver_name,
        avatarUrl: s.avatar_url || null,
        weeklyEarnings: parseFloat(s.weekly_earnings || 0),
        weeklyTrips: parseInt(s.weekly_orders_completed || 0, 10),
        isMe: s.driver_id === driverId,
      }));
    }

    const myRank = leaderboard.find((r) => r.driverId === driverId) || null;

    return reply.send({ success: true, data: leaderboard, myRank });
  } catch (error) {
    request.log.error(error);
    if (isSchemaDriftError(error)) {
      return reply.send({ success: true, data: [], myRank: null });
    }
    return reply.code(500).send({ success: false, message: 'Failed to fetch leaderboard' });
  }
}

// ──────────────────────────────────────────────────────────────
// GET /api/promos
// Returns active promo slides for home screen
// ──────────────────────────────────────────────────────────────
async function getPromoSlides(request, reply) {
  try {
    if (!(await tableExists('driver_ads'))) {
      return reply.send({ success: true, data: [] });
    }

    const hasIsActive = await tableHasColumn('driver_ads', 'is_active');
    const hasDisplayOrder = await tableHasColumn('driver_ads', 'display_order');

    let query = 'SELECT * FROM driver_ads';
    const values = [];

    if (hasIsActive) {
      query += ' WHERE COALESCE(is_active, true) = true';
    }

    if (hasDisplayOrder) {
      query += ' ORDER BY display_order ASC, id ASC';
    } else {
      query += ' ORDER BY created_at DESC, id DESC';
    }

    const result = await db.query(query, values);
    const data = result.rows || [];

    return reply.send({ success: true, data: data || [] });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ success: false, message: 'Failed to fetch promos' });
  }
}

// ──────────────────────────────────────────────────────────────
// GET /api/trips/:tripId/chat
// ──────────────────────────────────────────────────────────────
async function getChatMessages(request, reply) {
  const { tripId } = request.params;

  try {
    const data = await db.selectMany(
      'driver_chat_messages',
      { trip_id: tripId },
      { orderBy: 'created_at ASC' }
    );

    return reply.send({ success: true, data: data || [] });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ success: false, message: 'Failed to fetch messages' });
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/trips/:tripId/chat
// Body: { message: "..." }
// ──────────────────────────────────────────────────────────────
async function sendChatMessage(request, reply) {
  const driverId = request.driver.id;
  const { tripId } = request.params;
  const { message } = request.body;

  if (!message || !message.trim()) {
    return reply.code(400).send({ success: false, message: 'Message cannot be empty' });
  }

  try {
    const data = await db.insert('driver_chat_messages', {
      trip_id: tripId,
      sender_type: 'driver',
      sender_id: driverId,
      message: message.trim(),
      is_read: false,
    });

    // Broadcast via Socket.io
    const { getIo } = require('../services/socketService');
    const io = getIo();
    if (io) {
      io.to(`trip:${tripId}`).emit('trip:chat_message', data);
    }

    return reply.send({ success: true, data });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ success: false, message: 'Failed to send message' });
  }
}

// ──────────────────────────────────────────────────────────────
// GET /api/driver/achievements
// Returns driver rank info and progression
// ──────────────────────────────────────────────────────────────
async function getAchievements(request, reply) {
  const driverId = request.driver.id;

  try {
    const stats = await tableExists('driver_stats')
      ? await db.selectOne('driver_stats', { driver_id: driverId })
      : null;

    const weeklyOrders = stats?.weekly_orders_completed || 0;

    const ranks = [
      { id: 1, name: 'Trainee', threshold: 0 },
      { id: 2, name: 'Second Officer', threshold: 16 },
      { id: 3, name: 'Junior First Officer', threshold: 18 },
      { id: 4, name: 'First Officer', threshold: 20 },
      { id: 5, name: 'Captain', threshold: 22 },
      { id: 6, name: 'Flight Captain', threshold: 24 },
      { id: 7, name: 'Senior Flight Captain', threshold: 26 },
      { id: 8, name: 'Commercial Captain', threshold: 30 },
    ];

    let currentRankIndex = ranks.findIndex((r) => weeklyOrders < r.threshold) - 1;
    if (currentRankIndex < 0) currentRankIndex = ranks.length - 1;

    const currentRank = ranks[currentRankIndex];
    const nextRank = ranks[currentRankIndex + 1] || null;
    const loginHours       = (stats?.weekly_login_minutes || 0) / 60;
    const completionScore  = parseFloat(stats?.weekly_completion_score || 0);

    // Pilot Partner = 2 targets only: 38 hrs login + score >= 65
    const isPilot = loginHours >= 38 && completionScore >= 65;

    return reply.send({
      success: true,
      data: {
        weeklyOrders,
        totalOrders: stats?.total_orders_completed || 0,
        rating: parseFloat(stats?.rating || 5.0),
        currentRank,
        nextRank,
        isPilot,
        pilotProgress: Math.min(100, Math.round(
          ((loginHours >= 38 ? 50 : (loginHours / 38) * 50) +
           (completionScore >= 65 ? 50 : (completionScore / 65) * 50))
        )),
        ordersToNextRank: nextRank ? Math.max(0, nextRank.threshold - weeklyOrders) : 0,
        allRanks: ranks,
      },
    });
  } catch (error) {
    request.log.error(error);
    if (isSchemaDriftError(error)) {
      return reply.send({
        success: true,
        data: {
          weeklyOrders: 0,
          totalOrders: 0,
          rating: 5,
          currentRank: { id: 1, name: 'Trainee', threshold: 0 },
          nextRank: { id: 2, name: 'Second Officer', threshold: 16 },
          isPilot: false,
          pilotProgress: 0,
          ordersToNextRank: 16,
          allRanks: [
            { id: 1, name: 'Trainee', threshold: 0 },
            { id: 2, name: 'Second Officer', threshold: 16 },
            { id: 3, name: 'Junior First Officer', threshold: 18 },
            { id: 4, name: 'First Officer', threshold: 20 },
            { id: 5, name: 'Captain', threshold: 22 },
            { id: 6, name: 'Flight Captain', threshold: 24 },
            { id: 7, name: 'Senior Flight Captain', threshold: 26 },
            { id: 8, name: 'Commercial Captain', threshold: 30 },
          ],
        },
      });
    }
    return reply.code(500).send({ success: false, message: 'Failed to fetch achievements' });
  }
}

module.exports = {
  getLeaderboard,
  getPromoSlides,
  getChatMessages,
  sendChatMessage,
  getAchievements,
};
