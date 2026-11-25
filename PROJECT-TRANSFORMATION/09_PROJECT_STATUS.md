# 09 · Project Status

Last updated: 2026-11-24 (live site, settings and listing data changes; see the 2026-11-24 section). Update this file whenever a task changes state.

## Summary

Owner authorized the remaining security changes on 2026-11-20 after security release #17. SEC-004 patches validation and development tooling; SEC-005 enforces the reviewed browser policy with per-request nonces. Local tests pass and both website dependency audits report zero findings. Release status and final evidence are tracked in [security follow-up #18](https://github.com/TESVM/champaign-county-church-directory/pull/18). Design work remains held. Vercel authenticator enrollment requires the owner; no account credentials are changed by this implementation.

## Tasks

| ID | Title | Priority | State | PR | Reviewer verdict |
|---|---|---|---|---|---|
| SEC-001 | Next.js critical advisory and triage | P0 | Implemented; security release #17 | [#17](https://github.com/TESVM/champaign-county-church-directory/pull/17) | Tests and CI passed; owner authorized release |
| SEC-004 | Patch shared validation and development tooling | P1 | Implemented; release tracked in #18 | [#18](https://github.com/TESVM/champaign-county-church-directory/pull/18) | 116 unit / 80 integration; mobile typecheck pass |
| SEC-005 | Enforce nonce-based browser CSP | P1 | Implemented; release tracked in #18 | [#18](https://github.com/TESVM/champaign-county-church-directory/pull/18) | Local built-server and Chrome blocking checks pass |
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
| Sign-up guide PDF for church leaders made 2026-11-24 (kept outside the repo); share with churches | Open |
| Decide: analytics provider; Google Business Profile; delete or keep hidden test listing | Open |
| Set `SUPPORT_EMAIL` in Vercel | Done 2026-11-24: support@champaigncountychurches.com (Production) |
| Service times for listings that had none: 14 of 23 added 2026-11-24; 9 still need a call or a current source (see sections) | Open |
| Decide how admin-posted events become public (complimentary Enhanced vs. code change) | Open |
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
- Final Preview and production checks and the released commit are recorded in follow-up PR #18; no claim that local tests alone prove deployment.

### Campus CSP coverage follow-up

Live verification after #18 identified two direct campus JSON-LD tags outside the shared helper. Both now use the existing nonce-bearing, HTML-safe JsonLd component. A server-render regression verifies nonce propagation and malicious closing-tag escaping; a source audit guards every direct inline script in app/components. Vitest uses the automatic JSX runtime to match Next when rendering server components. Checks: 118 unit / 80 integration, typecheck and lint pass; build/Preview/release evidence is tracked with #18 and its linked campus follow-up PR. No new runtime dependency, UI, schema or environment change.

## Live site and data changes — 2026-11-24

Settings (Vercel, Production; redeployed, no code change):
- `SUPPORT_EMAIL` = support@champaigncountychurches.com. Shows on Contact, footer, Privacy, Terms and Accessibility, and is the reply-to on site email.
- `ADMIN_NOTIFY_EMAIL` = support@champaigncountychurches.com. All staff alerts (contact form, claims, corrections, submissions, campus and Collaboration Board reviews) now go to that inbox instead of `ADMIN_EMAIL`. The mailbox is hosted on the owner's self-hosted MailFlare.

Code merged to main:
- [#20](https://github.com/TESVM/champaign-county-church-directory/pull/20) American spelling in visitor-facing text ("Church or organization" on Contact, authorized, neighbor, color, labeled, canceled). Stored values, URL params and identifiers unchanged.
- [#21](https://github.com/TESVM/champaign-county-church-directory/pull/21) `snippet()` helper: shortened descriptions end on a whole word with "…" (card `shortDescription` and page meta descriptions).

Site audit (122 sitemap pages): no broken pages, internal links or images; no console errors on sampled pages; no misspellings in page text; phone-width layout clean on main pages.

Listing edits made in the admin editor (each recorded in the audit log):
| Church | Change | Source |
|---|---|---|
| Pilgrim Missionary Baptist | Website https → `http://www.pilgrimmb.org/` (host serves a WP Engine certificate on https) | Site loads over http with 1310 N 6th St |
| St. Joseph United Methodist | Website `sjumchurch.org` (down for everyone) → facebook.com/trulywelcome; also set as Facebook link | Facebook page shows 205 N 3rd St |
| Faith Church of Urbana | Website `fccurbana.org` (down for everyone) → facebook.com/FCCUrbana; also set as Facebook link | Facebook page shows 2111 N Willow Rd |
| Salem Baptist | Website `salembaptistchurchcu.org` (down) → its Facebook page (already its Facebook link) | Facebook page shows 500 E Park St |
| Twin City Apostolic W.O.H. | Dead Tripod website link removed; phone kept | No current site found |
| Sheriff Temple AOH | "Bibile Study" → "Bible Study"; Senior Bible Study at the Haven end time 6:00 AM → 6:00 PM | Obvious typos; confirm end time with the church |

Facebook links entered in the Facebook field only show publicly on Enhanced profiles, so the Facebook page was also put in the Website field. St. Joseph UMC's listed email (office@sjumchurch.org) uses the dead domain and may bounce; no replacement found.

Service-time scan of all 70 listings: no other end-before-start times, odd hours, duplicates or misspellings. 23 listings have no service times and show "Service times have not been listed yet": bible-baptist-church-champaign, canaan-baptist-church-urbana, center-of-hope-champaign, champaign-church-of-christ, church-of-the-living-god-champaign, community-united-church-of-christ-champaign, emmanuel-memorial-episcopal-champaign, exceed-church-rantoul, first-baptist-church-urbana, grove-street-cogic-champaign, liberty-temple-cogic-champaign, macedonia-baptist-church-champaign, midwest-believers-church-champaign, mount-calvary-missionary-baptist-church-champaign, mt-olive-missionary-baptist-church-champaign, new-foundation-missionary-baptist-church-champaign, new-free-will-baptist-church-champaign, new-horizon-church-champaign, new-life-of-champaign, temple-baptist-church-champaign, twin-city-bible-church-urbana, united-in-christ-church-champaign, unity-baptist-church-champaign.

Events: 15 events taken from the churches' own 2026 pages were posted by the admin for First UMC Champaign (6), Emmanuel Memorial Episcopal (4), Meadowbrook Community (3), Pennsylvania Avenue Baptist (1) and University Baptist (1). The public calendar only lists events from entitled (Enhanced) churches, so they are saved but hidden. A complimentary Enhanced trial was granted to those five churches and removed the same day at the owner's request (both in the audit log). Meadowbrook's Christmas services have no times yet.

## Service times added — 2026-11-24

Times were added in the admin editor only where the church's own website states them (each save is in the audit log). Third-party directories and AI search summaries were not used as sources.

| Church | Times added | Source |
|---|---|---|
| Bible Baptist | Sun 9:00 AM Sunday School, 10:15 AM Worship; Wed 6:15 PM Awana & Youth, 6:30 PM Midweek Service & Bible Study; Thu 10:00 AM and 6:00 PM Bible Study | bbccu.org |
| Canaan Baptist | Sun 8:30 AM Christian Education, 9:45 AM Praise & Worship; Wed 7–8 PM Bible Study | canaanbaptistchurchurbana.org/services |
| Champaign Church of Christ | Sun 10:30 AM Family Worship | champaignchurch.org/about |
| Community UCC | Sun 10:15 AM Worship | community-ucc.org |
| Emmanuel Memorial Episcopal | Sun 8:00 AM Mass (traditional), 10:15 AM Mass (contemporary), 5:30 PM Evensong; Wed 12:15 PM Mass | church's service-times page and calendar (its homepage misprints "10:30 p.m.") |
| Midwest Believers | Sun 9:00 and 10:30 AM; Wed 7:00 PM | midwestbelieverschurch.org |
| Mount Calvary MBC | Sun 10:00 AM Sunday School, 11:00 AM Worship; Wed 6:30 PM Intercessory Prayer, 7:00 PM Bible Study | mtcalvarychampaign.org/worship |
| New Horizon | Sun 10:30 AM | newhorizonchurch.org |
| New Life of Champaign | Sun 10:30 AM Family Worship; Wed 7:00 PM Worship & The Word / Student Connect | newlifeofchampaign.com/schedule-events |
| Temple Baptist | Sun 11:00 AM (also on YouTube) | tbcchampaign.com |
| Twin City Bible | Sun 9:00 AM Sunday School (school year), 10:00 AM Worship (in person and Zoom); Wed 7–8 PM Prayer (Zoom) | tcbc.cc |
| Unity Baptist | Sun 9:00 AM Sunday School, 10:15 AM Worship; Wed 6–7 PM Prayer Meeting | unitybaptistchampaignil.com |

Still without times (11): exceed-church-rantoul (only a June 2026 Facebook post for Wed 6 PM Bible study), first-baptist-church-urbana (newest source a 2023 Facebook post), grove-street-cogic-champaign, liberty-temple-cogic-champaign, macedonia-baptist-church-champaign, mt-olive-missionary-baptist-church-champaign, new-foundation-missionary-baptist-church-champaign, new-free-will-baptist-church-champaign, united-in-christ-church-champaign (Facebook-only or no web presence; needs a phone call), plus the two address conflicts below.

Address conflicts found (resolved later the same day; see "Addresses updated" below):
- center-of-hope-champaign: the church's site says it "has officially moved" to 1409 W. Dublin Street, Urbana (Sunday 11:00 AM, Wednesday 7 PM class). Listing still says 409 E Grove Street, Champaign.
- church-of-the-living-god-champaign: the church's site gives 312 E. Bradley Ave (Sunday 11:00 AM; Wednesday Bible study 1:00 and 6:00 PM). Listing says 1109 N 4th St.
- united-in-christ-church-champaign: its Facebook page gives 1109 N Fourth St (the address the directory has for Church of the Living God). Listing says 801 Stratford Drive.

## Addresses updated — 2026-11-24

Changed in the admin editor at the owner's request, using each church's own public source. The editor re-geocoded each map pin automatically.

| Church | Old address | New address | Source | Also added |
|---|---|---|---|---|
| Center of Hope | 409 E Grove Street, Champaign 61820 | 1409 W. Dublin Street, Urbana 61801 | cohdministries.org ("has officially moved to our new home") | Sun 11:00 AM service; Wed 7:00 PM Through the Bible in One Year class |
| Church of the Living God | 1109 N 4th St, Champaign 61820 | 312 E. Bradley Ave, Champaign 61820 | thechurchofthelivinggod.com | Sun 11:00 AM worship (in person or online); Wed Bible study 1:00 and 6:00 PM |
| United in Christ | 801 Stratford Drive, Champaign 61821 | 1109 N. Fourth Street, Champaign 61820 | facebook.com/UnitedInChristChampaign | No times found |

Still without service times (9): exceed-church-rantoul, first-baptist-church-urbana, grove-street-cogic-champaign, liberty-temple-cogic-champaign, macedonia-baptist-church-champaign, mt-olive-missionary-baptist-church-champaign, new-foundation-missionary-baptist-church-champaign, new-free-will-baptist-church-champaign, united-in-christ-church-champaign. The Center of Hope listing slug still ends in "-champaign" although the church is now in Urbana.
