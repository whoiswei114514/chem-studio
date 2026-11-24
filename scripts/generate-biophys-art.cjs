'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const BIO_DIR = path.join(ROOT, 'assets', 'biochemistry');
const PHYS_DIR = path.join(ROOT, 'assets', 'physics');

const P = {
  ink: '#333333',
  slate: '#4A4F55',
  muted: '#8C929A',
  lightBorder: '#C8CDD3',
  panelBg: '#F3F4F6',
  panelAlt: '#E5E7EB',
  chassisDark: '#3A3E44',
  tealDark: '#3A3E44',
  teal: '#3E74B4',
  tealLight: '#DCF0F7',
  glassFill: '#EEF4F7',
  glassHighlight: '#FFFFFF',
  screenBg: '#E6EEF2',
  screenBezel: '#3A3E44',
  screenGreen: '#22252A',
  screenCyan: '#2D6DA3',
  screenAmber: '#C88A1E',
  red: '#B8292F',
  black: '#333333',
  blue: '#3E74B4',
  brass: '#E4A838',
  brassLight: '#F3D693',
  copper: '#D48242',
  amber: '#E4A838',
};

const FONT = 'Segoe UI, Arial, sans-serif';
const MONO = 'Consolas, Segoe UI, monospace';

const fmt = (n) => Number(n.toFixed(2));

const FLAT_URL_FILLS = {
  'g-chassis': '#E5E7EB',
  'g-chassis-h': '#E5E7EB',
  'g-bezel': '#3A3E44',
  'g-metal': '#C8CDD3',
  'g-metal-v': '#C8CDD3',
  'g-teal': '#3E74B4',
  'g-glass': '#FFFFFF',
  'g-liquid': '#DCF0F7',
  'g-screen': '#E6EEF2',
  'g-brass': '#E4A838',
  'g-copper': '#D48242',
  'g-rubber': '#595E66',
};

const FLAT_HEX_MAP = {
  '#1F2937': '#333333',
  '#294454': '#333333',
  '#0F172A': '#E6EEF2',
  '#1E293B': '#333333',
  '#334155': '#3A3E44',
  '#475569': '#4A4F55',
  '#3D5968': '#4A4F55',
  '#64748B': '#8C929A',
  '#7E939E': '#8C929A',
  '#94A3B8': '#C8CDD3',
  '#CBD5E1': '#C8CDD3',
  '#C6D2D7': '#C8CDD3',
  '#C4C9D0': '#C8CDD3',
  '#E2E8F0': '#E5E7EB',
  '#E8EEF2': '#E5E7EB',
  '#DCE5E8': '#E5E7EB',
  '#E3E6EB': '#E5E7EB',
  '#F1F5F9': '#F3F4F6',
  '#F8FAFC': '#F3F4F6',
  '#F8FAF9': '#F3F4F6',
  '#F5F6F8': '#F3F4F6',
  '#F8FCFE': '#EEF4F7',
  '#F4F9F8': '#EEF4F7',
  '#E6F2F7': '#EEF4F7',
  '#CBE4EE': '#EEF4F7',
  '#DCEFEB': '#EEF4F7',
  '#14B8A6': '#3E74B4',
  '#258F89': '#3E74B4',
  '#0F766E': '#3A3E44',
  '#115E59': '#3A3E44',
  '#1F6F6B': '#3A3E44',
  '#CCFBF1': '#DCF0F7',
  '#99F6E4': '#DCF0F7',
  '#F0FDFA': '#EEF4F7',
  '#E6F4F3': '#E6EEF2',
  '#E0F2FE': '#DCF0F7',
  '#D9ECF2': '#DCF0F7',
  '#D8EDF5': '#DCF0F7',
  '#72C2DD': '#7ECAE6',
  '#EEF6F1': '#E6EEF2',
  '#34D399': '#22252A',
  '#38BDF8': '#2D6DA3',
  '#FBBF24': '#E4A838',
  '#DC2626': '#B8292F',
  '#C84B31': '#B8292F',
  '#FEE2E2': '#F2DCDC',
  '#2563EB': '#3E74B4',
  '#3A7CA5': '#3E74B4',
  '#D97706': '#E4A838',
  '#C9A048': '#E4A838',
  '#F59E0B': '#D48242',
  '#D79B59': '#D48242',
  '#FDE68A': '#F3D693',
  '#FEF3C7': '#F3D693',
  '#C2410C': '#D48242',
  '#9A3412': '#9E6A2E',
  '#7C2D12': '#8E5A2B',
  '#16A34A': '#5F9A6E',
  '#EAB308': '#E4A838',
};

function flattenSvgPaints(svg) {
  let out = String(svg).replace(/url\(#([^)]+)\)/g, (full, id) => FLAT_URL_FILLS[id] || full);
  out = out.replace(/#[0-9A-Fa-f]{6}\b/g, (hex) => FLAT_HEX_MAP[hex.toUpperCase()] || hex);
  if (/<(linearGradient|radialGradient|filter|clipPath|mask|pattern|image|script)\b/i.test(out)) {
    throw new Error('Forbidden SVG gradient or tag emitted');
  }
  if (/url\(#/i.test(out)) {
    throw new Error('Unresolved url(#...) in SVG output');
  }
  return out;
}

function wrapSvg(w, h, title, body) {
  const raw = `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<title>${title}</title>` +
    `<g stroke="${P.ink}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none">${body}</g></svg>\n`;
  return flattenSvgPaints(raw);
}

// ---------- Reusable Precision Hardware Primitives ----------
function labFeet(x, y, w, footW = 18, footH = 7, inset = 14) {
  return `<rect x="${fmt(x + inset)}" y="${fmt(y)}" width="${footW}" height="${footH}" rx="2" fill="#7C828A" stroke="${P.ink}" stroke-width="1.8"/>` +
    `<rect x="${fmt(x + w - inset - footW)}" y="${fmt(y)}" width="${footW}" height="${footH}" rx="2" fill="#7C828A" stroke="${P.ink}" stroke-width="1.8"/>`;
}

function benchChassis(x, y, w, h, opts = {}) {
  const rx = opts.rx ?? 8;
  const feet = opts.feet !== false ? labFeet(x, y + h, w, opts.footW ?? 20, opts.footH ?? 7, opts.footInset ?? 18) : '';
  const topHighlight = `<line x1="${fmt(x + rx + 2)}" y1="${fmt(y + 3)}" x2="${fmt(x + w - rx - 2)}" y2="${fmt(y + 3)}" stroke="${P.panelBg}" stroke-width="1.5"/>`;
  const innerLine = `<rect x="${fmt(x + 6)}" y="${fmt(y + 8)}" width="${fmt(w - 12)}" height="${fmt(h - 14)}" rx="${Math.max(2, rx - 3)}" fill="none" stroke="#C8CDD3" stroke-width="1.0"/>`;
  return feet +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${opts.fill || P.panelAlt}" stroke="${P.ink}" stroke-width="2.4"/>` +
    topHighlight + innerLine;
}

function oledScreen(x, y, w, h, innerSvg, opts = {}) {
  const rx = opts.rx ?? 4;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx + 2}" fill="${P.screenBezel}" stroke="${P.ink}" stroke-width="1.8"/>` +
    `<rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" rx="${rx}" fill="${opts.green ? '#CBE590' : P.screenBg}" stroke="${P.ink}" stroke-width="1.2"/>` +
    innerSvg;
}

function screenText(x, y, txt, size = 11, color = P.screenGreen, anchor = 'middle', bold = true) {
  return `<text x="${fmt(x)}" y="${fmt(y)}" fill="${color}" stroke="none" font-family="${MONO}" font-size="${size}" font-weight="${bold ? '700' : '400'}" text-anchor="${anchor}">${txt}</text>`;
}

function labelText(x, y, txt, size = 8, color = P.slate, anchor = 'middle', bold = true) {
  return `<text x="${fmt(x)}" y="${fmt(y)}" fill="${color}" stroke="none" font-family="${FONT}" font-size="${size}" font-weight="${bold ? '700' : '400'}" text-anchor="${anchor}">${txt}</text>`;
}

function rotaryKnob(cx, cy, r, angleDeg = -40, opts = {}) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  const px = cx + Math.cos(rad) * (r * 0.68);
  const py = cy + Math.sin(rad) * (r * 0.68);
  let ticks = '';
  if (opts.ticks) {
    const n = opts.ticks;
    for (let i = 0; i < n; i++) {
      const a = (-135 + (270 * i) / (n - 1) - 90) * Math.PI / 180;
      const r1 = r + 2.5, r2 = r + (i % 2 === 0 ? 5.5 : 4);
      ticks += `<line x1="${fmt(cx + Math.cos(a) * r1)}" y1="${fmt(cy + Math.sin(a) * r1)}" x2="${fmt(cx + Math.cos(a) * r2)}" y2="${fmt(cy + Math.sin(a) * r2)}" stroke="${P.muted}" stroke-width="1.2"/>`;
    }
  }
  const innerFill = opts.teal ? P.chassisDark : '#C4C9D0';
  const tickColor = opts.teal ? '#FFFFFF' : P.ink;
  return ticks +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${P.panelBg}" stroke="${P.ink}" stroke-width="1.9"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${fmt(r * 0.78)}" fill="${innerFill}" stroke="${P.slate}" stroke-width="1.3"/>` +
    `<line x1="${cx}" y1="${cy}" x2="${fmt(px)}" y2="${fmt(py)}" stroke="${tickColor}" stroke-width="1.9"/>` +
    `<circle cx="${cx}" cy="${cy}" r="1.6" fill="${tickColor}" stroke="none"/>`;
}

function bncJack(cx, cy, label, ringColor = '#C4C9D0', labelDy = -13) {
  return `<circle cx="${cx}" cy="${cy}" r="8.5" fill="${ringColor}" stroke="${P.ink}" stroke-width="1.9"/>` +
    `<circle cx="${cx}" cy="${cy}" r="5.6" fill="${P.panelAlt}" stroke="${P.slate}" stroke-width="1.1"/>` +
    `<circle cx="${cx}" cy="${cy}" r="3.4" fill="${P.panelBg}" stroke="${P.slate}" stroke-width="1.0"/>` +
    `<circle cx="${cx}" cy="${cy}" r="1.6" fill="${P.brass}" stroke="none"/>` +
    (label ? labelText(cx, cy + labelDy, label, 7.5, P.slate, 'middle', true) : '');
}

function bindingPost(cx, cy, color = P.red, label = '', labelDy = -13, r = 7.5) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" stroke="${P.ink}" stroke-width="1.9"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${fmt(r * 0.52)}" fill="${P.panelBg}" stroke="${P.ink}" stroke-width="1.1"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${fmt(r * 0.28)}" fill="${P.ink}" stroke="none"/>` +
    (label ? labelText(cx, cy + labelDy, label, 8, P.slate, 'middle', true) : '');
}

function softButton(x, y, w, h, label = '', fill = '#F5F6F8', textColor = P.ink) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2.5" fill="${fill}" stroke="${P.ink}" stroke-width="1.6"/>` +
    (label ? labelText(x + w / 2, y + h / 2 + 2.6, label, 6.8, textColor, 'middle', true) : '');
}

function analogMeter(x, y, w, h, opts = {}) {
  const cx = x + w / 2;
  const cy = y + h * 0.87;
  const r = Math.min(w * 0.43, h * 0.70);
  const startDeg = -52, endDeg = 52;
  const toXY = (deg, rad) => {
    const a = (deg - 90) * Math.PI / 180;
    return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad];
  };
  const [ax1, ay1] = toXY(startDeg, r);
  const [ax2, ay2] = toXY(endDeg, r);
  const [mx1, my1] = toXY(startDeg + 4, r * 0.84);
  const [mx2, my2] = toXY(endDeg - 4, r * 0.84);
  let ticks = '';
  const nTicks = opts.ticks || 10;
  for (let i = 0; i <= nTicks; i++) {
    const d = startDeg + ((endDeg - startDeg) * i) / nTicks;
    const major = i % 2 === 0;
    const [tx1, ty1] = toXY(d, r);
    const [tx2, ty2] = toXY(d, r - (major ? 6.5 : 3.8));
    ticks += `<line x1="${fmt(tx1)}" y1="${fmt(ty1)}" x2="${fmt(tx2)}" y2="${fmt(ty2)}" stroke="${P.ink}" stroke-width="${major ? 1.5 : 1.0}"/>`;
  }
  const needleDeg = opts.needleDeg ?? -14;
  const [nx, ny] = toXY(needleDeg, r * 0.94);
  let labels = '';
  if (opts.scaleLabels) {
    const arr = opts.scaleLabels;
    for (let i = 0; i < arr.length; i++) {
      const d = startDeg + ((endDeg - startDeg) * i) / (arr.length - 1);
      const [lx, ly] = toXY(d, r - 12.5);
      labels += labelText(lx, ly + 2.2, arr[i], 6.2, P.slate, 'middle', true);
    }
  }
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${P.screenBezel}" stroke="${P.ink}" stroke-width="2.1"/>` +
    `<rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" rx="3" fill="${P.panelBg}" stroke="${P.slate}" stroke-width="1.2"/>` +
    `<path d="M${fmt(mx1)} ${fmt(my1)} A${fmt(r * 0.84)} ${fmt(r * 0.84)} 0 0 1 ${fmt(mx2)} ${fmt(my2)}" fill="none" stroke="#D2D6DC" stroke-width="2.2"/>` +
    `<path d="M${fmt(ax1)} ${fmt(ay1)} A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(ax2)} ${fmt(ay2)}" fill="none" stroke="${P.ink}" stroke-width="1.6"/>` +
    ticks + labels +
    (opts.symbol ? labelText(cx, y + h * 0.69, opts.symbol, opts.symbolSize || 10.5, P.ink, 'middle', true) : '') +
    `<line x1="${cx}" y1="${fmt(cy)}" x2="${fmt(nx)}" y2="${fmt(ny)}" stroke="${P.red}" stroke-width="2.0"/>` +
    `<circle cx="${cx}" cy="${fmt(cy)}" r="4.5" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.4"/>` +
    `<circle cx="${cx}" cy="${fmt(y + h - 3)}" r="3.2" fill="#C4C9D0" stroke="${P.ink}" stroke-width="1.2"/>`;
}

function ventSlots(x, y, count, w = 24, dy = 5) {
  let out = '';
  for (let i = 0; i < count; i++) {
    out += `<line x1="${x}" y1="${y + i * dy}" x2="${x + w}" y2="${y + i * dy}" stroke="${P.muted}" stroke-width="1.5"/>`;
  }
  return out;
}

function glassHighlight() {
  return '';
}

function frostedBand(x, y, w, h, rx = 1) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${P.panelAlt}" stroke="${P.ink}" stroke-width="1.6"/>`;
}

// =====================================================================
// BIOCHEMISTRY ASSETS (25 overhauled authored + 16 new = 41 authored + 9 online)
// =====================================================================
function buildBiochemistrySpecs() {
  const specs = [];
  const add = (id, name, category, search, w, h, svgFn, extra = {}) => {
    specs.push({
      id: 'bio:' + id,
      name,
      category,
      search,
      svg: id + '.svg',
      width: w,
      height: h,
      ports: extra.ports || [],
      boreCount: -1,
      neckCount: 0,
      license: 'WTFPL-2.0',
      author: 'Chem Studio contributors',
      origin: 'authored',
      notes: extra.notes || '',
      ...(extra.lecturePrintedPages ? { lecturePrintedPages: extra.lecturePrintedPages } : {}),
      ...(extra.lecturePdfPages ? { lecturePdfPages: extra.lecturePdfPages } : {}),
      content: wrapSvg(w, h, name, svgFn(w, h)),
    });
  };

  // 1. graduated-centrifuge-tube
  add('graduated-centrifuge-tube', '刻度离心管', '取样与离心',
    'graduated centrifuge tube 刻度 玻璃 离心管 15mL 50mL', 84, 244, () => {
      let ticks = '';
      for (let i = 0; i <= 10; i++) {
        const y = 60 + i * 11;
        const major = i % 2 === 0;
        ticks += `<line x1="56" y1="${y}" x2="${major ? 41 : 47}" y2="${y}" stroke="${P.slate}" stroke-width="${major ? 1.2 : 0.9}"/>`;
      }
      return `<path d="M26 30 V174 L35 220 Q42 234 49 220 L58 174 V30 Z" fill="url(#g-glass)" stroke="none"/>` +
        `<path d="M28 148 H56 L49 218 Q42 231 35 218 Z" fill="url(#g-liquid)" stroke="none"/>` +
        `<path d="M28 148 Q42 152 56 148" stroke="${P.tealDark}" stroke-width="1.3"/>` +
        `<path d="M26 30 V174 L35 220 Q42 234 49 220 L58 174 V30" fill="none" stroke="${P.ink}" stroke-width="2.6"/>` +
        `<rect x="23" y="10" width="38" height="18" rx="3" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="21" y="25" width="42" height="5" rx="2" fill="#0F766E" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<line x1="28" y1="13" x2="28" y2="23" stroke="#CCFBF1" stroke-width="1.1"/>` +
        `<line x1="34" y1="13" x2="34" y2="23" stroke="#CCFBF1" stroke-width="1.1"/>` +
        `<line x1="40" y1="13" x2="40" y2="23" stroke="#CCFBF1" stroke-width="1.1"/>` +
        `<line x1="46" y1="13" x2="46" y2="23" stroke="#CCFBF1" stroke-width="1.1"/>` +
        `<line x1="52" y1="13" x2="52" y2="23" stroke="#CCFBF1" stroke-width="1.1"/>` +
        `<line x1="56" y1="13" x2="56" y2="23" stroke="#CCFBF1" stroke-width="1.1"/>` +
        glassHighlight(30, 38, 30, 170, 2.8) +
        ticks +
        labelText(42, 48, '15 mL', 6.8, P.slate, 'middle', true);
    }, {
      notes: '带螺旋盖聚丙烯/玻璃刻度离心管，锥形底及清晰液面与刻度线。',
      lecturePrintedPages: [9, 24, 59, 61], lecturePdfPages: [10, 25, 60, 62],
    });

  // 2. glass-pipette-rack
  add('glass-pipette-rack', '玻璃吸量管架', '取样与离心',
    'glass pipette rack 吸量管 移液管 架 玻璃移液管', 240, 148, () => {
      let body = labFeet(18, 128, 204, 18, 7, 12) +
        `<rect x="18" y="116" width="204" height="12" rx="3" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="44" y="34" width="12" height="82" rx="2" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="184" y="34" width="12" height="82" rx="2" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>`;
      // Notch supports
      for (const nx of [44, 184]) {
        for (const ny of [46, 68, 90]) {
          body += `<rect x="${nx - 2}" y="${ny}" width="16" height="5" rx="1.5" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.2"/>`;
        }
      }
      // 3 horizontal graduated glass pipettes
      for (const py of [44, 66, 88]) {
        body += `<path d="M18 ${py} H188 L222 ${py + 3} L188 ${py + 6} H18 Z" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="1.5"/>` +
          `<rect x="14" y="${py - 0.5}" width="6" height="7" rx="1" fill="${P.teal}" stroke="${P.ink}" stroke-width="1.1"/>` +
          glassHighlight(24, py + 1.5, 178, py + 1.5, 1.2);
        for (let tx = 70; tx <= 165; tx += 10) {
          body += `<line x1="${tx}" y1="${py + 0.5}" x2="${tx}" y2="${py + (tx % 20 === 0 ? 4.5 : 3)}" stroke="${P.slate}" stroke-width="0.8"/>`;
        }
      }
      return body;
    }, {
      notes: '水平槽式双立柱玻璃吸量管架，托放三支刻度玻璃移液管。',
      lecturePrintedPages: [6, 11], lecturePdfPages: [7, 12],
    });

  // 3. buchner-funnel (ports: mouth dia=70 at (61,42), outlet dia=28 at (61,196))
  add('buchner-funnel', '布氏漏斗', '分离与纯化',
    'buchner funnel 布氏 抽滤 漏斗 Buchner 瓷漏斗', 122, 218, () => {
      let holes = '';
      for (const hx of [34, 43, 52, 61, 70, 79, 88]) {
        holes += `<circle cx="${hx}" cy="96" r="1.5" fill="${P.slate}" stroke="none"/>`;
        if (hx < 88) holes += `<circle cx="${hx + 4.5}" cy="100" r="1.5" fill="${P.slate}" stroke="none"/>`;
      }
      // Open unsealed porcelain mouth passing through exact port rim points (26,42)-(96,42) and (47,196)-(75,196)
      return `<path d="M26 42 V98 Q26 122 47 136 V196 L52 200 H70 L75 196 V136 Q96 122 96 98 V42 Z" fill="#F8FAF9" stroke="none"/>` +
        `<path d="M28 45 H34 V98 Q34 116 51 131 V195 H48 V135 Q28 121 28 98 Z" fill="#DCE5E8" stroke="none"/>` +
        `<rect x="28" y="92" width="66" height="10" rx="1" fill="#EEF3F4" stroke="none"/>` +
        `<line x1="28" y1="98" x2="94" y2="98" stroke="${P.slate}" stroke-width="1.3" stroke-dasharray="3 3"/>` +
        holes +
        `<line x1="36" y1="112" x2="86" y2="112" stroke="${P.slate}" stroke-width="1.2"/>` +
        `<path d="M20 44 Q20 38 26 42 V98 Q26 122 47 136 V196" fill="none" stroke="${P.ink}" stroke-width="3.4"/>` +
        `<path d="M75 196 V136 Q96 122 96 98 V42 Q102 38 102 44" fill="none" stroke="${P.ink}" stroke-width="3.4"/>` +
        `<line x1="47" y1="196" x2="75" y2="196" stroke="${P.ink}" stroke-width="2.2"/>`;
    }, {
      ports: [
        { id: 'mouth', x: 61, y: 42, dx: 0, dy: -1, type: 'mouth', diameter: 70, depth: 35, target: [61, 93] },
        { id: 'outlet', x: 61, y: 196, dx: 0, dy: 1, type: 'delivery', diameter: 28, depth: 8, segment: [61, 137, 61, 191] },
      ],
      notes: '瓷质布氏漏斗，多孔滤板以虚线剖示，抽滤口与下端斜口对齐连接点。',
      lecturePrintedPages: [21, 51], lecturePdfPages: [22, 52],
    });

  // 4. analytical-balance (orthographic front elevation!)
  add('analytical-balance', '带防风罩分析天平', '分析与计量',
    'analytical balance 分析天平 防风罩 称量 0.1mg 电子天平', 224, 230, () => {
      return labFeet(22, 212, 180, 16, 7, 12) +
        // Draft shield glass chamber (orthographic!)
        `<rect x="36" y="16" width="152" height="156" rx="3" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="3.2"/>` +
        `<rect x="36" y="16" width="152" height="10" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.0"/>` +
        // Side glass door tracks & handles
        `<line x1="46" y1="26" x2="46" y2="172" stroke="${P.slate}" stroke-width="1.2"/>` +
        `<line x1="178" y1="26" x2="178" y2="172" stroke="${P.slate}" stroke-width="1.2"/>` +
        `<rect x="40" y="76" width="5" height="32" rx="1.5" fill="${P.slate}" stroke="none"/>` +
        `<rect x="179" y="76" width="5" height="32" rx="1.5" fill="${P.slate}" stroke="none"/>` +
        glassHighlight(56, 36, 56, 152, 3) +
        glassHighlight(64, 42, 64, 120, 1.5) +
        // Weighing pan & draft ring
        `<ellipse cx="112" cy="152" rx="44" ry="7" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="104" y="159" width="16" height="13" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.5"/>` +
        `<rect x="78" y="166" width="68" height="6" rx="2" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.3"/>` +
        // Lower chassis (clean brushed aluminum without roof bar)
        `<rect x="20" y="172" width="184" height="40" rx="6" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.8"/>` +
        `<line x1="28" y1="175" x2="196" y2="175" stroke="${P.panelBg}" stroke-width="1.4"/>` +
        oledScreen(34, 181, 102, 25, screenText(85, 198, '0.0000 g', 11, P.screenGreen, 'middle')) +
        softButton(144, 184, 24, 18, 'TARE', '#3E74B4', '#FFFFFF') +
        softButton(173, 184, 20, 18, 'CAL', '#E3E6EB', P.ink);
    }, {
      notes: '正视图透明玻璃防风罩、两侧滑门把手、不锈钢称量盘、去皮/校准按键与高对比背光读数屏。',
      lecturePrintedPages: [59, 61], lecturePdfPages: [60, 62],
    });

  // 5. two-pan-balance
  add('two-pan-balance', '托盘天平', '分析与计量',
    'two pan balance 托盘天平 双盘 称量 架盘天平', 246, 178, () => {
      let ticks = '';
      for (let x = 62; x <= 184; x += 6) {
        const major = (x - 62) % 30 === 0;
        ticks += `<line x1="${x}" y1="42" x2="${x}" y2="${major ? 48 : 45}" stroke="${P.slate}" stroke-width="0.9"/>`;
      }
      return labFeet(24, 162, 198, 18, 6, 12) +
        `<rect x="24" y="144" width="198" height="18" rx="4" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.2"/>` +
        // Central pillar
        `<path d="M108 144 L115 44 H131 L138 144 Z" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="115" y="114" width="16" height="18" rx="2" fill="#F8FAFC" stroke="${P.slate}" stroke-width="1.3"/>` +
        `<line x1="119" y1="126" x2="127" y2="126" stroke="${P.slate}" stroke-width="0.9"/>` +
        `<line x1="123" y1="117" x2="123" y2="128" stroke="${P.red}" stroke-width="1.5"/>` +
        // Beam
        `<rect x="44" y="34" width="158" height="10" rx="3" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="48" y="42" width="150" height="7" rx="1" fill="#F8FAFC" stroke="${P.slate}" stroke-width="1.2"/>` +
        ticks +
        `<rect x="92" y="40" width="8" height="10" rx="1.5" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.2"/>` +
        `<polygon points="123,28 118,38 128,38" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.4"/>` +
        // Left & Right pan cradles and pans
        `<line x1="50" y1="44" x2="50" y2="76" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<path d="M26 98 L50 76 L74 98" stroke="${P.slate}" stroke-width="1.5"/>` +
        `<path d="M18 98 H82 Q76 111 50 111 Q24 111 18 98 Z" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<line x1="196" y1="44" x2="196" y2="76" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<path d="M172 98 L196 76 L220 98" stroke="${P.slate}" stroke-width="1.5"/>` +
        `<path d="M164 98 H228 Q222 111 196 111 Q170 111 164 98 Z" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.0"/>` +
        // Leveling thumbscrews
        `<circle cx="38" cy="144" r="4" fill="${P.brass}" stroke="${P.ink}" stroke-width="1.2"/>` +
        `<circle cx="208" cy="144" r="4" fill="${P.brass}" stroke="${P.ink}" stroke-width="1.2"/>`;
    }, {
      notes: '经典托盘天平，包含横梁游码刻度、中央分度盘指针、双金属托盘与调平螺母。',
      lecturePrintedPages: [49, 59], lecturePdfPages: [50, 60],
    });

  // 6. glass-atomizer
  add('glass-atomizer', '实验用玻璃喷雾器', '实验小工具',
    'glass atomizer 喷雾器 气囊 薄层 色谱 TLC 显色喷雾', 300, 300, () => {
      return `<!-- Conical flask reservoir -->` +
        `<path d="M102 112 V146 L58 248 Q54 264 72 266 H166 Q184 264 180 248 L136 146 V112 Z" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<path d="M74 222 H164 L177 250 Q180 261 165 263 H73 Q58 261 61 250 Z" fill="url(#g-liquid)" stroke="none"/>` +
        `<path d="M74 222 Q119 226 164 222" stroke="${P.tealDark}" stroke-width="1.4"/>` +
        glassHighlight(108, 120, 74, 240, 3) +
        // Ground-glass neck & stopper head
        frostedBand(101, 96, 36, 18, 2) +
        // Dip tube inside flask
        `<line x1="119" y1="96" x2="119" y2="254" stroke="${P.slate}" stroke-width="2.4"/>` +
        // Atomizer glass head + spray nozzle left + air tube right
        `<path d="M104 96 V76 Q104 62 119 62 Q134 62 134 76 V96 Z" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<path d="M104 72 H62 L52 75 L62 78 H104" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<path d="M134 72 H162 Q178 72 184 82" fill="none" stroke="${P.ink}" stroke-width="3.2"/>` +
        // Fine spray mist dots
        `<circle cx="40" cy="75" r="1.4" fill="${P.teal}" stroke="none"/>` +
        `<circle cx="30" cy="70" r="1.2" fill="${P.teal}" stroke="none"/>` +
        `<circle cx="30" cy="80" r="1.2" fill="${P.teal}" stroke="none"/>` +
        `<circle cx="20" cy="66" r="1.0" fill="${P.teal}" stroke="none"/>` +
        `<circle cx="20" cy="75" r="1.0" fill="${P.teal}" stroke="none"/>` +
        `<circle cx="20" cy="84" r="1.0" fill="${P.teal}" stroke="none"/>` +
        // Rubber connecting hose & squeeze bulb
        `<path d="M184 82 Q212 95 218 128" fill="none" stroke="${P.tealDark}" stroke-width="6"/>` +
        `<path d="M184 82 Q212 95 218 128" fill="none" stroke="${P.ink}" stroke-width="1.5" stroke-opacity="0.4"/>` +
        `<path d="M214 128 C258 126 278 164 268 196 C258 228 214 234 198 206 C182 178 190 130 214 128 Z" fill="url(#g-rubber)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="210" y="122" width="14" height="10" rx="2" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.5"/>` +
        `<path d="M216 142 C240 144 252 164 248 186" stroke="#99F6E4" stroke-width="2" stroke-opacity="0.55"/>`;
    }, {
      notes: '薄层色谱（TLC）显色玻璃喷雾器：锥形储液瓶、磨口喷头、吸液毛细管、雾化喷嘴与橡胶鼓气球囊。',
      lecturePrintedPages: [13, 14], lecturePdfPages: [14, 15],
    });

  // 7. hair-dryer
  add('hair-dryer', '电吹风', '实验小工具',
    'hair dryer 吹风机 电吹风 干燥 热风 TLC 烘干', 292, 300, () => {
      return `<!-- Cord -->` +
        `<path d="M174 260 C174 282 214 288 238 272" fill="none" stroke="${P.ink}" stroke-width="3.2"/>` +
        // Handle
        `<path d="M156 144 L176 254 H202 L192 144 Z" fill="url(#g-chassis-h)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="168" y="250" width="22" height="12" rx="3" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.6"/>` +
        // Rocker switches on handle
        `<rect x="157" y="170" width="12" height="26" rx="3" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<rect x="160" y="206" width="12" height="20" rx="3" fill="${P.teal}" stroke="${P.ink}" stroke-width="1.6"/>` +
        // Barrel + nozzle
        `<path d="M56 76 L216 56 C246 56 260 78 260 106 C260 134 246 156 216 156 L56 136 Z" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<path d="M56 76 L34 80 V132 L56 136 Z" fill="${P.slate}" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="52" y="75" width="8" height="62" rx="2" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<line x1="84" y1="84" x2="196" y2="72" stroke="#FFFFFF" stroke-width="3" stroke-opacity="0.8"/>` +
        // Rear intake grille
        `<path d="M236 68 V144 M244 74 V138 M251 82 V130" stroke="${P.slate}" stroke-width="1.5"/>` +
        `<line x1="216" y1="58" x2="216" y2="154" stroke="#CBD5E1" stroke-width="1.2"/>`;
    }, {
      notes: '实验室吹风机/热风干燥器：集中风嘴、流线型隔热机壳、进风散热栅、多档温控开关与尾线护套。',
      lecturePrintedPages: [13, 14], lecturePdfPages: [14, 15],
    });

  // 8. microliter-syringe
  add('microliter-syringe', '微量进样器', '取样与离心',
    'microliter syringe 微量进样器 注射器 微升 色谱进样 5uL', 108, 300, () => {
      let ticks = '';
      for (let i = 0; i <= 10; i++) {
        const y = 94 + i * 9.5;
        const major = i % 2 === 0;
        ticks += `<line x1="62" y1="${y}" x2="${major ? 49 : 55}" y2="${y}" stroke="${P.ink}" stroke-width="${major ? 1.1 : 0.8}"/>`;
      }
      return `<!-- Plunger button & fine wire rod -->` +
        `<rect x="34" y="10" width="40" height="8" rx="3" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="48" y="18" width="12" height="10" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.5"/>` +
        `<line x1="54" y1="28" x2="54" y2="132" stroke="${P.slate}" stroke-width="1.6"/>` +
        // Finger flange collar
        `<rect x="32" y="66" width="44" height="8" rx="3" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="44" y="74" width="20" height="8" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.5"/>` +
        // Thick-wall borosilicate glass barrel
        `<rect x="41" y="82" width="26" height="120" rx="2" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="47" y="84" width="14" height="116" fill="#FFFFFF" fill-opacity="0.45" stroke="${P.slate}" stroke-width="0.9"/>` +
        // Plunger tip inside
        `<rect x="47.5" y="129" width="13" height="6" fill="${P.ink}" stroke="none"/>` +
        glassHighlight(44, 88, 44, 196, 2) +
        ticks +
        labelText(45, 97, '5', 7, P.ink, 'end', true) +
        labelText(45, 192, '0', 7, P.ink, 'end', true) +
        labelText(78, 146, '5 uL', 7.5, P.tealDark, 'start', true) +
        // Needle lock nut & hub
        `<rect x="43" y="202" width="22" height="14" rx="2" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<polygon points="48,216 60,216 57,228 51,228" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.5"/>` +
        // Fine stainless needle
        `<line x1="54" y1="228" x2="54" y2="288" stroke="${P.ink}" stroke-width="1.4"/>` +
        `<polygon points="53.3,288 54.7,288 54.7,294 53.3,291" fill="${P.ink}" stroke="none"/>`;
    }, {
      notes: '精密微量进样器：金属拇指按盘、细推杆、厚壁硼硅玻璃刻度筒（0–5 µL）、锁紧螺帽与平头/斜口不锈钢进样针。',
      lecturePrintedPages: [45, 47], lecturePdfPages: [46, 48],
    });

  // 9. scalpel
  add('scalpel', '解剖刀', '实验小工具',
    'scalpel 解剖刀 手术刀 刀片', 82, 243, () => {
      return `<!-- Curved surgical blade -->` +
        `<path d="M41 114 L34 106 L34 62 Q34 26 49 12 Q51 44 47 114 Z" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<path d="M39 102 V68 L44 62 V102 Z" fill="${P.slate}" stroke="none"/>` +
        // Brushed handle with ribbed grip
        `<path d="M35 114 H48 L51 226 Q42 235 33 226 Z" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<line x1="36" y1="138" x2="48" y2="138" stroke="${P.slate}" stroke-width="1.2"/>` +
        `<line x1="36" y1="145" x2="48" y2="145" stroke="${P.slate}" stroke-width="1.2"/>` +
        `<line x1="36" y1="152" x2="48" y2="152" stroke="${P.slate}" stroke-width="1.2"/>` +
        `<line x1="36" y1="159" x2="48" y2="159" stroke="${P.slate}" stroke-width="1.2"/>` +
        `<line x1="36" y1="166" x2="48" y2="166" stroke="${P.slate}" stroke-width="1.2"/>` +
        `<line x1="39" y1="176" x2="39" y2="218" stroke="#FFFFFF" stroke-width="1.4" stroke-opacity="0.7"/>`;
    }, {
      notes: '可换刀片式不锈钢解剖刀：弯刃手术刀片、插槽卡口与带防滑刻纹的不锈钢刀柄。',
      lecturePrintedPages: [49], lecturePdfPages: [50],
    });

  // 10. porcelain-staining-tray (clean orthographic front cutaway elevation!)
  add('porcelain-staining-tray', '白瓷盘 / 染色脱色槽', '电泳与成像',
    'porcelain staining tray 白瓷盘 染色 脱色 凝胶 膜', 245, 146, () => {
      return `<!-- Clean orthographic shallow tray elevation + slight top lip -->` +
        `<rect x="18" y="34" width="209" height="84" rx="8" fill="#FFFFFF" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="24" y="40" width="197" height="72" rx="5" fill="#F1F5F9" stroke="${P.slate}" stroke-width="1.4"/>` +
        // Staining bath liquid inside
        `<rect x="28" y="54" width="189" height="54" rx="4" fill="#CCFBF1" fill-opacity="0.65" stroke="${P.tealDark}" stroke-width="1.2"/>` +
        // Submerged gel/membrane sheet with subtle blank outline (no fake bands)
        `<rect x="52" y="64" width="141" height="34" rx="2" fill="#E6F2F7" stroke="${P.tealDark}" stroke-width="1.4" stroke-dasharray="4 3"/>` +
        glassHighlight(34, 46, 208, 46, 2.2) +
        labelText(122.5, 25, 'STAINING / DESTAINING TRAY', 7.5, P.muted, 'middle', true);
    }, {
      notes: '正交俯/正视白瓷浅槽，内含染色脱色液及整片凝胶/膜放置区，无多余透视变形。',
      lecturePrintedPages: [45, 47], lecturePdfPages: [46, 48],
    });

  // 11. dialysis-bag
  add('dialysis-bag', '透析袋', '分离与纯化',
    'dialysis bag 透析袋 半透膜 透析 脱盐', 116, 232, () => {
      return `<!-- Top tie loop & clamp -->` +
        `<circle cx="58" cy="18" r="8" fill="none" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<path d="M40 34 C33 64 33 166 40 198 H76 C83 166 83 64 76 34 Z" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<path d="M38 112 Q58 116 78 112 L75 194 H41 Z" fill="url(#g-liquid)" stroke="none"/>` +
        `<path d="M38 112 Q58 116 78 112" stroke="${P.tealDark}" stroke-width="1.3"/>` +
        // Membrane folds
        `<path d="M46 44 Q43 115 46 190" stroke="${P.slate}" stroke-width="0.9" stroke-opacity="0.45"/>` +
        `<path d="M70 44 Q73 115 70 190" stroke="${P.slate}" stroke-width="0.9" stroke-opacity="0.45"/>` +
        glassHighlight(42, 46, 42, 186, 2.4) +
        // Top & bottom dialysis clips
        `<rect x="31" y="26" width="54" height="10" rx="3" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="31" y="196" width="54" height="10" rx="3" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<line x1="39" y1="31" x2="77" y2="31" stroke="#FFFFFF" stroke-width="1.1" stroke-opacity="0.7"/>` +
        `<line x1="39" y1="201" x2="77" y2="201" stroke="#FFFFFF" stroke-width="1.1" stroke-opacity="0.7"/>`;
    }, {
      notes: '半透膜透析袋：上下双色夹闭密封夹、悬挂环、柔韧膜褶与内部缓冲液面。',
      lecturePrintedPages: [49, 51], lecturePdfPages: [50, 52],
    });

  // 12. tissue-homogenizer
  add('tissue-homogenizer', '高速组织捣碎机', '生化设备',
    'tissue homogenizer 组织捣碎机 匀浆机 匀浆杯', 184, 248, () => {
      return labFeet(30, 232, 124, 16, 6, 10) +
        // Motor base
        `<path d="M30 232 L40 166 H144 L154 232 Z" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="40" y="166" width="104" height="8" rx="2" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.6"/>` +
        rotaryKnob(92, 200, 14, 35, { ticks: 7, teal: true }) +
        `<circle cx="54" cy="200" r="4" fill="${P.screenGreen}" stroke="${P.ink}" stroke-width="1.2"/>` +
        `<rect x="122" y="193" width="14" height="14" rx="2" fill="${P.red}" stroke="${P.ink}" stroke-width="1.3"/>` +
        // Glass jar + lid + handle
        `<rect x="134" y="56" width="32" height="78" fill="none" stroke="none"/>` +
        `<path d="M138 56 H162 Q168 56 168 64 V126 Q168 134 160 134 H128" fill="none" stroke="${P.ink}" stroke-width="5"/>` +
        `<path d="M138 56 H162 Q168 56 168 64 V126 Q168 134 160 134 H128" fill="none" stroke="#E2E8F0" stroke-width="2.2"/>` +
        `<path d="M44 38 L58 158 H126 L140 38 Z" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<path d="M54 114 H130 L125 155 H59 Z" fill="url(#g-liquid)" stroke="none"/>` +
        `<rect x="58" y="156" width="68" height="10" rx="2" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        // Internal shaft & blades
        `<line x1="92" y1="156" x2="92" y2="124" stroke="${P.slate}" stroke-width="2.4"/>` +
        `<path d="M74 132 L110 124 M74 124 L110 132" stroke="${P.ink}" stroke-width="2.2"/>` +
        glassHighlight(52, 46, 63, 148, 2.8) +
        // Lid
        `<rect x="40" y="24" width="104" height="14" rx="4" fill="${P.slate}" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="76" y="14" width="32" height="10" rx="3" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.8"/>`;
    }, {
      notes: '杯式高速组织捣碎机：重型变频底座、玻璃匀浆杯、不锈钢十字刀组、密封杯盖与手柄。',
      lecturePrintedPages: [24, 49], lecturePdfPages: [25, 50],
    });

  // 13. gel-chromatography-column (ports: mouth dia=44 at (51,17), outlet dia=16 at (51,273), grip at (51,110))
  add('gel-chromatography-column', '葡聚糖 / CMC 层析柱', '分离与纯化',
    'gel chromatography column 层析柱 葡聚糖 CMC Sephadex 色谱柱', 104, 294, () => {
      return `<path d="M29 17 V224 L43 242 V273 H59 V242 L73 224 V17 Z" fill="url(#g-glass)" stroke="none"/>` +
        // Sintered frit disc
        `<rect x="30" y="220" width="42" height="6" rx="2" fill="#E2E8F0" stroke="${P.slate}" stroke-width="1.3"/>` +
        `<line x1="33" y1="223" x2="69" y2="223" stroke="${P.slate}" stroke-width="1.0" stroke-dasharray="2 3"/>` +
        // Open unsealed flared glass walls hitting exact mouth (29,17)-(73,17) and outlet (43,273)-(59,273)
        `<path d="M23 14 Q29 14 29 17 V224 L43 242 V273" fill="none" stroke="${P.ink}" stroke-width="3.4"/>` +
        `<path d="M59 273 V242 L73 224 V17 Q73 14 79 14" fill="none" stroke="${P.ink}" stroke-width="3.4"/>` +
        // PTFE stopcock valve
        `<rect x="41" y="247" width="20" height="13" rx="2" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<line x1="26" y1="253.5" x2="78" y2="253.5" stroke="${P.ink}" stroke-width="3.2"/>` +
        `<circle cx="78" cy="253.5" r="4.5" fill="#F8FAFC" stroke="${P.ink}" stroke-width="1.6"/>` +
        glassHighlight(34, 28, 34, 212, 2.8);
    }, {
      ports: [
        { id: 'mouth', x: 51, y: 17, dx: 0, dy: -1, type: 'mouth', diameter: 44, depth: 24, target: [51, 209] },
        { id: 'outlet', x: 51, y: 273, dx: 0, dy: 1, type: 'delivery', diameter: 16, depth: 8, segment: [51, 263, 51, 270] },
        { id: 'grip', x: 51, y: 110, dx: 1, dy: 0, type: 'grip-site', diameter: 0, segment: [51, 40, 51, 210] },
      ],
      notes: '独立玻璃层析柱：顶部扩口、底部烧结砂芯滤板、聚四氟乙烯活塞阀与垂直流出滴管。',
      lecturePrintedPages: [51, 58, 59, 60], lecturePdfPages: [52, 59, 60, 61],
    });

  // 14. membrane-electrophoresis-tank (orthographic cutaway! ports: negative (44,32), positive (238,32))
  add('membrane-electrophoresis-tank', '膜 / 干胶水平电泳槽', '电泳与成像',
    'membrane electrophoresis tank 醋酸纤维膜 干胶 滤纸桥 水平 电泳槽', 282, 186, () => {
      return labFeet(24, 166, 234, 18, 6, 12) +
        // Clear acrylic housing
        `<rect x="20" y="42" width="242" height="124" rx="5" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="2.2"/>` +
        // Safety lid with terminals
        `<rect x="16" y="32" width="250" height="12" rx="3" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.0"/>` +
        // Left & right buffer wells
        `<rect x="26" y="102" width="70" height="58" rx="2" fill="url(#g-liquid)" stroke="${P.slate}" stroke-width="1.2"/>` +
        `<rect x="186" y="102" width="70" height="58" rx="2" fill="url(#g-liquid)" stroke="${P.slate}" stroke-width="1.2"/>` +
        // Central divider walls & bridge support
        `<rect x="96" y="88" width="8" height="76" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<rect x="178" y="88" width="8" height="76" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<rect x="104" y="84" width="74" height="8" rx="1.5" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="1.5"/>` +
        // Filter paper wicks & cellulose acetate membrane
        `<path d="M56 150 V84 Q56 78 64 78 H110" fill="none" stroke="#FFFFFF" stroke-width="4"/>` +
        `<path d="M56 150 V84 Q56 78 64 78 H110" fill="none" stroke="${P.slate}" stroke-width="1.3"/>` +
        `<path d="M226 150 V84 Q226 78 218 78 H172" fill="none" stroke="#FFFFFF" stroke-width="4"/>` +
        `<path d="M226 150 V84 Q226 78 218 78 H172" fill="none" stroke="${P.slate}" stroke-width="1.3"/>` +
        `<rect x="108" y="75" width="66" height="6" rx="1" fill="#F8FAFC" stroke="${P.tealDark}" stroke-width="1.5"/>` +
        // Platinum electrodes
        `<line x1="44" y1="36" x2="44" y2="148" stroke="${P.slate}" stroke-width="1.6"/>` +
        `<line x1="238" y1="36" x2="238" y2="148" stroke="${P.red}" stroke-width="1.6"/>` +
        bindingPost(44, 32, P.black, '', -13, 7) + labelText(30, 35, '-', 11, P.ink, 'middle', true) +
        bindingPost(238, 32, P.red, '', -13, 7) + labelText(252, 35, '+', 10, P.red, 'middle', true) +
        glassHighlight(26, 50, 26, 152, 2.5);
    }, {
      ports: [
        { id: 'negative', x: 44, y: 32, dx: 0, dy: -1, type: 'wire', diameter: 0 },
        { id: 'positive', x: 238, y: 32, dx: 0, dy: -1, type: 'wire', diameter: 0 },
      ],
      notes: '正交剖视膜/干胶水平电泳槽：双侧缓冲液池、铂丝电极、中央支架、滤纸桥、醋酸纤维薄膜与顶盖接线柱。',
      lecturePrintedPages: [16, 17, 45, 47], lecturePdfPages: [17, 18, 46, 48],
    });

  // 15. disc-electrophoresis-tank (280x300, ports EXACTLY centered on terminals!)
  add('disc-electrophoresis-tank', '圆盘 / 管式电泳槽', '电泳与成像',
    'disc electrophoresis tank 圆盘 管式 玻璃管 电泳槽 PAGE', 280, 300, () => {
      let tubes = '';
      for (const tx of [96, 125, 154, 183]) {
        tubes += `<ellipse cx="${tx}" cy="126" rx="8" ry="3.5" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.3"/>` +
          `<rect x="${tx - 4.5}" y="100" width="9" height="134" rx="1" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="1.4"/>` +
          `<line x1="${tx - 2}" y1="106" x2="${tx - 2}" y2="228" stroke="#FFFFFF" stroke-width="1" stroke-opacity="0.75"/>`;
      }
      return labFeet(44, 282, 192, 16, 6, 10) +
        `<rect x="38" y="268" width="204" height="14" rx="4" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.0"/>` +
        // Vertical support rods
        `<rect x="60" y="68" width="6" height="200" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.5"/>` +
        `<rect x="214" y="68" width="6" height="200" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.5"/>` +
        // Lower buffer tank
        `<path d="M40 166 V254 Q40 268 140 268 Q240 268 240 254 V166 Z" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<path d="M42 204 H238 V254 Q238 265 140 265 Q42 265 42 254 Z" fill="url(#g-liquid)" stroke="none"/>` +
        `<ellipse cx="140" cy="166" rx="100" ry="15" fill="#F8FAFC" fill-opacity="0.45" stroke="${P.ink}" stroke-width="1.8"/>` +
        // Upper buffer chamber
        `<path d="M74 62 V124 Q74 136 140 136 Q206 136 206 124 V62 Z" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<path d="M76 92 H204 V124 Q204 134 140 134 Q76 134 76 124 Z" fill="url(#g-liquid)" stroke="none"/>` +
        `<ellipse cx="140" cy="62" rx="66" ry="12" fill="#F8FAFC" fill-opacity="0.65" stroke="${P.ink}" stroke-width="1.8"/>` +
        tubes +
        glassHighlight(50, 178, 50, 248, 2.8) +
        // Upper cathode (-) lead & post at (94, 34)
        `<path d="M94 34 V86 H112" stroke="${P.ink}" stroke-width="1.6"/>` +
        bindingPost(94, 34, P.black, '', -13, 7) + labelText(79, 37, '-', 11, P.ink, 'middle', true) +
        // Lower anode (+) lead & post at (254, 212)
        `<path d="M254 212 H226 V246 H204" stroke="${P.red}" stroke-width="1.6"/>` +
        bindingPost(254, 212, P.red, '', -13, 7) + labelText(269, 216, '+', 10, P.red, 'middle', true);
    }, {
      ports: [
        { id: 'negative', x: 94, y: 34, dx: 0, dy: -1, type: 'wire', diameter: 0 },
        { id: 'positive', x: 254, y: 212, dx: 1, dy: 0, type: 'wire', diameter: 0 },
      ],
      notes: '圆盘管式电泳槽：同轴上下透明缓冲液槽、密封胶圈、四支垂直玻璃凝胶管及对齐的负/正接线柱。',
      lecturePrintedPages: [54, 55], lecturePdfPages: [55, 56],
    });

  // 16. agarose-electrophoresis-tank (orthographic! ports: negative (44, 32), positive (234, 32))
  add('agarose-electrophoresis-tank', '琼脂糖水平电泳槽', '电泳与成像',
    'agarose electrophoresis tank 琼脂糖 水平 电泳槽 DNA 核酸电泳', 278, 174, () => {
      let wells = '';
      for (let i = 0; i < 6; i++) {
        wells += `<rect x="78" y="${96 + i * 7.5}" width="6" height="4.5" rx="0.8" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="0.9"/>`;
      }
      return labFeet(24, 154, 230, 18, 6, 12) +
        `<rect x="20" y="42" width="238" height="112" rx="5" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="16" y="32" width="246" height="12" rx="3" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.0"/>` +
        // Running buffer level
        `<rect x="24" y="88" width="230" height="62" rx="2" fill="url(#g-liquid)" stroke="none"/>` +
        `<line x1="24" y1="88" x2="254" y2="88" stroke="${P.tealDark}" stroke-width="1.3"/>` +
        // Gel casting tray + agarose slab inside
        `<rect x="64" y="82" width="150" height="64" rx="2" fill="#FFFFFF" fill-opacity="0.7" stroke="${P.slate}" stroke-width="1.5"/>` +
        `<rect x="70" y="90" width="138" height="50" rx="1.5" fill="#E6F2F7" stroke="${P.tealDark}" stroke-width="1.2"/>` +
        wells +
        // Platinum wire electrodes on both sides
        `<line x1="44" y1="36" x2="44" y2="144" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<line x1="234" y1="36" x2="234" y2="144" stroke="${P.red}" stroke-width="1.8"/>` +
        bindingPost(44, 32, P.black, '', -13, 7) + labelText(30, 35, '-', 11, P.ink, 'middle', true) +
        bindingPost(234, 32, P.red, '', -13, 7) + labelText(248, 35, '+', 10, P.red, 'middle', true) +
        glassHighlight(27, 50, 27, 142, 2.5);
    }, {
      ports: [
        { id: 'negative', x: 44, y: 32, dx: 0, dy: -1, type: 'wire', diameter: 0 },
        { id: 'positive', x: 234, y: 32, dx: 0, dy: -1, type: 'wire', diameter: 0 },
      ],
      notes: '琼脂糖水平电泳槽：安全防触电顶盖、浸没式紫外透射凝胶托盘、加样孔、铂电极与正负接线柱。',
      lecturePrintedPages: [64, 65, 68], lecturePdfPages: [65, 66, 69],
    });

  // 17. incubator-shaker (orthographic front elevation!)
  add('incubator-shaker', '恒温摇床', '生化设备',
    'incubator shaker 恒温摇床 振荡培养 摇菌', 238, 240, () => {
      return benchChassis(22, 16, 194, 206, { rx: 9, accentBar: true, footW: 20, footH: 7 }) +
        // Upper control panel with dark OLED
        `<rect x="34" y="30" width="170" height="36" rx="4" fill="#E2E8F0" stroke="${P.slate}" stroke-width="1.4"/>` +
        oledScreen(40, 35, 108, 26, screenText(94, 52, '37.0 °C | 150 rpm', 8.8, P.screenGreen, 'middle')) +
        softButton(154, 38, 18, 20, 'RUN', '#14B8A6', '#FFFFFF') +
        softButton(176, 38, 20, 20, 'SET', '#F8FAFC', P.ink) +
        // Viewing window frame & hinged door
        `<rect x="34" y="76" width="170" height="134" rx="5" fill="#F1F5F9" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="44" y="86" width="136" height="114" rx="4" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="186" y="122" width="8" height="42" rx="2" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.3"/>` +
        // Orbital shaker platform + 2 Erlenmeyer flasks in clamps
        `<rect x="54" y="176" width="116" height="10" rx="2" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="1.5"/>` +
        `<path d="M78 122 V136 L64 172 H102 L88 136 V122 Z" fill="#FFFFFF" fill-opacity="0.85" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<path d="M68 158 H98 L101 170 H65 Z" fill="url(#g-liquid)" stroke="none"/>` +
        `<rect x="75" y="117" width="16" height="6" rx="1.5" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.2"/>` +
        `<path d="M132 122 V136 L118 172 H156 L142 136 V122 Z" fill="#FFFFFF" fill-opacity="0.85" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<path d="M122 158 H152 L155 170 H119 Z" fill="url(#g-liquid)" stroke="none"/>` +
        `<rect x="129" y="117" width="16" height="6" rx="1.5" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.2"/>` +
        glassHighlight(52, 94, 52, 168, 2.4);
    }, {
      notes: '台式恒温振荡培养摇床：正视温控面板、观察窗门、内置三角烧瓶夹具与往复/圆周振荡平台。',
      lecturePrintedPages: [68], lecturePdfPages: [69],
    });

  // 18. microwave-oven (orthographic front elevation!)
  add('microwave-oven', '微波炉', '生化设备',
    'microwave oven 微波炉 加热 琼脂糖溶胶', 254, 183, () => {
      let mesh = '';
      for (let gx = 46; gx <= 156; gx += 10) {
        mesh += `<line x1="${gx}" y1="44" x2="${gx}" y2="144" stroke="#64748B" stroke-width="0.6" stroke-opacity="0.55"/>`;
      }
      for (let gy = 48; gy <= 140; gy += 10) {
        mesh += `<line x1="40" y1="${gy}" x2="162" y2="${gy}" stroke="#64748B" stroke-width="0.6" stroke-opacity="0.55"/>`;
      }
      return benchChassis(18, 24, 218, 138, { rx: 8, accentBar: true, footW: 18, footH: 6 }) +
        // Door & mesh window
        `<rect x="28" y="38" width="144" height="114" rx="4" fill="#E2E8F0" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="38" y="46" width="124" height="98" rx="3" fill="#D9ECF2" stroke="${P.ink}" stroke-width="1.8"/>` +
        mesh +
        glassHighlight(44, 52, 44, 136, 2.2) +
        `<rect x="163" y="72" width="5" height="46" rx="2" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.2"/>` +
        // Right control panel
        `<rect x="178" y="38" width="48" height="114" rx="4" fill="#F8FAF9" stroke="${P.slate}" stroke-width="1.4"/>` +
        oledScreen(182, 44, 40, 24, screenText(202, 60, '01:30', 10, P.screenGreen, 'middle')) +
        rotaryKnob(202, 92, 13, 30, { ticks: 5 }) +
        softButton(184, 118, 36, 14, 'START', P.teal, '#FFFFFF') +
        softButton(184, 135, 36, 12, 'STOP', '#DCE5E8', P.ink);
    }, {
      notes: '实验室微波炉：屏蔽网视窗门、门拉手、数字定时 OLED 面板、功率调节旋钮与启停键。',
      lecturePrintedPages: [64, 65, 68], lecturePdfPages: [65, 66, 69],
    });

  // 19. gel-documentation-system (orthographic darkroom cutaway!)
  add('gel-documentation-system', '凝胶成像仪', '电泳与成像',
    'gel documentation system 凝胶成像仪 透照 紫外 UV 拍摄', 226, 246, () => {
      return benchChassis(24, 18, 178, 208, { rx: 8, accentBar: true, footW: 18, footH: 7 }) +
        // UV imaging chamber interior cutaway
        `<rect x="38" y="34" width="150" height="142" rx="4" fill="#E6F4F3" stroke="${P.ink}" stroke-width="2.0"/>` +
        // Top cooled CCD camera + lens assembly
        `<rect x="83" y="36" width="60" height="22" rx="2" fill="#C6D2D7" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<rect x="95" y="58" width="36" height="14" rx="2" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.5"/>` +
        `<circle cx="113" cy="68" r="6" fill="${P.teal}" stroke="${P.ink}" stroke-width="1.3"/>` +
        // Subtle dashed field-of-view cone
        `<line x1="104" y1="74" x2="72" y2="148" stroke="${P.teal}" stroke-width="1.2" stroke-dasharray="3 3"/>` +
        `<line x1="122" y1="74" x2="154" y2="148" stroke="${P.teal}" stroke-width="1.2" stroke-dasharray="3 3"/>` +
        // Side UV/Blue epi-lights
        `<rect x="42" y="88" width="6" height="34" rx="2" fill="${P.teal}" stroke="${P.ink}" stroke-width="1.0"/>` +
        `<rect x="178" y="88" width="6" height="34" rx="2" fill="${P.teal}" stroke="${P.ink}" stroke-width="1.0"/>` +
        // UV transilluminator deck & gel slab
        `<rect x="52" y="158" width="122" height="12" rx="2" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<rect x="68" y="148" width="90" height="10" rx="1.5" fill="#D9ECF2" stroke="${P.ink}" stroke-width="1.4"/>` +
        // Lower OLED panel
        oledScreen(38, 184, 96, 28, screenText(86, 202, 'UV 302nm', 9.5, P.screenCyan, 'middle')) +
        softButton(142, 186, 46, 24, 'CAPTURE', P.teal, '#FFFFFF');
    }, {
      notes: '凝胶成像暗箱剖视图：顶部制冷 CCD 镜头、双侧白/蓝光激发条、底部 UV 透照台及采集控制面板。',
      lecturePrintedPages: [64, 65, 68], lecturePdfPages: [65, 66, 69],
    });

  // 20. electrophoresis-power-supply (ports: negative-1..3, positive-1..3 at y=126)
  add('electrophoresis-power-supply', '电泳专用稳压电源', '电泳与成像',
    'electrophoresis power supply 电泳电源 稳压 稳流 直流 输出', 235, 176, () => {
      return benchChassis(16, 20, 203, 138, { rx: 8, accentBar: true, footW: 18, footH: 7 }) +
        oledScreen(28, 36, 136, 38,
          screenText(96, 53, '120 V   20 mA', 10.5, P.screenGreen, 'middle') +
          screenText(96, 67, 'CONST VOLT  00:45', 7.5, P.screenCyan, 'middle')
        ) +
        rotaryKnob(190, 55, 14, 30, { ticks: 5, teal: true }) +
        softButton(28, 84, 30, 14, 'V / mA', '#E2E8F0', P.ink) +
        softButton(64, 84, 28, 14, 'TIME', '#E2E8F0', P.ink) +
        softButton(98, 84, 30, 14, 'RUN', '#14B8A6', '#FFFFFF') +
        softButton(134, 84, 30, 14, 'STOP', '#FEE2E2', P.red) +
        // 3 pairs of shrouded banana output jacks matching exact manifest coords!
        bindingPost(45, 126, P.black, '-1', 15, 7) +
        bindingPost(64, 126, P.red, '+1', 15, 7) +
        bindingPost(95, 126, P.black, '-2', 15, 7) +
        bindingPost(114, 126, P.red, '+2', 15, 7) +
        bindingPost(145, 126, P.black, '-3', 15, 7) +
        bindingPost(164, 126, P.red, '+3', 15, 7) +
        `<rect x="184" y="118" width="16" height="16" rx="2" fill="${P.red}" stroke="${P.ink}" stroke-width="1.3"/>` +
        labelText(192, 129, 'I/O', 7, '#FFFFFF', 'middle', true);
    }, {
      ports: [
        { id: 'negative-1', x: 45, y: 126, dx: 0, dy: 1, type: 'wire', diameter: 0 },
        { id: 'positive-1', x: 64, y: 126, dx: 0, dy: 1, type: 'wire', diameter: 0 },
        { id: 'negative-2', x: 95, y: 126, dx: 0, dy: 1, type: 'wire', diameter: 0 },
        { id: 'positive-2', x: 114, y: 126, dx: 0, dy: 1, type: 'wire', diameter: 0 },
        { id: 'negative-3', x: 145, y: 126, dx: 0, dy: 1, type: 'wire', diameter: 0 },
        { id: 'positive-3', x: 164, y: 126, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      ],
      notes: '多通道电泳稳压电源：恒压/恒流/定时背光屏、编码旋钮与三组独立正负安全插孔。',
      lecturePrintedPages: [17, 45, 54, 64, 65, 68], lecturePdfPages: [18, 46, 55, 65, 66, 69],
    });

  // 21. benchtop-ph-meter
  add('benchtop-ph-meter', '台式 pH 计', '分析与计量',
    'benchtop ph meter pH计 酸度计 玻璃电极 酸碱度', 268, 202, () => {
      return benchChassis(16, 74, 146, 108, { rx: 8, accentBar: true, footW: 16, footH: 6 }) +
        oledScreen(26, 90, 126, 46,
          screenText(89, 112, 'pH  7.00', 13, P.screenGreen, 'middle') +
          screenText(89, 128, 'ATC  25.0 °C   mV: 0', 7.3, P.screenCyan, 'middle')
        ) +
        softButton(28, 146, 36, 18, 'CAL', '#14B8A6', '#FFFFFF') +
        softButton(71, 146, 36, 18, 'READ', '#E2E8F0', P.ink) +
        softButton(114, 146, 36, 18, 'MODE', '#E2E8F0', P.ink) +
        // BNC cable + articulated electrode stand + glass electrode
        `<path d="M138 74 C144 38 176 26 218 32" fill="none" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="174" y="176" width="76" height="10" rx="3" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="230" y="24" width="7" height="152" rx="2" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<path d="M234 42 H198 L194 48 H234" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="1.5"/>` +
        `<rect x="192" y="34" width="12" height="16" rx="2" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.4"/>` +
        // Glass pH electrode
        `<rect x="194" y="50" width="8" height="84" rx="2" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<circle cx="198" cy="138" r="5" fill="#99F6E4" stroke="${P.ink}" stroke-width="1.6"/>` +
        glassHighlight(196, 56, 196, 128, 1.3);
    }, {
      notes: '台式精密酸度计：背光 pH/温度读数主机、校准/测量按键、独立底座支架与玻璃复合电极。',
      lecturePrintedPages: [54], lecturePdfPages: [55],
    });

  // 22. nucleic-acid-spin-column
  add('nucleic-acid-spin-column', '核酸吸附柱 / 收集管', '分离与纯化',
    'nucleic acid spin column 核酸吸附柱 收集管 纯化 DNA RNA 硅胶膜', 114, 231, () => {
      return `<!-- Collection tube (2 mL) with open flared rim -->` +
        `<path d="M30 82 V176 L46 214 Q57 224 68 214 L84 176 V82 Z" fill="url(#g-glass)" stroke="none"/>` +
        `<path d="M26 80 Q30 80 30 84 V176 L46 214 Q57 224 68 214 L84 176 V84 Q84 80 88 80" fill="none" stroke="${P.ink}" stroke-width="2.5"/>` +
        // Nested spin column (tip suspended above collection tube bottom!)
        `<path d="M40 32 V124 L52 148 V158 H62 V148 L74 124 V32" fill="#FFFFFF" fill-opacity="0.82" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="37" y="24" width="40" height="8" rx="2" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="2.0"/>` +
        // Silica membrane & O-ring inside column
        `<rect x="42" y="114" width="30" height="7" rx="1" fill="#CBD5E1" stroke="${P.slate}" stroke-width="1.2"/>` +
        `<rect x="41" y="109" width="32" height="5" rx="1" fill="${P.teal}" stroke="${P.ink}" stroke-width="1.1"/>` +
        glassHighlight(44, 40, 44, 104, 2.0) +
        glassHighlight(34, 96, 34, 174, 2.4);
    }, {
      notes: '核酸硅胶膜吸附柱与 2 mL 收集管剖视图：柱体悬空嵌套于收集管内，明确区分硅胶膜片与管底。',
      lecturePrintedPages: [64, 65, 68, 69], lecturePdfPages: [65, 66, 69, 70],
    });

  // 23. gel-casting-tray (clean orthographic!)
  add('gel-casting-tray', '制胶托盘与梳子', '电泳与成像',
    'gel casting tray 制胶托盘 梳子 琼脂糖 制胶器', 234, 173, () => {
      let teeth = '';
      for (let i = 0; i < 8; i++) {
        const tx = 43 + i * 19;
        teeth += `<rect x="${tx}" y="48" width="11" height="62" rx="1" fill="#F8FAFC" stroke="${P.ink}" stroke-width="1.6"/>`;
      }
      return `<!-- Silicone end dams + clear UV tray -->` +
        `<rect x="20" y="64" width="10" height="86" rx="2" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="204" y="64" width="10" height="86" rx="2" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="30" y="68" width="174" height="78" rx="2" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="2.2"/>` +
        // Agarose slab layer
        `<rect x="32" y="98" width="170" height="44" fill="url(#g-liquid)" stroke="${P.tealDark}" stroke-width="1.2"/>` +
        // Comb seated with teeth pointing down into gel
        teeth +
        `<rect x="34" y="30" width="166" height="18" rx="3" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<line x1="42" y1="36" x2="192" y2="36" stroke="#CCFBF1" stroke-width="1.5"/>` +
        glassHighlight(36, 74, 36, 138, 2.2);
    }, {
      notes: '正交制胶托盘与倒插制胶梳：两侧硅胶挡板、透明托盘槽、琼脂糖胶层与下插式加样梳齿。',
      lecturePrintedPages: [65], lecturePdfPages: [66],
    });

  // 24. gel-loading-comb
  add('gel-loading-comb', '电泳制胶梳', '电泳与成像',
    'gel loading comb 制胶梳 加样孔 电泳 梳子', 222, 86, () => {
      let teeth = '';
      for (let i = 0; i < 10; i++) {
        const tx = 24 + i * 18;
        teeth += `<rect x="${tx}" y="32" width="10" height="42" rx="1" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="1.8"/>`;
      }
      return teeth +
        `<rect x="14" y="12" width="194" height="20" rx="4" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<line x1="24" y1="18" x2="198" y2="18" stroke="#CCFBF1" stroke-width="1.6" stroke-opacity="0.75"/>` +
        labelText(111, 26, '1.5 mm  10-WELL', 7.5, '#FFFFFF', 'middle', true);
    }, {
      notes: '独立电泳制胶梳，10 齿均一排布与厚度标记，适配制胶托盘使用。',
      lecturePrintedPages: [65], lecturePdfPages: [66],
    });

  // 25. refrigerated-centrifuge (orthographic front elevation!)
  add('refrigerated-centrifuge', '冷冻离心机', '取样与离心',
    'refrigerated centrifuge 冷冻离心机 温控 低温 离心机', 238, 246, () => {
      let rotorWells = '';
      for (let i = 0; i < 6; i++) {
        const a = (i * 60) * Math.PI / 180;
        rotorWells += `<circle cx="${fmt(119 + Math.cos(a) * 28)}" cy="${fmt(104 + Math.sin(a) * 9)}" r="4.5" fill="${P.ink}" stroke="#F8FAF9" stroke-width="1.2"/>`;
      }
      return benchChassis(22, 114, 194, 112, { rx: 8, accentBar: true, footW: 20, footH: 7 }) +
        // Open lid above chassis
        `<rect x="34" y="14" width="170" height="72" rx="14" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<ellipse cx="119" cy="50" rx="54" ry="22" fill="#E2E8F0" stroke="${P.slate}" stroke-width="1.5"/>` +
        `<rect x="94" y="86" width="50" height="8" rx="2" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.5"/>` +
        // Rotor bowl visible
        `<ellipse cx="119" cy="106" rx="54" ry="18" fill="${P.slate}" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<ellipse cx="119" cy="104" rx="44" ry="14" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="1.6"/>` +
        rotorWells +
        `<circle cx="119" cy="104" r="6" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.4"/>` +
        // Dual OLED panels & controls
        oledScreen(36, 134, 108, 28, screenText(90, 152, '5000 rpm', 10, P.screenGreen, 'middle')) +
        oledScreen(36, 168, 108, 26, screenText(90, 185, '4.0 °C  10:00', 9.2, P.screenCyan, 'middle')) +
        rotaryKnob(174, 152, 15, 25, { ticks: 5, teal: true }) +
        softButton(156, 178, 36, 16, 'START', '#14B8A6', '#FFFFFF') +
        ventSlots(38, 204, 2, 162, 5);
    }, {
      notes: '台式低温冷冻离心机：开盖状态可见金属离心腔与角转子孔位，配双 OLED 转速/温度屏及散热格栅。',
      lecturePrintedPages: [23, 24, 50], lecturePdfPages: [24, 25, 51],
    });

  // =====================================================================
  // 16 NEW BIOCHEMISTRY / BIOLOGY APPARATUS
  // =====================================================================

  // 26. pcr-thermal-cycler
  add('pcr-thermal-cycler', 'PCR 热循环仪', '生化设备',
    'pcr thermal cycler 基因扩增仪 PCR仪 热循环仪 核酸扩增', 240, 210, () => {
      return benchChassis(20, 62, 200, 128, { rx: 8, accentBar: true, footW: 18, footH: 7 }) +
        // Heated lid clamshell top
        `<path d="M36 62 L44 26 Q46 20 54 20 H186 Q194 20 196 26 L204 62 Z" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="52" y="28" width="136" height="10" rx="2" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.5"/>` +
        `<rect x="94" y="48" width="52" height="10" rx="3" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.5"/>` +
        labelText(120, 56, 'HEATED LID', 6.2, '#FFFFFF', 'middle', true) +
        // Touchscreen OLED showing thermal cycling curve
        oledScreen(36, 78, 122, 74,
          `<path d="M46 138 H62 V96 H84 V124 H104 V108 H126 V138 H144" fill="none" stroke="${P.screenGreen}" stroke-width="2"/>` +
          screenText(97, 92, '95°C → 55°C → 72°C', 7.6, P.screenCyan, 'middle') +
          screenText(97, 144, 'CYCLE 18 / 35', 7.8, P.screenAmber, 'middle')
        ) +
        // Right side vents + controls
        softButton(168, 82, 38, 18, 'RUN', '#14B8A6', '#FFFFFF') +
        softButton(168, 106, 38, 16, 'PAUSE', '#E2E8F0', P.ink) +
        ventSlots(168, 132, 5, 36, 6) +
        labelText(120, 174, 'THERMAL CYCLER', 7.5, P.muted, 'middle', true);
    }, { notes: 'PCR 基因扩增热循环仪：带压紧旋钮的热盖、实时温度循环曲线触控屏与通风散热槽。' });

  // 27. microplate-reader
  add('microplate-reader', '酶标仪', '分析与计量',
    'microplate reader elisa 酶标仪 微孔板读数仪 吸光度 OD450', 260, 200, () => {
      return benchChassis(18, 22, 224, 156, { rx: 9, accentBar: true, footW: 20, footH: 7 }) +
        // Optical head bay & recessed plate tray slot
        `<rect x="32" y="38" width="196" height="44" rx="4" fill="#F1F5F9" stroke="${P.slate}" stroke-width="1.5"/>` +
        oledScreen(40, 44, 114, 32,
          screenText(97, 58, 'OD450: 0.842', 9.5, P.screenGreen, 'middle') +
          screenText(97, 70, '96-WELL READ', 7, P.screenCyan, 'middle')
        ) +
        softButton(162, 46, 26, 26, 'READ', '#14B8A6', '#FFFFFF') +
        softButton(194, 46, 26, 26, 'OUT', '#E2E8F0', P.ink) +
        // Plate carrier bay + extended 96-well tray
        `<rect x="44" y="94" width="172" height="16" rx="2" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<path d="M52 104 L38 152 H222 L208 104 Z" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="64" y="110" width="132" height="34" rx="2" fill="#FFFFFF" stroke="${P.slate}" stroke-width="1.4"/>` +
        // Mini 12x4 well preview inside carrier
        Array.from({ length: 4 }, (_, r) =>
          Array.from({ length: 12 }, (_, c) =>
            `<circle cx="${72 + c * 10.5}" cy="${115 + r * 7.5}" r="2.2" fill="${(r + c) % 3 === 0 ? '#99F6E4' : '#E2E8F0'}" stroke="${P.slate}" stroke-width="0.6"/>`
          ).join('')
        ).join('') +
        labelText(130, 169, 'MICROPLATE READER', 7.5, P.muted, 'middle', true);
    }, { notes: '微孔板酶标仪：带读数光路窗口、伸出式 96 孔板载物托盘及吸光度液晶屏幕。' });

  // 28. microplate-96
  add('microplate-96', '96孔微孔板', '取样与离心',
    'microplate 96 well plate 96孔板 酶标板 微孔板 ELISA', 240, 160, () => {
      let wells = '';
      const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      for (let r = 0; r < 8; r++) {
        const cy = 34 + r * 14.5;
        wells += labelText(22, cy + 2.5, rows[r], 6.5, P.slate, 'middle', true);
        for (let c = 0; c < 12; c++) {
          const cx = 36 + c * 16;
          if (r === 0) wells += labelText(cx, 22, String(c + 1), 6.2, P.slate, 'middle', true);
          wells += `<circle cx="${cx}" cy="${cy}" r="5.2" fill="#F8FAFC" stroke="${P.slate}" stroke-width="1.1"/>` +
            `<circle cx="${cx}" cy="${cy}" r="3.4" fill="#E6F2F7" stroke="none"/>`;
        }
      }
      return `<path d="M18 12 H226 A4 4 0 0 1 230 16 V144 A4 4 0 0 1 226 148 H14 A4 4 0 0 1 10 144 V20 Z" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="27" y="25" width="197" height="117" rx="3" fill="#FFFFFF" stroke="${P.lightBorder}" stroke-width="1.2"/>` +
        wells;
    }, { notes: '标准 SBS 96 孔酶标微孔板俯视图：A1 斜角定位切口、A–H 与 1–12 坐标编号。' });

  // 29. clean-bench
  add('clean-bench', '超净工作台 / 生物安全柜', '生化设备',
    'clean bench biosafety cabinet 超净工作台 生物安全柜 层流罩 无菌操作台', 260, 280, () => {
      return `<!-- Base stand legs -->` +
        `<rect x="34" y="196" width="10" height="72" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="216" y="196" width="10" height="72" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<line x1="44" y1="240" x2="216" y2="240" stroke="${P.slate}" stroke-width="4"/>` +
        `<rect x="28" y="266" width="22" height="6" rx="2" fill="${P.ink}" stroke="none"/>` +
        `<rect x="210" y="266" width="22" height="6" rx="2" fill="${P.ink}" stroke="none"/>` +
        // Main cabinet
        `<rect x="22" y="14" width="216" height="182" rx="6" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="24" y="16" width="212" height="38" rx="4" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.6"/>` +
        oledScreen(36, 22, 108, 26, screenText(90, 39, '0.45 m/s  UV', 8.5, P.screenCyan, 'middle')) +
        softButton(154, 24, 24, 22, 'FAN', '#14B8A6', '#FFFFFF') +
        softButton(184, 24, 24, 22, 'UV', '#FDE68A', P.ink) +
        softButton(212, 24, 18, 22, 'L', '#E2E8F0', P.ink) +
        // Workspace bay + sliding glass sash
        `<rect x="34" y="62" width="192" height="114" rx="3" fill="#FFFFFF" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="36" y="64" width="188" height="84" fill="url(#g-glass)" stroke="none"/>` +
        `<rect x="36" y="148" width="188" height="26" fill="url(#g-metal-v)" stroke="${P.slate}" stroke-width="1.2"/>` +
        // Sash bottom edge & handle
        `<rect x="34" y="138" width="192" height="7" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.4"/>` +
        `<rect x="106" y="135" width="48" height="4" rx="1.5" fill="#F8FAFC" stroke="${P.ink}" stroke-width="1.1"/>` +
        // Laminar flow arrows
        `<path d="M80 74 V92 M76 88 L80 93 L84 88 M130 74 V92 M126 88 L130 93 L134 88 M180 74 V92 M176 88 L180 93 L184 88" stroke="${P.teal}" stroke-width="1.4"/>` +
        glassHighlight(44, 70, 44, 132, 2.6);
    }, { notes: '垂直层流超净工作台/生物安全柜：顶部风机/UV 控制屏、透明升降玻璃移门、不锈钢操作台面及支架底座。' });

  // 30. vortex-mixer
  add('vortex-mixer', '涡旋混匀仪', '生化设备',
    'vortex mixer 涡旋混匀仪 漩涡混合器 震荡混匀', 160, 170, () => {
      return labFeet(24, 152, 112, 16, 6, 8) +
        // Heavy tapered die-cast body
        `<path d="M22 152 L34 62 H126 L138 152 Z" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="34" y="62" width="92" height="8" rx="2" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.6"/>` +
        // Cup head on eccentric shaft
        `<rect x="73" y="44" width="14" height="18" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<path d="M52 20 H108 L100 44 H60 Z" fill="url(#g-rubber)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<ellipse cx="80" cy="20" rx="28" ry="6" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<ellipse cx="80" cy="20" rx="16" ry="3" fill="${P.slate}" stroke="none"/>` +
        // Controls
        rotaryKnob(80, 108, 15, 20, { ticks: 7 }) +
        softButton(42, 128, 32, 14, 'TOUCH', '#14B8A6', '#FFFFFF') +
        softButton(86, 128, 32, 14, 'CONT', '#E2E8F0', P.ink);
    }, { notes: '台式涡旋混匀仪：重型防滑底座、橡胶杯状振荡头、无级调速旋钮与点动/连续切换键。' });

  // 31. dry-metal-bath
  add('dry-metal-bath', '恒温金属浴', '生化设备',
    'dry metal bath block heater 恒温金属浴 干式恒温器 金属浴 加热模块', 200, 170, () => {
      let wells = '';
      for (let i = 0; i < 6; i++) {
        wells += `<rect x="${56 + i * 16}" y="42" width="8" height="14" rx="1" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.0"/>`;
      }
      return benchChassis(20, 62, 160, 90, { rx: 8, accentBar: true, footW: 16, footH: 6 }) +
        // Anodized aluminum heating block + clear lid
        `<rect x="44" y="42" width="112" height="20" rx="2" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.0"/>` +
        wells +
        `<path d="M36 42 V24 Q36 18 44 18 H156 Q164 18 164 24 V42" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="1.8"/>` +
        glassHighlight(44, 23, 140, 23, 2.0) +
        oledScreen(34, 82, 82, 34,
          screenText(75, 100, '37.0 °C', 10.5, P.screenGreen, 'middle') +
          screenText(75, 111, '00:15', 7.2, P.screenCyan, 'middle')
        ) +
        softButton(124, 83, 20, 14, '+', '#E2E8F0', P.ink) +
        softButton(148, 83, 20, 14, '-', '#E2E8F0', P.ink) +
        softButton(124, 102, 44, 14, 'START', '#14B8A6', '#FFFFFF') +
        labelText(100, 138, 'DRY BLOCK HEATER', 7.2, P.muted, 'middle', true);
    }, { notes: '干式恒温金属浴：铝制多管加热模块、透明防尘保温盖与温度/定时数字显示屏。' });

  // 32. vertical-electrophoresis-tank (SDS-PAGE, ports: negative & positive wire!)
  add('vertical-electrophoresis-tank', '垂直板电泳槽 / SDS-PAGE', '电泳与成像',
    'vertical electrophoresis tank sds-page 垂直电泳槽 蛋白电泳', 220, 250, () => {
      let wells = '';
      for (let i = 0; i < 6; i++) {
        wells += `<rect x="${77 + i * 12}" y="76" width="7" height="12" rx="1" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="0.9"/>`;
      }
      return labFeet(36, 232, 148, 16, 6, 10) +
        // Acrylic tank
        `<rect x="30" y="54" width="160" height="178" rx="6" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="2.2"/>` +
        // Lower buffer
        `<rect x="34" y="168" width="152" height="60" rx="3" fill="url(#g-liquid)" stroke="none"/>` +
        `<line x1="34" y1="168" x2="186" y2="168" stroke="${P.tealDark}" stroke-width="1.3"/>` +
        // Internal clamping electrode core + glass gel cassette
        `<rect x="54" y="64" width="112" height="150" rx="3" fill="#F1F5F9" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="66" y="72" width="88" height="122" rx="2" fill="#FFFFFF" stroke="${P.tealDark}" stroke-width="1.6"/>` +
        `<rect x="70" y="76" width="80" height="114" fill="#E6F2F7" stroke="none"/>` +
        wells +
        // Side clamping levers
        `<rect x="46" y="96" width="8" height="72" rx="2" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.4"/>` +
        `<rect x="166" y="96" width="8" height="72" rx="2" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.4"/>` +
        // Safety lid with banana jacks
        `<rect x="24" y="38" width="172" height="16" rx="4" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.0"/>` +
        bindingPost(64, 34, P.black, '', -12, 7) + labelText(48, 37, '-', 11, P.ink, 'middle', true) +
        bindingPost(156, 34, P.red, '', -12, 7) + labelText(172, 37, '+', 10, P.red, 'middle', true) +
        glassHighlight(38, 62, 38, 218, 2.5);
    }, {
      ports: [
        { id: 'negative', x: 64, y: 34, dx: 0, dy: -1, type: 'wire', diameter: 0 },
        { id: 'positive', x: 156, y: 34, dx: 0, dy: -1, type: 'wire', diameter: 0 },
      ],
      notes: '垂直板蛋白电泳槽（SDS-PAGE）：透明槽体、双侧绿/青夹紧电极芯、玻璃制胶夹板、梳孔与安全顶盖正负插孔。',
    });

  // 33. orbital-shaker
  add('orbital-shaker', '脱色摇床 / 水平摇床', '电泳与成像',
    'orbital shaker 脱色摇床 水平摇床 翘板摇床 凝胶脱色', 240, 175, () => {
      return labFeet(24, 158, 192, 16, 6, 10) +
        // Platform + anti-slip mat + straps
        `<rect x="20" y="54" width="200" height="14" rx="3" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="26" y="48" width="188" height="6" rx="2" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.4"/>` +
        // Staining tray silhouette on platform
        `<rect x="58" y="24" width="124" height="24" rx="3" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="64" y="34" width="112" height="11" fill="url(#g-liquid)" stroke="none"/>` +
        // Eccentric drive collars + lower base
        `<rect x="64" y="68" width="12" height="16" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<rect x="164" y="68" width="12" height="16" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.6"/>` +
        benchChassis(20, 84, 200, 74, { rx: 8, accentBar: true, feet: false }) +
        oledScreen(36, 102, 92, 36,
          screenText(82, 120, '60 rpm', 11, P.screenGreen, 'middle') +
          screenText(82, 132, 'TIME 00:30', 7.2, P.screenCyan, 'middle')
        ) +
        rotaryKnob(154, 120, 13, -30, { ticks: 5, teal: true }) +
        softButton(180, 106, 26, 28, 'RUN', '#14B8A6', '#FFFFFF');
    }, { notes: '水平脱色摇床：防滑承载平台、偏心驱动柱、低重心主机及转速/定时数显面板。' });

  // 34. ultrasonic-homogenizer
  add('ultrasonic-homogenizer', '超声细胞破碎仪', '生化设备',
    'ultrasonic homogenizer sonicator 超声细胞破碎仪 超声波粉碎机 变幅杆', 240, 260, () => {
      return benchChassis(18, 118, 122, 122, { rx: 8, accentBar: true, footW: 16, footH: 6 }) +
        oledScreen(28, 134, 102, 46,
          screenText(79, 153, '20 kHz  300 W', 9, P.screenGreen, 'middle') +
          screenText(79, 169, 'ON 2s / OFF 3s', 7.2, P.screenCyan, 'middle')
        ) +
        softButton(30, 192, 44, 22, 'START', '#14B8A6', '#FFFFFF') +
        softButton(82, 192, 44, 22, 'STOP', '#FEE2E2', P.red) +
        // Cable to transducer
        `<path d="M114 118 C114 58 148 16 178 16 C194 16 196 28 196 36" fill="none" stroke="${P.ink}" stroke-width="2.4"/>` +
        // Stand base & column
        `<rect x="148" y="232" width="76" height="12" rx="3" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="208" y="26" width="8" height="206" rx="2" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="174" y="54" width="42" height="10" rx="2" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.5"/>` +
        // Ultrasonic transducer & tapered titanium horn
        `<rect x="180" y="34" width="32" height="58" rx="4" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="186" y="92" width="20" height="18" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<polygon points="189,110 203,110 199,180 193,180" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.6"/>` +
        // Sample beaker below probe
        `<path d="M168 156 V228 H220 V156" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="170" y="176" width="48" height="50" fill="url(#g-liquid)" stroke="none"/>` +
        `<line x1="170" y1="176" x2="218" y2="176" stroke="${P.tealDark}" stroke-width="1.2"/>`;
    }, { notes: '超声波细胞破碎仪：脉冲发生主机、立式支架、压电换能器手柄与浸入样品杯的钛合金变幅杆探头。' });

  // 35. freeze-dryer
  add('freeze-dryer', '冷冻干燥机', '生化设备',
    'freeze dryer lyophilizer 冷冻干燥机 冻干机 真空冷阱', 240, 260, () => {
      return benchChassis(24, 114, 192, 128, { rx: 8, accentBar: true, footW: 18, footH: 7 }) +
        // Clear acrylic bell jar drying chamber + internal shelves
        `<path d="M46 114 V44 Q46 18 120 18 Q194 18 194 44 V114 Z" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="66" y="54" width="108" height="5" rx="1" fill="url(#g-metal)" stroke="${P.slate}" stroke-width="1.3"/>` +
        `<rect x="66" y="80" width="108" height="5" rx="1" fill="url(#g-metal)" stroke="${P.slate}" stroke-width="1.3"/>` +
        `<line x1="84" y1="42" x2="84" y2="114" stroke="${P.slate}" stroke-width="1.8"/>` +
        `<line x1="156" y1="42" x2="156" y2="114" stroke="${P.slate}" stroke-width="1.8"/>` +
        `<rect x="38" y="108" width="164" height="8" rx="2" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.6"/>` +
        glassHighlight(56, 36, 56, 102, 2.8) +
        // Lower cold trap console
        oledScreen(38, 130, 112, 42,
          screenText(94, 148, '-55.0 °C  12 Pa', 9, P.screenCyan, 'middle') +
          screenText(94, 164, 'CONDENSER READY', 7.2, P.screenGreen, 'middle')
        ) +
        softButton(160, 132, 42, 18, 'VAC', '#14B8A6', '#FFFFFF') +
        softButton(160, 154, 42, 18, 'COOL', '#E2E8F0', P.ink) +
        ventSlots(38, 184, 5, 112, 6) +
        `<circle cx="180" cy="198" r="10" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.6"/>` +
        labelText(180, 222, 'DRAIN', 7, P.muted, 'middle', true);
    }, { notes: '台式钟罩型冷冻干燥机：透明有机玻璃干燥室、多层样品搁架、冷阱主机及温度/真空度双显示。' });

  // 36. compound-microscope
  add('compound-microscope', '双目生物光学显微镜', '分析与计量',
    'compound microscope binocular 显微镜 生物显微镜 双目光学显微镜', 210, 280, () => {
      return `<!-- Base & Koehler illuminator -->` +
        `<rect x="34" y="250" width="142" height="18" rx="5" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<ellipse cx="90" cy="250" rx="16" ry="5" fill="${P.screenAmber}" stroke="${P.ink}" stroke-width="1.6"/>` +
        // Ergonomic C-arm frame
        `<path d="M128 250 V182 Q154 134 134 78 H92 V60 H148 Q174 128 158 250 Z" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.2"/>` +
        // Binocular prism head + angled twin eyepieces
        `<rect x="86" y="48" width="44" height="18" rx="4" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<path d="M90 50 L56 22 L66 12 L104 44 Z" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="44" y="10" width="14" height="18" rx="2" transform="rotate(-48 51 19)" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<path d="M104 48 L76 22 L84 14 L116 44 Z" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="66" y="10" width="14" height="18" rx="2" transform="rotate(-48 73 19)" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.8"/>` +
        // Revolving nosepiece + color-banded objectives
        `<path d="M74 78 H110 L106 90 H78 Z" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="87" y="90" width="10" height="34" rx="1.5" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<line x1="88" y1="114" x2="96" y2="114" stroke="${P.screenCyan}" stroke-width="2.4"/>` +
        `<rect x="70" y="88" width="8" height="24" rx="1" transform="rotate(22 74 88)" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.4"/>` +
        `<rect x="106" y="88" width="8" height="28" rx="1" transform="rotate(-22 110 88)" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.4"/>` +
        // Mechanical X-Y stage + slide + Abbe condenser
        `<rect x="40" y="148" width="96" height="9" rx="2" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="68" y="143" width="44" height="5" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="1.1"/>` +
        `<rect x="74" y="157" width="32" height="16" rx="2" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.5"/>` +
        `<line x1="118" y1="157" x2="118" y2="178" stroke="${P.slate}" stroke-width="2"/>` +
        `<circle cx="118" cy="180" r="3.5" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.2"/>` +
        // Coaxial coarse/fine focus knobs
        `<circle cx="144" cy="212" r="14" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<circle cx="144" cy="212" r="7" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="1.5"/>`;
    }, { notes: '双目生物光学显微镜：双目镜筒、四孔物镜转换器、机械载物台、聚光镜、柯勒底座光源与同轴粗细准焦螺旋。' });

  // 37. hemocytometer
  add('hemocytometer', '血球计数板', '分析与计量',
    'hemocytometer 血球计数板 细胞计数板 计数池 Neubauer', 220, 120, () => {
      let grid = '';
      for (let gx = 92; gx <= 128; gx += 6) {
        grid += `<line x1="${gx}" y1="38" x2="${gx}" y2="54" stroke="${P.tealDark}" stroke-width="0.6"/>` +
          `<line x1="${gx}" y1="66" x2="${gx}" y2="82" stroke="${P.tealDark}" stroke-width="0.6"/>`;
      }
      for (let gy = 38; gy <= 54; gy += 4) {
        grid += `<line x1="92" y1="${gy}" x2="128" y2="${gy}" stroke="${P.tealDark}" stroke-width="0.6"/>`;
      }
      for (let gy = 66; gy <= 82; gy += 4) {
        grid += `<line x1="92" y1="${gy}" x2="128" y2="${gy}" stroke="${P.tealDark}" stroke-width="0.6"/>`;
      }
      return `<rect x="14" y="24" width="192" height="72" rx="3" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="2.2"/>` +
        // Frosted label ends
        frostedBand(18, 28, 36, 64, 2) +
        frostedBand(166, 28, 36, 64, 2) +
        // H-shaped moat grooves & counting platforms
        `<rect x="78" y="32" width="64" height="56" fill="#FFFFFF" fill-opacity="0.72" stroke="${P.slate}" stroke-width="1.3"/>` +
        `<line x1="78" y1="60" x2="142" y2="60" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<line x1="84" y1="32" x2="84" y2="88" stroke="${P.slate}" stroke-width="1.4"/>` +
        `<line x1="136" y1="32" x2="136" y2="88" stroke="${P.slate}" stroke-width="1.4"/>` +
        grid +
        labelText(36, 63, '0.1 mm', 7, P.ink, 'middle', true) +
        labelText(184, 63, '1/400', 7, P.ink, 'middle', true);
    }, { notes: 'Neubauer 血球计数板俯视图：磨砂标注区、H 形导流槽、上下双计数池网格与 0.1 mm 深度刻字。' });

  // 38. inoculating-loop
  add('inoculating-loop', '接种环', '实验小工具',
    'inoculating loop 接种环 微生物 划线 接种针', 240, 56, () => {
      return `<!-- Insulated handle + chuck + nichrome wire + loop -->` +
        `<rect x="12" y="21" width="108" height="14" rx="5" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<line x1="22" y1="25" x2="108" y2="25" stroke="#99F6E4" stroke-width="1.5" stroke-opacity="0.7"/>` +
        `<rect x="120" y="23" width="22" height="10" rx="2" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<line x1="142" y1="28" x2="212" y2="28" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<circle cx="220" cy="28" r="7.5" fill="none" stroke="${P.ink}" stroke-width="2.0"/>`;
    }, { notes: '微生物平板划线用镍铬丝接种环：隔热防滑手柄、滚花锁头与闭合圆形丝环。' });

  // 39. cell-spreader
  add('cell-spreader', '玻璃涂布棒', '实验小工具',
    'cell spreader glass L-shape 玻璃涂布棒 涂布器 涂布三角棒', 210, 110, () => {
      return `<path d="M18 24 H136 Q150 24 156 36 L180 86 Q184 94 176 96 H120" fill="none" stroke="${P.ink}" stroke-width="9.5"/>` +
        `<path d="M18 24 H136 Q150 24 156 36 L180 86 Q184 94 176 96 H120" fill="none" stroke="#E6F2F7" stroke-width="5.2"/>` +
        `<path d="M24 22.5 H134 Q148 22.5 154 34" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-opacity="0.85"/>`;
    }, { notes: '火焰烧制圆滑玻璃涂布棒（L/三角刮布器），用于琼脂平板均匀涂布菌液。' });

  // 40. cell-culture-flask
  add('cell-culture-flask', '细胞培养瓶', '生化设备',
    'cell culture flask T75 细胞培养瓶 透气盖 贴壁培养', 170, 190, () => {
      let ticks = '';
      for (const [y, lbl] of [[98, '75'], [122, '50'], [146, '25']]) {
        ticks += `<line x1="126" y1="${y}" x2="112" y2="${y}" stroke="${P.slate}" stroke-width="1.2"/>` +
          labelText(108, y + 2.5, lbl, 7, P.slate, 'end', true);
      }
      return `<!-- Canted neck + rectangular polystyrene flask body -->` +
        `<path d="M72 42 L84 68 L40 94 V168 Q40 176 50 176 H122 Q132 176 132 168 V88 L108 62 L94 34 Z" fill="url(#g-glass)" stroke="none"/>` +
        `<path d="M43 136 H129 V168 Q129 173 121 173 H51 Q43 173 43 168 Z" fill="url(#g-liquid)" stroke="none"/>` +
        `<path d="M43 136 Q86 139 129 136" stroke="${P.tealDark}" stroke-width="1.3"/>` +
        `<path d="M72 42 L84 68 L40 94 V168 Q40 176 50 176 H122 Q132 176 132 168 V88 L108 62 L94 34" fill="none" stroke="${P.ink}" stroke-width="3.2"/>` +
        // Angled vented screw cap
        `<rect x="65" y="16" width="32" height="22" rx="3" transform="rotate(-22 81 27)" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="2.4"/>` +
        glassHighlight(50, 98, 50, 166, 2.8) +
        ticks;
    }, { notes: '斜颈 T-75 细胞培养瓶：带透气滤膜螺旋盖、透明聚苯乙烯扁平瓶身、体积刻度线与培养基液面。' });

  // 41. fermenter-bioreactor
  add('fermenter-bioreactor', '小型台式发酵罐', '生化设备',
    'fermenter bioreactor 台式发酵罐 生物反应器 搅拌 发酵', 260, 280, () => {
      return labFeet(24, 260, 212, 18, 7, 10) +
        // Control tower right/bottom L-console (clean brushed aluminum)
        `<rect x="20" y="170" width="220" height="90" rx="8" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.8"/>` +
        `<line x1="28" y1="173" x2="232" y2="173" stroke="${P.panelBg}" stroke-width="1.6"/>` +
        // Borosilicate bioreactor vessel on left-center deck
        `<path d="M52 46 V154 Q52 170 98 170 Q144 170 144 154 V46 Z" fill="url(#g-glass)" stroke="none"/>` +
        `<path d="M55 86 H141 V154 Q141 167 98 167 Q55 167 55 154 Z" fill="url(#g-liquid)" stroke="none"/>` +
        `<path d="M55 86 Q98 90 141 86" stroke="#72C2DD" stroke-width="1.4"/>` +
        `<path d="M52 46 V154 Q52 170 98 170 Q144 170 144 154 V46" fill="none" stroke="${P.ink}" stroke-width="3.4"/>` +
        // Headplate & motor
        `<rect x="46" y="38" width="104" height="10" rx="3" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="84" y="14" width="28" height="24" rx="3" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.8"/>` +
        // Agitator shaft + Rushton impellers + probes
        `<line x1="98" y1="48" x2="98" y2="152" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="76" y="108" width="44" height="6" rx="1" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.4"/>` +
        `<rect x="76" y="138" width="44" height="6" rx="1" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.4"/>` +
        `<line x1="70" y1="30" x2="70" y2="146" stroke="${P.tealDark}" stroke-width="1.6"/>` +
        `<line x1="126" y1="28" x2="126" y2="144" stroke="${P.brass}" stroke-width="1.6"/>` +
        glassHighlight(60, 56, 60, 152, 2.8) +
        // Controller OLED & peristaltic pumps
        oledScreen(34, 186, 128, 56,
          screenText(98, 204, 'pH 7.02  DO 48%', 9, P.screenGreen, 'middle') +
          screenText(98, 220, '37.0 °C  300 rpm', 8.5, P.screenCyan, 'middle') +
          screenText(98, 234, 'AIR 1.5 vvm', 7.5, P.screenAmber, 'middle')
        ) +
        // Peristaltic pump heads on right
        `<circle cx="186" cy="204" r="14" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<circle cx="186" cy="204" r="6" fill="${P.tealDark}" stroke="none"/>` +
        `<circle cx="218" cy="204" r="14" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<circle cx="218" cy="204" r="6" fill="${P.tealDark}" stroke="none"/>` +
        softButton(172, 226, 56, 18, 'CONTROL', '#14B8A6', '#FFFFFF');
    }, { notes: '小型台式搅拌生物发酵罐：硼硅玻璃反应釜、不锈钢顶盖电机、涡轮搅拌桨、pH/溶氧电极、蠕动泵头与多参数监控屏。' });

  // =====================================================================
  // UNIFIED REPLACEMENT OF FORMERLY ADAPTED 9 BIO ITEMS (NOW 100% AUTHORED WTFPL-2.0)
  // =====================================================================

  // 42. online-spectrophotometer
  add('online-spectrophotometer', '分光光度计（可见光 / 紫外）', '分析与计量',
    'online spectrophotometer 分光光度计 可见光 紫外 UV 吸光度', 260, 154, () => {
      return benchChassis(16, 22, 228, 114, { rx: 8, accentBar: true, footW: 18, footH: 7 }) +
        // Left hinged cuvette sample compartment hood
        `<rect x="26" y="38" width="84" height="84" rx="5" fill="url(#g-chassis-h)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="34" y="46" width="68" height="44" rx="4" fill="${P.panelAlt}" stroke="${P.slate}" stroke-width="1.3"/>` +
        `<rect x="52" y="54" width="32" height="10" rx="2" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.4"/>` +
        `<rect x="61" y="70" width="14" height="14" rx="2" fill="url(#g-glass)" stroke="${P.tealDark}" stroke-width="1.3"/>` +
        labelText(68, 108, '10 mm CELL', 6.8, P.muted) +
        // Right OLED UV-Vis display + control keys
        oledScreen(120, 36, 112, 54,
          screenText(126, 50, 'UV-VIS  280 nm', 7.5, P.screenCyan, 'start') +
          screenText(176, 68, 'A = 0.642', 12, P.screenGreen, 'middle') +
          screenText(176, 82, 'T = 22.8 %', 7.8, P.screenAmber, 'middle')
        ) +
        softButton(120, 98, 24, 16, 'λ', '#E2E8F0', P.ink) +
        softButton(148, 98, 28, 16, 'SCAN', '#E2E8F0', P.ink) +
        softButton(180, 98, 24, 16, 'ZERO', '#E2E8F0', P.ink) +
        softButton(208, 98, 24, 16, 'READ', '#14B8A6', '#FFFFFF');
    }, {
      notes: '紫外-可见分光光度计：翻盖比色皿样品暗室、高对比度波长/吸光度显示屏与校零扫谱功能键。',
      lecturePrintedPages: [6, 9, 11, 25, 31, 35, 39, 61],
      lecturePdfPages: [7, 10, 12, 26, 32, 36, 40, 62],
    });

  // 43. online-centrifuge
  add('online-centrifuge', '台式离心机', '取样与离心',
    'online centrifuge 台式离心机 离心', 210, 260, () => {
      let tubes = '';
      for (let i = 0; i < 6; i++) {
        const x = 68 + i * 14;
        tubes += `<rect x="${x - 3}" y="102" width="6" height="12" rx="1" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="1.2"/>` +
          `<rect x="${x - 3.5}" y="99" width="7" height="3.5" rx="1" fill="${P.teal}" stroke="${P.ink}" stroke-width="1.0"/>`;
      }
      return benchChassis(20, 126, 170, 116, { rx: 9, accentBar: true, footW: 18, footH: 7 }) +
        // Open arched safety lid revealing internal microtube rotor bowl
        `<path d="M36 108 L44 30 Q46 18 62 18 H148 Q164 18 166 30 L174 108 Z" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<ellipse cx="105" cy="58" rx="46" ry="24" fill="#E2E8F0" stroke="${P.slate}" stroke-width="1.4"/>` +
        `<rect x="88" y="96" width="34" height="8" rx="2" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.4"/>` +
        // Recessed rotor bowl & tube ring
        `<rect x="48" y="108" width="114" height="18" rx="4" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.8"/>` +
        tubes +
        `<rect x="97" y="108" width="16" height="10" rx="2" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="1.2"/>` +
        // Front OLED + rotary dial + buttons
        oledScreen(34, 142, 98, 46,
          screenText(83, 160, '14000 rpm', 10.5, P.screenGreen, 'middle') +
          screenText(83, 177, '05:00  PULSE', 8, P.screenCyan, 'middle')
        ) +
        rotaryKnob(158, 165, 15, 25, { ticks: 7, teal: true }) +
        softButton(36, 198, 42, 18, 'OPEN', '#E2E8F0', P.ink) +
        softButton(84, 198, 44, 18, 'PULSE', '#E2E8F0', P.ink) +
        softButton(134, 198, 44, 18, 'START', '#14B8A6', '#FFFFFF');
    }, {
      notes: '台式高速微量离心机：掀开透明安全保护盖可见水平排布转子与微量管孔位，配转速/定时 OLED 及旋钮。',
      lecturePrintedPages: [9, 21, 24, 49, 54, 64, 68],
      lecturePdfPages: [10, 22, 25, 50, 55, 65, 69],
    });

  // 44. online-cuvette
  add('online-cuvette', '比色皿（玻璃 / 石英）', '分析与计量',
    'online cuvette 比色皿 玻璃 石英 光度计 cuvette', 56, 146, () => {
      return `<!-- 10 mm optical quartz/glass cuvette with open top rim & frosted gripping edges -->` +
        `<path d="M13 14 V130 Q13 132 15 132 H41 Q43 132 43 130 V14 Z" fill="url(#g-glass)" stroke="none"/>` +
        // Frosted side holding walls
        `<rect x="14" y="15" width="4.5" height="106" fill="#E2E8F0" stroke="none"/>` +
        `<rect x="37.5" y="15" width="4.5" height="106" fill="#E2E8F0" stroke="none"/>` +
        `<line x1="18.5" y1="15" x2="18.5" y2="122" stroke="${P.muted}" stroke-width="0.8"/>` +
        `<line x1="37.5" y1="15" x2="37.5" y2="122" stroke="${P.muted}" stroke-width="0.8"/>` +
        // Sample liquid & curved meniscus inside optical window
        `<rect x="19" y="54" width="18" height="68" fill="url(#g-liquid)" stroke="none"/>` +
        `<path d="M19 54 Q28 57 37 54" stroke="${P.tealDark}" stroke-width="1.3"/>` +
        // Thick optical fused base
        `<rect x="14" y="122" width="28" height="9" fill="#CBD5E1" fill-opacity="0.7" stroke="${P.slate}" stroke-width="1.0"/>` +
        // Open unsealed quartz glass walls
        `<path d="M10 14 H13 V130 Q13 132 15 132 H41 Q43 132 43 130 V14 H46" fill="none" stroke="${P.ink}" stroke-width="2.6"/>` +
        glassHighlight(22, 22, 22, 114, 2.2) +
        labelText(28, 28, '10', 6.5, P.tealDark, 'middle', true);
    }, {
      notes: '10 mm 光程标准光学比色皿：双侧磨砂捏持壁、光学透光窗、液面弯月面与加厚熔融底座。',
      lecturePrintedPages: [10, 11, 25],
      lecturePdfPages: [11, 12, 26],
    });

  // 45. online-micropipette
  add('online-micropipette', '微量移液器', '取样与离心',
    'online micropipette 微量移液器 移液枪 加样枪 pipette', 72, 250, () => {
      return `<!-- Precision single-channel manual micropipette + fitted disposable tip -->` +
        // Top plunger cap + shaft
        `<rect x="30" y="10" width="16" height="8" rx="3" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="35" y="18" width="6" height="10" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.5"/>` +
        // Ergonomic finger hook rest left
        `<path d="M27 32 H18 Q11 32 12 42 Q13 52 24 52 H27" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        // Main contoured grip body
        `<path d="M26 28 H50 L46 112 H30 Z" fill="url(#g-chassis-h)" stroke="${P.ink}" stroke-width="2.0"/>` +
        // Tip ejector button + side rod
        `<rect x="50" y="34" width="6" height="14" rx="2" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.4"/>` +
        `<line x1="48" y1="48" x2="46" y2="128" stroke="${P.slate}" stroke-width="1.8"/>` +
        // Mechanical counter window
        `<rect x="33" y="44" width="10" height="28" rx="2" fill="${P.screenBg}" stroke="${P.ink}" stroke-width="1.2"/>` +
        screenText(38, 54, '1', 6.8, P.screenCyan, 'middle') +
        screenText(38, 61, '0', 6.8, P.screenGreen, 'middle') +
        screenText(38, 68, '0', 6.8, P.screenGreen, 'middle') +
        // Stainless collar & tapered shaft
        `<rect x="30" y="112" width="16" height="12" rx="1" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<path d="M32 124 L34 176 H42 L44 124 Z" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="1.8"/>` +
        // Fitted translucent tip + aspirated liquid column
        `<path d="M33 176 L37 238 H39 L43 176 Z" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<path d="M35.5 212 L37.3 236 H38.7 L40.5 212 Z" fill="url(#g-liquid)" stroke="none"/>` +
        glassHighlight(35, 180, 36.5, 224, 1.5);
    }, {
      notes: '精密单道可调微量移液器（100 µL）：拇指推杆、挂指弧形柄、三位数字读数窗、退枪头推杆及适配吸头。',
      lecturePrintedPages: [64, 68, 71, 72],
      lecturePdfPages: [65, 69, 72, 73],
    });

  // 46. online-microtube
  add('online-microtube', '微量离心管', '取样与离心',
    'online microtube 微量离心管 EP管 Eppendorf', 74, 124, () => {
      return `<!-- 1.5 mL snap-cap microcentrifuge tube (EP tube) -->` +
        // Left flexible hinge strap + top snap cap
        `<path d="M22 25 Q13 25 14 19 Q15 14 23 14" fill="none" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="21" y="12" width="32" height="9" rx="2" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="19" y="21" width="36" height="6" rx="2" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="1.8"/>` +
        // Cylindrical upper barrel tapering into sharp conical V-tip
        `<path d="M23 27 V68 L32 108 Q37 116 42 108 L51 68 V27 Z" fill="url(#g-glass)" stroke="none"/>` +
        // Liquid sample fill + meniscus
        `<path d="M25 64 H49 L41 106 Q37 113 33 106 Z" fill="url(#g-liquid)" stroke="none"/>` +
        `<path d="M25 64 Q37 67 49 64" stroke="${P.tealDark}" stroke-width="1.2"/>` +
        `<path d="M23 27 V68 L32 108 Q37 116 42 108 L51 68 V27" fill="none" stroke="${P.ink}" stroke-width="2.5"/>` +
        // Graduations right
        `<line x1="49" y1="40" x2="43" y2="40" stroke="${P.slate}" stroke-width="1.0"/>` +
        `<line x1="49" y1="54" x2="43" y2="54" stroke="${P.slate}" stroke-width="1.0"/>` +
        `<line x1="48" y1="70" x2="42" y2="70" stroke="${P.slate}" stroke-width="1.0"/>` +
        `<line x1="45" y1="86" x2="40" y2="86" stroke="${P.slate}" stroke-width="1.0"/>` +
        glassHighlight(27, 32, 27, 66, 2.2);
    }, {
      notes: '1.5 mL 连盖微量离心管（EP 管）：防误开压盖与侧铰链带、刻度线及尖底液体标本。',
      lecturePrintedPages: [45, 47, 64, 69],
      lecturePdfPages: [46, 48, 65, 70],
    });

  // 47. online-tip-box
  add('online-tip-box', '移液器吸头盒', '取样与离心',
    'online tip box 吸头盒 枪头盒 移液器', 220, 136, () => {
      let tips = '';
      for (let i = 0; i < 8; i++) {
        const tx = 40 + i * 20;
        tips += `<circle cx="${tx}" cy="58" r="5" fill="#CCFBF1" stroke="${P.ink}" stroke-width="1.4"/>` +
          `<path d="M${tx - 4} 64 L${tx - 1} 102 H${tx + 1} L${tx + 4} 64 Z" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="1.4"/>`;
      }
      return `<!-- Autoclavable 96-well pipette tip rack box with transparent viewing cutaway -->` +
        // Transparent hinged upper cover dome
        `<path d="M24 54 L30 22 Q32 16 40 16 H180 Q188 16 190 22 L196 54 Z" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="2.0"/>` +
        glassHighlight(36, 24, 34, 48, 2.2) +
        // Lower teal/slate rack box body with recessed viewing window
        `<rect x="20" y="54" width="180" height="68" rx="6" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="28" y="64" width="164" height="44" rx="4" fill="#F8FAFC" stroke="${P.ink}" stroke-width="1.6"/>` +
        tips +
        // Front latch clasp & deck strip
        `<rect x="20" y="54" width="180" height="10" rx="2" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<rect x="96" y="52" width="28" height="14" rx="2" fill="#FFFFFF" stroke="${P.ink}" stroke-width="1.5"/>` +
        labelText(110, 118, '1000 µL TIP RACK (96)', 7, '#FFFFFF', 'middle', true);
    }, {
      notes: '可高温高压灭菌 96 孔移液器吸头盒：透明翻盖、正前视窗可见排布整齐的吸头阵及锁扣开关。',
      lecturePrintedPages: [71],
      lecturePdfPages: [72],
    });

  // 48. online-incubator-servier
  add('online-incubator-servier', '恒温培养箱', '生化设备',
    'online incubator servier 恒温培养箱 培养', 210, 260, () => {
      return benchChassis(22, 18, 166, 224, { rx: 8, accentBar: true, footW: 18, footH: 7 }) +
        // Top controller strip
        oledScreen(34, 32, 92, 32,
          screenText(80, 46, '37.0 °C  HEAT', 8.5, P.screenGreen, 'middle') +
          screenText(80, 58, 'RUN  48:00', 7, P.screenCyan, 'middle')
        ) +
        rotaryKnob(154, 48, 12, -20, { ticks: 5, teal: true }) +
        // Outer insulated glass door frame
        `<rect x="34" y="72" width="142" height="156" rx="5" fill="${P.panelAlt}" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="46" y="84" width="118" height="132" rx="3" fill="url(#g-glass)" stroke="${P.slate}" stroke-width="1.6"/>` +
        // Interior stainless shelf 1 (Petri dish stack) & shelf 2 (culture flasks)
        `<line x1="48" y1="146" x2="162" y2="146" stroke="${P.slate}" stroke-width="2.4"/>` +
        `<rect x="64" y="132" width="32" height="6" rx="1" fill="url(#g-liquid)" stroke="${P.ink}" stroke-width="1.3"/>` +
        `<rect x="64" y="138" width="32" height="6" rx="1" fill="url(#g-liquid)" stroke="${P.ink}" stroke-width="1.3"/>` +
        `<rect x="112" y="138" width="32" height="6" rx="1" fill="url(#g-liquid)" stroke="${P.ink}" stroke-width="1.3"/>` +
        `<line x1="48" y1="204" x2="162" y2="204" stroke="${P.slate}" stroke-width="2.4"/>` +
        `<path d="M68 202 L74 176 V164 H82 V176 L88 202 Z" fill="url(#g-liquid)" stroke="${P.ink}" stroke-width="1.4"/>` +
        `<path d="M116 202 L122 176 V164 H130 V176 L136 202 Z" fill="url(#g-liquid)" stroke="${P.ink}" stroke-width="1.4"/>` +
        glassHighlight(56, 92, 56, 206, 2.8) +
        // Vertical chrome latch handle
        `<rect x="38" y="132" width="6" height="36" rx="2" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.5"/>`;
    }, {
      notes: '电热恒温微生物培养箱：数字温控仪表、双层玻璃观察内门、多孔层架及培养皿/摇瓶内部视图。',
      lecturePrintedPages: [54, 68],
      lecturePdfPages: [55, 69],
    });

  // 49. online-freezer
  add('online-freezer', '实验室低温冰箱', '生化设备',
    'online freezer 低温冰箱 冷藏 冷冻', 136, 280, () => {
      return benchChassis(22, 14, 92, 250, { rx: 6, accentBar: true, footW: 16, footH: 7, footInset: 10 }) +
        // Top ultra-low temperature header OLED
        oledScreen(30, 28, 76, 32,
          screenText(68, 43, '-80.0 °C', 10, P.screenCyan, 'middle') +
          screenText(68, 54, 'LOCK  OK', 6.5, P.screenGreen, 'middle')
        ) +
        // Upper & lower insulated doors
        `<rect x="28" y="66" width="80" height="78" rx="3" fill="#FFFFFF" stroke="${P.slate}" stroke-width="1.5"/>` +
        `<rect x="28" y="148" width="80" height="72" rx="3" fill="#FFFFFF" stroke="${P.slate}" stroke-width="1.5"/>` +
        // Chrome cam-action compression latch handles left
        `<rect x="32" y="90" width="7" height="28" rx="2" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.4"/>` +
        `<rect x="32" y="170" width="7" height="28" rx="2" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.4"/>` +
        // Crisp snowflake icon
        `<circle cx="72" cy="104" r="10" fill="#F0FDFA" stroke="${P.teal}" stroke-width="1.3"/>` +
        `<line x1="72" y1="97" x2="72" y2="111" stroke="${P.tealDark}" stroke-width="1.3"/>` +
        `<line x1="65" y1="104" x2="79" y2="104" stroke="${P.tealDark}" stroke-width="1.3"/>` +
        ventSlots(30, 228, 5, 76, 5.2);
    }, {
      notes: '立式实验室超低温冷冻冰箱（-80 °C）：数显锁控温度面板、双层密封冷柜门、加压门锁把手与下散热格栅。',
      lecturePrintedPages: [24, 49, 68],
      lecturePdfPages: [25, 50, 69],
    });

  // 50. online-autoclave
  add('online-autoclave', '高压灭菌锅', '生化设备',
    'online autoclave 高压灭菌锅 灭菌 autoclave', 176, 280, () => {
      return benchChassis(24, 52, 128, 210, { rx: 8, accentBar: true, footW: 18, footH: 7 }) +
        // Top heavy stainless autoclave chamber lid + star handwheel lock
        `<rect x="38" y="34" width="100" height="18" rx="4" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="52" y="24" width="72" height="10" rx="2" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<rect x="83" y="14" width="10" height="10" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.4"/>` +
        `<rect x="66" y="10" width="44" height="6" rx="2" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.6"/>` +
        // Upper OLED controller + round analog Bourdon pressure gauge
        oledScreen(34, 68, 66, 44,
          screenText(67, 84, '121.0 °C', 9.5, P.screenGreen, 'middle') +
          screenText(67, 100, '15m  0.12MPa', 6.8, P.screenAmber, 'middle')
        ) +
        `<circle cx="124" cy="90" r="18" fill="#FFFFFF" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<circle cx="124" cy="90" r="14" fill="none" stroke="${P.slate}" stroke-width="1.0"/>` +
        `<path d="M114 82 A14 14 0 0 1 134 82" fill="none" stroke="${P.red}" stroke-width="2.0"/>` +
        `<line x1="124" y1="90" x2="132" y2="79" stroke="${P.red}" stroke-width="1.8"/>` +
        `<circle cx="124" cy="90" r="2.5" fill="${P.ink}" stroke="none"/>` +
        // Middle control panel & lower drain valve
        `<rect x="36" y="122" width="104" height="72" rx="4" fill="${P.panelAlt}" stroke="${P.lightBorder}" stroke-width="1.2"/>` +
        labelText(88, 136, 'AUTOCLAVE', 7.5, P.slate) +
        softButton(46, 146, 26, 15, 'STER', '#14B8A6', '#FFFFFF') +
        softButton(76, 146, 26, 15, 'EXH', '#E2E8F0', P.ink) +
        softButton(106, 146, 26, 15, 'DRY', '#E2E8F0', P.ink) +
        softButton(56, 170, 64, 16, 'START / LOCK', '#0F766E', '#FFFFFF') +
        ventSlots(40, 206, 4, 64, 5.5) +
        // Brass drain valve on bottom right
        `<circle cx="124" cy="216" r="6" fill="url(#g-brass)" stroke="${P.ink}" stroke-width="1.5"/>` +
        `<line x1="124" y1="222" x2="124" y2="234" stroke="${P.ink}" stroke-width="2.0"/>` +
        labelText(124, 244, 'DRAIN', 6, P.muted);
    }, {
      notes: '立式自动高压蒸汽灭菌锅：顶盖旋锁星形手轮、灭菌温度与压力机械指针双表盘及下排水阀。',
      lecturePrintedPages: [68],
      lecturePdfPages: [69],
    });

  return specs;
}

// Preserve the 9 adapted online entries cleanly (reading existing metadata from manifest if present, with fallback)
// =====================================================================
// PHYSICS ASSETS (40 overhauled + 31 new = 71 physics assets)
// =====================================================================
function buildPhysicsSpecs() {
  const specs = [];
  const add = (id, name, category, search, w, h, svgFn, ports, notes = '') => {
    specs.push({
      id: 'physics:' + id,
      name,
      category,
      search,
      svg: id + '.svg',
      width: w,
      height: h,
      ports,
      boreCount: -1,
      neckCount: 0,
      author: 'Chem Studio contributors',
      license: 'WTFPL-2.0',
      approved: true,
      merged: true,
      notes,
      origin: 'authored',
      content: wrapSvg(w, h, name, svgFn(w, h)),
    });
  };

  // 1. digital-oscilloscope
  add('digital-oscilloscope', '双通道数字示波器', '电学与电子测量',
    'digital oscilloscope 示波器 波形 oscilloscope scope CH1 CH2', 300, 210, () => {
      let graticule = '';
      for (let gx = 42; gx <= 154; gx += 16) {
        graticule += `<line x1="${gx}" y1="50" x2="${gx}" y2="146" stroke="#C0D4CF" stroke-width="0.8"/>`;
      }
      for (let gy = 62; gy <= 134; gy += 16) {
        graticule += `<line x1="30" y1="${gy}" x2="166" y2="${gy}" stroke="#C0D4CF" stroke-width="0.8"/>`;
      }
      return benchChassis(14, 18, 272, 168, { rx: 9, accentBar: true, footW: 22, footH: 7 }) +
        oledScreen(26, 36, 144, 118,
          graticule +
          `<line x1="30" y1="98" x2="166" y2="98" stroke="#9AB0B8" stroke-width="1"/>` +
          `<line x1="98" y1="50" x2="98" y2="146" stroke="#9AB0B8" stroke-width="1"/>` +
          `<path d="M32 94 C41 64 50 64 59 94 S77 124 86 94 S104 64 113 94 S131 124 140 94 S154 66 164 84" fill="none" stroke="${P.teal}" stroke-width="2"/>` +
          `<path d="M32 122 H56 V92 H80 V122 H104 V92 H128 V122 H152 V92 H164" fill="none" stroke="${P.brass}" stroke-width="1.7"/>` +
          screenText(35, 48, 'CH1 2.0V', 6.8, P.teal, 'start') +
          screenText(98, 48, '1.00ms/div', 6.8, P.ink, 'middle') +
          screenText(161, 48, 'CH2 1.0V', 6.8, P.screenAmber, 'end')
        ) +
        softButton(30, 160, 28, 12, 'AUTO', '#14B8A6', '#FFFFFF') +
        softButton(64, 160, 28, 12, 'RUN', '#E2E8F0', P.ink) +
        softButton(98, 160, 28, 12, 'TRIG', '#E2E8F0', P.ink) +
        softButton(132, 160, 34, 12, 'MEAS', '#E2E8F0', P.ink) +
        // Right control bay
        rotaryKnob(198, 60, 11, -35, { ticks: 5 }) +
        rotaryKnob(244, 60, 11, 25, { ticks: 5 }) +
        labelText(198, 81, 'VERT', 6.5, P.slate) +
        labelText(244, 81, 'HORIZ', 6.5, P.slate) +
        rotaryKnob(198, 108, 12, 40, { ticks: 5, teal: true }) +
        rotaryKnob(244, 108, 12, -20, { ticks: 5 }) +
        labelText(198, 129, 'CH1 / CH2', 6.5, P.slate) +
        labelText(244, 129, 'LEVEL', 6.5, P.slate) +
        bncJack(196, 156, 'CH1', P.brassLight, -12) +
        bncJack(228, 156, 'CH2', '#99F6E4', -12) +
        bncJack(260, 156, 'EXT', '#CBD5E1', -12);
    }, [
      { id: 'ch1', x: 196, y: 156, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'ch2', x: 228, y: 156, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'trigger', x: 260, y: 156, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'base', x: 150, y: 193, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '双通道数字存储示波器：背光暗底网格波形屏、垂直/水平/触发旋钮及 CH1/CH2/EXT BNC 接口。');

  // 2. function-generator
  add('function-generator', '函数 / 信号发生器', '电学与电子测量',
    'function generator 信号源 函数发生器 正弦 方波 function signal generator', 300, 210, () => {
      return benchChassis(14, 18, 272, 168, { rx: 9, accentBar: true, footW: 22, footH: 7 }) +
        oledScreen(28, 36, 146, 78,
          screenText(101, 63, '1.000 000 kHz', 12, P.screenGreen, 'middle') +
          screenText(101, 84, '2.00 Vpp   SINE', 9, P.screenCyan, 'middle') +
          screenText(101, 102, 'OFFSET: 0.00 V  CH1 ON', 7, P.screenAmber, 'middle')
        ) +
        softButton(30, 124, 30, 18, 'SINE', '#14B8A6', '#FFFFFF') +
        softButton(66, 124, 30, 18, 'SQR', '#E2E8F0', P.ink) +
        softButton(102, 124, 30, 18, 'TRI', '#E2E8F0', P.ink) +
        softButton(138, 124, 34, 18, 'MOD', '#E2E8F0', P.ink) +
        softButton(30, 150, 46, 20, 'OUTPUT', '#14B8A6', '#FFFFFF') +
        softButton(84, 150, 44, 20, 'FREQ', '#E2E8F0', P.ink) +
        softButton(134, 150, 38, 20, 'AMPL', '#E2E8F0', P.ink) +
        // Large encoder knob + BNC outputs
        rotaryKnob(226, 72, 22, 35, { ticks: 9, teal: true }) +
        labelText(226, 108, 'ADJUST', 7.5, P.slate) +
        bncJack(190, 156, 'CH1', '#99F6E4', -12) +
        bncJack(224, 156, 'CH2', P.brassLight, -12) +
        bncJack(258, 156, 'SYNC', '#CBD5E1', -12);
    }, [
      { id: 'ch1', x: 190, y: 156, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'ch2', x: 224, y: 156, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'sync', x: 258, y: 156, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'base', x: 150, y: 193, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '双通道 DDS 函数/信号发生器：高对比频率/幅值背光屏、波形切换键、大调谐编码器与 CH1/CH2/SYNC BNC 口。');

  // 3. oscilloscope-probe (CRITICAL: KEEP EXACT 290x130 AND EXACT PORT COORDS FOR drawing.cpp!)
  add('oscilloscope-probe', '示波器探头', '电学与电子测量',
    'oscilloscope probe 探头 示波器 probe BNC 接地夹', 290, 130, () => {
      return `<!-- Coaxial lead -->` +
        `<path d="M234 62 C270 62 272 15 200 18 C144 18 158 72 126 72" fill="none" stroke="${P.tealDark}" stroke-width="4.2"/>` +
        `<path d="M234 62 C270 62 272 15 200 18 C144 18 158 72 126 72" fill="none" stroke="${P.ink}" stroke-width="1.2" stroke-opacity="0.35"/>` +
        // Probe handle body (tip at 16,72; grip-site at 101,72)
        `<rect x="74" y="59" width="54" height="26" rx="4" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="82" y="62" width="38" height="20" rx="2" fill="#FFFFFF" stroke="${P.slate}" stroke-width="1.0"/>` +
        labelText(101, 75.5, '10X', 9, P.tealDark, 'middle', true) +
        `<path d="M74 64 H47 L31 72 L47 80 H74 Z" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<line x1="31" y1="72" x2="16" y2="72" stroke="${P.ink}" stroke-width="2.2"/>` +
        // Ground alligator clip lead (ground at 33,108)
        `<path d="M92 85 L86 104 C70 120 56 112 49 108" fill="none" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<path d="M49 103 V113 L37 113 L33 108 L37 103 Z" fill="${P.ink}" stroke="${P.ink}" stroke-width="1.6"/>` +
        // BNC plug (bnc at 275,62)
        `<rect x="234" y="49" width="28" height="26" rx="3" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="262" y="54" width="13" height="16" rx="1.5" fill="url(#g-brass)" stroke="${P.ink}" stroke-width="1.8"/>`;
    }, [
      { id: 'tip', x: 16, y: 72, dx: -1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'ground', x: 33, y: 108, dx: -1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'bnc', x: 275, y: 62, dx: 1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'grip-site', x: 101, y: 72, dx: 1, dy: 0, type: 'grip-site', diameter: 0 },
    ], '示波器 1X–1000X 高阻无源探头：兼容弹性端头坐标与画布可拖拽探针/地线夹/BNC 插头。');

  // 4. dual-dc-supply
  add('dual-dc-supply', '双路台式直流稳压电源', '电工设备',
    'dual dc supply 电源 稳压 限流 DC supply 直流稳压电源', 300, 210, () => {
      return benchChassis(14, 18, 272, 168, { rx: 9, accentBar: true, footW: 22, footH: 7 }) +
        // CH1 panel
        oledScreen(28, 36, 112, 46,
          screenText(84, 55, '12.00 V', 11.5, P.screenGreen, 'middle') +
          screenText(84, 72, '0.250 A   CV', 8, P.screenCyan, 'middle')
        ) +
        rotaryKnob(56, 108, 12, -30, { ticks: 5 }) +
        rotaryKnob(106, 108, 12, -45, { ticks: 5 }) +
        labelText(56, 129, 'VOLT', 6.5, P.slate) +
        labelText(106, 129, 'CURR', 6.5, P.slate) +
        // CH2 panel
        oledScreen(160, 36, 112, 46,
          screenText(216, 55, '12.00 V', 11.5, P.screenGreen, 'middle') +
          screenText(216, 72, '0.250 A   CV', 8, P.screenCyan, 'middle')
        ) +
        rotaryKnob(194, 108, 12, -30, { ticks: 5 }) +
        rotaryKnob(244, 108, 12, -45, { ticks: 5 }) +
        labelText(194, 129, 'VOLT', 6.5, P.slate) +
        labelText(244, 129, 'CURR', 6.5, P.slate) +
        // Output jacks cleanly inside chassis
        bindingPost(58, 158, P.black, '- CH1', -12, 7.5) +
        bindingPost(98, 158, P.red, '+ CH1', -12, 7.5) +
        bindingPost(150, 158, P.tealDark, 'GND', -12, 7) +
        bindingPost(202, 158, P.black, '- CH2', -12, 7.5) +
        bindingPost(242, 158, P.red, '+ CH2', -12, 7.5) +
        labelText(150, 178, 'DUAL TRACKING DC SUPPLY', 6.5, P.muted);
    }, [
      { id: 'CH1-negative', x: 58, y: 158, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'CH1-positive', x: 98, y: 158, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'CH2-negative', x: 202, y: 158, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'CH2-positive', x: 242, y: 158, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'earth', x: 150, y: 158, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'base', x: 150, y: 193, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '双路独立/跟踪可调直流稳压电源：双通道数显表、恒压/恒流指示、独立电压/限流旋钮及保护接地端子。');

  // 5. frequency-counter
  add('frequency-counter', '频率计', '电学与电子测量',
    'frequency counter 频率 计数 测频仪 frequency counter', 280, 190, () => {
      return benchChassis(16, 20, 248, 148, { rx: 8, accentBar: true, footW: 20, footH: 7 }) +
        oledScreen(30, 38, 180, 48,
          screenText(120, 62, '1.000 000 MHz', 12.5, P.screenGreen, 'middle') +
          screenText(120, 77, 'GATE 1.0 s   CH A   AC  x1', 7.2, P.screenCyan, 'middle')
        ) +
        rotaryKnob(234, 62, 14, 20, { ticks: 5, teal: true }) +
        labelText(234, 86, 'TRIG LVL', 6.5, P.slate) +
        softButton(32, 102, 32, 18, 'FREQ', '#14B8A6', '#FFFFFF') +
        softButton(70, 102, 32, 18, 'PER', '#E2E8F0', P.ink) +
        softButton(108, 102, 32, 18, 'GATE', '#E2E8F0', P.ink) +
        softButton(32, 128, 32, 18, 'AC/DC', '#E2E8F0', P.ink) +
        softButton(70, 128, 32, 18, 'ATT', '#E2E8F0', P.ink) +
        softButton(108, 128, 32, 18, 'RESET', '#E2E8F0', P.ink) +
        bncJack(172, 136, 'INPUT A', '#99F6E4', -12) +
        bncJack(224, 136, 'INPUT B', P.brassLight, -12);
    }, [
      { id: 'input-a', x: 172, y: 136, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'input-b', x: 224, y: 136, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'base', x: 140, y: 175, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '高分辨率数字频率计：双通道 BNC 输入、闸门时间与衰减控制键。');

  // 6. lcr-meter
  add('lcr-meter', '台式 LCR 电桥', '电学与电子测量',
    'lcr meter 电桥 电感 电容 阻抗 LCR bridge meter', 280, 200, () => {
      return benchChassis(16, 20, 248, 158, { rx: 8, accentBar: true, footW: 20, footH: 7 }) +
        oledScreen(30, 38, 180, 56,
          screenText(120, 61, 'Cs  100.0 nF', 12.5, P.screenGreen, 'middle') +
          screenText(120, 80, 'D 0.0020   1.00 kHz  1.0V', 7.5, P.screenCyan, 'middle')
        ) +
        rotaryKnob(234, 66, 14, -20, { ticks: 5, teal: true }) +
        softButton(30, 104, 34, 18, 'L/C/R', '#14B8A6', '#FFFFFF') +
        softButton(70, 104, 34, 18, 'FREQ', '#E2E8F0', P.ink) +
        softButton(110, 104, 34, 18, 'BIAS', '#E2E8F0', P.ink) +
        bncJack(164, 148, 'HCUR', P.red, -12) +
        bncJack(194, 148, 'HPOT', P.brassLight, -12) +
        bncJack(224, 148, 'LPOT', '#99F6E4', -12) +
        bncJack(252, 148, 'LCUR', '#CBD5E1', -12);
    }, [
      { id: 'hcur', x: 164, y: 148, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'hpot', x: 194, y: 148, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'lpot', x: 224, y: 148, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'lcur', x: 252, y: 148, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'base', x: 140, y: 185, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '四端开尔文测量台式 LCR 数字电桥：HCUR/HPOT/LPOT/LCUR BNC 端口及测试频率切换面板。');

  // 7. ac-millivoltmeter
  add('ac-millivoltmeter', '交流毫伏表', '电学与电子测量',
    'ac millivoltmeter 毫伏表 交流 mV AC millivoltmeter', 245, 220, () => {
      return benchChassis(18, 18, 209, 180, { rx: 8, accentBar: true, footW: 18, footH: 7 }) +
        analogMeter(34, 36, 177, 94, { symbol: 'mV ~', ticks: 10, needleDeg: 18, scaleLabels: ['0', '2', '4', '6', '8', '10'] }) +
        rotaryKnob(78, 162, 18, -35, { ticks: 9, teal: true }) +
        labelText(78, 189, 'RANGE', 7, P.slate) +
        bncJack(168, 162, 'INPUT', '#99F6E4', -14);
    }, [
      { id: 'input', x: 168, y: 162, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'base', x: 122, y: 205, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '指针式交流毫伏表：镜面反射标度盘、波段量程开关与高灵敏 BNC 输入端子。');

  // 8. analog-galvanometer
  add('analog-galvanometer', '灵敏检流计', '电学与电子测量',
    'analog galvanometer 检流计 零点 电桥 galvanometer 微安表', 230, 200, () => {
      return benchChassis(18, 18, 194, 160, { rx: 8, accentBar: true, footW: 18, footH: 7 }) +
        analogMeter(32, 34, 166, 94, { symbol: 'G', ticks: 10, needleDeg: 0, scaleLabels: ['-30', '-15', '0', '+15', '+30'] }) +
        bindingPost(64, 152, P.black, '-', -12, 7.5) +
        rotaryKnob(115, 152, 9, 0, {}) +
        labelText(115, 170, 'ZERO', 6.5, P.muted) +
        bindingPost(166, 152, P.red, '+', -12, 7.5);
    }, [
      { id: 'negative', x: 64, y: 152, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'positive', x: 166, y: 152, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'base', x: 115, y: 185, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '中央零位灵敏检流计：对称正负刻度标盘、零点机械微调螺钉与红黑接线柱。');

  // 9. decade-resistance-box (FIXED: ports a, b INSIDE panel, base at bottom feet!)
  add('decade-resistance-box', '十进电阻箱', '电工设备',
    'decade resistance box 电阻箱 可调 电阻 decade resistor 变阻箱', 280, 165, () => {
      const mults = ['x1', 'x10', 'x100', 'x1k', 'x10k'];
      const angles = [-45, 20, 60, -80, 0];
      let dials = '';
      for (let i = 0; i < 5; i++) {
        const cx = 42 + i * 49;
        dials += rotaryKnob(cx, 66, 15, angles[i], { ticks: 9 }) +
          labelText(cx, 94, mults[i], 7.5, P.slate);
      }
      return benchChassis(12, 18, 256, 128, { rx: 8, accentBar: true, footW: 20, footH: 7 }) +
        dials +
        bindingPost(46, 122, P.black, 'A', 16, 7.5) +
        labelText(140, 125, '0 - 99,999 Ω   ±0.1%', 8, P.tealDark) +
        bindingPost(234, 122, P.red, 'B', 16, 7.5);
    }, [
      { id: 'a', x: 46, y: 122, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'b', x: 234, y: 122, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'base', x: 140, y: 153, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '五盘十进制精密电阻箱：面板旋钮阻值 ×1 至 ×10k，两侧内嵌安全接线柱与橡胶防滑脚垫。');

  // 10. sliding-rheostat
  add('sliding-rheostat', '滑动变阻器', '电工设备',
    'sliding rheostat 变阻器 滑片 电阻 rheostat 瓷管滑线变阻器', 280, 185, () => {
      let coils = '';
      for (let wx = 53; wx <= 227; wx += 4.5) {
        coils += `<line x1="${fmt(wx)}" y1="68" x2="${fmt(wx)}" y2="106" stroke="#94A3B8" stroke-width="1.2"/>`;
      }
      return labFeet(18, 158, 244, 18, 6, 10) +
        `<rect x="18" y="142" width="244" height="16" rx="4" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="38" y="42" width="12" height="100" rx="2" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="230" y="42" width="12" height="100" rx="2" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        // Porcelain cylinder + wound wire
        `<rect x="50" y="67" width="180" height="40" rx="4" fill="#F8FAFC" stroke="${P.ink}" stroke-width="2.0"/>` +
        coils +
        `<line x1="52" y1="73" x2="228" y2="73" stroke="#FFFFFF" stroke-width="2" stroke-opacity="0.65"/>` +
        // Steel guide bar + sliding contact carriage
        `<rect x="44" y="48" width="192" height="7" rx="2" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="128" y="36" width="24" height="28" rx="4" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<path d="M140 64 V72" stroke="${P.brass}" stroke-width="3.2"/>` +
        // Terminals C (slider), A (left), B (right)
        bindingPost(140, 26, P.black, 'C', -12, 7) +
        bindingPost(44, 126, P.red, 'A', -12, 7) +
        bindingPost(236, 126, P.red, 'B', -12, 7);
    }, [
      { id: 'left-coil', x: 44, y: 126, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'right-coil', x: 236, y: 126, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'slider', x: 140, y: 26, dx: 0, dy: -1, type: 'wire', diameter: 0 },
      { id: 'base', x: 140, y: 164, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '瓷管滑线变阻器：密绕电阻丝瓷筒、顶部金属导杆与可调电刷滑片（接线柱 A/B/C）。');

  // 11. breadboard (KEEP ALL 176 HOLE PORTS + BASE EXACT!)
  const breadPorts = [{ id: 'base', x: 140, y: 150, dx: 0, dy: 1, type: 'base', diameter: 0 }];
  const breadYs = [38, 58, 69, 78, 98, 109, 119, 137];
  for (let c = 1; c <= 22; c++) {
    for (let r = 1; r <= 8; r++) {
      breadPorts.push({ id: `hole-${c}-${r}`, x: 31 + (c - 1) * 10, y: breadYs[r - 1], dx: 0, dy: 1, type: 'wire', diameter: 0 });
    }
  }
  add('breadboard', '无焊面包板', '电工设备',
    'breadboard 面包板 电子 实验 breadboard 免焊实验板', 280, 175, () => {
      let holes = '';
      for (let c = 1; c <= 22; c++) {
        const x = 31 + (c - 1) * 10;
        if (c === 1 || c % 5 === 0) holes += labelText(x, 30, String(c), 5.8, P.muted, 'middle', true);
        for (const y of breadYs) {
          holes += `<rect x="${x - 1.5}" y="${y - 1.5}" width="3" height="3" rx="0.5" fill="${P.ink}" stroke="none"/>`;
        }
      }
      return `<rect x="16" y="20" width="248" height="130" rx="6" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="22" y="24" width="236" height="122" rx="4" fill="#FFFFFF" stroke="${P.lightBorder}" stroke-width="1"/>` +
        // Top & bottom power bus stripes
        `<line x1="28" y1="33" x2="252" y2="33" stroke="${P.red}" stroke-width="1.2"/>` +
        `<line x1="28" y1="45" x2="252" y2="45" stroke="${P.blue}" stroke-width="1.2"/>` +
        `<line x1="28" y1="131" x2="252" y2="131" stroke="${P.red}" stroke-width="1.2"/>` +
        `<line x1="28" y1="143" x2="252" y2="143" stroke="${P.blue}" stroke-width="1.2"/>` +
        // Central DIP ravine
        `<rect x="26" y="84" width="228" height="7" rx="1.5" fill="#E2E8F0" stroke="${P.slate}" stroke-width="0.9"/>` +
        holes +
        labelText(22, 16, 'A-E', 7.5, P.slate, 'start') +
        labelText(258, 16, 'F-J', 7.5, P.slate, 'end');
    }, breadPorts, '400孔免焊面包板：双侧红蓝电源总线、中央 DIP 跨接隔离槽与完整对齐插孔矩阵。');

  // 12. knife-switch
  add('knife-switch', '单刀闸刀开关', '电工设备',
    'knife switch 闸刀开关 单刀 单掷 switch SPST', 250, 150, () => {
      return labFeet(24, 126, 202, 16, 6, 10) +
        `<rect x="22" y="102" width="206" height="24" rx="4" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.2"/>` +
        // Pivot post left + jaw clip right + raised blade
        `<rect x="64" y="76" width="16" height="26" rx="2" fill="url(#g-brass)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="172" y="78" width="14" height="24" rx="2" fill="url(#g-brass)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<path d="M72 84 L168 38 L173 48 L76 92 Z" fill="url(#g-copper)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="166" y="28" width="38" height="16" rx="6" transform="rotate(-24 185 36)" fill="${P.slate}" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<circle cx="72" cy="88" r="3.5" fill="#FFFFFF" stroke="${P.ink}" stroke-width="1.2"/>` +
        bindingPost(44, 114, P.black, 'A', -18, 7.5) +
        bindingPost(206, 114, P.red, 'B', -18, 7.5);
    }, [
      { id: 'a', x: 44, y: 114, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'b', x: 206, y: 114, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'base', x: 125, y: 132, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '单刀单掷闸刀开关：绝缘底座、紫铜闸刀片与绝缘胶木手柄。');

  // 13. isolation-transformer
  add('isolation-transformer', '实验变压器', '电工设备',
    'isolation transformer 变压器 原副线圈 互感 transformer', 230, 210, () => {
      let windingsL = '', windingsR = '';
      for (let wy = 70; wy <= 146; wy += 7) {
        windingsL += `<line x1="36" y1="${wy}" x2="78" y2="${wy}" stroke="#9A3412" stroke-width="1.2"/>`;
        windingsR += `<line x1="152" y1="${wy}" x2="194" y2="${wy}" stroke="#92400E" stroke-width="1.2"/>`;
      }
      return labFeet(24, 186, 182, 18, 7, 10) +
        // Terminal top strip
        `<rect x="20" y="22" width="190" height="24" rx="4" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.0"/>` +
        // Laminated steel E-I core
        `<rect x="64" y="46" width="102" height="126" rx="3" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="88" y="72" width="54" height="74" rx="2" fill="#FFFFFF" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="24" y="172" width="182" height="14" rx="3" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="2.0"/>` +
        // Left & right coil bobbins
        `<rect x="34" y="64" width="46" height="90" rx="3" fill="url(#g-copper)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="150" y="64" width="46" height="90" rx="3" fill="url(#g-brass)" stroke="${P.ink}" stroke-width="2.0"/>` +
        windingsL + windingsR +
        bindingPost(40, 34, P.red, 'P1', -14, 6.5) +
        bindingPost(68, 34, P.black, 'P2', -14, 6.5) +
        bindingPost(162, 34, P.red, 'S1', -14, 6.5) +
        bindingPost(190, 34, P.black, 'S2', -14, 6.5) +
        labelText(57, 166, 'PRI', 7, P.ink) +
        labelText(173, 166, 'SEC', 7, P.ink);
    }, [
      { id: 'primary-a', x: 40, y: 34, dx: 0, dy: -1, type: 'wire', diameter: 0 },
      { id: 'primary-b', x: 68, y: 34, dx: 0, dy: -1, type: 'wire', diameter: 0 },
      { id: 'secondary-a', x: 162, y: 34, dx: 0, dy: -1, type: 'wire', diameter: 0 },
      { id: 'secondary-b', x: 190, y: 34, dx: 0, dy: -1, type: 'wire', diameter: 0 },
      { id: 'base', x: 115, y: 193, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '可拆式实验隔离变压器：硅钢叠片铁芯、双绕组线包及原/副边接线柱。');

  // 14. dc-motor
  add('dc-motor', '直流电动机', '电工设备',
    'dc motor 电动机 马达 转子 motor', 270, 185, () => {
      return `<!-- Base mounting plate -->` +
        `<rect x="64" y="152" width="174" height="14" rx="3" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.0"/>` +
        // Drive shaft left
        `<rect x="20" y="96" width="44" height="14" rx="2" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="24" y="99" width="26" height="4" fill="${P.slate}" stroke="none"/>` +
        // End-bells + teal ribbed stator housing
        `<path d="M64 70 Q54 70 54 103 Q54 136 64 136 Z" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<path d="M234 70 Q246 70 246 103 Q246 136 234 136 Z" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="64" y="60" width="170" height="86" rx="5" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="2.2"/>` +
        // Cooling fins
        `<line x1="76" y1="74" x2="222" y2="74" stroke="#0F766E" stroke-width="2.4"/>` +
        `<line x1="76" y1="88" x2="222" y2="88" stroke="#99F6E4" stroke-width="1.8" stroke-opacity="0.65"/>` +
        `<line x1="76" y1="103" x2="222" y2="103" stroke="#0F766E" stroke-width="2.4"/>` +
        `<line x1="76" y1="118" x2="222" y2="118" stroke="#0F766E" stroke-width="2.4"/>` +
        `<line x1="76" y1="132" x2="222" y2="132" stroke="#0F766E" stroke-width="2.4"/>` +
        // Mounting feet struts
        `<path d="M84 146 L78 152 M214 146 L220 152" stroke="${P.ink}" stroke-width="4"/>` +
        // Top junction box
        `<rect x="148" y="32" width="66" height="28" rx="4" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.0"/>` +
        bindingPost(166, 46, P.red, '+', -16, 7) +
        bindingPost(196, 46, P.black, '-', -16, 7);
    }, [
      { id: 'positive', x: 166, y: 46, dx: 0, dy: -1, type: 'wire', diameter: 0 },
      { id: 'negative', x: 196, y: 46, dx: 0, dy: -1, type: 'wire', diameter: 0 },
      { id: 'base', x: 150, y: 166, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '永磁直流电动机：带散热筋定子壳体、键槽输出轴、底座固定板及顶部正负接线盒。');

  // 15. clamp-meter (clean modern True-RMS clamp multimeter!)
  add('clamp-meter', '钳形电流表', '电学与电子测量',
    'clamp meter 钳形 电流表 万用表 clamp', 125, 280, () => {
      return `<!-- Current transformer jaws -->` +
        `<path d="M52 72 C30 62 24 22 52 14 C56 13 60 16 60 22 C44 28 42 54 58 64 Z" fill="${P.red}" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<path d="M73 72 C95 62 101 22 73 14 C69 13 65 16 65 22 C81 28 83 54 67 64 Z" fill="${P.red}" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="34" y="68" width="57" height="10" rx="3" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.8"/>` +
        // Body
        `<rect x="26" y="78" width="73" height="186" rx="14" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="33" y="84" width="59" height="174" rx="10" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="1.6"/>` +
        // Trigger lever left
        `<path d="M26 88 H16 Q14 106 26 116 Z" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.8"/>` +
        // Rotary range selector
        rotaryKnob(62.5, 118, 17, -30, { ticks: 7 }) +
        // Backlit OLED readout
        oledScreen(38, 152, 49, 34,
          screenText(62.5, 171, '1.25 A', 10, P.screenGreen, 'middle') +
          screenText(62.5, 181, 'AC TRUE RMS', 5.5, P.screenCyan, 'middle')
        ) +
        softButton(40, 194, 20, 11, 'HOLD', '#E2E8F0', P.ink) +
        softButton(65, 194, 20, 11, 'REL', '#E2E8F0', P.ink) +
        bindingPost(46, 232, P.black, 'COM', -12, 7) +
        bindingPost(79, 232, P.red, 'VΩ', -12, 7);
    }, [
      { id: 'com', x: 46, y: 232, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'voltage', x: 79, y: 232, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'grip-site', x: 62.5, y: 146, dx: 1, dy: 0, type: 'grip-site', diameter: 0 },
    ], '真有效值钳形电流表：红色开口互感器钳口、单手扳机、档位旋钮、背光屏与 COM/VΩ 表笔插孔。');

  // 16. wheatstone-bridge
  add('wheatstone-bridge', '惠斯通电桥实验板', '电工设备',
    'wheatstone bridge 电桥 测电阻 wheatstone bridge', 280, 220, () => {
      return benchChassis(16, 16, 248, 182, { rx: 8, accentBar: true, footW: 20, footH: 7 }) +
        // Diamond bridge circuit lines
        `<polygon points="140,48 62,108 140,168 218,108" fill="none" stroke="${P.slate}" stroke-width="2.2"/>` +
        `<line x1="62" y1="108" x2="218" y2="108" stroke="${P.tealDark}" stroke-width="1.8"/>` +
        // 4 resistor blocks on bridge arms
        `<rect x="88" y="70" width="26" height="12" rx="2" transform="rotate(-37 101 76)" fill="#FFFFFF" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="166" y="70" width="26" height="12" rx="2" transform="rotate(37 179 76)" fill="#FFFFFF" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="88" y="132" width="26" height="12" rx="2" transform="rotate(37 101 138)" fill="#FFFFFF" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="166" y="132" width="26" height="12" rx="2" transform="rotate(-37 179 138)" fill="#CCFBF1" stroke="${P.tealDark}" stroke-width="1.8"/>` +
        labelText(84, 64, 'R1', 8, P.slate) + labelText(196, 64, 'R2', 8, P.slate) +
        labelText(84, 158, 'Rs', 8, P.slate) + labelText(196, 158, 'Rx', 8, P.tealDark) +
        // Center galvanometer circle
        `<circle cx="140" cy="108" r="17" fill="#FFFFFF" stroke="${P.ink}" stroke-width="2.0"/>` +
        labelText(140, 112, 'G', 11, P.tealDark) +
        // 4 bridge vertex binding posts
        bindingPost(140, 48, P.red, 'A', -11, 7) +
        bindingPost(62, 108, P.black, 'B', -12, 7) +
        bindingPost(140, 168, P.black, 'C', 16, 7) +
        bindingPost(218, 108, P.red, 'D', -12, 7);
    }, [
      { id: 'a', x: 140, y: 48, dx: 0, dy: -1, type: 'wire', diameter: 0 },
      { id: 'b', x: 62, y: 108, dx: -1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'c', x: 140, y: 168, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'd', x: 218, y: 108, dx: 1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'base', x: 140, y: 205, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '惠斯通电桥实验板：标准四臂菱形电路面板、中央检流计图标与 A/B/C/D 四端接线柱。');

  // 17. vernier-caliper
  add('vernier-caliper', '游标卡尺', '力学与计量',
    'vernier caliper 游标卡尺 卡尺 测量', 310, 160, () => {
      let mainTicks = '';
      for (let i = 0; i <= 46; i++) {
        const x = 48 + i * 5;
        const cm = i % 10 === 0, half = i % 5 === 0;
        mainTicks += `<line x1="${x}" y1="54" x2="${x}" y2="${cm ? 64 : half ? 61 : 58}" stroke="${P.ink}" stroke-width="${cm ? 1.0 : 0.7}"/>`;
        if (cm) mainTicks += labelText(x, 71, String(i / 10), 6.2, P.ink, 'middle', true);
      }
      let vernierTicks = '';
      for (let i = 0; i <= 10; i++) {
        const x = 90 + i * 4.5;
        const maj = i % 5 === 0;
        vernierTicks += `<line x1="${x}" y1="74" x2="${x}" y2="${maj ? 82 : 79}" stroke="${P.ink}" stroke-width="0.7"/>`;
      }
      return `<!-- Depth rod -->` +
        `<rect x="260" y="62" width="42" height="5" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.5"/>` +
        // Main beam + fixed jaws
        `<rect x="26" y="54" width="264" height="20" rx="1" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<path d="M42 54 V22 L47 28 L55 54 Z" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<path d="M26 74 V108 Q27 125 39 140 H43 V74 Z" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="2.0"/>` +
        mainTicks +
        // Sliding vernier carriage + movable jaws + lock thumbscrew
        `<path d="M77 54 L84 30 L89 22 V54 Z" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<path d="M89 74 V140 H93 Q108 124 108 108 V74 Z" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<path d="M82 50 H144 V56 H95 V74 H144 V90 H82 Z" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="1.8"/>` +
        vernierTicks +
        labelText(90, 88, '0', 5.8, P.ink) +
        labelText(112.5, 88, '5', 5.8, P.ink) +
        labelText(135, 88, '10', 5.8, P.ink) +
        // Locking screw & thumb wheel
        `<rect x="108" y="42" width="6" height="8" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.3"/>` +
        `<rect x="103" y="37" width="16" height="5" rx="1" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.3"/>` +
        `<circle cx="146" cy="84" r="5" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.4"/>` +
        labelText(224, 96, '0.02 mm', 7.5, P.slate);
    }, [
      { id: 'grip-site', x: 31, y: 95, dx: 1, dy: 0, type: 'grip-site', diameter: 0 },
    ], '不锈钢游标卡尺：外量爪、内量爪、主尺/游标尺刻线、锁紧螺钉、拇指滚轮与深度测杆。');

  // 18. micrometer
  add('micrometer', '外径千分尺', '力学与计量',
    'micrometer 螺旋测微器 千分尺 精密测量', 290, 200, () => {
      let sleeveTicks = '', thimbleTicks = '';
      for (let i = 0; i <= 10; i++) {
        const x = 154 + i * 4;
        sleeveTicks += `<line x1="${x}" y1="74" x2="${x}" y2="${i % 5 === 0 ? 67 : 70}" stroke="${P.ink}" stroke-width="0.8"/>`;
        if (i < 10) sleeveTicks += `<line x1="${x + 2}" y1="74" x2="${x + 2}" y2="78" stroke="${P.ink}" stroke-width="0.7"/>`;
      }
      for (let i = 0; i < 6; i++) {
        const y = 62 + i * 4.8;
        thimbleTicks += `<line x1="204" y1="${y}" x2="${i === 2 ? 215 : 211}" y2="${y}" stroke="${P.ink}" stroke-width="0.8"/>`;
      }
      return `<!-- Insulated C-frame -->` +
        `<path d="M68 62 C26 62 22 154 88 158 C128 160 144 134 148 92 H130 C126 120 112 140 88 140 C44 138 46 80 68 80 Z" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="2.2"/>` +
        // Anvil & spindle
        `<rect x="68" y="64" width="22" height="16" rx="1" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="116" y="66" width="34" height="12" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="134" y="54" width="16" height="36" rx="2" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        // Lock ring
        `<rect x="142" y="46" width="5" height="10" rx="1" fill="${P.brass}" stroke="${P.ink}" stroke-width="1.2"/>` +
        // Sleeve
        `<rect x="150" y="62" width="52" height="24" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<line x1="152" y1="74" x2="200" y2="74" stroke="${P.ink}" stroke-width="1.0"/>` +
        sleeveTicks +
        // Thimble + ratchet stop
        `<polygon points="202,62 216,56 216,92 202,86" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="1.8"/>` +
        thimbleTicks +
        `<rect x="216" y="56" width="38" height="36" rx="2" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="254" y="62" width="18" height="24" rx="3" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.8"/>` +
        labelText(214, 118, '0-25 mm  0.01 mm', 7.5, P.slate);
    }, [
      { id: 'grip-site', x: 91, y: 150, dx: 1, dy: 0, type: 'grip-site', diameter: 0 },
    ], '0–25 mm 外径螺旋测微器（千分尺）：隔热 C 形尺架、测砧测微螺杆、固定套筒与棘轮测力微分筒。');

  // 19. spring-dynamometer
  add('spring-dynamometer', '弹簧测力计', '力学与计量',
    'spring dynamometer 弹簧测力计 测力计 弹簧秤', 110, 285, () => {
      let spring = '<path d="M51 54';
      for (let i = 0; i < 8; i++) {
        const y1 = 58 + i * 11, y2 = y1 + 5.5;
        spring += ` L61 ${y1} L41 ${y2}`;
      }
      spring += ' L51 148" fill="none" stroke="' + P.ink + '" stroke-width="1.8"/>';
      let ticks = '';
      for (let i = 0; i <= 10; i++) {
        const y = 104 + i * 11;
        const maj = i % 2 === 0;
        ticks += `<line x1="60" y1="${y}" x2="${maj ? 72 : 66}" y2="${y}" stroke="${P.ink}" stroke-width="${maj ? 1.2 : 0.8}"/>`;
        if (maj) ticks += labelText(76, y + 2.5, String(i / 2), 6.5, P.slate, 'start', true);
      }
      return `<!-- Top ring -->` +
        `<circle cx="51" cy="14" r="8" fill="none" stroke="${P.ink}" stroke-width="2.2"/>` +
        // Body chassis
        `<rect x="28" y="24" width="46" height="208" rx="6" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="33" y="28" width="12" height="200" rx="2" fill="url(#g-teal)" stroke="none"/>` +
        `<rect x="40" y="42" width="22" height="180" rx="3" fill="#FFFFFF" stroke="${P.slate}" stroke-width="1.3"/>` +
        spring +
        `<line x1="51" y1="148" x2="51" y2="254" stroke="${P.ink}" stroke-width="2.2"/>` +
        // Pointer needle
        `<polygon points="44,170 60,170 57,174 44,174" fill="${P.red}" stroke="${P.ink}" stroke-width="1.0"/>` +
        ticks +
        labelText(78, 92, 'N', 8.5, P.tealDark, 'start', true) +
        // Bottom hook
        `<path d="M51 254 V260 C51 269 60 272 60 264 C60 258 55 258 52 260" fill="none" stroke="${P.ink}" stroke-width="2.2"/>`;
    }, [
      { id: 'hook', x: 52, y: 272, dx: 0, dy: 1, type: 'hook', diameter: 0 },
      { id: 'hanger', x: 51, y: 6, dx: 0, dy: -1, type: 'hanger', diameter: 0 },
    ], '5 N 弹簧测力计：顶部悬挂圆环、内部螺旋弹簧、牛顿刻度尺、红色指针及底端挂钩。');

  // 20. force-sensor
  add('force-sensor', '力传感器', '力学与计量',
    'force sensor 力 传感器 force sensor 拉压力传感器', 270, 125, () => {
      return `<!-- Left hook & load cell shaft -->` +
        `<path d="M40 62 H28 C20 62 18 72 26 74 C31 75 34 70 30 68" fill="none" stroke="${P.ink}" stroke-width="2.4"/>` +
        `<rect x="40" y="56" width="22" height="12" rx="1" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        // Sensor housing (clean brushed aluminum)
        `<rect x="62" y="28" width="144" height="68" rx="9" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.8"/>` +
        `<line x1="72" y1="31" x2="196" y2="31" stroke="${P.panelBg}" stroke-width="1.5"/>` +
        oledScreen(82, 46, 74, 34,
          screenText(119, 62, '+4.90 N', 10, P.screenGreen, 'middle') +
          screenText(119, 73, '100 Hz  ZERO', 6.2, P.screenCyan, 'middle')
        ) +
        softButton(164, 52, 28, 22, 'TARE', '#3E74B4', '#FFFFFF') +
        // Signal cable + DIN connector right
        `<line x1="206" y1="62" x2="232" y2="62" stroke="${P.ink}" stroke-width="2.8"/>` +
        `<rect x="232" y="48" width="22" height="28" rx="3" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<circle cx="254" cy="62" r="4" fill="${P.red}" stroke="${P.ink}" stroke-width="1.2"/>`;
    }, [
      { id: 'hook', x: 24, y: 70, dx: -1, dy: 0, type: 'hook', diameter: 0 },
      { id: 'signal', x: 254, y: 62, dx: 1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'grip-site', x: 134, y: 62, dx: 1, dy: 0, type: 'grip-site', diameter: 0 },
    ], '数字力学传感器：测力拉压挂钩、去皮归零键、实时示数屏及信号输出插头。');

  // 21. air-track
  add('air-track', '气垫导轨', '力学实验',
    'air track 气垫 导轨 空气 air track', 320, 160, () => {
      let scaleTicks = '', jetHoles = '';
      for (let x = 28; x <= 290; x += 12) {
        jetHoles += `<circle cx="${x}" cy="52" r="1.1" fill="${P.ink}" stroke="none"/>`;
        scaleTicks += `<line x1="${x}" y1="68" x2="${x}" y2="${x % 24 === 4 ? 76 : 73}" stroke="${P.slate}" stroke-width="0.8"/>`;
      }
      return `<!-- Pedestals & leveling feet -->` +
        `<rect x="58" y="84" width="12" height="44" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="42" y="128" width="44" height="10" rx="2" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="248" y="84" width="12" height="44" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="232" y="128" width="44" height="10" rx="2" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.8"/>` +
        // Extruded aluminum rail + millimeter ruler
        `<rect x="16" y="48" width="286" height="36" rx="2" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="16" y="48" width="286" height="8" fill="${P.teal}" fill-opacity="0.3" stroke="${P.ink}" stroke-width="1.4"/>` +
        `<rect x="22" y="66" width="274" height="12" fill="#FFFFFF" stroke="${P.slate}" stroke-width="1.0"/>` +
        jetHoles + scaleTicks +
        // Brass barbed air inlet right
        `<rect x="302" y="60" width="12" height="12" rx="2" fill="url(#g-brass)" stroke="${P.ink}" stroke-width="1.6"/>` +
        labelText(160, 148, 'AIR TRACK (1.2 m)', 7.5, P.muted);
    }, [
      { id: 'base', x: 160, y: 138, dx: 0, dy: 1, type: 'base', diameter: 0 },
      { id: 'air-in', x: 314, y: 66, dx: 1, dy: 0, type: 'air-in', diameter: 0 },
      { id: 'track', x: 160, y: 48, dx: 0, dy: -1, type: 'air-rail', diameter: 0, segment: [40, 48, 280, 48] },
    ], '铝质三角气垫导轨：顶部喷气小孔、毫米刻度标尺、调平支座与右侧进气嘴。');

  // 22. air-track-glider
  add('air-track-glider', '气垫导轨滑块', '力学实验',
    'air track glider 滑块 挡光片 气垫 glider', 210, 170, () => {
      return `<!-- Inverted V glider saddle + photogate flag + spring bumpers -->` +
        `<path d="M36 106 L70 52 L140 52 L174 106 H154 L132 72 H78 L56 106 Z" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="74" y="54" width="62" height="12" rx="2" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="1.6"/>` +
        // Photogate interrupter flag on top
        `<rect x="96" y="16" width="18" height="36" rx="1" fill="${P.ink}" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<rect x="92" y="48" width="26" height="6" rx="1" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.4"/>` +
        // Left & right elastic bumpers
        `<line x1="22" y1="80" x2="54" y2="80" stroke="${P.ink}" stroke-width="2.8"/>` +
        `<rect x="18" y="72" width="6" height="16" rx="1.5" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.4"/>` +
        `<line x1="156" y1="80" x2="188" y2="80" stroke="${P.ink}" stroke-width="2.8"/>` +
        `<rect x="186" y="72" width="6" height="16" rx="1.5" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.4"/>`;
    }, [
      { id: 'carriage', x: 105, y: 72, dx: 0, dy: 1, type: 'air-glider', diameter: 0 },
    ], '倒 V 形气垫导轨滑块：底部通槽跨骑导轨、顶部挡光片与两侧弹性碰撞缓冲杆。');

  // 23. air-track-pump
  add('air-track-pump', '气垫导轨气源', '力学实验',
    'air track pump 气源 鼓风 气泵 air blower', 230, 190, () => {
      let grille = '';
      for (const r of [12, 22, 32]) {
        grille += `<circle cx="78" cy="112" r="${r}" fill="none" stroke="${P.slate}" stroke-width="1.4"/>`;
      }
      return `<!-- Top carrying handle -->` +
        `<path d="M84 36 V22 Q84 16 92 16 H138 Q146 16 146 22 V36" fill="none" stroke="${P.ink}" stroke-width="5"/>` +
        `<path d="M84 36 V22 Q84 16 92 16 H138 Q146 16 146 22 V36" fill="none" stroke="${P.slate}" stroke-width="2.2"/>` +
        benchChassis(20, 36, 180, 134, { rx: 9, accentBar: true, footW: 18, footH: 7 }) +
        `<circle cx="78" cy="112" r="38" fill="#E2E8F0" stroke="${P.ink}" stroke-width="2.0"/>` +
        grille +
        `<circle cx="78" cy="112" r="5" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.3"/>` +
        rotaryKnob(154, 88, 16, 40, { ticks: 7, teal: true }) +
        labelText(154, 115, 'AIRFLOW', 7, P.slate) +
        `<rect x="142" y="130" width="24" height="18" rx="2" fill="${P.red}" stroke="${P.ink}" stroke-width="1.6"/>` +
        labelText(154, 142, 'ON', 7, '#FFFFFF') +
        // Brass hose outlet nozzle right
        `<rect x="200" y="102" width="18" height="16" rx="2" fill="url(#g-brass)" stroke="${P.ink}" stroke-width="1.8"/>`;
    }, [
      { id: 'base', x: 110, y: 177, dx: 0, dy: 1, type: 'base', diameter: 0 },
      { id: 'air-out', x: 218, y: 110, dx: 1, dy: 0, type: 'air-out', diameter: 0 },
    ], '低噪气垫导轨鼓风气源：圆形进风格栅、风压无级调节旋钮、手提把与侧出风嘴。');

  // 24. photogate-timer
  add('photogate-timer', '光电门计时器', '力学与计量',
    'photogate timer 光电门 计时 计数 timer photogate 数字毫秒计', 280, 190, () => {
      return benchChassis(16, 20, 248, 148, { rx: 8, accentBar: true, footW: 20, footH: 7 }) +
        oledScreen(30, 38, 180, 48,
          screenText(120, 62, '0.01234 s', 13, P.screenGreen, 'middle') +
          screenText(120, 77, 'MODE: S2   MEM 01', 7.5, P.screenCyan, 'middle')
        ) +
        rotaryKnob(234, 62, 14, -40, { ticks: 5, teal: true }) +
        labelText(234, 86, 'MODE', 6.8, P.slate) +
        softButton(32, 108, 34, 22, 'RESET', '#FEE2E2', P.red) +
        softButton(72, 108, 34, 22, 'NEXT', '#E2E8F0', P.ink) +
        bindingPost(136, 138, P.tealDark, 'GATE A', -12, 7) +
        bindingPost(182, 138, P.brass, 'GATE B', -12, 7) +
        bindingPost(228, 138, P.red, 'TRIG', -12, 7);
    }, [
      { id: 'gate-a', x: 136, y: 138, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'gate-b', x: 182, y: 138, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'trigger', x: 228, y: 138, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'base', x: 140, y: 175, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '多功能数字毫秒计时器：双通道光电门输入及外触发端口。');

  // 25. single-pendulum
  add('single-pendulum', '单摆实验架', '力学实验',
    'single pendulum 单摆 摆长 周期 pendulum', 220, 300, () => {
      return `<rect x="44" y="274" width="132" height="14" rx="4" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="148" y="22" width="10" height="252" rx="2" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="88" y="24" width="76" height="10" rx="2" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="144" y="20" width="18" height="18" rx="3" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<circle cx="96" cy="34" r="3" fill="${P.ink}" stroke="none"/>` +
        // Dashed oscillation arc & angled ghost position
        `<path d="M62 232 Q96 246 132 232" fill="none" stroke="${P.muted}" stroke-width="1.2" stroke-dasharray="4 3"/>` +
        `<line x1="96" y1="34" x2="72" y2="232" stroke="${P.muted}" stroke-width="1.2" stroke-dasharray="3 3"/>` +
        // Main plumb string + brass pendulum bob
        `<line x1="96" y1="34" x2="96" y2="226" stroke="${P.ink}" stroke-width="1.5"/>` +
        `<circle cx="96" cy="240" r="14" fill="url(#g-brass)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<circle cx="91" cy="235" r="3.5" fill="#FEF3C7" stroke="none"/>`;
    }, [
      { id: 'base', x: 110, y: 288, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '单摆周期实验架：稳定立柱悬臂、固定悬点、摆线及黄铜摆球与摆动轨迹虚线。');

  // 26. lever-apparatus
  add('lever-apparatus', '杠杆平衡实验架', '力学实验',
    'lever apparatus 杠杆 平衡 力矩 lever', 300, 230, () => {
      let ticks = '';
      for (let i = -8; i <= 8; i++) {
        const x = 150 + i * 14;
        ticks += `<line x1="${x}" y1="54" x2="${x}" y2="${i === 0 ? 66 : i % 2 === 0 ? 62 : 59}" stroke="${P.ink}" stroke-width="${i === 0 ? 1.4 : 0.9}"/>`;
      }
      return `<rect x="84" y="200" width="132" height="14" rx="4" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="145" y="72" width="10" height="128" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="2.0"/>` +
        // Central knife fulcrum
        `<polygon points="150,64 140,78 160,78" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.8"/>` +
        // Graduated lever beam
        `<rect x="22" y="52" width="256" height="14" rx="2" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.0"/>` +
        ticks +
        // Left weights (at x=66) & Right weights (at x=220)
        `<rect x="62" y="50" width="8" height="18" rx="1" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.2"/>` +
        `<line x1="66" y1="68" x2="66" y2="112" stroke="${P.ink}" stroke-width="1.5"/>` +
        `<rect x="52" y="112" width="28" height="28" rx="2" fill="url(#g-brass)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="216" y="50" width="8" height="18" rx="1" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.2"/>` +
        `<line x1="220" y1="68" x2="220" y2="122" stroke="${P.ink}" stroke-width="1.5"/>` +
        `<rect x="208" y="122" width="24" height="20" rx="2" fill="url(#g-brass)" stroke="${P.ink}" stroke-width="1.8"/>`;
    }, [
      { id: 'base', x: 150, y: 214, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '等分刻度杠杆力矩平衡架：中央刀口支点、对称刻度横梁与可挂钩码。');

  // 27. pulley-block
  add('pulley-block', '动滑轮组', '力学实验',
    'pulley block 滑轮组 定滑轮 动滑轮 pulley block', 210, 310, () => {
      return `<!-- Top hanger hook -->` +
        `<path d="M105 26 V16 C105 8 114 8 114 14" fill="none" stroke="${P.ink}" stroke-width="2.4"/>` +
        `<rect x="34" y="26" width="142" height="14" rx="3" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.0"/>` +
        // Braided cord passing continuously around fixed & movable sheaves
        `<path d="M105 164 V68 A24 24 0 0 1 153 68 V214 A26 26 0 0 1 101 214 V68 A24 24 0 0 0 53 68 V174" fill="none" stroke="${P.brass}" stroke-width="2.6"/>` +
        // Left & right upper fixed pulleys
        `<rect x="70" y="40" width="14" height="58" rx="4" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<circle cx="77" cy="68" r="22" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<circle cx="77" cy="68" r="6" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.4"/>` +
        `<rect x="122" y="40" width="14" height="58" rx="4" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<circle cx="129" cy="68" r="22" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<circle cx="129" cy="68" r="6" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.4"/>` +
        // Lower movable pulley + frame + load hook
        `<rect x="98" y="164" width="14" height="84" rx="4" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<circle cx="105" cy="214" r="24" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<circle cx="105" cy="214" r="6" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.4"/>` +
        `<path d="M105 248 V276 C105 286 114 288 114 280" fill="none" stroke="${P.ink}" stroke-width="2.4"/>`;
    }, [
      { id: 'hanger', x: 109, y: 8, dx: 0, dy: -1, type: 'hanger', diameter: 0 },
      { id: 'hook', x: 106, y: 290, dx: 0, dy: 1, type: 'hook', diameter: 0 },
    ], '二定一动省力滑轮组：金属护板槽轮、连续绕绳路径及上下吊钩。');

  // 28. rotational-inertia-apparatus
  add('rotational-inertia-apparatus', '转动惯量实验仪', '力学实验',
    'rotational inertia apparatus 转动 惯量 转盘 rotational inertia', 280, 245, () => {
      return `<!-- Leveling tripod base -->` +
        `<rect x="44" y="210" width="192" height="12" rx="4" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="52" y="222" width="16" height="6" rx="2" fill="${P.ink}"/>` +
        `<rect x="212" y="222" width="16" height="6" rx="2" fill="${P.ink}"/>` +
        // Vertical spindle & tower pulley arm
        `<rect x="128" y="64" width="12" height="146" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="116" y="96" width="36" height="16" rx="3" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="148" y="102" width="74" height="7" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="1.6"/>` +
        // Horizontal rotating inertia disc + concentric ring
        `<ellipse cx="134" cy="54" rx="84" ry="18" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<ellipse cx="134" cy="54" rx="58" ry="10" fill="none" stroke="${P.slate}" stroke-width="1.3"/>` +
        `<circle cx="134" cy="54" r="6" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.4"/>` +
        // Guide pulley & falling mass
        `<line x1="152" y1="104" x2="224" y2="104" stroke="${P.brass}" stroke-width="1.8"/>` +
        `<circle cx="224" cy="112" r="9" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<line x1="233" y1="112" x2="233" y2="156" stroke="${P.brass}" stroke-width="1.8"/>` +
        `<rect x="221" y="156" width="24" height="32" rx="3" fill="url(#g-brass)" stroke="${P.ink}" stroke-width="1.8"/>`;
    }, [
      { id: 'base', x: 140, y: 228, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '定轴转动惯量实验仪：水平铝质转盘、阶梯绕线塔轮、定滑轮及悬重砝码。');

  // 29. free-fall-apparatus
  add('free-fall-apparatus', '自由落体实验架', '力学实验',
    'free fall apparatus 自由落体 重力 加速度 free fall', 190, 300, () => {
      let ticks = '';
      for (let y = 56; y <= 248; y += 16) {
        ticks += `<line x1="126" y1="${y}" x2="${y % 32 === 24 ? 116 : 121}" y2="${y}" stroke="${P.ink}" stroke-width="1.0"/>`;
      }
      return `<rect x="40" y="274" width="110" height="14" rx="4" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="46" y="266" width="46" height="8" rx="2" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.5"/>` +
        // Vertical graduated column
        `<rect x="126" y="22" width="12" height="252" rx="2" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="2.0"/>` +
        ticks +
        // Top electromagnetic dropper + steel sphere
        `<rect x="54" y="22" width="72" height="10" rx="2" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="60" y="32" width="20" height="14" rx="2" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<circle cx="70" cy="54" r="8" fill="url(#g-brass)" stroke="${P.ink}" stroke-width="1.8"/>` +
        // Drop path dashed line + 2 photogates
        `<line x1="70" y1="62" x2="70" y2="264" stroke="${P.muted}" stroke-width="1.3" stroke-dasharray="4 3"/>` +
        `<rect x="56" y="106" width="70" height="12" rx="2" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<rect x="56" y="186" width="70" height="12" rx="2" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="1.6"/>`;
    }, [
      { id: 'base', x: 95, y: 288, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '自由落体实验架：电磁释放线圈、落体钢球、标尺立柱、上下双光电门与缓冲垫。');

  // 30. optical-bench (keep track rail at y=121!)
  add('optical-bench', '光具座 / 光学导轨', '光学实验',
    'optical bench 光具座 导轨 凸透镜 屏 optical bench', 320, 170, () => {
      let ticks = '', nums = '';
      for (let x = 32; x <= 288; x += 6) {
        const major = (x - 32) % 30 === 0;
        ticks += `<line x1="${x}" y1="122" x2="${x}" y2="${major ? 131 : 126}" stroke="${P.ink}" stroke-width="${major ? 1.1 : 0.75}"/>`;
        if (major) nums += labelText(x, 138, String((x - 32) / 3), 5.8, P.slate);
      }
      return `<!-- Heavy cast-slate pedestal feet with leveling screws -->` +
        `<rect x="30" y="140" width="28" height="9" rx="2" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<rect x="262" y="140" width="28" height="9" rx="2" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<circle cx="44" cy="144" r="2.2" fill="url(#g-brass)" stroke="none"/>` +
        `<circle cx="276" cy="144" r="2.2" fill="url(#g-brass)" stroke="none"/>` +
        // Precision machined dovetail optical rail + millimeter scale + end bumpers
        `<rect x="16" y="121" width="288" height="19" rx="2" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="14" y="116" width="8" height="24" rx="2" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<rect x="298" y="116" width="8" height="24" rx="2" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="1.6"/>` +
        ticks + nums +
        labelText(160, 108, 'OPTICAL BENCH RAIL (cm)', 7.2, P.muted);
    }, [
      { id: 'base', x: 160, y: 149, dx: 0, dy: 1, type: 'base', diameter: 0 },
      { id: 'track', x: 160, y: 121, dx: 0, dy: -1, type: 'optical-rail', diameter: 0, segment: [22, 121, 300, 121] },
    ], '精密刻度光学导轨光具座：带毫米分划尺、调平底脚与两端限位块。');

  // 31. laser-source
  add('laser-source', '实验激光光源', '光学实验',
    'laser source 激光 光源 laser He-Ne 半导体激光器', 275, 170, () => {
      return `<!-- Slider carriage & post -->` +
        `<rect x="118" y="142" width="68" height="14" rx="3" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="146" y="92" width="12" height="50" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<circle cx="158" cy="116" r="5" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.4"/>` +
        // Twin mounting clamps
        `<rect x="94" y="42" width="12" height="44" rx="2" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<rect x="196" y="42" width="12" height="44" rx="2" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<rect x="92" y="84" width="120" height="8" rx="2" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="1.6"/>` +
        // Cylindrical laser barrel
        `<rect x="74" y="46" width="166" height="36" rx="5" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<line x1="88" y1="54" x2="226" y2="54" stroke="#99F6E4" stroke-width="2.2" stroke-opacity="0.6"/>` +
        `<rect x="68" y="50" width="8" height="28" rx="2" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.8"/>` +
        // Output aperture & laser beam indicator
        `<circle cx="68" cy="64" r="3.5" fill="${P.red}" stroke="${P.ink}" stroke-width="1.0"/>` +
        `<line x1="22" y1="64" x2="65" y2="64" stroke="${P.red}" stroke-width="2.2"/>` +
        // Power cord rear
        `<path d="M240 64 Q260 66 264 84" fill="none" stroke="${P.ink}" stroke-width="2.2"/>`;
    }, [
      { id: 'base', x: 152, y: 156, dx: 0, dy: 1, type: 'base', diameter: 0 },
      { id: 'carriage', x: 152, y: 156, dx: 0, dy: 1, type: 'optical-carriage', diameter: 0 },
      { id: 'beam-out', x: 65, y: 64, dx: -1, dy: 0, type: 'optical-out', diameter: 0 },
    ], '氦氖/半导体教学激光光源：双环抱箍支架、升降微调支杆及准直出光孔。');

  // 32. optical-screen
  add('optical-screen', '光学接收屏', '光学实验',
    'optical screen 光屏 接收屏 screen 成像屏', 190, 230, () => {
      return `<rect x="64" y="198" width="62" height="14" rx="3" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="89" y="156" width="12" height="42" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="26" y="20" width="138" height="136" rx="4" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="34" y="28" width="122" height="120" rx="2" fill="#FFFFFF" stroke="${P.slate}" stroke-width="1.2"/>` +
        `<line x1="95" y1="34" x2="95" y2="142" stroke="#CBD5E1" stroke-width="1.0"/>` +
        `<line x1="40" y1="88" x2="150" y2="88" stroke="#CBD5E1" stroke-width="1.0"/>` +
        `<circle cx="95" cy="88" r="18" fill="none" stroke="#CBD5E1" stroke-width="0.9" stroke-dasharray="3 3"/>`;
    }, [
      { id: 'base', x: 95, y: 212, dx: 0, dy: 1, type: 'base', diameter: 0 },
      { id: 'carriage', x: 95, y: 212, dx: 0, dy: 1, type: 'optical-carriage', diameter: 0 },
      { id: 'beam-in', x: 95, y: 88, dx: 1, dy: 0, type: 'optical-in', diameter: 0 },
    ], '光学漫反射接收屏：洁白带中心准直十字靶面、升降支杆与导轨滑座。');

  // 33. double-slit
  add('double-slit', '双缝实验片', '光学实验',
    'double slit 双缝 干涉 double slit 杨氏双缝', 160, 190, () => {
      return `<rect x="48" y="158" width="64" height="14" rx="3" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="75" y="132" width="10" height="26" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="30" y="26" width="100" height="106" rx="5" fill="${P.panelAlt}" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="42" y="38" width="76" height="82" rx="2" fill="${P.ink}" stroke="${P.ink}" stroke-width="1.6"/>` +
        // Two crisp vertical slits
        `<line x1="76" y1="54" x2="76" y2="104" stroke="#FFFFFF" stroke-width="2.2"/>` +
        `<line x1="84" y1="54" x2="84" y2="104" stroke="#FFFFFF" stroke-width="2.2"/>` +
        labelText(80, 185, 'DOUBLE SLIT', 7, P.slate);
    }, [
      { id: 'carriage', x: 80, y: 172, dx: 0, dy: 1, type: 'optical-carriage', diameter: 0 },
      { id: 'beam-in', x: 75, y: 79, dx: -1, dy: 0, type: 'optical-in', diameter: 0 },
      { id: 'beam-out', x: 85, y: 79, dx: 1, dy: 0, type: 'optical-out', diameter: 0 },
    ], '杨氏双缝干涉实验片：不透明遮光框内置两条精密竖直狭缝。');

  // 34. diffraction-grating
  add('diffraction-grating', '衍射光栅片', '光学实验',
    'diffraction grating 光栅 衍射 diffraction grating 透射光栅', 160, 190, () => {
      let lines = '';
      for (let gx = 48; gx <= 112; gx += 4) {
        lines += `<line x1="${gx}" y1="42" x2="${gx}" y2="116" stroke="${P.tealDark}" stroke-width="0.9" stroke-opacity="0.7"/>`;
      }
      return `<rect x="48" y="158" width="64" height="14" rx="3" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="75" y="132" width="10" height="26" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="30" y="26" width="100" height="106" rx="5" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="42" y="38" width="76" height="82" rx="2" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="1.6"/>` +
        lines +
        labelText(80, 185, '600 lines/mm', 7, P.slate);
    }, [
      { id: 'carriage', x: 80, y: 172, dx: 0, dy: 1, type: 'optical-carriage', diameter: 0 },
      { id: 'beam-in', x: 76, y: 79, dx: -1, dy: 0, type: 'optical-in', diameter: 0 },
      { id: 'beam-out', x: 84, y: 79, dx: 1, dy: 0, type: 'optical-out', diameter: 0 },
    ], '透射衍射光栅片：精密刻线光学玻璃窗口与光学滑座支架。');

  // 35. spectrometer
  add('spectrometer', '分光计', '光学实验',
    'spectrometer 分光计 三棱镜 测角 spectrometer 光学分光计', 300, 260, () => {
      let dialTicks = '';
      for (let i = 0; i < 24; i++) {
        const a = (i * 15) * Math.PI / 180;
        const x1 = 150 + Math.cos(a) * 68, y1 = 182 + Math.sin(a) * 20;
        const x2 = 150 + Math.cos(a) * 76, y2 = 182 + Math.sin(a) * 23;
        dialTicks += `<line x1="${fmt(x1)}" y1="${fmt(y1)}" x2="${fmt(x2)}" y2="${fmt(y2)}" stroke="${P.ink}" stroke-width="0.8"/>`;
      }
      return `<!-- Heavy tripod base & leveling feet -->` +
        `<path d="M98 198 L78 232 M150 208 V240 M202 198 L222 232" stroke="${P.slate}" stroke-width="7"/>` +
        `<rect x="68" y="232" width="20" height="6" rx="2" fill="${P.ink}"/>` +
        `<rect x="140" y="240" width="20" height="6" rx="2" fill="${P.ink}"/>` +
        `<rect x="212" y="232" width="20" height="6" rx="2" fill="${P.ink}"/>` +
        // Circular goniometer degree scale plate
        `<ellipse cx="150" cy="186" rx="84" ry="26" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<ellipse cx="150" cy="182" rx="76" ry="23" fill="#FFFFFF" stroke="${P.slate}" stroke-width="1.2"/>` +
        dialTicks +
        // Support arms for collimator & rotating telescope
        `<path d="M68 118 V164 L126 180" fill="none" stroke="${P.slate}" stroke-width="6"/>` +
        `<path d="M150 182 L212 190 V162" fill="none" stroke="${P.slate}" stroke-width="6"/>` +
        // Central prism table + equilateral glass prism
        `<rect x="143" y="138" width="14" height="44" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<ellipse cx="150" cy="134" rx="40" ry="11" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<polygon points="134,128 166,128 150,94" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="2.0"/>` +
        // Collimator left
        `<rect x="22" y="100" width="90" height="22" rx="3" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="14" y="102" width="10" height="18" rx="1.5" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.6"/>` +
        // Rotating telescope right
        `<g transform="translate(184 126) rotate(28)">` +
        `<rect x="0" y="-11" width="76" height="22" rx="3" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="76" y="-7" width="14" height="14" rx="2" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.6"/>` +
        `</g>`;
    }, [
      { id: 'base', x: 150, y: 246, dx: 0, dy: 1, type: 'base', diameter: 0 },
      { id: 'beam-in', x: 14, y: 111, dx: -1, dy: 0, type: 'optical-in', diameter: 0 },
    ], '光学测角分光计：三脚调平底座、刻度圆盘与游标、中央载物台三棱镜、平行光管与可转望远镜。');

  // 36. michelson-interferometer
  add('michelson-interferometer', '迈克尔逊干涉仪', '光学实验',
    'michelson interferometer 迈克尔逊 干涉仪 Michelson interferometer', 300, 245, () => {
      return benchChassis(24, 18, 252, 198, { rx: 8, accentBar: true, footW: 20, footH: 7 }) +
        // Fixed mirror M2 top
        `<rect x="126" y="38" width="48" height="16" rx="2" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="126" y="51" width="48" height="5" fill="#99F6E4" stroke="${P.ink}" stroke-width="1.3"/>` +
        labelText(150, 34, 'M2', 7.5, P.slate) +
        // Movable mirror M1 + micrometer drum right
        `<rect x="218" y="96" width="16" height="48" rx="2" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="214" y="96" width="5" height="48" fill="#99F6E4" stroke="${P.ink}" stroke-width="1.3"/>` +
        rotaryKnob(252, 120, 12, -30, { ticks: 5, teal: true }) +
        labelText(252, 144, 'FINE', 6.8, P.slate) +
        labelText(205, 92, 'M1', 7.5, P.slate) +
        // 45-degree beamsplitter & compensator
        `<path d="M130 138 L168 100 L172 104 L134 142 Z" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="1.8"/>` +
        labelText(120, 152, 'BS', 7.5, P.slate) +
        // Optical beam rays
        `<line x1="24" y1="120" x2="214" y2="120" stroke="${P.red}" stroke-width="1.6"/>` +
        `<line x1="150" y1="56" x2="150" y2="196" stroke="${P.red}" stroke-width="1.6"/>` +
        // Output viewer port bottom
        `<rect x="130" y="184" width="40" height="14" rx="2" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="1.6"/>` +
        labelText(150, 236, 'MICHELSON', 7.5, P.muted);
    }, [
      { id: 'base', x: 150, y: 223, dx: 0, dy: 1, type: 'base', diameter: 0 },
      { id: 'beam-in', x: 24, y: 120, dx: -1, dy: 0, type: 'optical-in', diameter: 0 },
      { id: 'beam-out', x: 150, y: 198, dx: 0, dy: 1, type: 'optical-out', diameter: 0 },
    ], '迈克尔逊双光束干涉仪俯视光路：45°分束镜、固定反射镜 M2、微调移动镜 M1 与观察窗。');

  // 37. tuning-fork
  add('tuning-fork', '音叉与共鸣箱', '波动与声学实验',
    'tuning fork 音叉 共鸣 声 tuning fork 440Hz', 200, 240, () => {
      return labFeet(32, 206, 136, 16, 6, 10) +
        // Wooden/laminated acoustic resonance box
        `<rect x="30" y="140" width="140" height="66" rx="4" fill="#F1F5F9" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="44" y="154" width="112" height="38" rx="3" fill="${P.screenBg}" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<rect x="92" y="130" width="16" height="10" rx="1" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.6"/>` +
        // Steel U-shaped tuning fork
        `<path d="M80 26 V96 Q80 116 100 116 Q120 116 120 96 V26 H110 V94 Q110 106 100 106 Q90 106 90 94 V26 Z" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="96" y="116" width="8" height="14" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.6"/>` +
        // Subtle acoustic wave arcs
        `<path d="M66 42 Q60 54 66 66 M134 42 Q140 54 134 66" fill="none" stroke="${P.teal}" stroke-width="1.4" stroke-dasharray="3 2"/>` +
        labelText(100, 177, '440 Hz', 9, P.screenCyan, 'middle', true);
    }, [
      { id: 'base', x: 100, y: 212, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '标准 U 形钢制音叉与开口声学共鸣箱，带频率铭牌与驻波声腔。');

  // 38. resonance-tube
  add('resonance-tube', '共振空气柱实验装置', '波动与声学实验',
    'resonance tube 共振 空气柱 声速 resonance tube 驻波管', 210, 300, () => {
      let ticks = '';
      for (let y = 34; y <= 214; y += 12) {
        ticks += `<line x1="78" y1="${y}" x2="${y % 24 === 10 ? 66 : 72}" y2="${y}" stroke="${P.slate}" stroke-width="0.9"/>`;
      }
      return `<rect x="44" y="274" width="136" height="14" rx="4" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="148" y="20" width="8" height="254" rx="2" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        // Flexible siphon hose connecting tube bottom to reservoir bottom
        `<path d="M64 234 V252 Q64 264 80 264 H110 Q126 264 126 252 V190" fill="none" stroke="${P.ink}" stroke-width="7"/>` +
        `<path d="M64 234 V252 Q64 264 80 264 H110 Q126 264 126 252 V190" fill="none" stroke="#99F6E4" stroke-width="3.6"/>` +
        // Open-top resonance glass tube (flared unsealed upper rim)
        `<rect x="48" y="24" width="32" height="210" rx="2" fill="url(#g-glass)" stroke="none"/>` +
        `<rect x="50" y="156" width="28" height="76" fill="url(#g-liquid)" stroke="none"/>` +
        `<path d="M50 156 Q64 159 78 156" stroke="${P.tealDark}" stroke-width="1.4"/>` +
        `<path d="M44 22 Q48 22 48 26 V232 Q48 234 50 234 H78 Q80 234 80 232 V26 Q80 22 84 22" fill="none" stroke="${P.ink}" stroke-width="3.2"/>` +
        ticks +
        glassHighlight(53, 32, 53, 224, 2.2) +
        // Clamp to tube & clamp to leveling reservoir
        `<rect x="44" y="64" width="112" height="8" rx="2" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.4"/>` +
        `<rect x="108" y="132" width="48" height="7" rx="2" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.4"/>` +
        // Open-top water leveling reservoir cup (matched water level y=156!)
        `<rect x="108" y="114" width="36" height="76" rx="4" fill="url(#g-glass)" stroke="none"/>` +
        `<rect x="110" y="156" width="32" height="32" fill="url(#g-liquid)" stroke="none"/>` +
        `<path d="M110 156 Q126 159 142 156" stroke="${P.tealDark}" stroke-width="1.3"/>` +
        `<path d="M104 112 Q108 112 108 116 V186 Q108 190 112 190 H140 Q144 190 144 186 V116 Q144 112 148 112" fill="none" stroke="${P.ink}" stroke-width="3.2"/>`;
    }, [
      { id: 'base', x: 112, y: 288, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '声速测量共振空气柱：带刻度开口玻璃管、连通器软管及沿立柱升降的等液面储水杯。');

  // 39. wave-driver
  add('wave-driver', '机械波振动源', '波动与声学实验',
    'wave driver 振动源 机械波 弦 驻波 wave driver 电磁振动台', 250, 205, () => {
      return `<!-- Top drive piston & eyelet hook -->` +
        `<circle cx="125" cy="30" r="8" fill="none" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="119" y="38" width="12" height="34" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="103" y="68" width="44" height="12" rx="3" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        benchChassis(28, 80, 194, 102, { rx: 8, accentBar: true, footW: 18, footH: 7 }) +
        labelText(125, 114, 'WAVE DRIVER', 9, P.ink) +
        labelText(125, 128, '0.1 - 500 Hz  MAX 1.5 A', 7, P.muted) +
        bindingPost(76, 156, P.red, 'IN +', -12, 7.5) +
        bindingPost(114, 156, P.black, 'IN -', -12, 7.5) +
        softButton(166, 146, 34, 20, 'LOCK', '#E2E8F0', P.ink);
    }, [
      { id: 'input-a', x: 76, y: 156, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'input-b', x: 114, y: 156, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'base', x: 125, y: 189, dx: 0, dy: 1, type: 'base', diameter: 0 },
      { id: 'hook', x: 125, y: 22, dx: 0, dy: -1, type: 'hook', diameter: 0 },
    ], '电磁机械波振动源：同轴顶杆挂环、锁定开关与交流信号输入端子。');

  // 40. ripple-tank (clean orthographic front cutaway elevation!)
  add('ripple-tank', '水波演示槽', '波动与声学实验',
    'ripple tank 水波 波纹 ripple tank 水波干涉衍射', 300, 245, () => {
      return `<!-- Stand legs -->` +
        `<rect x="34" y="102" width="10" height="114" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="256" y="102" width="10" height="114" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="2.0"/>` +
        // Lower frosted projection screen
        `<rect x="52" y="178" width="196" height="14" rx="2" fill="#FFFFFF" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<circle cx="118" cy="185" r="4" fill="none" stroke="${P.teal}" stroke-width="1.2"/>` +
        `<circle cx="182" cy="185" r="4" fill="none" stroke="${P.teal}" stroke-width="1.2"/>` +
        // Overhead stroboscope & dipper arm
        `<path d="M44 102 V28 H162" fill="none" stroke="${P.slate}" stroke-width="4.5"/>` +
        `<rect x="132" y="16" width="38" height="22" rx="3" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<line x1="142" y1="38" x2="142" y2="72" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<line x1="160" y1="38" x2="160" y2="72" stroke="${P.ink}" stroke-width="2.0"/>` +
        // Shallow transparent glass tank
        `<rect x="26" y="60" width="248" height="44" rx="3" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<path d="M29 78 Q56 73 84 78 T140 78 T196 78 T252 78 L271 78 V101 H29 Z" fill="url(#g-liquid)" stroke="none"/>` +
        `<path d="M29 78 Q56 73 84 78 T140 78 T196 78 T252 78 L271 78" fill="none" stroke="${P.tealDark}" stroke-width="1.4"/>` +
        glassHighlight(34, 66, 34, 96, 2.2) +
        labelText(150, 212, 'RIPPLE TANK', 7.5, P.muted);
    }, [
      { id: 'base', x: 150, y: 216, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '正交剖视水波干涉演示槽：上方频闪振子臂、浅水透明玻璃槽及底部波纹投影屏。');

  // 41. digital-multimeter
  add('digital-multimeter', '数字万用表', '基础测量仪器',
    'digital multimeter DMM 万用表 数字万用表 电压 电流 电阻 multimeter', 156, 236, () => {
      return labFeet(24, 222, 108, 18, 6, 12) +
        // Protective rugged teal/slate holster + clean lab bezel
        `<rect x="18" y="14" width="120" height="208" rx="12" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="25" y="21" width="106" height="194" rx="8" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="1.8"/>` +
        // Backlit OLED measurement screen
        oledScreen(33, 28, 90, 48,
          screenText(40, 42, 'AUTO  DC', 7, P.screenCyan, 'start') +
          screenText(116, 42, 'HOLD', 6.5, P.screenAmber, 'end') +
          screenText(78, 62, '4.982 V', 14.5, P.screenGreen, 'middle') +
          `<line x1="40" y1="69" x2="116" y2="69" stroke="${P.slate}" stroke-width="1.2"/>` +
          `<line x1="40" y1="69" x2="86" y2="69" stroke="${P.screenGreen}" stroke-width="2.2"/>`
        ) +
        // Function softkeys
        softButton(34, 82, 26, 13, 'HOLD', '#E2E8F0', P.ink) +
        softButton(65, 82, 26, 13, 'RNG', '#E2E8F0', P.ink) +
        softButton(96, 82, 26, 13, 'REL', '#14B8A6', '#FFFFFF') +
        // Central rotary function selector dial + well-spaced range markings
        labelText(78, 107, 'V⎓', 6.8, P.ink) +
        labelText(46, 114, 'OFF', 6.0, P.muted) +
        labelText(110, 114, 'V~', 6.8, P.ink) +
        labelText(39, 138, 'mV', 6.2, P.ink) +
        labelText(117, 138, 'Ω', 6.8, P.ink) +
        labelText(42, 161, '10A', 6.0, P.red) +
        labelText(114, 161, 'mA', 6.0, P.ink) +
        rotaryKnob(78, 136, 17, 0, { ticks: 9, teal: false }) +
        // Three shrouded banana jacks at lower deck
        bindingPost(42, 194, P.red, '10A', -12, 7.5) +
        bindingPost(78, 194, P.black, 'COM', -12, 7.5) +
        bindingPost(114, 194, P.red, 'VΩmA', -12, 7.5);
    }, [
      { id: '10a', x: 42, y: 194, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'com', x: 78, y: 194, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'v-ohm-ma', x: 114, y: 194, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'base', x: 78, y: 228, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '真有效值数字万用表：高对比度 OLED 读数屏、多档位旋转波段开关与 10A/COM/VΩmA 安全插孔。');

  // 42. logic-analyzer
  add('logic-analyzer', '多通道逻辑分析仪', '电学测量',
    'logic analyzer 逻辑分析仪 数字时序 SPI I2C UART 通道探头', 264, 170, () => {
      let waves = '';
      const colors = [P.screenGreen, P.screenGreen, P.screenCyan, P.screenCyan, P.screenAmber, P.screenAmber, P.screenGreen, P.screenCyan];
      for (let i = 0; i < 8; i++) {
        const y = 44 + i * 7.5;
        const step = 12 + (i % 3) * 6;
        let d = `M32 ${y}`;
        for (let x = 32; x < 166; x += step) {
          const hi = ((x / step + i) | 0) % 2 === 0;
          d += ` H${x + step} V${hi ? y - 4 : y}`;
        }
        waves += `<path d="${d}" fill="none" stroke="${colors[i]}" stroke-width="1.2"/>`;
      }
      let podJacks = '';
      const podLabels = ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'G'];
      for (let i = 0; i < 9; i++) {
        const px = 42 + i * 22;
        const col = i === 8 ? P.black : (i % 2 === 0 ? P.tealDark : P.blue);
        podJacks += bindingPost(px, 132, col, podLabels[i], -10, 5.2);
      }
      return benchChassis(16, 16, 232, 138, { rx: 8, accentBar: true }) +
        oledScreen(26, 30, 152, 78,
          screenText(34, 40, '100 MS/s  SPI', 6.8, P.screenCyan, 'start') +
          screenText(170, 40, 'TRIG', 6.8, P.screenAmber, 'end') +
          `<line x1="112" y1="42" x2="112" y2="104" stroke="${P.red}" stroke-width="0.9" stroke-dasharray="2 2"/>` +
          waves
        ) +
        labelText(212, 39, 'LOGIC 8CH', 7, P.slate) +
        rotaryKnob(212, 62, 13, 25, { ticks: 7, teal: true }) +
        softButton(188, 86, 22, 15, 'RUN', '#14B8A6', '#FFFFFF') +
        softButton(214, 86, 22, 15, 'CAP', '#E2E8F0', P.ink) +
        `<rect x="26" y="114" width="212" height="30" rx="3" fill="${P.panelAlt}" stroke="${P.lightBorder}" stroke-width="1"/>` +
        podJacks;
    }, [
      { id: 'd0', x: 42, y: 132, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'd1', x: 64, y: 132, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'd2', x: 86, y: 132, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'd3', x: 108, y: 132, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'd4', x: 130, y: 132, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'd5', x: 152, y: 132, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'd6', x: 174, y: 132, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'd7', x: 196, y: 132, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'gnd', x: 218, y: 132, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'base', x: 132, y: 161, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '8通道台式数字逻辑分析仪：实时协议时序波形屏与 D0-D7/GND 逻辑探针排座。');

  // 43. spectrum-analyzer
  add('spectrum-analyzer', '频谱分析仪', '电学测量',
    'spectrum analyzer RF FFT 频谱分析仪 射频 频域', 300, 188, () => {
      let grid = '';
      for (let gx = 46; gx < 176; gx += 26) grid += `<line x1="${gx}" y1="44" x2="${gx}" y2="146" stroke="#C0D4CF" stroke-width="0.8"/>`;
      for (let gy = 62; gy < 146; gy += 21) grid += `<line x1="26" y1="${gy}" x2="180" y2="${gy}" stroke="#C0D4CF" stroke-width="0.8"/>`;
      return benchChassis(12, 14, 276, 160, { rx: 8, accentBar: true }) +
        oledScreen(22, 30, 164, 126,
          grid +
          screenText(28, 42, 'CF 100M  SPAN 50M', 6.8, P.screenCyan, 'start') +
          screenText(178, 42, 'M1 -1.2dBm', 6.5, P.screenAmber, 'end') +
          // Baseline noise + carrier peak + harmonics
          `<path d="M26 134 L42 132 L54 135 L68 128 L74 102 L80 132 L96 133 L103 48 L110 133 L126 132 L133 90 L140 133 L158 134 L164 114 L172 135 L180 133" fill="none" stroke="${P.screenAmber}" stroke-width="1.6"/>` +
          `<polygon points="103,44 107,48 103,52 99,48" fill="${P.screenCyan}" stroke="none"/>`
        ) +
        softButton(192, 34, 28, 14, 'FREQ', '#E2E8F0', P.ink) +
        softButton(192, 52, 28, 14, 'SPAN', '#E2E8F0', P.ink) +
        softButton(192, 70, 28, 14, 'AMPT', '#E2E8F0', P.ink) +
        softButton(192, 88, 28, 14, 'RBW', '#E2E8F0', P.ink) +
        softButton(192, 106, 28, 14, 'MKR', '#14B8A6', '#FFFFFF') +
        rotaryKnob(252, 60, 17, 15, { ticks: 9, teal: false }) +
        labelText(252, 90, 'TUNING', 6.8, P.muted) +
        bncJack(212, 140, 'RF IN', '#94A3B8', -13) +
        bncJack(256, 140, 'TRIG', '#94A3B8', -13);
    }, [
      { id: 'rf-in', x: 212, y: 140, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'trig-in', x: 256, y: 140, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'base', x: 150, y: 181, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '射频频谱分析仪：高精度频域峰谱与谐波显示屏、软按键菜单及 RF IN / TRIG 同轴输入接口。');

  // 44. dc-electronic-load
  add('dc-electronic-load', '可编程直流电子负载', '信号与电源',
    'dc electronic load 直流电子负载 恒流 恒压 恒阻 CC CV load', 256, 168, () => {
      return benchChassis(16, 14, 224, 138, { rx: 8, accentBar: true }) +
        ventSlots(26, 36, 12, 24, 6.5) +
        oledScreen(60, 30, 114, 66,
          screenText(66, 44, 'CC MODE', 7, P.screenCyan, 'start') +
          screenText(168, 44, 'ON', 7, P.screenGreen, 'end') +
          screenText(117, 65, '2.500 A', 13, P.screenGreen, 'middle') +
          screenText(117, 84, '12.00 V  30.0W', 8, P.screenAmber, 'middle')
        ) +
        rotaryKnob(204, 54, 15, -30, { ticks: 9, teal: true }) +
        softButton(60, 104, 24, 14, 'CC', '#14B8A6', '#FFFFFF') +
        softButton(88, 104, 24, 14, 'CV', '#E2E8F0', P.ink) +
        softButton(116, 104, 24, 14, 'CR', '#E2E8F0', P.ink) +
        softButton(144, 104, 28, 14, 'ON', '#16A34A', '#FFFFFF') +
        bindingPost(184, 126, P.red, '+', -12, 8) +
        bindingPost(218, 126, P.black, '−', -12, 8) +
        labelText(110, 134, 'DC LOAD 150V / 30A', 6.8, P.muted);
    }, [
      { id: 'positive', x: 184, y: 126, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'negative', x: 218, y: 126, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'base', x: 128, y: 159, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '可编程直流电子负载：CC/CV/CR 多模式工作、数字电流/功率屏及大电流输入接线柱。');

  // 45. megohmmeter
  add('megohmmeter', '绝缘电阻测试仪', '电学测量',
    'megohmmeter insulation tester 兆欧表 绝缘电阻 高压测试', 188, 212, () => {
      return labFeet(24, 198, 140, 18, 6, 12) +
        // Top high-voltage recessed jack strip with bright white labels
        `<rect x="26" y="14" width="136" height="30" rx="4" fill="${P.slate}" stroke="${P.ink}" stroke-width="2.0"/>` +
        bindingPost(50, 26, P.red, '', 0, 6.8) + labelText(50, 41, 'L', 7.2, '#FFFFFF') +
        bindingPost(94, 26, P.blue, '', 0, 6.8) + labelText(94, 41, 'G', 7.2, '#FFFFFF') +
        bindingPost(138, 26, P.black, '', 0, 6.8) + labelText(138, 41, 'E', 7.2, '#FFFFFF') +
        // Ruggedized body with amber HV stripe
        `<rect x="20" y="42" width="148" height="156" rx="10" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="22" y="44" width="144" height="5" rx="2" fill="${P.amber}" stroke="none"/>` +
        oledScreen(32, 54, 124, 50,
          screenText(38, 67, '1000V DC', 7.5, P.screenAmber, 'start') +
          screenText(150, 67, 'PASS', 7, P.screenGreen, 'end') +
          screenText(94, 91, '520 MΩ', 15, P.screenGreen, 'middle')
        ) +
        labelText(40, 126, '250V', 6.5, P.slate) +
        labelText(40, 152, '500V', 6.5, P.slate) +
        labelText(98, 122, '1000V', 6.5, P.red) +
        labelText(98, 156, 'OFF', 6.5, P.muted) +
        rotaryKnob(70, 142, 18, -15, { ticks: 6, teal: false }) +
        // High-voltage TEST push button
        `<rect x="114" y="128" width="42" height="28" rx="6" fill="${P.red}" stroke="${P.ink}" stroke-width="1.8"/>` +
        labelText(135, 145, 'TEST', 8, '#FFFFFF') +
        labelText(94, 188, 'MEGOHMMETER', 7, P.slate);
    }, [
      { id: 'line', x: 50, y: 26, dx: 0, dy: -1, type: 'wire', diameter: 0 },
      { id: 'guard', x: 94, y: 26, dx: 0, dy: -1, type: 'wire', diameter: 0 },
      { id: 'earth', x: 138, y: 26, dx: 0, dy: -1, type: 'wire', diameter: 0 },
      { id: 'base', x: 94, y: 204, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '数字高压绝缘电阻测试仪（兆欧表）：顶部 L/G/E 高压端子、电压档位盘与高压一键测试钮。');

  // 46. variac-autotransformer
  add('variac-autotransformer', '接触式自耦调压器', '电工设备',
    'variac autotransformer 自耦调压器 调压变压器 AC 0-250V', 196, 210, () => {
      let slots = '';
      for (let x = 44; x <= 152; x += 12) {
        slots += `<rect x="${x}" y="68" width="5" height="72" rx="2" fill="${P.slate}" stroke="none"/>`;
      }
      return labFeet(24, 196, 148, 18, 6, 10) +
        // Bottom wiring skirt box
        `<rect x="20" y="152" width="156" height="44" rx="5" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.2"/>` +
        // Cylindrical perforated drum housing
        `<rect x="34" y="54" width="128" height="98" rx="4" fill="url(#g-chassis-h)" stroke="${P.ink}" stroke-width="2.2"/>` +
        slots +
        // Top graduated voltage plate & fluted bakelite handwheel
        `<rect x="44" y="42" width="108" height="12" rx="3" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="64" y="18" width="68" height="24" rx="5" fill="${P.slate}" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<line x1="80" y1="20" x2="80" y2="40" stroke="#94A3B8" stroke-width="1.5"/>` +
        `<line x1="98" y1="20" x2="98" y2="40" stroke="${P.amber}" stroke-width="2.2"/>` +
        `<line x1="116" y1="20" x2="116" y2="40" stroke="#94A3B8" stroke-width="1.5"/>` +
        labelText(98, 63, 'VARIAC  0-250V AC', 7, P.tealDark) +
        bindingPost(44, 178, P.black, 'IN 1', -12, 6.8) +
        bindingPost(72, 178, P.black, 'IN 2', -12, 6.8) +
        bindingPost(124, 178, P.red, 'OUT 1', -12, 6.8) +
        bindingPost(152, 178, P.red, 'OUT 2', -12, 6.8);
    }, [
      { id: 'in-a', x: 44, y: 178, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'in-b', x: 72, y: 178, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'out-a', x: 124, y: 178, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'out-b', x: 152, y: 178, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'base', x: 98, y: 202, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '接触式单相自耦调压器：散热冲孔环绕外壳、顶部调压手轮与底座 AC 输入/可调输出接线柱。');

  // 47. analog-ammeter
  add('analog-ammeter', '指针式电流表', '基础测量仪器',
    'analog ammeter 电流表 指针电流表 直流电流表 0.6A 3A', 158, 168, () => {
      return benchChassis(16, 14, 126, 140, { rx: 7, accentBar: true, accentColor: P.tealDark }) +
        analogMeter(26, 26, 106, 78, {
          symbol: 'A',
          scaleLabels: ['0', '0.2', '0.4', '0.6'],
          ticks: 12,
          needleDeg: 18,
        }) +
        labelText(79, 114, '0 - 0.6 / 3 A DC', 6.8, P.muted) +
        bindingPost(42, 134, P.black, '-', -10, 7) +
        bindingPost(79, 134, P.red, '0.6A', -10, 7) +
        bindingPost(116, 134, P.red, '3A', -10, 7);
    }, [
      { id: 'negative', x: 42, y: 134, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'range-06a', x: 79, y: 134, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'positive', x: 116, y: 134, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'base', x: 79, y: 161, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '双量程磁电式指针直流电流表：防视差反光弧度盘、调零螺钉及 - / 0.6A / 3A 接线柱。');

  // 48. analog-voltmeter
  add('analog-voltmeter', '指针式电压表', '基础测量仪器',
    'analog voltmeter 电压表 指针电压表 直流电压表 3V 15V', 158, 168, () => {
      return benchChassis(16, 14, 126, 140, { rx: 7, accentBar: true, accentColor: P.slate }) +
        analogMeter(26, 26, 106, 78, {
          symbol: 'V',
          scaleLabels: ['0', '5', '10', '15'],
          ticks: 12,
          needleDeg: -8,
        }) +
        labelText(79, 114, '0 - 3 / 15 V DC', 6.8, P.muted) +
        bindingPost(42, 134, P.black, '-', -10, 7) +
        bindingPost(79, 134, P.red, '3V', -10, 7) +
        bindingPost(116, 134, P.red, '15V', -10, 7);
    }, [
      { id: 'negative', x: 42, y: 134, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'range-3v', x: 79, y: 134, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'positive', x: 116, y: 134, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'base', x: 79, y: 161, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '双量程磁电式指针直流电压表：镜像消除视差刻度盘、调零钮及 - / 3V / 15V 接线柱。');

  // 49. decade-capacitance-box
  add('decade-capacitance-box', '十进电容箱', '电路元件',
    'decade capacitance box 十进电容箱 标准电容 可变电容 box', 244, 148, () => {
      const muls = ['×1µF', '×0.1µF', '×10nF', '×1nF'];
      const angs = [-50, 35, -15, 70];
      let dials = '';
      for (let i = 0; i < 4; i++) {
        const cx = 44 + i * 52;
        dials += rotaryKnob(cx, 58, 16, angs[i], { ticks: 10, teal: false }) +
          labelText(cx, 88, muls[i], 6.8, P.slate);
      }
      return benchChassis(14, 14, 216, 120, { rx: 8, accentBar: true }) +
        `<rect x="22" y="28" width="200" height="66" rx="4" fill="${P.panelAlt}" stroke="${P.lightBorder}" stroke-width="1"/>` +
        dials +
        bindingPost(36, 114, P.red, 'A', -11, 7) +
        bindingPost(122, 114, P.tealDark, 'GND', -11, 7) +
        bindingPost(208, 114, P.black, 'B', -11, 7) +
        labelText(79, 118, 'CAPACITANCE', 6.5, P.muted) +
        labelText(165, 118, 'MAX 250V', 6.5, P.muted);
    }, [
      { id: 'a', x: 36, y: 114, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'gnd', x: 122, y: 114, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'b', x: 208, y: 114, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'base', x: 122, y: 141, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '四盘十进屏蔽标准电容箱：步进 1 nF 至 11.11 µF 精密电容盘及 A/GND/B 接线柱。');

  // 50. inductor-coil
  add('inductor-coil', '电感线圈模块', '电路元件',
    'inductor coil 电感器 螺线管 互感线圈 铁芯', 176, 148, () => {
      let turns = '';
      for (let x = 48; x <= 116; x += 6) {
        turns += `<path d="M${x} 46 Q${x + 3} 42 ${x + 5} 46 V86 Q${x + 3} 90 ${x} 86 Z" fill="url(#g-copper)" stroke="#7C2D12" stroke-width="1.0"/>`;
      }
      return labFeet(20, 134, 136, 16, 6, 10) +
        `<rect x="16" y="96" width="144" height="38" rx="5" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.2"/>` +
        // Iron core bar extending right with pull handle
        `<rect x="34" y="57" width="114" height="18" rx="2" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<circle cx="152" cy="66" r="6" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.6"/>` +
        // Acrylic bobbin end cheeks + copper solenoid turns
        `<rect x="40" y="34" width="7" height="64" rx="2" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="122" y="34" width="7" height="64" rx="2" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="1.8"/>` +
        turns +
        labelText(88, 110, 'L = 10 mH  INDUCTOR', 7.2, P.slate) +
        bindingPost(36, 118, P.red, 'A', -10, 7) +
        bindingPost(140, 118, P.black, 'B', -10, 7);
    }, [
      { id: 'a', x: 36, y: 118, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'b', x: 140, y: 118, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'base', x: 88, y: 140, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '可插拔铁芯教学电感线圈模块：密绕漆包铜线包、亚克力骨架、叠片铁芯拉杆及两端接线柱。');

  // 51. potentiometer
  add('potentiometer', '旋转电位器模块', '电路元件',
    'potentiometer 旋转电位器 分压器 可变电阻 knob', 152, 148, () => {
      return benchChassis(16, 14, 120, 120, { rx: 7, accentBar: true }) +
        rotaryKnob(76, 56, 22, -30, { ticks: 11, teal: false }) +
        labelText(76, 90, '10 kΩ LIN  POT', 7, P.slate) +
        // Miniature resistor-wiper icon
        `<path d="M36 100 H58 M94 100 H116" stroke="${P.muted}" stroke-width="1.2"/>` +
        `<rect x="58" y="96" width="36" height="8" rx="1" fill="#FFFFFF" stroke="${P.slate}" stroke-width="1.1"/>` +
        `<path d="M76 88 V96" stroke="${P.tealDark}" stroke-width="1.3"/>` +
        bindingPost(36, 114, P.black, '1', -10, 7) +
        bindingPost(76, 114, P.tealDark, 'W', -10, 7) +
        bindingPost(116, 114, P.red, '3', -10, 7);
    }, [
      { id: 'terminal-1', x: 36, y: 114, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'wiper', x: 76, y: 114, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'terminal-3', x: 116, y: 114, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'base', x: 76, y: 141, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '实验室线性旋转电位器模块：精密刻度旋钮、滑动抽头符号丝印与 1 / W / 3 接线柱。');

  // 52. npn-transistor
  add('npn-transistor', 'NPN 三极管模块', '电路元件',
    'npn transistor BJT 三极管 晶体管 放大器 semiconductor', 150, 138, () => {
      return labFeet(18, 124, 114, 16, 6, 8) +
        `<rect x="14" y="14" width="122" height="110" rx="6" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="20" y="20" width="110" height="98" rx="4" fill="#FFFFFF" stroke="${P.teal}" stroke-width="1.0" stroke-opacity="0.5"/>` +
        // Top TO-92/TO-220 package badge
        `<rect x="64" y="22" width="22" height="12" rx="2" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.4"/>` +
        labelText(75, 42, 'NPN  2N2222', 6.8, P.tealDark) +
        // IEEE NPN schematic symbol
        `<circle cx="75" cy="70" r="21" fill="#F8FAFC" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<line x1="68" y1="58" x2="68" y2="82" stroke="${P.ink}" stroke-width="2.6"/>` +
        `<line x1="34" y1="70" x2="68" y2="70" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<path d="M68 64 L88 52 H114" fill="none" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<path d="M68 76 L88 88 H114" fill="none" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<polygon points="88,88 80,86 84,80" fill="${P.ink}" stroke="none"/>` +
        bindingPost(30, 70, P.tealDark, 'B', -11, 6.8) +
        bindingPost(118, 46, P.red, 'C', -10, 6.8) +
        bindingPost(118, 94, P.black, 'E', -10, 6.8);
    }, [
      { id: 'b', x: 30, y: 70, dx: -1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'c', x: 118, y: 46, dx: 1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'e', x: 118, y: 94, dx: 1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'base', x: 75, y: 130, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], 'NPN 双极型晶体管教学模块：标准原理图丝印与 B/C/E 三端接线柱。');

  // 53. mosfet-transistor
  add('mosfet-transistor', 'MOSFET 场效应管模块', '电路元件',
    'mosfet N-channel field effect transistor 场效应管 开关管', 150, 138, () => {
      return labFeet(18, 124, 114, 16, 6, 8) +
        `<rect x="14" y="14" width="122" height="110" rx="6" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="20" y="20" width="110" height="98" rx="4" fill="#FFFFFF" stroke="${P.teal}" stroke-width="1.0" stroke-opacity="0.5"/>` +
        `<rect x="64" y="22" width="22" height="12" rx="2" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.4"/>` +
        labelText(75, 42, 'N-MOSFET', 6.8, P.tealDark) +
        // Enhancement N-MOSFET symbol
        `<circle cx="75" cy="70" r="21" fill="#F8FAFC" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<line x1="64" y1="60" x2="64" y2="80" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<line x1="34" y1="70" x2="64" y2="70" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<line x1="70" y1="56" x2="70" y2="63" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<line x1="70" y1="67" x2="70" y2="73" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<line x1="70" y1="77" x2="70" y2="84" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<path d="M70 59 H88 V46 H114" fill="none" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<path d="M70 81 H88 V94 H114" fill="none" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<path d="M71 70 H88 V81" fill="none" stroke="${P.ink}" stroke-width="1.4"/>` +
        `<polygon points="71,70 77,67 77,73" fill="${P.ink}" stroke="none"/>` +
        bindingPost(30, 70, P.tealDark, 'G', -11, 6.8) +
        bindingPost(118, 46, P.red, 'D', -10, 6.8) +
        bindingPost(118, 94, P.black, 'S', -10, 6.8);
    }, [
      { id: 'g', x: 30, y: 70, dx: -1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'd', x: 118, y: 46, dx: 1, dy: 0, type: 'wire', diameter: 0 },
      { id: 's', x: 118, y: 94, dx: 1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'base', x: 75, y: 130, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], 'N沟道增强型 MOSFET 场效应管模块：隔离栅极符号丝印与 G/D/S 接线柱。');

  // 54. op-amp-module
  add('op-amp-module', '集成运算放大器模块', '电路元件',
    'op amp operational amplifier LM741 运算放大器 运放 模拟电路', 184, 152, () => {
      return labFeet(20, 134, 144, 18, 6, 10) +
        `<rect x="16" y="18" width="152" height="116" rx="6" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="22" y="24" width="140" height="104" rx="4" fill="#FFFFFF" stroke="${P.teal}" stroke-width="1.0" stroke-opacity="0.5"/>` +
        // Op-amp triangle + trace leads
        `<polygon points="62,48 62,102 124,75" fill="#F0FDFA" stroke="${P.ink}" stroke-width="2.0"/>` +
        labelText(72, 66, '+', 11, P.tealDark) +
        labelText(72, 92, '−', 11, P.red) +
        labelText(28, 35, 'OP-AMP 741', 6.8, P.muted, 'start') +
        `<line x1="34" y1="62" x2="62" y2="62" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<line x1="34" y1="88" x2="62" y2="88" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<line x1="124" y1="75" x2="150" y2="75" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<line x1="92" y1="32" x2="92" y2="61" stroke="${P.red}" stroke-width="1.4"/>` +
        `<line x1="92" y1="89" x2="92" y2="112" stroke="${P.blue}" stroke-width="1.4"/>` +
        bindingPost(30, 62, P.tealDark, 'IN+', -10, 6.5) +
        bindingPost(30, 88, P.blue, 'IN−', 14, 6.5) +
        bindingPost(92, 26, P.red, '', 0, 6.5) + labelText(104, 29, 'V+', 7.5, P.red, 'start') +
        bindingPost(92, 118, P.black, '', 0, 6.5) + labelText(104, 121, 'V−', 7.5, P.slate, 'start') +
        bindingPost(154, 75, P.red, 'OUT', -11, 6.8);
    }, [
      { id: 'in-pos', x: 30, y: 62, dx: -1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'in-neg', x: 30, y: 88, dx: -1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'v-pos', x: 92, y: 26, dx: 0, dy: -1, type: 'wire', diameter: 0 },
      { id: 'v-neg', x: 92, y: 118, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'out', x: 154, y: 75, dx: 1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'base', x: 92, y: 140, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '集成运算放大器教学模块：标准运放原理框图、双电源 V+/V- 端口及反相/同相/输出接线柱。');

  // 55. spdt-switch
  add('spdt-switch', '单刀双掷开关', '电工设备',
    'spdt switch 单刀双掷 刀开关 换向 switch', 166, 124, () => {
      return labFeet(20, 108, 126, 16, 6, 8) +
        `<rect x="16" y="20" width="134" height="88" rx="6" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.2"/>` +
        // Pivot brass block + two target clip blocks + copper switch arm
        `<rect x="44" y="54" width="16" height="20" rx="2" fill="url(#g-brass)" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<rect x="108" y="34" width="14" height="16" rx="2" fill="url(#g-brass)" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<rect x="108" y="78" width="14" height="16" rx="2" fill="url(#g-brass)" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<line x1="52" y1="64" x2="112" y2="42" stroke="url(#g-copper)" stroke-width="5.5"/>` +
        `<line x1="52" y1="64" x2="112" y2="42" stroke="${P.ink}" stroke-width="1.5"/>` +
        `<rect x="102" y="31" width="22" height="11" rx="4" transform="rotate(-20 113 36)" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<circle cx="52" cy="64" r="3" fill="#FFFFFF" stroke="${P.ink}" stroke-width="1.2"/>` +
        labelText(83, 98, 'SPDT', 7.5, P.slate) +
        bindingPost(30, 64, P.black, 'COM', -11, 6.8) +
        bindingPost(136, 42, P.red, 'L1', -10, 6.8) +
        bindingPost(136, 86, P.blue, 'L2', -10, 6.8);
    }, [
      { id: 'com', x: 30, y: 64, dx: -1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'l1', x: 136, y: 42, dx: 1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'l2', x: 136, y: 86, dx: 1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'base', x: 83, y: 114, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '单刀双掷实验开关：瓷质绝缘底座、黄铜动触刀片与 COM / L1 / L2 接线柱。');

  // 56. dpdt-switch
  add('dpdt-switch', '双刀双掷开关', '电工设备',
    'dpdt switch 双刀双掷 倒顺开关 换向 switch', 184, 152, () => {
      return labFeet(20, 136, 144, 18, 6, 10) +
        `<rect x="16" y="16" width="152" height="120" rx="6" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.2"/>` +
        // Two poles (y=46, y=104): center common + left/right throws
        `<rect x="84" y="38" width="16" height="16" rx="2" fill="url(#g-brass)" stroke="${P.ink}" stroke-width="1.5"/>` +
        `<rect x="84" y="96" width="16" height="16" rx="2" fill="url(#g-brass)" stroke="${P.ink}" stroke-width="1.5"/>` +
        `<line x1="92" y1="46" x2="136" y2="46" stroke="${P.copper}" stroke-width="4.5"/>` +
        `<line x1="92" y1="104" x2="136" y2="104" stroke="${P.copper}" stroke-width="4.5"/>` +
        // Ganged insulating crossbar handle across both blades
        `<rect x="114" y="34" width="12" height="82" rx="4" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.8"/>` +
        labelText(58, 78, 'DPDT', 7.5, P.slate) +
        bindingPost(34, 46, P.blue, 'A1', -10, 6.5) +
        bindingPost(92, 46, P.black, 'C1', -12, 6.5) +
        bindingPost(150, 46, P.red, 'B1', -10, 6.5) +
        bindingPost(34, 104, P.blue, 'A2', -10, 6.5) +
        bindingPost(92, 104, P.black, 'C2', 14, 6.5) +
        bindingPost(150, 104, P.red, 'B2', -10, 6.5);
    }, [
      { id: 'a1', x: 34, y: 46, dx: -1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'com1', x: 92, y: 46, dx: 0, dy: -1, type: 'wire', diameter: 0 },
      { id: 'b1', x: 150, y: 46, dx: 1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'a2', x: 34, y: 104, dx: -1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'com2', x: 92, y: 104, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'b2', x: 150, y: 104, dx: 1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'base', x: 92, y: 142, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '双刀双掷联动倒顺开关：绝缘连杆双铜刀与六组接线端（A1/C1/B1, A2/C2/B2）。');

  // 57. bridge-rectifier
  add('bridge-rectifier', '桥式整流模块', '电路元件',
    'bridge rectifier 桥式整流 二极管整流 全波整流 AC-DC', 170, 148, () => {
      return labFeet(20, 134, 130, 16, 6, 10) +
        `<rect x="16" y="16" width="138" height="118" rx="6" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="22" y="22" width="126" height="106" rx="4" fill="#FFFFFF" stroke="${P.teal}" stroke-width="1.0" stroke-opacity="0.5"/>` +
        labelText(85, 34, 'BRIDGE RECTIFIER', 6.8, P.tealDark) +
        // Diamond diode bridge schematic
        `<path d="M85 44 L118 75 L85 106 L52 75 Z" fill="#F8FAFC" stroke="${P.ink}" stroke-width="1.6"/>` +
        // Four diode triangles along diamond edges
        `<polygon points="66,57 74,52 72,62" fill="${P.ink}" stroke="none"/>` +
        `<polygon points="97,52 105,57 99,62" fill="${P.ink}" stroke="none"/>` +
        `<polygon points="97,98 105,93 99,88" fill="${P.ink}" stroke="none"/>` +
        `<polygon points="66,93 74,98 72,88" fill="${P.ink}" stroke="none"/>` +
        // Clean non-crossing trace wires to 4 ports
        `<path d="M32 50 H52 V75 M32 100 H44 V114 H118 V75" fill="none" stroke="${P.slate}" stroke-width="1.4"/>` +
        `<path d="M85 44 V50 H138 M85 106 V100 H138" fill="none" stroke="${P.ink}" stroke-width="1.4"/>` +
        bindingPost(30, 50, P.amber, 'AC1', -10, 6.8) +
        bindingPost(30, 100, P.amber, 'AC2', 14, 6.8) +
        bindingPost(140, 50, P.red, '+', -10, 6.8) +
        bindingPost(140, 100, P.black, '−', 14, 6.8);
    }, [
      { id: 'ac1', x: 30, y: 50, dx: -1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'ac2', x: 30, y: 100, dx: -1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'positive', x: 140, y: 50, dx: 1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'negative', x: 140, y: 100, dx: 1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'base', x: 85, y: 140, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '全波桥式整流教学模块：四二极管菱形整流桥丝印及 AC1/AC2 输入、+/- 直流输出端。');

  // 58. ground-terminal
  add('ground-terminal', '接地端子', '电工设备',
    'ground terminal earth 接地端子 公共端 GND PE', 100, 114, () => {
      return labFeet(22, 100, 56, 12, 5, 6) +
        `<rect x="18" y="54" width="64" height="46" rx="5" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.2"/>` +
        // Brass stem + green-yellow safety collar + socket
        `<rect x="40" y="30" width="20" height="24" rx="2" fill="url(#g-brass)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="35" y="42" width="30" height="8" rx="2" fill="#16A34A" stroke="${P.ink}" stroke-width="1.4"/>` +
        `<rect x="50" y="42" width="15" height="8" rx="1" fill="#EAB308" stroke="none"/>` +
        `<circle cx="50" cy="30" r="6.5" fill="${P.brass}" stroke="${P.ink}" stroke-width="1.5"/>` +
        `<circle cx="50" cy="30" r="2.6" fill="${P.ink}" stroke="none"/>` +
        // Etched IEC earth ground symbol
        `<line x1="50" y1="62" x2="50" y2="74" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<line x1="36" y1="74" x2="64" y2="74" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<line x1="41" y1="80" x2="59" y2="80" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<line x1="46" y1="86" x2="54" y2="86" stroke="${P.ink}" stroke-width="2.0"/>` +
        labelText(50, 96, 'GND', 7, P.tealDark);
    }, [
      { id: 'gnd', x: 50, y: 30, dx: 0, dy: -1, type: 'wire', diameter: 0 },
      { id: 'base', x: 50, y: 105, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '实验台接地基准端子柱：绿黄双色安全绝缘环、黄铜旋紧插孔与标准 IEC 接地标识。');

  // 59. hall-effect-apparatus
  add('hall-effect-apparatus', '霍尔效应实验仪', '光电与近代物理',
    'hall effect apparatus 霍尔效应 磁感应强度 电磁铁 霍尔电压', 284, 192, () => {
      return benchChassis(14, 16, 256, 160, { rx: 8, accentBar: true }) +
        // Left electromagnet yoke + coils + Hall probe gap
        `<rect x="24" y="34" width="94" height="122" rx="4" fill="${P.panelAlt}" stroke="${P.lightBorder}" stroke-width="1"/>` +
        `<rect x="30" y="42" width="82" height="92" rx="3" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="44" y="54" width="54" height="68" rx="2" fill="#FFFFFF" stroke="${P.ink}" stroke-width="1.5"/>` +
        // Dual copper excitation coils + pole shoes
        `<rect x="32" y="64" width="22" height="46" rx="2" fill="url(#g-copper)" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<rect x="88" y="64" width="22" height="46" rx="2" fill="url(#g-copper)" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<rect x="54" y="76" width="8" height="22" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.3"/>` +
        `<rect x="80" y="76" width="8" height="22" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.3"/>` +
        `<rect x="64" y="72" width="14" height="30" rx="1" fill="${P.teal}" fill-opacity="0.7" stroke="${P.ink}" stroke-width="1.2"/>` +
        labelText(71, 148, 'HALL PROBE', 6.8, P.slate) +
        // Right dual OLED + current controls + 4 binding posts
        oledScreen(128, 32, 130, 56,
          screenText(134, 46, 'IM 0.600 A  IS 2.50 mA', 7.2, P.screenCyan, 'start') +
          screenText(193, 66, 'VH = +14.8 mV', 10.5, P.screenGreen, 'middle') +
          screenText(193, 81, 'B = 0.245 T', 7.5, P.screenAmber, 'middle')
        ) +
        rotaryKnob(154, 114, 14, -20, { ticks: 7, teal: false }) +
        rotaryKnob(196, 114, 14, 30, { ticks: 7, teal: true }) +
        softButton(224, 104, 32, 18, 'REV', '#E2E8F0', P.ink) +
        bindingPost(142, 152, P.red, 'IM', -10, 6.2) +
        bindingPost(176, 152, P.tealDark, 'IS', -10, 6.2) +
        bindingPost(210, 152, P.red, 'VH+', -10, 6.2) +
        bindingPost(244, 152, P.black, 'VH−', -10, 6.2);
    }, [
      { id: 'im-in', x: 142, y: 152, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'is-in', x: 176, y: 152, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'vh-pos', x: 210, y: 152, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'vh-neg', x: 244, y: 152, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'base', x: 142, y: 183, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '集成一体式霍尔效应实验仪：C型励磁电磁铁、气隙砷化镓霍尔片与双电流/霍尔电压测试台。');

  // 60. photoelectric-effect
  add('photoelectric-effect', '光电效应实验仪', '光电与近代物理',
    'photoelectric effect Planck constant 光电效应 普朗克常量 截止电压 光电管', 280, 188, () => {
      return benchChassis(16, 16, 248, 154, { rx: 8, accentBar: true }) +
        // Left vacuum phototube light-tight chamber + aperture filter wheel
        `<rect x="26" y="40" width="92" height="74" rx="5" fill="${P.slate}" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="16" y="56" width="12" height="32" rx="2" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="44" y="52" width="54" height="40" rx="4" fill="#E6F4F3" stroke="${P.muted}" stroke-width="1.2"/>` +
        `<circle cx="72" cy="72" r="14" fill="#DCEFEB" stroke="${P.ink}" stroke-width="1.4"/>` +
        `<path d="M62 62 Q72 72 62 82" fill="none" stroke="${P.brass}" stroke-width="2.0"/>` +
        `<line x1="82" y1="62" x2="82" y2="82" stroke="${P.teal}" stroke-width="2.0"/>` +
        labelText(72, 108, '436 nm FILTER', 6.5, '#FFFFFF') +
        // Right readout OLED + stopping potential controls
        oledScreen(128, 32, 126, 62,
          screenText(134, 46, 'PHOTOTUBE', 6.8, P.screenCyan, 'start') +
          screenText(191, 65, 'Ua = -1.84 V', 11.5, P.screenGreen, 'middle') +
          screenText(191, 82, 'I = 0.00 nA', 9, P.screenAmber, 'middle')
        ) +
        rotaryKnob(148, 120, 14, -45, { ticks: 7, teal: false }) +
        labelText(148, 146, 'V ADJ', 6.5, P.muted) +
        bindingPost(198, 144, P.red, 'A', -10, 6.8) +
        bindingPost(234, 144, P.black, 'K', -10, 6.8) +
        softButton(50, 126, 48, 16, 'ZERO', '#E2E8F0', P.ink);
    }, [
      { id: 'beam-in', x: 16, y: 72, dx: -1, dy: 0, type: 'optical-in', diameter: 0 },
      { id: 'anode', x: 198, y: 144, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'cathode', x: 234, y: 144, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'base', x: 140, y: 177, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '普朗克常量光电效应实验仪：遮光暗室光电管、单色滤光片窗口、微电流放大屏与遏止电压调节。');

  // 61. youngs-modulus
  add('youngs-modulus', '杨氏模量实验仪与光杠杆', '力学实验',
    'youngs modulus optical lever 杨氏模量 金属丝 伸长 望远镜 标尺', 224, 270, () => {
      return `<!-- Heavy tripod gantry + columns -->` +
        `<rect x="24" y="246" width="112" height="14" rx="4" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="34" y="24" width="92" height="10" rx="2" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="38" y="34" width="8" height="212" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="114" y="34" width="8" height="212" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        // Taut steel test wire + top chuck + bottom slotted brass weight stack
        `<line x1="80" y1="34" x2="80" y2="210" stroke="${P.slate}" stroke-width="1.6"/>` +
        `<rect x="74" y="34" width="12" height="14" rx="2" fill="url(#g-brass)" stroke="${P.ink}" stroke-width="1.4"/>` +
        // Optical lever platform & tilting mirror
        `<rect x="48" y="168" width="64" height="8" rx="2" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<rect x="72" y="144" width="18" height="24" rx="2" transform="rotate(-10 81 156)" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="1.8"/>` +
        // Slotted brass weights at wire bottom
        `<rect x="64" y="210" width="32" height="8" rx="1" fill="url(#g-brass)" stroke="${P.ink}" stroke-width="1.4"/>` +
        `<rect x="64" y="219" width="32" height="8" rx="1" fill="url(#g-brass)" stroke="${P.ink}" stroke-width="1.4"/>` +
        `<rect x="64" y="228" width="32" height="8" rx="1" fill="url(#g-brass)" stroke="${P.ink}" stroke-width="1.4"/>` +
        // Reading telescope + vertical scale stand on right
        `<rect x="160" y="246" width="44" height="14" rx="3" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="178" y="54" width="7" height="192" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<rect x="192" y="66" width="10" height="128" rx="2" fill="#FFFFFF" stroke="${P.ink}" stroke-width="1.5"/>` +
        `<rect x="148" y="148" width="44" height="12" rx="2" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        // Dashed optical lever reflection ray
        `<path d="M148 154 L90 154 L192 108" fill="none" stroke="${P.teal}" stroke-width="1.2" stroke-dasharray="3 3"/>`;
    }, [
      { id: 'mirror-in', x: 96, y: 154, dx: 1, dy: 0, type: 'optical-in', diameter: 0 },
      { id: 'mirror-out', x: 148, y: 154, dx: 1, dy: 0, type: 'optical-out', diameter: 0 },
      { id: 'base', x: 112, y: 260, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '拉伸法金属丝杨氏模量测定仪：双立柱张拉框架、挂砝码托盘、光杠杆反光镜及直立标尺望远镜。');

  // 62. newtons-rings
  add('newtons-rings', '牛顿环与读数显微镜', '光学仪器',
    'newtons rings reading microscope 牛顿环 读数显微镜 干涉 等厚干涉', 218, 248, () => {
      return `<!-- Heavy base + dovetail pillar -->` +
        `<rect x="34" y="220" width="150" height="16" rx="4" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="52" y="28" width="12" height="192" rx="2" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        // Reading microscope carriage & micrometer drum
        `<rect x="48" y="88" width="54" height="22" rx="3" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="102" y="92" width="38" height="14" rx="2" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<line x1="112" y1="92" x2="112" y2="106" stroke="${P.ink}" stroke-width="1"/>` +
        `<line x1="122" y1="92" x2="122" y2="106" stroke="${P.ink}" stroke-width="1"/>` +
        // Vertical microscope optical barrel + 45-degree half-mirror
        `<rect x="78" y="26" width="14" height="16" rx="2" fill="${P.ink}" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<rect x="75" y="42" width="20" height="106" rx="2" fill="url(#g-chassis-h)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<path d="M78 148 L92 148 L89 162 L81 162 Z" fill="url(#g-brass)" stroke="${P.ink}" stroke-width="1.6"/>` +
        // Collimator entrance barrel + 45° glass beam splitter
        `<rect x="22" y="167" width="38" height="14" rx="2" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<line x1="22" y1="174" x2="82" y2="174" stroke="${P.amber}" stroke-width="1.3" stroke-dasharray="3 2"/>` +
        `<line x1="72" y1="184" x2="98" y2="164" stroke="${P.screenCyan}" stroke-width="3.0"/>` +
        `<line x1="72" y1="184" x2="98" y2="164" stroke="${P.ink}" stroke-width="1.4"/>` +
        // Newton rings lens frame on specimen stage
        `<rect x="64" y="198" width="42" height="16" rx="3" fill="url(#g-teal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<rect x="70" y="201" width="30" height="6" rx="2" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="1.2"/>` +
        // Subtle interference ring detail inset right
        `<circle cx="164" cy="176" r="20" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<circle cx="164" cy="176" r="4" fill="none" stroke="${P.brassLight}" stroke-width="1.3"/>` +
        `<circle cx="164" cy="176" r="9" fill="none" stroke="${P.brassLight}" stroke-width="1.2"/>` +
        `<circle cx="164" cy="176" r="14" fill="none" stroke="${P.brassLight}" stroke-width="1.1"/>` +
        labelText(164, 208, '0.01 mm', 7, P.slate);
    }, [
      { id: 'beam-in', x: 22, y: 174, dx: -1, dy: 0, type: 'optical-in', diameter: 0 },
      { id: 'base', x: 109, y: 236, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '牛顿环与读数显微镜装置：0.01 mm 微调测微鼓、45° 半反分束镜及牛顿环平凸透镜组。');

  // 63. polarizer-analyzer
  add('polarizer-analyzer', '偏振片与检偏器', '光学仪器',
    'polarizer analyzer 偏振片 检偏器 马吕斯定律 光学滑座', 148, 188, () => {
      let ticks = '';
      for (let d = 0; d < 360; d += 30) {
        const a = d * Math.PI / 180;
        ticks += `<line x1="${fmt(74 + Math.cos(a) * 32)}" y1="${fmt(78 + Math.sin(a) * 32)}" x2="${fmt(74 + Math.cos(a) * 39)}" y2="${fmt(78 + Math.sin(a) * 39)}" stroke="${P.slate}" stroke-width="${d % 90 === 0 ? 1.5 : 0.9}"/>`;
      }
      return `<!-- Optical-bench rider carriage footer matching double-slit/optical-screen -->` +
        `<rect x="34" y="156" width="80" height="22" rx="4" fill="${P.slate}" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="66" y="118" width="16" height="38" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        // 360-deg rotary polarizer dial ring & axis lines
        `<circle cx="74" cy="78" r="42" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<circle cx="74" cy="78" r="29" fill="#E0F2FE" stroke="${P.ink}" stroke-width="1.6"/>` +
        ticks +
        `<line x1="56" y1="90" x2="92" y2="66" stroke="${P.tealDark}" stroke-width="1.4"/>` +
        `<line x1="60" y1="96" x2="96" y2="72" stroke="${P.tealDark}" stroke-width="1.2"/>` +
        `<line x1="52" y1="84" x2="88" y2="60" stroke="${P.tealDark}" stroke-width="1.2"/>` +
        `<rect x="108" y="42" width="14" height="7" rx="2" transform="rotate(-35 115 45)" fill="${P.tealDark}" stroke="${P.ink}" stroke-width="1.5"/>` +
        labelText(74, 24, 'POLARIZER 0-360°', 7, P.slate);
    }, [
      { id: 'beam-in', x: 32, y: 78, dx: -1, dy: 0, type: 'optical-in', diameter: 0 },
      { id: 'beam-out', x: 116, y: 78, dx: 1, dy: 0, type: 'optical-out', diameter: 0 },
      { id: 'carriage', x: 74, y: 178, dx: 0, dy: 1, type: 'optical-carriage', diameter: 0 },
    ], '360° 刻度旋转偏振片与检偏器滑座：适配光学导轨滑块与偏振轴方向刻度盘。');

  // 64. sodium-lamp
  add('sodium-lamp', '钠光灯单色光源', '光学仪器',
    'sodium lamp 钠光灯 589 nm 单色光源 D线 干涉光源', 168, 204, () => {
      return `<!-- Heavy bench base + height post -->` +
        `<rect x="34" y="178" width="100" height="16" rx="4" fill="${P.slate}" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="76" y="118" width="16" height="60" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        // Slotted ventilated cast-slate lamp enclosure
        `<rect x="38" y="24" width="90" height="94" rx="6" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="40" y="26" width="86" height="8" rx="3" fill="${P.slate}" stroke="none"/>` +
        ventSlots(48, 44, 6, 36, 6.5) +
        // Luminous 589nm amber exit aperture barrel
        `<rect x="118" y="54" width="22" height="38" rx="3" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<ellipse cx="136" cy="73" rx="6" ry="15" fill="${P.amber}" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<circle cx="136" cy="73" r="4" fill="#FEF3C7" stroke="none"/>` +
        labelText(83, 108, 'Na  589.3 nm', 7.8, P.amber) +
        softButton(96, 181, 22, 10, 'PWR', '#14B8A6', '#FFFFFF');
    }, [
      { id: 'beam-out', x: 142, y: 73, dx: 1, dy: 0, type: 'optical-out', diameter: 0 },
      { id: 'base', x: 84, y: 194, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '低压钠光单色实验光源：顶部散热百叶灯箱、589.3 nm 黄光出射筒及高度可调支座。');

  // 65. helmholtz-coils
  add('helmholtz-coils', '亥姆霍兹线圈', '电磁学实验',
    'helmholtz coils 亥姆霍兹线圈 均匀磁场 磁感应强度', 230, 188, () => {
      return labFeet(24, 174, 182, 18, 6, 12) +
        `<rect x="20" y="142" width="190" height="32" rx="5" fill="url(#g-chassis)" stroke="${P.ink}" stroke-width="2.2"/>` +
        // Axial slide bar & center probe pillar
        `<rect x="44" y="120" width="142" height="7" rx="2" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<rect x="111" y="78" width="8" height="64" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.5"/>` +
        `<circle cx="115" cy="78" r="5" fill="${P.teal}" stroke="${P.ink}" stroke-width="1.4"/>` +
        // Left & Right parallel Helmholtz circular bobbins
        `<ellipse cx="70" cy="78" rx="18" ry="52" fill="none" stroke="${P.ink}" stroke-width="14"/>` +
        `<ellipse cx="70" cy="78" rx="18" ry="52" fill="none" stroke="url(#g-copper)" stroke-width="9"/>` +
        `<ellipse cx="160" cy="78" rx="18" ry="52" fill="none" stroke="${P.ink}" stroke-width="14"/>` +
        `<ellipse cx="160" cy="78" rx="18" ry="52" fill="none" stroke="url(#g-copper)" stroke-width="9"/>` +
        `<rect x="62" y="128" width="16" height="14" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.4"/>` +
        `<rect x="152" y="128" width="16" height="14" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.4"/>` +
        bindingPost(46, 158, P.red, '+', -10, 6.8) +
        bindingPost(80, 158, P.black, '−', -10, 6.8) +
        bindingPost(184, 158, P.tealDark, 'TAP', -10, 6.8) +
        labelText(132, 162, 'd = R', 7.5, P.slate);
    }, [
      { id: 'positive', x: 46, y: 158, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'negative', x: 80, y: 158, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'tap', x: 184, y: 158, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'base', x: 115, y: 180, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '同轴亥姆霍兹匀强磁场线圈组（d = R）：双铜线包绕线盘、轴线导轨及串并联接线柱。');

  // 66. millikan-oil-drop
  add('millikan-oil-drop', '密立根油滴仪', '光电与近代物理',
    'millikan oil drop 密立根油滴仪 元电荷 基本电荷 平行板电容器', 260, 208, () => {
      return benchChassis(16, 114, 228, 78, { rx: 8, accentBar: true }) +
        // Top atomizer bulb + condenser chamber + viewing microscope
        `<ellipse cx="64" cy="24" rx="12" ry="9" fill="url(#g-rubber)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<path d="M76 24 H94 V40" fill="none" stroke="${P.ink}" stroke-width="3.5"/>` +
        `<rect x="64" y="40" width="60" height="74" rx="5" fill="url(#g-glass)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="72" y="58" width="44" height="7" rx="1" fill="url(#g-brass)" stroke="${P.ink}" stroke-width="1.4"/>` +
        `<rect x="72" y="92" width="44" height="7" rx="1" fill="url(#g-brass)" stroke="${P.ink}" stroke-width="1.4"/>` +
        `<circle cx="94" cy="78" r="2.2" fill="${P.amber}" stroke="none"/>` +
        // Left LED illuminator + Right inclined measuring microscope
        `<rect x="34" y="68" width="30" height="18" rx="3" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<path d="M124 78 L194 42 L202 54 L132 90 Z" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="190" y="34" width="16" height="14" rx="2" transform="rotate(-28 198 41)" fill="${P.ink}" stroke="${P.ink}" stroke-width="1.5"/>` +
        // Console OLED + controls + HV posts
        oledScreen(28, 128, 112, 50,
          screenText(84, 145, 'U = 285.0 V', 9.5, P.screenGreen, 'middle') +
          screenText(84, 162, 't = 12.40 s  POL +', 7.8, P.screenCyan, 'middle')
        ) +
        softButton(148, 134, 30, 16, 'POL', '#14B8A6', '#FFFFFF') +
        softButton(148, 156, 30, 16, 'TMR', '#E2E8F0', P.ink) +
        bindingPost(196, 166, P.red, 'HV+', -11, 7) +
        bindingPost(226, 166, P.black, 'HV−', -11, 7);
    }, [
      { id: 'hv-pos', x: 196, y: 166, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'hv-neg', x: 226, y: 166, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'base', x: 130, y: 199, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '密立根油滴测元电荷实验仪：喷雾油滴室、平行铜极板电容器、测微显微镜及平衡高压电源台。');

  // 67. franck-hertz
  add('franck-hertz', '夫兰克-赫兹实验仪', '光电与近代物理',
    'franck hertz 夫兰克赫兹 量子化能级 氩管 汞管 碰撞实验', 280, 188, () => {
      return benchChassis(14, 14, 252, 158, { rx: 8, accentBar: true }) +
        // Left glass cutaway bay with glowing F-H tetrode tube
        `<rect x="24" y="30" width="66" height="114" rx="5" fill="#E6F4F3" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="38" y="42" width="38" height="84" rx="14" fill="#F4F9F8" stroke="${P.slate}" stroke-width="1.6"/>` +
        `<rect x="46" y="54" width="22" height="58" rx="4" fill="none" stroke="${P.teal}" stroke-width="1.4"/>` +
        `<line x1="57" y1="62" x2="57" y2="104" stroke="${P.amber}" stroke-width="2.4"/>` +
        labelText(57, 138, 'Ar TUBE', 6.5, P.ink) +
        // Center OLED quantization peak curve + digital readouts
        oledScreen(100, 30, 120, 80,
          screenText(106, 44, 'UG2K 48.5V  IA 1.4µA', 6.8, P.screenCyan, 'start') +
          `<path d="M108 100 Q118 68 128 96 Q140 58 152 94 Q166 52 178 90 Q194 46 210 88" fill="none" stroke="${P.screenGreen}" stroke-width="1.8"/>`
        ) +
        rotaryKnob(128, 138, 15, 10, { ticks: 9, teal: false }) +
        softButton(156, 128, 30, 18, 'AUTO', '#14B8A6', '#FFFFFF') +
        bncJack(238, 60, 'Y-OUT', '#94A3B8', -13) +
        bncJack(238, 114, 'X-OUT', '#94A3B8', -13);
    }, [
      { id: 'y-out', x: 238, y: 60, dx: 1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'x-out', x: 238, y: 114, dx: 1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'base', x: 140, y: 179, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '智能夫兰克-赫兹原子能级实验仪：充氩四极管观察窗、能级峰曲线屏及 X/Y 示波输出端子。');

  // 68. trifilar-pendulum
  add('trifilar-pendulum', '三线摆转动惯量架', '力学实验',
    'trifilar pendulum 三线摆 转动惯量 圆盘 扭转周期', 198, 258, () => {
      return `<!-- Three-point base ring + mast + upper chuck + 3 wires + lower brass disc -->` +
        `<rect x="26" y="232" width="146" height="14" rx="4" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="38" y="26" width="9" height="206" rx="2" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<path d="M42 26 H112 V42" fill="none" stroke="${P.slate}" stroke-width="6"/>` +
        `<rect x="82" y="42" width="52" height="10" rx="2" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.8"/>` +
        // Three symmetric taut suspension wires
        `<line x1="90" y1="52" x2="60" y2="180" stroke="${P.slate}" stroke-width="1.4"/>` +
        `<line x1="108" y1="52" x2="108" y2="180" stroke="${P.slate}" stroke-width="1.4"/>` +
        `<line x1="126" y1="52" x2="156" y2="180" stroke="${P.slate}" stroke-width="1.4"/>` +
        // Lower brass specimen turntable + concentric test ring
        `<rect x="50" y="180" width="116" height="14" rx="4" fill="url(#g-brass)" stroke="${P.ink}" stroke-width="2.0"/>` +
        `<rect x="74" y="168" width="68" height="12" rx="2" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.6"/>` +
        // Optical photogate bracket at bottom right
        `<rect x="148" y="208" width="22" height="24" rx="3" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<circle cx="164" cy="220" r="3.5" fill="${P.screenCyan}" stroke="none"/>`;
    }, [
      { id: 'gate-out', x: 164, y: 220, dx: 1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'base', x: 99, y: 246, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '三线摆刚体转动惯量测量架：上下双悬挂圆盘、三等分细钢丝悬线与底部光电门周期计数传感器。');

  // 69. ticker-timer
  add('ticker-timer', '电火花打点计时器', '力学实验',
    'ticker timer spark timer 打点计时器 纸带 匀变速运动 50Hz', 168, 128, () => {
      return benchChassis(16, 30, 136, 82, { rx: 6, accentBar: true }) +
        // Paper tape strip passing across top stainless chute with spark dots
        `<rect x="10" y="34" width="148" height="12" rx="1" fill="#FFFFFF" stroke="${P.slate}" stroke-width="1.3"/>` +
        `<circle cx="26" cy="40" r="1.6" fill="${P.ink}" stroke="none"/>` +
        `<circle cx="40" cy="40" r="1.6" fill="${P.ink}" stroke="none"/>` +
        `<circle cx="58" cy="40" r="1.6" fill="${P.ink}" stroke="none"/>` +
        `<circle cx="80" cy="40" r="1.6" fill="${P.ink}" stroke="none"/>` +
        `<circle cx="108" cy="40" r="1.6" fill="${P.ink}" stroke="none"/>` +
        `<circle cx="140" cy="40" r="1.6" fill="${P.ink}" stroke="none"/>` +
        `<rect x="64" y="22" width="40" height="28" rx="4" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.8"/>` +
        `<circle cx="84" cy="22" r="5" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.4"/>` +
        labelText(54, 72, '50 Hz / 0.02 s', 7.5, P.tealDark) +
        softButton(34, 82, 32, 16, 'ON', '#DC2626', '#FFFFFF') +
        bindingPost(104, 92, P.red, 'AC', -11, 6.8) +
        bindingPost(132, 92, P.black, 'AC', -11, 6.8);
    }, [
      { id: 'input-a', x: 104, y: 92, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'input-b', x: 132, y: 92, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'base', x: 84, y: 119, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '50 Hz 电火花打点计时器：顶部走纸导向槽、碳纸压片夹及交流输入端（点距 0.02 s）。');

  // 70. calorimeter-electric
  add('calorimeter-electric', '电热式量热器', '热学与分子物理',
    'electric calorimeter 电热量热器 比热容 热功当量 焦耳定律', 168, 204, () => {
      return `<!-- Insulated double-wall calorimeter cup with inner copper liner cutaway -->` +
        `<rect x="34" y="58" width="100" height="130" rx="6" fill="url(#g-chassis-h)" stroke="${P.ink}" stroke-width="2.4"/>` +
        `<rect x="48" y="70" width="72" height="106" rx="4" fill="#FEF3C7" stroke="${P.brass}" stroke-width="1.8"/>` +
        `<rect x="51" y="96" width="66" height="78" fill="url(#g-liquid)" stroke="none"/>` +
        `<path d="M51 96 Q84 99 117 96" stroke="${P.tealDark}" stroke-width="1.3"/>` +
        // Dark insulated lid
        `<rect x="30" y="46" width="108" height="12" rx="3" fill="${P.slate}" stroke="${P.ink}" stroke-width="2.0"/>` +
        // Glass thermometer left + loop stirrer + copper immersion heater coil
        `<rect x="54" y="14" width="6" height="128" rx="3" fill="#FFFFFF" stroke="${P.ink}" stroke-width="1.5"/>` +
        `<circle cx="57" cy="144" r="5" fill="${P.red}" stroke="${P.ink}" stroke-width="1.4"/>` +
        `<path d="M74 22 V154 H86" fill="none" stroke="${P.slate}" stroke-width="2.0"/>` +
        `<circle cx="74" cy="20" r="4.5" fill="none" stroke="${P.slate}" stroke-width="2.0"/>` +
        `<path d="M98 46 V110 Q106 114 98 118 Q90 122 98 126 Q106 130 98 134 V146 H112 V46" fill="none" stroke="${P.copper}" stroke-width="2.4"/>` +
        bindingPost(98, 40, P.red, '+', -11, 6) +
        bindingPost(118, 40, P.black, '−', -11, 6);
    }, [
      { id: 'heater-pos', x: 98, y: 40, dx: 0, dy: -1, type: 'wire', diameter: 0 },
      { id: 'heater-neg', x: 118, y: 40, dx: 0, dy: -1, type: 'wire', diameter: 0 },
      { id: 'base', x: 84, y: 188, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '双层绝热电热式量热器：内嵌紫铜杯与透视水位窗、插入式温度计、搅拌器及电热螺旋电阻。');

  // 71. surface-tension-jolly
  add('surface-tension-jolly', '焦利氏秤与表面张力仪', '热学与分子物理',
    'jolly balance surface tension 焦利氏秤 表面张力 螺旋弹簧 铂金环', 204, 268, () => {
      let spring = `M122 44 V56`;
      for (let sy = 56; sy < 112; sy += 8) {
        spring += ` L130 ${sy + 4} L114 ${sy + 8}`;
      }
      spring += ` L122 118 V142`;
      let ticks = '';
      for (let ty = 46; ty <= 216; ty += 10) {
        ticks += `<line x1="48" y1="${ty}" x2="${ty % 20 === 6 ? 39 : 43}" y2="${ty}" stroke="${P.slate}" stroke-width="0.9"/>`;
      }
      return `<rect x="24" y="246" width="156" height="14" rx="4" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="2.2"/>` +
        // Tall graduated mirror column + top rack knob
        `<rect x="38" y="26" width="14" height="220" rx="2" fill="url(#g-chassis-h)" stroke="${P.ink}" stroke-width="1.8"/>` +
        ticks +
        `<circle cx="45" cy="20" r="8" fill="url(#g-metal)" stroke="${P.ink}" stroke-width="1.6"/>` +
        `<path d="M52 34 H126 V44" fill="none" stroke="${P.slate}" stroke-width="5"/>` +
        // Bronze helical spring + index hairline + platinum tension loop
        `<path d="${spring}" fill="none" stroke="${P.brass}" stroke-width="2.2"/>` +
        `<circle cx="122" cy="126" r="3" fill="${P.red}" stroke="${P.ink}" stroke-width="1.0"/>` +
        `<path d="M108 164 V150 H136 V164" fill="none" stroke="${P.slate}" stroke-width="2.0"/>` +
        // Open-top Petri liquid dish on adjustable scissor-jack platform
        `<rect x="86" y="164" width="72" height="22" rx="3" fill="url(#g-glass)" stroke="none"/>` +
        `<rect x="88" y="172" width="68" height="12" fill="url(#g-liquid)" stroke="none"/>` +
        `<path d="M88 172 Q122 174 156 172" stroke="${P.tealDark}" stroke-width="1.2"/>` +
        `<path d="M83 162 Q86 162 86 165 V183 Q86 186 89 186 H155 Q158 186 158 183 V165 Q158 162 161 162" fill="none" stroke="${P.ink}" stroke-width="2.4"/>` +
        `<rect x="94" y="186" width="56" height="8" rx="2" fill="${P.slate}" stroke="${P.ink}" stroke-width="1.5"/>` +
        `<path d="M102 194 L142 222 M142 194 L102 222" stroke="${P.ink}" stroke-width="2.2"/>` +
        `<rect x="94" y="222" width="56" height="24" rx="2" fill="url(#g-metal-v)" stroke="${P.ink}" stroke-width="1.8"/>`;
    }, [
      { id: 'hook', x: 122, y: 146, dx: 0, dy: 1, type: 'hook', diameter: 0 },
      { id: 'base', x: 102, y: 260, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ], '焦利氏弹簧秤表面张力测量架：带反光毫米立柱标尺、青铜测力螺旋弹簧、铂丝拉脱环与升降液槽台。');

  return specs;
}

function getOnlineBioEntries() {
  const existingPath = path.join(BIO_DIR, 'manifest.json');
  if (fs.existsSync(existingPath)) {
    const prev = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
    const online = (prev.assets || []).filter(a => a.id && a.id.startsWith('bio:online-'));
    for (const a of online) {
      const svgPath = path.join(BIO_DIR, a.svg);
      a.sha256 = crypto.createHash('sha256').update(fs.readFileSync(svgPath)).digest('hex');
    }
    return online;
  }
  return [];
}

function writeSuite(dir, items, meta) {
  fs.mkdirSync(dir, { recursive: true });
  const manifestAssets = items.map(item => {
    if (item.content !== undefined) {
      const outPath = path.join(dir, item.svg);
      fs.writeFileSync(outPath, item.content, 'utf8');
      const sha256 = crypto.createHash('sha256').update(Buffer.from(item.content, 'utf8')).digest('hex');
      const copy = { ...item, sha256 };
      delete copy.content;
      return copy;
    }
    return item;
  });
  const manifest = { ...meta, assets: manifestAssets };
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return manifestAssets;
}

function updateBioAttribution(authoredCount) {
  const attrPath = path.join(BIO_DIR, 'ATTRIBUTION.md');
  const content = [
    '# Biochemistry & Biology Apparatus Attribution',
    '',
    '## Original Chem Studio Illustrations (WTFPL-2.0)',
    '',
    `- **Assets**: ${authoredCount} authored biochemistry & biology SVG illustrations in \`assets/biochemistry/\` (generated deterministically by \`scripts/generate-biophys-art.cjs\`)`,
    '- **Author**: Chem Studio contributors',
    '- **License**: WTFPL-2.0 (`Do What The F*ck You Want To Public License`, v2)',
    '',
    'All biochemistry and biology vector apparatus (`bio:*`, including unified replacements of all former `bio:online-*` entries) are original Chem Studio illustrations using Qt `QSvgRenderer`-safe SVG 1.1/1.2 Tiny primitives.',
    '',
  ].join('\n');
  fs.writeFileSync(attrPath, content, 'utf8');
}

function updatePhysicsAttribution(physicsCount) {
  const attrPath = path.join(PHYS_DIR, 'ATTRIBUTION.md');
  const content = [
    '# Physics & Electronics Apparatus Attribution',
    '',
    `- **Assets**: ${physicsCount} authored physics, electrical, optical, thermal, and mechanics SVG illustrations in \`assets/physics/\` (generated deterministically by \`scripts/generate-biophys-art.cjs\`)`,
    '- **Author**: Chem Studio contributors',
    '- **License**: WTFPL-2.0 (`Do What The F*ck You Want To Public License`, v2)',
    '',
    'All apparatus vectors follow Chem Studio orthographic schematic conventions and Qt `QSvgRenderer`-safe SVG 1.1/1.2 Tiny syntax.',
    '',
  ].join('\n');
  fs.writeFileSync(attrPath, content, 'utf8');
}

function run() {
  const bioAll = buildBiochemistrySpecs();
  writeSuite(BIO_DIR, bioAll, {
    format: 'chem-studio-art',
    version: 1,
    license: 'per-asset',
    approvedDate: '2026-11-23',
  });
  updateBioAttribution(bioAll.length);

  const physicsAll = buildPhysicsSpecs();
  writeSuite(PHYS_DIR, physicsAll, {
    format: 'chem-studio-art',
    version: 1,
    license: 'per-asset',
    approved: true,
    merged: true,
    approvedDate: '2026-11-23',
  });
  updatePhysicsAttribution(physicsAll.length);

  console.log(`Generated ${bioAll.length} authored biochemistry assets (0 adapted online remaining).`);
  console.log(`Generated ${physicsAll.length} authored physics assets.`);
}

run();
