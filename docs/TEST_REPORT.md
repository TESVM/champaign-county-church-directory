# Test report

## Vercel preview build fix — 2026-10-09

- The first Vercel preview build of this PR failed; the log needs a Vercel login, so the
  exact cause is unconfirmed. Reproduced locally the most likely cause: a saved environment
  value that fails validation (e.g. an `AUTH_SECRET` under 32 characters) aborted
  `next build` while collecting page data.
- Fixed: during the build, malformed runtime values are reported and ignored; the server's
  start-up check still refuses to run with them. Verified both locally, plus a unit test.

## Resume verification — 2026-10-09

- Restarted the existing `.pglite-dev` database on localhost:55432 and the
  development preview on http://127.0.0.1:3007.
- Fresh typecheck and lint passed; 89 unit tests and 48 integration tests passed.
  The initial integration attempt was blocked by local socket permissions;
  rerunning after network permission was granted passed all 48 tests.
- `/api/health` returned `status: ok`, database `ok`, and 70 active churches.
  Email is log-only (not delivered), billing is not configured, and uploads use
  development-local storage. These are still launch blockers/setup items.
- `/directory` returned HTTP 200 and rendered “70 churches”.
- Browser automation timed out attaching to the old tab and opening the new
  directory tab. This run confirms the HTTP response, not a fresh visual or
  interactive browser check. Previous browser results below are historical.
- No production deployment or live payment was performed. Production build
  results below belong to the prior verification run and were not repeated here.

Run on 2026-10-08/09, macOS, Node 25.6 locally (CI is configured for Node 22).
Branch `feat/production-launch`.

## Automated

| Suite | Result | What it covers |
| --- | --- | --- |
| `npm run typecheck` | Pass | Whole app, tests, scripts |
| `npm run lint` | Pass, 0 warnings | |
| `npm test` (unit) | **89 passed** | Serializers + paid-field gating, America/Chicago conversion incl. both 2026 DST changes, time parsing, link/phone validation (javascript:, data:, credentials, private IPs, platform domains), claim email-domain matching, entitlement rules, ICS escaping/folding, safe redirects, distance, AI-image gating |
| `npm run test:integration` | **48 passed** | Real migrations applied to an in-memory Postgres (PGlite), then: import (fixtures excluded, idempotent, never overwrites newer/confirmed data, separate App Store/Google Play/livestream/social); magic links (unknown address sends nothing, single use, expiry, rate limit, bootstrap admin); sessions (logout, expiry, forged cookies, disabled users); claim → approval → owner edits own church only; list-field change detection; editor invite/permissions/revocation taking effect immediately; unauthorised anonymous/other-church/support actors rejected on every sensitive service; contact/correction/submission persistence, duplicate detection, approval publishes; Stripe signature checks, retries (duplicate), out-of-order (stale) events, past-due grace, renewal, cancellation, lapsed period, complimentary grants, webhook 400/500 behaviour; events entitlement, DST-stable weekly occurrences, ICS route; visitor guide + accessibility/children/language filters; same-service day+time filter and pagination; closed/hidden excluded; AI images never shown; resources moderation and re-review; QR PNG/SVG; activity counting, bot filtering, de-duplication, no identifiers stored; photo upload signature sniffing and provenance; website review (robots.txt, platforms skipped, network/timeout/HTTP/private-network outcomes, redirect proposals, no duplicate proposals, approval applies + audit); API entitlement gating; reconnect persistence; health check; missing/unreachable database errors |
| Mutation check | Caught | Weakening `canEditChurch` made 3 permission tests fail |
| `next build` | Pass | All routes dynamic; sitemap/robots render per request |

Note: some local runs showed long wall-clock totals because the machine slept; measured setup is 4–30s, tests 30–60s, teardown under 1s. Prisma interactive transactions now allow 20–60s so a slow database cannot abort an import or save. The
machine's clock jumped and stale test processes from interrupted runs were
competing. A teardown timeout and setup timing log were added; watch the first
CI runs.

## Manual, in a browser and with curl (local Postgres-compatible DB, 70 real churches)

Verified:

- All public routes return 200 (home, directory with filters and page 2, Find a Service, cities, events, resources, profile, OG image, claim, submit, contact, login, saved, sitemap, QR, ICS, API); unknown church 404; `/search` redirects; `/admin` redirects when signed out; CSV export 403 when signed out.
- Journey: visitor submits claim (honest success after save) → staff and applicant emails recorded → admin signs in by emailed link → approves → applicant signs in → dashboard scoped to one church → adds a service time → live on the public page with “Confirmed by church” → other church’s dashboard denied → simulated signed Stripe `subscription.created` unlocks livestream/App Store/Google Play/social on page and API → `subscription.deleted` removes them → forged webhook 400 → sign out ends session.
- Edits survived a restart of the database process.
- Correction form: too-short input shows an error, keeps typed text, saves nothing.
- Mobile (375px): directory and profile have no horizontal scroll; buttons ≥44px.
- Production server (`next start`): boots with full config; refuses to boot with missing secrets (deploy-log error); security headers present; canonical and og:image tags; robots disallows indexing outside production.
- Website review against 5 real church sites: 5 OK, 2 evidence-backed proposals queued (a phone mismatch on CU Bridge’s site; a staff email on Bethel AME’s site), no listing changed.

Bugs found and fixed during this testing: queue decisions lost their
confirmation message; list edits reported “nothing changed”; production config
check rejected an allowed log provider; sitemap/robots frozen at build; local
PGlite connection limits.

## Not verified (needs owner credentials or services)

- Real email delivery through Resend (only the log provider was exercised).
- Real Stripe test-mode checkout, customer portal, and live webhooks (webhook logic verified with signed simulated events and unit/integration tests only).
- Vercel Blob uploads (local file storage verified).
- Deployment on Vercel, the scheduled cron, and real Postgres under concurrent load.
- Screen-reader testing with VoiceOver/NVDA and a full WCAG audit (labels, focus, roles, target sizes were checked in code and spot-checked).
- Physical phones (mobile checked by viewport emulation).
