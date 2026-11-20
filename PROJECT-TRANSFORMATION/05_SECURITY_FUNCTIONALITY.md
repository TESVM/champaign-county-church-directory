# 05 · Security, Functionality, Reliability

Scope: defensive review of the repository and non-invasive checks of the live site. **No penetration testing was performed and none is authorized.** ChatGPT must not test against production beyond ordinary page loads.

## 1. Verified findings

| ID | Risk | Finding | Fix | Task |
|---|---|---|---|---|
| S1 | **Critical** | `next@15.5.27` falls in a critical advisory range (10.0.0 to 15.5.27, fix available). | Upgrade to the patched 15.x release; run full tests and build. | SEC-001 |
| S2 | High | 8 further high advisories: `prisma`, `@prisma/config`, `zod` (<4.6.6), `undici`, `deepmerge-ts`, `@vercel/blob`, `@vercel/cli-config`, `@vercel/oidc`. | Triage each: read the advisory, decide patch, override, or accept with a written reason. `npm audit` suggests **downgrading** `@vercel/blob` to 2.4.0 and a **major** jump for zod; neither is to be applied blindly. | SEC-001 |
| S3 | High | CI's `npm audit --audit-level=critical` gate will fail every new pull request until S1 is fixed. | Fixed by S1. | SEC-001 |
| S4 | Medium | No Content-Security-Policy. | Ship `Content-Security-Policy-Report-Only` first, then enforce. | SEC-002 |
| S5 | Medium | Admin password sign-in is live. IP rate limit exists (10 per 15 min, `lib/services/auth.ts`); per-account limiting not found (verify). One shared password is weaker than magic links. | Add a per-account limit and audit entries for failures; let the owner switch password sign-in off with an environment flag. | SEC-003 |
| S6 | Medium | All pages `force-dynamic`, `no-store`: database outage equals site outage; higher latency and cost. | Cache public reads with tags, invalidate on writes. | PERF-001 |
| S7 | Low | Hidden test listing with a Stripe test subscription in production. | Admin-only hard delete for listings with zero history, or leave hidden. Owner decision. | OPS-001 |
| S8 | Low | `SUPPORT_EMAIL` not set on 2026-10-10 (verify); footer and accessibility page then show no email. | Owner sets it in Vercel. | OPS-001 |
| S9 | Low | Stripe is in test mode with test keys in production. Not a vulnerability; churches cannot pay. | Owner activates Stripe; then repeat product, prices (monthly and annual), webhook, and portal in live mode and replace four Vercel variables. | OPS-002 (owner + architect) |
| S10 | Info | No error monitoring beyond Vercel logs. | Add Sentry or Vercel's log drains if the owner wants alerts. P3. | — |

## 2. Controls confirmed in code (do not weaken)

Explicit-actor permission checks in every service (`lib/actor.ts`); hashed session tokens; single-use magic links; keyed-hash rate limits on public forms; Stripe signature verification with replay window and idempotent event table; upload type sniffing and 4 MB cap; `https`-only image links; `javascript:` links rejected; image optimizer allow-list; HSTS, nosniff, frame deny, referrer and permissions policies; moderation on all public submissions; audit log on staff actions; honeypots on public forms; secrets only in Vercel (never committed).

## 3. Functionality findings

| ID | Finding | Action |
|---|---|---|
| F1 | `/faq` is 404 | Build it (SEO-002) |
| F2 | Old routes 404 (`/musicians`, `/create-profile`, `/terms-privacy`, `/church-search-request`); empty directories may remain in `app/` | Remove empty directories; add redirects only if Search Console shows traffic (SEO-003) |
| F3 | Only `/directory` has a loading state | Add `loading.tsx` for slow routes (MOT-001) |
| F4 | Admin cannot delete a listing | See S7 |
| F5 | Collaboration Board, Live, Events are empty for visitors because no church is claimed | Growth work in 06, not a code defect |
| F6 | Mobile app iOS build blocked on Xcode 27; Android emulator needs an arm64 image | Owner actions; out of this backlog |

No dead buttons or simulated features were found in the areas exercised in October (forms, claim, billing in test mode, map, events, campus, collaboration). Areas **not** re-tested in this audit: team invitations, community-help moderation, weekly website review. QA plan covers them.

## 4. Test requirements

Every task runs: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:integration`, `npm run build`. Security tasks add tests that prove the control (for example: a blocked sign-in after N failures; a CSP header present on `/`).

## 5. Backup and recovery

Neon provides point-in-time restore on paid plans; the plan in use is unknown. Owner to confirm retention. Vercel Blob has no versioning: photo deletions are permanent. Document both in `docs/DEPLOYMENT.md` (OPS-001).

## 6. Order of work

SEC-001 first (it blocks all other pull requests). Then SEC-002 in report-only mode, SEC-003, PERF-001. Visual work may proceed in parallel once SEC-001 is merged.
