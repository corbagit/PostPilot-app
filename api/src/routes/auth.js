import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';
import { authMiddleware, generateToken } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const db = getDb();

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, subscription_tier, subscription_status)
      VALUES (?, ?, ?, ?, 'free', 'active')
    `).run(id, email, passwordHash, name);

    const user = db.prepare('SELECT id, email, name, subscription_tier, subscription_status, created_at FROM users WHERE id = ?').get(id);

    const token = generateToken(user);

    res.status(201).json({
      user,
      token
    });
  } catch (err) {
    console.error('[auth] Signup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Don't send password hash
    const { password_hash, ...safeUser } = user;
    const token = generateToken(user);

    res.json({
      user: safeUser,
      token
    });
  } catch (err) {
    console.error('[auth] Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, email, name, avatar_url, subscription_tier, subscription_status, posts_generated, stripe_customer_id, created_at, updated_at FROM users WHERE id = ?').get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user });
});

// PUT /api/auth/profile
router.put('/profile', authMiddleware, (req, res) => {
  const db = getDb();
  const { name, avatar_url } = req.body;

  const updates = [];
  const params = [];

  if (name) {
    updates.push('name = ?');
    params.push(name);
  }
  if (avatar_url !== undefined) {
    updates.push('avatar_url = ?');
    params.push(avatar_url);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  updates.push("updated_at = datetime('now')");
  params.push(req.user.id);

  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const user = db.prepare('SELECT id, email, name, avatar_url, subscription_tier, subscription_status, posts_generated, created_at, updated_at FROM users WHERE id = ?').get(req.user.id);

  res.json({ user });
});

export default router;