'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Classic Flat Scientific Line-Art Design Tokens (#294454 house palette, Qt6 QSvgRenderer safe).
// Zero <linearGradient>, <radialGradient>, <filter>, <clipPath>, <mask>, <pattern>, <image>, or <script>.
const C = {
  // Primary uniform line work & typography
  stroke: '#294454',       // Primary outer walls (stroke-width 2.2-2.5, round cap/join)
  ink: '#294454',          // Alias matching classic C.ink
  glassSw: 2.8,            // Bold uniform glassware contour weight for 160x200 vessels
  inner: '#3D5968',        // Internal glass tubes, coils, fittings (stroke-width 1.4-1.8)
  tick: '#7E939E',         // Graduations, subtle scale marks (stroke-width 1.0-1.3)
  muted: '#9AB0B8',        // Secondary borders & light guide lines
  lightGrid: '#C0D4CF',    // Subtle grid/reticle tint
  frostStroke: '#7E939E',  // Legacy alias for subtle markings
  frostFill: '#DCE5E8',    // Legacy alias for flat hardware sleeves

  // Flat glass & solution tints (zero gradients)
  glass: '#DCEFEB',
  glassTop: '#F4F9F8',
  glassMid: '#F4F9F8',
  glassBot: '#DCEFEB',
  glassEdge: '#DCEFEB',
  coolant: '#D9ECF2',
  coolantLight: '#E6F4F3',
  coolantMid: '#D9ECF2',
  coolantDeep: '#D9ECF2',
  liquid: '#E6F4F3',
  specular: '#FFFFFF',

  // Flat teal & light scientific chassis palette
  tealDark: '#1F6F6B',
  teal: '#258F89',
  tealLight: '#D4EAE8',
  tealSoft: '#E6F4F3',
  chassisTop: '#F8FAF9',
  chassisMid: '#DCE5E8',
  chassisBot: '#C6D2D7',
  bezel: '#294454',
  bezelDark: '#294454',

  // Light matte LCD displays (high contrast, never dark black)
  lcdBg: '#EEF6F1',
  lcdGreen: '#258F89',
  lcdCyan: '#294454',
  lcdAmber: '#C9A048',

  // Flat materials & accents
  porcelainTop: '#F8FAF9',
  porcelainMid: '#F2F2EE',
  porcelainBot: '#E6E5DF',
  ptfe: '#F8FAF9',
  rubberTop: '#7E939E',
  rubberMid: '#586F7C',
  rubberDark: '#3D5968',
  corkLight: '#DFBE8F',
  corkMid: '#D79B59',
  corkDark: '#B57B42',
  amberDark: '#A88234',
  amberMid: '#C9A048',
  amberLight: '#DFBE74',
  brassDark: '#A88234',
  brass: '#C9A048',
  brassLight: '#EAD79B',
  copper: '#D79B59',
  warm: '#D79B59',
  red: '#C84B31',
  blue: '#3A7CA5',
  leaf: '#6DA37C',
  leafSoft: '#C0D4CF',
  flameBlue: '#5BB5D5',
  flameCore: '#D9ECF2',
  flameTip: '#D79B59',
};

const SW = {
  glassSw: 2.8,
  outer: 2.4,
  inner: 1.6,
  tick: 1.2,
};

const FONT = 'Segoe UI, Arial, sans-serif';
const MONO = 'Consolas, Segoe UI, monospace';

const r = (n) => Number(Number(n).toFixed(3));
const fmt = r;
const rad = (deg) => (deg * Math.PI) / 180;
const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
const safeId = (id) =>
  String(id)
    .replace(/^studio:/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '-');

// Flat hex fill mapping for any legacy gradient url(#<slug>-<role>) references
const URL_SUFFIX_FILLS = {
  glass: '#F4F9F8',
  'glass-v': '#F4F9F8',
  coolant: '#E6F4F3',
  frost: '#F4F9F8',
  liquid: '#D9ECF2',
  metal: '#C6D2D7',
  'metal-v': '#C6D2D7',
  chassis: '#DCE5E8',
  porcelain: '#F2F2EE',
  rubber: '#586F7C',
  cork: '#D79B59',
  accent: '#258F89',
  amber: '#DFBE74',
  brass: '#C9A048',
  copper: '#D79B59',
  screen: '#EEF6F1',
  red: '#C84B31',
};

function resolveFlatPaint(token) {
  const m = String(token).match(/^url\(#.+-(glass-v|glass|coolant|frost|liquid|metal-v|metal|chassis|porcelain|rubber|cork|accent|amber|brass|copper|screen|red)\)$/);
  if (m && URL_SUFFIX_FILLS[m[1]]) return URL_SUFFIX_FILLS[m[1]];
  return URL_SUFFIX_FILLS[token] || token;
}

function stripGradientsAndUrls(svg) {
  let out = String(svg)
    .replace(/<linearGradient\b[\s\S]*?<\/linearGradient>/gi, '')
    .replace(/<radialGradient\b[\s\S]*?<\/radialGradient>/gi, '')
    .replace(/<defs>\s*<\/defs>\s*/gi, '');
  out = out.replace(/url\(#([^)]+)\)/g, (full, ref) => {
    const suffixMatch = ref.match(/-(glass-v|glass|coolant|frost|liquid|metal-v|metal|chassis|porcelain|rubber|cork|accent|amber|brass|copper|screen|red)$/);
    if (suffixMatch && URL_SUFFIX_FILLS[suffixMatch[1]]) {
      return URL_SUFFIX_FILLS[suffixMatch[1]];
    }
    return full;
  });
  return out;
}

// Zero <linearGradient>/<radialGradient> emitters (kept exported for caller compatibility)
function defsFor() {
  return '';
}
const glassDefs = defsFor;
const equipDefs = defsFor;
const miscDefs = defsFor;
const svgDefs = defsFor;

const FORBIDDEN_SVG_RE = /<\s*(filter|clipPath|mask|pattern|image|script|linearGradient|radialGradient)\b/i;

function validateSvg(svg, slug = '') {
  if (typeof svg !== 'string' || !svg.includes('<svg') || !svg.includes('</svg>')) {
    throw new Error(`Invalid SVG markup for ${slug || '<unnamed>'}`);
  }
  const m = svg.match(FORBIDDEN_SVG_RE);
  if (m) {
    throw new Error(`Forbidden SVG tag <${m[1]}> in ${slug || '<unnamed>'}`);
  }
  if (/url\(#/i.test(svg)) {
    throw new Error(`Unresolved url(#...) reference in ${slug || '<unnamed>'}`);
  }
  return svg;
}

function wrapSvg(slug, title, w, h, body) {
  const p = safeId(slug);
  const raw =
    `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${r(w)}" height="${r(h)}" viewBox="0 0 ${r(w)} ${r(h)}">\n` +
    `<title>${esc(title || p)}</title>\n` +
    `${body}\n` +
    `</svg>\n`;
  return validateSvg(stripGradientsAndUrls(raw), p);
}

// ---------- Glassware & Joint Primitives (Unadorned Clean Flat Line Art) ----------

function hatchedTrapezoid(slug, sx, sy, ex, ey, hw0, hw1, opts = {}) {
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.hypot(dx, dy);
  if (len <= 0) return '';
  const ux = dx / len;
  const uy = dy / len;
  const tx = -uy;
  const ty = ux;
  const pt = (s, w) => [r(sx + ux * s + tx * w), r(sy + uy * s + ty * w)];
  const p0L = pt(0, -hw0);
  const p0R = pt(0, hw0);
  const p1R = pt(len, hw1);
  const p1L = pt(len, -hw1);

  const fill = opts.amber ? C.amberLight : opts.mask ? '#FFFFFF' : opts.fill || 'none';
  const stroke = opts.stroke || C.stroke;
  const sw = opts.sw || 2.2;
  return `<polygon points="${p0L.join(',')} ${p0R.join(',')} ${p1R.join(',')} ${p1L.join(',')}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function rolledLip(slug, cx, yTop, outerHalfW, opts = {}) {
  const h = opts.height ?? 4.2;
  const rx = opts.rx ?? r(h / 2);
  const fill = opts.amber ? C.amberLight : opts.fill || '#FFFFFF';
  return `<rect x="${r(cx - outerHalfW)}" y="${r(yTop)}" width="${r(outerHalfW * 2)}" height="${r(h)}" rx="${rx}" fill="${fill}" stroke="${opts.stroke || C.stroke}" stroke-width="${opts.sw || 2.2}"/>`;
}

function verticalFemaleJoint(slug, cx, yTop, len = 22, hwTop = 12, hwBot = 9.5, opts = {}) {
  const lipH = opts.lipH ?? 4.2;
  const rimExtra = opts.rimExtra ?? 3.2;
  const lip = rolledLip(slug, cx, yTop, hwTop + rimExtra, { height: lipH, amber: opts.amber });
  const cone = hatchedTrapezoid(slug, cx, yTop + lipH - 0.5, cx, yTop + len, hwTop, hwBot, {
    sw: 2.2,
    amber: opts.amber,
    fill: opts.fill || 'none',
    mask: opts.mask,
  });
  const ring = opts.noBaseRing
    ? ''
    : `<line x1="${r(cx - hwBot)}" y1="${r(yTop + len)}" x2="${r(cx + hwBot)}" y2="${r(yTop + len)}" stroke="${C.inner}" stroke-width="1.4" stroke-linecap="round"/>`;
  return `${cone}\n  ${lip}\n  ${ring}`;
}

function verticalMaleJoint(slug, cx, yTop, len = 22, hwTop = 12, hwBot = 9, opts = {}) {
  const cone = hatchedTrapezoid(slug, cx, yTop, cx, yTop + len, hwTop, hwBot, {
    sw: 2.2,
    amber: opts.amber,
    fill: opts.fill || '#FFFFFF',
  });
  const collar =
    opts.collar === false
      ? ''
      : `<line x1="${r(cx - hwTop - 1.5)}" y1="${r(yTop)}" x2="${r(cx + hwTop + 1.5)}" y2="${r(yTop)}" stroke="${C.stroke}" stroke-width="2.2" stroke-linecap="round"/>`;
  let drip = '';
  if (opts.dripTip) {
    drip = `<path d="M${r(cx - 4.5)} ${r(yTop + len)} L${r(cx - 3.5)} ${r(yTop + len + 7)} L${r(cx + 3.5)} ${r(yTop + len + 4)} L${r(cx + 4.5)} ${r(yTop + len)} Z" fill="none" stroke="${C.stroke}" stroke-width="2.0" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  return `${drip}\n  ${cone}\n  ${collar}`;
}

function angledMaleJoint(slug, sx, sy, ux, uy, len = 22, hwTop = 12, hwBot = 9, opts = {}) {
  const ex = sx + ux * len;
  const ey = sy + uy * len;
  const tx = -uy;
  const ty = ux;
  const cone = hatchedTrapezoid(slug, sx, sy, ex, ey, hwTop, hwBot, {
    sw: 2.2,
    amber: opts.amber,
    fill: opts.fill || '#FFFFFF',
  });
  const collar =
    opts.collar === false
      ? ''
      : `<line x1="${r(sx - tx * (hwTop + 1.5))}" y1="${r(sy - ty * (hwTop + 1.5))}" x2="${r(sx + tx * (hwTop + 1.5))}" y2="${r(sy + ty * (hwTop + 1.5))}" stroke="${C.stroke}" stroke-width="2.2" stroke-linecap="round"/>`;
  return {
    svg: `${cone}\n  ${collar}`,
    tip: [r(ex), r(ey)],
    edge: [r(ex - tx * hwBot), r(ey - ty * hwBot), r(ex + tx * hwBot), r(ey + ty * hwBot)],
    diameter: r(hwBot * 2),
  };
}

function angledFemaleJoint(slug, lx, ly, ox, oy, len = 22, hwTop = 12, hwBot = 9.5, opts = {}) {
  const ux = -ox;
  const uy = -oy;
  const tx = -uy;
  const ty = ux;
  const lipH = opts.lipH ?? 4.2;
  const rimExtra = opts.rimExtra ?? 3.0;
  const sx = lx + ux * (lipH - 0.5);
  const sy = ly + uy * (lipH - 0.5);
  const ex = lx + ux * len;
  const ey = ly + uy * len;
  const cone = hatchedTrapezoid(slug, sx, sy, ex, ey, hwTop, hwBot, {
    sw: 2.2,
    amber: opts.amber,
    fill: opts.fill || 'none',
    mask: opts.mask,
  });
  const pt = (along, w) => [r(lx + ux * along + tx * w), r(ly + uy * along + ty * w)];
  const lp1 = pt(0, -(hwTop + rimExtra));
  const lp2 = pt(0, hwTop + rimExtra);
  const lp3 = pt(lipH, hwTop + rimExtra);
  const lp4 = pt(lipH, -(hwTop + rimExtra));
  const lip = `<polygon points="${lp1.join(',')} ${lp2.join(',')} ${lp3.join(',')} ${lp4.join(',')}" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
  return {
    svg: `${cone}\n  ${lip}`,
    lip: [r(lx), r(ly)],
    edge: [r(lx - tx * hwTop), r(ly - ty * hwTop), r(lx + tx * hwTop), r(ly + ty * hwTop)],
    diameter: r(hwTop * 2),
    innerEnd: [r(ex), r(ey)],
  };
}

// Clean smooth glass joint helper (zero diagonal hatching)
function frostedJoint(slug, kind, cx, yTop, opts = {}) {
  const len = opts.len ?? 22;
  const hwTop = opts.hwTop ?? (kind === 'female' ? 12 : 11.5);
  const hwBot = opts.hwBot ?? (kind === 'female' ? 9.5 : 8.8);
  return kind === 'male'
    ? verticalMaleJoint(slug, cx, yTop, len, hwTop, hwBot, opts)
    : verticalFemaleJoint(slug, cx, yTop, len, hwTop, hwBot, opts);
}
const smoothJoint = frostedJoint;

// Classic flat line-art style omits glossy white specular bars
function glassHighlight() {
  return '';
}

// Graduation tick marks along a column/vessel wall
function gradTicks(xAnchor, yTop, yBot, count, majorEvery = 5, tickLen = 7, opts = {}) {
  const dir = opts.dir === 1 ? 1 : -1;
  const minorLen = opts.minorLen ?? tickLen;
  const majorLen = opts.majorLen ?? tickLen * 1.45;
  const lines = [];
  for (let i = 0; i <= count; i++) {
    const y = count > 0 ? yTop + ((yBot - yTop) * i) / count : yTop;
    const major = i % majorEvery === 0;
    const len = major ? majorLen : minorLen;
    lines.push(
      `<line x1="${r(xAnchor)}" y1="${r(y)}" x2="${r(xAnchor + dir * len)}" y2="${r(y)}" stroke="${opts.color || C.tick}" stroke-width="${major ? 1.3 : 1.0}" stroke-linecap="round"/>`
    );
  }
  return `<g>${lines.join('')}</g>`;
}

// Olive hose barb along arbitrary direction (dx, dy)
function barb(slug, wallX, wallY, dx, dy, barbLen = 16, rBase = 5.0, rTip = 4.2) {
  const mag = Math.hypot(dx, dy) || 1;
  const ux = dx / mag;
  const uy = dy / mag;
  const tx = -uy;
  const ty = ux;
  const pt = (along, perp) => `${r(wallX + ux * along + tx * perp)} ${r(wallY + uy * along + ty * perp)}`;
  const mid = barbLen * 0.62;
  const tipX = wallX + ux * barbLen;
  const tipY = wallY + uy * barbLen;
  const d = [
    `M${pt(0, -rBase)}`,
    `L${pt(mid, -(rBase - 0.6))}`,
    `L${pt(mid + 2, -(rBase + 1.3))}`,
    `L${pt(barbLen, -rTip)}`,
    `L${pt(barbLen, rTip)}`,
    `L${pt(mid + 2, rBase + 1.3)}`,
    `L${pt(mid, rBase - 0.6)}`,
    `L${pt(0, rBase)} Z`,
  ].join(' ');
  return {
    svg: `<path d="${d}" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    port: {
      x: r(tipX),
      y: r(tipY),
      dx: r(ux),
      dy: r(uy),
      diameter: r(rTip * 2),
      depth: 8,
      edge: [r(tipX - tx * rTip), r(tipY - ty * rTip), r(tipX + tx * rTip), r(tipY + ty * rTip)],
    },
  };
}

function oliveBarb(slug, wallX, cy, dirX, barbLen = 16, rBase = 5, rTip = 4.2) {
  return barb(slug, wallX, cy, dirX, 0, barbLen, rBase, rTip);
}

function verticalOliveBarb(slug, cx, wallY, dirY, barbLen = 16, rBase = 5, rTip = 4.2) {
  return barb(slug, cx, wallY, 0, dirY, barbLen, rBase, rTip);
}

// PTFE or glass stopcock valve across vertical tube at (cx, cy)
function drawStopcock(slug, cx, cy, opts = {}) {
  const w = opts.w || 22;
  const h = opts.h || 9;
  const handleColor = opts.teal ? C.teal : C.red;
  const plugColor = opts.glass ? C.glassTop : C.ptfe;
  return `<g>
    <path d="M${r(cx - w / 2)} ${r(cy - h / 2)} L${r(cx + w / 2)} ${r(cy - h / 2 + 1.2)} L${r(cx + w / 2)} ${r(cy + h / 2 - 1.2)} L${r(cx - w / 2)} ${r(cy + h / 2)} Z" fill="${plugColor}" stroke="${C.stroke}" stroke-width="2.0" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="${r(cx - w / 2 - 7)}" y="${r(cy - 6.5)}" width="7" height="13" rx="2" fill="${handleColor}" stroke="${C.stroke}" stroke-width="1.8"/>
    <rect x="${r(cx + w / 2)}" y="${r(cy - 3.5)}" width="5" height="7" rx="1.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.6"/>
    <line x1="${r(cx - 2.5)}" y1="${r(cy - 2.5)}" x2="${r(cx + 2.5)}" y2="${r(cy + 2.5)}" stroke="${C.inner}" stroke-width="1.3" stroke-linecap="round"/>
  </g>`;
}

// ---------- Benchtop Instrument & Electrical Primitives ----------

function labFeet(x, y, w, footW = 18, footH = 7, inset = 14) {
  return (
    `<rect x="${r(x + inset)}" y="${r(y)}" width="${footW}" height="${footH}" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.8"/>` +
    `<rect x="${r(x + w - inset - footW)}" y="${r(y)}" width="${footW}" height="${footH}" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.8"/>`
  );
}

function chassis(slug, x, y, w, h, opts = {}) {
  const rx = opts.rx ?? 8;
  const feet = opts.feet !== false ? labFeet(x, y + h, w, opts.footW ?? 20, opts.footH ?? 7, opts.footInset ?? 18) : '';
  const accent =
    opts.accentBar !== false
      ? `<rect x="${r(x + 2)}" y="${r(y + 2)}" width="${r(w - 4)}" height="6" rx="3" fill="${opts.accentColor || C.teal}" stroke="none"/>`
      : '';
  const innerLine = `<rect x="${r(x + 6)}" y="${r(y + 11)}" width="${r(w - 12)}" height="${r(h - 17)}" rx="${Math.max(2, rx - 3)}" fill="none" stroke="${C.muted}" stroke-width="1.0"/>`;
  return (
    feet +
    `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="${rx}" fill="${opts.fill ? resolveFlatPaint(opts.fill) : C.chassisMid}" stroke="${C.stroke}" stroke-width="2.3"/>` +
    accent +
    innerLine
  );
}

function oledScreen(slug, x, y, w, h, innerSvg = '', opts = {}) {
  const rx = opts.rx ?? 4;
  return (
    `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="${rx + 2}" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>` +
    `<rect x="${r(x + 4)}" y="${r(y + 4)}" width="${r(w - 8)}" height="${r(h - 8)}" rx="${rx}" fill="${C.lcdBg}" stroke="${C.stroke}" stroke-width="1.4"/>` +
    innerSvg
  );
}

function screenText(x, y, txt, size = 11, color = C.lcdGreen, anchor = 'middle', bold = true) {
  return `<text x="${r(x)}" y="${r(y)}" fill="${color}" stroke="none" font-family="${MONO}" font-size="${size}" font-weight="${bold ? '700' : '400'}" text-anchor="${anchor}">${esc(txt)}</text>`;
}

function labelText(x, y, txt, size = 8, color = C.inner, anchor = 'middle', bold = true) {
  return `<text x="${r(x)}" y="${r(y)}" fill="${color}" stroke="none" font-family="${FONT}" font-size="${size}" font-weight="${bold ? '700' : '400'}" text-anchor="${anchor}">${esc(txt)}</text>`;
}

function rotaryKnob(slug, cx, cy, radius, angleDeg = -40, opts = {}) {
  const a = rad(angleDeg - 90);
  const px = cx + Math.cos(a) * (radius * 0.68);
  const py = cy + Math.sin(a) * (radius * 0.68);
  let ticks = '';
  if (opts.ticks) {
    const n = opts.ticks;
    for (let i = 0; i < n; i++) {
      const ta = rad(-135 + (270 * i) / (n - 1) - 90);
      const r1 = radius + 2.5;
      const r2 = radius + (i % 2 === 0 ? 5.5 : 4);
      ticks += `<line x1="${r(cx + Math.cos(ta) * r1)}" y1="${r(cy + Math.sin(ta) * r1)}" x2="${r(cx + Math.cos(ta) * r2)}" y2="${r(cy + Math.sin(ta) * r2)}" stroke="${C.tick}" stroke-width="1.1" stroke-linecap="round"/>`;
    }
  }
  const innerFill = opts.teal ? C.teal : C.chassisBot;
  const tickColor = opts.teal ? '#FFFFFF' : C.stroke;
  return (
    ticks +
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(radius)}" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="1.8"/>` +
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(radius * 0.78)}" fill="${innerFill}" stroke="${C.inner}" stroke-width="1.3"/>` +
    `<line x1="${r(cx)}" y1="${r(cy)}" x2="${r(px)}" y2="${r(py)}" stroke="${tickColor}" stroke-width="1.8" stroke-linecap="round"/>` +
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="1.6" fill="${tickColor}" stroke="none"/>`
  );
}

function softButton(x, y, w, h, label = '', fill = C.chassisTop, textColor = C.stroke) {
  return (
    `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="2.5" fill="${fill}" stroke="${C.stroke}" stroke-width="1.5"/>` +
    (label ? labelText(x + w / 2, y + h / 2 + 2.6, label, 6.8, textColor, 'middle', true) : '')
  );
}

function bindingPost(cx, cy, color = C.red, label = '', labelDy = -13, radius = 7.5) {
  return (
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="${radius}" fill="${color}" stroke="${C.stroke}" stroke-width="1.8"/>` +
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(radius * 0.52)}" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="1.1"/>` +
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(radius * 0.28)}" fill="${C.stroke}" stroke="none"/>` +
    (label ? labelText(cx, cy + labelDy, label, 8, C.inner, 'middle', true) : '')
  );
}

function bncJack(cx, cy, label = '', ringColor = C.chassisBot, labelDy = -13) {
  return (
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="8.5" fill="${ringColor}" stroke="${C.stroke}" stroke-width="1.8"/>` +
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="5.6" fill="${C.chassisMid}" stroke="${C.inner}" stroke-width="1.1"/>` +
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="3.4" fill="${C.chassisTop}" stroke="${C.inner}" stroke-width="1.0"/>` +
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="1.6" fill="${C.brass}" stroke="none"/>` +
    (label ? labelText(cx, cy + labelDy, label, 7.5, C.inner, 'middle', true) : '')
  );
}

function analogMeter(slug, x, y, w, h, opts = {}) {
  const cx = x + w / 2;
  const cy = y + h * 0.87;
  const radLen = Math.min(w * 0.43, h * 0.7);
  const startDeg = -52;
  const endDeg = 52;
  const toXY = (deg, radius) => {
    const a = rad(deg - 90);
    return [cx + Math.cos(a) * radius, cy + Math.sin(a) * radius];
  };
  const [ax1, ay1] = toXY(startDeg, radLen);
  const [ax2, ay2] = toXY(endDeg, radLen);
  const [mx1, my1] = toXY(startDeg + 4, radLen * 0.84);
  const [mx2, my2] = toXY(endDeg - 4, radLen * 0.84);
  let ticks = '';
  const nTicks = opts.ticks || 10;
  for (let i = 0; i <= nTicks; i++) {
    const d = startDeg + ((endDeg - startDeg) * i) / nTicks;
    const major = i % 2 === 0;
    const [tx1, ty1] = toXY(d, radLen);
    const [tx2, ty2] = toXY(d, radLen - (major ? 6.5 : 3.8));
    ticks += `<line x1="${r(tx1)}" y1="${r(ty1)}" x2="${r(tx2)}" y2="${r(ty2)}" stroke="${C.stroke}" stroke-width="${major ? 1.4 : 0.95}" stroke-linecap="round"/>`;
  }
  const needleDeg = opts.needleDeg ?? -14;
  const [nx, ny] = toXY(needleDeg, radLen * 0.94);
  let labels = '';
  if (opts.scaleLabels) {
    const arr = opts.scaleLabels;
    for (let i = 0; i < arr.length; i++) {
      const d = startDeg + ((endDeg - startDeg) * i) / (arr.length - 1);
      const [lx, ly] = toXY(d, radLen - 12.5);
      labels += labelText(lx, ly + 2.2, arr[i], 6.2, C.inner, 'middle', true);
    }
  }
  return (
    `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>` +
    `<rect x="${r(x + 4)}" y="${r(y + 4)}" width="${r(w - 8)}" height="${r(h - 8)}" rx="3" fill="${C.chassisTop}" stroke="${C.inner}" stroke-width="1.2"/>` +
    `<path d="M${r(mx1)} ${r(my1)} A${r(radLen * 0.84)} ${r(radLen * 0.84)} 0 0 1 ${r(mx2)} ${r(my2)}" fill="none" stroke="${C.lightGrid}" stroke-width="2.2" stroke-linecap="round"/>` +
    `<path d="M${r(ax1)} ${r(ay1)} A${r(radLen)} ${r(radLen)} 0 0 1 ${r(ax2)} ${r(ay2)}" fill="none" stroke="${C.stroke}" stroke-width="1.5" stroke-linecap="round"/>` +
    ticks +
    labels +
    (opts.symbol ? labelText(cx, y + h * 0.69, opts.symbol, opts.symbolSize || 10.5, C.stroke, 'middle', true) : '') +
    `<line x1="${r(cx)}" y1="${r(cy)}" x2="${r(nx)}" y2="${r(ny)}" stroke="${C.red}" stroke-width="2.0" stroke-linecap="round"/>` +
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="4.5" fill="${C.inner}" stroke="${C.stroke}" stroke-width="1.3"/>` +
    `<circle cx="${r(cx)}" cy="${r(y + h - 3)}" r="3.2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.1"/>`
  );
}

function ventSlots(x, y, count, w = 24, dy = 5) {
  let out = '';
  for (let i = 0; i < count; i++) {
    out += `<line x1="${r(x)}" y1="${r(y + i * dy)}" x2="${r(x + w)}" y2="${r(y + i * dy)}" stroke="${C.tick}" stroke-width="1.4" stroke-linecap="round"/>`;
  }
  return out;
}

// ---------- Apparatus Registry Builder ----------

function makeRegistrar(options = {}) {
  const targetDir = options.targetDir || null;
  const entries = [];
  const seen = new Set();

  function register(rawId, name, category, opts = {}) {
    const slug = safeId(rawId);
    if (!slug) throw new Error('register(): empty id');
    if (seen.has(slug)) throw new Error(`Duplicate apparatus id: ${slug}`);
    seen.add(slug);

    const width = opts.width;
    const height = opts.height;
    if (!(width > 0 && height > 0)) {
      throw new Error(`Invalid dimensions for studio:${slug}: ${width}x${height}`);
    }

    const rawSvg = String(opts.svg || '');
    const fullSvg =
      rawSvg.trimStart().startsWith('<?xml') || rawSvg.trimStart().startsWith('<svg')
        ? validateSvg(stripGradientsAndUrls(rawSvg), slug)
        : wrapSvg(slug, name, width, height, rawSvg);

    const fileName = `${slug}.svg`;
    if (targetDir) {
      fs.writeFileSync(path.join(targetDir, fileName), fullSvg, 'utf8');
    }

    const sha256 = crypto.createHash('sha256').update(fullSvg).digest('hex');
    const entry = {
      id: `studio:${slug}`,
      name,
      category,
      search: opts.search || slug.replaceAll('-', ' '),
      svg: fileName,
      sha256,
      width,
      height,
      ports: opts.ports || [],
      boreCount: opts.boreCount ?? -1,
      neckCount: opts.neckCount ?? 0,
    };

    if (Array.isArray(opts.variants) && opts.variants.length > 0) {
      const baseVariant = {
        svg: entry.svg,
        sha256: entry.sha256,
        width: entry.width,
        height: entry.height,
        ports: entry.ports,
        boreCount: entry.boreCount,
        neckCount: entry.neckCount,
      };
      const builtVariants = [];
      const hasPrimary = opts.variants.some(
        (v) => v.neckCount === entry.neckCount || v.svg === entry.svg
      );
      if (!hasPrimary) builtVariants.push(baseVariant);

      for (const v of opts.variants) {
        if (v.neckCount === entry.neckCount && !v.svg) continue;
        const vw = v.width ?? width;
        const vh = v.height ?? height;
        const vFile =
          v.file ||
          v.svgFile ||
          (v.neckCount && v.neckCount !== entry.neckCount
            ? `${slug}-necks-${v.neckCount}.svg`
            : `${slug}.svg`);
        const vSlug = vFile.replace(/\.svg$/i, '');
        const vRaw = String(v.svg || '');
        const vFull =
          vRaw.trimStart().startsWith('<?xml') || vRaw.trimStart().startsWith('<svg')
            ? validateSvg(stripGradientsAndUrls(vRaw), vSlug)
            : wrapSvg(slug, name, vw, vh, vRaw);
        if (targetDir) {
          fs.writeFileSync(path.join(targetDir, vFile), vFull, 'utf8');
        }
        builtVariants.push({
          svg: vFile,
          sha256: crypto.createHash('sha256').update(vFull).digest('hex'),
          width: vw,
          height: vh,
          ports: v.ports || entry.ports,
          boreCount: v.boreCount ?? entry.boreCount,
          neckCount: v.neckCount ?? entry.neckCount,
        });
      }
      entry.variants = builtVariants;
    }

    entries.push(entry);
    return entry;
  }

  return { register, entries };
}

module.exports = {
  C,
  PALETTE: C,
  SW,
  glassSw: SW.glassSw,
  FONT,
  MONO,
  URL_SUFFIX_FILLS,
  resolveFlatPaint,
  stripGradientsAndUrls,
  r,
  fmt,
  rad,
  esc,
  safeId,
  defsFor,
  glassDefs,
  equipDefs,
  miscDefs,
  svgDefs,
  validateSvg,
  wrapSvg,
  hatchedTrapezoid,
  frostedJoint,
  smoothJoint,
  verticalFemaleJoint,
  verticalMaleJoint,
  angledMaleJoint,
  angledFemaleJoint,
  rolledLip,
  glassHighlight,
  gradTicks,
  barb,
  oliveBarb,
  verticalOliveBarb,
  drawStopcock,
  labFeet,
  chassis,
  oledScreen,
  screenText,
  labelText,
  rotaryKnob,
  softButton,
  bindingPost,
  bncJack,
  analogMeter,
  ventSlots,
  makeRegistrar,
};
