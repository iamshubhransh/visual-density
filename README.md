# visual-density

A Claude skill for **visual hierarchy and density** in interfaces. It decides how much each
screen should carry for the people using it, then makes the order of importance
unmistakable — and measures the rendered page to prove it.

Agents tend to produce the same page every time: flat headings, padding that changes from
card to card, and a medium density that suits nobody — too loose for an operations table,
too cramped for a consumer app. This skill replaces that with decisions.

## What it does

1. **Classifies each surface** — expressive (landing, launch), consumer, reading (docs,
   articles), productivity (settings, email, project tools) or operational (dashboards,
   admin tables, monitoring) — adjusted for touch vs pointer, expert vs occasional users,
   and the task (read, browse, scan and compare, monitor, enter data). Every number that
   follows comes from that profile.
2. **Builds the type scale** — body first, a ratio at the top and 2px steps below, levels
   at least ~20% apart or separated by weight, roles instead of raw sizes (`title-2`,
   `meta`, `label`), line heights on a 4px grid, fluid headings that survive 200% zoom.
3. **Sets spacing and rhythm** — a 4px scale and a proximity ladder (related → item →
   group → section) per profile, headings that bind to what follows, one padding per
   component.
4. **Spends visual weight deliberately** — one focal point and one primary action per
   view, an emphasis budget, color tiers that pass WCAG contrast, nothing conveyed by
   color alone.
5. **Keeps headings in parity and pages scannable** — same level, same look; siblings
   identical; no inversions; headings that summarise the page on their own.
6. **Chooses density on purpose** — raise it by removing chrome before shrinking type;
   compact / comfortable modes that change spacing, not type; floors for text, contrast
   and touch targets that never move.
7. **Encodes it as tokens** — CSS custom properties, Tailwind v4 `@theme`, or JSON.
8. **Verifies** — a bundled audit loads the page in Chromium at desktop and phone sizes
   and reports what is actually there, plus a blurred grayscale "squint" screenshot.

It works in three modes: **create** a system, **audit** a screen without touching it
(a report you can share with the team), or **fix** — audit, change the code, re-measure.

## What's in the box

| | |
|---|---|
| `SKILL.md` | the eight-step framework, rules with ranges per profile, and a verify checklist |
| `references/` | type scale (ratios, platform scales, fluid type), spacing, density (tables, forms, dashboards, density modes), weight and emphasis, headings and scanning, edge cases (design systems, localization and scripts, dark mode, native, charts, TV, print), audit guide |
| `scripts/scale.mjs` | generates the type scale, line heights, tracking, roles, spacing tiers and density tokens for a profile |
| `scripts/audit.mjs` | measures a URL or HTML file with Playwright: font-size inventory and near-misses, off-grid spacing, heading outline, parity, inversions and floating headings, line length, contrast, target sizes, table alignment and row heights, competing primary buttons, overflow — plus normal and squint screenshots |
| `scripts/inventory.js` | the measuring code; also works pasted into any browser's DevTools console |

```bash
node scripts/scale.mjs --profile operational --format css
node scripts/audit.mjs http://localhost:3000/orders --profile operational --viewports 1440x900,390x844
```

The audit needs Node 18+ and Playwright. If Playwright isn't installed it prints a one-line
install into a shared tool folder that leaves your project untouched; it uses an installed
Chrome or Edge if Playwright's browser isn't downloaded.

## Install

### npx skills

```bash
npx skills add iamshubhransh/visual-density
```

### One-line install

```bash
curl -fsSL https://raw.githubusercontent.com/iamshubhransh/visual-density/main/install.sh | bash
```

> Like to read before you pipe to `bash`? [Review `install.sh`](./install.sh) first,
> or clone the repo and run `./install.sh` locally.

### Claude Code plugin

```text
/plugin marketplace add iamshubhransh/visual-density
/plugin install visual-density@visual-density
```

### claude.ai

Download `visual-density.zip` from the [latest release](https://github.com/iamshubhransh/visual-density/releases/latest),
then go to **Customize → Skills → Upload a skill**. (The scripts need a code-execution
environment with Node; the framework itself works anywhere.)

## Use it

Just describe the problem — the skill loads itself:

- *"Our ops team says the shipments dashboard feels flat and takes forever to scan."*
- *"Set up a type scale and spacing tokens for our new mobile-first app."*
- *"Agents want more rows on the orders table, but some use iPads — add a density option."*
- *"Audit our landing page's hierarchy and write a report for the redesign kickoff."*
- *"Is 14px body text OK for a consumer banking app?"*

Or call it directly with `/visual-density`.

## How it was tested

Five realistic tasks (fix a flat ops dashboard, create a consumer type system, clean up a
settings page, add a density toggle, audit a landing page), each run with and without the
skill and graded by separate agents that measured the results in a browser. Across 66
checks the skill-guided runs passed 98.5%, against 70% without it; most of the difference
is system discipline — a consistent scale, 4px spacing, sibling parity, line length,
mobile reflow — rather than polish. Facts (WCAG criteria, Apple and Material guidance,
Tailwind syntax, browser support) were checked against their sources.

## Repo layout

```
install.sh                                  # curl|bash installer
.claude-plugin/marketplace.json             # marketplace catalog
plugins/visual-density/
├── .claude-plugin/plugin.json              # plugin manifest
└── skills/visual-density/
    ├── SKILL.md                            # the framework
    ├── references/                         # depth, read on demand
    └── scripts/                            # scale.mjs, audit.mjs, inventory.js
```

## License

MIT — see [LICENSE](./LICENSE).
