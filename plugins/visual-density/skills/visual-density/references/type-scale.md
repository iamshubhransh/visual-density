# Type scale

How to choose and review a type scale. `scripts/scale.mjs` implements these rules; use it rather than computing by hand.

## Contents

1. Choosing the body size
2. Ratios, and where they stop working
3. Building the steps
4. Line height, tracking, weight
5. Roles
6. Fluid type
7. Units and accessibility
8. Fonts: x-height, fallbacks, optical sizes
9. Platform reference scales
10. Reviewing an existing scale

---

## 1. Choosing the body size

Body is the style people read most, so it is chosen first and everything else is derived from it.

| Profile | Web body | Why |
|---|---|---|
| Expressive | 18–20px | Few words, read at a distance, competing with imagery |
| Consumer | 16–18px | Phone in hand, glanced at, often outdoors |
| Reading | 16–20px | Long passages; comfort over density |
| Productivity | 14–15px | Long sessions, many items, pointer input |
| Operational | 13–14px | Comparison across many rows; experts trained on the layout |

Native: iOS's default Body style is 17pt (at the default Dynamic Type size); Material 3's Body Large is 16sp and Body Medium 14sp. Use the platform's text styles so system font scaling works — don't hard-code sizes on native.

Never solve a density problem by shrinking body below its profile's range. Remove chrome first (see `density.md`).

## 2. Ratios, and where they stop working

Classic modular-scale ratios:

| Ratio | Name | 16px base, five steps up |
|---|---|---|
| 1.067 | minor second | 17, 18, 19, 21, 22 |
| 1.125 | major second | 18, 20, 23, 26, 29 |
| 1.2 | minor third | 19, 23, 28, 33, 40 |
| 1.25 | major third | 20, 25, 31, 39, 49 |
| 1.333 | perfect fourth | 21, 28, 38, 51, 67 |
| 1.414 | augmented fourth | 23, 32, 45, 64, 90 |
| 1.5 | perfect fifth | 24, 36, 54, 81, 122 |
| 1.618 | golden ratio | 26, 42, 68, 110, 177 |

(Values rounded to whole pixels.)

- **Big ratios (1.333+)** create drama for expressive pages but run out of room fast: five steps above 16px at 1.5 is 122px.
- **Small ratios (1.067–1.125)** put neighbouring steps 1–2px apart at UI sizes — too close to read as different levels. Dense tools don't need a smaller ratio; they need *fewer* steps: body, one or two title sizes, a display size for key numbers, with weight and color tiers doing the rest. Small ratios suit only long-form type where the levels are already separated by position and spacing.
- **Below body, ratios break down.** 16 ÷ 1.25 = 12.8, ÷ 1.25² = 10.24 — too small and fractional. Hand-tune the small end in whole pixels (e.g. 16 → 14 → 12) and stop at the profile's floor.
- **Most real product scales are not strictly geometric.** Material, Tailwind and most mature systems use a ratio-like curve at the top and fixed 2px steps at the bottom, and that's the right shape.

## 3. Building the steps

1. Start from body.
2. Steps up: multiply by the ratio; round to whole pixels below 16px, to even pixels from 16px, to multiples of 4 from 40px (ties round down).
3. Steps down: 2px at a time (16 → 14 → 12; 14 → 12), at most two steps, stopping at the profile's floor. If no 2px step fits above the floor (a 13px body with a 12px floor), `meta`, `label` and `caption` share the body size and differ by weight and color tier instead — 1px apart reads as an accident, not a level.
4. Enforce distinguishability: any two adjacent steps used as neighbouring hierarchy levels differ by ≥20% — or by ≥2px plus a weight or color difference.
5. Cap the count: about 6–9 steps in the system. If the generator gives more than you'll use, drop the unused ones.
6. On small screens, compress the top: keep body the same and use a smaller ratio (e.g. 1.25 → 1.2), so a 48px display becomes about 40px and a 40px title about 34px on a phone (worked example below). On phones the top steps sit ~17% apart, so keep a weight or color difference between title levels there. Dense profiles don't compress: their top sizes are already small.

Worked example (consumer, base 16, desktop ratio 1.25, mobile ratio 1.2):

| Step | Desktop | Mobile | Line height | Role |
|---|---|---|---|---|
| +5 | 48 | 40 | 52 (1.083) | display |
| +4 | 40 | 34 | 48 (1.2) | title-1 / page title |
| +3 | 32 | 28 | 40 (1.25) | title-2 |
| +2 | 24 | 24 | 32 (1.333) | title-3 |
| +1 | 20 | 20 | 28 (1.4) | lead / large body |
| 0 | 16 | 16 | 24 (1.5) | body |
| −1 | 14 | 14 | 20 (1.429) | meta, label |
| −2 | 12 | 12 | 16 (1.333) | caption (sparingly) |

(Run `node scripts/scale.mjs --profile consumer` to get exactly these values plus the fluid `clamp()` versions.)

## 4. Line height, tracking, weight

**Line height** (unitless in CSS, snapped to the 4px grid in UI):

| Size | Line height | Notes |
|---|---|---|
| ≤14px UI text | 1.33–1.5 | dense tables can sit at 1.33–1.43 (e.g. 14/20, 12/16); 13px lands at 20 (1.54) on the 4px grid |
| 15–20px body | 1.45–1.6 | running text toward 1.6; single-line UI toward 1.45 |
| 20–32px headings | 1.2–1.4 | 20/28 (1.4) is the 4px-grid value for 20px |
| 32–48px | 1.1–1.25 | |
| >48px display | 1.0–1.12 | tighter still for very large type in some fonts |

Line height must leave room for diacritics and tall scripts — see `edge-cases.md` (Vietnamese, Thai, Devanagari, Arabic need more).

**Tracking (letter-spacing):**

| Use | Tracking |
|---|---|
| Display ≥32px | −0.01 to −0.02em (up to −0.03em for very large sizes in some fonts) |
| Headings 20–32px | 0 to −0.01em |
| Body | 0 |
| Small uppercase labels | +0.04 to +0.08em |

Many modern fonts already adjust spacing across sizes (variable fonts with an `opsz` axis do it automatically via `font-optical-sizing: auto`, the default). Check the font's own guidance before adding tracking.

**Weight:**

- Body 400 (some fonts read better at 450 if variable).
- Emphasis 500–600. Headings 600–700. 800–900 only for display.
- At most 2–3 weights in a system; each extra weight is another thing to keep consistent and another file to load.
- Avoid weights below 400 under ~20px, and avoid light weights on low-contrast backgrounds.
- In dense UI, a single weight step (400 → 600) is the main hierarchy lever; use it consistently (e.g. headers 600, values 400, identifiers 500).

## 5. Roles

Components should never use a raw size. Define roles and map them to steps:

| Role | Use | Consumer (16, ×1.25) | Productivity (14, ×1.2) | Operational (14, ×1.2) |
|---|---|---|---|---|
| `display` | hero, marketing headline, big KPI number | +5 · 48 | +4 · 30 | +4 · 30 (KPI numbers) |
| `title-1` | page title | +4 · 40 | +3 · 24 | +3 · 24 |
| `title-2` | section title | +3 · 32 | +2 · 20 | +2 · 20 |
| `title-3` | card or group title | +2 · 24 | +1 · 16 at 600 | 0 · 14 at 600 |
| `body` | running text, default UI text | 0 · 16 | 0 · 14 | 0 · 14 |
| `body-strong` | inline emphasis, row identifiers | 0 at 600 | 0 at 600 | 0 at 500–600 |
| `meta` | metadata, helper text, timestamps (usually in the secondary color tier) | −1 · 14 | −1 · 12 | −1 · 12 |
| `label` | form labels, table headers, small caps | −1 · 14 at 600 | −1 · 12 at 600, or body size at 600 | −1 · 12 at 600, or body size at 600 |
| `caption` | footnotes, legal, chart ticks | −2 · 12 | 12 (= meta) | 12 (= meta) |
| `numeric` | numbers in columns | inherits; `tabular-nums` | inherits; `tabular-nums` | inherits; `tabular-nums` |
| `code` | inline and block code | 0 or −1, monospace | 0 or −1, monospace | 0 or −1, monospace |

These are what `scripts/scale.mjs` outputs for each profile (expressive and reading follow the consumer pattern: display at the top step, each title one step below, except that `title-3` stops at +2 so card titles stay near body). Weights are 400 / 600 / 700 — three, as Step 2 asks. Desktop sizes shown; the generator also prints the mobile sizes.

Operational surfaces lean on weight and color for `title-3`, `body-strong` and `label`, because each extra size step costs rows; `display` there is for KPI numbers.

## 6. Fluid type

Interpolate a size between a minimum at a small viewport and a maximum at a large one:

```
slope      = (maxSize − minSize) / (maxViewport − minViewport)
intercept  = minSize − slope × minViewport
font-size: clamp(minSize, intercept + slope × 100vw, maxSize)
```

Expressed in rem (assuming a 16px root) for the size terms:

```css
/* 28px at 360px wide → 40px at 1440px wide */
--text-title-1: clamp(1.75rem, 1.5rem + 1.111vw, 2.5rem);
```

Check: at 360px, 1.5rem + 1.111vw = 24 + 4 = 28px; at 1440px, 24 + 16 = 40px. ✓

Rules:

- **Always include a rem term.** `font-size: 4vw` ignores browser zoom and the user's font-size setting, which fails WCAG 1.4.4 (Resize Text). The rem part of `intercept + slope·vw` keeps zoom working, and the `clamp()` bounds are in rem too.
- **Keep the range modest.** If the max is more than about 2.5× the min, zooming to 200% may not double the text; WCAG 1.4.4 asks that text can be resized to 200%. Test it.
- **Body is usually static.** Fluid body text rarely helps and makes rhythm harder.
- **Line heights stay unitless** so they follow the fluid size.
- **Container queries** (`cqi` units) can scale a component's type to its container instead of the viewport; same rules apply (keep a rem term).

## 7. Units and accessibility

- Font sizes in `rem` (respects the user's browser font setting); line heights unitless; borders in `px`.
- Spacing in `rem` scales with the user's font setting, which keeps text and its padding in proportion; spacing in `px` keeps layouts stable. Either is fine — choose one convention and keep it consistent. Never mix px type with rem spacing tokens in a way that lets text outgrow its containers.
- Avoid `html { font-size: 62.5% }`: it still follows the user's setting, but it makes 1rem = 10px for every component, including third-party ones. If you want 10px math, do it in the token file. Never set the root size in px — that does override the user's choice.
- WCAG 1.4.12 (Text Spacing): the layout must survive users forcing line height 1.5, paragraph spacing 2×, letter spacing 0.12em and word spacing 0.16em. Avoid fixed heights on text containers; let them grow.
- WCAG 1.4.4: text resizes to 200% without loss of content or function.
- iOS Safari zooms the page when a focused `input`, `select` or `textarea` has a font size below 16px; keep form controls at ≥16px on mobile web.

## 8. Fonts: x-height, fallbacks, optical sizes

- **Compare by x-height, not pixel size.** A font with a large x-height (e.g. Inter, Verdana) at 14px can read like another font at 15–16px. When swapping fonts, re-check the whole scale visually and with the audit.
- **Fallback metrics.** A webfont that loads late reflows text if the fallback's metrics differ. Use `size-adjust` (all engines) plus `ascent-override`/`descent-override` (Chromium and Firefox; Safari ignores them) on a fallback `@font-face`, or `font-size-adjust` (supported in all engines since 2024), so the hierarchy doesn't jump.
- **Optical sizes.** Variable fonts with an `opsz` axis adjust stroke and spacing for small or large sizes automatically; don't fight them with manual tracking.
- **Monospace for code and some numbers.** Monospace often looks larger than the body face at the same size (wider glyphs, often a larger x-height); drop it one step (or set `font-size-adjust`) so inline code doesn't look louder than surrounding text.
- **Numerals.** Proportional oldstyle figures suit prose; UI needs lining, tabular figures (`font-variant-numeric: lining-nums tabular-nums`) wherever numbers are compared or change.

## 9. Platform reference scales

**iOS text styles** (default "Large" Dynamic Type size, points):

| Style | Size | Weight |
|---|---|---|
| Large Title | 34 | Regular |
| Title 1 | 28 | Regular |
| Title 2 | 22 | Regular |
| Title 3 | 20 | Regular |
| Headline | 17 | Semibold |
| Body | 17 | Regular |
| Callout | 16 | Regular |
| Subheadline | 15 | Regular |
| Footnote | 13 | Regular |
| Caption 1 | 12 | Regular |
| Caption 2 | 11 | Regular |

Note iOS separates Headline from Body by weight only — the same size. That works because the weight step is large (Regular → Semibold) and usage is consistent.

**Material 3 type scale** (sp, size / line height):

| Role | Large | Medium | Small |
|---|---|---|---|
| Display | 57/64 | 45/52 | 36/44 |
| Headline | 32/40 | 28/36 | 24/32 |
| Title | 22/28 | 16/24 | 14/20 |
| Body | 16/24 | 14/20 | 12/16 |
| Label | 14/20 | 12/16 | 11/16 |

**Tailwind CSS defaults** (rem / px, line height): `xs` 0.75/12 (1.333), `sm` 0.875/14 (1.429), `base` 1/16 (1.5), `lg` 1.125/18 (1.556), `xl` 1.25/20 (1.4), `2xl` 1.5/24 (1.333), `3xl` 1.875/30 (1.2), `4xl` 2.25/36 (1.111), `5xl` 3/48 (1), `6xl` 3.75/60, `7xl` 4.5/72, `8xl` 6/96, `9xl` 8/128 (all 1). These are size *options*, not a hierarchy: neighbours below `2xl` are only 2px apart, so skip a step between neighbouring levels or change weight as well.

## 10. Reviewing an existing scale

Run the audit and check its type inventory:

- **More than ~5 sizes on one screen or ~9 in the system** → consolidate onto the nearest roles.
- **Near-misses** (sizes ≤1px apart, or within ~6%) → merge them; they are almost always accidents.
- **Weights 500 and 600 both used for the same purpose** → pick one.
- **A heading level rendered at several sizes** → parity break; one token per level.
- **Line heights that don't fall as size grows**, or body line height under 1.4 for paragraphs → fix in the tokens.
- **Sizes in `px` or `vw` only** → move to rem / clamp with a rem term.

Propose the change as a token diff (old value → new value, which components move) so the team can review it in one place.
