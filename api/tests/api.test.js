/**
 * PostPilot API Test Suite
 * =========================
 * Tests all core API endpoints: auth, posts, billing, promo.
 * Uses Node.js built-in test runner.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const BASE = 'http://localhost:4001';

// ── Helper ────────────────────────────────────────────────

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

// ── Auth Tests ────────────────────────────────────────────

describe('Auth', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'password123';
  let token;
  let userId;

  it('should signup a new user', async () => {
    const { status, data } = await request('POST', '/api/auth/signup', {
      email: testEmail,
      password: testPassword,
      name: 'Test User'
    });
    assert.equal(status, 201);
    assert.ok(data.token);
    assert.ok(data.user);
    assert.equal(data.user.email, testEmail);
    assert.equal(data.user.subscription_tier, 'free');
    token = data.token;
    userId = data.user.id;
  });

  it('should reject duplicate signup', async () => {
    const { status } = await request('POST', '/api/auth/signup', {
      email: testEmail,
      password: testPassword,
      name: 'Test User'
    });
    assert.equal(status, 409);
  });

  it('should reject signup with missing fields', async () => {
    const { status } = await request('POST', '/api/auth/signup', {
      email: 'incomplete@example.com'
    });
    assert.equal(status, 400);
  });

  it('should reject signup with short password', async () => {
    const { status } = await request('POST', '/api/auth/signup', {
      email: 'shortpw@example.com',
      password: '123',
      name: 'Short PW'
    });
    assert.equal(status, 400);
  });

  it('should login with correct credentials', async () => {
    const { status, data } = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: testPassword
    });
    assert.equal(status, 200);
    assert.ok(data.token);
    assert.ok(data.user);
  });

  it('should reject login with wrong password', async () => {
    const { status } = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: 'wrongpassword'
    });
    assert.equal(status, 401);
  });

  it('should reject login with non-existent email', async () => {
    const { status } = await request('POST', '/api/auth/login', {
      email: 'nonexistent@example.com',
      password: testPassword
    });
    assert.equal(status, 401);
  });

  it('should get current user profile', async () => {
    const { status, data } = await request('GET', '/api/auth/me', null, token);
    assert.equal(status, 200);
    assert.equal(data.user.email, testEmail);
  });

  it('should reject unauthenticated profile access', async () => {
    const { status } = await request('GET', '/api/auth/me');
    assert.equal(status, 401);
  });

  it('should update profile name', async () => {
    const { status, data } = await request('PUT', '/api/auth/profile', {
      name: 'Updated Name'
    }, token);
    assert.equal(status, 200);
    assert.equal(data.user.name, 'Updated Name');
  });
});

// ── Posts Tests ───────────────────────────────────────────

describe('Posts', () => {
  let token;
  const postEmail = `posts-${Date.now()}@example.com`;

  before(async () => {
    // Create a test user
    const { data } = await request('POST', '/api/auth/signup', {
      email: postEmail,
      password: 'password123',
      name: 'Posts Tester'
    });
    token = data.token;
  });

  it('should generate posts from a seed idea', async () => {
    const { status, data } = await request('POST', '/api/posts/generate', {
      seed_idea: 'Launch a new artisan coffee shop',
      platforms: ['instagram', 'linkedin', 'twitter']
    }, token);
    assert.equal(status, 201);
    assert.ok(data.posts);
    assert.equal(data.posts.length, 3);
    assert.ok(data.usage);
    assert.equal(data.usage.posts_generated, 3);
    assert.equal(data.usage.monthly_limit, 3); // free tier
    assert.equal(data.usage.remaining, 0);
  });

  it('should respect monthly post limits for free tier', async () => {
    const { status, data } = await request('POST', '/api/posts/generate', {
      seed_idea: 'Another coffee shop idea'
    }, token);
    assert.equal(status, 403);
    assert.ok(data.error.includes('limit'));
  });

  it('should return usage info', async () => {
    const { status, data } = await request('GET', '/api/posts/usage', null, token);
    assert.equal(status, 200);
    assert.equal(data.tier, 'free');
    assert.equal(data.posts_generated, 3);
    assert.equal(data.monthly_limit, 3);
  });

  it('should list posts', async () => {
    const { status, data } = await request('GET', '/api/posts', null, token);
    assert.equal(status, 200);
    assert.ok(data.posts);
    assert.ok(data.total >= 3);
  });

  it('should filter posts by platform', async () => {
    const { status, data } = await request('GET', '/api/posts?platform=instagram', null, token);
    assert.equal(status, 200);
    assert.ok(data.posts.every(p => p.platform === 'instagram'));
  });

  it('should update a post via PATCH', async () => {
    // Get a post first
    const { data: listData } = await request('GET', '/api/posts', null, token);
    const postId = listData.posts[0].id;

    const { status, data } = await request('PATCH', `/api/posts/${postId}`, {
      status: 'published'
    }, token);
    assert.equal(status, 200);
    assert.equal(data.post.status, 'published');
  });

  it('should update a post via PUT', async () => {
    const { data: listData } = await request('GET', '/api/posts', null, token);
    const postId = listData.posts[0].id;

    const { status, data } = await request('PUT', `/api/posts/${postId}`, {
      content: 'Updated content'
    }, token);
    assert.equal(status, 200);
    assert.equal(data.post.content, 'Updated content');
  });

  it('should reject invalid status in update', async () => {
    const { data: listData } = await request('GET', '/api/posts', null, token);
    const postId = listData.posts[0].id;

    const { status } = await request('PATCH', `/api/posts/${postId}`, {
      status: 'invalid'
    }, token);
    assert.equal(status, 400);
  });

  it('should delete a post', async () => {
    const { data: listData } = await request('GET', '/api/posts', null, token);
    const postId = listData.posts[0].id;

    const { status } = await request('DELETE', `/api/posts/${postId}`, null, token);
    assert.equal(status, 200);
  });

  it('should return 404 for deleted post', async () => {
    const { data: listData } = await request('GET', '/api/posts', null, token);
    const postId = listData.posts[0].id;
    // already deleted, try get
    const { status } = await request('GET', `/api/posts/${postId}`, null, token);
    assert.equal(status, 404);
  });
});

// ── Billing Tests ─────────────────────────────────────────

describe('Billing', () => {
  it('should list available plans', async () => {
    const { status, data } = await request('GET', '/api/billing/plans');
    assert.equal(status, 200);
    assert.ok(data.plans);
    assert.equal(data.plans.length, 2);
    assert.equal(data.plans[0].id, 'starter');
    assert.equal(data.plans[1].id, 'pro');
    assert.equal(data.plans[0].price, 29);
    assert.equal(data.plans[1].price, 59);
  });

  it('should create mock subscription for starter tier', async () => {
    // Create a user first
    const { data: signupData } = await request('POST', '/api/auth/signup', {
      email: `billing-s-${Date.now()}@example.com`,
      password: 'password123',
      name: 'Billing Starter'
    });
    const token = signupData.token;

    const { status, data } = await request('POST', '/api/billing/create-checkout-session', {
      tier: 'starter'
    }, token);
    assert.equal(status, 200);
    assert.ok(data.success);
    assert.equal(data.subscription.tier, 'starter');
  });

  it('should create mock subscription for pro tier', async () => {
    const { data: signupData } = await request('POST', '/api/auth/signup', {
      email: `billing-p-${Date.now()}@example.com`,
      password: 'password123',
      name: 'Billing Pro'
    });
    const token = signupData.token;

    const { status, data } = await request('POST', '/api/billing/create-checkout-session', {
      tier: 'pro'
    }, token);
    assert.equal(status, 200);
    assert.ok(data.success);
    assert.equal(data.subscription.tier, 'pro');
  });

  it('should reject invalid tier', async () => {
    const { data: signupData } = await request('POST', '/api/auth/signup', {
      email: `billing-inv-${Date.now()}@example.com`,
      password: 'password123',
      name: 'Billing Invalid'
    });
    const token = signupData.token;

    const { status } = await request('POST', '/api/billing/create-checkout-session', {
      tier: 'enterprise'
    }, token);
    assert.equal(status, 400);
  });

  it('should get subscription status', async () => {
    const { data: signupData } = await request('POST', '/api/auth/signup', {
      email: `billing-sub-${Date.now()}@example.com`,
      password: 'password123',
      name: 'Billing Sub'
    });
    const token = signupData.token;

    // Subscribe first
    await request('POST', '/api/billing/create-checkout-session', { tier: 'pro' }, token);

    const { status, data } = await request('GET', '/api/billing/subscription', null, token);
    assert.equal(status, 200);
    assert.ok(data.subscription);
  });
});

// ── Promo Tests ───────────────────────────────────────────

describe('Promo Codes', () => {
  let token;
  const promoEmail = `promo-${Date.now()}@example.com`;

  before(async () => {
    const { data } = await request('POST', '/api/auth/signup', {
      email: promoEmail,
      password: 'password123',
      name: 'Promo Tester'
    });
    token = data.token;
  });

  it('should validate PILOT500 promo code', async () => {
    const { status, data } = await request('GET', '/api/promo/PILOT500', null, token);
    assert.equal(status, 200);
    assert.equal(data.valid, true);
    assert.ok(data.description);
    assert.ok(data.remaining > 0);
  });

  it('should reject invalid promo code', async () => {
    const { status } = await request('GET', '/api/promo/INVALID', null, token);
    assert.equal(status, 404);
  });

  it('should redeem PILOT500 promo code', async () => {
    const { status, data } = await request('POST', '/api/promo/redeem', {
      code: 'PILOT500',
      tier: 'starter'
    }, token);
    assert.equal(status, 200);
    assert.ok(data.success);
    assert.equal(data.subscription.tier, 'starter');
    assert.equal(data.subscription.status, 'trialing');
  });

  it('should reject double redemption', async () => {
    const { status, data } = await request('POST', '/api/promo/redeem', {
      code: 'PILOT500',
      tier: 'starter'
    }, token);
    assert.equal(status, 400);
    assert.ok(data.error.includes('already'));
  });

  it('should show promo already used after redemption', async () => {
    const { status, data } = await request('GET', '/api/promo/PILOT500', null, token);
    assert.equal(status, 200);
    assert.equal(data.valid, false);
  });
});

// ── Health Check ──────────────────────────────────────────

describe('Health', () => {
  it('should return ok status', async () => {
    const { status, data } = await request('GET', '/api/health');
    assert.equal(status, 200);
    assert.equal(data.status, 'ok');
    assert.equal(data.service, 'PostPilot API');
  });
});

// ── Analytics Tests ───────────────────────────────────────

describe('Analytics', () => {
  let token;

  before(async () => {
    const { data } = await request('POST', '/api/auth/signup', {
      email: `analytics-${Date.now()}@example.com`,
      password: 'password123',
      name: 'Analytics Tester'
    });
    token = data.token;
  });

  it('should return analytics stats', async () => {
    const { status, data } = await request('GET', '/api/analytics/stats', null, token);
    assert.equal(status, 200);
    assert.ok(data.summary);
    assert.ok(data.users);
    assert.ok(data.posts);
    assert.ok(data.subscriptions);
  });

  it('should return health metrics', async () => {
    const { status, data } = await request('GET', '/api/analytics/health', null, token);
    assert.equal(status, 200);
    assert.ok(data.database);
    assert.ok(data.counts);
  });

  it('should reject unauthenticated analytics', async () => {
    const { status } = await request('GET', '/api/analytics/stats');
    assert.equal(status, 401);
  });
});
