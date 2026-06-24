# PostPilot PayPal Integration

PostPilot supports PayPal as a payment method alongside Stripe. This guide covers setting up PayPal subscriptions.

---

## How It Works

The PayPal integration uses **PayPal Orders v2 API** for one-time payments and subscription handling:

1. User selects a plan on the frontend
2. Backend creates a PayPal order (`POST /api/paypal/create-order`)
3. Frontend redirects user to PayPal approval URL
4. User approves payment on PayPal
5. Frontend captures the order (`POST /api/paypal/capture-order`)
6. Backend activates the subscription
7. PayPal sends webhook events for ongoing subscription management

---

## 1. Create a PayPal Developer Account

1. Go to [developer.paypal.com](https://developer.paypal.com)
2. Log in with your PayPal account (or create one)
3. You'll land in the **Dashboard**

## 2. Get API Credentials

1. In PayPal Developer Dashboard, go to **Apps & Credentials**
2. Under **REST API apps**, click **Create App**
3. Name: `PostPilot`
4. Select a **Sandbox business account** (or create one)
5. Click **Create App**
6. You'll see your **Client ID** and **Secret**

Add to `.env`:

```env
PAYPAL_CLIENT_ID=Abc123...your_client_id
PAYPAL_CLIENT_SECRET=Exy789...your_secret
PAYPAL_MODE=sandbox
```

## 3. Run Setup Script

```bash
cd api
npm run setup-paypal
```

This script:
- Verifies PayPal API connectivity
- Creates products for Starter and Pro plans
- Creates monthly billing plans
- Creates annual billing plans (2 months free)
- Outputs plan IDs

## 4. Test with Sandbox Accounts

PayPal sandbox lets you test with fake buyer accounts:

1. In PayPal Developer Dashboard, go to **Sandbox → Accounts**
2. Click **Create Account** → **Personal** (buyer account)
3. Use this account's email/password to log in during testing
4. You'll also find a **Business** account (the merchant) pre-created

## 5. Set Up Webhooks

For production, set up PayPal webhooks:

1. In PayPal Developer Dashboard, go to **Apps & Credentials**
2. Click your PostPilot app
3. Scroll to **Webhooks** section
4. Click **Add Webhook**
5. URL: `https://your-domain.com/api/paypal/webhook`
6. Select events:
   - `PAYMENT.SALE.COMPLETED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `BILLING.SUBSCRIPTION.EXPIRED`

For local development, use a webhook forwarding tool like [ngrok](https://ngrok.com) or [PayPal's webhook simulator](https://developer.paypal.com/dashboard/webhooksSimulator).

## 6. API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/paypal/plans` | List PayPal plans | No |
| GET | `/api/paypal/subscription` | Get PayPal subscription | Yes |
| POST | `/api/paypal/create-order` | Create subscription order | Yes |
| POST | `/api/paypal/capture-order` | Capture approved order | Yes |
| POST | `/api/paypal/webhook` | PayPal webhook handler | No |

## 7. Testing the Flow

```bash
# 1. Get a token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@postpilot.dev","password":"demo1234"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# 2. Check plans
curl http://localhost:3000/api/paypal/plans

# 3. Create order
curl -X POST http://localhost:3000/api/paypal/create-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"tier":"starter"}'

# 4. Check subscription status
curl http://localhost:3000/api/paypal/subscription \
  -H "Authorization: Bearer $TOKEN"
```

## 8. Mock Mode (No PayPal Required)

When `PAYPAL_CLIENT_ID` is set to the placeholder value, the PayPal integration runs in **mock mode**:

- `create-order` creates a subscription directly without calling PayPal
- `capture-order` returns success immediately
- Webhook stubs are acknowledged

This allows full development and testing without a PayPal account.

## 9. Going Live

1. In PayPal Developer Dashboard, go to **Apps & Credentials**
2. Click **Create App** → select **Live** mode
3. Get live **Client ID** and **Secret** (start with the same format)
4. Update `.env`:
   ```env
   PAYPAL_CLIENT_ID=your_live_client_id
   PAYPAL_CLIENT_SECRET=your_live_secret
   PAYPAL_MODE=live
   ```
5. Run `npm run setup-paypal` to create live products/plans
6. Set up webhooks for your production URL
7. Test with a real PayPal payment

## 10. Troubleshooting

| Problem | Solution |
|---------|----------|
| "PayPal auth failed" | Check `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` in `.env` |
| Create order fails with 400 | Sandbox may have restrictions. Check PayPal Developer Dashboard |
| Webhook events not received | Ensure webhook URL is publicly accessible |
| Mock mode still active | Replace placeholder keys with real PayPal credentials |
| "Invalid tier" error | Use "starter" or "pro" only |