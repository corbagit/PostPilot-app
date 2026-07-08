/**
 * Simple in-memory rate limiting middleware.
 * Limits requests per IP address within a time window.
 */

const windows = new Map();

/**
 * Create a rate limiting middleware.
 * @param {Object} opts
 * @param {number} opts.windowMs - Time window in milliseconds (default 60_000 = 1 min)
 * @param {number} opts.maxRequests - Max requests per window (default 60)
 * @param {string} opts.message - Error message when rate limited
 */
export function rateLimit({ windowMs = 60_000, maxRequests = 60, message = 'Too many requests, please try again later.' } = {}) {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    // Clean up expired entries periodically
    if (windows.size > 10_000) {
      for (const [k, v] of windows) {
        if (now - v.start > windowMs) windows.delete(k);
      }
    }

    const entry = windows.get(key);

    if (!entry || now - entry.start > windowMs) {
      windows.set(key, { start: now, count: 1 });
      return next();
    }

    entry.count++;

    if (entry.count > maxRequests) {
      res.set('Retry-After', Math.ceil((windowMs - (now - entry.start)) / 1000));
      return res.status(429).json({ error: message });
    }

    next();
  };
}
