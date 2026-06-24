/**
 * PostPilot PayPal Routes
 * ========================
 * Endpoints:
 *   POST /api/paypal/create-subscription   — Create PayPal subscription, returns approval URL
 *   POST /api/paypal/capture               — Capture / activate after user approval
 *   POST /api/paypal/webhook               — Receive PayPal webhook events
 *   GET  /api/paypal/subscription/:id      — Get subscription details
 *
 * All subscription plans integrate with the same usage limits
 * regardless of payment provider (Stripe or PayPal).
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import * as paypalService from '../services/paypal.js';

const router = Router();

const PLANS = {
  starter: { name: 'Starter', price: 29, postsPerMonth: 10, platforms: 1 },
  pro: { name: 'Pro', price: 59, postsPerMonth: 30, platforms: 3, imageGeneration: true }
};

// ── Public Routes ──────────────────────────────────

// GET /api/paypal/subscription/:id — get subscription details by PayPal ID
router.get('/subscription/:id', async (req, res) => {
  try {
    if (!paypalService.isPaypalConfigured()) {
      // Look up in our DB
      const db = getDb();
      const sub = db.prepare(
        "SELECT * FROM subscriptions WHERE paypal_subscription_id = ? OR stripe_subscription_id = ?"
      ).get(req.params.id, `paypal_${req.params.id}`);

      if (!sub) return res.status(404).json({ error: 'Subscription not found' });
      return res.json({ subscription: sub, mode: 'mock' });
    }

    const sub = await paypalService.getSubscription(req.params.id);
    res.json({ subscription: sub, mode: paypalService.getMode() });
  } catch (err) {
    console.error('[paypal] Get subscription error:', err);
    const db = getDb();
    const sub = db.prepare(
      "SELECT * FROM subscriptions WHERE paypal_subscription_id = ? OR stripe_subscription_id = ?"
    ).get(req.params.id, `paypal_${req.params.id}`);
    if (sub) return res.json({ subscription: sub, mode: 'mock' });
    res.status(500).json({ error: 'Failed to get subscription', detail: err.message });
  }
});

// ── Authenticated Routes ──────────────────────────

router.use(authMiddleware);

// POST /api/paypal/create-subscription — create a PayPal subscription
router.post('/create-subscription', async (req, res) => {
  try {
    const { tier, plan_id } = req.body;

    const selectedTier = tier || (plan_id === 'pro' ? 'pro' : 'starter');
    if (!['starter', 'pro'].includes(selectedTier)) {
      return res.status(400).json({ error: 'Invalid tier. Must be "starter" or "pro".' });
    }

    const plan = PLANS[selectedTier];

    if (!paypalService.isPaypalConfigured()) {
      // Mock mode — create subscription directly in DB
      return handleMockSubscription(req, res, selectedTier);
    }

    const db = getDb();
    const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(req.user.id);

    // Get or create PayPal products/plans (cached by plan ID)
    // In production, store plan IDs in env vars like Stripe price IDs
    const productName = `PostPilot ${plan.name}`;
    const product = await paypalService.createProduct(productName, plan.description);

    const billingPlan = await paypalService.createBillingPlan(
      product.id,
      `${plan.name} Monthly`,
      plan.description,
      plan.price
    );

    // Create the subscription
    const returnUrl = `${req.headers.origin || 'http://localhost:3000'}/dashboard?paypal=success`;
    const cancelUrl = `${req.headers.origin || 'http://localhost:3000'}/pricing?paypal=canceled`;
    const subscription = await paypalService.createSubscription(
      billingPlan.id,
      { name: user.name, email: user.email },
      returnUrl,
      cancelUrl
    );

    // Store pending subscription in DB
    const subId = uuidv4();
    const now = new Date();

    db.prepare(`
      INSERT INTO subscriptions (id, user_id, stripe_subscription_id, paypal_subscription_id, stripe_price_id, payment_provider, status, tier, current_period_start)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      subId, user.id, `paypal_order_${subscription.id}`, subscription.id,
      `paypal_${selectedTier}_monthly`, 'paypal', 'incomplete', selectedTier,
      now.toISOString()
    );

    res.json({
      success: true,
      subscription_id: subscription.id,
      approval_url: subscription.approval_url,
      status: subscription.status,
      plan: plan,
      mode: paypalService.getMode()
    });
  } catch (err) {
    console.error('[paypal] Create subscription error:', err);
    res.status(500).json({ error: 'Failed to create subscription', detail: err.message });
  }
});

// POST /api/paypal/capture — capture/activate after user approval
router.post('/capture', async (req, res) => {
  try {
    const { subscription_id, token } = req.body;
    const paypalSubId = subscription_id || token;

    if (!paypalSubId) {
      return res.status(400).json({ error: 'subscription_id or token is required' });
    }

    if (!paypalService.isPaypalConfigured()) {
      // Mock mode — subscription already active
      return res.json({
        success: true,
        status: 'active',
        message: 'Subscription activated (mock mode)',
        mode: 'mock'
      });
    }

    // Activate the subscription in PayPal
    await paypalService.activateSubscription(paypalSubId);

    // Get subscription details from PayPal
    const paypalSub = await paypalService.getSubscription(paypalSubId);
    const db = getDb();

    // Update our database
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);

    // Find the tier from the plan
    const planObj = paypalSub.plan_id?.includes('pro') ? PLANS.pro : PLANS.starter;
    const tier = planObj === PLANS.pro ? 'pro' : 'starter';

    const existingSub = db.prepare(
      "SELECT * FROM subscriptions WHERE paypal_subscription_id = ? OR stripe_subscription_id = ?"
    ).get(paypalSubId, `paypal_order_${paypalSubId}`);

    if (existingSub) {
      db.prepare(`
        UPDATE subscriptions SET status = ?, tier = ?, current_period_end = ?, payment_provider = 'paypal', updated_at = datetime('now')
        WHERE id = ?
      `).run('active', tier, endDate.toISOString(), existingSub.id);

      db.prepare("UPDATE users SET subscription_tier = ?, subscription_status = 'active', updated_at = datetime('now') WHERE id = ?")
        .run(tier, existingSub.user_id);
    }

    res.json({
      success: true,
      subscription_id: paypalSubId,
      status: 'active',
      tier,
      mode: paypalService.getMode()
    });
  } catch (err) {
    console.error('[paypal] Capture error:', err);
    res.status(500).json({ error: 'Failed to capture subscription', detail: err.message });
  }
});

// POST /api/paypal/webhook — handle PayPal webhook events
router.post('/webhook', async (req, res) => {
  try {
    // Verify webhook signature if configured
    if (paypalService.isPaypalConfigured()) {
      const isValid = await paypalService.verifyWebhookSignature(
        req.headers,
        req.body
      );
      if (!isValid) {
        console.error('[paypal] Webhook signature verification failed');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const eventType = req.body?.event_type;
    const resource = req.body?.resource;

    console.log(`[paypal] Webhook received: ${eventType}`);

    if (!eventType || !resource) {
      return res.status(200).json({ received: true });
    }

    const db = getDb();

    switch (eventType) {
      case 'PAYMENT.SALE.COMPLETED': {
        // Subscription payment received — extend period
        const billingAgreementId = resource.billing_agreement_id;
        if (billingAgreementId) {
          const sub = db.prepare(
            "SELECT * FROM subscriptions WHERE paypal_subscription_id = ?"
          ).get(billingAgreementId);

          if (sub) {
            const now = new Date();
            const endDate = new Date(now);
            endDate.setMonth(endDate.getMonth() + 1);

            db.prepare(`
              UPDATE subscriptions SET status = 'active', current_period_end = ?, updated_at = datetime('now')
              WHERE id = ?
            `).run(endDate.toISOString(), sub.id);

            db.prepare("UPDATE users SET subscription_status = 'active', updated_at = datetime('now') WHERE id = ?")
              .run(sub.user_id);
          }
        }
        break;
      }

      case 'BILLING.SUBSCRIPTION.CANCELLED': {
        const subId = resource.id;
        if (subId) {
          const sub = db.prepare(
            "SELECT * FROM subscriptions WHERE paypal_subscription_id = ?"
          ).get(subId);

          if (sub) {
            db.prepare(`
              UPDATE subscriptions SET status = 'canceled', cancel_at_period_end = 1, updated_at = datetime('now')
              WHERE id = ?
            `).run(sub.id);

            db.prepare("UPDATE users SET subscription_tier = 'free', subscription_status = 'inactive', updated_at = datetime('now') WHERE id = ?")
              .run(sub.user_id);
          }
        }
        break;
      }

      case 'BILLING.SUBSCRIPTION.ACTIVATED': {
        const activatedId = resource.id;
        if (activatedId) {
          const sub = db.prepare(
            "SELECT * FROM subscriptions WHERE paypal_subscription_id = ?"
          ).get(activatedId);

          if (sub) {
            const now = new Date();
            const endDate = new Date(now);
            endDate.setMonth(endDate.getMonth() + 1);

            db.prepare(`
              UPDATE subscriptions SET status = 'active', current_period_start = ?, current_period_end = ?, updated_at = datetime('now')
              WHERE id = ?
            `).run(now.toISOString(), endDate.toISOString(), sub.id);

            db.prepare("UPDATE users SET subscription_status = 'active', updated_at = datetime('now') WHERE id = ?")
              .run(sub.user_id);
          }
        }
        break;
      }

      case 'BILLING.SUBSCRIPTION.SUSPENDED':
      case 'BILLING.SUBSCRIPTION.EXPIRED': {
        const expiredId = resource.id;
        if (expiredId) {
          const sub = db.prepare(
            "SELECT * FROM subscriptions WHERE paypal_subscription_id = ?"
          ).get(expiredId);

          if (sub) {
            const newStatus = eventType === 'BILLING.SUBSCRIPTION.EXPIRED' ? 'expired' : 'suspended';
            db.prepare("UPDATE subscriptions SET status = ?, updated_at = datetime('now') WHERE id = ?")
              .run(newStatus, sub.id);

            db.prepare("UPDATE users SET subscription_status = 'past_due', updated_at = datetime('now') WHERE id = ?")
              .run(sub.user_id);
          }
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[paypal] Webhook error:', err);
    res.status(200).json({ received: true }); // Always ack webhooks
  }
});

// ── Mock Subscription Handler ──────────────────────

function handleMockSubscription(req, res, tier) {
  const db = getDb();
  const subId = uuidv4();
  const now = new Date();
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + 1);

  // Cancel any existing PayPal subscriptions
  db.prepare(
    "UPDATE subscriptions SET status = 'canceled' WHERE user_id = ? AND payment_provider = 'paypal'"
  ).run(req.user.id);

  db.prepare(`
    INSERT INTO subscriptions (id, user_id, stripe_subscription_id, paypal_subscription_id, stripe_price_id, payment_provider, status, tier, current_period_start, current_period_end)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    subId, req.user.id, `paypal_mock_${subId.slice(0, 8)}`, `paypal_mock_${subId.slice(0, 8)}`,
    `paypal_${tier}_monthly`, 'paypal', 'active', tier,
    now.toISOString(), endDate.toISOString()
  );

  db.prepare("UPDATE users SET subscription_tier = ?, subscription_status = 'active', updated_at = datetime('now') WHERE id = ?")
    .run(tier, req.user.id);

  res.json({
    success: true,
    subscription_id: `paypal_mock_${subId.slice(0, 8)}`,
    approval_url: `${req.headers.origin || 'http://localhost:3000'}/dashboard?paypal=mock`,
    status: 'active',
    plan: PLANS[tier],
    mode: 'mock',
    message: `Subscribed to ${PLANS[tier].name} plan (PayPal mock mode)`
  });
}

export default router;