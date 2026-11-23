// Publication-grade glassware and glass apparatus module for Chem Studio.
// Owns 77 studio:* items (70 upgraded + 7 new unique glassware items) + 3 RBF neck variants.
'use strict';

const S = require('./svg-style.cjs');
const {
  C, r, wrapSvg, hatchedTrapezoid, frostedJoint,
  verticalFemaleJoint, verticalMaleJoint, rolledLip,
  glassHighlight, gradTicks, barb, oliveBarb,
  drawStopcock, labelText, bindingPost,
} = S;

function tubeWall(p, d, strokeW, innerFill, cap = 'butt') {
  return (
    `<path d="${d}" fill="none" stroke="${C.stroke}" stroke-width="${r(strokeW)}" stroke-linecap="${cap}" stroke-linejoin="round"/>\n` +
    `  <path d="${d}" fill="none" stroke="${innerFill}" stroke-width="${r(Math.max(1.5, strokeW - 4.4))}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
  );
}

function flaskBodyGrad(p, d, extra = '') {
  return `<path d="${d}" fill="url(#${p}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`;
}

function beakerGroup(p, id, opts = {}) {
  const body = `M23 41 L27 46 V167 Q27 179 40 179 H125 Q137 179 137 167 V34`;
  const rim = `<path d="M16 34 Q21 34 25 43 M16 34 H137" fill="none" stroke="${C.stroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
  const lipBand = `<path d="M16 34 L25 42 H137 V34 Z" fill="url(#${p}-glass)" stroke="none"/>`;
  const cup =
    `<path d="M16 34 L27 44 V167 Q27 179 40 179 H125 Q137 179 137 167 V34 Z" fill="url(#${p}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
  const basePlate = `<line x1="36" y1="181" x2="128" y2="181" stroke="${C.stroke}" stroke-width="2.2" stroke-linecap="round"/>`;
  const hl = glassHighlight(34, 48, 34, 168, 3.2, 0.8);
  const scale =
    gradTicks(126, 62, 152, 7, 2, 12, { dir: -1, sw: 1.1 }) +
    labelText(104, 66, '250', 7.5, C.tick, 'end', false) +
    labelText(104, 96, '200', 7.5, C.tick, 'end', false) +
    labelText(104, 126, '150', 7.5, C.tick, 'end', false) +
    labelText(104, 156, '100', 7.5, C.tick, 'end', false) +
    labelText(55, 168, 'mL', 7.5, C.muted, 'middle', false);

  if (id === 'tank') {
    const tankWall = `<rect x="16" y="34" width="121" height="147" rx="4" fill="url(#${p}-glass)" stroke="${C.stroke}" stroke-width="2.2"/>`;
    const topLip = `<rect x="14" y="34" width="125" height="5" rx="2.5" fill="url(#${p}-glass)" stroke="${C.stroke}" stroke-width="2.0"/>`;
    const baseThick = `<rect x="22" y="173" width="109" height="8" rx="1.5" fill="url(#${p}-metal)" fill-opacity="0.35" stroke="${C.inner}" stroke-width="1.2"/>`;
    const water = `<path d="M19 88 Q48 84 76 88 T134 88" fill="none" stroke="${C.teal}" stroke-width="1.4" stroke-opacity="0.65"/>`;
    return `${tankWall}\n  ${baseThick}\n  ${water}\n  ${topLip}\n  ${glassHighlight(24, 46, 24, 166, 3.2, 0.8)}`;
  }

  if (id === 'tlc-chamber') {
    const jar = `<rect x="16" y="34" width="121" height="147" rx="5" fill="url(#${p}-glass)" stroke="${C.stroke}" stroke-width="2.2"/>`;
    const lip = `<rect x="14" y="34" width="125" height="5" rx="2.5" fill="url(#${p}-glass)" stroke="${C.stroke}" stroke-width="2.0"/>`;
    const solvent = `<path d="M18 144 H135 V175 Q135 179 131 179 H22 Q18 179 18 175 Z" fill="url(#${p}-coolant)" stroke="none"/>` +
      `<line x1="18" y1="144" x2="135" y2="144" stroke="${C.tealDark}" stroke-width="1.3" stroke-opacity="0.7"/>`;
    const plate = `<polygon points="50,62 96,58 104,168 58,170" fill="#F8FAFC" stroke="${C.inner}" stroke-width="1.6" stroke-linejoin="round"/>` +
      `<line x1="57" y1="152" x2="102" y2="150" stroke="${C.muted}" stroke-width="1.0" stroke-dasharray="3 2.5"/>` +
      `<line x1="53" y1="84" x2="98" y2="81" stroke="${C.teal}" stroke-width="1.0" stroke-dasharray="3 2.5"/>` +
      `<circle cx="68" cy="126" r="3.6" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.0"/>` +
      `<circle cx="84" cy="98" r="3.8" fill="${C.amberLight}" stroke="${C.stroke}" stroke-width="1.0"/>` +
      `<circle cx="67" cy="151" r="2.2" fill="${C.muted}" stroke="none"/>` +
      `<circle cx="87" cy="150" r="2.2" fill="${C.muted}" stroke="none"/>`;
    return `${jar}\n  ${solvent}\n  ${plate}\n  ${lip}\n  ${glassHighlight(24, 45, 24, 168, 3.0, 0.78)}`;
  }

  if (id === 'calorimetry-cup') {
    const outer = `<rect x="19" y="44" width="126" height="137" rx="8" fill="url(#${p}-chassis)" stroke="${C.stroke}" stroke-width="2.2"/>`;
    const innerRim = `<rect x="29.5" y="34" width="105" height="12" rx="3" fill="url(#${p}-glass)" stroke="${C.stroke}" stroke-width="2.0"/>`;
    const liner = `<rect x="33" y="48" width="98" height="122" rx="5" fill="url(#${p}-metal)" fill-opacity="0.55" stroke="${C.inner}" stroke-width="1.4"/>`;
    const label = `<rect x="48" y="96" width="68" height="28" rx="4" fill="#F8FAFC" stroke="${C.inner}" stroke-width="1.2"/>` +
      labelText(82, 114, 'CALORIMETER', 7.5, C.tealDark);
    return `${outer}\n  ${liner}\n  ${innerRim}\n  ${label}\n  ${glassHighlight(26, 52, 26, 170, 2.8, 0.72)}`;
  }

  if (id === 'displacement-beaker' || id === 'eureka') {
    const isEureka = id === 'eureka';
    const vesselFill = isEureka ? `url(#${p}-metal)` : `url(#${p}-glass)`;
    const bodyPath = `<path d="M16 34 L27 44 V167 Q27 179 40 179 H125 Q137 179 137 167 V34 Z" fill="${vesselFill}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const spoutD = `M136 58 H151 Q159 58 159 67 V88 H147 V70 H136 Z`;
    const spout = `<path d="${spoutD}" fill="${vesselFill}" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>`;
    const spoutBevel = `<line x1="149.5" y1="68" x2="149.5" y2="86" stroke="#FFFFFF" stroke-width="1.4" stroke-opacity="0.72" stroke-linecap="round"/>`;
    const innerMarks = isEureka
      ? `<rect x="36" y="44" width="90" height="126" rx="3" fill="none" stroke="${C.inner}" stroke-width="1.0" stroke-opacity="0.35"/>` +
        labelText(82, 112, 'EUREKA', 8.5, C.tealDark)
      : gradTicks(126, 74, 154, 6, 2, 11, { dir: -1, sw: 1.1 }) +
        `<path d="M29 66 Q82 69 135 66" fill="none" stroke="${C.teal}" stroke-width="1.3" stroke-dasharray="3 2.5" stroke-opacity="0.7"/>`;
    return `${spout}\n  ${spoutBevel}\n  ${bodyPath}\n  ${innerMarks}\n  ${rim}\n  ${basePlate}\n  ${hl}`;
  }

  return `${lipBand}\n  ${cup}\n  ${scale}\n  ${rim}\n  ${basePlate}\n  ${hl}`;
}

function registerContainers(register) {
  // 1-6. Beakers & rectangular vessels (160x200)
  const beakerDefs = [
    ['beaker', '烧杯', 'beaker', { hasTarget: true, contentsSeat: true }],
    ['displacement-beaker', '溢流杯', 'displacement beaker', { outlet: true }],
    ['eureka', '排水罐', 'eureka', { outlet: true }],
    ['tank', '水槽', 'tank', {}],
    ['tlc-chamber', '展开缸', 'tlc chamber', {}],
  ];
  for (const [id, name, search, cfg] of beakerDefs) {
    const ports = [
      { id: 'mouth', x: 76.5, y: 34, dx: 0, dy: -1, type: 'mouth', diameter: 121, depth: 25, target: [82, 150], edge: [16, 34, 137, 34] },
    ];
    if (cfg.outlet) {
      ports.push({ id: 'outlet', x: 153, y: 88, dx: 0, dy: 1, type: 'tube', diameter: 12, edge: [147, 88, 159, 88] });
    }
    if (cfg.contentsSeat) {
      ports.push({ id: 'contents-seat', x: 82, y: 164, dx: 0, dy: -1, type: 'contents-seat', diameter: 0 });
    }
    ports.push({ id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 });
    register(id, name, '容器', { width: 160, height: 200, search, svg: beakerGroup(id, id), ports });
  }

  register('calorimetry-cup', '量热杯', '容器', {
    width: 160, height: 200, search: 'calorimetry cup',
    svg: beakerGroup('calorimetry-cup', 'calorimetry-cup'),
    ports: [
      { id: 'mouth', x: 82, y: 34, dx: 0, dy: -1, type: 'mouth', diameter: 105, depth: 25, target: [82, 150], edge: [29.5, 34, 134.5, 34] },
      { id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });

  // 7. Watch glass (160x70)
  register('watch-glass', '表面皿', '容器', {
    width: 160, height: 70, search: 'watch glass',
    svg:
      `<path d="M10 19 Q80 80 150 19 Q80 34 10 19 Z" fill="url(#watch-glass-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  <path d="M14 21 Q80 37 146 21" fill="none" stroke="${C.inner}" stroke-width="1.2" stroke-opacity="0.55"/>\n` +
      `  <path d="M28 32 Q62 56 96 46" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-opacity="0.78" stroke-linecap="round"/>`,
    ports: [{ id: 'base', x: 80, y: 52, dx: 0, dy: 1, type: 'base', diameter: 0 }],
  });

  // 8. Stemmed glass (160x200)
  register('stemmed-glass', '高脚杯', '容器', {
    width: 160, height: 200, search: 'stemmed glass',
    svg:
      `<ellipse cx="80" cy="182" rx="43" ry="6.5" fill="url(#stemmed-glass-glass)" stroke="${C.stroke}" stroke-width="2.2"/>\n` +
      `  <path d="M77 110 V177 Q66 181 52 183 H108 Q94 181 83 177 V110 Z" fill="url(#stemmed-glass-glass)" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>\n` +
      `  <path d="M24 18 H136 C135 96 105 112 80 112 C55 112 25 96 24 18 Z" fill="url(#stemmed-glass-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  <ellipse cx="80" cy="18" rx="56" ry="5" fill="url(#stemmed-glass-glass)" stroke="${C.stroke}" stroke-width="2.0"/>\n` +
      `  <path d="M35 30 C36 74 52 96 72 104" fill="none" stroke="#FFFFFF" stroke-width="2.8" stroke-opacity="0.78" stroke-linecap="round"/>`,
    ports: [{ id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 }],
  });

  // 9-10. Conical flasks (160x200)
  for (const [id, name, hasArm] of [
    ['conical-flask', '锥形瓶', false],
    ['conical-flask-with-side-arm', '侧支锥形瓶', true],
  ]) {
    const ports = [
      { id: 'mouth', x: 80, y: 12, dx: 0, dy: -1, type: 'mouth', diameter: 36, depth: 24, target: [80, 146], edge: [62, 12, 98, 12] },
    ];
    let armSvg = '';
    if (hasArm) {
      const armBarb = barb(id, 98, 56.5, 0.87, -0.5, 44.5, 6.8, 6.5);
      armSvg = armBarb.svg;
      ports.push({
        id: 'outlet',
        x: 137,
        y: 38,
        dx: 0.87,
        dy: -0.5,
        type: 'tube',
        diameter: 13,
        edge: armBarb.port.edge,
      });
    }
    if (!hasArm) {
      ports.push({ id: 'contents-seat', x: 80, y: 165, dx: 0, dy: -1, type: 'contents-seat', diameter: 0 });
    }
    ports.push({ id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 });
    const body =
      `${armSvg}\n` +
      `  <path d="M62 14 V55 L20 168 Q16 180 30 180 H130 Q144 180 140 168 L98 55 V14 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  ${rolledLip(id, 80, 12, 18.5, { height: 4.5 })}\n` +
      `  ${glassHighlight('M67 22 V56 L30 165', 3.0, 0.78)}\n` +
      `  ${gradTicks(125, 114, 158, 4, 2, 13, { dir: -1, sw: 1.1 })}\n` +
      `  ${labelText(96, 118, '250', 7.5, C.tick, 'end', false)}\n` +
      `  ${labelText(96, 147, '100', 7.5, C.tick, 'end', false)}\n` +
      `  <rect x="44" y="132" width="38" height="22" rx="3" fill="#F8FAFC" fill-opacity="0.72" stroke="${C.inner}" stroke-width="1.0"/>\n` +
      `  ${labelText(63, 146, '250 mL', 7.2, C.inner)}`;
    register(id, name, '容器', { width: 160, height: 200, svg: body, ports });
  }

  // 11-12. Test tubes (70x200)
  for (const [id, name, hasArm] of [
    ['test-tube', '试管', false],
    ['test-tube-with-side-arm', '侧支试管', true],
  ]) {
    let armSvg = '';
    const ports = [
      { id: 'mouth', x: 35, y: 12, dx: 0, dy: -1, type: 'mouth', diameter: 30, depth: 28, target: [35, 135], edge: [20, 12, 50, 12] },
    ];
    if (hasArm) {
      armSvg =
        `<path d="M49 45 H66 Q69 45 69 48 V36 H63 V48 H49 Z" fill="none" stroke="none"/>\n` +
        `  <path d="M49 45 H63 V36 H69 V49 Q69 51 66 51 H49 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="1.9" stroke-linejoin="round"/>`;
      ports.push({ id: 'outlet', x: 66, y: 36, dx: 0, dy: -1, type: 'tube', diameter: 6, edge: [63, 36, 69, 36] });
    }
    const body =
      `${armSvg}\n` +
      `  <path d="M20 14 V160 A15 15 0 0 0 50 160 V14 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  ${rolledLip(id, 35, 12, 16, { height: 4.2 })}\n` +
      `  ${glassHighlight('M25.5 22 V158 A10 10 0 0 0 32 168', 2.4, 0.78)}`;
    register(id, name, '容器', { width: 70, height: 200, svg: body, ports });
  }

  // 13. Round-bottom flask (160x200, neckCount:1 + 2/3/4 variants)
  function rbfNeckSvg(p, cx, yTop, yJoin, hwOuter, dJoint, neckH = 22) {
    return (
      `<path d="M${r(cx - hwOuter)} ${r(yTop + 4)} V${r(yJoin)} H${r(cx + hwOuter)} V${r(yTop + 4)} Z" fill="url(#${p}-glass)" stroke="${C.stroke}" stroke-width="2.1"/>\n` +
      `  ${verticalFemaleJoint(p, cx, yTop, neckH, dJoint, Math.max(4.5, dJoint - 2.2), { rimExtra: 3.2 })}`
    );
  }
  const rbfBody = (p, extraTop = '') =>
    `${extraTop}\n` +
    `  <path d="M61 12 V64 C0 100 13 181 80 181 C147 181 160 100 99 64 V12 Z" fill="url(#${p}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
    `  ${verticalFemaleJoint(p, 80, 12, 24, 15.8, 13.2, { rimExtra: 3.2 })}\n` +
    `  ${glassHighlight('M32 126 C32 96 48 80 65 70', 3.4, 0.78)}\n` +
    `  <ellipse cx="80" cy="181" rx="18" ry="1.8" fill="none" stroke="${C.inner}" stroke-width="1.2" stroke-opacity="0.45"/>\n` +
    `  <circle cx="80" cy="126" r="18" fill="#F8FAFC" fill-opacity="0.58" stroke="${C.inner}" stroke-width="1.0"/>\n` +
    `  ${labelText(80, 124, '250', 8.5, C.inner)}\n` +
    `  ${labelText(80, 134, 'mL', 7, C.muted, 'middle', false)}`;

  const rbfVariants = [];
  for (let n = 2; n <= 4; n++) {
    const vPorts = [];
    let necks = '';
    const bulbPath = `M23 81 C-6 116 16 183 80 183 C144 183 166 116 137 81 C116 66 44 66 23 81 Z`;
    for (let i = 0; i < n; i++) {
      const cx = 80 + (i - (n - 1) / 2) * 30;
      necks +=
        `<path d="M${r(cx - 7.5)} 18 V86 H${r(cx + 7.5)} V18 Z" fill="url(#round-bottom-flask-glass)" stroke="${C.stroke}" stroke-width="2.0"/>\n` +
        `  ${verticalFemaleJoint('round-bottom-flask', cx, 18, 20, 6.8, 5.4, { rimExtra: 2.2, lipH: 3.6 })}\n`;
      vPorts.push({
        id: i === 0 ? 'mouth' : `mouth-${i + 1}`,
        x: cx,
        y: 18,
        dx: 0,
        dy: -1,
        type: 'glass-female',
        diameter: 18,
        depth: 22,
        target: [cx, 143],
        edge: [cx - 9, 18, cx + 9, 18],
      });
    }
    vPorts.push({ id: 'contents-seat', x: 80, y: 168, dx: 0, dy: -1, type: 'contents-seat', diameter: 0 });
    const vSvg =
      `${necks}` +
      `  <path d="M23 81 C-6 116 16 183 80 183 C144 183 166 116 137 81 C114 68 46 68 23 81 Z" fill="url(#round-bottom-flask-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  <path d="M30 130 C30 104 42 92 54 84" fill="none" stroke="#FFFFFF" stroke-width="3.2" stroke-opacity="0.78" stroke-linecap="round"/>\n` +
      `  <circle cx="80" cy="134" r="17" fill="#F8FAFC" fill-opacity="0.55" stroke="${C.inner}" stroke-width="1.0"/>\n` +
      `  ${labelText(80, 137, '250 mL', 7.2, C.inner)}`;
    rbfVariants.push({ neckCount: n, width: 160, height: 200, svg: vSvg, ports: vPorts });
  }

  register('round-bottom-flask', '圆底烧瓶', '容器', {
    width: 160, height: 200, neckCount: 1,
    svg: rbfBody('round-bottom-flask'),
    ports: [
      { id: 'mouth', x: 80, y: 12, dx: 0, dy: -1, type: 'glass-female', diameter: 38, depth: 25, target: [80, 140], edge: [61, 12, 99, 12] },
      { id: 'contents-seat', x: 80, y: 166, dx: 0, dy: -1, type: 'contents-seat', diameter: 0 },
      { id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
    variants: rbfVariants,
  });

  // 14. Boiling flask (flat-bottom)
  register('boiling-flask', '平底烧瓶', '容器', {
    width: 160, height: 200, neckCount: 1,
    svg:
      `<path d="M61 12 V64 C4 98 14 166 50 180 H110 C146 166 156 98 99 64 V12 Z" fill="url(#boiling-flask-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  ${verticalFemaleJoint('boiling-flask', 80, 12, 24, 15.8, 13.2, { rimExtra: 3.2 })}\n` +
      `  <line x1="48" y1="181" x2="112" y2="181" stroke="${C.stroke}" stroke-width="2.2" stroke-linecap="round"/>\n` +
      `  ${glassHighlight('M33 125 C34 95 50 79 65 70', 3.4, 0.78)}\n` +
      `  ${labelText(80, 128, '250 mL', 8.2, C.inner)}`,
    ports: [
      { id: 'mouth', x: 80, y: 12, dx: 0, dy: -1, type: 'glass-female', diameter: 38, depth: 25, target: [80, 140], edge: [61, 12, 99, 12] },
      { id: 'contents-seat', x: 80, y: 166, dx: 0, dy: -1, type: 'contents-seat', diameter: 0 },
      { id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });

  // 15-16. Distillation flask & Schlenk flask (sidearm down to (132, 83))
  for (const [id, name, isSchlenk] of [
    ['distillation-flask', '蒸馏烧瓶', false],
    ['schlenk-flask', '施伦克瓶', true],
  ]) {
    const sideArm = isSchlenk
      ? `<path d="M97 49 H127 Q138 49 138 60 V83 H126 V61 H97 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>\n` +
        `  ${glassHighlight('M102 52.5 H129 Q132 52.5 132 58 V79', 1.5, 0.72)}`
      : `<path d="M97 44 L132 57 Q138 59 138 66 V83 H126 V67 L97 56 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>\n` +
        `  ${glassHighlight('M102 49 L131 60 V79', 1.5, 0.72)}`;
    const valve = isSchlenk ? drawStopcock(id, 132, 68, { w: 18, h: 8, teal: true }) : '';
    const extraFlask = isSchlenk
      ? `<path d="M61 12 V68 C22 86 24 166 80 181 C136 166 138 86 99 68 V12 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`
      : `<path d="M61 12 V64 C0 100 13 181 80 181 C147 181 160 100 99 64 V12 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const svg =
      `${sideArm}\n  ${extraFlask}\n` +
      `  ${verticalFemaleJoint(id, 80, 12, 24, 15.8, 13.2, { rimExtra: 3.2 })}\n` +
      `  ${valve}\n` +
      `  ${glassHighlight(isSchlenk ? 'M43 128 C44 100 56 85 67 74' : 'M32 126 C32 96 48 80 65 70', 3.0, 0.78)}\n` +
      `  ${labelText(80, 130, isSchlenk ? 'SCHLENK' : '250 mL', 7.5, isSchlenk ? C.tealDark : C.inner)}`;
    register(id, name, '容器', {
      width: 160, height: 200, neckCount: 1, svg,
      ports: [
        { id: 'mouth', x: 80, y: 12, dx: 0, dy: -1, type: 'glass-female', diameter: 38, depth: 25, target: [80, 140], edge: [61, 12, 99, 12] },
        { id: 'outlet', x: 132, y: 83, dx: 0, dy: 1, type: 'tube', diameter: 12, edge: [126, 83, 138, 83] },
        { id: 'contents-seat', x: 80, y: 166, dx: 0, dy: -1, type: 'contents-seat', diameter: 0 },
        { id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 },
      ],
    });
  }

  // 17. Volumetric flask (160x200)
  register('volumetric-flask', '容量瓶', '容器', {
    width: 160, height: 200, neckCount: 1,
    svg:
      `<path d="M70 12 V102 C18 134 26 176 54 183 H106 C134 176 142 134 90 102 V12 Z" fill="url(#volumetric-flask-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  ${verticalFemaleJoint('volumetric-flask', 80, 12, 22, 8.8, 7.4, { rimExtra: 2.2 })}\n` +
      `  <line x1="68.5" y1="62" x2="91.5" y2="62" stroke="${C.tealDark}" stroke-width="1.6"/>\n` +
      `  ${glassHighlight('M38 145 C40 126 56 116 68 106', 2.8, 0.78)}\n` +
      `  ${glassHighlight(74, 38, 74, 96, 2.0, 0.72)}\n` +
      `  ${labelText(80, 142, '100 mL', 8.5, C.inner)}\n` +
      `  ${labelText(80, 155, '20°C  A', 7.2, C.tealDark)}`,
    ports: [
      { id: 'mouth', x: 80, y: 12, dx: 0, dy: -1, type: 'glass-female', diameter: 22, depth: 25, target: [80, 140], edge: [69, 12, 91, 12] },
      { id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });

  // 18. Pycnometer (160x200)
  register('pycnometer', '比重瓶', '容器', {
    width: 160, height: 200, neckCount: 1,
    svg:
      `<path d="M61 12 V56 C24 88 26 170 52 181 H108 C134 170 136 88 99 56 V12 Z" fill="url(#pycnometer-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  ${verticalFemaleJoint('pycnometer', 80, 12, 24, 15.8, 13.2, { rimExtra: 3.2 })}\n` +
      `  <line x1="80" y1="36" x2="80" y2="112" stroke="${C.inner}" stroke-width="1.3" stroke-dasharray="4 3" stroke-opacity="0.5"/>\n` +
      `  <line x1="50" y1="181" x2="110" y2="181" stroke="${C.stroke}" stroke-width="2.2"/>\n` +
      `  ${glassHighlight('M42 132 C43 102 52 84 64 72', 3.0, 0.78)}\n` +
      `  ${labelText(80, 134, '25 mL', 8.2, C.inner)}\n` +
      `  ${labelText(80, 146, '20°C', 7, C.tealDark)}`,
    ports: [
      { id: 'mouth', x: 80, y: 12, dx: 0, dy: -1, type: 'glass-female', diameter: 38, depth: 25, target: [80, 140], edge: [61, 12, 99, 12] },
      { id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });

  // 19. Gas jar (160x200)
  register('gas-jar', '集气瓶', '容器', {
    width: 160, height: 200,
    svg:
      `<path d="M38 16 V171 Q38 181 48 181 H112 Q122 181 122 171 V16 Z" fill="url(#gas-jar-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  ${hatchedTrapezoid('gas-jar', 80, 15, 80, 26, 44, 42, { sw: 1.4 })}\n` +
      `  ${rolledLip('gas-jar', 80, 14, 46, { height: 5.0 })}\n` +
      `  <rect x="40" y="172" width="80" height="8" rx="2" fill="url(#gas-jar-metal)" fill-opacity="0.32" stroke="${C.inner}" stroke-width="1.1"/>\n` +
      `  ${glassHighlight(46, 32, 46, 166, 3.2, 0.78)}`,
    ports: [
      { id: 'mouth', x: 80, y: 14, dx: 0, dy: -1, type: 'mouth', diameter: 84, depth: 24, target: [80, 144], edge: [38, 14, 122, 14] },
      { id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });

  // 20-23. Bottles, Thermos, Wash-bottle (160x200)
  for (const [id, name, mode] of [
    ['reagent-bottle', '试剂瓶', 'clear'],
    ['bottle', '玻璃瓶', 'amber'],
    ['thermos', '真空保温瓶', 'dewar'],
    ['wash-bottle', '洗瓶', 'wash'],
  ]) {
    const isAmber = mode === 'amber';
    const isDewar = mode === 'dewar';
    const isWash = mode === 'wash';
    const fillRef = isAmber ? `url(#${id}-amber)` : isDewar ? `url(#${id}-chassis)` : `url(#${id}-glass)`;
    const bottleShape =
      `<path d="M60 15 V45 Q27 56 27 80 V171 Q27 183 40 183 H120 Q133 183 133 171 V80 Q133 56 100 45 V15 Z" fill="${fillRef}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    let innerDetail = '';
    if (mode === 'clear' || mode === 'amber') {
      innerDetail =
        `${verticalFemaleJoint(id, 80, 14, 20, 20, 18.5, { rimExtra: 2.2, amber: isAmber })}\n` +
        `  <rect x="46" y="90" width="68" height="48" rx="3" fill="#F8FAFC" fill-opacity="${isAmber ? 0.92 : 0.78}" stroke="${C.inner}" stroke-width="1.2"/>\n` +
        `  <line x1="54" y1="106" x2="106" y2="106" stroke="${C.teal}" stroke-width="1.5"/>\n` +
        `  ${labelText(80, 121, isAmber ? 'AMBER' : 'REAGENT', 8, C.inner)}\n` +
        `  ${labelText(80, 132, '500 mL', 7, C.muted, 'middle', false)}`;
    } else if (isDewar) {
      innerDetail =
        `<path d="M40 70 V165 Q40 172 48 172 H112 Q120 172 120 165 V70" fill="url(#${id}-metal)" fill-opacity="0.55" stroke="${C.inner}" stroke-width="1.6"/>\n` +
        `  <rect x="27" y="88" width="106" height="14" fill="url(#${id}-accent)" stroke="${C.stroke}" stroke-width="1.4"/>\n` +
        `  ${rolledLip(id, 80, 14, 22, { height: 5.0 })}\n` +
        `  ${labelText(80, 126, 'DEWAR', 8.5, C.tealDark)}`;
    } else {
      innerDetail =
        `<path d="M80 168 V10 Q80 6 86 6 H124 L145.5 26.5" fill="none" stroke="${C.stroke}" stroke-width="7.2" stroke-linecap="round" stroke-linejoin="round"/>\n` +
        `  <path d="M80 168 V10 Q80 6 86 6 H124 L145.5 26.5" fill="none" stroke="#F8FAFC" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>\n` +
        `  <polygon points="142,24.5 152.5,26.5 145.5,33.5 140,29" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>\n` +
        `  <line x1="145.5" y1="33.5" x2="152.5" y2="26.5" stroke="${C.stroke}" stroke-width="2.2" stroke-linecap="round"/>\n` +
        `  ${bottleShape}\n` +
        `  <path d="M80 168 V45" fill="none" stroke="${C.stroke}" stroke-width="4.5" stroke-opacity="0.45"/>\n` +
        `  <path d="M80 168 V45" fill="none" stroke="#F8FAFC" stroke-width="2.2" stroke-opacity="0.75"/>\n` +
        `  <rect x="57" y="14" width="46" height="14" rx="2.5" fill="url(#${id}-accent)" stroke="${C.stroke}" stroke-width="2.0"/>\n` +
        `  <line x1="60" y1="20" x2="100" y2="20" stroke="${C.tealLight}" stroke-width="1.0" stroke-opacity="0.7"/>\n` +
        `  <rect x="46" y="92" width="68" height="44" rx="3" fill="#F8FAFC" fill-opacity="0.78" stroke="${C.inner}" stroke-width="1.2"/>\n` +
        `  ${labelText(80, 114, 'H₂O', 10, C.tealDark)}\n` +
        `  ${labelText(80, 127, '500 mL', 7, C.muted, 'middle', false)}`;
    }
    const baseWrap = isWash
      ? `${innerDetail}\n  ${glassHighlight(37, 84, 37, 168, 3.2, 0.72)}`
      : `${bottleShape}\n  ${innerDetail}\n  ${glassHighlight(37, 84, 37, 168, 3.2, isAmber ? 0.58 : 0.78)}`;
    const ports = [
      { id: 'mouth', x: 80, y: 14, dx: 0, dy: -1, type: 'mouth', diameter: 40, depth: 24, target: [80, 144], edge: [60, 14, 100, 14] },
    ];
    if (isWash) {
      ports.push({ id: 'outlet', x: 149, y: 30, dx: 0.7, dy: 0.7, type: 'tube', diameter: 10, edge: [145.5, 33.5, 152.5, 26.5] });
    }
    ports.push({ id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 });
    register(id, name, '容器', { width: 160, height: 200, svg: baseWrap, ports });
  }
}

function registerTubing(register) {
  function drawGlassTube(p, d, ends, wOuter = 20, portType = 'tube', isCapillary = false) {
    const innerColor = isCapillary ? '#E2F1F7' : `url(#${p}-glass)`;
    const hlD = d;
    let rims = '';
    for (const [x, y, dx, dy] of ends) {
      const tx = -dy;
      const ty = dx;
      const hw = wOuter / 2;
      rims += `<line x1="${r(x - tx * hw)}" y1="${r(y - ty * hw)}" x2="${r(x + tx * hw)}" y2="${r(y + ty * hw)}" stroke="${C.stroke}" stroke-width="2.0" stroke-linecap="round"/>\n  `;
    }
    const bore = isCapillary
      ? `<path d="${d}" fill="none" stroke="${C.inner}" stroke-width="2.4" stroke-opacity="0.72" stroke-linecap="butt"/>`
      : `<path d="${hlD}" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-opacity="0.72" stroke-linecap="round" transform="translate(-2,-1)"/>`;
    return (
      `${tubeWall(p, d, wOuter, innerColor, 'butt')}\n` +
      `  ${bore}\n  ${rims}`
    );
  }

  function endsToPorts(ends, wOuter, portType) {
    return ends.map(([x, y, dx, dy], i) => {
      const mag = Math.hypot(dx, dy) || 1;
      const ux = dx / mag;
      const uy = dy / mag;
      const tx = -uy;
      const ty = ux;
      const hw = wOuter / 2 - 2;
      return {
        id: i === 0 ? 'inlet' : i === 1 ? 'outlet' : `branch-${i}`,
        x,
        y,
        dx,
        dy,
        type: portType,
        diameter: wOuter,
        segment: [r(x - ux * 5), r(y - uy * 5), r(x - ux * 35), r(y - uy * 35)],
        edge: [r(x - tx * hw), r(y - ty * hw), r(x + tx * hw), r(y + ty * hw)],
      };
    });
  }

  // 24-27 & 30: Pure glass tubes (140x180)
  for (const [id, name, w, cap] of [
    ['tube', '直玻璃管', 20, false],
    ['capillary-tube', '毛细管', 11, true],
  ]) {
    const hw = w / 2;
    const svg =
      `<rect x="${70 - hw}" y="10" width="${w}" height="155" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2"/>\n` +
      (cap
        ? `  <line x1="70" y1="11" x2="70" y2="164" stroke="${C.inner}" stroke-width="2.2" stroke-opacity="0.72"/>\n`
        : `  ${glassHighlight(70 - hw + 4, 16, 70 - hw + 4, 159, 2.4, 0.78)}\n`) +
      `  <line x1="${70 - hw}" y1="10" x2="${70 + hw}" y2="10" stroke="${C.stroke}" stroke-width="2.2" stroke-linecap="round"/>\n` +
      `  <line x1="${70 - hw}" y1="165" x2="${70 + hw}" y2="165" stroke="${C.stroke}" stroke-width="2.2" stroke-linecap="round"/>`;
    register(id, name, '导管', {
      width: 140, height: 180, svg,
      ports: endsToPorts([[70, 10, 0, -1], [70, 165, 0, 1]], w, 'tube'),
    });
  }

  const simpleTubes = [
    ['tube-bend', '90° 弯管', 'M18 155 H88 Q120 155 120 123 V12', [[18, 155, -1, 0], [120, 12, 0, -1]], 20, false],
    ['s-bent-tube', 'S 形管', 'M100 12 V45 C100 86 40 84 40 127 V166', [[100, 12, 0, -1], [40, 166, 0, 1]], 20, false],
    ['u-bent-tube', 'U 形管', 'M35 12 V130 A35 35 0 0 0 105 130 V12', [[35, 12, 0, -1], [105, 12, 0, -1]], 20, false],
  ];
  for (const [id, name, d, ends, w, cap] of simpleTubes) {
    const ports = endsToPorts(ends, w, 'tube');
    if (id === 'tube-bend') {
      ports[0].segment = [18, 155, 86, 155];
      ports[1].segment = [120, 12, 120, 118];
    }
    register(id, name, '导管', {
      width: 140, height: 180,
      svg: drawGlassTube(id, d, ends, w, 'tube', cap),
      ports,
    });
  }

  // 28. Salt bridge (140x180) - filled with agar-KCl translucent gel & cotton plugs
  {
    const id = 'salt-bridge';
    const d = 'M35 12 V130 A35 35 0 0 0 105 130 V12';
    const ends = [[35, 12, 0, -1], [105, 12, 0, -1]];
    const gel = `<path d="${d}" fill="none" stroke="#99F6E4" stroke-width="14" stroke-linecap="butt" stroke-opacity="0.72"/>`;
    const plugs = `<rect x="28" y="13" width="14" height="10" rx="2" fill="#F8FAFC" stroke="${C.inner}" stroke-width="1.2"/>\n` +
      `  <rect x="98" y="13" width="14" height="10" rx="2" fill="#F8FAFC" stroke="${C.inner}" stroke-width="1.2"/>`;
    const body = `${drawGlassTube(id, d, ends, 20, 'tube', false)}\n  ${gel}\n  ${plugs}\n  ${labelText(70, 148, 'KCl', 8, C.tealDark)}`;
    register(id, '盐桥', '导管', { width: 140, height: 180, svg: body, ports: endsToPorts(ends, 20, 'tube') });
  }

  // 29. Rubber tube (140x180)
  {
    const id = 'rubber-tube';
    const d = 'M16 32 C118 4 20 145 122 152';
    const ends = [[16, 32, -1, 0], [122, 152, 1, 0]];
    const body =
      `<path d="${d}" fill="none" stroke="${C.stroke}" stroke-width="20" stroke-linecap="butt"/>\n` +
      `  <path d="${d}" fill="none" stroke="${C.rubberMid}" stroke-width="15.6" stroke-linecap="butt"/>\n` +
      `  <path d="${d}" fill="none" stroke="#94A3B8" stroke-width="3.2" stroke-opacity="0.6" stroke-linecap="round"/>\n` +
      `  <rect x="14" y="21" width="7" height="22" rx="2" fill="${C.rubberTop}" stroke="${C.stroke}" stroke-width="1.8"/>\n` +
      `  <rect x="117" y="141" width="7" height="22" rx="2" fill="${C.rubberTop}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    register(id, '橡胶软管', '导管', { width: 140, height: 180, svg: body, ports: endsToPorts(ends, 20, 'hose') });
  }

  // 31. Tube adapter (140x180)
  {
    const id = 'tube-adapter';
    const body =
      `<path d="M53 12 V70 L62 105 V165 H78 V105 L87 70 V12 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  ${rolledLip(id, 70, 12, 18.5, { height: 4.5 })}\n` +
      `  ${glassHighlight('M58 20 V68 L66 104 V158', 2.4, 0.78)}\n` +
      `  <line x1="62" y1="165" x2="78" y2="165" stroke="${C.stroke}" stroke-width="2.2" stroke-linecap="round"/>`;
    register(id, '变径接头', '导管', {
      width: 140, height: 180, svg: body,
      ports: [
        { id: 'inlet', x: 70, y: 12, dx: 0, dy: -1, type: 'tube', diameter: 34, edge: [53, 12, 87, 12] },
        { id: 'outlet', x: 70, y: 165, dx: 0, dy: 1, type: 'tube', diameter: 16, edge: [62, 165, 78, 165] },
      ],
    });
  }

  // 32. 3-way-crossing (4-way glass cross, 140x180)
  {
    const id = '3-way-crossing';
    const ends = [[20, 75, -1, 0], [120, 75, 1, 0], [70, 12, 0, -1], [70, 165, 0, 1]];
    const crossOutline =
      `<path d="M60 12 H80 V65 H120 V85 H80 V165 H60 V85 H20 V65 H60 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  ${glassHighlight(64.5, 18, 64.5, 158, 2.2, 0.74)}\n` +
      `  ${glassHighlight(26, 70, 114, 70, 2.2, 0.74)}`;
    register(id, '交叉导管', '导管', { width: 140, height: 180, svg: crossOutline, ports: endsToPorts(ends, 20, 'tube') });
  }
}

function registerCondensersAndDistillation(register) {
  // 33-35. Standard water condensers (92x354)
  for (const [id, name] of [
    ['liebig-condenser', '直形冷凝管'],
    ['allihn', '球形冷凝管'],
    ['graham', '蛇形冷凝管'],
  ]) {
    const cx = 46;
    const jTop = 58;
    const jBot = 292;
    const jHw = 16;
    const inBarb = oliveBarb(id, cx - jHw, 266, -1, 24, 5.2, 4.4);
    const outBarb = oliveBarb(id, cx + jHw, 84, 1, 24, 5.2, 4.4);
    const outerWall =
      `<path d="M${cx - 8} 28 V48 C${cx - 8} 54 ${cx - jHw} 54 ${cx - jHw} ${jTop + 10} V${jBot - 10} ` +
      `C${cx - jHw} ${jBot} ${cx - 8} ${jBot} ${cx - 8} ${jBot + 8} V326 H${cx + 8} V${jBot + 8} ` +
      `C${cx + 8} ${jBot} ${cx + jHw} ${jBot} ${cx + jHw} ${jBot - 10} V${jTop + 10} ` +
      `C${cx + jHw} 54 ${cx + 8} 54 ${cx + 8} 48 V28 Z" fill="url(#${id}-coolant)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;

    let innerBody = '';
    if (id === 'liebig-condenser') {
      innerBody =
        `<rect x="${cx - 6.5}" y="28" width="13" height="298" fill="url(#${id}-glass)" stroke="${C.inner}" stroke-width="1.6"/>\n` +
        `  ${glassHighlight(cx - 2.8, 36, cx - 2.8, 318, 2.0, 0.78)}`;
    } else if (id === 'allihn') {
      const bulbs = 5;
      const span = jBot - jTop - 28;
      const step = span / bulbs;
      const yStart = jTop + 14;
      let d = `M${cx - 6} 28 V${r(yStart)}`;
      for (let i = 0; i < bulbs; i++) {
        const y0 = yStart + i * step;
        const y1 = y0 + step;
        const ym = (y0 + y1) / 2;
        d += ` C${cx - 6} ${r(y0 + step * 0.16)} ${cx - 13} ${r(y0 + step * 0.22)} ${cx - 13} ${r(ym)} C${cx - 13} ${r(y1 - step * 0.22)} ${cx - 6} ${r(y1 - step * 0.16)} ${cx - 6} ${r(y1)}`;
      }
      d += ` V326 H${cx + 6} V${r(yStart + bulbs * step)}`;
      for (let i = bulbs - 1; i >= 0; i--) {
        const y0 = yStart + i * step;
        const y1 = y0 + step;
        const ym = (y0 + y1) / 2;
        d += ` C${cx + 6} ${r(y1 - step * 0.16)} ${cx + 13} ${r(y1 - step * 0.22)} ${cx + 13} ${r(ym)} C${cx + 13} ${r(y0 + step * 0.22)} ${cx + 6} ${r(y0 + step * 0.16)} ${cx + 6} ${r(y0)}`;
      }
      d += ' V28 Z';
      innerBody = `<path d="${d}" fill="url(#${id}-glass)" stroke="${C.inner}" stroke-width="1.6" stroke-linejoin="round"/>`;
    } else {
      const turns = 8;
      const y0 = jTop + 18;
      const y1 = jBot - 18;
      const pitch = (y1 - y0) / turns;
      const amp = 11.5;
      let coil = `M${cx} 28 V${r(y0 - 4)} C${cx} ${r(y0)} ${cx + amp} ${r(y0 + pitch * 0.1)} ${cx + amp} ${r(y0 + pitch * 0.25)}`;
      for (let i = 0; i < turns; i++) {
        const yt = y0 + i * pitch;
        const ym = yt + pitch * 0.5;
        const yb = yt + pitch;
        coil += ` C${cx + amp} ${r(yt + pitch * 0.42)} ${cx - amp} ${r(yt + pitch * 0.34)} ${cx - amp} ${r(ym + pitch * 0.06)}`;
        coil += ` C${cx - amp} ${r(ym + pitch * 0.30)} ${cx + amp} ${r(yb - pitch * 0.22)} ${cx + amp} ${r(yb + (i === turns - 1 ? 0 : pitch * 0.05))}`;
      }
      coil += ` C${cx + amp} ${r(y1 + 6)} ${cx} ${r(y1 + 6)} ${cx} ${r(y1 + 12)} V326`;
      innerBody =
        `<path d="${coil}" fill="none" stroke="${C.inner}" stroke-width="5.4" stroke-linecap="round" stroke-linejoin="round"/>\n` +
        `  <path d="${coil}" fill="none" stroke="#EFF8FC" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    }

    const fem = verticalFemaleJoint(id, cx, 4, 24, 12, 9.5);
    const male = verticalMaleJoint(id, cx, 326, 24, 11.5, 8.8);
    const seals =
      `<path d="M${cx - 10} ${jTop + 4} Q${cx} ${jTop + 9} ${cx + 10} ${jTop + 4}" fill="none" stroke="${C.inner}" stroke-width="1.3"/>\n` +
      `  <path d="M${cx - 10} ${jBot - 4} Q${cx} ${jBot - 9} ${cx + 10} ${jBot - 4}" fill="none" stroke="${C.inner}" stroke-width="1.3"/>\n` +
      `  ${glassHighlight(cx - jHw + 4.5, jTop + 16, cx - jHw + 4.5, jBot - 16, 3.0, 0.78)}`;
    const body = `${inBarb.svg}\n  ${outBarb.svg}\n  ${outerWall}\n  ${innerBody}\n  ${seals}\n  ${fem}\n  ${male}`;
    register(id, name, '冷凝与蒸馏', {
      width: 92, height: 354, svg: body,
      ports: [
        { id: 'inlet', x: cx, y: 4, dx: 0, dy: -1, type: 'glass-joint', diameter: 24, depth: 24, edge: [cx - 12, 4, cx + 12, 4] },
        { id: 'outlet', x: cx, y: 350, dx: 0, dy: 1, type: 'glass-joint', diameter: 17.6, depth: 24, edge: [cx - 8.8, 350, cx + 8.8, 350] },
        { id: 'water-in', ...inBarb.port, type: 'coolant' },
        { id: 'water-out', ...outBarb.port, type: 'coolant' },
        { id: 'grip-site', x: cx, y: 175, dx: 1, dy: 0, type: 'grip-site', diameter: 0, segment: [cx, 108, cx, 244] },
      ],
    });
  }

  // 36. Fractionating column / Vigreux column (110x260)
  {
    const id = 'fractionating-column';
    const cx = 55;
    let spikes = '';
    for (let y = 58; y <= 198; y += 22) {
      spikes +=
        `<path d="M35 ${y} C46 ${y + 2} 50 ${y + 4} 50 ${y + 6} C50 ${y + 8} 46 ${y + 10} 35 ${y + 12}" fill="url(#${id}-glass)" stroke="${C.inner}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>\n` +
        `<path d="M75 ${y + 9} C64 ${y + 11} 60 ${y + 13} 60 ${y + 15} C60 ${y + 17} 64 ${y + 19} 75 ${y + 21}" fill="url(#${id}-glass)" stroke="${C.inner}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>\n`;
    }
    const body =
      `<path d="M44 32 V39 C44 45 35 46 35 54 V210 C35 218 44 219 44 225 V226 H66 V225 C66 219 75 218 75 210 V54 C75 46 66 45 66 39 V32 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  ${spikes}` +
      `  ${verticalFemaleJoint(id, cx, 10, 22, 7.8, 6.4, { rimExtra: 2.2 })}\n` +
      `  ${verticalMaleJoint(id, cx, 226, 22, 12, 9.8)}\n` +
      `  ${glassHighlight(39.5, 56, 39.5, 208, 2.3, 0.78)}`;
    register(id, '分馏柱', '冷凝与蒸馏', {
      width: 110, height: 260, svg: body,
      ports: [
        { id: 'inlet', x: 55, y: 10, dx: 0, dy: -1, type: 'glass-female', diameter: 20, depth: 20, edge: [45, 10, 65, 10] },
        { id: 'outlet', x: 55, y: 248, dx: 0, dy: 1, type: 'glass-male', diameter: 20, depth: 22, edge: [45, 248, 65, 248] },
      ],
    });
  }

  // 37. Thiele tube (140x210)
  {
    const id = 'thiele-tube';
    const outer =
      `<path d="M48 14 V160 Q48 189 73 189 Q98 189 98 160 V142 L126 116 L98 76 V14 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const cutHole =
      `<path d="M98 98 L113 116 L98 134 Z" fill="#FFFFFF" fill-opacity="0.9" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>`;
    const innerRim = rolledLip(id, 73, 12, 25, { height: 4.5 });
    const body =
      `${outer}\n  ${cutHole}\n  ${innerRim}\n` +
      `  ${glassHighlight(55, 26, 55, 162, 3.0, 0.78)}`;
    register(id, '提勒熔点管', '冷凝与蒸馏', {
      width: 140, height: 210, svg: body,
      ports: [{ id: 'mouth', x: 73, y: 12, dx: 0, dy: -1, type: 'mouth', diameter: 50, edge: [48, 12, 98, 12] }],
    });
  }

  // 38. Cold finger (140x210)
  {
    const id = 'cold-finger';
    const finger =
      `<path d="M46 42 V166 Q70 192 94 166 V42 Z" fill="url(#${id}-coolant)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const frostBand = hatchedTrapezoid(id, 70, 30, 70, 48, 22, 18, { sw: 1.8 });
    const flange = `<rect x="30" y="26" width="80" height="6" rx="3" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.0"/>`;
    const feedIn = `<path d="M58 10 H66 V158 H58 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="1.8" stroke-linejoin="round"/>`;
    const feedOut = `<path d="M74 10 H82 V158 H74 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="1.8" stroke-linejoin="round"/>`;
    const body =
      `${feedIn}\n  ${feedOut}\n  ${finger}\n  <line x1="62" y1="44" x2="62" y2="158" stroke="${C.inner}" stroke-width="1.5"/>\n` +
      `  <line x1="78" y1="44" x2="78" y2="96" stroke="${C.inner}" stroke-width="1.5"/>\n` +
      `  ${frostBand}\n  ${flange}\n  ${glassHighlight(52, 54, 52, 160, 2.5, 0.78)}`;
    register(id, '冷指', '冷凝与蒸馏', {
      width: 140, height: 210, svg: body,
      ports: [
        { id: 'inlet', x: 62, y: 10, dx: 0, dy: -1, type: 'coolant', diameter: 8, edge: [58, 10, 66, 10] },
        { id: 'outlet', x: 78, y: 10, dx: 0, dy: -1, type: 'coolant', diameter: 8, edge: [74, 10, 82, 10] },
      ],
    });
  }

  // 39-40. Distillation head & Claisen adapter (140x210)
  for (const [id, name, isClaisen] of [
    ['distillation-head', '蒸馏头', false],
    ['claisen', '克莱森接头', true],
  ]) {
    const outX = isClaisen ? 130 : 124;
    const armPath = isClaisen
      ? `M74 52 H116 Q137 52 137 70 V76 H123 V66 H74 Z`
      : `M74 52 H112 Q132 52 132 70 V76 H116 V66 H74 Z`;
    const claisenBranch = isClaisen
      ? `<path d="M72 128 H106 Q119 128 119 112 V32 H105 V112 H72 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.1" stroke-linejoin="round"/>\n` +
        `  ${verticalFemaleJoint(id, 112, 12, 22, 6.8, 5.4, { rimExtra: 2.2 })}`
      : '';
    const mainTube =
      `<rect x="57" y="34" width="18" height="142" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2"/>`;
    const armSvg =
      `<path d="${armPath}" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const body =
      `${armSvg}\n  ${claisenBranch}\n  ${mainTube}\n` +
      `  ${verticalFemaleJoint(id, 66, 12, 22, 7.8, 6.4, { rimExtra: 2.2 })}\n` +
      `  ${verticalMaleJoint(id, 66, 174, 22, 12, 9.8)}\n` +
      `  ${verticalMaleJoint(id, outX, 72, 20, 10, 7.8)}\n` +
      `  ${glassHighlight(61, 42, 61, 166, 2.2, 0.78)}`;
    const ports = [
      { id: 'mouth', x: 66, y: 12, dx: 0, dy: -1, type: 'glass-female', diameter: 20, edge: [56, 12, 76, 12] },
      { id: 'outlet', x: outX, y: 92, dx: 0, dy: 1, type: 'glass-male', diameter: 16, edge: [outX - 8, 92, outX + 8, 92] },
      { id: 'base', x: 66, y: 196, dx: 0, dy: 1, type: 'glass-male', diameter: 20, edge: [56, 196, 76, 196] },
    ];
    if (isClaisen) {
      ports.push({ id: 'mouth-right', x: 112, y: 12, dx: 0, dy: -1, type: 'glass-female', diameter: 18, edge: [103, 12, 121, 12] });
    }
    register(id, name, '冷凝与蒸馏', { width: 140, height: 210, svg: body, ports });
  }

  // 41. Dean-Stark trap (140x210)
  {
    const id = 'dean-stark-trap';
    const trap =
      `<path d="M44 30 V164 Q44 188 64 188 Q84 188 84 164 V58 H114 V72 H130 V54 Q130 42 116 42 H84 V30 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const drainNozzle = `<path d="M60 190 H68 L66.5 204 H61.5 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="1.8" stroke-linejoin="round"/>`;
    const stopcock = `${drainNozzle}\n  ${drawStopcock(id, 64, 186, { w: 18, h: 8, teal: true })}`;
    const femIn = verticalFemaleJoint(id, 53, 10, 22, 6.8, 5.4, { rimExtra: 2.2 });
    const maleOut = verticalMaleJoint(id, 122, 72, 20, 10, 7.8);
    const ticks = gradTicks(78, 86, 158, 7, 2, 10, { dir: -1, sw: 1.1 });
    const body = `${trap}\n  ${femIn}\n  ${maleOut}\n  ${ticks}\n  ${stopcock}\n  ${glassHighlight(50, 62, 50, 158, 2.2, 0.78)}`;
    register(id, '分水器', '冷凝与蒸馏', {
      width: 140, height: 210, svg: body,
      ports: [
        { id: 'inlet', x: 53, y: 10, dx: 0, dy: -1, type: 'glass-female', diameter: 18, edge: [44, 10, 62, 10] },
        { id: 'outlet', x: 122, y: 92, dx: 0, dy: 1, type: 'glass-male', diameter: 16, edge: [114, 92, 130, 92] },
        { id: 'drain', x: 64, y: 204, dx: 0, dy: 1, type: 'delivery', diameter: 6, segment: [64, 204, 64, 190], edge: [61, 204, 67, 204] },
      ],
    });
  }

  // 42. Drying tube (140x210)
  {
    const id = 'drying-tube';
    const outline =
      `<path d="M57 10 V64 C20 82 20 132 57 148 V198 H77 V148 C114 132 114 82 77 64 V10 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    let beads = '';
    const pts = [[52, 84], [66, 80], [80, 86], [46, 100], [61, 96], [76, 101], [88, 102], [50, 117], [65, 113], [80, 118], [56, 131], [72, 129]];
    for (const [bx, by] of pts) {
      beads += `<circle cx="${bx}" cy="${by}" r="5.2" fill="#F1F5F9" stroke="${C.inner}" stroke-width="1.2"/>\n`;
    }
    const wool =
      `<path d="M46 72 Q58 67 68 72 Q78 76 88 71" fill="none" stroke="#94A3B8" stroke-width="2.2" stroke-linecap="round"/>\n` +
      `  <path d="M46 140 Q58 136 68 140 Q78 144 88 139" fill="none" stroke="#94A3B8" stroke-width="2.2" stroke-linecap="round"/>`;
    const body =
      `${outline}\n  ${beads}  ${wool}\n` +
      `  <line x1="57" y1="10" x2="77" y2="10" stroke="${C.stroke}" stroke-width="2.0"/>\n` +
      `  <line x1="57" y1="198" x2="77" y2="198" stroke="${C.stroke}" stroke-width="2.0"/>\n` +
      `  ${glassHighlight('M42 90 C32 104 34 120 44 132', 2.4, 0.78)}`;
    register(id, '干燥管', '冷凝与蒸馏', {
      width: 140, height: 210, svg: body,
      ports: [
        { id: 'inlet', x: 67, y: 10, dx: 0, dy: -1, type: 'tube', diameter: 20, edge: [57, 10, 77, 10] },
        { id: 'outlet', x: 67, y: 198, dx: 0, dy: 1, type: 'tube', diameter: 20, edge: [57, 198, 77, 198] },
      ],
    });
  }
}

function registerFunnels(register) {
  // 43. Filter funnel (140x210)
  {
    const id = 'filter-funnel';
    const body =
      `<path d="M12 22 H128 L78 103 V192 L62 198 V103 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  ${rolledLip(id, 70, 20, 58, { height: 4.5 })}\n` +
      `  <ellipse cx="70" cy="22" rx="56" ry="3.5" fill="none" stroke="${C.inner}" stroke-width="1.1" stroke-opacity="0.5"/>\n` +
      `  ${glassHighlight('M28 32 L63 92', 3.0, 0.78)}\n` +
      `  ${glassHighlight(65.5, 108, 65.5, 188, 2.0, 0.72)}`;
    register(id, '过滤漏斗', '过滤与分液', {
      width: 140, height: 210, svg: body,
      ports: [
        { id: 'mouth', x: 70, y: 22, dx: 0, dy: -1, type: 'mouth', diameter: 116, edge: [12, 22, 128, 22] },
        { id: 'stem', x: 70, y: 198, dx: 0, dy: 1, type: 'stem', diameter: 16, segment: [70, 190, 70, 115], depth: 80 },
      ],
    });
  }

  // 44. Thistle tube (140x210)
  {
    const id = 'thistle-tube';
    const body =
      `<path d="M34 15 Q34 58 63 63 V198 H77 V63 Q106 58 106 15 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  ${rolledLip(id, 70, 14, 36.5, { height: 4.5 })}\n` +
      `  ${glassHighlight('M42 26 Q44 46 60 54', 2.4, 0.78)}\n` +
      `  ${glassHighlight(66.5, 68, 66.5, 190, 2.0, 0.72)}`;
    register(id, '长颈漏斗', '过滤与分液', {
      width: 140, height: 210, svg: body,
      ports: [
        { id: 'mouth', x: 70, y: 15, dx: 0, dy: -1, type: 'mouth', diameter: 72, edge: [34, 15, 106, 15] },
        { id: 'stem', x: 70, y: 198, dx: 0, dy: 1, type: 'stem', diameter: 16, segment: [70, 190, 70, 115], depth: 80 },
      ],
    });
  }

  // 45-46. Separatory & Dropping funnels (140x210)
  for (const [id, name, isGraduated] of [
    ['separatory-funnel', '分液漏斗', false],
    ['dropping-funnel', '滴液漏斗', true],
  ]) {
    const vesselPath = isGraduated
      ? `M57 16 V38 Q42 46 42 56 V126 Q42 135 62 142 V198 H78 V142 Q98 135 98 126 V56 Q98 46 83 38 V16 Z`
      : `M57 16 V36 C8 58 28 126 62 138 V198 H78 V138 C112 126 132 58 83 36 V16 Z`;
    const ticks = isGraduated
      ? gradTicks(90, 60, 122, 6, 2, 11, { dir: -1, sw: 1.1 }) + labelText(73, 64, '100', 7, C.tick, 'end', false) + labelText(73, 122, '20', 7, C.tick, 'end', false)
      : '';
    const dripBulb = isGraduated
      ? `<ellipse cx="70" cy="176" rx="9" ry="7" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="1.8"/>`
      : '';
    const body =
      `<path d="${vesselPath}" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  ${verticalFemaleJoint(id, 70, 16, 20, 10.5, 8.5, { rimExtra: 2.5 })}\n` +
      `  ${ticks}\n  ${dripBulb}\n` +
      `  ${drawStopcock(id, 70, 156, { w: 22, h: 9, teal: !isGraduated })}\n` +
      `  ${glassHighlight(isGraduated ? 'M49 54 V120' : 'M38 70 C36 96 48 118 62 130', 3.0, 0.78)}`;
    register(id, name, '过滤与分液', {
      width: 140, height: 210, svg: body,
      ports: [
        { id: 'mouth', x: 70, y: 16, dx: 0, dy: -1, type: 'glass-female', diameter: 26, edge: [57, 16, 83, 16] },
        { id: 'stem', x: 70, y: 198, dx: 0, dy: 1, type: 'stem', diameter: 16, segment: [70, 190, 70, 115], depth: 80 },
      ],
    });
  }
}

function registerMeasuring(register) {
  // 47. Graduated cylinder (80x260)
  {
    const id = 'cylinder';
    const foot =
      `<path d="M12 246 Q12 238 23 234 L26 226 H54 L57 234 Q68 238 68 246 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  <line x1="12" y1="248" x2="68" y2="248" stroke="${C.stroke}" stroke-width="2.2" stroke-linecap="round"/>`;
    const body =
      `${foot}\n` +
      `  <path d="M20 12 L23 18 V228 H57 V12 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  <line x1="20" y1="12" x2="57" y2="12" stroke="${C.stroke}" stroke-width="2.2" stroke-linecap="round"/>\n` +
      `  ${gradTicks(55, 34, 214, 15, 3, 9, { dir: -1, sw: 1.1 })}\n` +
      `  ${labelText(43, 36.5, '100', 6.4, C.tick, 'end', false)}\n` +
      `  ${labelText(43, 113.5, '50', 6.4, C.tick, 'end', false)}\n` +
      `  ${labelText(43, 190.5, '10', 6.4, C.tick, 'end', false)}\n` +
      `  ${glassHighlight(28, 22, 28, 220, 2.4, 0.78)}`;
    register(id, '量筒', '测量', {
      width: 80, height: 260, svg: body,
      ports: [
        { id: 'mouth', x: 40, y: 12, dx: 0, dy: -1, type: 'mouth', diameter: 34, edge: [23, 12, 57, 12] },
        { id: 'base', x: 40, y: 248, dx: 0, dy: 1, type: 'base', diameter: 0 },
      ],
    });
  }

  // 48. Volumetric pipette (80x260)
  {
    const id = 'pipette';
    const body =
      `<path d="M35 10 V94 Q17 105 17 133 Q17 161 35 172 V222 L38 244 H42 L45 222 V172 Q63 161 63 133 Q63 105 45 94 V10 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>\n` +
      `  <line x1="35" y1="10" x2="45" y2="10" stroke="${C.stroke}" stroke-width="2.2" stroke-linecap="round"/>\n` +
      `  <line x1="34" y1="54" x2="46" y2="54" stroke="${C.red}" stroke-width="1.6"/>\n` +
      `  ${labelText(40, 134, '25', 8, C.inner)}\n` +
      `  ${labelText(40, 144, 'mL', 6.8, C.muted, 'middle', false)}\n` +
      `  ${glassHighlight('M25 114 Q23 133 27 152', 2.4, 0.78)}`;
    register(id, '移液管', '测量', {
      width: 80, height: 260, svg: body,
      ports: [
        { id: 'stem', x: 40, y: 244, dx: 0, dy: 1, type: 'probe', diameter: 10, segment: [40, 234, 40, 170] },
        { id: 'mouth', x: 40, y: 10, dx: 0, dy: -1, type: 'pipette-stem', diameter: 10, edge: [35, 10, 45, 10] },
      ],
    });
  }

  // 49. Mohr pipette (80x260, mouth d=26)
  {
    const id = 'mohr';
    const body =
      `<path d="M27 10 H53 V26 L48 36 V218 L43 244 H37 L32 218 V36 L27 26 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>\n` +
      `  <line x1="27" y1="10" x2="53" y2="10" stroke="${C.stroke}" stroke-width="2.2" stroke-linecap="round"/>\n` +
      `  <rect x="27" y="14" width="26" height="4" rx="1" fill="${C.teal}" fill-opacity="0.72" stroke="none"/>\n` +
      `  ${gradTicks(47, 50, 198, 12, 2, 10, { dir: -1, sw: 1.0 })}\n` +
      `  ${glassHighlight(35.5, 42, 35.5, 212, 1.8, 0.78)}`;
    register(id, '刻度吸管', '测量', {
      width: 80, height: 260, svg: body,
      ports: [
        { id: 'stem', x: 40, y: 244, dx: 0, dy: 1, type: 'probe', diameter: 10, segment: [40, 234, 40, 170] },
        { id: 'mouth', x: 40, y: 10, dx: 0, dy: -1, type: 'pipette-stem', diameter: 26, edge: [27, 10, 53, 10] },
      ],
    });
  }

  // 50. Burette (80x260)
  {
    const id = 'burette';
    const body =
      `<path d="M27 10 V198 L36 208 V226 L38.5 244 H41.5 L44 226 V208 L53 198 V10 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.1" stroke-linejoin="round"/>\n` +
      `  ${rolledLip(id, 40, 10, 14, { height: 4.0 })}\n` +
      `  ${gradTicks(51, 30, 186, 13, 3, 8, { dir: -1, sw: 1.1 })}\n` +
      `  ${labelText(40, 32.5, '0', 6.4, C.tick, 'end', false)}\n` +
      `  ${labelText(40, 188.5, '50', 6.4, C.tick, 'end', false)}\n` +
      `  ${drawStopcock(id, 40, 215, { w: 20, h: 8, teal: true })}\n` +
      `  ${glassHighlight(32, 22, 32, 194, 2.2, 0.78)}`;
    register(id, '滴定管', '测量', {
      width: 80, height: 260, svg: body,
      ports: [
        { id: 'stem', x: 40, y: 244, dx: 0, dy: 1, type: 'probe', diameter: 10, segment: [40, 234, 40, 170] },
        { id: 'mouth', x: 40, y: 10, dx: 0, dy: -1, type: 'mouth', diameter: 26, edge: [27, 10, 53, 10] },
      ],
    });
  }

  // 51. Eudiometer (80x260)
  {
    const id = 'eudiometer';
    const body =
      `<path d="M27 10 V225 A13 13 0 0 0 53 225 V10 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  ${rolledLip(id, 40, 10, 14, { height: 4.2 })}\n` +
      `  ${gradTicks(51, 30, 200, 14, 2, 12, { dir: -1, sw: 1.1 })}\n` +
      `  <line x1="25" y1="214" x2="32" y2="214" stroke="${C.brass}" stroke-width="2.0" stroke-linecap="round"/>\n` +
      `  <line x1="48" y1="214" x2="55" y2="214" stroke="${C.brass}" stroke-width="2.0" stroke-linecap="round"/>\n` +
      `  ${glassHighlight(33, 22, 33, 222, 2.2, 0.78)}`;
    register(id, '量气管', '测量', {
      width: 80, height: 260, svg: body,
      ports: [
        { id: 'mouth', x: 40, y: 10, dx: 0, dy: -1, type: 'mouth', diameter: 26, edge: [27, 10, 53, 10] },
        { id: 'base', x: 40, y: 238, dx: 0, dy: 1, type: 'base', diameter: 0 },
      ],
    });
  }

  // 52. Thermometer (80x260)
  {
    const id = 'thermometer';
    const body =
      `<circle cx="40" cy="14" r="5" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="1.8"/>\n` +
      `  <path d="M32 208 V22 A8 8 0 0 1 48 22 V208 A17 17 0 1 1 32 208 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  <rect x="37" y="28" width="6" height="178" rx="3" fill="#F8FAFC" stroke="none"/>\n` +
      `  <line x1="40" y1="76" x2="40" y2="222" stroke="${C.red}" stroke-width="4.8" stroke-linecap="round"/>\n` +
      `  <circle cx="40" cy="224" r="10.5" fill="${C.red}" stroke="${C.inner}" stroke-width="1.0"/>\n` +
      `  ${gradTicks(47, 36, 188, 12, 2, 9, { dir: 1, sw: 1.1 })}\n` +
      `  ${labelText(60, 42, '100', 7, C.tick, 'start', false)}\n` +
      `  ${labelText(60, 188, '0°C', 7, C.tick, 'start', false)}\n` +
      `  ${glassHighlight(35, 34, 35, 200, 1.6, 0.85)}\n` +
      `  ${glassHighlight('M32 218 Q31 227 36 232', 2.2, 0.78)}`;
    register(id, '温度计', '测量', {
      width: 80, height: 260, svg: body,
      ports: [{ id: 'probe', x: 40, y: 241, dx: 0, dy: 1, type: 'probe', diameter: 14, segment: [40, 200, 40, 30] }],
    });
  }

  // 53. Hydrometer (80x260)
  {
    const id = 'hydrometer';
    const body =
      `<path d="M35 10 V96 Q18 108 18 142 Q18 176 32 192 Q29 218 35 238 Q40 246 45 238 Q51 218 48 192 Q62 176 62 142 Q62 108 45 96 V10 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.1" stroke-linejoin="round"/>\n` +
      `  <rect x="37" y="18" width="6" height="78" fill="#F8FAFC" stroke="${C.inner}" stroke-width="0.9"/>\n` +
      `  ${gradTicks(43, 24, 90, 9, 3, 5, { dir: -1, sw: 0.9 })}\n` +
      `  <path d="M31 214 Q40 222 49 214 L45 238 Q40 245 35 238 Z" fill="url(#${id}-amber)" stroke="${C.inner}" stroke-width="1.2"/>\n` +
      `  ${glassHighlight('M25 118 Q23 142 27 166', 2.4, 0.78)}`;
    register(id, '液体比重计', '测量', {
      width: 80, height: 260, svg: body,
      ports: [{ id: 'stem', x: 40, y: 244, dx: 0, dy: 1, type: 'immersible', diameter: 10, segment: [40, 234, 40, 170] }],
    });
  }
}

function registerTransferAndSyringes(register) {
  // 54-55. Pump (3-valve) & Suction pear (100x230)
  const bulbGrad = (id) =>
    `<radialGradient id="${id}-red" cx="38%" cy="32%" r="65%"><stop offset="0%" stop-color="#FCA5A5"/><stop offset="45%" stop-color="#DC2626"/><stop offset="100%" stop-color="#991B1B"/></radialGradient>`;
  for (const [id, name, isPump] of [
    ['pump', '三阀吸球', true],
    ['suction-pear', '吸耳球', false],
  ]) {
    const bulb =
      `<path d="M44 200 V152 C-4 138 6 48 50 48 C94 48 104 138 56 152 V200 Z" fill="url(#${id}-red)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  <rect x="44" y="18" width="12" height="31" rx="4" fill="url(#${id}-red)" stroke="${C.stroke}" stroke-width="2.0"/>\n` +
      `  <rect x="42" y="184" width="16" height="16" rx="2" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="2.0"/>`;
    const valves = isPump
      ? `<circle cx="50" cy="34" r="7" fill="${C.corkLight}" stroke="${C.stroke}" stroke-width="1.8"/>${labelText(50, 36.8, 'A', 7.5, C.stroke)}` +
        `<circle cx="30" cy="96" r="8" fill="${C.corkLight}" stroke="${C.stroke}" stroke-width="1.8"/>${labelText(30, 98.8, 'S', 8, C.stroke)}` +
        `<circle cx="70" cy="96" r="8" fill="${C.corkLight}" stroke="${C.stroke}" stroke-width="1.8"/>${labelText(70, 98.8, 'E', 8, C.stroke)}`
      : '';
    const body =
      `${bulb}\n  ${valves}\n` +
      `  <path d="M24 72 C18 92 20 116 28 132" fill="none" stroke="#FFFFFF" stroke-width="3.0" stroke-opacity="0.45" stroke-linecap="round"/>`;
    register(id, name, '移液与注射', {
      width: 100, height: 230, extraDefs: bulbGrad(id), svg: body,
      ports: [{ id: 'mouth', x: 50, y: 200, dx: 0, dy: 1, type: 'pipette-filler', diameter: 12, edge: [44, 200, 56, 200] }],
    });
  }

  // 56-57. Dropper pipette & Plastic pipette (100x230)
  for (const [id, name, isPlastic] of [
    ['dropper-pipette', '滴管', false],
    ['plastic-pipette', '塑料滴管', true],
  ]) {
    const stem = `<path d="M40 69 V190 L50 215 L60 190 V69 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.1" stroke-linejoin="round"/>`;
    const bulb = isPlastic
      ? `<path d="M38 69 C20 14 80 14 62 69 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.1" stroke-linejoin="round"/>`
      : `<path d="M38 69 C18 16 82 16 62 69 Z" fill="url(#${id}-red)" stroke="${C.stroke}" stroke-width="2.1" stroke-linejoin="round"/>` +
        `<rect x="37" y="64" width="26" height="6" rx="2.5" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    const ticks = isPlastic ? gradTicks(57, 82, 162, 6, 2, 7, { dir: -1, sw: 1.0 }) : '';
    const body = `${stem}\n  ${bulb}\n  ${ticks}\n  ${glassHighlight(44, 78, 44, 186, 2.0, 0.78)}`;
    register(id, name, '移液与注射', {
      width: 100, height: 230, extraDefs: isPlastic ? '' : bulbGrad(id), svg: body,
      ports: [{ id: 'tip', x: 50, y: 215, dx: 0, dy: 1, type: 'stem', diameter: 10, segment: [50, 205, 50, 95] }],
    });
  }

  // 58. Pipette bottle (100x230)
  {
    const id = 'pipette-bottle';
    const body =
      `<path d="M31 87 Q12 98 12 114 V208 H88 V114 Q88 98 69 87 V68 H31 Z" fill="url(#${id}-amber)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  <rect x="28" y="58" width="44" height="14" rx="2.5" fill="url(#${id}-rubber)" stroke="${C.stroke}" stroke-width="2.0"/>\n` +
      `  <path d="M39 58 C24 14 76 14 61 58 Z" fill="url(#${id}-red)" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>\n` +
      `  <rect x="24" y="124" width="52" height="52" rx="3" fill="#F8FAFC" fill-opacity="0.92" stroke="${C.inner}" stroke-width="1.2"/>\n` +
      `  ${labelText(50, 149, 'INDIC.', 7.8, C.inner)}\n` +
      `  ${labelText(50, 162, '30 mL', 7, C.muted, 'middle', false)}\n` +
      `  ${glassHighlight(20, 112, 20, 198, 2.5, 0.58)}`;
    register(id, '滴瓶', '移液与注射', {
      width: 100, height: 230, extraDefs: bulbGrad(id), svg: body,
      ports: [{ id: 'base', x: 50, y: 210, dx: 0, dy: 1, type: 'base', diameter: 0 }],
    });
  }

  // 59-60. Syringe & Gas syringe (100x230)
  for (const [id, name, isGas] of [
    ['syringe', '注射器', false],
    ['gas-syringe', '气体注射器', true],
  ]) {
    const plungerStick = `<rect x="46" y="20" width="8" height="90" fill="url(#${id}-${isGas ? 'frost' : 'metal'})" stroke="${C.stroke}" stroke-width="1.8"/>`;
    const thumbPad = `<rect x="28" y="14" width="44" height="7" rx="3" fill="url(#${id}-${isGas ? 'brass' : 'chassis'})" stroke="${C.stroke}" stroke-width="2.0"/>`;
    const piston = isGas
      ? `<rect x="26" y="100" width="48" height="24" rx="2" fill="url(#${id}-frost)" stroke="${C.stroke}" stroke-width="1.8"/>`
      : `<rect x="26" y="106" width="48" height="14" rx="2" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="1.8"/>` +
        `<line x1="26" y1="113" x2="74" y2="113" stroke="${C.rubberDark}" stroke-width="2.0"/>`;
    const barrel = `<rect x="23" y="58" width="54" height="123" rx="3" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2"/>`;
    const flange = `<rect x="15" y="55" width="70" height="6" rx="3" fill="url(#${id}-chassis)" stroke="${C.stroke}" stroke-width="2.0"/>`;
    const luerTip = `<path d="M41 181 H59 L57 196 H43 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>`;
    const needleStem = isGas
      ? `<line x1="43" y1="196" x2="57" y2="196" stroke="${C.stroke}" stroke-width="2.0"/>`
      : `<rect x="46" y="196" width="8" height="7" rx="1" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.5"/><line x1="50" y1="203" x2="50" y2="220" stroke="${C.stroke}" stroke-width="2.2" stroke-linecap="round"/>`;
    const body =
      `${plungerStick}\n  ${thumbPad}\n  ${barrel}\n  ${piston}\n  ${flange}\n` +
      `  ${gradTicks(75, 78, 168, 9, 3, 12, { dir: -1, sw: 1.0 })}\n` +
      `  ${luerTip}\n  ${needleStem}\n` +
      `  ${glassHighlight(29, 66, 29, 174, 2.5, 0.78)}`;
    const ports = isGas
      ? [{ id: 'outlet', x: 50, y: 196, dx: 0, dy: 1, type: 'luer-male', diameter: 14, edge: [43, 196, 57, 196] }]
      : [{ id: 'outlet', x: 50, y: 220, dx: 0, dy: 1, type: 'probe', diameter: 2.4, segment: [50, 218, 50, 198] }];
    register(id, name, '移液与注射', { width: 100, height: 230, svg: body, ports });
  }

  // 61. Needle (100x230)
  {
    const id = 'needle';
    const body =
      `<path d="M47 48 V207 L53 192 V48 Z" fill="url(#${id}-metal)" stroke="${C.stroke}" stroke-width="1.8" stroke-linejoin="round"/>\n` +
      `  <rect x="30" y="12" width="40" height="36" rx="4" fill="url(#${id}-accent)" stroke="${C.stroke}" stroke-width="2.2"/>\n` +
      `  <rect x="26" y="12" width="48" height="7" rx="2.5" fill="url(#${id}-accent)" stroke="${C.stroke}" stroke-width="2.0"/>\n` +
      `  <line x1="40" y1="22" x2="40" y2="44" stroke="${C.tealLight}" stroke-width="1.4" stroke-opacity="0.7"/>\n` +
      `  <line x1="60" y1="22" x2="60" y2="44" stroke="${C.tealDark}" stroke-width="1.4" stroke-opacity="0.7"/>`;
    register(id, '针头', '移液与注射', {
      width: 100, height: 230, svg: body,
      ports: [{ id: 'tip', x: 50, y: 205, dx: 0, dy: 1, type: 'probe', diameter: 6, segment: [50, 200, 50, 60] }],
    });
  }
}

function registerStoppersAndMisc(register) {
  // 62. Bung (100x75, MUST stay 100% opaque at (50, 25))
  register('bung', '木塞 / 橡胶塞', '塞子与密封', {
    width: 100, height: 75, boreCount: 0,
    svg:
      `<path d="M14 4 H86 L76 65 H24 Z" fill="url(#bung-cork)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  <line x1="21" y1="11" x2="79" y2="11" stroke="#FDE68A" stroke-width="2.2" stroke-linecap="round"/>\n` +
      `  <line x1="28" y1="57" x2="72" y2="57" stroke="${C.corkDark}" stroke-width="1.4" stroke-linecap="round"/>`,
    ports: [{ id: 'plug', x: 50, y: 65, dx: 0, dy: 1, type: 'plug', diameter: 52, depth: 36, edge: [24, 65, 76, 65] }],
  });

  // 63. Glass stopper (100x75)
  register('glass-stopper', '玻璃塞', '塞子与密封', {
    width: 100, height: 75, boreCount: 0,
    svg:
      `${verticalMaleJoint('glass-stopper', 50, 27, 41, 17, 11)}\n` +
      `  <path d="M29 6 Q50 2 71 6 L68 25 H32 Z" fill="url(#glass-stopper-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  <line x1="36" y1="12" x2="64" y2="12" stroke="#FFFFFF" stroke-width="2.2" stroke-opacity="0.78" stroke-linecap="round"/>`,
    ports: [{ id: 'plug', x: 50, y: 68, dx: 0, dy: 1, type: 'plug', diameter: 22, depth: 30, edge: [39, 68, 61, 68] }],
  });

  // 64. Septum seal (100x75)
  register('septum-seal', '隔膜密封盖', '塞子与密封', {
    width: 100, height: 75, boreCount: -1,
    svg:
      `<rect x="13" y="20" width="74" height="36" rx="6" fill="url(#septum-seal-metal)" stroke="${C.stroke}" stroke-width="2.2"/>\n` +
      `  <ellipse cx="50" cy="20" rx="37" ry="9.5" fill="${C.bezel}" stroke="${C.stroke}" stroke-width="2.0"/>\n` +
      `  <ellipse cx="50" cy="20" rx="22" ry="5.5" fill="${C.red}" stroke="${C.stroke}" stroke-width="1.6"/>\n` +
      `  <line x1="22" y1="30" x2="22" y2="50" stroke="${C.inner}" stroke-width="1.2" stroke-opacity="0.5"/>\n` +
      `  <line x1="78" y1="30" x2="78" y2="50" stroke="${C.inner}" stroke-width="1.2" stroke-opacity="0.5"/>`,
    ports: [{ id: 'plug', x: 50, y: 56, dx: 0, dy: 1, type: 'lid', diameter: 74, depth: 36, edge: [13, 56, 87, 56] }],
  });

  // 65. Plastic Keck joint clip (180x200)
  register('plastic-joint-clip', '磨口夹', '支撑与夹持', {
    width: 180, height: 200,
    svg:
      `<path d="M36 62 Q90 12 144 62 L134 142 H112 V82 Q90 74 68 82 V142 H46 Z" fill="url(#plastic-joint-clip-accent)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  <path d="M52 58 Q90 28 128 58" fill="none" stroke="${C.tealLight}" stroke-width="2.2" stroke-opacity="0.7" stroke-linecap="round"/>\n` +
      `  <rect x="34" y="102" width="12" height="24" rx="3" fill="${C.tealDark}" stroke="${C.stroke}" stroke-width="1.8"/>\n` +
      `  <rect x="134" y="102" width="12" height="24" rx="3" fill="${C.tealDark}" stroke="${C.stroke}" stroke-width="1.8"/>`,
    ports: [{ id: 'clip', x: 90, y: 80, dx: 0, dy: -1, type: 'clip', diameter: 24 }],
  });

  // 66. Stirring rod (180x120)
  register('stirring-rod', '玻璃搅拌棒', '实验小工具', {
    width: 180, height: 120,
    svg:
      `<rect x="16" y="52" width="154" height="12" rx="6" fill="url(#stirring-rod-glass-v)" stroke="${C.stroke}" stroke-width="2.1"/>\n` +
      `  ${glassHighlight(24, 55.6, 160, 55.6, 2.2, 0.82)}`,
    ports: [{ id: 'probe', x: 170, y: 58, dx: 1, dy: 0, type: 'probe', diameter: 12, segment: [150, 58, 30, 58] }],
  });

  // 67. Syringe filter (180x120)
  register('syringe-filter', '针式过滤器', '实验小工具', {
    width: 180, height: 120,
    svg:
      `<rect x="36" y="54" width="22" height="12" rx="2" fill="url(#syringe-filter-chassis)" stroke="${C.stroke}" stroke-width="2.0"/>\n` +
      `  <path d="M126 54 H145 V66 H126 Z" fill="url(#syringe-filter-glass)" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>\n` +
      `  <ellipse cx="90" cy="60" rx="38" ry="26" fill="url(#syringe-filter-accent)" stroke="${C.stroke}" stroke-width="2.2"/>\n` +
      `  <ellipse cx="90" cy="60" rx="27" ry="18" fill="#F8FAFC" stroke="${C.inner}" stroke-width="1.4"/>\n` +
      `  ${labelText(90, 62.5, '0.22 µm', 8, C.tealDark)}`,
    ports: [
      { id: 'inlet', x: 36, y: 60, dx: -1, dy: 0, type: 'luer-female', diameter: 12, edge: [36, 54, 36, 66] },
      { id: 'outlet', x: 145, y: 60, dx: 1, dy: 0, type: 'luer-male', diameter: 12, edge: [145, 54, 145, 66] },
    ],
  });

  // 68. SPE cartridge (180x120)
  register('spe-cartridge', '固相萃取柱', '实验小工具', {
    width: 180, height: 120,
    svg:
      `<path d="M128 56 H162 V66 H128 Z" fill="url(#spe-cartridge-glass)" stroke="${C.stroke}" stroke-width="2.0"/>\n` +
      `  <rect x="44" y="33" width="84" height="56" rx="4" fill="url(#spe-cartridge-glass-v)" stroke="${C.stroke}" stroke-width="2.2"/>\n` +
      `  <rect x="42" y="29" width="6" height="64" rx="2" fill="url(#spe-cartridge-chassis)" stroke="${C.stroke}" stroke-width="2.0"/>\n` +
      `  <rect x="64" y="36" width="5" height="50" fill="${C.frostFill}" stroke="${C.inner}" stroke-width="1.2"/>\n` +
      `  <rect x="69" y="36" width="38" height="50" fill="#F8FAFC" stroke="${C.inner}" stroke-width="1.2"/>\n` +
      `  <rect x="107" y="36" width="5" height="50" fill="${C.frostFill}" stroke="${C.inner}" stroke-width="1.2"/>\n` +
      `  ${labelText(88, 63, 'C18', 8.5, C.tealDark)}`,
    ports: [{ id: 'outlet', x: 162, y: 61, dx: 1, dy: 0, type: 'luer-male', diameter: 10, edge: [162, 56, 162, 66] }],
  });

  // 69. Piston chamber (200x170)
  register('piston-chamber', '活塞气室', '设备', {
    width: 200, height: 170,
    svg:
      `<path d="M10 47 H25 V59 H10 Z" fill="url(#piston-chamber-glass-v)" stroke="${C.stroke}" stroke-width="2.0"/>\n` +
      `  <rect x="25" y="36" width="150" height="92" rx="4" fill="url(#piston-chamber-glass-v)" stroke="${C.stroke}" stroke-width="2.2"/>\n` +
      `  <rect x="106" y="78" width="82" height="8" rx="2" fill="url(#piston-chamber-metal-v)" stroke="${C.stroke}" stroke-width="1.8"/>\n` +
      `  <rect x="184" y="64" width="8" height="36" rx="3" fill="url(#piston-chamber-accent)" stroke="${C.stroke}" stroke-width="2.0"/>\n` +
      `  <rect x="88" y="38" width="18" height="88" rx="2" fill="url(#piston-chamber-metal)" stroke="${C.stroke}" stroke-width="2.0"/>\n` +
      `  <rect x="88" y="42" width="4" height="80" fill="${C.rubberMid}"/>\n` +
      `  ${[45, 65, 85, 105, 125, 145].map((tx, i) => `<line x1="${tx}" y1="${i % 2 ? 118 : 114}" x2="${tx}" y2="127" stroke="${C.tick}" stroke-width="1.1"/>`).join('')}\n` +
      `  ${glassHighlight(32, 43, 166, 43, 2.5, 0.78)}`,
    ports: [{ id: 'inlet', x: 10, y: 53, dx: -1, dy: 0, type: 'tube', diameter: 12, edge: [10, 47, 10, 59] }],
  });

  // 70. Desiccator (200x170)
  register('desiccator', '干燥器', '设备', {
    width: 200, height: 170,
    svg:
      `<path d="M22 54 H178 L155 144 H45 Z" fill="url(#desiccator-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  <path d="M48 122 L152 122 L147 140 H53 Z" fill="url(#desiccator-coolant)" stroke="none"/>\n` +
      `  ${[58, 72, 86, 100, 114, 128, 142].map((bx) => `<circle cx="${bx}" cy="133" r="4" fill="#3B82F6" fill-opacity="0.72" stroke="${C.inner}" stroke-width="0.9"/>`).join('')}\n` +
      `  <rect x="34" y="102" width="132" height="6" rx="2" fill="url(#desiccator-porcelain)" stroke="${C.stroke}" stroke-width="1.8"/>\n` +
      `  <path d="M22 52 Q100 -10 178 52 Z" fill="url(#desiccator-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  <rect x="18" y="49" width="164" height="7" rx="3" fill="url(#desiccator-frost)" stroke="${C.stroke}" stroke-width="2.0"/>\n` +
      `  <path d="M84 18 L87 7 H113 L116 18 Q100 22 84 18 Z" fill="url(#desiccator-glass)" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>\n` +
      `  ${glassHighlight('M42 42 Q64 20 90 16', 2.6, 0.78)}`,
    ports: [
      { id: 'base', x: 100, y: 144, dx: 0, dy: 1, type: 'base', diameter: 0 },
      { id: 'surface', x: 100, y: 105, dx: 0, dy: -128, type: 'surface', diameter: 0, segment: [36, 105, 164, 105] },
    ],
  });
}

function registerNewGlassware(register) {
  // 71. U-drying tube (160x200)
  {
    const id = 'u-drying-tube';
    const bL = barb(id, 38, 66, -1, 0, 22, 5.2, 4.4);
    const bR = barb(id, 122, 66, 1, 0, 22, 5.2, 4.4);
    const uOuter = `<path d="M38 30 V132 A42 42 0 0 0 122 132 V30 H98 V132 A18 18 0 0 1 62 132 V30 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const granules = [
      [48, 84], [54, 96], [47, 110], [52, 124], [55, 138], [62, 150], [74, 158], [86, 158],
      [98, 150], [106, 138], [108, 124], [112, 110], [107, 96], [113, 84],
    ].map(([gx, gy]) => `<circle cx="${gx}" cy="${gy}" r="4.3" fill="#F1F5F9" stroke="${C.inner}" stroke-width="1.1"/>`).join('');
    const bungs =
      `<path d="M36 20 H64 L62 34 H38 Z" fill="url(#${id}-rubber)" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>\n` +
      `  <path d="M96 20 H124 L122 34 H98 Z" fill="url(#${id}-rubber)" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>`;
    const body =
      `${bL.svg}\n  ${bR.svg}\n  ${uOuter}\n  ${granules}\n  ${bungs}\n` +
      `  ${glassHighlight('M44 46 V132 A36 36 0 0 0 58 158', 2.2, 0.78)}`;
    register(id, 'U型干燥管', '冷凝与蒸馏', {
      width: 160, height: 200, search: 'u drying tube u tube desiccant',
      svg: body,
      ports: [
        { id: 'inlet', ...bL.port, type: 'tube' },
        { id: 'outlet', ...bR.port, type: 'tube' },
      ],
    });
  }

  // 72. Side-arm U-tube (160x200)
  {
    const id = 'side-arm-u-tube';
    const bL = barb(id, 38, 60, -1, 0, 22, 5.2, 4.4);
    const bR = barb(id, 122, 60, 1, 0, 22, 5.2, 4.4);
    const uOuter = `<path d="M38 20 V132 A42 42 0 0 0 122 132 V20 H98 V132 A18 18 0 0 1 62 132 V20 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const lips = `${rolledLip(id, 50, 20, 13.5, { height: 4.0 })}\n  ${rolledLip(id, 110, 20, 13.5, { height: 4.0 })}`;
    const body =
      `${bL.svg}\n  ${bR.svg}\n  ${uOuter}\n  ${lips}\n` +
      `  ${glassHighlight('M44 36 V132 A36 36 0 0 0 58 158', 2.2, 0.78)}`;
    register(id, '支管U型管', '冷凝与蒸馏', {
      width: 160, height: 200, search: 'side arm u tube u tube',
      svg: body,
      ports: [
        { id: 'mouth-left', x: 50, y: 20, dx: 0, dy: -1, type: 'mouth', diameter: 24, depth: 24, target: [50, 140], edge: [38, 20, 62, 20] },
        { id: 'mouth-right', x: 110, y: 20, dx: 0, dy: -1, type: 'mouth', diameter: 24, depth: 24, target: [110, 140], edge: [98, 20, 122, 20] },
        { id: 'inlet', ...bL.port, type: 'tube' },
        { id: 'outlet', ...bR.port, type: 'tube' },
      ],
    });
  }

  // 73. Retort (200x160)
  {
    const id = 'retort';
    // Delivery arm runs toward (184, 132) with unit axis (0.8944, 0.4472) -> normal perp (-0.4472, 0.8944)
    const ox = 184;
    const oy = 132;
    const ux = 0.8944;
    const uy = 0.4472;
    const tx = -uy;
    const ty = ux;
    const halfOut = 5;
    const beakD =
      `M39 28 V54 C10 68 12 138 56 138 C86 138 100 114 96 86 ` +
      `C116 90 144 114 ${r(ox + tx * halfOut)} ${r(oy + ty * halfOut)} ` +
      `L${r(ox - tx * halfOut)} ${r(oy - ty * halfOut)} ` +
      `C142 102 106 60 66 54 V28 Z`;
    const body =
      `<path d="${beakD}" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  ${verticalFemaleJoint(id, 48, 28, 20, 8.8, 7.2, { rimExtra: 2.2 })}\n` +
      `  ${glassHighlight('M28 112 C26 84 40 70 54 66', 3.0, 0.78)}\n` +
      `  ${glassHighlight('M88 68 C118 82 146 102 174 122', 2.0, 0.72)}`;
    register(id, '曲颈甑', '冷凝与蒸馏', {
      width: 200, height: 160, search: 'retort alembic',
      svg: body,
      ports: [
        { id: 'mouth', x: 48, y: 28, dx: 0, dy: -1, type: 'glass-female', diameter: 22, edge: [37, 28, 59, 28] },
        {
          id: 'outlet',
          x: ox,
          y: oy,
          dx: r(ux),
          dy: r(uy),
          type: 'delivery',
          diameter: 10,
          segment: [ox, oy, r(ox - ux * 40), r(oy - uy * 40)],
          edge: [r(ox - tx * halfOut), r(oy - ty * halfOut), r(ox + tx * halfOut), r(oy + ty * halfOut)],
        },
        { id: 'base', x: 54, y: 138, dx: 0, dy: 1, type: 'base', diameter: 0 },
      ],
    });
  }

  // 74. Glass stopcock plug (100x80)
  {
    const id = 'glass-stopcock';
    const body =
      `${verticalMaleJoint(id, 50, 28, 40, 13, 9)}\n` +
      `  <ellipse cx="50" cy="48" rx="4.2" ry="3.2" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="1.6"/>\n` +
      `  <line x1="38" y1="48" x2="45.8" y2="48" stroke="${C.inner}" stroke-width="1.3" stroke-dasharray="2 2"/>\n` +
      `  <line x1="54.2" y1="48" x2="62" y2="48" stroke="${C.inner}" stroke-width="1.3" stroke-dasharray="2 2"/>\n` +
      `  <path d="M22 14 Q22 8 28 8 H72 Q78 8 78 14 Q78 21 68 22 H57 V28 H43 V22 H32 Q22 21 22 14 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  ${glassHighlight(28, 12.5, 70, 12.5, 2.0, 0.78)}`;
    register(id, '玻璃活塞', '塞子与密封', {
      width: 100, height: 80, boreCount: 0, search: 'glass stopcock valve plug',
      svg: body,
      ports: [{ id: 'plug', x: 50, y: 68, dx: 0, dy: 1, type: 'plug', diameter: 18, depth: 30, edge: [41, 68, 59, 68] }],
    });
  }

  // 75. Simple Kipp generator (160x240)
  {
    const id = 'simple-kipp-generator';
    const stand =
      `<rect x="14" y="216" width="132" height="12" rx="4" fill="url(#${id}-chassis)" stroke="${C.stroke}" stroke-width="2.2"/>\n` +
      `  <rect x="26" y="18" width="7" height="198" rx="2" fill="url(#${id}-metal)" stroke="${C.stroke}" stroke-width="2.0"/>\n` +
      `  <rect x="23" y="88" width="41" height="8" rx="3" fill="url(#${id}-metal-v)" stroke="${C.stroke}" stroke-width="1.8"/>\n` +
      `  <rect x="61" y="85" width="46" height="14" rx="4" fill="none" stroke="${C.stroke}" stroke-width="2.2"/>`;
    const testTube =
      `<path d="M64 68 V182 A20 20 0 0 0 104 182 V68 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  <path d="M66 154 H102 V182 A18 18 0 0 1 66 182 Z" fill="url(#${id}-coolant)" stroke="none"/>\n` +
      `  <line x1="66" y1="154" x2="102" y2="154" stroke="${C.teal}" stroke-width="1.2"/>\n` +
      `  <rect x="66" y="139" width="36" height="4" fill="${C.bezel}" stroke="${C.stroke}" stroke-width="1.0"/>\n` +
      `  ${[72, 82, 92].map((zx) => `<circle cx="${zx}" cy="133" r="3.4" fill="#94A3B8" stroke="${C.stroke}" stroke-width="1.2"/>`).join('')}`;
    const funnel =
      `<path d="M56 16 H94 L80 42 V184 H74 V42 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="1.9" stroke-linejoin="round"/>`;
    const tubeOut =
      `<path d="M92 66 V52 Q92 47 98 47 H144 V57 H100 V66 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>\n` +
      `  ${drawStopcock(id, 120, 52, { w: 18, h: 8, teal: true })}`;
    const stopper =
      `<path d="M62 56 H106 L102 72 H66 Z" fill="url(#${id}-rubber)" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>`;
    const body = `${stand}\n  ${testTube}\n  ${funnel}\n  ${tubeOut}\n  ${stopper}\n  ${glassHighlight(70, 78, 70, 178, 2.2, 0.74)}`;
    register(id, '简易启普发生器', '实验装置', {
      width: 160, height: 240, search: 'simple kipp generator gas',
      svg: body,
      ports: [
        { id: 'outlet', x: 144, y: 52, dx: 1, dy: 0, type: 'tube', diameter: 10, segment: [138, 52, 118, 52], edge: [144, 47, 144, 57] },
        { id: 'base', x: 80, y: 228, dx: 0, dy: 1, type: 'base', diameter: 0 },
      ],
    });
  }

  // 76. Solid-liquid heating gas setup (200x240)
  {
    const id = 'solid-liquid-gas-setup';
    const stand =
      `<rect x="16" y="216" width="168" height="12" rx="4" fill="url(#${id}-chassis)" stroke="${C.stroke}" stroke-width="2.2"/>\n` +
      `  <rect x="28" y="14" width="7" height="202" rx="2" fill="url(#${id}-metal)" stroke="${C.stroke}" stroke-width="2.0"/>\n` +
      `  <line x1="35" y1="86" x2="80" y2="86" stroke="${C.inner}" stroke-width="4.5" stroke-linecap="round"/>\n` +
      `  <line x1="35" y1="158" x2="128" y2="158" stroke="${C.inner}" stroke-width="4.0" stroke-linecap="round"/>\n` +
      `  <line x1="60" y1="154" x2="124" y2="154" stroke="${C.muted}" stroke-width="2.4" stroke-dasharray="3 2"/>`;
    const lamp =
      `<path d="M68 214 L74 190 Q92 186 110 190 L116 214 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>\n` +
      `  <rect x="86" y="180" width="12" height="9" rx="2" fill="url(#${id}-metal)" stroke="${C.stroke}" stroke-width="1.6"/>\n` +
      `  <path d="M92 164 C99 171 97 180 92 180 C87 180 85 171 92 164 Z" fill="${C.flameTip}" stroke="${C.amberDark}" stroke-width="1.2"/>\n` +
      `  <path d="M92 170 C95 174 94 179 92 179 C90 179 89 174 92 170 Z" fill="${C.flameBlue}"/>`;
    const rbf =
      `<path d="M80 74 V96 C54 108 58 152 92 152 C126 152 130 108 104 96 V74 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  ${glassHighlight('M68 128 C68 112 76 104 84 100', 2.4, 0.78)}`;
    const funnel =
      `<path d="M62 12 H94 L82 36 V78 H74 V36 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="1.9" stroke-linejoin="round"/>\n` +
      `  ${drawStopcock(id, 78, 48, { w: 16, h: 7, teal: true })}`;
    const delivery =
      `<path d="M98 76 V38 Q98 31 106 31 H180 V41 H106 V76 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>`;
    const bung =
      `<path d="M77 68 H107 L104 81 H80 Z" fill="url(#${id}-rubber)" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>`;
    const body = `${stand}\n  ${lamp}\n  ${rbf}\n  ${funnel}\n  ${delivery}\n  ${bung}`;
    register(id, '固液加热造气装置', '实验装置', {
      width: 200, height: 240, search: 'solid liquid heating gas setup',
      svg: body,
      ports: [
        { id: 'outlet', x: 180, y: 36, dx: 1, dy: 0, type: 'tube', diameter: 10, segment: [172, 36, 140, 36], edge: [180, 31, 180, 41] },
        { id: 'base', x: 100, y: 228, dx: 0, dy: 1, type: 'base', diameter: 0 },
      ],
    });
  }

  // 77. Electrolysis cell (180x200)
  {
    const id = 'electrolysis-cell';
    const bL = barb(id, 44, 68, -1, 0, 26, 5.2, 4.4);
    const bR = barb(id, 136, 68, 1, 0, 26, 5.2, 4.4);
    const baseStand =
      `<rect x="28" y="168" width="124" height="12" rx="4" fill="url(#${id}-chassis)" stroke="${C.stroke}" stroke-width="2.2"/>`;
    const uBody =
      `<path d="M44 44 V128 A46 46 0 0 0 136 128 V44 H112 V128 A22 22 0 0 1 68 128 V44 Z" fill="url(#${id}-glass)" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const liquid =
      `<path d="M46 80 V128 A44 44 0 0 0 134 128 V80 H114 V128 A24 24 0 0 1 66 128 V80 Z" fill="url(#${id}-coolant)" stroke="none"/>\n` +
      `  <line x1="46" y1="80" x2="66" y2="80" stroke="${C.teal}" stroke-width="1.3"/>\n` +
      `  <line x1="114" y1="80" x2="134" y2="80" stroke="${C.teal}" stroke-width="1.3"/>`;
    const electrodes =
      `<rect x="53" y="28" width="6" height="94" rx="1" fill="${C.bezel}" stroke="${C.stroke}" stroke-width="1.6"/>\n` +
      `  <rect x="121" y="28" width="6" height="94" rx="1" fill="${C.bezel}" stroke="${C.stroke}" stroke-width="1.6"/>`;
    const bungs =
      `<path d="M42 36 H70 L68 48 H44 Z" fill="url(#${id}-rubber)" stroke="${C.stroke}" stroke-width="2.0"/>\n` +
      `  <path d="M110 36 H138 L136 48 H112 Z" fill="url(#${id}-rubber)" stroke="${C.stroke}" stroke-width="2.0"/>`;
    const posts =
      `${bindingPost(56, 22, C.red, '+', -10, 6.2)}\n` +
      `  ${bindingPost(124, 22, C.bezelDark, '-', -10, 6.2)}`;
    const bubbles =
      `<circle cx="52" cy="96" r="2.2" fill="#FFFFFF" stroke="${C.tealDark}" stroke-width="0.9"/>\n` +
      `  <circle cx="59" cy="86" r="2.5" fill="#FFFFFF" stroke="${C.tealDark}" stroke-width="0.9"/>\n` +
      `  <circle cx="120" cy="94" r="2.2" fill="#FFFFFF" stroke="${C.tealDark}" stroke-width="0.9"/>\n` +
      `  <circle cx="127" cy="85" r="2.6" fill="#FFFFFF" stroke="${C.tealDark}" stroke-width="0.9"/>`;
    const body =
      `${bL.svg}\n  ${bR.svg}\n  ${baseStand}\n  ${uBody}\n  ${liquid}\n  ${electrodes}\n  ${bubbles}\n  ${bungs}\n  ${posts}\n` +
      `  ${glassHighlight('M49 54 V128 A40 40 0 0 0 64 156', 2.2, 0.78)}`;
    register(id, '电解装置', '实验装置', {
      width: 180, height: 200, search: 'electrolysis cell hofmann',
      svg: body,
      ports: [
        { id: 'positive', x: 56, y: 22, dx: 0, dy: -1, type: 'wire', diameter: 0 },
        { id: 'negative', x: 124, y: 22, dx: 0, dy: -1, type: 'wire', diameter: 0 },
        { id: 'outlet-left', ...bL.port, type: 'tube' },
        { id: 'outlet-right', ...bR.port, type: 'tube' },
        { id: 'base', x: 90, y: 180, dx: 0, dy: 1, type: 'base', diameter: 0 },
      ],
    });
  }
}

module.exports = function registerGlassware(register) {
  registerContainers(register);
  registerTubing(register);
  registerCondensersAndDistillation(register);
  registerFunnels(register);
  registerMeasuring(register);
  registerTransferAndSyringes(register);
  registerStoppersAndMisc(register);
  registerNewGlassware(register);
};
