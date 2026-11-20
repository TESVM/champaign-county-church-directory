# 09 · Project Status

Last updated: 2026-11-20 by the release engineer. Update this file whenever a task changes state.

## Summary

Owner authorized the remaining security changes on 2026-11-20 after security release #17. SEC-004 patches validation and development tooling; SEC-005 enforces the reviewed browser policy with per-request nonces. Local tests pass and both website dependency audits report zero findings. Release/Preview tracking will be linked in the follow-up review. Design work remains held. Vercel authenticator enrollment requires the owner; no account credentials are changed by this implementation.

## Tasks

| ID | Title | Priority | State | PR | Reviewer verdict |
|---|---|---|---|---|---|
| SEC-001 | Next.js critical advisory and triage | P0 | Implemented; security release #17 | [#17](https://github.com/TESVM/champaign-county-church-directory/pull/17) | Tests and CI passed; owner authorized release |
| SEC-004 | Patch shared validation and development tooling | P1 | Implemented; release verification in progress | Follow-up PR | 116 unit / 80 integration; mobile typecheck pass |
| SEC-005 | Enforce nonce-based browser CSP | P1 | Implemented; release verification in progress | Follow-up PR | Local built-server and Chrome blocking checks pass |
| UI-001 | Load brand fonts | P1 | Implemented in preview only; held from security release | [#15](https://github.com/TESVM/champaign-county-church-directory/pull/15) | Final QA pending |
| SEC-003 | Admin password sign-in hardening | P1 | Implemented; security release #17 | [#17](https://github.com/TESVM/champaign-county-church-directory/pull/17) | Tests and CI passed; owner authorized release |
| SEC-002 | CSP report-only | P1 | Implemented; reporting-only release #17 | [#17](https://github.com/TESVM/champaign-county-church-directory/pull/17) | Local header checks and Preview observation complete; enforcement deferred |
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

## Security release review — 2026-11-20

- User explicitly authorized review and release, superseding the earlier preview-only constraint for these security changes.
- Based on production main `5d7ece6`. No font, color, layout, motion, schema, database migration or deployment-script changes. Approved planning documents are included for future task continuity.
- Next.js/lint config patched to 15.5.29; undici 6.29.1. Scoped dependency overrides fix Prisma-config deepmerge-ts/effect and the Vercel OIDC CLI-config Zod chain, without a Prisma/framework/OIDC major upgrade. See `docs/DEPLOYMENT.md` for IDs, ranges, compatibility and the one remaining Zod 3 high finding.
- Administrator sign-in has per-client/per-account limits, safe audit rows and an optional default-on password-login switch. No real password or environment flag changed. The duplicate login email IDs are corrected with a caller-provided TextField ID, preserving form-data names and other callers.
- Review checks include the standard commands, isolated auth tests, field-label regression tests, local on/off login rendering, Preview inspection, no-migration diff and live before/after page/health checks. No production login attempts, form submissions or uploads will be used for verification.
- Production deployment and final live results are tracked in the release PR #17. The remaining Zod 3 migration, CSP enforcement and full ongoing accessibility/performance program remain separate work; no claim that all security work is complete.

- SEC-002 adds the approved report-only CSP, retaining all existing headers and public API CORS. No enforcing policy or report endpoint is added. Inline bootstrap/JSON-LD allowances remain until nonce support is separately reviewed.

### Release verification record

- Node 22.23.4: clean install / Prisma generation, schema validation, typecheck, lint, 110 unit tests, 80 integration tests and production build passed. GitHub CI and Vercel Preview passed for the security candidate; final docs-only update re-runs CI before merge.
- Fresh production-lockfile audit: 1 critical / 9 high. Release audit: 0 critical / 1 high; critical gate passes. The remaining high is the documented shared/root Zod 3 migration.
- Preview: `/`, `/directory`, `/map`, `/live`, `/events`, the Sheriff Temple profile, `/login`, and signed-out `/dashboard` inspected in authenticated Chrome. Map: 68 markers and loaded OpenStreetMap tiles; profile Google map iframe present. Dashboard redirects to login. Login labels point to distinct inputs at 375 and 1366 px with no horizontal overflow.
- Preview `/api/health`: database ok, 70 active churches, email/cron configured, Blob uploads configured. Preview billing is not configured; no billing changes made. Production billing was configured in the baseline.
- Captured app warning/error/info messages on the inspected routes: none; extension debug messages excluded. No report-only violations surfaced through the available browser log interface. This is not an exhaustive native DevTools security-console audit; CSP enforcement remains deferred.
- Direct unauthenticated Preview HTTP requests redirect to Vercel SSO, so they are not counted as application 200/header checks. Existing Preview protection remains enabled. Local built-server headers were verified, and public production headers/routes are checked after deployment.
- Owner sign-in/email delivery, paid checkout, real Blob upload, full axe/VoiceOver/performance tests and production log/drain monitoring are not claimed as completed. Auth/service behaviors are covered in the isolated database tests.

## Security follow-up — 2026-11-20

- User's "make necessary changes" instruction authorizes the previously explained Zod migration and CSP enforcement follow-up. Earlier plan limits on independent major upgrades are superseded only for these necessary, tested security changes.
- Root/shared/mobile app Zod 4.6.7 preserve public API and saved-record behavior. Expo's own internal Zod 3 stays outside the website audit scope; no blind SDK upgrade.
- Dev-only high/critical findings discovered by a complete audit were patched with Vitest 4.1.12, Vite 7.3.8, tsx 4.23.15 and compatible lint dependencies. Full website audit and production audit are both zero. CI now gates all website dependencies at high severity.
- CSP enforcement uses trusted request nonces, blocks untrusted inline scripts and event handlers, preserves JSON-LD, maps and existing headers/CORS. Styles and HTTPS image compatibility allowances remain documented. No design, schema, migration, billing, password or real environment change.
- 116 unit / 80 integration tests, website/mobile typecheck, lint and production build pass. Local HTTP verifies on/off login, all bootstrap/JSON-LD nonces, fresh nonce, spoof replacement and no-store. A real Chrome fixture confirms blocked inline script and blocked event handler with a working trusted script.
- Final Preview and production checks and the released commit are recorded in the linked follow-up PR; no claim that local tests alone prove deployment.
