# 03 · Motion Specifications

Principle: motion explains or confirms. If removing an animation loses no meaning, it must be subtle or gone. **CSS only.** No GSAP or Motion library: nothing here needs one, and each adds weight to a content site. One small client hook (IntersectionObserver) is allowed for reveals.

Global rules
- Durations: 120 ms (press), 180 ms (hover), 240 ms (menus, sheets), 400 ms (reveals), 8 s (hero drift). Easing `cubic-bezier(0.2, 0.8, 0.2, 1)` for entrances, `ease-out` for hovers.
- Animate only `opacity` and `transform`. Never animate layout properties.
- `prefers-reduced-motion: reduce` already neutralizes transitions in `app/globals.css`; every new effect must also be wrapped so content is visible and static in that mode.
- No motion blocks reading: content is in the DOM and visible to crawlers and no-JS users. Reveal classes default to visible; JavaScript adds the hidden starting state.
- Nothing autoplays with sound. No carousels that move on their own.

| ID | Component | Trigger | What changes | Why | Timing | Mobile / reduced motion | Implementation |
|---|---|---|---|---|---|---|---|
| M1 | Hero photo | Page load | Scale 1.00 → 1.04, once | Life without distraction | 8 s linear, no loop | Reduced: static | CSS keyframes on the image wrapper; `will-change: transform` |
| M2 | Hero text | Page load | Headline, search, actions fade up 12 px, staggered 60 ms | Directs the eye to the search task | 400 ms each | Reduced: no offset, no fade | CSS animation with `animation-delay` |
| M3 | Section reveal | Section enters viewport (15% visible) | Fade up 16 px, once | Pacing on long pages | 400 ms | Reduced: none | `components/motion/reveal.tsx` client wrapper using IntersectionObserver; adds `data-revealed` |
| M4 | Card grid stagger | Grid enters viewport | Children reveal 40 ms apart, max 6 then all | Rhythm; cap prevents slow lists | 400 ms | Reduced: none | Same wrapper with `--i` index |
| M5 | Church card hover / focus | Pointer hover or keyboard focus-within | Card lifts 2 px, shadow `card` → `soft`, photo scales 1.03 | Affordance: "this opens" | 180 ms | Touch: no hover; press state instead | CSS `:hover`, `:focus-within` |
| M6 | Button press | `:active` | Scale 0.98 | Tactile confirmation | 120 ms | Kept (tiny) | CSS in `components/ui/button.tsx` variants |
| M7 | Mobile menu and filter sheet | Open / close | Slide down 8 px + fade; backdrop fade | Orientation | 240 ms | Reduced: instant | CSS on `[open]`; keep `<details>` semantics or replace with an accessible disclosure (task UX-001) |
| M8 | Save (heart) | Toggle | Heart fills and scales 1 → 1.2 → 1 | Confirms a local-only save | 240 ms | Reduced: fill only | CSS keyframes on state class |
| M9 | Form success / error | Action result | Status banner fades in; focus moves to it (already implemented) | Confirmation | 180 ms | Kept, no movement | Extend `components/forms/action-form.tsx` styles only |
| M10 | Pending buttons | Server action running | Inline spinner replaces label ("Saving…" text stays) | Shows work in progress | continuous | Reduced: text only | CSS spinner in `SubmitButton` |
| M11 | Route loading | Navigation to a data page | Skeleton cards | Perceived speed | until loaded | Static blocks, no shimmer in reduced motion | Add `loading.tsx` for `/map`, `/events`, `/find-a-service`, `/campus/*` (directory has one) |
| M12 | Map pin select | Pin tap | Selected pin scales 1.15 and gains ring; preview card fades in | Links pin to card | 180 ms | Reduced: ring only | CSS on the divIcon HTML in `components/map/church-map.tsx` |
| M13 | Live badge | Church is marked live | Dot pulses | "Now" signal | 2 s loop | Reduced: static dot (already handled) | Existing |
| M14 | Gallery lightbox (P2) | Tap a gallery photo | Photo opens in a native `<dialog>` with fade | View detail | 180 ms | Reduced: instant | `<dialog>` + CSS; Escape closes; focus returns |

Explicitly rejected: parallax (hurts INP on phones, adds little here), page-transition animations (App Router support is experimental), scroll-jacking, before/after sliders (no before/after content exists), animated counters.

Acceptance for all motion tasks: no layout shift added (CLS unchanged), no long tasks from observers, keyboard focus order unchanged, and a recorded check with reduced motion turned on.
