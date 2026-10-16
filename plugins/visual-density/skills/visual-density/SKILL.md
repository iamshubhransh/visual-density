---
name: visual-density
description: >-
  Visual density and hierarchy for interfaces: how much each screen should carry, and how type
  scale, spacing, visual weight, heading parity and scanning make the order of importance obvious.
  Use it to set up a type and spacing system or design tokens, to audit or fix a screen that feels
  flat, cluttered, cramped, sparse, inconsistent or hard to scan, to add a compact/comfortable
  density mode, and whenever building or reviewing UI where hierarchy or density matters: landing
  pages, consumer apps, dashboards, admin tools, tables, forms, settings, docs. Load it before
  reading or changing the UI code. Use it even when the user never says hierarchy or density, e.g.
  "feels flat", "everything looks the same", "hard to scan", "too busy", "too dense", "too much
  whitespace", "show more rows", "inconsistent padding", "type scale", "spacing system", "make
  this dashboard readable", "clean up this page", and questions like "is 14px too small for body
  text?". Not for animation, micro-interactions, or brand colors and fonts.
metadata:
  author: iamshubhransh
  version: "1.0.0"
---

Make the order of importance on a screen unmistakable, and choose how much information each screen carries on purpose. Hierarchy decides what is seen first, second, and last; density decides how much fits in the user's attention at once. They are one decision: the denser the screen, the less you can lean on size and whitespace, and the more on weight, color tiers, position, and alignment.

Every rule below says when it applies and why, and every number has a range tied to a kind of surface. Measure; don't eyeball — the audit script in `scripts/` reads a rendered page and reports what is actually there.

## The failures this prevents

Hunt for these first; most "this feels off" complaints are one of them.

1. **Flat** — headings barely larger than body, one weight everywhere; the eye has no entry point.
2. **Near-miss levels** — 15/16/17px, or 500 vs 600, used as "different" levels. Reads as inconsistency, not hierarchy.
3. **Medium density that fits nothing** — consumer-style padding on an operations table, or cramped tool spacing on a consumer screen.
4. **Inconsistent padding** — the same component padded differently in different places; arbitrary values (13, 18, 22px).
5. **Floating headings** — equal space above and below a heading, so it belongs to nothing.
6. **Everything emphasized** — several bright buttons, bold everywhere, color as decoration. Nothing stands out.
7. **Size-only hierarchy in dense UI** — separating levels by bumping font sizes until the data no longer fits, instead of using weight, color tiers, and position.
8. **Shrinking to fit** — 11px body to cram a table, instead of removing chrome or prioritizing columns.
9. **Parity breaks** — sibling cards or sections with different title styles; heading tags picked for their look.
10. **Boxes as hierarchy** — borders and cards around everything instead of spacing and alignment.

## Modes

- **Create** — a new product or surface. Deliver a short decision record (profile, scale, spacing, emphasis rules), the tokens, and — if asked — the screen built with them.
- **Audit** — measure and report; change nothing. Use the report format in `references/audit.md`.
- **Fix** — audit, then change the code, then re-measure to prove it.

This file is enough for most jobs. Open a reference only when the task needs its depth — reading all of them costs time and tokens without changing the result:

| Task | Read |
|---|---|
| Audit, or the audit half of a fix | `references/audit.md` |
| New type system or tokens | `references/type-scale.md`, `references/spacing-and-rhythm.md` |
| Dashboards, tables, forms, density modes | `references/density.md` |
| Emphasis, color tiers, contrast, dark mode | `references/weight-and-emphasis.md` |
| Heading outline, parity, scanning patterns | `references/headings-and-scanning.md` |
| Existing design system, localization, native, charts, email, print, TV | `references/edge-cases.md` (the relevant section only) |

If the project already has a design system or tokens, that is the starting point: fix within it, and propose token changes as explicit diffs. Never introduce a second, parallel scale. If the existing scale itself causes the problem (near-miss steps, too many sizes), say so and propose the smallest change that fixes it.

## Step 1: Classify each surface

Classify the surface, not the product — one product can have a marketing site, a consumer app, docs, and an admin panel, and each needs a different profile. Decide from what the user said, the content, and the code; ask only if a surface could reasonably be two profiles and the choice changes the build.

| Profile | Typical surfaces | Body (web px) | Smallest essential text | Scale | Top heading (desktop) | Section spacing | Control height | Table / list row | Main hierarchy levers |
|---|---|---|---|---|---|---|---|---|---|
| **Expressive** | landing, launch, onboarding, campaigns | 18–20 | 14 | ratio 1.333–1.5+ | 48–112 | 96–160 | 48–56 | — | size, whitespace, imagery |
| **Consumer** | feeds, shopping, booking, banking home, social | 16–18 | 12 (13–14 for key info such as prices and dates) | ratio 1.2–1.25 | 28–40 | 48–64 | 44–48 (touch) | 56–72 list rows | size, weight, position |
| **Reading** | docs, articles, help centers, policies | 16–20 | 14 | ratio 1.2–1.333 | 32–44 | 48–64 | — | — | headings, measure, rhythm |
| **Productivity** | email, project tools, editors, CRM records, settings | 14–15 | 12 | few steps, ~1.2 apart; one 2px step below body (14 → 12) | 20–28 | 32–40 | 32–40 | 36–48 | weight, color tiers, position |
| **Operational** | dashboards, admin tables, monitoring, trading, logistics, analytics | 13–14 | 12 (11 only for repeated, non-essential labels such as chart ticks) | few steps, ~1.2 apart; weight and color carry the rest | 16–24 | 24–32 | 28–36 (pointer) | 28–40 | position, alignment, weight, color tiers |

Then adjust for four modifiers:

- **Input** — touch sets hard floors: 44×44pt hit regions on iOS, 48×48dp on Android/Material. On the web, WCAG 2.2 sets 24×24 CSS px as the AA minimum (2.5.8); treat 44px as the touch target. A dense surface on a touch device keeps dense *type* but not dense *targets* — make whole rows tappable instead of tiny icons.
- **Frequency and expertise** — experts repeating a task daily gain from density (more on screen, less navigation); occasional or novice users need space and stronger cues. Mixed audience: ship the comfortable default plus a compact mode.
- **Task** — *read* (measure and rhythm matter), *browse* (imagery and size), *scan-and-compare* (alignment, columns, tabular numbers), *monitor* (glanceable status, color reserved for state), *act/enter* (form rhythm, one primary action).
- **Distance and viewport** — a TV or kiosk viewed from metres away needs roughly double the type and targets ("10-foot UI"); a phone needs a compressed heading scale, not smaller body text.

Write the result down in one line per surface, e.g. `Shipments dashboard — Operational, pointer, daily experts, scan-and-compare + monitor`. Every later decision cites it.

## Step 2: Build the type scale

Body comes first — it is the most-read style and everything derives from it. Then generate the scale instead of hand-typing it (scripts live in this skill's `scripts/` folder; `<skill>` below is that folder's parent):

```bash
node <skill>/scripts/scale.mjs --profile consumer                 # tokens for a consumer surface
node <skill>/scripts/scale.mjs --profile operational --format css  # dense UI, CSS custom properties
node <skill>/scripts/scale.mjs --base 17 --ratio 1.25 --mobile-ratio 1.2 --format tailwind
```

The rules the generator applies — and that you must apply when reviewing an existing scale:

1. **Ratio at the top, hand-tuned at the bottom.** Geometric ratios work for headings; below body they produce sizes too close to tell apart or fractional pixels. Round sizes to whole pixels (even pixels from 16px, multiples of 4 from 40px), and keep small steps at least 2px apart. Dense surfaces don't need a smaller ratio — they need fewer steps.
2. **Make adjacent levels distinguishable.** If two levels differ only in size, the difference must be about 20% or more (16→20, 20→24; rounding to whole pixels can land a step at 17–18%, which is fine — under ~15% is too close). A smaller size step needs a second lever: weight up by at least 200 (400→600), or a color tier. Never 1px apart as neighbouring levels; never 500 vs 600 as the only difference. (Apple's platform scales do step 1px at small sizes, always paired with a weight or context change — if you're matching a platform, follow its scale.) Default Tailwind sizes are 2px apart at the small end — don't use `text-lg` and `text-xl` as neighbouring levels without also changing weight.
3. **Keep the count small.** 3–5 sizes on one screen, about 6–9 in the whole system, 2–3 weights. More is drift.
4. **Line height falls as size grows.** About 1.33–1.5 for 12–14px UI text, 1.45–1.6 for 15–20px body, 1.2–1.4 for 20–32px headings, 1.1–1.25 for 32–48px, 1.0–1.12 above 48px. In UI, snap line heights to the 4px grid (12/16, 14/20, 16/24, 20/28, 24/32); on the grid a few sizes land just outside their band (17/28 is 1.65), which is fine. Use unitless line heights in CSS.
5. **Tracking falls as size grows.** Slightly negative for display sizes (−0.01 to −0.02em, sometimes −0.03em at very large sizes — check the font; variable fonts with an optical-size axis often handle it), zero for body, slightly positive (+0.04 to +0.08em) for small uppercase labels.
6. **Weight carries hierarchy at small sizes.** Body 400; emphasis 500–600; headings 600–700. Avoid weights below 400 under about 20px.
7. **Measure for reading.** Running text at 45–75 characters per line (about 66 is the classic ideal). `ch` is the width of the "0" glyph, so `max-width: 65ch` lands near 70–80 real characters — check the audit script's characters-per-line number rather than trusting the unit.
8. **Numbers align.** `font-variant-numeric: tabular-nums` wherever numbers sit in columns, update live, or are compared; right-align numeric columns; fixed decimals per column; units in the header, not repeated in every cell.
9. **Fluid, but zoom-safe.** Headings may scale with the viewport using `clamp(min-rem, rem + vw, max-rem)`. Never size text in `vw` alone — it stops responding to browser zoom (WCAG 1.4.4). Size fonts in `rem` so the user's default font size is respected. Body usually stays fixed; the ratio compresses on small screens.
10. **Mobile web inputs at 16px or more.** iOS Safari zooms the page when a focused input's text is smaller than 16px.
11. **Fonts differ.** Two fonts at the same pixel size can look a full size apart because of x-height. Judge sizes in the actual font; set `size-adjust` on fallback `@font-face` rules so a late-loading webfont doesn't reflow the hierarchy.

Assign **roles**, not raw sizes: `display`, `title-1`…`title-3`, `body`, `body-strong`, `meta`, `label`, `caption`, `numeric`, `code` (`meta` is the size role for metadata; for text, "secondary" in this skill means the color tier). Components use roles; only the token file knows the pixels. Full tables, platform scales (iOS, Material 3), and the fluid-type math are in `references/type-scale.md`.

## Step 3: Set spacing and rhythm

1. **One base unit: 4px.** Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128 (expressive surfaces add 160). Use 2px only for optical nudges and hairlines.
2. **Proximity ladder.** Things that belong together sit closer than things that don't. Each tier is at least 1.5×, preferably 2×, the one below:

   | Tier | What it separates | Expressive | Consumer | Reading | Productivity | Operational |
   |---|---|---|---|---|---|---|
   | related | icon↔label, label↔value, title↔subtitle | 8 | 8 | 8 | 4–8 | 4 |
   | item | list items, paragraphs, cards in a grid | 16–24 | 16 | 16 | 12 | 8 |
   | group | sub-sections, card groups | 48 | 32 | 32 | 24 | 16 |
   | section | major sections | 96–160 | 48–64 | 48–64 | 32–40 | 24–32 |

3. **Headings bind downward.** Space above a heading is at least twice the space below it, so the heading clearly introduces what follows. Equal spacing is the most common hierarchy bug agents produce.
4. **Same component, same padding.** Padding scales with component size; nested surfaces step down (24 → 16 → 12). A container's padding is at least as large as the largest gap inside it.
5. **Enclosure substitutes for proximity.** Borderless groups need the gap between groups to be clearly larger (≥2×) than the gaps within them. Bordered or filled containers can sit closer, because the boundary does the grouping.
6. **Alignment before boxes.** One left edge per column; align text edges and baselines; fewer distinct left edges reads as order. Separate with the weakest tool that works: whitespace → subtle background → divider → border → shadow.
7. **Concentric corners.** A nested element's corner radius is the outer radius minus the padding between them (never below 0).
8. **Rhythm, not a baseline grid.** Snap spacing and line heights to 4px; a strict baseline grid fights the web's box model and isn't worth it.
9. **Responsive spacing.** Section and group spacing shrink on small screens (about 0.5–0.75×); component padding mostly holds, because touch targets don't shrink.

Forms run one notch looser than the ladder (Step 6). Details, the container rules, and a common-bugs table are in `references/spacing-and-rhythm.md`.

## Step 4: Spend visual weight deliberately

Every element competes for attention with nine levers. Pick the cheapest one that works for the profile:

| Lever | Strength | Cost |
|---|---|---|
| Size | strong | space — scarce in dense UI |
| Weight | strong at text level | almost free |
| Contrast (value) | medium | free, but has accessibility floors |
| Hue / saturation | very strong | reserved for meaning: action, status, links |
| Position and order | strong | free — first in reading order wins |
| Whitespace / isolation | strong | space |
| Containment (fill, border) | medium | visual noise; stacks badly |
| Imagery and icons | very strong | competes with text; must not carry meaning alone |
| Motion | strongest | reserved for state change and feedback |

Rules:

1. **One focal point per view.** Decide what the user should see first and make it the only thing at the top of the weight order. The primary action is visually unique: one filled, high-contrast button per view or region; secondary actions outlined or tonal; tertiary as text.
2. **Emphasis budget.** If more than about a third of the text on a screen is bold, colored, or large, nothing is emphasized. Remove emphasis before adding it.
3. **Demote rather than promote.** When everything shouts, make metadata quieter (secondary color, one size down) instead of making the important thing louder.
4. **Quiet the chrome, not the character.** Demoting has a floor: a screen where everything is calm and grey is flat again (failure 1). Consumer and expressive surfaces still need a focal point with real weight — a filled hero card, a color field, an image, a large number — and a clear next step. If the main action is item-level (checking off, playing, replying), the items carry the focus and a creation action can be secondary; say so in the decision record so reviewers can see it was chosen.
5. **Text color tiers.** Primary, secondary, tertiary. Every tier that carries information meets 4.5:1 contrast against its background (3:1 for large text: at least 24px regular or ≈18.7px bold) — placeholder text included, so set `::placeholder` color yourself (Safari's default grey fails on white). Disabled controls are exempt, but keep them legible. Icons, focus indicators, and input borders that are the only thing identifying a field need 3:1 (WCAG 1.4.11).
6. **Never color alone.** Status needs a label or icon too (WCAG 1.4.1). Hierarchy must survive a grayscale screenshot.
7. **Dark mode keeps the same order.** Light text on dark reads heavier, so consider one weight step lighter for long passages; avoid pure white body text on pure black; show elevation with lighter surfaces rather than shadows.

More in `references/weight-and-emphasis.md`.

## Step 5: Headings, parity, and scanning

People scan before they read. Design for the "layer-cake" scan — eyes jumping from heading to heading — so the headings alone tell the story.

1. **Same level, same look, everywhere.** One style per heading level across the product.
2. **Siblings get the same level.** Cards in a grid, sections on a page, columns in a comparison: equal importance → identical title style and identical internal structure (title, then meta, then body, in the same order and spacing).
3. **No inversions.** A lower-level heading is never larger or heavier than a higher one; a card title never outranks the page title; a label never outweighs the value it labels — unless the pattern deliberately makes the value primary (dashboard metrics) and does so consistently.
4. **Visual level is decoupled from the tag.** Choose `h1`–`h6` for the outline and a class for the look (`<h2 class="title-3">` is fine). Keep the outline logical — one `h1`, no skipped levels — as best practice for screen-reader navigation (WCAG 1.3.1 requires that headings are marked up; it doesn't mandate the no-skip rule). Bold `div`s that act as headings should be headings.
5. **Front-load heading text.** The first two or three words carry the meaning; siblings use parallel grammar ("Billing", "Team", "Security" — not "Billing", "Manage your team", "Security settings").
6. **One stack per header.** Eyebrow + title + subtitle + badge on every section is noise; use the eyebrow only where it adds real context.
7. **Scanning aids.** One consistent left edge (in left-to-right languages); left-aligned text; numbers right-aligned; sticky table headers and section titles for long lists — but sticky chrome must never fully hide a focused element (WCAG 2.4.11).

More, including tables and label/value pairs, in `references/headings-and-scanning.md`.

## Step 6: Decide density

1. **Density is per surface, written down.** Pick a side — generous or compact — for each surface. The failure is the undecided middle.
2. **Raise density by removing, not shrinking.** First remove chrome (boxes, borders, repeated labels and units, decorative icons, low-value columns); then tighten the spacing tiers; only last step type down — once, never below the floors.
3. **Density modes are spacing modes.** Compact / default / comfortable change row height, control height, cell padding, and gaps. Type stays put — on a 4px line-height grid a 1px smaller font saves at most one 4px step per row; cell padding saves 8–16px and keeps text readable. Default to comfortable on coarse pointers (`@media (pointer: coarse)`).
4. **Floors never move.** Text floors from Step 1, contrast from Step 4, targets of 24×24 CSS px (44 for touch). A compact row may be 28px tall; its clickable area still meets the floor. If you enlarge a hit area with padding or a pseudo-element, measure the result (`document.elementFromPoint` at the edges) — insets are taken from the element's box, and the arithmetic is easy to get wrong.
5. **Tables.** Row height by mode (compact 28–32, default 36–40, comfortable 48–56); header cells distinguished by weight or color, not size; the identifying column (name, ID) strongest; numbers right-aligned in tabular figures; truncate with the full value reachable (a hover tooltip alone fails on touch — use the detail view or let cells wrap on coarse pointers); decide column priority for narrow screens (WCAG 1.4.10 lets data tables scroll horizontally, but the key columns should stay visible).
6. **Forms.** Label above field; label↔field 4–8px; field↔field 16–24px (12 operational); group↔group 32–48px (24 operational); helper text in the secondary tier; errors next to the field they describe.
7. **Dashboards.** One primary metric zone; KPI cards in strict parity; big numbers use the display role with secondary-tier labels; trends as small text with icon plus color; charts favour data over gridlines and frames.

Profiles in depth, density-mode tokens, and the component sizing tables are in `references/density.md`.

## Step 7: Encode it as tokens

Roles and density live in tokens, so the decisions survive the next screen. An illustrative shape (consumer-ish values; generate the real ones):

```css
:root {
  --text-display: clamp(2.5rem, 1.8rem + 3vw, 4rem);  --lh-display: 1.1;
  --text-title-1: 2rem;      --lh-title-1: 1.25;  --text-title-2: 1.5rem;  --lh-title-2: 1.333;
  --text-body: 1rem;         --lh-body: 1.5;      --text-meta: 0.875rem;   --lh-meta: 1.429;
  --space-related: 0.5rem;   --space-item: 1rem;  --space-group: 2rem;  --space-section: 4rem;
  --control-h: 2.75rem;      --row-h: 3.5rem;
}
[data-density="compact"] { --control-h: 1.75rem; --row-h: 2rem; --space-item: 0.5rem; --space-group: 1rem; }
```

Generate the real file with `<skill>/scripts/scale.mjs` (`--format css | json | tailwind`). Name tokens by role, never by value (`--text-meta`, not `--text-14`). In Figma, mirror the same names as variables and text styles.

## Step 8: Verify — measure, don't eyeball

1. **Run the audit** on the real page, at the sizes people use:
   ```bash
   node <skill>/scripts/audit.mjs http://localhost:3000/dashboard --profile operational
   node <skill>/scripts/audit.mjs ./index.html --profile consumer --viewports 1440x900,390x844
   ```
   It reports type and spacing inventories, near-miss sizes, off-grid spacing, heading outline, parity and inversions, heading spacing, line length, contrast, small text, target sizes, table alignment and row heights against the profile, emphasis counts, and overflow or cut-off content — plus a normal and a blurred grayscale ("squint") screenshot per viewport. Needs Node 18+ and Playwright: the script looks in the project, globally, and in a shared tool folder (`~/.cache/visual-density`), and if it's missing prints the one-line install that leaves the project untouched. It falls back to an installed Chrome or Edge if Playwright's own Chromium isn't downloaded. Without Node, paste `scripts/inventory.js` into the browser console. How to read it, and its known blind spots: `references/audit.md`.
2. **Squint test.** In the blurred screenshot, the order of what you notice should match the intended order of importance, and groups should read as groups.
3. **Headings-only read.** Read only the headings top to bottom: they should summarise the page.
4. **Stress the content.** Empty, one item, a thousand items; the longest name; a 40% longer translation; huge and negative numbers.
5. **Stress the user.** Browser zoom 200% (WCAG 1.4.4), a 320px-wide viewport (1.4.10), the text-spacing override of 1.4.12 (line height 1.5, paragraph spacing 2em, letter spacing 0.12em, word spacing 0.16em), dark mode, OS font scaling on native.
6. **Re-measure after fixing.** A fix isn't done until the audit shows it.

Edge cases — mixed surfaces, existing design systems, localization and scripts, dark mode, native platforms, charts, TV, print — are in `references/edge-cases.md`.

## What to deliver

**Create:** a decision record (one line per surface from Step 1; base, scale, and spacing choices with the reason for each; emphasis and heading rules; density modes), the token file, and the implemented screen if asked.

**Audit:** the report in `references/audit.md` — a one-line verdict, the measured inventory, then findings ranked by severity, each with evidence (selector, value, screenshot region), the rule it breaks, and the concrete fix (which token, which value).

**Fix:** the audit, the code changes, and the before/after measurements.

## Verify

```
[ ] Every surface classified in one line (profile + input + frequency + task) before any value was chosen
[ ] Body size set first and within the profile's range; no essential text below the profile's floor
[ ] Adjacent text levels differ by ≥~20% in size, or by size plus a second lever — no 1px or weight-only near-misses
[ ] ≤5 sizes and ≤3 weights on any one screen; every size is a token with a role name
[ ] Line heights fall as size grows; UI line heights on the 4px grid; running text at 45–75 characters per line
[ ] Spacing on the 4px scale; proximity ladder tiers each ≥1.5× the one below; space above headings ≥2× space below
[ ] Same component, same padding everywhere; container padding ≥ the largest gap inside it
[ ] One focal point and one primary action per view; emphasis on well under a third of the text
[ ] Same heading level looks identical everywhere; siblings share a level and structure; no inversions; logical outline
[ ] Density chosen per surface; density raised by removing chrome before shrinking type; modes change spacing, not type
[ ] Contrast ≥4.5:1 for informative text (3:1 large), ≥3:1 for informative non-text; nothing conveyed by color alone
[ ] Targets ≥24×24 CSS px (44 on touch); mobile web inputs ≥16px; numbers tabular and right-aligned in columns
[ ] Font sizes in rem; fluid headings use clamp() with a rem component; works at 200% zoom and 320px width
[ ] Audit script run before and after, squint screenshot checked, and the findings it reports are resolved or explained
```
