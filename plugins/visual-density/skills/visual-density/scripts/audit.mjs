#!/usr/bin/env node
// visual-density · audit runner
//
// Loads a page in Chromium (via Playwright), runs inventory.js at one or more viewports, and writes
// a Markdown report, the raw JSON, and normal + "squint" (blurred grayscale) screenshots.
//
//   node audit.mjs http://localhost:3000/dashboard --profile operational
//   node audit.mjs ./index.html --profile consumer --viewports 1440x900,390x844 --out ./vh-audit
//
// Needs Node 18+ and Playwright — in the project, globally, or in a shared tool folder that leaves the
// project untouched (looked up automatically):
//   npm i --prefix ~/.cache/visual-density playwright && npx --prefix ~/.cache/visual-density playwright install chromium
// If Playwright's own Chromium is missing, an installed Google Chrome or Microsoft Edge is used instead.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import os from 'node:os';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROFILES = ['expressive', 'consumer', 'reading', 'productivity', 'operational'];

const HELP = `visual-density audit

Usage: node audit.mjs <url | file.html> [options]

  --profile <name>      ${PROFILES.join(' | ')}  (sets body/target floors; optional)
  --viewports <list>    comma-separated WxH, default 1440x900,390x844
  --out <dir>           output directory (default ./vh-audit)
  --wait <ms>           extra wait after load, for late-rendering apps (default 600)
  --selector <css>      wait for this element before measuring
  --dark                emulate prefers-color-scheme: dark
  --no-shots            skip screenshots
  --json                print JSON instead of Markdown to stdout
  -h, --help            show this help

Outputs in --out: report.md, report.json, <W>x<H>.png, <W>x<H>-squint.png`;

function fail(msg, code = 1) { process.stderr.write(`audit.mjs: ${msg}\n`); process.exit(code); }

// ---------- args ----------
const argv = process.argv.slice(2);
const opts = { viewports: '1440x900,390x844', out: './vh-audit', wait: '600', shots: true, json: false, dark: false };
let target = null;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '-h' || a === '--help') { process.stdout.write(HELP + '\n'); process.exit(0); }
  else if (a === '--no-shots') opts.shots = false;
  else if (a === '--json') opts.json = true;
  else if (a === '--dark') opts.dark = true;
  else if (a.startsWith('--')) {
    const [k, inline] = a.slice(2).split('=');
    const v = inline !== undefined ? inline : argv[++i];
    if (!['profile', 'viewports', 'out', 'wait', 'selector'].includes(k)) fail(`Unknown option --${k}. Use --help.`);
    if (v === undefined || v.startsWith('--')) fail(`Missing value for --${k}.`);
    opts[k] = v;
  } else if (!target) target = a;
  else fail(`Unexpected argument "${a}". Use --help.`);
}
if (!target) fail('Give a URL or an HTML file. Use --help.');
if (opts.profile && !PROFILES.includes(opts.profile)) fail(`Unknown --profile "${opts.profile}". Use one of: ${PROFILES.join(', ')}.`);
const viewports = opts.viewports.split(',').map((s) => {
  const m = /^(\d{3,4})x(\d{3,4})$/.exec(s.trim());
  if (!m) fail(`Bad viewport "${s}". Use WxH, e.g. 1440x900.`);
  return { width: +m[1], height: +m[2] };
});
const waitMs = Number(opts.wait);
if (!Number.isFinite(waitMs) || waitMs < 0) fail('--wait must be a number of milliseconds.');

let url = target;
let targetDir = null;
if (!/^[a-z][a-z0-9+.-]*:/i.test(target)) {
  const file = path.resolve(target);
  targetDir = path.dirname(file);
  if (!fs.existsSync(file)) fail(`No such file: ${file}`);
  url = pathToFileURL(file).href;
}

// ---------- find playwright (project, page folder, shared tool folder, then global) ----------
const TOOL_DIR = process.env.VH_TOOLS_DIR || path.join(os.homedir(), '.cache', 'visual-density');
async function loadPlaywright() {
  const bases = [path.join(process.cwd(), 'package.json')];
  if (targetDir) bases.push(path.join(targetDir, 'package.json'));
  bases.push(path.join(HERE, 'package.json'), path.join(TOOL_DIR, 'package.json'));
  try { bases.push(path.join(execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(), 'noop.js')); } catch { /* no npm */ }
  for (const base of bases) {
    for (const name of ['playwright', 'playwright-core', '@playwright/test']) {
      try {
        const req = createRequire(base);
        const resolved = req.resolve(name);
        const mod = await import(pathToFileURL(resolved).href);
        const pw = mod.chromium ? mod : mod.default;
        if (pw && pw.chromium) return pw;
      } catch { /* try next */ }
    }
  }
  return null;
}
const pw = await loadPlaywright();
if (!pw) {
  fail(`Playwright not found. Install it once in a shared tool folder (doesn't touch the project), then retry:
    npm i --prefix ${TOOL_DIR} playwright && npx --prefix ${TOOL_DIR} playwright install chromium
  or in this project:  npm i -D playwright && npx playwright install chromium
No Node setup? Open the page in a browser and paste ${path.join(HERE, 'inventory.js')} into the DevTools console.`, 2);
}

const inventorySrc = fs.readFileSync(path.join(HERE, 'inventory.js'), 'utf8');
fs.mkdirSync(opts.out, { recursive: true });

let browser;
let launchError = null;
for (const channel of [undefined, 'chrome', 'msedge']) {      // Playwright's Chromium, else an installed browser
  try { browser = await pw.chromium.launch(channel ? { channel } : {}); break; }
  catch (e) { if (!launchError) launchError = e; }
}
if (!browser) {
  fail(`Could not launch Chromium (${launchError.message.split('\n')[0]}). Install the browser for this Playwright version: npx playwright install chromium (add --prefix ${TOOL_DIR} if Playwright lives there).`, 2);
}

const runs = [];
try {
  for (const vp of viewports) {
    const mobile = vp.width < 768;
    const context = await browser.newContext({
      viewport: vp, deviceScaleFactor: 1, hasTouch: mobile, isMobile: mobile,
      colorScheme: opts.dark ? 'dark' : 'light', reducedMotion: 'reduce',
      bypassCSP: true,                       // pages with strict CSP would block the injected measuring script
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    } catch {
      try { await page.goto(url, { waitUntil: 'load', timeout: 30000 }); }
      catch (e) { fail(`Could not load ${url}: ${e.message.split('\n')[0]}`); }
    }
    if (opts.selector) await page.waitForSelector(opts.selector, { timeout: 15000 }).catch(() => {});
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    if (waitMs) await page.waitForTimeout(waitMs);
    await page.evaluate(() => { window.__vhQuiet = true; });
    await page.addScriptTag({ content: inventorySrc });
    const result = await page.evaluate((o) => window.vhInventory(o), { profile: opts.profile || null, touch: mobile, viewportWidth: vp.width });
    result.meta.pageErrors = errors.slice(0, 5);
    const name = `${vp.width}x${vp.height}`;
    if (opts.shots) {
      const full = result.meta.pageHeight <= 8000;
      const clip = full ? undefined : { x: 0, y: 0, width: vp.width, height: 8000 };
      await page.screenshot({ path: path.join(opts.out, `${name}.png`), fullPage: full, clip });
      await page.addStyleTag({ content: 'html{filter:grayscale(1) blur(6px)!important}' });
      await page.waitForTimeout(100);
      await page.screenshot({ path: path.join(opts.out, `${name}-squint.png`), fullPage: full, clip });
      result.meta.screenshots = [`${name}.png`, `${name}-squint.png`];
      result.meta.screenshotClipped = !full;
    }
    runs.push({ viewport: name, result });
    await context.close();
  }
} finally {
  await browser.close();
}

// ---------- report ----------
function fmtValue(k, v) {
  if (k === 'align' && v === null) return 'fills cell';
  if (Array.isArray(v)) return v.map((x) => (x && typeof x === 'object' && 'text' in x) ? `"${esc(x.text)}"${x.selector ? ` (\`${esc(x.selector)}\`)` : ''}` : esc(typeof x === 'object' ? JSON.stringify(x) : x)).join('; ');
  if (v && typeof v === 'object') return esc(JSON.stringify(v));
  return esc(v);
}
function fmtEvidence(ev) {
  const parts = Object.entries(ev).filter(([k]) => k !== 'selector').map(([k, v]) => `${k}: ${fmtValue(k, v)}`);
  const sel = ev.selector ? `\`${esc(ev.selector)}\`` : '';
  return parts.length ? `${parts.join(', ')}${sel ? ` — ${sel}` : ''}` : sel;
}
const short = (s, n) => { s = String(s ?? ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const md = [];
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
md.push(`# Visual hierarchy audit`);
md.push('');
md.push(`- **Page:** ${url}`);
md.push(`- **Profile:** ${opts.profile || '(none given — profile-specific floors not applied)'}`);
md.push(`- **Generated:** ${new Date().toISOString()}`);
md.push('');
for (const { viewport, result: r } of runs) {
  const f = r.findings;
  const count = (s) => f.filter((x) => x.severity === s).length;
  md.push(`## ${viewport}${r.meta.touch ? ' (touch)' : ''}`);
  md.push('');
  md.push(`**Findings:** ${count('high')} high · ${count('medium')} medium · ${count('low')} low`);
  if (r.meta.truncated) md.push(`> Scanned the first ${r.meta.elementsScanned} elements only (page is very large).`);
  if (r.meta.screenshotClipped) md.push('> Screenshots show the first 8000px of the page.');
  if (r.meta.pageErrors?.length) md.push(`> Page errors during load: ${r.meta.pageErrors.map(esc).join(' · ')}`);
  md.push('');
  for (const x of f) {
    md.push(`- **${x.severity.toUpperCase()} · ${x.area}** — ${x.message}`);
    for (const ev of (x.evidence || []).slice(0, 4)) {
      if (ev.variants) md.push(`  - h${ev.level}: ${ev.variants.map((v) => `${v.style} ×${v.count} (e.g. "${esc(v.examples[0])}")`).join(' · ')}`);
      else md.push(`  - ${fmtEvidence(ev)}`);
    }
  }
  if (!f.length) md.push('- No findings. Still do the squint and headings-only checks by eye.');
  md.push('');
  md.push('### Type');
  md.push('');
  md.push(`Body (most-used size): **${r.type.bodySize ?? '—'}px**${r.type.bodyCandidates?.length > 1 ? ` (close call between ${r.type.bodyCandidates.join(' and ')}px — the larger is taken as body)` : ''} · families: ${r.type.families.map(esc).join(', ') || '—'} · bold share: ${Math.round(r.type.boldShare * 100)}%`);
  md.push('');
  md.push('| size | share of text | | weight | share |');
  md.push('|---|---|---|---|---|');
  const rows = Math.max(r.type.sizes.length, r.type.weights.length);
  for (let i = 0; i < rows; i++) {
    const s = r.type.sizes[i], w = r.type.weights[i];
    md.push(`| ${s ? s.size + 'px' : ''} | ${s ? Math.round(s.share * 100) + '%' : ''} | | ${w ? w.weight : ''} | ${w ? Math.round(w.share * 100) + '%' : ''} |`);
  }
  md.push('');
  md.push('Top text styles (size / weight / line height / family):');
  md.push('');
  for (const st of r.type.styles.slice(0, 10)) {
    md.push(`- ${st.size}px / ${st.weight} / ${st.lineHeight ? `${st.lineHeight}px (${st.lineHeightRatio})` : 'normal'} / ${esc(st.family)}${st.uppercase ? ' / UPPERCASE' : ''} — ${st.elements} el, e.g. "${esc(st.samples[0]?.text)}"`);
  }
  md.push('');
  md.push('### Spacing');
  md.push('');
  md.push(`Most used values: ${r.spacing.values.slice(0, 14).map((v) => `${v.value}×${v.count}`).join(', ') || '—'}`);
  md.push(`Off the 4px grid: ${Math.round(r.spacing.offGridShare * 100)}%${r.spacing.offGrid.length ? ` — ${r.spacing.offGrid.slice(0, 10).map((v) => `${v.value}×${v.count}`).join(', ')}` : ''}`);
  md.push('');
  md.push('### Headings');
  md.push('');
  md.push(`h1 count: ${r.headings.h1Count} · levels: ${r.headings.levels.map((l) => `h${l.level} median ${l.medianSize}px (${l.count})`).join(', ') || '—'}`);
  md.push('');
  for (const h of r.headings.outline.slice(0, 40)) md.push(`${'  '.repeat(Math.max(0, h.level - 1))}- h${h.level} ${h.size}px/${h.weight} "${esc(h.text)}"`);
  if (r.headings.spacing.length) {
    md.push('');
    md.push('Space above / below headings (px): ' + r.headings.spacing.slice(0, 12).map((h) => `"${esc(short(h.text, 28))}" ${h.above}/${h.below}${h.aboveIs ? ' (from card edge)' : ''}`).join(' · '));
  }
  md.push('');
  md.push('### Reading, contrast, targets, tables, density');
  md.push('');
  md.push(`- Paragraph measure: ${r.measure.paragraphs ? `median ${Math.round(r.measure.medianCharsPerLine)} characters per full line over ${r.measure.paragraphs} paragraph(s)` : 'no multi-line paragraphs measured'}`);
  md.push(`- Contrast: ${r.contrast.checked} text elements checked, ${r.contrast.failures.reduce((n, x) => n + x.count, 0)} below threshold, ${r.contrast.unknownBackground} over images/gradients (check by eye)`);
  md.push(`- Targets: ${r.targets.checked} interactive elements, ${r.targets.under24Count} under 24×24${r.meta.touch ? `, ${r.targets.under44TouchCount} under 44×44` : ''}`);
  for (const t of r.tables) md.push(`- Table \`${esc(t.selector)}\`: ${t.rows} rows, median row ${t.medianRowHeight}px, header ${t.header ? `${t.header.size}px/${t.header.weight}` : '—'}, cells ${t.cell ? `${t.cell.size}px/${t.cell.weight}` : '—'}, numeric cells ${t.numericCells} (${t.numericNotRightAligned} not right-aligned, ${t.numericProportional} not tabular)`);
  md.push(`- Density: ${r.density.textElementsInFirstViewport} text elements in the first viewport, median control height ${r.density.medianControlHeight != null ? Math.round(r.density.medianControlHeight) + 'px' : '—'}, ${r.density.filledAccentButtonsInFirstViewport} filled accent button(s) in the first viewport`);
  if (r.meta.screenshots) md.push(`- Screenshots: \`${r.meta.screenshots.join('`, `')}\` — check the squint image: does the order you notice match the intended order?`);
  md.push('');
}
md.push('---');
md.push('Heuristic measurements of the rendered page. False positives are possible — see references/audit.md ("Reading the numbers").');

fs.writeFileSync(path.join(opts.out, 'report.md'), md.join('\n') + '\n');
fs.writeFileSync(path.join(opts.out, 'report.json'), JSON.stringify({ url, profile: opts.profile || null, runs }, null, 2));
process.stdout.write(opts.json ? JSON.stringify({ url, profile: opts.profile || null, runs }, null, 2) + '\n' : md.join('\n') + '\n');
process.stderr.write(`\nWrote ${path.join(opts.out, 'report.md')} and ${path.join(opts.out, 'report.json')}${opts.shots ? ' + screenshots' : ''}.\n`);
