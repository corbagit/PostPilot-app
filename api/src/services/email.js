import nodemailer from 'nodemailer';

let transporter = null;

/**
 * Initialize email transporter
 * Supports SMTP configuration via environment variables
 */
function initializeTransporter() {
  if (transporter) return transporter;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM_EMAIL || smtpUser;

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn('[email] SMTP credentials not configured. Email sending disabled.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort, 10),
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });

  console.log('[email] Transporter initialized');
  return transporter;
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(email, name) {
  const transport = initializeTransporter();
  if (!transport) {
    console.warn('[email] Email service not configured, skipping welcome email');
    return false;
  }

  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
      to: email,
      subject: 'Welcome to PostPilot!',
      html: `
        <h1>Welcome to PostPilot, ${name}!</h1>
        <p>Your account has been created successfully.</p>
        <p>You can now log in and start creating amazing content.</p>
        <p>Happy posting!</p>
      `
    });
    console.log('[email] Welcome email sent to', email);
    return true;
  } catch (err) {
    console.error('[email] Failed to send welcome email:', err);
    return false;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email, resetToken, resetUrl) {
  const transport = initializeTransporter();
  if (!transport) {
    console.warn('[email] Email service not configured, skipping password reset email');
    return false;
  }

  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
      to: email,
      subject: 'Reset Your PostPilot Password',
      html: `
        <h1>Password Reset Request</h1>
        <p>Click the link below to reset your password:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, ignore this email.</p>
      `
    });
    console.log('[email] Password reset email sent to', email);
    return true;
  } catch (err) {
    console.error('[email] Failed to send password reset email:', err);
    return false;
  }
}

/**
 * Send subscription confirmation email
 */
export async function sendSubscriptionEmail(email, name, tier) {
  const transport = initializeTransporter();
  if (!transport) {
    console.warn('[email] Email service not configured, skipping subscription email');
    return false;
  }

  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
      to: email,
      subject: `Welcome to PostPilot ${tier.charAt(0).toUpperCase() + tier.slice(1)}!`,
      html: `
        <h1>Subscription Confirmed</h1>
        <p>Hi ${name},</p>
        <p>Thank you for upgrading to the <strong>${tier}</strong> plan!</p>
        <p>You now have access to all premium features.</p>
        <p>Enjoy!</p>
      `
    });
    console.log('[email] Subscription email sent to', email);
    return true;
  } catch (err) {
    console.error('[email] Failed to send subscription email:', err);
    return false;
  }
}

export default {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendSubscriptionEmail
};

