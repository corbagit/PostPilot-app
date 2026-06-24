#!/usr/bin/env node

/**
 * PostPilot Demo Seed Script
 * ===========================
 * Creates a demo user with sample posts so the app feels alive.
 *
 * Usage:
 *   node scripts/seed-demo.js
 *
 * What it creates:
 *   - Demo user: demo@postpilot.dev / password: demo1234
 *   - Pro subscription (active, 1 month)
 *   - Sample posts for Instagram, LinkedIn, Twitter
 *   - Content packs with different seed ideas
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb, closeDb } from '../src/db/connection.js';
import { runMigrations } from '../src/db/migrate.js';

// ── Configuration ─────────────────────────────────────
const DEMO_USER = {
  email: 'demo@postpilot.dev',
  password: 'demo1234',
  name: 'Sarah Chen',
  tier: 'pro',
  status: 'active'
};

const SEED_IDEAS = [
  {
    idea: 'Time-blocking for deep work',
    platforms: ['instagram', 'linkedin', 'twitter'],
    posts: [
      {
        platform: 'instagram',
        content: `✨ **Time-blocking transformed my productivity**

Here's my system for deep work:

🧠 **Morning Block (8-11am)**
Creative work. No meetings. No email.
This is when I write, design, and strategize.

📋 **Afternoon Block (1-3pm)**
Deep admin. Planning, email batching, client follow-ups.

☕ **Flex Block (3-5pm)**
Meetings, calls, and collaborative work.

The key? Protect your morning block like it's a meeting with your most important client — because it is.

Which block would help you most?`,
        caption: 'Time-blocking for deep work — the system that changed everything. Which time block would you add? 👇',
        hashtags: ['postpilot', 'productivity', 'timemanagement', 'deepwork', 'worksmarter', 'remotework', 'entrepreneurlife', 'productivityhacks'],
        status: 'published',
        scheduled_date: '2026-06-10 09:00:00'
      },
      {
        platform: 'linkedin',
        content: `**How I reclaimed 10 hours a week with time-blocking**

I used to bounce between tasks all day. Emails, Slack, "quick calls" — nothing ever got finished.

Then I tried extreme time-blocking.

**The rules:**
→ 3 focused blocks per day (90 min each)
→ No context switching within a block
→ Phone on DND, Slack paused, email closed

**The results after 30 days:**
• 10+ hours of deep work per week
• 3 major projects completed (vs 0 before)
• Stress levels dropped significantly

**My schedule:**
8:00 - 9:30 — Deep work (writing, strategy)
9:30 - 10:00 — Break
10:00 - 11:30 — Deep work (client deliverables)
11:30 - 12:00 — Email & messages
1:00 - 2:30 — Meetings & collaboration
2:30 - 3:30 — Shallow work (admin, reviews)

The hardest part? Saying no. But your calendar is your most important asset.

What does YOUR ideal day look like?`,
        caption: 'Deep work time-blocking — my complete system. Would love to hear your approach!',
        hashtags: ['postpilot', 'productivity', 'timemanagement', 'deepwork', 'leadership', 'worksmarter'],
        status: 'published',
        scheduled_date: '2026-06-11 08:00:00'
      },
      {
        platform: 'twitter',
        content: `Your calendar is your most important asset. Protect it like your bank account. 🧵

1/ Morning deep work block — non-negotiable
2/ Batch all meetings in the afternoon
3/ No context switching ever
4/ Schedule breaks (yes, schedule them)
5/ Review every Friday, adjust for Monday`,
        caption: 'Time-blocking thread — a quick breakdown of what works.',
        hashtags: ['postpilot', 'productivity', 'timemanagement'],
        status: 'published',
        scheduled_date: '2026-06-09 12:00:00'
      }
    ]
  },
  {
    idea: 'Building a personal brand on social media',
    platforms: ['instagram', 'linkedin', 'twitter'],
    posts: [
      {
        platform: 'instagram',
        content: `🎯 **Building a personal brand in 2026**

The rules have changed. Here's what works now:

1️⃣ **Be authentic, not perfect**
Polished is out. Real is in.

2️⃣ **Teach something every post**
Give away your best knowledge for free.

3️⃣ **Show the process, not just the result**
People connect with the journey, not the destination.

4️⃣ **Engage before you expect engagement**
Comment, share, and support others first.

5️⃣ **Be consistent, not viral**
Show up every day. The algorithm rewards reliability.

Your personal brand is your superpower. What's one thing you'll start doing today?`,
        caption: 'Personal brand building in 2026 — the rules have changed. Drop your #1 tip below! 💬',
        hashtags: ['postpilot', 'personalbrand', 'socialmediastrategy', 'contentcreation', 'growth', 'personalbranding', 'entrepreneurtips', 'digitalmarketing'],
        status: 'published',
        scheduled_date: '2026-06-08 11:00:00'
      },
      {
        platform: 'linkedin',
        content: `**The 3-step framework that grew my LinkedIn following 5x**

I spent 2 years posting randomly. No strategy. No growth.

Then I found a simple framework.

**Step 1: Value First**
Every post must teach something.
→ Share a lesson you learned this week
→ Break down a complex topic simply
→ Give away your best tip for free

**Step 2: Story Second**
Facts tell. Stories sell.
→ Start with a personal experience
→ Describe the struggle honestly
→ End with the takeaway

**Step 3: Conversation Third**
Don't broadcast. Connect.
→ End with a question
→ Reply to every comment
→ DM people who engage

**The results after 3 months:**
• 5x follower growth
• 3 client inquiries from LinkedIn
• 2 speaking invitations

Stop optimizing for likes. Start optimizing for connections.

What's ONE thing you'll change about your content strategy?`,
        caption: 'LinkedIn growth framework — 3 steps that actually work.',
        hashtags: ['postpilot', 'linkedin', 'personalbrand', 'contentstrategy', 'growth', 'socialselling'],
        status: 'published',
        scheduled_date: '2026-06-12 09:00:00'
      },
      {
        platform: 'twitter',
        content: `Building a personal brand is simple:

1. Pick ONE topic you know well
2. Share something valuable every day
3. Engage with people in your niche
4. Be patient for 6 months

That's it. The rest is noise.`,
        caption: 'Personal brand building simplified.',
        hashtags: ['postpilot', 'personalbrand', 'twitter'],
        status: 'draft',
        scheduled_date: null
      }
    ]
  }
];

async function seed() {
  console.log('🌱 PostPilot Demo Seed\n');

  // Run migrations to ensure schema exists
  runMigrations();

  const db = getDb();

  // Clean existing demo data
  db.prepare("DELETE FROM users WHERE email = ?").run(DEMO_USER.email);
  console.log('  ✓ Cleaned existing demo user');

  // Create user
  const userId = uuidv4();
  const passwordHash = await bcrypt.hash(DEMO_USER.password, 10);
  const now = new Date().toISOString().replace('T', ' ').split('.')[0];
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, subscription_tier, subscription_status, posts_generated, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, DEMO_USER.email, passwordHash, DEMO_USER.name, DEMO_USER.tier, DEMO_USER.status, 0, now, now);

  console.log(`  ✓ Created user: ${DEMO_USER.name} (${DEMO_USER.email})`);
  console.log(`    Password: ${DEMO_USER.password}`);

  // Create subscription
  const subId = uuidv4();
  db.prepare(`
    INSERT INTO subscriptions (id, user_id, stripe_subscription_id, stripe_price_id, payment_provider, status, tier, current_period_start, current_period_end)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(subId, userId, `demo_sub_${subId.slice(0, 8)}`, 'price_pro_monthly', 'stripe', 'active', 'pro', now, periodEnd.toISOString().replace('T', ' ').split('.')[0]);

  console.log(`  ✓ Created Pro subscription (Stripe)`);

  // Create posts
  let totalPosts = 0;
  for (const seedIdea of SEED_IDEAS) {
    for (const postData of seedIdea.posts) {
      const postId = uuidv4();
      const createdAt = postData.scheduled_date || now;

      db.prepare(`
        INSERT INTO posts (id, user_id, seed_idea, platform, content, caption, hashtags, status, scheduled_date, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        postId, userId, seedIdea.idea, postData.platform,
        postData.content, postData.caption,
        JSON.stringify(postData.hashtags),
        postData.status, postData.scheduled_date,
        createdAt, now
      );
      totalPosts++;
    }
  }

  // Update post count
  db.prepare('UPDATE users SET posts_generated = ? WHERE id = ?').run(totalPosts, userId);

  console.log(`  ✓ Created ${totalPosts} sample posts`);

  // ── Summary ────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ✅ Demo data seeded!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n  Login credentials:`);
  console.log(`    Email:    ${DEMO_USER.email}`);
  console.log(`    Password: ${DEMO_USER.password}`);
  console.log(`    Tier:     ${DEMO_USER.tier.toUpperCase()}\n`);
  console.log('  Seed ideas used:');
  for (const si of SEED_IDEAS) {
    console.log(`    • ${si.idea}`);
  }
  console.log(`\n  ${totalPosts} total posts created`);
  console.log(`  ${db.prepare("SELECT COUNT(*) as c FROM posts WHERE status = 'published'").get().c} published`);
  console.log(`  ${db.prepare("SELECT COUNT(*) as c FROM posts WHERE status = 'draft'").get().c} drafts`);
  console.log('');

  closeDb();
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});