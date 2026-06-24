#!/usr/bin/env node

/**
 * PostPilot PayPal Setup Script
 * ===============================
 *
 * Guides the user through setting up PayPal payment integration.
 *
 * Usage:
 *   1. Create a PayPal Developer account
 *   2. Get your Client ID and Secret from PayPal Developer Dashboard
 *   3. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env
 *   4. Run: node scripts/setup-paypal.js
 *
 * The script will:
 *   - Verify PayPal API connectivity
 *   - Create products and billing plans
 *   - Output the plan IDs
 */

import 'dotenv/config';

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const MODE = process.env.PAYPAL_MODE || 'sandbox';

if (!CLIENT_ID || !CLIENT_SECRET || CLIENT_ID.startsWith('placeholder') || CLIENT_ID.length < 20) {
  console.error(`
❌ PayPal not configured.

To set up PayPal:

1. Go to https://developer.paypal.com/dashboard/
2. Log in or create a PayPal Developer account
3. Go to "Apps & Credentials"
4. Under "REST API apps", click "Create App"
5. Name it "PostPilot" and select a sandbox business account
6. Copy the "Client ID" and "Secret"

Then add to .env:

  PAYPAL_CLIENT_ID=your_client_id_here
  PAYPAL_CLIENT_SECRET=your_secret_here
  PAYPAL_MODE=sandbox

For live mode, create a "Live" app and set PAYPAL_MODE=live
  `);
  process.exit(1);
}

const BASE_URL = MODE === 'live' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

async function getAccessToken() {
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!res.ok) {
    throw new Error(`Auth failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function paypalRequest(method, path, body = null) {
  const token = await getAccessToken();
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, options);
  const text = await res.text();

  if (!res.ok) {
    let detail = text;
    try { detail = JSON.parse(text); } catch(e) {}
    throw new Error(`PayPal API error (${res.status}): ${detail.message || text}`);
  }

  try { return JSON.parse(text); } catch { return text; }
}

async function setupPayPal() {
  console.log(`\n🔑 Connecting to PayPal ${MODE === 'live' ? 'LIVE' : 'SANDBOX'}...\n`);

  // Test connectivity
  const token = await getAccessToken();
  console.log('  ✅ PayPal API connected successfully\n');

  const plans = [
    {
      id: 'starter',
      name: 'Starter', 
      description: '10 posts/month, 1 platform',
      price: '29.00',
      postsPerMonth: 10,
      platforms: 1
    },
    {
      id: 'pro',
      name: 'Pro',
      description: '30 posts/month, 3 platforms, image generation',
      price: '59.00',
      postsPerMonth: 30,
      platforms: 3,
      imageGeneration: true
    }
  ];

  const results = [];

  for (const plan of plans) {
    console.log(`━━━ ${plan.name} (${plan.id}) ━━━`);

    // Create product
    const product = await paypalRequest('POST', '/v1/catalogs/products', {
      name: `PostPilot ${plan.name}`,
      description: plan.description,
      type: 'SERVICE',
      category: 'SOFTWARE',
      image_url: 'https://postpilot.app/brand/logo-icon.svg',
      home_url: 'https://postpilot.app'
    });
    console.log(`  ✅ Created product: ${product.id}`);

    // Create monthly billing plan
    const monthlyPlan = await paypalRequest('POST', '/v1/billing/plans', {
      product_id: product.id,
      name: `${plan.name} Monthly`,
      description: plan.description,
      billing_cycles: [{
        frequency: { interval_unit: 'MONTH', interval_count: 1 },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: { value: plan.price, currency_code: 'USD' }
        }
      }],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: { value: '0', currency_code: 'USD' },
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3
      },
      taxes: { percentage: '0', inclusive: false }
    });
    console.log(`  ✅ Created monthly plan: ${monthlyPlan.id} ($${plan.price}/mo)`);

    // Create annual billing plan (2 months free)
    const annualPrice = (parseFloat(plan.price) * 10).toFixed(2);
    const annualPlan = await paypalRequest('POST', '/v1/billing/plans', {
      product_id: product.id,
      name: `${plan.name} Annual`,
      description: `${plan.description} — 2 months free`,
      billing_cycles: [{
        frequency: { interval_unit: 'YEAR', interval_count: 1 },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: { value: annualPrice, currency_code: 'USD' }
        }
      }],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: { value: '0', currency_code: 'USD' },
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3
      },
      taxes: { percentage: '0', inclusive: false }
    });
    console.log(`  ✅ Created annual plan: ${annualPlan.id} ($${annualPrice}/yr)`);

    results.push({
      plan: plan.id,
      product_id: product.id,
      monthly_plan_id: monthlyPlan.id,
      annual_plan_id: annualPlan.id,
      monthly_price: `$${plan.price}/mo`,
      annual_price: `$${annualPrice}/yr`
    });
  }

  // ── Summary ─────────────────────────────────────
  console.log('\n\n═══════════════════════════════════════════');
  console.log('  ✅ PayPal Setup Complete!');
  console.log('═══════════════════════════════════════════\n');

  for (const r of results) {
    console.log(`  ${r.plan.toUpperCase()}:`);
    console.log(`    Product ID:          ${r.product_id}`);
    console.log(`    Monthly Plan ID:     ${r.monthly_plan_id} (${r.monthly_price})`);
    console.log(`    Annual Plan ID:      ${r.annual_plan_id} (${r.annual_price})`);
    console.log('');
  }

  console.log('───────────────────────────────────────────');
  console.log('  PayPal is now ready to process payments!');
  console.log('  The API will automatically use PayPal when');
  console.log('  keys are configured.\n');
}

setupPayPal().catch(err => {
  console.error('\n❌ Setup failed:', err.message);
  process.exit(1);
});