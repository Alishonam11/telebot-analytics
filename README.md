# TeleBot Analytics

Real-time analytics dashboard for Telegram bots. Track users, messages, funnels, retention cohorts, and events in real time.

## Features

- 📊 **Real-time Event Feed** — Watch messages, callbacks, commands, and inline queries arrive live
- 👥 **User Insights** — See who's using your bot, their language, session history, and lifetime value
- 📈 **Funnels & Conversion** — Define multi-step funnels and track where users drop off
- 🔄 **Retention Cohorts** — D1/D7/D30 retention analysis with visual cohort tables
- 🤖 **Multi-bot Workspace** — Track unlimited bots from a single account
- 🔗 **Auto Webhook Setup** — Paste your bot token, we configure the Telegram webhook automatically
- 🌙 **Dark Mode** — Beautiful, responsive dashboard optimized for late-night debugging

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, Tailwind CSS, Recharts |
| Backend | Express, TypeScript, Prisma ORM |
| Database | PostgreSQL 16 |
| Auth | JWT (access + refresh tokens), bcrypt |
| Orchestration | Docker Compose |
| CI/CD | GitHub Actions |

## Quick Start

### Prerequisites

- Docker & Docker Compose (v2+)
- Node.js 20+ (for local development)

### 1. Clone & Configure

```bash
git clone https://github.com/Alishonam11/telebot-analytics.git
cd telebot-analytics
cp .env.example .env
# Edit .env with your settings (DATABASE_URL, JWT_SECRET, etc.)
```

### 2. Run with Docker

```bash
docker compose up -d --build
```

Once healthy, access:
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Health check**: http://localhost:3000/health
- **PostgreSQL**: localhost:5432

### 3. Local Development (without Docker)

```bash
# Backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev        # starts on :3000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev        # starts on :3001
```

## Project Structure

```
telebot-analytics/
├── docker-compose.yml          # Full-stack orchestration
├── .github/workflows/ci.yml    # CI pipeline
├── .env.example                # Environment template
├── package.json                # Backend: Express + Prisma + TS
├── tsconfig.json               # Backend TS config
├── Dockerfile                  # Backend multi-stage image
├── prisma/
│   └── schema.prisma           # User, Bot, Event, Session, Funnel models
├── src/
│   ├── index.ts                # Express app, /health, graceful shutdown
│   ├── middleware/
│   │   ├── auth.ts             # JWT + API key authentication
│   │   ├── rateLimiter.ts      # Request rate limiting
│   │   └── errorHandler.ts     # Centralized error handling
│   └── routes/
│       ├── auth.ts             # Register, login, refresh, /me
│       └── api/
│           ├── bots.ts         # Bot CRUD + webhook management
│           ├── events.ts       # Event ingestion (single + batch)
│           ├── webhook.ts      # Telegram webhook receiver
│           └── analytics.ts    # Overview, users, funnels, retention
└── frontend/                   # Next.js 14 dashboard
    ├── src/app/
    │   ├── page.tsx            # Landing page
    │   ├── login/page.tsx      # Sign in
    │   └── dashboard/
    │       ├── page.tsx        # Overview
    │       ├── bots/page.tsx   # Bot management
    │       └── analytics/page.tsx # Charts + metrics
    └── src/components/         # UI components
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns access + refresh tokens |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current user profile |

### Bots
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bots` | List user's bots |
| POST | `/api/bots` | Register new bot (auto-sets webhook) |
| GET | `/api/bots/:id` | Get bot details |
| PUT | `/api/bots/:id` | Update bot (name, webhook, active) |
| DELETE | `/api/bots/:id` | Delete bot + remove webhook |
| GET | `/api/bots/:id/webhook-info` | Get webhook URL & secret |

### Events
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/events` | Ingest single event (API key auth) |
| POST | `/api/events/batch` | Ingest batch of events |
| GET | `/api/events/:botId` | Query events with filters |

### Webhooks (Telegram)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhook/:secret` | Receive Telegram updates |
| GET | `/api/webhook/:secret/info` | Get bot webhook info |
| DELETE | `/api/webhook/:secret` | Delete webhook |

### Analytics
| Method | Endpoint | Plan |
|--------|----------|------|
| GET | `/api/analytics/overview/:botId` | FREE |
| GET | `/api/analytics/users/:botId` | FREE |
| GET | `/api/analytics/funnel/:botId` | STARTER+ |
| POST | `/api/analytics/funnel/:botId` | STARTER+ |
| GET | `/api/analytics/retention/:botId` | PRO+ |
| GET | `/api/analytics/realtime/:botId` | FREE |
| GET | `/api/analytics/geo/:botId` | PRO+ |

## Adding a Bot

1. Get your bot token from [@BotFather](https://t.me/BotFather)
2. Go to **Bots** page in dashboard
3. Click **Add Bot**, paste the token
4. (Optional) Provide a custom webhook URL, or leave empty to use the default
5. We'll automatically call `setWebhook` with Telegram

The webhook endpoint is: `https://yourdomain.com/api/webhook/<secret>`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/telebot_analytics` |
| `JWT_SECRET` | Strong random string for JWT signing | **required** |
| `JWT_EXPIRES_IN` | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL | `7d` |
| `PORT` | Backend port | `3000` |
| `NEXT_PUBLIC_API_URL` | Frontend → Backend URL | `http://localhost:3000` |
| `TELEGRAM_BOT_TOKEN` | Default bot token (optional) | — |

## License

MIT — see [LICENSE](LICENSE) for details.