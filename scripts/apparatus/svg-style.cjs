'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Unified Publication-Grade Design Tokens (Qt6 QSvgRenderer / SVG 1.1 Tiny safe)
// Zero <filter>, <clipPath>, <mask>, <pattern>, <image>, or <script> tags allowed.
const C = {
  // Primary line work & typography
  stroke: '#1F2937',       // Primary outer walls (stroke-width 2.0-2.2)
  inner: '#334155',        // Internal glass tubes, coils, hardware (stroke-width 1.4-1.6)
  tick: '#475569',         // Graduations, subtle scale marks (stroke-width 0.9-1.25)
  muted: '#64748B',        // Secondary borders, frosted cross-hatch
  frostStroke: '#64748B',
  frostFill: '#CBD5E1',

  // Translucent borosilicate glass & coolant
  glassTop: '#E2F1F7',
  glassMid: '#F7FBFD',
  glassBot: '#CFE4EE',
  glassEdge: '#D7E9F3',
  coolantLight: '#CCFBF1',
  coolantMid: '#E0F2FE',
  coolantDeep: '#BAE6FD',
  specular: '#FFFFFF',

  // Brand teal & instrumentation chassis
  tealDark: '#0F766E',
  teal: '#14B8A6',
  tealLight: '#99F6E4',
  tealSoft: '#CCFBF1',
  chassisTop: '#FFFFFF',
  chassisMid: '#F1F5F9',
  chassisBot: '#E2E8F0',
  bezel: '#334155',
  bezelDark: '#1E293B',

  // Screens & indicators
  lcdBg: '#0F172A',
  lcdGreen: '#34D399',
  lcdCyan: '#38BDF8',
  lcdAmber: '#FBBF24',

  // Materials
  porcelainTop: '#FFFFFF',
  porcelainMid: '#F4F3EE',
  porcelainBot: '#DFDDD4',
  ptfe: '#F8FAFC',
  rubberTop: '#64748B',
  rubberMid: '#334155',
  rubberDark: '#1E293B',
  corkLight: '#E7B98A',
  corkMid: '#C98A4B',
  corkDark: '#9A5E26',
  amberDark: '#78350F',
  amberMid: '#B45309',
  amberLight: '#D97706',
  brassDark: '#92400E',
  brass: '#D97706',
  brassLight: '#FDE68A',
  copper: '#EA580C',
  red: '#DC2626',
  blue: '#2563EB',
  leaf: '#16A34A',
  leafSoft: '#86EFAC',
  flameBlue: '#38BDF8',
  flameCore: '#BAE6FD',
  flameTip: '#F59E0B',
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

function defsFor(slug, extraDefs = '') {
  const p = safeId(slug);
  return `<defs>
  <linearGradient id="${p}-glass" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#E2F1F7" stop-opacity="0.74"/>
    <stop offset="22%" stop-color="#FFFFFF" stop-opacity="0.88"/>
    <stop offset="55%" stop-color="#F7FBFD" stop-opacity="0.56"/>
    <stop offset="88%" stop-color="#CFE4EE" stop-opacity="0.70"/>
    <stop offset="100%" stop-color="#DCECF4" stop-opacity="0.80"/>
  </linearGradient>
  <linearGradient id="${p}-glass-v" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#F7FBFD" stop-opacity="0.82"/>
    <stop offset="55%" stop-color="#E2F1F7" stop-opacity="0.64"/>
    <stop offset="100%" stop-color="#CFE4EE" stop-opacity="0.78"/>
  </linearGradient>
  <linearGradient id="${p}-coolant" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#CCFBF1" stop-opacity="0.40"/>
    <stop offset="50%" stop-color="#E0F2FE" stop-opacity="0.28"/>
    <stop offset="100%" stop-color="#BAE6FD" stop-opacity="0.46"/>
  </linearGradient>
  <linearGradient id="${p}-frost" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#CBD5E1" stop-opacity="0.74"/>
    <stop offset="32%" stop-color="#F1F5F9" stop-opacity="0.84"/>
    <stop offset="72%" stop-color="#CBD5E1" stop-opacity="0.74"/>
    <stop offset="100%" stop-color="#94A3B8" stop-opacity="0.80"/>
  </linearGradient>
  <linearGradient id="${p}-metal" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#94A3B8"/>
    <stop offset="28%" stop-color="#F8FAFC"/>
    <stop offset="68%" stop-color="#E2E8F0"/>
    <stop offset="100%" stop-color="#94A3B8"/>
  </linearGradient>
  <linearGradient id="${p}-metal-v" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#E2E8F0"/>
    <stop offset="45%" stop-color="#F8FAFC"/>
    <stop offset="100%" stop-color="#94A3B8"/>
  </linearGradient>
  <linearGradient id="${p}-chassis" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#FFFFFF"/>
    <stop offset="55%" stop-color="#F1F5F9"/>
    <stop offset="100%" stop-color="#E2E8F0"/>
  </linearGradient>
  <linearGradient id="${p}-porcelain" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#ECEBE4"/>
    <stop offset="28%" stop-color="#FFFFFF"/>
    <stop offset="68%" stop-color="#F4F3EE"/>
    <stop offset="100%" stop-color="#DFDDD4"/>
  </linearGradient>
  <linearGradient id="${p}-rubber" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#475569"/>
    <stop offset="28%" stop-color="#64748B"/>
    <stop offset="72%" stop-color="#334155"/>
    <stop offset="100%" stop-color="#1E293B"/>
  </linearGradient>
  <linearGradient id="${p}-cork" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#C98A4B"/>
    <stop offset="30%" stop-color="#E7B98A"/>
    <stop offset="72%" stop-color="#B9783A"/>
    <stop offset="100%" stop-color="#9A5E26"/>
  </linearGradient>
  <linearGradient id="${p}-accent" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#14B8A6"/>
    <stop offset="100%" stop-color="#0F766E"/>
  </linearGradient>
  <linearGradient id="${p}-amber" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#78350F" stop-opacity="0.90"/>
    <stop offset="24%" stop-color="#D97706" stop-opacity="0.80"/>
    <stop offset="58%" stop-color="#B45309" stop-opacity="0.86"/>
    <stop offset="100%" stop-color="#78350F" stop-opacity="0.92"/>
  </linearGradient>
  <linearGradient id="${p}-brass" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#B45309"/>
    <stop offset="30%" stop-color="#FDE68A"/>
    <stop offset="68%" stop-color="#D97706"/>
    <stop offset="100%" stop-color="#92400E"/>
  </linearGradient>
  <linearGradient id="${p}-copper" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#9A3412"/>
    <stop offset="35%" stop-color="#FDBA74"/>
    <stop offset="70%" stop-color="#EA580C"/>
    <stop offset="100%" stop-color="#7C2D12"/>
  </linearGradient>
  <linearGradient id="${p}-screen" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#0F172A"/>
    <stop offset="100%" stop-color="#1E293B"/>
  </linearGradient>
  <linearGradient id="${p}-liquid" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#99F6E4" stop-opacity="0.56"/>
    <stop offset="100%" stop-color="#14B8A6" stop-opacity="0.40"/>
  </linearGradient>${extraDefs ? '\n  ' + extraDefs.trim() : ''}
</defs>`;
}

const FORBIDDEN_SVG_RE = /<\s*(filter|clipPath|mask|pattern|image|script)\b/i;

function validateSvg(svg, slug = '') {
  if (typeof svg !== 'string' || !svg.includes('<svg') || !svg.includes('</svg>')) {
    throw new Error(`Invalid SVG markup for ${slug || '<unnamed>'}`);
  }
  const m = svg.match(FORBIDDEN_SVG_RE);
  if (m) {
    throw new Error(`Forbidden Qt-unsafe SVG tag <${m[1]}> in ${slug || '<unnamed>'}`);
  }
  return svg;
}

function wrapSvg(slug, title, w, h, body, opts = {}) {
  const p = safeId(slug);
  const svg =
    `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${r(w)}" height="${r(h)}" viewBox="0 0 ${r(w)} ${r(h)}">\n` +
    `<title>${esc(title || p)}</title>\n` +
    `${defsFor(p, opts.extraDefs || '')}\n` +
    `${body}\n` +
    `</svg>\n`;
  return validateSvg(svg, p);
}

// ---------- Glassware & Ground-Joint Primitives ----------

function hatchedTrapezoid(slug, sx, sy, ex, ey, hw0, hw1, opts = {}) {
  const p = safeId(slug);
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

  const lines = [];
  const step = opts.step || 4.2;
  for (let s = 2; s < len - 1.5; s += step) {
    const t0 = s / len;
    const s2 = Math.min(len - 1.2, s + 5.5);
    const t1 = s2 / len;
    const wA = hw0 + (hw1 - hw0) * t0 - 1.4;
    const wB = hw0 + (hw1 - hw0) * t1 - 1.4;
    if (wA > 1 && wB > 1) {
      const a1 = pt(s, -wA);
      const b1 = pt(s2, wB);
      lines.push(`<line x1="${a1[0]}" y1="${a1[1]}" x2="${b1[0]}" y2="${b1[1]}"/>`);
      const a2 = pt(s, wA);
      const b2 = pt(s2, -wB);
      lines.push(`<line x1="${a2[0]}" y1="${a2[1]}" x2="${b2[0]}" y2="${b2[1]}"/>`);
    }
  }
  const fill = opts.amber ? `url(#${p}-amber)` : `url(#${p}-frost)`;
  const stroke = opts.stroke || C.stroke;
  const sw = opts.sw || 2.0;
  const hatchColor = opts.amber ? '#FEF3C7' : C.frostStroke;
  const hatchOpacity = opts.amber ? '0.45' : '0.62';
  return `<polygon points="${p0L.join(',')} ${p0R.join(',')} ${p1R.join(',')} ${p1L.join(',')}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>
  <g stroke="${hatchColor}" stroke-width="0.9" stroke-opacity="${hatchOpacity}" stroke-linecap="round">${lines.join('')}</g>`;
}

function rolledLip(slug, cx, yTop, outerHalfW, opts = {}) {
  const p = safeId(slug);
  const h = opts.height ?? 4.2;
  const rx = opts.rx ?? r(h / 2);
  const fill = opts.amber ? `url(#${p}-amber)` : opts.fill || `url(#${p}-glass)`;
  return `<rect x="${r(cx - outerHalfW)}" y="${r(yTop)}" width="${r(outerHalfW * 2)}" height="${r(h)}" rx="${rx}" fill="${fill}" stroke="${opts.stroke || C.stroke}" stroke-width="${opts.sw || 2.0}"/>`;
}

function verticalFemaleJoint(slug, cx, yTop, len = 22, hwTop = 12, hwBot = 9.5, opts = {}) {
  const p = safeId(slug);
  const lipH = opts.lipH ?? 4.2;
  const rimExtra = opts.rimExtra ?? 3.2;
  const lip = rolledLip(p, cx, yTop, hwTop + rimExtra, { height: lipH, amber: opts.amber });
  const cone = hatchedTrapezoid(p, cx, yTop + lipH - 0.5, cx, yTop + len, hwTop, hwBot, {
    sw: 2.0,
    amber: opts.amber,
  });
  const ring = opts.noBaseRing
    ? ''
    : `<line x1="${r(cx - hwBot)}" y1="${r(yTop + len)}" x2="${r(cx + hwBot)}" y2="${r(yTop + len)}" stroke="${C.inner}" stroke-width="1.3"/>`;
  return `${cone}\n  ${lip}\n  ${ring}`;
}

function verticalMaleJoint(slug, cx, yTop, len = 22, hwTop = 12, hwBot = 9, opts = {}) {
  const p = safeId(slug);
  const cone = hatchedTrapezoid(p, cx, yTop, cx, yTop + len, hwTop, hwBot, {
    sw: 2.0,
    amber: opts.amber,
  });
  const collar =
    opts.collar === false
      ? ''
      : `<line x1="${r(cx - hwTop - 1.5)}" y1="${r(yTop)}" x2="${r(cx + hwTop + 1.5)}" y2="${r(yTop)}" stroke="${C.stroke}" stroke-width="2.0" stroke-linecap="round"/>`;
  let drip = '';
  if (opts.dripTip) {
    drip = `<path d="M${r(cx - 4.5)} ${r(yTop + len)} L${r(cx - 3.5)} ${r(yTop + len + 7)} L${r(cx + 3.5)} ${r(yTop + len + 4)} L${r(cx + 4.5)} ${r(yTop + len)} Z" fill="url(#${p}-glass)" stroke="${C.stroke}" stroke-width="1.8" stroke-linejoin="round"/>`;
  }
  return `${drip}\n  ${cone}\n  ${collar}`;
}

function angledMaleJoint(slug, sx, sy, ux, uy, len = 22, hwTop = 12, hwBot = 9, opts = {}) {
  const p = safeId(slug);
  const ex = sx + ux * len;
  const ey = sy + uy * len;
  const tx = -uy;
  const ty = ux;
  const cone = hatchedTrapezoid(p, sx, sy, ex, ey, hwTop, hwBot, { sw: 2.0, amber: opts.amber });
  const collar =
    opts.collar === false
      ? ''
      : `<line x1="${r(sx - tx * (hwTop + 1.5))}" y1="${r(sy - ty * (hwTop + 1.5))}" x2="${r(sx + tx * (hwTop + 1.5))}" y2="${r(sy + ty * (hwTop + 1.5))}" stroke="${C.stroke}" stroke-width="2.0" stroke-linecap="round"/>`;
  return {
    svg: `${cone}\n  ${collar}`,
    tip: [r(ex), r(ey)],
    edge: [r(ex - tx * hwBot), r(ey - ty * hwBot), r(ex + tx * hwBot), r(ey + ty * hwBot)],
    diameter: r(hwBot * 2),
  };
}

function angledFemaleJoint(slug, lx, ly, ox, oy, len = 22, hwTop = 12, hwBot = 9.5, opts = {}) {
  const p = safeId(slug);
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
  const cone = hatchedTrapezoid(p, sx, sy, ex, ey, hwTop, hwBot, { sw: 2.0, amber: opts.amber });
  const pt = (along, w) => [r(lx + ux * along + tx * w), r(ly + uy * along + ty * w)];
  const lp1 = pt(0, -(hwTop + rimExtra));
  const lp2 = pt(0, hwTop + rimExtra);
  const lp3 = pt(lipH, hwTop + rimExtra);
  const lp4 = pt(lipH, -(hwTop + rimExtra));
  const lip = `<polygon points="${lp1.join(',')} ${lp2.join(',')} ${lp3.join(',')} ${lp4.join(',')}" fill="url(#${p}-glass)" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>`;
  return {
    svg: `${cone}\n  ${lip}`,
    lip: [r(lx), r(ly)],
    edge: [r(lx - tx * hwTop), r(ly - ty * hwTop), r(lx + tx * hwTop), r(ly + ty * hwTop)],
    diameter: r(hwTop * 2),
    innerEnd: [r(ex), r(ey)],
  };
}

// Unified ground-glass joint helper:
// frostedJoint(slug, 'female' | 'male', cx, yTop, opts) -> SVG string (for vertical joints)
function frostedJoint(slug, kind, cx, yTop, opts = {}) {
  const len = opts.len ?? 22;
  const hwTop = opts.hwTop ?? (kind === 'female' ? 12 : 11.5);
  const hwBot = opts.hwBot ?? (kind === 'female' ? 9.5 : 8.8);
  return kind === 'male'
    ? verticalMaleJoint(slug, cx, yTop, len, hwTop, hwBot, opts)
    : verticalFemaleJoint(slug, cx, yTop, len, hwTop, hwBot, opts);
}

// Specular glass highlight:
// - glassHighlight("M22 60 ...", 3.2, 0.78) for curved vessel paths
// - glassHighlight(x1, y1, x2, y2, 3.0, 0.78) for straight wall highlights
function glassHighlight(pathOrX1, y1 = 3.0, x2 = 0.78, y2, width = 3.0, opacity = 0.78) {
  if (typeof pathOrX1 === 'string') {
    const w = typeof y1 === 'number' ? y1 : 3.0;
    const op = typeof x2 === 'number' ? x2 : 0.78;
    return `<path d="${pathOrX1}" fill="none" stroke="#FFFFFF" stroke-width="${w}" stroke-opacity="${op}" stroke-linecap="round"/>`;
  }
  return `<line x1="${r(pathOrX1)}" y1="${r(y1)}" x2="${r(x2)}" y2="${r(y2)}" stroke="#FFFFFF" stroke-width="${width}" stroke-opacity="${opacity}" stroke-linecap="round"/>`;
}

// Graduation tick marks along a column/vessel wall
// opts: { dir: -1 (ticks extend left from xAnchor, default) | 1 (extend right), sw, minorLen }
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
      `<line x1="${r(xAnchor)}" y1="${r(y)}" x2="${r(xAnchor + dir * len)}" y2="${r(y)}" stroke="${opts.color || C.tick}" stroke-width="${major ? 1.25 : 0.9}" stroke-linecap="round"/>`
    );
  }
  return `<g>${lines.join('')}</g>`;
}

// Olive hose barb along arbitrary direction (dx, dy) normalized or cardinal
// Returns { svg, port: { x, y, dx, dy, diameter, depth, edge } }
function barb(slug, wallX, wallY, dx, dy, barbLen = 16, rBase = 5.0, rTip = 4.2) {
  const p = safeId(slug);
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
  const hl = `<line x1="${r(wallX + ux * 1.5 - tx * 1.6)}" y1="${r(wallY + uy * 1.5 - ty * 1.6)}" x2="${r(tipX - ux * 2 - tx * 1.6)}" y2="${r(tipY - uy * 2 - ty * 1.6)}" stroke="#FFFFFF" stroke-width="1.3" stroke-opacity="0.72" stroke-linecap="round"/>`;
  return {
    svg: `<path d="${d}" fill="url(#${p}-glass)" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>\n  ${hl}`,
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

// PTFE or ground-glass stopcock valve across vertical tube at (cx, cy)
function drawStopcock(slug, cx, cy, opts = {}) {
  const p = safeId(slug);
  const w = opts.w || 22;
  const h = opts.h || 9;
  const handleColor = opts.teal ? C.tealDark : C.red;
  const plugColor = opts.glass ? `url(#${p}-frost)` : C.ptfe;
  return `<g>
    <path d="M${r(cx - w / 2)} ${r(cy - h / 2)} L${r(cx + w / 2)} ${r(cy - h / 2 + 1.2)} L${r(cx + w / 2)} ${r(cy + h / 2 - 1.2)} L${r(cx - w / 2)} ${r(cy + h / 2)} Z" fill="${plugColor}" stroke="${C.stroke}" stroke-width="1.8" stroke-linejoin="round"/>
    <rect x="${r(cx - w / 2 - 7)}" y="${r(cy - 6.5)}" width="7" height="13" rx="2" fill="${handleColor}" stroke="${C.stroke}" stroke-width="1.6"/>
    <rect x="${r(cx + w / 2)}" y="${r(cy - 3.5)}" width="5" height="7" rx="1.5" fill="${C.bezel}" stroke="${C.stroke}" stroke-width="1.4"/>
    <line x1="${r(cx - 2.5)}" y1="${r(cy - 2.5)}" x2="${r(cx + 2.5)}" y2="${r(cy + 2.5)}" stroke="${C.inner}" stroke-width="1.2"/>
  </g>`;
}

// ---------- Benchtop Instrument & Electrical Primitives ----------

function labFeet(x, y, w, footW = 18, footH = 7, inset = 14) {
  return (
    `<rect x="${r(x + inset)}" y="${r(y)}" width="${footW}" height="${footH}" rx="2" fill="${C.inner}" stroke="${C.stroke}" stroke-width="1.6"/>` +
    `<rect x="${r(x + w - inset - footW)}" y="${r(y)}" width="${footW}" height="${footH}" rx="2" fill="${C.inner}" stroke="${C.stroke}" stroke-width="1.6"/>`
  );
}

function chassis(slug, x, y, w, h, opts = {}) {
  const p = safeId(slug);
  const rx = opts.rx ?? 8;
  const feet = opts.feet !== false ? labFeet(x, y + h, w, opts.footW ?? 20, opts.footH ?? 7, opts.footInset ?? 18) : '';
  const accent =
    opts.accentBar !== false
      ? `<rect x="${r(x + 2)}" y="${r(y + 2)}" width="${r(w - 4)}" height="7" rx="3" fill="${opts.accentColor || C.tealDark}" stroke="none"/>`
      : '';
  const innerLine = `<rect x="${r(x + 6)}" y="${r(y + 12)}" width="${r(w - 12)}" height="${r(h - 18)}" rx="${Math.max(2, rx - 3)}" fill="none" stroke="#CBD5E1" stroke-width="1.0"/>`;
  return (
    feet +
    `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="${rx}" fill="${opts.fill || `url(#${p}-chassis)`}" stroke="${C.stroke}" stroke-width="2.2"/>` +
    accent +
    innerLine
  );
}

function oledScreen(slug, x, y, w, h, innerSvg = '', opts = {}) {
  const p = safeId(slug);
  const rx = opts.rx ?? 4;
  return (
    `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="${rx + 2}" fill="${C.bezel}" stroke="${C.stroke}" stroke-width="1.8"/>` +
    `<rect x="${r(x + 4)}" y="${r(y + 4)}" width="${r(w - 8)}" height="${r(h - 8)}" rx="${rx}" fill="url(#${p}-screen)" stroke="${C.lcdBg}" stroke-width="1"/>` +
    `<rect x="${r(x + 5)}" y="${r(y + 5)}" width="${r(w - 10)}" height="${r((h - 10) * 0.35)}" rx="2" fill="#FFFFFF" fill-opacity="0.06" stroke="none"/>` +
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
  const p = safeId(slug);
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
      ticks += `<line x1="${r(cx + Math.cos(ta) * r1)}" y1="${r(cy + Math.sin(ta) * r1)}" x2="${r(cx + Math.cos(ta) * r2)}" y2="${r(cy + Math.sin(ta) * r2)}" stroke="${C.muted}" stroke-width="1"/>`;
    }
  }
  const innerFill = opts.teal ? `url(#${p}-accent)` : `url(#${p}-metal-v)`;
  const tickColor = opts.teal ? '#FFFFFF' : C.stroke;
  return (
    ticks +
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(radius)}" fill="#E2E8F0" stroke="${C.stroke}" stroke-width="1.6"/>` +
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(radius * 0.78)}" fill="${innerFill}" stroke="${C.inner}" stroke-width="1.2"/>` +
    `<line x1="${r(cx)}" y1="${r(cy)}" x2="${r(px)}" y2="${r(py)}" stroke="${tickColor}" stroke-width="1.8" stroke-linecap="round"/>` +
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="1.6" fill="${tickColor}" stroke="none"/>`
  );
}

function softButton(x, y, w, h, label = '', fill = '#E2E8F0', textColor = C.stroke) {
  return (
    `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="2.5" fill="${fill}" stroke="${C.inner}" stroke-width="1.3"/>` +
    (label ? labelText(x + w / 2, y + h / 2 + 2.6, label, 6.8, textColor, 'middle', true) : '')
  );
}

function bindingPost(cx, cy, color = C.red, label = '', labelDy = -13, radius = 7.5) {
  return (
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="${radius}" fill="${color}" stroke="${C.stroke}" stroke-width="1.5"/>` +
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(radius * 0.52)}" fill="#F8FAFC" stroke="${C.stroke}" stroke-width="1.0"/>` +
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(radius * 0.3)}" fill="${C.lcdBg}" stroke="none"/>` +
    (label ? labelText(cx, cy + labelDy, label, 8, C.inner, 'middle', true) : '')
  );
}

function bncJack(cx, cy, label = '', ringColor = '#94A3B8', labelDy = -13) {
  return (
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="8.5" fill="${ringColor}" stroke="${C.stroke}" stroke-width="1.5"/>` +
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="5.6" fill="#E2E8F0" stroke="${C.inner}" stroke-width="1.0"/>` +
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="3.4" fill="#F8FAFC" stroke="${C.inner}" stroke-width="0.9"/>` +
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="1.6" fill="${C.brass}" stroke="none"/>` +
    (label ? labelText(cx, cy + labelDy, label, 7.5, C.inner, 'middle', true) : '')
  );
}

function analogMeter(slug, x, y, w, h, opts = {}) {
  const p = safeId(slug);
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
    ticks += `<line x1="${r(tx1)}" y1="${r(ty1)}" x2="${r(tx2)}" y2="${r(ty2)}" stroke="${C.stroke}" stroke-width="${major ? 1.3 : 0.85}"/>`;
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
    `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="5" fill="${C.bezel}" stroke="${C.stroke}" stroke-width="1.8"/>` +
    `<rect x="${r(x + 4)}" y="${r(y + 4)}" width="${r(w - 8)}" height="${r(h - 8)}" rx="3" fill="#FFFFFF" stroke="${C.inner}" stroke-width="1.0"/>` +
    `<path d="M${r(mx1)} ${r(my1)} A${r(radLen * 0.84)} ${r(radLen * 0.84)} 0 0 1 ${r(mx2)} ${r(my2)}" fill="none" stroke="#CBD5E1" stroke-width="2.2"/>` +
    `<path d="M${r(ax1)} ${r(ay1)} A${r(radLen)} ${r(radLen)} 0 0 1 ${r(ax2)} ${r(ay2)}" fill="none" stroke="${C.stroke}" stroke-width="1.4"/>` +
    ticks +
    labels +
    (opts.symbol ? labelText(cx, y + h * 0.69, opts.symbol, opts.symbolSize || 10.5, C.stroke, 'middle', true) : '') +
    `<line x1="${r(cx)}" y1="${r(cy)}" x2="${r(nx)}" y2="${r(ny)}" stroke="${C.red}" stroke-width="1.8" stroke-linecap="round"/>` +
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="4.5" fill="${C.inner}" stroke="${C.stroke}" stroke-width="1.2"/>` +
    `<circle cx="${r(cx)}" cy="${r(y + h - 3)}" r="3.2" fill="url(#${p}-metal)" stroke="${C.stroke}" stroke-width="1.0"/>`
  );
}

function ventSlots(x, y, count, w = 24, dy = 5) {
  let out = '';
  for (let i = 0; i < count; i++) {
    out += `<line x1="${r(x)}" y1="${r(y + i * dy)}" x2="${r(x + w)}" y2="${r(y + i * dy)}" stroke="${C.muted}" stroke-width="1.4" stroke-linecap="round"/>`;
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
    const fullSvg = rawSvg.trimStart().startsWith('<?xml') || rawSvg.trimStart().startsWith('<svg')
      ? validateSvg(rawSvg, slug)
      : wrapSvg(slug, name, width, height, rawSvg, { extraDefs: opts.extraDefs });

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
            ? validateSvg(vRaw, vSlug)
            : wrapSvg(slug, name, vw, vh, vRaw, { extraDefs: v.extraDefs });
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
  FONT,
  MONO,
  r,
  fmt,
  rad,
  esc,
  safeId,
  defsFor,
  validateSvg,
  wrapSvg,
  hatchedTrapezoid,
  frostedJoint,
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
