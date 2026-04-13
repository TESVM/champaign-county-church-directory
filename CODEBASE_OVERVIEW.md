# Codebase Overview

## What This Project Is

`champaign-county-church-directory` is a Next.js App Router app for discovering churches in Champaign County, Illinois.

It is built like a production app, but today much of the site still runs on in-repo mock data rather than live database queries. The database schema, Prisma setup, auth scaffold, and cron scan workflow are already present so the project can move toward a real data-backed deployment.

## Main Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS
- Prisma
- NextAuth
- Vercel deployment and cron support

See [package.json](/Users/tes/champaign-county-church-directory/package.json).

## High-Level Architecture

The app has four main layers:

1. `app/`
   Route pages, metadata routes, API routes, and server actions.

2. `components/`
   Reusable UI grouped into:
   - `layout/` for site chrome
   - `directory/` for public listing/search UI
   - `forms/` for public submission flows
   - `admin/` for review/dashboard UI
   - `ui/` for low-level shared primitives

3. `lib/`
   Shared logic:
   - `data/` for query helpers and mock records
   - `validation/` for Zod form schemas
   - `scan/` for weekly scan logic
   - `auth.ts` for NextAuth config
   - `utils.ts` for helpers

4. `prisma/`
   Database schema and seed script.

## How Data Works Right Now

Public and admin pages mostly read from `lib/data/mock.ts` through helper functions in `lib/data/queries.ts`.

That means:

- the UI behaves like a real directory
- filtering/searching works in memory
- admin stats and review lists are demo data
- Prisma models exist, but most pages are not yet querying the database

The README explicitly calls this out as follow-up work: wire the mock query layer to Prisma.

See:
- [lib/data/mock.ts](/Users/tes/champaign-county-church-directory/lib/data/mock.ts)
- [lib/data/queries.ts](/Users/tes/champaign-county-church-directory/lib/data/queries.ts)
- [README.md](/Users/tes/champaign-county-church-directory/README.md)

## Important Routes

### Public pages

- `/` homepage
  Uses query helpers to assemble featured churches, city cards, recent updates, app/livestream sections, and highlighted churches.
- `/directory`
  Main searchable directory with filter sidebar and card grid.
- `/cities` and `/cities/[slug]`
  Browse churches by city.
- `/churches/[slug]`
  Individual church profile page.
- `/submit`, `/claim`, `/contact`
  Public forms for directory intake and communication.

Examples:
- [app/page.tsx](/Users/tes/champaign-county-church-directory/app/page.tsx)
- [app/directory/page.tsx](/Users/tes/champaign-county-church-directory/app/directory/page.tsx)

### Admin pages

- `/admin`
  Dashboard for high-level counts and pending work.
- `/admin/review`
  Suggested-change review queue.
- `/admin/submissions`
  Public form submissions awaiting review.
- `/admin/churches`
  Church list for editing.
- `/admin/churches/[id]`
  Single church editing form.

Example:
- [app/admin/page.tsx](/Users/tes/champaign-county-church-directory/app/admin/page.tsx)

## UI Structure

The app uses a shared root layout with global fonts, header, footer, and metadata.

- [app/layout.tsx](/Users/tes/champaign-county-church-directory/app/layout.tsx)
- [app/globals.css](/Users/tes/champaign-county-church-directory/app/globals.css)
- [tailwind.config.ts](/Users/tes/champaign-county-church-directory/tailwind.config.ts)

The visual system is component-driven. The directory UI is mostly built from cards, badges, search/filter controls, and section wrappers. The admin side reuses the same visual language with separate admin components.

## Database Model

The Prisma schema models the long-term real system, including:

- `City`
- `Church`
- `Pastor`
- `ServiceTime`
- `SocialLink`
- `Ministry`
- `SuggestedChange`
- `Submission`
- `User`
- `UpdateLog`

This is a solid schema for a review-first directory:

- church records hold public listing data
- suggested changes capture proposed edits with source URL and confidence
- submissions capture public intake
- update logs preserve audit history

See [prisma/schema.prisma](/Users/tes/champaign-county-church-directory/prisma/schema.prisma).

## Forms And Validation

Forms submit to server actions in `app/actions.ts`.

At the moment those actions only validate payloads with Zod. They do not yet persist to Prisma or trigger notifications.

See:
- [app/actions.ts](/Users/tes/champaign-county-church-directory/app/actions.ts)
- [lib/validation/forms.ts](/Users/tes/champaign-county-church-directory/lib/validation/forms.ts)
- [components/forms/submit-listing-form.tsx](/Users/tes/champaign-county-church-directory/components/forms/submit-listing-form.tsx)

## Auth

Auth is currently a placeholder credentials flow:

- email must match `ADMIN_EMAIL`
- password is hardcoded as `"admin"`

This is clearly a scaffold, not production auth.

See [lib/auth.ts](/Users/tes/champaign-county-church-directory/lib/auth.ts).

## Weekly Scan System

There is a scheduled cron endpoint at `/api/cron/weekly-scan`.

Current behavior:

- checks bearer auth against `CRON_SECRET`
- runs `runWeeklyScan()`
- returns synthetic suggested scan results

Right now the scan logic is still mock-level. It inspects the in-memory church list and proposes a `lastScannedAt` update when an official website exists. It does not yet crawl sites or write suggested changes to the database.

See:
- [app/api/cron/weekly-scan/route.ts](/Users/tes/champaign-county-church-directory/app/api/cron/weekly-scan/route.ts)
- [lib/scan/weekly-scan.ts](/Users/tes/champaign-county-church-directory/lib/scan/weekly-scan.ts)

## Current State In One Sentence

This is a polished Next.js church-directory product shell with a thoughtful Prisma schema and review workflow design, but it is still in the transition phase from mock data to real persistence and real admin operations.

## What Needs To Happen Next

The most important next engineering steps are:

1. Replace `lib/data/mock.ts` reads with Prisma queries.
2. Make `app/actions.ts` write submissions, claims, and contact requests to the database.
3. Replace the placeholder credentials auth with real NextAuth + Prisma-backed users.
4. Persist admin review actions for suggested changes and submissions.
5. Upgrade the weekly scan from a mock result generator to a real ingestion/review pipeline.

## Local Dev Note

The project expects installed dependencies. In the current workspace, `npm run build` failed because `next` was not installed locally yet, which means dependencies likely have not been installed in this checkout.
