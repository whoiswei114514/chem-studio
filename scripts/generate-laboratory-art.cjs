'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const LAB_DIR = path.resolve(__dirname, '../assets/laboratory');

// Classic Flat Scientific Line-Art Design Tokens (#294454 house palette, Qt QSvgRenderer safe).
// Zero <linearGradient>/<radialGradient>, zero url(#...), zero cross-hatched XXX joints.
const C = {
  stroke: '#294454',       // Primary outer walls (2.2-2.4)
  inner: '#3D5968',        // Internal tubes / coils / hardware (1.5)
  tick: '#7E939E',         // Graduations & subtle markings (1.0)
  muted: '#9AB0B8',        // Subtle back coil / light strokes
  frostStroke: '#7E939E',  // Legacy alias
  frostFill: '#F8FAF9',    // Flat stopper/socket interior
  glassEdge: '#F4F9F8',
  glassMid: 'none',
  glassDeep: '#DCEFEB',
  coolFill: '#E6F4F3',
  tealDark: '#1F6F6B',
  teal: '#258F89',
  tealLight: '#D4EAE8',
  chassisTop: '#F8FAF9',
  chassisMid: '#DCE5E8',
  chassisBot: '#C6D2D7',
  bezel: '#3D5968',
  bezelDark: '#294454',
  lcdBg: '#EEF6F1',
  lcdGreen: '#1F6F6B',
  lcdCyan: '#294454',
  lcdAmber: '#A88234',
  ptfe: '#F8FAF9',
  redAccent: '#C84B31',
  amberDark: '#A88234',
  amberMid: '#C9A048',
  amberLight: '#DFBE74',
  brassDark: '#A88234',
  brassMid: '#C9A048',
  brassLight: '#EAD79B',
  flameBlue: '#5BB5D5',
  flameCore: '#D9ECF2',
  flameTip: '#D79B59',
};

const r = n => Number(n.toFixed(3));
const rad = deg => (deg * Math.PI) / 180;

const URL_FALLBACKS = {
  glass: 'none',
  coolant: 'none',
  frost: '#FFFFFF',
  amber: C.amberLight,
  chassis: C.chassisTop,
  steel: C.chassisMid,
  brass: C.brassMid,
};

function sharedDefs() {
  return '';
}

function stripUrlsToFlat(svg) {
  return String(svg).replace(/url\(#[^)]+-(glass|coolant|frost|amber|chassis|steel|brass)\)/g, (_, role) => URL_FALLBACKS[role] || 'none');
}

function wrapSvg(id, title, w, h, body) {
  const flatBody = stripUrlsToFlat(body);
  return `<?xml version="1.0" encoding="utf-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${r(w)}" height="${r(h)}" viewBox="0 0 ${r(w)} ${r(h)}">\n<title>${title}</title>\n${flatBody}\n</svg>\n`;
}

// Unadorned smooth tapered glass joint polygon (zero XXX cross-hatching)
function hatchedTrapezoid(idPrefix, sx, sy, ex, ey, hw0, hw1, opts = {}) {
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const tx = -uy;
  const ty = ux;
  const p = (s, w) => [r(sx + ux * s + tx * w), r(sy + uy * s + ty * w)];
  const p0L = p(0, -hw0);
  const p0R = p(0, hw0);
  const p1R = p(len, hw1);
  const p1L = p(len, -hw1);

  const fill = opts.amber ? C.amberLight : opts.fill || 'none';
  const stroke = opts.stroke || C.stroke;
  const sw = opts.sw || 2.2;
  return `<polygon points="${p0L.join(',')} ${p0R.join(',')} ${p1R.join(',')} ${p1L.join(',')}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

// Vertical female joint: rim at (cx, yTop), smooth unadorned socket walls
function verticalFemaleJoint(idPrefix, cx, yTop, len = 22, hwTop = 12, hwBot = 9.5, opts = {}) {
  const lipH = opts.lipH ?? 4.2;
  const rimExtra = opts.rimExtra ?? 3.2;
  const lipRx = r(lipH / 2);
  const neckWall = `<rect x="${r(cx - hwTop - rimExtra)}" y="${r(yTop)}" width="${r((hwTop + rimExtra) * 2)}" height="${r(lipH)}" rx="${lipRx}" fill="${opts.amber ? C.amberLight : '#FFFFFF'}" stroke="${C.stroke}" stroke-width="2.1"/>`;
  const cone = hatchedTrapezoid(idPrefix, cx, yTop + lipH - 0.5, cx, yTop + len, hwTop, hwBot, { sw: 2.2, amber: opts.amber, fill: opts.fill || 'none' });
  const ring = opts.noBaseRing ? '' : `<line x1="${r(cx - hwBot)}" y1="${r(yTop + len)}" x2="${r(cx + hwBot)}" y2="${r(yTop + len)}" stroke="${C.inner}" stroke-width="1.3" stroke-linecap="round"/>`;
  return `${cone}\n  ${neckWall}\n  ${ring}`;
}

// Vertical male joint cone: shoulder at yTop, tip at yTop + len
function verticalMaleJoint(idPrefix, cx, yTop, len = 22, hwTop = 12, hwBot = 9, opts = {}) {
  const cone = hatchedTrapezoid(idPrefix, cx, yTop, cx, yTop + len, hwTop, hwBot, { sw: 2.2, amber: opts.amber, fill: opts.fill || '#FFFFFF' });
  const collar = opts.collar === false ? '' : `<line x1="${r(cx - hwTop - 1.5)}" y1="${r(yTop)}" x2="${r(cx + hwTop + 1.5)}" y2="${r(yTop)}" stroke="${C.stroke}" stroke-width="2.2" stroke-linecap="round"/>`;
  let drip = '';
  if (opts.dripTip) {
    drip = `<path d="M${r(cx - 4.5)} ${r(yTop + len)} L${r(cx - 3.5)} ${r(yTop + len + 7)} L${r(cx + 3.5)} ${r(yTop + len + 4)} L${r(cx + 4.5)} ${r(yTop + len)} Z" fill="none" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>`;
  }
  return `${drip}\n  ${cone}\n  ${collar}`;
}

// Angled male joint cone from shoulder (sx, sy) along unit dir (ux, uy) for length len
function angledMaleJoint(idPrefix, sx, sy, ux, uy, len = 22, hwTop = 12, hwBot = 9) {
  const ex = sx + ux * len;
  const ey = sy + uy * len;
  const tx = -uy;
  const ty = ux;
  const cone = hatchedTrapezoid(idPrefix, sx, sy, ex, ey, hwTop, hwBot, { sw: 2.2, fill: '#FFFFFF' });
  const collar = `<line x1="${r(sx - tx * (hwTop + 1.5))}" y1="${r(sy - ty * (hwTop + 1.5))}" x2="${r(sx + tx * (hwTop + 1.5))}" y2="${r(sy + ty * (hwTop + 1.5))}" stroke="${C.stroke}" stroke-width="2.2" stroke-linecap="round"/>`;
  return {
    svg: `${cone}\n  ${collar}`,
    tip: [r(ex), r(ey)],
    edge: [r(ex - tx * hwBot), r(ey - ty * hwBot), r(ex + tx * hwBot), r(ey + ty * hwBot)],
    diameter: r(hwBot * 2),
  };
}

// Angled female joint socket with lip at (lx, ly) going inward along (-ox, -oy)
function angledFemaleJoint(idPrefix, lx, ly, ox, oy, len = 22, hwTop = 12, hwBot = 9.5) {
  const ux = -ox;
  const uy = -oy;
  const tx = -uy;
  const ty = ux;
  const lipH = 4.2;
  const rimExtra = 3.0;
  const sx = lx + ux * (lipH - 0.5);
  const sy = ly + uy * (lipH - 0.5);
  const ex = lx + ux * len;
  const ey = ly + uy * len;
  const cone = hatchedTrapezoid(idPrefix, sx, sy, ex, ey, hwTop, hwBot, { sw: 2.2, fill: 'none' });
  const p = (along, w) => [r(lx + ux * along + tx * w), r(ly + uy * along + ty * w)];
  const lp1 = p(0, -(hwTop + rimExtra));
  const lp2 = p(0, hwTop + rimExtra);
  const lp3 = p(lipH, hwTop + rimExtra);
  const lp4 = p(lipH, -(hwTop + rimExtra));
  const lip = `<polygon points="${lp1.join(',')} ${lp2.join(',')} ${lp3.join(',')} ${lp4.join(',')}" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.1" stroke-linejoin="round"/>`;
  return {
    svg: `${cone}\n  ${lip}`,
    lip: [r(lx), r(ly)],
    edge: [r(lx - tx * hwTop), r(ly - ty * hwTop), r(lx + tx * hwTop), r(ly + ty * hwTop)],
    diameter: r(hwTop * 2),
    innerEnd: [r(ex), r(ey)],
  };
}

function oliveBarb(idPrefix, wallX, cy, dirX, barbLen = 16, rBase = 5, rTip = 4.2) {
  const tipX = wallX + dirX * barbLen;
  const midX = wallX + dirX * (barbLen * 0.62);
  const d = [
    `M${r(wallX)} ${r(cy - rBase)}`,
    `L${r(midX)} ${r(cy - rBase + 0.6)}`,
    `L${r(midX + dirX * 2)} ${r(cy - rBase - 1.3)}`,
    `L${r(tipX)} ${r(cy - rTip)}`,
    `L${r(tipX)} ${r(cy + rTip)}`,
    `L${r(midX + dirX * 2)} ${r(cy + rBase + 1.3)}`,
    `L${r(midX)} ${r(cy + rBase - 0.6)}`,
    `L${r(wallX)} ${r(cy + rBase)} Z`,
  ].join(' ');
  return {
    svg: `<path d="${d}" fill="${C.glassEdge}" stroke="${C.stroke}" stroke-width="2.1" stroke-linejoin="round"/>`,
    port: { x: r(tipX), y: r(cy), dx: dirX, dy: 0, diameter: r(rTip * 2), depth: 8, edge: [r(tipX), r(cy - rTip), r(tipX), r(cy + rTip)] },
  };
}

function verticalOliveBarb(idPrefix, cx, wallY, dirY, barbLen = 16, rBase = 5, rTip = 4.2) {
  const tipY = wallY + dirY * barbLen;
  const midY = wallY + dirY * (barbLen * 0.62);
  const d = [
    `M${r(cx - rBase)} ${r(wallY)}`,
    `L${r(cx - rBase + 0.6)} ${r(midY)}`,
    `L${r(cx - rBase - 1.3)} ${r(midY + dirY * 2)}`,
    `L${r(cx - rTip)} ${r(tipY)}`,
    `L${r(cx + rTip)} ${r(tipY)}`,
    `L${r(cx + rBase + 1.3)} ${r(midY + dirY * 2)}`,
    `L${r(cx + rBase - 0.6)} ${r(midY)}`,
    `L${r(cx + rBase)} ${r(wallY)} Z`,
  ].join(' ');
  return {
    svg: `<path d="${d}" fill="${C.glassEdge}" stroke="${C.stroke}" stroke-width="2.1" stroke-linejoin="round"/>`,
    port: { x: r(cx), y: r(tipY), dx: 0, dy: dirY, diameter: r(rTip * 2), depth: 8, edge: [r(cx - rTip), r(tipY), r(cx + rTip), r(tipY)] },
  };
}

function drawStopcock(idPrefix, cx, cy, opts = {}) {
  const w = opts.w || 22;
  const h = opts.h || 9;
  const handleColor = opts.teal ? C.teal : C.redAccent;
  const plugColor = opts.glass ? C.glassEdge : C.ptfe;
  return `<g>
    <path d="M${r(cx - w / 2)} ${r(cy - h / 2)} L${r(cx + w / 2)} ${r(cy - h / 2 + 1.2)} L${r(cx + w / 2)} ${r(cy + h / 2 - 1.2)} L${r(cx - w / 2)} ${r(cy + h / 2)} Z" fill="${plugColor}" stroke="${C.stroke}" stroke-width="1.9" stroke-linejoin="round"/>
    <rect x="${r(cx - w / 2 - 7)}" y="${r(cy - 6.5)}" width="7" height="13" rx="2" fill="${handleColor}" stroke="${C.stroke}" stroke-width="1.7"/>
    <rect x="${r(cx + w / 2)}" y="${r(cy - 3.5)}" width="5" height="7" rx="1.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.5"/>
    <line x1="${r(cx - 2.5)}" y1="${r(cy - 2.5)}" x2="${r(cx + 2.5)}" y2="${r(cy + 2.5)}" stroke="${C.inner}" stroke-width="1.2"/>
  </g>`;
}

function specularHighlight() {
  return '';
}

function graduationMarks(xRight, yTop, yBot, count, majorEvery = 5, tickLen = 7) {
  const lines = [];
  for (let i = 0; i <= count; i++) {
    const y = yTop + ((yBot - yTop) * i) / count;
    const major = i % majorEvery === 0;
    const len = major ? tickLen * 1.45 : tickLen;
    lines.push(`<line x1="${r(xRight - len)}" y1="${r(y)}" x2="${r(xRight)}" y2="${r(y)}" stroke="${C.tick}" stroke-width="${major ? 1.25 : 0.9}" stroke-linecap="round"/>`);
  }
  return `<g>${lines.join('')}</g>`;
}

// Shared condenser shell builder (used by Liebig, Allihn, Graham, Dimroth)
function buildWaterCondenser({ id, name, search, innerSvg }) {
  const W = 92;
  const H = 354;
  const cx = 46;
  const jTop = 58;
  const jBot = 292;
  const jHw = 16;

  // Lower-left water-in (dx: -1), upper-right water-out (dx: +1) -> opposite sides & y_in > y_out!
  // Also when tilted -75deg on a distillation head, water-out is on the TOP side and water-in is on the BOTTOM side!
  const waterIn = oliveBarb(id, cx - jHw, 266, -1, 24, 5.2, 4.4);
  const waterOut = oliveBarb(id, cx + jHw, 84, 1, 24, 5.2, 4.4);

  const fem = verticalFemaleJoint(id, cx, 4, 24, 12, 9.5);
  const male = verticalMaleJoint(id, cx, 326, 24, 11.5, 8.8);

    const outerWall = `<path d="
    M${cx - 8} 28 V48
    C${cx - 8} 54 ${cx - jHw} 54 ${cx - jHw} ${jTop + 10}
    V${jBot - 10}
    C${cx - jHw} ${jBot} ${cx - 8} ${jBot} ${cx - 8} ${jBot + 8}
    V326
    H${cx + 8}
    V${jBot + 8}
    C${cx + 8} ${jBot} ${cx + jHw} ${jBot} ${cx + jHw} ${jBot - 10}
    V${jTop + 10}
    C${cx + jHw} 54 ${cx + 8} 54 ${cx + 8} 48
    V28 Z"
    fill="none" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>`;

  const jacketSealTop = `<path d="M${cx - 10} ${jTop + 4} Q${cx} ${jTop + 9} ${cx + 10} ${jTop + 4}" fill="none" stroke="${C.inner}" stroke-width="1.3"/>`;
  const jacketSealBot = `<path d="M${cx - 10} ${jBot - 4} Q${cx} ${jBot - 9} ${cx + 10} ${jBot - 4}" fill="none" stroke="${C.inner}" stroke-width="1.3"/>`;

  const body = `
  ${waterIn.svg}
  ${waterOut.svg}
  ${outerWall}
  ${innerSvg(cx, jTop, jBot)}
  ${jacketSealTop}
  ${jacketSealBot}
  ${specularHighlight(cx - jHw + 4.5, jTop + 16, jBot - 16, 3.0, 0.78)}
  ${fem}
  ${male}`;

  return {
    id,
    name,
    category: '冷凝与回流',
    search,
    width: W,
    height: H,
    svg: wrapSvg(id, name, W, H, body),
    ports: [
      { id: 'inlet', x: cx, y: 4, dx: 0, dy: -1, type: 'vapor-female', diameter: 24, depth: 24, edge: [cx - 12, 4, cx + 12, 4] },
      { id: 'outlet', x: cx, y: 350, dx: 0, dy: 1, type: 'glass-male', diameter: 17.6, depth: 24, edge: [cx - 8.8, 350, cx + 8.8, 350] },
      { id: 'water-in', ...waterIn.port, type: 'coolant' },
      { id: 'water-out', ...waterOut.port, type: 'coolant' },
      { id: 'grip-site', x: cx, y: 175, dx: 1, dy: 0, type: 'grip-site', segment: [cx, 108, cx, 244] },
    ],
  };
}

// =========================================================================
// ASSET SPECIFICATIONS (55 TOTAL)
// =========================================================================
function buildAssets() {
  const assets = [];

  // 1. lab:ground-glass-stopper (polished existing, same ID & plug compatibility)
  {
    const id = 'ground-glass-stopper';
    const W = 40, H = 68, cx = 20;
    const cone = verticalMaleJoint(id, cx, 33, 31, 14, 10.5, { collar: false });
    const head = `<path d="M${cx - 16} 19 C${cx - 16} 8 ${cx - 9} 3 ${cx} 3 C${cx + 9} 3 ${cx + 16} 8 ${cx + 16} 19 C${cx + 16} 26 ${cx + 11} 30 ${cx + 14} 33 H${cx - 14} C${cx - 11} 30 ${cx - 16} 26 ${cx - 16} 19 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <rect x="${cx - 15}" y="30" width="30" height="3.2" rx="1.6" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="1.6"/>`;
    const body = `${cone}\n  ${head}\n  ${specularHighlight(cx - 8, 9, 25, 2.8, 0.8)}`;
    assets.push({
      id, name: '玻璃磨口塞（圆头）', category: '瓶塞与磨口接头',
      search: '玻璃塞 磨口瓶塞 round head ground glass stopper 实心玻璃密封件，圆头便于抓取，下部磨砂锥面嵌入试剂瓶或容量瓶的磨口。',
      width: W, height: H, svg: wrapSvg(id, '玻璃磨口塞（圆头）', W, H, body),
      ports: [
        { id: 'plug', x: cx, y: 33, dx: 0, dy: 1, type: 'plug', diameter: 28, depth: 0, edge: [cx - 14, 33, cx + 14, 33] },
      ],
    });
  }

  // 2. lab:clear-reagent-bottle (polished existing)
  {
    const id = 'clear-reagent-bottle';
    const W = 94, H = 168, cx = 47;
    const bottle = `<path d="M${cx - 14} 24 V36 L${cx - 42} 66 Q${cx - 44} 69 ${cx - 44} 74 V156 Q${cx - 44} 165 ${cx - 35} 165 H${cx + 35} Q${cx + 44} 165 ${cx + 44} 156 V74 Q${cx + 44} 69 ${cx + 42} 66 L${cx + 14} 36 V24 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const baseThick = `<path d="M${cx - 39} 157 Q${cx} 160 ${cx + 39} 157" fill="none" stroke="${C.inner}" stroke-width="1.2"/>`;
    const fem = verticalFemaleJoint(id, cx, 3, 24, 15, 12.5);
    const body = `${bottle}\n  ${baseThick}\n  ${specularHighlight(cx - 34, 72, 150, 3.6, 0.78)}\n  ${fem}`;
    assets.push({
      id, name: '透明磨口试剂瓶（开口）', category: '试剂储存',
      search: '无色试剂瓶 细口瓶 reagent bottle clear glass 储存试剂和溶液，瓶口可装可拆卸的玻璃磨口塞。',
      width: W, height: H, svg: wrapSvg(id, '透明磨口试剂瓶（开口）', W, H, body),
      ports: [
        { id: 'mouth', x: cx, y: 3, dx: 0, dy: -1, type: 'glass-female', diameter: 30, depth: 24, edge: [cx - 15, 3, cx + 15, 3] },
        { id: 'base', x: cx, y: 165, dx: 0, dy: 1, type: 'base' },
        { id: 'grip-site', x: cx, y: 20, dx: 1, dy: 0, type: 'grip-site', segment: [cx, 8, cx, 32] },
      ],
    });
  }

  // 3. lab:amber-reagent-bottle (polished existing)
  {
    const id = 'amber-reagent-bottle';
    const W = 94, H = 168, cx = 47;
    const bottle = `<path d="M${cx - 14} 24 V36 L${cx - 42} 66 Q${cx - 44} 69 ${cx - 44} 74 V156 Q${cx - 44} 165 ${cx - 35} 165 H${cx + 35} Q${cx + 44} 165 ${cx + 44} 156 V74 Q${cx + 44} 69 ${cx + 42} 66 L${cx + 14} 36 V24 Z" fill="url(#${id}-amber)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const fem = verticalFemaleJoint(id, cx, 3, 24, 15, 12.5, { amber: true });
    const label = `<rect x="${cx - 32}" y="86" width="64" height="50" rx="3" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="1.6"/>
      <line x1="${cx - 24}" y1="102" x2="${cx + 24}" y2="102" stroke="#CBD5E1" stroke-width="1.2"/>
      <line x1="${cx - 24}" y1="114" x2="${cx + 18}" y2="114" stroke="#CBD5E1" stroke-width="1.2"/>
      <line x1="${cx - 24}" y1="126" x2="${cx + 12}" y2="126" stroke="#CBD5E1" stroke-width="1.2"/>`;
    const body = `${bottle}\n  ${specularHighlight(cx - 34, 72, 150, 3.2, 0.45)}\n  ${label}\n  ${fem}`;
    assets.push({
      id, name: '棕色磨口试剂瓶（开口）', category: '试剂储存',
      search: '棕色试剂瓶 棕瓶 避光瓶 amber reagent bottle 保护光敏试剂，带空白标签和可装玻璃塞的磨口。',
      width: W, height: H, svg: wrapSvg(id, '棕色磨口试剂瓶（开口）', W, H, body),
      ports: [
        { id: 'mouth', x: cx, y: 3, dx: 0, dy: -1, type: 'glass-female', diameter: 30, depth: 24, edge: [cx - 15, 3, cx + 15, 3] },
        { id: 'base', x: cx, y: 165, dx: 0, dy: 1, type: 'base' },
        { id: 'grip-site', x: cx, y: 20, dx: 1, dy: 0, type: 'grip-site', segment: [cx, 8, cx, 32] },
      ],
    });
  }

  // 4. lab:ball-joint (polished existing)
  {
    const id = 'ball-joint';
    const W = 148, H = 48, cy = 24;
    const tube = `<rect x="2" y="${cy - 13}" width="112" height="26" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const ball = `<path d="M114 ${cy - 13} L123 ${cy - 20} A21 21 0 0 1 144 ${cy} A21 21 0 0 1 123 ${cy + 20} L114 ${cy + 13} Z" fill="${C.glassEdge}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const frostArc = `<path d="M122 ${cy - 16} A18 18 0 0 1 139 ${cy} A18 18 0 0 1 122 ${cy + 16}" fill="none" stroke="${C.inner}" stroke-width="1.2" stroke-dasharray="2.5 2.5"/>`;
    const hi = '';
    assets.push({
      id, name: '球形磨口接头（球头）', category: '瓶塞与磨口接头',
      search: '球磨口 公口 球头 ball ground glass joint 与球形磨口球窝配合，连接玻璃管路。',
      width: W, height: H, svg: wrapSvg(id, '球形磨口接头（球头）', W, H, `${tube}\n  ${ball}\n  ${frostArc}\n  ${hi}`),
      ports: [
        { id: 'inlet', x: 2, y: cy, dx: -1, dy: 0, type: 'tube', diameter: 26, depth: 5, edge: [2, cy - 13, 2, cy + 13] },
        { id: 'ball', x: 144, y: cy, dx: 1, dy: 0, type: 'ball-male', diameter: 42, depth: 5 },
      ],
    });
  }

  // 5. lab:socket-joint (polished existing)
  {
    const id = 'socket-joint';
    const W = 148, H = 52, cy = 26;
    const tube = `<rect x="34" y="${cy - 13}" width="112" height="26" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const cup = `<path d="M4 ${cy - 22} A24 24 0 0 1 25 ${cy - 13} H34 V${cy + 13} H25 A24 24 0 0 1 4 ${cy + 22} Z" fill="${C.glassEdge}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const cupRim = `<ellipse cx="6" cy="${cy}" rx="3.2" ry="20" fill="${C.chassisMid}" stroke="${C.inner}" stroke-width="1.4"/>`;
    const hi = '';
    assets.push({
      id, name: '球形磨口接头（球窝）', category: '瓶塞与磨口接头',
      search: '球磨口 母口 球窝 socket ground glass joint 与球形磨口球头配合，连接玻璃管路。',
      width: W, height: H, svg: wrapSvg(id, '球形磨口接头（球窝）', W, H, `${tube}\n  ${cup}\n  ${cupRim}\n  ${hi}`),
      ports: [
        { id: 'socket', x: 4, y: cy, dx: -1, dy: 0, type: 'ball-female', diameter: 42, depth: 5 },
        { id: 'outlet', x: 146, y: cy, dx: 1, dy: 0, type: 'tube', diameter: 26, depth: 5, edge: [146, cy - 13, 146, cy + 13] },
      ],
    });
  }

  // 6. lab:friedrich-condenser (upgraded publication-grade, OPPOSITE-SIDE water-in / water-out!)
  {
    const id = 'friedrich-condenser';
    const W = 136, H = 304, cx = 58;
    // Cold finger helix coils drawn with smooth cubic curves (clear front arcs + subtle back turns)
    const coils = [];
    for (let i = 0; i < 8; i++) {
      const y0 = 76 + i * 21;
      coils.push(`<path d="M${cx + 17} ${y0 + 2} C${cx + 21} ${y0 + 9} ${cx - 21} ${y0 + 15} ${cx - 17} ${y0 + 22}" fill="none" stroke="${C.muted}" stroke-width="1.4" stroke-dasharray="3 2.5"/>`);
      coils.push(`<path d="M${cx - 17} ${y0} C${cx - 21} ${y0 + 7} ${cx + 21} ${y0 + 13} ${cx + 17} ${y0 + 20}" fill="none" stroke="${C.inner}" stroke-width="2.0" stroke-linecap="round"/>`);
    }
    const innerColdFinger = `
      <path d="M${cx - 17} 48 V246 C${cx - 17} 258 ${cx + 17} 258 ${cx + 17} 246 V48 Z" fill="${C.coolFill}" stroke="${C.inner}" stroke-width="1.6"/>
      <line x1="${cx}" y1="28" x2="${cx}" y2="246" stroke="${C.tealDark}" stroke-width="2.0" stroke-linecap="round"/>
      ${coils.join('\n  ')}`;

    // Opposite sides coolant: upper-left water-out (y=22, dx=-1), lower-right water-in (y=40, dx=+1)
    // Vapor inlet angled upper-right at y=86
    const waterOut = oliveBarb(id, cx - 18, 20, -1, 28, 4.8, 4.0);
    const waterIn = oliveBarb(id, cx + 18, 38, 1, 28, 4.8, 4.0);
    const ux = 0.94, uy = -0.342;
    const tx = -uy, ty = ux;
    const vaporFem = angledFemaleJoint(id, 130, 74, ux, uy, 22, 11, 8.8);
    const male = verticalMaleJoint(id, cx, 276, 24, 11.5, 8.8, { dripTip: false });

    const sideBranch = `<polygon points="${cx + 24},78 ${r(vaporFem.innerEnd[0] - tx * 9.5)},${r(vaporFem.innerEnd[1] - ty * 9.5)} ${r(vaporFem.innerEnd[0] + tx * 9.5)},${r(vaporFem.innerEnd[1] + ty * 9.5)} ${cx + 24},104" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const outerBody = `<path d="
      M${cx - 18} 12 H${cx + 18} V52
      C${cx + 26} 58 ${cx + 26} 68 ${cx + 26} 78
      V246
      C${cx + 26} 262 ${cx + 11.5} 264 ${cx + 11.5} 276
      H${cx - 11.5}
      C${cx - 11.5} 264 ${cx - 26} 262 ${cx - 26} 246
      V66 C${cx - 26} 56 ${cx - 18} 52 ${cx - 18} 48 Z"
      fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    // Clean cap seam
    const capRing = `<line x1="${cx - 24}" y1="54" x2="${cx + 24}" y2="54" stroke="${C.inner}" stroke-width="1.3"/>`;
    const body = `
      ${waterOut.svg}
      ${waterIn.svg}
      ${sideBranch}
      ${outerBody}
      ${innerColdFinger}
      ${capRing}
      ${specularHighlight(cx - 21, 66, 242, 3.0, 0.78)}
      ${vaporFem.svg}
      ${male}`;

    assets.push({
      id, name: '弗里德里希回流冷凝管', category: '冷凝与回流',
      search: '螺旋冷指冷凝管 Friedrichs condenser 高效回流 蒸气冷却 换热 内部螺旋冷指，上部接冷却水，下部磨口与反应烧瓶连接。',
      width: W, height: H, svg: wrapSvg(id, '弗里德里希回流冷凝管', W, H, body),
      ports: [
        { id: 'outlet', x: cx, y: 300, dx: 0, dy: 1, type: 'glass-male', diameter: 17.6, depth: 24, edge: [cx - 8.8, 300, cx + 8.8, 300] },
        { id: 'inlet', x: vaporFem.lip[0], y: vaporFem.lip[1], dx: ux, dy: uy, type: 'vapor-female', diameter: vaporFem.diameter, depth: 20, edge: vaporFem.edge },
        { id: 'water-in', ...waterIn.port, type: 'coolant' },
        { id: 'water-out', ...waterOut.port, type: 'coolant' },
        { id: 'grip-site', x: cx, y: 155, dx: 1, dy: 0, type: 'grip-site', segment: [cx, 108, cx, 226] },
      ],
    });
  }

  // 7. lab:liebig-condenser (直形冷凝管)
  assets.push(buildWaterCondenser({
    id: 'liebig-condenser',
    name: '直形冷凝管',
    search: '直形冷凝管 Liebig condenser 蒸馏 冷凝 蒸气液化 外层水套下口进冷水上口出水，内管通过热蒸气。',
    innerSvg: (cx, jTop, jBot) => `
      <rect x="${cx - 6.5}" y="28" width="13" height="298" fill="url(#liebig-condenser-glass)" stroke="${C.inner}" stroke-width="1.6"/>
      ${specularHighlight(cx - 2.8, 36, 318, 2.0, 0.78)}`,
  }));

  // 8. lab:allihn-condenser (球形冷凝管 — smooth symmetrical connected glass bulbs!)
  assets.push(buildWaterCondenser({
    id: 'allihn-condenser',
    name: '球形冷凝管',
    search: '球形冷凝管 Allihn condenser 冷凝 回流 球泡内管 增大换热面积 使热蒸气冷却回流至反应烧瓶。',
    innerSvg: (cx, jTop, jBot) => {
      const bulbCount = 5;
      const span = jBot - jTop - 28;
      const step = span / bulbCount;
      const yStart = jTop + 14;
      let leftD = `M${cx - 6} 28 V${r(yStart)}`;
      let rightD = `L${cx + 6} 28 Z`;
      const rightSegs = [];
      for (let i = 0; i < bulbCount; i++) {
        const y0 = yStart + i * step;
        const y1 = y0 + step;
        const ym = (y0 + y1) / 2;
        leftD += ` C${cx - 6} ${r(y0 + step * 0.2)} ${cx - 12.5} ${r(y0 + step * 0.25)} ${cx - 12.5} ${r(ym)} C${cx - 12.5} ${r(y1 - step * 0.25)} ${cx - 6} ${r(y1 - step * 0.2)} ${cx - 6} ${r(y1)}`;
        rightSegs.unshift(` C${cx + 6} ${r(y0 + step * 0.2)} ${cx + 12.5} ${r(y0 + step * 0.25)} ${cx + 12.5} ${r(ym)} C${cx + 12.5} ${r(y1 - step * 0.25)} ${cx + 6} ${r(y1 - step * 0.2)} ${cx + 6} ${r(y1)}`);
      }
      // Build full closed symmetric bulb tube path cleanly
      let d = `M${cx - 6} 28 V${r(yStart)}`;
      for (let i = 0; i < bulbCount; i++) {
        const y0 = yStart + i * step;
        const y1 = y0 + step;
        const ym = (y0 + y1) / 2;
        d += ` C${cx - 6} ${r(y0 + step * 0.16)} ${cx - 13} ${r(y0 + step * 0.22)} ${cx - 13} ${r(ym)} C${cx - 13} ${r(y1 - step * 0.22)} ${cx - 6} ${r(y1 - step * 0.16)} ${cx - 6} ${r(y1)}`;
      }
      d += ` V326 H${cx + 6} V${r(yStart + bulbCount * step)}`;
      for (let i = bulbCount - 1; i >= 0; i--) {
        const y0 = yStart + i * step;
        const y1 = y0 + step;
        const ym = (y0 + y1) / 2;
        d += ` C${cx + 6} ${r(y1 - step * 0.16)} ${cx + 13} ${r(y1 - step * 0.22)} ${cx + 13} ${r(ym)} C${cx + 13} ${r(y0 + step * 0.22)} ${cx + 6} ${r(y0 + step * 0.16)} ${cx + 6} ${r(y0)}`;
      }
      d += ` V28 Z`;
      return `<path d="${d}" fill="url(#allihn-condenser-glass)" stroke="${C.inner}" stroke-width="1.6" stroke-linejoin="round"/>`;
    },
  }));

  // 9. lab:graham-condenser (蛇形冷凝管 — smooth helical cubic Bezier coil, NEVER jagged zigzag!)
  assets.push(buildWaterCondenser({
    id: 'graham-condenser',
    name: '蛇形冷凝管',
    search: '蛇形冷凝管 Graham condenser 螺旋冷凝管 盘管冷凝 增大蒸气换热面积，用冷水将热蒸气冷凝为液体。',
    innerSvg: (cx, jTop, jBot) => {
      const turns = 8;
      const y0 = jTop + 18;
      const y1 = jBot - 18;
      const pitch = (y1 - y0) / turns;
      const amp = 11.5;
      // Smooth continuous helical centerline: first pass back-side arcs, then front-side highlighted helix
      let coilPath = `M${cx} 28 V${r(y0 - 4)} C${cx} ${r(y0)} ${cx + amp} ${r(y0 + pitch * 0.1)} ${cx + amp} ${r(y0 + pitch * 0.25)}`;
      for (let i = 0; i < turns; i++) {
        const yt = y0 + i * pitch;
        const ym = yt + pitch * 0.5;
        const yb = yt + pitch;
        coilPath += ` C${cx + amp} ${r(yt + pitch * 0.42)} ${cx - amp} ${r(yt + pitch * 0.34)} ${cx - amp} ${r(ym + pitch * 0.06)}`;
        coilPath += ` C${cx - amp} ${r(ym + pitch * 0.30)} ${cx + amp} ${r(yb - pitch * 0.22)} ${cx + amp} ${r(yb + (i === turns - 1 ? 0 : pitch * 0.05))}`;
      }
      coilPath += ` C${cx + amp} ${r(y1 + 6)} ${cx} ${r(y1 + 6)} ${cx} ${r(y1 + 12)} V326`;
      return `
        <path d="${coilPath}" fill="none" stroke="${C.inner}" stroke-width="5.4" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="${coilPath}" fill="none" stroke="#EFF8FC" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    },
  }));

  // 10. lab:air-condenser (空气冷凝管 — straight thick-walled tube, NO water jacket!)
  {
    const id = 'air-condenser';
    const W = 44, H = 320, cx = 22;
    const fem = verticalFemaleJoint(id, cx, 4, 24, 12, 9.5);
    const male = verticalMaleJoint(id, cx, 292, 24, 11.5, 8.8);
    const tube = `<rect x="${cx - 9.5}" y="28" width="19" height="264" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2"/>`;
    const innerBore = `<line x1="${cx - 5.5}" y1="32" x2="${cx - 5.5}" y2="288" stroke="${C.inner}" stroke-width="1.0"/>
      <line x1="${cx + 5.5}" y1="32" x2="${cx + 5.5}" y2="288" stroke="${C.inner}" stroke-width="1.0"/>`;
    const body = `${tube}\n  ${innerBore}\n  ${specularHighlight(cx - 3.5, 34, 286, 2.4, 0.78)}\n  ${fem}\n  ${male}`;
    assets.push({
      id, name: '空气冷凝管', category: '冷凝与回流',
      search: '空气冷凝管 air condenser 无水套 高沸点蒸馏 空气冷却 直管冷凝 用于沸点高于140℃液体的蒸馏冷凝，无需通水。',
      width: W, height: H, svg: wrapSvg(id, '空气冷凝管', W, H, body),
      ports: [
        { id: 'inlet', x: cx, y: 4, dx: 0, dy: -1, type: 'vapor-female', diameter: 24, depth: 24, edge: [cx - 12, 4, cx + 12, 4] },
        { id: 'outlet', x: cx, y: 316, dx: 0, dy: 1, type: 'glass-male', diameter: 17.6, depth: 24, edge: [cx - 8.8, 316, cx + 8.8, 316] },
        { id: 'grip-site', x: cx, y: 160, dx: 1, dy: 0, type: 'grip-site', segment: [cx, 80, cx, 240] },
      ],
    });
  }

  // 11. lab:dimroth-condenser (双层盘管冷凝管 — internal helical coolant coil with BOTH top opposite water barbs!)
  {
    const id = 'dimroth-condenser';
    const W = 94, H = 354, cx = 47;
    const jTop = 44, jBot = 304, hw = 18;
    // Both water ports at top cold-coil head on OPPOSITE sides, y_in > y_out
    const waterOut = oliveBarb(id, cx + hw, 62, 1, 24, 5.0, 4.2);
    const waterIn = oliveBarb(id, cx - hw, 82, -1, 24, 5.0, 4.2);
    const fem = verticalFemaleJoint(id, cx, 4, 24, 12, 9.5);
    const male = verticalMaleJoint(id, cx, 326, 24, 11.5, 8.8);

    // Outer open vapor jacket cylinder
    const outer = `<path d="M${cx - 9.5} 28 V38 Q${cx - hw} 42 ${cx - hw} ${jTop + 10} V${jBot - 10} Q${cx - hw} ${jBot} ${cx - 11.5} 308 V326 H${cx + 11.5} V308 Q${cx + hw} ${jBot} ${cx + hw} ${jBot - 10} V${jTop + 10} Q${cx + hw} 42 ${cx + 9.5} 38 V28 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    // Helical double-pass coil inside vapor jacket (central return stem + outer helix)
    const turns = 10;
    const y0 = 96, y1 = 282, pitch = (y1 - y0) / turns, amp = 11.5;
    let coil = `M${cx - hw + 2} 82 Q${cx} 82 ${cx + amp} ${r(y0)}`;
    for (let i = 0; i < turns; i++) {
      const yt = y0 + i * pitch, ym = yt + pitch * 0.5, yb = yt + pitch;
      coil += ` C${cx + amp} ${r(yt + pitch * 0.42)} ${cx - amp} ${r(yt + pitch * 0.34)} ${cx - amp} ${r(ym + pitch * 0.06)}`;
      coil += ` C${cx - amp} ${r(ym + pitch * 0.30)} ${cx + amp} ${r(yb - pitch * 0.22)} ${cx + amp} ${r(yb)}`;
    }
    coil += ` C${cx + amp} ${r(y1 + 12)} ${cx} ${r(y1 + 12)} ${cx} ${r(y1)} V62 H${cx + hw - 2}`;

    const body = `
      ${waterOut.svg}
      ${waterIn.svg}
      ${outer}
      <path d="${coil}" fill="none" stroke="${C.inner}" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${coil}" fill="none" stroke="#CFFAFE" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
      ${specularHighlight(cx - hw + 4.5, 58, 294, 3.0, 0.75)}
      ${fem}
      ${male}`;

    assets.push({
      id, name: '双层盘管冷凝管', category: '冷凝与回流',
      search: '双层盘管冷凝管 Dimroth condenser 迪姆罗特冷凝管 内螺旋冷管 高效回流 冷却水进出水口分别在顶部两侧。',
      width: W, height: H, svg: wrapSvg(id, '双层盘管冷凝管', W, H, body),
      ports: [
        { id: 'inlet', x: cx, y: 4, dx: 0, dy: -1, type: 'vapor-female', diameter: 24, depth: 24, edge: [cx - 12, 4, cx + 12, 4] },
        { id: 'outlet', x: cx, y: 350, dx: 0, dy: 1, type: 'glass-male', diameter: 17.6, depth: 24, edge: [cx - 8.8, 350, cx + 8.8, 350] },
        { id: 'water-in', ...waterIn.port, type: 'coolant' },
        { id: 'water-out', ...waterOut.port, type: 'coolant' },
        { id: 'grip-site', x: cx, y: 175, dx: 1, dy: 0, type: 'grip-site', segment: [cx, 108, cx, 250] },
      ],
    });
  }

  // 12. lab:plain-distillation-head (无支管蒸馏头 — 75° bend elbow, NO thermometer top neck!)
  {
    const id = 'plain-distillation-head';
    const W = 90, H = 104, cx = 22;
    const male = verticalMaleJoint(id, cx, 78, 22, 11.5, 8.8);
    // 75-deg sidearm direction from upward vertical = 105 deg => ux = sin(105) = 0.9659, uy = -cos(105) = 0.2588
    const ux = 0.965926, uy = 0.258819;
    const sx = 64, sy = 44; // shoulder start of sidearm male cone
    const sideCone = angledMaleJoint(id, sx, sy, ux, uy, 22, 11, 8.6);
    const tx = -uy, ty = ux;
    // Smooth 75-degree bent elbow tube from (cx, 78) curving cleanly into sidearm shoulder (sx, sy)
    const elbow = `<path d="
      M${cx - 10} 78 V34
      C${cx - 10} 13 ${cx + 8} 10 ${cx + 22} 14
      L${r(sx - tx * 10)} ${r(sy - ty * 10)}
      L${r(sx + tx * 10)} ${r(sy + ty * 10)}
      L${cx + 15} 37
      Q${cx + 10} 36 ${cx + 10} 42
      V78 Z"
      fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const hi = '';
    assets.push({
      id, name: '无支管蒸馏头', category: '蒸馏与分馏',
      search: '无支管蒸馏头 75度弯头 蒸馏弯管 plain distillation head elbow 不带温度计口的75°蒸馏弯管，连接烧瓶与冷凝管。',
      width: W, height: H, svg: wrapSvg(id, '无支管蒸馏头', W, H, `${elbow}\n  ${hi}\n  ${male}\n  ${sideCone.svg}`),
      ports: [
        { id: 'outlet', x: cx, y: 100, dx: 0, dy: 1, type: 'glass-male', diameter: 17.6, depth: 22, edge: [cx - 8.8, 100, cx + 8.8, 100] },
        { id: 'side', x: sideCone.tip[0], y: sideCone.tip[1], dx: r(ux), dy: r(uy), type: 'vapor-male', diameter: sideCone.diameter, depth: 22, edge: sideCone.edge },
        { id: 'grip-site', x: cx, y: 54, dx: 1, dy: 0, type: 'grip-site', segment: [cx, 32, cx, 74] },
      ],
    });
  }

  // 13. lab:standard-distillation-head (带支管蒸馏头 — top sensor-socket, bottom glass-male, 75° vapor-male)
  {
    const id = 'standard-distillation-head';
    const W = 90, H = 132, cx = 22;
    const fem = verticalFemaleJoint(id, cx, 4, 22, 12.5, 10.5);
    const male = verticalMaleJoint(id, cx, 106, 22, 11.5, 8.8);
    const ux = 0.965926, uy = 0.258819;
    const sx = 64, sy = 64;
    const sideCone = angledMaleJoint(id, sx, sy, ux, uy, 22, 11, 8.6);
    const tx = -uy, ty = ux;
    const tube = `<path d="
      M${cx - 10} 26 V106 H${cx + 10} V65
      L${r(sx + tx * 9.5)} ${r(sy + ty * 9.5)}
      L${r(sx - tx * 9.5)} ${r(sy - ty * 9.5)}
      L${cx + 10} 44 V26 Z"
      fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    assets.push({
      id, name: '带支管蒸馏头', category: '蒸馏与分馏',
      search: '带支管蒸馏头 75度蒸馏头 克氏蒸馏头 standard distillation head 顶部接温度计套管，下口接烧瓶，75°侧支管接冷凝管。',
      width: W, height: H, svg: wrapSvg(id, '带支管蒸馏头', W, H, `${tube}\n  ${specularHighlight(cx - 5.5, 30, 100, 2.4, 0.78)}\n  ${fem}\n  ${male}\n  ${sideCone.svg}`),
      ports: [
        { id: 'inlet', x: cx, y: 4, dx: 0, dy: -1, type: 'sensor-socket', diameter: 25, depth: 75, edge: [cx - 12.5, 4, cx + 12.5, 4], target: [cx, 54] },
        { id: 'outlet', x: cx, y: 128, dx: 0, dy: 1, type: 'glass-male', diameter: 17.6, depth: 22, edge: [cx - 8.8, 128, cx + 8.8, 128] },
        { id: 'side', x: sideCone.tip[0], y: sideCone.tip[1], dx: r(ux), dy: r(uy), type: 'vapor-male', diameter: sideCone.diameter, depth: 22, edge: sideCone.edge },
        { id: 'grip-site', x: cx, y: 66, dx: 1, dy: 0, type: 'grip-site', segment: [cx, 36, cx, 96] },
      ],
    });
  }

  // 14. lab:claisen-head (克氏双口蒸馏头)
  {
    const id = 'claisen-head';
    const W = 94, H = 154, cx1 = 22, cx2 = 70;
    const fem1 = verticalFemaleJoint(id, cx1, 22, 22, 12, 9.5);
    const fem2 = verticalFemaleJoint(id, cx2, 4, 22, 12, 9.5);
    const male = verticalMaleJoint(id, cx1, 128, 22, 11.5, 8.8);
    const bodyPath = `<path d="
      M${cx1 - 9.5} 44 V128 H${cx1 + 9.5} V86
      C${cx1 + 22} 84 ${cx2 + 9.5} 78 ${cx2 + 9.5} 58
      V26 H${cx2 - 9.5} V54
      C${cx2 - 9.5} 64 ${cx1 + 18} 66 ${cx1 + 9.5} 66
      V44 Z"
      fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    assets.push({
      id, name: '克氏双口蒸馏头', category: '蒸馏与分馏',
      search: '克氏蒸馏头 克莱森头 双口蒸馏头 Claisen adapter head 减压蒸馏 加料与测温 双磨口上部接口，防止暴沸并同时插入温度计与滴液漏斗。',
      width: W, height: H, svg: wrapSvg(id, '克氏双口蒸馏头', W, H, `${bodyPath}\n  ${specularHighlight(cx1 - 5, 48, 122, 2.4, 0.78)}\n  ${specularHighlight(cx2 - 5, 30, 62, 2.4, 0.78)}\n  ${fem1}\n  ${fem2}\n  ${male}`),
      ports: [
        { id: 'inlet', x: cx1, y: 22, dx: 0, dy: -1, type: 'glass-female', diameter: 24, depth: 22, edge: [cx1 - 12, 22, cx1 + 12, 22] },
        { id: 'inlet-2', x: cx2, y: 4, dx: 0, dy: -1, type: 'glass-female', diameter: 24, depth: 22, edge: [cx2 - 12, 4, cx2 + 12, 4] },
        { id: 'outlet', x: cx1, y: 150, dx: 0, dy: 1, type: 'glass-male', diameter: 17.6, depth: 22, edge: [cx1 - 8.8, 150, cx1 + 8.8, 150] },
        { id: 'grip-site', x: cx1, y: 92, dx: 1, dy: 0, type: 'grip-site', segment: [cx1, 56, cx1, 118] },
      ],
    });
  }

  // 15. lab:ground-conical-flask (磨口锥形瓶)
  {
    const id = 'ground-conical-flask';
    const W = 114, H = 168, cx = 57;
    const fem = verticalFemaleJoint(id, cx, 4, 24, 13, 10.5);
    const body = `<path d="
      M${cx - 11} 28 V44
      L${cx - 49} 142
      Q${cx - 53} 154 ${cx - 48} 160
      Q${cx - 43} 165 ${cx - 34} 165
      H${cx + 34}
      Q${cx + 43} 165 ${cx + 48} 160
      Q${cx + 53} 154 ${cx + 49} 142
      L${cx + 11} 44 V28 Z"
      fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const baseLine = '';
    const hi = '';
    const grads = `<g stroke="${C.tick}" stroke-width="1.1" stroke-linecap="round">
      <line x1="${cx + 12}" y1="84" x2="${cx + 22}" y2="84"/>
      <line x1="${cx + 16}" y1="102" x2="${cx + 28}" y2="102"/>
      <line x1="${cx + 20}" y1="120" x2="${cx + 34}" y2="120"/>
      <line x1="${cx + 24}" y1="138" x2="${cx + 40}" y2="138"/>
    </g>`;
    assets.push({
      id, name: '磨口锥形瓶', category: '反应容器',
      search: '磨口锥形瓶 具塞锥形瓶 ground neck conical flask Erlenmeyer 磨砂标准口锥形瓶，可与真空接收管、磨口塞或冷凝管密闭连接。',
      width: W, height: H, svg: wrapSvg(id, '磨口锥形瓶', W, H, `${body}\n  ${baseLine}\n  ${hi}\n  ${grads}\n  ${fem}`),
      ports: [
        { id: 'mouth', x: cx, y: 4, dx: 0, dy: -1, type: 'glass-female', diameter: 26, depth: 24, edge: [cx - 13, 4, cx + 13, 4], target: [cx, 145] },
        { id: 'base', x: cx, y: 165, dx: 0, dy: 1, type: 'base' },
        { id: 'grip-site', x: cx, y: 24, dx: 1, dy: 0, type: 'grip-site', segment: [cx, 8, cx, 42] },
      ],
    });
  }

  // 16. lab:bent-receiver-adapter (105°弯形接收管 / 尾接管 — vapor-female 105° upper-left + delivery bottom)
  {
    const id = 'bent-receiver-adapter';
    const W = 92, H = 104;
    const ox = -0.965926, oy = -0.258819; // outward normal of inlet (points up-left 105deg from down)
    const fem = angledFemaleJoint(id, 6, 20, ox, oy, 22, 11.5, 9.0);
    const outX = 68, outY = 100;
    const elbow = `<path d="
      M${fem.innerEnd[0] - oy * 8.5} ${fem.innerEnd[1] + ox * 8.5}
      L52 24
      Q74 28 74 52
      V94 L${outX + 3.5} ${outY} L${outX - 4.5} ${outY - 2} V54
      Q${outX - 6} 40 46 39
      L${fem.innerEnd[0] + oy * 8.5} ${fem.innerEnd[1] - ox * 8.5} Z"
      fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    assets.push({
      id, name: '弯形接收管', category: '蒸馏与分馏',
      search: '弯形接收管 105度尾接管 牛角尾接管 bent receiver adapter 接在冷凝管末端，将馏分引入接收瓶。',
      width: W, height: H, svg: wrapSvg(id, '弯形接收管', W, H, `${elbow}\n  ${specularHighlight(63, 48, 86, 2.2, 0.78)}\n  ${fem.svg}`),
      ports: [
        { id: 'inlet', x: fem.lip[0], y: fem.lip[1], dx: r(ox), dy: r(oy), type: 'vapor-female', diameter: fem.diameter, depth: 22, edge: fem.edge },
        { id: 'outlet', x: outX, y: outY, dx: 0, dy: 1, type: 'delivery', diameter: 8, depth: 8, edge: [outX - 4, outY, outX + 4, outY], segment: [outX, 58, outX, outY - 2] },
        { id: 'grip-site', x: outX, y: 66, dx: 1, dy: 0, type: 'grip-site', segment: [outX, 46, outX, 86] },
      ],
    });
  }

  // 17. lab:straight-receiver-adapter (直形接收管 / 尾接管)
  {
    const id = 'straight-receiver-adapter';
    const W = 40, H = 112, cx = 20;
    const fem = verticalFemaleJoint(id, cx, 4, 22, 12, 9.5);
    const tube = `<path d="M${cx - 8} 26 V64 L${cx - 4.5} 84 V108 L${cx + 4.5} 105 V84 L${cx + 8} 64 V26 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    assets.push({
      id, name: '直形接收管', category: '蒸馏与分馏',
      search: '直形接收管 直尾接管 straight receiver delivery adapter 接在冷凝管下端将液体直接导入接收容器。',
      width: W, height: H, svg: wrapSvg(id, '直形接收管', W, H, `${tube}\n  ${specularHighlight(cx - 3.5, 32, 82, 2.2, 0.78)}\n  ${fem}`),
      ports: [
        { id: 'inlet', x: cx, y: 4, dx: 0, dy: -1, type: 'vapor-female', diameter: 24, depth: 22, edge: [cx - 12, 4, cx + 12, 4] },
        { id: 'outlet', x: cx, y: 108, dx: 0, dy: 1, type: 'delivery', diameter: 9, depth: 8, edge: [cx - 4.5, 107, cx + 4.5, 106], segment: [cx, 54, cx, 104] },
        { id: 'grip-site', x: cx, y: 58, dx: 1, dy: 0, type: 'grip-site', segment: [cx, 34, cx, 84] },
      ],
    });
  }

  // 18. lab:vacuum-receiver-adapter (真空接收管 / 带抽气口尾接管 — vapor-female + glass-male + vacuum tube barb)
  {
    const id = 'vacuum-receiver-adapter';
    const W = 116, H = 128, outX = 64;
    const ox = -0.965926, oy = -0.258819;
    const fem = angledFemaleJoint(id, 6, 20, ox, oy, 22, 11.5, 9.0);
    const male = verticalMaleJoint(id, outX, 100, 24, 11.5, 8.8, { dripTip: true });
    const vac = oliveBarb(id, outX + 10, 48, 1, 36, 4.8, 4.0);
    const bodyTube = `<path d="
      M${fem.innerEnd[0] - oy * 8.5} ${fem.innerEnd[1] + ox * 8.5}
      L54 24 Q74 28 74 48 V100 H${outX - 10} V50
      Q${outX - 10} 40 46 39
      L${fem.innerEnd[0] + oy * 8.5} ${fem.innerEnd[1] - ox * 8.5} Z"
      fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    // Drip guide inner stem protruding smoothly into male cone
    const dripInner = `<path d="M${outX} 44 V100 L${outX + 3} 106" fill="none" stroke="${C.inner}" stroke-width="1.3" stroke-linecap="round"/>`;
    assets.push({
      id, name: '真空接收管', category: '蒸馏与分馏',
      search: '真空接收管 带抽气口尾接管 减压蒸馏接收管 vacuum receiver adapter 侧面带真空抽气支管，下端标准磨口密闭接磨口锥形瓶或圆底烧瓶。',
      width: W, height: H, svg: wrapSvg(id, '真空接收管', W, H, `${vac.svg}\n  ${bodyTube}\n  ${dripInner}\n  ${specularHighlight(outX - 6, 52, 95, 2.2, 0.78)}\n  ${fem.svg}\n  ${male}`),
      ports: [
        { id: 'inlet', x: fem.lip[0], y: fem.lip[1], dx: r(ox), dy: r(oy), type: 'vapor-female', diameter: fem.diameter, depth: 22, edge: fem.edge },
        { id: 'outlet', x: outX, y: 124, dx: 0, dy: 1, type: 'glass-male', diameter: 17.6, depth: 24, edge: [outX - 8.8, 124, outX + 8.8, 124] },
        { id: 'vacuum', ...vac.port, type: 'tube' },
        { id: 'grip-site', x: outX, y: 74, dx: 1, dy: 0, type: 'grip-site', segment: [outX, 52, outX, 96] },
      ],
    });
  }

  // 19. lab:cow-receiver-adapter (多头接收管 / 三头牛角分配管)
  {
    const id = 'cow-receiver-adapter';
    const W = 138, H = 148, cx = 74;
    const ox = -0.965926, oy = -0.258819;
    const fem = angledFemaleJoint(id, 6, 22, ox, oy, 22, 11.5, 9.0);
    const vac = oliveBarb(id, cx + 18, 44, 1, 34, 4.8, 4.0);
    // 3 lower male udders: left (-30 deg), center (0 deg), right (+30 deg)
    const aL = rad(-30), aR = rad(30);
    const uL = [Math.sin(aL), Math.cos(aL)];
    const uR = [Math.sin(aR), Math.cos(aR)];
    const mL = angledMaleJoint(id, cx - 18, 112, uL[0], uL[1], 22, 9.5, 7.2);
    const mC = verticalMaleJoint(id, cx, 122, 22, 9.5, 7.2);
    const mR = angledMaleJoint(id, cx + 18, 112, uR[0], uR[1], 22, 9.5, 7.2);
    const tLx = -uL[1], tLy = uL[0];
    const tRx = -uR[1], tRy = uR[0];
    const bulb = `<path d="
      M${fem.innerEnd[0] - oy * 8.5} ${fem.innerEnd[1] + ox * 8.5}
      L62 24 Q92 26 92 52 V76
      C96 86 101 98 ${r(cx + 18 + tRx * 9.5)} ${r(112 + tRy * 9.5)}
      L${r(cx + 18 - tRx * 9.5)} ${r(112 - tRy * 9.5)}
      L${cx + 9.5} 122 H${cx - 9.5}
      L${r(cx - 18 + tLx * 9.5)} ${r(112 + tLy * 9.5)}
      L${r(cx - 18 - tLx * 9.5)} ${r(112 - tLy * 9.5)}
      C50 98 54 86 56 76 V42
      L${fem.innerEnd[0] + oy * 8.5} ${fem.innerEnd[1] - ox * 8.5} Z"
      fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    assets.push({
      id, name: '多头接收管（牛角管）', category: '蒸馏与分馏',
      search: '牛角管 多头接收管 三头分配管 cow receiver adapter 减压分馏收集不同沸点馏分，无需拆卸装置即可转动切换接收瓶。',
      width: W, height: H, svg: wrapSvg(id, '多头接收管（牛角管）', W, H, `${vac.svg}\n  ${bulb}\n  ${specularHighlight(cx - 12, 48, 102, 2.8, 0.78)}\n  ${fem.svg}\n  ${mL.svg}\n  ${mC}\n  ${mR.svg}`),
      ports: [
        { id: 'inlet', x: fem.lip[0], y: fem.lip[1], dx: r(ox), dy: r(oy), type: 'vapor-female', diameter: fem.diameter, depth: 22, edge: fem.edge },
        { id: 'outlet-1', x: mL.tip[0], y: mL.tip[1], dx: r(uL[0]), dy: r(uL[1]), type: 'glass-male', diameter: mL.diameter, depth: 22, edge: mL.edge },
        { id: 'outlet-2', x: cx, y: 144, dx: 0, dy: 1, type: 'glass-male', diameter: 14.4, depth: 22, edge: [cx - 7.2, 144, cx + 7.2, 144] },
        { id: 'outlet-3', x: mR.tip[0], y: mR.tip[1], dx: r(uR[0]), dy: r(uR[1]), type: 'glass-male', diameter: mR.diameter, depth: 22, edge: mR.edge },
        { id: 'vacuum', ...vac.port, type: 'tube' },
        { id: 'grip-site', x: cx, y: 74, dx: 1, dy: 0, type: 'grip-site', segment: [cx, 48, cx, 102] },
      ],
    });
  }

  // 20. lab:thermometer-adapter (磨口温度计套管接头 — top sensor-socket + bottom glass-male)
  {
    const id = 'thermometer-adapter';
    const W = 44, H = 96, cx = 22;
    const screwCap = `<rect x="${cx - 13}" y="4" width="26" height="16" rx="3" fill="${C.tealDark}" stroke="${C.stroke}" stroke-width="2.0"/>
      <line x1="${cx - 8}" y1="4" x2="${cx - 8}" y2="20" stroke="${C.teal}" stroke-width="1.4"/>
      <line x1="${cx}" y1="4" x2="${cx}" y2="20" stroke="${C.teal}" stroke-width="1.4"/>
      <line x1="${cx + 8}" y1="4" x2="${cx + 8}" y2="20" stroke="${C.teal}" stroke-width="1.4"/>`;
    const bodyTube = `<rect x="${cx - 10}" y="20" width="20" height="48" rx="3" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2"/>`;
    const male = verticalMaleJoint(id, cx, 68, 24, 11.5, 8.8);
    assets.push({
      id, name: '磨口温度计套管接头', category: '瓶塞与磨口接头',
      search: '温度计套管 磨口温度计接头 thermometer adapter 带密封螺帽与O型圈的磨口玻璃接头，用于密封固定温度计或毛细管。',
      width: W, height: H, svg: wrapSvg(id, '磨口温度计套管接头', W, H, `${bodyTube}\n  ${specularHighlight(cx - 5, 24, 62, 2.4, 0.78)}\n  ${screwCap}\n  ${male}`),
      ports: [
        { id: 'inlet', x: cx, y: 4, dx: 0, dy: -1, type: 'sensor-socket', diameter: 26, depth: 60, edge: [cx - 13, 4, cx + 13, 4], target: [cx, 66] },
        { id: 'outlet', x: cx, y: 92, dx: 0, dy: 1, type: 'glass-male', diameter: 17.6, depth: 24, edge: [cx - 8.8, 92, cx + 8.8, 92] },
        { id: 'grip-site', x: cx, y: 44, dx: 1, dy: 0, type: 'grip-site', segment: [cx, 26, cx, 62] },
      ],
    });
  }

  // 21. lab:reducing-adapter (磨口变径接头 — wide top glass-female + narrow bottom glass-male)
  {
    const id = 'reducing-adapter';
    const W = 50, H = 98, cx = 25;
    const fem = verticalFemaleJoint(id, cx, 4, 24, 14.5, 12);
    const male = verticalMaleJoint(id, cx, 70, 24, 10.5, 8.0);
    const bodyTube = `<path d="M${cx - 12} 28 V42 L${cx - 10.5} 56 V70 H${cx + 10.5} V56 L${cx + 12} 42 V28 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    assets.push({
      id, name: '磨口变径接头', category: '瓶塞与磨口接头',
      search: '变径接头 大小头 磨口转换头 reducing adapter 连接不同标准磨口尺寸（如24/29转19/26）的玻璃仪器。',
      width: W, height: H, svg: wrapSvg(id, '磨口变径接头', W, H, `${bodyTube}\n  ${specularHighlight(cx - 6, 34, 64, 2.4, 0.78)}\n  ${fem}\n  ${male}`),
      ports: [
        { id: 'inlet', x: cx, y: 4, dx: 0, dy: -1, type: 'glass-female', diameter: 29, depth: 24, edge: [cx - 14.5, 4, cx + 14.5, 4] },
        { id: 'outlet', x: cx, y: 94, dx: 0, dy: 1, type: 'glass-male', diameter: 16, depth: 24, edge: [cx - 8, 94, cx + 8, 94] },
        { id: 'grip-site', x: cx, y: 49, dx: 1, dy: 0, type: 'grip-site', segment: [cx, 32, cx, 66] },
      ],
    });
  }

  // 22. lab:gas-inlet-adapter (磨口气体导入/抽气接头)
  {
    const id = 'gas-inlet-adapter';
    const W = 82, H = 92, cx = 24;
    const male = verticalMaleJoint(id, cx, 64, 24, 11.5, 8.8);
    const dome = `<path d="M${cx - 11.5} 64 V24 C${cx - 11.5} 12 ${cx + 11.5} 12 ${cx + 11.5} 24 V64 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const barb = oliveBarb(id, cx + 11.5, 32, 1, 41, 4.8, 4.0);
    const valve = drawStopcock(id, cx + 32, 32, { w: 14, h: 8, teal: true });
    assets.push({
      id, name: '磨口气体导入接头', category: '瓶塞与磨口接头',
      search: '气体导入接头 抽气头 真空接头 gas inlet vacuum adapter 磨口反应瓶通入惰性气体保护或连接真空管路。',
      width: W, height: H, svg: wrapSvg(id, '磨口气体导入接头', W, H, `${barb.svg}\n  ${dome}\n  ${valve}\n  ${specularHighlight(cx - 5.5, 22, 58, 2.2, 0.78)}\n  ${male}`),
      ports: [
        { id: 'inlet', ...barb.port, type: 'tube' },
        { id: 'outlet', x: cx, y: 88, dx: 0, dy: 1, type: 'glass-male', diameter: 17.6, depth: 24, edge: [cx - 8.8, 88, cx + 8.8, 88] },
        { id: 'grip-site', x: cx, y: 44, dx: 1, dy: 0, type: 'grip-site', segment: [cx, 24, cx, 60] },
      ],
    });
  }

  // 23. lab:pear-shaped-flask (梨形磨口烧瓶)
  {
    const id = 'pear-shaped-flask';
    const W = 104, H = 160, cx = 52;
    const fem = verticalFemaleJoint(id, cx, 4, 24, 12.5, 10);
    const body = `<path d="
      M${cx - 10} 28 V42
      C${cx - 10} 54 ${cx - 46} 76 ${cx - 46} 108
      C${cx - 46} 138 ${cx - 18} 156 ${cx} 156
      C${cx + 18} 156 ${cx + 46} 138 ${cx + 46} 108
      C${cx + 46} 76 ${cx + 10} 54 ${cx + 10} 42 V28 Z"
      fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const hi = '';
    assets.push({
      id, name: '梨形磨口烧瓶', category: '反应容器',
      search: '梨形烧瓶 茄形瓶 pear shaped flask 旋蒸接收瓶 微量蒸馏与浓缩，便于用移液管吸取底部少量残留液体。',
      width: W, height: H, svg: wrapSvg(id, '梨形磨口烧瓶', W, H, `${body}\n  ${hi}\n  ${fem}`),
      ports: [
        { id: 'mouth', x: cx, y: 4, dx: 0, dy: -1, type: 'glass-female', diameter: 25, depth: 24, edge: [cx - 12.5, 4, cx + 12.5, 4], target: [cx, 134] },
        { id: 'base', x: cx, y: 156, dx: 0, dy: 1, type: 'base' },
        { id: 'grip-site', x: cx, y: 24, dx: 1, dy: 0, type: 'grip-site', segment: [cx, 8, cx, 42] },
      ],
    });
  }

  // 24. lab:vigreux-column (刺形分馏柱 — visible staggered glass indentations!)
  {
    const id = 'vigreux-column';
    const W = 54, H = 330, cx = 27;
    const fem = verticalFemaleJoint(id, cx, 4, 24, 12.5, 10);
    const male = verticalMaleJoint(id, cx, 302, 24, 11.5, 8.8);
    const col = `<path d="M${cx - 10} 28 V42 Q${cx - 16} 46 ${cx - 16} 56 V274 Q${cx - 16} 284 ${cx - 11.5} 290 V302 H${cx + 11.5} V290 Q${cx + 16} 284 ${cx + 16} 274 V56 Q${cx + 16} 46 ${cx + 10} 42 V28 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    // Staggered horizontal & upward/downward pointed glass Vigreux indentations
    const spikes = [];
    for (let y = 66; y <= 268; y += 18) {
      spikes.push(`<path d="M${cx - 16} ${y - 4} Q${cx - 3} ${y - 1} ${cx - 3} ${y} Q${cx - 3} ${y + 1} ${cx - 16} ${y + 4}" fill="none" stroke="${C.inner}" stroke-width="1.4"/>`);
      spikes.push(`<path d="M${cx + 16} ${y + 5} Q${cx + 3} ${y + 8} ${cx + 3} ${y + 9} Q${cx + 3} ${y + 10} ${cx + 16} ${y + 13}" fill="none" stroke="${C.inner}" stroke-width="1.4"/>`);
    }
    assets.push({
      id, name: '刺形分馏柱', category: '蒸馏与分馏',
      search: '刺形分馏柱 韦氏分馏柱 Vigreux fractionating column 柱内壁带多组向内玻璃尖刺，增大气液接触面积，用于精密分馏。',
      width: W, height: H, svg: wrapSvg(id, '刺形分馏柱', W, H, `${col}\n  ${spikes.join('\n  ')}\n  ${specularHighlight(cx - 11, 56, 274, 2.4, 0.72)}\n  ${fem}\n  ${male}`),
      ports: [
        { id: 'inlet', x: cx, y: 4, dx: 0, dy: -1, type: 'glass-female', diameter: 25, depth: 24, edge: [cx - 12.5, 4, cx + 12.5, 4] },
        { id: 'outlet', x: cx, y: 326, dx: 0, dy: 1, type: 'glass-male', diameter: 17.6, depth: 24, edge: [cx - 8.8, 326, cx + 8.8, 326] },
        { id: 'grip-site', x: cx, y: 165, dx: 1, dy: 0, type: 'grip-site', segment: [cx, 70, cx, 260] },
      ],
    });
  }

  // 25. lab:pressure-equalizing-funnel (磨口恒压滴液漏斗)
  {
    const id = 'pressure-equalizing-funnel';
    const W = 82, H = 264, cx = 46;
    const fem = verticalFemaleJoint(id, cx, 4, 24, 12.5, 10);
    const male = verticalMaleJoint(id, cx, 236, 24, 11.5, 8.8, { dripTip: false });
    const bypass = `<path d="M${cx - 10} 42 H${cx - 32} Q${cx - 38} 42 ${cx - 38} 48 V174 Q${cx - 38} 180 ${cx - 32} 180 H${cx - 10}" fill="none" stroke="${C.stroke}" stroke-width="7.0" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M${cx - 10} 42 H${cx - 32} Q${cx - 38} 42 ${cx - 38} 48 V174 Q${cx - 38} 180 ${cx - 32} 180 H${cx - 10}" fill="none" stroke="url(#${id}-glass)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`;
    const body = `<path d="M${cx - 10} 28 V48 C${cx - 22} 54 ${cx - 22} 60 ${cx - 22} 70 V142 C${cx - 22} 158 ${cx - 8} 168 ${cx - 8} 174 V236 H${cx + 8} V174 C${cx + 8} 168 ${cx + 22} 158 ${cx + 22} 142 V70 C${cx + 22} 60 ${cx + 22} 54 ${cx + 10} 48 V28 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const valve = drawStopcock(id, cx, 198, { w: 22, h: 9, teal: true });
    const grads = graduationMarks(cx + 20, 74, 140, 5, 5, 6);
    assets.push({
      id, name: '磨口恒压滴液漏斗', category: '加料与滴液',
      search: '恒压滴液漏斗 磨口滴液漏斗 pressure equalizing addition funnel 旁通气压平衡管保证在密闭惰性气体或减压体系中匀速滴加液体。',
      width: W, height: H, svg: wrapSvg(id, '磨口恒压滴液漏斗', W, H, `${bypass}\n  ${body}\n  ${grads}\n  ${specularHighlight(cx - 16, 68, 142, 2.8, 0.78)}\n  ${valve}\n  ${fem}\n  ${male}`),
      ports: [
        { id: 'mouth', x: cx, y: 4, dx: 0, dy: -1, type: 'glass-female', diameter: 25, depth: 24, edge: [cx - 12.5, 4, cx + 12.5, 4], target: [cx, 145] },
        { id: 'outlet', x: cx, y: 260, dx: 0, dy: 1, type: 'glass-male', diameter: 17.6, depth: 24, edge: [cx - 8.8, 260, cx + 8.8, 260] },
        { id: 'grip-site', x: cx, y: 106, dx: 1, dy: 0, type: 'grip-site', segment: [cx, 72, cx, 142] },
      ],
    });
  }

  // 26. lab:soxhlet-extractor (磨口索氏提取器 — clear siphon arm + vapor bypass + top glass-female + bottom glass-male)
  {
    const id = 'soxhlet-extractor';
    const W = 108, H = 266, cx = 54;
    const fem = verticalFemaleJoint(id, cx, 4, 24, 16, 13.5);
    const male = verticalMaleJoint(id, cx, 238, 24, 11.5, 8.8);
    // Left vapor bypass tube
    const vaporBypass = `<path d="M${cx - 8} 214 H${cx - 32} Q${cx - 42} 214 ${cx - 42} 204 V56 Q${cx - 42} 46 ${cx - 32} 46 H${cx - 16}" fill="none" stroke="${C.stroke}" stroke-width="7.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M${cx - 8} 214 H${cx - 32} Q${cx - 42} 214 ${cx - 42} 204 V56 Q${cx - 42} 46 ${cx - 32} 46 H${cx - 16}" fill="none" stroke="url(#${id}-glass)" stroke-width="4.0" stroke-linecap="round" stroke-linejoin="round"/>`;
    // Right siphon return tube (arches UP to near chamber top and returns DOWN into lower stem)
    const siphon = `<path d="M${cx + 22} 178 H${cx + 34} Q${cx + 42} 178 ${cx + 42} 170 V86 C${cx + 42} 72 ${cx + 30} 72 ${cx + 30} 86 V196 Q${cx + 30} 204 ${cx + 22} 204 H${cx + 8}" fill="none" stroke="${C.stroke}" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M${cx + 22} 178 H${cx + 34} Q${cx + 42} 178 ${cx + 42} 170 V86 C${cx + 42} 72 ${cx + 30} 72 ${cx + 30} 86 V196 Q${cx + 30} 204 ${cx + 22} 204 H${cx + 8}" fill="none" stroke="#E0F2FE" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    const chamber = `<path d="M${cx - 16} 28 V50 Q${cx - 22} 54 ${cx - 22} 64 V172 Q${cx - 22} 186 ${cx - 8} 192 V238 H${cx + 8} V192 Q${cx + 22} 186 ${cx + 22} 172 V64 Q${cx + 22} 54 ${cx + 16} 50 V28 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const thimble = `<rect x="${cx - 14}" y="90" width="28" height="86" rx="6" fill="${C.chassisTop}" stroke="${C.tick}" stroke-width="1.2" stroke-dasharray="4 3"/>`;
    assets.push({
      id, name: '磨口索氏提取器', category: '提取与萃取',
      search: '索氏提取器 脂肪抽提器 Soxhlet extractor 固液连续萃取 虹吸管 蒸汽旁通管 回流提取。',
      width: W, height: H, svg: wrapSvg(id, '磨口索氏提取器', W, H, `${vaporBypass}\n  ${siphon}\n  ${chamber}\n  ${thimble}\n  ${specularHighlight(cx - 16, 62, 172, 2.8, 0.78)}\n  ${fem}\n  ${male}`),
      ports: [
        { id: 'inlet', x: cx, y: 4, dx: 0, dy: -1, type: 'glass-female', diameter: 32, depth: 24, edge: [cx - 16, 4, cx + 16, 4] },
        { id: 'outlet', x: cx, y: 262, dx: 0, dy: 1, type: 'glass-male', diameter: 17.6, depth: 24, edge: [cx - 8.8, 262, cx + 8.8, 262] },
        { id: 'grip-site', x: cx, y: 120, dx: 1, dy: 0, type: 'grip-site', segment: [cx, 66, cx, 176] },
      ],
    });
  }

  // 27. lab:kjeldahl-flask (凯氏定氮烧瓶 — characteristic long-neck pear-bulb digestion flask)
  {
    const id = 'kjeldahl-flask';
    const W = 104, H = 224, cx = 52;
    const fem = verticalFemaleJoint(id, cx, 4, 24, 12.5, 10);
    const body = `<path d="
      M${cx - 10} 28 V112
      C${cx - 10} 126 ${cx - 44} 142 ${cx - 44} 174
      C${cx - 44} 202 ${cx - 24} 220 ${cx} 220
      C${cx + 24} 220 ${cx + 44} 202 ${cx + 44} 174
      C${cx + 44} 142 ${cx + 10} 126 ${cx + 10} 112 V28 Z"
      fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const hi = '';
    assets.push({
      id, name: '凯氏定氮烧瓶', category: '反应容器',
      search: '凯氏定氮烧瓶 长颈消解瓶 Kjeldahl flask 食品蛋白质消化 定氮消解与蒸馏用长颈圆底梨形烧瓶。',
      width: W, height: H, svg: wrapSvg(id, '凯氏定氮烧瓶', W, H, `${body}\n  ${specularHighlight(cx - 5.5, 34, 114, 2.4, 0.78)}\n  ${hi}\n  ${fem}`),
      ports: [
        { id: 'mouth', x: cx, y: 4, dx: 0, dy: -1, type: 'glass-female', diameter: 25, depth: 24, edge: [cx - 12.5, 4, cx + 12.5, 4], target: [cx, 198] },
        { id: 'base', x: cx, y: 220, dx: 0, dy: 1, type: 'base' },
        { id: 'grip-site', x: cx, y: 74, dx: 1, dy: 0, type: 'grip-site', segment: [cx, 36, cx, 112] },
      ],
    });
  }

  // 28. lab:kjeldahl-distillation-head (凯氏定氮防溅球/蒸馏头)
  {
    const id = 'kjeldahl-distillation-head';
    const W = 112, H = 152, cx = 34;
    const male = verticalMaleJoint(id, cx, 124, 24, 11.5, 8.8);
    const ux = 0.965926, uy = 0.258819;
    const sideCone = angledMaleJoint(id, 84, 52, ux, uy, 22, 10, 7.8);
    const tx = -uy, ty = ux;
    // Smooth spherical anti-splash Kjeldahl bulb + curved swan neck into 75° vapor delivery cone
    const bulb = `<path d="
      M${cx - 9} 124 V92
      C${cx - 29} 86 ${cx - 29} 40 ${cx - 9} 34
      C${cx - 4} 20 ${cx + 22} 16 ${cx + 36} 30
      L${r(84 - tx * 8)} ${r(52 - ty * 8)}
      L${r(84 + tx * 8)} ${r(52 + ty * 8)}
      L${cx + 24} 44
      C${cx + 27} 66 ${cx + 24} 87 ${cx + 9} 92
      V124 Z"
      fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    // Internal anti-splash curved J-baffle tube inside the Kjeldahl bulb
    const baffle = `<path d="M${cx} 122 V66 C${cx} 52 ${cx - 12} 48 ${cx - 12} 58" fill="none" stroke="${C.inner}" stroke-width="2.0" stroke-linecap="round"/>
      <path d="M${cx + 12} 46 C${cx + 12} 33 ${cx + 23} 33 ${cx + 30} 39" fill="none" stroke="${C.inner}" stroke-width="2.0" stroke-linecap="round"/>`;
    assets.push({
      id, name: '凯氏定氮防溅球', category: '蒸馏与分馏',
      search: '凯氏定氮防溅球 凯氏蒸馏头 氮球 Kjeldahl splash head bulb 防止碱液随蒸汽冲入冷凝管造成测定偏高。',
      width: W, height: H, svg: wrapSvg(id, '凯氏定氮防溅球', W, H, `${bulb}\n  ${baffle}\n  ${specularHighlight(cx - 19, 48, 78, 2.6, 0.78)}\n  ${male}\n  ${sideCone.svg}`),
      ports: [
        { id: 'outlet', x: cx, y: 148, dx: 0, dy: 1, type: 'glass-male', diameter: 17.6, depth: 24, edge: [cx - 8.8, 148, cx + 8.8, 148] },
        { id: 'side', x: sideCone.tip[0], y: sideCone.tip[1], dx: r(ux), dy: r(uy), type: 'vapor-male', diameter: sideCone.diameter, depth: 22, edge: sideCone.edge },
        { id: 'grip-site', x: cx, y: 106, dx: 1, dy: 0, type: 'grip-site', segment: [cx, 92, cx, 120] },
      ],
    });
  }

  // 29. lab:sintered-glass-funnel (玻璃砂芯漏斗)
  {
    const id = 'sintered-glass-funnel';
    const W = 104, H = 196, cx = 52;
    const cup = `<path d="M12 14 V82 C12 104 42 114 44 124 V190 L60 184 V124 C62 114 92 104 92 82 V14 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const rim = `<ellipse cx="${cx}" cy="14" rx="40" ry="7.5" fill="#F8FAFC" stroke="${C.stroke}" stroke-width="2.2"/>`;
    // Porous sintered glass fritted plate (G3/G4)
    const frit = `<rect x="15" y="76" width="74" height="10" rx="2" fill="#E2E8F0" stroke="${C.inner}" stroke-width="1.6"/>
      <line x1="18" y1="81" x2="86" y2="81" stroke="${C.frostStroke}" stroke-width="2.0" stroke-dasharray="2 3"/>`;
    assets.push({
      id, name: '玻璃砂芯漏斗', category: '过滤与分离',
      search: '砂芯漏斗 垂熔玻璃漏斗 sintered fritted glass funnel G3 G4 耐酸碱腐蚀，无需滤纸直接减压抽滤沉淀或晶体的玻璃过滤器。',
      width: W, height: H, svg: wrapSvg(id, '玻璃砂芯漏斗', W, H, `${cup}\n  ${frit}\n  ${rim}\n  ${specularHighlight(22, 24, 72, 3.0, 0.78)}`),
      ports: [
        { id: 'mouth', x: cx, y: 14, dx: 0, dy: -1, type: 'mouth', diameter: 80, depth: 56, edge: [12, 14, 92, 14], target: [cx, 74] },
        { id: 'outlet', x: cx, y: 190, dx: 0, dy: 1, type: 'delivery', diameter: 16, depth: 8, edge: [cx - 8, 184, cx + 8, 184], segment: [cx, 126, cx, 186] },
        { id: 'grip-site', x: cx, y: 145, dx: 1, dy: 0, type: 'grip-site', segment: [cx, 126, cx, 168] },
      ],
    });
  }

  // 30. lab:weighing-bottle (磨口称量瓶 — wide low-form cylindrical glass weighing jar with frosted rim)
  {
    const id = 'weighing-bottle';
    const W = 74, H = 96, cx = 37;
    const fem = verticalFemaleJoint(id, cx, 4, 18, 24, 21.5, { lipH: 3.5, rimExtra: 2.5 });
    const jar = `<path d="M${cx - 24} 22 V84 Q${cx - 24} 92 ${cx - 16} 92 H${cx + 16} Q${cx + 24} 92 ${cx + 24} 84 V22 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const baseLine = `<path d="M${cx - 19} 86 Q${cx} 89 ${cx + 19} 86" fill="none" stroke="${C.inner}" stroke-width="1.1"/>`;
    assets.push({
      id, name: '磨口称量瓶', category: '称量与储存',
      search: '称量瓶 磨口称量瓶 weighing bottle 精密分析称量易吸潮或挥发样品的扁形/高形带磨口玻璃瓶。',
      width: W, height: H, svg: wrapSvg(id, '磨口称量瓶', W, H, `${jar}\n  ${baseLine}\n  ${specularHighlight(cx - 16, 28, 80, 2.8, 0.78)}\n  ${fem}`),
      ports: [
        { id: 'mouth', x: cx, y: 4, dx: 0, dy: -1, type: 'glass-female', diameter: 48, depth: 18, edge: [cx - 24, 4, cx + 24, 4], target: [cx, 78] },
        { id: 'base', x: cx, y: 92, dx: 0, dy: 1, type: 'base' },
      ],
    });
  }

  // 31. lab:iodine-flask (碘量瓶 / 水封瓶 — flared funnel cup around frosted female neck)
  {
    const id = 'iodine-flask';
    const W = 114, H = 176, cx = 57;
    const body = `<path d="M${cx - 11} 36 V52 L${cx - 49} 150 Q${cx - 53} 162 ${cx - 48} 168 Q${cx - 43} 173 ${cx - 34} 173 H${cx + 34} Q${cx + 43} 173 ${cx + 48} 168 Q${cx + 53} 162 ${cx + 49} 150 L${cx + 11} 52 V36 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    // Flared bell water-seal gutter cup surrounding the neck
    const cup = `<path d="M${cx - 23} 6 L${cx - 11} 38 H${cx + 11} L${cx + 23} 6 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <ellipse cx="${cx}" cy="6" rx="23" ry="4" fill="#F8FAFC" stroke="${C.stroke}" stroke-width="2.0"/>`;
    const fem = verticalFemaleJoint(id, cx, 10, 22, 12, 9.5, { lipH: 3.4, rimExtra: 1.5 });
    assets.push({
      id, name: '碘量瓶（水封瓶）', category: '反应容器',
      search: '碘量瓶 水封瓶 iodine flask 磨口喇叭水封槽，加碘化钾溶液液封防止单质碘挥发逸出，用于碘量法滴定。',
      width: W, height: H, svg: wrapSvg(id, '碘量瓶（水封瓶）', W, H, `${body}\n  ${cup}\n  ${fem}\n  ${specularHighlight(cx - 34, 96, 152, 3.2, 0.78)}`),
      ports: [
        { id: 'mouth', x: cx, y: 10, dx: 0, dy: -1, type: 'glass-female', diameter: 24, depth: 22, edge: [cx - 12, 10, cx + 12, 10], target: [cx, 150] },
        { id: 'base', x: cx, y: 173, dx: 0, dy: 1, type: 'base' },
        { id: 'grip-site', x: cx, y: 42, dx: 1, dy: 0, type: 'grip-site', segment: [cx, 28, cx, 56] },
      ],
    });
  }

  // 32. lab:nessler-tube (具塞比色管 — tall flat-bottom graduated colorimetric cylinder with 25/50mL ring mark)
  {
    const id = 'nessler-tube';
    const W = 52, H = 228, cx = 26;
    const fem = verticalFemaleJoint(id, cx, 4, 22, 12, 10);
    const tube = `<path d="M${cx - 12} 26 V218 Q${cx - 12} 224 ${cx - 6} 224 H${cx + 6} Q${cx + 12} 224 ${cx + 12} 218 V26 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const ringMark = `<line x1="${cx - 12}" y1="62" x2="${cx + 12}" y2="62" stroke="${C.tealDark}" stroke-width="1.4"/>
      <text x="${cx}" y="58" font-size="6.8" font-family="Segoe UI, sans-serif" fill="${C.tealDark}" text-anchor="middle">50mL</text>`;
    const grads = graduationMarks(cx + 11, 82, 200, 8, 4, 4.5);
    assets.push({
      id, name: '具塞比色管', category: '计量与比色',
      search: '比色管 具塞比色管 纳氏比色管 Nessler tube colorimetric cylinder 目视比色分析标准管，带有精准定容刻度线和磨砂瓶口。',
      width: W, height: H, svg: wrapSvg(id, '具塞比色管', W, H, `${tube}\n  ${ringMark}\n  ${grads}\n  ${specularHighlight(cx - 7, 32, 214, 2.2, 0.78)}\n  ${fem}`),
      ports: [
        { id: 'mouth', x: cx, y: 4, dx: 0, dy: -1, type: 'glass-female', diameter: 24, depth: 22, edge: [cx - 12, 4, cx + 12, 4], target: [cx, 198] },
        { id: 'base', x: cx, y: 224, dx: 0, dy: 1, type: 'base' },
        { id: 'grip-site', x: cx, y: 120, dx: 1, dy: 0, type: 'grip-site', segment: [cx, 66, cx, 180] },
      ],
    });
  }

  // 33. lab:gas-washing-bottle (磨口气体洗瓶 — Drechsel head + internal dip tube + fritted diffuser!)
  {
    const id = 'gas-washing-bottle';
    const W = 108, H = 228, cx = 54;
    const inBarb = oliveBarb(id, cx - 12, 24, -1, 36, 4.8, 4.0);
    const outBarb = oliveBarb(id, cx + 12, 34, 1, 36, 4.8, 4.0);
    const jar = `<path d="M${cx - 18} 58 V70 L${cx - 32} 84 V212 Q${cx - 32} 224 ${cx - 20} 224 H${cx + 20} Q${cx + 32} 224 ${cx + 32} 212 V84 L${cx + 18} 70 V58 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const joint = verticalMaleJoint(id, cx, 50, 20, 17, 14.5);
    const head = `<path d="M${cx - 17} 50 V18 C${cx - 17} 8 ${cx + 17} 8 ${cx + 17} 18 V50 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2"/>`;
    const dipTube = `<path d="M${cx - 12} 24 H${cx - 4} Q${cx} 24 ${cx} 29 V196" fill="none" stroke="${C.inner}" stroke-width="3.2" stroke-linecap="round"/>
      <rect x="${cx - 6}" y="196" width="12" height="15" rx="3" fill="#E2E8F0" stroke="${C.inner}" stroke-width="1.6"/>`;
    assets.push({
      id, name: '磨口气体洗瓶', category: '气体处理与干燥',
      search: '气体洗瓶 德雷克塞尔洗瓶 gas washing bottle Drechsel 长管进气到底部砂芯气泡分散头，短管出气，用于吸收杂质或干燥气体。',
      width: W, height: H, svg: wrapSvg(id, '磨口气体洗瓶', W, H, `${inBarb.svg}\n  ${outBarb.svg}\n  ${jar}\n  ${dipTube}\n  ${joint}\n  ${head}\n  ${specularHighlight(cx - 24, 90, 210, 3.0, 0.78)}`),
      ports: [
        { id: 'inlet', ...inBarb.port, type: 'tube' },
        { id: 'outlet', ...outBarb.port, type: 'tube' },
        { id: 'base', x: cx, y: 224, dx: 0, dy: 1, type: 'base' },
        { id: 'grip-site', x: cx, y: 120, dx: 1, dy: 0, type: 'grip-site', segment: [cx, 88, cx, 180] },
      ],
    });
  }

  // 34. lab:cold-trap (真空冷阱 — cylindrical vacuum trap with center dip tube & side vacuum port)
  {
    const id = 'cold-trap';
    const W = 104, H = 226, cx = 52;
    const inBarb = oliveBarb(id, cx - 14, 24, -1, 32, 5.2, 4.4);
    const outBarb = oliveBarb(id, cx + 14, 38, 1, 32, 5.2, 4.4);
    const trap = `<path d="M${cx - 22} 58 V192 C${cx - 22} 214 ${cx + 22} 214 ${cx + 22} 192 V58 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const flange = `<rect x="${cx - 26}" y="52" width="52" height="10" rx="3" fill="url(#${id}-frost)" stroke="${C.stroke}" stroke-width="2.0"/>`;
    const head = `<path d="M${cx - 16} 52 V18 C${cx - 16} 8 ${cx + 16} 8 ${cx + 16} 18 V52 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2"/>`;
    const dip = `<path d="M${cx - 14} 24 H${cx - 4} Q${cx} 24 ${cx} 29 V178" fill="none" stroke="${C.inner}" stroke-width="4.4" stroke-linecap="round"/>
      <path d="M${cx - 14} 24 H${cx - 4} Q${cx} 24 ${cx} 29 V178" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>`;
    assets.push({
      id, name: '真空冷阱', category: '真空与无水无氧',
      search: '真空冷阱 液氮冷阱 cold trap 捕集减压蒸馏或真空管路中的低沸点溶剂蒸气，保护油封真空泵。',
      width: W, height: H, svg: wrapSvg(id, '真空冷阱', W, H, `${inBarb.svg}\n  ${outBarb.svg}\n  ${trap}\n  ${dip}\n  ${flange}\n  ${head}\n  ${specularHighlight(cx - 15, 68, 190, 2.8, 0.78)}`),
      ports: [
        { id: 'inlet', ...inBarb.port, type: 'tube' },
        { id: 'outlet', ...outBarb.port, type: 'tube' },
        { id: 'grip-site', x: cx, y: 120, dx: 1, dy: 0, type: 'grip-site', segment: [cx, 72, cx, 180] },
      ],
    });
  }

  // 35. lab:schlenk-line (施伦克双排管 — dual vacuum/inert-gas manifold with 4 oblique double-bore stopcocks!)
  {
    const id = 'schlenk-line';
    const W = 310, H = 134;
    const yGas = 28, yVac = 54;
    const gasIn = oliveBarb(id, 22, yGas, -1, 18, 5.5, 4.5);
    const vacIn = oliveBarb(id, 22, yVac, -1, 18, 5.5, 4.5);
    const manifolds = `
      <rect x="22" y="${yGas - 6.5}" width="268" height="13" rx="6.5" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="22" y="${yVac - 6.5}" width="268" height="13" rx="6.5" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2"/>
      <path d="M290 ${yGas - 4} Q304 ${yGas - 4} 304 ${yGas + 13} Q304 ${yVac + 4} 290 ${yVac + 4}" fill="none" stroke="${C.stroke}" stroke-width="2.0"/>`;
    const taps = [];
    const ports = [
      { id: 'gas-in', ...gasIn.port, type: 'tube' },
      { id: 'vac-in', ...vacIn.port, type: 'tube' },
    ];
    for (let i = 0; i < 4; i++) {
      const tx = 72 + i * 58;
      const barb = verticalOliveBarb(id, tx, 108, 1, 20, 4.6, 3.8);
      ports.push({ id: `tap-${i + 1}`, ...barb.port, type: 'tube' });
      // Dual-branch feed lines from both upper Gas and lower Vacuum manifolds into oblique stopcock
      taps.push(`
        ${barb.svg}
        <path d="M${tx - 6} ${yGas + 6} V75 M${tx + 6} ${yVac + 6} V75" fill="none" stroke="${C.stroke}" stroke-width="4.2" stroke-linecap="round"/>
        <path d="M${tx - 6} ${yGas + 6} V75 M${tx + 6} ${yVac + 6} V75" fill="none" stroke="url(#${id}-glass)" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M${tx - 8} 74 L${tx - 10} 80 V98 L${tx - 4.6} 108 H${tx + 4.6} L${tx + 10} 98 V80 L${tx + 8} 74 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>
        <rect x="${tx - 9}" y="76" width="18" height="22" rx="4" fill="url(#${id}-frost)" stroke="${C.stroke}" stroke-width="1.8"/>
        <line x1="${tx - 6}" y1="81" x2="${tx + 6}" y2="91" stroke="${C.tealDark}" stroke-width="2.0"/>
        <line x1="${tx - 6}" y1="87" x2="${tx + 6}" y2="97" stroke="${C.inner}" stroke-width="1.4"/>
        <rect x="${tx - 15}" y="84" width="6" height="7" rx="1.5" fill="${C.tealDark}" stroke="${C.stroke}" stroke-width="1.4"/>`);
    }
    ports.push({ id: 'grip-site', x: 160, y: 41, dx: 1, dy: 0, type: 'grip-site', segment: [160, 22, 160, 62] });
    assets.push({
      id, name: '施伦克双排管', category: '真空与无水无氧',
      search: '施伦克双排管 Schlenk line 真空惰性气体双排管 无水无氧操作 配备高真空管路、惰性气体管路与多个斜孔二通旋塞。',
      width: W, height: H, svg: wrapSvg(id, '施伦克双排管', W, H, `${gasIn.svg}\n  ${vacIn.svg}\n  ${manifolds}\n  ${specularHighlight(150, yGas - 2, yGas - 2, 1.5, 0.7)}\n  ${taps.join('\n  ')}`),
      ports,
    });
  }

  // 36. lab:vacuum-safety-bottle (真空安全缓冲瓶 — heavy-walled anti-suckback safety trap)
  {
    const id = 'vacuum-safety-bottle';
    const W = 122, H = 200, cx = 61;
    const leftB = oliveBarb(id, cx - 18, 22, -1, 34, 4.8, 4.0);
    const rightB = oliveBarb(id, cx + 18, 22, 1, 34, 4.8, 4.0);
    const bottle = `<path d="M${cx - 22} 50 V66 L${cx - 46} 90 V184 Q${cx - 46} 196 ${cx - 34} 196 H${cx + 34} Q${cx + 46} 196 ${cx + 46} 184 V90 L${cx + 22} 66 V50 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.6" stroke-linejoin="round"/>`;
    const stopper = `<path d="M${cx - 20} 26 H${cx + 20} L${cx + 16} 52 H${cx - 16} Z" fill="${C.bezel}" stroke="${C.stroke}" stroke-width="2.0"/>`;
    const tubes = `<path d="M${cx - 18} 22 H${cx - 8} V96" fill="none" stroke="${C.inner}" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M${cx + 18} 22 H${cx + 8} V74" fill="none" stroke="${C.inner}" stroke-width="3.2" stroke-linecap="round"/>`;
    assets.push({
      id, name: '真空安全缓冲瓶', category: '真空与无水无氧',
      search: '安全瓶 真空安全缓冲瓶 防倒吸瓶 vacuum safety buffer bottle 连接在水泵或真空泵与抽滤装置之间防止倒吸。',
      width: W, height: H, svg: wrapSvg(id, '真空安全缓冲瓶', W, H, `${leftB.svg}\n  ${rightB.svg}\n  ${bottle}\n  ${tubes}\n  ${stopper}\n  ${specularHighlight(cx - 36, 94, 180, 3.2, 0.78)}`),
      ports: [
        { id: 'inlet', ...leftB.port, type: 'tube' },
        { id: 'outlet', ...rightB.port, type: 'tube' },
        { id: 'base', x: cx, y: 196, dx: 0, dy: 1, type: 'base' },
        { id: 'grip-site', x: cx, y: 58, dx: 1, dy: 0, type: 'grip-site', segment: [cx, 48, cx, 72] },
      ],
    });
  }

  // 37. lab:vacuum-capillary (减压蒸馏毛细管 — slender glass capillary tube with top flare & drawn hair-fine tip)
  {
    const id = 'vacuum-capillary';
    const W = 28, H = 226, cx = 14;
    const cap = `<path d="M${cx - 5.5} 6 H${cx + 5.5} L${cx + 4} 14 V152 L${cx + 2.5} 222 H${cx - 2.5} L${cx - 4} 152 V14 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="1.8" stroke-linejoin="round"/>
      <line x1="${cx}" y1="12" x2="${cx}" y2="218" stroke="${C.teal}" stroke-width="1.0"/>`;
    assets.push({
      id, name: '减压蒸馏毛细管', category: '蒸馏与分馏',
      search: '减压蒸馏毛细管 vacuum distillation capillary tube 插入克氏蒸馏头通向烧瓶底部引入极微弱气泡，防止减压蒸馏暴沸。',
      width: W, height: H, svg: wrapSvg(id, '减压蒸馏毛细管', W, H, cap),
      ports: [
        { id: 'probe', x: cx, y: 222, dx: 0, dy: 1, type: 'probe', diameter: 5, depth: 10, edge: [cx - 2.5, 222, cx + 2.5, 222], segment: [cx, 24, cx, 218] },
        { id: 'grip-site', x: cx, y: 80, dx: 1, dy: 0, type: 'grip-site', segment: [cx, 32, cx, 130] },
      ],
    });
  }

  // 38. lab:three-way-stopcock (T形三通玻璃活塞)
  {
    const id = 'three-way-stopcock';
    const W = 96, H = 76, cx = 48, cy = 24;
    const tee = `<path d="M4 ${cy - 6} H${cx - 12} Q${cx} ${cy - 14} ${cx + 12} ${cy - 6} H92 V${cy + 6} H${cx + 12} L${cx + 6} ${cy + 14} V72 H${cx - 6} V${cy + 14} L${cx - 12} ${cy + 6} H4 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const barrel = `<circle cx="${cx}" cy="${cy}" r="11.5" fill="url(#${id}-frost)" stroke="${C.stroke}" stroke-width="2.0"/>
      <path d="M${cx - 7} ${cy} H${cx + 7} M${cx} ${cy} V${cy + 7}" fill="none" stroke="${C.tealDark}" stroke-width="2.4" stroke-linecap="round"/>
      <rect x="${cx - 13}" y="${cy - 3}" width="26" height="6" rx="3" fill="${C.ptfe}" stroke="${C.inner}" stroke-width="1.2"/>`;
    assets.push({
      id, name: 'T形三通玻璃活塞', category: '瓶塞与磨口接头',
      search: '三通活塞 T形三通阀 three way glass stopcock 用于切换气体或液体流向的T形三通玻璃/聚四氟乙烯旋塞阀。',
      width: W, height: H, svg: wrapSvg(id, 'T形三通玻璃活塞', W, H, `${tee}\n  ${barrel}`),
      ports: [
        { id: 'left', x: 4, y: cy, dx: -1, dy: 0, type: 'tube', diameter: 12, depth: 8, edge: [4, cy - 6, 4, cy + 6] },
        { id: 'right', x: 92, y: cy, dx: 1, dy: 0, type: 'tube', diameter: 12, depth: 8, edge: [92, cy - 6, 92, cy + 6] },
        { id: 'bottom', x: cx, y: 72, dx: 0, dy: 1, type: 'tube', diameter: 12, depth: 8, edge: [cx - 6, 72, cx + 6, 72] },
      ],
    });
  }

  // 39. lab:drying-pistol (真空干燥枪 — Abderhalden's drying pistol)
  {
    const id = 'drying-pistol';
    const W = 250, H = 136;
    const jx = 86; // vertical axis of condenser top & flask bottom joints
    const femTop = verticalFemaleJoint(id, jx, 4, 22, 12, 9.5);
    const maleBot = verticalMaleJoint(id, jx, 110, 22, 11.5, 8.8);
    const vacBarb = oliveBarb(id, 214, 70, 1, 30, 4.6, 3.8);
    // Horizontal double-walled heating jacket + inner sample boat tube + right desiccant bulb
    const outerJacket = `<path d="
      M20 50 H${jx - 10} V26 H${jx + 10} V50 H148
      Q158 50 158 60 V80 Q158 90 148 90 H${jx + 10} V110 H${jx - 10} V90 H20
      Q10 90 10 80 V60 Q10 50 20 50 Z"
      fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const innerChamber = `<rect x="6" y="58" width="160" height="24" rx="5" fill="#FFFFFF" stroke="${C.inner}" stroke-width="1.6"/>
      <rect x="40" y="70" width="52" height="7" rx="2" fill="${C.chassisMid}" stroke="${C.inner}" stroke-width="1.1"/>`;
    const desiccantBulb = `<path d="M166 60 H178 C184 44 214 44 214 70 C214 96 184 96 178 80 H166 Z" fill="none" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <circle cx="192" cy="70" r="9" fill="${C.coolFill}" stroke="${C.inner}" stroke-width="1.1" stroke-dasharray="2 2"/>`;
    const stopcock = drawStopcock(id, 172, 70, { w: 12, h: 7, teal: true });
    assets.push({
      id, name: '真空干燥枪', category: '干燥与提纯',
      search: '真空干燥枪 Abderhalden drying pistol 阿布德哈尔登干燥枪 恒温溶剂回流夹套与五氧化二磷/干燥剂真空室，用于少量热敏样品的恒温真空干燥。',
      width: W, height: H, svg: wrapSvg(id, '真空干燥枪', W, H, `${vacBarb.svg}\n  ${outerJacket}\n  ${innerChamber}\n  ${desiccantBulb}\n  ${stopcock}\n  ${femTop}\n  ${maleBot}`),
      ports: [
        { id: 'inlet', x: jx, y: 4, dx: 0, dy: -1, type: 'glass-female', diameter: 24, depth: 22, edge: [jx - 12, 4, jx + 12, 4] },
        { id: 'outlet', x: jx, y: 132, dx: 0, dy: 1, type: 'glass-male', diameter: 17.6, depth: 22, edge: [jx - 8.8, 132, jx + 8.8, 132] },
        { id: 'vacuum', ...vacBarb.port, type: 'tube' },
        { id: 'grip-site', x: jx, y: 70, dx: 1, dy: 0, type: 'grip-site', segment: [jx, 48, jx, 92] },
      ],
    });
  }

  // 40. lab:kipp-generator (启普发生器 — 3-bulb Kipp's gas generator with side delivery stopcock)
  {
    const id = 'kipp-generator';
    const W = 128, H = 264, cx = 56;
    const femTop = verticalFemaleJoint(id, cx, 4, 22, 13, 10.5);
    const outBarb = oliveBarb(id, cx + 38, 126, 1, 26, 4.8, 4.0);
    const stopcock = drawStopcock(id, cx + 49, 126, { w: 14, h: 8, teal: true });
    const glassBody = `<path d="
      M${cx - 12} 26 V40
      C${cx - 40} 48 ${cx - 42} 84 ${cx - 22} 98
      C${cx - 42} 112 ${cx - 42} 148 ${cx - 24} 162
      C${cx - 42} 176 ${cx - 44} 214 ${cx - 24} 230
      L${cx - 34} 252 Q${cx - 36} 260 ${cx - 26} 260 H${cx + 26}
      Q${cx + 36} 260 ${cx + 34} 252 L${cx + 24} 230
      C${cx + 44} 214 ${cx + 42} 176 ${cx + 24} 162
      C${cx + 42} 148 ${cx + 42} 112 ${cx + 22} 98
      C${cx + 42} 84 ${cx + 40} 48 ${cx + 12} 40 V26 Z"
      fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    // Internal long thistle funnel tube reaching down to the bottom reservoir + perforated constricting ring
    const innerFunnel = `<path d="M${cx - 6} 98 V216 M${cx + 6} 98 V216" fill="none" stroke="${C.inner}" stroke-width="1.6"/>
      <line x1="${cx - 23}" y1="162" x2="${cx - 6}" y2="162" stroke="${C.inner}" stroke-width="2.0" stroke-dasharray="3 2"/>
      <line x1="${cx + 6}" y1="162" x2="${cx + 23}" y2="162" stroke="${C.inner}" stroke-width="2.0" stroke-dasharray="3 2"/>
      <circle cx="${cx - 15}" cy="150" r="3.2" fill="#CBD5E1" stroke="${C.inner}" stroke-width="1"/>
      <circle cx="${cx + 15}" cy="150" r="3.2" fill="#CBD5E1" stroke="${C.inner}" stroke-width="1"/>
      <circle cx="${cx - 19}" cy="143" r="3.0" fill="#CBD5E1" stroke="${C.inner}" stroke-width="1"/>`;
    assets.push({
      id, name: '启普发生器', category: '气体发生与反应',
      search: '启普发生器 Kipps generator 块状固体与液体不加热制取氢气二氧化碳硫化氢气体，随开随停。',
      width: W, height: H, svg: wrapSvg(id, '启普发生器', W, H, `${outBarb.svg}\n  ${glassBody}\n  ${innerFunnel}\n  ${stopcock}\n  ${specularHighlight(cx - 27, 56, 86, 2.8, 0.78)}\n  ${specularHighlight(cx - 28, 118, 148, 2.8, 0.78)}\n  ${specularHighlight(cx - 29, 182, 214, 2.8, 0.78)}\n  ${femTop}`),
      ports: [
        { id: 'mouth', x: cx, y: 4, dx: 0, dy: -1, type: 'glass-female', diameter: 26, depth: 22, edge: [cx - 13, 4, cx + 13, 4], target: [cx, 200] },
        { id: 'outlet', ...outBarb.port, type: 'tube' },
        { id: 'base', x: cx, y: 260, dx: 0, dy: 1, type: 'base' },
      ],
    });
  }

  // 41. lab:acid-burette (酸式滴定管 — graduated glass column + PTFE/glass side stopcock + fine tip)
  {
    const id = 'acid-burette';
    const W = 40, H = 340, cx = 20;
    const tube = `<path d="M${cx - 8} 4 L${cx - 6} 10 V274 L${cx - 4} 296 L${cx - 2.5} 336 H${cx + 2.5} L${cx + 4} 296 L${cx + 6} 274 V10 L${cx + 8} 4 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>`;
    const valve = drawStopcock(id, cx, 290, { w: 18, h: 8, glass: true, teal: true });
    const grads = graduationMarks(cx + 5.5, 24, 260, 20, 5, 4.5);
    const labels = `<text x="${cx - 1}" y="29" font-size="6.5" font-family="Segoe UI, sans-serif" fill="${C.tick}" text-anchor="end">0</text>
      <text x="${cx - 1}" y="262" font-size="6.5" font-family="Segoe UI, sans-serif" fill="${C.tick}" text-anchor="end">50</text>`;
    assets.push({
      id, name: '酸式滴定管', category: '滴定与移液',
      search: '酸式滴定管 玻璃旋塞滴定管 acid burette 用于盛装酸性或强氧化性标准溶液（如高锰酸钾、盐酸），玻璃或聚四氟乙烯活塞控制滴速。',
      width: W, height: H, svg: wrapSvg(id, '酸式滴定管', W, H, `${tube}\n  ${grads}\n  ${labels}\n  ${specularHighlight(cx - 3, 18, 266, 1.8, 0.78)}\n  ${valve}`),
      ports: [
        { id: 'mouth', x: cx, y: 4, dx: 0, dy: -1, type: 'mouth', diameter: 16, depth: 10, edge: [cx - 8, 4, cx + 8, 4], target: [cx, 44] },
        { id: 'outlet', x: cx, y: 336, dx: 0, dy: 1, type: 'delivery', diameter: 5, depth: 8, edge: [cx - 2.5, 336, cx + 2.5, 336], segment: [cx, 300, cx, 332] },
        { id: 'grip-site', x: cx, y: 145, dx: 1, dy: 0, type: 'grip-site', segment: [cx, 40, cx, 245] },
      ],
    });
  }

  // 42. lab:alkaline-burette (碱式滴定管 — graduated tube + latex rubber tubing + glass bead pinch valve + tip)
  {
    const id = 'alkaline-burette';
    const W = 40, H = 340, cx = 20;
    const upperTube = `<path d="M${cx - 8} 4 L${cx - 6} 10 V272 H${cx + 6} V10 L${cx + 8} 4 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>`;
    const rubber = `<rect x="${cx - 5.5}" y="272" width="11" height="32" rx="2" fill="${C.amberMid}" stroke="${C.stroke}" stroke-width="1.8"/>
      <circle cx="${cx}" cy="288" r="3.8" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="1.4"/>`;
    const tip = `<path d="M${cx - 4.5} 304 L${cx - 2.5} 336 H${cx + 2.5} L${cx + 4.5} 304 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>`;
    const grads = graduationMarks(cx + 5.5, 24, 260, 20, 5, 4.5);
    const labels = `<text x="${cx - 1}" y="29" font-size="6.5" font-family="Segoe UI, sans-serif" fill="${C.tick}" text-anchor="end">0</text>
      <text x="${cx - 1}" y="262" font-size="6.5" font-family="Segoe UI, sans-serif" fill="${C.tick}" text-anchor="end">50</text>`;
    assets.push({
      id, name: '碱式滴定管', category: '滴定与移液',
      search: '碱式滴定管 胶管玻璃珠滴定管 alkaline burette 下端乳胶管内含玻璃珠，挤压放液，专用于盛装NaOH等碱性标准溶液。',
      width: W, height: H, svg: wrapSvg(id, '碱式滴定管', W, H, `${upperTube}\n  ${tip}\n  ${rubber}\n  ${grads}\n  ${labels}\n  ${specularHighlight(cx - 3, 18, 266, 1.8, 0.78)}`),
      ports: [
        { id: 'mouth', x: cx, y: 4, dx: 0, dy: -1, type: 'mouth', diameter: 16, depth: 10, edge: [cx - 8, 4, cx + 8, 4], target: [cx, 44] },
        { id: 'outlet', x: cx, y: 336, dx: 0, dy: 1, type: 'delivery', diameter: 5, depth: 8, edge: [cx - 2.5, 336, cx + 2.5, 336], segment: [cx, 306, cx, 332] },
        { id: 'grip-site', x: cx, y: 145, dx: 1, dy: 0, type: 'grip-site', segment: [cx, 40, cx, 245] },
      ],
    });
  }

  // 43. lab:volumetric-pipette (大肚移液管 — slender top stem + meniscus mark + central bulb + tapered tip)
  {
    const id = 'volumetric-pipette';
    const W = 32, H = 316, cx = 16;
    const body = `<path d="
      M${cx - 4} 4 V110
      C${cx - 4} 122 ${cx - 12} 128 ${cx - 12} 146
      V176
      C${cx - 12} 194 ${cx - 4} 200 ${cx - 4} 212
      V288 L${cx - 2.5} 312 H${cx + 2.5} L${cx + 4} 288
      V212
      C${cx + 4} 200 ${cx + 12} 194 ${cx + 12} 176
      V146
      C${cx + 12} 128 ${cx + 4} 122 ${cx + 4} 110 V4 Z"
      fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>`;
    const mark = `<line x1="${cx - 4.5}" y1="68" x2="${cx + 4.5}" y2="68" stroke="${C.tealDark}" stroke-width="1.5"/>
      <text x="${cx}" y="164" font-size="7" font-family="Segoe UI, sans-serif" fill="${C.tick}" text-anchor="middle">25</text>`;
    assets.push({
      id, name: '大肚移液管', category: '滴定与移液',
      search: '大肚移液管 单标线移液管 volumetric transfer pipette bulb 精密移取固定体积（如10mL、25mL）的液体溶液。',
      width: W, height: H, svg: wrapSvg(id, '大肚移液管', W, H, `${body}\n  ${mark}\n  ${specularHighlight(cx - 7.5, 136, 186, 2.2, 0.78)}`),
      ports: [
        { id: 'inlet', x: cx, y: 4, dx: 0, dy: -1, type: 'pipette-stem', diameter: 8, depth: 12, edge: [cx - 4, 4, cx + 4, 4] },
        { id: 'outlet', x: cx, y: 312, dx: 0, dy: 1, type: 'delivery', diameter: 5, depth: 8, edge: [cx - 2.5, 312, cx + 2.5, 312], segment: [cx, 224, cx, 308] },
        { id: 'grip-site', x: cx, y: 80, dx: 1, dy: 0, type: 'grip-site', segment: [cx, 24, cx, 108] },
      ],
    });
  }

  // 44. lab:titration-stand (滴定台与蝴蝶夹 — white porcelain base + stainless vertical rod + dual butterfly burette clamp)
  {
    const id = 'titration-stand';
    const W = 186, H = 408, rodX = 93;
    const base = `<rect x="8" y="380" width="170" height="22" rx="4" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="8" y="396" width="170" height="6" rx="2" fill="#E2E8F0" stroke="${C.stroke}" stroke-width="1.6"/>
      <rect x="20" y="402" width="14" height="4" rx="1" fill="${C.bezel}"/>
      <rect x="152" y="402" width="14" height="4" rx="1" fill="${C.bezel}"/>`;
    const rod = `<rect x="${rodX - 4.5}" y="8" width="9" height="372" rx="3" fill="url(#${id}-steel)" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="${rodX - 9}" y="370" width="18" height="10" rx="2" fill="${C.bezel}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    // Butterfly double burette clamp mounted cleanly at y = 148
    const clampY = 148;
    const butterfly = `<g>
      <rect x="${rodX - 11}" y="${clampY - 12}" width="22" height="24" rx="3" fill="${C.bezel}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="${rodX}" cy="${clampY}" r="4.5" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.5"/>
      <path d="M${rodX - 11} ${clampY - 4} H44 C32 ${clampY - 4} 28 ${clampY - 14} 38 ${clampY - 14} M${rodX - 11} ${clampY + 4} H44 C32 ${clampY + 4} 28 ${clampY + 14} 38 ${clampY + 14}" fill="none" stroke="${C.stroke}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M${rodX + 11} ${clampY - 4} H142 C154 ${clampY - 4} 158 ${clampY - 14} 148 ${clampY - 14} M${rodX + 11} ${clampY + 4} H142 C154 ${clampY + 4} 158 ${clampY + 14} 148 ${clampY + 14}" fill="none" stroke="${C.stroke}" stroke-width="2.6" stroke-linecap="round"/>
      <rect x="46" y="${clampY - 9}" width="12" height="18" rx="3" fill="${C.tealDark}" stroke="${C.stroke}" stroke-width="1.6"/>
      <rect x="128" y="${clampY - 9}" width="12" height="18" rx="3" fill="${C.tealDark}" stroke="${C.stroke}" stroke-width="1.6"/>
    </g>`;
    assets.push({
      id, name: '滴定台与蝴蝶夹', category: '支架与夹具',
      search: '滴定台 蝴蝶夹 双管滴定夹 titration stand butterfly burette clamp 白色瓷盘底座清晰衬托滴定终点颜色变化，两侧蝴蝶夹可同时夹持酸碱滴定管。',
      width: W, height: H, svg: wrapSvg(id, '滴定台与蝴蝶夹', W, H, `${base}\n  ${rod}\n  ${butterfly}`),
      ports: [
        { id: 'base', x: rodX, y: 404, dx: 0, dy: 1, type: 'base' },
        { id: 'surface-1', x: rodX, y: 380, dx: 0, dy: -1, type: 'surface', segment: [16, 380, 170, 380] },
        { id: 'rail-1', x: rodX, y: 200, dx: 1, dy: 0, type: 'rail', segment: [rodX, 18, rodX, 366] },
        { id: 'grip-left', x: 35, y: clampY, dx: -1, dy: 0, type: 'grip' },
        { id: 'grip-right', x: 151, y: clampY, dx: 1, dy: 0, type: 'grip' },
      ],
    });
  }

  // 45. lab:alcohol-lamp (酒精灯 — faceted glass alcohol burner with brass wick collar & gentle ethanol flame)
  {
    const id = 'alcohol-lamp';
    const W = 94, H = 136, cx = 47;
    const flame = `<path d="M${cx} 4 C${cx + 12} 22 ${cx + 11} 36 ${cx} 39 C${cx - 11} 36 ${cx - 12} 22 ${cx} 4 Z" fill="${C.brassLight}" stroke="${C.brassDark}" stroke-width="1.3"/>
      <path d="M${cx} 15 C${cx + 6} 26 ${cx + 6} 36 ${cx} 39 C${cx - 6} 36 ${cx - 6} 26 ${cx} 15 Z" fill="${C.teal}"/>`;
    const wickCollar = `<rect x="${cx - 4}" y="38" width="8" height="10" rx="1.5" fill="${C.brassMid}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="${cx - 12}" y="48" width="24" height="9" rx="3" fill="${C.brassMid}" stroke="${C.stroke}" stroke-width="2.0"/>`;
    const body = `<path d="M${cx - 14} 57 H${cx + 14} V66 C${cx + 32} 76 ${cx + 42} 96 ${cx + 40} 118 Q${cx + 39} 132 ${cx + 24} 132 H${cx - 24} Q${cx - 39} 132 ${cx - 40} 118 C${cx - 42} 96 ${cx - 32} 76 ${cx - 14} 66 Z" fill="none" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>
      <path d="M${cx - 36} 104 Q${cx} 107 ${cx + 36} 104 L${cx + 34} 121 Q${cx} 126 ${cx - 34} 121 Z" fill="${C.coolFill}" stroke="${C.teal}" stroke-width="1.2"/>
      <path d="M${cx} 48 V122" fill="none" stroke="${C.inner}" stroke-width="1.4" stroke-dasharray="3 2"/>`;
    assets.push({
      id, name: '酒精灯', category: '加热与温控',
      search: '酒精灯 alcohol lamp spirit burner 玻璃灯体与棉芯，常用于实验室温和加热试管、蒸发皿或烧瓶。',
      width: W, height: H, svg: wrapSvg(id, '酒精灯', W, H, `${flame}\n  ${body}\n  ${wickCollar}\n  ${specularHighlight(cx - 24, 82, 120, 3.0, 0.78)}`),
      ports: [
        { id: 'base', x: cx, y: 132, dx: 0, dy: 1, type: 'base' },
      ],
    });
  }

  // 46. lab:alcohol-blast-burner (酒精喷灯 — brass blast burner with preheat cup & intense jet flame)
  {
    const id = 'alcohol-blast-burner';
    const W = 112, H = 196, cx = 56;
    const jetFlame = `<path d="M${cx} 4 C${cx + 14} 28 ${cx + 10} 52 ${cx} 58 C${cx - 10} 52 ${cx - 14} 28 ${cx} 4 Z" fill="${C.brassLight}" stroke="${C.brassDark}" stroke-width="1.3"/>
      <path d="M${cx} 16 C${cx + 6} 34 ${cx + 5} 52 ${cx} 58 C${cx - 5} 52 ${cx - 6} 34 ${cx} 16 Z" fill="${C.flameCore}" stroke="${C.teal}" stroke-width="1.1"/>`;
    const chimney = `<rect x="${cx - 9}" y="58" width="18" height="62" rx="2" fill="url(#${id}-brass)" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="${cx - 11}" y="72" width="22" height="10" rx="2" fill="${C.bezel}" stroke="${C.stroke}" stroke-width="1.6"/>
      <rect x="${cx - 15}" y="114" width="30" height="8" rx="3" fill="url(#${id}-brass)" stroke="${C.stroke}" stroke-width="1.8"/>`;
    const reservoir = `<rect x="${cx - 34}" y="128" width="68" height="54" rx="10" fill="url(#${id}-brass)" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="${cx - 28}" y="118" width="12" height="10" rx="2" fill="url(#${id}-steel)" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="${cx + 16}" y="122" width="10" height="6" rx="1.5" fill="url(#${id}-steel)" stroke="${C.stroke}" stroke-width="1.6"/>
      <rect x="${cx - 46}" y="182" width="92" height="10" rx="4" fill="${C.bezel}" stroke="${C.stroke}" stroke-width="2.2"/>`;
    assets.push({
      id, name: '酒精喷灯', category: '加热与温控',
      search: '酒精喷灯 座式酒精喷灯 alcohol blast burner 铜质汽化管与预热盘，产生高温强热火焰（约1000°C），用于玻璃加工及高温灼烧。',
      width: W, height: H, svg: wrapSvg(id, '酒精喷灯', W, H, `${jetFlame}\n  ${chimney}\n  ${reservoir}\n  ${specularHighlight(cx - 24, 134, 174, 2.8, 0.52)}`),
      ports: [
        { id: 'base', x: cx, y: 192, dx: 0, dy: 1, type: 'base' },
      ],
    });
  }

  // =========================================================================
  // BENCHTOP ANALYTICAL / FOOD-SCIENCE / CHEMICAL INSTRUMENTS (47 - 55)
  // =========================================================================

  // 47. lab:rotary-evaporator (旋转蒸发仪)
  {
    const id = 'rotary-evaporator';
    const W = 290, H = 264;
    // Condenser column on right (x=204..248, cx=226): vacuum barb top, water-out upper-right, water-in lower-left!
    const vacTop = verticalOliveBarb(id, 226, 22, -1, 16, 4.6, 3.8);
    const waterOut = oliveBarb(id, 248, 48, 1, 22, 4.4, 3.6);
    const waterIn = oliveBarb(id, 204, 128, -1, 22, 4.4, 3.6);

    const standBase = `<rect x="14" y="242" width="262" height="16" rx="4" fill="url(#${id}-chassis)" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="26" y="258" width="16" height="4" rx="1" fill="${C.bezel}"/>
      <rect x="248" y="258" width="16" height="4" rx="1" fill="${C.bezel}"/>`;
    const bath = `<rect x="22" y="182" width="106" height="60" rx="6" fill="url(#${id}-chassis)" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="28" y="176" width="94" height="8" rx="2" fill="url(#${id}-steel)" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="36" y="194" width="50" height="24" rx="3" fill="${C.lcdBg}" stroke="${C.bezel}" stroke-width="1.6"/>
      <text x="61" y="209" font-size="9.5" font-family="Consolas, monospace" fill="${C.lcdGreen}" text-anchor="middle">45.0 °C</text>
      <circle cx="104" cy="206" r="8" fill="url(#${id}-steel)" stroke="${C.stroke}" stroke-width="1.6"/>
      <line x1="104" y1="206" x2="108" y2="201" stroke="${C.tealDark}" stroke-width="1.8"/>
      <rect x="22" y="226" width="106" height="5" fill="${C.tealDark}"/>`;
    const liftColumn = `<rect x="142" y="42" width="28" height="200" rx="3" fill="url(#${id}-chassis)" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="148" y="54" width="16" height="172" rx="2" fill="#E2E8F0" stroke="${C.inner}" stroke-width="1.2"/>`;
    // Coaxial tilted vapor duct & rotary motor drive housing connecting flask cleanly to condenser
    const vaporDuctAndDrive = `
      <path d="M98 134 L182 75 L204 75" fill="none" stroke="${C.stroke}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M98 134 L182 75 L204 75" fill="none" stroke="url(#${id}-glass)" stroke-width="4.8" stroke-linecap="round" stroke-linejoin="round"/>
      <g transform="translate(148, 99) rotate(-35)">
        <rect x="-24" y="-17" width="48" height="34" rx="5" fill="url(#${id}-chassis)" stroke="${C.stroke}" stroke-width="2.2"/>
        <rect x="-18" y="-11" width="36" height="14" rx="2" fill="${C.lcdBg}"/>
        <text x="0" y="-1.5" font-size="7.5" font-family="Consolas, monospace" fill="${C.lcdCyan}" text-anchor="middle">120 rpm</text>
        <circle cx="-12" cy="9" r="3.5" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.2"/>
        <rect x="0" y="6" width="14" height="6" rx="1.5" fill="${C.bezel}"/>
      </g>`;
    const evapFlask = `<g transform="translate(80, 148) rotate(55)">
      <path d="M-7 -36 V-18 C-22 -8 -28 10 -22 24 C-16 36 16 36 22 24 C28 10 22 -8 7 -18 V-36 Z" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M-19 10 Q0 16 19 10 C16 26 -16 26 -19 10 Z" fill="${C.coolFill}" stroke="${C.teal}" stroke-width="1.1"/>
    </g>`;
    // Vertical coil condenser + receiving flask on right
    const condenser = `<rect x="204" y="22" width="44" height="128" rx="12" fill="none" stroke="${C.stroke}" stroke-width="2.2"/>
      <path d="M226 32 C238 38 214 46 226 52 C238 58 214 66 226 72 C238 78 214 86 226 92 C238 98 214 106 226 112 C238 118 214 126 226 134" fill="none" stroke="${C.inner}" stroke-width="2.2" stroke-linecap="round"/>
      <rect x="218" y="150" width="16" height="18" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="1.9"/>
      <circle cx="226" cy="196" r="28" fill="none" stroke="${C.stroke}" stroke-width="2.2"/>
      <path d="M203 206 Q226 210 249 206 A26 26 0 0 1 203 206 Z" fill="${C.coolFill}" stroke="${C.teal}" stroke-width="1.1"/>
      <rect x="214" y="160" width="24" height="6" rx="2" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.4"/>`;
    const body = `${standBase}\n  ${vacTop.svg}\n  ${waterOut.svg}\n  ${waterIn.svg}\n  ${bath}\n  ${liftColumn}\n  ${evapFlask}\n  ${vaporDuctAndDrive}\n  ${condenser}`;
    assets.push({
      id, name: '旋转蒸发仪', category: '干燥与提纯',
      search: '旋转蒸发仪 旋蒸仪 rotary evaporator rotovap 减压蒸馏浓缩溶剂，包含恒温水浴锅、旋转马达、斜置蒸发瓶、盘管冷凝器及接收瓶。',
      width: W, height: H, svg: wrapSvg(id, '旋转蒸发仪', W, H, body),
      ports: [
        { id: 'base', x: 145, y: 260, dx: 0, dy: 1, type: 'base' },
        { id: 'vacuum', ...vacTop.port, type: 'tube' },
        { id: 'water-in', ...waterIn.port, type: 'coolant' },
        { id: 'water-out', ...waterOut.port, type: 'coolant' },
      ],
    });
  }

  // 48. lab:abbe-refractometer (阿贝折光仪)
  {
    const id = 'abbe-refractometer';
    const W = 186, H = 196;
    const base = `<path d="M24 186 L42 132 H144 L162 186 Z" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <rect x="16" y="180" width="154" height="10" rx="3" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="52" y="144" width="82" height="26" rx="3" fill="${C.lcdBg}" stroke="${C.bezel}" stroke-width="1.6"/>
      <text x="93" y="156" font-size="8.5" font-family="Consolas, monospace" fill="${C.lcdGreen}" text-anchor="middle">nD 1.3330</text>
      <text x="93" y="166" font-size="7.5" font-family="Consolas, monospace" fill="${C.lcdCyan}" text-anchor="middle">20.0°C  0.0% Brix</text>`;
    const column = `<rect x="78" y="76" width="30" height="58" rx="3" fill="url(#${id}-steel)" stroke="${C.stroke}" stroke-width="2.2"/>
      <circle cx="93" cy="110" r="14" fill="url(#${id}-chassis)" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="93" cy="110" r="6" fill="${C.tealDark}" stroke="${C.stroke}" stroke-width="1.5"/>`;
    // Hinged double-prism housing, eyepiece telescope, and connected illumination mirror arm
    const prismAndScope = `
      <line x1="108" y1="98" x2="136" y2="98" stroke="${C.stroke}" stroke-width="2.4" stroke-linecap="round"/>
      <ellipse cx="144" cy="98" rx="8" ry="13" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="40" y="66" width="38" height="28" rx="4" fill="url(#${id}-chassis)" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="44" y="54" width="30" height="12" rx="2" fill="url(#${id}-steel)" stroke="${C.stroke}" stroke-width="1.8"/>
      <path d="M104 78 L142 36 L152 46 L112 90 Z" fill="url(#${id}-steel)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <rect x="142" y="28" width="16" height="22" rx="3" transform="rotate(42 150 39)" fill="${C.bezel}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="93" cy="64" r="9" fill="url(#${id}-steel)" stroke="${C.stroke}" stroke-width="1.8"/>
      <line x1="93" y1="64" x2="98" y2="58" stroke="${C.tealDark}" stroke-width="1.8"/>`;
    assets.push({
      id, name: '阿贝折光仪', category: '光学与物性分析',
      search: '阿贝折光仪 折射率仪 Abbe refractometer 测定液体折射率 nD 和糖度 Brix，食品与有机合成纯度鉴定仪器。',
      width: W, height: H, svg: wrapSvg(id, '阿贝折光仪', W, H, `${column}\n  ${prismAndScope}\n  ${base}`),
      ports: [
        { id: 'base', x: 93, y: 190, dx: 0, dy: 1, type: 'base' },
      ],
    });
  }

  // 49. lab:polarimeter (自动旋光仪 — clean orthographic front elevation)
  {
    const id = 'polarimeter';
    const W = 260, H = 128;
    const chassis = `<rect x="10" y="34" width="240" height="80" rx="8" fill="url(#${id}-chassis)" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="24" y="114" width="20" height="6" rx="2" fill="${C.bezel}"/>
      <rect x="216" y="114" width="20" height="6" rx="2" fill="${C.bezel}"/>
      <rect x="10" y="98" width="240" height="5" fill="${C.tealDark}"/>`;
    // Center sample trough cover with transparent polarimeter tube window
    const trough = `<rect x="92" y="20" width="90" height="30" rx="5" fill="url(#${id}-steel)" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="102" y="28" width="70" height="14" rx="3" fill="${C.lcdBg}" stroke="${C.inner}" stroke-width="1.4"/>
      <rect x="108" y="32" width="58" height="6" rx="3" fill="url(#${id}-glass)" stroke="${C.teal}" stroke-width="1.0"/>`;
    // Left LCD control panel + right optical head housing
    const display = `<rect x="22" y="46" width="62" height="44" rx="4" fill="${C.lcdBg}" stroke="${C.bezel}" stroke-width="1.8"/>
      <text x="53" y="61" font-size="10" font-family="Consolas, monospace" fill="${C.lcdGreen}" text-anchor="middle">+12.45°</text>
      <text x="53" y="73" font-size="7" font-family="Consolas, monospace" fill="${C.lcdCyan}" text-anchor="middle">589nm  20.0°C</text>
      <text x="53" y="84" font-size="6.5" font-family="Segoe UI, sans-serif" fill="${C.inner}" text-anchor="middle">AUTO POLARIMETER</text>`;
    const keypad = `<g fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.3">
      <rect x="190" y="54" width="16" height="12" rx="2"/>
      <rect x="210" y="54" width="16" height="12" rx="2"/>
      <rect x="190" y="70" width="16" height="12" rx="2"/>
      <rect x="210" y="70" width="16" height="12" rx="2" fill="${C.teal}"/>
    </g>
    <circle cx="137" cy="72" r="14" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.8"/>
    <circle cx="137" cy="72" r="6" fill="${C.tealLight}" stroke="${C.stroke}" stroke-width="1.2"/>`;
    assets.push({
      id, name: '自动旋光仪', category: '光学与物性分析',
      search: '自动旋光仪 数字旋光仪 automatic polarimeter 589nm钠D线 测定手性化合物、糖类及氨基酸溶液的旋光度与比旋光度。',
      width: W, height: H, svg: wrapSvg(id, '自动旋光仪', W, H, `${trough}\n  ${chassis}\n  ${display}\n  ${keypad}`),
      ports: [
        { id: 'base', x: 130, y: 120, dx: 0, dy: 1, type: 'base' },
      ],
    });
  }

  // 50. lab:muffle-furnace (高温马弗炉 — heavy insulated box furnace with hinged door & PID controller)
  {
    const id = 'muffle-furnace';
    const W = 204, H = 228;
    const cabinet = `<rect x="14" y="14" width="176" height="202" rx="6" fill="url(#${id}-chassis)" stroke="${C.stroke}" stroke-width="2.4"/>
      <rect x="28" y="216" width="18" height="6" rx="2" fill="${C.bezel}"/>
      <rect x="158" y="216" width="18" height="6" rx="2" fill="${C.bezel}"/>
      <rect x="78" y="6" width="48" height="8" rx="2" fill="${C.bezel}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    // Insulated furnace chamber door + ceramic handle + amber sight hole
    const door = `<rect x="28" y="28" width="148" height="114" rx="4" fill="${C.chassisMid}" stroke="${C.bezel}" stroke-width="2.2"/>
      <rect x="38" y="38" width="128" height="94" rx="3" fill="${C.chassisTop}" stroke="${C.inner}" stroke-width="1.6"/>
      <circle cx="102" cy="80" r="10" fill="${C.inner}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="102" cy="80" r="5" fill="${C.amberMid}"/>
      <rect x="152" y="68" width="10" height="36" rx="3" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    // Bottom recessed PID controller strip (light matte LCD)
    const pid = `<rect x="26" y="154" width="152" height="50" rx="4" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.9"/>
      <rect x="36" y="162" width="76" height="34" rx="3" fill="${C.lcdBg}" stroke="${C.stroke}" stroke-width="1.5"/>
      <text x="74" y="176" font-size="10" font-family="Consolas, monospace" fill="${C.redAccent}" text-anchor="middle">PV 950°C</text>
      <text x="74" y="190" font-size="8.5" font-family="Consolas, monospace" fill="${C.lcdGreen}" text-anchor="middle">SV 950°C</text>
      <circle cx="132" cy="179" r="5" fill="${C.redAccent}" stroke="${C.stroke}" stroke-width="1.2"/>
      <rect x="148" y="168" width="20" height="22" rx="2" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.5"/>`;
    assets.push({
      id, name: '高温马弗炉', category: '加热与温控',
      search: '马弗炉 箱式高温炉 灰化炉 muffle furnace 1200度高温灼烧、灰分测定、陶瓷烧结及热重灰化处理设备。',
      width: W, height: H, svg: wrapSvg(id, '高温马弗炉', W, H, `${cabinet}\n  ${door}\n  ${pid}`),
      ports: [
        { id: 'base', x: 102, y: 222, dx: 0, dy: 1, type: 'base' },
      ],
    });
  }

  // 51. lab:blast-drying-oven (电热鼓风干燥箱 — front door with glass window, 2 wire shelves + PID panel)
  {
    const id = 'blast-drying-oven';
    const W = 210, H = 252;
    const cabinet = `<rect x="14" y="12" width="182" height="228" rx="6" fill="url(#${id}-chassis)" stroke="${C.stroke}" stroke-width="2.4"/>
      <rect x="28" y="240" width="18" height="6" rx="2" fill="${C.bezel}"/>
      <rect x="164" y="240" width="18" height="6" rx="2" fill="${C.bezel}"/>`;
    const door = `<rect x="26" y="24" width="158" height="148" rx="4" fill="${C.chassisTop}" stroke="${C.bezel}" stroke-width="2.0"/>
      <rect x="44" y="40" width="112" height="114" rx="4" fill="${C.coolFill}" stroke="${C.bezel}" stroke-width="2.2"/>
      <line x1="48" y1="86" x2="152" y2="86" stroke="${C.inner}" stroke-width="2.2"/>
      <line x1="48" y1="126" x2="152" y2="126" stroke="${C.inner}" stroke-width="2.2"/>
      <rect x="165" y="76" width="9" height="44" rx="3" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.6"/>`;
    const panel = `<rect x="26" y="182" width="158" height="46" rx="4" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.9"/>
      <rect x="36" y="190" width="84" height="30" rx="3" fill="${C.lcdBg}" stroke="${C.stroke}" stroke-width="1.4"/>
      <text x="78" y="203" font-size="9.5" font-family="Consolas, monospace" fill="${C.lcdGreen}" text-anchor="middle">105.0 °C</text>
      <text x="78" y="215" font-size="7.5" font-family="Consolas, monospace" fill="${C.lcdCyan}" text-anchor="middle">FAN ON · TIMING</text>
      <circle cx="138" cy="205" r="5" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.2"/>
      <rect x="154" y="195" width="18" height="20" rx="2" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.4"/>`;
    assets.push({
      id, name: '电热鼓风干燥箱', category: '加热与温控',
      search: '鼓风干燥箱 恒温烘箱 blast drying oven 强制热风循环均匀烘干玻璃仪器、样品水分测定及恒温烘焙。',
      width: W, height: H, svg: wrapSvg(id, '电热鼓风干燥箱', W, H, `${cabinet}\n  ${door}\n  ${panel}`),
      ports: [
        { id: 'base', x: 105, y: 246, dx: 0, dy: 1, type: 'base' },
        { id: 'surface-1', x: 100, y: 126, dx: 0, dy: -1, type: 'surface', segment: [50, 126, 150, 126] },
      ],
    });
  }

  // 52. lab:digital-water-bath (数显恒温水浴锅 — stainless top deck + concentric rings + front PID controller)
  {
    const id = 'digital-water-bath';
    const W = 228, H = 122;
    const deck = `<rect x="18" y="12" width="192" height="18" rx="3" fill="url(#${id}-steel)" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="44" y="6" width="54" height="6" rx="2" fill="#CBD5E1" stroke="${C.stroke}" stroke-width="1.6"/>
      <rect x="130" y="6" width="54" height="6" rx="2" fill="#CBD5E1" stroke="${C.stroke}" stroke-width="1.6"/>`;
    const body = `<rect x="12" y="30" width="204" height="80" rx="6" fill="url(#${id}-chassis)" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="12" y="30" width="204" height="7" fill="${C.tealDark}"/>
      <rect x="24" y="110" width="18" height="6" rx="2" fill="${C.bezel}"/>
      <rect x="186" y="110" width="18" height="6" rx="2" fill="${C.bezel}"/>`;
    const ctrl = `<rect x="34" y="48" width="96" height="46" rx="4" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.9"/>
      <rect x="42" y="55" width="80" height="32" rx="2" fill="${C.lcdBg}" stroke="${C.stroke}" stroke-width="1.4"/>
      <text x="82" y="69" font-size="10.5" font-family="Consolas, monospace" fill="${C.lcdGreen}" text-anchor="middle">37.0 °C</text>
      <text x="82" y="81" font-size="7.5" font-family="Consolas, monospace" fill="${C.lcdCyan}" text-anchor="middle">SET 37.0 °C</text>
      <circle cx="154" cy="71" r="10" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.8"/>
      <line x1="154" y1="71" x2="159" y2="65" stroke="${C.tealDark}" stroke-width="2.0"/>
      <rect x="180" y="61" width="18" height="20" rx="2" fill="${C.redAccent}" stroke="${C.stroke}" stroke-width="1.6"/>`;
    assets.push({
      id, name: '数显恒温水浴锅', category: '加热与温控',
      search: '数显恒温水浴锅 水浴锅 digital water bath PID精确控温，多孔不锈钢上盖支持烧瓶与试管恒温加热反应。',
      width: W, height: H, svg: wrapSvg(id, '数显恒温水浴锅', W, H, `${deck}\n  ${body}\n  ${ctrl}`),
      ports: [
        { id: 'base', x: 114, y: 116, dx: 0, dy: 1, type: 'base' },
        { id: 'surface-1', x: 114, y: 6, dx: 0, dy: -1, type: 'surface', segment: [36, 6, 192, 6] },
      ],
    });
  }

  // 53. lab:hplc-system (高效液相色谱仪 HPLC — modular stacked tower + 4 mobile phase bottles + chromatogram LCD)
  {
    const id = 'hplc-system';
    const W = 216, H = 280;
    // Top mobile phase solvent tray + 4 bottles + capillary feed lines
    const bottles = ['A', 'B', 'C', 'D'].map((lbl, idx) => {
      const bx = 36 + idx * 34;
      const amber = idx === 2;
      return `<rect x="${bx}" y="14" width="24" height="36" rx="4" fill="url(#${id}-${amber ? 'amber' : 'glass'})" stroke="${C.stroke}" stroke-width="1.8"/>
        <rect x="${bx + 6}" y="8" width="12" height="6" rx="1.5" fill="${C.tealDark}" stroke="${C.stroke}" stroke-width="1.4"/>
        <path d="M${bx + 12} 8 V3 H178 V48" fill="none" stroke="${C.inner}" stroke-width="0.9" stroke-opacity="0.65"/>
        <text x="${bx + 12}" y="38" font-size="8" font-family="Segoe UI, sans-serif" fill="${C.stroke}" text-anchor="middle">${lbl}</text>`;
    }).join('\n  ');
    const tray = `<rect x="22" y="48" width="172" height="10" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>`;
    // Stacked modules (Detector / Column / Autosampler / Pump)
    const mods = [
      { y: 58, h: 46, label: 'UV-VIS 254 nm', readout: '0.00 AU' },
      { y: 106, h: 48, label: 'COLUMN 35.0°C', readout: 'C18 4.6x250' },
      { y: 156, h: 56, label: 'AUTOSAMPLER', readout: 'VIAL #12' },
      { y: 214, h: 52, label: 'QUAT PUMP', readout: '14.2 MPa' },
    ];
    const modSvg = mods.map((m, idx) => {
      const extra = idx === 0
        ? `<polyline points="128,96 136,96 142,74 148,96 156,96 162,66 168,96 182,96" fill="none" stroke="${C.lcdGreen}" stroke-width="1.6"/>`
        : idx === 2
        ? `<rect x="134" y="166" width="44" height="36" rx="3" fill="${C.lcdBg}" stroke="${C.inner}" stroke-width="1.4"/>
           <circle cx="147" cy="184" r="5" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.2"/>
           <circle cx="165" cy="184" r="5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.2"/>`
        : '';
      return `<rect x="20" y="${m.y}" width="176" height="${m.h}" rx="4" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.2"/>
        <rect x="20" y="${m.y + 4}" width="5" height="${m.h - 8}" fill="${C.teal}"/>
        <rect x="32" y="${m.y + 10}" width="92" height="${m.h - 20}" rx="3" fill="${C.lcdBg}" stroke="${C.inner}" stroke-width="1.2"/>
        <text x="78" y="${m.y + 22}" font-size="6.8" font-family="Segoe UI, sans-serif" fill="${C.inner}" text-anchor="middle">${m.label}</text>
        <text x="78" y="${m.y + 34}" font-size="7.8" font-family="Consolas, monospace" fill="${C.lcdCyan}" text-anchor="middle">${m.readout}</text>
        ${extra}`;
    }).join('\n  ');
    const feet = `<rect x="32" y="266" width="20" height="6" rx="2" fill="${C.bezel}"/><rect x="164" y="266" width="20" height="6" rx="2" fill="${C.bezel}"/>`;
    assets.push({
      id, name: '高效液相色谱仪', category: '色谱与光谱分析',
      search: '高效液相色谱仪 HPLC 液相 流动相溶剂瓶 四元泵 自动进样器 柱温箱 紫外检测器 定量分析有机物及食品添加剂。',
      width: W, height: H, svg: wrapSvg(id, '高效液相色谱仪', W, H, `${bottles}\n  ${tray}\n  ${modSvg}\n  ${feet}`),
      ports: [
        { id: 'base', x: 108, y: 272, dx: 0, dy: 1, type: 'base' },
      ],
    });
  }

  // 54. lab:gc-system (气相色谱仪 GC — wide chassis, oven door + touchscreen + split/splitless inlet + carrier gas port)
  {
    const id = 'gc-system';
    const W = 248, H = 200;
    const carrier = oliveBarb(id, 18, 128, -1, 14, 4.4, 3.6);
    const body = `<rect x="18" y="28" width="218" height="158" rx="6" fill="url(#${id}-chassis)" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="32" y="186" width="20" height="6" rx="2" fill="${C.bezel}"/>
      <rect x="200" y="186" width="20" height="6" rx="2" fill="${C.bezel}"/>
      <rect x="18" y="28" width="218" height="6" rx="2" fill="${C.tealDark}"/>`;
    // Top-right injector / detector towers
    const towers = `<rect x="148" y="12" width="24" height="16" rx="2" fill="url(#${id}-steel)" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="184" y="12" width="24" height="16" rx="2" fill="url(#${id}-steel)" stroke="${C.stroke}" stroke-width="1.8"/>
      <text x="160" y="23" font-size="6.5" font-family="Segoe UI, sans-serif" fill="${C.stroke}" text-anchor="middle">SSL</text>
      <text x="196" y="23" font-size="6.5" font-family="Segoe UI, sans-serif" fill="${C.stroke}" text-anchor="middle">FID</text>`;
    // Left GC oven door + right touchscreen OLED + louvered vents
    const oven = `<rect x="30" y="48" width="106" height="122" rx="4" fill="#E2E8F0" stroke="${C.bezel}" stroke-width="2.0"/>
      <circle cx="83" cy="108" r="30" fill="none" stroke="${C.inner}" stroke-width="1.8"/>
      <circle cx="83" cy="108" r="24" fill="none" stroke="${C.tealDark}" stroke-width="1.2" stroke-dasharray="4 3"/>
      <rect x="122" y="92" width="8" height="32" rx="2" fill="${C.bezel}"/>`;
    const screen = `<rect x="148" y="48" width="76" height="62" rx="4" fill="${C.lcdBg}" stroke="${C.bezel}" stroke-width="1.8"/>
      <polyline points="154,96 164,96 174,80 194,80 204,64 218,64" fill="none" stroke="${C.lcdCyan}" stroke-width="1.8"/>
      <text x="186" y="60" font-size="8" font-family="Consolas, monospace" fill="${C.lcdGreen}" text-anchor="middle">OVEN 240°C</text>
      <text x="186" y="104" font-size="7" font-family="Consolas, monospace" fill="${C.inner}" text-anchor="middle">He 1.2 mL/min</text>
      <circle cx="164" cy="130" r="5" fill="${C.teal}"/>
      <circle cx="186" cy="130" r="5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.2"/>
      <circle cx="208" cy="130" r="5" fill="${C.bezel}"/>
      <g stroke="${C.tick}" stroke-width="1.6" stroke-linecap="round">
        <line x1="154" y1="150" x2="218" y2="150"/>
        <line x1="154" y1="157" x2="218" y2="157"/>
        <line x1="154" y1="164" x2="218" y2="164"/>
      </g>`;
    assets.push({
      id, name: '气相色谱仪', category: '色谱与光谱分析',
      search: '气相色谱仪 GC gas chromatograph 毛细管柱箱 FID检测器 分流进样口 载气接口 挥发性有机物与农残检测分析。',
      width: W, height: H, svg: wrapSvg(id, '气相色谱仪', W, H, `${carrier.svg}\n  ${towers}\n  ${body}\n  ${oven}\n  ${screen}`),
      ports: [
        { id: 'base', x: 127, y: 192, dx: 0, dy: 1, type: 'base' },
        { id: 'gas-in', ...carrier.port, type: 'tube' },
      ],
    });
  }

  // 55. lab:ftir-spectrometer (傅里叶变换红外光谱仪 FTIR)
  {
    const id = 'ftir-spectrometer';
    const W = 248, H = 160;
    const chassis = `<path d="M16 74 L32 42 H216 L232 74 V142 H16 Z" fill="url(#${id}-chassis)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <rect x="26" y="142" width="18" height="6" rx="2" fill="${C.bezel}"/>
      <rect x="204" y="142" width="18" height="6" rx="2" fill="${C.bezel}"/>
      <rect x="16" y="132" width="216" height="5" fill="${C.tealDark}"/>`;
    // Central ATR diamond crystal press tower & sample stage
    const atr = `<rect x="86" y="42" width="76" height="32" fill="#E2E8F0" stroke="${C.inner}" stroke-width="1.6"/>
      <rect x="114" y="10" width="20" height="44" rx="3" fill="url(#${id}-steel)" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="124" cy="16" r="10" fill="${C.bezel}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="120" y="54" width="8" height="10" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.2"/>
      <line x1="94" y1="68" x2="154" y2="68" stroke="${C.tealDark}" stroke-width="1.4" stroke-dasharray="3 2"/>`;
    // Front IR transmittance spectrum OLED
    const oled = `<rect x="34" y="84" width="132" height="40" rx="4" fill="${C.lcdBg}" stroke="${C.bezel}" stroke-width="1.8"/>
      <polyline points="40,98 58,98 64,114 70,98 92,98 98,119 104,99 122,99 127,115 132,100 140,116 146,98 160,98" fill="none" stroke="${C.lcdCyan}" stroke-width="1.6"/>
      <text x="100" y="92" font-size="6.5" font-family="Consolas, monospace" fill="${C.lcdGreen}" text-anchor="middle">FTIR · 4000-400 cm-1</text>
      <circle cx="196" cy="104" r="10" fill="url(#${id}-steel)" stroke="${C.stroke}" stroke-width="1.8"/>
      <circle cx="196" cy="104" r="3.5" fill="${C.redAccent}"/>`;
    assets.push({
      id, name: '傅里叶变换红外光谱仪', category: '色谱与光谱分析',
      search: '傅里叶变换红外光谱仪 FTIR ATR 红外光谱 分子官能团特征吸收峰鉴定与无损快速检测。',
      width: W, height: H, svg: wrapSvg(id, '傅里叶变换红外光谱仪', W, H, `${chassis}\n  ${atr}\n  ${oled}`),
      ports: [
        { id: 'base', x: 124, y: 148, dx: 0, dy: 1, type: 'base' },
      ],
    });
  }

  return assets;
}

// Self-validation checks before writing disk
function validateAndWrite() {
  fs.mkdirSync(LAB_DIR, { recursive: true });
  const assets = buildAssets();
  const manifestAssets = [];

  const waterCondenserIds = new Set([
    'liebig-condenser',
    'allihn-condenser',
    'graham-condenser',
    'dimroth-condenser',
    'friedrich-condenser',
    'rotary-evaporator',
  ]);

  const seenIds = new Set();
  for (const asset of assets) {
    if (seenIds.has(asset.id)) throw new Error('Duplicate ID: ' + asset.id);
    seenIds.add(asset.id);

    // SVG Tiny / QSvgRenderer safety assertions + Classic Flat verification (0 gradients, 0 url refs, 0 dark screens)
    for (const forbidden of [
      '<filter', '<clipPath', '<mask', '<pattern', '<script', '<image',
      '<linearGradient', '<radialGradient', 'url(#', '#0F172A', 'mix-blend-mode', 'rgba(',
    ]) {
      if (asset.svg.includes(forbidden)) {
        throw new Error(`${asset.id}: forbidden SVG construct '${forbidden}'`);
      }
    }
    if (!asset.svg.includes(`viewBox="0 0 ${r(asset.width)} ${r(asset.height)}"`)) {
      throw new Error(`${asset.id}: mismatched viewBox`);
    }

    // Opposite-side coolant assertion on all water condensers
    if (waterCondenserIds.has(asset.id)) {
      const win = asset.ports.find(p => p.id === 'water-in');
      const wout = asset.ports.find(p => p.id === 'water-out');
      if (!win || !wout) throw new Error(`${asset.id}: missing water-in or water-out`);
      if (win.dx * wout.dx >= 0) throw new Error(`${asset.id}: water-in and water-out must be on opposite sides!`);
      if (!(win.y > wout.y)) throw new Error(`${asset.id}: water-in must be lower (y_in > y_out) than water-out!`);
    }

    // Validate delivery/probe segment collinearity
    for (const port of asset.ports) {
      if ((port.type === 'delivery' || port.type === 'probe') && port.segment) {
        const [x1, y1, x2, y2] = port.segment;
        const ux = x2 - x1, uy = y2 - y1;
        const len = Math.hypot(ux, uy);
        if (len < 1) throw new Error(`${asset.id}/${port.id}: empty shaft segment`);
        const cross = Math.abs((port.x - x1) * (uy / len) - (port.y - y1) * (ux / len));
        if (cross > 0.6) throw new Error(`${asset.id}/${port.id}: shaft segment not collinear with port`);
      }
    }

    const filename = `${asset.id}.svg`;
    const filePath = path.join(LAB_DIR, filename);
    fs.writeFileSync(filePath, asset.svg, 'utf8');
    const sha256 = crypto.createHash('sha256').update(Buffer.from(asset.svg, 'utf8')).digest('hex');

    manifestAssets.push({
      id: `lab:${asset.id}`,
      name: asset.name,
      category: asset.category,
      search: asset.search,
      svg: filename,
      width: r(asset.width),
      height: r(asset.height),
      ports: asset.ports,
      sha256,
      author: 'Chem Studio contributors',
      license: 'WTFPL-2.0',
      origin: 'authored',
    });
  }

  const manifest = {
    format: 'chem-studio-art',
    version: 1,
    assets: manifestAssets,
  };
  fs.writeFileSync(path.join(LAB_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  const attribution = `# Additional Laboratory Artwork

All ${manifestAssets.length} vector illustrations in \`assets/laboratory/\` are generated deterministically by
\`scripts/generate-laboratory-art.cjs\` in Chem Studio's classic flat scientific line-art style
(Qt \`QSvgRenderer\` / pure vector SVG 1.1 compatible, zero gradients, zero embedded rasters, zero filters or clipPaths).

- **Author**: Chem Studio contributors
- **License**: WTFPL-2.0
- **Source & Verification**: Exact file dimensions, connection ports, and SHA-256 digests are recorded in \`manifest.json\`.

## Historical Provenance Note
Prior versions of the 6 seed entries (\`ground-glass-stopper\`, \`clear-reagent-bottle\`, \`amber-reagent-bottle\`,
\`ball-joint\`, \`socket-joint\`, \`friedrich-condenser\`) were adapted from OpenClipart (CC0), Wikimedia Commons
(Public Domain / CC BY-SA 3.0), and Bioicons. All 6 entries have now been completely redrawn from scratch as
clean original Chem Studio vector paths while preserving their exact IDs and port compatibility (and fixing
\`friedrich-condenser\` so coolant ports sit on opposite sides with lower inlet and upper outlet).

No external third-party path geometry remains in \`assets/laboratory/*.svg\`. Connection ports represent
graphical assembly anchors only and do not simulate fluid or chemical reactions.
`;
  fs.writeFileSync(path.join(LAB_DIR, 'ATTRIBUTION.md'), attribution, 'utf8');

  console.log(`Generated ${manifestAssets.length} laboratory SVGs and updated manifest.json + ATTRIBUTION.md`);
}

validateAndWrite();
