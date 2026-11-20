# 07 · Implementation Backlog for ChatGPT

Read `10_CHATGPT_HANDOFF.md` first. Do tasks in the order of the table. One task = one branch = one pull request. Do not merge; the owner approves merges.

**Standing rules for every task** (not repeated below)
- Run and report: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:integration`, `npm run build`.
- Never invent church facts, people, reviews, or photos. Never commit secrets. Never edit `.env*` files.
- Do not touch these uncommitted local files: `.gitignore`, `docs/LAUNCH_CHECKLIST.md`, `docs/TEST_REPORT.md`, `docs/CODEX_HANDOFF.md`, `next-env.d.ts`.
- Database migrations must be additive (new nullable columns or new tables only).
- Completion report for every task: branch name, PR link, files changed, the five command results (pass/fail with counts), screenshots at 375 px and 1366 px for visual tasks, anything not done and why.

## Order

| # | ID | Title | Priority | Depends on |
|---|---|---|---|---|
| 1 | SEC-001 | Upgrade Next.js past the critical advisory; triage the rest | P0 | — |
| 2 | UI-001 | Load the brand fonts | P1 | SEC-001 |
| 3 | SEC-003 | Harden administrator password sign-in | P1 | SEC-001 |
| 4 | SEC-002 | Content-Security-Policy, report-only | P1 | SEC-001 |
| 5 | UI-002 | Color tokens aligned with the logo | P1 | UI-001 |
| 6 | UX-004 | Claim prompt on unclaimed listings | P1 | UI-002 |
| 7 | UI-004 | Photo-forward church card | P1 | UI-002 |
| 8 | UI-003 | Homepage hero and structure | P1 | UI-002, UI-004 |
| 9 | UX-001 | Grouped navigation and mobile menu | P1 | UI-002 |
| 10 | PERF-001 | Cache public data reads | P1 | SEC-001 |
| 11 | SEO-001 | Event structured data | P1 | — |
| 12 | SEO-003 | Link, index, and sitemap hygiene | P1 | — |
| 13 | MOT-001 | Motion primitives and loading states | P2 | UI-004 |
| 14 | UX-002 | Filter bar and mobile filter sheet | P2 | UI-002 |
| 15 | UX-003 | Sticky action bar on mobile profiles | P2 | UI-002 |
| 16 | SEO-002 | FAQ page | P2 | owner approves text |
| 17 | IMG-001 | Photo coverage report and site imagery slots | P2 | UI-003 |
| 18 | SEO-006 | Analytics and conversion events | P2 | **owner approval** |
| 19 | SEO-004 | Three visitor guides | P2 | owner approves text |
| 20 | SEO-005 | Outreach kit for churches and local sites | P2 | — |
| 21 | OPS-001 | Operations notes; test-listing cleanup | P3 | owner decision |
| 22 | GROW-001 | Monthly listing summary email | P3 | **owner approval** |

Tasks 1 to 12 are specified in full below. Tasks 13 to 22 are specified in brief and will be expanded by the architect when their dependencies are approved.

---

## SEC-001

**TITLE:** Upgrade Next.js past the critical advisory and triage remaining advisories
**PRIORITY:** P0 Critical
**OBJECTIVE:** Remove a known critical vulnerability from the live site and unblock CI.
**CURRENT CONDITION:** `npm audit --omit=dev` (2026-11-10) reports 9 advisories: critical on `next` (range 10.0.0 to 15.5.27; installed 15.5.27), high on `prisma`, `@prisma/config`, `zod` (<4.6.6), `undici`, `deepmerge-ts`, `@vercel/blob`, `@vercel/cli-config`, `@vercel/oidc`. CI runs `npm audit --omit=dev --audit-level=critical` and will fail.
**EXPECTED RESULT:** No critical advisories. Every high advisory is either fixed or listed with a written reason in `docs/DEPLOYMENT.md` under a new "Dependency advisories" heading.
**TARGET FILES:** `package.json`, `package-lock.json`, `docs/DEPLOYMENT.md`; `mobile/` is out of scope.
**IMPLEMENTATION INSTRUCTIONS:**
1. Run `npm audit --omit=dev --json` and record each advisory ID, affected range, and patched version.
2. Upgrade `next` to the lowest patched 15.x release. Do not move to a new major.
3. Upgrade `prisma` and `@prisma/client` together to the lowest patched 6.x if one exists. If the only fix is a major version, stop and report; do not upgrade majors.
4. `zod`: the suggested fix is a major jump (3 → 4). Read the advisory. If it concerns an API this code does not call, document that and leave zod 3. Otherwise report back before changing.
5. `@vercel/blob`: `npm audit` suggests a downgrade to 2.4.0. Check whether a newer patched release exists first; prefer newer. Photo upload uses `put()` in `lib/media.ts`; keep its options working.
6. `undici`, `deepmerge-ts`: transitive. Use `overrides` in `package.json` only if the parent has no patched release (two overrides already exist; follow that pattern).
7. Do not run `npm audit fix --force`.
**DESIGN REQUIREMENTS:** None.
**TECHNICAL REQUIREMENTS:** Node 22 in CI (engines `>=20.9 <23`). `scripts/vercel-build.mjs` must still run `prisma migrate deploy` then `next build`.
**SEO REQUIREMENTS:** None; rendered HTML must be unchanged.
**DEPENDENCIES:** None.
**DO NOT CHANGE:** Application code, unless the Next.js patch requires a small compatibility fix (report it). No schema changes.
**ACCEPTANCE CRITERIA:** `npm audit --omit=dev --audit-level=critical` exits 0. All five standard commands pass. The advisory table exists in `docs/DEPLOYMENT.md`.
**TESTING PROCEDURE:** Standard commands. Then `npm run build && npm start` locally is not possible without a database; instead confirm the Vercel preview deployment for the PR builds, and load `/`, `/directory`, `/map`, `/churches/sheriff-temple-aoh-church-of-god`, `/api/health` on the preview URL (each returns 200).
**DELIVERABLES:** PR with lockfile changes and the advisory table.
**COMPLETION REPORT:** Before/after `npm audit` summaries; installed versions; preview URL checks.

---

## UI-001

**TITLE:** Load the brand fonts with `next/font`
**PRIORITY:** P1 High
**OBJECTIVE:** Visitors should see the intended typefaces; today they see system fallbacks.
**CURRENT CONDITION:** `app/globals.css` sets `--font-body: "Source Sans 3"` and `--font-display: "Fraunces"`, and `tailwind.config.ts` maps `font-sans` and `font-display` to those variables. Nothing loads the fonts (no `next/font`, `@font-face`, or stylesheet link).
**EXPECTED RESULT:** Fraunces and Source Sans 3 are self-hosted by Next.js, applied through the same CSS variables, with no layout shift when they load.
**TARGET FILES:** `app/layout.tsx`, `app/globals.css`, `tailwind.config.ts`.
**IMPLEMENTATION INSTRUCTIONS:**
1. In `app/layout.tsx`, import `Fraunces` and `Source_Sans_3` from `next/font/google` with `subsets: ["latin"]`, `display: "swap"`, and `variable: "--font-display"` / `"--font-body"`.
2. Add both `.variable` class names to the `<html>` element (keep `lang="en"`).
3. Remove the two string assignments of those variables from `:root` in `app/globals.css`.
4. Confirm `body` uses `font-sans`; add it in `globals.css` if missing.
**DESIGN REQUIREMENTS:** Fraunces weights 400 to 600 for headings; Source Sans 3 400 to 700 for everything else. No other font changes.
**TECHNICAL REQUIREMENTS:** No external font requests at runtime (Next self-hosts). The build must not need network access beyond what `next/font` does at build time.
**SEO REQUIREMENTS:** Cumulative layout shift must not increase; `next/font` size-adjust handles this.
**DEPENDENCIES:** SEC-001 merged.
**DO NOT CHANGE:** Font sizes, colors, component markup.
**ACCEPTANCE CRITERIA:** On the preview, computed `font-family` of an `h1` starts with the Fraunces family and of body text with the Source Sans 3 family. No request to `fonts.googleapis.com` or `fonts.gstatic.com` in the network panel.
**TESTING PROCEDURE:** Standard commands; view `/`, `/directory`, a church profile, `/admin` (signed out redirect is fine) at 375 and 1366 px.
**DELIVERABLES:** PR; before/after screenshots of the homepage and one church profile.
**COMPLETION REPORT:** Computed font families; network evidence; screenshots.

---

## SEC-003

**TITLE:** Harden administrator password sign-in
**PRIORITY:** P1 High
**OBJECTIVE:** Reduce the chance of the admin account being guessed, and record attempts.
**CURRENT CONDITION:** `passwordSignIn` in `lib/services/auth.ts` (near line 124) applies one limit, `rateLimit("password-ip", clientKey, 10, 60 * 15)`, compares against `ADMIN_EMAIL` and `ADMIN_PASSWORD` in constant time, and on success upserts the user as `ADMIN` with `disabledAt: null`. Failures are not audited. The login page shows the password form whenever `ADMIN_PASSWORD` is set.
**EXPECTED RESULT:** A per-account limit as well as the IP limit; failed and successful password sign-ins appear in the audit log; a new optional flag can hide and disable password sign-in.
**TARGET FILES:** `lib/services/auth.ts`, `lib/env.ts`, `app/login/page.tsx`, `app/actions.ts` (the `passwordSignInAction`), `tests/integration/auth.test.ts`, `docs/DEPLOYMENT.md`, `.env.example`.
**IMPLEMENTATION INSTRUCTIONS:**
1. Add a second limit keyed on the submitted email: 5 attempts per 15 minutes (`rateLimit("password-account", email, 5, 60 * 15)`), applied before comparison.
2. On failure, write an audit entry (`auth.password_failed`) with no password and no full IP (use the existing keyed hash of the client key if one is available in `lib/services/rate-limit.ts`; otherwise omit it).
3. On success, write `auth.password_signed_in`.
4. Add `ADMIN_PASSWORD_LOGIN` to the env schema, values `"on" | "off"`, default `"on"`. When `"off"`, `passwordSignIn` returns null without comparing, and the login page does not render the password section.
5. Keep the same generic error message for every failure.
**DESIGN REQUIREMENTS:** None beyond hiding the section when off.
**TECHNICAL REQUIREMENTS:** Constant-time comparison stays. Do not log passwords or emails of failed attempts other than the configured admin email.
**SEO REQUIREMENTS:** None (`/login` is disallowed in robots).
**DEPENDENCIES:** SEC-001.
**DO NOT CHANGE:** Magic-link sign-in; session handling; the value of any environment variable.
**ACCEPTANCE CRITERIA:** New integration tests prove: the 6th attempt for one email within the window is refused even from a new client key; a failure and a success each create an audit row; with the flag off, a correct password is refused.
**TESTING PROCEDURE:** Standard commands.
**DELIVERABLES:** PR with tests and docs.
**COMPLETION REPORT:** Test names and results; note to owner: "set `ADMIN_PASSWORD_LOGIN=off` in Vercel when you are comfortable using email links only".

---

## SEC-002

**TITLE:** Add a Content-Security-Policy in report-only mode
**PRIORITY:** P1 High
**OBJECTIVE:** Limit what scripts, frames, and connections pages can use, without breaking the site.
**CURRENT CONDITION:** `next.config.mjs` `headers()` sets HSTS, nosniff, frame deny, referrer, and permissions policies. There is no CSP and no `middleware.ts`.
**EXPECTED RESULT:** Every HTML response carries `Content-Security-Policy-Report-Only`. A written list of violations observed on the preview. Enforcement is a later task after review.
**TARGET FILES:** `next.config.mjs`, `docs/DEPLOYMENT.md`.
**IMPLEMENTATION INSTRUCTIONS:**
1. Add the header to the existing `"/:path*"` block with this starting policy, adjusted only where you verify a need:
   - `default-src 'self'`
   - `script-src 'self' 'unsafe-inline'` (Next.js inline bootstrap and the JSON-LD scripts need this until a nonce is introduced; say so in the docs)
   - `style-src 'self' 'unsafe-inline'`
   - `img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://images.unsplash.com https://static.wixstatic.com https://cloud-1de12d.becdn.net https://*.tile.openstreetmap.org https://i.ytimg.com https://*.ytimg.com https:` — then tighten: church-linked photos and flyers can come from any https host, so `https:` must stay for images
   - `font-src 'self'`
   - `connect-src 'self'`
   - `frame-src https://www.google.com` (the church profile embeds a Google Maps iframe in `components/directory/map-section.tsx`)
   - `form-action 'self' https://checkout.stripe.com https://billing.stripe.com`
   - `base-uri 'self'`; `object-src 'none'`; `frame-ancestors 'none'`
2. Open the preview with the browser console on `/`, `/map`, `/live`, a church profile with a map embed, `/events`, `/dashboard` (signed out), and list every report-only violation.
3. Do not add a reporting endpoint.
**DESIGN REQUIREMENTS:** None.
**TECHNICAL REQUIREMENTS:** Report-only header name exactly. Leave all existing headers.
**SEO REQUIREMENTS:** None.
**DEPENDENCIES:** SEC-001.
**DO NOT CHANGE:** `X-Frame-Options`, CORS block for `/api/v1`.
**ACCEPTANCE CRITERIA:** Header present on `/` and `/churches/[slug]` on the preview; site behaves identically; violation list delivered.
**TESTING PROCEDURE:** Standard commands; `curl -sI <preview>/ | grep -i content-security`.
**DELIVERABLES:** PR; violation list in the PR description.
**COMPLETION REPORT:** Final policy string; violations and proposed adjustments for the enforcement task.

---

## UI-002

**TITLE:** Align color tokens with the logo and simplify the page background
**PRIORITY:** P1 High
**OBJECTIVE:** One coherent palette drawn from the logo (deep green, gold), defined once.
**CURRENT CONDITION:** `tailwind.config.ts` defines `brand` greens, `sage`, `sky`, `rose` (#f28b66), `clay` (#8f4529). The logo's accent is gold (about #c8861a). `app/globals.css` paints `body` with two radial gradients plus a linear gradient; `.section-wash` and `.section-strong` add more tinted gradients with coral.
**EXPECTED RESULT:** New `gold` tokens; coral removed from washes and dividers; calmer background; no contrast regressions.
**TARGET FILES:** `tailwind.config.ts`, `app/globals.css`, `components/layout/section-heading.tsx` (divider gradient), plus any file found by searching for `to-rose`, `via-rose`, `from-rose`, `bg-rose`, `text-rose`, `rgba(242, 139, 102`.
**IMPLEMENTATION INSTRUCTIONS:**
1. Add `gold: { 500: "#c8861a", 700: "#8a5a0a" }`. Compute the contrast of gold-700 on `#ffffff` and on `canvas`; if under 4.5:1, darken until it passes and record the final value.
2. Replace the `body` background with `canvas` plus one radial glow of brand-500 at 10% opacity at top-left.
3. In `.section-wash` and `.section-strong`, replace coral radial stops with gold-500 at no more than 12% opacity.
4. Section heading divider: `from-brand-700 via-brand-300 to-gold-500`.
5. "Featured" chips currently use Tailwind `amber-*`; switch to gold tokens (text gold-700 on a gold-500/12% background, verify 4.5:1).
6. Leave `rose` and `clay` defined; add a comment that `rose` is deprecated.
**DESIGN REQUIREMENTS:** See `02_DESIGN_DIRECTION.md` section 2. Gold-500 is never a text color and never sits under white text.
**TECHNICAL REQUIREMENTS:** Tokens only; no per-component hex values.
**SEO REQUIREMENTS:** None.
**DEPENDENCIES:** UI-001.
**DO NOT CHANGE:** The dark gradient cards fixed for contrast in October (`components/directory/pinned-church-spotlight.tsx`, the musician banner in `app/page.tsx`) except to swap nothing: they stay green → clay.
**ACCEPTANCE CRITERIA:** axe-core (WCAG 2 A/AA, 2.1, 2.2 tags) reports 0 violations on `/`, `/directory`, a church profile, `/campus`, `/map`. A table of every new text/background pair with its contrast ratio is in the PR.
**TESTING PROCEDURE:** Standard commands; run axe in the browser on the preview (load `axe-core` from cdnjs, `axe.run` with those tags).
**DELIVERABLES:** PR; contrast table; before/after screenshots of five pages.
**COMPLETION REPORT:** As above.

---

## UX-004

**TITLE:** Make the claim prompt visible on unclaimed listings
**PRIORITY:** P1 High
**OBJECTIVE:** No church has claimed its listing. Leaders who land on their own page should see how in the first screen.
**CURRENT CONDITION:** `app/churches/[slug]/page.tsx` renders "Part of this church's leadership?" as a card near the bottom of the right column (about line 620). `/claim` and `/for-churches` exist and work.
**EXPECTED RESULT:** On listings where `church.claimed` is false, a slim, dismissible-free notice sits directly under the header block; the existing bottom card remains.
**TARGET FILES:** `app/churches/[slug]/page.tsx`; new `components/directory/claim-notice.tsx`.
**IMPLEMENTATION INSTRUCTIONS:**
1. Create `ClaimNotice` (server component): one line of text and one link button. Text: "Is this your church? Manage this listing free: update service times, add photos, and post events." Button: "Claim this listing" → `/claim?church={slug}` (check how the bottom card builds its link and reuse that exact href).
2. Under the button, in small text: "Free. No card needed. We review every request."
3. Render it only when the listing is unclaimed and status is ACTIVE.
4. Do not show it to signed-in members of that church.
**DESIGN REQUIREMENTS:** Full-width band inside the page container, brand-50 background, 1 px brand-100 border, radius 20, 16 px padding; stacks on mobile; button is the secondary style, 44 px tall.
**TECHNICAL REQUIREMENTS:** No client JavaScript.
**SEO REQUIREMENTS:** The notice is ordinary text; do not add it to structured data.
**DEPENDENCIES:** UI-002.
**DO NOT CHANGE:** Claim form, claim review flow, the verification wording at the top of the profile.
**ACCEPTANCE CRITERIA:** Visible without scrolling at 1366×768 and within the first two screens at 375×812 on an unclaimed listing; absent on a claimed listing (add an integration or component test using an existing helper that marks a church claimed).
**TESTING PROCEDURE:** Standard commands; screenshots of one unclaimed listing at both widths.
**DELIVERABLES:** PR, screenshots, test.
**COMPLETION REPORT:** As standard.

---

## UI-004

**TITLE:** Photo-forward church card
**PRIORITY:** P1 High
**OBJECTIVE:** Cards should help people recognize and compare churches at a glance.
**CURRENT CONDITION:** `components/directory/church-card.tsx`: 192 px image or gradient placeholder with "Photo not yet provided"; body lists a joined string of every service time; website/livestream/app links. `lib/time/next-service.ts` can compute the next service; the map preview card (`components/map/church-map.tsx`) already shows it.
**EXPECTED RESULT:** One card design used by directory, city, denomination, homepage, and saved lists: 3:2 photo, name, "City · Denomination", "Next service: …", up to three fact chips, whole card focusable through the name link.
**TARGET FILES:** `components/directory/church-card.tsx`; callers found by searching for `ChurchCard`.
**IMPLEMENTATION INSTRUCTIONS:**
1. Photo area `aspect-[3/2]`, `object-cover`, `sizes="(min-width:1280px) 30vw, (min-width:768px) 45vw, 100vw"`.
2. Placeholder: flat brand-100 block, centered small church icon (lucide `Church`) and the text "Photo not yet provided" in brand-900 (verify 4.5:1). Remove the per-city gradients.
3. Replace the joined service string with `nextService(church.serviceDetails ?? [])`: show "Next service: {label}" or "Service times not listed yet".
4. Chips, in this order, only when true and allowed by `featureVisible`: Details checked, Livestream, Wheelchair access, Children's program, Student-friendly. Maximum three.
5. Keep the Save button overlay and the "Featured" label.
6. Keep one "Website" text link; remove the app and livestream buttons from the card (they stay on the profile).
**DESIGN REQUIREMENTS:** Radius 20; padding 20; title Fraunces 20 px; meta 14 px; hover/focus behavior comes later in MOT-001 (do not add motion here).
**TECHNICAL REQUIREMENTS:** Server component; no new queries (data already on `ChurchRecord`).
**SEO REQUIREMENTS:** Image `alt` = church name; the name link remains an `<a>` to `/churches/{slug}`.
**DEPENDENCIES:** UI-002.
**DO NOT CHANGE:** `ChurchRecord` shape; entitlement rules; `SaveChurchButton` behavior.
**ACCEPTANCE CRITERIA:** Card height is consistent within a row; no horizontal scroll at 320 px; axe reports 0 violations on `/directory`; cards with and without photos both shown in screenshots.
**TESTING PROCEDURE:** Standard commands; screenshots of `/directory` and `/cities/champaign` at 375 and 1366 px.
**DELIVERABLES:** PR, screenshots.
**COMPLETION REPORT:** As standard.

---

## UI-003

**TITLE:** Rebuild the homepage hero and section order
**PRIORITY:** P1 High
**OBJECTIVE:** First screen: a real photograph, one promise, one search. Today it is a long text column beside a "why this works" panel.
**CURRENT CONDITION:** `app/page.tsx` (about 256 lines): two-column hero with headline "Find churches by city, service style, ministries, and pastoral leadership.", `HeroSearch`, three buttons, three stat boxes, a right-hand feature panel; then quick links, the pinned church spotlight, featured churches, cities, church of the week, recently updated, musician banner.
**EXPECTED RESULT:** Full-width photo hero with headline, search, three actions; then "Services coming up next" (reuse `getWorshipHub` next list, limit 4), cities, the spotlight card, "How listings are checked" (three short points from the current feature panel), recently updated, for-churches band, musician banner.
**TARGET FILES:** `app/page.tsx`; new `components/home/hero.tsx`; `components/directory/hero-search.tsx` (style only); `public/home/` for the hero asset.
**IMPLEMENTATION INSTRUCTIONS:**
1. `Hero`: `next/image` fill, `priority`, `sizes="100vw"`, dark-to-transparent gradient overlay from the left so white text has at least 4.5:1 over the darkest 60% (calculate against the overlay color, not the photo). Height `min(72vh, 640px)`, 520 px minimum on mobile.
2. Headline (h1): "Find a church in Champaign County". Sub-line: "Service times, directions, and what to expect, for {N} churches across {M} communities." N and M come from `getHomepageData()`.
3. Search: existing `HeroSearch`, white field, 56 px tall.
4. Actions: Explore the map (`/map`), Find a service (`/find-a-service`), Campus Faith (`/campus`).
5. **Photo:** use `public/home/hero.jpg` if it exists. If it does not, render a solid `brand-900` → `brand-700` background with the same layout. **Do not add stock or generated photos.** The owner supplies photo P1 from `02_DESIGN_DIRECTION.md`.
6. Remove the three stat boxes and the "Quick paths" grid (their links move to the navigation in UX-001; keep the grid until UX-001 merges if that task is not done yet).
7. Keep the JSON-LD `Organization` block and the `canonical` metadata.
**DESIGN REQUIREMENTS:** Section spacing 64 / 96 px; only one h1; headings in order.
**TECHNICAL REQUIREMENTS:** Server components; no new client JavaScript; LCP element is the hero image or headline.
**SEO REQUIREMENTS:** Title and description unchanged; h1 as above; hero image `alt` describes the real scene (owner supplies) or `alt=""` for the plain background.
**DEPENDENCIES:** UI-002, UI-004.
**DO NOT CHANGE:** `getHomepageData` return shape; the spotlight card text; musician banner link target.
**ACCEPTANCE CRITERIA:** Hero, search, and at least one action visible without scrolling at 375×812 and 1366×768. Lighthouse (mobile, preview URL): report LCP, CLS, and accessibility score; CLS at or under 0.1. axe 0 violations.
**TESTING PROCEDURE:** Standard commands; submit a search from the hero and confirm it lands on `/directory?q=…` with results.
**DELIVERABLES:** PR; screenshots with and without `hero.jpg`; Lighthouse numbers.
**COMPLETION REPORT:** As standard plus measured LCP/CLS.

---

## UX-001

**TITLE:** Grouped navigation and an accessible mobile menu
**PRIORITY:** P1 High
**OBJECTIVE:** Eight top-level links are hard to scan; the mobile menu is a bare disclosure.
**CURRENT CONDITION:** `components/layout/header.tsx` (server component, reads the session with `getActor()`) renders a flat `nav` array at `xl` and a `<details>` menu below `xl`.
**EXPECTED RESULT:** Four groups as specified in `06_CUSTOMER_EXPERIENCE.md` section 2 on desktop; a full-height sheet on mobile; keyboard and screen-reader operable.
**TARGET FILES:** `components/layout/header.tsx`; new `components/layout/nav-menu.tsx` (client), `components/layout/mobile-menu.tsx` (client).
**IMPLEMENTATION INSTRUCTIONS:**
1. Keep `Header` as the server component that resolves the account link; pass plain data to the two client components.
2. Desktop: each group is a `button` with `aria-expanded` and `aria-controls` opening a panel of links; Escape closes and returns focus; clicking outside closes; arrow keys are not required. "Campus Faith" is a plain link.
3. Mobile: a button opens a `<dialog>` used as a sheet (`showModal()`), which provides focus trapping and Escape for free; groups shown expanded; 48 px rows; close button first in tab order.
4. Mark the current section with `aria-current="page"`.
5. Without JavaScript the links must still be reachable: render the footer's full link list as it is today (already present).
**DESIGN REQUIREMENTS:** Header height 64 px mobile, 72 px desktop; logo left (unchanged); panels radius 20 with `soft` shadow; transitions arrive in MOT-001.
**TECHNICAL REQUIREMENTS:** No new dependencies.
**SEO REQUIREMENTS:** All destination links are real `<a href>` in the HTML.
**DEPENDENCIES:** UI-002.
**DO NOT CHANGE:** Logo, sign-in logic, the skip link in `app/layout.tsx`.
**ACCEPTANCE CRITERIA:** Tab order logical; Escape closes; focus returns to the trigger; axe 0 violations with a menu open; all previous destinations reachable in two activations or fewer.
**TESTING PROCEDURE:** Standard commands; keyboard-only walkthrough recorded as a short list of steps and results.
**DELIVERABLES:** PR; screenshots (closed, open) at both widths.
**COMPLETION REPORT:** As standard plus the keyboard walkthrough.

---

## PERF-001

**TITLE:** Cache public data reads and invalidate on change
**PRIORITY:** P1 High
**OBJECTIVE:** Faster pages and resilience when the database is slow, without showing stale edits.
**CURRENT CONDITION:** `app/layout.tsx` exports `dynamic = "force-dynamic"`; live responses carry `no-store`. Server actions already call `revalidatePath` after writes (`app/actions.ts`, helper `revalidateChurch`). The header reads the session cookie on every page.
**EXPECTED RESULT:** Read functions used by public pages are wrapped in Next's data cache with tags; writes invalidate tags. Pages may remain dynamically rendered (because of the session-aware header); the database work is what gets cached.
**TARGET FILES:** `lib/services/churches.ts` (`listChurches`, `getChurchBySlug`, `listCities`, `listDenominations`, `listLanguages`, `getHomepageData`, `listChurchesForMap`, `listDenominationFamilies`), `lib/services/engagement.ts` (`listUpcomingEvents`, `listResources`), `lib/services/campus.ts` (public list functions), `lib/services/live.ts` (`getWorshipHub`), `app/actions.ts`.
**IMPLEMENTATION INSTRUCTIONS:**
1. Create `lib/cache.ts` exporting `cached(fn, keyParts, { tags, revalidate })` built on `unstable_cache`, and tag constants: `churches`, `church:{id}`, `events`, `resources`, `campus`, `collab`.
2. Wrap **only functions that take no actor and return public data**. Functions that take an `Actor` or return hidden or pending records must not be cached.
3. `Date` objects do not survive the cache as dates. Either cache the database rows and map afterwards, or serialize and revive explicitly. Add a unit test that a cached church still has valid date fields.
4. Default `revalidate`: 300 seconds; `getWorshipHub` 60 seconds (live status must not linger).
5. In `app/actions.ts`, next to each existing `revalidatePath`, call `revalidateTag` for the affected tags. The Stripe webhook route (`app/api/billing/webhook/route.ts`) must revalidate `church:{id}` after applying an event, since entitlements change what is public.
6. Integration tests run without Next's cache runtime; make `cached` fall through to the plain function when `process.env.VITEST` is set, and add one test for the tag wiring using a mock.
**DESIGN REQUIREMENTS:** None.
**TECHNICAL REQUIREMENTS:** No change to permission checks. Never cache per-user data.
**SEO REQUIREMENTS:** HTML output unchanged.
**DEPENDENCIES:** SEC-001.
**DO NOT CHANGE:** `force-dynamic` in the layout (leave it; removing it is a separate decision).
**ACCEPTANCE CRITERIA:** On the preview, second load of `/directory` shows lower server time than the first (report both from response timing). Editing a listing in the dashboard shows on the public profile immediately. Marking a church live appears on `/live` within 60 seconds and after the action immediately.
**TESTING PROCEDURE:** Standard commands; manual edit-then-view check on the preview (the preview shares the production database: use the hidden listing "Stripe Test Church (delete me)" for edits, nothing else).
**DELIVERABLES:** PR; timing numbers.
**COMPLETION REPORT:** As standard plus timings and the edit-then-view evidence.

---

## SEO-001

**TITLE:** Event structured data
**PRIORITY:** P1 High
**OBJECTIVE:** Let search engines understand events.
**CURRENT CONDITION:** `/events` (`app/events/page.tsx`) and church profiles list events as HTML only. Helpers exist in `components/seo/json-ld.tsx` (`JsonLd`, `breadcrumbs`, `churchItemList`). Occurrences come from `listUpcomingEvents` with `startsAt` (UTC `Date`), `startTime`, `endTime`, `location`, `flyerUrl`, and the church.
**EXPECTED RESULT:** One `Event` object per listed occurrence (cap 20 per page).
**TARGET FILES:** `components/seo/json-ld.tsx`, `app/events/page.tsx`, `app/churches/[slug]/page.tsx`, `app/campus/events/page.tsx`.
**IMPLEMENTATION INSTRUCTIONS:** Add `eventJsonLd(occurrence)` returning `@type: "Event"`, `name`, `startDate` (ISO 8601 with the America/Chicago offset; use helpers in `lib/time/chicago.ts`), `endDate` when an end time exists, `eventAttendanceMode: OfflineEventAttendanceMode`, `eventStatus: EventScheduled`, `location` as `Place` with the event location text or the church name and address, `organizer` as the church (`@type: "Church"`, `url` to its profile), `image` when a flyer exists, `url` to the church profile. Omit fields you do not have. Do not output `offers`.
**DESIGN REQUIREMENTS:** None.
**TECHNICAL REQUIREMENTS:** Use `JsonLd` (it escapes `<`).
**SEO REQUIREMENTS:** Must validate in Google's Rich Results Test without errors (warnings for optional fields are acceptable; list them).
**DEPENDENCIES:** None.
**DO NOT CHANGE:** Event visibility rules (Enhanced only).
**ACCEPTANCE CRITERIA:** Unit test for `eventJsonLd` covering an all-day event, a timed event across the daylight-saving change, and an event with a flyer.
**TESTING PROCEDURE:** Standard commands. Live validation needs a published event; if none exists, validate the unit-test output by pasting it into the Rich Results Test code tab and report the result.
**DELIVERABLES:** PR, test, validation result.
**COMPLETION REPORT:** As standard.

---

## SEO-003

**TITLE:** Link, index, and sitemap hygiene
**PRIORITY:** P1 High
**OBJECTIVE:** No dead internal links; utility pages kept out of the index; accurate sitemap dates.
**CURRENT CONDITION:** `/faq`, `/musicians`, `/create-profile`, `/terms-privacy`, `/church-search-request` return 404 on the live site. `app/sitemap.ts` lists static paths without `lastModified` and includes pages such as `/claim`, `/submit`, `/contact`. `app/robots.ts` disallows `/admin`, `/dashboard`, `/api/`, `/login`, `/auth/`, `/saved`.
**EXPECTED RESULT:** A script that crawls internal links and fails on any 404; `noindex` metadata on `/saved`, `/login`, `/collaborate/new`, `/campus/submit-event`, `/search`; sitemap entries for cities and denominations carry `lastModified` (latest `lastUpdatedAt` among their churches).
**TARGET FILES:** new `scripts/check-links.ts`; `app/sitemap.ts`; the five page files named above; `package.json` (script `check:links`).
**IMPLEMENTATION INSTRUCTIONS:**
1. `check-links.ts`: given a base URL argument, fetch the sitemap, fetch each page, collect same-origin `<a href>` values, request each once (HEAD, fall back to GET), print any non-2xx/3xx with the page that links to it. Limit concurrency to 4 and total requests to 1,500. Read-only.
2. Run it against the preview URL; fix any internal link that 404s by correcting the link. Do not create redirects for the five old routes unless a page still links to them.
3. Add `robots: { index: false }` to the listed pages' metadata.
4. Sitemap dates as described; remove `/claim`, `/submit`, `/contact` only if the owner agrees (default: keep).
**DESIGN REQUIREMENTS:** None.
**TECHNICAL REQUIREMENTS:** The script must not submit forms or call non-GET endpoints.
**SEO REQUIREMENTS:** As stated.
**DEPENDENCIES:** None.
**DO NOT CHANGE:** `robots.txt` rules; canonical URLs.
**ACCEPTANCE CRITERIA:** `npm run check:links -- <preview-url>` exits 0; the five pages emit `<meta name="robots" content="noindex">`.
**TESTING PROCEDURE:** Standard commands plus the link check output.
**DELIVERABLES:** PR, script, link report.
**COMPLETION REPORT:** As standard.

---

## Tasks specified in brief (to be expanded before assignment)

- **MOT-001 (P2)** Motion primitives per `03_MOTION_SPECIFICATIONS.md` M3 to M11: `components/motion/reveal.tsx`, card hover/press styles, `SubmitButton` spinner, `loading.tsx` for `/map`, `/events`, `/find-a-service`, `/campus`. Acceptance: reduced-motion check; CLS unchanged.
- **UX-002 (P2)** Replace the tall filter sidebar (`components/directory/filter-sidebar.tsx`) with a top filter bar on desktop and a `<dialog>` sheet on mobile, keeping the same GET parameters so URLs and the map keep working.
- **UX-003 (P2)** Sticky bottom bar on church profiles under 768 px: Directions, Call, Save, using existing `TrackedLink` metrics.
- **SEO-002 (P2)** `/faq` with owner-approved answers and `FAQPage` data; add to the footer and sitemap.
- **IMG-001 (P2)** Admin report "Listings without a photo / visit info / service times" (CSV) and named image slots (`public/home/`, `public/campus/`) with a `CREDITS.md`; no stock added by ChatGPT.
- **SEO-006 (P2, owner approval)** Vercel Web Analytics plus the six custom events in `04_SEO_GROWTH_PLAN.md`; update `/privacy` in the same PR.
- **SEO-004 (P2, owner approves text)** Three guides under `/guides/[slug]` as MDX or static pages, `Article` data, linked from the homepage and FAQ.
- **SEO-005 (P2)** `docs/OUTREACH_KIT.md`: email templates for churches (claim, photo request, badge) and for local sites; no sending.
- **OPS-001 (P3)** Document backups and advisory policy in `docs/DEPLOYMENT.md`; admin hard-delete for a listing with no claims, subscriptions in live mode, or audit history beyond creation (owner decision).
- **GROW-001 (P3, owner approval)** Monthly summary email to claimed churches using existing `ActivityDaily` counts and the Resend provider; unsubscribe link required.
