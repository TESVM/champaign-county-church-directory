# Production launch checklist

Status as of 2026-10-09 on branch `feat/production-launch`. Nothing has been
deployed, no live charges made, and no real outreach sent.

## Done and verified in this repository

- [x] One database-backed data path for homepage, directory, search, city pages,
      profiles, `/api/v1`, dashboards, admin, sitemap, and CSV export.
- [x] Additive migration with data backfill (verification dates, premium flag →
      complimentary grant). Applied cleanly to an empty Postgres-compatible DB.
- [x] Safe, idempotent import of 70 real churches; fixtures excluded; newer or
      church-confirmed data never overwritten.
- [x] Email magic-link sign-in, database sessions (7-day expiry, logout,
      server-side revocation), disabled accounts, rate limiting.
- [x] Claims: submit → review (approve / more info / decline, with emails) →
      owner access to that church only. Owners invite and remove editors.
- [x] Contact, new-church submission, correction, and claim forms persist before
      any success message; honeypot, link-spam limit, rate limits.
- [x] Admin queues, listing status (closed / duplicate / hidden), public-source
      checks, complimentary grants, staff roles, audit log, email log.
- [x] Stripe checkout and customer portal code; signature-verified, idempotent,
      order-safe webhook processing; server-side entitlement enforced on pages,
      API, filters, and calendar.
- [x] Plan Your First Visit, events (America/Chicago with DST-safe weekly
      recurrence, ICS), Find a Service, QR/share/OG previews, activity counts,
      moderated community resources, browser-only favorites, correction reports.
- [x] Website review: robots.txt, private-network blocking, timeouts, size and
      time limits, honest outcome records, evidence-backed proposals awaiting
      approval. Run against 5 real church sites locally.
- [x] AI-generated images never shown as church photos; neutral placeholder.
- [x] Health check, startup env validation, JSON logs, security headers,
      canonical URLs, sitemap, robots (non-production blocks indexing), JSON-LD.
- [x] Privacy page and subscription terms rewritten to match actual behaviour.
- [x] CI (Node 22): typecheck, lint, unit, integration (in-memory Postgres), build, audit.

## Owner setup required before launch

| # | Item | Notes |
| - | --- | --- |
| 1 | Production Postgres + backups | Create DB; set `DATABASE_URL` (pooled). Enable PITR. `prisma migrate deploy`, then import (docs/DATA_IMPORT.md). |
| 2 | `AUTH_SECRET`, `CRON_SECRET`, `SITE_URL`, `ADMIN_EMAIL`, `ADMIN_NOTIFY_EMAIL` | See `.env.example`. |
| 3 | Resend account and verified sending domain | `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM`. Then send yourself a sign-in link to confirm delivery (not verified here). |
| 4 | Real support mailbox | The old footer address `admin@champaignchurchdirectory.com` could not be confirmed as real and was removed. Set `SUPPORT_EMAIL` only to a monitored mailbox. |
| 5 | Stripe (test mode first) | Product + $29/month price, webhook endpoint and events, customer portal (docs/DEPLOYMENT.md §4). Run a full test-mode lifecycle, then switch to live keys. **Not verified with real Stripe**; verified with signed simulated events. |
| 6 | Vercel Blob (optional) | For photo uploads; without it leaders paste image links. |
| 7 | Domain + `ALLOW_INDEXING` / Vercel production env | Robots blocks indexing everywhere except Vercel production. |
| 8 | Merge `feat/production-launch` | It sits on top of `feat/mobile-apps`; review and merge into `main`. |

## Business / legal decisions for the owner

- **Free vs paid:** website link moved to free; livestream kept paid (see
  docs/FREE_VS_ENHANCED.md). Confirm or change `ENHANCED_ONLY` in `lib/plans.ts`.
- **Subscription terms** (`/terms`): refund policy (“no partial-month refunds”),
  30-day notice of price changes, legal entity name, and governing law need
  owner/legal review. Sales tax handling in Stripe (Stripe Tax) not configured.
- **Privacy policy** describes actual behaviour but should be reviewed by a
  qualified advisor.
- **Photo permissions:** 25 church photos have documented sources
  (`CHURCH_IMAGE_SOURCES.md`), two from church Facebook pages. Publication by the
  church is not the same as permission to reuse; ideally confirm with each church
  or replace when they claim their listing.
- **Front-page “Always Featured” church** (Sheriff Temple) and “Church of the
  Week” are hard-coded editorial choices; decide whether to keep them, since
  visitors may read them as paid placement.
- **AI images:** disabled (`AI_IMAGES_ENABLED=false`). Existing AI images, if any
  in production, are hidden publicly.
- **Prisma 6 advisory:** 3 high-severity npm advisories remain in Prisma's CLI
  config loader (`deepmerge-ts`); fixing requires a Prisma 7+ major upgrade.
  Build-time tooling, not request handling. Schedule the upgrade.

## Launch-day checks

1. `GET /api/health` → `status: ok`, email `configured`, billing `configured`.
2. Sign in as `ADMIN_EMAIL` via emailed link; add other staff.
3. Submit a test correction on a real church page; confirm the staff email
   arrives; dismiss it.
4. Stripe test-mode subscription for one church end to end, including cancel.
5. Trigger the cron once from Vercel; check Admin → Website review.
