# 01 · Project Audit

Project: **Champaign County Churches** (champaigncountychurches.com)
Audited: 2026-11-10, from the repository (`main` at `5d7ece6`) and read-only checks of the live site.
Auditor: Claude (lead architect). Implementer: ChatGPT. Owner: James Wright, TechEd and Solutions.

Every finding below was observed in the code or on the live site. Items marked **(verify)** were seen earlier and must be re-checked before acting.

## 1. Overview and technology stack

A free public directory of churches in Champaign County, Illinois, with a paid "Enhanced Church Profile" for churches.

| Layer | What is used |
|---|---|
| Framework | Next.js 15.5.27 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS, small in-house UI kit (`components/ui`), lucide icons |
| Data | PostgreSQL (Neon) through Prisma 6.19; 32 models; migrations in `prisma/migrations` |
| Hosting | Vercel (production builds run `prisma migrate deploy`, see `scripts/vercel-build.mjs`); Cloudflare DNS |
| Storage | Vercel Blob for uploaded photos |
| Email | Resend (magic-link sign-in, notifications) |
| Payments | Stripe Checkout + Billing Portal + webhook. **Test mode only**; live account not yet activated |
| Map | Leaflet + OpenStreetMap tiles; US Census geocoder |
| Tests | Vitest: 104 unit, 70 integration (in-memory Postgres); GitHub Actions CI |
| Mobile | Expo (React Native) app in `mobile/`, reads `/api/v1`; not yet in stores |

Audience: residents and newcomers looking for a church; college students (UIUC, Parkland); church staff who manage listings; one directory administrator.

Business outcomes: people find and visit churches; churches claim listings; some churches pay $29/month or $319/year.

## 2. Existing capabilities

**Working (verified live):** directory with filters; city and denomination pages; church profiles; map with filters and "Near me"; Find a Service; events calendar with flyers and calendar downloads; community help listings; Campus Faith (campus hubs, ministries, student-friendly churches, student events, submissions); Worship Live & Next; Collaboration Board; saved churches; claim, submit, contact, and correction forms; magic-link sign-in; church dashboard (listing, visit info, photos, gallery, events, students, collaborate, team, billing, share/QR/badge); admin queues and audit log; weekly website-review cron; public JSON API; sitemap (118 URLs), robots.txt, structured data; accessibility statement.

**Working but not yet delivering value:**
- **0 of 70 churches are claimed** (API sample: 0 of 50). Dashboards, events, Live, and the Collaboration Board are therefore empty. This is the single largest gap between what was built and what visitors see.
- Stripe is in test mode. No church can pay.
- Worship Live & Next "Live now" and "Recent services" depend on Enhanced churches; only one church has Enhanced (complimentary).

**Incomplete or absent:**
- `/faq` returns 404. Other old routes (`/musicians`, `/create-profile`, `/terms-privacy`, `/church-search-request`) also 404; confirm nothing links to them.
- No site analytics. Search Console and Bing were verified on 2026-10-14; no baseline has been recorded.
- Mobile app: Android release build compiles; iOS build blocked until the Mac has Xcode 27.
- One hidden test listing, "Stripe Test Church (delete me)", remains in the production database with a test subscription.

## 3. Design strengths and weaknesses

Strengths: consistent rounded-card system; clear type hierarchy; honest "Photo not yet provided" states; new logo applied; strong contrast after the October accessibility pass.

Weaknesses (by customer impact):

| Sev | Finding | Evidence |
|---|---|---|
| High | **Brand fonts never load.** CSS names "Fraunces" and "Source Sans 3" but no `next/font`, `@font-face`, or font link exists, so visitors get system fallbacks. | `app/globals.css` lines 5-8; grep for font loaders returns nothing |
| High | **The homepage leads with text and gradients, not photography.** No hero image; first photo appears well below the fold. | `app/page.tsx`; 7 `<img>` on the whole page |
| High | **Photo coverage is thin**: about 25 of 70 churches have a real photo, so most cards show a gradient placeholder. | API: 18 of 50 sampled have a photo |
| Med | Accent colors do not match the logo. The logo uses deep green and gold; the site accent is coral/clay. | `tailwind.config.ts`, `public/brand/logo.png` |
| Med | Navigation is crowded: 8 links plus 2 buttons on desktop; mobile uses a bare `<details>` menu. | `components/layout/header.tsx` |
| Med | Almost no motion or feedback; only 7 files use any transition. | grep |
| Low | Homepage copy still says "A clean, searchable directory" (describes the product, not the visitor's goal). | `app/page.tsx` |

## 4. Security and reliability concerns

| Sev | Finding | Evidence |
|---|---|---|
| **Critical** | **Next.js 15.5.27 is inside the range of a critical npm advisory** (affects 10.0.0 to 15.5.27; a fix is available). | `npm audit --omit=dev` on 2026-11-10 |
| High | CI runs `npm audit --audit-level=critical`, so **the next pull request will fail CI** until Next.js is upgraded. | `.github/workflows/ci.yml` |
| High | Other advisories: `prisma`/`@prisma/config`, `zod` (<4.6.6), `undici`, `deepmerge-ts`, `@vercel/blob` and its `@vercel/*` dependencies. 9 total (8 high, 1 critical). Each needs triage, not a blind `audit fix`. | same |
| Med | No Content-Security-Policy header. Other headers (HSTS, nosniff, frame deny, referrer, permissions) are present. | live response headers; `next.config.mjs` |
| Med | Administrator password sign-in is enabled in production. It has an IP rate limit (10 per 15 min); a per-account limit was not found **(verify)**. | `lib/services/auth.ts` line 128; live `/login` |
| Med | Every page is rendered on demand with `no-store` caching (`force-dynamic` in the root layout). A database outage takes the whole public site down, and each view costs a database round trip. | `app/layout.tsx` line 11; live `cache-control` |
| Low | Public support email was not configured on 2026-10-10 **(verify)**. | admin overview |
| Low | The working copy has uncommitted files from another session (`.gitignore`, `docs/LAUNCH_CHECKLIST.md`, `docs/TEST_REPORT.md`, `docs/CODEX_HANDOFF.md`). Do not commit or discard them without the owner. | `git status` |

Strong points to preserve: services enforce permissions with an explicit actor; sessions are hashed; Stripe webhooks are signature-verified and idempotent; uploads are type-sniffed; image optimizer hosts are allow-listed; all public submissions are moderated; audit log.

## 5. SEO and discovery limitations

- Verified in Google Search Console and Bing on 2026-10-14; sitemap submitted. Indexing status since then is **unknown** (no access from this audit).
- Titles, descriptions, canonicals, breadcrumbs, `Church`, `ItemList`, and `Organization` data exist.
- Missing: `Event` structured data on events; FAQ content and `FAQPage` data; analytics and conversion tracking; a Google Business Profile decision; any backlinks program beyond the "Find us" badge (which needs claimed churches).
- Church descriptions on unclaimed listings are short and similar in shape, which limits how well profile pages can rank.

## 6. Performance and accessibility

- Measured server response: homepage 0.74 s to first byte, 160 KB HTML; `/about` 0.29 s. No lab or field Core Web Vitals have been measured. **Targets are not achievements.**
- No caching (see section 4). Images mostly go through `next/image`; flyers and gallery thumbnails in the dashboard use plain `<img>`.
- Accessibility: axe-core found 0 WCAG 2.2 A/AA violations on 12 live pages on 2026-10-14; gradient contrast was fixed by hand. Manual screen-reader testing has not been done.

## 7. Recommended improvements (summary)

1. Close the security gap (Next.js upgrade, advisory triage, CSP, admin sign-in).
2. Load the real fonts and align color tokens with the logo.
3. Rebuild the homepage around photography and the search task.
4. Raise photo coverage and get churches to claim listings (the growth engine).
5. Add caching for public pages.
6. Add measurement (analytics, Search Console baseline) before content work.
7. Add restrained motion.

Details are in documents 02 to 07.

## 8. Risks, assumptions, dependencies

- **Truthfulness rule (owner policy):** never invent pastors, service times, reviews, claims, or photos. Stock or generated images must never appear as a specific church.
- Owner-only actions: Stripe activation, Xcode update, store accounts, photography, outreach to churches, approving analytics.
- Preview deployments share the production database. Migrations must stay additive.
- ChatGPT does not share this conversation. Everything it needs is in this folder.
