#!/usr/bin/env node

/**
 * PostPilot Stripe Setup Script
 * ===============================
 *
 * Creates Stripe products and prices for PostPilot subscription plans.
 *
 * Usage:
 *   1. Set STRIPE_SECRET_KEY in your .env file (or export it)
 *   2. Run: node scripts/setup-stripe.js
 *
 * The script will:
 *   - Create or update "Starter" ($29/month) and "Pro" ($59/month) products
 *   - Create monthly prices for each
 *   - Output the price IDs you need to add to your .env file
 *   - Optionally set up a Stripe webhook endpoint
 */

import 'dotenv/config';
import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY || STRIPE_SECRET_KEY === 'sk_test_placeholder') {
  console.error(`
❌ No valid Stripe secret key found.

Set STRIPE_SECRET_KEY in your .env file:
  1. Go to https://dashboard.stripe.com/apikeys
  2. Copy your "Secret key" (starts with sk_test_ or sk_live_)
  3. Add it to .env: STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx

Or pass it inline: STRIPE_SECRET_KEY=sk_test_xxx node scripts/setup-stripe.js
  `);
  process.exit(1);
}

const isLive = STRIPE_SECRET_KEY.startsWith('sk_live_');
console.log(`\n🔑 Using Stripe ${isLive ? 'LIVE' : 'TEST'} mode\n`);

const stripe = new Stripe(STRIPE_SECRET_KEY);

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    description: '10 posts/month, 1 platform — perfect for getting started',
    monthlyPrice: 2900, // $29.00 in cents
    metadata: {
      posts_per_month: '10',
      platforms: '1',
      image_generation: 'false'
    }
  },
  {
    id: 'pro',
    name: 'Pro',
    description: '30 posts/month, 3 platforms, image generation included',
    monthlyPrice: 5900, // $59.00 in cents
    metadata: {
      posts_per_month: '30',
      platforms: '3',
      image_generation: 'true'
    }
  }
];

async function setupStripe() {
  const results = [];

  for (const plan of PLANS) {
    console.log(`\n━━━ ${plan.name} (${plan.id}) ━━━`);

    // Check if product already exists
    const existingProducts = await stripe.products.search({
      query: `metadata['app_id']:'postpilot' AND metadata['plan_id']:'${plan.id}'`,
      limit: 1
    });

    let product;
    if (existingProducts.data.length > 0) {
      product = existingProducts.data[0];
      product = await stripe.products.update(product.id, {
        name: plan.name,
        description: plan.description,
        metadata: { ...plan.metadata, app_id: 'postpilot', plan_id: plan.id }
      });
      console.log(`  ✅ Updated existing product: ${product.id}`);
    } else {
      product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: { ...plan.metadata, app_id: 'postpilot', plan_id: plan.id }
      });
      console.log(`  ✅ Created product: ${product.id}`);
    }

    // Deactivate old prices for this product
    const existingPrices = await stripe.prices.list({
      product: product.id,
      active: true,
      limit: 10
    });

    for (const price of existingPrices.data) {
      if (price.type === 'recurring' && price.recurring.interval === 'month') {
        await stripe.prices.update(price.id, { active: false });
        console.log(`  🔄 Deactivated old price: ${price.id}`);
      }
    }

    // Create monthly price
    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.monthlyPrice,
      currency: 'usd',
      recurring: { interval: 'month', interval_count: 1 },
      metadata: { app_id: 'postpilot', plan_id: plan.id, billing_period: 'monthly' }
    });
    console.log(`  ✅ Created monthly price: ${monthlyPrice.id}`);

    // Create annual price (2 months free = 10 months for price of 12)
    const annualUnitAmount = Math.round(plan.monthlyPrice * 10); // 2 months free
    const annualPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: annualUnitAmount,
      currency: 'usd',
      recurring: { interval: 'year', interval_count: 1 },
      metadata: {
        app_id: 'postpilot',
        plan_id: plan.id,
        billing_period: 'annual',
        savings_description: '2 months free'
      }
    });
    console.log(`  ✅ Created annual price: ${annualPrice.id} ($${(annualUnitAmount / 100).toFixed(0)}/year)`);

    results.push({
      plan: plan.id,
      product_id: product.id,
      monthly_price_id: monthlyPrice.id,
      annual_price_id: annualPrice.id,
      monthly_amount: plan.monthlyPrice / 100,
      annual_amount: annualUnitAmount / 100
    });
  }

  // ── Summary ─────────────────────────────────────
  console.log('\n\n═══════════════════════════════════════════');
  console.log('  ✅ Stripe Setup Complete!');
  console.log('═══════════════════════════════════════════\n');

  for (const r of results) {
    console.log(`  ${r.plan.toUpperCase()}:`);
    console.log(`    Product ID:    ${r.product_id}`);
    console.log(`    Monthly Price: ${r.monthly_price_id} ($${r.monthly_amount}/mo)`);
    console.log(`    Annual Price:  ${r.annual_price_id} ($${r.annual_amount}/yr)`);
    console.log('');
  }

  console.log('───────────────────────────────────────────');
  console.log('  Add these to your .env file:\n');

  for (const r of results) {
    const key = `STRIPE_PRICE_${r.plan.toUpperCase()}`;
    console.log(`  ${key}=${r.monthly_price_id}`);
  }

  console.log('\n  Or for annual pricing:');
  for (const r of results) {
    const key = `STRIPE_PRICE_${r.plan.toUpperCase()}_ANNUAL`;
    console.log(`  ${key}=${r.annual_price_id}`);
  }

  console.log('\n───────────────────────────────────────────');
  console.log('  Next steps:');
  console.log('  1. Add the price IDs above to your .env');
  console.log('  2. Set up the webhook endpoint (see STRIPE_SETUP.md)');
  console.log('  3. Test a checkout in your app!\n');
}

setupStripe().catch(err => {
  console.error('\n❌ Setup failed:', err.message);
  process.exit(1);
});