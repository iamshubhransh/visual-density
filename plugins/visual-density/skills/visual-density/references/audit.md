# Auditing hierarchy and density

How to audit a screen: run the measurements, read them correctly, add the judgement only a human eye (or yours) can make, and report findings that a team can act on.

## Contents

1. Procedure
2. Running the scripts
3. Reading the numbers
4. Known blind spots
5. What to check by eye
6. Severity
7. Report template
8. Fixing and re-measuring

---

## 1. Procedure

1. **Classify the surface** (SKILL.md Step 1). Every threshold depends on the profile.
2. **Write the intended order** of attention: 1st, 2nd, 3rd, ignore. Without it you can't judge whether the hierarchy is right — only whether it's consistent.
3. **Measure** with `scripts/audit.mjs` at the viewports people use (and `--dark` if the product has dark mode).
4. **Look** at the normal and squint screenshots; do the eye checks in Section 5.
5. **Read the code** for the causes: where the values come from (tokens, utilities, one-off CSS), which components repeat.
6. **Rank findings** by severity (Section 6) and write the report (Section 7).

If the user asked for an audit only, stop there and change nothing.

## 2. Running the scripts

```bash
# from anywhere (see "Playwright missing" below if it isn't installed)
node <skill>/scripts/audit.mjs http://localhost:3000/orders --profile operational
node <skill>/scripts/audit.mjs ./dist/index.html --profile consumer --viewports 1440x900,768x1024,390x844
node <skill>/scripts/audit.mjs https://example.com --profile reading --dark --out ./audit-dark
node <skill>/scripts/audit.mjs http://localhost:5173 --selector "[data-ready]" --wait 1500   # late-rendering apps
```

Outputs (in `--out`, default `./vh-audit`): `report.md`, `report.json`, `<W>x<H>.png`, `<W>x<H>-squint.png`. Look at the PNGs — they are part of the evidence.

- **Playwright missing**: install it once where every project can use it — `npm i --prefix ~/.cache/visual-density playwright && npx --prefix ~/.cache/visual-density playwright install chromium` — or in the project with `npm i -D playwright && npx playwright install chromium`. The script looks in the current folder, the page's folder, the skill's `scripts/` folder, the shared folder (override with `VH_TOOLS_DIR`), then globally; if Playwright's Chromium isn't downloaded it tries an installed Chrome or Edge.
- **No Node at all**: open the page, open DevTools → Console, paste the contents of `scripts/inventory.js`. It prints the findings and returns the full result; `vhInventory({ profile: 'operational' })` re-runs it with a profile.
- **Pages behind login**: run against a local dev server with a seeded session, or paste `inventory.js` into the console of the logged-in page.
- **Single-page apps**: use `--selector` for an element that appears once data has loaded, or a longer `--wait`.
- **Strict CSP**: the runner bypasses CSP in its own browser; the console route works on most sites too.

## 3. Reading the numbers

| Measure | What it means | Typical action |
|---|---|---|
| Body (most-used size) | the size carrying the most characters; when another size under 24px carries nearly as much (≥75%), the report calls it a close call and takes the larger | compare with the profile's body range; on a close call, check which size the main content actually uses |
| Sizes and share of text | every font size on the whole page and how much text uses it (7+ is flagged low, 10+ medium — a long page spans several screens) | >5 on one screen or near-misses → consolidate onto roles |
| Near-miss sizes | sizes ≤1px or <6% apart | merge; they're almost always accidents |
| Weights | weights in use and their share | >3 weights → consolidate; >~35% at 600+ → emphasis inflation |
| Line-height issues | multi-line blocks with line height <1.3 or >2.0 (body) or >1.5 (large headings) | fix in tokens |
| Spacing values / off-grid share | every margin, padding and gap in use; share not on the 4px grid | snap to the scale; >10% off-grid means spacing was eyeballed |
| Heading outline | headings in order with computed size/weight | check order, skipped levels, h1 count |
| Parity (headings) | a heading level rendered in more than one style | one token per level |
| Inversions | a lower level's median size above a higher level's | remap levels to roles |
| Flat headings | headings no larger than body and not bold | they read as body text — strengthen |
| Pseudo-headings | short bold/large text that isn't a heading | mark up as a heading or demote (labels and KPI numbers are excluded where detectable) |
| Heading spacing (above/below) | whitespace to the nearest content or visible container edge above and below; an eyebrow directly above counts as part of the heading; a heading that opens a card or panel is measured from the card's top edge | under 1.5× is flagged as floating; 1.5–2× is weak — the rule is ≥2× |
| Sibling parity | repeated components (same classes, ≥3 siblings) with different padding or text styles | one padding and one internal structure per component |
| Measure | characters in a full line of multi-line paragraphs (content width ÷ average glyph width) | 45–75 comfortable; >90 flagged |
| Contrast | text vs composited background, WCAG formula | <4.5:1 (<3:1 large) flagged; disabled controls skipped |
| Targets | interactive elements under 24×24 after WCAG 2.5.8's inline and spacing exceptions; under 44×44 on touch viewports | enlarge hit areas or space them |
| Tables | row heights (judged against the productivity and operational ranges on pointer viewports), header vs cell style, numeric cells not right-aligned or not tabular | tighten cell padding; right-align, `tabular-nums`, headers by weight not size |
| Filled accent buttons | saturated filled buttons in the first viewport | usually one primary per view |
| Overflow | the page is wider than the viewport — it scrolls sideways, or a mobile browser zooms it out to fit; or content is cut off at the left edge, where nobody can scroll to it | fix before judging mobile sizes (WCAG 1.4.10) |
| Form-control font | buttons/inputs not using the page's font | `font: inherit` on form controls |

## 4. Known blind spots

The script measures the rendered DOM. It can't know intent, and some measurements are approximations:

- **Contrast** composites solid background colors only. Text over images, gradients or video is counted as "unknown" — check it by eye or sample pixels. Text with a CSS `opacity` animation or `mix-blend-mode` may be misjudged.
- **Canvas, WebGL, SVG text and images of text** are not measured.
- **Iframes and closed shadow roots** are skipped (open shadow roots are included).
- **Content off-screen** (carousels, hidden tabs, collapsed accordions) is measured only if it's rendered and visible.
- **Heading spacing** uses the nearest text, media, control or visible container edge (border, fill, shadow) above and below in the same horizontal band; side-by-side layouts can still produce odd pairs — confirm floating headings on the screenshot.
- **Sibling parity** groups components by identical classes; a deliberate "featured" variant is flagged too — keep it if it's intentional and unique.
- **Numeric detection** treats bare numbers as numeric; ID-like numbers ("4521") may be flagged as not right-aligned even when left alignment is correct for identifiers. A number that fills its cell edge to edge isn't judged.
- **Bold share** counts characters at weight ≥600; a list whose item names are deliberately semibold can cross the one-third line legitimately — judge it on the squint screenshot.
- **Pseudo-headings** can catch brand names or big labels; demote or ignore with a reason.
- **Mobile emulation** behaves like a phone: if the page is wider than the viewport, the browser zooms it out (the report shows how wide the page really is) and may inflate text. Fix overflow first, then re-read sizes and screenshots.
- **Fonts**: if a webfont fails to load, metrics come from the fallback. Check `families` in the report.

Treat a measured finding as a prompt to look. Say in the report when you've dismissed one and why.

## 5. What to check by eye

- **Squint screenshot**: list what you notice in order. Compare with the intended order. Do groups read as blocks? Does any "ignore" element stand out?
- **Headings-only read**: do the headings alone summarise the page, at visually correct levels?
- **First focal point**: what's the first thing you see in the normal screenshot? Is it the intended 1st?
- **Primary action**: is there exactly one, and is it the most prominent action?
- **Alignment**: count distinct left edges per column in the squint image.
- **Density fit**: does the screen match the profile? (An operational table showing 6 rows per screen, or a consumer screen with 9 competing modules, is a profile mismatch.)
- **Parity by comparison**: put two sibling cards or sections side by side and list differences.
- **Stress**: longest real string, empty state, many items, translation length, 200% zoom, dark mode.

## 6. Severity

| Severity | Meaning | Examples |
|---|---|---|
| **High** | blocks comprehension or accessibility; fix first | contrast failures on informative text; heading inversions; body below the profile floor; essential text below 12px; no identifiable focal point; horizontal overflow on mobile |
| **Medium** | misleads or slows scanning; inconsistency users notice | near-miss sizes; floating headings; parity breaks; flat headings; off-grid spacing >10%; numeric columns left-aligned; several competing primary buttons; profile mismatch (consumer padding on an ops table) |
| **Low** | polish and robustness | 4+ weights; skipped heading levels; pseudo-headings; form controls with the default font; minor off-grid values; touch targets 24–43px on touch |

The script reports all text below the profile floor as Medium; promote it to High when the text is essential (prices, status, errors). Severity can move with context: a contrast failure on a legal footnote is still a failure, but a parity break between a deliberate hero card and its siblings may be intended.

## 7. Report template

```markdown
# Hierarchy & density audit — <screen>

**Profile:** <profile> · <input> · <users/frequency> · <task>
**Verdict:** <one sentence: e.g. "Flat and over-padded for an operations table: headings read as body text, eight equal-weight buttons compete, and 6 of 8 rows fall below the fold.">
**Intended order:** 1. <…> 2. <…> 3. <…> · ignore: <…>
**Observed order (squint):** 1. <…> 2. <…> 3. <…>

## Measured
| | Now | Target |
|---|---|---|
| Body size | 16px | 13–14px |
| Sizes on screen | 10 (near-misses 15/16/17) | ≤5, no near-misses |
| Off-grid spacing | 95% | <10% |
| Heading spacing (above/below) | 26/26 | ≥2:1 |
| Table row height | 59px | 28–40px |
| Contrast failures | 25 elements | 0 |
| Filled primary buttons in view | 8 | 1 |

## Findings
1. **[High] <title>** — <what, where (selector / screenshot region), measured value>. *Rule:* <which rule and why it matters>. *Fix:* <the token or code change, with values>.
2. …

## Keep
- <what already works and should not be changed>

## Fix order
1. Tokens (type roles, spacing tiers, color tiers) — <list>
2. Components — <list>
3. Screens — <list>
```

Keep findings concrete: "Section headings (h2) are 16px/500 — the same as body; set them to `title-2` (20px/600) with 32px above and 12px below" beats "headings need more hierarchy".

Write for the people who will read it — usually a team that never saw this skill:

- Name the profile in plain words ("a marketing landing page: large type, generous spacing, one action") rather than as a label alone; don't mention the skill, its scripts or their names. "Measured in Chrome at 1440 and 390px wide" is enough method.
- Quote a number only if you measured it or read it from the code, and say which. Before sending, re-check every number against the report and the CSS; a wrong number costs the whole report its credibility.
- Keep the verdict to one or two sentences, then a short "what's working" list so the team knows what to protect.
- Keep it scannable: about ten findings at most (merge related ones), two to four lines each, and each number stated once — in the Measured table or in the finding, not both. A report the team reads beats a complete one they skim.

## 8. Fixing and re-measuring

1. Fix tokens first (roles, tiers, colors), then components, then one-off screen CSS.
2. Keep the content and structure unless the user asked for restructuring; hierarchy fixes are mostly type, spacing, color and order.
3. Re-run the audit with the same viewports and profile. Report before → after for the measured rows.
4. Re-check the squint screenshot: the observed order should now match the intended order.
5. Note anything you deliberately left (and why), so the next audit doesn't re-flag it as new.
