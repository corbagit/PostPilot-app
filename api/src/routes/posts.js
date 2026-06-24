import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// All post routes require auth
router.use(authMiddleware);

// GET /api/posts — list user's posts
router.get('/', (req, res) => {
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
});

// GET /api/posts/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const post = db.prepare('SELECT * FROM posts WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);

  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  res.json({ post });
});

// POST /api/posts — create a post
router.post('/', (req, res) => {
  const db = getDb();
  const { seed_idea, platform, content, caption, hashtags, image_url, status = 'draft', scheduled_date } = req.body;

  if (!seed_idea || !platform || !content) {
    return res.status(400).json({ error: 'seed_idea, platform, and content are required' });
  }

  if (!['instagram', 'linkedin', 'twitter'].includes(platform)) {
    return res.status(400).json({ error: 'Platform must be instagram, linkedin, or twitter' });
  }

  const id = uuidv4();

  db.prepare(`
    INSERT INTO posts (id, user_id, seed_idea, platform, content, caption, hashtags, image_url, status, scheduled_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.user.id, seed_idea, platform, content, caption || null, hashtags ? JSON.stringify(hashtags) : null, image_url || null, status, scheduled_date || null);

  // Increment posts_generated counter
  db.prepare("UPDATE users SET posts_generated = posts_generated + 1, updated_at = datetime('now') WHERE id = ?").run(req.user.id);

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
  res.status(201).json({ post });
});

// PUT /api/posts/:id — update a post
router.put('/:id', (req, res) => {
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
  if (status !== undefined) { updates.push('status = ?'); params.push(status); }
  if (scheduled_date !== undefined) { updates.push('scheduled_date = ?'); params.push(scheduled_date); }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  updates.push("updated_at = datetime('now')");
  params.push(req.params.id, req.user.id);

  db.prepare(`UPDATE posts SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  res.json({ post });
});

// DELETE /api/posts/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM posts WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Post not found' });
  }

  res.json({ message: 'Post deleted' });
});

// POST /api/posts/generate — generate a content pack from a seed idea
router.post('/generate', (req, res) => {
  const db = getDb();
  const { seed_idea, platforms = ['instagram', 'linkedin', 'twitter'] } = req.body;

  if (!seed_idea) {
    return res.status(400).json({ error: 'seed_idea is required' });
  }

  // Check usage limits
  const user = db.prepare('SELECT subscription_tier, posts_generated FROM users WHERE id = ?').get(req.user.id);
  const monthlyLimit = user.subscription_tier === 'pro' ? 30 : user.subscription_tier === 'starter' ? 10 : 3;

  if (user.posts_generated >= monthlyLimit) {
    return res.status(403).json({ error: `Monthly post limit reached (${monthlyLimit}). Upgrade your plan to generate more.` });
  }

  const generatedPosts = [];
  const platformsToUse = platforms.filter(p => ['instagram', 'linkedin', 'twitter'].includes(p));

  for (const platform of platformsToUse) {
    const id = uuidv4();
    const post = {
      id,
      user_id: req.user.id,
      seed_idea,
      platform,
      content: generateContent(seed_idea, platform),
      caption: generateCaption(seed_idea, platform),
      hashtags: generateHashtags(seed_idea, platform),
      status: 'draft',
      created_at: new Date().toISOString().replace('T', ' ').split('.')[0]
    };

    db.prepare(`
      INSERT INTO posts (id, user_id, seed_idea, platform, content, caption, hashtags, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')
    `).run(post.id, post.user_id, seed_idea, post.platform, post.content, post.caption, post.hashtags);

    db.prepare("UPDATE users SET posts_generated = posts_generated + 1, updated_at = datetime('now') WHERE id = ?").run(req.user.id);

    generatedPosts.push(post);
  }

  res.status(201).json({ posts: generatedPosts });
});

// Simple content generation template
function generateContent(seed, platform) {
  const templates = {
    instagram: `✨ **${seed}**\n\nHere's what you need to know about ${seed.toLowerCase()}...\n\n1. Start with the why\n2. Break it down step by step\n3. Apply it to your daily routine\n4. Track your progress\n5. Share your results\n\nSave this for later! 📌`,
    linkedin: `**${seed}**\n\nI've been thinking about this a lot lately.\n\nHere's what I've learned:\n\n→ Most people overlook the basics\n→ Consistency beats intensity every time\n→ The real value is in the execution\n\nWhat's your take on this? Drop your thoughts below 👇`,
    twitter: `${seed}\n\n1. Start small\n2. Stay consistent\n3. Track progress\n4. Adjust as needed\n5. Share results\n\nSimple but effective. 🧵`
  };
  return templates[platform] || templates.instagram;
}

function generateCaption(seed, platform) {
  const captions = {
    instagram: `${seed} — the strategy that changed everything for me. Swipe through to learn how you can apply it too! Which step resonates most with you? Let me know in the comments! 👇`,
    linkedin: `Here's my take on ${seed.toLowerCase()}. I'd love to hear your perspective — drop a comment or DM me.`,
    twitter: `${seed}. A quick thread on what actually works.`
  };
  return captions[platform] || '';
}

function generateHashtags(seed, platform) {
  const baseTags = ['postpilot', 'contentcreation', 'socialmediamarketing'];
  const platformTags = {
    instagram: ['digitalmarketing', 'growth', 'productivity', 'smallbusinesstips', 'contentstrategy', 'marketingtips', 'socialmediatips', 'entrepreneurlife'],
    linkedin: ['productivity', 'growth', 'contentstrategy', 'marketing'],
    twitter: ['productivity', 'growth']
  };
  const tags = [...baseTags, ...(platformTags[platform] || [])];
  return JSON.stringify(tags);
}

export default router;