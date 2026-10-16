# Spacing and rhythm

Spacing is the cheapest hierarchy tool and the one agents misuse most. It groups (proximity), separates (sections), and signals importance (isolation). Rules below assume a 4px base unit.

## Contents

1. The scale
2. The proximity ladder
3. Headings and the space around them
4. Containers: padding, gaps, nesting
5. Alignment and edges
6. Separation: whitespace, fills, lines, borders, shadows
7. Corners
8. Vertical rhythm
9. Responsive spacing
10. Common bugs and their fixes

---

## 1. The scale

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128` (+160 for expressive pages).

- Small steps are linear (every 4px) because small differences matter up close; large steps grow faster because a 4px difference between 92 and 96 is invisible.
- 2px exists only for optical nudges, hairline offsets and icon alignment — never as a layout gap.
- Name tokens by multiplier (`--space-4` = 16px) or by role (`--space-item`). Role tokens are better for components: they let a density mode change `item` spacing without touching every component.
- Off-scale values (13, 18, 22, 27px) are the clearest sign that spacing was eyeballed. The audit script reports them.

## 2. The proximity ladder

Gestalt proximity: things close together are read as one group. Hierarchy of grouping therefore needs a hierarchy of gaps.

| Tier | Separates | Expressive | Consumer | Reading | Productivity | Operational |
|---|---|---|---|---|---|---|
| related | icon↔label, label↔value, title↔subtitle, label↔input | 8 | 8 | 8 | 4–8 | 4 |
| item | list items, paragraphs, cards in a grid | 16–24 | 16 | 16 | 12 | 8 |
| group | sub-sections, card groups | 48 | 32 | 32 | 24 | 16 |
| section | major page sections | 96–160 | 48–64 | 48–64 | 32–40 | 24–32 |

Rules:

- Each tier is at least 1.5× the tier below — 2× is safer. If `item` and `group` are 16 and 20, the groups dissolve.
- Dense profiles compress every tier but keep the ratios.
- Forms run one notch looser than the ladder (field↔field 20–24 / 16 / 12, group↔group 40–48 / 32 / 24 for consumer / productivity / operational) — see `density.md` §7.
- One component, one tier: a card's title-to-subtitle gap is `related`, whatever card it is.
- Paragraph spacing in running text is roughly one line of the body's line height (e.g. 16px text with 24px line height → 16–24px between paragraphs). WCAG 1.4.12 lets users force 2× font size; the layout must cope.

## 3. Headings and the space around them

A heading introduces what follows, so it sits closer to its content than to the content above:

```
space above heading ≥ 2 × space below heading
```

| Heading | Above | Below |
|---|---|---|
| Section title (consumer) | 48–64 | 16–24 |
| Group/card-group title | 32 | 12–16 |
| Card title | (card padding) | 8 |
| Section title (operational) | 24–32 | 8–12 |

- Equal spacing above and below — e.g. `margin: 24px 0` on every heading — is the single most common hierarchy bug in generated UI. Use `margin-top` larger than `margin-bottom`, or `gap`-based stacks where the section gap is larger than the heading-to-content gap.
- The first heading in a container takes no extra top margin; the container padding already provides it. (`:first-child { margin-top: 0 }` or a flex/grid `gap` layout.)
- A heading followed immediately by another heading (title + subtitle) uses the `related` gap between them, then the normal below-gap.

## 4. Containers: padding, gaps, nesting

1. **Same component, same padding** everywhere it appears. Variants (small/medium/large) get their own fixed values from the scale.
2. **Padding ≥ the largest gap inside.** If items inside a card are 24px apart but the card's padding is 16px, content looks like it's escaping the edges.
3. **Padding scales with size.** Small chips 4–8px, buttons 8–16px horizontal, cards 16–24px, panels and dialogs 24–32px, page gutters 16px (phone) to 32–64px (desktop).
4. **Nested surfaces step down.** A card inside a panel uses less padding than the panel (24 → 16 → 12). Three levels of nesting is usually a design smell — flatten.
5. **Enclosure replaces proximity.** Containers with a visible boundary (fill or border) can sit closer together (gap ≈ padding or less) because the boundary does the grouping. Borderless groups rely on spacing alone, so the gap between groups must be clearly larger than the gaps within them (≥2×).
6. **Horizontal padding ≥ vertical padding** for text-bearing controls (buttons, inputs, tags): text needs side room; vertical room comes from line height.
7. **Optical padding.** Icons and all-caps text sit visually smaller than their box; a button with a leading icon often needs 2–4px less padding on the icon side to look centered.

## 5. Alignment and edges

- **Fewer edges = more order.** Count the distinct left edges in the blurred screenshot; each one is a line the eye has to resolve. Align labels, values, headings and buttons to as few edges as possible.
- **Text aligns to text, not to boxes.** A heading should align with the text inside the card below it, not with the card's border, when the card has no visible boundary.
- **Baselines.** Items in a row (icon + label + value + action) align on the text baseline or the center line consistently; mixing both looks broken.
- **Hanging punctuation and bullets** may sit outside the text edge for a clean left line in reading surfaces.
- **Grid.** A 12-column grid (4–8 on mobile) with gutters from the spacing scale (16–32px) keeps sections aligned. Content widths: running text ~600–720px; forms ~400–560px; data can use the full width.
- **Leading trim.** CSS `text-box: trim-both cap alphabetic` removes the space above cap height and below the baseline so padding measures to the visible text. Supported in Chrome/Edge 133+, Safari 18.2+ and Firefox 154+; treat it as progressive enhancement for older targets.

## 6. Separation: whitespace, fills, lines, borders, shadows

Use the weakest separator that works, in this order:

1. **Whitespace** — free of noise, costs space.
2. **Subtle background** (a tinted section or zebra rows) — costs no space, adds little noise.
3. **Divider line** (1px, low contrast) — cheap in space; good for dense lists and tables.
4. **Border box** — groups strongly; becomes noise when everything is boxed.
5. **Shadow / elevation** — for things that float above others (menus, dialogs, sticky bars), not for static grouping.

Dense surfaces can't afford much whitespace, so they lean on dividers and fills. Expressive and consumer surfaces lean on whitespace. "Boxes around everything" usually means the spacing ladder is missing.

## 7. Corners

- **Concentric radii.** A rounded element nested inside another: `inner radius = outer radius − padding`. A 24px-radius card with 8px padding holds a 16px-radius image. If the result is ≤0, use 0 or a small radius (2–4px).
- **Radius scales with size.** Small elements (chips, inputs) 4–8px; cards 8–16px; sheets and dialogs 12–24px. Fully rounded ("pill") shapes are a separate style choice; use them consistently.

## 8. Vertical rhythm

- Snap spacing and UI line heights to 4px, and most stacks will line up without effort.
- Don't force a strict baseline grid on the web: borders, images and mixed sizes break it, and the effort rarely shows.
- Within running text, paragraph spacing ≈ one line height keeps the rhythm; headings take extra space above (Section 3).

## 9. Responsive spacing

| | Desktop | Tablet | Phone |
|---|---|---|---|
| Page gutter | 32–64 | 24–32 | 16–20 |
| Section | profile value | ~0.75× | ~0.5–0.75× |
| Group | profile value | ~0.75× | ~0.75× |
| Item / related | profile value | same | same |
| Component padding | profile value | same | same (touch) |

- Small-screen spacing shrinks from the top of the ladder down; the related/item tiers and touch targets hold.
- Use `clamp()` for section spacing if it should scale smoothly, with the same rem-plus-vw rule as fluid type.

## 10. Common bugs and their fixes

| Bug | How it shows | Fix |
|---|---|---|
| Floating heading | equal margin above and below | margin-top ≥ 2× margin-bottom; zero top margin on first child |
| Eyeballed values | 13, 18, 22, 27px in CSS | snap to the scale; map each to the nearest role token |
| Ladder collapse | item 16 / group 20 / section 24 | re-space tiers at ≥1.5–2× |
| Card padding < inner gaps | content crowds the card edge | padding ≥ largest internal gap |
| Boxes everywhere | every group in a bordered card | remove boxes, use spacing + one divider level |
| Mixed alignment | many left edges, centered and left text mixed | one edge per column; left-align UI text |
| Same component, different padding | cards at 18/20/24/22 | one padding token per component variant |
| Spacing in em | odd fractional gaps (13.33px) | rem or px tokens from the scale |
