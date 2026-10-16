# Visual weight and emphasis

Visual weight is how strongly an element pulls the eye. Hierarchy is the ordering of that pull. Every screen has a fixed attention budget; spending it on everything is the same as spending it on nothing.

## Contents

1. The levers and what they cost
2. The focal point and the weight order
3. Actions: primary, secondary, tertiary
4. The emphasis budget
5. Demote, don't promote
6. Color: tiers, accent, meaning
7. Contrast floors
8. Imagery and icons
9. Dark mode
10. Tests

---

## 1. The levers and what they cost

| Lever | Pull | Cost | Best for |
|---|---|---|---|
| Size | strong | space | expressive/consumer headings, key numbers |
| Weight | strong at text scale | ~none | dense UI levels, identifiers, labels |
| Value contrast (dark vs light) | medium | none, but floors apply | primary/secondary/tertiary text |
| Hue and saturation | very strong | spends a signal reserved for meaning | actions, status, links, selection |
| Position and order | strong | none | the first thing in reading order |
| Whitespace / isolation | strong | space | hero content, the one primary action |
| Containment (fill, border) | medium | visual noise | grouping when space is scarce |
| Imagery, illustration, icons | very strong | competes with text | browsing, recognition |
| Motion | strongest | distraction | state change, feedback — never decoration |

Use the fewest levers that produce the intended order. Stacking every lever on one element (huge, bold, colored, boxed, animated) reads as shouting and leaves nothing for the next level.

Profiles change which levers you can afford: expressive and consumer surfaces spend size and whitespace; productivity and operational surfaces spend weight, value contrast and position, and save hue for meaning.

## 2. The focal point and the weight order

1. Write down the intended order for the screen: *1st* (the one thing), *2nd* (what supports it), *3rd* (everything else), *ignore* (chrome).
2. Assign weight top-down: the 1st gets the strongest combination, each later rank strictly less.
3. Check with the squint screenshot: the order you notice must match the written order.

Reading order matters: in left-to-right languages the top-left region is seen first in text-heavy screens; content above the fold gets more attention than content below it. Put the 1st where the eye already goes, and you need fewer other levers.

## 3. Actions: primary, secondary, tertiary

| Rank | Style | How many |
|---|---|---|
| Primary | filled, accent color, highest contrast | one per view (or per independent region, like a dialog) |
| Secondary | outlined or tonal (tinted fill), neutral color | a few |
| Tertiary | text button / link style | as needed |
| Destructive | error color, usually secondary style until confirmation | as needed |

- Two filled accent buttons side by side make the user stop and compare; demote one.
- In tables and lists, row-level actions are tertiary or in an overflow menu; the page-level primary action stays unique.
- Disabled is not a rank; don't use a disabled-looking style for secondary actions.
- A demoted button must still read as a button. A tonal fill barely different from the page (e.g. a pale green at ~1.1:1 against an off-white background) vanishes in the squint screenshot and reads as loose colored text; give it a fill or outline that survives the blur, or an icon plus label.
- A screen needs at least one obvious next step. If you demote the only action because the content should win, check the squint screenshot: the content should come first and the action clearly second — not absent.

## 4. The emphasis budget

- If more than about a third of the text on a screen is bold, colored, larger or boxed, emphasis has stopped working. (A heuristic, but a reliable one.)
- Inline emphasis in running text: a few phrases per screen, not every sentence.
- Accent color: a small share of the screen's area — actions, selection, the key data series. Large accent areas (hero backgrounds) are fine on expressive pages, never next to the primary action in the same hue.
- Badges, pills and dots multiply fast; each one is an interruption. Use them for state that changes, not for categories that never do.

## 5. Demote, don't promote

When a screen feels loud or flat, the instinct is to make the important thing bigger. Usually the better move is to make everything else quieter:

| Instead of | Do |
|---|---|
| Bigger, bolder title | Secondary color + one size down for metadata around it |
| A colored "important" label | Move it first in reading order; mute its neighbours |
| More boxes to separate | Remove boxes, increase the group gap |
| A second bright button | Turn it outlined or into a text button |
| Bold table headers *and* bold values | Headers in secondary color 600 at body size; values 400 |

Demotion works in every density; promotion runs out of space in dense UI.

## 6. Color: tiers, accent, meaning

**Text tiers** (on a light background, as a starting point — measure the real contrast):

| Tier | Use | Requirement |
|---|---|---|
| Primary | titles, body, values | highest contrast (often ≥ ~12:1) |
| Secondary | metadata, helper text, labels, table headers | ≥4.5:1 (3:1 if large text) |
| Tertiary | timestamps, de-emphasized hints | still ≥4.5:1 if it carries information |
| Disabled | inactive controls | exempt from WCAG contrast, keep it legible |

Three information-carrying tiers is the useful maximum; more become indistinguishable.

**Accent and semantic colors** carry meaning — action, link, selection, success, warning, error, info. Using them decoratively (a blue heading, a green border for no reason) dilutes the signal, so users stop trusting color.

**Never color alone** (WCAG 1.4.1): status needs a word or icon; links inside running text need an underline or another non-color cue (or a link color with at least 3:1 contrast against the surrounding text — WCAG technique G183; an underline on hover/focus is still good practice); charts need labels or patterns for the series that matter.

## 7. Contrast floors

| What | Minimum | WCAG |
|---|---|---|
| Body text and informative text | 4.5:1 | 1.4.3 (AA) |
| Large text (≥24px regular, or ≈18.7px bold — 18pt / 14pt) | 3:1 | 1.4.3 (AA) |
| Enhanced text | 7:1 (4.5:1 large) | 1.4.6 (AAA) |
| UI components and informative graphics (input borders when they're the only thing identifying the field, icons, focus rings, chart parts needed to understand them) | 3:1 against adjacent colors | 1.4.11 (AA) |
| Disabled controls, pure decoration, logotypes | exempt | — |

Placeholder text is text: WCAG 1.4.3 explicitly covers it, so it needs 4.5:1 (3:1 if large) — and it shouldn't replace a label anyway. Set `::placeholder { color: … }` explicitly: browser defaults differ (Chromium's grey passes on white; WebKit's lighter default, #a9a9a9, measures about 2.35:1). Text over images or gradients needs a scrim or a solid backing to guarantee contrast across the whole image.

## 8. Imagery and icons

- Images out-pull text. On browse surfaces that's the point; on task surfaces a large image can hijack the focal point — size it for its rank.
- The hierarchy must still work when images fail to load and in grayscale.
- Icons beside text reinforce; icons alone need a label (visible, or at least an accessible name and a tooltip). Size icons to the text they accompany — about the text's line height or a little less (16px icons with 14–16px text, 20px icons with 18–20px text) — and center them optically, not mathematically.
- Decorative icons on every row or every card are chrome; remove them before shrinking text.

## 9. Dark mode

- Same structure, same order: dark mode changes the palette and keeps the hierarchy.
- Light text on dark appears heavier and can "bloom", especially at small sizes; consider one weight step lighter for long passages, or slightly more letter-spacing, and avoid pure white (#fff) body text on pure black (#000).
- Elevation shows as lighter surfaces, not darker shadows.
- Re-measure every tier's contrast; secondary and tertiary tiers often fail in one mode after being tuned in the other.
- Saturated accents vibrate on dark backgrounds; use lighter, less saturated variants.

## 10. Tests

- **Squint / blur**: blur the screenshot (the audit script makes one) — the intended 1st, 2nd, 3rd should appear in that order, and groups should read as blocks.
- **Grayscale**: remove color — does the hierarchy survive? If not, it depends on hue.
- **Five-second test**: show the screen for five seconds and ask what it was for and what to do next.
- **Count the shouting**: number of filled accent buttons in the first viewport (aim: 1), share of bold text (aim: well under a third), number of distinct accent uses.
