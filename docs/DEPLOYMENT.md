# Deployment, migrations, backups

Target: Vercel (the repo is already linked to a Vercel project) plus a managed
Postgres. Nothing in this repo has been deployed by this work.

## 1. Services to create (owner)

| Service | Why | What to copy into Vercel env |
| --- | --- | --- |
| Postgres (Neon, Supabase, or Vercel Postgres) | All directory data | `DATABASE_URL` — use the **pooled** URL and append `?pgbouncer=true&connection_limit=1` |
| Resend | Sign-in links and notifications | `RESEND_API_KEY`, `EMAIL_FROM` (a verified sender domain) |
| Stripe | $29/month Enhanced Church Profile | `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` |
| Vercel Blob (optional) | Photo uploads | `MEDIA_DRIVER=blob`, `BLOB_READ_WRITE_TOKEN` |

Also set `AUTH_SECRET`, `SITE_URL`, `ADMIN_EMAIL`, `ADMIN_NOTIFY_EMAIL`,
`SUPPORT_EMAIL` (only once it is a real monitored mailbox), `CRON_SECRET`,
`EMAIL_PROVIDER=resend`. Every variable is described in `.env.example`.

A production server refuses to start (visible in the deploy log) if a required
value is missing. After deploying, `GET /api/health` reports which integrations
are configured, without revealing values.

## 2. Database migrations

```bash
DATABASE_URL="<production url, NOT pooled>" npx prisma migrate deploy
```

Migrations are additive. `20261008000000_production_launch` also:

- records churches previously marked `verified` as *checked against a public
  source* (dated at their last update) — not as confirmed by church leadership;
- converts any `premiumProfile = true` flag into an explicit complimentary
  enhanced profile with an audit entry, so it is visible and revocable.

Run migrations before deploying the new code. Take a backup first (section 5).

## 3. Importing church records

See [DATA_IMPORT.md](./DATA_IMPORT.md). Short version:

```bash
DATABASE_URL="<production url>" npx tsx scripts/import-churches.ts          # dry run
DATABASE_URL="<production url>" npx tsx scripts/import-churches.ts --apply  # write
```

## 4. Stripe setup (test mode first)

1. Create a Product “Enhanced Church Profile” with a recurring monthly Price of
   $29.00 USD. Copy the `price_…` id to `STRIPE_PRICE_ID`.
2. Developers → Webhooks → add endpoint `https://YOUR-DOMAIN/api/billing/webhook`
   with events `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `invoice.paid`, `invoice.payment_failed`. Copy the signing secret.
3. Settings → Billing → Customer portal: enable payment method updates, invoice
   history, and cancellation (“at end of billing period”).
4. In test mode, as a church owner, open Dashboard → Billing → Subscribe, pay
   with card `4242 4242 4242 4242`, confirm the profile shows the livestream and
   app buttons. Then use “Manage billing” to cancel and, with the Stripe CLI,
   advance time or trigger `invoice.payment_failed` to confirm behaviour.
   Locally: `stripe listen --forward-to localhost:3004/api/billing/webhook`.

## 5. Backups and restore

Use the database provider’s automatic backups / point-in-time recovery (Neon
and Supabase both offer it; confirm retention on your plan). Additionally take a
logical dump before every migration:

```bash
pg_dump "$DATABASE_URL" --format=custom --no-owner --file=cccd-$(date +%F).dump
```

Restore into an empty database (never over production without a fresh dump):

```bash
createdb cccd_restore
pg_restore --no-owner --dbname=cccd_restore cccd-YYYY-MM-DD.dump
```

Point a preview deployment's `DATABASE_URL` at the restored copy to check it
before switching production. Uploaded photos live in Vercel Blob, which is not
included in database dumps; keep the Blob store.

The admin “Export contacts” CSV is a convenience export, not a backup.

## 6. Cron

`vercel.json` runs `/api/cron/weekly-scan` every Monday 08:00 UTC. Vercel sends
`Authorization: Bearer $CRON_SECRET`. The route reviews up to `SCAN_BATCH_SIZE`
church websites sequentially (10s timeout each) and prunes expired sessions and
rate-limit rows. The route is limited to 60 seconds (fits the Hobby plan); the
review stops starting new checks after 45 seconds and the remainder are picked
up first next week (oldest-checked first).

## 7. Local development

```bash
npm install
npm run db:local            # terminal 1: local Postgres-compatible DB (PGlite) on :55432
cp .env.example .env.local  # set DATABASE_URL to the PGlite URL below, AUTH_SECRET, ADMIN_EMAIL
npm run db:setup            # migrate + import real church records
npm run dev                 # http://localhost:3004
```

Local `DATABASE_URL`:
`postgresql://postgres:postgres@127.0.0.1:55432/postgres?connection_limit=1&sslmode=disable&pgbouncer=true`

PGlite is for development and tests only. It runs every connection on one
session, so concurrent transactions can interleave; production must use real
Postgres. With `EMAIL_PROVIDER=log`, sign-in links print in the dev server
console and appear (subject only) in Admin → Email log.

## 8. Logs and errors

Server code writes JSON lines (`{"level","event",…}`) to stdout/stderr; Vercel
keeps them under Logs and can forward them with a log drain. Error pages show a
reference code that matches the `digest` in the logs. There is no third-party
error tracker; if the owner wants alerts, add a Vercel log drain or Sentry.

## Security follow-up (2026-11-20)

The owner authorized the necessary remaining security changes after release #17.
This follow-up upgrades root/shared/mobile application Zod to **4.6.7**, updates
Zod error options and the shared client's type signature, and preserves the API
v1 response envelopes, default values and field-error paths. The mobile change
is limited to validation compatibility and lockfile metadata; no mobile features,
native builds or store releases are included. Expo retains a separate internal
Zod 3 dependency; no claim of a full mobile SDK security audit is made.

Website `npm audit` and `npm audit --omit=dev` now both report **zero findings**.
This includes development-tool fixes: Vitest 4.1.12 (first patched 4.x line),
explicit Vite 7.3.8 (preserves the previous transformer major), tsx 4.23.15 and
compatible TypeScript-ESLint / selector-parser dependency updates. Integration
configuration uses Vitest 4's `maxWorkers: 1` with file parallelism disabled,
preserving serial access to the isolated database. CI now audits all website
dependencies at the high severity threshold, rather than only production
critical findings. Audit results are time-specific and must be rechecked later.

### Enforced browser policy

The previous report-only CSP is replaced by an enforced policy in Next.js 15
`middleware.ts`. Each matched request gets a new 128-bit cryptographic nonce.
The middleware overwrites incoming nonce/CSP headers and forwards its trusted
policy to Next, which adds the nonce to its bootstrap. The root WebSite JSON-LD,
shared JSON-LD component and profile's Church JSON-LD use the same request nonce.
Existing escaping and structured-data content are preserved.

Production policy (`NONCE` is fresh per response):

```text
default-src 'self'; script-src 'self' 'nonce-NONCE'; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self'; frame-src https://www.google.com; form-action 'self' https://checkout.stripe.com https://billing.stripe.com; base-uri 'self'; object-src 'none'; frame-ancestors 'none'
```

Arbitrary inline JavaScript and inline event handlers are blocked. Same-origin
scripts remain allowed; this is not a strict-dynamic policy. Inline styles remain
allowed for React and Leaflet positioning, and arbitrary HTTPS image hosts remain
allowed for church-supplied photos/flyers. These are deliberate compatibility
allowances, not claims of a complete XSS defense. Public JSON APIs and Next static
assets/image optimizer bypass the nonce middleware; existing global security
headers and public API CORS remain intact. Pages already use force-dynamic and
no-store; do not add shared HTML caching or static rendering without redesigning
nonce handling. No database queries are added to the middleware.

Local development alone permits unsafe-eval and WebSocket connections for HMR.
Vercel Preview alone permits its existing toolbar origin (vercel.live for scripts,
frames and connections; ws-us3.pusher.com for its WebSocket). Production receives
none of these toolbar/development allowances. No report endpoint, third-party
monitoring integration or real environment/password change is introduced.

Validation before release: 116 unit tests, 80 isolated integration tests, website
and mobile typechecks, lint, production build, and a real Chrome local fixture
proving trusted scripts run while untrusted inline scripts/event handlers are
blocked. Built login HTML is checked with the password flag on/off: all 29 script
tags match the response nonce, a new request gets a different nonce, spoofed
headers are overwritten, and cache-control remains no-store. Preview and final
live evidence are tracked in the security follow-up PR and review report.

Campus coverage follow-up: the campus landing and organization detail pages now
use the same nonce-bearing, HTML-safe JsonLd component. A regression test checks
nonce output and escaping of a closing-script payload without changing decoded
structured-data values. A source coverage test guards all direct inline script
tags in app/components. Unit-test JSX uses Next's automatic runtime. Current unit
count is 118, integration count remains 80; release evidence is linked from #18.

Cloudflare can insert its same-origin external email-decode script without a
nonce. The production policy intentionally permits same-origin external scripts;
HTTP verification requires nonces on inline tags, checks supplied nonces match,
and separately validates any unnonced external script is same-origin.

Sources: [Zod migration guide](https://zod.dev/v4/changelog),
[Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5),
[Next.js 15 nonce guidance](https://nextjs.org/docs/15/app/guides/content-security-policy).

## Dependency advisories — historical release #17

The table below records the first release's disposition. Its remaining root/shared
Zod finding and report-only stage are superseded by the follow-up above.

Security release review: **2026-11-20**. Audit scope is the production dependency
graph (`npm audit --omit=dev`), not proof that every advisory is reachable.
The refreshed previously reviewed candidate had 8 high / 1 moderate package
findings. This release candidate has **0 critical / 0 moderate / 1 high**.
The critical CI gate exits 0. The remaining high finding is open, not dismissed.

| Component | Release version / disposition | Advisory |
| --- | --- | --- |
| Next.js / matching lint config | **15.5.29**, current patched 15.x. No framework major upgrade. | Fixes [critical image optimization](https://github.com/advisories/GHSA-2464-fhr4-w9xw), [Server Actions DoS](https://github.com/advisories/GHSA-p3m5-59mp-jv5r), [SVG bypass](https://github.com/advisories/GHSA-7qx7-33qx-rqx2), [Edge cookie exposure](https://github.com/advisories/GHSA-f3mh-rxg3-f5g2), [forwarded response issue](https://github.com/advisories/GHSA-pc58-hwjq-p385). The three November findings affect releases through 15.5.28. |
| undici | **6.29.1**, compatible refresh within Blob's existing range. | Fixed ranges all end below 6.29.1: [EventSource](https://github.com/advisories/GHSA-4qv8-2p9j-2685) (`>=6.5.0`), [encodings](https://github.com/advisories/GHSA-xjj6-f33q-929c) (`>=6.23.0`), [Agent TLS](https://github.com/advisories/GHSA-2m5v-pch6-74hx) (`>=4.0.0`), [renegotiation](https://github.com/advisories/GHSA-qrxm-fqhp-jwvm) (`>=4.2.1`), [WebSocket](https://github.com/advisories/GHSA-9fm3-97px-rjf6) (`>=5.15.0`). |
| deepmerge-ts through Prisma config | **8.0.0**, scoped override under `@prisma/config`; first patched release. | [Recursive graph exhaustion](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), affected `<8.0.0`. Latest Prisma 6.19.3 still pins 7.1.5; its override follows SEC-001's specified fallback when no parent patch exists. Version 8 retains CommonJS/ESM exports and supports Node 22. Prisma generation, validation and real migrations in the temporary integration database are verified before release. |
| effect through Prisma config | **3.22.1**, scoped override under `@prisma/config`, same major. | [TemplateLiteral regex exhaustion](https://github.com/advisories/GHSA-7589-6fvf-x4pw), affected `<=3.22.0`. Parent Prisma 6 has no fixed release. No direct application use of this API was found; override removes the affected tooling dependency. |
| Vercel Blob / OIDC / CLI config | Blob **2.8.0** and OIDC **3.8.10** retained; scoped OIDC override selects CLI config **0.3.6**, which uses patched Zod **4.6.7**. | [Zod exhaustion](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). Affects CLI config `<=0.3.5`, OIDC `3.6.0 - 4.0.5`, and Blob `>=2.4.1-b7027de-20260616193056` transitively. Newest Blob 2.9.0 still requests the affected parent chain, so no blind downgrade or OIDC major upgrade. Explicit-token `put()` options remain unchanged; no production upload was made. |
| Root/shared Zod | **3.25.76 retained: one high finding remains.** | [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), affected `<4.6.6`; first patch 4.6.6. Public submission schemas do call the affected array API, so this is not classified as unused or fixed. Root and shared API/client schemas use Zod 3 conventions; a coordinated 3→4 migration affects validation errors and the mobile/shared contract. It remains a separate architecture-reviewed task under the approved plan's major-upgrade rule. |

Prisma CLI and client remain paired at **6.19.3**. No database schema change,
new production migration, storage setting or password value is part of this
release. Existing sharp/postcss overrides remain. Keep the scoped overrides
until compatible parent releases include the fixes; re-audit before removing
them. Never use `npm audit fix --force`.

## Administrator password sign-in

`ADMIN_PASSWORD_LOGIN` accepts `on` (default) or `off`. The default preserves
existing password access when `ADMIN_PASSWORD` is configured. With `off`, the
password section is hidden and the server refuses password sign-in before any
credential comparison. Email-link sign-in and existing sessions are unchanged.
Test the emailed sign-in link before choosing email-only access.

Password sign-in is limited to 10 attempts per client address and 5 per
normalized submitted email per 15-minute fixed window, using the existing
Postgres-backed limiter. Changing client address does not bypass the account
limit; changing email case or whitespace does not create another account key.
After the window resets, password sign-in can be attempted again. This can
also temporarily delay a legitimate administrator if someone targets their
email; email links remain a separate sign-in path.

Expected authentication failures (wrong/missing credentials, password login
off, or either limit exceeded) all return the same existing form message:
"That email and password did not match." Operational database failures retain
the existing safe error handling. No authentication failure reason is shown
to the visitor.

Audit actions: `auth.password_failed` and `auth.password_signed_in`. Failed
attempts are attributed to anonymous and contain only a reason code and the
existing HMAC hash of the client key. Submitted passwords, full IPs and failed
email addresses are never included. Success is attributed to the configured
administrator's user record. Audit write failures do not bypass sign-in checks.

Owner note: set `ADMIN_PASSWORD_LOGIN=off` in Vercel when you are comfortable
using email links only. **This task does not change deployed environment
values.** The new setting is documented in `.env.example`; no real `.env`
file or configured password is changed.

## Content Security Policy — reporting only

SEC-002 adds `Content-Security-Policy-Report-Only` to all routes through the
existing Next.js header rule. It does **not enforce** resource restrictions,
and no reporting endpoint is configured. Violations appear in the browser
console and must be reviewed before any future enforced policy.

Policy: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self'
'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src
'self'; frame-src https://www.google.com; form-action 'self'
https://checkout.stripe.com https://billing.stripe.com; base-uri 'self';
object-src 'none'; frame-ancestors 'none'`.

Next's inline bootstrap and JSON-LD need `unsafe-inline` until a separate
nonce-based implementation is approved. Arbitrary HTTPS images remain allowed
because churches supply photo/flyer links from many hosts; redundant individual
HTTPS image hosts were omitted because the `https:` scheme covers them all.
Google Maps is the existing embedded frame. Existing X-Frame-Options DENY,
HSTS, nosniff, permissions/referrer policies and public API CORS are unchanged.
Preview tooling can produce expected report-only violations for Vercel's
external toolbar/feedback resources; record observed violations in the release
review rather than widening the production policy for developer tooling.
