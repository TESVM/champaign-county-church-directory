# 09 · Project Status

Last updated: 2026-11-19 by the implementing engineer (SEC-003). Update this file whenever a task changes state.

## Summary

SEC-001 implemented on `task/sec-001-next-upgrade` in an isolated checkout based on the documentation branch (PR #13 remains open). No production deployment or production database write performed. Local typecheck/lint, 104 unit tests and 70 integration tests pass. Critical audit gate passes (1 critical / 8 high → 0 critical / 7 high). Local and GitHub CI checks pass. After the owner-authorized Preview configuration repair and Preview-only redeploy, all five required routes load successfully in authenticated Chrome; remaining dependency decisions are documented in `docs/DEPLOYMENT.md`. The owner approved proceeding on 2026-11-19. UI-001 is implemented on a separate branch stacked on SEC-001; production merges remain pending.

## Tasks

| ID | Title | Priority | State | PR | Reviewer verdict |
|---|---|---|---|---|---|
| SEC-001 | Next.js critical advisory and triage | P0 | **Awaiting architect review / dependency decisions** | [#14](https://github.com/TESVM/champaign-county-church-directory/pull/14) (base: #13) | Pending architect review |
| UI-001 | Load brand fonts | P1 | Implemented and smoke-tested; awaiting review | [#15](https://github.com/TESVM/champaign-county-church-directory/pull/15) (base: #14) | Pending review |
| SEC-003 | Admin password sign-in hardening | P1 | Implemented; checks in progress | Pending | Pending review |
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

## SEC-001 Preview configuration repair (owner authorized)

- The owner explicitly authorized Preview-only configuration and redeployment, then confirmed making existing Preview credentials available to all Preview branches.
- Removed `feat/production-launch` restrictions from the Preview entries for `CRON_SECRET` and `RESEND_API_KEY`; secret values were preserved without revealing them. Separate Production entries were untouched. `EMAIL_FROM` was already available to Preview and needed no edit.
- Redeployed source commit `ad3aa58` to **Preview**, deployment `dpl_5bYqMifwVy9KMDfHgAjsTLSof7MC`, ready after 1m 8s. No promotion or merge. Production settings and live deployment unchanged.
- Authenticated browser checks passed: `/`, `/directory` (70 churches), `/map` (70 churches, 2 unmatched addresses), `/churches/sheriff-temple-aoh-church-of-god`, `/api/health`. The health response reports `status: ok`, database ok, 70 active churches, email configured, cron configured and Blob uploads. Numeric HTTP statuses were not independently captured in this browser check.
- No browser console errors captured during the directory check. This is a smoke test, not full axe or authenticated workflow verification. No forms, email sends, uploads, billing transactions or listing edits were performed.
- The preview continues to share the production database; only read-only checks were performed. Future Preview branches can use the existing Preview email credential as approved by the owner.
- Tested deployment: https://champaign-county-church-directory-ljugzblih-tesvms-projects.vercel.app/ . Subsequent changes in this status note are documentation only; runtime source remains the tested patch.

## UI-001 — Brand fonts (2026-11-19)

- Owner said "approved" after the SEC-001 review handoff; treated as approval to proceed with the font task. PRs #13 and #14 remain open. UI-001 is stacked on `task/sec-001-next-upgrade` rather than merging or deploying production. Its merge dependency on SEC-001 remains outstanding.
- Only runtime changes: `app/layout.tsx` loads variable Fraunces and Source Sans 3 from `next/font/google` with Latin subsets, swap, automatic fallback adjustment and the approved CSS variables; adds their variable classes to `<html lang="en">`. `app/globals.css` removes the string-only font variables and applies `font-sans` to body. Existing Tailwind mappings are already correct and unchanged.
- Next 15's Google loader accepts `weight: "variable"`; explicit numeric range strings are not valid. Variable fonts cover the approved heading/body weights; existing component weights, sizes, colors and content remain unchanged.
- Node 22.23.4: clean install, typecheck, lint, 104 unit tests, 70 integration tests and production build all passed. Build generated local WOFF2 font assets and adjusted fallback faces. No new dependencies, schema edits, environment changes or production writes.
- Before/after screenshots captured and reviewed for homepage/profile at 375 and 1366 px. All eight page/width checks passed for home, directory, profile and signed-out admin redirect: h1 computes to Fraunces; body computes to Source Sans 3; no horizontal overflow. Browser font preloads are same-origin WOFF2. Compiled CSS has no Google font origins. Full network recording, CLS measurement and axe audit were not run; no results are claimed for those checks.

- UI-001 tested source commit `c0bc469`, automatic Vercel Preview deployment `dpl_8bro63SivZqRdXw6JLD5VToEMqC3` passed. Preview: https://champaign-county-church-directory-git-ta-aaa883-tesvms-projects.vercel.app/ . No browser console errors captured. No form submissions or database mutations. Documentation-only follow-up records these results.

## SEC-003 — Administrator password sign-in (2026-11-19)

- Owner instructed "move forward" after UI-001. SEC-003 is isolated on `task/sec-003-admin-signin`, stacked on the font branch; upstream merge dependencies remain outstanding. No production merge or environment-value change.
- Added the planned 5-attempt normalized-email limit per 15-minute fixed window alongside the existing 10-attempt client limit. Expected authentication failures return null, so the existing server action continues to show one generic failure message; `app/actions.ts` needed no change.
- Failed attempts are audited as anonymous with reason and HMAC-hashed client key; no submitted email, password or full IP. Successful password sign-in is audited against the administrator's user record. Both constant-time comparisons and existing session/email-link implementations are preserved.
- `ADMIN_PASSWORD_LOGIN` is validated as on/off, defaults on, and off refuses credentials before comparison and hides the password form. Only the `.env.example` template is documented; no configured environment value changed.
- Ten new integration cases passed, including account-limit bypass attempts from new clients, IP-limit preservation, audit privacy, flag off, default/invalid flag values, window reset and email-link regression. Local typecheck/lint, 104 unit tests and 80 integration tests passed. Production build passed. Local HTTP checks returned 200 with the flag on and off: the password form is visible only when on; email sign-in stays visible in both. Preview verification is pending.
