# Marketing Operations Dashboard

A Next.js dashboard for the marketing operations system described in [spec.md](/Users/ben/projects/Dashboard-OpenClaw/spec.md). It keeps the upstream OpenClaw gateway client and ops/admin pages, while adding a Postgres-backed content pipeline, approval inbox, analytics views, and business settings.

## What This Repo Owns

- Marketing dashboard pages for pipeline, inbox, activity, brand, calendar, analytics, and settings
- Postgres/Prisma schema for content lifecycle, reviews, analytics, notifications, and audit history
- Internal API routes for content items, transitions, reviews, analytics, businesses, and audit events
- Telegram webhook handling for `mark_posted` callbacks
- Seed script for a local NelsonAI demo dataset

## What This Repo Does Not Own

- OpenClaw workspace files and agent setup in `~/.openclaw/...`
- Lobster workflow execution
- Publisher/analytics skills that talk to LinkedIn, Facebook, or Telegram directly
- Production infra and secrets management

## Stack

- Next.js 16 App Router
- React 19
- Prisma ORM with PostgreSQL
- Existing OpenClaw gateway WebSocket client and hooks from the upstream dashboard
- Tailwind CSS v4

## Setup

```bash
npm install
cp .env.example .env.local
```

Required environment values:

```bash
DATABASE_URL=
OPENCLAW_GATEWAY_WS_URL=ws://localhost:18789
ADMIN_SECRET=
DASHBOARD_URL=http://localhost:3000
```

Optional integrations:

```bash
LINKEDIN_ACCESS_TOKEN=
LINKEDIN_ORG_ID=
FACEBOOK_PAGE_ID=
FACEBOOK_PAGE_ACCESS_TOKEN=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TELEGRAM_WEBHOOK_SECRET=
```

## Database

Generate the Prisma client:

```bash
npm run prisma:generate
```

Apply the migration to a configured PostgreSQL database:

```bash
npx prisma migrate deploy
```

Seed a local demo dataset:

```bash
npm run db:seed
```

## Development

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
```

## Routes

Marketing pages:

- `/pipeline`
- `/inbox`
- `/items/[id]`
- `/activity`
- `/brands/[slug]`
- `/calendar`
- `/analytics`
- `/settings`

Inherited OpenClaw ops pages:

- `/overview`
- `/chat`
- `/agents`
- `/sessions`
- `/models`
- `/skills`
- `/channels`
- `/cron`
- `/config`
- `/logs`

## Notes

- If `DATABASE_URL` is missing or unreachable, the marketing pages fall back to realistic demo data so the UI remains usable.
- Mutating API routes are protected by `ADMIN_SECRET` when it is set.
- Voice and node/device surfaces from the upstream dashboard were removed because they are out of scope for this product.
