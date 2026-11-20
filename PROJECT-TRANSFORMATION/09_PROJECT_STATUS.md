# 09 · Project Status

Last updated: 2026-11-20 by the release engineer. Update this file whenever a task changes state.

## Summary

Owner authorized finishing review and releasing security work on 2026-11-20. A security-only release candidate is prepared directly against main: SEC-001, SEC-003, SEC-002 and the sign-in label fix. UI-001 fonts remain outside the production release. Candidate audit is 0 critical / 0 moderate / 1 high (Zod 3, documented in deployment notes). Production release checks are in progress; final deployment evidence will be recorded in the release review.

## Tasks

| ID | Title | Priority | State | PR | Reviewer verdict |
|---|---|---|---|---|---|
| SEC-001 | Next.js critical advisory and triage | P0 | Reviewed security release candidate | — | — |
| UI-001 | Load brand fonts | P1 | Implemented in preview only; held from security release | [#15](https://github.com/TESVM/champaign-county-church-directory/pull/15) | Final QA pending |
| SEC-003 | Admin password sign-in hardening | P1 | Reviewed security release candidate | Release PR pending | Release checks in progress |
| SEC-002 | CSP report-only | P1 | Implemented; final Preview observation pending | Release PR pending | — |
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
- Production deployment and final results pending the release PR/CI. The remaining Zod 3 migration, CSP enforcement and full ongoing accessibility/performance program remain separate work; no claim that all security work is complete.

- SEC-002 adds the approved report-only CSP, retaining all existing headers and public API CORS. No enforcing policy or report endpoint is added. Inline bootstrap/JSON-LD allowances remain until nonce support is separately reviewed.
