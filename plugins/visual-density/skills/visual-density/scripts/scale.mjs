#!/usr/bin/env node
// visual-density · scale generator
//
// Generates a type scale, line heights, tracking, role mapping, spacing tiers and density tokens
// from a surface profile, following the rules in references/type-scale.md. No dependencies.
//
//   node scale.mjs --profile consumer
//   node scale.mjs --profile operational --format css
//   node scale.mjs --base 17 --ratio 1.25 --mobile-ratio 1.2 --format tailwind
//
// Run with --help for all options.

const PROFILES = {
  expressive:   { base: 18, ratio: 1.333, mobileRatio: 1.2,   up: 6, floor: 14, smallStep: 2, dense: false,
                  tiers: { related: 8, item: 24, group: 48, section: 128 }, control: 48, row: null },
  consumer:     { base: 16, ratio: 1.25,  mobileRatio: 1.2,   up: 5, floor: 12, smallStep: 2, dense: false,
                  tiers: { related: 8, item: 16, group: 32, section: 64 }, control: 44, row: 64 },
  reading:      { base: 18, ratio: 1.25,  mobileRatio: 1.2,   up: 4, floor: 14, smallStep: 2, dense: false,
                  tiers: { related: 8, item: 16, group: 32, section: 64 }, control: 44, row: null },
  productivity: { base: 14, ratio: 1.2,   mobileRatio: 1.2,   up: 4, floor: 12, smallStep: 2, dense: true,
                  tiers: { related: 8, item: 12, group: 24, section: 40 }, control: 36, row: 40 },
  operational:  { base: 14, ratio: 1.2,   mobileRatio: 1.2,   up: 4, floor: 12, smallStep: 2, dense: true,
                  tiers: { related: 4, item: 8, group: 16, section: 32 }, control: 32, row: 36 },
};

const HELP = `visual-density scale generator

Usage: node scale.mjs [options]

  --profile <name>      expressive | consumer | reading | productivity | operational  (default: consumer)
  --base <px>           body size in px (overrides the profile)
  --ratio <n>           desktop ratio for steps above body, e.g. 1.25 (overrides the profile)
  --mobile-ratio <n>    ratio used at the smallest viewport (defaults to the profile's; = --ratio to disable fluid type)
  --up <n>              number of steps above body (default from profile)
  --floor <px>          smallest allowed size (default from profile)
  --min-vw <px>         viewport where the mobile scale applies (default 360)
  --max-vw <px>         viewport where the desktop scale applies (default 1440)
  --root <px>           root font size used for rem conversion (default 16)
  --format <f>          table | css | tailwind | json  (default: table)
  -h, --help            show this help

Rounding: whole px below 16, even px from 16, multiples of 4 from 40. Steps below body go down by
2px to the floor, at most two steps (sizes 1px apart read as accidents); if no 2px step fits, smaller
roles share body size. Body and smaller steps get running-text line heights (≥ ~1.45 from 15px). Line heights snap to 4px. Fluid sizes use
clamp(rem, rem + vw, rem) so browser zoom keeps working.`;

// ---------- args ----------
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') { out.help = true; continue; }
    if (!a.startsWith('--')) fail(`Unexpected argument "${a}". Use --help.`);
    const [k, inline] = a.slice(2).split('=');
    const v = inline !== undefined ? inline : argv[++i];
    if (v === undefined || v.startsWith('--')) fail(`Missing value for --${k}.`);
    out[k] = v;
  }
  return out;
}
function fail(msg) { process.stderr.write(`scale.mjs: ${msg}\n`); process.exit(1); }
function num(v, name, { min = -Infinity, max = Infinity, int = false } = {}) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max || (int && !Number.isInteger(n))) {
    fail(`--${name} must be ${int ? 'an integer' : 'a number'} between ${min} and ${max} (got "${v}").`);
  }
  return n;
}

// ---------- math ----------
const r3 = (n) => Math.round(n * 1000) / 1000;
const r4 = (n) => Math.round(n * 10000) / 10000;
function roundHalfDown(x, step) { // nearest multiple of step; ties go down (conservative)
  const lo = Math.floor(x / step) * step, hi = lo + step;
  return (x - lo) <= (hi - x) ? lo : hi;
}
function roundSize(x) {
  if (x < 16) return Math.round(x);
  if (x < 40) return roundHalfDown(x, 2);
  return roundHalfDown(x, 4);
}
function gridCeil(x) { // smallest size on the rounding grid that is >= x
  if (x < 16) return Math.ceil(x);
  if (x < 40) return Math.max(16, Math.ceil(x / 2) * 2);
  return Math.ceil(x / 4) * 4;
}
function lineHeightPx(size, dense, text) {
  // text = body and the steps below it: always running-text line heights, whatever the size
  const running = text || size < 20;
  let ratio;
  if (running) ratio = size < 15 ? (dense ? 1.4 : 1.45) : 1.5;
  else if (size < 32) ratio = 1.3;
  else if (size < 48) ratio = 1.2;
  else ratio = 1.1;
  let lh = Math.round((size * ratio) / 4) * 4;   // snap to the 4px grid
  if (running && size >= 15 && lh / size < 1.45) lh += 4;   // running text never tighter than ~1.45
  if (lh < size) lh = Math.ceil(size / 4) * 4;   // never tighter than 1.0
  return lh;
}
function tracking(size) {
  if (size >= 48) return '-0.02em';
  if (size >= 32) return '-0.015em';
  if (size >= 24) return '-0.01em';
  return '0';
}

function buildUp(base, ratio, steps) {
  const out = [];
  let prev = base;
  for (let i = 1; i <= steps; i++) {
    let s = roundSize(base * Math.pow(ratio, i));
    if (s < prev + 2) s = gridCeil(prev + 2);     // rounding must never merge neighbours; stay on the grid
    out.push(s);
    prev = s;
  }
  return out;
}
function buildDown(base, smallStep, floor) {
  const out = [];
  // 2px steps: 16 → 14 → 12, 14 → 12, 15 → 13; stops at the floor (13 with a 12 floor has no step below)
  for (let s = base - smallStep; s >= floor; s -= smallStep) {
    out.push(s);
    if (out.length === 2) break;
  }
  return out;
}

function fluid(minPx, maxPx, minVw, maxVw, root) {
  if (minPx === maxPx) return `${r4(maxPx / root)}rem`;
  const slope = (maxPx - minPx) / (maxVw - minVw);
  const intercept = minPx - slope * minVw;
  const lo = Math.min(minPx, maxPx), hi = Math.max(minPx, maxPx);
  return `clamp(${r4(lo / root)}rem, ${r4(intercept / root)}rem + ${r4(slope * 100)}vw, ${r4(hi / root)}rem)`;
}

// ---------- roles ----------
function roleMap(stepsUp, profileName, dense) {
  // stepsUp: [+1, +2, ...]; returns role -> step index (0 = body, negative = below)
  const n = stepsUp.length;
  if (dense && profileName === 'operational') {
    // display is for KPI numbers; title-3 is body size at 600 so card titles cost no row height
    return {
      display: Math.min(n, 4), 'title-1': Math.min(n, 3), 'title-2': Math.min(n, 2), 'title-3': 0,
      body: 0, 'body-strong': 0, meta: -1, label: -1, caption: -2,
    };
  }
  if (dense) {
    return {
      display: Math.min(n, 4), 'title-1': Math.min(n, 3), 'title-2': Math.min(n, 2), 'title-3': 1,
      body: 0, 'body-strong': 0, meta: -1, label: -1, caption: -2,
    };
  }
  // display = top step; title-3 stays near body (+1 or +2) so card titles don't balloon on expressive scales
  return {
    display: n, 'title-1': Math.max(1, n - 1), 'title-2': Math.max(1, n - 2), 'title-3': Math.max(1, Math.min(2, n - 3)),
    body: 0, 'body-strong': 0, meta: -1, label: -1, caption: -2,
  };
}
const ROLE_WEIGHT = { display: 700, 'title-1': 700, 'title-2': 600, 'title-3': 600, body: 400, 'body-strong': 600, meta: 400, label: 600, caption: 400 };   // three weights: 400 / 600 / 700

// ---------- main ----------
const args = parseArgs(process.argv.slice(2));
if (args.help) { process.stdout.write(HELP + '\n'); process.exit(0); }

const profileName = args.profile || 'consumer';
const P = PROFILES[profileName];
if (!P) fail(`Unknown --profile "${profileName}". Use one of: ${Object.keys(PROFILES).join(', ')}.`);

const base = args.base !== undefined ? num(args.base, 'base', { min: 8, max: 24 }) : P.base;
const ratio = args.ratio !== undefined ? num(args.ratio, 'ratio', { min: 1.02, max: 2 }) : P.ratio;
const mobileRatio = args['mobile-ratio'] !== undefined ? num(args['mobile-ratio'], 'mobile-ratio', { min: 1.02, max: 2 })
  : (args.ratio !== undefined ? Math.min(ratio, P.mobileRatio) : P.mobileRatio);
const up = args.up !== undefined ? num(args.up, 'up', { min: 1, max: 10, int: true }) : P.up;
const floor = args.floor !== undefined ? num(args.floor, 'floor', { min: 8, max: base }) : Math.min(P.floor, base);
const minVw = args['min-vw'] !== undefined ? num(args['min-vw'], 'min-vw', { min: 200, max: 2000 }) : 360;
const maxVw = args['max-vw'] !== undefined ? num(args['max-vw'], 'max-vw', { min: minVw + 1, max: 4000 }) : 1440;
const root = args.root !== undefined ? num(args.root, 'root', { min: 8, max: 32 }) : 16;
if (maxVw <= minVw) fail('--max-vw must be greater than --min-vw.');
const format = args.format || 'table';
if (!['table', 'css', 'tailwind', 'json'].includes(format)) fail(`Unknown --format "${format}".`);
if (mobileRatio > ratio) fail('--mobile-ratio should not exceed --ratio (small screens compress the scale).');

const dense = P.dense;
const desktopUp = buildUp(base, ratio, up);
const mobileUp = buildUp(base, mobileRatio, up).map((m, i) => Math.min(m, desktopUp[i]));
const down = buildDown(base, P.smallStep, floor);

const steps = [];
desktopUp.slice().reverse().forEach((d, ri) => {
  const i = desktopUp.length - ri;            // step number +i
  steps.push({ step: i, desktop: d, mobile: mobileUp[i - 1] });
});
steps.push({ step: 0, desktop: base, mobile: base });
down.forEach((s, i) => steps.push({ step: -(i + 1), desktop: s, mobile: s }));
for (const s of steps) {
  s.lhPx = lineHeightPx(s.desktop, dense, s.step <= 0);
  s.lh = r3(s.lhPx / s.desktop);
  s.tracking = tracking(s.desktop);
  s.size = fluid(s.mobile, s.desktop, minVw, maxVw, root);
  s.name = s.step === 0 ? 'base' : s.step > 0 ? `up-${s.step}` : `down-${-s.step}`;
}

// warnings: distinguishability of neighbours
const warnings = [];
for (const where of ['desktop', 'mobile']) {
  for (let i = 0; i < steps.length - 1; i++) {
    const a = steps[i], b = steps[i + 1];
    if (a.step <= 0) continue;
    if (where === 'mobile' && a.mobile === a.desktop && b.mobile === b.desktop) continue;   // already reported
    const ratioAB = a[where] / b[where];
    if (ratioAB < 1.15) warnings.push(`${where === 'mobile' ? 'On phones, ' : ''}${a.name} (${a[where]}px) is only ${((ratioAB - 1) * 100).toFixed(0)}% above ${b.name} (${b[where]}px) — too close to read as a different level by size alone. If both are used as neighbouring levels, also change weight or color tier, or skip a step.`);
  }
}
for (const s of steps) {
  if (s.desktop / s.mobile > 2.5) warnings.push(`${s.name} grows ${(s.desktop / s.mobile).toFixed(1)}× from phone to desktop; above ~2.5× the 200% zoom requirement (WCAG 1.4.4) can fail. Raise the mobile ratio.`);
}
if (base < P.floor) warnings.push(`Body ${base}px is below the ${profileName} text floor (${P.floor}px).`);
const BODY_RANGE = { expressive: [18, 20], consumer: [16, 18], reading: [16, 20], productivity: [14, 15], operational: [13, 14] };
const br = BODY_RANGE[profileName];
if (br && (base < br[0] || base > br[1])) {
  const near = base >= br[0] - 1 && base <= br[1] + 1;
  warnings.push(`Body ${base}px is outside the usual ${profileName} range (${br[0]}–${br[1]}px).${near ? ' A font with an unusually large or small x-height can justify a pixel either way.' : ''} Check the profile.`);
}
warnings.push('If labels are set in uppercase, give them +0.04 to +0.08em letter-spacing.');

const roles = roleMap(desktopUp, profileName, dense);
const stepBy = Object.fromEntries(steps.map((s) => [s.step, s]));
const roleRows = Object.entries(roles).map(([role, idx]) => {
  let st = stepBy[idx];
  if (!st) st = idx < 0 ? steps[steps.length - 1] : stepBy[0];   // fall back to nearest available
  return { role, step: st.step, name: st.name, size: st.size, desktop: st.desktop, mobile: st.mobile,
           lh: st.lh, lhPx: st.lhPx, weight: ROLE_WEIGHT[role], tracking: st.tracking };
});

{
  const headingRoles = roleRows.filter((r) => ['display', 'title-1', 'title-2', 'title-3'].includes(r.role) && r.step > 0);
  for (let i = 0; i < headingRoles.length - 1; i++) {
    const a = headingRoles[i], b = headingRoles[i + 1];
    if (a.step === b.step) warnings.push(`${a.role} and ${b.role} share ${a.name} (${a.desktop}px) — with --up ${up} there aren't enough steps for every heading role. Raise --up, or use fewer heading levels.`);
  }
}

const spacingScale = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128].concat(profileName === 'expressive' ? [160] : []);
const tiers = P.tiers;
const density = dense ? {
  compact:     { 'row-h': Math.max(28, P.row - 8), 'control-h': Math.max(28, P.control - 8), 'cell-px': 8, 'cell-py': 4 },
  default:     { 'row-h': P.row, 'control-h': P.control, 'cell-px': 12, 'cell-py': 8 },
  comfortable: { 'row-h': P.row + 12, 'control-h': Math.max(44, P.control + 8), 'cell-px': 16, 'cell-py': 12 },
} : null;

const rem = (px) => `${r4(px / root)}rem`;

// ---------- output ----------
if (format === 'json') {
  process.stdout.write(JSON.stringify({ profile: profileName, base, ratio, mobileRatio, floor, minVw, maxVw, root,
    steps, roles: roleRows, spacing: { unit: 4, scale: spacingScale, tiers }, controls: { 'control-h': P.control, 'row-h': P.row }, density, warnings }, null, 2) + '\n');
} else if (format === 'css') {
  const L = [];
  L.push(`/* visual-density · ${profileName} · body ${base}px · ratio ${ratio} (mobile ${mobileRatio}) · fluid ${minVw}–${maxVw}px */`);
  L.push(':root {');
  L.push('  /* type roles: size / line-height / weight / tracking */');
  for (const r of roleRows) {
    L.push(`  --text-${r.role}: ${r.size};  --lh-${r.role}: ${r.lh};  --weight-${r.role}: ${r.weight};  --tracking-${r.role}: ${r.tracking};`);
  }
  L.push('');
  L.push('  /* spacing scale (4px unit) */');
  L.push('  ' + spacingScale.map((v) => `--space-${v / 4}: ${rem(v)};`).join(' '));
  L.push('');
  L.push('  /* proximity tiers */');
  for (const [k, v] of Object.entries(tiers)) L.push(`  --space-${k}: ${rem(v)};`);
  if (!density) {
    L.push('');
    L.push(`  --control-h: ${rem(P.control)};${P.row ? `  --row-h: ${rem(P.row)};` : ''}`);
  }
  L.push('}');
  if (density) {
    L.push('');
    const line = (sel, d) => `${sel} { ${Object.entries(d).map(([k, v]) => `--${k}: ${rem(v)};`).join(' ')} }`;
    L.push(line(':root, [data-density="default"]', density.default));
    L.push(line('[data-density="compact"]', density.compact));
    L.push(line('[data-density="comfortable"]', density.comfortable));
    L.push(`@media (pointer: coarse) { :root:not([data-density]) { --row-h: ${rem(Math.max(48, density.comfortable['row-h']))}; --control-h: ${rem(44)}; } }`);
  }
  L.push('');
  L.push('/* usage: .title-2 { font-size: var(--text-title-2); line-height: var(--lh-title-2); font-weight: var(--weight-title-2); letter-spacing: var(--tracking-title-2); } */');
  if (warnings.length) L.push('\n/* notes:\n' + warnings.map((w) => ' * ' + w).join('\n') + '\n */');
  process.stdout.write(L.join('\n') + '\n');
} else if (format === 'tailwind') {
  const L = [];
  L.push(`/* Tailwind CSS v4 — paste into your main CSS after @import "tailwindcss"; */`);
  L.push(`/* visual-density · ${profileName} · body ${base}px · ratio ${ratio} (mobile ${mobileRatio}) */`);
  L.push('@theme {');
  for (const r of roleRows) {
    L.push(`  --text-${r.role}: ${r.size};`);
    L.push(`  --text-${r.role}--line-height: ${r.lh};`);
    L.push(`  --text-${r.role}--font-weight: ${r.weight};`);
    if (r.tracking !== '0') L.push(`  --text-${r.role}--letter-spacing: ${r.tracking};`);
  }
  L.push('');
  L.push(`  --spacing: ${rem(4)};  /* p-4 = 16px etc. */`);
  for (const [k, v] of Object.entries(tiers)) L.push(`  --spacing-${k}: ${rem(v)};`);
  const ctl = density ? density.default : { 'control-h': P.control, 'row-h': P.row };
  L.push(`  --spacing-control-h: ${rem(ctl['control-h'])};${ctl['row-h'] ? `  --spacing-row-h: ${rem(ctl['row-h'])};` : ''}`);
  L.push('}');
  if (density) {
    L.push('');
    L.push('/* density modes override the theme variables (utilities like h-row-h read them) */');
    const tw = (sel, d) => `${sel} { --spacing-row-h: ${rem(d['row-h'])}; --spacing-control-h: ${rem(d['control-h'])}; }`;
    L.push(tw('[data-density="compact"]', density.compact));
    L.push(tw('[data-density="comfortable"]', density.comfortable));
    L.push(`@media (pointer: coarse) { :root:not([data-density]) { --spacing-row-h: ${rem(Math.max(48, density.comfortable['row-h']))}; --spacing-control-h: ${rem(44)}; } }`);
  }
  L.push('/* usage: <h2 class="text-title-2">, <p class="text-meta">, <section class="mt-section">, <div class="gap-item">, <tr class="h-row-h"> */');
  L.push('/* Tailwind v3: put the same values in theme.extend.fontSize (as [size, { lineHeight, fontWeight, letterSpacing }]) and theme.extend.spacing. */');
  if (warnings.length) L.push('\n/* notes:\n' + warnings.map((w) => ' * ' + w).join('\n') + '\n */');
  process.stdout.write(L.join('\n') + '\n');
} else {
  const pad = (s, n) => String(s).padEnd(n);
  const L = [];
  L.push(`visual-density scale · profile ${profileName} · body ${base}px · ratio ${ratio} (mobile ${mobileRatio} at ${minVw}px) · floor ${floor}px`);
  L.push('');
  L.push(pad('step', 8) + pad('desktop', 9) + pad('mobile', 8) + pad('line-height', 14) + pad('tracking', 10) + 'css');
  for (const s of steps) {
    L.push(pad(s.name, 8) + pad(s.desktop + 'px', 9) + pad(s.mobile + 'px', 8) + pad(`${s.lhPx}px (${s.lh})`, 14) + pad(s.tracking, 10) + s.size);
  }
  L.push('');
  L.push('roles');
  for (const r of roleRows) L.push('  ' + pad(r.role, 13) + pad(r.name, 8) + pad(`${r.desktop}px`, 7) + pad(`w${r.weight}`, 6) + (r.tracking !== '0' ? r.tracking : ''));
  L.push('');
  L.push('spacing   ' + spacingScale.join(' '));
  L.push('tiers     ' + Object.entries(tiers).map(([k, v]) => `${k} ${v}`).join(' · '));
  if (density) {
    L.push('density   ' + Object.entries(density).map(([m, d]) => `${m}: row ${d['row-h']} / control ${d['control-h']}`).join(' · '));
  } else {
    L.push(`controls  ${P.control}px${P.row ? ` · list rows ${P.row}px` : ''}`);
  }
  if (warnings.length) { L.push(''); L.push('notes'); for (const w of warnings) L.push('  - ' + w); }
  L.push('');
  L.push('Formats: --format css | tailwind | json');
  process.stdout.write(L.join('\n') + '\n');
}
