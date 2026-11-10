# 09 · Project Status

Last updated: 2026-11-10 by the implementing engineer (SEC-001; architect verdict pending). Update this file whenever a task changes state.

## Summary

SEC-001 implemented on `task/sec-001-next-upgrade` in an isolated checkout based on the documentation branch (PR #13 remains open). No production deployment or database write performed. Local typecheck/lint, 104 unit tests and 70 integration tests pass. Critical audit gate passes (1 critical / 8 high → 0 critical / 7 high). Build and preview verification are pending; remaining dependency decisions are documented in `docs/DEPLOYMENT.md`. UI-001 has not started.

## Tasks

| ID | Title | Priority | State | PR | Reviewer verdict |
|---|---|---|---|---|---|
| SEC-001 | Next.js critical advisory and triage | P0 | **Awaiting verification / dependency decisions** | Pending creation | Pending architect review |
| UI-001 | Load brand fonts | P1 | Pending (after SEC-001) | — | — |
| SEC-003 | Admin password sign-in hardening | P1 | Pending | — | — |
| SEC-002 | CSP report-only | P1 | Pending | — | — |
| UI-002 | Color tokens | P1 | Pending | — | — |
| UX-004 | Claim prompt | P1 | Pending | — | — |
| UI-004 | Church card | P1 | Pending | — | — |
| UI-003 | Homepage hero | P1 | Pending; **photo P1 needed from owner** (falls back to plain background) | — | — |
| UX-001 | Navigation | P1 | Pending | — | — |
| PERF-001 | Data caching | P1 | Pending | — | — |
| SEO-001 | Event structured data | P1 | Pending | — | — |
| SEO-003 | Link and index hygiene | P1 | Pending | — | — |
| MOT-001, UX-002, UX-003, SEO-002, IMG-001, SEO-004, SEO-005 | see backlog | P2 | Not yet fully specified | — | — |
| SEO-006 | Analytics | P2 | **Blocked: owner approval** | — | — |
| OPS-001 | Ops notes, test listing | P3 | Blocked: owner decision | — | — |
| GROW-001 | Monthly email | P3 | Blocked: owner approval | — | — |

## Owner actions outstanding (not ChatGPT work)

| Item | State |
|---|---|
| Activate Stripe live account (form was at step 1 on 2026-10-14) | Open |
| Then: live prices ($29/mo, $319/yr), webhook, portal, four Vercel variables | Waiting on activation |
| macOS 26.7.2 and Xcode 27 for the iOS app build | Open |
| Android Studio: add an arm64-v8a phone emulator | Open |
| Apple Developer, Google Play, Expo accounts | Open |
| Hero and site photography (shot list in 02) | Open |
| Outreach to churches to claim listings (0 of 70 claimed) | Open |
| Decide: analytics provider; Google Business Profile; delete or keep hidden test listing | Open |
| Set `SUPPORT_EMAIL` in Vercel (verify whether still missing) | Open |
| Read Search Console and record the baseline | Open |

## Decisions log

- 2026-11-10: No dark theme in this program (site is deliberately light-only).
- 2026-11-10: Motion is CSS-only; no animation library.
- 2026-11-10: No church reviews or star ratings.
- 2026-11-10: Stock and generated images never appear on church listings.

## SEC-001 implementation notes

- Changed `package.json`, `package-lock.json`, `docs/DEPLOYMENT.md` and this status file only (generated `next-env.d.ts` excluded from the commit).
- Next.js and matching lint config: 15.5.27 → 15.5.28 (lowest patched 15.x); undici: 6.29.0 → 6.29.1 within its existing parent range. No new overrides.
- Prisma/client remain 6.19.3 (latest 6.x, no patched config dependency). Stop-and-report rule applied rather than upgrading majors.
- Zod's array API is used in campus submissions; a 3 → 4 compatibility migration requires architect review. No claim that this finding is inapplicable. Blob 2.9.0 still uses the affected OIDC 3.x chain; no blind downgrade applied.
- Node 22.23.4 used locally; clean `npm ci --no-audit` and Prisma generation passed. Integration tests used only throwaway in-memory PGlite; initial sandbox port denial was resolved by rerunning with local-listener permission.
- No visual or SEO changes; no schema, environment files, application code, production settings, mobile files or unrelated original working-copy edits changed.
- Architect: review the advisory table, approve the patch independently of outstanding major upgrades, and decide the Zod/Prisma/Blob follow-up before UI-001.
