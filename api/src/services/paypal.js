/**
 * PostPilot PayPal Service
 * =========================
 * Handles all PayPal REST API interactions:
 *   - OAuth2 authentication (client credentials)
 *   - Product & billing plan management
 *   - Subscription creation & management
 *   - Payment capture & webhook verification
 */

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox';
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || '';

const isConfigured = PAYPAL_CLIENT_ID &&
  PAYPAL_CLIENT_SECRET &&
  !PAYPAL_CLIENT_ID.startsWith('placeholder') &&
  PAYPAL_CLIENT_ID.length > 20;

const BASE_URL = PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

let _accessToken = null;
let _tokenExpires = 0;

/**
 * Get a PayPal OAuth2 access token (cached until expiry)
 */
async function getAccessToken() {
  if (_accessToken && Date.now() < _tokenExpires) {
    return _accessToken;
  }

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: 'grant_type=client_credentials'
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  _accessToken = data.access_token;
  _tokenExpires = Date.now() + (data.expires_in - 120) * 1000; // buffer 2 min
  return _accessToken;
}

/**
 * Make an authenticated PayPal REST API request
 */
async function apiRequest(method, path, body = null) {
  const token = await getAccessToken();
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, options);
  const text = await res.text();

  if (!res.ok) {
    let detail = text;
    try { detail = JSON.parse(text); } catch (e) { /* keep raw text */ }
    throw new Error(
      `PayPal API error (${res.status}): ${detail.message || detail.error_description || text}`
    );
  }

  try { return JSON.parse(text); } catch { return text; }
}

// ── Exported Service Methods ──────────────────────

/**
 * Check if PayPal is configured with real credentials
 */
export function isPaypalConfigured() {
  return isConfigured;
}

/**
 * Get the current mode description
 */
export function getMode() {
  return isConfigured ? PAYPAL_MODE : 'mock';
}

/**
 * Create a product in PayPal catalog
 * @param {string} name - Product name (e.g., "PostPilot Starter")
 * @param {string} description - Product description
 * @returns {Promise<object>} PayPal product object
 */
export async function createProduct(name, description) {
  return apiRequest('POST', '/v1/catalogs/products', {
    name: `PostPilot ${name}`,
    description,
    type: 'SERVICE',
    category: 'SOFTWARE'
  });
}

/**
 * Create a billing plan (subscription plan) in PayPal
 * @param {string} productId - PayPal product ID
 * @param {string} name - Plan name
 * @param {string} description - Plan description
 * @param {number} amount - Price in USD (e.g., 29 for $29)
 * @param {'MONTH'|'YEAR'} interval - Billing interval
 * @param {number} intervalCount - Interval multiplier (1 = every month/year)
 * @returns {Promise<object>} PayPal billing plan object
 */
export async function createBillingPlan(productId, name, description, amount, interval = 'MONTH', intervalCount = 1) {
  return apiRequest('POST', '/v1/billing/plans', {
    product_id: productId,
    name,
    description,
    billing_cycles: [{
      frequency: { interval_unit: interval, interval_count: intervalCount },
      tenure_type: 'REGULAR',
      sequence: 1,
      total_cycles: 0, // 0 = infinite
      pricing_scheme: {
        fixed_price: { value: amount.toFixed(2), currency_code: 'USD' }
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
}

/**
 * Create a PayPal subscription from a billing plan
 * @param {string} planId - PayPal billing plan ID
 * @param {object} subscriber - Subscriber info { name, email }
 * @param {string} returnUrl - URL to redirect after approval
 * @param {string} cancelUrl - URL to redirect if cancelled
 * @returns {Promise<object>} PayPal subscription object with approval_url
 */
export async function createSubscription(planId, subscriber, returnUrl, cancelUrl) {
  const sub = await apiRequest('POST', '/v1/billing/subscriptions', {
    plan_id: planId,
    subscriber: {
      name: { given_name: subscriber.name?.split(' ')[0] || 'User', surname: subscriber.name?.split(' ').slice(1).join(' ') || '' },
      email_address: subscriber.email
    },
    application_context: {
      brand_name: 'PostPilot',
      locale: 'en-US',
      shipping_preference: 'NO_SHIPPING',
      user_action: 'SUBSCRIBE_NOW',
      payment_method: { payer_selected: 'PAYPAL', payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED' },
      return_url: returnUrl,
      cancel_url: cancelUrl
    }
  });

  const approvalUrl = sub.links?.find(l => l.rel === 'approve')?.href;
  return { ...sub, approval_url: approvalUrl };
}

/**
 * Get subscription details from PayPal
 * @param {string} subscriptionId - PayPal subscription ID
 * @returns {Promise<object>} PayPal subscription details
 */
export async function getSubscription(subscriptionId) {
  return apiRequest('GET', `/v1/billing/subscriptions/${subscriptionId}`);
}

/**
 * Cancel a PayPal subscription
 * @param {string} subscriptionId - PayPal subscription ID
 * @param {string} reason - Cancellation reason
 */
export async function cancelSubscription(subscriptionId, reason = 'Customer requested') {
  return apiRequest('POST', `/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    reason
  });
}

/**
 * Suspend a PayPal subscription
 * @param {string} subscriptionId - PayPal subscription ID
 * @param {string} reason - Suspension reason
 */
export async function suspendSubscription(subscriptionId, reason = 'Payment failed') {
  return apiRequest('POST', `/v1/billing/subscriptions/${subscriptionId}/suspend`, {
    reason
  });
}

/**
 * Activate a PayPal subscription
 * @param {string} subscriptionId - PayPal subscription ID
 */
export async function activateSubscription(subscriptionId) {
  return apiRequest('POST', `/v1/billing/subscriptions/${subscriptionId}/activate`, {
    reason: 'Subscription approved by customer'
  });
}

/**
 * Verify a PayPal webhook signature
 * @param {object} headers - Request headers
 * @param {string} body - Raw request body
 * @returns {Promise<boolean>} Whether the signature is valid
 */
export async function verifyWebhookSignature(headers, body) {
  if (!PAYPAL_WEBHOOK_ID) {
    console.warn('[paypal] No PAYPAL_WEBHOOK_ID configured, skipping signature verification');
    return true; // Skip verification in dev
  }

  try {
    const result = await apiRequest('POST', '/v1/notifications/verify-webhook-signature', {
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: PAYPAL_WEBHOOK_ID,
      webhook_event: typeof body === 'string' ? JSON.parse(body) : body
    });
    return result.verification_status === 'SUCCESS';
  } catch (err) {
    console.error('[paypal] Webhook signature verification error:', err.message);
    return false;
  }
}

export default {
  isPaypalConfigured,
  getMode,
  createProduct,
  createBillingPlan,
  createSubscription,
  getSubscription,
  cancelSubscription,
  suspendSubscription,
  activateSubscription,
  verifyWebhookSignature
};