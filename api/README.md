# PostPilot API

The PostPilot backend — an Express/Node.js API with JWT authentication, SQLite database, and Stripe subscription billing.

## Tech Stack

- **Runtime:** Node.js v24+ (ESM modules)
- **Framework:** Express 4.21
- **Database:** SQLite via better-sqlite3 (WAL mode)
- **Auth:** JWT (jsonwebtoken + bcryptjs)
- **Billing:** Stripe SDK (with mock mode for development)

## Quick Start

```bash
cp .env.example .env   # Edit with your Stripe keys (or use defaults for mock)
npm install
npm run migrate        # Run database migrations
npm start              # Starts on http://0.0.0.0:3000
```

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Create account (email, password, name) |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user (auth required) |
| PUT | `/api/auth/profile` | Update profile (auth required) |

### Posts
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/posts` | List user's posts (auth, filters: platform, status) |
| GET | `/api/posts/:id` | Get single post |
| POST | `/api/posts` | Create a post |
| PUT | `/api/posts/:id` | Update a post |
| DELETE | `/api/posts/:id` | Delete a post |
| POST | `/api/posts/generate` | Generate content pack from seed idea |

### Billing
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/billing/plans` | List available plans (public) |
| GET | `/api/billing/subscription` | Get current subscription (auth) |
| POST | `/api/billing/create-checkout-session` | Subscribe to plan (mock mode if no Stripe keys) |
| POST | `/api/billing/create-portal-session` | Stripe customer portal |
| POST | `/api/billing/webhook` | Stripe webhook handler |

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |

## Subscription Plans

| Tier | Price | Posts/Month | Platforms | 
|------|-------|-------------|-----------|
| Free | $0 | 3 | All (limited) |
| Starter | $29 | 10 | 1 |
| Pro | $59 | 30 | 3 |

## Mock Mode

If `STRIPE_SECRET_KEY` is not set (or is the placeholder), the billing system runs in mock mode — subscriptions are created directly without Stripe. This allows full dev/testing of the billing flow.

## Architecture

- Single origin on port 3000 (Express serves API + static frontend)
- SQLite database stored in `./data/postpilot.db`
- Auto-migration on startup
- Frontend builds served from `../web/dist/`