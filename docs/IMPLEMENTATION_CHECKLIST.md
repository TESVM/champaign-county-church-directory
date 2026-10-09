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
- [ ] Database is the only read/write source for every page, API, admin screen
- [ ] Idempotent import of real records that never overwrites newer DB data
- [ ] Fixtures excluded from import and public pages
- [ ] Separate App Store / Google Play columns; leadership, ministries, services, social persisted
- [ ] Source URL + checked-at recorded per church; public-source check vs leadership-confirmed status
- [ ] Validation, duplicate prevention, honest errors
- [ ] CSV export of contacts (name, pastor, address, phone, email, verification date)

## 2. Accounts and claims
- [ ] Email magic-link sign-in, DB sessions (expiry, logout, revocation)
- [ ] Claim submit → admin approve / reject / more-info, with emails
- [ ] Owner / editor roles, invites, revocation
- [ ] Per-church authorization on every action and API
- [ ] Rate limits on sign-in and forms
- [ ] Onboarding + profile completion checklist

## 3. Forms and admin
- [ ] Contact, new-church submission, correction, claim all persisted
- [ ] Configurable email provider (Resend) with dev outbox
- [ ] Admin queues with actions; audit log of important changes
- [ ] Honeypot + rate limiting
- [ ] No success message without a successful write

## 4. Subscriptions ($29/month)
- [ ] Checkout + customer portal
- [ ] Subscription table with Stripe IDs, status, period end
- [ ] Signature verification, idempotent events, out-of-order protection
- [ ] Entitlement computed server-side (subscription or complimentary grant)
- [ ] Complimentary/manual premium migration and admin control
- [ ] Clear free vs paid documentation

## 5. Participation features
- [ ] A. Plan your first visit
- [ ] B. Events + county calendar + ICS (America/Chicago, DST)
- [ ] C. Find a service filters
- [ ] D. QR code, share link, OG previews
- [ ] E. Activity counts (no fabricated analytics)
- [ ] F. Community resources with moderation
- [ ] G. Favorites (no account) + report outdated info

## 6. Data quality
- [ ] AI images never shown as church photos; placeholder instead
- [ ] Admin tools: duplicates, closures, relocations, image replacement
- [ ] Verification status wording

## 7. Website review
- [ ] Real bounded fetch, robots.txt, timeouts, size limits
- [ ] Records success/failure honestly; proposes changes with evidence; human approval

## 8. Production readiness
- [ ] Authorization review of every endpoint
- [ ] Upload + link validation
- [ ] Dependency audit
- [ ] Env validation, health check, structured logs
- [ ] Backup/restore, migration, deployment docs
- [ ] Canonical URLs, sitemap, robots, metadata, JSON-LD
- [ ] Accessibility and mobile review
- [ ] Privacy + subscription pages describe real behavior
- [ ] Support contact is real
- [ ] CI (Node 22)

## 9. Verification
- [ ] Integration tests against a real Postgres-compatible DB (PGlite)
- [ ] Browser checks desktop + mobile
- [ ] Production build
