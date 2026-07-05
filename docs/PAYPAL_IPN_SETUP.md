# PayPal IPN Integration Guide

## Overview

This guide covers integrating PayPal IPN (Instant Payment Notifications) with PostPilot for handling subscription payments.

## What is PayPal IPN?

**Instant Payment Notification (IPN)** is PayPal's webhook system that sends real-time notifications when payment events occur:
- Subscription created/activated
- Payment received
- Payment failed
- Subscription cancelled
- Refunds issued

## Most Common Implementation

The current implementation uses **PayPal IPN** which is the most widely used approach because:

1. ✅ **Simpler Setup** - Just configure a URL in PayPal Dashboard
2. ✅ **More Events** - Catches all subscription lifecycle events
3. ✅ **Better Retry Logic** - PayPal retries failed notifications
4. ✅ **Proven Reliability** - Industry standard for 10+ years
5. ✅ **Less Code** - Form-encoded data is easier to parse than JSON webhooks

## Setup Instructions

### 1. Environment Variables

Add these to `.env.production`:

```bash
# PayPal Configuration
PAYPAL_MODE=sandbox  # or production
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret
PAYPAL_RECEIVER_EMAIL=your_business_email@paypal.com
```

### 2. Configure IPN in PayPal Dashboard

1. Log in to [PayPal Business Account](https://www.paypal.com)
2. Go to **Account Settings** → **Notifications** → **Instant Payment Notifications (IPN)**
3. Click **Update** or **Add New**
4. Set **Notification URL** to:
   ```
   https://your-domain.com/api/paypal/ipn
   ```
5. Click **Save**
6. Test by sending a sample notification

### 3. Events Handled

The IPN listener automatically processes these events:

| Event | Action |
|-------|--------|
| `subscr_signup` | Record new subscription |
| `subscr_payment` | Extend subscription period (payment received) |
| `subscr_failed` | Mark subscription as past_due |
| `subscr_cancel` | Cancel subscription |
| `subscr_eot` | End of term (mark as expired) |
| `refund` | Log refund transaction |
| `reversed` | Handle chargebacks |
| `expired` | Mark subscription as expired |

### 4. Database Schema

The IPN service automatically creates these tables:

```sql
-- IPN event logs (for debugging)
CREATE TABLE paypal_ipn_logs (
  id INTEGER PRIMARY KEY,
  txn_id TEXT,
  txn_type TEXT,
  payment_status TEXT,
  subscr_id TEXT,
  raw_data TEXT,
  received_at DATETIME
);

-- Transaction audit trail
CREATE TABLE subscription_transactions (
  id INTEGER PRIMARY KEY,
  subscription_id TEXT,
  type TEXT,
  amount REAL,
  recorded_at DATETIME
);
```

### 5. Monitoring IPN Events

View recent IPN events:

```bash
curl http://localhost:3000/api/paypal/ipn-logs
```

Returns last 50 IPN notifications with full details.

## API Endpoints

### IPN Handler (Public)
```
POST /api/paypal/ipn
```
- Receives PayPal IPN notifications
- Verifies signature with PayPal
- Processes payment events
- Always returns 200 OK

### IPN Logs (Debug)
```
GET /api/paypal/ipn-logs
```
- Returns recent IPN notifications
- Useful for debugging missed events

### Create Subscription (Authenticated)
```
POST /api/paypal/create-subscription
Body: { "tier": "starter" | "pro" }
```

### Capture Subscription (Authenticated)
```
POST /api/paypal/capture
Body: { "subscription_id": "I-XXXXX" }
```

## Testing

### Local Testing with ngrok

1. Install [ngrok](https://ngrok.com)

2. Start your API:
   ```bash
   npm run dev
   ```

3. Create tunnel:
   ```bash
   ngrok http 3000
   ```

4. Configure IPN URL in PayPal:
   ```
   https://your-ngrok-url.ngrok.io/api/paypal/ipn
   ```

5. Send test notification:
   - PayPal Dashboard → IPN Settings → Send test notification
   - Check server logs for processing

### Sandbox Testing

Use PayPal Sandbox accounts for safe testing:
1. Create sandbox accounts at [developer.paypal.com](https://developer.paypal.com)
2. Set `PAYPAL_MODE=sandbox` in `.env`
3. Test with sandbox credentials

## Troubleshooting

### IPN Not Received

1. **Check IPN URL is public**: PayPal must reach your server
   - Use ngrok for local testing
   - Ensure firewall allows HTTPS on port 443

2. **Verify signature failures**: Check server logs
   ```bash
   tail -f api.log | grep "IPN"
   ```

3. **Check PayPal Dashboard**:
   - Account Settings → Notifications
   - View IPN history for failed attempts
   - Resend manually if needed

4. **Database issues**: Verify subscriptions table exists
   ```bash
   npm run migrate
   ```

### Payment Status Not Updating

1. Check subscription ID matches:
   ```bash
   curl http://localhost:3000/api/paypal/ipn-logs | jq
   ```

2. Verify custom field contains user_id:
   - IPN data should include `custom` parameter

3. Check database subscription exists:
   ```sql
   SELECT * FROM subscriptions WHERE paypal_subscription_id = 'I-XXXXX';
   ```

## Security Best Practices

✅ **Implemented:**
- IPN signature verification with PayPal
- Receiver email validation
- HTTPS only in production
- Raw body parsing (prevents tampering)

⚠️ **Additional Security:**
- Only expose IPN endpoint (no auth needed)
- Log all transactions for audit
- Rate limit IPN endpoint if needed
- Monitor for duplicate notifications (idempotent)

## Production Checklist

- [ ] Set `PAYPAL_MODE=production`
- [ ] Use production API credentials
- [ ] Configure production IPN URL in PayPal Dashboard
- [ ] Test full payment flow (sandbox first)
- [ ] Monitor IPN logs regularly
- [ ] Set up alerts for failed payments
- [ ] Document refund process for support team
- [ ] Backup database before going live

## Alternative: PayPal Webhooks API

The code also supports the newer **Webhooks API** format at `POST /api/paypal/webhook`, but IPN is more stable.

### Key Differences:

| Feature | IPN | Webhooks |
|---------|-----|----------|
| Format | Form-encoded | JSON |
| Setup | Dashboard UI | API |
| Events | Most comprehensive | Growing |
| Reliability | Battle-tested | Newer |
| **Recommendation** | ✅ Use this | Experimental |

