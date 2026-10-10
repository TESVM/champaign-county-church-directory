# Phase 2 plan: map, Campus Faith, and community features

Audited 2026-10-10 against the live site (70 churches; 25 with photos; 47 with
service times; 52 with map coordinates — 18, including Sheriff Temple, have
none).

## Preserved (no behaviour change)
Directory and filters, Find a Service, city pages, church profiles, events
calendar, community help, saved churches, homepage spotlights, claim and
sign-in, verification labels, billing, musician-directory links, `/api/v1`.

## Phase 1 — this branch (preview before publishing)
1. **Explore the Map** (`/map`): Leaflet + OpenStreetMap tiles, accessible pins,
   preview cards (photo, city, next service, denomination, accessibility,
   livestream), the directory's filters plus claimed/verified, list/map toggle,
   opt-in "Near me" computed in the browser only.
2. **Geocoding**: US Census geocoder (free, public) on save and for missing
   coordinates (admin button + weekly cron). Unmatched addresses stay off the map.
3. **Campus Faith** (`/campus`): landing page, campus views (UIUC, Parkland,
   other/visiting), campus ministry directory and profiles, Student-Friendly
   Churches (church-entered tags with source labels), campus events (save,
   .ics), "New to Champaign-Urbana?" guide, free List Your Organization form,
   simple event submission, admin review queue (approve / reject / request
   changes / mark verified).
4. **Featured placement**: an admin-controlled, visibly labelled "Featured"
   flag. Sheriff Temple is featured on the map and in campus collections where it
   qualifies. Search order, distance sort and "next service" stay neutral.

## Phase 1 status
Live since 2026-10-10 (PR #4).

## Phase 2 — branch feat/phase2-live-collab
1. **Worship Live & Next** (`/live`): "Live now" only when the church's own
   team (or staff) presses "We're live now" in the dashboard; it switches off
   after 1–4 hours. Next services across the county from listed times.
   Recent services from the church's public YouTube channel (public RSS feed,
   no API key). Live switch and recent videos follow the Enhanced livestream rule.
2. **Church Collaboration Board** (`/collaborate`): nine categories, posts by
   church team members (free) or staff for a ministry, reviewed before
   publishing, required end date (max 90 days), take-down by poster, anonymous
   reports (one per person, stored as a keyed hash) that hide a post for review
   at 3, admin queue at `/admin/collaboration`.
3. **Profiles**: Live badge, "Watch online" with latest service, "Ministry
   opportunities" from the board, photo gallery (8 photos; credit and
   permission required; uploads Enhanced, links free).

## Not doing
Public prayer requests; unattributed or invented organization details;
publishing student contact details without explicit consent; implying a church
is "live" without a confirmed source.
