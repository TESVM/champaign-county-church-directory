# 10 · Handoff to ChatGPT

You are the implementing engineer for **Champaign County Churches**. You have no access to earlier conversations. Everything you need is in this folder and the repository. Work one task at a time and report evidence.

## The project in one paragraph

A Next.js 15 (App Router) + TypeScript + Tailwind + Prisma/PostgreSQL site, hosted on Vercel, at https://www.champaigncountychurches.com. It is a free directory of 70 churches in Champaign County, Illinois, with church dashboards, moderation queues, a map, events, a campus section, and a paid "Enhanced" plan through Stripe (test mode today). Repository: `TESVM/champaign-county-church-directory` on GitHub, default branch `main`. Merging to `main` deploys to production and applies database migrations.

## Read in this order

1. `01_PROJECT_AUDIT.md` (what exists, what is wrong)
2. `07_CHATGPT_TASKS.md` (your assignments and standing rules)
3. `08_QA_ACCEPTANCE.md` (how your work is judged)
4. The document a task refers to (02 design, 03 motion, 04 SEO, 05 security, 06 customer experience)
5. Existing project docs: `docs/DEPLOYMENT.md`, `docs/GUIDE.md`, `docs/FREE_VS_ENHANCED.md`

## Setup

```bash
npm ci
npm run typecheck && npm run lint && npm test && npm run test:integration
```

Integration tests start their own in-memory PostgreSQL; no database or secrets are needed to run tests. To run the site locally you need a `.env.local` (see `.env.example` and `docs/DEPLOYMENT.md`); a local PGlite server is available with `npm run db:local` and `npm run db:setup`. If you cannot run the site locally, use the Vercel preview that each pull request gets.

## Code map

| Area | Where |
|---|---|
| Pages | `app/` (public pages, `app/dashboard`, `app/admin`, `app/api`) |
| Server actions | `app/actions.ts` (thin; each calls a service) |
| Business logic and permissions | `lib/services/*.ts`; permission helpers in `lib/actor.ts` |
| Plans and feature gating | `lib/plans.ts`, `lib/services/entitlements.ts` |
| Environment | `lib/env.ts` (validated; never read `process.env` elsewhere for app config) |
| UI | `components/` (`ui`, `layout`, `directory`, `forms`, `campus`, `collab`, `map`, `seo`, `dashboard`, `admin`) |
| Styles | `tailwind.config.ts`, `app/globals.css` |
| Database | `prisma/schema.prisma`, `prisma/migrations/` |
| Tests | `tests/` (unit), `tests/integration/` |
| Mobile app | `mobile/` (out of scope) |

## Rules that override everything

1. **Truthfulness.** Never invent a pastor, service time, contact detail, review, claim, or photo. Never add stock or generated images to church listings. If content is missing, show an honest empty state.
2. **Safety.** No secrets in code or logs. Do not edit `.env*`. Do not run destructive database commands. Migrations are additive only. Do not change Stripe, Vercel, Cloudflare, or DNS settings.
3. **Production data.** Preview deployments use the production database. Write only to the hidden listing "Stripe Test Church (delete me)" or to submissions clearly marked TEST, and say what you created.
4. **Scope.** Change only what the task names. If something else is broken, report it; do not fix it in the same pull request.
5. **No merging and no deploying.** Open a pull request and stop. The owner approves merges.
6. **Leave these local files alone** if you see them modified or untracked: `.gitignore`, `docs/LAUNCH_CHECKLIST.md`, `docs/TEST_REPORT.md`, `docs/CODEX_HANDOFF.md`, `next-env.d.ts`.
7. **Never report a test result you did not run.** If you could not run something, say so.
8. Accessibility is a requirement (WCAG 2.2 AA): labels, focus, contrast, 44 px targets, reduced motion.

## Conventions

- Branch: `task/<id-lowercase>-short-name` (for example `task/sec-001-next-upgrade`). One task per branch.
- Commits: imperative summary under 72 characters, body explains why.
- Services take an explicit `Actor` and assert permissions; server actions never contain business logic.
- Validation errors are `ValidationError` with field messages; forms use `components/forms/action-form.tsx`.
- Tests: add or update tests for any behavior change. Follow `tests/integration/helpers.ts` (`makeChurch`, `actorFor`, `resetDatabase`).

## Repository state on 2026-11-10

`main` is at the merge of pull request #12 (accessibility fixes). Live site healthy. CI will currently **fail** on any pull request because of a critical `next` advisory: that is your first task.

## Your first assignment

**SEC-001** in `07_CHATGPT_TASKS.md`. Do exactly that task. When finished, reply with the completion report in this shape:

```
TASK: SEC-001
BRANCH / PR:
SUMMARY (3 lines max):
FILES CHANGED:
COMMANDS: typecheck ✔/✘ · lint ✔/✘ · unit N passed · integration N passed · build ✔/✘
npm audit BEFORE: … AFTER: …
PREVIEW CHECKS: (URL and status for each page)
NOT DONE / QUESTIONS:
```

Then wait for the architect's verdict before starting UI-001.
