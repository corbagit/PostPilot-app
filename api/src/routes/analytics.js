/**
 * PostPilot Analytics Routes
 * ==========================
 * Returns business analytics data: user counts, post counts,
 * subscription breakdown, and platform distribution.
 *
 * Endpoints:
 *   GET /api/analytics/stats  — Full analytics summary (admin)
 *   GET /api/analytics/health — Real-time health metrics
 */

import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// All analytics routes require auth
router.use(authMiddleware);

// GET /api/analytics/stats — Full analytics summary
router.get('/stats', (req, res) => {
  const db = getDb();

  // ── User Stats ────────────────────────────────
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const usersByTier = db.prepare(`
    SELECT subscription_tier, COUNT(*) as count
    FROM users
    GROUP BY subscription_tier
    ORDER BY count DESC
  `).all();

  const usersByStatus = db.prepare(`
    SELECT subscription_status, COUNT(*) as count
    FROM users
    GROUP BY subscription_status
    ORDER BY count DESC
  `).all();

  const recentUsers = db.prepare(`
    SELECT COUNT(*) as count FROM users
    WHERE created_at >= datetime('now', '-7 days')
  `).get().count;

  // ── Post Stats ────────────────────────────────
  const totalPosts = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;
  const postsByStatus = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM posts
    GROUP BY status
  `).all();

  const postsByPlatform = db.prepare(`
    SELECT platform, COUNT(*) as count
    FROM posts
    GROUP BY platform
    ORDER BY count DESC
  `).all();

  const postsByTier = db.prepare(`
    SELECT u.subscription_tier, COUNT(p.id) as count
    FROM posts p
    JOIN users u ON p.user_id = u.id
    GROUP BY u.subscription_tier
    ORDER BY count DESC
  `).all();

  const recentPosts = db.prepare(`
    SELECT COUNT(*) as count FROM posts
    WHERE created_at >= datetime('now', '-7 days')
  `).get().count;

  // ── Subscription Stats ────────────────────────
  const totalSubscriptions = db.prepare('SELECT COUNT(*) as count FROM subscriptions').get().count;
  const activeSubscriptions = db.prepare(`
    SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'
  `).get().count;

  const subscriptionsByProvider = db.prepare(`
    SELECT COALESCE(payment_provider, 'stripe') as provider, COUNT(*) as count
    FROM subscriptions
    GROUP BY provider
    ORDER BY count DESC
  `).all();

  const subscriptionsByTier = db.prepare(`
    SELECT tier, COUNT(*) as count
    FROM subscriptions
    WHERE status = 'active'
    GROUP BY tier
    ORDER BY count DESC
  `).all();

  // ── Revenue Stats (from mock/tier data) ───────
  const PRICES = { starter: 29, pro: 59 };
  const monthlyRevenue = db.prepare(`
    SELECT subscription_tier, COUNT(*) as count
    FROM users
    WHERE subscription_status = 'active' AND subscription_tier IN ('starter', 'pro')
    GROUP BY subscription_tier
  `).all().reduce((sum, row) => sum + (PRICES[row.subscription_tier] || 0) * row.count, 0);

  const annualRevenue = monthlyRevenue * 10; // 2 months free on annual

  // ── Assemble Response ─────────────────────────
  res.json({
    summary: {
      total_users: totalUsers,
      total_posts: totalPosts,
      total_subscriptions: totalSubscriptions,
      active_subscriptions: activeSubscriptions,
      monthly_revenue_usd: monthlyRevenue,
      annual_revenue_usd: annualRevenue,
      posts_per_user: totalUsers > 0 ? (totalPosts / totalUsers).toFixed(1) : 0
    },
    users: {
      total: totalUsers,
      new_this_week: recentUsers,
      by_tier: usersByTier,
      by_status: usersByStatus
    },
    posts: {
      total: totalPosts,
      new_this_week: recentPosts,
      by_status: postsByStatus,
      by_platform: postsByPlatform,
      by_tier: postsByTier
    },
    subscriptions: {
      total: totalSubscriptions,
      active: activeSubscriptions,
      by_tier: subscriptionsByTier,
      by_provider: subscriptionsByProvider
    },
    revenue: {
      monthly: monthlyRevenue,
      annual: annualRevenue,
      currency: 'USD'
    }
  });
});

// GET /api/analytics/health — Real-time health metrics
router.get('/health', (req, res) => {
  const db = getDb();

  const stats = {
    database: {
      status: 'connected',
      tables: db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(t => t.name)
    },
    counts: {
      users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
      posts: db.prepare('SELECT COUNT(*) as count FROM posts').get().count,
      subscriptions: db.prepare('SELECT COUNT(*) as count FROM subscriptions').get().count
    },
    uptime_seconds: process.uptime(),
    memory_usage_mb: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1),
    node_version: process.version,
    timestamp: new Date().toISOString()
  };

  // Check for recent errors/issues
  const incompleteSubs = db.prepare(
    "SELECT COUNT(*) as count FROM subscriptions WHERE status = 'incomplete'"
  ).get().count;
  if (incompleteSubs > 0) {
    stats.alerts = [`${incompleteSubs} incomplete subscriptions need attention`];
  }

  res.json(stats);
});

export default router;