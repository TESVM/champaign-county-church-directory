# Champaign County Church Directory

Public-facing church directory for Champaign County, Illinois. This app helps residents, visitors, families, and students browse churches by city, leadership, ministries, service information, and helpful public links.

GitHub:
- https://github.com/TESVM/champaign-county-church-directory

## What this site includes

- Directory, Find a Service, city pages, and church profiles, all read live from Postgres
- "Plan your first visit", events calendar (with .ics), community help, saved churches
- Church leader sign-in by emailed link; claims reviewed by staff; owner/editor teams
- Admin queues for claims, new churches, messages, corrections, website-review proposals
- $29/month Enhanced Church Profile via Stripe (see docs/FREE_VS_ENHANCED.md)
- Public read API at `/api/v1` used by the mobile app in `mobile/`

## Documentation

- [docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md): done vs. owner setup and decisions
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): environment, migrations, Stripe, backups, local dev
- [docs/DATA_IMPORT.md](docs/DATA_IMPORT.md): importing researched church records safely
- [docs/GUIDE.md](docs/GUIDE.md): for administrators and church leaders
- [docs/TEST_REPORT.md](docs/TEST_REPORT.md): what was verified and what was not
- `PROJECT_AUDIT_AND_IMPROVEMENT_PLAN.md` and `CODEBASE_OVERVIEW.md` are historical and partly outdated.

## Stack

Next.js 15 App Router, TypeScript, Tailwind, Prisma 6 + PostgreSQL, Zod, Vitest. Node 20.9 to 22 (CI uses 22).

## Local development

```bash
npm install
npm run db:local     # separate terminal: local Postgres-compatible DB (PGlite)
cp .env.example .env.local   # then edit; see docs/DEPLOYMENT.md section 7
npm run db:setup     # migrate + import real church records
npm run dev          # http://localhost:3004
```

Tests: `npm test`, `npm run test:integration`, `npm run typecheck`, `npm run lint`, `npm run build`.

## Accessibility

This repo was updated to better align with WCAG 2.1 Level AA patterns and Illinois accessibility expectations.

Implemented examples:

- skip link
- stronger focus states
- reduced-motion support
- mobile-friendly navigation
- clearer search guidance
- improved visual hierarchy

See:
- [ACCESSIBILITY_NOTES.md](./ACCESSIBILITY_NOTES.md)

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Production refuses to start without required configuration.

## Companion Project

If a church needs worship musicians, vocalists, or accompanists, use the companion repo:

- https://github.com/TESVM/central-illinois-music-directory
