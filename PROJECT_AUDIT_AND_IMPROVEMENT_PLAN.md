# Project Audit and Improvement Plan

**Project:** `champaign-county-church-directory`
**Audit date:** 2026-07-27
**Branch / commit at audit:** `main` @ `beafc8d`
**Mode:** Analysis only. No application code was modified, no dependencies installed or upgraded, no migrations run, no data written.

Every finding below is traced to a file that was read during this audit. Findings are labeled:

- **CONFIRMED** — directly proven by reading the code.
- **REQUIRES TESTING** — strongly suspected from the code, but needs a running environment (database, deployed instance) to prove.
- **RECOMMENDATION** — an improvement, not a defect.

No secret values are reproduced in this report.

---

## 1. Executive Summary

This is a well-presented Next.js 15 App Router directory site for churches in Champaign County, Illinois. It builds cleanly, typechecks cleanly, and lints cleanly. The visual design is coherent and the Prisma schema is thoughtfully modeled for a review-first directory product.

It is **not production-ready**, and the gap is larger than the polished surface suggests. The core problem is that the application is two disconnected halves:

- The **public site** reads exclusively from a 1,893-line in-repo TypeScript array (`lib/data/mock.ts`).
- The **write path** (admin edits, claim requests) writes to Prisma/Postgres.

Nothing joins them. An administrator can fill in the church edit form, click "Save full record", receive a green "Church details saved." confirmation, and the public church page will still show the old value forever. This is a confirmed, reproducible defect, not a theoretical one.

Layered on top of that are three security issues that are individually serious and collectively disqualifying for a public deployment:

1. A hardcoded production session-signing secret fallback committed to the repository, which allows anyone who reads the public GitHub repo to forge an administrator session cookie.
2. A hardcoded credential list (`lib/data/access.ts`) that grants `ADMIN` role on a known email and known password, and which is checked **in addition to** — not instead of — the environment-configured admin credentials. Setting `ADMIN_PASSWORD` in Vercel does not close this door.
3. An open-redirect in the church-save server actions.

There are also two silent data-loss paths, a claim workflow that reports success when it has persisted nothing, three public forms that validate input and then discard it, and zero automated tests, error boundaries, monitoring, or CI.

**The good news:** the architecture does not need a rewrite. The schema is sound, the component structure is reasonable, the routing is sensible, and the type discipline is genuinely good (strict mode on, zero `any`, zero TODO/FIXME debt). The work is a focused sequence of connecting, securing, and completing what is already there. This report estimates roughly 6–9 weeks of focused single-developer effort to reach a defensible production launch.

**Overall readiness rating: 3/10.** Excellent shell, unfinished core, unsafe auth.

---

## 2. Project Purpose and Current State

### 2.1 What the application does

A public directory helping residents, visitors, students, and families in Champaign County, Illinois find local churches. Users can browse by city, search by name/pastor/denomination, filter by service day, ministry, and digital presence (website / app / livestream), and view individual church profiles with service times, leadership, ministries, social links, and a map.

Secondary product surfaces:

- **Submit a listing** — public intake for new churches.
- **Claim a listing** — church staff request authority over an existing record, with a verification method (domain email / public phone / manual review).
- **Church dashboard** — a claimed church's staff edit their own listing.
- **Admin back office** — review queue, claim approvals, church record editing, submissions, users, editable site copy.
- **Weekly scan** — a Vercel cron endpoint intended to detect stale listings and propose changes.

There is also a deliberate cross-link to a companion project, `central-illinois-music-directory`.

### 2.2 Honest state of each surface

| Surface | State | Evidence |
|---|---|---|
| Public browse / search / filter | **Working**, against mock data | `lib/data/queries.ts:55` `getDirectoryResults` |
| City pages | **Working**, against mock data | `app/cities/[slug]/page.tsx` |
| Church profile pages | **Working**, mock data + DB media overlay | `app/churches/[slug]/page.tsx:60` |
| Contact form | **Non-functional** — no submit handler at all | `app/contact/page.tsx:30` |
| Submit-a-listing form | **Validates, then discards** | `app/actions.ts:26` |
| Claim form | **Persists only if DB present; always claims success** | `app/actions.ts:40` |
| Login | **Working, insecure** | `lib/auth.ts:123` |
| Church dashboard | **Renders mock; writes to DB; never reads back** | `app/dashboard/churches/[slug]/page.tsx:34` |
| Admin overview | **Mixed real/mock stats, silently** | `app/admin/page.tsx:23` |
| Admin review queue | **Read-only display of mock data, no actions** | `app/admin/review/page.tsx:21` |
| Admin submissions | **Read-only display of mock data, no actions** | `app/admin/submissions/page.tsx:10` |
| Admin claims | **Functional if DB present** | `app/admin/claims/page.tsx:47` |
| Admin users | **Read-only, no invite/edit/revoke** | `app/admin/users/page.tsx` |
| Admin content | **Writes to DB, never read by public pages** | `app/admin/content/page.tsx:30` |
| Weekly scan | **Stub** — returns synthetic results, writes nothing | `lib/scan/weekly-scan.ts:17` |
| Pagination | **Decorative only** — static, non-clickable | `components/ui/pagination.tsx` |

### 2.3 Documentation accuracy

The repo's own documentation is unusually honest, which is a credit to it. `CODEBASE_OVERVIEW.md` correctly states the app "still runs on in-repo mock data" and lists the right next steps. Two accuracy defects:

- **CONFIRMED** — `CODEBASE_OVERVIEW.md` uses absolute paths from a different machine (`/Users/tes/champaign-county-church-directory/...`), which do not match this checkout (`/Users/tes/my projects/...`). Every documentation link is broken.
- **CONFIRMED** — `CODEBASE_OVERVIEW.md` states `npm run build` failed because `next` was not installed. In this checkout dependencies are installed and the build succeeds. The note is stale.
- **CONFIRMED** — `CODEBASE_OVERVIEW.md` describes auth as NextAuth with a hardcoded `"admin"` password. NextAuth was replaced by custom cookie sessions in commit `8c68f45`. The description is stale, though the `"admin"` password observation remains true.

---

## 3. Technology Stack

| Layer | Technology | Version (installed) | Notes |
|---|---|---|---|
| Framework | Next.js App Router | 15.5.15 | `package.json` declares `^15.2.0`; latest is 16.2.12 |
| UI runtime | React | 19.2.5 | |
| Language | TypeScript | 5.9.3 | `strict: true`, zero `any` in app code |
| Styling | Tailwind CSS | 3.4.19 | Custom brand palette, no design tokens layer |
| Components | shadcn/ui conventions | — | `components.json` present; only 7 primitives adopted |
| Icons | lucide-react | 0.511.0 | Pinned 1 major version behind (latest 1.27.0) |
| ORM | Prisma | 6.19.3 | Postgres provider |
| Validation | Zod | 3.24.2 | Used on 3 of ~10 write paths |
| Auth | **Custom HMAC cookie** | — | `next-auth` 5.0.0-beta.30 installed but **unused** |
| Hosting | Vercel | — | `.vercel/project.json` present, `vercel.json` cron |
| Linting | ESLint | 9.39.4 | Config is `next/core-web-vitals` only |
| Formatting | **None** | — | No Prettier config, no format script |
| Testing | **None** | — | No test runner, no test files |
| CI/CD | **None** | — | No `.github/`, no pipeline config |

### 3.1 Dependency findings

- **CONFIRMED (High)** — `npm audit` reports **9 vulnerabilities (1 low, 6 high, 2 critical)** in the full tree; **6 (4 high, 2 critical)** in production dependencies. Named advisories:
  - `next` — Unauthenticated disclosure of internal Server Function endpoints (GHSA-955p-x3mx-jcvp). **Directly relevant**: this app uses server actions for every admin write.
  - `postcss <=8.5.17` — three advisories including path traversal via `sourceMappingURL` and arbitrary `.map` file disclosure.
  - `sharp <0.35.0` — inherited libvips CVEs (CVE-2026-33327, -33328, -35590, -35591). `sharp` is Next's image optimizer, and this app serves user-uploaded images through `next/image`.
  - `npm audit` reports `fix available via npm audit fix`.
- **CONFIRMED (Low)** — `next-auth@5.0.0-beta.30` and `@auth/prisma-adapter@2.11.1` are production dependencies with **zero imports in application code**. Only `types/next-auth.d.ts` references the `next-auth` types, and that file is itself dead (nothing consumes those module augmentations since auth is now custom). Dead weight in the bundle graph and a misleading signal to future maintainers.
- **CONFIRMED (Medium)** — `next-auth` is pinned to a **beta** release in a project intended for production.
- **RECOMMENDATION** — no `engines` field pins a Node version, and no `.nvmrc` exists. Build reproducibility depends on whatever Vercel defaults to.

---

## 4. Architecture Map

### 4.1 Shape

A single Next.js application (not a monorepo). Four layers:

```
app/         routes, server actions, API handlers, metadata routes
components/  admin/ dashboard/ directory/ forms/ layout/ ui/
lib/         auth, auth-guards, data/, validation/, scan/, utils
prisma/      schema.prisma, seed.ts   (NO migrations directory)
```

### 4.2 The central architectural fault

There are **two independent data sources that never reconcile**:

```
                    ┌─────────────────────────┐
   PUBLIC READS ───▶│  lib/data/mock.ts       │  1,893 lines, in-repo,
   (queries.ts)     │  churches[], cities[]   │  mutable at runtime
                    └─────────────────────────┘
                              ✗  no link  ✗
                    ┌─────────────────────────┐
   ADMIN WRITES ───▶│  Postgres via Prisma    │  church, claimRequest,
   (admin-store.ts) │  (admin-store.ts)       │  siteContent, membership
                    └─────────────────────────┘
```

The **only** field bridged in the read direction is church media, via `getPersistedChurchMediaBySlug()` (`lib/data/admin-store.ts:188`), consumed at `app/churches/[slug]/page.tsx:60`. Name, city, pastor, phone, email, description, website, app URL, livestream URL, verified, and claimed are all written to the database and never read back on any public page.

There is also a third, stranger path: `lib/data/access.ts` holds a *second* set of in-memory records (users, credentials, memberships, claims, site content, audit logs) used as the fallback when the database is absent.

### 4.3 Request flow — public read

```
Browser GET /directory?city=champaign&verified=true
  → app/directory/page.tsx (Server Component)
  → normalizes searchParams (array → first value)
  → lib/data/queries.ts getDirectoryResults()
  → in-memory .filter() over mock.churches
  → ChurchCard[] rendered server-side
```

No database, no network, no cache layer. Fast, but the result set is unbounded and unpaginated.

### 4.4 Request flow — admin write

```
Browser POST (server action) saveChurchListingAction(FormData)
  → app/actions.ts:186
  → churchSlug present? else silent return
  → requireChurchManageAccess(slug)  → auth() → cookie decode
  → hasDatabaseUrl()? if no → redirect(returnPath + "?saved=needs-db")
  → lib/data/admin-store.ts saveChurchListingRecord()
      → prisma.church.findUnique
      → conditionally prisma.pastor.update / .create     ← NOT in a transaction
      → prisma.church.update
  → revalidatePath() × 4
  → redirect(returnPath + "?saved=record")
  → page re-renders — FROM MOCK DATA. Change is invisible.
```

### 4.5 Authentication flow

```
POST /api/auth/login  {email, password, nextPath}
  → lib/auth.ts authenticateWithCredentials()
      1. email === ADMIN_EMAIL && password === ADMIN_PASSWORD  → ADMIN
      2. match against mockCredentials[] (hardcoded in repo)   → ADMIN/REVIEWER/CHURCH_*
      3. password === "church" → DB lookup by email           → CHURCH_OWNER/CHURCH_EDITOR
  → encodeSession(user):  base64url(JSON(user)) + "." + HMAC-SHA256(payload, AUTH_SECRET)
  → Set-Cookie cccd_session; httpOnly; sameSite=lax; secure(prod); maxAge=7d
```

Session verification (`lib/auth.ts:41`) splits on `.`, recomputes the HMAC, compares with `timingSafeEqual`, then JSON-parses the payload and shape-checks it.

The entire user identity — including `role` and `churchSlugs` — lives **inside the cookie**. There is no server-side session store, no database lookup on each request, and no revocation mechanism.

### 4.6 Authorization model

Three guards in `lib/auth-guards.ts`, plus a fourth duplicated inline in `app/actions.ts:131`:

| Guard | Allows | Used by |
|---|---|---|
| `requireSignedIn()` | any valid cookie | base for the others |
| `requireAdminAccess()` | `ADMIN`, `REVIEWER`, `SUPPORT` | all 8 `/admin/*` pages |
| `requireChurchAccess(slug)` | `ADMIN`, or slug ∈ `churchSlugs` | `/dashboard/churches/[slug]` |
| `requireChurchManageAccess(slug)` (inline) | `ADMIN`, `REVIEWER`, `SUPPORT`, or slug ∈ `churchSlugs` | 3 write actions |

This is coarse: `REVIEWER` and `SUPPORT` receive identical privileges to `ADMIN` across the entire back office, including user management and site-copy editing.

### 4.7 Deployment

Vercel. `vercel.json` registers one cron: `/api/cron/weekly-scan` at `0 8 * * 1` (Mondays 08:00 UTC). `next.config.mjs` sets `images.remotePatterns` to `protocol: https, hostname: "**"` — every HTTPS host on the internet is a permitted image source.

### 4.8 Architectural risks (ranked)

1. **Dual source of truth** — every write is a lie to the user until the read path is unified.
2. **Identity in a self-signed cookie with a repo-committed fallback secret** — total authentication compromise if `AUTH_SECRET` is unset.
3. **No migrations directory** — schema history is untracked; production schema drift is unmanageable.
4. **Silent DB-error fallback** (`withFallback`, `lib/data/admin-store.ts:61`) — a database outage renders as plausible fake data instead of an error.
5. **No error boundaries** — any thrown error (including every Zod validation failure) becomes an unstyled generic error page.
6. **Mock data is mutable at runtime** (`applyFallbackChurchUpdate`, `lib/data/admin-store.ts:46`) — writes to a module-level array that is per-serverless-instance and lost on cold start.

---

## 5. User Roles and Journey Map

### 5.1 Roles

Two role vocabularies exist and disagree.

`lib/types.ts:19` — `DirectoryRole`:
`ADMIN | REVIEWER | SUPPORT | CHURCH_OWNER | CHURCH_EDITOR`

`prisma/schema.prisma:22` — `UserRole`:
`ADMIN | REVIEWER | SUPPORT | EDITOR | CHURCH_OWNER | CHURCH_EDITOR`

- **CONFIRMED (Medium)** — the schema has `EDITOR` (and it is the `@default` for every new `User`), but `DirectoryRole` has no `EDITOR` member. A user created by the claim-approval path defaults through this enum. `lib/data/admin-store.ts:129` casts the string straight to `AdminUserRecord["role"]` with no runtime check, so an `EDITOR` row renders as a role the TypeScript type says cannot exist, and `requireAdminAccess()` will bounce them to `/dashboard` where they have no memberships — a dead end.

Also note there is **no anonymous-visitor role modeling** and no self-service registration anywhere. The only way to become a user is admin approval of a claim request.

### 5.2 Journey map

#### Public visitor (the primary user)

| Step | State |
|---|---|
| Land on `/` | Works. Hero, search, cities, featured, church-of-the-week, recently updated |
| Search from hero | Works — GET to `/search?q=` |
| Browse `/directory` with filters | Works, in-memory, unpaginated |
| Browse `/cities` → `/cities/[slug]` | Works |
| View `/churches/[slug]` | Works; JSON-LD structured data present; map embed present |
| Get directions | Works — external Google Maps link |
| Contact the directory | **BROKEN** — form has no action |
| Submit a new church | **BLACK HOLE** — validates, discards, no confirmation |
| Claim a church | **FALSE SUCCESS** — always shows "received" even when nothing persisted |

#### Church owner / editor

| Step | State |
|---|---|
| Discover they can claim | Works — CTA on church profile and login page |
| Submit claim | Validates; persists only if `DATABASE_URL` set and church matched |
| Learn claim outcome | **MISSING** — no email, no notification, no status page for the applicant |
| Receive credentials | **MISSING** — approval creates a `User` row with no password concept at all |
| Sign in | Only via the shared hardcoded password `"church"` (`lib/auth.ts:156`) |
| Reset password | **MISSING** — no route, no schema support |
| See dashboard | `/dashboard` is **entirely hardcoded fake numbers** ("1,284 views", "88%") |
| Edit their listing | Form works; saves to DB; **public page never reflects it** |
| Upload a photo | Works; oversize/wrong-type silently **deletes** the existing image |
| "Request review" button | Links to `/claim` — wrong destination |
| "Invite editor" button | Links to `/claim` — feature does not exist |
| Sign out | **MISSING** — `signOut()` exists in `lib/auth.ts:193` with **no caller and no UI** |
| Delete account / export data | **MISSING** |

#### Directory admin / reviewer / support

| Step | State |
|---|---|
| Sign in | Works |
| `/admin` overview | Stats are DB-or-mock (indistinguishable); queues are mock |
| Approve/deny a claim | **Works** (DB required); creates user + membership + marks claimed |
| Review suggested changes | **Display only** — `ReviewComparisonCard` has no approve/reject action |
| Review submissions | **Display only** — no approve/reject, and no real submissions exist |
| Edit a church record | Saves to DB; invisible on the public site |
| Mark verified / claimed | One-way only — `saveChurchStatusRecord` can set `true`, never `false` |
| Manage users | **Read-only** — no invite, no role change, no revoke |
| Edit site copy | Saves to `SiteContent`; **no public page reads `SiteContent`** |
| See audit log | Hardcoded 3-entry array (`lib/data/access.ts:161`); `getPersistedAuditLogs` (`admin-store.ts:606`) ignores the DB entirely |
| Sign out | **MISSING** |

---

## 6. Commands and Checks Performed

Every command below was actually executed in this checkout on 2026-07-27.

| # | Command | Result | Interpretation |
|---|---|---|---|
| 1 | `npx tsc --noEmit` | **PASS** (exit 0, no output) | Strict TypeScript is clean. Genuine strength. |
| 2 | `npx next lint` | **PASS** — "No ESLint warnings or errors" | Clean, but the ruleset is only `next/core-web-vitals`. Emits a deprecation notice: `next lint` is removed in Next.js 16. |
| 3 | `npm run build` | **PASS** — compiled in 10.6s, 106 static pages generated | Production build is healthy. Ran **without** `DATABASE_URL`, so every Prisma code path was untested. |
| 4 | `npm audit --omit=dev` | **FAIL** — 6 vulns (4 high, 2 critical) | Production dependency tree is vulnerable. See §3.1. |
| 5 | `npm audit` | **FAIL** — 9 vulns (1 low, 6 high, 2 critical) | Full tree. |
| 6 | `npm outdated` | 19 packages behind | `next` 15.5.15 → 16.2.12, `prisma` 6 → 7, `lucide-react` 0.511 → 1.27, `tailwindcss` 3 → 4. |
| 7 | `grep` for `TODO\|FIXME\|HACK\|XXX` | **0 matches** | No annotated debt. (The debt is unannotated.) |
| 8 | `grep` for `: any\|as any\|<any>` | **0 matches** | Excellent type discipline. |
| 9 | `grep` for `dangerouslySetInnerHTML\|eval(\|new Function` | 1 match | `app/churches/[slug]/page.tsx:89` — JSON-LD injection. See §11. |
| 10 | `git ls-files \| grep -i env` | Only `.env.example`, `next-env.d.ts` | **No secrets committed.** `.gitignore` correctly excludes `.env`, `.env.local`, `.vercel`. |
| 11 | Orphan-component scan | 3 orphans | `components/forms/contact-form.tsx`, `components/admin/status-badge.tsx`, `components/directory/app-badge.tsx` |
| 12 | `find app -name "error.tsx" -o -name "loading.tsx" -o -name "not-found.tsx"` | **NONE** | Zero error boundaries, zero loading UI, zero custom 404. |
| 13 | `ls middleware.ts` | **NONE** | No edge-level route protection. |
| 14 | `ls public/` | **EMPTY** | No favicon, no OG image, no manifest, no robots asset. |
| 15 | `ls prisma/` | `schema.prisma`, `seed.ts` only | **No `migrations/` directory.** |
| 16 | `grep` for `next/font\|@font-face` | **NONE** | Declared fonts are never loaded. See §9. |
| 17 | `grep` for `next-auth` imports in app code | 1 (types only) | Confirms `next-auth` is a dead dependency. |
| 18 | `<h1>` presence scan across all 21 pages | 6 pages lack one | See §10. |
| 19 | `grep` for `admin-shell` | 9 usages, **0 definitions** | Undefined CSS class. See §9. |
| 20 | `du -sh .` | 944 MB | Dominated by `node_modules` + `.next`. |

### Checks that could NOT be run

| Check | Blocker |
|---|---|
| Prisma schema validation against a live DB | No `DATABASE_URL` configured; running one would require provisioning a database. Out of scope for analysis-only mode. |
| Any Prisma query path (all of `admin-store.ts`) | Same. **All 703 lines of `lib/data/admin-store.ts` are unexercised by any check performed.** |
| Prisma migration status / drift detection | No `migrations/` directory exists to compare against. |
| Automated tests | No test runner or test files exist. |
| Accessibility scan (axe / Lighthouse) | No tooling installed; would require adding dependencies, which analysis-only mode forbids. |
| Bundle analysis | `@next/bundle-analyzer` not installed. |
| Dead-code / unused-export analysis | `knip` / `ts-prune` not installed. Orphan scan (#11) was done manually with grep as a substitute. |
| Formatting check | No Prettier config or dependency exists. |
| End-to-end verification of the login flow | Requires a running server plus environment variables; not attempted in analysis-only mode. |
| Runtime confirmation of the open-redirect and image-wipe bugs | Both are proven by code reading; runtime proof deferred to the implementation phase. |

---

## 7. Confirmed Errors and Bugs

Each item here was proven by reading the code. Severity reflects user and business impact.

### BUG-01 — Admin and church edits never appear on the public site
**Severity: Critical · Confidence: CONFIRMED**

`app/churches/[slug]/page.tsx:50` calls `getChurchBySlug(slug)`, which resolves against `lib/data/mock.ts`. The only database value merged in is media (`:60`). Meanwhile `saveChurchListingRecord` (`lib/data/admin-store.ts:376`) writes name, city, denomination, website, app, livestream, phone, email, description, and pastor to Postgres.

**Failure scenario:** An admin corrects a church's phone number from `(217) 555-0141` to the real number, submits, and sees "Church details saved." The public profile, the directory card, the city page, the search results, and the JSON-LD structured data all continue serving the old number indefinitely. The admin has no way to discover the discrepancy from within the product.

**Impact:** The single most important promise of the product — accurate church information — is silently unfulfilled. Every editorial action taken by staff or church owners is wasted work. Trust in the directory collapses the first time a visitor calls a wrong number.

**Fix:** Migrate the read path to Prisma (see Phase 1). Until then, the edit UI should not claim success.

---

### BUG-02 — Failed image upload silently deletes the existing photo
**Severity: High · Confidence: CONFIRMED**

`fileToDataUrl` (`app/actions.ts:108`) returns `undefined` for three distinct reasons — empty file, non-image MIME type, or size over 4 MB — with no error signal. `saveChurchMediaAction` (`:170`) then computes:

```ts
featuredImageUrl:
  uploadedFeaturedImage ??                                    // undefined
  externalUrl(formData.get("featuredImageUrl")?.toString()) ?? // null if field blank
  undefined
```

and `saveChurchMediaRecord` (`lib/data/admin-store.ts:365`) writes `featuredImageUrl: input.featuredImageUrl || null` — an explicit `null`.

**Failure scenario:** A church secretary uploads a 6 MB photo straight from a phone camera. The size check rejects it silently, the URL text field was left blank because they used the upload control, and the action writes `NULL`. The church's existing featured image is destroyed. The page redirects to `?saved=media` and displays **"Church image saved."**

**Impact:** Irreversible data loss presented to the user as success. The most likely user (a non-technical church volunteer with a phone photo) is the most likely victim, because modern phone photos routinely exceed 4 MB.

---

### BUG-03 — Claim submissions report success when nothing was saved
**Severity: High · Confidence: CONFIRMED**

`claimListingAction` (`app/actions.ts:40`) awaits `createPersistedClaimRequest(...)` and then unconditionally `redirect`s to `?submitted=1`. The return value is discarded.

`createPersistedClaimRequest` (`lib/data/admin-store.ts:486`) returns `null` in two cases:
- No Prisma client (`DATABASE_URL` unset) — `:495`
- No church matched by slug or exact name — `:505`

The success banner (`app/claim/page.tsx:22`) even acknowledges the ambiguity in its own copy: *"If database persistence is configured, it has been added to the review queue. If not, the form still validated..."*

**Failure scenario:** A pastor requests control of their church listing. The slug is absent (they arrived at `/claim` directly rather than from a church page) and the free-text church name does not exactly match the `Church.name` column. `findFirst` returns null. The request evaporates. The pastor sees a confirmation and waits for a response that will never come.

**Impact:** The primary onboarding funnel for the entire church-owner side of the product loses submissions silently. Nobody — not the applicant, not the admin — learns that it happened.

---

### BUG-04 — Contact form does nothing
**Severity: High · Confidence: CONFIRMED**

`app/contact/page.tsx:30` renders `<form className="space-y-5" aria-describedby="contact-form-help">` with **no `action` and no `onSubmit`**. Clicking "Send message" (`:52`) performs a default browser GET to the same URL, discarding the message and appearing to "refresh" the page.

Compounding this: a working `ContactForm` component exists at `components/forms/contact-form.tsx` and is **never imported by anything** (confirmed by orphan scan). The page reimplements the form by hand and forgets to wire it.

**Impact:** The site advertises "Response window: Typically within one business day" (`:20`) next to a form that cannot deliver a message. Corrections, complaints, and partnership inquiries are all lost. For a directory whose accuracy depends on public correction, this severs the main feedback channel.

---

### BUG-05 — Submit-a-listing form validates then discards
**Severity: High · Confidence: CONFIRMED**

`submitListingAction` (`app/actions.ts:26`) calls `submitListingSchema.parse(...)` and has **no further statements**. No database write, no email, no redirect, no confirmation.

The `Submission` model exists in `prisma/schema.prisma:163` and is never written to by any code path. `/admin/submissions` reads `getSubmissions()` → mock array.

**Failure scenario:** A church fills out nine fields including a 20+ character description. On success the page silently re-renders with the form cleared. There is no confirmation and no record.

**Impact:** The directory cannot grow through its own advertised intake channel. Every new-church submission is lost.

---

### BUG-06 — Zod validation failures produce an unstyled crash page
**Severity: High · Confidence: CONFIRMED**

All three public actions use `schema.parse()`, which **throws** `ZodError` on invalid input. There is no `try/catch`, no `safeParse`, and — confirmed by check #12 — **no `error.tsx` anywhere in `app/`**.

**Failure scenario:** A user types a 5-character message in the contact form (schema requires 10, `lib/validation/forms.ts:6`). In production Next.js renders its default error page: "Application error: a server-side exception has occurred." The user's typed content is gone, there is no indication of which field was wrong, and there is no path back except the browser Back button.

**Impact:** Every validation mistake — the most common user error there is — becomes a total application failure. Combined with placeholder-only labels (§10), users cannot even determine what the requirements were.

---

### BUG-07 — Admin dashboard silently mixes real and fake data
**Severity: High · Confidence: CONFIRMED**

`withFallback` (`lib/data/admin-store.ts:61`) catches **every** database error, logs `"DB fallback activated"` to the server console, and returns mock data. The caller cannot distinguish success from failure — the signature returns `T`, not `T | Error`.

`app/admin/page.tsx` compounds this by mixing sources on one screen: `stats` and claims come from `getPersisted*` (DB-or-mock), while `changes`, `submissions`, and `logs` come from `lib/data/queries.ts` (always mock).

**Failure scenario:** The database connection pool exhausts at 9 a.m. Monday. `/admin` renders 64 churches, 3 pending claims, and a tidy activity log — all fabricated. An administrator makes staffing and outreach decisions on invented numbers, and nothing on screen hints at a problem.

**Impact:** Operational decisions on fabricated data, and a production outage that is invisible from the product's own admin console.

---

### BUG-08 — Open redirect in three church-save actions
**Severity: High · Confidence: CONFIRMED**

`normalizedReturnPath` (`app/actions.ts:126`):

```ts
return path?.startsWith("/") ? path : fallback;
```

A protocol-relative URL such as `//evil.example.com/phish` **starts with `/`** and passes the check. It is then handed to `redirect()` in `saveChurchMediaAction` (`:163`, `:183`), `saveChurchListingAction` (`:197`, `:218`), and `saveChurchStatusAction` (`:234`, `:248`).

**Failure scenario:** An attacker who can induce an authenticated church editor to submit a crafted form (the `returnPath` is a plain hidden input, trivially modified) redirects that editor to an attacker-controlled domain immediately after a successful save — the exact moment the user is most primed to trust the page and re-enter credentials.

**Impact:** Credential-phishing pivot launched from a legitimate, authenticated action on the real domain.

**Fix:** Reject any path where `path[1] === "/"` or `path[1] === "\\"`; better, validate against an allowlist of known route shapes.

---

### BUG-09 — `verified` and `claimed` flags cannot be reversed
**Severity: Medium · Confidence: CONFIRMED**

`saveChurchStatusAction` (`app/actions.ts:222`) accepts only `field=verified` or `field=claimed` and always spreads `{ verified: true }` / `{ claimed: true }` (`:239`). `saveChurchStatusRecord` supports booleans, but no caller ever passes `false`. The UI (`app/admin/churches/[id]/page.tsx:110`) offers only "Mark verified" and "Mark claimed".

**Failure scenario:** A church is marked verified, then closes, merges, or is found to have been verified in error. There is no un-verify path in the product. The false trust badge is permanent short of direct database access.

**Impact:** A trust signal that can only ever be granted, never revoked, degrades into noise — and a wrongly-verified listing is a liability.

---

### BUG-10 — `city` is updated without updating `cityId`
**Severity: Medium · Confidence: CONFIRMED**

`saveChurchListingRecord` (`lib/data/admin-store.ts:439`) writes the denormalized `city` string. The `Church` model carries **both** `city String` (`schema.prisma:70`) and `cityId String` with a required relation to `City` (`:87`).

**Failure scenario:** An admin corrects a church's city from "Champaign" to "Savoy". The `city` string changes; `cityId` still points at the Champaign `City` row. The record is now internally contradictory, and any future query that joins through `cityRecord` (including the city landing pages once they are migrated to Prisma) will place the church in the wrong city.

**Impact:** Referential corruption that is invisible today and becomes a wrong-data bug the moment the read path is migrated. Fixing it after the fact requires a reconciliation script.

---

### BUG-11 — Pastor and church updates are not transactional
**Severity: Medium · Confidence: CONFIRMED**

`saveChurchListingRecord` (`lib/data/admin-store.ts:395–453`) performs up to three sequential writes — `pastor.update` or `pastor.create`, then `church.update` — with no `prisma.$transaction`.

**Failure scenario:** `pastor.create` succeeds (`:423`), then `church.update` fails on a connection drop. An orphaned `Pastor` row now exists with no church pointing at it, and `seniorPastorId` was never assigned. Retrying creates a second orphan.

**Impact:** Accumulating orphan rows and partially-applied edits. `Pastor.seniorForChurch` is `@unique`, so orphans are individually harmless but permanently accumulate.

---

### BUG-12 — Undefined CSS class used on nine pages
**Severity: Low · Confidence: CONFIRMED**

`admin-shell` appears in `app/admin/page.tsx:36`, `app/admin/review/page.tsx:15`, `app/admin/churches/[id]/page.tsx:47`, `app/admin/submissions/page.tsx:16`, `app/admin/users/page.tsx:15`, `app/admin/churches/page.tsx:14`, `app/admin/claims/page.tsx:17`, `app/admin/content/page.tsx:20`, and `app/dashboard/churches/[slug]/page.tsx:57`. It is **not defined** in `app/globals.css`, not in `tailwind.config.ts`, and is not a Tailwind utility.

**Impact:** Nine pages carry a no-op class. Either an intended admin surface treatment was lost, or this is dead markup. Cosmetic, but it signals that the admin visual design was never finished.

---

### BUG-13 — Declared fonts are never loaded
**Severity: Low · Confidence: CONFIRMED**

`app/globals.css:5` sets `--font-body: "Source Sans 3"` and `--font-display: "Fraunces"`. `tailwind.config.ts:31` maps `font-sans` and `font-display` to those variables. Confirmed by check #16: there is **no `next/font` import, no `@font-face`, and no Google Fonts link anywhere in the project.**

**Impact:** Every `font-display` heading — used on virtually every page — silently falls back to `ui-serif, Georgia`. The intended typographic identity has never rendered for any user. Fixing this will visibly change the entire site, so it must be treated as a design decision, not just a bug fix.

---

### BUG-14 — Pagination is decorative
**Severity: Medium · Confidence: CONFIRMED**

`components/ui/pagination.tsx` renders four `<span>` elements reading "Previous 1 2 Next". They are not links, not buttons, have no handlers, and the page numbers are hardcoded. `/directory` renders it below the results (`app/directory/page.tsx:46`) while displaying **all** matching churches above it — currently 64.

**Impact:** Users see a pagination control, click it, and nothing happens. Meanwhile the page ships every result at once. Both the affordance and the performance intent are broken.

---

### BUG-15 — Dead `signOut` with no UI
**Severity: Medium · Confidence: CONFIRMED**

`signOut()` (`lib/auth.ts:193`) deletes the session cookie. Confirmed by grep: **it has no callers**, and no header, sidebar, or dashboard component renders a sign-out control.

**Impact:** Once signed in, a user cannot sign out from within the product. On a shared church-office or library computer the session persists for the full 7-day cookie lifetime. This is both a usability failure and a security exposure.

---

### BUG-16 — Site content editor writes to a table nobody reads
**Severity: Medium · Confidence: CONFIRMED**

`saveSiteContentAction` (`app/actions.ts:86`) upserts `SiteContent` and revalidates `/` and `/directory`. Confirmed by grep: **no page reads `SiteContent`**. `getPersistedSiteContent` is called only by `/admin/content` itself. The homepage hero (`app/page.tsx:67`) and directory helper text (`app/directory/page.tsx:26`) are hardcoded JSX.

**Impact:** "Edit high-visibility site copy without code changes" is the page's own headline (`app/admin/content/page.tsx:23`). It is untrue. The admin edits copy, sees it saved, and the public site never changes — the same class of failure as BUG-01.

---

### BUG-17 — Silent no-op returns hide failures from users
**Severity: Medium · Confidence: CONFIRMED**

Four actions `return` silently when required fields are missing, producing no feedback whatsoever:
- `reviewClaimRequestAction` (`app/actions.ts:71`) — missing `claimId` or `decision`
- `saveSiteContentAction` (`:92`) — any missing field
- `saveChurchMediaAction` (`:154`) — missing `churchSlug`
- `saveChurchListingAction` (`:188`) — missing `churchSlug`
- `saveChurchStatusAction` (`:225`) — missing slug or invalid field

**Impact:** A form submission that fails validation is indistinguishable from one that succeeded. In `/admin/claims` specifically, an admin could click "Approve" and have nothing happen with no indication.

---

### BUG-18 — `EDITOR` role is a dead end
**Severity: Medium · Confidence: CONFIRMED**

Detailed in §5.1. `UserRole.EDITOR` is the Prisma `@default` (`schema.prisma:180`) but is absent from `DirectoryRole` (`lib/types.ts:19`). `requireAdminAccess` rejects it; `requireChurchAccess` rejects it unless memberships happen to exist.

**Impact:** Any user created through a path that does not explicitly set a role lands in a state where they can sign in but reach no functional page — an infinite `/login` → `/dashboard` experience with no listings.

---

## 8. UX and Workflow Gaps

### 8.1 Cross-cutting gaps

| Gap | Evidence | Impact |
|---|---|---|
| No loading states anywhere | Check #12 — zero `loading.tsx` | Server-rendered navigations appear frozen on slow connections |
| No custom 404 | Check #12 — no `not-found.tsx` | `notFound()` in church/city pages renders Next's bare default |
| No error recovery | Check #12 — no `error.tsx` | See BUG-06 |
| No duplicate-submission prevention | No form disables on submit except `LoginForm` | Double-clicking "Approve" on a claim fires the action twice |
| No success confirmation on public forms | BUG-04, BUG-05 | Users cannot tell if anything happened |
| No notifications of any kind | No email/SMS integration anywhere in the codebase | Claim applicants never learn their outcome |
| No audit trail | `UpdateLog` model exists, is never written; `getPersistedAuditLogs` (`admin-store.ts:606`) returns a hardcoded array | No accountability for who changed what |
| No sign-out | BUG-15 | Shared-computer exposure |
| No account recovery | No route, and `User` has no credential fields | A locked-out church owner has no path back |

### 8.2 Broken and misleading navigation

- **CONFIRMED** — `app/dashboard/churches/[slug]/page.tsx:121` — a button labeled **"Request review"** links to `/claim`. Requesting review of an edit and claiming a listing are unrelated workflows.
- **CONFIRMED** — `:124` — a button labeled **"Invite editor"** also links to `/claim`. There is no invite feature in the codebase at all. The login page (`app/login/page.tsx:44`) advertises "Owners can invite editors" as a product feature.
- **CONFIRMED** — `app/dashboard/page.tsx` — `/dashboard` is the post-login destination for every non-admin user and contains **only hardcoded fake metrics** ("Listing views 1,284", "Profile completeness 88%") and three sentences of invented activity. It has no link to the user's actual churches. `ChurchDashboardSidebar` (which does list memberships) is only rendered on `/dashboard/churches/[slug]` — a page the user has no way to reach from `/dashboard`.

That last point is the most serious UX defect after the broken forms: **a signed-in church owner lands on a page of fabricated statistics with no navigable route to the listing they signed in to edit.**

- **CONFIRMED** — `app/admin/review/page.tsx` and `app/admin/submissions/page.tsx` render queue items with no action controls. `ReviewComparisonCard` (42 lines) displays old/new values and offers no approve or reject.
- **CONFIRMED** — `/admin/users` offers no invite, role-change, or revoke control despite `ChurchMembership.status` supporting `REVOKED`.
- **CONFIRMED** — The header (`components/layout/header.tsx`) exposes "Admin Login" to every anonymous visitor on both desktop (`:42`) and mobile (`:69`), with no session-aware variant. A signed-in admin still sees "Admin Login".
- **CONFIRMED** — Desktop nav is `hidden ... xl:flex` (`:27`) while the CTA cluster is `hidden ... md:flex` (`:35`) and the mobile menu is `md:hidden` (`:50`). **Between 768px and 1280px the primary navigation links vanish entirely** — no Directory, Cities, About, or Contact link is reachable. That is the entire tablet-landscape and small-laptop range.

### 8.3 Workflow-gap matrix

| Role | Workflow | Current State | Gap or Failure | User Impact | Recommended Fix | Priority |
|---|---|---|---|---|---|---|
| Visitor | Contact directory | Form renders, no handler | BUG-04 — no `action` | Message silently lost; stated 1-day response is impossible | Wire to `submitContactAction`; persist + notify | P1 |
| Visitor | Submit a church | Validates, discards | BUG-05 — action body empty | Directory cannot grow | Persist to `Submission`; confirm; notify admin | P1 |
| Visitor | Claim a listing | Persists only if DB + exact match | BUG-03 — false success | Onboarding funnel loses applicants | Return result; branch UI; require slug or fuzzy-match with confirmation | P1 |
| Visitor | Any form error | Throws `ZodError` | BUG-06 — no error boundary | Total crash on typo | `safeParse` + `useActionState` + `error.tsx` | P1 |
| Visitor | Browse 64 results | All rendered at once | BUG-14 — fake pagination | Slow page, broken affordance | Real cursor/offset pagination | P2 |
| Visitor | Navigate at 768–1279px | Nav links hidden | Breakpoint mismatch | Cannot navigate the site on a tablet | Align breakpoints to a single `lg` | P1 |
| Church owner | Learn claim outcome | Nothing | No notification system | Waits indefinitely | Transactional email on decision | P1 |
| Church owner | Obtain credentials | Shared password `"church"` | No credential model | Insecure and unscalable | Magic-link auth + schema support | P0 |
| Church owner | Reach their listing | No link from `/dashboard` | Dead-end landing page | Cannot find what they signed in for | Replace `/dashboard` with real membership list | P1 |
| Church owner | Edit listing | Saves to DB | BUG-01 — public never updates | All work wasted | Migrate read path to Prisma | P0 |
| Church owner | Upload photo | Silent wipe on failure | BUG-02 — data loss | Destroys existing image, reports success | Return typed errors; never null on failure | P0 |
| Church owner | Invite an editor | Button links to `/claim` | Feature does not exist | Advertised capability is fiction | Build invite flow or remove the claim | P2 |
| Church owner | Sign out | No UI | BUG-15 | Session persists on shared machines | Add sign-out to header/sidebar | P1 |
| Church owner | Reset password | No route | Not implemented | Permanent lockout | Ship with magic-link auth | P1 |
| Church owner | Delete account / export data | No route | Not implemented | No data-subject rights | Add self-service delete + export | P2 |
| Admin | Trust dashboard numbers | DB-or-mock, silent | BUG-07 | Decisions on fake data | Surface DB failures explicitly | P0 |
| Admin | Review suggested changes | Display only | No approve/reject action | Review queue is non-functional | Build review actions writing to `SuggestedChange` | P1 |
| Admin | Review submissions | Display only, mock | No actions, no real data | Submissions unreachable | Depends on BUG-05 fix | P1 |
| Admin | Un-verify a church | Impossible | BUG-09 — one-way flag | Cannot correct a bad badge | Accept boolean; add toggle UI | P2 |
| Admin | Manage users | Read-only | No invite/edit/revoke | Access management via SQL only | Build user management | P2 |
| Admin | Edit site copy | Writes, never read | BUG-16 | Feature does nothing | Read `SiteContent` in public pages | P2 |
| Admin | See who changed what | Hardcoded 3 rows | `UpdateLog` never written | No accountability | Write `UpdateLog` on every mutation | P1 |
| Admin | Sign out | No UI | BUG-15 | Admin session persists 7 days | Add sign-out | P1 |
| All | Recover from an error | Generic crash page | No `error.tsx` | Dead end | Add error boundaries | P1 |

---

## 9. UI and Design-System Findings

### 9.1 What is working

The visual language is genuinely coherent and worth preserving. A teal/sage brand ramp (`tailwind.config.ts:12–24`) with a warm `rose` accent, generous border radii (`rounded-[28px]`, `rounded-[36px]`), soft layered shadows, and radial-gradient washes (`section-wash`, `section-strong`, `tint-card` in `app/globals.css:42–62`) give the site a calm, welcoming character appropriate to its subject. `SectionHeading` provides consistent eyebrow → title → rule → description rhythm. `ChurchCard` is well-composed and information-dense without clutter.

**Recommendation: preserve this identity.** None of the accessibility fixes below require changing the brand.

### 9.2 The design system is only half-built

- **CONFIRMED** — `components.json` declares shadcn/ui with `"cssVariables": false`. Only 7 primitives were ever adopted: `button`, `card`, `input`, `textarea`, `badge`, `pagination`, `empty-state`. Missing and hand-rolled repeatedly: `Label`, `Select`, `Checkbox`, `Dialog`, `Toast`, `Alert`, `Table`, `Skeleton`, `Form`.
- **CONFIRMED** — Because `cssVariables: false`, there are **no semantic design tokens**. Colors are referenced as raw scale steps (`brand-700`, `stone-600`) rather than intent (`--color-text-muted`, `--color-surface-raised`). There is no way to retheme, no dark mode, and no single place to fix contrast.
- **CONFIRMED** — Ad-hoc controls duplicate primitive styling instead of using it:
  - `components/forms/claim-form.tsx:29` — a `<select>` with 60 characters of inline classes duplicating `Input`'s appearance
  - `app/admin/claims/page.tsx:50, 58, 60, 65` — raw `<button>` and `<textarea>` with inline classes, bypassing `Button` and `Textarea` entirely
  - `components/directory/filter-sidebar.tsx:44` — raw `<button>` with a bespoke gradient
  - `app/contact/page.tsx:30–52` — an entire form built from primitives, duplicating the orphaned `ContactForm`
- **CONFIRMED** — Radius values are inconsistent and magic: `rounded-2xl`, `rounded-[24px]`, `rounded-[27px]`, `rounded-[28px]`, `rounded-[30px]`, `rounded-[32px]`, `rounded-[36px]`, and `rounded-full` all appear. Seven values with no scale.
- **CONFIRMED** — `boxShadow.soft` and `boxShadow.card` (`tailwind.config.ts:37–40`) use `rgba(59, 42, 24, ...)` — a **warm brown** shadow — and `backgroundImage.halo` (`:42`) uses warm tan/sage gradients. These are leftovers from a previous warm palette and do not match the current cool teal identity. `halo` is additionally **never used anywhere**.
- **CONFIRMED** — BUG-12: `admin-shell` is applied on nine pages and defined nowhere.
- **CONFIRMED** — BUG-13: the display and body fonts never load.

### 9.3 Component and state coverage

| State | Coverage |
|---|---|
| Loading | **None.** No `loading.tsx`, no skeletons, no pending states except `LoginForm`'s button (`components/forms/login-form.tsx:62`) |
| Empty | **Partial.** `EmptyState` used on `/directory` and `/search`. `/cities/[slug]:59` falls back to a bare `<p>No churches yet.</p>`. Admin lists have no empty state at all — an empty claims queue renders as blank space below the heading |
| Success | **Inconsistent.** Query-param banners on admin/dashboard pages; nothing on public forms |
| Validation | **None.** No inline field errors anywhere |
| Error | **None.** See BUG-06 |
| Dark mode | **Not supported.** No `dark:` variants, no `darkMode` config |

### 9.4 Other UI defects

- **CONFIRMED** — `components/directory/church-card.tsx:46` — `<div className="space-y-5 p-6">` is indented inconsistently (8 spaces inside a 6-space block), and `:48–52` wraps the `<h3>` in a `flex items-start justify-between` container with a single child and an empty second slot. Vestigial markup from a removed element.
- **CONFIRMED** — `components/ui/badge.tsx`, `components/admin/status-badge.tsx`, and `components/directory/app-badge.tsx` overlap in purpose; the latter two are orphans (check #11).
- **CONFIRMED** — `public/` is completely empty. No favicon, no `apple-touch-icon`, no OG image, no `site.webmanifest`. `app/layout.tsx:16` declares `openGraph` metadata with **no image**, so every social share of this site renders as a bare text card.
- **CONFIRMED** — No PWA/service-worker configuration despite the product emphasizing "church apps" as a feature.
- **CONFIRMED** — `app/globals.css:11` sets `scroll-behavior: smooth` globally. Correctly disabled under `prefers-reduced-motion` (`:68`).

### 9.5 Responsive behavior

- **CONFIRMED (High)** — The 768–1279px navigation gap described in §8.2. This is the single worst responsive defect.
- **CONFIRMED** — `components/layout/header.tsx:54` positions the mobile menu with `absolute right-4 top-[72px]` — a hardcoded offset that assumes a fixed header height. The header contains a two-line brand block (`:22–23`) that wraps on narrow screens, growing taller than 72px and causing the menu to overlap the header.
- **CONFIRMED** — The mobile menu uses `<details>/<summary>` (`:50`). It does not close on outside click, does not close on `Escape`, does not trap focus, and does not close on navigation.
- **CONFIRMED** — Heading sizes are largely unscaled: `text-5xl` on `/login:36`, `/admin:39`, `/admin/claims:20`, `/admin/users:18`, `/dashboard/churches/[slug]:60`, and `text-5xl` on `/search:20`. Only `app/page.tsx:67` scales responsively (`text-5xl sm:text-6xl`). A 48px heading on a 320px viewport wraps to four or five lines.
- **CONFIRMED** — `app/directory/page.tsx:29` uses `lg:grid-cols-[320px_1fr]`, so below 1024px the filter sidebar stacks **above** the results, pushing all churches below a tall filter form on mobile.
- **CONFIRMED** — `app/admin/claims/page.tsx:42` and `app/admin/content/page.tsx:45` use `min-w-[220px]` / `min-w-[180px]` inside flex rows; combined with `admin-shell` padding on small screens this risks horizontal overflow.
- **CONFIRMED** — `components/directory/map-section.tsx:25` — the map `<iframe>` is `h-[380px] w-full` with no responsive height reduction.

### 9.6 Design-system recommendation

Introduce a token layer without changing the visual identity:

1. Enable `cssVariables: true` and define semantic tokens in `app/globals.css` (`--surface`, `--surface-raised`, `--text`, `--text-muted`, `--border`, `--brand`, `--brand-strong`, `--danger`, `--success`), mapped to the existing hex values.
2. Define a radius scale (`--radius-sm/md/lg/xl`) and replace the seven ad-hoc values.
3. Replace the warm brown shadows and remove the unused `halo` gradient.
4. Adopt the missing primitives: `Label`, `Select`, `Checkbox`, `Dialog`, `Toast`, `Alert`, `Table`, `Skeleton`.
5. Build a `Field` wrapper composing label + control + description + error, and route every form through it — this fixes most of §10 at once.
6. Delete the three orphan components or wire them in.
7. Load fonts via `next/font/google` with `display: "swap"`, and review the visual result as a design decision.

---

## 10. Accessibility Findings

Target: **WCAG 2.2 Level AA**. `ACCESSIBILITY_NOTES.md` claims alignment with WCAG 2.1 AA and Illinois IITAA / ADA Title II expectations. Several of its claims are accurate; several are overstated.

**Important:** no automated scan was run (see §6 blockers). Everything below is from code inspection. Contrast ratios flagged as REQUIRES TESTING are computed by eye from the palette and need a real contrast checker.

### 10.1 What the notes claim vs. what is true

| Claim in `ACCESSIBILITY_NOTES.md` | Verdict |
|---|---|
| "semantic page landmarks" | **Partial.** `<header>`, `<main id="main-content">`, `<footer>` in `app/layout.tsx:33–35`. But no `<nav>` on the footer, and admin sidebars use `<aside>` containing primary navigation without a `<nav>` wrapper |
| "visible skip link" | **True but broken.** See A11Y-01 |
| "keyboard-focus styles" | **Partial.** `.focus-ring` (`globals.css:64`) uses `focus:` not `focus-visible:`, and is applied to only ~8 elements. `Button` correctly uses `focus-visible:` |
| "reduced-motion support" | **True.** `globals.css:68–79` is correctly implemented |
| "mobile navigation that works without hover" | **Partial.** `<details>` works without hover but fails Escape/outside-click/focus-trap |
| "clearer link behavior between sites" | **Partial.** External links use `target="_blank" rel="noreferrer"` but never announce that they open a new window |

### 10.2 Confirmed violations

#### A11Y-01 — Skip link is invisible when focused (WCAG 2.4.7, 2.4.1)
**Severity: High · CONFIRMED**

`app/globals.css:34` styles `.skip-link` with `opacity-0`, and `:38` restores `opacity-100` on `:focus`. But the element is `absolute left-4 top-4` **at all times** — it is never removed from the layout, only made transparent. It therefore sits invisibly on top of the header at all times, and its transparent hit area can intercept clicks intended for the site logo.

More importantly, `opacity-0` does not remove an element from the accessibility tree or the tab order, so screen readers announce it always, while sighted keyboard users may see nothing if any stacking context places the header above it.

**Fix:** use the standard `sr-only` / `focus:not-sr-only` pattern rather than opacity.

#### A11Y-02 — Six pages have no `<h1>` (WCAG 1.3.1, 2.4.6)
**Severity: High · CONFIRMED** (check #18)

`/contact`, `/about`, `/directory`, `/dashboard`, `/cities`, and `/cities/[slug]` begin their heading hierarchy at `<h2>` because `SectionHeading` (`components/layout/section-heading.tsx:15`) hardcodes `<h2>`.

**Impact:** Screen-reader users navigating by heading find no document title. `/directory` is the product's most important page.

**Fix:** give `SectionHeading` an `as` prop (`"h1" | "h2" | "h3"`) defaulting to `h2`, and pass `as="h1"` on those six pages.

#### A11Y-03 — Placeholder-only labels on most public forms (WCAG 1.3.1, 3.3.2, 4.1.2)
**Severity: Critical · CONFIRMED**

The following inputs have **no `<label>`, no `aria-label`, and no `aria-labelledby`** — only a `placeholder`:

- `components/forms/submit-listing-form.tsx:9–18` — all **9** fields
- `components/forms/claim-form.tsx:17–40` — all **8** fields including the `<select>` at `:26`
- `components/forms/contact-form.tsx:9–11` — all 3 fields (orphaned component)
- `components/forms/login-form.tsx:54–55` — email and password
- `components/directory/search-bar.tsx:8` — the search input
- `components/directory/filter-sidebar.tsx:17–23` — all 7 text filters

**Impact:** A screen reader announces "edit text, blank" with no indication of purpose. Placeholders also vanish on focus, so users with cognitive or memory impairments lose the field's identity while typing. This is the most severe accessibility defect in the project, affecting every data-entry path a member of the public can reach.

Two counter-examples show the team knows the right pattern: `components/directory/hero-search.tsx:13` uses a proper `sr-only` label, and `components/forms/church-media-form.tsx:62` uses a visible `<label htmlFor>`. The public forms simply were not brought up to that standard.

#### A11Y-04 — Required fields not programmatically marked (WCAG 3.3.2)
**Severity: High · CONFIRMED**

`lib/validation/forms.ts` requires name (≥2), email, and message (≥10) on contact; nine fields on submit-listing; eight on claim. **No form input carries `required` or `aria-required`** except `app/contact/page.tsx:37, 41, 50` (the dead form) and `login-form.tsx:54–55`.

**Impact:** Users cannot know which fields are mandatory until submission throws an unhandled `ZodError` (BUG-06) and destroys their input.

#### A11Y-05 — No error identification or association (WCAG 3.3.1, 3.3.3)
**Severity: Critical · CONFIRMED**

No form in the project renders field-level errors. There is no `aria-invalid`, no `aria-describedby` pointing at an error message, no `role="alert"` region, and no error summary. Validation failures crash the page instead (BUG-06).

`components/forms/login-form.tsx:57` is the sole error display in the codebase — and it is a plain `<div>` with no `role="alert"`, so screen-reader users receive no announcement when sign-in fails.

#### A11Y-06 — Icon-only and ambiguous link text (WCAG 2.4.4, 2.4.9)
**Severity: Medium · CONFIRMED**

`components/directory/social-icons.tsx:27` sets `aria-label={link.platform}` — announcing literally "facebook" or "x" with no context. In a directory listing 64 churches, a screen-reader user navigating by link hears "facebook, instagram, youtube" repeated 64 times with no way to tell which church each belongs to.

**Fix:** `aria-label={`${church.name} on ${platformLabel}`}`.

Similarly, "View Details" (`church-card.tsx:111`) repeats identically on every card. Use an `aria-label` including the church name.

#### A11Y-07 — External links do not announce new-window behavior (WCAG 3.2.5)
**Severity: Medium · CONFIRMED**

Every `target="_blank"` link — `header.tsx:37, 62`, `church-card.tsx:84, 92, 100`, `churches/[slug]/page.tsx:103, 111, 118`, `map-section.tsx:18`, `social-icons.tsx:28` — opens a new tab with no visual or assistive indication.

Also: `rel="noreferrer"` is used throughout but **`noopener` is never specified**. Modern browsers imply `noopener` for `target="_blank"`, so this is low practical risk, but `rel="noopener noreferrer"` is the correct defensive form.

#### A11Y-08 — Mobile menu is not a proper disclosure (WCAG 2.1.2, 4.1.2)
**Severity: High · CONFIRMED**

`components/layout/header.tsx:50` — the `<details>/<summary>` menu has no `aria-expanded`, no `aria-controls`, does not close on `Escape`, does not close on outside click, does not close after navigation, and does not return focus to the trigger.

**Impact:** A keyboard user who opens the menu and tabs past the last link continues into the page behind the still-open overlay, with no way to dismiss it except re-activating the summary.

#### A11Y-09 — Map iframe title is uninformative (WCAG 2.4.1, 4.1.2)
**Severity: Medium · CONFIRMED**

`components/directory/map-section.tsx:25` — `title="Map"`. It should identify the church: `title={`Map showing the location of ${church.name}`}`. The iframe is also focusable and scrollable with no keyboard escape guidance.

#### A11Y-10 — Contrast risks (WCAG 1.4.3)
**Severity: Medium · REQUIRES TESTING**

Candidates that need measurement with a real contrast checker:

| Location | Foreground / Background | Concern |
|---|---|---|
| `church-card.tsx:59` | `text-rose` (`#f28b66`) on `bg-rose/15` | Orange on pale orange — almost certainly below 4.5:1 |
| `verified-badge.tsx:11` | `text-sage` (`#6ba292`) on `bg-sage/15` | Same pattern |
| `login-form.tsx:57` | `text-rose` on `bg-rose/10` | This is the **error message**; failing contrast here is especially damaging |
| `admin-sidebar.tsx:19` | `text-white/78` on brand gradient | Reduced-opacity white on a mid-tone gradient |
| `church-dashboard-sidebar.tsx:17` | `text-white/80` on gradient | Same |
| `app/page.tsx`, `login/page.tsx:55` | `text-white/82` on `bg-brand-900` | Same |
| `filter-sidebar.tsx:11` | `text-brand-700` on white gradient | Likely passes; verify |
| `input.tsx:8` | `placeholder:text-stone-400` | Placeholder-as-label (A11Y-03) makes this a **content** contrast failure, not decorative |

Also **CONFIRMED**: `globals.css:26` sets `a:hover { text-decoration-thickness: 2px }` but no rule establishes `text-decoration: underline` in the first place, and most links use color alone to signal linkness — a WCAG 1.4.1 (Use of Color) concern in body copy.

#### A11Y-11 — Touch targets below 24×24 CSS px (WCAG 2.5.8 — new in 2.2)
**Severity: Medium · CONFIRMED / REQUIRES TESTING**

- `components/directory/filter-sidebar.tsx:25, 29, 33, 37, 41` — five bare `<input type="checkbox">` with no sizing. Default rendering is roughly 13×13px, well below the 24×24 minimum.
- `components/ui/button.tsx:17` — `size="sm"` is `px-4 py-2 text-xs`. With 12px text and 8px vertical padding the height lands near 32px — passes 2.5.8 but fails the more generous 44×44 guidance of 2.5.5 AAA.
- Social icon buttons (`social-icons.tsx:31`) are `h-10 w-10` — **passes**.

#### A11Y-12 — Zoom and text resizing (WCAG 1.4.4, 1.4.10)
**Severity: Medium · REQUIRES TESTING**

No `user-scalable=no` or maximum-scale restriction was found (good — `app/layout.tsx` sets no viewport meta at all, so Next's default applies). However the many fixed pixel values (`min-w-[220px]`, `h-[380px]`, `top-[72px]`, `h-80`, `h-72`, `h-60`, `h-52`) and the absence of `rem`-based sizing mean 200% zoom and browser text-size overrides are untested and likely to break layouts.

#### A11Y-13 — Missing dialog, live-region, and table semantics
**Severity: Medium · CONFIRMED**

- No `<dialog>` or `role="dialog"` exists anywhere, so no focus-trap review is needed **yet** — but the moment a confirmation modal is added (needed for delete/deny/revoke), this becomes a requirement.
- No `aria-live` region exists. Every async result — sign-in failure, save confirmation, filter result count — updates silently for screen-reader users. `app/directory/page.tsx:36` renders "{results.length} churches found" with no live region, so filtering announces nothing.
- No `<table>` elements exist; admin lists use card layouts. This is acceptable and arguably better, but if tables are introduced they will need `<caption>`, `<th scope>`, and header association.

#### A11Y-14 — `lang` and document metadata
**Severity: Low · CONFIRMED**

`app/layout.tsx:28` correctly sets `<html lang="en">`. Good. But there is no `viewport` export, no `theme-color`, and no favicon (empty `public/`), so the browser tab is unlabeled visually.

### 10.3 Accessibility summary

`ACCESSIBILITY_NOTES.md` correctly identifies that manual keyboard testing, screen-reader testing, and an automated axe/Lighthouse scan are still required. That assessment is accurate and should be retained. The notes should be corrected to remove the implication that labeling and error identification are already handled — **A11Y-03 and A11Y-05 are project-wide and severe**, and a public-entity accessibility posture cannot be claimed while they stand.

Given the Illinois IITAA / ADA Title II framing in the repo's own documentation, A11Y-01 through A11Y-05 should be treated as launch blockers.

---

## 11. Security and Privacy Findings

Reviewed against OWASP Top 10 (2021) and ASVS-style controls. No exploitation, no production testing, no destructive testing was performed. Findings are from source inspection only.

---

### SEC-01 — Hardcoded production session-signing secret in the repository
**Severity: CRITICAL · Confidence: CONFIRMED · OWASP A02/A07**
**File:** `lib/auth.ts:6–11`

```ts
const authSecret =
  process.env.AUTH_SECRET ??
  process.env.NEXTAUTH_SECRET ??
  (process.env.NODE_ENV === "production"
    ? "champaign-county-church-directory-production-fallback-secret"
    : "champaign-county-church-directory-dev-secret");
```

The production branch falls back to a **fixed string committed to a public GitHub repository** (`README.md` links to `https://github.com/TESVM/champaign-county-church-directory`).

**Attack scenario:** If `AUTH_SECRET` and `NEXTAUTH_SECRET` are both unset in the Vercel environment, the application signs sessions with a value any reader of the repo possesses. An attacker constructs the payload `{"id":"x","name":"x","email":"x@x.com","role":"ADMIN","churchSlugs":[]}`, base64url-encodes it, computes `HMAC-SHA256` with the published string, sets the `cccd_session` cookie, and is a full administrator. No credentials, no interaction, no rate limit, no log entry distinguishable from a legitimate login.

**Impact:** Complete authentication bypass and full administrative compromise. The attacker can approve their own claim requests, take ownership of any church listing, edit any record, and modify site copy.

**Why the fallback is worse than a crash:** the fallback exists to prevent the app from failing when misconfigured. That trade is backwards — a site that refuses to boot is a visible, fixable problem; a site that boots with a known secret is an invisible, exploitable one. `DEPLOYMENT_CHECKLIST.md` documents setting `AUTH_SECRET`, but nothing enforces it.

**Remediation:** Remove both fallbacks. Throw at module load if neither variable is set. Fail closed.

**Verification test:** Start the app with `NODE_ENV=production` and no `AUTH_SECRET`; assert the process exits non-zero. Add a unit test asserting no hardcoded secret string exists in `lib/auth.ts`.

**Breaking change:** Yes — deployments without the variable set will stop booting. That is the intent. Rotating the secret invalidates all existing sessions.

---

### SEC-02 — Hardcoded credentials grant ADMIN and cannot be disabled
**Severity: CRITICAL · Confidence: CONFIRMED · OWASP A07**
**Files:** `lib/data/access.ts:44–69`, `lib/auth.ts:142–154`, `app/login/page.tsx:68–73`

`mockCredentials` is a plaintext array of four email/password pairs committed to the repository, including `admin@countychurchdirectory.local` with password `admin` at role `ADMIN`, and `reviewer@...` with password `review` at role `REVIEWER`.

`authenticateWithCredentials` checks the environment-configured admin credentials **first** (`:132`), and then — regardless of that outcome — falls through to `mockCredentials` (`:142`). There is **no environment guard**, no `NODE_ENV` check, and no feature flag.

**This means setting `ADMIN_EMAIL` and `ADMIN_PASSWORD` in production does not disable the hardcoded accounts.** `DEPLOYMENT_CHECKLIST.md` instructs operators to set a strong `ADMIN_PASSWORD` and states "Do not use the demo default in production", which reasonably implies the demo path is thereby closed. It is not.

Compounding it: `app/login/page.tsx:68–73` **prints the demo credentials on the public login page in production**, and `:73` documents that any database-backed church user can sign in with the literal shared password `"church"` (`lib/auth.ts:156`).

**Attack scenario:** An attacker visits `/login`, reads the credentials printed on the page, signs in as `admin@countychurchdirectory.local / admin`, and has full administrative access. No repository access is even required.

**Impact:** Trivial, fully-documented administrative compromise. This is more accessible than SEC-01 because it requires nothing but a browser.

**Remediation:** Delete `mockCredentials` entirely. Remove the demo-credentials panel from the login page. Replace the shared `"church"` password with per-user credentials or magic-link authentication. Add a startup assertion that no credential constant exists in the bundle.

**Verification:** Integration test asserting that `admin@countychurchdirectory.local / admin` returns 401 when `ADMIN_EMAIL`/`ADMIN_PASSWORD` are set to other values.

**Breaking change:** Yes — demo logins stop working, which is the point. Requires a real credential story first (see SEC-03).

---

### SEC-03 — No password storage; shared password for all church users
**Severity: CRITICAL · Confidence: CONFIRMED · OWASP A07**
**Files:** `prisma/schema.prisma:176–185`, `lib/auth.ts:156–168`

The `User` model has `id`, `name`, `email`, `role`, timestamps, and relations. **There is no `passwordHash`, no `password`, no `emailVerified`, and no credential field of any kind.** There are also no `Account`, `Session`, or `VerificationToken` models, despite `@auth/prisma-adapter` being installed.

Consequently `lib/auth.ts:156` authenticates every database-backed church user with a single hardcoded literal:

```ts
if (password === "church") {
  const dbUser = await findDbChurchUser(email);
  if (dbUser && (dbUser.role === "CHURCH_OWNER" || dbUser.role === "CHURCH_EDITOR")) { ... }
}
```

**Attack scenario:** An attacker who learns any church contact email — these are **published on the public directory pages** (`app/churches/[slug]/page.tsx:137` renders `church.email`) — signs in as that church's owner using the password `"church"`, which is printed on the login page. They then edit that church's public listing: phone number, website URL, livestream URL, description.

**Impact:** Any visitor can take over any claimed church's listing using information the site itself publishes. Redirecting a church's "Visit Website" or "Watch Livestream" link to a malicious domain is a credible phishing vector against that congregation, executed from a trusted local directory.

**Remediation:** This requires a schema migration and a real auth implementation. Recommended: **magic-link (email OTP) authentication**, which avoids password storage entirely and suits infrequent, non-technical users (church volunteers) far better than passwords. Add `VerificationToken` and `Session` models. If passwords are preferred instead, add `passwordHash` with Argon2id or bcrypt (cost ≥ 12), plus reset-token support.

**Breaking change:** Yes — all existing church sign-ins break. Requires the notification system (§8) to exist first, since magic links need email delivery.

---

### SEC-04 — Sessions carry no expiry, no revocation, and no integrity binding
**Severity: HIGH · Confidence: CONFIRMED · OWASP A07**
**File:** `lib/auth.ts:31–89, 177–196`

The session token is `base64url(JSON(user)) + "." + HMAC(payload)`. The payload contains `id`, `name`, `email`, `role`, and `churchSlugs` — and **no `exp`, `iat`, `jti`, or nonce**.

Consequences, all confirmed:

1. **No server-side expiry.** The only lifetime control is the cookie's `maxAge` of 7 days (`app/api/auth/login/route.ts:32`). A token captured from a cookie jar, a log, or a shared browser profile is valid **forever**, because `decodeSession` (`:41`) verifies only the signature.
2. **No revocation.** `signOut()` (`:193`) deletes the client cookie. The token itself remains valid. There is no denylist and no server-side session store.
3. **Privileges are frozen at issue time.** `role` and `churchSlugs` live in the cookie and are never re-checked against the database. Revoking a `ChurchMembership` (the schema supports `REVOKED`, `schema.prisma:47`) has **no effect** on anyone already holding a token. A fired church volunteer keeps edit access for up to 7 days — and forever if they saved the cookie value.
4. **No binding to client context** — no IP, no user-agent, no device fingerprint.
5. **No session rotation** on privilege change or re-authentication.

**Attack scenario:** A church revokes a departing volunteer's membership through a future admin UI. The volunteer's browser still holds a valid signed token asserting `churchSlugs: ["their-church"]`. `requireChurchAccess` (`lib/auth-guards.ts:27`) reads `session.user.churchSlugs` **straight from the cookie** and grants access. The revocation is cosmetic.

**Remediation:** Add `exp` and `iat` to the payload and enforce them in `decodeSession`. Add a `jti` and a server-side `Session` table for revocation. Re-resolve `role` and `churchSlugs` from the database on every privileged request rather than trusting the cookie. Rotate the token on privilege change.

**Verification:** Test that a token with `exp` in the past is rejected; test that revoking a membership immediately denies access.

---

### SEC-05 — Cron endpoint is fully public when `CRON_SECRET` is unset
**Severity: HIGH · Confidence: CONFIRMED · OWASP A01**
**File:** `app/api/cron/weekly-scan/route.ts:5–10`

```ts
const secret = process.env.CRON_SECRET;
if (secret && authHeader !== `Bearer ${secret}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

If `CRON_SECRET` is unset, `secret` is falsy, the condition short-circuits, and **the check is skipped entirely**. `DEPLOYMENT_CHECKLIST.md` lists `CRON_SECRET` under "Optional but Recommended".

**Attack scenario:** Anyone issues `GET /api/cron/weekly-scan` and receives a JSON response enumerating every church slug, its website URL, and scan metadata. Today `runWeeklyScan` (`lib/scan/weekly-scan.ts:17`) only reads mock data, so the impact is limited to information disclosure and unmetered compute. **Once the scan is upgraded to perform real HTTP fetches of church websites — the documented plan — this becomes an unauthenticated, unrated request amplifier**: an attacker can trigger dozens of outbound fetches at will, from Vercel's IP space, against third-party sites.

**Remediation:** Fail closed — return 401 when `CRON_SECRET` is unset. Use `timingSafeEqual` for the comparison rather than `!==`. Add rate limiting.

---

### SEC-06 — SSRF and image-proxy abuse via wildcard remote patterns
**Severity: HIGH · Confidence: CONFIRMED · OWASP A10**
**File:** `next.config.mjs:4–10`

```js
images: { remotePatterns: [{ protocol: "https", hostname: "**" }] }
```

Every HTTPS host on the internet is an allowed source for the Next.js image optimizer.

**Attack scenario:** `/_next/image?url=https://<any-host>/<path>&w=640&q=75` causes the Vercel serverless function to fetch an arbitrary URL. This turns the deployment into an open image proxy: an attacker can launder traffic through the site's domain and IP reputation, probe internal HTTPS endpoints reachable from the function's network, and consume the image-optimization quota (a direct cost). Combined with the `sharp` CVEs from §3.1, arbitrary attacker-controlled image bytes are also being fed to a vulnerable image decoder.

**Remediation:** Replace the wildcard with an explicit allowlist of hostnames actually in use (the mock data references `images.unsplash.com` and a handful of church CDNs). Better long term: ingest images into managed storage (Vercel Blob / S3) at upload time and serve only from that origin.

---

### SEC-07 — No rate limiting or brute-force protection anywhere
**Severity: HIGH · Confidence: CONFIRMED · OWASP A07**
**Files:** `app/api/auth/login/route.ts`, all of `app/actions.ts`, `app/api/cron/weekly-scan/route.ts`

Confirmed by check #13 — there is **no middleware**, and no rate-limiting library is present in `package.json`. `POST /api/auth/login` accepts unlimited attempts with no delay, no lockout, no CAPTCHA, and no logging of failures.

**Attack scenario:** Given that the admin password may be a human-chosen string (`ADMIN_PASSWORD`), and that valid usernames are published on the login page, an attacker can brute-force at full network speed. Public forms (`/claim`, `/submit`, `/contact`) are equally unprotected and — once they persist data — become spam and storage-exhaustion vectors.

**Remediation:** Add rate limiting at the edge via `middleware.ts` (Upstash Redis or Vercel KV): strict per-IP and per-account limits on `/api/auth/login`, moderate limits on public form actions. Add exponential backoff and account lockout. Log all authentication failures.

---

### SEC-08 — Open redirect in church-save actions
**Severity: HIGH · Confidence: CONFIRMED · OWASP A01**

Full detail in **BUG-08** (§7). Recorded here for the security register.

---

### SEC-09 — File upload accepts client-declared MIME type and stores unbounded data URLs in Postgres
**Severity: HIGH · Confidence: CONFIRMED · OWASP A03/A04**
**File:** `app/actions.ts:108–124`

```ts
if (!file.type.startsWith("image/")) return undefined;
if (file.size > 4 * 1024 * 1024) return undefined;
const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
return `data:${file.type};base64,${base64}`;
```

Four distinct problems:

1. **`file.type` is client-controlled.** It comes from the multipart `Content-Type` header and is trivially forged. No magic-byte / file-signature validation is performed. An attacker uploads `payload.svg` or an HTML file declared as `image/png`.
2. **`file.type` is interpolated directly into the data URL** (`:123`). A crafted type string produces an attacker-shaped data URL. Because these URLs are later rendered via `next/image` with `unoptimized` (`church-card.tsx:37`, `churches/[slug]/page.tsx:93`) — bypassing `sharp` re-encoding entirely — the raw bytes reach the browser. An SVG declared as `image/svg+xml` containing `<script>` is a stored-XSS candidate.
3. **No re-encoding or sanitization.** Legitimate uploads should be decoded, stripped of EXIF (which carries GPS coordinates), and re-encoded server-side. None of that happens.
4. **Storage model is wrong.** A 4 MB image becomes a ~5.5 MB base64 string in a Postgres `text` column, embedded inline in every HTML response that renders the church. This bloats rows, defeats CDN caching, defeats image optimization, and inflates page weight by megabytes.

**Attack scenario:** A church editor (or anyone exploiting SEC-03 to become one) uploads a malicious SVG. It is stored as a data URL and rendered `unoptimized` on the public church profile, the directory card, the city page, and search results.

**Remediation:** Validate magic bytes with a library such as `file-type`. Re-encode through `sharp` to a known-safe format. Strip EXIF. Reject SVG outright. Store in Vercel Blob or S3 and persist only the URL. Enforce size limits before buffering the whole file into memory.

---

### SEC-10 — No security headers and no Content-Security-Policy
**Severity: HIGH · Confidence: CONFIRMED · OWASP A05**
**File:** `next.config.mjs` (confirmed by check #14 — no `headers()` function)

Absent: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options` / `frame-ancestors`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`.

**Impact:** No defense-in-depth against XSS (which matters given SEC-09 and SEC-11), no clickjacking protection on the admin panel (an attacker can frame `/admin/churches/[id]` and trick an authenticated admin into clicking "Mark verified"), and no MIME-sniffing protection.

**Remediation:** Add a `headers()` block. Note the CSP must accommodate the inline JSON-LD `<script>` (`churches/[slug]/page.tsx:89`) via a nonce, and `frame-src` must allow `google.com/maps` for the embed.

---

### SEC-11 — JSON-LD injection vector
**Severity: MEDIUM (today) / HIGH (after Prisma migration) · Confidence: CONFIRMED · OWASP A03**
**File:** `app/churches/[slug]/page.tsx:89`

```tsx
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
```

`JSON.stringify` does **not** escape `<`, `>`, or `/`. A church `name`, `description`, or `address1` containing the literal string `</script><script>...` terminates the JSON-LD block early and injects executable script into the page.

**Today** the inputs come from `lib/data/mock.ts`, which is developer-controlled — hence Medium. **After the Prisma migration (Phase 1)**, these fields become admin- and church-editor-writable through `saveChurchListingRecord`, which applies only `.trim()` (`lib/data/admin-store.ts:41`) and no sanitization. At that moment this becomes a live stored-XSS path on the site's most-visited page type, exploitable by any user who can pass SEC-03.

**Remediation:** Escape the serialized output — replace `<` with `<`, `>` with `>`, `&` with `&` — before injecting. Add a CSP nonce.

**This is the clearest example of why the security fixes must land before or with the data migration, not after.**

---

### SEC-12 — Coarse authorization: REVIEWER and SUPPORT are effectively ADMIN
**Severity: MEDIUM · Confidence: CONFIRMED · OWASP A01**
**Files:** `lib/auth-guards.ts:14–23`, `app/actions.ts:131–149`

`requireAdminAccess()` admits `ADMIN`, `REVIEWER`, and `SUPPORT` identically, and it is the **only** guard on all eight `/admin/*` pages — including `/admin/users` (view every user's email and church assignments) and `/admin/content` (rewrite public site copy).

`requireChurchManageAccess` (`app/actions.ts:138`) additionally grants `REVIEWER` and `SUPPORT` **write access to every church listing** — broader than `requireChurchAccess` in `lib/auth-guards.ts:29`, which grants only `ADMIN` plus membership. Two guards, same intent, different privilege sets, duplicated logic.

**Impact:** No least privilege. A `SUPPORT` account intended for answering questions can rewrite the homepage, mark churches verified, and edit any listing. Also note the schema supports `REVOKED` memberships, but no guard checks membership status — a revoked membership is never consulted because authorization reads the cookie (SEC-04).

**Remediation:** Define an explicit permission matrix (resource × action × role) in one module. Delete the duplicate inline guard. Enforce at the data-access layer, not only at the page level.

---

### SEC-13 — Publication of real, unverified personal and organizational data
**Severity: MEDIUM · Confidence: CONFIRMED · Privacy**
**Files:** `lib/data/mock.ts`, `lib/data/access.ts`, `FAITH_CHURCH_RESEARCH_NOTES.md`, `FAITHSTREET_IMPORT_NOTES.md`

`lib/data/mock.ts` is **not** purely fictional. It mixes clearly synthetic records (`.example` domains, `(217) 555-01xx` numbers) with records for **real churches** scraped from real sources. The research notes confirm this explicitly: Faith Baptist Church of Champaign (`https://faithchampaign.org/`), Faith Church of Urbana (`https://www.fccurbana.org/`), Stone Creek Church, First United Methodist Church of Urbana, and Illini Life Christian Fellowship, with named real pastors ("Pastor confirmed from staff page: Brandon Tipsword") and 9 real-looking Gmail addresses across the file.

`lib/data/access.ts:39` further hardcodes a real church's Gmail address as a `CHURCH_EDITOR` account with the password `"church"` — meaning a **real church's real email address is a working credential in a public repository** (compounding SEC-02 and SEC-03).

Separately, the codebase sets `verified: true` on records verified only by a developer reading a website — a much weaker claim than the "Verified" badge implies to visitors, and one made without the church's participation or consent.

**Impact:** Publishing real contact details, real named clergy, and a real "Verified" trust badge for organizations that never opted in, with no correction channel that works (BUG-04), no takedown process, and no privacy policy. `FAITHSTREET_IMPORT_NOTES.md:74` itself flags the unresolved copyright question around imported material.

**Remediation:** Separate fixtures from production data — real records belong in the database via a reviewed seed, never in a repository file. Remove `fbcchampaign@gmail.com` from `access.ts` immediately. Define what "Verified" means and require church confirmation before applying it. Publish a privacy policy and a working removal request path. Take legal/product-owner direction on the FaithStreet sourcing question.

---

### SEC-14 — Dependency vulnerabilities
**Severity: HIGH · Confidence: CONFIRMED**

Detailed in §3.1: 6 production vulnerabilities (4 high, 2 critical) including a Next.js server-function disclosure advisory directly relevant to this app's server-action-heavy design, and `sharp` libvips CVEs directly relevant to its image handling. `npm audit fix` is reported as available.

---

### SEC-15 — Verbose server-side logging of errors
**Severity: LOW · Confidence: CONFIRMED**
**Files:** `lib/auth.ts:86, 118, 172`, `lib/data/admin-store.ts:32, 71`

`console.error` calls log full error objects. Prisma errors can include query fragments and parameter values; auth errors are logged inside the credential path. On Vercel these land in function logs accessible to anyone with project access.

**Remediation:** Structured logging (pino) with explicit redaction, error IDs surfaced to users instead of raw messages, and no logging inside credential-comparison branches.

---

### SEC-16 — Not implemented: MFA, email verification, account lockout, audit logging
**Severity: MEDIUM · Confidence: CONFIRMED**

No MFA and no schema support for it. No email verification (`User` has no `emailVerified`). No lockout (SEC-07). No audit log — `UpdateLog` exists in the schema and is **never written**; `getPersistedAuditLogs` (`admin-store.ts:606`) returns a hardcoded 3-row array while ignoring the database. There is therefore **no record of who changed any church record, approved any claim, or edited any site copy**.

For an application whose core value is trustworthy public information, the absence of an audit trail on every mutation is a significant governance gap.

---

### SEC-17 — CSRF posture
**Severity: LOW–MEDIUM · Confidence: REQUIRES TESTING**

Server actions carry Next.js's built-in origin checks, and the session cookie is `sameSite: "lax"` (`app/api/auth/login/route.ts:29`) — reasonable baseline protection.

However `POST /api/auth/login` is a hand-rolled route handler with **no origin validation and no CSRF token**. It accepts `application/json`, which browsers will not send cross-origin without a preflight, so practical risk is low — but this should be verified rather than assumed, and login CSRF (forcing a victim into an attacker's session) is a real class of attack.

Also note SEC-10: without `X-Frame-Options`/`frame-ancestors`, admin pages are framable, enabling clickjacking against the one-click "Mark verified" / "Approve" forms — which are `POST` server actions with no confirmation step.

---

### SEC-18 — No data retention, deletion, backup, or recovery story
**Severity: MEDIUM · Confidence: CONFIRMED**

No account deletion, no data export, no retention policy, no documented backup schedule, and no restore test. `ClaimRequest.evidenceSummary` stores free-text applicant evidence — potentially sensitive personal information — indefinitely, with no purge policy and no encryption at rest beyond whatever the database provider supplies by default.

---

### 11.1 Security findings summary

| ID | Severity | Confidence | Area | Breaking fix? |
|---|---|---|---|---|
| SEC-01 | **Critical** | Confirmed | Hardcoded prod signing secret | Yes |
| SEC-02 | **Critical** | Confirmed | Hardcoded ADMIN credentials, undisableable | Yes |
| SEC-03 | **Critical** | Confirmed | No password storage; shared `"church"` password | Yes |
| SEC-04 | High | Confirmed | No session expiry/revocation; privileges in cookie | Yes |
| SEC-05 | High | Confirmed | Cron open when secret unset | No |
| SEC-06 | High | Confirmed | Wildcard image hosts → SSRF/proxy | Possibly |
| SEC-07 | High | Confirmed | No rate limiting anywhere | No |
| SEC-08 | High | Confirmed | Open redirect | No |
| SEC-09 | High | Confirmed | Unsafe upload validation + data-URL storage | Possibly |
| SEC-10 | High | Confirmed | No security headers / CSP | Possibly |
| SEC-11 | Med→High | Confirmed | JSON-LD injection | No |
| SEC-12 | Medium | Confirmed | Coarse authorization | No |
| SEC-13 | Medium | Confirmed | Real personal data + unearned "Verified" | Product decision |
| SEC-14 | High | Confirmed | Vulnerable dependencies | Possibly |
| SEC-15 | Low | Confirmed | Verbose error logging | No |
| SEC-16 | Medium | Confirmed | No MFA/verification/lockout/audit log | No |
| SEC-17 | Low–Med | Requires testing | Login-route CSRF, clickjacking | No |
| SEC-18 | Medium | Confirmed | No retention/deletion/backup story | No |

---

## 12. Code and Architecture Findings

### 12.1 Genuine strengths

These are worth stating plainly, because they determine that this project should be improved rather than rewritten:

- **Strict TypeScript, honored.** `tsconfig.json` sets `strict: true`, and check #8 confirms **zero** `any`, `as any`, or `<any>` in the entire application. That is rare and valuable.
- **Clean typecheck, lint, and build** (checks #1–#3).
- **Zero TODO/FIXME debt markers** (check #7).
- **Sensible module boundaries.** `app/` ↔ `components/` ↔ `lib/` separation is respected; components are grouped by domain (`admin/`, `directory/`, `forms/`, `layout/`, `ui/`, `dashboard/`).
- **Server Components used correctly** — only `login-form.tsx` and `church-media-form.tsx` are `"use client"`, and both genuinely need it.
- **Consistent Next.js 15 idiom** — `params` and `searchParams` are correctly awaited as Promises throughout.
- **Good SEO fundamentals** — per-route `generateMetadata`, canonical URLs, `generateStaticParams`, `sitemap.ts`, `robots.ts`, JSON-LD.

### 12.2 Duplicated business logic

- **CONFIRMED (High)** — **The entire query layer is duplicated.** `lib/data/queries.ts` (mock) and `lib/data/admin-store.ts` (Prisma) implement the same concepts twice with different names and, in places, different semantics:

  | Concept | Mock version | Prisma version | Divergence |
  |---|---|---|---|
  | Admin stats | `getAdminStats` (`queries.ts:105`) | `getPersistedAdminStats` (`admin-store.ts:610`) | Identical logic, two implementations |
  | Claim requests | `getClaimRequests` (`:125`) | `getPersistedClaimRequests` (`:160`) | — |
  | Memberships by email | `getMembershipsByEmail` (`:133`) | `getPersistedMembershipsByEmail` (`:217`) | — |
  | Admin users | `getAdminUsers` (`:141`) | `getPersistedAdminUsers` (`:279`) | — |
  | Site content | `getSiteContent` (`:145`) | `getPersistedSiteContent` (`:305`) | — |
  | Unclaimed churches | `getUnclaimedChurches` (`:153`) | `getPersistedUnclaimedChurches` (`:653`) | **Mock returns all; Prisma `take: 6`** |
  | Listings needing refresh | `getListingsNeedingRefresh` (`:157`) | `getPersistedListingsNeedingRefresh` (`:678`) | Both slice to 6, different mechanisms |

  Several mock-side functions (`getAdminStats`, `getClaimRequests`, `getClaimRequestByChurchSlug`, `getMembershipsByEmail`, `getMembershipByChurchSlug`, `getAdminUsers`, `getSiteContent`, `getUnclaimedChurches`, `getListingsNeedingRefresh`) are now **dead** — superseded by the `getPersisted*` variants but never deleted.

- **CONFIRMED (Medium)** — Authorization logic is duplicated: `requireChurchAccess` (`lib/auth-guards.ts:25`) and `requireChurchManageAccess` (`app/actions.ts:131`) express the same intent with **different role sets** (SEC-12).
- **CONFIRMED (Medium)** — `searchParams` normalization is copy-pasted verbatim in `app/directory/page.tsx:15`, `app/search/page.tsx:12`, and partially in `app/claim/page.tsx:11` and both `[slug]` pages. Five sites, one missing helper.
- **CONFIRMED (Low)** — The Unsplash fallback image URL `https://images.unsplash.com/photo-1438232992991-995b7058bbb3?...` is hardcoded in three files (`churches/[slug]/page.tsx:66`, `dashboard/churches/[slug]/page.tsx:46`, `admin/churches/[id]/page.tsx:40`), and a **different** Unsplash URL is hardcoded in `church-card.tsx:24`. Four copies, two values, no constant.
- **CONFIRMED (Low)** — The `canAccessAdmin` role check is written three times: `app/login/page.tsx:9`, `app/dashboard/churches/[slug]/page.tsx:51`, and inside `requireAdminAccess`.
- **CONFIRMED (Low)** — The savedState banner block is duplicated between `app/admin/churches/[id]/page.tsx:55` and `app/dashboard/churches/[slug]/page.tsx:73` with slightly different message sets.

### 12.3 Runtime validation at trust boundaries

- **CONFIRMED (High)** — Zod is used on only **3 of ~10** write paths. `reviewClaimRequestAction`, `saveSiteContentAction`, `saveChurchMediaAction`, `saveChurchListingAction`, and `saveChurchStatusAction` all read `FormData` with `?.toString()` and **no schema validation whatsoever**.
- **CONFIRMED (High)** — `reviewClaimRequestAction` (`app/actions.ts:68`) casts an arbitrary user-supplied string straight to a union type:
  ```ts
  const decision = formData.get("decision")?.toString() as "APPROVED" | "MORE_INFO" | "DENIED" | undefined;
  ```
  There is no runtime check that the value is one of the three. It is passed to `prisma.claimRequest.update({ data: { status: input.decision } })` (`admin-store.ts:544`). Prisma's enum validation will reject a bad value at the database layer, producing an **unhandled 500** rather than a validation message — and `admin-store.ts` does not wrap this call in `withFallback`, so the error propagates to a page with no `error.tsx`.
- **CONFIRMED (High)** — `saveSiteContentAction` (`:90`) performs the identical unchecked cast on `area`.
- **CONFIRMED (Medium)** — `saveChurchListingAction` accepts **any** string for `phone`, `email`, `name`, and `description` with no length limit, no format validation, and no sanitization. `email` is written to a public-facing field with no email validation at all. Combined with SEC-11, unbounded `description` is the JSON-LD injection payload carrier.
- **CONFIRMED (Medium)** — `lib/data/admin-store.ts` casts database strings to TypeScript unions in five mapper functions (`:96`, `:98`, `:119`, `:120`, `:136`, `:155`) with no runtime validation. `mapUser` (`:136`) casting `EDITOR` into `AdminUserRecord["role"]` is the concrete failure (BUG-18).
- **CONFIRMED (Medium)** — `decodeSession` (`lib/auth.ts:66`) shape-checks the parsed payload but casts `role` with `parsed.role as DirectoryRole` (`:82`) **without verifying it is a valid member**. Since the payload is HMAC-signed this is not directly exploitable, but it means a token minted by an older code version with a since-removed role flows through unchecked.
- **CONFIRMED (Low)** — `app/api/auth/login/route.ts:10` types the parsed JSON body via a type assertion rather than a schema.

### 12.4 Error handling

- **CONFIRMED (High)** — No `error.tsx`, `global-error.tsx`, `not-found.tsx`, or `loading.tsx` anywhere (check #12).
- **CONFIRMED (High)** — `withFallback` (`admin-store.ts:61`) swallows every database error and returns fabricated data (BUG-07). This is the single most dangerous error-handling decision in the codebase, because it converts outages into plausible-looking success.
- **CONFIRMED (Medium)** — Inconsistent strategies coexist: throw-and-crash (Zod `.parse`), swallow-and-fake (`withFallback`), swallow-and-null (`findDbChurchUser`, `lib/auth.ts:117`), and silent-return (BUG-17). No unified error model, no error codes, no typed results.
- **CONFIRMED (Medium)** — Write functions (`saveChurchMediaRecord`, `saveChurchListingRecord`, `saveChurchStatusRecord`, `createPersistedClaimRequest`) return `null` for both "no database configured" and "record not found" — two very different conditions the caller cannot distinguish. All callers discard the return value anyway.
- **RECOMMENDATION** — Adopt a discriminated result type (`{ ok: true; data } | { ok: false; error: AppError }`) across the data layer, and drive form UI with `useActionState`.

### 12.5 Data fetching, caching, and performance

- **CONFIRMED (Medium)** — `app/dashboard/churches/[slug]/page.tsx:40–50` performs **four sequential awaits** (`getPersistedChurchMediaBySlug`, `getPersistedMembershipsByEmail`, `getPersistedMembershipsByChurchSlug`, `getPersistedClaimRequestByChurchSlug`) that have no interdependencies. They should be a single `Promise.all`. Four sequential round-trips per page load.
- **CONFIRMED (Medium)** — `app/admin/page.tsx:23–30` similarly awaits `getPersistedAdminStats`, `getPersistedClaimRequests`, `getPersistedUnclaimedChurches`, and `getPersistedListingsNeedingRefresh` sequentially. `getPersistedAdminStats` internally uses `Promise.all` for its seven counts (`admin-store.ts:621`) — showing the pattern is understood, just not applied at the page level.
- **CONFIRMED (Medium)** — `getPersistedClaimRequestByChurchSlug` (`admin-store.ts:183`) fetches **every** claim request in the database and filters in JavaScript:
  ```ts
  const claims = await getPersistedClaimRequests();  // findMany, no where, no take
  return claims.find((claim) => claim.churchSlug === churchSlug);
  ```
  This is an unbounded query used on a per-church page. It should be a `findFirst` with a `where` clause.
- **CONFIRMED (Medium)** — `getPersistedClaimRequests` (`:160`), `getPersistedAdminUsers` (`:279`), and `getPersistedSiteContent` (`:305`) are all `findMany` with **no `take` and no pagination**. `/admin/claims` renders every claim ever submitted on one page.
- **CONFIRMED (Medium)** — `getFeaturedChurches`, `getRecentlyUpdatedChurches`, `getDirectoryResults`, and `getCitiesWithCounts` run `.filter()` / `.sort()` over the full 64-record array on **every request**, with no memoization. Trivial at 64 records; linear degradation as the directory grows, and `getCitiesWithCounts` (`queries.ts:6`) is O(cities × churches).
- **CONFIRMED (Medium)** — No caching strategy beyond `export const revalidate = 3600` on `app/churches/[slug]/page.tsx:16`. No `unstable_cache`, no `React.cache`, no tag-based invalidation. `revalidatePath` is called correctly in the actions but there is nothing cached to invalidate on the mock-driven read path.
- **CONFIRMED (Medium)** — `/directory` renders all 64 `ChurchCard`s, each with a `next/image` hero. No virtualization, no pagination (BUG-14), no lazy loading beyond Next's defaults.
- **CONFIRMED (High)** — Data-URL images (SEC-09) are embedded inline in the HTML payload. A single 4 MB upload adds ~5.5 MB of base64 to **every** page that renders that church — the directory grid, city page, search results, and profile. This is the most severe performance defect available to a user action.
- **CONFIRMED (Low)** — `lib/prisma/client.ts:7` instantiates `PrismaClient` with no connection-pool configuration. On Vercel serverless this risks pool exhaustion under concurrency; `?connection_limit=1` plus an external pooler (PgBouncer / Prisma Accelerate) is the standard remedy.

### 12.6 Concurrency, transactions, and idempotency

- **CONFIRMED (Medium)** — BUG-11: multi-step writes without transactions.
- **CONFIRMED (Medium)** — `reviewPersistedClaimRequest` (`admin-store.ts:528`) performs **four** sequential writes — `claimRequest.update`, `user.upsert`, `church.update`, `churchMembership.upsert` — with **no transaction**. A failure midway leaves a claim marked `APPROVED` with no membership granted, so the applicant is told they were approved but has no access. This is the highest-value transaction gap in the codebase.
- **CONFIRMED (Medium)** — No idempotency anywhere. Double-clicking "Approve" fires `reviewClaimRequestAction` twice. The `upsert` calls make it *mostly* safe, but `grantedAt` is overwritten and no idempotency key exists. No form disables on submit except `LoginForm`.
- **CONFIRMED (Low)** — `applyFallbackChurchUpdate` (`admin-store.ts:46`) **mutates the module-level `churches` array at runtime**. In serverless this mutates one instance's memory, is invisible to other instances, and is lost on cold start. It is currently unreferenced by any write path, making it dead-but-dangerous code.

### 12.7 Dates, time zones, locale

- **CONFIRMED (Medium)** — `formatDate` (`lib/utils.ts:8`) uses `Intl.DateTimeFormat("en-US", ...)` with **no `timeZone` option**, so it renders in the *server's* time zone during SSR and the *client's* on hydration. On Vercel the server is UTC; a user in Central Time viewing a record saved at 19:00 CT sees the next day's date. This is a genuine hydration-mismatch and correctness bug.
- **CONFIRMED (Medium)** — Service times are **free-text strings** (`"9:00 AM"`, `"Sunday"`) in both `lib/types.ts:63` and `prisma/schema.prisma:114`. They cannot be sorted, compared, filtered by range, localized, or adjusted for daylight saving. `getDirectoryResults`'s time filter (`queries.ts:77`) is a naive `startTime.includes(filters.serviceTime)` substring match — searching `"9"` matches `"9:00 AM"`, `"19:00"`, and `"10:00 AM"` alike.
- **CONFIRMED (Low)** — `formatDate` will render `"Invalid Date"` rather than throwing if given a malformed string. No guard.
- **CONFIRMED (Low)** — All mock timestamps are 2026 dates. Since today is 2026-07-27, the "recently updated" section surfaces records last touched in March/April 2026 — three to four months stale — presented to users as fresh.

### 12.8 Dead code

| Item | Location | Evidence |
|---|---|---|
| `ContactForm` | `components/forms/contact-form.tsx` | Orphan (check #11); page reimplements it |
| `StatusBadge` | `components/admin/status-badge.tsx` | Orphan |
| `AppBadge` | `components/directory/app-badge.tsx` | Orphan |
| `signOut()` | `lib/auth.ts:193` | No callers, no UI (BUG-15) |
| 9 mock query functions | `lib/data/queries.ts:105–160` | Superseded by `getPersisted*` |
| `applyFallbackChurchUpdate`, `findFallbackChurch` | `admin-store.ts:37–59` | Unreferenced |
| `getChurchesWithApps`, `getChurchesWithLivestreams` | `queries.ts:23, 27` | Unreferenced |
| `types/next-auth.d.ts` | whole file | Augments an unused library |
| `next-auth`, `@auth/prisma-adapter` | `package.json` | Zero imports (check #17) |
| `admin-shell` class | 9 files | Undefined (BUG-12) |
| `backgroundImage.halo` | `tailwind.config.ts:42` | Never used |
| `Submission`, `SuggestedChange`, `UpdateLog` models | `schema.prisma` | Never written to |
| `.focus-ring` | `globals.css:64` | Defined; applied to ~8 of hundreds of interactive elements |

### 12.9 Configuration and tooling

- **CONFIRMED (Medium)** — **No Prettier.** No config file, no dependency, no `format` script. The codebase is consistent by discipline alone, and `church-card.tsx:46` already shows indentation drift.
- **CONFIRMED (Medium)** — ESLint config is `{"extends": ["next/core-web-vitals"]}` — 42 bytes. Missing: `@typescript-eslint` rules, `jsx-a11y` (which would have caught most of §10 automatically), import ordering, and unused-export detection.
- **CONFIRMED (Medium)** — `next lint` is deprecated and removed in Next.js 16 (observed in check #2). Migration to the ESLint CLI is required before the Next 16 upgrade.
- **CONFIRMED (Medium)** — No environment-variable validation. `process.env` is read directly in `lib/auth.ts`, `lib/utils.ts`, `lib/data/admin-store.ts`, and the cron route, each with its own inline fallback. A typo in a Vercel variable name fails silently into a fallback (this is the mechanism behind SEC-01 and SEC-05).
- **CONFIRMED (Low)** — `package.json` declares `next: ^15.2.0` while 16.2.12 is current; `^` ranges on every dependency mean an unpinned install can drift.
- **CONFIRMED (Low)** — `postinstall: prisma generate` runs on every install including CI, which is correct for Vercel but slows local installs.
- **CONFIRMED (Low)** — No `engines` field and no `.nvmrc`.

### 12.10 Naming and organization

- **CONFIRMED (Low)** — `/admin/churches/[id]` takes a **slug**, not an ID: `getChurchBySlug(id)` (`app/admin/churches/[id]/page.tsx:28`). The route parameter is misnamed, and every link passes `church.slug` (`app/admin/churches/page.tsx:28`).
- **CONFIRMED (Low)** — `lib/data/access.ts` holds mock *records*, while `lib/data/mock.ts` holds mock *churches*. The split is arbitrary; both are fixtures.
- **CONFIRMED (Low)** — The `getPersisted*` prefix is misleading: these functions return **mock data** whenever the database is unavailable.
- **CONFIRMED (Low)** — `lib/types.ts` mixes domain types with DTOs and has no separation from Prisma's generated types, guaranteeing drift (already visible in the `DirectoryRole` / `UserRole` mismatch).

---

## 13. Database and API Findings

### 13.1 Schema correctness

The schema is the strongest asset in the project. Correct choices worth preserving: `cuid()` primary keys; `@unique` on `City.name`, `City.slug`, `Church.slug`, `User.email`, `SiteContent.key`; `@@unique([churchId, userId])` on `ChurchMembership` (`:218`); proper enums for every status; `createdAt`/`updatedAt` on every model; deliberate cascade choices (`onDelete: Cascade` for child records, `onDelete: SetNull` for `ClaimRequest.user`).

### 13.2 Schema defects

- **CONFIRMED (High)** — **`Church.city` (String) and `Church.cityId` (relation) are redundant and can disagree.** `schema.prisma:70` and `:87`. BUG-10 proves they already diverge on any city edit. Either drop the string and read `cityRecord.name`, or make the string a maintained denormalization updated in the same transaction.
- **CONFIRMED (High)** — **No indexes are declared anywhere.** Not one `@@index`. Every foreign key used for filtering — `Church.cityId`, `ServiceTime.churchId`, `SocialLink.churchId`, `Ministry.churchId`, `SuggestedChange.churchId`, `ClaimRequest.churchId`, `ClaimRequest.userId`, `ChurchMembership.churchId`, `ChurchMembership.userId`, `UpdateLog.churchId` — will sequential-scan. Status columns used in the admin count queries (`admin-store.ts:625–628`: `suggestedChange.status`, `submission.status`, `claimRequest.status`, `churchMembership.role + status`) are likewise unindexed. Postgres auto-indexes primary keys and `@unique` columns only.
- **CONFIRMED (Medium)** — **No soft deletes.** No `deletedAt` on any model, and every relation cascades. Deleting a `City` cascade-deletes every `Church` in it, which cascade-deletes their `ServiceTime`, `SocialLink`, `Ministry`, `SuggestedChange`, `ClaimRequest`, `ChurchMembership`, and `UpdateLog` rows. A single mistaken city deletion is unrecoverable without a backup — and no backup policy is documented (SEC-18).
- **CONFIRMED (Medium)** — **`Pastor` has two competing church relations**: `churchLeadership` via `churchId` (`:110`) and `seniorForChurch` via `Church.seniorPastorId` (`:111`, `@unique`). A pastor can be a church's senior pastor *and* a leader of a different church with no constraint preventing it. `saveChurchListingRecord` only ever touches `seniorPastorId`, leaving `Pastor.churchId` permanently `NULL` for pastors it creates (`admin-store.ts:423`).
- **CONFIRMED (Medium)** — **`Church.state` is required but `City.state` also exists** — another denormalization with no consistency enforcement.
- **CONFIRMED (Medium)** — **`Submission.submittedDataJson Json` is unstructured and unvalidated.** No shape is defined or enforced. Since nothing writes to this model, no shape has ever been established.
- **CONFIRMED (Medium)** — **`SuggestedChange.reviewedBy` and `UpdateLog.performedBy` are free-text `String?`, not relations to `User`.** No referential integrity on the audit trail — the one place it matters most.
- **CONFIRMED (Medium)** — **`ServiceTime` uses `String` for `dayOfWeek`, `startTime`, `endTime`** (`:118–120`). No enum for the day, no time type. See §12.7.
- **CONFIRMED (Low)** — **`SocialLink.platform` is `String`, not an enum**, despite `lib/types.ts:1` defining a closed `SocialPlatform` union. `components/directory/social-icons.tsx:19` does `iconMap[link.platform]`, which returns `undefined` for an unrecognized platform and renders `<undefined />` — a React crash. Protected today only because mock data is well-formed.
- **CONFIRMED (Low)** — **`SiteContent.area` is `String`, not an enum**, despite the closed union in `lib/types.ts:149`.
- **CONFIRMED (Low)** — Indentation in `schema.prisma` is inconsistent at `:207–208` (`churchId`, `userId` in `ChurchMembership`) and `:232–233` (`UpdateLog`).
- **CONFIRMED (Low)** — No `@db.VarChar(n)` length constraints on any string column. `description` and `evidenceSummary` are unbounded `text`. Combined with the absent input validation (§12.3), a single request can write an arbitrarily large value.
- **CONFIRMED (Low)** — `ClaimRequest` has both `submittedAt @default(now())` and `createdAt @default(now())` — duplicate columns with identical semantics.

### 13.3 Migrations — the most urgent database finding

- **CONFIRMED (CRITICAL for operations)** — **There is no `prisma/migrations/` directory** (check #15). The schema has never been captured as a migration.

  Consequences:
  - No schema version history and no reproducible schema.
  - No way to apply changes safely to an existing production database — `prisma migrate deploy` has nothing to deploy.
  - The only path to a live schema is `prisma db push`, which is explicitly **not** for production and can silently drop columns and data when it reconciles drift.
  - Two environments cannot be proven to share a schema.
  - No rollback story whatsoever.

  `package.json` defines `prisma:migrate` as `prisma migrate dev` (development-only; it can reset the database) and defines **no** `migrate deploy` script. `DEPLOYMENT_CHECKLIST.md` does not mention migrations at all.

  **This must be resolved before any production database exists**, because generating an initial migration against a database that already has hand-pushed tables is materially harder than doing it beforehand.

### 13.4 Seed safety

- **CONFIRMED (Medium)** — `prisma/seed.ts` uses `upsert` throughout (good — idempotent) but is **unguarded**: no `NODE_ENV` check, no confirmation prompt, no target-database assertion. `npm run prisma:seed` against a `DATABASE_URL` pointing at production would overwrite live church records with mock data. Given that `.env.local` is the only local config and Vercel variables are pulled with `vercel env pull`, this misfire is plausible.
- **CONFIRMED (Medium)** — The seed writes **real church data** (SEC-13) — real names, real pastors, real contact details, real `verified: true` flags — directly to the database as though it were fixture data.
- **CONFIRMED (Low)** — `prisma/seed.ts:31` uses a deterministic synthetic ID (`pastor-${church.slug}`) as the upsert key, diverging from `cuid()` everywhere else. Workable, but it means seeded pastors are distinguishable from real ones by ID format, and a pastor renamed in the app is silently reverted on the next seed run.
- **CONFIRMED (Low)** — `prisma/seed.ts:26` uses `findUniqueOrThrow`, so a church referencing an unknown `citySlug` aborts the entire seed partway through with no transaction and no cleanup.

### 13.5 Data-loss and corruption risk register

| Risk | Mechanism | Severity |
|---|---|---|
| Featured image destroyed on failed upload | BUG-02 | **High** |
| Cascade delete of a `City` wipes all its churches and children | No soft deletes, no backup policy | **High** |
| `prisma db push` drops columns reconciling drift | No migrations (§13.3) | **High** |
| Seed overwrites production | Unguarded seed script | **High** |
| `city` / `cityId` divergence | BUG-10 | Medium |
| Partial claim approval (approved, no membership) | No transaction in `reviewPersistedClaimRequest` | Medium |
| Orphan `Pastor` rows | BUG-11 | Medium |
| Runtime mutation of mock array lost on cold start | `applyFallbackChurchUpdate` | Low (dead code) |
| Unbounded text columns | No length constraints + no input validation | Medium |

**Cross-user data exposure:** none found. There is no multi-tenancy, and church-scoped access is enforced via `churchSlugs`. The exposure risk is authentication-level (SEC-01/02/03/04), not query-level.

### 13.6 API design

The HTTP API surface is two routes; almost everything is server actions.

| Route | Method | Auth | Findings |
|---|---|---|---|
| `/api/auth/login` | POST | none (it *is* auth) | No rate limit (SEC-07); no schema validation; no CSRF token (SEC-17) |
| `/api/auth/[...nextauth]` | GET/POST | none | **Vestigial** — redirects everything to `/login?error=invalid` |
| `/api/cron/weekly-scan` | GET | Bearer, **skipped if unset** | SEC-05; returns all church data |

- **CONFIRMED (Medium)** — **No API versioning** and no stable contract. Every consumer is internal today, but the cron endpoint is externally invoked by Vercel.
- **CONFIRMED (Medium)** — **Inconsistent error format.** `/api/auth/login` returns `{ok: false, error: "invalid_credentials"}`; the cron route returns `{error: "Unauthorized"}`. Different shapes, no code taxonomy, no `requestId`. Server actions return nothing at all and communicate through redirect query parameters (`?saved=media`) — a third convention.
- **CONFIRMED (Medium)** — **Status codes are thin.** Only 200 and 401 are ever returned deliberately. No 400 for malformed input (`/api/auth/login` returns 401 for a malformed body because `authenticateWithCredentials` returns `null`), no 403, no 429, no 422.
- **CONFIRMED (Medium)** — **No idempotency keys**, no retry semantics, no `Retry-After`.
- **CONFIRMED (Medium)** — **State-changing operations use redirect-with-query-param as the response channel.** `?saved=media`, `?saved=needs-db`, `?submitted=1`. This is why BUG-03 exists: the redirect is issued regardless of outcome. It also makes success state survive a page refresh and appear again spuriously.
- **CONFIRMED (Low)** — `/api/auth/[...nextauth]` should be deleted. It exists only to absorb stale NextAuth requests and silently converts any such request into a generic login error.
- **CONFIRMED (Low)** — No webhooks exist, so there is no signature-verification or replay-protection surface. Recorded for completeness; if email delivery or payments are added, this becomes relevant.
- **CONFIRMED (Low)** — No health-check or readiness endpoint (§16).

---

## 14. Performance and Reliability Findings

### 14.1 Measured baseline

From the production build (check #3):

- Shared First Load JS: **102 kB** — lean and healthy.
- Largest route: `/admin/churches/[id]` and `/dashboard/churches/[slug]` at **122 kB** (the `ChurchMediaForm` client component).
- 106 pages generated in ~10.6s.
- 64 church pages and 20 city pages pre-rendered via `generateStaticParams`.

The JavaScript baseline is genuinely good — a direct benefit of the Server-Components-first approach.

### 14.2 Performance findings

| # | Finding | Severity | Evidence |
|---|---|---|---|
| P-01 | Data-URL images inline megabytes into HTML on every page rendering that church | **High** | SEC-09; `app/actions.ts:123` |
| P-02 | `unoptimized` bypasses all Next image optimization for uploaded images | High | `church-card.tsx:37`, `churches/[slug]/page.tsx:93`, `church-media-form.tsx:55` |
| P-03 | `/directory` renders all 64 cards with 64 hero images, unpaginated | High | `app/directory/page.tsx:41`; BUG-14 |
| P-04 | Sequential awaits on admin and dashboard pages (4 round-trips each) | Medium | `admin/page.tsx:23–30`; `dashboard/churches/[slug]/page.tsx:40–50` |
| P-05 | `getPersistedClaimRequestByChurchSlug` fetches all claims then filters in JS | Medium | `admin-store.ts:183` |
| P-06 | Unbounded `findMany` on claims, users, site content | Medium | `admin-store.ts:163, 282, 308` |
| P-07 | No database indexes | Medium→High at scale | §13.2 |
| P-08 | No `sizes` prop on any `fill` image → browser downloads largest candidate | Medium | `church-card.tsx:37`, `churches/[slug]/page.tsx:93` and 2 more |
| P-09 | Fonts declared but never loaded; if fixed naively, adds render-blocking requests | Medium | BUG-13 |
| P-10 | `backdrop-filter: blur()` on `.section-wash` / `.section-strong`, used on most pages | Low–Medium | `globals.css:47, 55` — GPU cost on low-end mobile |
| P-11 | Map `<iframe>` loads Google Maps on every church page (`loading="lazy"` helps) | Low | `map-section.tsx:25` |
| P-12 | No connection pooling configuration for serverless | Medium | `lib/prisma/client.ts:7` |
| P-13 | In-memory filter/sort on every request, no memoization | Low now | `queries.ts:55, 6` |
| P-14 | No bundle analysis configured | — | check: `@next/bundle-analyzer` absent |

### 14.3 Reliability findings

- **CONFIRMED (High)** — **A database outage is invisible.** `withFallback` renders mock data instead (BUG-07). There is no circuit breaker, no degraded-mode banner, and no alert.
- **CONFIRMED (High)** — **No health check endpoint.** Nothing to probe for uptime monitoring, and no way to distinguish "app up, database down" from "all healthy".
- **CONFIRMED (High)** — **No error tracking.** No Sentry, no Vercel error monitoring configuration. Errors reach `console.error` and are discoverable only by manually reading function logs.
- **CONFIRMED (High)** — **No structured logging.** Every log is a bare `console.error` with a free-text message (`"DB fallback activated"`) and no request ID, user ID, route, or severity level. Correlating a user report to a log line is impossible.
- **CONFIRMED (Medium)** — **No retry logic** on any database call. A single transient connection blip falls through to mock data.
- **CONFIRMED (Medium)** — **No timeouts.** No Prisma query timeout, no fetch timeout. Once `runWeeklyScan` performs real HTTP requests, a single slow church website can hang the cron function to its platform limit.
- **CONFIRMED (Medium)** — **No graceful degradation signalling to users.** The `needs-db` banner (`dashboard/churches/[slug]/page.tsx:77`) is the only place the app admits a capability is unavailable, and it checks only whether the variable is *set* — not whether the database is *reachable*.
- **CONFIRMED (Medium)** — **Cron has no failure handling.** `app/api/cron/weekly-scan/route.ts:12` awaits `runWeeklyScan()` with no try/catch. A throw returns a 500 to Vercel with no alert, no retry, and no dead-letter record. Nobody learns the weekly scan stopped running.
- **CONFIRMED (Low)** — `revalidate = 3600` on church pages means an approved edit takes up to an hour to appear even after the read path is migrated, unless `revalidatePath` fires — which it does in the actions, so this is mostly covered.

---

## 15. Testing Gaps

**There is no test infrastructure of any kind.** No test runner, no test files, no fixtures, no CI. This is the largest single gap by risk-adjusted effort, because every fix proposed in this report is unverifiable without it.

### 15.1 Risk-ranked coverage requirements

Coverage should be driven by business risk, not percentage. Ranked by (likelihood × impact):

| Rank | Area | Why it ranks here | Test types |
|---|---|---|---|
| 1 | **Authentication** | Three Critical findings (SEC-01/02/03) | Unit + integration + E2E |
| 2 | **Authorization** | Role escalation, cookie-trusted privileges (SEC-04, SEC-12) | Unit + integration |
| 3 | **Church edit → public visibility** | BUG-01, the core product promise | Integration + E2E |
| 4 | **File upload** | BUG-02 data loss + SEC-09 | Unit + integration |
| 5 | **Claim workflow end-to-end** | BUG-03 + no transaction | Integration + E2E |
| 6 | **Public form submission** | BUG-04, BUG-05, BUG-06 | Component + E2E |
| 7 | **Input validation at every write** | §12.3 — unchecked casts reach Prisma | Unit |
| 8 | **Redirect safety** | BUG-08 open redirect | Unit |
| 9 | **Database error handling** | BUG-07 fake-data-on-outage | Integration |
| 10 | **Accessibility** | §10 — five High/Critical violations | Automated axe + manual |
| 11 | **Search and filter correctness** | Core public journey | Unit |
| 12 | **Mobile layout** | 768–1279px nav gap | Visual regression + manual |
| 13 | **Migration safety** | §13.3 | CI check |
| 14 | **Cron endpoint** | SEC-05 | Integration |

### 15.2 Recommended test pyramid

**Unit (Vitest) — target ~120 tests**
- `lib/auth.ts` — signature verification, tampered payload rejection, expiry (once added), missing-secret failure, `timingSafeEqual` behavior on differing lengths
- `lib/auth-guards.ts` — every role × every guard, as a table-driven matrix
- `lib/utils.ts` — `externalUrl` (mailto/tel/protocol-relative/bare host), `normalizeBaseUrl` fallbacks, `absoluteUrl` env precedence, `isInlineImageUrl`, `formatDate` time-zone determinism
- `app/actions.ts` — `normalizedReturnPath` **must reject** `//evil.com`, `/\evil.com`, `http://evil.com`
- `lib/validation/forms.ts` — boundary cases on every schema
- `lib/data/queries.ts` — `getDirectoryResults` across all 12 filter dimensions plus combinations

**Integration (Vitest + Testcontainers Postgres) — target ~50 tests**
- All of `lib/data/admin-store.ts` — currently **703 lines with zero coverage from any check performed**
- `withFallback` — assert that a DB error surfaces rather than silently faking (after the fix)
- `reviewPersistedClaimRequest` — full approval path, and partial-failure rollback once transactional
- `saveChurchListingRecord` — pastor create/update branches, `cityId` consistency
- `saveChurchMediaRecord` — assert a failed upload **never** nulls an existing image
- Seed idempotency

**Component (Vitest + Testing Library) — target ~40 tests**
- Every form: labels present, `required` announced, errors associated via `aria-describedby`
- `LoginForm` pending state, error `role="alert"`
- `ChurchCard` with missing optional fields (no website, no pastor, no service times)
- `EmptyState`, `Pagination` (after it becomes functional)

**API (Vitest) — target ~15 tests**
- `/api/auth/login`: valid, invalid, malformed body, missing fields, rate limited (429), cookie flags asserted (`httpOnly`, `sameSite`, `secure`)
- `/api/cron/weekly-scan`: no secret configured → **401**, wrong secret → 401, correct secret → 200

**E2E (Playwright) — target ~15 journeys**
- Visitor: search → filter → church profile → external link
- Visitor: submit listing → confirmation → appears in admin queue
- Visitor: claim listing → confirmation → appears in admin queue
- Church owner: sign in → reach their listing from `/dashboard` → edit → **verify change on the public page**
- Church owner: upload oversize image → error shown → **existing image intact**
- Admin: sign in → approve claim → membership granted → applicant can sign in
- Admin: attempt to reach `/admin` as `CHURCH_OWNER` → redirected
- Unauthenticated: `/admin`, `/dashboard`, `/dashboard/churches/x` → redirected to `/login`
- Sign out → protected route redirects
- Validation error on every public form → **inline message, input preserved, no crash**
- Mobile viewport (375px) and tablet (768px, 1024px): navigation reachable

**Accessibility**
- `@axe-core/playwright` on every route in the E2E suite, failing the build on violations
- `eslint-plugin-jsx-a11y` in the lint config as a fast pre-commit gate
- Manual: keyboard-only walkthrough, VoiceOver/NVDA pass, 200% zoom — as `ACCESSIBILITY_NOTES.md` already correctly prescribes

**Security regression tests**
- Assert no hardcoded secret string exists in `lib/auth.ts`
- Assert `mockCredentials` no longer exists
- Assert a forged cookie signed with the old fallback secret is rejected
- Assert `//evil.com` is rejected as a return path
- Assert JSON-LD output escapes `<`, `>`, `&`
- `npm audit --audit-level=high` as a CI gate

---

## 16. DevOps and Deployment Findings

### 16.1 Current state

| Concern | State |
|---|---|
| Hosting | Vercel (`.vercel/project.json` present, correctly gitignored) |
| CI/CD | **None.** No `.github/workflows`, no pipeline of any kind |
| Quality gates | **None.** Nothing prevents a broken commit from deploying |
| Environments | Production only. No staging or preview environment documented |
| Migrations | **None.** No migrations directory, no `migrate deploy` script (§13.3) |
| Rollback | Vercel's deployment rollback only. **No database rollback story** |
| Feature flags | None |
| Health checks | **None** |
| Monitoring / alerting | **None** |
| Error tracking | **None** |
| Structured logging | **None** — bare `console.error` |
| Backups | **Not documented.** Whatever the DB provider defaults to |
| Recovery testing | Never performed |
| Secret management | Vercel environment variables; **no validation that they are set** (SEC-01, SEC-05) |
| Release checklist | `DEPLOYMENT_CHECKLIST.md` exists — see §16.3 |

### 16.2 Findings

- **CONFIRMED (Critical for operations)** — **No CI.** Typecheck, lint, build, and audit all pass today, but nothing enforces that. Any commit can break `main` and auto-deploy to production via Vercel's Git integration.
- **CONFIRMED (High)** — **No environment separation.** `DEPLOYMENT_CHECKLIST.md` documents setting variables for `Production` only. Testing a schema change or an auth change has nowhere to happen but production.
- **CONFIRMED (High)** — **No migration strategy** (§13.3). This is the highest-consequence DevOps gap because it is hardest to fix retroactively.
- **CONFIRMED (High)** — **No rollback plan for data.** Code rollback via Vercel does not undo a schema change or a bad data write.
- **CONFIRMED (High)** — **No monitoring or alerting.** If the site returns 500s, if the database is down (rendered as fake data — BUG-07), or if the weekly cron stops firing, nobody is notified. Discovery depends on a user complaint through a contact form that does not work (BUG-04).
- **CONFIRMED (Medium)** — **Vercel cron authentication is optional-by-default** (SEC-05). Vercel sends an `Authorization: Bearer <CRON_SECRET>` header only when the variable is set; the handler skips the check when it is not.
- **CONFIRMED (Medium)** — **No `preview` deployment protection.** Preview deployments would be publicly reachable with whatever environment variables they inherit — a concern given SEC-02.
- **CONFIRMED (Medium)** — **Source maps.** Next.js does not emit client source maps in production by default, and `next.config.mjs` does not enable them. No exposure found — recorded as verified-clean.
- **CONFIRMED (Medium)** — **No `engines` / `.nvmrc`**; Node version is whatever Vercel defaults to, and can change under the project without notice.
- **CONFIRMED (Low)** — `.gitignore` is correct and complete for secrets (`.env`, `.env.local`, `.vercel`). **Verified: no secrets are committed** (check #10). This is a real strength.
- **CONFIRMED (Low)** — `.next/` (a build artifact) is present in the working tree and correctly gitignored, but contributes to the 944 MB directory size.

### 16.3 `DEPLOYMENT_CHECKLIST.md` review

The checklist is a genuine asset — it is specific, ordered, and names the right variables. Corrections needed:

- **`CRON_SECRET` is listed as "Optional but Recommended."** Given SEC-05 (the check is skipped entirely when unset), it must move to **Required**.
- **`DATABASE_URL` is listed as "Optional."** Given that every write path no-ops without it (`hasDatabaseUrl()`), the product is non-functional without it. It must move to **Required**.
- **`ADMIN_PASSWORD` guidance is misleading.** "Do not use the demo default in production" implies setting it closes the demo path. SEC-02 proves it does not.
- **No migration step.** The checklist never mentions applying schema changes.
- **No verification step for `AUTH_SECRET` actually being set** — the exact failure mode of SEC-01.
- **The "Expected Behavior After Deploy" section** promises that the public directory and church pages "continue working" — true — but does not note that admin edits will not appear publicly (BUG-01).

### 16.4 Recommended pipeline

```
PR opened
  ├─ typecheck            (tsc --noEmit)
  ├─ lint                 (eslint, incl. jsx-a11y)
  ├─ format check         (prettier --check)
  ├─ unit + component     (vitest)
  ├─ integration          (vitest + Testcontainers Postgres)
  ├─ build                (next build)
  ├─ npm audit            (--audit-level=high)
  ├─ migration check      (prisma migrate diff --exit-code)
  └─ Vercel preview deploy
        └─ E2E + axe      (playwright against the preview URL)

merge to main
  ├─ prisma migrate deploy   (against staging)
  ├─ smoke tests             (against staging)
  ├─ manual approval gate
  ├─ prisma migrate deploy   (against production)
  └─ production deploy + post-deploy health check
```

---

## 17. Documentation Gaps

### 17.1 What exists and its quality

| Document | Assessment |
|---|---|
| `README.md` | Good structure; accurate stack summary; correct local-dev instructions; honest deployment notes |
| `CODEBASE_OVERVIEW.md` | **The best document here.** Unusually honest about mock-vs-real state and correct about the next engineering steps |
| `DEPLOYMENT_CHECKLIST.md` | Specific and actionable; several corrections needed (§16.3) |
| `ACCESSIBILITY_NOTES.md` | Correctly scoped, correctly disclaims legal advice, correctly lists remaining manual work; overstates what is implemented |
| `FAITH_CHURCH_RESEARCH_NOTES.md` | Excellent provenance discipline — sources cited per claim |
| `FAITHSTREET_IMPORT_NOTES.md` | Excellent; explicitly flags the unresolved copyright question |

The provenance discipline in the two research-notes files is a genuine strength and should be formalized into a standing sourcing policy.

### 17.2 Documentation defects

- **CONFIRMED (Medium)** — `CODEBASE_OVERVIEW.md` uses absolute paths from a different machine (`/Users/tes/champaign-county-church-directory/...`). **Every file link in the document is broken** in this checkout.
- **CONFIRMED (Medium)** — `CODEBASE_OVERVIEW.md` states the build fails because `next` is not installed. **Stale** — the build succeeds (check #3).
- **CONFIRMED (Medium)** — `CODEBASE_OVERVIEW.md` describes auth as NextAuth with a hardcoded password. **Stale** — NextAuth was replaced in commit `8c68f45`.
- **CONFIRMED (Medium)** — `README.md` lists `AUTH_SECRET`, `NEXTAUTH_SECRET`, `AUTH_URL`, and `NEXTAUTH_URL` without noting that the `NEXTAUTH_*` pair is now purely a compatibility alias for an unused library.
- **CONFIRMED (Medium)** — `README.md` says "NextAuth scaffolding" under Stack. Misleading — the dependency is dead (check #17).
- **CONFIRMED (High)** — `ACCESSIBILITY_NOTES.md` implies a WCAG 2.1 AA alignment posture while A11Y-03 (no labels on ~30 inputs) and A11Y-05 (no error identification) are project-wide failures. Given the document's Illinois IITAA / ADA Title II framing, this overstatement carries real risk and should be corrected immediately — it is a documentation edit, not a code change, and can ship today.

### 17.3 Missing documentation

| Missing | Why it matters |
|---|---|
| **`ARCHITECTURE.md`** | The mock/Prisma dual-source design is the single most confusing thing about this codebase and is documented only in prose in `CODEBASE_OVERVIEW.md` |
| **`CONTRIBUTING.md`** | No branch strategy, commit convention, review process, or local-setup troubleshooting |
| **`SECURITY.md`** | No vulnerability disclosure contact — required for any public repo, and this one has Critical findings |
| **Privacy policy** | **Legally significant** — the site publishes real personal and organizational data (SEC-13) with no policy, no consent basis, and no removal process |
| **Terms of use** | Nothing governs listing accuracy, verification claims, or takedown |
| **Data sourcing policy** | The research-notes discipline should be a standing rule, and the FaithStreet copyright question needs a decision |
| **"What Verified means"** | The badge is a trust signal with no published definition; SEC-13 shows it is currently developer-asserted |
| **API documentation** | Two endpoints, undocumented |
| **Runbook** | No incident response, no rollback procedure, no on-call story |
| **Database ERD** | The schema has 12 models with non-obvious relations (dual `Pastor` links, dual city representation) |
| **`.env.example` comments** | Only one comment line; nothing explains which variables are required vs. optional, what breaks without each, or how to generate `AUTH_SECRET` |
| **Testing guide** | Nothing exists to document yet — but must accompany Phase 7 |
| **Changelog** | No release history |

---

## 18. Prioritized Remediation Backlog

**Priority definitions**
- **P0** — Active security exposure, data-loss risk, or application-blocking failure
- **P1** — Serious security, broken core workflow, or major reliability problem
- **P2** — Important usability, maintainability, accessibility, or performance issue
- **P3** — Enhancement, cleanup, or lower-risk refinement

**Effort:** S ≤ 0.5 day · M ≈ 1–3 days · L ≈ 4–8 days · XL > 8 days

| ID | Category | Finding | Evidence | User/Business Impact | Severity | Effort | Dependency | Recommended Fix | Verification | Phase |
|---|---|---|---|---|---|---|---|---|---|---|
| R-01 | Security | Hardcoded production session secret | `lib/auth.ts:6-11` | Anyone reading the public repo forges an ADMIN cookie; total compromise | P0 | S | — | Delete both fallbacks; throw at module load if unset | Boot with no `AUTH_SECRET` → process exits non-zero; unit test asserts no literal secret | 0 |
| R-02 | Security | Hardcoded ADMIN credentials, cannot be disabled | `lib/data/access.ts:44-69`, `lib/auth.ts:142` | `admin/admin` grants full admin regardless of env config | P0 | S | R-03 for church logins | Delete `mockCredentials`; delete demo panel `app/login/page.tsx:68-73` | Integration test: demo creds return 401 | 0 |
| R-03 | Security | No password storage; shared `"church"` password | `schema.prisma:176`, `lib/auth.ts:156` | Any published church email + `"church"` = listing takeover | P0 | L | R-15 (migrations), email delivery | Magic-link auth; add `Session`/`VerificationToken` models | E2E: request link → sign in; old password rejected | 2 |
| R-04 | Data loss | Failed upload silently deletes existing image | `app/actions.ts:108-124,170` | Irreversible loss, reported as success | P0 | M | — | Return typed errors; never write `null` on failure | Integration: oversize upload → error shown, image intact | 1 |
| R-05 | Correctness | Admin/church edits never appear publicly | `app/churches/[slug]/page.tsx:50` vs `admin-store.ts:376` | Core product promise unfulfilled; all editorial work wasted | P0 | XL | R-15 | Migrate read path from `mock.ts` to Prisma | E2E: edit → public page shows new value | 1 |
| R-06 | Reliability | DB errors render as fabricated data | `admin-store.ts:61` | Outages invisible; decisions on fake numbers | P0 | M | — | Return typed result; surface failure; add degraded banner | Integration: DB down → error state, not mock data | 1 |
| R-07 | Security | Open redirect in 3 save actions | `app/actions.ts:126` | Phishing pivot from authenticated action | P0 | S | — | Reject `//` and `/\` prefixes; allowlist route shapes | Unit: `//evil.com` rejected | 0 |
| R-08 | Security | Cron endpoint public when secret unset | `api/cron/weekly-scan/route.ts:8` | Unauthenticated data enumeration; future SSRF amplifier | P0 | S | — | Fail closed; `timingSafeEqual` | API test: unset secret → 401 | 0 |
| R-09 | Security | Wildcard image hosts → SSRF / open proxy | `next.config.mjs:7` | Arbitrary fetch via `/_next/image`; quota cost | P0 | S | — | Explicit hostname allowlist | Request to non-allowlisted host → 400 | 0 |
| R-10 | Security | Vulnerable dependencies (2 critical, 4 high) | `npm audit` (check #4) | Next server-function disclosure; `sharp` libvips CVEs | P0 | S | — | `npm audit fix`; re-run full verification | `npm audit --audit-level=high` clean; build passes | 0 |
| R-11 | Privacy | Real church email as a working credential | `lib/data/access.ts:39` | Real org's address is a public-repo credential | P0 | S | R-02 | Remove with `mockCredentials` | Grep: no real addresses in repo | 0 |
| R-12 | Security | No session expiry / revocation; privileges in cookie | `lib/auth.ts:31-89` | Captured token valid forever; revocation is cosmetic | P1 | L | R-03 | Add `exp`/`iat`/`jti`; server session store; re-resolve role per request | Expired token rejected; revoked membership denied immediately | 2 |
| R-13 | Security | No rate limiting anywhere | no middleware (check #13) | Unlimited credential brute force; form spam | P1 | M | — | `middleware.ts` + Upstash/Vercel KV; lockout | API test: N+1 attempts → 429 | 2 |
| R-14 | Security | No security headers / CSP | `next.config.mjs` (check #14) | No XSS defense-in-depth; admin clickjackable | P1 | M | — | `headers()` with CSP nonce, HSTS, frame-ancestors, nosniff | Header assertions in E2E | 2 |
| R-15 | Database | No migrations directory | `prisma/` (check #15) | No schema history, no safe deploy, no rollback | P0 | M | — | Generate initial migration; add `migrate deploy` script | `prisma migrate diff --exit-code` clean in CI | 0 |
| R-16 | UX | Contact form has no action | `app/contact/page.tsx:30` | Feedback channel severed; stated SLA impossible | P1 | S | R-18 | Wire to action; use existing `ContactForm` | E2E: submit → persisted + confirmed | 3 |
| R-17 | UX | Submit-listing validates then discards | `app/actions.ts:26` | Directory cannot grow via its own intake | P1 | M | R-15 | Persist to `Submission`; confirm; notify | E2E: submit → appears in admin queue | 3 |
| R-18 | UX | No error boundaries; Zod throws crash the page | check #12, `lib/validation/forms.ts` | Every typo = total app failure, input lost | P1 | M | — | `safeParse` + `useActionState` + `error.tsx`/`global-error.tsx`/`not-found.tsx` | E2E: invalid input → inline error, input preserved | 1 |
| R-19 | UX | Claim reports success when nothing persisted | `app/actions.ts:40-63` | Onboarding funnel loses applicants silently | P1 | M | R-15 | Branch on result; require slug or confirm fuzzy match | E2E: no-DB path → honest message | 1 |
| R-20 | A11y | ~30 inputs have no accessible label | `submit-listing-form.tsx:9-18`, `claim-form.tsx:17-40`, +4 files | Screen readers announce "edit text, blank" | P1 | M | — | `Field` primitive; visible labels everywhere | axe: zero label violations | 5 |
| R-21 | A11y | No error identification/association | all forms | Blind users cannot recover from validation errors | P1 | M | R-18, R-20 | `aria-invalid` + `aria-describedby` + `role="alert"` | axe + manual SR pass | 5 |
| R-22 | A11y | Six pages have no `<h1>` | check #18 | No document title for SR heading navigation | P1 | S | — | `as` prop on `SectionHeading`; pass `as="h1"` | axe: heading-order clean on all routes | 5 |
| R-23 | A11y | Skip link never visible | `globals.css:34-40` | Keyboard bypass unusable; invisible click target | P1 | S | — | `sr-only` / `focus:not-sr-only` | Manual keyboard test | 5 |
| R-24 | Responsive | Nav links absent 768–1279px | `header.tsx:27,35,50` | Site unnavigable on tablets and small laptops | P1 | S | — | Align breakpoints to a single `lg` | Manual at 768/1024/1280 | 5 |
| R-25 | UX | `/dashboard` is fake data with no route to real listings | `app/dashboard/page.tsx` | Church owner cannot reach what they signed in for | P1 | M | R-05 | Replace with real membership list | E2E: sign in → click church → workspace | 3 |
| R-26 | UX | No sign-out UI | `lib/auth.ts:193` (no callers) | Session persists 7 days on shared computers | P1 | S | — | Sign-out control in header + sidebars | E2E: sign out → protected route redirects | 3 |
| R-27 | Reliability | No audit log; `UpdateLog` never written | `admin-store.ts:606` | No accountability for any mutation | P1 | M | R-15 | Write `UpdateLog` on every write; read it in admin | Integration: each mutation creates a row | 6 |
| R-28 | Data integrity | `city` updated without `cityId` | `admin-store.ts:439` | Referential corruption, surfaces after migration | P1 | S | R-05 | Resolve/create `City`; update both in one transaction | Integration: city change updates both | 1 |
| R-29 | Data integrity | Claim approval is 4 writes, no transaction | `admin-store.ts:528-601` | "Approved" with no access granted | P1 | S | — | Wrap in `prisma.$transaction` | Integration: forced mid-failure → full rollback | 1 |
| R-30 | Security | Unsafe upload validation; data-URL storage | `app/actions.ts:108-124` | Stored-XSS candidate; DB bloat; megabyte pages | P1 | L | — | Magic-byte check, `sharp` re-encode, strip EXIF, reject SVG, store in Blob | Integration: forged MIME rejected; SVG rejected | 2 |
| R-31 | Security | JSON-LD injection | `churches/[slug]/page.tsx:89` | Becomes live stored XSS after R-05 | P1 | S | — | Escape `<`/`>`/`&`; CSP nonce | Unit: payload rendered inert | 1 |
| R-32 | Validation | 5 write paths have no schema validation | `app/actions.ts:66,86,151,185,221` | Unchecked casts reach Prisma → unhandled 500s | P1 | M | — | Zod schema on every action | Unit: invalid enum → 400, not 500 | 1 |
| R-33 | Security | REVIEWER/SUPPORT ≡ ADMIN | `auth-guards.ts:18`, `actions.ts:138` | No least privilege; support can rewrite the homepage | P2 | M | R-12 | Permission matrix in one module; delete duplicate guard | Role × route matrix test | 2 |
| R-34 | Perf | No database indexes | `schema.prisma` (none declared) | Sequential scans on every FK and status filter | P2 | S | R-15 | `@@index` on all FKs + status columns | `EXPLAIN` shows index usage | 6 |
| R-35 | Perf | Sequential awaits on admin/dashboard | `admin/page.tsx:23-30` | 4 serial round-trips per page | P2 | S | — | `Promise.all` | Measured TTFB improvement | 6 |
| R-36 | Perf | Unbounded queries; fetch-all-then-filter | `admin-store.ts:183,163,282,308` | Degrades linearly; `/admin/claims` renders everything | P2 | M | — | `where` clauses, `take`, real pagination | Query count/row assertions | 6 |
| R-37 | UX | Pagination is decorative | `components/ui/pagination.tsx` | Broken affordance; 64 results at once | P2 | M | R-05 | Real cursor/offset pagination | E2E: page 2 shows different results | 6 |
| R-38 | UX | Review + submissions queues have no actions | `admin/review/page.tsx:21`, `admin/submissions/page.tsx` | Review workflow non-functional | P2 | L | R-15, R-17 | Approve/reject writing to `SuggestedChange`/`Submission` | E2E: approve → status changes | 3 |
| R-39 | UX | `verified`/`claimed` cannot be un-set | `app/actions.ts:239` | Cannot correct a wrong trust badge | P2 | S | — | Accept boolean; toggle UI | E2E: verify then un-verify | 3 |
| R-40 | UX | Site content editor writes to unread table | `actions.ts:86` vs no readers | Advertised feature does nothing | P2 | M | R-05 | Read `SiteContent` in public pages | E2E: edit hero → homepage changes | 3 |
| R-41 | UX | "Request review"/"Invite editor" link to `/claim` | `dashboard/churches/[slug]/page.tsx:121,124` | Advertised capability is fiction | P2 | M | — | Build invite flow, or remove the claims | E2E or removal verified | 3 |
| R-42 | UX | Silent no-op returns on 5 actions | `app/actions.ts:71,92,154,188,225` | Failure indistinguishable from success | P2 | S | R-18 | Return typed errors; surface them | Component tests | 1 |
| R-43 | Correctness | `formatDate` has no `timeZone` | `lib/utils.ts:8` | Hydration mismatch; wrong date for CT users | P2 | S | — | Pin `America/Chicago` or format server-side only | Unit across TZs | 6 |
| R-44 | Data model | `EDITOR` role is a dead end | `schema.prisma:180` vs `types.ts:19` | User can sign in, reach nothing | P2 | S | — | Reconcile enums; single source of truth | Unit: every `UserRole` maps to a reachable page | 2 |
| R-45 | Design | No design tokens; `cssVariables: false` | `components.json` | No retheme, no dark mode, no central contrast fix | P2 | M | — | Semantic tokens + radius scale | Visual regression baseline | 4 |
| R-46 | Design | Fonts declared but never loaded | `globals.css:5` (check #16) | Intended typography has never rendered | P2 | S | R-45 | `next/font/google`, `display: "swap"` | Visual review + CLS check | 4 |
| R-47 | Design | `admin-shell` undefined on 9 pages | check #19 | Unfinished admin treatment | P3 | S | R-45 | Define it or remove it | Visual review | 4 |
| R-48 | A11y | Icon-only social links lack context | `social-icons.tsx:27` | "facebook" announced 64× with no owner | P2 | S | — | Include church name in `aria-label` | axe + manual SR | 5 |
| R-49 | A11y | Mobile menu not a proper disclosure | `header.tsx:50` | No Escape, no focus trap, no `aria-expanded` | P2 | M | R-45 | Real disclosure component | Keyboard test | 5 |
| R-50 | A11y | Contrast risks on badges and error text | §10.2 A11Y-10 | Error messages may be unreadable | P2 | M | R-45 | Measure and correct to ≥4.5:1 | Contrast checker on every pair | 5 |
| R-51 | A11y | Touch targets <24px | `filter-sidebar.tsx:25-41` | WCAG 2.2 AA (2.5.8) failure | P2 | S | R-45 | Size checkboxes ≥24×24 | Measured in DevTools | 5 |
| R-52 | Testing | No test infrastructure at all | no test files | Every fix in this report is unverifiable | P1 | XL | — | Vitest + Testing Library + Playwright + Testcontainers | Suite runs green in CI | 7 |
| R-53 | DevOps | No CI | no `.github/` | Broken commits auto-deploy | P1 | M | R-52 | Pipeline per §16.4 | PR blocked on failure | 7 |
| R-54 | DevOps | No monitoring, error tracking, or health check | §16.1 | Outages discovered only by user complaint | P1 | M | — | Sentry + `/api/health` + uptime alerts | Induced error appears in Sentry | 7 |
| R-55 | DevOps | No structured logging | `console.error` ×5 | Cannot correlate a report to a log line | P2 | M | R-54 | `pino` with redaction + request IDs | Log shape assertions | 7 |
| R-56 | DevOps | No staging environment | §16.2 | Schema/auth changes tested in production | P1 | M | R-15 | Staging project + preview protection | Deploy to staging first | 7 |
| R-57 | Tooling | No Prettier | no config | Style drift already visible | P2 | S | — | Prettier + `format:check` in CI | `--check` passes | 8 |
| R-58 | Tooling | ESLint is 42 bytes | `.eslintrc.json` | `jsx-a11y` would auto-catch most of §10 | P2 | S | R-57 | Add `@typescript-eslint`, `jsx-a11y`, import order | Lint passes with expanded rules | 8 |
| R-59 | Tooling | No env-var validation | `process.env` read in 4 modules | Typo fails silently into a fallback | P1 | S | R-01 | Zod-validated `lib/env.ts`, imported at boot | Missing var → startup failure | 0 |
| R-60 | Tooling | `next lint` deprecated, removed in Next 16 | check #2 | Blocks the Next 16 upgrade | P3 | S | R-58 | Migrate to ESLint CLI | Lint runs via CLI | 8 |
| R-61 | Privacy | Real personal/org data + unearned "Verified" | `mock.ts`, research notes | Published without consent; no removal path | P1 | M | R-16, product decision | Separate fixtures from real data; define "Verified"; publish privacy policy + removal process | Policy published; process tested | 8 |
| R-62 | Docs | `CODEBASE_OVERVIEW.md` broken links + stale claims | §17.2 | Every file link broken; auth section wrong | P2 | S | — | Relative paths; refresh auth and build sections | Links resolve | 8 |
| R-63 | Docs | `ACCESSIBILITY_NOTES.md` overstates conformance | §17.2 | Compliance risk given IITAA/ADA framing | P1 | S | — | Correct today; restate as in-progress | Reviewed | 0 |
| R-64 | Docs | Checklist mismarks required vars | §16.3 | Operators leave `CRON_SECRET`/`DATABASE_URL` unset | P1 | S | R-01, R-08 | Move to Required; add migration + secret-verification steps | Followed on a clean deploy | 0 |
| R-65 | Cleanup | Dead code: 3 orphan components, 9 dead queries, 2 dead deps, `types/next-auth.d.ts` | §12.8 | Misleads maintainers; ships unused bytes | P3 | M | R-05 | Delete; add `knip` to CI | `knip` clean | 8 |
| R-66 | Cleanup | `/admin/churches/[id]` takes a slug | `admin/churches/[id]/page.tsx:28` | Misleading route contract | P3 | S | — | Rename to `[slug]` | Routes resolve | 8 |
| R-67 | Assets | `public/` empty — no favicon, no OG image | check #14 | Unbranded tab; bare social shares | P3 | S | R-45 | Favicon set, OG image, manifest | Share preview renders | 4 |
| R-68 | Perf | No `sizes` on `fill` images | 4 files | Browser downloads largest candidate | P3 | S | — | Add `sizes` | Lighthouse improvement | 6 |
| R-69 | Data model | Free-text service times cannot be sorted/filtered | `schema.prisma:114` | Time filter is a naive substring match | P3 | L | R-15 | Structured day enum + time columns | Range filter test | 6 |
| R-70 | Security | No MFA / email verification / lockout | §11 SEC-16 | Weak account security posture | P3 | L | R-03, R-13 | TOTP for admins; verify email on claim | E2E enrollment | 8 |

**Quick wins** — high value, ≤0.5 day each, no dependencies: **R-01, R-02, R-07, R-08, R-09, R-10, R-11, R-22, R-23, R-24, R-26, R-59, R-63, R-64**. Twelve of these are P0/P1, and together they close four of the five most severe security findings.

**Product-owner decisions required** — engineering cannot resolve these alone:
1. **R-61** — What does "Verified" mean, and may the directory publish real church data without opt-in? Also: the unresolved FaithStreet sourcing question from `FAITHSTREET_IMPORT_NOTES.md`.
2. **R-03** — Magic-link vs. password authentication for church users.
3. **R-41** — Build the editor-invite feature, or remove the claim from the UI and login page copy?
4. **R-46** — Loading the real fonts will visibly change the entire site. Approve the change, or adopt the current system-font rendering as the intended design?
5. **R-69** — Is structured service-time data worth the migration cost, or is free text acceptable?

---

## 19. Phased Implementation Roadmap

Ordering follows the prescribed sequence, with one deliberate deviation: **R-15 (migrations) and R-59 (env validation) are pulled into Phase 0.** Migrations are strictly harder to introduce once a production database exists, and env validation is the mechanism that makes the Phase 0 security fixes fail loudly instead of silently.

---

### Phase 0 — Protect data, secrets, and production stability
**Objective:** Close every trivially exploitable path and make misconfiguration impossible to ignore. Nothing here changes product behavior for legitimate users.

**Issues:** R-01, R-02, R-07, R-08, R-09, R-10, R-11, R-15, R-59, R-63, R-64

**Files:** `lib/auth.ts`, `lib/data/access.ts`, `app/login/page.tsx`, `app/actions.ts`, `app/api/cron/weekly-scan/route.ts`, `next.config.mjs`, `package.json`, `package-lock.json`, new `lib/env.ts`, new `prisma/migrations/`, `ACCESSIBILITY_NOTES.md`, `DEPLOYMENT_CHECKLIST.md`

**Sequence:**
1. Create `lib/env.ts` — Zod-validated environment schema, imported at app boot (R-59).
2. Remove both secret fallbacks; throw when unset (R-01).
3. Set a strong `AUTH_SECRET` in Vercel **before** deploying step 2.
4. Delete `mockCredentials` and the demo-credentials panel (R-02, R-11).
5. Harden `normalizedReturnPath` (R-07).
6. Fail the cron closed; `timingSafeEqual` (R-08).
7. Replace the image wildcard with an allowlist (R-09).
8. `npm audit fix`; re-run typecheck, lint, build (R-10).
9. Generate the initial Prisma migration; add a `migrate deploy` script (R-15).
10. Correct the two documentation files (R-63, R-64).

**Tests:** Unit — secret absence fails boot; `//evil.com` rejected; cron 401 without secret. Grep — no credential literals remain. CI — `npm audit --audit-level=high` clean.

**Acceptance:** No hardcoded secret or credential exists. App refuses to boot when misconfigured. Cron rejects unauthenticated requests. Images load only from allowlisted hosts. `prisma/migrations/` exists and `migrate diff` is clean. `npm audit` reports no high or critical production vulnerabilities.

**Risks:** Steps 2 and 4 **will lock out anyone using the demo credentials** — the only admin access path until Phase 2. Set `ADMIN_EMAIL`/`ADMIN_PASSWORD` to real values and verify sign-in *before* deploying. The image allowlist may break church logos sourced from unlisted hosts; enumerate `mock.ts` image hosts first.

**Rollback:** Every change is a small, independently revertible commit. Reverting R-01 restores the insecure fallback — acceptable only as an emergency measure, and it must be re-applied immediately.

**Effort: M (2–3 days)**

---

### Phase 1 — Fix blockers, crashes, and broken core workflows
**Objective:** Make the application tell the truth. Every save either takes effect and says so, or fails and says so.

**Issues:** R-04, R-05, R-06, R-18, R-19, R-28, R-29, R-31, R-32, R-42

**Files:** `app/churches/[slug]/page.tsx`, `app/cities/[slug]/page.tsx`, `app/directory/page.tsx`, `app/search/page.tsx`, `app/page.tsx`, `lib/data/queries.ts`, `lib/data/admin-store.ts`, `app/actions.ts`, `lib/validation/forms.ts`, new `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`, `app/loading.tsx`

**Sequence:**
1. Add error boundaries and loading UI first — everything after benefits (R-18).
2. Introduce a typed result model; convert `withFallback` to surface failures (R-06).
3. Add Zod schemas to all five unvalidated actions; replace unchecked casts (R-32, R-42).
4. Wrap multi-step writes in `$transaction` (R-29); fix `cityId` consistency (R-28).
5. Fix the upload path so failure never nulls an existing image (R-04).
6. Escape JSON-LD (R-31).
7. **Migrate the read path to Prisma** (R-05) — the large one. Recommended order: church detail → directory/search → city pages → homepage. Keep `mock.ts` as the seed source only.
8. Make the claim flow report its real outcome (R-19).

**Tests:** Integration across all of `admin-store.ts` (currently zero coverage). E2E: edit → public page reflects it; oversize upload → error, image intact; invalid input → inline error, no crash; DB down → honest error, not fake data.

**Acceptance:** Every admin/church edit is visible on the public site. No user action reports success when it did not persist. No unhandled exception reaches the user. A database outage renders an error state, never fabricated data.

**Risks:** R-05 is the highest-risk change in the plan — it touches every public page and swaps the data source under the entire product. Do it behind a feature flag, page group by page group, with the mock path retained until each group is verified. Requires a populated database before public pages will render anything.

**Rollback:** Feature-flag the Prisma read path so it can be switched back per page group without a deploy.

**Effort: XL (10–12 days)**

---

### Phase 2 — Authentication, authorization, and security hardening
**Objective:** Replace the placeholder identity system with a real one, and apply least privilege.

**Issues:** R-03, R-12, R-13, R-14, R-30, R-33, R-44

**Files:** `prisma/schema.prisma` + migration, `lib/auth.ts`, `lib/auth-guards.ts`, `app/actions.ts`, `app/api/auth/login/route.ts`, new `middleware.ts`, new `lib/permissions.ts`, `components/forms/login-form.tsx`, `next.config.mjs`

**Sequence:**
1. Reconcile the role enums (R-44) — small, unblocks the permission matrix.
2. Schema migration: `Session`, `VerificationToken`, `User.emailVerified` (R-03).
3. Implement magic-link authentication; requires email delivery, so provision that first.
4. Add `exp`/`iat`/`jti`; server-side session store; re-resolve role and memberships per request (R-12).
5. Build the permission matrix; delete the duplicate inline guard (R-33).
6. Add `middleware.ts` with rate limiting (R-13).
7. Add security headers and CSP with a nonce for the JSON-LD script (R-14).
8. Rebuild the upload pipeline: magic bytes, `sharp` re-encode, EXIF strip, SVG reject, Blob storage (R-30).

**Tests:** Full role × route × action matrix. Expired and forged tokens rejected. Revoked membership denied immediately. Rate limit returns 429. Header assertions in E2E. Forged-MIME and SVG uploads rejected.

**Acceptance:** No shared or hardcoded password exists anywhere. Sessions expire and can be revoked server-side. Authorization is enforced from one module. Rate limiting is active on auth and public forms. CSP and HSTS present on every response.

**Risks:** **All existing sessions and church logins break.** Requires working email delivery — if that slips, this phase stalls. Communicate the change to any active church users beforehand. CSP frequently breaks the Google Maps embed and inline JSON-LD; test in report-only mode first.

**Rollback:** Keep the cookie-session code path behind a flag for one release. Deploy CSP in `Report-Only` before enforcing.

**Effort: L (7–9 days)**

---

### Phase 3 — Complete missing user journeys and error recovery
**Objective:** Every workflow the UI advertises reaches a real conclusion.

**Issues:** R-16, R-17, R-25, R-26, R-38, R-39, R-40, R-41

**Files:** `app/contact/page.tsx`, `components/forms/contact-form.tsx`, `app/actions.ts`, `app/dashboard/page.tsx`, `app/admin/review/page.tsx`, `app/admin/submissions/page.tsx`, `app/admin/churches/[id]/page.tsx`, `components/layout/header.tsx`, `components/admin/review-comparison-card.tsx`, public pages reading `SiteContent`

**Sequence:**
1. Sign-out control (R-26) — trivial, immediate security and UX value.
2. Wire the contact form to the orphaned `ContactForm` (R-16).
3. Persist submissions + admin notification (R-17).
4. Rebuild `/dashboard` around real memberships (R-25).
5. Add approve/reject to the review and submissions queues (R-38).
6. Make `verified`/`claimed` reversible (R-39).
7. Read `SiteContent` in public pages (R-40).
8. Resolve R-41 per the product decision — build invite, or remove the claim from UI and copy.

**Tests:** E2E for every journey in §5.2 end to end, including the admin decision path and the notification it triggers.

**Acceptance:** No button leads nowhere. Every public form persists and confirms. A church owner can reach and edit their listing from the post-login landing page. Admin queues have working actions. No UI advertises a capability that does not exist.

**Risks:** Notification volume — add basic throttling. R-40 changes copy that is currently hardcoded; seed `SiteContent` with the existing strings so nothing visibly changes on deploy.

**Effort: L (7–9 days)**

---

### Phase 4 — Modernize the UI and establish a design system
**Objective:** Formalize the existing visual identity into reusable tokens and primitives. **Preserve the brand.**

**Issues:** R-45, R-46, R-47, R-67

**Files:** `app/globals.css`, `tailwind.config.ts`, `components.json`, `components/ui/*`, `app/layout.tsx`, `public/`

**Sequence:**
1. Establish a visual-regression baseline **before** any change.
2. Enable `cssVariables: true`; define semantic tokens mapped to current hex values (R-45).
3. Define a radius scale; replace the seven ad-hoc values.
4. Replace the warm-brown shadows; delete the unused `halo` gradient.
5. Add missing primitives: `Label`, `Select`, `Checkbox`, `Dialog`, `Toast`, `Alert`, `Skeleton`, and the `Field` wrapper (this wrapper is the foundation for Phase 5).
6. Migrate ad-hoc controls in `claim-form`, `admin/claims`, `filter-sidebar`, `contact` onto primitives.
7. Load fonts via `next/font` (R-46) — **product-owner approval required**, as the site's appearance will change.
8. Define or remove `admin-shell` (R-47).
9. Add favicon, OG image, manifest (R-67).

**Tests:** Visual regression on every route at three breakpoints. Component tests for new primitives.

**Acceptance:** All colors, radii, and shadows come from tokens. No duplicated ad-hoc control styling. `Field` exists and is adopted. Fonts load with `display: swap` and no layout shift. Social shares render an image.

**Risks:** R-46 changes every heading on the site — get sign-off before starting. Token migration risks subtle regressions; the visual baseline from step 1 is what makes this safe.

**Rollback:** Tokens map to existing values, so the migration is visually neutral by construction and revertible per-component. Font loading is a single revertible commit.

**Effort: L (6–8 days)**

---

### Phase 5 — Accessibility and responsive behavior
**Objective:** Reach WCAG 2.2 AA, which the project's own documentation and Illinois framing already commit it to.

**Issues:** R-20, R-21, R-22, R-23, R-24, R-48, R-49, R-50, R-51

**Files:** all form components, `components/layout/section-heading.tsx`, `components/layout/header.tsx`, `app/globals.css`, `components/directory/social-icons.tsx`, `components/directory/filter-sidebar.tsx`, `components/directory/map-section.tsx`, the six pages lacking `<h1>`

**Sequence:**
1. Add `jsx-a11y` to ESLint first — it catches a large share of these automatically and prevents regression.
2. Fix the tablet navigation gap (R-24) — smallest change, largest usability win.
3. Skip link (R-23); heading hierarchy (R-22).
4. Route every form through `Field`: labels, `required`, `aria-invalid`, `aria-describedby` (R-20, R-21).
5. Add `aria-live` for result counts and async outcomes.
6. Contextual `aria-label`s on social and "View Details" links (R-48).
7. Rebuild the mobile menu as a real disclosure (R-49).
8. Measure and correct contrast (R-50); size touch targets (R-51).
9. Add `@axe-core/playwright` to the E2E suite as a build gate.
10. Manual keyboard-only pass, screen-reader pass, and 200% zoom pass — as `ACCESSIBILITY_NOTES.md` prescribes.

**Tests:** axe on every route, zero violations. Keyboard-only traversal of every journey. VoiceOver/NVDA on the core visitor and church-owner paths. 200% zoom and text-resize checks.

**Acceptance:** Zero axe violations across all routes. Every input has a programmatic label. Every error is announced and associated. Every page has exactly one `<h1>`. Navigation works at every breakpoint from 320px up. All text meets 4.5:1. All targets ≥24×24. `ACCESSIBILITY_NOTES.md` updated to reflect verified reality.

**Risks:** Contrast corrections may require brand-adjacent color changes — bring the product owner in when `rose` and `sage` on tinted backgrounds cannot pass without adjustment.

**Effort: L (6–8 days)**

---

### Phase 6 — Database, API, performance, and reliability
**Objective:** Make the data layer correct, fast, and observable at scale.

**Issues:** R-27, R-34, R-35, R-36, R-37, R-43, R-68, R-69

**Files:** `prisma/schema.prisma` + migrations, `lib/data/admin-store.ts`, `app/admin/*`, `app/directory/page.tsx`, `components/ui/pagination.tsx`, `lib/utils.ts`, `lib/prisma/client.ts`

**Sequence:**
1. Add indexes on all FKs and status columns (R-34) — immediate, low-risk.
2. `Promise.all` the sequential awaits (R-35).
3. Replace fetch-all-then-filter with `where` clauses; bound every `findMany` (R-36).
4. Real pagination on `/directory` and admin lists (R-37).
5. Write `UpdateLog` on every mutation; read it in the admin audit view (R-27).
6. Pin the `formatDate` time zone (R-43).
7. Add `sizes` to `fill` images (R-68).
8. Configure serverless connection pooling.
9. Structured service times (R-69) — **only if the product owner approves the migration cost**.

**Tests:** Query-count and row-count assertions. `EXPLAIN` confirms index usage. Pagination E2E. Audit-log integration tests. Date formatting across time zones.

**Acceptance:** No unbounded query remains. All FK and status columns indexed. Admin pages issue parallel queries. Every mutation writes an audit row. Dates render identically on server and client.

**Risks:** Index creation on a large table locks — use `CREATE INDEX CONCURRENTLY` via a raw migration. R-69 is a data migration over existing free-text values and needs a written backfill plan.

**Effort: L (6–8 days)**

---

### Phase 7 — Testing, observability, and deployment safety
**Objective:** Make every prior phase permanently verifiable.

**Issues:** R-52, R-53, R-54, R-55, R-56

**Sequence:**
1. Vitest + Testing Library; unit and component tests, security regressions first.
2. Testcontainers Postgres; integration tests for all of `admin-store.ts`.
3. Playwright E2E for the 15 journeys in §15.2, with `@axe-core/playwright`.
4. GitHub Actions pipeline per §16.4.
5. Sentry, `/api/health`, uptime monitoring, cron-failure alerting (R-54).
6. `pino` structured logging with redaction and request IDs (R-55).
7. Staging environment with preview protection; `migrate deploy` in the pipeline (R-56).

**Note:** tests should be written alongside each earlier phase, not deferred wholesale to here. This phase formalizes and completes the suite; it is listed last because that is the prescribed order, but treating it as a final step is how test debt accumulates.

**Acceptance:** CI blocks merges on typecheck, lint, format, tests, build, audit, and migration drift. Every P0/P1 fix has a regression test. Errors surface in Sentry with request IDs. Health check monitored. Staging exists and is used before every production deploy.

**Effort: XL (10–12 days)**

---

### Phase 8 — Documentation, cleanup, and production-readiness review
**Objective:** Leave the project maintainable and legally defensible.

**Issues:** R-57, R-58, R-60, R-61, R-62, R-65, R-66, R-70

**Sequence:**
1. Prettier + format gate (R-57); expanded ESLint (R-58); ESLint CLI migration (R-60).
2. Delete all dead code; add `knip` to CI (R-65). Rename `[id]` → `[slug]` (R-66).
3. Fix `CODEBASE_OVERVIEW.md` links and stale claims (R-62).
4. Write `ARCHITECTURE.md`, `CONTRIBUTING.md`, `SECURITY.md`, a runbook, an ERD, and `.env.example` comments.
5. **Resolve R-61** — privacy policy, terms, data-sourcing policy, a published definition of "Verified", and a working removal process. Requires product-owner and possibly legal input.
6. MFA for admin accounts (R-70).
7. Final full-audit re-run of every check in §6.

**Acceptance:** Format and lint gates pass in CI. Zero dead code per `knip`. All documentation accurate and links resolving. Privacy policy, terms, and removal process published. "Verified" has a published definition and an evidence trail. Full re-audit shows no P0 or P1 open.

**Effort: L (6–8 days)**

---

### Roadmap summary

| Phase | Objective | Effort | Cumulative |
|---|---|---|---|
| 0 | Secrets, data, stability | M (2–3d) | ~3d |
| 1 | Blockers and core workflows | XL (10–12d) | ~15d |
| 2 | Auth, authz, hardening | L (7–9d) | ~24d |
| 3 | Complete user journeys | L (7–9d) | ~33d |
| 4 | Design system | L (6–8d) | ~41d |
| 5 | Accessibility and responsive | L (6–8d) | ~49d |
| 6 | Data, API, performance | L (6–8d) | ~57d |
| 7 | Testing, observability, CI/CD | XL (10–12d) | ~69d |
| 8 | Docs, cleanup, final review | L (6–8d) | ~77d |

**Total: roughly 77 working days (~15–16 weeks) for one developer**, or **6–9 weeks with two developers** working parallel tracks (security/data on one, UI/accessibility on the other) after Phase 1 completes.

**Minimum viable safe launch — Phases 0, 1, and 2 (~24 days).** That closes every Critical and most High findings and makes the product honest about what it saves. Launching before Phase 2 completes means shipping with the shared `"church"` password (SEC-03) — not advisable for a site that publishes real church contact information.

---

## 20. Acceptance Criteria

### 20.1 Security

- [ ] No hardcoded secret, password, or credential exists in the repository (automated grep gate in CI).
- [ ] Application fails to boot when `AUTH_SECRET`, `DATABASE_URL`, or `CRON_SECRET` is missing.
- [ ] Demo credentials return 401 in every environment.
- [ ] No shared password authenticates any user.
- [ ] Sessions carry `exp` and are rejected after expiry; server-side revocation works within one request.
- [ ] Role and church membership are re-resolved from the database on every privileged request.
- [ ] Rate limiting returns 429 on auth and public form abuse.
- [ ] CSP, HSTS, `frame-ancestors`, `nosniff`, and `Referrer-Policy` present on every response.
- [ ] `//evil.com` and `/\evil.com` are rejected as redirect targets.
- [ ] Cron returns 401 without a valid bearer token, including when the secret is unset.
- [ ] `/_next/image` serves only allowlisted hosts.
- [ ] Uploads are magic-byte validated, re-encoded, EXIF-stripped; SVG rejected; stored outside the database.
- [ ] JSON-LD output escapes `<`, `>`, `&`.
- [ ] `npm audit --audit-level=high` is clean.
- [ ] Permission matrix enforced from one module; REVIEWER and SUPPORT are strictly narrower than ADMIN.

### 20.2 Correctness and data integrity

- [ ] Every admin and church edit is visible on the public site within one revalidation cycle.
- [ ] No user action reports success unless it persisted.
- [ ] A failed image upload never modifies the existing image.
- [ ] Multi-step writes are transactional; a mid-failure leaves no partial state.
- [ ] `city` and `cityId` cannot diverge.
- [ ] Every write path validates input with Zod before touching Prisma.
- [ ] A database outage renders an explicit error state; fabricated data is never shown.
- [ ] Every mutation writes an `UpdateLog` row attributable to a user.
- [ ] `prisma/migrations/` exists; `migrate diff --exit-code` is clean in CI.

### 20.3 User experience

- [ ] Every public form persists, confirms, and preserves input on validation failure.
- [ ] Every form shows inline, field-level validation errors.
- [ ] No unhandled exception reaches a user; `error.tsx`, `global-error.tsx`, and `not-found.tsx` exist.
- [ ] Loading states exist for every async boundary.
- [ ] Empty states exist for every list, including admin.
- [ ] A church owner reaches their listing from the post-login page in one click.
- [ ] Sign-out is available from every authenticated view.
- [ ] No button or link leads to a non-existent or unrelated destination.
- [ ] Admin review and submission queues have working approve/reject actions.
- [ ] `verified` and `claimed` are reversible.
- [ ] Pagination is functional wherever it is displayed.

### 20.4 Accessibility (WCAG 2.2 AA)

- [ ] Zero axe violations on every route, enforced in CI.
- [ ] Every input has a programmatic label; no placeholder-only labeling remains.
- [ ] Required fields are marked with `required` or `aria-required`.
- [ ] Errors use `aria-invalid` + `aria-describedby` and are announced via `role="alert"`.
- [ ] Exactly one `<h1>` per page; heading order is sequential.
- [ ] Skip link is visually hidden until focused, then clearly visible.
- [ ] All functionality is keyboard-operable; focus is always visible; no traps.
- [ ] Mobile menu supports Escape, outside-click, and focus return.
- [ ] All text meets 4.5:1 (3:1 for large text).
- [ ] All targets ≥24×24 CSS px.
- [ ] Layout is usable at 320px and at 200% zoom.
- [ ] Manual keyboard and screen-reader passes documented and signed off.

### 20.5 Performance

- [ ] No image is stored or served as a data URL.
- [ ] `/directory` paginates; initial payload is bounded.
- [ ] Every `findMany` has a `where`, a `take`, or both.
- [ ] Independent queries run in parallel.
- [ ] All FKs and status columns are indexed; `EXPLAIN` confirms usage.
- [ ] Lighthouse Performance ≥ 90 on `/` and `/churches/[slug]` (mobile).
- [ ] LCP < 2.5s, CLS < 0.1, INP < 200ms on a mid-tier mobile device.

### 20.6 Testing and operations

- [ ] Every P0 and P1 fix has a regression test.
- [ ] Unit, integration, component, API, and E2E suites all run in CI.
- [ ] `lib/data/admin-store.ts` has integration coverage (currently zero).
- [ ] CI blocks merges on typecheck, lint, format, tests, build, audit, and migration drift.
- [ ] `/api/health` exists and is monitored; alerts fire on failure.
- [ ] Errors reach Sentry with request IDs; logs are structured and redacted.
- [ ] Cron failures alert.
- [ ] Staging exists and precedes every production deploy.
- [ ] A database restore has been tested at least once.

### 20.7 Documentation and compliance

- [ ] All documentation is accurate; all links resolve.
- [ ] `ACCESSIBILITY_NOTES.md` reflects verified state, not aspiration.
- [ ] `DEPLOYMENT_CHECKLIST.md` marks `DATABASE_URL` and `CRON_SECRET` as required and includes migration steps.
- [ ] `ARCHITECTURE.md`, `CONTRIBUTING.md`, `SECURITY.md`, and a runbook exist.
- [ ] Privacy policy, terms of use, and a working removal process are published.
- [ ] "Verified" has a published definition and a per-record evidence trail.
- [ ] The FaithStreet sourcing question has a documented decision.
- [ ] Zero dead code per `knip`.

---

## 21. Risks, Dependencies, and Open Questions

### 21.1 Delivery risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **R-05 (mock → Prisma) destabilizes the public site** | High | High | Feature-flag per page group; migrate church detail first; keep the mock path until each group is verified; visual regression before and after |
| **Phase 0 locks out all admin access** | Medium | High | Set and verify `ADMIN_EMAIL`/`ADMIN_PASSWORD` *before* deploying the `mockCredentials` deletion |
| **Phase 2 breaks all church logins** | High | Medium | Requires working email first; notify active users; keep the old path behind a flag for one release |
| **CSP breaks the Maps embed and JSON-LD** | High | Medium | Deploy `Report-Only` first; add a nonce for inline JSON-LD; allow `google.com/maps` in `frame-src` |
| **Font loading visibly changes the whole site** | Certain | Medium | Product-owner sign-off before Phase 4 step 7 |
| **Contrast fixes force brand color changes** | Medium | Medium | Measure early in Phase 5; escalate `rose`/`sage` decisions to the product owner |
| **No migrations makes the first production deploy risky** | High | High | Generate the initial migration in Phase 0, before any production database exists |
| **Test suite lands too late to protect earlier phases** | High | High | Write tests within each phase; Phase 7 formalizes rather than originates them |
| **Index creation locks tables** | Low now, High later | Medium | `CREATE INDEX CONCURRENTLY` via raw migration |
| **Real church data triggers a complaint before removal exists** | Medium | High | R-61 and R-16 are the mitigation; consider un-publishing real records until the removal path works |

### 21.2 External dependencies

| Dependency | Needed for | Status |
|---|---|---|
| Provisioned Postgres database | Phase 1 onward — nothing works without it | **Unknown.** `DATABASE_URL` documented as "Optional" |
| Transactional email provider | Phase 2 magic links; Phase 3 notifications | **Not selected.** Blocks Phase 2 |
| Blob/object storage | Phase 2 upload rework | **Not selected.** Vercel Blob is the natural fit |
| Redis / Vercel KV | Phase 2 rate limiting | Not selected |
| Sentry account | Phase 7 | Not set up |
| Staging Vercel project + database | Phase 7 | Does not exist |
| Legal review of data publication | R-61 | Not started |
| `MAPBOX_TOKEN` | Documented as enabling "full map embed behavior" | **Never read by any code.** The map is a Google Maps iframe (`map-section.tsx:7`). `.env.example` and the checklist both list Mapbox variables that nothing uses — remove them |

### 21.3 Open questions for the product owner

1. **Is there a production database today, and does it contain real data?** This changes the migration approach materially (§13.3) and determines whether Phase 1 has anything to read.
2. **Is the site live and publicly reachable?** If yes, SEC-01, SEC-02, and SEC-03 are active exposures and Phase 0 is urgent rather than merely first.
3. **What does "Verified" mean?** Currently developer-asserted from reading a website. Does it require church confirmation? This is a trust claim shown to the public.
4. **May the directory publish real church data without opt-in?** And what is the removal process? (R-61 — also a legal question.)
5. **Magic-link or passwords for church users?** Magic link is recommended for infrequent, non-technical users.
6. **Was the FaithStreet sourcing question ever resolved?** `FAITHSTREET_IMPORT_NOTES.md:74` flags it and no decision is recorded.
7. **Build the editor-invite feature, or remove the claim?** It is advertised on the login page and in dashboard buttons, and does not exist.
8. **Approve loading the real fonts?** The entire site's typography changes.
9. **Is structured service-time data worth the migration?** (R-69)
10. **Who operates this after launch** — monitoring, incident response, claim review? The review-first design assumes a human reviewer exists.
11. **Should the weekly scan actually crawl church websites?** That introduces SSRF, robots.txt, rate-limiting, and legal considerations well beyond the current stub.
12. **Expected scale?** 64 churches today. Champaign County plausibly has several hundred. This changes the pagination and indexing urgency.

### 21.4 Assumptions made in this audit

- The GitHub repository referenced in `README.md` is public; SEC-01 and SEC-02 severity depends on this. **If it is private, both remain Critical** (the credentials are printed on the login page regardless), but the SEC-01 forge-the-cookie path narrows to those with repo access.
- No production database currently holds real data — inferred from the absence of migrations and `DATABASE_URL` being documented as optional. **If wrong, §13.3 becomes considerably more urgent.**
- The 2026 dates throughout the mock data are intentional, not placeholders.
- `.env.example` contains only placeholder values. Its keys were listed; values were not read or reproduced.

---

## 22. Recommended First Implementation Sprint

**Duration:** 5 working days
**Goal:** Eliminate every trivially exploitable security path, establish migration safety, and stop the product from lying about saved data. Nothing here changes the public experience for legitimate visitors.

### Day 1 — Environment safety and secret hardening

- Create `lib/env.ts` with a Zod schema for every environment variable; import it at boot (R-59).
- **Set a strong `AUTH_SECRET` in Vercel and verify sign-in works before proceeding.**
- Remove both secret fallbacks from `lib/auth.ts:6-11`; throw when unset (R-01).
- Fix `normalizedReturnPath` to reject `//` and `/\` (R-07).
- Fail the cron closed; use `timingSafeEqual` (R-08).

*Exit:* app refuses to boot without `AUTH_SECRET`; cron 401s without a token; open redirect closed.

### Day 2 — Credential removal

- **Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in Vercel and confirm sign-in.** This is the only remaining admin path.
- Delete `mockCredentials` from `lib/data/access.ts:44-69` (R-02), removing the real church Gmail credential with it (R-11).
- Remove the demo-credentials panel from `app/login/page.tsx:68-73`.
- Leave the `password === "church"` path in place **for now** — removing it locks out church users before Phase 2 provides a replacement. Document it as a known open Critical.
- Add a CI grep gate asserting no credential literals return.

*Exit:* `admin/admin` returns 401; no credentials rendered publicly; no real personal data in `access.ts`.

### Day 3 — Dependencies and image surface

- `npm audit fix`; re-run typecheck, lint, and build to confirm nothing regressed (R-10).
- Enumerate every image host referenced in `mock.ts`; replace the `hostname: "**"` wildcard with that allowlist (R-09).
- Spot-check church pages for broken images.

*Exit:* no high or critical production vulnerabilities; images load only from known hosts.

### Day 4 — Migration foundation

- Generate the initial Prisma migration from the current schema (R-15).
- Add a `prisma:migrate:deploy` script.
- Add indexes on all foreign keys and status columns in the same migration (R-34 — cheap to include now, expensive later).
- Guard `prisma/seed.ts` against non-development environments.
- Verify against a scratch database.

*Exit:* `prisma/migrations/` exists; `migrate diff --exit-code` clean; seed cannot target production.

### Day 5 — Stop the lying, and document

- Fix the upload path so a rejected file never nulls the existing image (R-04) — the highest-value single fix available this week.
- Add `app/error.tsx`, `app/global-error.tsx`, and `app/not-found.tsx` (R-18, first half) so validation failures stop rendering as raw crashes.
- Correct `ACCESSIBILITY_NOTES.md` to reflect verified state (R-63).
- Correct `DEPLOYMENT_CHECKLIST.md`: `DATABASE_URL` and `CRON_SECRET` → **Required**; add a migration step; add an `AUTH_SECRET` verification step; remove the unused Mapbox variables (R-64).
- Write the first regression tests: no hardcoded secret, `//evil.com` rejected, cron 401 without a token.

*Exit:* failed uploads no longer destroy data; errors render a real page; documentation is accurate.

### Sprint acceptance

- [ ] `npx tsc --noEmit`, `npx next lint`, and `npm run build` all still pass.
- [ ] `npm audit --audit-level=high` is clean for production dependencies.
- [ ] App exits non-zero when `AUTH_SECRET` is unset in production.
- [ ] Demo credentials return 401; no credentials appear on `/login`.
- [ ] `/api/cron/weekly-scan` returns 401 without a valid token, including when `CRON_SECRET` is unset.
- [ ] `//evil.com` is rejected as a return path.
- [ ] `prisma/migrations/` exists and CI verifies no drift.
- [ ] An oversize upload shows an error and leaves the existing image intact.
- [ ] A validation error renders a styled error page, not a raw crash.
- [ ] `ACCESSIBILITY_NOTES.md` and `DEPLOYMENT_CHECKLIST.md` are accurate.

### Explicitly deferred from this sprint

- **SEC-03** (shared `"church"` password) — requires magic-link auth and email delivery. **Remains an open Critical.** If the site is publicly reachable, consider disabling church logins entirely until Phase 2.
- **R-05** (mock → Prisma read path) — too large for one sprint and needs a provisioned database.
- Accessibility work — Phase 5, though `jsx-a11y` could be added to ESLint opportunistically.

### Before starting, confirm with the product owner

1. Is the site publicly reachable right now? (Determines urgency.)
2. Is the GitHub repository public? (Determines SEC-01 exploitability.)
3. Who holds Vercel access to set environment variables on Day 1 and Day 2?
4. Is there a production database with real data? (Determines the Day 4 approach.)
5. Are any real church users signing in today with the `"church"` password? (Determines whether that path can be closed immediately rather than deferred.)

---

*End of report. No application code was modified during this audit.*
