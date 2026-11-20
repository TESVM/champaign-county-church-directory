# 06 · Customer Experience and Conversion

## 1. Journeys

### A. Visitor looking for a church (primary)

| Stage | Today | Friction | Change |
|---|---|---|---|
| Discover | Search engine → church or city page; some homepage | Site is new; little traffic data | SEO plan; measure |
| Understand | Homepage explains the directory in text | No picture of a real place; search box competes with three panels | Photo hero, one headline, one search, three actions (UI-003) |
| Trust | "Details checked" dates, sources | Good. Keep and make the legend one tap away | Link "How listings are checked" from every card footer and the FAQ |
| Choose | Directory filters in a tall sidebar; most cards have no photo | Filters push results down on mobile; gradient placeholders look unfinished | Filter bar and mobile sheet (UX-002); photo-forward cards (UI-004); photo campaign |
| Act | Directions, call, website, save, add to calendar | Works | Keep; add a sticky action bar on mobile profiles (UX-003) |
| Feedback | Saved heart, calendar file | Save gives little confirmation | Motion M8 |
| Return | Saved list (device only), events | Nothing reminds them | Out of scope: no accounts for visitors by design |

### B. College student

Finds `/campus` → picks campus → ministries, churches, events. Friction: few ministries (5, public-source), no events. Change: outreach to ministry leaders (owner), "List your organization" already built.

### C. Church leader (the business journey)

| Stage | Today | Friction | Change |
|---|---|---|---|
| Discover | Sees own listing, or hears from the owner | **No one has claimed yet (0 of 70)** | Outreach kit and a clearer on-page prompt (UX-004) |
| Understand | "Part of this church's leadership?" card low on the profile; `/for-churches` | Easy to miss; value not shown with a picture | Prompt near the top for unclaimed listings; For churches page with real screenshots (P8) |
| Trust | Free forever, reviewed claims | Good | State "Free. No card needed." on the claim button |
| Act | Claim form → admin approves → magic link | Works | Show "what happens next" after submit; email already sent |
| Value | Dashboard checklist | Good | First-run: three steps (service times, visit info, photo) |
| Pay | Billing page, monthly or yearly | Stripe not live | Owner activates Stripe |
| Return | Events, Live, Collaborate | Needs reasons to come back | Monthly "your listing had N views" email (P2, GROW-001) |

### D. Administrator

Queues work. Friction: no bulk actions, no delete, no single "needs attention" view. Low priority while volume is low.

## 2. Navigation change

Desktop today: 8 links + 2 buttons. Proposed (UX-001):

- **Find a church** ▾ Directory · Map · Find a service · Cities · Denominations
- **What's happening** ▾ Events · Live & Next · Community help
- **Campus Faith**
- **For churches** ▾ Free and Enhanced · Claim your listing · Collaboration Board
- Right side: Saved (heart icon with label), Sign in / My church

Mobile: full-height sheet with the same four groups expanded, 48 px rows, focus trapped, Escape closes.

## 3. Conversion measures (no manipulation)

No countdown timers, fake scarcity, pop-ups, or pre-checked boxes. Improvements are clarity and fewer steps:

1. Claim prompt visible without scrolling on unclaimed listings.
2. One-line value statement on the claim button.
3. Annual plan shown as a plain comparison ("$319 a year, one month free").
4. Photo coverage: an admin report of listings without photos, and an email template asking each church for one photo (owner sends).

## 4. Metrics

Baseline first (SEO-006). Then track: claim submissions per month, share of listings with photo, visit info, and service times; directions and website clicks per profile view.

## 5. Assignments

UX-001 navigation · UX-002 filters · UX-003 mobile action bar · UX-004 claim prompt · GROW-001 monthly listing email (P2, needs owner approval to send email). Full specifications in `07_CHATGPT_TASKS.md`.
