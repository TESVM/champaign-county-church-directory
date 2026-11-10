# 04 · SEO and Growth Plan

No ranking, traffic, or AI-citation outcome is promised. Keyword ideas below come from the site's real content and common search patterns; **no keyword-volume tool was available**, so volumes are unknown and must be confirmed in Search Console after 30 days.

## 1. Where things stand (verified)

In place: server-rendered HTML on every public page; unique titles and descriptions; canonicals; `sitemap.xml` (118 URLs) and `robots.txt`; `WebSite`, `Organization`, `Church`, `BreadcrumbList`, `ItemList` structured data; city pages (`/cities/[slug]`); denomination pages (`/denominations/[slug]`); campus pages; Search Console (domain property) and Bing verified, sitemap submitted 2026-10-14.

Unknown: how many pages Google has indexed; any query data. First action is to read Search Console (owner or ChatGPT with the owner's browser).

## 2. Technical SEO changes

| ID | Change | Task |
|---|---|---|
| T1 | `Event` structured data on `/events` and church profiles (name, startDate with offset, location, organizer, image = flyer when present) | SEO-001 |
| T2 | FAQ page at `/faq` (currently 404) with real answers and `FAQPage` data | SEO-002 |
| T3 | Cache public pages so crawlers get fast, stable responses | PERF-001 |
| T4 | Fonts via `next/font` (removes layout shift risk, improves LCP text) | UI-001 |
| T5 | Hero and card images with correct `sizes` and `priority` | UI-003, UI-004 |
| T6 | Link audit: crawl internal links, fix or redirect any that 404 | SEO-003 |
| T7 | `noindex` on thin utility pages (`/saved`, `/login`, `/collaborate/new`), confirm in robots meta | SEO-003 |
| T8 | `lastModified` on city and denomination sitemap entries | SEO-003 |

No framework change is needed: the App Router already server-renders.

## 3. Search intent map

| Intent (examples) | Landing page | Status |
|---|---|---|
| "churches in Champaign IL", "churches in Urbana" | `/cities/champaign`, `/cities/urbana` | exists; add intro copy with facts drawn from data (count, denominations, earliest and latest Sunday service) |
| "Baptist church Champaign", "Methodist church Urbana" | `/denominations/[slug]` | exists |
| "church service times Sunday Champaign", "evening church service near me" | `/find-a-service` | exists; add indexable preset links (Sunday morning, Sunday evening, Wednesday) |
| "churches near UIUC", "campus ministries UIUC" | `/campus/uiuc`, `/campus/organizations` | exists; needs more listed ministries |
| "churches near Parkland College" | `/campus/parkland` | exists |
| "church live stream Champaign" | `/live` | exists; thin until churches opt in |
| "food pantry Champaign church", "free meals Urbana" | `/resources` | exists; depends on church submissions |
| "[church name] service times / address" | `/churches/[slug]` | exists; strongest long-tail asset |
| "how to find a church", "what to wear to church", "first time visiting a church" | new guides | SEO-004 |
| "church events Champaign this weekend" | `/events` | exists; needs events |

## 4. Content recommendations

Write for people; every fact must come from the database or a cited public source.

1. **City page intros** generated from data, not hand-written claims.
2. **Three guides** (owner approves text before publishing): "Visiting a church for the first time: what to expect", "How to choose a church in Champaign-Urbana", "Finding a church as a college student" (the last already exists at `/campus/new-to-champaign-urbana`; link it, do not duplicate).
3. **FAQ**: How are listings checked? What does "Details checked" mean? How do I fix my church's listing? Is listing free? What does Enhanced include? How do I report a problem?
4. No doorway pages: do not create a page for every city-denomination pair. Only pages with at least two churches (already the rule).

## 5. Local SEO

The directory is an online service, not a storefront. A Google Business Profile is appropriate only as a **service-area business** under the owner's real business (TechEd and Solutions), if the owner wants one. Owner decision; do not create it for him.

Higher-value local actions:
- Each church's own Google Business Profile is what appears in "churches near me" map results. The directory cannot rank there; it can help churches by reminding them (dashboard tip) to keep that profile accurate and to link their listing.
- Backlinks from real local sites: church websites (badge already built), UIUC and Parkland student-life resource pages, the visitor bureau, libraries, local news. Owner outreach; ChatGPT prepares a one-page outreach kit (SEO-005).
- Reviews: **do not add star ratings or reviews of churches.** Out of scope and a moderation risk.

## 6. AI search readiness

- Keep facts in plain HTML text with clear headings (already true).
- Complete structured data (T1, T2).
- State provenance and dates on listings (already true): answer engines favor sourced, dated facts.
- Add `/llms.txt` summarizing what the site is and linking to key sections (cheap, optional, P3).
- The public JSON API (`/api/v1`) already exposes clean data; document it on the About page.

## 7. Click-through and conversion

Primary conversions (visitor): directions click, phone click, website click, save, calendar add. These are already counted per church in `ActivityDaily`.
Primary conversions (church): claim submitted, claim approved, profile completed, subscribed.

Title pattern stays "{Page} | Champaign County Churches". Church titles: "{Church} — {City}, IL | service times and directions" (test length under 60 characters; truncate the suffix first).

## 8. Measurement

1. **Search Console**: record baseline on day 0 (indexed pages, impressions, clicks, top queries).
2. **Analytics**: recommend **Vercel Web Analytics** (cookieless, no consent banner needed, one script) or Plausible. GA4 only if the owner needs Google Ads later. **Owner approval required**, and the privacy policy must be updated in the same change (SEO-006).
3. **Events**: `claim_started`, `claim_submitted`, `checkout_started`, `search_performed`, `filter_used`, `map_pin_opened`.

| Day | Review |
|---|---|
| 30 | Indexed pages vs 118 submitted; crawl errors; first queries; fix coverage issues |
| 60 | Top 20 queries and landing pages; rewrite titles with low click-through; count claims |
| 90 | Compare to baseline; decide on guides 4-6 and whether denomination-by-city pages are justified by real queries |

## 9. Priorities and acceptance

P1: SEO-001, SEO-003, SEO-006 (after approval), PERF-001. P2: SEO-002, SEO-004, SEO-005. Acceptance for each is in `07_CHATGPT_TASKS.md`; structured data must pass Google's Rich Results Test, and no page may claim anything not in the data.
