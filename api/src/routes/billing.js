import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';
import { getDb } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

const stripe = process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_placeholder'
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const PRICES = {
  starter: process.env.STRIPE_PRICE_STARTER || 'price_starter_monthly',
  pro: process.env.STRIPE_PRICE_PRO || 'price_pro_monthly'
};

const PLANS = {
  starter: { name: 'Starter', postsPerMonth: 10, platforms: 1 },
  pro: { name: 'Pro', postsPerMonth: 30, platforms: 3 }
};

// GET /api/billing/plans — list available plans
router.get('/plans', (req, res) => {
  res.json({
    plans: [
      {
        id: 'starter',
        name: 'Starter',
        price: 29,
        postsPerMonth: 10,
        platforms: 1,
        description: 'Perfect for getting started with one platform'
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 59,
        postsPerMonth: 30,
        platforms: 3,
        imageGeneration: true,
        description: 'For creators who want it all across every platform'
      }
    ]
  });
});

// All billing routes require auth
router.use(authMiddleware);

// GET /api/billing/subscription — get current subscription
router.get('/subscription', (req, res) => {
  const db = getDb();
  const sub = db.prepare('SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(req.user.id);
  
  const user = db.prepare('SELECT id, email, name, subscription_tier, subscription_status FROM users WHERE id = ?').get(req.user.id);

  res.json({
    subscription: sub || null,
    plan: user.subscription_tier ? PLANS[user.subscription_tier] || null : null,
    status: user.subscription_status || 'inactive'
  });
});

// POST /api/billing/create-checkout-session — create Stripe checkout
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { price_id, tier } = req.body;

    if (!tier || !['starter', 'pro'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier. Must be "starter" or "pro".' });
    }

    if (!stripe) {
      // Mock mode — just create the subscription directly
      return handleMockSubscription(req, res, tier);
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    // Create or retrieve Stripe customer
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { user_id: user.id }
      });
      customerId = customer.id;
      db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run(customerId, user.id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: price_id || PRICES[tier], quantity: 1 }],
      success_url: `${req.headers.origin || 'http://localhost:3000'}/dashboard?checkout=success`,
      cancel_url: `${req.headers.origin || 'http://localhost:3000'}/pricing?checkout=canceled`,
      metadata: { user_id: user.id, tier }
    });

    res.json({ url: session.url, session_id: session.id });
  } catch (err) {
    console.error('[billing] Checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// POST /api/billing/create-portal-session — Stripe customer portal
router.post('/create-portal-session', async (req, res) => {
  try {
    if (!stripe) {
      return res.json({ url: `${req.headers.origin || 'http://localhost:3000'}/dashboard` });
    }

    const db = getDb();
    const user = db.prepare('SELECT stripe_customer_id FROM users WHERE id = ?').get(req.user.id);

    if (!user.stripe_customer_id) {
      return res.status(400).json({ error: 'No billing account found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${req.headers.origin || 'http://localhost:3000'}/dashboard`
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[billing] Portal error:', err);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// POST /api/billing/webhook — Stripe webhook handler
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];

  if (!stripe) {
    return res.status(200).json({ received: true });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  const db = getDb();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata.user_id;
      const tier = session.metadata.tier;
      const subscriptionId = session.subscription;

      // Get subscription details from Stripe
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const subId = uuidv4();

        db.prepare(`
          INSERT INTO subscriptions (id, user_id, stripe_subscription_id, stripe_price_id, status, tier, current_period_start, current_period_end)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          subId, userId, subscription.id, subscription.items.data[0].price.id,
          subscription.status, tier,
          new Date(subscription.current_period_start * 1000).toISOString(),
          new Date(subscription.current_period_end * 1000).toISOString()
        );

        db.prepare("UPDATE users SET subscription_tier = ?, subscription_status = ?, updated_at = datetime('now') WHERE id = ?")
          .run(tier, subscription.status, userId);

        console.log(`[billing] User ${userId} subscribed to ${tier}`);
      } catch (err) {
        console.error('[webhook] Error processing subscription:', err);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const userId = subscription.metadata.user_id;

      if (userId) {
        db.prepare(`
          UPDATE subscriptions SET status = ?, current_period_start = ?, current_period_end = ?, cancel_at_period_end = ?, updated_at = datetime('now')
          WHERE stripe_subscription_id = ?
        `).run(
          subscription.status,
          new Date(subscription.current_period_start * 1000).toISOString(),
          new Date(subscription.current_period_end * 1000).toISOString(),
          subscription.cancel_at_period_end ? 1 : 0,
          subscription.id
        );

        db.prepare("UPDATE users SET subscription_status = ?, updated_at = datetime('now') WHERE id = ?")
          .run(subscription.status, userId);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const userId = subscription.metadata.user_id;

      if (userId) {
        db.prepare("UPDATE subscriptions SET status = 'canceled', updated_at = datetime('now') WHERE stripe_subscription_id = ?")
          .run(subscription.id);
        db.prepare("UPDATE users SET subscription_tier = 'free', subscription_status = 'inactive', updated_at = datetime('now') WHERE id = ?")
          .run(userId);
      }
      break;
    }
  }

  res.json({ received: true });
});

// Mock subscription for development without Stripe
function handleMockSubscription(req, res, tier) {
  const db = getDb();
  const subId = uuidv4();
  const now = new Date();
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + 1);

  // Cancel any existing subscriptions
  db.prepare("UPDATE subscriptions SET status = 'canceled' WHERE user_id = ?").run(req.user.id);

  db.prepare(`
    INSERT INTO subscriptions (id, user_id, stripe_subscription_id, stripe_price_id, status, tier, current_period_start, current_period_end)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    subId, req.user.id, `mock_sub_${subId}`, PRICES[tier],
    'active', tier,
    now.toISOString(), endDate.toISOString()
  );

  db.prepare("UPDATE users SET subscription_tier = ?, subscription_status = 'active', updated_at = datetime('now') WHERE id = ?")
    .run(tier, req.user.id);

  res.json({
    success: true,
    subscription: {
      id: subId,
      tier,
      status: 'active',
      current_period_end: endDate.toISOString()
    },
    message: `Subscribed to ${PLANS[tier].name} plan (mock mode)`
  });
}

export default router;