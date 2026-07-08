/**
 * PostPilot Content Generation Service
 * ======================================
 * Generates platform-optimized social media content from a seed idea.
 * Uses varied template pools with randomization for diverse output.
 */

// ── Template Pools ──────────────────────────────────────────

const INSTAGRAM_TEMPLATES = [
  (seed) => `✨ **${seed}**\n\nHere's what most people miss:\n\n1️⃣ Define your "why" — purpose drives consistency\n2️⃣ Start before you're ready — progress > perfection\n3️⃣ Track what matters — data beats guessing\n4️⃣ Iterate weekly — small tweaks, big results\n5️⃣ Share the journey — people connect with real\n\nWhich one hits home for you? 👇\n\nSave this for later! 📌`,

  (seed) => `🔥 ${seed} — here's the truth nobody tells you:\n\nThe secret isn't a secret.\nIt's showing up when it's hard.\nIt's posting when you're tired.\nIt's refining when others quit.\n\nConsistency isn't sexy.\nBut it's what works.\n\nDouble tap if you needed this today ❤️`,

  (seed) => `**${seed}** — 3 things I wish I knew sooner ⬇️\n\n❌ Wait for the perfect moment\n✅ Start now, adjust later\n\n❌ Try to do everything at once\n✅ Focus on one platform first\n\n❌ Compare your chapter 1 to someone's chapter 20\n✅ Track your own progress\n\nSave this reminder! 🔖`,

  (seed) => `Let's talk about **${seed}** 🎯\n\nThe biggest mistake? Overthinking it.\n\nHere's my simple framework:\n→ Monday: Plan your content\n→ Wednesday: Create & schedule\n→ Friday: Engage & iterate\n→ Weekend: Rest & recharge\n\nRinse. Repeat. Grow. 🌱\n\nDrop a 🔥 if you're ready to commit!`,

  (seed) => `The #1 lesson from **${seed}**?\n\nIt's not about going viral.\nIt's about being valuable.\n\nOne helpful post > ten clever ones.\nOne real story > a hundred trends.\nOne engaged follower > a thousand ghosts.\n\nBuild trust, not just followers. 💪\n\nTag someone who needs to hear this!`,

  (seed) => `💡 Quick tip: **${seed}**\n\nThe 80/20 rule applies here too:\n• 80% value-driven content\n• 20% promotion\n\nBut most people flip it.\nThey sell, sell, sell.\nAnd wonder why nobody's buying.\n\nGive first. Sell second. Always. 🤝\n\nSave this for your next content session! 📌`
];

const LINKEDIN_TEMPLATES = [
  (seed) => `**${seed}**\n\nI've been thinking about this a lot lately.\n\nHere's what I've learned:\n\n→ Most people overcomplicate the basics\n→ Consistency beats intensity every single time\n→ The real value is in the execution, not the idea\n\nI see too many people waiting for the "perfect" moment.\n\nSpoiler: it doesn't exist.\n\nStart messy. Refine as you go. The only way to improve is to begin.\n\nWhat's your take on this? I'd love to hear your perspective below 👇`,

  (seed) => `Let's have an honest conversation about **${seed}**.\n\nAfter working in this space, here are 3 patterns I've noticed:\n\n1. The people who succeed aren't the smartest — they're the most consistent\n2. Strategy matters, but execution matters more\n3. Feedback is a gift most people ignore\n\nThe difference between those who grow and those who don't?\nAction.\n\nNot perfect action. Just action.\n\nWhat's your experience been? Drop your thoughts below.`,

  (seed) => `**${seed}** — an unpopular opinion:\n\nMost advice you read about this is generic.\n\nHere's what actually moves the needle:\n\n✅ Set specific, measurable goals\n✅ Review your analytics weekly\n✅ Test one variable at a time\n✅ Double down on what works\n✅ Stop what doesn't (even if you love it)\n\nSimple? Yes.\nEasy? No.\n\nThat's why most people don't do it.\n\nAgree or disagree? Let's discuss 👇`,

  (seed) => `I used to think **${seed}** required some special talent.\n\nI was wrong.\n\nIt requires:\n→ Discipline when motivation fades\n→ Humility to learn from failures\n→ Patience to let compound growth work\n\nThe people who "make it look easy" put in the reps when nobody was watching.\n\nThat's the real secret.\n\nWhat's one lesson you've learned the hard way? I'd love to hear it.`,

  (seed) => `**${seed}** — 3 lessons from the trenches:\n\n1. Your first version will be imperfect. Ship it anyway.\n2. Feedback > assumptions. Talk to your audience, not at them.\n3. Rest is productive. Burnout helps no one.\n\nThe most successful people I know aren't the ones who work the longest hours.\nThey're the ones who work on the right things.\n\nFocus > hustle.\n\nWhat would you add to this list?`
];

const TWITTER_TEMPLATES = [
  (seed) => `${seed}\n\nHere's the simple truth:\n\n1. Start before you're ready\n2. Learn by doing\n3. Adjust as you go\n4. Consistency > intensity\n5. Share what you learn\n\nThe gap between knowing and doing is where most people get stuck.\n\n🧵 Thread 👇`,

  (seed) => `Unpopular take on ${seed}:\n\nYou don't need another course.\nYou don't need another tool.\nYou don't need another strategy.\n\nYou need to start.\n\nImperfect action > perfect planning.\n\nEvery. Single. Time.`,

  (seed) => `${seed}\n\nThe 80/20 breakdown:\n\n80% of results come from:\n• Showing up consistently\n• Listening to your audience\n• Iterating based on data\n\n20% of results come from:\n• Going viral\n• Hacking algorithms\n• Chasing trends\n\nFocus on the 80%. Always.`,

  (seed) => `3 things I learned about ${seed}:\n\n1. Start small, stay consistent\n2. Measure what matters, ignore the rest\n3. Done is better than perfect\n\nSimple? Yes.\nEasy? No.\n\nThat's the point.`,

  (seed) => `${seed} isn't complicated.\n\nBut it is hard.\n\nBecause hard means:\n→ Doing it when you don't feel like it\n→ Showing up after a failure\n→ Saying no to distractions\n\nHard work > smart shortcuts.\n\nEvery time.`
];

// ── Caption Pools ───────────────────────────────────────────

const INSTAGRAM_CAPTIONS = [
  (seed) => `${seed} — the strategy that changed everything for me. Swipe through to learn how you can apply it too! Which step resonates most? Let me know in the comments! 👇`,
  (seed) => `This is your sign to finally take action on ${seed}. Save this post, share it with someone who needs it, and tell me — what's your #1 takeaway? 💬`,
  (seed) => `Real talk: ${seed} doesn't have to be complicated. I broke it down into simple steps. Which one will you try first? Drop it below! ⬇️`,
  (seed) => `I wasted months overthinking ${seed}. Don't make my mistake. Here's the simple framework that actually works. Save this! 📌`,
  (seed) => `If you've been struggling with ${seed}, this post is for you. No fluff — just what works. Tag someone who needs to see this! 🏷️`
];

const LINKEDIN_CAPTIONS = [
  (seed) => `Here's my take on ${seed.toLowerCase()}. I'd love to hear your perspective — drop a comment or DM me.`,
  (seed) => `I've been reflecting on ${seed.toLowerCase()} and wanted to share my thoughts. What's been your experience? Let's discuss in the comments.`,
  (seed) => `Lessons learned from ${seed.toLowerCase()}. If this resonates, I'd appreciate a share or your thoughts below.`,
  (seed) => `My honest take on ${seed.toLowerCase()}. Agree or disagree? I'm always open to different perspectives.`
];

const TWITTER_CAPTIONS = [
  (seed) => `${seed}. A quick thread on what actually works. 🧵`,
  (seed) => `${seed} — here's what no one tells you. 🧵👇`,
  (seed) => `Unpopular opinion on ${seed.toLowerCase()}. 🧵`,
  (seed) => `${seed} in 5 simple points. Let's go. 🧵`
];

// ── Hashtag Pools ───────────────────────────────────────────

const BASE_TAGS = ['postpilot', 'contentcreation', 'socialmediamarketing'];

const INSTAGRAM_TAGS = [
  ['digitalmarketing', 'growth', 'productivity', 'smallbusinesstips', 'contentstrategy', 'marketingtips', 'socialmediatips', 'entrepreneurlife'],
  ['marketing', 'businessgrowth', 'onlinebusiness', 'contentmarketing', 'branding', 'hustlehard', 'startuplife', 'creators'],
  ['socialmedia', 'digitalnomad', 'freelancer', 'sidehustle', 'passiveincome', 'businesstips', 'motivation', 'growthmindset']
];

const LINKEDIN_TAGS = [
  ['productivity', 'growth', 'contentstrategy', 'marketing'],
  ['leadership', 'innovation', 'businessstrategy', 'professionaldevelopment'],
  ['entrepreneurship', 'digitaltransformation', 'futureofwork', 'mindset']
];

const TWITTER_TAGS = [
  ['productivity', 'growth', 'buildinpublic'],
  ['startup', 'indiehacker', 'founders'],
  ['marketing', 'growthmindset', 'hustle']
];

// ── Helper Functions ────────────────────────────────────────

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate platform-optimized content for a seed idea.
 */
export function generateContent(seed, platform) {
  switch (platform) {
    case 'instagram':
      return pickRandom(INSTAGRAM_TEMPLATES)(seed);
    case 'linkedin':
      return pickRandom(LINKEDIN_TEMPLATES)(seed);
    case 'twitter':
      return pickRandom(TWITTER_TEMPLATES)(seed);
    default:
      return pickRandom(INSTAGRAM_TEMPLATES)(seed);
  }
}

/**
 * Generate a platform-appropriate caption.
 */
export function generateCaption(seed, platform) {
  switch (platform) {
    case 'instagram':
      return pickRandom(INSTAGRAM_CAPTIONS)(seed);
    case 'linkedin':
      return pickRandom(LINKEDIN_CAPTIONS)(seed);
    case 'twitter':
      return pickRandom(TWITTER_CAPTIONS)(seed);
    default:
      return '';
  }
}

/**
 * Generate platform-appropriate hashtags as a JSON string.
 */
export function generateHashtags(seed, platform) {
  // Extract keywords from the seed idea for contextual hashtags
  const words = seed.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3);

  const seedTags = words.slice(0, 2).map(w => w.replace(/\s/g, ''));

  let platformTagPool;
  switch (platform) {
    case 'instagram':
      platformTagPool = pickRandom(INSTAGRAM_TAGS);
      break;
    case 'linkedin':
      platformTagPool = pickRandom(LINKEDIN_TAGS);
      break;
    case 'twitter':
      platformTagPool = pickRandom(TWITTER_TAGS);
      break;
    default:
      platformTagPool = [];
  }

  const tags = [...BASE_TAGS, ...seedTags, ...platformTagPool];
  return JSON.stringify(tags);
}
