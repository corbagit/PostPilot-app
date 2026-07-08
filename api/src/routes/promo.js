/**
 * PostPilot Promo Code Routes
 * =============================
 * Handles promo code redemption for launch promotions.
 * Supports the PILOT500 launch promo: first month free for first 500 users.
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// ── Promo Code Definitions ──────────────────────────────────

const PROMO_CODES = {
  PILOT500: {
    description: 'First month free — launch promotion for first 500 users',
    maxRedemptions: 500,
    tier: null, // applies to any tier
    duration_months: 1 // free for 1 month
  }
};

// All promo routes require auth
router.use(authMiddleware);

// GET /api/promo/:code — check if a promo code is valid
router.get('/:code', (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const promo = PROMO_CODES[code];

    if (!promo) {
      return res.status(404).json({ valid: false, error: 'Invalid promo code' });
    }

    const db = getDb();

    // Check total redemptions
    const totalRedemptions = db.prepare(
      'SELECT COUNT(*) as count FROM promo_redemptions WHERE code = ?'
    ).get(code).count;

    if (totalRedemptions >= promo.maxRedemptions) {
      return res.json({ valid: false, error: 'This promo code has reached its maximum redemptions' });
    }

    // Check if user already redeemed
    const userRedemption = db.prepare(
      'SELECT * FROM promo_redemptions WHERE user_id = ? AND code = ?'
    ).get(req.user.id, code);

    if (userRedemption) {
      return res.json({ valid: false, error: 'You have already used this promo code' });
    }

    res.json({
      valid: true,
      code,
      description: promo.description,
      remaining: promo.maxRedemptions - totalRedemptions
    });
  } catch (err) {
    console.error('[promo] Check error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/promo/redeem — redeem a promo code
router.post('/redeem', async (req, res) => {
  try {
    const { code, tier } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Promo code is required' });
    }

    const normalizedCode = code.toUpperCase();
    const promo = PROMO_CODES[normalizedCode];

    if (!promo) {
      return res.status(404).json({ error: 'Invalid promo code' });
    }

    const selectedTier = tier || promo.tier || 'starter';
    if (!['starter', 'pro'].includes(selectedTier)) {
      return res.status(400).json({ error: 'Tier must be "starter" or "pro"' });
    }

    const db = getDb();

    // Check total redemptions
    const totalRedemptions = db.prepare(
      'SELECT COUNT(*) as count FROM promo_redemptions WHERE code = ?'
    ).get(normalizedCode).count;

    if (totalRedemptions >= promo.maxRedemptions) {
      return res.status(400).json({ error: 'This promo code has reached its maximum redemptions' });
    }

    // Check if user already redeemed
    const userRedemption = db.prepare(
      'SELECT * FROM promo_redemptions WHERE user_id = ? AND code = ?'
    ).get(req.user.id, normalizedCode);

    if (userRedemption) {
      return res.status(400).json({ error: 'You have already used this promo code' });
    }

    // Record the redemption
    const redemptionId = uuidv4();
    db.prepare(
      'INSERT INTO promo_redemptions (id, user_id, code, redeemed_at) VALUES (?, ?, ?, datetime(\'now\'))'
    ).run(redemptionId, req.user.id, normalizedCode);

    // Create a trial subscription
    const subId = uuidv4();
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + promo.duration_months);

    // Cancel any existing subscriptions
    db.prepare("UPDATE subscriptions SET status = 'canceled' WHERE user_id = ?").run(req.user.id);

    db.prepare(`
      INSERT INTO subscriptions (id, user_id, stripe_subscription_id, stripe_price_id, status, tier, current_period_start, current_period_end, payment_provider)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'promo')
    `).run(
      subId, req.user.id, `promo_${normalizedCode}_${subId.slice(0, 8)}`,
      `promo_${selectedTier}_monthly`, 'trialing', selectedTier,
      now.toISOString(), endDate.toISOString()
    );

    db.prepare("UPDATE users SET subscription_tier = ?, subscription_status = 'trialing', updated_at = datetime('now') WHERE id = ?")
      .run(selectedTier, req.user.id);

    const updatedUser = db.prepare(
      'SELECT id, email, name, subscription_tier, subscription_status FROM users WHERE id = ?'
    ).get(req.user.id);

    res.json({
      success: true,
      message: `Promo code "${normalizedCode}" applied! ${promo.description}`,
      subscription: {
        id: subId,
        tier: selectedTier,
        status: 'trialing',
        current_period_end: endDate.toISOString()
      },
      user: updatedUser
    });
  } catch (err) {
    console.error('[promo] Redeem error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
