# 02 · Design Direction

Working title for the direction: **"Sunday morning light."** Warm, real, local. The site should feel like walking up to a church on a bright morning: a real building, real people, a clear door to walk through. Photographs carry the emotion; the interface stays quiet and legible.

Owner preference on record: **real photographs and crisp type. No illustrated or cartoon styling.**

## 1. Brand personality

Trustworthy (dated, sourced information), welcoming (plain words, big touch targets), local (Champaign County places, not generic stock), calm (few colors, generous space).

## 2. Color

Align the interface with the logo, which is deep green, gold, and charcoal. Keep the existing `brand` green scale (already in use everywhere) and add gold as the accent. Retire coral (`rose`) for anything but legacy decoration.

| Token | Value | Use |
|---|---|---|
| `brand-900` | `#12363e` (existing) | headers, primary buttons, footer |
| `brand-700` | `#1f5f63` (existing) | links, icons, eyebrow text |
| `brand-50/100` | existing | tinted panels |
| `gold-500` (new) | `#c8861a` (sampled from the logo) | **decoration only**: rules, icon fills, the "Featured" star, focus accents on dark |
| `gold-700` (new) | start at `#8a5a0a` | gold-colored **text** on white. Must measure at least 4.5:1; darken until it does |
| `clay` | `#8f4529` (existing) | warm end of dark gradients behind white text |
| `ink` | `#102327` (existing) | body text |
| `canvas` | `#eef5f7` (existing) | page background. Replace the three-layer body gradient with a flat canvas plus one soft top glow |

Rules: body text at least 4.5:1, large text and UI outlines at least 3:1, never white text on gold-500 or coral. Every new pairing is checked by calculation, not by eye.

**Themes:** the site is deliberately light-only (`color-scheme: only light`, set in October to stop Android auto-darkening). **Do not build a dark theme in this program.** Record tokens semantically so one can be added later.

## 3. Typography

The intended fonts were never loaded (audit finding). Load them properly with `next/font/google`:

- **Display:** Fraunces (variable, weights 400-600). Headlines only.
- **Body/UI:** Source Sans 3 (variable, 400-700).

Scale (mobile → desktop): display 36 → 60 px, h1 30 → 44, h2 24 → 32, h3 20 → 24, body 16 → 17, small 14, caption 12 (never smaller). Line height 1.6 body, 1.15 display. Maximum line length 70 characters.

## 4. Layout and components

- Grid: 4 columns under 640 px, 8 to 1024, 12 above; max content width 1280 px; gutters 16 / 24 / 32.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96. Section rhythm 64 px mobile, 96 px desktop.
- Radius: 12 (inputs), 20 (cards), 28 (feature panels), full (buttons, chips). The current 36-40 px radii on large panels shrink to 28.
- Elevation: two shadows only (`card`, `soft`), both already defined.
- Buttons: primary (brand-900, white text), secondary (white, 1px line), quiet (text). Height 44 px minimum, 48 on hero actions.
- Cards: **photo-forward**. Church card = 3:2 photo, name, city · denomination, next service, up to three fact chips. See task UI-004.
- Forms: keep the current labeled-field system and error summary. Do not restyle validation behavior.
- Navigation: see 06 (grouped menu).
- Dashboards and admin: functional, not decorative. Apply fonts and tokens only.
- Icons: lucide, 1.75 stroke, always paired with text. No decorative illustrations.

## 5. Photography strategy

**Hard rules**
1. A photo on a church's listing must be of that church and carry a credit and permission (the dashboard already requires both).
2. Stock or generated images never appear on a church listing, and never with a caption implying a specific local church or real congregation.
3. No invented people, testimonials, or "our team" photos.
4. Generated church images stay hidden from the public (existing behavior, `AI_IMAGES_ENABLED`).

**Sources, in order of preference**
- **A. Owner-shot local photos** (best). The owner is local and pastors Sheriff Temple. A two-hour shoot covers most needs.
- **B. Church-supplied photos** via the dashboard or by email with written permission.
- **C. Licensed stock** (Unsplash license or paid) for non-specific scenes only: hands holding a hymnal, an open door, a coffee table. Record the license URL in `PROJECT-TRANSFORMATION/assets/CREDITS.md`.

### Shot list

| # | Location on site | Depicts | Mood and composition | Ratio (desktop / mobile) | Motion | Purpose | Source |
|---|---|---|---|---|---|---|---|
| P1 | Homepage hero | A real local church exterior in morning light, people arriving, door open | Warm, low sun, shot from walkway height; subject right, calm sky left for the headline | 21:9 / 4:5 crop, focal point right-center | Slow 8 s scale 1.00 → 1.04 (off with reduced motion) | "This is a real place near you" | A (Sheriff Temple with members' consent, or another willing church) |
| P2 | Homepage "Browse by city" | Recognizable downtown Champaign and Urbana streetscapes, one each | Daylight, no identifiable faces | 3:2 | none | Local grounding | A |
| P3 | Campus Faith hero | Students walking on or near the UIUC Quad (public space), backs or distance, not identifiable | Golden hour, wide | 21:9 / 4:5 | same as P1 | Signals "for students" | A. Do not imply university endorsement |
| P4 | Campus Faith: Parkland card | Parkland College entrance sign or building exterior | Straight-on, daylight | 3:2 | none | Wayfinding | A |
| P5 | "Plan your visit" explainer (For churches page, new-to-C-U guide) | Details: open door, greeter's hands with bulletin, parking sign, children's check-in desk | Close, shallow depth of field, no faces needed | 1:1 grid of four | Stagger reveal | Explains what visitor info looks like | A or C |
| P6 | Worship Live & Next header | A sanctuary from the back during worship, or a camera/phone streaming a service | Dim, warm stage light | 21:9 / 16:9 | none | Sets context | A with church consent |
| P7 | Collaboration Board header | Volunteers at a food distribution table | Candid, mid-action | 21:9 / 16:9 | none | Shows "churches helping churches" | A with consent, else C |
| P8 | For churches page | A phone showing a real church profile from this site, held in a church lobby | Over-the-shoulder | 4:3 | none | Shows the product honestly | A (screenshot is real) |
| P9 | Church cards and profiles | Each church's own exterior | Straight, daylight, building fills frame | 3:2 card, free ratio on profile (already letterboxed with blur) | Card hover zoom 1.03 | Recognition from the street | B, or A with permission; drives the "photo coverage" campaign |

Delivery spec for every asset: source at 2400 px wide minimum, saved as JPEG; served by `next/image` (AVIF/WebP) with explicit `sizes`; hero marked `priority`; meaningful alt text; focal point noted so the mobile crop keeps the subject.

**Until photos arrive:** ChatGPT builds the layouts with a neutral placeholder (brand-100 block with the words "Photo coming soon" at 4.5:1). It must not substitute stock on its own.

## 6. Page-specific requirements

- **Home:** photo hero with headline "Find a church in Champaign County", search field, three quick actions (Explore the map, Find a service, Campus Faith). Then: next services today, cities with photos, featured church, how listings are checked, for churches.
- **Directory / city / denomination:** filter bar on top for desktop (not a tall sidebar), sticky "Filters" sheet on mobile, photo-forward cards.
- **Church profile:** keep content and order; apply type, tokens, and motion. This page is the product; do not remove sections.
- **Campus Faith:** P3 hero, same card system.
- **Dashboards/admin:** tokens and fonts only.

## 7. Instructions to ChatGPT

Implement design through tasks UI-001 to UI-005, IMG-001, and MOT-001/002 in `07_CHATGPT_TASKS.md`. Change tokens in `tailwind.config.ts` and `app/globals.css`, not per-component hex values. Do not add a component library. Do not change copy that states facts about churches.
