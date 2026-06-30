/**
 * PostPilot Admin Routes
 * ======================
 * Business analytics dashboard data.
 *
 * Endpoints:
 *   GET  /api/admin/stats       — Main dashboard stats
 *   POST /api/analytics/pageview — Track a page view
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// All routes require auth
router.use(authMiddleware);

// GET /api/admin/stats — Main dashboard statistics
router.get('/stats', (req, res) => {
  const db = getDb();
  const PRICES = { free: 0, starter: 29, pro: 59 };

  // Total users
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

  // Total posts generated
  const totalPostsGenerated = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;

  // Users by tier as a flat object
  const tierRows = db.prepare(`
    SELECT subscription_tier, COUNT(*) as count
    FROM users
    GROUP BY subscription_tier
  `).all();
  const usersByTier = { free: 0, starter: 0, pro: 0 };
  for (const row of tierRows) {
    if (usersByTier[row.subscription_tier] !== undefined) {
      usersByTier[row.subscription_tier] = row.count;
    }
  }

  // Active subscriptions
  const subscriptionsActive = db.prepare(`
    SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'
  `).get().count;

  // Posts generated this month
  const postsThisMonth = db.prepare(`
    SELECT COUNT(*) as count FROM posts
    WHERE created_at >= datetime('now', 'start of month')
  `).get().count;

  // Signups this week
  const signupsThisWeek = db.prepare(`
    SELECT COUNT(*) as count FROM users
    WHERE created_at >= datetime('now', '-7 days')
  `).get().count;

  // Revenue — pull from active subscriptions by tier
  const activeTiers = db.prepare(`
    SELECT subscription_tier, COUNT(*) as count
    FROM users
    WHERE subscription_status = 'active' AND subscription_tier IN ('starter', 'pro')
    GROUP BY subscription_tier
  `).all();
  const monthlyRevenue = activeTiers.reduce(
    (sum, row) => sum + (PRICES[row.subscription_tier] || 0) * row.count, 0
  );
  const annualRevenue = 0; // Not tracking annual yet

  res.json({
    totalUsers,
    totalPostsGenerated,
    usersByTier,
    subscriptionsActive,
    postsThisMonth,
    signupsThisWeek,
    revenue: {
      monthly: monthlyRevenue,
      annual: annualRevenue
    }
  });
});

// POST /api/analytics/pageview — Track a page view
router.post('/pageview', (req, res) => {
  const db = getDb();
  const { page, referrer } = req.body;

  if (!page) {
    return res.status(400).json({ error: 'page is required' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO pageviews (id, user_id, page, referrer, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).run(id, req.user.id, page, referrer || null);

  res.status(201).json({ success: true, id });
});

export default router;