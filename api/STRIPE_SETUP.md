# PostPilot Stripe Billing Setup

This guide walks through setting up Stripe subscriptions for PostPilot — from creating a Stripe account to configuring webhooks.

---

## 1. Create a Stripe Account

1. Go to [dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Sign up (no credit card required for test mode)
3. Verify your email

## 2. Get Your API Keys

1. In the Stripe Dashboard, go to **Developers → API Keys**
2. Copy the **Publishable key** (starts with `pk_test_`)
3. Copy the **Secret key** (starts with `sk_test_`)
4. Add them to your `.env` file:

```env
STRIPE_SECRET_KEY=sk_test_your_test_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_test_publishable_key
```

> ⚠️ Never commit your secret key to version control. Use `.env` files or environment variables.

## 3. Create Products & Prices (Automated)

Run the setup script:

```bash
cd api
node scripts/setup-stripe.js
```

This script will:
  - Create the **Starter** product ($29/month, $290/year — 2 months free)
  - Create the **Pro** product ($59/month, $590/year — 2 months free)
  - Create monthly and annual prices for each
  - Output the price IDs to add to your `.env`

**Manual alternative:** Create products/prices in the Stripe Dashboard:
1. Go to **Products → Add Product**
2. Create two products:

| Product | Monthly Price | Annual Price | Metadata |
|---------|--------------|--------------|----------|
| **Starter** | $29.00 | $290.00 | `app_id: postpilot`, `plan_id: starter` |
| **Pro** | $59.00 | $590.00 | `app_id: postpilot`, `plan_id: pro` |

3. Copy the Price IDs (starts with `price_`) and add to `.env`:

```env
STRIPE_PRICE_STARTER=price_xxxxxxxxxxxxx
STRIPE_PRICE_PRO=price_xxxxxxxxxxxxx
```

## 4. Configure the Webhook

Stripe sends webhook events when subscriptions are created, updated, or canceled. The PostPilot API processes these at `POST /api/billing/webhook`.

### For local development (Stripe CLI):

1. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli):
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe

   # Linux
   curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
   echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli/debian ./" | sudo tee /etc/apt/sources.list.d/stripe-cli.list
   sudo apt update && sudo apt install stripe
   ```

2. Login and forward events:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/billing/webhook
   ```

3. Copy the **webhook signing secret** (`whsec_...`) shown by the CLI and add to `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

### For production:

1. In Stripe Dashboard, go to **Developers → Webhooks → Add endpoint**
2. Set the endpoint URL to: `https://your-domain.com/api/billing/webhook`
3. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the **Signing secret** (`whsec_...`) and add to your production `.env`

## 5. Configure the Customer Portal

The customer portal lets users manage their subscriptions (upgrade, downgrade, cancel).

1. In Stripe Dashboard, go to **Settings → Customer Portal**
2. Configure:
   - **Allowed subscription changes**: Allow upgrades, downgrades, and cancellations
   - **Return URL**: `https://your-domain.com/dashboard`
3. The API endpoint `POST /api/billing/create-portal-session` will redirect users there

## 6. Test the Flow

### Start the server:
```bash
cd api
npm start
```

### Create a test checkout:
```bash
# Get a token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Create checkout session
curl -s -X POST http://localhost:3000/api/billing/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"tier":"starter"}' | python3 -m json.tool
```

### Use Stripe test cards:
| Card Number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | Success |
| `4000 0025 0000 3155` | Requires 3D Secure |
| `4000 0000 0000 0002` | Declined |

## 7. Go Live

1. In Stripe Dashboard, toggle **"Viewing test data" → "Viewing live data"**
2. Complete Stripe's [activation checklist](https://dashboard.stripe.com/account/onboarding)
3. Get **live** API keys and price IDs
4. Update your production `.env` with live keys
5. Test the full flow with real cards ($1 test charges)
6. Set up the production webhook endpoint

## 8. Verify the Setup

```bash
# Health check
curl http://localhost:3000/api/health

# Check plans are available (no auth required)
curl http://localhost:3000/api/billing/plans

# After subscribing, check status
curl http://localhost:3000/api/billing/subscription \
  -H "Authorization: Bearer $TOKEN"
```

## Environment Variables Reference

```env
# ── Stripe ──────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_...          # Secret key from Stripe Dashboard
STRIPE_PUBLISHABLE_KEY=pk_test_...     # Publishable key for frontend
STRIPE_WEBHOOK_SECRET=whsec_...        # Webhook signing secret

# ── Price IDs (output from setup script) ────────────
STRIPE_PRICE_STARTER=price_...         # Monthly price ID for Starter plan
STRIPE_PRICE_PRO=price_...             # Monthly price ID for Pro plan

# Optional: annual prices
STRIPE_PRICE_STARTER_ANNUAL=price_...  # Annual price ID for Starter plan
STRIPE_PRICE_PRO_ANNUAL=price_...      # Annual price ID for Pro plan
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `No such price` | The price ID in `.env` doesn't exist. Run `node scripts/setup-stripe.js` to create it. |
| Webhook signature verification failed | The `STRIPE_WEBHOOK_SECRET` is wrong. Get the correct one from `stripe listen` or the Dashboard. |
| Checkout returns 500 | Check the server logs. Ensure `STRIPE_SECRET_KEY` is set correctly. |
| Subscription not activated after payment | Check webhook delivery logs in Stripe Dashboard. Ensure the webhook endpoint is reachable. |
| Mock mode still active | Set a real `STRIPE_SECRET_KEY` (not `sk_test_placeholder`) in `.env`. |