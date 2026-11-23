// Classic Flat Scientific Line-Art Glassware Module for Chem Studio (#294454 house style).
// Zero <linearGradient>/<radialGradient>, zero url(#...), zero cross-hatched XXX joints,
// zero white specular bars, and zero tacky label badges.
// Owns 77 studio:* items (70 upgraded + 7 new glassware items) + 3 RBF neck variants = 80 plates.
'use strict';

const S = require('./svg-style.cjs');
const {
  C, r, rolledLip,
  verticalFemaleJoint, verticalMaleJoint, angledMaleJoint,
  gradTicks, barb, oliveBarb,
  drawStopcock, labelText, bindingPost,
} = S;

function tubeWall(d, strokeW, innerFill = '#FFFFFF', cap = 'butt') {
  return (
    `<path d="${d}" fill="none" stroke="${C.stroke}" stroke-width="${r(strokeW)}" stroke-linecap="${cap}" stroke-linejoin="round"/>\n` +
    `  <path d="${d}" fill="none" stroke="${innerFill}" stroke-width="${r(Math.max(1.5, strokeW - 4.6))}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
  );
}

function renderBeakerOrTank(id) {
  const glassStroke = `stroke="${C.stroke}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"`;
  if (id === 'tank') {
    return (
      `<path d="M18 88 Q48 84 77 88 T135 88 V179 H18 Z" fill="${C.coolantLight}" stroke="none"/>\n` +
      `  <path d="M18 88 Q48 84 77 88 T135 88" fill="none" stroke="${C.teal}" stroke-width="1.5" stroke-linecap="round"/>\n` +
      `  <path d="M14 34 H139 L137 40 V177 Q137 181 133 181 H20 Q16 181 16 177 V40 Z" fill="none" ${glassStroke}/>\n` +
      `  <line x1="16" y1="39" x2="137" y2="39" stroke="${C.inner}" stroke-width="1.2"/>`
    );
  }
  if (id === 'tlc-chamber') {
    return (
      `<path d="M18 144 H135 V177 Q135 181 131 181 H22 Q18 181 18 177 Z" fill="${C.coolantLight}" stroke="none"/>\n` +
      `  <line x1="18" y1="144" x2="135" y2="144" stroke="${C.teal}" stroke-width="1.5"/>\n` +
      `  <polygon points="50,62 96,58 104,168 58,170" fill="#F8FAF9" stroke="${C.inner}" stroke-width="1.6" stroke-linejoin="round"/>\n` +
      `  <line x1="57" y1="152" x2="102" y2="150" stroke="${C.muted}" stroke-width="1.1" stroke-dasharray="3 2.5"/>\n` +
      `  <line x1="53" y1="84" x2="98" y2="81" stroke="${C.teal}" stroke-width="1.1" stroke-dasharray="3 2.5"/>\n` +
      `  <circle cx="68" cy="126" r="3.6" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.2"/>\n` +
      `  <circle cx="84" cy="98" r="3.8" fill="${C.amberMid}" stroke="${C.stroke}" stroke-width="1.2"/>\n` +
      `  <circle cx="67" cy="151" r="2.2" fill="${C.muted}" stroke="none"/>\n` +
      `  <circle cx="87" cy="150" r="2.2" fill="${C.muted}" stroke="none"/>\n` +
      `  <path d="M14 34 H139 L137 40 V177 Q137 181 133 181 H20 Q16 181 16 177 V40 Z" fill="none" ${glassStroke}/>`
    );
  }
  if (id === 'calorimetry-cup') {
    return (
      `<rect x="19" y="44" width="126" height="137" rx="6" fill="${C.chassisMid}" ${glassStroke}/>\n` +
      `  <rect x="33" y="48" width="98" height="123" rx="4" fill="#F8FAF9" stroke="${C.inner}" stroke-width="1.6"/>\n` +
      `  <rect x="29.5" y="34" width="105" height="10" rx="2.5" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.2"/>`
    );
  }
  if (id === 'displacement-beaker' || id === 'eureka') {
    const isEureka = id === 'eureka';
    const waterDash = !isEureka
      ? `<path d="M28 66 H137" fill="none" stroke="${C.teal}" stroke-width="1.4" stroke-dasharray="4 3"/>`
      : '';
    // Open bore angled overflow spout (~36 deg below horizontal: (137,61)->(158,75), (152,83)->(137,72)) with NO vertical wall across spout opening
    const outerGlass = isEureka
      ? `<path d="M16 34 H137 V61 L158 75 L152 83 L137 72 V167 Q137 179 125 179 H40 Q27 179 27 167 V42 Z" fill="${C.chassisTop}" ${glassStroke}/>`
      : `<path d="M16 34 H137 V61 L158 75 M152 83 L137 72 V167 Q137 179 125 179 H40 Q27 179 27 167 V42 L16 34" fill="none" ${glassStroke}/>`;
    const rimCap = `<path d="M16 34 H139" fill="none" ${glassStroke}/>`;
    const ticks = gradTicks(126, 74, 154, 6, 2, 11, { dir: -1 });
    return `${outerGlass}\n  ${rimCap}\n  ${waterDash}\n  ${ticks}`;
  }
  // Standard beaker (open lip left spout -> clean vertical wall -> subtle scale ticks)
  return (
    `<path d="M16 34 L27 42 V167 Q27 179 40 179 H125 Q137 179 137 167 V34" fill="none" ${glassStroke}/>\n` +
    `  <path d="M16 34 H139" fill="none" ${glassStroke}/>\n` +
    `  ${gradTicks(126, 66, 156, 7, 2, 12, { dir: -1 })}`
  );
}

function registerContainers(register) {
  const defs = [
    ['beaker', '烧杯', 'beaker', { contentsSeat: true }],
    ['displacement-beaker', '溢流杯', 'displacement beaker', { angledSpout: true }],
    ['eureka', '排水罐', 'eureka', { angledSpout: true }],
    ['tank', '水槽', 'tank', {}],
    ['tlc-chamber', '展开缸', 'tlc chamber', {}],
  ];
  for (const [id, name, search, cfg] of defs) {
    const ports = [
      { id: 'mouth', x: 76.5, y: 34, dx: 0, dy: -1, type: 'mouth', diameter: 121, depth: 25, target: [82, 150], edge: [16, 34, 137, 34] },
    ];
    if (cfg.angledSpout) {
      ports.push({
        id: 'outlet',
        x: 155,
        y: 79,
        dx: 0.814,
        dy: 0.581,
        type: 'tube',
        diameter: 10,
        edge: [158, 75, 152, 83],
      });
    }
    if (cfg.contentsSeat) {
      ports.push({ id: 'contents-seat', x: 82, y: 164, dx: 0, dy: -1, type: 'contents-seat', diameter: 0 });
    }
    ports.push({ id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 });
    register(id, name, '容器', { width: 160, height: 200, search, svg: renderBeakerOrTank(id), ports });
  }

  register('calorimetry-cup', '量热杯', '容器', {
    width: 160, height: 200, search: 'calorimetry cup',
    svg: renderBeakerOrTank('calorimetry-cup'),
    ports: [
      { id: 'mouth', x: 82, y: 34, dx: 0, dy: -1, type: 'mouth', diameter: 105, depth: 25, target: [82, 150], edge: [29.5, 34, 134.5, 34] },
      { id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });

  register('watch-glass', '表面皿', '容器', {
    width: 160, height: 70, search: 'watch glass',
    svg:
      `<path d="M10 19 Q80 78 150 19 Q80 33 10 19 Z" fill="none" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`,
    ports: [{ id: 'base', x: 80, y: 52, dx: 0, dy: 1, type: 'base', diameter: 0 }],
  });

  register('stemmed-glass', '高脚杯', '容器', {
    width: 160, height: 200, search: 'stemmed glass',
    svg:
      `<path d="M24 18 H136 C135 96 105 112 80 112 C55 112 25 96 24 18 Z" fill="none" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>\n` +
      `  <ellipse cx="80" cy="18" rx="56" ry="5" fill="none" stroke="${C.inner}" stroke-width="1.4"/>\n` +
      `  <line x1="80" y1="112" x2="80" y2="177" stroke="${C.stroke}" stroke-width="2.6" stroke-linecap="round"/>\n` +
      `  <ellipse cx="80" cy="182" rx="43" ry="6" fill="none" stroke="${C.stroke}" stroke-width="2.3"/>`,
    ports: [{ id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 }],
  });

  // 9-10. Conical flasks (160x200) — suction flask gets open-bore horizontal barbed nozzle
  for (const [id, name, hasArm] of [
    ['conical-flask', '锥形瓶', false],
    ['conical-flask-with-side-arm', '侧支锥形瓶', true],
  ]) {
    const ports = [
      { id: 'mouth', x: 80, y: 12, dx: 0, dy: -1, type: 'mouth', diameter: 36, depth: 24, target: [80, 146], edge: [62, 12, 98, 12] },
    ];
    let body = '';
    if (hasArm) {
      const horizBarb = oliveBarb(id, 98, 40, 1, 44, 5.0, 4.5);
      // Open bore: split right neck wall at y=35 and y=45 so barb flows out cleanly without vertical line across opening
      const openBarbPath =
        `M58 12 Q62 12 62 18 V55 L20 168 Q16 180 30 180 H130 Q144 180 140 168 L98 55 V45 ` +
        `L125.3 44.4 L127.3 46.3 L142 44.5 M142 35.5 L127.3 33.7 L125.3 35.6 L98 35 V18 Q98 12 102 12`;
      body =
        `<path d="${openBarbPath}" fill="none" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>\n` +
        `  ${gradTicks(124, 114, 158, 4, 2, 12, { dir: -1 })}`;
      ports.push({ ...horizBarb.port, id: 'outlet', type: 'tube' });
    } else {
      ports.push({ id: 'contents-seat', x: 80, y: 165, dx: 0, dy: -1, type: 'contents-seat', diameter: 0 });
      body =
        `<path d="M58 12 Q62 12 62 18 V55 L20 168 Q16 180 30 180 H130 Q144 180 140 168 L98 55 V18 Q98 12 102 12" fill="none" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>\n` +
        `  ${gradTicks(124, 114, 158, 4, 2, 12, { dir: -1 })}`;
    }
    ports.push({ id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 });
    register(id, name, '容器', { width: 160, height: 200, svg: body, ports });
  }

  // 11-12. Test tubes (70x200) — open-bore straight horizontal sidearm
  for (const [id, name, hasArm] of [
    ['test-tube', '试管', false],
    ['test-tube-with-side-arm', '侧支试管', true],
  ]) {
    const ports = [
      { id: 'mouth', x: 35, y: 12, dx: 0, dy: -1, type: 'mouth', diameter: 30, depth: 28, target: [35, 135], edge: [20, 12, 50, 12] },
    ];
    let body = '';
    if (hasArm) {
      ports.push({ id: 'outlet', x: 67, y: 46, dx: 1, dy: 0, type: 'tube', diameter: 6, edge: [67, 43, 67, 49] });
      body =
        `<path d="M17 12 Q20 12 20 18 V160 A15 15 0 0 0 50 160 V49 H67 M67 43 H50 V18 Q50 12 53 12" fill="none" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
    } else {
      body =
        `<path d="M17 12 Q20 12 20 18 V160 A15 15 0 0 0 50 160 V18 Q50 12 53 12" fill="none" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
    }
    register(id, name, '容器', { width: 70, height: 200, svg: body, ports });
  }

  // 13. Round-bottom flask (1, 2, 3, 4 necks): true spherical bulb + radially inward-angling outer necks
  const rbf1Svg =
    `<path d="M58 12 Q62 12 64 19 V65 Q64 72 56 76 A55 55 0 1 0 104 76 Q96 72 96 65 V19 Q98 12 102 12" fill="none" stroke="${C.stroke}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;

  function buildMultiNeckRbf(n) {
    // True circular sphere centered at (80, 131), R = 52 (top dome y=79, bottom y=183, spans x=28..132)
    // All necks start at exact manifest mouth coords (y=18) and angle radially toward sphere center (80, 131)
    const cxList = Array.from({ length: n }, (_, i) => 80 + (i - (n - 1) / 2) * 30);
    const cy = 131;
    const R = 52;
    const hwTop = 6.2;

    const neckGeom = cxList.map((cx) => {
      const dxTop = cx - 80;
      // Radial inward convergence so outer necks cinch tightly into spherical shoulder (waist narrower than 104px bulb)
      const dxBase = dxTop * 0.68;
      const xBaseCenter = 80 + dxBase;
      const xLBase = xBaseCenter - hwTop;
      const xRBase = xBaseCenter + hwTop;
      const yL = cy - Math.sqrt(Math.max(400, R * R - (xLBase - 80) * (xLBase - 80)));
      const yR = cy - Math.sqrt(Math.max(400, R * R - (xRBase - 80) * (xRBase - 80)));
      return { cx, xLTop: cx - hwTop, xRTop: cx + hwTop, xLBase, xRBase, yL, yR };
    });

    const first = neckGeom[0];
    const last = neckGeom[n - 1];
    const outerPath =
      `<path d="M${r(first.cx - 9.5)} 18 Q${r(first.cx - 6.8)} 18 ${r(first.xLTop)} 23 ` +
      `L${r(first.xLBase)} ${r(first.yL)} ` +
      `A${R} ${R} 0 1 0 ${r(last.xRBase)} ${r(last.yR)} ` +
      `L${r(last.xRTop)} 23 Q${r(last.cx + 6.8)} 18 ${r(last.cx + 9.5)} 18" ` +
      `fill="none" stroke="${C.stroke}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;

    let bridges = '';
    for (let i = 0; i < n - 1; i++) {
      const leftN = neckGeom[i];
      const rightN = neckGeom[i + 1];
      const xm = (leftN.xRBase + rightN.xLBase) / 2;
      const yDome = cy - Math.sqrt(Math.max(400, R * R - (xm - 80) * (xm - 80)));
      bridges +=
        `\n  <path d="M${r(leftN.cx + 9.5)} 18 Q${r(leftN.cx + 6.8)} 18 ${r(leftN.xRTop)} 23 ` +
        `L${r(leftN.xRBase)} ${r(leftN.yR)} Q${r(xm)} ${r(yDome - 1)} ${r(rightN.xLBase)} ${r(rightN.yL)} ` +
        `L${r(rightN.xLTop)} 23 Q${r(rightN.cx - 6.8)} 18 ${r(rightN.cx - 9.5)} 18" ` +
        `fill="none" stroke="${C.stroke}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
    }

    const vPorts = cxList.map((cx, i) => ({
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
    }));
    vPorts.push({ id: 'contents-seat', x: 80, y: 168, dx: 0, dy: -1, type: 'contents-seat', diameter: 0 });
    return { neckCount: n, width: 160, height: 200, svg: `${outerPath}${bridges}`, ports: vPorts };
  }

  register('round-bottom-flask', '圆底烧瓶', '容器', {
    width: 160, height: 200, neckCount: 1,
    svg: rbf1Svg,
    ports: [
      { id: 'mouth', x: 80, y: 12, dx: 0, dy: -1, type: 'glass-female', diameter: 38, depth: 25, target: [80, 140], edge: [61, 12, 99, 12] },
      { id: 'contents-seat', x: 80, y: 166, dx: 0, dy: -1, type: 'contents-seat', diameter: 0 },
      { id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
    variants: [2, 3, 4].map(buildMultiNeckRbf),
  });

  // 14. Boiling flask (flat-bottom true circular dome)
  register('boiling-flask', '平底烧瓶', '容器', {
    width: 160, height: 200, neckCount: 1,
    svg:
      `<path d="M59 12 Q63 12 64 19 V65 Q64 72 56 76 C18 96 22 158 50 180 H110 C138 158 142 96 104 76 Q96 72 96 65 V19 Q97 12 101 12" fill="none" stroke="${C.stroke}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
    ports: [
      { id: 'mouth', x: 80, y: 12, dx: 0, dy: -1, type: 'glass-female', diameter: 38, depth: 25, target: [80, 140], edge: [61, 12, 99, 12] },
      { id: 'contents-seat', x: 80, y: 166, dx: 0, dy: -1, type: 'contents-seat', diameter: 0 },
      { id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });

  // 15. Distillation flask (true sphere + tall flared open neck + ~18° downward-sloping open-bore side arm)
  {
    const id = 'distillation-flask';
    const ox = 146;
    const oy = 62;
    const ux = 0.952;
    const uy = 0.305;
    // Perpendicular to (ux, uy) pointing DOWNWARD is (-uy, ux); UPWARD is (uy, -ux)
    const bx = ox - uy * 5;
    const by = oy + ux * 5; // bottom tip edge (144.475, 66.76)
    const tx = ox + uy * 5;
    const ty = oy - ux * 5; // top tip edge (147.525, 57.24)
    const mainAndBotArm =
      `M59 12 Q63 12 64 19 V65 Q64 72 56 76 A55 55 0 1 0 104 76 Q96 72 96 65 V52 L${r(bx)} ${r(by)}`;
    const topRightAndTopArm =
      `M101 12 Q97 12 96 19 V42 L${r(tx)} ${r(ty)}`;
    const svg =
      `<path d="${mainAndBotArm}" fill="none" stroke="${C.stroke}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <path d="${topRightAndTopArm}" fill="none" stroke="${C.stroke}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
    register(id, '蒸馏烧瓶', '容器', {
      width: 160, height: 200, neckCount: 1, svg,
      ports: [
        { id: 'mouth', x: 80, y: 12, dx: 0, dy: -1, type: 'glass-female', diameter: 38, depth: 25, target: [80, 140], edge: [61, 12, 99, 12] },
        {
          id: 'outlet',
          x: ox,
          y: oy,
          dx: ux,
          dy: uy,
          type: 'tube',
          diameter: 10,
          segment: [ox, oy, r(ox - ux * 36), r(oy - uy * 36)],
          edge: [r(tx), r(ty), r(bx), r(by)],
        },
        { id: 'contents-seat', x: 80, y: 166, dx: 0, dy: -1, type: 'contents-seat', diameter: 0 },
        { id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 },
      ],
    });
  }

  // 16. Schlenk flask (open-bore sidearm into PTFE stopcock, zero vertical line across junction)
  register('schlenk-flask', '施伦克瓶', '容器', {
    width: 160, height: 200, neckCount: 1,
    svg:
      `<path d="M59 12 Q63 12 64 19 V68 C24 88 26 166 80 181 C134 166 136 88 96 68 V59 H126 V83 M138 83 V58 Q138 47 127 47 H96 V19 Q97 12 101 12" fill="none" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>\n` +
      `  ${drawStopcock('schlenk-flask', 132, 68, { w: 18, h: 8, teal: true })}`,
    ports: [
      { id: 'mouth', x: 80, y: 12, dx: 0, dy: -1, type: 'glass-female', diameter: 38, depth: 25, target: [80, 140], edge: [61, 12, 99, 12] },
      { id: 'outlet', x: 132, y: 83, dx: 0, dy: 1, type: 'tube', diameter: 12, edge: [126, 83, 138, 83] },
      { id: 'contents-seat', x: 80, y: 166, dx: 0, dy: -1, type: 'contents-seat', diameter: 0 },
      { id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });

  // 17. Volumetric flask (open flared neck, calibration meniscus ring, pear base, NO badge text)
  register('volumetric-flask', '容量瓶', '容器', {
    width: 160, height: 200, neckCount: 1,
    svg:
      `<path d="M67 12 Q70 12 70 18 V102 C20 134 26 176 54 183 H106 C134 176 140 134 90 102 V18 Q90 12 93 12" fill="none" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>\n` +
      `  <line x1="69" y1="62" x2="91" y2="62" stroke="${C.teal}" stroke-width="1.8" stroke-linecap="round"/>`,
    ports: [
      { id: 'mouth', x: 80, y: 12, dx: 0, dy: -1, type: 'glass-female', diameter: 22, depth: 25, target: [80, 140], edge: [69, 12, 91, 12] },
      { id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });

  // 18. Pycnometer (open flared neck + capillary side vent tube cue, NO hatch, NO badge)
  register('pycnometer', '比重瓶', '容器', {
    width: 160, height: 200, neckCount: 1,
    svg:
      `<path d="M59 12 Q63 12 64 19 V56 C24 88 26 170 52 181 H108 C134 170 136 88 96 56 V19 Q97 12 101 12" fill="none" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>\n` +
      `  <line x1="80" y1="30" x2="80" y2="110" stroke="${C.muted}" stroke-width="1.3" stroke-dasharray="4 3"/>`,
    ports: [
      { id: 'mouth', x: 80, y: 12, dx: 0, dy: -1, type: 'glass-female', diameter: 38, depth: 25, target: [80, 140], edge: [61, 12, 99, 12] },
      { id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });

  // 19. Gas jar (flat open wide ground flange cylinder, ZERO hatch)
  register('gas-jar', '集气瓶', '容器', {
    width: 160, height: 200,
    svg:
      `<path d="M34 14 H126 M38 19 V171 Q38 181 48 181 H112 Q122 181 122 171 V19" fill="none" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>\n` +
      `  <rect x="34" y="14" width="92" height="5" rx="2" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.2"/>\n` +
      `  <line x1="40" y1="173" x2="120" y2="173" stroke="${C.muted}" stroke-width="1.2"/>`,
    ports: [
      { id: 'mouth', x: 80, y: 14, dx: 0, dy: -1, type: 'mouth', diameter: 84, depth: 24, target: [80, 144], edge: [38, 14, 122, 14] },
      { id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });

  // 20-23. Reagent bottle, Amber bottle, Thermos, Wash-bottle (zero badge words)
  for (const [id, name, mode] of [
    ['reagent-bottle', '试剂瓶', 'clear'],
    ['bottle', '玻璃瓶', 'amber'],
    ['thermos', '真空保温瓶', 'dewar'],
    ['wash-bottle', '洗瓶', 'wash'],
  ]) {
    const isAmber = mode === 'amber';
    const isDewar = mode === 'dewar';
    const isWash = mode === 'wash';
    const fill = isAmber ? C.amberLight : isDewar ? C.chassisTop : 'none';
    const bottleOutline =
      `<path d="M56 14 H104 M60 19 V45 Q27 56 27 80 V171 Q27 183 40 183 H120 Q133 183 133 171 V80 Q133 56 100 45 V19" fill="${fill}" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
    let detail = '';
    if (mode === 'clear' || isAmber) {
      detail =
        `${rolledLip(id, 80, 14, 22, { height: 4.5, amber: isAmber })}\n` +
        `  <rect x="46" y="92" width="68" height="44" rx="2" fill="#FFFFFF" stroke="${C.inner}" stroke-width="1.3"/>\n` +
        `  <line x1="56" y1="108" x2="104" y2="108" stroke="${C.muted}" stroke-width="1.2"/>\n` +
        `  <line x1="56" y1="120" x2="96" y2="120" stroke="${C.muted}" stroke-width="1.2"/>`;
    } else if (isDewar) {
      detail =
        `<path d="M40 70 V165 Q40 172 48 172 H112 Q120 172 120 165 V70" fill="${C.chassisMid}" stroke="${C.inner}" stroke-width="1.6"/>\n` +
        `  <rect x="27" y="90" width="106" height="12" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.6"/>\n` +
        `  ${rolledLip(id, 80, 14, 22, { height: 5.0 })}`;
    } else {
      detail =
        `<path d="M80 168 V10 Q80 6 86 6 H124 L145.5 26.5" fill="none" stroke="${C.stroke}" stroke-width="7.2" stroke-linecap="round" stroke-linejoin="round"/>\n` +
        `  <path d="M80 168 V10 Q80 6 86 6 H124 L145.5 26.5" fill="none" stroke="#FFFFFF" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>\n` +
        `  <polygon points="142,24.5 152.5,26.5 145.5,33.5 140,29" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>\n` +
        `  <line x1="145.5" y1="33.5" x2="152.5" y2="26.5" stroke="${C.stroke}" stroke-width="2.2" stroke-linecap="round"/>\n` +
        `  ${bottleOutline}\n` +
        `  <line x1="80" y1="45" x2="80" y2="168" stroke="${C.inner}" stroke-width="2.4" stroke-linecap="round"/>\n` +
        `  <rect x="57" y="14" width="46" height="14" rx="2.5" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.2"/>`;
    }
    const svg = isWash ? detail : `${bottleOutline}\n  ${detail}`;
    const ports = [
      { id: 'mouth', x: 80, y: 14, dx: 0, dy: -1, type: 'mouth', diameter: 40, depth: 24, target: [80, 144], edge: [60, 14, 100, 14] },
    ];
    if (isWash) {
      ports.push({ id: 'outlet', x: 149, y: 30, dx: 0.7, dy: 0.7, type: 'tube', diameter: 10, edge: [145.5, 33.5, 152.5, 26.5] });
    }
    ports.push({ id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 });
    register(id, name, '容器', { width: 160, height: 200, svg, ports });
  }
}

function registerTubing(register) {
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

  for (const [id, name, w, cap] of [
    ['tube', '直玻璃管', 20, false],
    ['capillary-tube', '毛细管', 11, true],
  ]) {
    const hw = w / 2;
    const svg =
      `<rect x="${70 - hw}" y="10" width="${w}" height="155" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.2"/>\n` +
      (cap ? `  <line x1="70" y1="11" x2="70" y2="164" stroke="${C.inner}" stroke-width="2.0"/>\n` : '') +
      `  <line x1="${70 - hw}" y1="10" x2="${70 + hw}" y2="10" stroke="${C.stroke}" stroke-width="2.2" stroke-linecap="round"/>\n` +
      `  <line x1="${70 - hw}" y1="165" x2="${70 + hw}" y2="165" stroke="${C.stroke}" stroke-width="2.2" stroke-linecap="round"/>`;
    register(id, name, '导管', {
      width: 140, height: 180, svg,
      ports: endsToPorts([[70, 10, 0, -1], [70, 165, 0, 1]], w, 'tube'),
    });
  }

  const curves = [
    ['tube-bend', '90° 弯管', 'M18 155 H88 Q120 155 120 123 V12', [[18, 155, -1, 0], [120, 12, 0, -1]], 20],
    ['s-bent-tube', 'S 形管', 'M100 12 V45 C100 86 40 84 40 127 V166', [[100, 12, 0, -1], [40, 166, 0, 1]], 20],
    ['u-bent-tube', 'U 形管', 'M35 12 V130 A35 35 0 0 0 105 130 V12', [[35, 12, 0, -1], [105, 12, 0, -1]], 20],
  ];
  for (const [id, name, d, ends, w] of curves) {
    const ports = endsToPorts(ends, w, 'tube');
    if (id === 'tube-bend') {
      ports[0].segment = [18, 155, 86, 155];
      ports[1].segment = [120, 12, 120, 118];
    }
    const rims = ends.map(([x, y, dx, dy]) => {
      const tx = -dy;
      const ty = dx;
      const hw = w / 2;
      return `<line x1="${r(x - tx * hw)}" y1="${r(y - ty * hw)}" x2="${r(x + tx * hw)}" y2="${r(y + ty * hw)}" stroke="${C.stroke}" stroke-width="2.2" stroke-linecap="round"/>`;
    }).join('\n  ');
    register(id, name, '导管', {
      width: 140, height: 180,
      svg: `${tubeWall(d, w, '#FFFFFF')}\n  ${rims}`,
      ports,
    });
  }

  // Salt bridge (agar-KCl translucent teal gel inside open U-tube, clean pores)
  {
    const id = 'salt-bridge';
    const d = 'M35 12 V130 A35 35 0 0 0 105 130 V12';
    const ends = [[35, 12, 0, -1], [105, 12, 0, -1]];
    const svg =
      `${tubeWall(d, 20, C.coolantLight)}\n` +
      `  <rect x="28" y="13" width="14" height="9" rx="1.5" fill="#FFFFFF" stroke="${C.inner}" stroke-width="1.3"/>\n` +
      `  <rect x="98" y="13" width="14" height="9" rx="1.5" fill="#FFFFFF" stroke="${C.inner}" stroke-width="1.3"/>\n` +
      `  <line x1="25" y1="12" x2="45" y2="12" stroke="${C.stroke}" stroke-width="2.2" stroke-linecap="round"/>\n` +
      `  <line x1="95" y1="12" x2="115" y2="12" stroke="${C.stroke}" stroke-width="2.2" stroke-linecap="round"/>`;
    register(id, '盐桥', '导管', { width: 140, height: 180, svg, ports: endsToPorts(ends, 20, 'tube') });
  }

  // Rubber hose (flat slate)
  {
    const id = 'rubber-tube';
    const d = 'M16 32 C118 4 20 145 122 152';
    const ends = [[16, 32, -1, 0], [122, 152, 1, 0]];
    const svg =
      `${tubeWall(d, 20, C.rubberMid)}\n` +
      `  <rect x="14" y="21" width="7" height="22" rx="2" fill="${C.rubberTop}" stroke="${C.stroke}" stroke-width="2.0"/>\n` +
      `  <rect x="117" y="141" width="7" height="22" rx="2" fill="${C.rubberTop}" stroke="${C.stroke}" stroke-width="2.0"/>`;
    register(id, '橡胶软管', '导管', { width: 140, height: 180, svg, ports: endsToPorts(ends, 20, 'hose') });
  }

  // Tube adapter (140x180)
  register('tube-adapter', '变径接头', '导管', {
    width: 140, height: 180,
    svg:
      `<path d="M51 12 Q53 12 53 18 V70 L62 105 V165 H78 V105 L87 70 V18 Q87 12 89 12" fill="none" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`,
    ports: [
      { id: 'inlet', x: 70, y: 12, dx: 0, dy: -1, type: 'tube', diameter: 34, edge: [53, 12, 87, 12] },
      { id: 'outlet', x: 70, y: 165, dx: 0, dy: 1, type: 'tube', diameter: 16, edge: [62, 165, 78, 165] },
    ],
  });

  // 3-way-crossing (fused 4-way glass cross)
  {
    const ends = [[20, 75, -1, 0], [120, 75, 1, 0], [70, 12, 0, -1], [70, 165, 0, 1]];
    const svg = `<path d="M60 12 H80 V65 H120 V85 H80 V165 H60 V85 H20 V65 H60 Z" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>`;
    register('3-way-crossing', '交叉导管', '导管', { width: 140, height: 180, svg, ports: endsToPorts(ends, 20, 'tube') });
  }
}

function registerCondensersAndDistillation(register) {
  // 33-35. Water condensers (92x354): transparent flat #294454 glass, unadorned joints, OPPOSITE coolant ports
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
      `C${cx + jHw} 54 ${cx + 8} 54 ${cx + 8} 48 V28 Z" fill="none" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>`;

    let innerBody = '';
    if (id === 'liebig-condenser') {
      innerBody =
        `<line x1="${cx - 6.5}" y1="28" x2="${cx - 6.5}" y2="326" stroke="${C.inner}" stroke-width="1.6"/>\n` +
        `  <line x1="${cx + 6.5}" y1="28" x2="${cx + 6.5}" y2="326" stroke="${C.inner}" stroke-width="1.6"/>`;
    } else if (id === 'allihn') {
      const bulbs = 5;
      const span = jBot - jTop - 28;
      const step = span / bulbs;
      const yStart = jTop + 14;
      let dL = `M${cx - 6} 28 V${r(yStart)}`;
      let dR = `M${cx + 6} 28 V${r(yStart)}`;
      for (let i = 0; i < bulbs; i++) {
        const y0 = yStart + i * step;
        const y1 = y0 + step;
        const ym = (y0 + y1) / 2;
        dL += ` C${cx - 6} ${r(y0 + step * 0.16)} ${cx - 13} ${r(y0 + step * 0.22)} ${cx - 13} ${r(ym)} C${cx - 13} ${r(y1 - step * 0.22)} ${cx - 6} ${r(y1 - step * 0.16)} ${cx - 6} ${r(y1)}`;
        dR += ` C${cx + 6} ${r(y0 + step * 0.16)} ${cx + 13} ${r(y0 + step * 0.22)} ${cx + 13} ${r(ym)} C${cx + 13} ${r(y1 - step * 0.22)} ${cx + 6} ${r(y1 - step * 0.16)} ${cx + 6} ${r(y1)}`;
      }
      dL += ' V326';
      dR += ' V326';
      innerBody = `<path d="${dL}" fill="none" stroke="${C.inner}" stroke-width="1.6" stroke-linejoin="round"/>\n` +
        `  <path d="${dR}" fill="none" stroke="${C.inner}" stroke-width="1.6" stroke-linejoin="round"/>`;
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
        `<path d="${coil}" fill="none" stroke="${C.inner}" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"/>\n` +
        `  <path d="${coil}" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    }

    const fem = verticalFemaleJoint(id, cx, 4, 24, 12, 9.5);
    const male = verticalMaleJoint(id, cx, 326, 24, 11.5, 8.8);
    const seals =
      `<path d="M${cx - 10} ${jTop + 4} Q${cx} ${jTop + 8} ${cx + 10} ${jTop + 4}" fill="none" stroke="${C.inner}" stroke-width="1.3"/>\n` +
      `  <path d="M${cx - 10} ${jBot - 4} Q${cx} ${jBot - 8} ${cx + 10} ${jBot - 4}" fill="none" stroke="${C.inner}" stroke-width="1.3"/>`;
    const svg = `${inBarb.svg}\n  ${outBarb.svg}\n  ${outerWall}\n  ${innerBody}\n  ${seals}\n  ${fem}\n  ${male}`;
    register(id, name, '冷凝与蒸馏', {
      width: 92, height: 354, svg,
      ports: [
        { id: 'inlet', x: cx, y: 4, dx: 0, dy: -1, type: 'glass-joint', diameter: 24, depth: 24, edge: [cx - 12, 4, cx + 12, 4] },
        { id: 'outlet', x: cx, y: 350, dx: 0, dy: 1, type: 'glass-joint', diameter: 17.6, depth: 24, edge: [cx - 8.8, 350, cx + 8.8, 350] },
        { id: 'water-in', ...inBarb.port, type: 'coolant' },
        { id: 'water-out', ...outBarb.port, type: 'coolant' },
        { id: 'grip-site', x: cx, y: 175, dx: 1, dy: 0, type: 'grip-site', diameter: 0, segment: [cx, 108, cx, 244] },
      ],
    });
  }

  // 36. Vigreux fractionating column (110x260)
  {
    const id = 'fractionating-column';
    const cx = 55;
    let spikes = '';
    for (let y = 58; y <= 198; y += 22) {
      spikes +=
        `<path d="M35 ${y} C46 ${y + 2} 50 ${y + 4} 50 ${y + 6} C50 ${y + 8} 46 ${y + 10} 35 ${y + 12}" fill="none" stroke="${C.inner}" stroke-width="1.5" stroke-linecap="round"/>\n` +
        `<path d="M75 ${y + 9} C64 ${y + 11} 60 ${y + 13} 60 ${y + 15} C60 ${y + 17} 64 ${y + 19} 75 ${y + 21}" fill="none" stroke="${C.inner}" stroke-width="1.5" stroke-linecap="round"/>\n`;
    }
    const svg =
      `<path d="M44 32 V39 C44 45 35 46 35 54 V210 C35 218 44 219 44 225 V226 H66 V225 C66 219 75 218 75 210 V54 C75 46 66 45 66 39 V32" fill="none" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>\n` +
      `  ${spikes}` +
      `  ${verticalFemaleJoint(id, cx, 10, 22, 7.8, 6.4, { rimExtra: 2.2 })}\n` +
      `  ${verticalMaleJoint(id, cx, 226, 22, 12, 9.8)}`;
    register(id, '分馏柱', '冷凝与蒸馏', {
      width: 110, height: 260, svg,
      ports: [
        { id: 'inlet', x: 55, y: 10, dx: 0, dy: -1, type: 'glass-female', diameter: 20, depth: 20, edge: [45, 10, 65, 10] },
        { id: 'outlet', x: 55, y: 248, dx: 0, dy: 1, type: 'glass-male', diameter: 20, depth: 22, edge: [45, 248, 65, 248] },
      ],
    });
  }

  // 37. Thiele tube (140x210)
  register('thiele-tube', '提勒熔点管', '冷凝与蒸馏', {
    width: 140, height: 210,
    svg:
      `<path d="M45 12 Q48 12 48 18 V160 Q48 189 73 189 Q98 189 98 160 V142 L126 116 L98 76 V18 Q98 12 101 12" fill="none" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>\n` +
      `  <path d="M98 98 L113 116 L98 134 Z" fill="none" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`,
    ports: [{ id: 'mouth', x: 73, y: 12, dx: 0, dy: -1, type: 'mouth', diameter: 50, edge: [48, 12, 98, 12] }],
  });

  // 38. Cold finger (140x210)
  register('cold-finger', '冷指', '冷凝与蒸馏', {
    width: 140, height: 210,
    svg:
      `<path d="M58 26 V10 H66 V156 M74 156 V10 H82 V26" fill="none" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>\n` +
      `  <path d="M46 32 V166 Q70 192 94 166 V32" fill="${C.coolantLight}" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>\n` +
      `  <line x1="62" y1="32" x2="62" y2="158" stroke="${C.inner}" stroke-width="1.5"/>\n` +
      `  <line x1="78" y1="32" x2="78" y2="96" stroke="${C.inner}" stroke-width="1.5"/>\n` +
      `  <rect x="30" y="26" width="80" height="6" rx="3" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.2"/>`,
    ports: [
      { id: 'inlet', x: 62, y: 10, dx: 0, dy: -1, type: 'coolant', diameter: 8, edge: [58, 10, 66, 10] },
      { id: 'outlet', x: 78, y: 10, dx: 0, dy: -1, type: 'coolant', diameter: 8, edge: [74, 10, 82, 10] },
    ],
  });

  // 39-40. Distillation head & Claisen adapter (140x210, ~70-75° downward-sloping arm + smooth Claisen loop)
  {
    const id = 'distillation-head';
    // Sidearm leaves vertical tube at (75, 52) sloping ~70 deg off vertical (dx=0.94, dy=0.342) to male cone
    const ux = 0.94;
    const uy = 0.342;
    const arm = angledMaleJoint(id, 107, 64, ux, uy, 22, 10, 7.8);
    const armTube =
      `<path d="M75 45 L109 55 M75 61 L104 72" fill="none" stroke="${C.stroke}" stroke-width="2.3" stroke-linecap="round"/>`;
    const main =
      `<path d="M57 34 V174 M75 34 V45 M75 61 V174" fill="none" stroke="${C.stroke}" stroke-width="2.3" stroke-linecap="round"/>`;
    const svg =
      `${main}\n  ${armTube}\n  ${arm.svg}\n` +
      `  ${verticalFemaleJoint(id, 66, 12, 22, 7.8, 6.4, { rimExtra: 2.2 })}\n` +
      `  ${verticalMaleJoint(id, 66, 174, 22, 12, 9.8)}`;
    register(id, '蒸馏头', '冷凝与蒸馏', {
      width: 140, height: 210, svg,
      ports: [
        { id: 'mouth', x: 66, y: 12, dx: 0, dy: -1, type: 'glass-female', diameter: 20, edge: [56, 12, 76, 12] },
        { id: 'outlet', x: arm.tip[0], y: arm.tip[1], dx: ux, dy: uy, type: 'glass-male', diameter: arm.diameter, edge: arm.edge },
        { id: 'base', x: 66, y: 196, dx: 0, dy: 1, type: 'glass-male', diameter: 20, edge: [56, 196, 76, 196] },
      ],
    });
  }

  {
    const id = 'claisen';
    // Curved Claisen branch rising smoothly from main stem up to (112, 12), plus downward ~75 deg vapor sidearm
    const ux = 0.94;
    const uy = 0.342;
    const arm = angledMaleJoint(id, 120, 72, ux, uy, 19, 9.5, 7.5);
    const claisenCurve =
      `<path d="M75 110 C94 110 105 96 105 74 V34 M75 128 C102 128 119 108 119 80 M119 62 V34" fill="none" stroke="${C.stroke}" stroke-width="2.3" stroke-linecap="round"/>\n` +
      `  <line x1="119" y1="62" x2="123" y2="63" stroke="${C.stroke}" stroke-width="2.3" stroke-linecap="round"/>\n` +
      `  <line x1="119" y1="80" x2="117" y2="81" stroke="${C.stroke}" stroke-width="2.3" stroke-linecap="round"/>`;
    const main = `<path d="M57 34 V174 M75 34 V110 M75 128 V174" fill="none" stroke="${C.stroke}" stroke-width="2.3" stroke-linecap="round"/>`;
    const svg =
      `${main}\n  ${claisenCurve}\n  ${arm.svg}\n` +
      `  ${verticalFemaleJoint(id, 66, 12, 22, 7.8, 6.4, { rimExtra: 2.2 })}\n` +
      `  ${verticalFemaleJoint(id, 112, 12, 22, 6.8, 5.4, { rimExtra: 2.2 })}\n` +
      `  ${verticalMaleJoint(id, 66, 174, 22, 12, 9.8)}`;
    register(id, '克莱森接头', '冷凝与蒸馏', {
      width: 140, height: 210, svg,
      ports: [
        { id: 'mouth', x: 66, y: 12, dx: 0, dy: -1, type: 'glass-female', diameter: 20, edge: [56, 12, 76, 12] },
        { id: 'outlet', x: arm.tip[0], y: arm.tip[1], dx: ux, dy: uy, type: 'glass-male', diameter: arm.diameter, edge: arm.edge },
        { id: 'base', x: 66, y: 196, dx: 0, dy: 1, type: 'glass-male', diameter: 20, edge: [56, 196, 76, 196] },
        { id: 'mouth-right', x: 112, y: 12, dx: 0, dy: -1, type: 'glass-female', diameter: 18, edge: [103, 12, 121, 12] },
      ],
    });
  }

  // 41. Dean-Stark trap (smooth angled vapor arm + graduated vertical trap + PTFE stopcock)
  {
    const id = 'dean-stark-trap';
    const trap =
      `<path d="M44 32 V164 Q44 188 64 188 Q84 188 84 164 V82 L114 58 V72 H130 V54 Q130 40 116 40 L84 62 V32" fill="none" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round"/>`;
    const drainNozzle = `<path d="M60 190 H68 L66.5 204 H61.5 Z" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="1.9" stroke-linejoin="round"/>`;
    const stopcock = `${drainNozzle}\n  ${drawStopcock(id, 64, 186, { w: 18, h: 8, teal: true })}`;
    const femIn = verticalFemaleJoint(id, 53, 10, 22, 6.8, 5.4, { rimExtra: 2.2 });
    const maleOut = verticalMaleJoint(id, 122, 72, 20, 10, 7.8);
    const ticks = gradTicks(78, 92, 160, 7, 2, 10, { dir: -1 });
    register(id, '分水器', '冷凝与蒸馏', {
      width: 140, height: 210,
      svg: `${trap}\n  ${femIn}\n  ${maleOut}\n  ${ticks}\n  ${stopcock}`,
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
      `<path d="M57 10 V64 C20 82 20 132 57 148 V198 H77 V148 C114 132 114 82 77 64 V10 Z" fill="none" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>`;
    const pts = [[52, 84], [66, 80], [80, 86], [46, 100], [61, 96], [76, 101], [88, 102], [50, 117], [65, 113], [80, 118], [56, 131], [72, 129]];
    const beads = pts.map(([bx, by]) => `<circle cx="${bx}" cy="${by}" r="5.0" fill="${C.chassisTop}" stroke="${C.inner}" stroke-width="1.3"/>`).join('\n  ');
    const wool =
      `<path d="M46 72 Q58 67 68 72 Q78 76 88 71 M46 140 Q58 136 68 140 Q78 144 88 139" fill="none" stroke="${C.tick}" stroke-width="2.0" stroke-linecap="round"/>`;
    register(id, '干燥管', '冷凝与蒸馏', {
      width: 140, height: 210,
      svg: `${outline}\n  ${beads}\n  ${wool}`,
      ports: [
        { id: 'inlet', x: 67, y: 10, dx: 0, dy: -1, type: 'tube', diameter: 20, edge: [57, 10, 77, 10] },
        { id: 'outlet', x: 67, y: 198, dx: 0, dy: 1, type: 'tube', diameter: 20, edge: [57, 198, 77, 198] },
      ],
    });
  }
}

function registerFunnels(register) {
  register('filter-funnel', '过滤漏斗', '过滤与分液', {
    width: 140, height: 210,
    svg:
      `<path d="M12 22 H128 L78 103 V192 L62 198 V103 Z" fill="none" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>\n` +
      `  <line x1="16" y1="26" x2="124" y2="26" stroke="${C.muted}" stroke-width="1.1"/>`,
    ports: [
      { id: 'mouth', x: 70, y: 22, dx: 0, dy: -1, type: 'mouth', diameter: 116, edge: [12, 22, 128, 22] },
      { id: 'stem', x: 70, y: 198, dx: 0, dy: 1, type: 'stem', diameter: 16, segment: [70, 190, 70, 115], depth: 80 },
    ],
  });

  register('thistle-tube', '长颈漏斗', '过滤与分液', {
    width: 140, height: 210,
    svg:
      `<path d="M34 15 H106 M34 15 Q34 58 63 63 V198 H77 V63 Q106 58 106 15" fill="none" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`,
    ports: [
      { id: 'mouth', x: 70, y: 15, dx: 0, dy: -1, type: 'mouth', diameter: 72, edge: [34, 15, 106, 15] },
      { id: 'stem', x: 70, y: 198, dx: 0, dy: 1, type: 'stem', diameter: 16, segment: [70, 190, 70, 115], depth: 80 },
    ],
  });

  for (const [id, name, isGraduated] of [
    ['separatory-funnel', '分液漏斗', false],
    ['dropping-funnel', '滴液漏斗', true],
  ]) {
    const vesselPath = isGraduated
      ? `M57 16 V38 Q42 46 42 56 V126 Q42 135 62 142 V198 H78 V142 Q98 135 98 126 V56 Q98 46 83 38 V16`
      : `M57 16 V36 C8 58 28 126 62 138 V198 H78 V138 C112 126 132 58 83 36 V16`;
    const ticks = isGraduated ? gradTicks(90, 60, 122, 6, 2, 10, { dir: -1 }) : '';
    const dripBulb = isGraduated ? `<ellipse cx="70" cy="176" rx="9" ry="7" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.0"/>` : '';
    const svg =
      `<path d="${vesselPath}" fill="none" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>\n` +
      `  ${verticalFemaleJoint(id, 70, 16, 20, 10.5, 8.5, { rimExtra: 2.5 })}\n` +
      `  ${ticks}\n  ${dripBulb}\n` +
      `  ${drawStopcock(id, 70, 156, { w: 22, h: 9, teal: !isGraduated })}`;
    register(id, name, '过滤与分液', {
      width: 140, height: 210, svg,
      ports: [
        { id: 'mouth', x: 70, y: 16, dx: 0, dy: -1, type: 'glass-female', diameter: 26, edge: [57, 16, 83, 16] },
        { id: 'stem', x: 70, y: 198, dx: 0, dy: 1, type: 'stem', diameter: 16, segment: [70, 190, 70, 115], depth: 80 },
      ],
    });
  }
}

function registerMeasuring(register) {
  register('cylinder', '量筒', '测量', {
    width: 80, height: 260,
    svg:
      `<path d="M20 12 L23 18 V228 H57 V12" fill="none" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round"/>\n` +
      `  <line x1="20" y1="12" x2="59" y2="12" stroke="${C.stroke}" stroke-width="2.3" stroke-linecap="round"/>\n` +
      `  <path d="M12 246 Q12 238 23 234 L26 228 H54 L57 234 Q68 238 68 246 Z" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>\n` +
      `  <line x1="12" y1="248" x2="68" y2="248" stroke="${C.stroke}" stroke-width="2.3" stroke-linecap="round"/>\n` +
      `  ${gradTicks(55, 34, 214, 15, 3, 9, { dir: -1 })}\n` +
      `  ${labelText(43, 36.5, '100', 6.4, C.tick, 'end', false)}\n` +
      `  ${labelText(43, 113.5, '50', 6.4, C.tick, 'end', false)}\n` +
      `  ${labelText(43, 190.5, '10', 6.4, C.tick, 'end', false)}`,
    ports: [
      { id: 'mouth', x: 40, y: 12, dx: 0, dy: -1, type: 'mouth', diameter: 34, edge: [23, 12, 57, 12] },
      { id: 'base', x: 40, y: 248, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });

  register('pipette', '移液管', '测量', {
    width: 80, height: 260,
    svg:
      `<path d="M35 10 V94 Q17 105 17 133 Q17 161 35 172 V222 L38 244 H42 L45 222 V172 Q63 161 63 133 Q63 105 45 94 V10 Z" fill="none" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  <line x1="34" y1="54" x2="46" y2="54" stroke="${C.red}" stroke-width="1.8"/>`,
    ports: [
      { id: 'stem', x: 40, y: 244, dx: 0, dy: 1, type: 'probe', diameter: 10, segment: [40, 234, 40, 170] },
      { id: 'mouth', x: 40, y: 10, dx: 0, dy: -1, type: 'pipette-stem', diameter: 10, edge: [35, 10, 45, 10] },
    ],
  });

  register('mohr', '刻度吸管', '测量', {
    width: 80, height: 260,
    svg:
      `<path d="M27 10 H53 V26 L48 36 V218 L43 244 H37 L32 218 V36 L27 26 Z" fill="none" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  <rect x="28" y="13" width="24" height="4" fill="${C.teal}"/>\n` +
      `  ${gradTicks(47, 50, 198, 12, 2, 10, { dir: -1 })}`,
    ports: [
      { id: 'stem', x: 40, y: 244, dx: 0, dy: 1, type: 'probe', diameter: 10, segment: [40, 234, 40, 170] },
      { id: 'mouth', x: 40, y: 10, dx: 0, dy: -1, type: 'pipette-stem', diameter: 26, edge: [27, 10, 53, 10] },
    ],
  });

  register('burette', '滴定管', '测量', {
    width: 80, height: 260,
    svg:
      `<path d="M25 10 Q27 10 27 16 V198 L36 208 V226 L38.5 244 H41.5 L44 226 V208 L53 198 V16 Q53 10 55 10" fill="none" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>\n` +
      `  ${gradTicks(51, 30, 186, 13, 3, 8, { dir: -1 })}\n` +
      `  ${labelText(40, 32.5, '0', 6.4, C.tick, 'end', false)}\n` +
      `  ${labelText(40, 188.5, '50', 6.4, C.tick, 'end', false)}\n` +
      `  ${drawStopcock('burette', 40, 215, { w: 20, h: 8, teal: true })}`,
    ports: [
      { id: 'stem', x: 40, y: 244, dx: 0, dy: 1, type: 'probe', diameter: 10, segment: [40, 234, 40, 170] },
      { id: 'mouth', x: 40, y: 10, dx: 0, dy: -1, type: 'mouth', diameter: 26, edge: [27, 10, 53, 10] },
    ],
  });

  register('eudiometer', '量气管', '测量', {
    width: 80, height: 260,
    svg:
      `<path d="M25 10 Q27 10 27 16 V225 A13 13 0 0 0 53 225 V16 Q53 10 55 10" fill="none" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round"/>\n` +
      `  ${gradTicks(51, 30, 200, 14, 2, 11, { dir: -1 })}\n` +
      `  <line x1="25" y1="214" x2="32" y2="214" stroke="${C.brass}" stroke-width="2.0" stroke-linecap="round"/>\n` +
      `  <line x1="48" y1="214" x2="55" y2="214" stroke="${C.brass}" stroke-width="2.0" stroke-linecap="round"/>`,
    ports: [
      { id: 'mouth', x: 40, y: 10, dx: 0, dy: -1, type: 'mouth', diameter: 26, edge: [27, 10, 53, 10] },
      { id: 'base', x: 40, y: 238, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });

  register('thermometer', '温度计', '测量', {
    width: 80, height: 260,
    svg:
      `<circle cx="40" cy="14" r="4.5" fill="none" stroke="${C.stroke}" stroke-width="2.0"/>\n` +
      `  <path d="M32 208 V22 A8 8 0 0 1 48 22 V208 A17 17 0 1 1 32 208 Z" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>\n` +
      `  <line x1="40" y1="76" x2="40" y2="222" stroke="${C.red}" stroke-width="4.6" stroke-linecap="round"/>\n` +
      `  <circle cx="40" cy="224" r="10.5" fill="${C.red}" stroke="none"/>\n` +
      `  ${gradTicks(47, 36, 188, 12, 2, 9, { dir: 1 })}\n` +
      `  ${labelText(60, 42, '100', 7, C.tick, 'start', false)}\n` +
      `  ${labelText(60, 188, '0°C', 7, C.tick, 'start', false)}`,
    ports: [{ id: 'probe', x: 40, y: 241, dx: 0, dy: 1, type: 'probe', diameter: 14, segment: [40, 200, 40, 30] }],
  });

  register('hydrometer', '液体比重计', '测量', {
    width: 80, height: 260,
    svg:
      `<path d="M35 10 V96 Q18 108 18 142 Q18 176 32 192 Q29 218 35 238 Q40 246 45 238 Q51 218 48 192 Q62 176 62 142 Q62 108 45 96 V10 Z" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  <rect x="37" y="18" width="6" height="78" fill="#F8FAF9" stroke="${C.inner}" stroke-width="0.9"/>\n` +
      `  ${gradTicks(43, 24, 90, 9, 3, 5, { dir: -1 })}\n` +
      `  <path d="M31 214 Q40 222 49 214 L45 238 Q40 245 35 238 Z" fill="${C.amberMid}" stroke="${C.inner}" stroke-width="1.2"/>`,
    ports: [{ id: 'stem', x: 40, y: 244, dx: 0, dy: 1, type: 'immersible', diameter: 10, segment: [40, 234, 40, 170] }],
  });
}

function registerTransferAndSyringes(register) {
  for (const [id, name, isPump] of [
    ['pump', '三阀吸球', true],
    ['suction-pear', '吸耳球', false],
  ]) {
    const bulb =
      `<path d="M44 200 V152 C-4 138 6 48 50 48 C94 48 104 138 56 152 V200 Z" fill="${C.red}" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>\n` +
      `  <rect x="44" y="18" width="12" height="31" rx="4" fill="${C.red}" stroke="${C.stroke}" stroke-width="2.1"/>\n` +
      `  <rect x="42" y="184" width="16" height="16" rx="2" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="2.1"/>`;
    const valves = isPump
      ? `<circle cx="50" cy="34" r="7" fill="${C.corkLight}" stroke="${C.stroke}" stroke-width="1.8"/>${labelText(50, 36.8, 'A', 7.5, C.stroke)}` +
        `<circle cx="30" cy="96" r="8" fill="${C.corkLight}" stroke="${C.stroke}" stroke-width="1.8"/>${labelText(30, 98.8, 'S', 8, C.stroke)}` +
        `<circle cx="70" cy="96" r="8" fill="${C.corkLight}" stroke="${C.stroke}" stroke-width="1.8"/>${labelText(70, 98.8, 'E', 8, C.stroke)}`
      : '';
    register(id, name, '移液与注射', {
      width: 100, height: 230, svg: `${bulb}\n  ${valves}`,
      ports: [{ id: 'mouth', x: 50, y: 200, dx: 0, dy: 1, type: 'pipette-filler', diameter: 12, edge: [44, 200, 56, 200] }],
    });
  }

  for (const [id, name, isPlastic] of [
    ['dropper-pipette', '滴管', false],
    ['plastic-pipette', '塑料滴管', true],
  ]) {
    const stem = `<path d="M40 69 V190 L50 215 L60 190 V69 Z" fill="none" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const bulb = isPlastic
      ? `<path d="M38 69 C20 14 80 14 62 69 Z" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`
      : `<path d="M38 69 C18 16 82 16 62 69 Z" fill="${C.red}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>` +
        `<rect x="37" y="64" width="26" height="6" rx="2.5" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    const ticks = isPlastic ? gradTicks(57, 82, 162, 6, 2, 7, { dir: -1 }) : '';
    register(id, name, '移液与注射', {
      width: 100, height: 230, svg: `${stem}\n  ${bulb}\n  ${ticks}`,
      ports: [{ id: 'tip', x: 50, y: 215, dx: 0, dy: 1, type: 'stem', diameter: 10, segment: [50, 205, 50, 95] }],
    });
  }

  register('pipette-bottle', '滴瓶', '移液与注射', {
    width: 100, height: 230,
    svg:
      `<path d="M31 87 Q12 98 12 114 V208 H88 V114 Q88 98 69 87 V68 H31 Z" fill="${C.amberLight}" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>\n` +
      `  <rect x="28" y="58" width="44" height="14" rx="2.5" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="2.1"/>\n` +
      `  <path d="M39 58 C24 14 76 14 61 58 Z" fill="${C.red}" stroke="${C.stroke}" stroke-width="2.1" stroke-linejoin="round"/>\n` +
      `  <rect x="24" y="128" width="52" height="48" rx="2" fill="#FFFFFF" stroke="${C.inner}" stroke-width="1.3"/>\n` +
      `  <line x1="32" y1="146" x2="68" y2="146" stroke="${C.muted}" stroke-width="1.2"/>\n` +
      `  <line x1="32" y1="158" x2="62" y2="158" stroke="${C.muted}" stroke-width="1.2"/>`,
    ports: [{ id: 'base', x: 50, y: 210, dx: 0, dy: 1, type: 'base', diameter: 0 }],
  });

  for (const [id, name, isGas] of [
    ['syringe', '注射器', false],
    ['gas-syringe', '气体注射器', true],
  ]) {
    const plungerStick = `<rect x="46" y="20" width="8" height="90" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    const thumbPad = `<rect x="28" y="14" width="44" height="7" rx="3" fill="${isGas ? C.brass : C.chassisTop}" stroke="${C.stroke}" stroke-width="2.0"/>`;
    const piston = isGas
      ? `<rect x="26" y="100" width="48" height="24" rx="2" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="2.0"/>`
      : `<rect x="26" y="106" width="48" height="14" rx="2" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="1.8"/>` +
        `<line x1="26" y1="113" x2="74" y2="113" stroke="${C.rubberDark}" stroke-width="2.0"/>`;
    const barrel = `<rect x="23" y="58" width="54" height="123" rx="3" fill="none" stroke="${C.stroke}" stroke-width="2.3"/>`;
    const flange = `<rect x="15" y="55" width="70" height="6" rx="3" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.0"/>`;
    const luerTip = `<path d="M41 181 H59 L57 196 H43 Z" fill="none" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>`;
    const needleStem = isGas
      ? ''
      : `<rect x="46" y="196" width="8" height="7" rx="1" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.6"/><line x1="50" y1="203" x2="50" y2="220" stroke="${C.stroke}" stroke-width="2.2" stroke-linecap="round"/>`;
    const svg =
      `${plungerStick}\n  ${thumbPad}\n  ${barrel}\n  ${piston}\n  ${flange}\n` +
      `  ${gradTicks(75, 78, 168, 9, 3, 12, { dir: -1 })}\n` +
      `  ${luerTip}\n  ${needleStem}`;
    const ports = isGas
      ? [{ id: 'outlet', x: 50, y: 196, dx: 0, dy: 1, type: 'luer-male', diameter: 14, edge: [43, 196, 57, 196] }]
      : [{ id: 'outlet', x: 50, y: 220, dx: 0, dy: 1, type: 'probe', diameter: 2.4, segment: [50, 218, 50, 198] }];
    register(id, name, '移液与注射', { width: 100, height: 230, svg, ports });
  }

  register('needle', '针头', '移液与注射', {
    width: 100, height: 230,
    svg:
      `<path d="M47 48 V207 L53 192 V48 Z" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.9" stroke-linejoin="round"/>\n` +
      `  <rect x="30" y="12" width="40" height="36" rx="4" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.2"/>\n` +
      `  <rect x="26" y="12" width="48" height="7" rx="2.5" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.0"/>\n` +
      `  <line x1="40" y1="23" x2="40" y2="44" stroke="${C.tealLight}" stroke-width="1.4"/>\n` +
      `  <line x1="60" y1="23" x2="60" y2="44" stroke="${C.tealLight}" stroke-width="1.4"/>`,
    ports: [{ id: 'tip', x: 50, y: 205, dx: 0, dy: 1, type: 'probe', diameter: 6, segment: [50, 200, 50, 60] }],
  });
}

function registerStoppersAndMisc(register) {
  // 62. Bung (100x75, MUST stay 100% opaque at (50, 25))
  register('bung', '木塞 / 橡胶塞', '塞子与密封', {
    width: 100, height: 75, boreCount: 0,
    svg:
      `<path d="M14 4 H86 L76 65 H24 Z" fill="${C.corkMid}" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>\n` +
      `  <line x1="21" y1="11" x2="79" y2="11" stroke="${C.corkLight}" stroke-width="2.2" stroke-linecap="round"/>\n` +
      `  <line x1="28" y1="57" x2="72" y2="57" stroke="${C.corkDark}" stroke-width="1.5" stroke-linecap="round"/>`,
    ports: [{ id: 'plug', x: 50, y: 65, dx: 0, dy: 1, type: 'plug', diameter: 52, depth: 36, edge: [24, 65, 76, 65] }],
  });

  // 63. Glass stopper (flat penny-head / hollow glass stopper, ZERO XXX hatch)
  register('glass-stopper', '玻璃塞', '塞子与密封', {
    width: 100, height: 75, boreCount: 0,
    svg:
      `<path d="M33 27 L39 68 H61 L67 27 Z" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>\n` +
      `  <path d="M29 8 Q50 3 71 8 L68 27 H32 Z" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>\n` +
      `  <line x1="36" y1="62" x2="64" y2="62" stroke="${C.muted}" stroke-width="1.2"/>`,
    ports: [{ id: 'plug', x: 50, y: 68, dx: 0, dy: 1, type: 'plug', diameter: 22, depth: 30, edge: [39, 68, 61, 68] }],
  });

  // 64. Septum seal (100x75)
  register('septum-seal', '隔膜密封盖', '塞子与密封', {
    width: 100, height: 75, boreCount: -1,
    svg:
      `<rect x="13" y="20" width="74" height="36" rx="6" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.3"/>\n` +
      `  <ellipse cx="50" cy="20" rx="37" ry="9.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.1"/>\n` +
      `  <ellipse cx="50" cy="20" rx="22" ry="5.5" fill="${C.red}" stroke="${C.stroke}" stroke-width="1.6"/>\n` +
      `  <line x1="22" y1="30" x2="22" y2="50" stroke="${C.tick}" stroke-width="1.3"/>\n` +
      `  <line x1="78" y1="30" x2="78" y2="50" stroke="${C.tick}" stroke-width="1.3"/>`,
    ports: [{ id: 'plug', x: 50, y: 56, dx: 0, dy: 1, type: 'lid', diameter: 74, depth: 36, edge: [13, 56, 87, 56] }],
  });

  // 65. Plastic Keck joint clip (180x200)
  register('plastic-joint-clip', '磨口夹', '支撑与夹持', {
    width: 180, height: 200,
    svg:
      `<path d="M36 62 Q90 12 144 62 L134 142 H112 V82 Q90 74 68 82 V142 H46 Z" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>\n` +
      `  <path d="M52 58 Q90 28 128 58" fill="none" stroke="${C.tealLight}" stroke-width="2.0" stroke-linecap="round"/>\n` +
      `  <rect x="34" y="102" width="12" height="24" rx="3" fill="${C.tealDark}" stroke="${C.stroke}" stroke-width="1.9"/>\n` +
      `  <rect x="134" y="102" width="12" height="24" rx="3" fill="${C.tealDark}" stroke="${C.stroke}" stroke-width="1.9"/>`,
    ports: [{ id: 'clip', x: 90, y: 80, dx: 0, dy: -1, type: 'clip', diameter: 24 }],
  });

  // 66. Stirring rod (180x120)
  register('stirring-rod', '玻璃搅拌棒', '实验小工具', {
    width: 180, height: 120,
    svg: `<rect x="16" y="52" width="154" height="12" rx="6" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="2.2"/>`,
    ports: [{ id: 'probe', x: 170, y: 58, dx: 1, dy: 0, type: 'probe', diameter: 12, segment: [150, 58, 30, 58] }],
  });

  // 67. Syringe filter (180x120)
  register('syringe-filter', '针式过滤器', '实验小工具', {
    width: 180, height: 120,
    svg:
      `<rect x="36" y="54" width="22" height="12" rx="2" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.1"/>\n` +
      `  <path d="M126 54 H145 V66 H126 Z" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="2.1" stroke-linejoin="round"/>\n` +
      `  <ellipse cx="90" cy="60" rx="38" ry="26" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.3"/>\n` +
      `  <ellipse cx="90" cy="60" rx="26" ry="17" fill="#F8FAF9" stroke="${C.inner}" stroke-width="1.4"/>\n` +
      `  <line x1="72" y1="60" x2="108" y2="60" stroke="${C.muted}" stroke-width="1.2" stroke-dasharray="3 2.5"/>`,
    ports: [
      { id: 'inlet', x: 36, y: 60, dx: -1, dy: 0, type: 'luer-female', diameter: 12, edge: [36, 54, 36, 66] },
      { id: 'outlet', x: 145, y: 60, dx: 1, dy: 0, type: 'luer-male', diameter: 12, edge: [145, 54, 145, 66] },
    ],
  });

  // 68. SPE cartridge (180x120, zero label words)
  register('spe-cartridge', '固相萃取柱', '实验小工具', {
    width: 180, height: 120,
    svg:
      `<path d="M128 56 H162 V66 H128 Z" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.1"/>\n` +
      `  <rect x="44" y="33" width="84" height="56" rx="4" fill="none" stroke="${C.stroke}" stroke-width="2.3"/>\n` +
      `  <rect x="42" y="29" width="6" height="64" rx="2" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.1"/>\n` +
      `  <rect x="64" y="36" width="5" height="50" fill="${C.chassisMid}" stroke="${C.inner}" stroke-width="1.2"/>\n` +
      `  <rect x="69" y="36" width="38" height="50" fill="#F8FAF9" stroke="${C.inner}" stroke-width="1.2"/>\n` +
      `  <rect x="107" y="36" width="5" height="50" fill="${C.chassisMid}" stroke="${C.inner}" stroke-width="1.2"/>`,
    ports: [{ id: 'outlet', x: 162, y: 61, dx: 1, dy: 0, type: 'luer-male', diameter: 10, edge: [162, 56, 162, 66] }],
  });

  // 69. Piston chamber (200x170)
  register('piston-chamber', '活塞气室', '设备', {
    width: 200, height: 170,
    svg:
      `<path d="M10 47 H25 V59 H10 Z" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.1"/>\n` +
      `  <rect x="25" y="36" width="150" height="92" rx="4" fill="none" stroke="${C.stroke}" stroke-width="2.3"/>\n` +
      `  <rect x="106" y="78" width="82" height="8" rx="2" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.9"/>\n` +
      `  <rect x="184" y="64" width="8" height="36" rx="3" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.1"/>\n` +
      `  <rect x="88" y="38" width="18" height="88" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.1"/>\n` +
      `  <rect x="88" y="42" width="4" height="80" fill="${C.rubberMid}"/>\n` +
      `  ${[45, 65, 85, 105, 125, 145].map((tx, i) => `<line x1="${tx}" y1="${i % 2 ? 118 : 114}" x2="${tx}" y2="127" stroke="${C.tick}" stroke-width="1.2"/>`).join('')}`,
    ports: [{ id: 'inlet', x: 10, y: 53, dx: -1, dy: 0, type: 'tube', diameter: 12, edge: [10, 47, 10, 59] }],
  });

  // 70. Desiccator (200x170, flat crisp line art)
  register('desiccator', '干燥器', '设备', {
    width: 200, height: 170,
    svg:
      `<path d="M22 54 H178 L155 144 H45 Z" fill="none" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>\n` +
      `  <path d="M48 122 L152 122 L147 140 H53 Z" fill="${C.coolantLight}" stroke="none"/>\n` +
      `  ${[58, 72, 86, 100, 114, 128, 142].map((bx) => `<circle cx="${bx}" cy="133" r="4" fill="${C.blue}" stroke="${C.inner}" stroke-width="1.0"/>`).join('')}\n` +
      `  <rect x="34" y="102" width="132" height="6" rx="2" fill="${C.porcelainMid}" stroke="${C.stroke}" stroke-width="1.9"/>\n` +
      `  <path d="M22 52 Q100 -10 178 52 Z" fill="none" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>\n` +
      `  <rect x="18" y="49" width="164" height="7" rx="3" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.1"/>\n` +
      `  <path d="M84 18 L87 7 H113 L116 18 Q100 22 84 18 Z" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.1" stroke-linejoin="round"/>`,
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
    const uOuter = `<path d="M38 30 V132 A42 42 0 0 0 122 132 V30 H98 V132 A18 18 0 0 1 62 132 V30 Z" fill="none" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>`;
    const granules = [
      [48, 84], [54, 96], [47, 110], [52, 124], [55, 138], [62, 150], [74, 158], [86, 158],
      [98, 150], [106, 138], [108, 124], [112, 110], [107, 96], [113, 84],
    ].map(([gx, gy]) => `<circle cx="${gx}" cy="${gy}" r="4.2" fill="${C.chassisTop}" stroke="${C.inner}" stroke-width="1.2"/>`).join('\n  ');
    const bungs =
      `<path d="M36 20 H64 L62 34 H38 Z" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="2.1" stroke-linejoin="round"/>\n` +
      `  <path d="M96 20 H124 L122 34 H98 Z" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="2.1" stroke-linejoin="round"/>`;
    register(id, 'U型干燥管', '冷凝与蒸馏', {
      width: 160, height: 200, search: 'u drying tube u tube desiccant',
      svg: `${bL.svg}\n  ${bR.svg}\n  ${uOuter}\n  ${granules}\n  ${bungs}`,
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
    const uOuter = `<path d="M38 20 V132 A42 42 0 0 0 122 132 V20 H98 V132 A18 18 0 0 1 62 132 V20 Z" fill="none" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>`;
    const lips = `${rolledLip(id, 50, 20, 13.5, { height: 4.0 })}\n  ${rolledLip(id, 110, 20, 13.5, { height: 4.0 })}`;
    register(id, '支管U型管', '冷凝与蒸馏', {
      width: 160, height: 200, search: 'side arm u tube u tube',
      svg: `${bL.svg}\n  ${bR.svg}\n  ${uOuter}\n  ${lips}`,
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
      `C142 102 106 60 66 54 V28`;
    const svg =
      `<path d="${beakD}" fill="none" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round"/>\n` +
      `  ${verticalFemaleJoint(id, 48, 28, 20, 8.8, 7.2, { rimExtra: 2.2 })}`;
    register(id, '曲颈甑', '冷凝与蒸馏', {
      width: 200, height: 160, search: 'retort alembic', svg,
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

  // 74. Glass stopcock valve (100x80 — authentic inline glass tube + conical barrel + PTFE/glass T-handle, NOT cross-hatched cork)
  register('glass-stopcock', '玻璃活塞', '塞子与密封', {
    width: 100, height: 80, boreCount: 0, search: 'glass stopcock valve plug',
    svg:
      `<path d="M6 42 H36 M6 52 H36 M64 42 H94 M64 52 H94" fill="none" stroke="${C.stroke}" stroke-width="2.2" stroke-linecap="round"/>\n` +
      `  <path d="M35 28 H65 L59 68 H41 Z" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>\n` +
      `  <line x1="40" y1="47" x2="60" y2="47" stroke="${C.teal}" stroke-width="2.4" stroke-linecap="round"/>\n` +
      `  <rect x="46" y="18" width="8" height="10" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.0"/>\n` +
      `  <rect x="24" y="10" width="52" height="9" rx="4.5" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.2"/>`,
    ports: [{ id: 'plug', x: 50, y: 68, dx: 0, dy: 1, type: 'plug', diameter: 18, depth: 30, edge: [41, 68, 59, 68] }],
  });

  // 75. Simple Kipp generator (160x240)
  {
    const id = 'simple-kipp-generator';
    const stand =
      `<rect x="14" y="216" width="132" height="12" rx="4" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.3"/>\n` +
      `  <rect x="26" y="18" width="7" height="198" rx="2" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.1"/>\n` +
      `  <rect x="23" y="88" width="41" height="8" rx="3" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.9"/>\n` +
      `  <rect x="61" y="85" width="46" height="14" rx="4" fill="none" stroke="${C.stroke}" stroke-width="2.2"/>`;
    const testTube =
      `<path d="M66 154 H102 V182 A18 18 0 0 1 66 182 Z" fill="${C.coolantLight}" stroke="none"/>\n` +
      `  <line x1="66" y1="154" x2="102" y2="154" stroke="${C.teal}" stroke-width="1.3"/>\n` +
      `  <path d="M64 68 V182 A20 20 0 0 0 104 182 V68 Z" fill="none" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>\n` +
      `  <rect x="66" y="139" width="36" height="4" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.1"/>\n` +
      `  ${[72, 82, 92].map((zx) => `<circle cx="${zx}" cy="133" r="3.4" fill="${C.tick}" stroke="${C.stroke}" stroke-width="1.2"/>`).join('\n  ')}`;
    const funnel = `<path d="M56 16 H94 L80 42 V184 H74 V42 Z" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>`;
    const tubeOut =
      `<path d="M92 66 V52 Q92 47 98 47 H144 V57 H100 V66 Z" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.1" stroke-linejoin="round"/>\n` +
      `  ${drawStopcock(id, 120, 52, { w: 18, h: 8, teal: true })}`;
    const stopper = `<path d="M62 56 H106 L102 72 H66 Z" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="2.1" stroke-linejoin="round"/>`;
    register(id, '简易启普发生器', '实验装置', {
      width: 160, height: 240, search: 'simple kipp generator gas',
      svg: `${stand}\n  ${testTube}\n  ${funnel}\n  ${tubeOut}\n  ${stopper}`,
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
      `<rect x="16" y="216" width="168" height="12" rx="4" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.3"/>\n` +
      `  <rect x="28" y="14" width="7" height="202" rx="2" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.1"/>\n` +
      `  <line x1="35" y1="86" x2="80" y2="86" stroke="${C.stroke}" stroke-width="4.2" stroke-linecap="round"/>\n` +
      `  <line x1="35" y1="158" x2="128" y2="158" stroke="${C.stroke}" stroke-width="4.0" stroke-linecap="round"/>\n` +
      `  <line x1="60" y1="154" x2="124" y2="154" stroke="${C.tick}" stroke-width="2.4" stroke-dasharray="3 2"/>`;
    const lamp =
      `<path d="M68 214 L74 190 Q92 186 110 190 L116 214 Z" fill="none" stroke="${C.stroke}" stroke-width="2.1" stroke-linejoin="round"/>\n` +
      `  <rect x="86" y="180" width="12" height="9" rx="2" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.6"/>\n` +
      `  <path d="M92 164 C99 171 97 180 92 180 C87 180 85 171 92 164 Z" fill="${C.brassLight}" stroke="${C.brassDark}" stroke-width="1.3"/>\n` +
      `  <path d="M92 170 C95 174 94 179 92 179 C90 179 89 174 92 170 Z" fill="${C.teal}"/>`;
    const rbf = `<path d="M80 74 V96 C54 108 58 152 92 152 C126 152 130 108 104 96 V74 Z" fill="none" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>`;
    const funnel =
      `<path d="M62 12 H94 L82 36 V78 H74 V36 Z" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>\n` +
      `  ${drawStopcock(id, 78, 48, { w: 16, h: 7, teal: true })}`;
    const delivery = `<path d="M98 76 V38 Q98 31 106 31 H180 V41 H106 V76 Z" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.1" stroke-linejoin="round"/>`;
    const bung = `<path d="M77 68 H107 L104 81 H80 Z" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="2.1" stroke-linejoin="round"/>`;
    register(id, '固液加热造气装置', '实验装置', {
      width: 200, height: 240, search: 'solid liquid heating gas setup',
      svg: `${stand}\n  ${lamp}\n  ${rbf}\n  ${funnel}\n  ${delivery}\n  ${bung}`,
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
    const baseStand = `<rect x="28" y="168" width="124" height="12" rx="4" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.3"/>`;
    const liquid =
      `<path d="M46 80 V128 A44 44 0 0 0 134 128 V80 H114 V128 A24 24 0 0 1 66 128 V80 Z" fill="${C.coolantLight}" stroke="none"/>\n` +
      `  <line x1="46" y1="80" x2="66" y2="80" stroke="${C.teal}" stroke-width="1.4"/>\n` +
      `  <line x1="114" y1="80" x2="134" y2="80" stroke="${C.teal}" stroke-width="1.4"/>`;
    const uBody = `<path d="M44 44 V128 A46 46 0 0 0 136 128 V44 H112 V128 A22 22 0 0 1 68 128 V44 Z" fill="none" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>`;
    const electrodes =
      `<rect x="53" y="28" width="6" height="94" rx="1" fill="${C.inner}" stroke="${C.stroke}" stroke-width="1.6"/>\n` +
      `  <rect x="121" y="28" width="6" height="94" rx="1" fill="${C.inner}" stroke="${C.stroke}" stroke-width="1.6"/>`;
    const bungs =
      `<path d="M42 36 H70 L68 48 H44 Z" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="2.1"/>\n` +
      `  <path d="M110 36 H138 L136 48 H112 Z" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="2.1"/>`;
    const posts =
      `${bindingPost(56, 22, C.red, '+', -10, 6.2)}\n` +
      `  ${bindingPost(124, 22, C.stroke, '-', -10, 6.2)}`;
    const bubbles =
      `<circle cx="52" cy="96" r="2.2" fill="#FFFFFF" stroke="${C.teal}" stroke-width="1.0"/>\n` +
      `  <circle cx="59" cy="86" r="2.5" fill="#FFFFFF" stroke="${C.teal}" stroke-width="1.0"/>\n` +
      `  <circle cx="120" cy="94" r="2.2" fill="#FFFFFF" stroke="${C.teal}" stroke-width="1.0"/>\n` +
      `  <circle cx="127" cy="85" r="2.6" fill="#FFFFFF" stroke="${C.teal}" stroke-width="1.0"/>`;
    register(id, '电解装置', '实验装置', {
      width: 180, height: 200, search: 'electrolysis cell hofmann',
      svg: `${bL.svg}\n  ${bR.svg}\n  ${baseStand}\n  ${liquid}\n  ${uBody}\n  ${electrodes}\n  ${bubbles}\n  ${bungs}\n  ${posts}`,
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
