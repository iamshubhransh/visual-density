# Density

Density is how much information a screen asks the user to process at once. It is a product decision tied to who uses the surface, how often, and for what — not a style preference. The failure is the undecided middle.

## Contents

1. Choosing density
2. Consumer vs operational, side by side
3. How to raise density (in order)
4. How to lower density
5. Density modes
6. Tables and lists
7. Forms
8. Dashboards
9. Touch, pointer, and floors
10. Mixed products

---

## 1. Choosing density

| Signal | Points to higher density | Points to lower density |
|---|---|---|
| Frequency | daily, hours per day | occasional, once a month |
| Expertise | trained, domain experts | first-time, general public |
| Task | compare, monitor, triage, bulk-edit | decide, buy, learn, read |
| Input | mouse + keyboard | touch |
| Screen | large desktop | phone, small laptop |
| Cost of a miss | low per item, many items | high per item (payments, health) |
| Content | structured, repetitive (rows) | varied, visual, narrative |

Weigh them, pick the profile (see SKILL.md Step 1), and write it down. When signals conflict (experts on tablets; consumers managing many records), choose the default for the majority and offer a density mode for the rest.

## 2. Consumer vs operational, side by side

| | Consumer | Operational |
|---|---|---|
| Body | 16–18px | 13–14px |
| Scale | ratio ~1.2–1.25, size does much of the work | small steps; weight, color tier and position do the work |
| Per screen | one main task, one primary action | many items, several secondary actions, still one primary |
| Spacing | generous; whitespace groups | compressed tiers; dividers and fills group |
| Rows | 56–72px list rows, imagery | 28–40px rows, no imagery |
| Numbers | big, few, contextual ("$1,240 spent") | many, aligned, tabular, comparable |
| Color | brand-forward, decorative allowed | reserved for state and action |
| Navigation | progressive disclosure | everything reachable; keyboard shortcuts |
| Empty space signals | calm, premium | wasted screen, scrolling |
| Failure mode | crammed admin look | "dashboard with consumer padding": 64px rows, 4 rows per screen |

Between them sit **productivity** surfaces (email, project tools, settings): 14–15px body, 32–40px controls, 36–48px rows.

## 3. How to raise density (in order)

1. **Remove chrome.** Boxes around groups, borders around cards inside cards, decorative icons, repeated labels ("Status: Active" in every row → a Status column), repeated units (put "USD" in the header), redundant helper text, oversized empty states.
2. **Remove or demote low-value content.** Hide rarely used columns behind a column picker; move secondary metadata into a hover or detail view.
3. **Tighten the spacing ladder** — compress every tier but keep the ratios (Section 2 of `spacing-and-rhythm.md`).
4. **Reduce row and control height** to the profile's compact values.
5. **Use space horizontally.** Multi-column layouts, inline label/value pairs, side panels instead of stacked sections.
6. **Only then step type down once** — never below the profile floor.

Never: shrink body below the floor, drop line height below ~1.3 for multi-line text, remove the space that separates groups, or shrink click/tap targets below 24×24 CSS px.

## 4. How to lower density

For consumer and expressive surfaces that feel crammed:

1. Split into steps or sections (progressive disclosure) rather than spreading the same content thinner.
2. One primary action per screen; move the rest to a menu or secondary style.
3. Increase the upper tiers of the spacing ladder (group, section) before the lower ones.
4. Raise body to the profile's range; give headings a larger ratio.
5. Replace tables with lists or cards when items are few and varied.

## 5. Density modes

Many operational and productivity products need a user-selectable density. Implement it as a set of tokens switched by an attribute:

```css
:root,
[data-density="default"]     { --row-h: 40px; --control-h: 36px; --cell-px: 12px; --cell-py: 8px;  --space-item: 12px; --space-group: 24px; }
[data-density="compact"]     { --row-h: 32px; --control-h: 28px; --cell-px: 8px;  --cell-py: 4px;  --space-item: 8px;  --space-group: 16px; }
[data-density="comfortable"] { --row-h: 52px; --control-h: 44px; --cell-px: 16px; --cell-py: 12px; --space-item: 16px; --space-group: 32px; }
/* productivity values (what scale.mjs --profile productivity emits); operational shifts down: rows 28 / 36 / 48 */

@media (pointer: coarse) {
  :root:not([data-density]) { --row-h: 48px; --control-h: 44px; }  /* touch default */
}
```

Rules:

- **Modes change spacing and component heights, not the type scale.** Shrinking 14px to 13px saves at most one 4px line-height step per row (often nothing: both sit on a 20px line); cell padding saves 8–16px and keeps text readable. If a product insists on smaller compact type, drop the whole table's body one 2px step at most and never below 12px — and say why in the decision record.
- **Persist the choice** per user (local storage or a profile setting) and apply it before first paint to avoid a flash.
- **Default by input:** comfortable on coarse pointers; the product's chosen default on fine pointers.
- **Floors hold in every mode:** text floor, contrast, 24×24 CSS px targets (44 on touch — a compact row on touch is still a 44px tap target; make the whole row the target).
- **Name modes by outcome** in the UI ("Compact", "Default", "Comfortable"), and preview the effect.
- **Material Design 2's density scale** works the same way: 0 is the default and each step (−1, −2, −3) removes 4dp of component height. Material keeps 48×48dp targets as the default, makes high density something users opt into (dense components don't meet its accessibility requirements), and says not to densify focused-task components (pickers, menus) or alerts (dialogs, snackbars).

## 6. Tables and lists

| | Compact | Default | Comfortable |
|---|---|---|---|
| Row height | 28–32 | 36–40 | 48–56 |
| Cell horizontal padding | 8 | 12 | 16 |
| Body text | same in every mode (14; 13 only if the whole product is 13) | same | same |

Rules:

- **Header cells**: same size as body or one step smaller, distinguished by weight (600) and/or secondary color — not by being larger. Sticky when the table scrolls.
- **Identifying column** (name, ID, title) in `body-strong`; supporting columns in body or secondary.
- **Numbers**: right-aligned, `tabular-nums`, fixed decimals per column, units in the header. Align the header label with its column (right-aligned header over a right-aligned column).
- **Text**: left-aligned; truncate long values with an ellipsis and expose the full value; don't wrap rows in compact mode. A `title` tooltip only works with a mouse — on touch, the full value must be reachable another way (the row's detail view, an expandable row, or wrapping instead of truncating on coarse pointers).
- **Status**: text label plus color or icon, never color alone.
- **Row separation**: dividers *or* zebra striping, not both; hover highlight on interactive rows.
- **Actions**: one primary action per row at most; the rest in an overflow menu; avoid a row of icon buttons on every line.
- **Narrow screens**: pin the identifying column and scroll the rest horizontally (WCAG 1.4.10 allows two-dimensional scrolling for data tables), or switch to a card list for few-column data.
- **Lists in consumer apps**: 56–72px rows with a primary line (body-strong), a secondary line (secondary tier), optional leading image, trailing value or chevron. Whole row is the tap target.

## 7. Forms

| Gap | Consumer | Productivity | Operational |
|---|---|---|---|
| label ↔ input | 8 | 4–8 | 4 |
| input ↔ helper/error | 4–8 | 4 | 4 |
| field ↔ field | 20–24 | 16 | 12 |
| group ↔ group | 40–48 | 32 | 24 |
| last field ↔ actions | 32 | 24 | 16 |

- Labels above inputs (fastest to scan, survives long labels and translation); left-aligned labels only for dense, two-column operational forms with short labels.
- Label in `label` role, input text in `body`, helper text in `meta` with the secondary color tier, errors in the error color plus an icon, placed next to the field.
- One primary submit button; "Cancel" as secondary or text.
- Input height = control height for the profile (44–48 consumer/touch; 32–40 productivity; 28–36 operational); input text ≥16px on mobile web.

## 8. Dashboards

1. **One primary metric zone** — the numbers the user opens the page for, at the top-left of the reading order.
2. **KPI cards in strict parity** — same size, padding, label position, number style, trend style. Equal metrics get equal weight; a "hero" metric is a deliberate exception, and there is only one.
3. **Numbers in `display` role, labels in `meta` or `label`.** The value is primary, the label secondary — consistently across all cards.
4. **Trends** as small text with an arrow icon plus color (not color alone), stating the comparison period ("+4.2% vs last week").
5. **Charts**: emphasize the data, mute the chrome — light gridlines or none, direct labels instead of legends where possible, axis text in `caption`, one highlight color for the series that matters.
6. **Density**: dashboards are monitored at a glance; prefer fewer, larger, well-ordered metrics over dozens of equal tiles. If everything is important, ask which three numbers would wake someone up at night.

## 9. Touch, pointer, and floors

| Floor | Value | Source |
|---|---|---|
| Target size, web minimum | 24×24 CSS px (or enough spacing around it) | WCAG 2.2 SC 2.5.8 (AA) |
| Target size, web enhanced | 44×44 CSS px | WCAG SC 2.5.5 (AAA) |
| Target size, iOS | 44×44 pt hit region (visible controls can be as small as 28×28 pt) | Apple Human Interface Guidelines |
| Target size, Android | 48×48 dp | Material Design |
| Essential text | 12px web (some profile floors are higher) | convention |
| Text contrast | 4.5:1 (3:1 large) | WCAG 1.4.3 (AA) |
| Non-text contrast | 3:1 | WCAG 1.4.11 (AA) |

WCAG 2.5.8 has five exceptions — **spacing** (an undersized target passes if a 24 CSS px circle centred on its bounding box doesn't intersect another target or another undersized target's circle), **equivalent** (another control on the same page does the same thing and meets the size), **inline** (the target is in a sentence, or its size is constrained by the line height of surrounding text), **user-agent control** (unmodified browser controls), and **essential** (the presentation is essential or legally required). Don't design to the exceptions.

A visually small control can have a larger hit area (padding, or a pseudo-element extending the target) as long as hit areas don't overlap.

## 10. Mixed products

- **Profile per surface, shared foundations.** Marketing, app, docs and admin share the spacing unit, color tokens and font family, but each surface picks its own body size, scale ratio and spacing tier values.
- **Local density shifts.** A consumer banking app's transaction list can be locally denser (smaller rows, tabular amounts) than its home screen — keep the type roles the same and change the spacing tier values.
- **Embedded data in content** (a pricing table on a landing page, a spec table in docs): use the operational table rules at the reading surface's body size.
- **Admin inside a consumer product**: give it the productivity profile; don't stretch consumer components to fit data.
