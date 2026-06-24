# PostPilot Stripe Billing Setup

This guide walks through connecting PostPilot to real Stripe billing — from creating a Stripe account to processing live payments.

---

## What You'll Need

| Item | Where to Get It |
|------|-----------------|
| Stripe account | [dashboard.stripe.com/register](https://dashboard.stripe.com/register) |
| Publishable key (`pk_...`) | Stripe Dashboard → Developers → API Keys |
| Secret key (`sk_...`) | Stripe Dashboard → Developers → API Keys |
| Webhook secret (`whsec_...`) | Stripe CLI or Stripe Dashboard → Webhooks |

---

## Step 1: Create a Stripe Account

1. Go to [dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Enter your email, name, and password
3. Verify your email address
4. You're in! No credit card needed for test mode

> **Test mode** is on by default. Everything is free to test. You'll see a yellow "Test mode" badge in the dashboard.

---

## Step 2: Get Your API Keys

1. In Stripe Dashboard, go to **Developers → API Keys** (left sidebar)
2. You'll see two keys:

   ```
   Publishable key:    pk_test_51ABC...     ← Used in frontend
   Secret key:         sk_test_51XYZ...     ← Used in backend (keep secret!)
   ```

3. Copy both keys and add them to your `.env` file:

   ```env
   STRIPE_SECRET_KEY=sk_test_51ABC123...
   STRIPE_PUBLISHABLE_KEY=pk_test_51XYZ789...
   ```

> ⚠️ **Never commit the secret key.** It's already in `.gitignore`. Keep it in `.env` only.

---

## Step 3: Create Products and Prices

You have two options:

### Option A: Automated (Recommended)

Run the setup script — it creates everything for you:

```bash
cd api
npm run setup-stripe
```

The script will:

1. Create the **Starter** product ($29/month, 10 posts, 1 platform)
2. Create the **Pro** product ($59/month, 30 posts, 3 platforms, image gen)
3. Create monthly and annual (2 months free) prices for both
4. Output the price IDs to add to `.env`

Example output:

```
STARTER:
  Product ID:       prod_Rt7ABC...
  Monthly Price:    price_1QwxYZ...  ($29/mo)
  Annual Price:     price_1QwxZZ...  ($290/yr)

PRO:
  Product ID:       prod_Rt8DEF...
  Monthly Price:    price_1QwyAB...  ($59/mo)
  Annual Price:     price_1QwyCD...  ($590/yr)
```

Copy the price IDs into `.env`:

```env
STRIPE_PRICE_STARTER=price_1QwxYZ...
STRIPE_PRICE_PRO=price_1QwyAB...
```

### Option B: Manual (Stripe Dashboard)

1. Go to **Products → Add Product**
2. Create each plan:

| Field | Starter | Pro |
|-------|---------|-----|
| Name | Starter | Pro |
| Description | 10 posts/month, 1 platform | 30 posts/month, 3 platforms + image gen |
| Price | $29.00/month | $59.00/month |
| Annual price | $290.00/year | $590.00/year |

3. Add metadata (hidden, for the app):
   - `app_id`: `postpilot`
   - `plan_id`: `starter` or `pro`

4. After creation, copy the **Price ID** (starts with `price_`) from each product's page

---

## Step 4: Set Up the Webhook

Stripe sends events when customers subscribe, upgrade, or cancel. PostPilot handles these via `POST /api/billing/webhook`.

### For Local Development (Stripe CLI)

The Stripe CLI forwards Stripe events to your local server:

```bash
# Install Stripe CLI
# macOS:
brew install stripe/stripe-cli/stripe

# Linux:
curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | \
  gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli/debian ./" | \
  sudo tee /etc/apt/sources.list.d/stripe-cli.list
sudo apt update && sudo apt install stripe
```

Then:

```bash
stripe login                     # Links CLI to your Stripe account
stripe listen --forward-to localhost:3000/api/billing/webhook
```

The CLI will show a **webhook signing secret** (`whsec_...`). Copy and add to `.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_1ABC...
```

Keep this terminal running while developing. It will show all events in real-time.

### For Production

1. In Stripe Dashboard, go to **Developers → Webhooks → Add endpoint**
2. Endpoint URL: `https://your-domain.com/api/billing/webhook`
3. Listen for these events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the **Signing secret** and add to your production environment variables

---

## Step 5: Configure Customer Portal (Optional)

Let users manage their own billing:

1. Stripe Dashboard → **Settings → Customer Portal**
2. Configure allowed actions: upgrade, downgrade, cancel
3. Set return URL: `https://your-domain.com/dashboard`
4. Done! The API endpoint `POST /api/billing/create-portal-session` will redirect users here

---

## Step 6: Test the Full Flow

### 1. Start the server

```bash
cd api
npm start
```

### 2. Create a test user

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test1234","name":"Test User"}'
```

Save the `token` from the response.

### 3. Start the Stripe CLI (in another terminal)

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

### 4. Create a checkout session

```bash
TOKEN="your_jwt_token_from_step_2"

curl -X POST http://localhost:3000/api/billing/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"tier":"starter"}'
```

You'll get a URL to Stripe Checkout. Open it in a browser.

### 5. Test with Stripe test cards

| Card Number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | ✅ Payment succeeds |
| `4000 0025 0000 3155` | 🔐 Requires 3D Secure |
| `4000 0000 0000 0002` | ❌ Card declined |

### 6. Verify the subscription

```bash
curl http://localhost:3000/api/billing/subscription \
  -H "Authorization: Bearer $TOKEN"
```

Expected response:

```json
{
  "subscription": {
    "tier": "starter",
    "status": "active",
    ...
  },
  "plan": {
    "name": "Starter",
    "postsPerMonth": 10,
    "platforms": 1
  },
  "status": "active"
}
```

---

## Step 7: Go Live

1. In Stripe Dashboard, toggle **"Viewing test data" → "Viewing live data"**
2. Complete Stripe's activation checklist (bank account, business details)
3. Get **live** API keys from **Developers → API Keys** (keys start with `sk_live_` / `pk_live_`)
4. Create **live** products/prices using the automated script:

   ```bash
   # Make sure you have live keys in .env
   npm run setup-stripe
   ```

5. Set up the **production webhook** in Stripe Dashboard
6. Update your environment with live keys and price IDs
7. Test with a real credit card ($1 test charge, immediately refund)

---

## Environment Variables Reference

```env
# ── Stripe API Keys (REQUIRED) ──────────────────────
STRIPE_SECRET_KEY=sk_live_51ABC...       # From Developers → API Keys
STRIPE_PUBLISHABLE_KEY=pk_live_51XYZ...  # From Developers → API Keys

# ── Webhook (REQUIRED for production) ───────────────
STRIPE_WEBHOOK_SECRET=whsec_1ABC...      # From Webhooks → signing secret

# ── Price IDs (from setup script or dashboard) ──────
STRIPE_PRICE_STARTER=price_1Qwx...       # Starter monthly ($29)
STRIPE_PRICE_PRO=price_1Qwy...           # Pro monthly ($59)

# Optional: annual pricing
# STRIPE_PRICE_STARTER_ANNUAL=price_1...
# STRIPE_PRICE_PRO_ANNUAL=price_1...
```

---

## Pricing Plans Reference

| Plan | Monthly | Annual (2mo free) | Posts | Platforms | Image Gen |
|------|---------|-------------------|-------|-----------|-----------|
| **Starter** | $29/mo | $290/yr ($24.17/mo) | 10 | 1 | ❌ |
| **Pro** | $59/mo | $590/yr ($49.17/mo) | 30 | 3 | ✅ |

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| Checkout returns 500 | Missing or wrong Stripe key | Check `STRIPE_SECRET_KEY` in `.env` |
| "No such price" | Price ID doesn't exist in Stripe | Run `npm run setup-stripe` to create prices |
| Webhook returns 400 | Wrong signing secret | Check `STRIPE_WEBHOOK_SECRET` matches Stripe CLI output |
| User not upgraded after payment | Webhook not reaching server | Check Stripe CLI is running or webhook endpoint is correct |
| Card declined | Test card number | Use `4242 4242 4242 4242` for success |
| Mock mode still active | Placeholder key still in `.env` | Replace `sk_test_placeholder` with real key |
| Annual price not showing | Not added to `STRIPE_PRICE_*_ANNUAL` env vars | Add price ID after running setup script |

---

## Architecture Overview

```
User clicks "Subscribe" 
        ↓
POST /api/billing/create-checkout-session
        ↓
Stripe Checkout (hosted by Stripe)
        ↓
User pays → Stripe sends webhook event
        ↓
POST /api/billing/webhook
        ↓
App updates:
  - subscriptions table (new row)
  - users.subscription_tier (updated)
  - users.subscription_status (updated)
        ↓
User now has access to their plan's features
```

## Testing Checklist

- [ ] API keys configured in `.env`
- [ ] Products and prices created
- [ ] Price IDs added to `.env`
- [ ] Stripe CLI running (local) or webhook set up (prod)
- [ ] Webhook secret added to `.env`
- [ ] Test checkout completes successfully
- [ ] 3D Secure flow works
- [ ] Subscription status reflects in `/api/billing/subscription`
- [ ] Annual pricing works
- [ ] Portal session returns valid URL