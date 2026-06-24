# PostPilot 🚀

**Turn one raw idea into a week's worth of social media content.**

PostPilot is an AI-powered social media content assistant that saves creators and small businesses 5+ hours/week. Drop in a rough idea — get platform-optimized posts for Instagram, LinkedIn, and Twitter/X with captions, hashtags, and images.

## Features

- **One Idea → Full Week** — Input a single thought, get a 5-day content calendar
- **Platform-Native Optimization** — Posts tailored for Instagram, LinkedIn, and Twitter/X
- **Smart Hashtags** — Auto-generated, platform-specific hashtag strategies
- **Content Calendar** — Review, tweak, and schedule from a single dashboard
- **Multi-Platform Support** — Manage all your social channels in one place

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS 4 |
| **Backend** | Node.js, Express, SQLite (better-sqlite3) |
| **Auth** | JWT (jsonwebtoken + bcryptjs) |
| **Payments** | Stripe + PayPal (both with mock/dev mode) |
| **Deployment** | Docker, docker-compose |

## Quick Start

```bash
# 1. Install dependencies
cd api && npm install
cd ../web && npm install

# 2. Configure environment
cp api/.env.example api/.env
# Edit api/.env with your Stripe/PayPal keys (or use defaults for mock mode)

# 3. Start the backend (serves both API + frontend)
cd ../api
npm start
# → Server running on http://localhost:3000

# 4. (Optional) Build frontend separately for development
cd ../web
npm run dev
# → Frontend dev server on http://localhost:5173
```

## Project Structure

```
postpilot/
├── api/                    # Backend (Express + SQLite)
│   ├── src/
│   │   ├── routes/         # API routes (auth, posts, billing, paypal)
│   │   ├── middleware/     # JWT auth middleware
│   │   └── db/             # Database connection & migrations
│   ├── scripts/            # Setup & seed scripts
│   ├── Dockerfile
│   └── .env.example
├── web/                    # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/          # Page components
│   │   ├── components/     # UI components
│   │   ├── contexts/       # Auth context
│   │   └── api/            # API client (Axios)
│   ├── public/             # Static assets, brand, marketing images
│   └── dist/               # Built frontend (served by backend)
├── shared/                 # Cross-team artifacts
│   ├── content-templates/  # Post templates by industry
│   ├── template-library/   # 63 templates across 7 industries
│   ├── marketing/          # Launch copy & social posts
│   └── email-templates/    # HTML email templates
├── docs/                   # Documentation
├── docker-compose.yml
└── README.md
```

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |

### Posts
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/posts` | List user's posts |
| POST | `/api/posts` | Create a post |
| POST | `/api/posts/generate` | Generate content pack from a seed idea |
| PUT | `/api/posts/:id` | Update a post |
| DELETE | `/api/posts/:id` | Delete a post |

### Billing (Stripe)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/billing/plans` | List plans |
| POST | `/api/billing/create-checkout-session` | Subscribe via Stripe |
| POST | `/api/billing/webhook` | Stripe webhook handler |

### Billing (PayPal)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/paypal/plans` | List plans |
| POST | `/api/paypal/create-order` | Create PayPal order |
| POST | `/api/paypal/capture-order` | Capture PayPal payment |
| POST | `/api/paypal/webhook` | PayPal webhook handler |

## Pricing

| Plan | Price | Posts/Month | Platforms | Image Gen |
|------|-------|-------------|-----------|-----------|
| Free | $0 | 3 | 1 | ❌ |
| Starter | $29/mo | 10 | 1 | ❌ |
| Pro | $59/mo | 30 | 3 | ✅ |

Launch promo: First month FREE for first 500 users — code `PILOT500`

## Deployment

```bash
# One-command deploy with Docker
docker compose up -d
```

## Brand

All brand assets (logos, colors, typography) are in `web/public/brand/`. See the [Brand Guidelines](web/public/brand/index.html) for the full design system.

---

Built with ❤️ by PostPilot