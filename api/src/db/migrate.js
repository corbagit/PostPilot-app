import { getDb } from './connection.js';

const MIGRATIONS = [
  {
    version: 1,
    name: 'initial_schema',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        avatar_url TEXT,
        stripe_customer_id TEXT,
        subscription_tier TEXT DEFAULT 'free',
        subscription_status TEXT DEFAULT 'inactive',
        posts_generated INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        seed_idea TEXT NOT NULL,
        platform TEXT NOT NULL CHECK(platform IN ('instagram', 'linkedin', 'twitter')),
        content TEXT NOT NULL,
        caption TEXT,
        hashtags TEXT,
        image_url TEXT,
        status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
        scheduled_date TEXT,
        published_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        stripe_subscription_id TEXT,
        stripe_price_id TEXT,
        status TEXT DEFAULT 'incomplete' CHECK(status IN ('incomplete', 'active', 'past_due', 'canceled', 'unpaid', 'trialing')),
        tier TEXT DEFAULT 'free' CHECK(tier IN ('free', 'starter', 'pro')),
        current_period_start TEXT,
        current_period_end TEXT,
        cancel_at_period_end INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS content_packs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        seed_idea TEXT NOT NULL,
        platform TEXT NOT NULL,
        days INTEGER DEFAULT 5,
        content_data TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
      CREATE INDEX IF NOT EXISTS idx_posts_platform ON posts(platform);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_content_packs_user_id ON content_packs(user_id);
    `
  },
  {
    version: 2,
    name: 'add_paypal_columns',
    sql: `
      ALTER TABLE subscriptions ADD COLUMN paypal_subscription_id TEXT;
      ALTER TABLE subscriptions ADD COLUMN payment_provider TEXT DEFAULT 'stripe' CHECK(payment_provider IN ('stripe', 'paypal'));
    `
  },
  {
    version: 3,
    name: 'add_pageviews',
    sql: `
      CREATE TABLE IF NOT EXISTS pageviews (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        page TEXT NOT NULL,
        referrer TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_pageviews_user_id ON pageviews(user_id);
      CREATE INDEX IF NOT EXISTS idx_pageviews_created_at ON pageviews(created_at);
    `
  }
];

export function runMigrations() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `);

  const applied = db.prepare('SELECT version FROM _migrations').all().map(r => r.version);
  
  for (const migration of MIGRATIONS) {
    if (!applied.includes(migration.version)) {
      console.log(`[migrate] Applying migration ${migration.version}: ${migration.name}`);
      db.exec(migration.sql);
      db.prepare('INSERT INTO _migrations (version, name) VALUES (?, ?)').run(migration.version, migration.name);
      console.log(`[migrate] Migration ${migration.version} applied successfully`);
    }
  }
}

// Run if called directly
if (process.argv[1] && (process.argv[1].endsWith('migrate.js') || process.argv[1].endsWith('migrate'))) {
  console.log('[migrate] Running database migrations...');
  runMigrations();
  console.log('[migrate] Done.');
  process.exit(0);
}