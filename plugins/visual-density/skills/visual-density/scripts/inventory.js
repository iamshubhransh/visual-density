/*
 * visual-density · inventory
 *
 * Measures what a rendered page actually does: type styles, spacing values, heading outline,
 * parity and inversions, heading spacing, line length, line height, contrast, small text,
 * target sizes, table alignment, emphasis and density numbers.
 *
 * Use it two ways:
 *   1. node <skill>/scripts/audit.mjs <url-or-file>   (loads this file into the page with Playwright)
 *   2. Paste this whole file into the browser DevTools console: it prints a summary and
 *      returns the full result. Call window.vhInventory({ profile: 'operational' }) again
 *      with options if you like.
 *
 * Options: { profile: 'expressive'|'consumer'|'reading'|'productivity'|'operational', touch: bool,
 *            maxElements: number, viewportWidth: number (the width you meant to test; catches a
 *            mobile browser zooming an overflowing page out) }
 *
 * All measurements are heuristics on the rendered DOM. See references/audit.md for how to read
 * them and their known blind spots.
 */
(function () {
  'use strict';

  var PROFILE_FLOORS = {
    expressive:   { body: 18, text: 14 },
    consumer:     { body: 16, text: 12 },
    reading:      { body: 16, text: 14 },
    productivity: { body: 14, text: 12 },
    operational:  { body: 13, text: 12 },
  };

  function vhInventory(options) {
    var opts = Object.assign({ profile: null, touch: null, maxElements: 15000, viewportWidth: null }, options || {});
    // On a real phone (console use), an overflowing page widens innerWidth; the screen width is the device's.
    var viewportWidth = opts.viewportWidth || (matchMedia('(pointer: coarse)').matches && screen.width && screen.width < innerWidth ? screen.width : innerWidth);
    var t0 = performance.now();
    var floors = PROFILE_FLOORS[opts.profile] || { body: null, text: 12 };
    var touch = opts.touch === null ? matchMedia('(pointer: coarse)').matches : !!opts.touch;
    var targetFloor = touch ? 44 : 24;

    // ---------- collect elements (light DOM + open shadow roots) ----------
    var elements = [];
    var truncated = false;
    (function walk(root) {
      var tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
      var n = tw.nextNode();
      while (n) {
        if (elements.length >= opts.maxElements) { truncated = true; return; }
        elements.push(n);
        if (n.shadowRoot && n.shadowRoot.mode === 'open') walk(n.shadowRoot);
        n = tw.nextNode();
      }
    })(document.documentElement);

    var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEMPLATE: 1, HEAD: 1, META: 1, LINK: 1, TITLE: 1, svg: 1, SVG: 1, PATH: 1, path: 1, IFRAME: 1, OBJECT: 1, CANVAS: 1, VIDEO: 1, AUDIO: 1, IMG: 1, PICTURE: 1, SOURCE: 1, BR: 1, WBR: 1 };
    var csCache = new Map();
    function cs(el) {
      var c = csCache.get(el);
      if (!c) { c = getComputedStyle(el); csCache.set(el, c); }
      return c;
    }
    function px(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
    function round1(n) { return Math.round(n * 10) / 10; }
    function round2(n) { return Math.round(n * 100) / 100; }
    function fsz(st) { return round1(px(st.fontSize)); }      // font size to 0.1px: fluid clamp() values land on 19.99 for 20

    var opCache = new Map();
    function effOpacity(el) {
      if (!el || el.nodeType !== 1) return 1;
      if (opCache.has(el)) return opCache.get(el);
      var o = (parseFloat(cs(el).opacity) || 0) * effOpacity(el.parentElement);
      opCache.set(el, o);
      return o;
    }
    function isVisible(el, s, r) {
      if (s.display === 'none' || s.visibility === 'hidden' || s.visibility === 'collapse') return false;
      if (effOpacity(el) < 0.05) return false;
      if (r.width * r.height < 4) return false;                         // sr-only 1×1 and empties
      if (s.clip === 'rect(0px, 0px, 0px, 0px)' || s.clipPath === 'inset(50%)') return false;
      if (r.right < -10 || r.bottom + scrollY < -10) return false;      // parked off-screen
      return true;
    }

    function selectorOf(el) {
      var parts = [];
      var cur = el;
      for (var i = 0; cur && cur.nodeType === 1 && i < 3; i++) {
        var p = cur.tagName.toLowerCase();
        if (cur.id) { p += '#' + cur.id; parts.unshift(p); break; }
        var cls = (typeof cur.className === 'string' ? cur.className : '').trim().split(/\s+/).filter(Boolean)
          .filter(function (c) { return c.length < 40 && !/[:\[\]/]/.test(c); }).slice(0, 2);
        if (cls.length) p += '.' + cls.join('.');
        parts.unshift(p);
        cur = cur.parentElement;
      }
      return parts.join(' > ');
    }
    function ownText(el) {
      var t = '';
      for (var c = el.firstChild; c; c = c.nextSibling) if (c.nodeType === 3) t += c.nodeValue;
      return t.replace(/\s+/g, ' ').trim();
    }
    function snippet(t) { return t.length > 48 ? t.slice(0, 45) + '…' : t; }

    // ---------- color handling (any CSS color → sRGB via canvas) ----------
    var cnv = document.createElement('canvas'); cnv.width = cnv.height = 1;
    var ctx = cnv.getContext('2d', { willReadFrequently: true });
    var colorCache = new Map();
    function toRGBA(str) {
      if (!str) return null;
      if (colorCache.has(str)) return colorCache.get(str);
      var out = null;
      var m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(str);
      if (m) {
        var a = m[4] === undefined ? 1 : (m[4].slice(-1) === '%' ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
        out = [+m[1], +m[2], +m[3], a];
      } else if (str === 'transparent') {
        out = [0, 0, 0, 0];
      } else {
        try {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = '#000'; ctx.fillStyle = str;           // invalid strings leave #000
          ctx.fillRect(0, 0, 1, 1);
          var d = ctx.getImageData(0, 0, 1, 1).data;
          out = [d[0], d[1], d[2], d[3] / 255];
        } catch (e) { out = null; }
      }
      colorCache.set(str, out);
      return out;
    }
    function over(top, bottom) {                                  // composite top over opaque bottom
      var a = top[3];
      return [top[0] * a + bottom[0] * (1 - a), top[1] * a + bottom[1] * (1 - a), top[2] * a + bottom[2] * (1 - a), 1];
    }
    function lum(c) {
      function ch(v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
      return 0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2]);
    }
    function contrast(a, b) { var l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); }
    function hex(c) { return '#' + c.slice(0, 3).map(function (v) { return Math.round(v).toString(16).padStart(2, '0'); }).join(''); }
    function hsl(c) {
      var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
      var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, s = 0;
      if (mx !== mn) s = l > 0.5 ? (mx - mn) / (2 - mx - mn) : (mx - mn) / (mx + mn);
      return { s: s, l: l };
    }
    // Background behind an element: composite ancestor background colors; give up on images/gradients.
    var bgCache = new Map();
    function backgroundOf(el) {
      if (bgCache.has(el)) return bgCache.get(el);
      var layers = [];
      var cur = el;
      var unknown = false;
      while (cur && cur.nodeType === 1) {
        var s = cs(cur);
        if (s.backgroundImage && s.backgroundImage !== 'none') { unknown = true; break; }
        var c = toRGBA(s.backgroundColor);
        if (c && c[3] > 0) { layers.push(c); if (c[3] >= 0.999) break; }
        cur = cur.parentElement || (cur.getRootNode && cur.getRootNode().host) || null;
      }
      var res;
      if (unknown) res = null;
      else {
        var base = [255, 255, 255, 1];                             // canvas default
        for (var i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
        res = base;
      }
      bgCache.set(el, res);
      return res;
    }

    // Visible container edges (cards, panels, rows with dividers): a heading binds to these, not only to text.
    var surfCache = new Map();
    function surfaceOf(el) {
      if (surfCache.has(el)) return surfCache.get(el);
      var res = null;
      if (el && el.nodeType === 1 && el.tagName !== 'HTML' && el.tagName !== 'BODY') {
        var s = cs(el);
        var edge = function (k) { return px(s['border' + k + 'Width']) >= 1 && s['border' + k + 'Style'] !== 'none' && (toRGBA(s['border' + k + 'Color']) || [0, 0, 0, 0])[3] > 0.05; };
        var fill = (s.boxShadow && s.boxShadow !== 'none') || (s.backgroundImage && s.backgroundImage !== 'none');
        if (!fill) {
          var c = toRGBA(s.backgroundColor);
          if (c && c[3] > 0.05 && el.parentElement) {
            var mine = backgroundOf(el), parent = backgroundOf(el.parentElement);
            fill = !!(mine && parent && contrast(mine, parent) > 1.03);
          }
        }
        var top = fill || edge('Top'), bottom = fill || edge('Bottom');
        if (top || bottom) res = { top: top, bottom: bottom };
      }
      surfCache.set(el, res);
      return res;
    }

    // ---------- pass 1: per-element measurements ----------
    var textEls = [];
    var totalChars = 0;
    var styleMap = new Map();
    var spacing = new Map();
    var spacingCount = 0;
    var interactive = [];
    var INTERACTIVE = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=checkbox],[role=radio],[role=switch],[role=tab],[role=menuitem],[role=option],[tabindex]:not([tabindex="-1"])';
    var boxes = [];                                            // media and text blocks used for proximity checks

    function addSpacing(v, prop, el) {
      if (!(v > 0.5) || v > 400) return;
      var key = Math.round(v * 2) / 2;
      var e = spacing.get(key);
      if (!e) { e = { value: key, count: 0, props: {}, sample: selectorOf(el) }; spacing.set(key, e); }
      e.count++; e.props[prop] = (e.props[prop] || 0) + 1;
      spacingCount++;
    }

    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      var tag = el.tagName;
      if (SKIP_TAGS[tag] || el.namespaceURI === 'http://www.w3.org/2000/svg' || el.namespaceURI === 'http://www.w3.org/1998/Math/MathML') {
        if (tag === 'svg' || tag === 'IMG' || tag === 'VIDEO' || tag === 'CANVAS' || tag === 'PICTURE') {
          var mr2 = el.getBoundingClientRect();
          if (mr2.width * mr2.height >= 64) boxes.push({ el: el, r: mr2 });
        }
        continue;
      }
      var s = cs(el);
      var r = el.getBoundingClientRect();
      if (!isVisible(el, s, r)) continue;
      // inside closed <details> etc. → rect is 0 so already filtered
      if (r.width * r.height >= 2000) { var sf = surfaceOf(el); if (sf) boxes.push({ el: el, r: r, surface: sf }); }

      // spacing (ignore html/body, auto-centering margins)
      if (tag !== 'HTML' && tag !== 'BODY') {
        var ml = px(s.marginLeft), mr = px(s.marginRight);
        var centered = ml > 0 && Math.abs(ml - mr) < 1;
        ['Top', 'Bottom'].forEach(function (k) { addSpacing(px(s['margin' + k]), 'margin', el); });
        if (!centered) { addSpacing(ml, 'margin', el); addSpacing(mr, 'margin', el); }
        ['Top', 'Right', 'Bottom', 'Left'].forEach(function (k) { addSpacing(px(s['padding' + k]), 'padding', el); });
        if (/flex|grid/.test(s.display)) {
          var rg = px(s.rowGap), cg = px(s.columnGap);
          addSpacing(rg, 'gap', el);
          if (Math.abs(cg - rg) > 0.5) addSpacing(cg, 'gap', el);
        }
      }

      // interactive targets
      if (el.matches && el.matches(INTERACTIVE)) { interactive.push({ el: el, r: r, s: s }); boxes.push({ el: el, r: r }); }

      // text-bearing elements
      var text = ownText(el);
      if (!text) continue;
      var size = fsz(s);
      var weight = parseInt(s.fontWeight, 10) || 400;
      var lhRaw = s.lineHeight;
      var lh = lhRaw === 'normal' ? null : px(lhRaw);
      var fam = (s.fontFamily || '').split(',')[0].replace(/["']/g, '').trim();
      var upper = s.textTransform === 'uppercase';
      var chars = text.length;
      totalChars += chars;
      var key = size + '|' + weight + '|' + (lh === null ? 'normal' : round1(lh)) + '|' + fam + '|' + (upper ? 'U' : '');
      var st = styleMap.get(key);
      if (!st) { st = { size: size, weight: weight, lineHeight: lh, lineHeightRatio: lh ? round2(lh / size) : null, family: fam, uppercase: upper, elements: 0, chars: 0, samples: [] }; styleMap.set(key, st); }
      st.elements++; st.chars += chars;
      if (st.samples.length < 3) st.samples.push({ text: snippet(text), selector: selectorOf(el) });
      textEls.push({ el: el, s: s, r: r, text: text, size: size, weight: weight, lh: lh, chars: chars });
      // proximity uses the text's content box: padding is whitespace, and a visible fill/border registers as a surface
      var cr = { top: r.top + px(s.paddingTop) + px(s.borderTopWidth), bottom: r.bottom - px(s.paddingBottom) - px(s.borderBottomWidth),
                 left: r.left + px(s.paddingLeft) + px(s.borderLeftWidth), right: r.right - px(s.paddingRight) - px(s.borderRightWidth) };
      if (cr.bottom <= cr.top || cr.right <= cr.left) cr = r;
      boxes.push({ el: el, r: cr, text: true, size: size, chars: chars });
    }

    // ---------- type summary ----------
    var styles = Array.from(styleMap.values()).sort(function (a, b) { return b.chars - a.chars; });
    var sizeChars = new Map();
    styles.forEach(function (st) { sizeChars.set(st.size, (sizeChars.get(st.size) || 0) + st.chars); });
    var sizes = Array.from(sizeChars.entries()).map(function (e) { return { size: e[0], chars: e[1], share: round2(e[1] / Math.max(1, totalChars)) }; })
      .sort(function (a, b) { return a.size - b.size; });
    // Body = the size carrying the most text. When another text size (under 24px) carries nearly as much
    // (≥75%), it's ambiguous — e.g. metadata lines outweighing item names — so take the larger one.
    var bySize = sizes.slice().sort(function (a, b) { return b.chars - a.chars; });
    var bodySize = bySize.length ? bySize[0].size : null;
    var bodyCandidates = bySize.filter(function (x) { return x.chars >= bySize[0].chars * 0.75 && x.size < 24; }).map(function (x) { return x.size; });
    if (bodySize !== null && bodyCandidates.length > 1) bodySize = Math.max.apply(null, bodyCandidates.concat(bodySize < 24 ? [bodySize] : []));
    else bodyCandidates = bodySize === null ? [] : [bodySize];
    var weightChars = new Map();
    styles.forEach(function (st) { weightChars.set(st.weight, (weightChars.get(st.weight) || 0) + st.chars); });
    var weights = Array.from(weightChars.entries()).map(function (e) { return { weight: e[0], chars: e[1], share: round2(e[1] / Math.max(1, totalChars)) }; })
      .sort(function (a, b) { return a.weight - b.weight; });
    var nearMisses = [];
    for (var k2 = 1; k2 < sizes.length; k2++) {
      var a = sizes[k2 - 1].size, b = sizes[k2].size;
      if (b - a <= 1.01 || b / a < 1.06) nearMisses.push({ sizes: [a, b], diff: round2(b - a) });
    }
    var families = Array.from(new Set(styles.map(function (st) { return st.family; })));
    var boldChars = 0; styles.forEach(function (st) { if (st.weight >= 600) boldChars += st.chars; });
    var smallText = textEls.filter(function (t) { return t.size < floors.text - 0.01; });
    var smallSamples = smallText.slice(0, 6).map(function (t) { return { size: t.size, text: snippet(t.text), selector: selectorOf(t.el) }; });

    // line height problems (multi-line text only)
    var lhIssues = [];
    textEls.forEach(function (t) {
      if (!t.lh || t.chars < 60) return;
      var lines = Math.round(t.r.height / t.lh);
      if (lines < 2) return;
      var ratio = t.lh / t.size;
      if (t.size <= 20 && ratio < 1.3) lhIssues.push({ kind: 'tight-body', size: t.size, ratio: round2(ratio), selector: selectorOf(t.el), text: snippet(t.text) });
      if (t.size <= 20 && ratio > 2.0) lhIssues.push({ kind: 'loose-body', size: t.size, ratio: round2(ratio), selector: selectorOf(t.el), text: snippet(t.text) });
      if (t.size >= 28 && ratio > 1.5) lhIssues.push({ kind: 'loose-heading', size: t.size, ratio: round2(ratio), selector: selectorOf(t.el), text: snippet(t.text) });
    });

    // ---------- spacing summary ----------
    var spacingValues = Array.from(spacing.values()).sort(function (a, b) { return b.count - a.count; });
    var offGrid = spacingValues.filter(function (v) { return v.value > 2 && Math.abs(v.value / 4 - Math.round(v.value / 4)) > 0.01; });
    var offGridCount = offGrid.reduce(function (n, v) { return n + v.count; }, 0);

    // ---------- headings ----------
    var headingEls = [];
    elements.forEach(function (el) {
      var lvl = null;
      if (/^H[1-6]$/.test(el.tagName)) lvl = +el.tagName[1];
      else if (el.getAttribute && el.getAttribute('role') === 'heading') lvl = parseInt(el.getAttribute('aria-level'), 10) || 2;
      if (!lvl) return;
      var s = cs(el), r = el.getBoundingClientRect();
      if (!isVisible(el, s, r)) return;
      var textEl = el;                                         // style of the main text inside (for h2>span patterns)
      var txt = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!ownText(el)) {
        var best = null;
        el.querySelectorAll('*').forEach(function (c) { if (ownText(c) && (!best || px(cs(c).fontSize) > px(cs(best).fontSize))) best = c; });
        if (best) textEl = best;
      }
      var ts = cs(textEl);
      headingEls.push({ el: el, level: lvl, size: fsz(ts), weight: parseInt(ts.fontWeight, 10) || 400, color: ts.color, r: r, text: snippet(txt) });
    });
    var outline = headingEls.map(function (h) { return { level: h.level, size: h.size, weight: h.weight, text: h.text, selector: selectorOf(h.el) }; });
    var h1Count = headingEls.filter(function (h) { return h.level === 1; }).length;
    var skipped = [];
    for (var hi = 1; hi < headingEls.length; hi++) {
      if (headingEls[hi].level > headingEls[hi - 1].level + 1) skipped.push({ from: headingEls[hi - 1].level, to: headingEls[hi].level, text: headingEls[hi].text });
    }
    var byLevel = {};
    headingEls.forEach(function (h) { (byLevel[h.level] = byLevel[h.level] || []).push(h); });
    var parity = [];
    Object.keys(byLevel).forEach(function (lvl) {
      var variants = new Map();
      byLevel[lvl].forEach(function (h) {
        var c = toRGBA(h.color); var key = h.size + 'px/' + h.weight + '/' + (c ? hex(c) : h.color);
        var v = variants.get(key) || { style: key, count: 0, examples: [] };
        v.count++; if (v.examples.length < 2) v.examples.push(h.text);
        variants.set(key, v);
      });
      if (variants.size > 1) parity.push({ level: +lvl, variants: Array.from(variants.values()) });
    });
    function median(arr) { if (!arr.length) return null; var s2 = arr.slice().sort(function (a, b) { return a - b; }); var m2 = Math.floor(s2.length / 2); return s2.length % 2 ? s2[m2] : (s2[m2 - 1] + s2[m2]) / 2; }
    var levelStats = Object.keys(byLevel).map(function (l) { return { level: +l, medianSize: median(byLevel[l].map(function (h) { return h.size; })), maxSize: Math.max.apply(null, byLevel[l].map(function (h) { return h.size; })), minSize: Math.min.apply(null, byLevel[l].map(function (h) { return h.size; })), count: byLevel[l].length }; })
      .sort(function (a, b) { return a.level - b.level; });
    var inversions = [];
    for (var x = 0; x < levelStats.length; x++) for (var y = x + 1; y < levelStats.length; y++) {
      var A = levelStats[x], B = levelStats[y];                 // A more important than B
      if (B.medianSize > A.medianSize + 0.5) inversions.push({ higher: 'h' + A.level, lower: 'h' + B.level, higherMedian: A.medianSize, lowerMedian: B.medianSize });
    }
    // headings that look like body: no larger than body and not bolder
    var flatHeadings = bodySize === null ? [] : headingEls.filter(function (h) { return h.size <= bodySize + 0.5 && h.weight < 600; })
      .map(function (h) { return { level: h.level, size: h.size, weight: h.weight, text: h.text }; });

    // pseudo-headings: short, larger or bold block text that isn't a heading
    var pseudo = [];
    if (bodySize !== null) {
      textEls.forEach(function (t) {
        if (pseudo.length >= 12) return;
        var el = t.el;
        if (/^H[1-6]$/.test(el.tagName) || el.closest('h1,h2,h3,h4,h5,h6,[role=heading],button,a,label,th,thead,summary,legend,nav,[role=button],[role=tab],[role=menuitem],option,select,dt,caption')) return;
        if (t.chars > 80 || t.chars < 2) return;
        if (!/^(block|flex|grid|list-item|table-caption)/.test(t.s.display)) return;
        var bigger = t.size >= bodySize * 1.15, bolder = t.weight >= 600 && t.size >= bodySize;
        if (!(bigger || bolder)) return;
        if (/^[\d$€£₹¥+\-−.,%\s]+$/.test(t.text)) return;           // big numbers are KPIs, not headings
        pseudo.push({ size: t.size, weight: t.weight, text: snippet(t.text), selector: selectorOf(el) });
      });
    }

    // heading spacing: whitespace to the nearest content above vs below (geometric, ignores fixed/sticky chrome)
    var pinnedCache = new Map();
    function pinned(el) {
      if (!el || el.nodeType !== 1) return false;
      if (pinnedCache.has(el)) return pinnedCache.get(el);
      var p = cs(el).position;
      var v = p === 'fixed' || p === 'sticky' || pinned(el.parentElement);
      pinnedCache.set(el, v);
      return v;
    }
    var headingSpacing = [];
    headingEls.forEach(function (h) {
      if (pinned(h.el)) return;
      var hr = h.r;
      function nearest(top, bottom, left, right, skip) {
        var res = { above: Infinity, aboveBox: null, below: Infinity };
        for (var bi = 0; bi < boxes.length; bi++) {
          var bx = boxes[bi];
          if (bx.el === h.el || h.el.contains(bx.el) || bx.el.contains(h.el)) continue;
          if (skip && (bx.el === skip.el || skip.el.contains(bx.el) || bx.el.contains(skip.el))) continue;
          var br = bx.r;
          if (br.right <= left + 1 || br.left >= right - 1) continue;              // no horizontal overlap
          if (br.bottom <= top + 1) { if (bx.surface && !bx.surface.bottom) continue; var ga = top - br.bottom; if (ga < res.above && !pinned(bx.el)) { res.above = ga; res.aboveBox = bx; } }
          else if (br.top >= bottom - 1) { if (bx.surface && !bx.surface.top) continue; var gb = br.top - bottom; if (gb < res.below && !pinned(bx.el)) res.below = gb; }
        }
        return res;
      }
      var n = nearest(hr.top, hr.bottom, hr.left, hr.right, null);
      var above = n.above, below = n.below, eyebrow = null;
      // An eyebrow/kicker (short, smaller text tight above the heading) belongs to the heading group:
      // measure the space above the group instead.
      var ab = n.aboveBox;
      if (ab && ab.text && ab.chars <= 40 && ab.size < h.size && n.above <= 12) {
        var up = nearest(ab.r.top, ab.r.top, Math.min(hr.left, ab.r.left), Math.max(hr.right, ab.r.right), ab);
        eyebrow = snippet(ab.el.textContent || '');
        above = up.above;
      }
      // Inside a visible container (card, panel), its edge is the boundary: a card title is measured from the
      // card's top edge; a heading with nothing after it inside its container isn't judged.
      var edgeAbove = false;
      for (var anc = h.el.parentElement; anc && anc.tagName !== 'BODY'; anc = anc.parentElement) {
        var sfa = surfaceOf(anc);
        if (!sfa) continue;
        var ar = anc.getBoundingClientRect();
        var groupTop = eyebrow ? Math.min(hr.top, ab.r.top) : hr.top;
        if (sfa.top && groupTop - ar.top <= above) { above = groupTop - ar.top; edgeAbove = true; }
        if (sfa.bottom && ar.bottom - hr.bottom <= below) return;
        break;                                                                    // only the nearest container
      }
      if (!isFinite(above) || !isFinite(below)) return;                           // first/last content
      above = Math.max(0, above); below = Math.max(0, below);
      var rec = { level: h.level, text: h.text, above: round1(above), below: round1(below), ratio: below > 0 ? round2(above / below) : null, selector: selectorOf(h.el) };
      if (eyebrow) rec.eyebrow = eyebrow;
      if (edgeAbove) rec.aboveIs = 'container edge';
      headingSpacing.push(rec);
    });
    var floating = headingSpacing.filter(function (h) { return h.ratio !== null && h.ratio < 1.5 && h.below >= 4; });

    // ---------- line length ----------
    var measures = [];
    textEls.forEach(function (t) {
      if (!/^(P|LI|DD|BLOCKQUOTE|TD|FIGCAPTION|DIV|SPAN)$/.test(t.el.tagName)) return;
      var full = (t.el.innerText || '').replace(/\s+/g, ' ').trim();
      if (full.length < 160 || t.chars < full.length * 0.6) return;              // skip wrappers of other blocks
      var lineH = t.lh || t.size * 1.2;
      var lines = Math.round(t.r.height / lineH);
      if (lines < 3) return;
      // characters in a FULL line = content width ÷ average glyph advance (the average over all lines
      // undercounts, because last lines are short)
      var cw = t.r.width - px(t.s.paddingLeft) - px(t.s.paddingRight) - px(t.s.borderLeftWidth) - px(t.s.borderRightWidth);
      var cpl = Math.round(full.length / lines);
      try {
        ctx.font = t.s.fontStyle + ' ' + t.s.fontWeight + ' ' + t.s.fontSize + ' ' + t.s.fontFamily;
        var sample = full.slice(0, 600);
        var adv = ctx.measureText(sample).width / sample.length + px(t.s.letterSpacing);
        if (adv > 0 && cw > 0) cpl = Math.min(full.length, Math.round(cw / adv));
      } catch (e) { /* keep the average */ }
      measures.push({ cpl: cpl, lines: lines, size: t.size, selector: selectorOf(t.el), text: snippet(full) });
    });
    var cpls = measures.map(function (m) { return m.cpl; });
    var longLines = measures.filter(function (m) { return m.cpl > 90; });
    var shortLines = measures.filter(function (m) { return m.cpl < 35; });

    // ---------- contrast ----------
    var contrastFails = new Map();
    var contrastChecked = 0, contrastUnknown = 0;
    textEls.slice(0, 4000).forEach(function (t) {
      var fill = t.s.webkitTextFillColor;
      var fg = toRGBA(fill && fill !== t.s.color ? fill : t.s.color);
      if (!fg || fg[3] < 0.05) { contrastUnknown++; return; }          // gradient/clipped text
      if (t.s.backgroundClip === 'text' || t.s.webkitBackgroundClip === 'text') { contrastUnknown++; return; }
      var bg = backgroundOf(t.el);
      if (!bg) { contrastUnknown++; return; }
      var alpha = fg[3] * effOpacity(t.el);
      var fgOnBg = over([fg[0], fg[1], fg[2], alpha], bg);
      var ratio = contrast(fgOnBg, bg);
      contrastChecked++;
      var large = t.size >= 24 || (t.size >= 18.66 && t.weight >= 700);
      var need = large ? 3 : 4.5;
      var disabled = t.el.closest && t.el.closest(':disabled,[aria-disabled="true"]');
      if (ratio + 0.005 < need && !disabled) {
        var k = hex(fgOnBg) + ' on ' + hex(bg) + ' @' + t.size + 'px';
        var f = contrastFails.get(k) || { fg: hex(fgOnBg), bg: hex(bg), size: t.size, weight: t.weight, ratio: round2(ratio), needed: need, count: 0, samples: [] };
        f.count++; if (f.samples.length < 2) f.samples.push({ text: snippet(t.text), selector: selectorOf(t.el) });
        contrastFails.set(k, f);
      }
    });

    // ---------- targets ----------
    var smallTargets = [];
    var undersized = [];
    var allTargets = [];
    var touchWarnings = [];
    interactive.forEach(function (it) {
      var el = it.el, r = it.r;
      if (el.tagName === 'A' && /inline/.test(it.s.display) && it.s.display !== 'inline-block' && it.s.display !== 'inline-flex') {
        // links inside running text are exempt (WCAG 2.5.8 "inline" exception): judge by the nearest block ancestor
        var block = el.parentElement;
        while (block && /^inline/.test(cs(block).display)) block = block.parentElement;
        if (block) {
          var btxt = (block.innerText || '').trim().length;
          var linkTxt = 0;
          block.querySelectorAll('a').forEach(function (a2) { linkTxt += (a2.innerText || '').trim().length; });
          if (btxt - linkTxt > 20) return;
        }
      }
      if (el.tagName === 'INPUT' && /^(checkbox|radio)$/.test(el.type) && el.labels && el.labels.length) {
        var lr = el.labels[0].getBoundingClientRect();           // the label extends the target
        if (lr.width * lr.height > r.width * r.height) r = lr;
      }
      var w = r.width, h = r.height;
      var item = { w: round1(w), h: round1(h), selector: selectorOf(el), text: snippet((el.innerText || el.value || el.getAttribute('aria-label') || '').trim()), _r: r };
      if (w < 24 - 0.01 || h < 24 - 0.01) undersized.push(item);
      else if (touch && (w < 44 - 0.01 || h < 44 - 0.01)) touchWarnings.push(item);
      allTargets.push(r);
    });
    // WCAG 2.5.8 spacing exception: a 24px circle centred on each undersized target must not intersect
    // another target or another undersized target's circle.
    var spacedOk = 0;
    undersized.forEach(function (u) {
      var cx = u._r.left + u._r.width / 2, cy = u._r.top + u._r.height / 2, clash = false;
      for (var ti = 0; ti < allTargets.length && !clash; ti++) {
        var o = allTargets[ti];
        if (o === u._r) continue;
        var nx = Math.max(o.left, Math.min(cx, o.right)), ny = Math.max(o.top, Math.min(cy, o.bottom));
        if ((nx - cx) * (nx - cx) + (ny - cy) * (ny - cy) < 144) clash = true;      // rect within 12px of centre
      }
      for (var ui = 0; ui < undersized.length && !clash; ui++) {
        var v = undersized[ui];
        if (v === u) continue;
        var dx = (v._r.left + v._r.width / 2) - cx, dy = (v._r.top + v._r.height / 2) - cy;
        if (dx * dx + dy * dy < 576) clash = true;                                  // circles overlap (centres < 24px apart)
      }
      if (clash) smallTargets.push(u); else spacedOk++;
    });
    smallTargets.forEach(function (u) { delete u._r; });
    touchWarnings.forEach(function (u) { delete u._r; });

    // ---------- tables ----------
    var NUM = /^[\s(]*[-+−]?[$€£₹¥]?\s?\d[\d,.\s]*\s?(%|[kKmMbB]|[A-Z]{3})?\)?$/;
    function textAlignSide(cell) {
      // where does the text sit inside the cell's content box?
      var range = document.createRange();
      var tn = null;
      var walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
      var n;
      while ((n = walker.nextNode())) { if (n.nodeValue.trim()) { tn = n; break; } }
      if (!tn) return null;
      range.selectNodeContents(tn);
      var tr = range.getBoundingClientRect();
      var cr = cell.getBoundingClientRect(), s = cs(cell);
      var left = tr.left - (cr.left + px(s.paddingLeft) + px(s.borderLeftWidth));
      var right = (cr.right - px(s.paddingRight) - px(s.borderRightWidth)) - tr.right;
      if (left + right < 4) return null;                    // text fills the cell: alignment can't be seen, don't judge
      if (Math.abs(left - right) < 2) return 'center';
      return left > right ? 'right' : 'left';
    }
    var tables = [];
    document.querySelectorAll('table, [role=table], [role=grid], [role=treegrid]').forEach(function (tb) {
      var r = tb.getBoundingClientRect();
      if (r.width * r.height < 100) return;
      var rows = Array.from(tb.querySelectorAll('tr, [role=row]')).filter(function (row) { var rr = row.getBoundingClientRect(); return rr.height > 0; });
      var bodyRows = rows.filter(function (row) { return !row.closest('thead') && !row.querySelector('th:only-child') && !row.querySelector('[role=columnheader]'); });
      var heights = bodyRows.slice(0, 200).map(function (row) { return row.getBoundingClientRect().height; });
      var numericCells = 0, numericLeft = 0, numericCenter = 0, numericProportional = 0, samples = [];
      bodyRows.slice(0, 200).forEach(function (row) {
        Array.from(row.querySelectorAll('td, [role=cell], [role=gridcell]')).forEach(function (cell) {
          var txt = (cell.innerText || '').trim();
          if (!txt || txt.length > 24 || !NUM.test(txt)) return;
          numericCells++;
          var side = textAlignSide(cell);
          if (side === 'left') numericLeft++;
          if (side === 'center') numericCenter++;
          var fv = cs(cell).fontVariantNumeric || '';
          var ff = cs(cell).fontFamily || '';
          if (fv.indexOf('tabular-nums') === -1 && !/mono/i.test(ff)) numericProportional++;
          if (samples.length < 3 && (side === 'left' || fv.indexOf('tabular-nums') === -1)) samples.push({ text: txt, align: side, tabular: fv.indexOf('tabular-nums') !== -1, selector: selectorOf(cell) });
        });
      });
      var headCell = tb.querySelector('th, [role=columnheader]');
      var firstCell = tb.querySelector('td, [role=cell], [role=gridcell]');
      tables.push({
        selector: selectorOf(tb), rows: bodyRows.length, medianRowHeight: median(heights) !== null ? round1(median(heights)) : null,
        header: headCell ? { size: fsz(cs(headCell)), weight: parseInt(cs(headCell).fontWeight, 10) || 400 } : null,
        cell: firstCell ? { size: fsz(cs(firstCell)), weight: parseInt(cs(firstCell).fontWeight, 10) || 400 } : null,
        numericCells: numericCells, numericNotRightAligned: numericLeft + numericCenter, numericProportional: numericProportional, samples: samples,
      });
    });

    // ---------- emphasis and density ----------
    var vh = innerHeight;
    var filledAccent = [];
    interactive.forEach(function (it) {
      if (it.r.top > vh || it.r.bottom < 0) return;
      var isButtonish = /^(BUTTON|A|INPUT)$/.test(it.el.tagName) || it.el.getAttribute('role') === 'button';
      if (!isButtonish) return;
      if (it.el.tagName === 'INPUT' && !/^(submit|button|reset)$/.test(it.el.type)) return;
      var c = toRGBA(it.s.backgroundColor);
      if (!c || c[3] < 0.5) return;
      var h = hsl(c);
      if (h.s >= 0.35 && h.l > 0.15 && h.l < 0.85) filledAccent.push({ text: snippet((it.el.innerText || it.el.value || '').trim()), color: hex(c), selector: selectorOf(it.el) });
    });
    var controls = interactive.filter(function (it) { return /^(BUTTON|INPUT|SELECT)$/.test(it.el.tagName) && it.el.type !== 'checkbox' && it.el.type !== 'radio'; })
      .map(function (it) { return it.r.height; });
    var firstViewText = textEls.filter(function (t) { return t.r.top < vh && t.r.bottom > 0; }).length;

    // ---------- sibling parity: repeated components that differ ----------
    function classSig(el) {
      var cls = (typeof el.className === 'string' ? el.className : '').trim().split(/\s+/).filter(function (c) {
        return c && !/^(is-|has-|active|selected|current|open|first|last|odd|even|ghost|primary|secondary|down|up|late|ok)/i.test(c);
      }).sort();
      return el.tagName + (cls.length ? '.' + cls.join('.') : '');
    }
    function textSig(el) {
      var out = [];
      var w = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT);
      var n = el;
      while (n && out.length < 4) {
        if (n !== el || ownText(n)) {
          if (ownText(n)) { var s3 = cs(n); out.push(px(s3.fontSize) + '/' + (parseInt(s3.fontWeight, 10) || 400)); }
        }
        n = w.nextNode();
      }
      return out.join(' ');
    }
    var siblingParity = [];
    var seenParents = new Set();
    elements.forEach(function (parent) {
      if (siblingParity.length >= 10 || seenParents.has(parent) || parent.children.length < 3) return;
      seenParents.add(parent);
      var groups = new Map();
      Array.prototype.forEach.call(parent.children, function (c) {
        if (SKIP_TAGS[c.tagName] || /^(TR|TD|TH|OPTION|A|SPAN|BR|P|BLOCKQUOTE|PRE|H[1-6]|DT|DD|FIGCAPTION|LABEL)$/.test(c.tagName)) return;
        if (!(typeof c.className === 'string' && c.className.trim())) return;     // components carry a class
        var s4 = cs(c), r4 = c.getBoundingClientRect();
        if (!isVisible(c, s4, r4) || c.children.length < 2) return;
        var k = classSig(c);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(c);
      });
      groups.forEach(function (members, k) {
        if (members.length < 3) return;
        var pads = members.map(function (m) { var s5 = cs(m); return [s5.paddingTop, s5.paddingRight, s5.paddingBottom, s5.paddingLeft].map(px).join('/'); });
        var texts = members.map(textSig);
        var padVariants = Array.from(new Set(pads));
        var textVariants = Array.from(new Set(texts));
        if (padVariants.length > 1 || textVariants.length > 1) {
          var shortName = members[0].tagName.toLowerCase() + ((typeof members[0].className === 'string' ? members[0].className : '').trim().split(/\s+/)
            .filter(function (c) { return c && !/[:\/\[\]@]/.test(c); }).slice(0, 2).map(function (c) { return '.' + c; }).join('') || '');
          siblingParity.push({ component: shortName, count: members.length, selector: selectorOf(members[0]),
            paddingVariants: padVariants.length > 1 ? padVariants.slice(0, 4) : undefined,
            textStyleVariants: textVariants.length > 1 ? textVariants.slice(0, 4) : undefined });
        }
      });
    });

    // form controls that don't inherit the page font (browser defaults)
    var bodyFam = document.body ? (cs(document.body).fontFamily || '').split(',')[0].replace(/["']/g, '').trim() : null;
    var controlFonts = [];
    interactive.forEach(function (it) {
      if (!/^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(it.el.tagName)) return;
      var f2 = (it.s.fontFamily || '').split(',')[0].replace(/["']/g, '').trim();
      if (bodyFam && f2 && f2 !== bodyFam && controlFonts.indexOf(f2) === -1) controlFonts.push(f2);
    });

    // ---------- findings ----------
    var findings = [];
    function add(sev, area, msg, evidence) { findings.push({ severity: sev, area: area, message: msg, evidence: evidence || [] }); }
    // A mobile browser that meets overflowing content widens the layout viewport (zooms out) instead of
    // scrolling, so innerWidth alone can hide the overflow; compare with the width we asked for.
    var overflowX = Math.max(document.documentElement.scrollWidth, innerWidth) - viewportWidth;
    // Content pushed past the LEFT edge can't be scrolled to and doesn't widen the page, so the check
    // above misses it (typical cause: a non-wrapping flex row with justify-content: flex-end or center).
    // Fully off-screen elements (off-canvas drawers) and tiny visually-hidden ones are ignored.
    function inScroller(el) {
      for (var a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        var ox = cs(a).overflowX;
        if ((ox === 'auto' || ox === 'scroll') && a.scrollWidth > a.clientWidth + 1) return true;
      }
      return false;
    }
    var cutLeft = [];
    textEls.concat(interactive).forEach(function (t) {
      var r = t.r;
      if (r.width < 4 || r.height < 4 || !(r.left < -1 && r.right > 1)) return;
      if (cutLeft.some(function (c) { return c.el.contains(t.el) || t.el.contains(c.el); })) return;
      if (inScroller(t.el)) return;
      cutLeft.push({ el: t.el, left: Math.round(r.left), text: snippet((t.el.innerText || t.el.value || t.el.getAttribute('aria-label') || '').trim()) });
    });
    if (cutLeft.length) add('high', 'layout', cutLeft.length + ' element(s) are cut off at the left edge of the viewport, where nobody can scroll to them (WCAG 1.4.10). Usually a row that doesn\'t wrap, aligned to the end or centre — let it wrap, or stack it on narrow screens.', cutLeft.slice(0, 5).map(function (c) { return { left: c.left, text: c.text, selector: selectorOf(c.el) }; }));
    if (overflowX > 1) add(viewportWidth <= 480 ? 'high' : 'medium', 'layout', 'The page needs ' + Math.round(viewportWidth + overflowX) + 'px at ' + viewportWidth + 'px wide — it scrolls sideways or the mobile browser zooms it out (WCAG 1.4.10 Reflow). Mobile browsers may also inflate text sizes when content overflows. Fix the overflow before judging type sizes at this width; data tables may scroll inside their own container instead.');
    if (floors.body && bodySize !== null && bodySize < floors.body - 0.01) add('high', 'type', 'Body text is ' + bodySize + 'px, below the ' + opts.profile + ' floor of ' + floors.body + 'px.');
    if (smallText.length) add(floors.text >= 12 ? 'medium' : 'low', 'type', smallText.length + ' text element(s) below ' + floors.text + 'px.', smallSamples);
    if (nearMisses.length) add('medium', 'type', 'Near-miss font sizes (≤1px or <6% apart): ' + nearMisses.map(function (n) { return n.sizes.join('/'); }).join(', ') + '.', []);
    var ROWS = { productivity: [32, 48], operational: [28, 40] };
    var CONTROLS = { productivity: [28, 40], operational: [28, 36] };
    if (!touch && ROWS[opts.profile]) {
      var rr = ROWS[opts.profile];
      tables.forEach(function (tb) {
        if (tb.medianRowHeight === null || tb.rows < 3) return;
        if (tb.medianRowHeight > rr[1] + 0.5) add('medium', 'density', 'Table rows are ' + tb.medianRowHeight + 'px tall in ' + tb.selector + ' — the ' + opts.profile + ' range is ' + rr[0] + '–' + rr[1] + 'px. Tighten cell padding (not type) or offer a compact mode.');
        else if (tb.medianRowHeight < rr[0] - 0.5) add('low', 'density', 'Table rows are ' + tb.medianRowHeight + 'px tall in ' + tb.selector + ' — below the ' + opts.profile + ' range (' + rr[0] + '–' + rr[1] + 'px); check targets and readability.');
      });
      var mc = median(controls), cr = CONTROLS[opts.profile];
      if (mc !== null && mc > cr[1] + 4) add('low', 'density', 'Median control height is ' + round1(mc) + 'px — the ' + opts.profile + ' range on a pointer device is ' + cr[0] + '–' + cr[1] + 'px.');
    }
    if (sizes.length > 9) add('medium', 'type', sizes.length + ' distinct font sizes in use (aim for ≤5 per screen, ~6–9 per system).');
    else if (sizes.length > 6) add('low', 'type', sizes.length + ' distinct font sizes on this page (aim for 3–5 per screen).');
    if (weights.length > 3) add('low', 'type', weights.length + ' font weights in use (' + weights.map(function (w) { return w.weight; }).join(', ') + '); aim for 2–3.');
    if (totalChars > 0 && boldChars / totalChars > 0.35) add('medium', 'emphasis', Math.round(100 * boldChars / totalChars) + '% of text is weight ≥600 — emphasis stops working above about a third.');
    if (lhIssues.length) add('medium', 'type', lhIssues.length + ' multi-line text block(s) with line height outside the comfortable range.', lhIssues.slice(0, 4));
    if (spacingCount > 0 && offGridCount / spacingCount > 0.1) add('medium', 'spacing', Math.round(100 * offGridCount / spacingCount) + '% of spacing values are off the 4px grid: ' + offGrid.slice(0, 8).map(function (v) { return v.value + 'px×' + v.count; }).join(', ') + '.');
    else if (offGrid.length) add('low', 'spacing', offGrid.length + ' off-grid spacing value(s): ' + offGrid.slice(0, 6).map(function (v) { return v.value + 'px×' + v.count; }).join(', ') + '.');
    if (inversions.length) add('high', 'headings', 'Heading inversions: ' + inversions.map(function (v) { return v.lower + ' (' + v.lowerMedian + 'px) larger than ' + v.higher + ' (' + v.higherMedian + 'px)'; }).join('; ') + '.');
    if (parity.length) add('medium', 'headings', 'Parity: ' + parity.map(function (p) { return 'h' + p.level + ' rendered ' + p.variants.length + ' ways'; }).join('; ') + '.', parity);
    if (flatHeadings.length) add('medium', 'headings', flatHeadings.length + ' heading(s) no larger than body (' + bodySize + 'px) and not bold — they read as body text.', flatHeadings.slice(0, 5));
    if (h1Count !== 1) add('low', 'headings', h1Count === 0 ? 'No h1 on the page.' : h1Count + ' h1 elements on the page.');
    if (skipped.length) add('low', 'headings', 'Skipped heading levels: ' + skipped.slice(0, 4).map(function (s2) { return 'h' + s2.from + '→h' + s2.to; }).join(', ') + '.', skipped.slice(0, 4));
    if (pseudo.length) add('low', 'headings', pseudo.length + ' bold or large short text block(s) not marked up as headings — mark up or demote.', pseudo.slice(0, 5));
    if (floating.length) add('medium', 'spacing', floating.length + ' heading(s) with space above < 1.5× space below — they float instead of binding to their content.', floating.slice(0, 5));
    if (longLines.length) add('medium', 'type', longLines.length + ' paragraph(s) over 90 characters per line.', longLines.slice(0, 3));
    if (contrastFails.size) {
      var cf = Array.from(contrastFails.values()).sort(function (a, b) { return b.count - a.count; });
      var pairCount = new Set(cf.map(function (f) { return f.fg + '/' + f.bg; })).size;
      add('high', 'contrast', cf.reduce(function (n, f) { return n + f.count; }, 0) + ' text element(s) below WCAG 1.4.3 contrast (' + pairCount + ' text/background color pair(s)).', cf.slice(0, 6));
    }
    if (smallTargets.length) add('medium', 'targets', smallTargets.length + ' interactive element(s) smaller than 24×24 CSS px without enough spacing around them (WCAG 2.5.8).' + (spacedOk ? ' ' + spacedOk + ' more are undersized but pass via the spacing exception.' : ''), smallTargets.slice(0, 6));
    if (touchWarnings.length) add('low', 'targets', touchWarnings.length + ' interactive element(s) under 44×44 px on a touch viewport.', touchWarnings.slice(0, 6));
    tables.forEach(function (tb) {
      if (tb.numericNotRightAligned > 0) add('medium', 'tables', tb.numericNotRightAligned + ' of ' + tb.numericCells + ' numeric cells not right-aligned in ' + tb.selector + '.', tb.samples);
      if (tb.numericProportional > 0) add('low', 'tables', tb.numericProportional + ' of ' + tb.numericCells + ' numeric cells without tabular figures in ' + tb.selector + '.');
      if (tb.header && tb.cell && tb.header.size > tb.cell.size + 0.5) add('low', 'tables', 'Table headers (' + tb.header.size + 'px) larger than cells (' + tb.cell.size + 'px) in ' + tb.selector + ' — distinguish headers by weight or color instead.');
    });
    siblingParity.forEach(function (sp) {
      add('medium', 'parity', sp.count + ' repeated "' + sp.component + '" components are styled differently' + (sp.paddingVariants ? ' (padding ' + sp.paddingVariants.join(' vs ') + ')' : '') + (sp.textStyleVariants ? ' (text styles ' + sp.textStyleVariants.join(' vs ') + ')' : '') + '.', [{ selector: sp.selector }]);
    });
    if (controlFonts.length) add('low', 'type', 'Form controls use a different font (' + controlFonts.join(', ') + ') than the page (' + bodyFam + ') — usually missing `font: inherit` on buttons and inputs.');
    if (filledAccent.length > 1) add('medium', 'emphasis', filledAccent.length + ' filled accent buttons in the first viewport — usually one primary action per view.', filledAccent.slice(0, 6));
    var order = { high: 0, medium: 1, low: 2 };
    findings.sort(function (a, b) { return order[a.severity] - order[b.severity]; });

    var result = {
      meta: { url: location.href, title: document.title, viewport: { width: viewportWidth, layoutWidth: innerWidth, height: innerHeight, dpr: devicePixelRatio }, pageHeight: document.documentElement.scrollHeight, overflowX: Math.max(0, Math.round(overflowX)),
              profile: opts.profile, touch: touch, elementsScanned: elements.length, truncated: truncated, ms: Math.round(performance.now() - t0) },
      type: { bodySize: bodySize, bodyCandidates: bodyCandidates, sizes: sizes, nearMisses: nearMisses, weights: weights, families: families, styles: styles.slice(0, 30),
              boldShare: totalChars ? round2(boldChars / totalChars) : 0, smallText: { count: smallText.length, floor: floors.text, samples: smallSamples }, lineHeightIssues: lhIssues.slice(0, 10) },
      spacing: { values: spacingValues.slice(0, 25), offGrid: offGrid.slice(0, 15), offGridShare: spacingCount ? round2(offGridCount / spacingCount) : 0 },
      headings: { outline: outline.slice(0, 80), h1Count: h1Count, skipped: skipped, levels: levelStats, parity: parity, inversions: inversions, flat: flatHeadings.slice(0, 10), pseudoHeadings: pseudo, spacing: headingSpacing.slice(0, 40), floating: floating },
      measure: { paragraphs: measures.length, medianCharsPerLine: median(cpls), long: longLines.slice(0, 5), short: shortLines.slice(0, 5) },
      contrast: { checked: contrastChecked, unknownBackground: contrastUnknown, failures: Array.from(contrastFails.values()).sort(function (a, b) { return b.count - a.count; }).slice(0, 15) },
      targets: { checked: interactive.length, floor: targetFloor, under24: smallTargets.slice(0, 20), under24Count: smallTargets.length, under24SpacedOk: spacedOk, under44Touch: touchWarnings.slice(0, 20), under44TouchCount: touchWarnings.length },
      tables: tables.slice(0, 10),
      parity: { siblings: siblingParity },
      density: { textElementsInFirstViewport: firstViewText, medianControlHeight: median(controls), filledAccentButtonsInFirstViewport: filledAccent.length, filledAccent: filledAccent.slice(0, 8) },
      findings: findings,
    };
    return result;
  }

  window.vhInventory = vhInventory;

  if (!window.__vhQuiet) {                                    // pasted into a console: print a summary
    var res = vhInventory();
    try {
      console.log('%cvisual-density inventory', 'font-weight:bold');
      console.log('body ' + res.type.bodySize + 'px · sizes ' + res.type.sizes.map(function (s) { return s.size; }).join('/') + ' · weights ' + res.type.weights.map(function (w) { return w.weight; }).join('/'));
      console.table(res.findings.map(function (f) { return { severity: f.severity, area: f.area, message: f.message }; }));
      console.log('Full result: window.vhInventory() — or with a profile: window.vhInventory({ profile: "operational" })');
    } catch (e) { /* console without table */ }
    return res;
  }
})();
