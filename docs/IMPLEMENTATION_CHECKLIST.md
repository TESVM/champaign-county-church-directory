# Production implementation checklist

Working list for the production-launch branch (`feat/production-launch`).
Status: `[x]` done and verified, `[~]` code done but needs owner credentials to
verify end to end, `[ ]` not done.

Starting state (found 2026-10-08, not taken from older audit documents):

- Public pages read `lib/data/mock.ts` directly; admin and dashboard edits write
  to Postgres. A saved edit never appeared on the public site.
- Admin claims, users, audit log, submissions and suggested changes fell back to
  invented records (`lib/data/access.ts`, `mock.ts`) whenever the database
  failed, so an outage looked like real data.
- Contact and listing forms validated and then discarded input.
- No church-leader sign-in; only one env-configured admin password.
- Stripe webhook toggled a boolean with no idempotency, ordering, or stored IDs.
- Weekly scanner fetched nothing and reported `lastScannedAt` as a "change".
- AI-generated building images could be shown as a church's photo.

## 1. Data
- [x] Database is the only read/write source for every page, API, admin screen
- [x] Idempotent import of real records that never overwrites newer DB data
- [x] Fixtures excluded from import and public pages
- [x] Separate App Store / Google Play columns; leadership, ministries, services, social persisted
- [x] Source URL + checked-at recorded per church; public-source check vs leadership-confirmed status
- [x] Validation, duplicate prevention, honest errors
- [x] CSV export of contacts (name, pastor, address, phone, email, verification date)

## 2. Accounts and claims
- [x] Email magic-link sign-in, DB sessions (expiry, logout, revocation)
- [x] Claim submit → admin approve / reject / more-info, with emails
- [x] Owner / editor roles, invites, revocation
- [x] Per-church authorization on every action and API
- [x] Rate limits on sign-in and forms
- [x] Onboarding + profile completion checklist

## 3. Forms and admin
- [x] Contact, new-church submission, correction, claim all persisted
- [~] Configurable email provider (Resend) with dev outbox (needs Resend key)
- [x] Admin queues with actions; audit log of important changes
- [x] Honeypot + rate limiting
- [x] No success message without a successful write

## 4. Subscriptions ($29/month)
- [~] Checkout + customer portal (code + simulated webhooks; needs Stripe test keys)
- [x] Subscription table with Stripe IDs, status, period end
- [x] Signature verification, idempotent events, out-of-order protection
- [x] Entitlement computed server-side (subscription or complimentary grant)
- [x] Complimentary/manual premium migration and admin control
- [x] Clear free vs paid documentation

## 5. Participation features
- [x] A. Plan your first visit
- [x] B. Events + county calendar + ICS (America/Chicago, DST)
- [x] C. Find a service filters
- [x] D. QR code, share link, OG previews
- [x] E. Activity counts (no fabricated analytics)
- [x] F. Community resources with moderation
- [x] G. Favorites (no account) + report outdated info

## 6. Data quality
- [x] AI images never shown as church photos; placeholder instead
- [x] Admin tools: duplicates, closures, relocations, image replacement
- [x] Verification status wording

## 7. Website review
- [x] Real bounded fetch, robots.txt, timeouts, size limits
- [x] Records success/failure honestly; proposes changes with evidence; human approval

## 8. Production readiness
- [x] Authorization review of every endpoint
- [x] Upload + link validation
- [x] Dependency audit
- [x] Env validation, health check, structured logs
- [x] Backup/restore, migration, deployment docs
- [x] Canonical URLs, sitemap, robots, metadata, JSON-LD
- [x] Accessibility and mobile review
- [x] Privacy + subscription pages describe real behavior
- [~] Support contact: unverified address removed; owner must set SUPPORT_EMAIL
- [x] CI (Node 22)

## 9. Verification
- [x] Integration tests against a real Postgres-compatible DB (PGlite)
- [x] Browser checks desktop + mobile (emulated)
- [x] Production build
