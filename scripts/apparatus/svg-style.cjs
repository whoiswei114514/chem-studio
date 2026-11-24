'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Chemix Neutral Charcoal & Stepped-Collar House Style Tokens (Qt6 QSvgRenderer safe).
// Zero <linearGradient>, <radialGradient>, <filter>, <clipPath>, <mask>, <pattern>, <image>, or <script>.
const C = {
  // Neutral charcoal linework & glass accents
  stroke: '#333333',       // Primary bold charcoal walls
  ink: '#333333',          // Alias matching C.stroke
  inner: '#4A4F55',        // Secondary internal tubes, coils, bezels
  tick: '#B8BCC2',         // Crisp subtle graduation ticks
  muted: '#8C929A',        // Secondary borders, guide marks
  glassBack: '#B8BCC2',    // Rear occluded glass contour (e.g. behind 4th RBF neck)
  jointArc: '#DCE8EC',     // Subtle pale-ice curved inner glass joint arc
  lightGrid: '#D2D6DC',    // Light scale/reticle grid lines
  frostStroke: '#8C929A',  // Legacy subtle marking alias
  frostFill: '#E5E7EB',    // Legacy brushed-metal sleeve alias

  // Stroke weight tokens
  glassSw: 4.0,            // Bold uniform glass vessel contour weight
  outerSw: 2.8,            // Standard outer equipment/joint contour weight
  innerSw: 1.8,            // Internal fittings & subtle outlines

  // Flat glass, water & ice palette (zero gradients)
  glass: '#EEF4F7',
  glassTop: '#FFFFFF',
  glassMid: '#F5F7F9',
  glassBot: '#EEF4F7',
  glassEdge: '#DCE8EC',
  coolant: '#DCF0F7',
  coolantLight: '#E8F7FC',
  coolantMid: '#DCF0F7',
  coolantDeep: '#DCF0F7',
  liquid: '#DCF0F7',
  liquidLine: '#7ECAE6',
  iceFill: '#E8F7FC',
  iceEdge: '#A8DDF0',
  specular: '#FFFFFF',

  // Light brushed-silver instrument housings & dark bezels
  chassisTop: '#F3F4F6',
  chassisMid: '#E5E7EB',
  chassisBot: '#C8CDD3',
  metalDark: '#7C828A',
  darkPanel: '#3A3E44',
  bezel: '#3A3E44',
  bezelDark: '#333333',

  // Chemix LCD screens & oscilloscope traces
  lcdBg: '#E6EEF2',
  lcdPale: '#E6EEF2',
  lcdGreenBg: '#E7F0EA',
  lcdGreen: '#CBE590',
  lcdCyan: '#CBEAF6',
  lcdText: '#22252A',
  lcdBlue: '#87D1E6',
  traceBlue: '#2D6DA3',
  traceAmber: '#C88A1E',
  traceRed: '#D13834',
  lcdAmber: '#C88A1E',

  // Realistic porcelain, sand, cork, elastomer & accents
  porcelainTop: '#F7F8FA',
  porcelainMid: '#EFEFEF',
  porcelainBot: '#DFDFDC',
  ceramic: '#D0B498',
  sandLight: '#E5D08F',
  sandDark: '#C8AE63',
  ptfe: '#F5F6F8',
  steelBlue: '#3E74B4',
  teal: '#3E74B4',         // Neutral steel-blue realistic accent (replaces repetitive teal)
  tealDark: '#2E5A8F',
  tealLight: '#DCF0F7',
  tealSoft: '#E6EEF2',
  crimson: '#B8292F',
  red: '#B8292F',
  subaRed: '#D9463E',
  amber: '#E4A838',
  rubberTop: '#7C828A',
  rubberMid: '#595E66',
  rubberDark: '#3A3E44',
  cork: '#C98A54',
  corkLight: '#E4B879',
  corkMid: '#C98A54',
  corkDark: '#9E6A2E',
  amberDark: '#9A6B1C',
  amberMid: '#E4A838',
  amberLight: '#F0C76B',
  brassDark: '#9A6B1C',
  brass: '#E4A838',
  brassLight: '#F3D693',
  copper: '#D48242',
  warm: '#D48242',
  blue: '#3E74B4',
  leaf: '#5F9A6E',
  leafSoft: '#C5DEC9',
  flameBlue: '#72C2DD',
  flameCore: '#D8EDF5',
  flameTip: '#E4A838',
};

const SW = {
  glassSw: C.glassSw,
  outerSw: C.outerSw,
  innerSw: C.innerSw,
  outer: C.outerSw,
  inner: C.innerSw,
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
  glass: '#FFFFFF',
  'glass-v': '#FFFFFF',
  coolant: '#DCF0F7',
  frost: '#FFFFFF',
  liquid: '#DCF0F7',
  metal: '#C8CDD3',
  'metal-v': '#C8CDD3',
  chassis: '#E5E7EB',
  porcelain: '#EFEFEF',
  rubber: '#595E66',
  cork: '#C98A54',
  accent: '#3E74B4',
  amber: '#F0C76B',
  brass: '#E4A838',
  copper: '#D48242',
  screen: '#E6EEF2',
  red: '#B8292F',
};

function resolveFlatPaint(token) {
  const m = String(token).match(
    /^url\(#.+-(glass-v|glass|coolant|frost|liquid|metal-v|metal|chassis|porcelain|rubber|cork|accent|amber|brass|copper|screen|red)\)$/
  );
  if (m && URL_SUFFIX_FILLS[m[1]]) return URL_SUFFIX_FILLS[m[1]];
  return URL_SUFFIX_FILLS[token] || token;
}

function stripGradientsAndUrls(svg) {
  let out = String(svg)
    .replace(/<linearGradient\b[\s\S]*?<\/linearGradient>/gi, '')
    .replace(/<radialGradient\b[\s\S]*?<\/radialGradient>/gi, '')
    .replace(/<defs>\s*<\/defs>\s*/gi, '');
  out = out.replace(/url\(#([^)]+)\)/g, (full, ref) => {
    const suffixMatch = ref.match(
      /-(glass-v|glass|coolant|frost|liquid|metal-v|metal|chassis|porcelain|rubber|cork|accent|amber|brass|copper|screen|red)$/
    );
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

const FORBIDDEN_SVG_RE =
  /<\s*(filter|clipPath|mask|pattern|image|script|linearGradient|radialGradient)\b/i;

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

// ---------- Glassware & Stepped-Collar Ground-Joint Primitives ----------

// Delicate pale-ice concave curved inner arc along a joint or neck chord (cx +/- span)
function jointArc(x1, y1, x2, y2, sag = 3.2, opts = {}) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  // Perpendicular direction (points "down/inward" along (x1->x2) rotated +90 deg = (-dy, dx))
  const nx = -dy / len;
  const ny = dx / len;
  const cx = mx + nx * sag;
  const cy = my + ny * sag;
  return `<path d="M${r(x1)} ${r(y1)} Q${r(cx)} ${r(cy)} ${r(x2)} ${r(y2)}" fill="none" stroke="${opts.color || C.jointArc}" stroke-width="${opts.sw ?? 2.2}" stroke-linecap="round"/>`;
}

// Open-ended tapered walls (or optional amber/mask polygon) with ZERO cross-hatches
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

  const stroke = opts.stroke || C.stroke;
  const sw = opts.sw ?? C.outerSw;
  if (opts.amber || opts.mask || (opts.fill && opts.fill !== 'none')) {
    const fill = opts.amber ? C.amberLight : opts.mask ? '#FFFFFF' : opts.fill;
    return `<polygon points="${p0L.join(',')} ${p0R.join(',')} ${p1R.join(',')} ${p1L.join(',')}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  return `<path d="M${p0L[0]} ${p0L[1]} L${p1L[0]} ${p1L[1]} M${p0R[0]} ${p0R[1]} L${p1R[0]} ${p1R[1]}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

// Subtle top rim highlight / flared glass lip (never blocks an open mouth unless filled explicitly)
function rolledLip(slug, cx, yTop, outerHalfW, opts = {}) {
  const sw = opts.sw ?? C.outerSw;
  if (opts.amber || (opts.fill && opts.fill !== 'none')) {
    const h = opts.height ?? 4.2;
    const rx = opts.rx ?? r(h / 2);
    const fill = opts.amber ? C.amberLight : opts.fill;
    return `<rect x="${r(cx - outerHalfW)}" y="${r(yTop)}" width="${r(outerHalfW * 2)}" height="${r(h)}" rx="${rx}" fill="${fill}" stroke="${opts.stroke || C.stroke}" stroke-width="${sw}"/>`;
  }
  const flare = opts.flare ?? 2.0;
  const drop = opts.drop ?? 3.5;
  return `<path d="M${r(cx - outerHalfW)} ${r(yTop)} Q${r(cx - outerHalfW + flare)} ${r(yTop + drop)} ${r(cx - outerHalfW + flare)} ${r(yTop + drop + 1)} M${r(cx + outerHalfW)} ${r(yTop)} Q${r(cx + outerHalfW - flare)} ${r(yTop + drop)} ${r(cx + outerHalfW - flare)} ${r(yTop + drop + 1)}" fill="none" stroke="${opts.stroke || C.stroke}" stroke-width="${sw}" stroke-linecap="round"/>`;
}

// Chemix stepped-shoulder open female joint (top open, stepped outward shoulder, #DCE8EC inner arc)
function verticalFemaleJoint(slug, cx, yTop, len = 22, hwTop = 12, hwBot = 9.5, opts = {}) {
  const sw = opts.sw ?? C.outerSw;
  const stroke = opts.stroke || C.stroke;
  const yBot = yTop + len;
  const stepOut = opts.step === false ? 0 : (opts.stepOut ?? 2.0);
  const hwShoulder = opts.hwShoulder ?? hwBot + stepOut;
  const fill = opts.amber ? C.amberLight : opts.mask ? '#FFFFFF' : opts.fill || 'none';

  const wallSvg =
    fill !== 'none'
      ? `<polygon points="${r(cx - hwTop)},${r(yTop)} ${r(cx + hwTop)},${r(yTop)} ${r(cx + hwBot)},${r(yBot)} ${r(cx - hwBot)},${r(yBot)}" fill="${fill}" stroke="none"/>\n  `
      : '';

  const paths =
    stepOut > 0
      ? `M${r(cx - hwTop)} ${r(yTop)} L${r(cx - hwBot)} ${r(yBot)} H${r(cx - hwShoulder)} M${r(cx + hwTop)} ${r(yTop)} L${r(cx + hwBot)} ${r(yBot)} H${r(cx + hwShoulder)}`
      : `M${r(cx - hwTop)} ${r(yTop)} L${r(cx - hwBot)} ${r(yBot)} M${r(cx + hwTop)} ${r(yTop)} L${r(cx + hwBot)} ${r(yBot)}`;

  const arcSpan = Math.max(3, hwBot - 3.0);
  const arc =
    opts.noBaseRing || opts.noArc
      ? ''
      : `\n  ${jointArc(cx - arcSpan, yBot + 1.5, cx + arcSpan, yBot + 1.5, 2.8, { sw: Math.max(1.6, sw * 0.65) })}`;

  return `${wallSvg}<path d="${paths}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>${arc}`;
}

// Chemix stepped-shoulder open male joint (stepped outward shoulder at top, tapered open walls, #DCE8EC arc)
function verticalMaleJoint(slug, cx, yTop, len = 22, hwTop = 12, hwBot = 9, opts = {}) {
  const sw = opts.sw ?? C.outerSw;
  const stroke = opts.stroke || C.stroke;
  const yBot = yTop + len;
  const stepIn = opts.collar === false ? 0 : (opts.stepIn ?? 2.0);
  const hwNeck = opts.hwShoulder ?? Math.max(4, hwTop - stepIn);
  const fill = opts.amber ? C.amberLight : opts.mask ? '#FFFFFF' : opts.fill || 'none';

  const wallSvg =
    fill !== 'none'
      ? `<polygon points="${r(cx - hwTop)},${r(yTop)} ${r(cx + hwTop)},${r(yTop)} ${r(cx + hwBot)},${r(yBot)} ${r(cx - hwBot)},${r(yBot)}" fill="${fill}" stroke="none"/>\n  `
      : '';

  const paths =
    stepIn > 0
      ? `M${r(cx - hwNeck)} ${r(yTop)} H${r(cx - hwTop)} L${r(cx - hwBot)} ${r(yBot)} M${r(cx + hwNeck)} ${r(yTop)} H${r(cx + hwTop)} L${r(cx + hwBot)} ${r(yBot)}`
      : `M${r(cx - hwTop)} ${r(yTop)} L${r(cx - hwBot)} ${r(yBot)} M${r(cx + hwTop)} ${r(yTop)} L${r(cx + hwBot)} ${r(yBot)}`;

  const arcSpan = Math.max(3, hwTop - 3.5);
  const arc = opts.noArc
    ? ''
    : `\n  ${jointArc(cx - arcSpan, yTop + 3.0, cx + arcSpan, yTop + 3.0, 2.8, { sw: Math.max(1.6, sw * 0.65) })}`;

  let drip = '';
  if (opts.dripTip) {
    drip = `\n  <path d="M${r(cx - 4.5)} ${r(yBot)} L${r(cx - 3.5)} ${r(yBot + 7)} M${r(cx + 4.5)} ${r(yBot)} L${r(cx + 3.5)} ${r(yBot + 4)}" fill="none" stroke="${stroke}" stroke-width="${Math.max(1.8, sw * 0.8)}" stroke-linecap="round"/>`;
  }
  return `${wallSvg}<path d="${paths}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>${arc}${drip}`;
}

function angledMaleJoint(slug, sx, sy, ux, uy, len = 22, hwTop = 12, hwBot = 9, opts = {}) {
  const sw = opts.sw ?? C.outerSw;
  const stroke = opts.stroke || C.stroke;
  const ex = sx + ux * len;
  const ey = sy + uy * len;
  const tx = -uy;
  const ty = ux;
  const stepIn = opts.collar === false ? 0 : (opts.stepIn ?? 2.0);
  const hwNeck = opts.hwShoulder ?? Math.max(4, hwTop - stepIn);
  const pt = (along, w) => [r(sx + ux * along + tx * w), r(sy + uy * along + ty * w)];

  const nL = pt(0, -hwNeck);
  const nR = pt(0, hwNeck);
  const tL = pt(0, -hwTop);
  const tR = pt(0, hwTop);
  const bL = pt(len, -hwBot);
  const bR = pt(len, hwBot);

  const paths =
    stepIn > 0
      ? `M${nL[0]} ${nL[1]} L${tL[0]} ${tL[1]} L${bL[0]} ${bL[1]} M${nR[0]} ${nR[1]} L${tR[0]} ${tR[1]} L${bR[0]} ${bR[1]}`
      : `M${tL[0]} ${tL[1]} L${bL[0]} ${bL[1]} M${tR[0]} ${tR[1]} L${bR[0]} ${bR[1]}`;

  const arcSpan = Math.max(3, hwTop - 3.5);
  const aL = pt(3.0, -arcSpan);
  const aR = pt(3.0, arcSpan);
  const arc = opts.noArc
    ? ''
    : `\n  ${jointArc(aL[0], aL[1], aR[0], aR[1], -2.8, { sw: Math.max(1.6, sw * 0.65) })}`;

  const fill = opts.amber ? C.amberLight : opts.mask ? '#FFFFFF' : opts.fill || 'none';
  const fillPoly =
    fill !== 'none'
      ? `<polygon points="${tL.join(',')} ${tR.join(',')} ${bR.join(',')} ${bL.join(',')}" fill="${fill}" stroke="none"/>\n  `
      : '';

  return {
    svg: `${fillPoly}<path d="${paths}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>${arc}`,
    tip: [r(ex), r(ey)],
    edge: [r(ex - tx * hwBot), r(ey - ty * hwBot), r(ex + tx * hwBot), r(ey + ty * hwBot)],
    diameter: r(hwBot * 2),
  };
}

function angledFemaleJoint(slug, lx, ly, ox, oy, len = 22, hwTop = 12, hwBot = 9.5, opts = {}) {
  const sw = opts.sw ?? C.outerSw;
  const stroke = opts.stroke || C.stroke;
  const ux = -ox;
  const uy = -oy;
  const tx = -uy;
  const ty = ux;
  const ex = lx + ux * len;
  const ey = ly + uy * len;
  const stepOut = opts.step === false ? 0 : (opts.stepOut ?? 2.0);
  const hwShoulder = opts.hwShoulder ?? hwBot + stepOut;
  const pt = (along, w) => [r(lx + ux * along + tx * w), r(ly + uy * along + ty * w)];

  const tL = pt(0, -hwTop);
  const tR = pt(0, hwTop);
  const bL = pt(len, -hwBot);
  const bR = pt(len, hwBot);
  const sL = pt(len, -hwShoulder);
  const sR = pt(len, hwShoulder);

  const paths =
    stepOut > 0
      ? `M${tL[0]} ${tL[1]} L${bL[0]} ${bL[1]} L${sL[0]} ${sL[1]} M${tR[0]} ${tR[1]} L${bR[0]} ${bR[1]} L${sR[0]} ${sR[1]}`
      : `M${tL[0]} ${tL[1]} L${bL[0]} ${bL[1]} M${tR[0]} ${tR[1]} L${bR[0]} ${bR[1]}`;

  const arcSpan = Math.max(3, hwBot - 3.0);
  const aL = pt(len + 1.5, -arcSpan);
  const aR = pt(len + 1.5, arcSpan);
  const arc = opts.noArc
    ? ''
    : `\n  ${jointArc(aL[0], aL[1], aR[0], aR[1], -2.8, { sw: Math.max(1.6, sw * 0.65) })}`;

  const fill = opts.amber ? C.amberLight : opts.mask ? '#FFFFFF' : opts.fill || 'none';
  const fillPoly =
    fill !== 'none'
      ? `<polygon points="${tL.join(',')} ${tR.join(',')} ${bR.join(',')} ${bL.join(',')}" fill="${fill}" stroke="none"/>\n  `
      : '';

  return {
    svg: `${fillPoly}<path d="${paths}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>${arc}`,
    lip: [r(lx), r(ly)],
    edge: [r(lx - tx * hwTop), r(ly - ty * hwTop), r(lx + tx * hwTop), r(ly + ty * hwTop)],
    diameter: r(hwTop * 2),
    innerEnd: [r(ex), r(ey)],
  };
}

// Clean stepped ground-glass joint helper (zero diagonal hatching)
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

// Subtle graduation tick marks along a column/vessel wall
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
      `<line x1="${r(xAnchor)}" y1="${r(y)}" x2="${r(xAnchor + dir * len)}" y2="${r(y)}" stroke="${opts.color || C.tick}" stroke-width="${major ? 1.4 : 1.0}" stroke-linecap="round"/>`
    );
  }
  return `<g>${lines.join('')}</g>`;
}

// Olive hose barb along arbitrary direction (dx, dy)
function barb(slug, wallX, wallY, dx, dy, barbLen = 16, rBase = 5.0, rTip = 4.2, opts = {}) {
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
    svg: `<path d="${d}" fill="${opts.fill || C.glassTop}" stroke="${C.stroke}" stroke-width="${opts.sw ?? 2.4}" stroke-linecap="round" stroke-linejoin="round"/>`,
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

function oliveBarb(slug, wallX, cy, dirX, barbLen = 16, rBase = 5, rTip = 4.2, opts = {}) {
  return barb(slug, wallX, cy, dirX, 0, barbLen, rBase, rTip, opts);
}

function verticalOliveBarb(slug, cx, wallY, dirY, barbLen = 16, rBase = 5, rTip = 4.2, opts = {}) {
  return barb(slug, cx, wallY, 0, dirY, barbLen, rBase, rTip, opts);
}

// PTFE or glass stopcock valve across vertical tube at (cx, cy)
function drawStopcock(slug, cx, cy, opts = {}) {
  const w = opts.w || 22;
  const h = opts.h || 9;
  const handleColor = opts.teal ? C.steelBlue : C.crimson;
  const plugColor = opts.glass ? C.glassTop : C.ptfe;
  return `<g>
    <path d="M${r(cx - w / 2)} ${r(cy - h / 2)} L${r(cx + w / 2)} ${r(cy - h / 2 + 1.2)} L${r(cx + w / 2)} ${r(cy + h / 2 - 1.2)} L${r(cx - w / 2)} ${r(cy + h / 2)} Z" fill="${plugColor}" stroke="${C.stroke}" stroke-width="2.0" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="${r(cx - w / 2 - 7)}" y="${r(cy - 6.5)}" width="7" height="13" rx="2" fill="${handleColor}" stroke="${C.stroke}" stroke-width="1.8"/>
    <rect x="${r(cx + w / 2)}" y="${r(cy - 3.5)}" width="5" height="7" rx="1.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.6"/>
    <line x1="${r(cx - 2.5)}" y1="${r(cy - 2.5)}" x2="${r(cx + 2.5)}" y2="${r(cy + 2.5)}" stroke="${C.inner}" stroke-width="1.3" stroke-linecap="round"/>
  </g>`;
}

// ---------- Neutral Aluminum Benchtop Instrument & Electrical Primitives ----------

function labFeet(x, y, w, footW = 18, footH = 7, inset = 14) {
  return (
    `<rect x="${r(x + inset)}" y="${r(y)}" width="${footW}" height="${footH}" rx="2" fill="${C.metalDark}" stroke="${C.stroke}" stroke-width="2.0"/>` +
    `<rect x="${r(x + w - inset - footW)}" y="${r(y)}" width="${footW}" height="${footH}" rx="2" fill="${C.metalDark}" stroke="${C.stroke}" stroke-width="2.0"/>`
  );
}

// Sleek neutral brushed-aluminum instrument housing (zero repetitive teal roof stripe)
function chassis(slug, x, y, w, h, opts = {}) {
  const rx = opts.rx ?? 6;
  const sw = opts.sw ?? C.outerSw;
  const feet =
    opts.feet !== false
      ? labFeet(x, y + h, w, opts.footW ?? 20, opts.footH ?? 6, opts.footInset ?? 16)
      : '';
  const accent =
    opts.accentBar === true
      ? `<rect x="${r(x + 2)}" y="${r(y + 2)}" width="${r(w - 4)}" height="5" rx="2" fill="${opts.accentColor || C.chassisBot}" stroke="none"/>`
      : '';
  const topHighlight = `<line x1="${r(x + rx + 2)}" y1="${r(y + 3)}" x2="${r(x + w - rx - 2)}" y2="${r(y + 3)}" stroke="${C.chassisTop}" stroke-width="1.6" stroke-linecap="round"/>`;
  const innerLine = `<rect x="${r(x + 6)}" y="${r(y + 7)}" width="${r(w - 12)}" height="${r(h - 13)}" rx="${Math.max(2, rx - 3)}" fill="none" stroke="${C.chassisBot}" stroke-width="1.1"/>`;
  return (
    feet +
    `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="${rx}" fill="${opts.fill ? resolveFlatPaint(opts.fill) : C.chassisMid}" stroke="${C.stroke}" stroke-width="${sw}" stroke-linejoin="round"/>` +
    topHighlight +
    accent +
    innerLine
  );
}

function oledScreen(slug, x, y, w, h, innerSvg = '', opts = {}) {
  const rx = opts.rx ?? 3.5;
  const bg = opts.green ? C.lcdGreenBg : opts.fill || C.lcdBg;
  return (
    `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="${rx + 1.5}" fill="${opts.bezel || C.darkPanel}" stroke="${C.stroke}" stroke-width="2.0"/>` +
    `<rect x="${r(x + 3.5)}" y="${r(y + 3.5)}" width="${r(w - 7)}" height="${r(h - 7)}" rx="${rx}" fill="${bg}" stroke="${C.stroke}" stroke-width="1.2"/>` +
    innerSvg
  );
}

function screenText(x, y, txt, size = 11, color = C.lcdText, anchor = 'middle', bold = true) {
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
      ticks += `<line x1="${r(cx + Math.cos(ta) * r1)}" y1="${r(cy + Math.sin(ta) * r1)}" x2="${r(cx + Math.cos(ta) * r2)}" y2="${r(cy + Math.sin(ta) * r2)}" stroke="${C.muted}" stroke-width="1.2" stroke-linecap="round"/>`;
    }
  }
  const innerFill = opts.teal ? C.steelBlue : opts.dark ? C.darkPanel : C.chassisBot;
  const tickColor = opts.teal || opts.dark ? '#FFFFFF' : C.stroke;
  return (
    ticks +
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(radius)}" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.0"/>` +
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(radius * 0.76)}" fill="${innerFill}" stroke="${C.inner}" stroke-width="1.3"/>` +
    `<line x1="${r(cx)}" y1="${r(cy)}" x2="${r(px)}" y2="${r(py)}" stroke="${tickColor}" stroke-width="2.0" stroke-linecap="round"/>` +
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="1.6" fill="${tickColor}" stroke="none"/>`
  );
}

function softButton(x, y, w, h, label = '', fill = C.chassisTop, textColor = C.stroke) {
  return (
    `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="2.5" fill="${fill}" stroke="${C.stroke}" stroke-width="1.6"/>` +
    (label ? labelText(x + w / 2, y + h / 2 + 2.6, label, 6.8, textColor, 'middle', true) : '')
  );
}

function bindingPost(cx, cy, color = C.crimson, label = '', labelDy = -13, radius = 7.5) {
  return (
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="${radius}" fill="${color}" stroke="${C.stroke}" stroke-width="2.0"/>` +
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(radius * 0.5)}" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="1.1"/>` +
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(radius * 0.26)}" fill="${C.stroke}" stroke="none"/>` +
    (label ? labelText(cx, cy + labelDy, label, 8, C.inner, 'middle', true) : '')
  );
}

function bncJack(cx, cy, label = '', ringColor = C.chassisBot, labelDy = -13) {
  return (
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="8.5" fill="${ringColor}" stroke="${C.stroke}" stroke-width="2.0"/>` +
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="5.6" fill="${C.chassisMid}" stroke="${C.inner}" stroke-width="1.1"/>` +
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="3.4" fill="${C.chassisTop}" stroke="${C.inner}" stroke-width="1.0"/>` +
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="1.6" fill="${C.amber}" stroke="none"/>` +
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
    ticks += `<line x1="${r(tx1)}" y1="${r(ty1)}" x2="${r(tx2)}" y2="${r(ty2)}" stroke="${C.stroke}" stroke-width="${major ? 1.5 : 1.0}" stroke-linecap="round"/>`;
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
    `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="2.2"/>` +
    `<rect x="${r(x + 4)}" y="${r(y + 4)}" width="${r(w - 8)}" height="${r(h - 8)}" rx="3" fill="${C.chassisTop}" stroke="${C.inner}" stroke-width="1.2"/>` +
    `<path d="M${r(mx1)} ${r(my1)} A${r(radLen * 0.84)} ${r(radLen * 0.84)} 0 0 1 ${r(mx2)} ${r(my2)}" fill="none" stroke="${C.lightGrid}" stroke-width="2.2" stroke-linecap="round"/>` +
    `<path d="M${r(ax1)} ${r(ay1)} A${r(radLen)} ${r(radLen)} 0 0 1 ${r(ax2)} ${r(ay2)}" fill="none" stroke="${C.stroke}" stroke-width="1.6" stroke-linecap="round"/>` +
    ticks +
    labels +
    (opts.symbol ? labelText(cx, y + h * 0.69, opts.symbol, opts.symbolSize || 10.5, C.stroke, 'middle', true) : '') +
    `<line x1="${r(cx)}" y1="${r(cy)}" x2="${r(nx)}" y2="${r(ny)}" stroke="${C.crimson}" stroke-width="2.0" stroke-linecap="round"/>` +
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="4.5" fill="${C.inner}" stroke="${C.stroke}" stroke-width="1.4"/>` +
    `<circle cx="${r(cx)}" cy="${r(y + h - 3)}" r="3.2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.2"/>`
  );
}

function ventSlots(x, y, count, w = 24, dy = 5) {
  let out = '';
  for (let i = 0; i < count; i++) {
    out += `<line x1="${r(x)}" y1="${r(y + i * dy)}" x2="${r(x + w)}" y2="${r(y + i * dy)}" stroke="${C.muted}" stroke-width="1.5" stroke-linecap="round"/>`;
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
  glassSw: C.glassSw,
  outerSw: C.outerSw,
  innerSw: C.innerSw,
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
  jointArc,
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
