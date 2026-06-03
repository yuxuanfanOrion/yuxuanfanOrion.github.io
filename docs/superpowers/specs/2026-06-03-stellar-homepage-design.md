# Stellar Homepage Redesign — Design Spec

Date: 2026-06-03
Owner: Yuxuan FAN
Reference: https://github.com/Owen718/Owen718.github.io

## Goal

Make the personal homepage cooler, grander, and express the author's love of the
starry sky, building on the existing (already rich) starry night-mode infrastructure.
Reference Owen718's signature interactive hero element, adapted to a star theme.

## Decisions (confirmed with user)

1. **Default tone**: dramatic transition. The hero/cover area is always a deep-space
   starry scene; the body below stays light academic. A bottom gradient fades the hero
   seamlessly into the light content. The existing day/night toggle still flips the whole
   page into the full immersive dark starry theme.
2. **Signature interactive element**: constellation conference badges. One glowing star
   per paper (driven by `_data/publications.yml`), connected by faint constellation lines.
   Hover shows `title · venue`; click opens the arXiv page. The CVPR Highlight star is the
   brightest with a golden pulse.
3. **Publications section**: stays hidden (the constellation surfaces the work instead).
4. **Profile photo**: the forest "looking-up" photo, cropped square to head-and-shoulders,
   used as the circular avatar (`images/yuxuan-chill.png`). Echoes "Chasing the starry sky".
5. **Education**: new top entry — Ph.D. in Computer Science, NTU CCDS, Singapore,
   Aug. 2026 - 2030 (expected), logo `images/icon/ntu.png`.
6. **Hero title**: keep original (`M.Phil Student @ HKUST(GZ)`).

## Components

- `assets/css/hero-stellar.css` (new) — dramatic hero overlay + bottom fade, frosted-glass
  namecard, avatar glow ring, constellation stars/lines/tooltip, conference badges,
  entrance animations. Scoped so it never breaks the existing dark theme.
- `assets/js/constellation.js` (new) — reads injected paper JSON, places stars along a top
  arc (avoiding the centered card), draws an SVG constellation path, wires hover tooltips
  and click-through. No external dependencies. Respects reduced-motion and simplifies on
  mobile.
- `_pages/about.md` — hero gets overlay/fade/constellation containers + a JSON data script
  (Liquid loop over publications); avatar `src` swapped with `srcset` @2x; new NTU education
  entry.
- `_includes/head/custom.html` — link `hero-stellar.css` (after the inline style so the
  frosted-card override wins).
- `_includes/scripts.html` — include `constellation.js`.

## Data flow

`_data/publications.yml` → Liquid `{% for pub %}` → `<script id="constellation-data">` JSON
→ `constellation.js` builds star DOM + SVG lines in `#constellation` → hover/click.

`highlight` flag = venue contains "Highlight".

## Z-index (hero stacking)

cover/bg-layer 1-2 · hero-overlay 4 · hero-fade 5 · constellation 6 (stars clickable) ·
namecard 10.

## Surgical scope

Only additive: 2 new files, 3 small edits. The existing `night-theme.css` immersive starry
theme is untouched; light-mode-only rules are guarded with `html:not([data-theme="dark"])`.
