/**
 * Input validation utilities for PostPilot API.
 * Provides reusable validators for common field types.
 */

/**
 * Validate email format.
 */
export function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate password strength (min 6 chars).
 */
export function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 6;
}

/**
 * Validate a non-empty string field.
 */
export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate that a value is one of the allowed options.
 */
export function isOneOf(value, allowed) {
  return allowed.includes(value);
}

/**
 * Validate platform value.
 */
export function isValidPlatform(platform) {
  return isOneOf(platform, ['instagram', 'linkedin', 'twitter']);
}

/**
 * Validate post status value.
 */
export function isValidPostStatus(status) {
  return isOneOf(status, ['draft', 'published', 'archived']);
}

/**
 * Validate subscription tier.
 */
export function isValidTier(tier) {
  return isOneOf(tier, ['free', 'starter', 'pro']);
}

/**
 * Validate UUID format.
 */
export function isValidUUID(id) {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Sanitize a string by trimming and removing null bytes.
 */
export function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/\0/g, '');
}

/**
 * Validate and sanitize signup input.
 */
export function validateSignup({ email, password, name }) {
  const errors = [];

  if (!email || !isValidEmail(email)) {
    errors.push('Valid email is required');
  }
  if (!password || !isValidPassword(password)) {
    errors.push('Password must be at least 6 characters');
  }
  if (!name || !isNonEmptyString(name)) {
    errors.push('Name is required');
  }
  if (name && name.length > 100) {
    errors.push('Name must be 100 characters or less');
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: {
      email: sanitize(email || '').toLowerCase(),
      password,
      name: sanitize(name || '')
    }
  };
}

/**
 * Validate and sanitize login input.
 */
export function validateLogin({ email, password }) {
  const errors = [];

  if (!email || !isValidEmail(email)) {
    errors.push('Valid email is required');
  }
  if (!password) {
    errors.push('Password is required');
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: {
      email: sanitize(email || '').toLowerCase(),
      password
    }
  };
}
