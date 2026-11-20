# 08 · QA and Acceptance

The architect (Claude) reviews every task. **A task is not approved because ChatGPT says it is done.** Approval needs evidence.

## Review steps per task

1. Read the completion report against the task's acceptance criteria, line by line.
2. Read the diff. Reject changes outside the task's target files unless explained.
3. Re-run the five standard commands on the branch.
4. Open the Vercel preview: check the stated pages at 375 px and 1366 px, with keyboard only, and with reduced motion on for motion tasks.
5. Run axe-core (WCAG 2 A/AA, 2.1, 2.2 tags) on changed public pages. Zero violations required.
6. Security review: new inputs validated on the server? permission checks unchanged? no secrets, no new third-party origins without a CSP note?
7. Regression pass (below) for P0/P1 tasks.
8. Verdict: **Approved**, **Changes requested** (numbered, specific), or **Needs verification** (evidence or access missing). Record it in `09_PROJECT_STATUS.md`.

## Regression pass (core workflows)

| # | Workflow | Expected |
|---|---|---|
| 1 | Home → search "baptist" | Directory results, count shown |
| 2 | Directory filter: city + Sunday + morning | Results match; URL holds the filters |
| 3 | Church profile | Service times, directions link, save toggles and persists on reload |
| 4 | Map | Pins load; pin opens preview; list view works; wheel zoom works |
| 5 | Find a service, Events, Live, Campus, Collaborate, Denominations | Each 200, no console errors |
| 6 | Contact form: empty submit, then valid | Field errors, then success message (use text marked TEST; dismiss it in admin after) |
| 7 | Sign in by email link (owner) | Lands on admin or dashboard |
| 8 | Dashboard: edit a field on the hidden test listing | Saved message; public page (admin view) shows it |
| 9 | Billing page on the test listing | Monthly and yearly buttons present; checkout opens in Stripe **test** mode. Do not complete a purchase unless the task is about billing |
| 10 | `/api/health`, `/sitemap.xml`, `/robots.txt`, `/api/v1/churches?limit=2` | 200 with expected shape |

The preview shares the production database. Tests that write must use only the hidden listing "Stripe Test Church (delete me)" or clearly labeled TEST submissions that are then dismissed.

## Performance targets (not achievements until measured)

LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 at the 75th percentile on mobile. Until field data exists (needs analytics or the Chrome UX Report), report Lighthouse mobile lab numbers from the preview for `/`, `/directory`, one church profile, `/map`, and say they are lab numbers.

## Accessibility target

WCAG 2.2 AA. Automated: axe, zero violations. Manual each release: keyboard walkthrough of header, filters, map list view, one form; 400% zoom on a profile; contrast calculation for any new color pair. Screen-reader testing (VoiceOver) has not been done yet and is recorded as open.

## Definition of done for the program

All P0 and P1 tasks approved; no critical or unexplained high advisories; fonts and tokens live; homepage hero live with an owner-supplied photo; measured lab vitals reported; Search Console baseline recorded; status file current.
