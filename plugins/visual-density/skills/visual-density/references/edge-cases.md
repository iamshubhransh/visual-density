# Edge cases

Situations where the default rules need adjusting. Each entry says what changes and what doesn't.

## Contents

1. Existing design systems and component libraries
2. Mixed surfaces in one product
3. Localization: text length
4. Scripts: CJK, Arabic and Hebrew, Indic, Thai, Vietnamese
5. User settings: zoom, font size, text spacing, Dynamic Type
6. Dark mode and high-contrast modes
7. Native platforms
8. Brand fonts and unusual metrics
9. Charts and data visualization
10. Modals, drawers, popovers, toasts
11. Empty, loading, error, and extreme data
12. TV, kiosk, and large displays
13. Small embedded UI: widgets, extensions, email
14. Print and PDF

---

## 1. Existing design systems and component libraries

- **Work inside it first.** Map every finding to existing tokens. A new scale next to an old one is worse than either.
- **When the system is the problem** (near-miss steps, too many sizes, no spacing tiers), propose a token diff: old value → new value, which components change, and a migration order (tokens first, then components, then screens).
- **Component libraries** (MUI, Ant Design, Chakra, shadcn/ui, Radix Themes, Carbon, Polaris, etc.) ship their own scales and density options. Prefer their density props/themes over overriding sizes per component, and override at the theme level.
- **Tailwind**: put the roles in the theme (`@theme` in v4, `theme.extend` in v3) and use them, instead of sprinkling raw utilities (`text-[15px]`, `mt-[22px]`). Arbitrary values in markup are the Tailwind version of off-scale spacing.

## 2. Mixed surfaces in one product

Classify each surface separately (marketing, app, docs, admin, email). They share the foundations — font family, color tokens, the 4px unit, icon set — and differ in body size, scale ratio, and spacing tier values. Transitions between surfaces (a marketing page linking into the app) should feel related, not identical.

## 3. Localization: text length

- Translations are often longer than English: IBM's figures (cited by the W3C) put long passages about 30% longer and strings under 10 characters at 2–3× the English length. German and Finnish, with long compound words, are the usual stress tests. Plan for it:
  - no fixed widths on buttons, tabs and table headers; allow wrapping or truncation with a tooltip;
  - headings that wrap gracefully (`text-wrap: balance` on short headings);
  - test with pseudo-localization (lengthened strings with accented characters).
- Hierarchy must survive two-line titles: line height and spacing below a heading should still bind it to its content.

## 4. Scripts: CJK, Arabic and Hebrew, Indic, Thai, Vietnamese

| Script | Adjust |
|---|---|
| Chinese, Japanese, Korean | Glyphs are dense; body sometimes needs to be ~1–2px larger than Latin for equal legibility (judge by eye with the actual font) and line height around 1.6–1.8. Don't use italics (most CJK fonts have none; synthesized obliques look broken) — use weight or color for emphasis. Don't add letter-spacing to body. WCAG 1.4.8 (AAA) suggests ≤40 characters per line for CJK. |
| Arabic, Hebrew (RTL) | Mirror the layout (`dir="rtl"`, logical properties: `margin-inline-start`, `padding-inline`, `text-align: start`). The "top-left first" scan becomes top-right first. Arabic script has tall ascenders/descenders and diacritics: give it more line height (≈1.6+) and often a slightly larger size. Don't letter-space Arabic (it breaks joined letterforms). Uppercase has no meaning in these scripts — don't rely on ALL CAPS labels for hierarchy. |
| Devanagari and other Indic scripts | Marks above and below the main line need line height around 1.5–1.8 to avoid clipping; avoid tight `line-height` on headings in these scripts. No case distinction — uppercase labels don't exist. |
| Thai | Stacked vowel and tone marks; generous line height (≈1.6+); no spaces between words, so line breaking needs the browser's dictionary — don't force `word-break`. |
| Vietnamese | Stacked diacritics on Latin letters; tight display line heights (1.0–1.1) clip them — test headings with real Vietnamese text. |

General: use logical CSS properties (`inline`/`block`) so spacing and alignment mirror correctly; set `lang` on the page and on mixed-language fragments so the browser picks correct fonts and line breaking; choose fonts with the needed coverage, and match fallback metrics (`size-adjust`) so mixed-script lines don't jump.

## 5. User settings: zoom, font size, text spacing, Dynamic Type

- **Browser zoom to 200%** (WCAG 1.4.4) and **reflow at 320 CSS px wide** (1.4.10, equivalent to 400% zoom on a 1280px screen): no lost content or functions, no two-dimensional scrolling — except for content that needs it, like data tables, maps and diagrams.
- **User default font size**: rem-based type follows it; px-based type ignores it.
- **Text spacing override** (1.4.12): layouts survive line height 1.5×, paragraph spacing 2×, letter spacing 0.12×, word spacing 0.16× of the font size. No fixed heights on text boxes; no clipped single-line labels without a way to see the rest.
- **iOS Dynamic Type / Android font scale**: system text sizes can reach about 2× on Android and well beyond that in iOS accessibility sizes. Use platform text styles; let containers grow; switch horizontal layouts to vertical at large sizes; keep the hierarchy ordering even when everything is large.

## 6. Dark mode and high-contrast modes

- Same hierarchy, re-measured contrast, lighter weight for long light-on-dark passages, no pure white on pure black for body, elevation via lighter surfaces. See `weight-and-emphasis.md` Section 9.
- **Windows High Contrast / `forced-colors: active`**: the OS replaces your colors, so hierarchy that depends on background fills or subtle borders disappears. Keep hierarchy in size, weight, spacing and borders that use system colors; test with forced colors on.
- **`prefers-contrast: more`**: raise secondary and tertiary tiers toward primary contrast and strengthen dividers.

## 7. Native platforms

- **iOS**: use the system text styles (Large Title → Caption 2) so Dynamic Type works; 44×44pt targets; large titles collapse into the navigation bar on scroll — the hierarchy is designed for that.
- **Android / Material 3**: use the Material type roles (Display, Headline, Title, Body, Label); 48×48dp targets; component density per Material guidance.
- **Desktop (macOS, Windows)**: smaller default text (macOS body is 13pt) and pointer targets; productivity/operational profiles map naturally.
- **Cross-platform apps**: share role names, not pixel values — `title-2` maps to each platform's nearest native style.

## 8. Brand fonts and unusual metrics

- Display fonts with small x-heights need larger sizes for the same perceived size; condensed fonts need more tracking at small sizes or shouldn't be used small.
- Fonts with few weights limit weight-based hierarchy — lean on size and color tiers, or pair with a workhorse family for UI text.
- Variable fonts let you pick intermediate weights (e.g. 450 body, 650 headings) — still keep to 2–3 weights in use.
- Check numerals: some brand fonts have no tabular figures; use a UI font for tables if so.

## 9. Charts and data visualization

- The data is the hero: series strong, gridlines faint or absent, axes in `caption`, chart titles as `title-3` or `label`.
- One highlight color for the series that matters; others in neutrals. Label lines directly instead of relying on legends.
- Axis tick labels are the one place 11px text is commonly acceptable — keep 4.5:1 contrast.
- KPI numbers inside charts use `tabular-nums` so animated or updating values don't jitter.
- Never encode meaning by color alone: add labels, patterns or position.

## 10. Modals, drawers, popovers, toasts

- Overlays compress hierarchy: a dialog title is usually one step below the page title (`title-2` or `title-3`), body at the page's body size.
- One primary action per dialog, placed consistently (same side across the product).
- Drawers and side panels inherit the page's density profile.
- Toasts and tooltips: secondary size, short text, high contrast; never essential information that disappears.

## 11. Empty, loading, error, and extreme data

- **Skeletons** match the final layout's density and hierarchy (same row heights, same title widths), so the page doesn't jump.
- **Empty states** use the surface's density: a short line and one action in operational tools; an illustration and friendlier copy in consumer apps.
- **Errors**: inline next to the cause, in the error color plus an icon; page-level errors above the content they affect.
- **Extremes**: a 60-character name in a card title, a 12-digit number in a KPI, 0 and negative values, 1 vs 10,000 rows, missing images — decide truncation, wrapping and abbreviation rules (e.g. "1.2M") per role.

## 12. TV, kiosk, and large displays

- Viewing distance changes everything ("10-foot UI"): body text roughly 24–29px+ on 1080p TV layouts (Apple tvOS: 29pt default, 23pt minimum), big targets, focus-based navigation with a very visible focus state, fewer items per screen.
- Kiosks: touch at arm's length, often standing users; consumer profile with larger type and 48px+ targets.
- Wall dashboards (NOC screens): operational content at expressive sizes — few, huge numbers; state by color plus shape and label.

## 13. Small embedded UI: widgets, extensions, email

- **Widgets and browser extensions**: tiny canvases — two text levels at most, one action, density close to operational.
- **HTML email**: many clients ignore `rem` and modern CSS; use px, inline styles, web-safe fallbacks; 14–16px body, 22–28px headings; single column on mobile.
- **Embedded third-party UI** (payment fields, maps): match its type size to yours where configurable; don't let it set the hierarchy.

## 14. Print and PDF

- Use `pt` for print styles (body ~10–12pt), remove interactive chrome, keep headings with their content (`break-inside: avoid` on a wrapper around each heading and its first paragraph works in every engine; `break-after: avoid` on headings works only in Chromium), `break-inside: avoid` on short groups, and ensure links print their URLs where it matters.
