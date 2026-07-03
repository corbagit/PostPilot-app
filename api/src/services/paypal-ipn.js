/**
 * PayPal IPN Service
 * ==================
 * Handles Instant Payment Notifications from PayPal
 * - Verifies webhook authenticity
 * - Processes payment events
 * - Updates subscription status
 * - Handles retries and error logging
 */

import https from 'https';
import { getDb } from '../db/connection.js';

const PAYPAL_IPN_URL = process.env.PAYPAL_MODE === 'production'
  ? 'https://www.paypal.com/cgi-bin/webscr'
  : 'https://www.sandbox.paypal.com/cgi-bin/webscr';

/**
 * Verify PayPal IPN signature
 * Sends the notification back to PayPal to confirm authenticity
 */
export async function verifyIPNSignature(postData) {
  return new Promise((resolve, reject) => {
    const verifyData = `cmd=_notify-validate&${postData}`;

    const options = {
      hostname: process.env.PAYPAL_MODE === 'production' ? 'www.paypal.com' : 'www.sandbox.paypal.com',
      path: '/cgi-bin/webscr',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': verifyData.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        if (body === 'VERIFIED') {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.error('[paypal-ipn] Verification request error:', err);
      resolve(false);
    });

    req.write(verifyData);
    req.end();
  });
}

/**
 * Parse IPN data from request body
 * Converts form-urlencoded data to object
 */
export function parseIPNData(body) {
  const params = new URLSearchParams(body);
  const data = {};
  for (const [key, value] of params.entries()) {
    data[key] = value;
  }
  return data;
}

/**
 * Process IPN event and update database
 * Most common implementation handles: completed, refunded, failed, denied
 */
export async function processIPNEvent(ipnData) {
  const db = getDb();
  const {
    txn_id,
    txn_type,
    payment_status,
    receiver_email,
    mc_gross,
    mc_currency,
    custom,
    subscr_id,
    subscr_date,
    item_name,
    payer_email,
    first_name,
    last_name,
    invoice,
    business,
    parent_txn_id
  } = ipnData;

  console.log(`[paypal-ipn] Processing event: ${txn_type} (status: ${payment_status})`);

  // Log IPN event for debugging
  logIPNEvent(ipnData);

  try {
    // Verify receiver email matches our PayPal account
    if (business && business !== process.env.PAYPAL_RECEIVER_EMAIL) {
      console.warn('[paypal-ipn] Receiver email mismatch:', business);
      return { success: false, error: 'Receiver email mismatch' };
    }

    // Handle different transaction types
    switch (txn_type) {
      case 'subscr_signup':
        return handleSubscrSignup(ipnData, db);

      case 'subscr_payment':
        return handleSubscrPayment(ipnData, db);

      case 'subscr_failed':
        return handleSubscrFailed(ipnData, db);

      case 'subscr_cancel':
        return handleSubscrCancel(ipnData, db);

      case 'subscr_eot': // End of term
        return handleSubscrEOT(ipnData, db);

      case 'web_accept': // Recurring payment profile created
        return handleWebAccept(ipnData, db);

      case 'recurring':
        return handleRecurring(ipnData, db);

      case 'refund':
        return handleRefund(ipnData, db);

      case 'reversed':
        return handleReversed(ipnData, db);

      case 'expired':
        return handleExpired(ipnData, db);

      default:
        console.log(`[paypal-ipn] Unhandled txn_type: ${txn_type}`);
        return { success: true, handled: false };
    }
  } catch (err) {
    console.error('[paypal-ipn] Error processing event:', err);
    throw err;
  }
}

/**
 * Handle subscription signup
 * Called when subscription is first created
 */
function handleSubscrSignup(data, db) {
  const { subscr_id, payer_email, custom, subscr_date } = data;

  console.log(`[paypal-ipn] Subscription signup: ${subscr_id}`);

  // Find subscription by custom field (usually user_id or subscription_id)
  const sub = db.prepare(
    'SELECT * FROM subscriptions WHERE paypal_subscription_id = ? OR id = ?'
  ).get(subscr_id, custom);

  if (sub) {
    db.prepare(`
      UPDATE subscriptions
      SET paypal_subscription_id = ?, status = 'pending', updated_at = datetime('now')
      WHERE id = ?
    `).run(subscr_id, sub.id);

    console.log(`[paypal-ipn] Updated subscription: ${sub.id}`);
  }

  return { success: true, type: 'subscr_signup' };
}

/**
 * Handle successful subscription payment
 * Called when a recurring payment is successfully processed
 */
function handleSubscrPayment(data, db) {
  const { subscr_id, payment_status, mc_gross, payer_email } = data;

  // Only process completed payments
  if (payment_status !== 'Completed') {
    console.log(`[paypal-ipn] Skipping subscription payment with status: ${payment_status}`);
    return { success: true, type: 'subscr_payment', skipped: true };
  }

  console.log(`[paypal-ipn] Subscription payment received: ${subscr_id} - $${mc_gross}`);

  const sub = db.prepare(
    'SELECT * FROM subscriptions WHERE paypal_subscription_id = ?'
  ).get(subscr_id);

  if (sub) {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);

    db.prepare(`
      UPDATE subscriptions
      SET status = 'active', current_period_start = ?, current_period_end = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(now.toISOString(), endDate.toISOString(), sub.id);

    // Update user subscription status
    db.prepare(
      "UPDATE users SET subscription_status = 'active', updated_at = datetime('now') WHERE id = ?"
    ).run(sub.user_id);

    logTransaction(db, sub.id, 'payment_received', mc_gross);
    console.log(`[paypal-ipn] Subscription activated: ${sub.id}`);
  }

  return { success: true, type: 'subscr_payment' };
}

/**
 * Handle failed subscription payment
 */
function handleSubscrFailed(data, db) {
  const { subscr_id, payer_email } = data;

  console.log(`[paypal-ipn] Subscription payment failed: ${subscr_id}`);

  const sub = db.prepare(
    'SELECT * FROM subscriptions WHERE paypal_subscription_id = ?'
  ).get(subscr_id);

  if (sub) {
    db.prepare(`
      UPDATE subscriptions
      SET status = 'past_due', updated_at = datetime('now')
      WHERE id = ?
    `).run(sub.id);

    db.prepare(
      "UPDATE users SET subscription_status = 'past_due', updated_at = datetime('now') WHERE id = ?"
    ).run(sub.user_id);

    logTransaction(db, sub.id, 'payment_failed', 0);
  }

  return { success: true, type: 'subscr_failed' };
}

/**
 * Handle subscription cancellation by user
 */
function handleSubscrCancel(data, db) {
  const { subscr_id, payer_email } = data;

  console.log(`[paypal-ipn] Subscription cancelled: ${subscr_id}`);

  const sub = db.prepare(
    'SELECT * FROM subscriptions WHERE paypal_subscription_id = ?'
  ).get(subscr_id);

  if (sub) {
    db.prepare(`
      UPDATE subscriptions
      SET status = 'canceled', cancel_at_period_end = 1, updated_at = datetime('now')
      WHERE id = ?
    `).run(sub.id);

    db.prepare(
      "UPDATE users SET subscription_tier = 'free', subscription_status = 'inactive', updated_at = datetime('now') WHERE id = ?"
    ).run(sub.user_id);

    logTransaction(db, sub.id, 'canceled', 0);
  }

  return { success: true, type: 'subscr_cancel' };
}

/**
 * Handle subscription end of term
 */
function handleSubscrEOT(data, db) {
  const { subscr_id } = data;

  console.log(`[paypal-ipn] Subscription end of term: ${subscr_id}`);

  const sub = db.prepare(
    'SELECT * FROM subscriptions WHERE paypal_subscription_id = ?'
  ).get(subscr_id);

  if (sub) {
    db.prepare(`
      UPDATE subscriptions
      SET status = 'expired', updated_at = datetime('now')
      WHERE id = ?
    `).run(sub.id);

    db.prepare(
      "UPDATE users SET subscription_status = 'expired', subscription_tier = 'free', updated_at = datetime('now') WHERE id = ?"
    ).run(sub.user_id);

    logTransaction(db, sub.id, 'expired', 0);
  }

  return { success: true, type: 'subscr_eot' };
}

/**
 * Handle web accept (recurring payment profile created)
 */
function handleWebAccept(data, db) {
  const { item_number, txn_id, payer_email } = data;

  console.log(`[paypal-ipn] Web accept (recurring created): ${txn_id}`);
  return { success: true, type: 'web_accept' };
}

/**
 * Handle recurring payment (less common, but support it)
 */
function handleRecurring(data, db) {
  const { txn_id, payment_status, mc_gross, parent_txn_id } = data;

  if (payment_status !== 'Completed') {
    return { success: true, type: 'recurring', skipped: true };
  }

  console.log(`[paypal-ipn] Recurring payment: ${txn_id} - $${mc_gross}`);
  return { success: true, type: 'recurring' };
}

/**
 * Handle refund
 */
function handleRefund(data, db) {
  const { txn_id, parent_txn_id, mc_gross, reason_code } = data;

  console.log(`[paypal-ipn] Refund issued: ${txn_id} (parent: ${parent_txn_id})`);

  // Find subscription by original transaction
  const sub = db.prepare(
    'SELECT * FROM subscriptions WHERE paypal_subscription_id = ?'
  ).get(parent_txn_id);

  if (sub) {
    logTransaction(db, sub.id, 'refunded', Math.abs(mc_gross));
  }

  return { success: true, type: 'refund' };
}

/**
 * Handle payment reversal (chargeback, etc.)
 */
function handleReversed(data, db) {
  const { txn_id, parent_txn_id, reason_code } = data;

  console.log(`[paypal-ipn] Payment reversed: ${txn_id} (reason: ${reason_code})`);

  const sub = db.prepare(
    'SELECT * FROM subscriptions WHERE paypal_subscription_id = ?'
  ).get(parent_txn_id);

  if (sub) {
    db.prepare(`
      UPDATE subscriptions
      SET status = 'past_due', updated_at = datetime('now')
      WHERE id = ?
    `).run(sub.id);

    logTransaction(db, sub.id, 'reversed', 0);
  }

  return { success: true, type: 'reversed' };
}

/**
 * Handle subscription expiration
 */
function handleExpired(data, db) {
  const { subscr_id } = data;

  console.log(`[paypal-ipn] Subscription expired: ${subscr_id}`);

  const sub = db.prepare(
    'SELECT * FROM subscriptions WHERE paypal_subscription_id = ?'
  ).get(subscr_id);

  if (sub) {
    db.prepare(`
      UPDATE subscriptions
      SET status = 'expired', updated_at = datetime('now')
      WHERE id = ?
    `).run(sub.id);

    db.prepare(
      "UPDATE users SET subscription_status = 'expired', subscription_tier = 'free', updated_at = datetime('now') WHERE id = ?"
    ).run(sub.user_id);
  }

  return { success: true, type: 'expired' };
}

/**
 * Log IPN event for debugging and auditing
 */
function logIPNEvent(data) {
  try {
    const db = getDb();
    
    // Create logs table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS paypal_ipn_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        txn_id TEXT,
        txn_type TEXT,
        payment_status TEXT,
        subscr_id TEXT,
        raw_data TEXT,
        received_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.prepare(`
      INSERT INTO paypal_ipn_logs (txn_id, txn_type, payment_status, subscr_id, raw_data)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      data.txn_id || null,
      data.txn_type || null,
      data.payment_status || null,
      data.subscr_id || null,
      JSON.stringify(data)
    );
  } catch (err) {
    console.error('[paypal-ipn] Error logging event:', err);
  }
}

/**
 * Log transaction for audit trail
 */
function logTransaction(db, subscriptionId, type, amount) {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS subscription_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subscription_id TEXT,
        type TEXT,
        amount REAL,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(subscription_id) REFERENCES subscriptions(id)
      )
    `);

    db.prepare(`
      INSERT INTO subscription_transactions (subscription_id, type, amount)
      VALUES (?, ?, ?)
    `).run(subscriptionId, type, amount);
  } catch (err) {
    console.error('[paypal-ipn] Error logging transaction:', err);
  }
}

/**
 * Get IPN event logs (for debugging/support)
 */
export function getIPNLogs(limit = 50) {
  try {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM paypal_ipn_logs
      ORDER BY received_at DESC
      LIMIT ?
    `).all(limit);
  } catch (err) {
    console.error('[paypal-ipn] Error fetching logs:', err);
    return [];
  }
}

export default {
  verifyIPNSignature,
  parseIPNData,
  processIPNEvent,
  getIPNLogs
};
