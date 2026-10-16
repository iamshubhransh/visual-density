# Headings, parity, and scanning

Most people scan a screen before (or instead of) reading it. Headings, labels and alignment are the scanning infrastructure; parity makes it predictable.

## Contents

1. How people scan
2. Heading levels: visual vs semantic
3. Parity rules
4. Inversions
5. Writing headings for scanners
6. Labels, values, eyebrows
7. Tables and lists
8. Long pages and navigation aids
9. Checks

---

## 1. How people scan

Eyetracking research by Nielsen Norman Group describes several scanning patterns. The ones that matter for hierarchy:

- **F-pattern** — when text has no strong cues, people read the first lines, then scan down the left edge, reading less and less. It's a symptom of poor hierarchy.
- **Layer-cake** — people jump from heading to heading and read body text only under the headings that matter. This is the pattern to design for: it works only when headings are visually distinct, consistent, and meaningful.
- **Spotted** — people hunt for a specific kind of thing (a number, a link, a date, a name). Consistent styling of each kind (all prices in the same style and position) makes spotting fast.
- **Commitment** — motivated readers read everything; reading surfaces must still serve them with comfortable measure and rhythm.

Sparse marketing layouts are often described as a Z-pattern (top left → top right → diagonal → bottom); treat it as a rule of thumb for placing the logo, headline and primary action.

Implications: a strong, consistent left edge; headings that work as a summary; repeated content types styled identically; the key item placed where the scan starts.

## 2. Heading levels: visual vs semantic

Two separate decisions:

- **Semantic level** (`h1`–`h6`, or `role="heading"` with `aria-level`) builds the document outline that screen-reader users navigate by. Choose it by structure: one `h1` for the page; sections `h2`; their sub-sections `h3`; and so on, without skipping levels downward.
- **Visual level** (the role token: `title-1`, `title-2`, …) is chosen by importance in this context.

They usually match, but don't have to: a dialog's title can be `h2` styled `title-3`; a card title in a dashboard can be `h3` styled `label`. Never pick a tag for its default look, and never fake a heading with a bold `div` — if it introduces a section, mark it up as a heading (WCAG 1.3.1 Info and Relationships). The outline rules (one `h1`, no skipped levels) are widely recommended best practice; WCAG requires headings to be marked up and descriptive (1.3.1, 2.4.6), not a specific level order.

## 3. Parity rules

Parity: things of equal importance look equal, everywhere.

1. **One style per level, product-wide.** Every section title in the product uses `title-2`; every card title uses `title-3`. A level rendered three different ways is three accidents.
2. **Siblings share a level.** Sections on the same page that are equally important get the same heading level and style. Cards in a grid, columns in a comparison, steps in a flow: identical title style.
3. **Siblings share a structure.** Same internal order (title → meta → body → action), same spacing, same alignment. If one card has an icon, they all have one (or none do).
4. **Equal-importance items get equal weight.** No card is bolder, larger or more colorful unless it is deliberately the hero — and then there is exactly one, and the difference is obvious, not 2px.
5. **Parallel content.** Sibling headings use the same grammatical form and similar length: nouns ("Billing", "Team", "Security") or verbs ("Invite members", "Export data"), not a mix.
6. **Consistent placement.** The same kind of element sits in the same place across screens (the page title, the primary action, the filters), so returning users don't hunt.

## 4. Inversions

An inversion is a lower-ranked element that out-weighs a higher-ranked one. Common ones:

| Inversion | Fix |
|---|---|
| `h3` rendered larger than the `h2` above it | map levels to roles in strict order |
| Card titles larger than the section title | step card titles down a role |
| Labels bolder/darker than the values they label (in a value-first context) | labels → secondary tier; values → primary |
| Table headers larger than cell content | headers same size or smaller, distinguished by weight/color |
| Sidebar navigation louder than page content | demote navigation (secondary tier, regular weight); keep the active item clear |
| Helper text darker than the input value | helper → secondary tier |
| A decorative illustration out-pulling the primary action | resize or move the illustration |

Label vs value: decide per context and keep it consistent. On dashboards and summaries, the **value** is primary (people come for the number); in forms and settings, the **label** is the anchor (people come for the setting) and the value is the editable control. Don't mix both conventions on one screen.

## 5. Writing headings for scanners

- Front-load: the first two or three words should carry the meaning ("Billing history", not "View your complete billing history").
- Specific beats clever: "Shipments delayed today" over "Heads up".
- Short: about 2–6 words for section titles in product UI.
- Sentence case is the convention in most product style guides and reads more naturally than Title Case or ALL CAPS in longer headings; ALL CAPS only for short labels, with added tracking.
- Avoid repeating the page name in every section heading ("Settings — Billing", "Settings — Team").

## 6. Labels, values, eyebrows

- **Labels** (`label` role): smaller or same size as the content, secondary tier or 500–600 weight — never both larger and bolder than the content they label.
- **Eyebrows / overlines** (small uppercase text above a title): add context like a category or step ("Step 2 of 4"). Use sparingly — at most one per section header, and not on every card. An eyebrow + title + subtitle + badge on every section is four levels of hierarchy where one would do.
- **Subtitles**: one sentence in the secondary tier, `related` gap below the title.
- **Units**: smaller and/or secondary next to big numbers ("1,240 kg", with "kg" in secondary), or in the column header for tables.

## 7. Tables and lists

- Column headers are the table's headings: consistent style (weight 600 or secondary tier, same size as cells or one step smaller), aligned like their columns, sticky on scroll.
- The identifying column carries the most weight; other columns are quieter.
- Group rows under group headers (with the group tier of spacing or a filled header row) when the data has natural sections.
- Lists: primary line, secondary line, trailing value — in that weight order, identical on every row.
- Keep numbers right-aligned in tabular figures so magnitudes can be compared by length.

## 8. Long pages and navigation aids

- A table of contents or sticky section index for pages longer than about three screens.
- Section headings sticky within their section for long lists (contacts A–Z, grouped transactions) — but make sure sticky elements never entirely hide a focused element (WCAG 2.4.11 Focus Not Obscured (Minimum), AA); ideally they hide none of it (2.4.12, AAA). `scroll-padding-top` equal to the sticky height does most of the work.
- "Back to top" and in-page anchors for reading surfaces; anchors land with the heading visible below any sticky header (`scroll-margin-top`).

## 9. Checks

- **Headings-only read**: read only the headings, top to bottom. They should summarise the page and their visual levels should match their importance.
- **Outline**: the audit script lists the heading outline with each heading's computed style — check for skipped levels, a missing or duplicated `h1`, level variants (parity) and inversions.
- **Pseudo-headings**: the audit flags bold/large short text that isn't marked up as a heading — mark them up or demote them.
- **Sibling diff**: pick any two sibling cards or sections and compare title size, weight, color, spacing and internal order. Any difference needs a reason.
