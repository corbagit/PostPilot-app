import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { generateContent, generateCaption, generateHashtags } from '../services/contentGenerator.js';

const router = Router();

// Monthly post limits by tier
const MONTHLY_LIMITS = { free: 3, starter: 10, pro: 30 };

/**
 * Get current month string (YYYY-MM format).
 */
function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get or create the usage record for the current month.
 * Returns the posts_generated count for this month.
 */
function getMonthlyUsage(db, userId) {
  const month = getCurrentMonth();
  let row = db.prepare('SELECT * FROM usage_months WHERE user_id = ? AND month = ?').get(userId, month);
  if (!row) {
    const id = uuidv4();
    db.prepare('INSERT INTO usage_months (id, user_id, month, posts_generated) VALUES (?, ?, ?, 0)').run(id, userId, month);
    row = { id, user_id: userId, month, posts_generated: 0 };
  }
  return row;
}

/**
 * Increment the monthly usage counter. Also increments the legacy posts_generated on users table.
 */
function incrementUsage(db, userId) {
  const month = getCurrentMonth();
  db.prepare(`
    INSERT INTO usage_months (id, user_id, month, posts_generated)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(user_id, month) DO UPDATE SET
      posts_generated = posts_generated + 1,
      updated_at = datetime('now')
  `).run(uuidv4(), userId, month);
  // Also keep legacy counter in sync
  db.prepare("UPDATE users SET posts_generated = posts_generated + 1, updated_at = datetime('now') WHERE id = ?").run(userId);
}

// All post routes require auth
router.use(authMiddleware);

// GET /api/posts — list user's posts
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { platform, status, limit = 20, offset = 0 } = req.query;

    let sql = 'SELECT * FROM posts WHERE user_id = ?';
    const params = [req.user.id];

    if (platform) {
      sql += ' AND platform = ?';
      params.push(platform);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const posts = db.prepare(sql).all(...params);
    const total = db.prepare('SELECT COUNT(*) as count FROM posts WHERE user_id = ?').get(req.user.id).count;

    res.json({ posts, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (err) {
    console.error('[posts] List error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/posts/usage — get current monthly usage and limits
router.get('/usage', (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT subscription_tier FROM users WHERE id = ?').get(req.user.id);
    const tier = user?.subscription_tier || 'free';
    const monthlyLimit = MONTHLY_LIMITS[tier] || MONTHLY_LIMITS.free;
    const usage = getMonthlyUsage(db, req.user.id);

    res.json({
      tier,
      posts_generated: usage.posts_generated,
      monthly_limit: monthlyLimit,
      remaining: Math.max(0, monthlyLimit - usage.posts_generated),
      month: usage.month
    });
  } catch (err) {
    console.error('[posts] Usage error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/posts/:id
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const post = db.prepare('SELECT * FROM posts WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ post });
  } catch (err) {
    console.error('[posts] Get error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/posts — create a single post
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { seed_idea, platform, content, caption, hashtags, image_url, status = 'draft', scheduled_date } = req.body;

    if (!seed_idea || !platform || !content) {
      return res.status(400).json({ error: 'seed_idea, platform, and content are required' });
    }

    if (!['instagram', 'linkedin', 'twitter'].includes(platform)) {
      return res.status(400).json({ error: 'Platform must be instagram, linkedin, or twitter' });
    }

    if (!['draft', 'published', 'archived'].includes(status)) {
      return res.status(400).json({ error: 'Status must be draft, published, or archived' });
    }

    const id = uuidv4();

    db.prepare(`
      INSERT INTO posts (id, user_id, seed_idea, platform, content, caption, hashtags, image_url, status, scheduled_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, seed_idea, platform, content, caption || null, hashtags ? JSON.stringify(hashtags) : null, image_url || null, status, scheduled_date || null);

    // Increment usage counter
    incrementUsage(db, req.user.id);

    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
    res.status(201).json({ post });
  } catch (err) {
    console.error('[posts] Create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/posts/:id — full update of a post
router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM posts WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);

    if (!existing) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const { content, caption, hashtags, image_url, status, scheduled_date } = req.body;
    const updates = [];
    const params = [];

    if (content !== undefined) { updates.push('content = ?'); params.push(content); }
    if (caption !== undefined) { updates.push('caption = ?'); params.push(caption); }
    if (hashtags !== undefined) { updates.push('hashtags = ?'); params.push(JSON.stringify(hashtags)); }
    if (image_url !== undefined) { updates.push('image_url = ?'); params.push(image_url); }
    if (status !== undefined) {
      if (!['draft', 'published', 'archived'].includes(status)) {
        return res.status(400).json({ error: 'Status must be draft, published, or archived' });
      }
      updates.push('status = ?');
      params.push(status);
    }
    if (scheduled_date !== undefined) { updates.push('scheduled_date = ?'); params.push(scheduled_date); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Set published_at when status changes to published
    if (status === 'published' && existing.status !== 'published') {
      updates.push("published_at = datetime('now')");
    }

    updates.push("updated_at = datetime('now')");
    params.push(req.params.id, req.user.id);

    db.prepare(`UPDATE posts SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);

    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    res.json({ post });
  } catch (err) {
    console.error('[posts] Update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/posts/:id — partial update (alias for PUT, frontend compatibility)
router.patch('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM posts WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);

    if (!existing) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const { content, caption, hashtags, image_url, status, scheduled_date } = req.body;
    const updates = [];
    const params = [];

    if (content !== undefined) { updates.push('content = ?'); params.push(content); }
    if (caption !== undefined) { updates.push('caption = ?'); params.push(caption); }
    if (hashtags !== undefined) { updates.push('hashtags = ?'); params.push(JSON.stringify(hashtags)); }
    if (image_url !== undefined) { updates.push('image_url = ?'); params.push(image_url); }
    if (status !== undefined) {
      if (!['draft', 'published', 'archived'].includes(status)) {
        return res.status(400).json({ error: 'Status must be draft, published, or archived' });
      }
      updates.push('status = ?');
      params.push(status);
    }
    if (scheduled_date !== undefined) { updates.push('scheduled_date = ?'); params.push(scheduled_date); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Set published_at when status changes to published
    if (status === 'published' && existing.status !== 'published') {
      updates.push("published_at = datetime('now')");
    }

    updates.push("updated_at = datetime('now')");
    params.push(req.params.id, req.user.id);

    db.prepare(`UPDATE posts SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);

    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    res.json({ post });
  } catch (err) {
    console.error('[posts] Patch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/posts/:id
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM posts WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ message: 'Post deleted' });
  } catch (err) {
    console.error('[posts] Delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/posts/generate — generate a content pack from a seed idea
router.post('/generate', (req, res) => {
  try {
    const db = getDb();
    const { seed_idea, platforms = ['instagram', 'linkedin', 'twitter'] } = req.body;

    if (!seed_idea) {
      return res.status(400).json({ error: 'seed_idea is required' });
    }

    if (seed_idea.length > 500) {
      return res.status(400).json({ error: 'seed_idea must be 500 characters or less' });
    }

    // Check monthly usage limits
    const user = db.prepare('SELECT subscription_tier FROM users WHERE id = ?').get(req.user.id);
    const tier = user?.subscription_tier || 'free';
    const monthlyLimit = MONTHLY_LIMITS[tier] || MONTHLY_LIMITS.free;
    const usage = getMonthlyUsage(db, req.user.id);

    if (usage.posts_generated >= monthlyLimit) {
      return res.status(403).json({
        error: `Monthly post limit reached (${monthlyLimit} posts for ${tier} plan). Upgrade your plan to generate more.`,
        posts_generated: usage.posts_generated,
        monthly_limit: monthlyLimit
      });
    }

    const platformsToUse = platforms.filter(p => ['instagram', 'linkedin', 'twitter'].includes(p));

    // Check that generating all platforms won't exceed limit
    const totalAfter = usage.posts_generated + platformsToUse.length;
    const platformsToGenerate = totalAfter > monthlyLimit
      ? platformsToUse.slice(0, monthlyLimit - usage.posts_generated)
      : platformsToUse;

    if (platformsToGenerate.length === 0) {
      return res.status(403).json({
        error: `Monthly post limit reached (${monthlyLimit} posts for ${tier} plan).`,
        posts_generated: usage.posts_generated,
        monthly_limit: monthlyLimit
      });
    }

    const generatedPosts = [];

    for (const platform of platformsToGenerate) {
      const id = uuidv4();
      const content = generateContent(seed_idea, platform);
      const caption = generateCaption(seed_idea, platform);
      const hashtags = generateHashtags(seed_idea, platform);

      db.prepare(`
        INSERT INTO posts (id, user_id, seed_idea, platform, content, caption, hashtags, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')
      `).run(id, req.user.id, seed_idea, platform, content, caption, hashtags);

      // Increment usage counter
      incrementUsage(db, req.user.id);

      const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
      generatedPosts.push(post);
    }

    // Get updated usage
    const updatedUsage = getMonthlyUsage(db, req.user.id);

    res.status(201).json({
      posts: generatedPosts,
      usage: {
        posts_generated: updatedUsage.posts_generated,
        monthly_limit: monthlyLimit,
        remaining: Math.max(0, monthlyLimit - updatedUsage.posts_generated)
      }
    });
  } catch (err) {
    console.error('[posts] Generate error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
