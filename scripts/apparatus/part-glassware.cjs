// Classic Flat Scientific Line-Art Glassware Module for Chem Studio (#294454 house style).
// Zero <linearGradient>/<radialGradient>, zero url(#...), zero cross-hatched XXX joints,
// zero white specular bars, zero sealed top rims on open glassware, and bold glassSw (2.8) contours.
// Owns 77 studio:* items (70 upgraded + 7 new glassware items) + 3 RBF neck variants = 80 plates.
'use strict';

const S = require('./svg-style.cjs');
const {
  C, r, rad,
  gradTicks, barb, oliveBarb,
  drawStopcock, labelText, bindingPost,
} = S;

const GSW = C.glassSw || 2.8;
const HINT_ARC = '#DCE8EC';

function openVerticalFemaleJoint(cx, yTop, len = 22, hwTop = 10.5, hwBot = 9, flare = 3.2, sw = GSW) {
  const lxOuter = cx - hwTop - flare;
  const rxOuter = cx + hwTop + flare;
  const lxWall = cx - hwTop;
  const rxWall = cx + hwTop;
  const lxBot = cx - hwBot;
  const rxBot = cx + hwBot;
  const yWaist = yTop + 4.5;
  const yBot = yTop + len;
  return (
    `<path d="M${r(lxOuter)} ${r(yTop)} Q${r(lxWall)} ${r(yTop + 1)} ${r(lxWall)} ${r(yWaist)} L${r(lxBot)} ${r(yBot)}" fill="none" stroke="${C.stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
    `  <path d="M${r(rxOuter)} ${r(yTop)} Q${r(rxWall)} ${r(yTop + 1)} ${r(rxWall)} ${r(yWaist)} L${r(rxBot)} ${r(yBot)}" fill="none" stroke="${C.stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
    `  <path d="M${r(lxBot + 1.5)} ${r(yBot)} Q${r(cx)} ${r(yBot + 2.2)} ${r(rxBot - 1.5)} ${r(yBot)}" fill="none" stroke="${HINT_ARC}" stroke-width="1.5" stroke-linecap="round"/>`
  );
}

function openVerticalMaleJoint(cx, yTop, len = 22, hwTop = 11.5, hwBot = 8.8, opts = {}) {
  const sw = opts.sw || GSW;
  const yBot = yTop + len;
  const collar = opts.collar === false
    ? ''
    : `<path d="M${r(cx - hwTop - 2.2)} ${r(yTop)} H${r(cx + hwTop + 2.2)}" fill="none" stroke="${C.stroke}" stroke-width="${r(sw - 0.3)}" stroke-linecap="round"/>\n  `;
  const innerLine = `<path d="M${r(cx - hwTop + 1)} ${r(yTop + 2.2)} Q${r(cx)} ${r(yTop + 4.5)} ${r(cx + hwTop - 1)} ${r(yTop + 2.2)}" fill="none" stroke="${HINT_ARC}" stroke-width="1.4" stroke-linecap="round"/>`;
  return (
    `${collar}` +
    `<path d="M${r(cx - hwTop)} ${r(yTop)} L${r(cx - hwBot)} ${r(yBot)}" fill="none" stroke="${C.stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
    `  <path d="M${r(cx + hwTop)} ${r(yTop)} L${r(cx + hwBot)} ${r(yBot)}" fill="none" stroke="${C.stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
    `  ${innerLine}`
  );
}

function openAngledMaleJoint(sx, sy, ux, uy, len = 22, hwTop = 10, hwBot = 7.8, sw = GSW) {
  const ex = sx + ux * len;
  const ey = sy + uy * len;
  const tx = -uy;
  const ty = ux;
  const p = (along, perp) => [r(sx + ux * along + tx * perp), r(sy + uy * along + ty * perp)];
  const l0 = p(0, -hwTop);
  const r0 = p(0, hwTop);
  const l1 = p(len, -hwBot);
  const r1 = p(len, hwBot);
  const c0 = p(0, -(hwTop + 2.0));
  const c1 = p(0, hwTop + 2.0);
  return {
    svg:
      `<path d="M${c0[0]} ${c0[1]} L${c1[0]} ${c1[1]}" fill="none" stroke="${C.stroke}" stroke-width="${r(sw - 0.3)}" stroke-linecap="round"/>\n` +
      `  <path d="M${l0[0]} ${l0[1]} L${l1[0]} ${l1[1]}" fill="none" stroke="${C.stroke}" stroke-width="${sw}" stroke-linecap="round"/>\n` +
      `  <path d="M${r0[0]} ${r0[1]} L${r1[0]} ${r1[1]}" fill="none" stroke="${C.stroke}" stroke-width="${sw}" stroke-linecap="round"/>`,
    tip: [r(ex), r(ey)],
    edge: [l1[0], l1[1], r1[0], r1[1]],
    l0,
    r0,
    diameter: r(hwBot * 2),
  };
}

function drawAngledStopcock(cx, cy, ux, uy, opts = {}) {
  // Draws a compact PTFE stopcock perpendicular to tube direction (ux, uy)
  const w = opts.w || 20;
  const h = opts.h || 8.5;
  const handleColor = opts.teal ? C.teal : C.red;
  // Axis along plug (perp to tube)
  const px = -uy;
  const py = ux;
  // Axis along tube
  const qx = ux;
  const qy = uy;
  const pt = (alongPlug, alongTube) => `${r(cx + px * alongPlug + qx * alongTube)},${r(cy + py * alongPlug + qy * alongTube)}`;
  const body = `<polygon points="${pt(-w / 2, -h / 2)} ${pt(w / 2, -h / 2 + 1)} ${pt(w / 2, h / 2 - 1)} ${pt(-w / 2, h / 2)}" fill="${C.ptfe}" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>`;
  const key = `<polygon points="${pt(-w / 2 - 7, -6)} ${pt(-w / 2, -6)} ${pt(-w / 2, 6)} ${pt(-w / 2 - 7, 6)}" fill="${handleColor}" stroke="${C.stroke}" stroke-width="1.8" stroke-linejoin="round"/>`;
  const nut = `<polygon points="${pt(w / 2, -3.5)} ${pt(w / 2 + 4.5, -3.5)} ${pt(w / 2 + 4.5, 3.5)} ${pt(w / 2, 3.5)}" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.6" stroke-linejoin="round"/>`;
  return `<g>${body}${key}${nut}</g>`;
}

function openTubeWall(d, strokeW, innerFill = '#FFFFFF', cap = 'butt') {
  return (
    `<path d="${d}" fill="none" stroke="${C.stroke}" stroke-width="${r(strokeW)}" stroke-linecap="${cap}" stroke-linejoin="round"/>\n` +
    `  <path d="${d}" fill="none" stroke="${innerFill}" stroke-width="${r(Math.max(1.5, strokeW - 5.2))}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
  );
}

function renderBeakerOrTank(id) {
  const glassStroke = `stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"`;
  if (id === 'tank') {
    return (
      `<path d="M22 92 Q50 88 78 92 T132 92 V178 H22 Z" fill="${C.coolantLight}" stroke="none"/>\n` +
      `  <path d="M22 92 Q50 88 78 92 T132 92" fill="none" stroke="${C.teal}" stroke-width="1.6" stroke-linecap="round"/>\n` +
      `  <path d="M16 34 Q21 35 21 41 V174 Q21 180 27 180 H127 Q133 180 133 174 V41 Q133 35 137 34" fill="none" ${glassStroke}/>`
    );
  }
  if (id === 'tlc-chamber') {
    return (
      `<path d="M22 144 H132 V175 Q132 180 127 180 H27 Q22 180 22 175 Z" fill="${C.coolantLight}" stroke="none"/>\n` +
      `  <line x1="22" y1="144" x2="132" y2="144" stroke="${C.teal}" stroke-width="1.6"/>\n` +
      `  <polygon points="50,62 96,58 104,168 58,170" fill="#F8FAF9" stroke="${C.inner}" stroke-width="1.7" stroke-linejoin="round"/>\n` +
      `  <line x1="57" y1="152" x2="102" y2="150" stroke="${C.muted}" stroke-width="1.1" stroke-dasharray="3 2.5"/>\n` +
      `  <line x1="53" y1="84" x2="98" y2="81" stroke="${C.teal}" stroke-width="1.1" stroke-dasharray="3 2.5"/>\n` +
      `  <circle cx="68" cy="126" r="3.6" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.2"/>\n` +
      `  <circle cx="84" cy="98" r="3.8" fill="${C.amberMid}" stroke="${C.stroke}" stroke-width="1.2"/>\n` +
      `  <circle cx="67" cy="151" r="2.2" fill="${C.muted}" stroke="none"/>\n` +
      `  <circle cx="87" cy="150" r="2.2" fill="${C.muted}" stroke="none"/>\n` +
      `  <path d="M16 34 Q21 35 21 41 V174 Q21 180 27 180 H127 Q133 180 133 174 V41 Q133 35 137 34" fill="none" ${glassStroke}/>`
    );
  }
  if (id === 'calorimetry-cup') {
    // Open double-walled insulated calorimeter cup (flared open collar, zero closed box lid)
    return (
      `<path d="M38 42 L48 171 Q48 179 56 179 H108 Q116 179 116 171 L126 42" fill="none" stroke="${C.inner}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <path d="M29.5 34 Q33 35 34 42 L44 174 Q45 181 54 181 H110 Q119 181 120 174 L130 42 Q131 35 134.5 34" fill="none" ${glassStroke}/>\n` +
      `  <path d="M38 42 H126" fill="none" stroke="${HINT_ARC}" stroke-width="1.5" stroke-linecap="round"/>`
    );
  }
  if (id === 'displacement-beaker' || id === 'eureka') {
    const isEureka = id === 'eureka';
    const waterDash = !isEureka
      ? `<path d="M28 66 H134" fill="none" stroke="${C.teal}" stroke-width="1.4" stroke-dasharray="4 3"/>`
      : '';
    // Open top flared rim + open-bore angled overflow spout with NO top horizontal bar and NO vertical bar across spout
    const outerGlass = isEureka
      ? `<path d="M16 34 L27 42 V167 Q27 179 40 179 H122 Q134 179 134 167 V71 L150 91 M156 86 L134 58 V38 Q134 35 137 34" fill="none" ${glassStroke}/>`
      : `<path d="M16 34 L27 42 V167 Q27 179 40 179 H122 Q134 179 134 167 V72 L152 83 M158 75 L134 61 V38 Q134 35 137 34" fill="none" ${glassStroke}/>`;
    const ticks = gradTicks(123, 76, 154, 6, 2, 11, { dir: -1 });
    return `${outerGlass}\n  ${waterDash}\n  ${ticks}`;
  }
  // Standard open beaker: outward pouring spout lip (16,34) -> round corners -> open right flared rim (137,34), NO horizontal closing bar
  return (
    `<path d="M16 34 L27 42 V167 Q27 179 40 179 H122 Q134 179 134 167 V39 Q134 35 137 34" fill="none" ${glassStroke}/>\n` +
    `  ${gradTicks(123, 66, 156, 7, 2, 12, { dir: -1 })}`
  );
}

function registerContainers(register) {
  const defs = [
    ['beaker', '烧杯', 'beaker', { contentsSeat: true }],
    ['displacement-beaker', '溢流杯', 'displacement beaker', { angledSpout: 'disp' }],
    ['eureka', '排水罐', 'eureka', { angledSpout: 'eureka' }],
    ['tank', '水槽', 'tank', {}],
    ['tlc-chamber', '展开缸', 'tlc chamber', {}],
  ];
  for (const [id, name, search, cfg] of defs) {
    const ports = [
      { id: 'mouth', x: 76.5, y: 34, dx: 0, dy: -1, type: 'mouth', diameter: 121, depth: 25, target: [82, 150], edge: [16, 34, 137, 34] },
    ];
    if (cfg.angledSpout === 'disp') {
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
    } else if (cfg.angledSpout === 'eureka') {
      ports.push({
        id: 'outlet',
        x: 153,
        y: 88.5,
        dx: 0.625,
        dy: 0.781,
        type: 'tube',
        diameter: 8,
        edge: [156, 86, 150, 91],
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
      `<path d="M12 22 Q80 68 148 22" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <path d="M15 22 Q80 35 145 22" fill="none" stroke="${C.inner}" stroke-width="1.5" stroke-linecap="round"/>`,
    ports: [{ id: 'base', x: 80, y: 48, dx: 0, dy: 1, type: 'base', diameter: 0 }],
  });

  register('stemmed-glass', '高脚杯', '容器', {
    width: 160, height: 200, search: 'stemmed glass',
    svg:
      `<path d="M24 18 Q80 12 136 18" fill="none" stroke="${C.muted}" stroke-width="1.4" stroke-linecap="round"/>\n` +
      `  <path d="M24 18 C25 96 55 112 80 112 C105 112 135 96 136 18" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linejoin="round" stroke-linecap="round"/>\n` +
      `  <path d="M24 18 Q80 24 136 18" fill="none" stroke="${C.inner}" stroke-width="1.4" stroke-linecap="round"/>\n` +
      `  <line x1="80" y1="112" x2="80" y2="177" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round"/>\n` +
      `  <ellipse cx="80" cy="182" rx="43" ry="6" fill="none" stroke="${C.stroke}" stroke-width="2.5"/>`,
    ports: [{ id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 }],
  });

  // 9-10. Conical flasks (160x200) — bold Erlenmeyer silhouettes, open flared lips, horizontal open-bore barb
  for (const [id, name, hasArm] of [
    ['conical-flask', '锥形瓶', false],
    ['conical-flask-with-side-arm', '侧支锥形瓶', true],
  ]) {
    const ports = [
      { id: 'mouth', x: 80, y: 12, dx: 0, dy: -1, type: 'mouth', diameter: 36, depth: 24, target: [80, 146], edge: [62, 12, 98, 12] },
    ];
    let body = '';
    if (hasArm) {
      const horizBarb = oliveBarb(id, 95, 40, 1, 47, 5.0, 4.5);
      const openBarbPath =
        `M62 12 Q65 13 65 20 V55 L20 166 Q16 180 32 180 H128 Q144 180 140 166 L95 55 V45 ` +
        `L125.3 44.4 L127.3 46.3 L142 44.5 M142 35.5 L127.3 33.7 L125.3 35.6 L95 35 V20 Q95 13 98 12`;
      body =
        `<path d="${openBarbPath}" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linejoin="round" stroke-linecap="round"/>\n` +
        `  <path d="M66 20 Q80 23 94 20" fill="none" stroke="${HINT_ARC}" stroke-width="1.5" stroke-linecap="round"/>\n` +
        `  ${gradTicks(124, 114, 158, 4, 2, 12, { dir: -1 })}`;
      ports.push({ ...horizBarb.port, id: 'outlet', type: 'tube' });
    } else {
      ports.push({ id: 'contents-seat', x: 80, y: 165, dx: 0, dy: -1, type: 'contents-seat', diameter: 0 });
      body =
        `<path d="M62 12 Q65 13 65 20 V55 L20 166 Q16 180 32 180 H128 Q144 180 140 166 L95 55 V20 Q95 13 98 12" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linejoin="round" stroke-linecap="round"/>\n` +
        `  <path d="M66 20 Q80 23 94 20" fill="none" stroke="${HINT_ARC}" stroke-width="1.5" stroke-linecap="round"/>\n` +
        `  ${gradTicks(124, 114, 158, 4, 2, 12, { dir: -1 })}`;
    }
    ports.push({ id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 });
    register(id, name, '容器', { width: 160, height: 200, svg: body, ports });
  }

  // 11-12. Test tubes (70x200) — bold glassSw, open flared top, open-bore horizontal sidearm
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
        `<path d="M20 12 Q22 13 22 19 V160 A13 13 0 0 0 48 160 V49 H67 M67 43 H48 V19 Q48 13 50 12" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linejoin="round" stroke-linecap="round"/>`;
    } else {
      body =
        `<path d="M20 12 Q22 13 22 19 V160 A13 13 0 0 0 48 160 V19 Q48 13 50 12" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linejoin="round" stroke-linecap="round"/>`;
    }
    register(id, name, '容器', { width: 70, height: 200, svg: body, ports });
  }

  // 13. Round-bottom flask (1, 2, 3, 4 necks): huge bold spherical globe (cx=80, cy=120, R=62) + short sturdy wide flared necks
  function buildRbfSphere({ necks }) {
    const cx0 = 80;
    const cy0 = 120;
    const R = 62;

    const geom = necks.map((n) => {
      const a = rad(n.deg);
      const ux = Math.sin(a);
      const uy = -Math.cos(a);
      const tx = Math.cos(a);
      const ty = Math.sin(a);
      const hw = n.hw;
      const lipHw = n.lipHw;
      const sTop = R + n.height;
      const sBase = Math.sqrt(R * R - hw * hw);
      const P = (s, w) => [r(cx0 + ux * s + tx * w), r(cy0 + uy * s + ty * w)];
      const LT = P(sTop, -lipHw);
      const RT = P(sTop, lipHw);
      const LF = P(sTop - 4.5, -hw);
      const RF = P(sTop - 4.5, hw);
      const LC = P(sTop - 1.0, -hw);
      const RC = P(sTop - 1.0, hw);
      const LB = P(sBase, -hw);
      const RB = P(sBase, hw);
      const H0 = P(sBase + 3.0, -hw + 2.2);
      const HC = P(sBase + 0.5, 0);
      const H1 = P(sBase + 3.0, hw - 2.2);
      const mx = r(cx0 + ux * sTop);
      const my = r(cy0 + uy * sTop);
      const target = [r(mx - ux * 104), r(my - uy * 104)];
      return { id: n.id, ux: r(ux), uy: r(uy), mx, my, lipW: r(lipHw * 2), depth: n.depth ?? 22, edge: [LT[0], LT[1], RT[0], RT[1]], target, LT, RT, LF, RF, LC, RC, LB, RB, H0, HC, H1 };
    });

    const first = geom[0];
    const last = geom[geom.length - 1];
    // Continuous outer contour: leftmost lip -> down wall -> counter-clockwise giant sphere belly -> up rightmost wall -> rightmost lip
    const outerPath =
      `<path d="M${first.LT[0]} ${first.LT[1]} Q${first.LC[0]} ${first.LC[1]} ${first.LF[0]} ${first.LF[1]} ` +
      `L${first.LB[0]} ${first.LB[1]} ` +
      `A${R} ${R} 0 1 0 ${last.RB[0]} ${last.RB[1]} ` +
      `L${last.RF[0]} ${last.RF[1]} Q${last.RC[0]} ${last.RC[1]} ${last.RT[0]} ${last.RT[1]}" ` +
      `fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>`;

    let bridges = '';
    for (let i = 0; i < geom.length - 1; i++) {
      const leftN = geom[i];
      const rightN = geom[i + 1];
      bridges +=
        `\n  <path d="M${leftN.RT[0]} ${leftN.RT[1]} Q${leftN.RC[0]} ${leftN.RC[1]} ${leftN.RF[0]} ${leftN.RF[1]} ` +
        `L${leftN.RB[0]} ${leftN.RB[1]} ` +
        `A${R} ${R} 0 0 1 ${rightN.LB[0]} ${rightN.LB[1]} ` +
        `L${rightN.LF[0]} ${rightN.LF[1]} Q${rightN.LC[0]} ${rightN.LC[1]} ${rightN.LT[0]} ${rightN.LT[1]}" ` +
        `fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }

    const hintArcs = geom.map((g) =>
      `<path d="M${g.H0[0]} ${g.H0[1]} Q${g.HC[0]} ${g.HC[1]} ${g.H1[0]} ${g.H1[1]}" fill="none" stroke="${HINT_ARC}" stroke-width="1.6" stroke-linecap="round"/>`
    ).join('\n  ');

    const ports = geom.map((g) => ({
      id: g.id,
      x: g.mx,
      y: g.my,
      dx: g.ux,
      dy: g.uy,
      type: 'glass-female',
      diameter: g.lipW,
      depth: g.depth,
      target: g.target,
      edge: g.edge,
    }));
    ports.push({ id: 'contents-seat', x: 80, y: 166, dx: 0, dy: -1, type: 'contents-seat', diameter: 0 });

    return { svg: `${outerPath}${bridges}\n  ${hintArcs}`, ports };
  }

  const rbf1 = buildRbfSphere({
    necks: [{ id: 'mouth', deg: 0, height: 36, hw: 13.5, lipHw: 17, depth: 25 }],
  });
  rbf1.ports.push({ id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 });

  const rbf2 = buildRbfSphere({
    necks: [
      { id: 'mouth', deg: 0, height: 33, hw: 11.5, lipHw: 14.5 },
      { id: 'mouth-2', deg: 36, height: 29, hw: 9.5, lipHw: 12 },
    ],
  });

  const rbf3 = buildRbfSphere({
    necks: [
      { id: 'mouth', deg: -38, height: 29, hw: 9, lipHw: 11.5 },
      { id: 'mouth-2', deg: 0, height: 33, hw: 10.5, lipHw: 13.5 },
      { id: 'mouth-3', deg: 38, height: 29, hw: 9, lipHw: 11.5 },
    ],
  });

  const rbf4 = buildRbfSphere({
    necks: [
      { id: 'mouth', deg: -43.5, height: 27, hw: 8.4, lipHw: 10.2 },
      { id: 'mouth-2', deg: -14.5, height: 27, hw: 8.4, lipHw: 10.2 },
      { id: 'mouth-3', deg: 14.5, height: 27, hw: 8.4, lipHw: 10.2 },
      { id: 'mouth-4', deg: 43.5, height: 27, hw: 8.4, lipHw: 10.2 },
    ],
  });

  register('round-bottom-flask', '圆底烧瓶', '容器', {
    width: 160, height: 200, neckCount: 1,
    svg: rbf1.svg,
    ports: rbf1.ports,
    variants: [
      { neckCount: 2, width: 160, height: 200, svg: rbf2.svg, ports: rbf2.ports },
      { neckCount: 3, width: 160, height: 200, svg: rbf3.svg, ports: rbf3.ports },
      { neckCount: 4, width: 160, height: 200, svg: rbf4.svg, ports: rbf4.ports },
    ],
  });

  // 14. Boiling flask (bold R=60 circular dome + flat bottom chord + sturdy open flared vertical neck)
  register('boiling-flask', '平底烧瓶', '容器', {
    width: 160, height: 200, neckCount: 1,
    svg:
      `<path d="M61 12 Q65 13 65 20 V67 A60 60 0 0 0 44 172 Q49 181 58 181 H102 Q111 181 116 172 A60 60 0 0 0 95 67 V20 Q95 13 99 12" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <path d="M67 68 Q80 65 93 68" fill="none" stroke="${HINT_ARC}" stroke-width="1.6" stroke-linecap="round"/>`,
    ports: [
      { id: 'mouth', x: 80, y: 12, dx: 0, dy: -1, type: 'glass-female', diameter: 38, depth: 25, target: [80, 140], edge: [61, 12, 99, 12] },
      { id: 'contents-seat', x: 80, y: 166, dx: 0, dy: -1, type: 'contents-seat', diameter: 0 },
      { id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });

  // 15. Distillation flask (bold R=52 sphere + sturdy flared open tall neck + long ~17° downward-sloping open-bore sidearm)
  {
    const id = 'distillation-flask';
    const ox = 148;
    const oy = 62;
    const ux = 0.956;
    const uy = 0.292;
    const bx = ox - uy * 5;
    const by = oy + ux * 5;
    const tx = ox + uy * 5;
    const ty = oy - ux * 5;
    const mainAndBotArm =
      `M61 12 Q65 13 66 20 V80 A52 52 0 1 0 94 80 V51 L${r(bx)} ${r(by)}`;
    const topRightAndTopArm =
      `M99 12 Q95 13 94 20 V41 L${r(tx)} ${r(ty)}`;
    const svg =
      `<path d="${mainAndBotArm}" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <path d="${topRightAndTopArm}" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <path d="M68 81 Q80 78 92 81" fill="none" stroke="${HINT_ARC}" stroke-width="1.5" stroke-linecap="round"/>`;
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
          segment: [ox, oy, r(ox - ux * 38), r(oy - uy * 38)],
          edge: [r(tx), r(ty), r(bx), r(by)],
        },
        { id: 'contents-seat', x: 80, y: 166, dx: 0, dy: -1, type: 'contents-seat', diameter: 0 },
        { id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 },
      ],
    });
  }

  // 16. Schlenk flask (bold R=50 spherical globe + open flared neck + ~40° upward-angled open-bore sidearm + inline PTFE stopcock)
  {
    const id = 'schlenk-flask';
    const cx0 = 64, cy0 = 132, R = 50;
    // Arm starts from neck/shoulder around (77, 74) and rises along ~40 deg above horizontal: ux=0.766, uy=-0.643
    const ux = 0.766, uy = -0.643;
    const armLen = 78;
    const jx = 80, jy = 78;
    const tipX = r(jx + ux * armLen); // ~139.7
    const tipY = r(jy + uy * armLen); // ~27.8
    const hwArm = 5.2;
    const p = (along, perp) => [r(jx + ux * along - uy * perp), r(jy + uy * along + ux * perp)];
    const u0 = p(0, -hwArm);
    const l0 = p(4, hwArm);
    const uTip = p(armLen, -hwArm);
    const lTip = p(armLen, hwArm);
    const midArm = p(armLen * 0.48, 0);

    const svg =
      `<path d="M47 12 Q51 13 51 20 V83.7 A${R} ${R} 0 1 0 ${l0[0]} ${l0[1]} L${lTip[0]} ${lTip[1]}" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <path d="M81 12 Q77 13 77 20 V68 L${uTip[0]} ${uTip[1]}" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <path d="M53 84 Q64 81 75 84" fill="none" stroke="${HINT_ARC}" stroke-width="1.5" stroke-linecap="round"/>\n` +
      `  ${drawAngledStopcock(midArm[0], midArm[1], ux, uy, { w: 20, h: 8.5, teal: true })}`;

    register(id, '施伦克瓶', '容器', {
      width: 160, height: 200, neckCount: 1, svg,
      ports: [
        { id: 'mouth', x: cx0, y: 12, dx: 0, dy: -1, type: 'glass-female', diameter: 34, depth: 25, target: [cx0, 140], edge: [47, 12, 81, 12] },
        { id: 'outlet', x: tipX, y: tipY, dx: ux, dy: uy, type: 'tube', diameter: r(hwArm * 2), edge: [uTip[0], uTip[1], lTip[0], lTip[1]] },
        { id: 'contents-seat', x: cx0, y: 166, dx: 0, dy: -1, type: 'contents-seat', diameter: 0 },
        { id: 'base', x: cx0, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 },
      ],
    });
  }

  // 17. Volumetric flask (tall slender neck ~45% height, crisp teal meniscus line, flat-bottom pear belly, bold glassSw)
  register('volumetric-flask', '容量瓶', '容器', {
    width: 160, height: 200, neckCount: 1,
    svg:
      `<path d="M69 12 Q72 13 72 19 V98 C30 124 30 164 52 181 H108 C130 164 130 124 88 98 V19 Q88 13 91 12" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linejoin="round" stroke-linecap="round"/>\n` +
      `  <line x1="71" y1="56" x2="89" y2="56" stroke="${C.teal}" stroke-width="2.0" stroke-linecap="round"/>`,
    ports: [
      { id: 'mouth', x: 80, y: 12, dx: 0, dy: -1, type: 'glass-female', diameter: 22, depth: 25, target: [80, 144], edge: [69, 12, 91, 12] },
      { id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });

  // 18. Pycnometer (sleek conical-pear belly + crisp open flared neck + bold glassSw)
  register('pycnometer', '比重瓶', '容器', {
    width: 160, height: 200, neckCount: 1,
    svg:
      `<path d="M61 12 Q65 13 66 20 V54 C28 88 26 164 48 181 H112 C134 164 132 88 94 54 V20 Q95 13 99 12" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linejoin="round" stroke-linecap="round"/>\n` +
      `  <path d="M67 54 Q80 57 93 54" fill="none" stroke="${HINT_ARC}" stroke-width="1.5" stroke-linecap="round"/>\n` +
      `  <line x1="80" y1="30" x2="80" y2="112" stroke="${C.muted}" stroke-width="1.3" stroke-dasharray="4 3"/>`,
    ports: [
      { id: 'mouth', x: 80, y: 12, dx: 0, dy: -1, type: 'glass-female', diameter: 38, depth: 25, target: [80, 140], edge: [61, 12, 99, 12] },
      { id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });

  // 19. Gas jar (open flared ground flange cylinder, stepped flanged foot, bold glassSw, zero horizontal top bar)
  register('gas-jar', '集气瓶', '容器', {
    width: 160, height: 200,
    svg:
      `<path d="M38 14 Q42 15 43 21 V174 L35 181 H125 L117 174 V21 Q118 15 122 14" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linejoin="round" stroke-linecap="round"/>\n` +
      `  <line x1="44" y1="173" x2="116" y2="173" stroke="${C.inner}" stroke-width="1.4"/>`,
    ports: [
      { id: 'mouth', x: 80, y: 14, dx: 0, dy: -1, type: 'mouth', diameter: 84, depth: 24, target: [80, 144], edge: [38, 14, 122, 14] },
      { id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });

  // 20-23. Reagent bottle, Bottle (amber), Thermos (double-wall Dewar), Wash-bottle (160x200)
  for (const [id, name, mode] of [
    ['reagent-bottle', '试剂瓶', 'clear'],
    ['bottle', '玻璃瓶', 'amber'],
    ['thermos', '真空保温瓶', 'dewar'],
    ['wash-bottle', '洗瓶', 'wash'],
  ]) {
    const isAmber = mode === 'amber';
    const isDewar = mode === 'dewar';
    const isWash = mode === 'wash';
    const fill = isAmber ? C.amberLight : 'none';
    let svg = '';
    if (mode === 'clear' || isAmber) {
      svg =
        `<path d="M60 14 Q63 15 63 22 V46 Q29 58 29 82 V171 Q29 182 41 182 H119 Q131 182 131 171 V82 Q131 58 97 46 V22 Q97 15 100 14" fill="${fill}" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linejoin="round" stroke-linecap="round"/>\n` +
        `  <path d="M64 23 Q80 26 96 23" fill="none" stroke="${HINT_ARC}" stroke-width="1.5" stroke-linecap="round"/>\n` +
        `  <rect x="46" y="92" width="68" height="44" rx="2.5" fill="#FFFFFF" stroke="${C.inner}" stroke-width="1.4"/>\n` +
        `  <line x1="56" y1="108" x2="104" y2="108" stroke="${C.muted}" stroke-width="1.2"/>\n` +
        `  <line x1="56" y1="120" x2="96" y2="120" stroke="${C.muted}" stroke-width="1.2"/>`;
    } else if (isDewar) {
      // Double-walled glass vacuum Dewar flask matching chemix proportions
      svg =
        `<path d="M60 14 Q63 15 63 22 V42 Q40 52 40 72 V146 A40 40 0 0 0 120 146 V72 Q120 52 97 42 V22 Q97 15 100 14" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linejoin="round" stroke-linecap="round"/>\n` +
        `  <path d="M68 20 V47 Q50 56 50 74 V146 A30 30 0 0 0 110 146 V74 Q110 56 92 47 V20" fill="none" stroke="${C.inner}" stroke-width="1.8" stroke-linecap="round"/>`;
    } else {
      svg =
        `<path d="M80 168 V11 Q80 6 86 6 H124 L137 19" fill="none" stroke="${C.stroke}" stroke-width="7.2" stroke-linecap="butt" stroke-linejoin="round"/>\n` +
        `  <path d="M80 168 V11 Q80 6 86 6 H124 L138 20" fill="none" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="butt" stroke-linejoin="round"/>\n` +
        `  <path d="M139 16.5 L152.5 26.5 M145.5 33.5 L134 22" fill="none" stroke="${C.stroke}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>\n` +
        `  <path d="M60 28 V46 Q29 58 29 82 V171 Q29 182 41 182 H119 Q131 182 131 171 V82 Q131 58 100 46 V28" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linejoin="round" stroke-linecap="round"/>\n` +
        `  <line x1="80" y1="45" x2="80" y2="168" stroke="${C.inner}" stroke-width="2.2" stroke-linecap="round"/>\n` +
        `  <rect x="57" y="14" width="46" height="14" rx="2.5" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.4"/>`;
    }
    const ports = [
      { id: 'mouth', x: 80, y: 14, dx: 0, dy: -1, type: 'mouth', diameter: 40, depth: 24, target: [80, 144], edge: [60, 14, 100, 14] },
    ];
    if (isWash) {
      ports.push({ id: 'outlet', x: 149, y: 30, dx: 0.707, dy: 0.707, type: 'tube', diameter: 10, edge: [145.5, 33.5, 152.5, 26.5] });
    }
    ports.push({ id: 'base', x: 80, y: 182, dx: 0, dy: 1, type: 'base', diameter: 0 });
    register(id, name, '容器', { width: 160, height: 200, svg, ports });
  }
}

function registerTubing(register) {
  function endsToPorts(ends, wOuter, hwEdge, portType) {
    return ends.map(([x, y, dx, dy], i) => {
      const mag = Math.hypot(dx, dy) || 1;
      const ux = dx / mag;
      const uy = dy / mag;
      const tx = -uy;
      const ty = ux;
      return {
        id: i === 0 ? 'inlet' : i === 1 ? 'outlet' : `branch-${i}`,
        x,
        y,
        dx,
        dy,
        type: portType,
        diameter: wOuter,
        segment: [r(x - ux * 5), r(y - uy * 5), r(x - ux * 35), r(y - uy * 35)],
        edge: [r(x - tx * hwEdge), r(y - ty * hwEdge), r(x + tx * hwEdge), r(y + ty * hwEdge)],
      };
    });
  }

  for (const [id, name, w, cap] of [
    ['tube', '直玻璃管', 20, false],
    ['capillary-tube', '毛细管', 12, true],
  ]) {
    const hw = w / 2;
    const svg =
      `<path d="M${70 - hw} 10 V165 M${70 + hw} 10 V165" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round"/>` +
      (cap ? `\n  <line x1="70" y1="12" x2="70" y2="163" stroke="${C.inner}" stroke-width="2.0" stroke-linecap="round"/>` : '');
    register(id, name, '导管', {
      width: 140, height: 180, svg,
      ports: endsToPorts([[70, 10, 0, -1], [70, 165, 0, 1]], w, hw, 'tube'),
    });
  }

  const curves = [
    ['tube-bend', '90° 弯管', 'M18 155 H88 Q120 155 120 123 V12', [[18, 155, -1, 0], [120, 12, 0, -1]], 20],
    ['s-bent-tube', 'S 形管', 'M100 12 V45 C100 86 40 84 40 127 V166', [[100, 12, 0, -1], [40, 166, 0, 1]], 20],
    ['u-bent-tube', 'U 形管', 'M35 12 V130 A35 35 0 0 0 105 130 V12', [[35, 12, 0, -1], [105, 12, 0, -1]], 20],
  ];
  for (const [id, name, d, ends, w] of curves) {
    // openTubeWall(d, 20): outer stroke=20 (r=10), inner erase=14.8 (r=7.4) -> wall center at r=8.7! Open ends, zero end-cap lines.
    const ports = endsToPorts(ends, w, 8.7, 'tube');
    if (id === 'tube-bend') {
      ports[0].segment = [18, 155, 86, 155];
      ports[1].segment = [120, 12, 120, 118];
    }
    register(id, name, '导管', {
      width: 140, height: 180,
      svg: openTubeWall(d, w, '#FFFFFF', 'butt'),
      ports,
    });
  }

  // Salt bridge (agar-KCl translucent teal gel inside open U-tube)
  {
    const id = 'salt-bridge';
    const d = 'M35 12 V130 A35 35 0 0 0 105 130 V12';
    const ends = [[35, 12, 0, -1], [105, 12, 0, -1]];
    const svg =
      `${openTubeWall(d, 20, C.coolantLight, 'butt')}\n` +
      `  <rect x="29" y="14" width="12" height="7" rx="1.5" fill="#FFFFFF" stroke="${C.inner}" stroke-width="1.2"/>\n` +
      `  <rect x="99" y="14" width="12" height="7" rx="1.5" fill="#FFFFFF" stroke="${C.inner}" stroke-width="1.2"/>`;
    register(id, '盐桥', '导管', { width: 140, height: 180, svg, ports: endsToPorts(ends, 20, 8.7, 'tube') });
  }

  // Rubber hose (flat slate)
  {
    const id = 'rubber-tube';
    const d = 'M16 32 C118 4 20 145 122 152';
    const ends = [[16, 32, -1, 0], [122, 152, 1, 0]];
    const svg =
      `${openTubeWall(d, 20, C.rubberMid)}\n` +
      `  <rect x="14" y="21" width="7" height="22" rx="2" fill="${C.rubberTop}" stroke="${C.stroke}" stroke-width="2.2"/>\n` +
      `  <rect x="117" y="141" width="7" height="22" rx="2" fill="${C.rubberTop}" stroke="${C.stroke}" stroke-width="2.2"/>`;
    register(id, '橡胶软管', '导管', { width: 140, height: 180, svg, ports: endsToPorts(ends, 20, 8.7, 'hose') });
  }

  // Tube adapter (140x180, open wide top + narrow open bottom)
  register('tube-adapter', '变径接头', '导管', {
    width: 140, height: 180,
    svg:
      `<path d="M51 12 Q53 13 53 19 V70 L62 105 V165 M78 165 V105 L87 70 V19 Q87 13 89 12" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linejoin="round" stroke-linecap="round"/>`,
    ports: [
      { id: 'inlet', x: 70, y: 12, dx: 0, dy: -1, type: 'tube', diameter: 34, edge: [53, 12, 87, 12] },
      { id: 'outlet', x: 70, y: 165, dx: 0, dy: 1, type: 'tube', diameter: 16, edge: [62, 165, 78, 165] },
    ],
  });

  // 3-way-crossing (open 4-way fused glass cross)
  {
    const ends = [[20, 75, -1, 0], [120, 75, 1, 0], [70, 12, 0, -1], [70, 165, 0, 1]];
    const svg =
      `<path d="M60 12 V65 H20 M80 12 V65 H120 M20 85 H60 V165 M120 85 H80 V165" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>`;
    register('3-way-crossing', '交叉导管', '导管', { width: 140, height: 180, svg, ports: endsToPorts(ends, 20, 10, 'tube') });
  }
}

function registerCondensersAndDistillation(register) {
  // 33-35. Water condensers (92x354): bold glassSw contours, open flared female joint, opposite coolant barbs
  for (const [id, name] of [
    ['liebig-condenser', '直形冷凝管'],
    ['allihn', '球形冷凝管'],
    ['graham', '蛇形冷凝管'],
  ]) {
    const cx = 46;
    const jTop = 58;
    const jBot = 292;
    const jHw = 17;
    const inBarb = oliveBarb(id, cx - jHw, 266, -1, 23, 5.2, 4.4);
    const outBarb = oliveBarb(id, cx + jHw, 84, 1, 23, 5.2, 4.4);

    const outerWall =
      `<path d="M${cx - 8.5} 28 V48 C${cx - 8.5} 54 ${cx - jHw} 54 ${cx - jHw} ${jTop + 10} V${jBot - 10} ` +
      `C${cx - jHw} ${jBot} ${cx - 8.5} ${jBot} ${cx - 8.5} ${jBot + 8} V326 M${cx + 8.5} 326 V${jBot + 8} ` +
      `C${cx + 8.5} ${jBot} ${cx + jHw} ${jBot} ${cx + jHw} ${jBot - 10} V${jTop + 10} ` +
      `C${cx + jHw} 54 ${cx + 8.5} 54 ${cx + 8.5} 48 V28" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>`;

    let innerBody = '';
    if (id === 'liebig-condenser') {
      innerBody =
        `<line x1="${cx - 6}" y1="28" x2="${cx - 6}" y2="326" stroke="${C.inner}" stroke-width="1.8"/>\n` +
        `  <line x1="${cx + 6}" y1="28" x2="${cx + 6}" y2="326" stroke="${C.inner}" stroke-width="1.8"/>`;
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
        dL += ` C${cx - 6} ${r(y0 + step * 0.16)} ${cx - 13.5} ${r(y0 + step * 0.22)} ${cx - 13.5} ${r(ym)} C${cx - 13.5} ${r(y1 - step * 0.22)} ${cx - 6} ${r(y1 - step * 0.16)} ${cx - 6} ${r(y1)}`;
        dR += ` C${cx + 6} ${r(y0 + step * 0.16)} ${cx + 13.5} ${r(y0 + step * 0.22)} ${cx + 13.5} ${r(ym)} C${cx + 13.5} ${r(y1 - step * 0.22)} ${cx + 6} ${r(y1 - step * 0.16)} ${cx + 6} ${r(y1)}`;
      }
      dL += ' V326';
      dR += ' V326';
      innerBody = `<path d="${dL}" fill="none" stroke="${C.inner}" stroke-width="1.8" stroke-linejoin="round"/>\n` +
        `  <path d="${dR}" fill="none" stroke="${C.inner}" stroke-width="1.8" stroke-linejoin="round"/>`;
    } else {
      const turns = 8;
      const y0 = jTop + 18;
      const y1 = jBot - 18;
      const pitch = (y1 - y0) / turns;
      const amp = 12;
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
        `<path d="${coil}" fill="none" stroke="${C.inner}" stroke-width="5.6" stroke-linecap="round" stroke-linejoin="round"/>\n` +
        `  <path d="${coil}" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
    }

    const fem = openVerticalFemaleJoint(cx, 4, 24, 9.8, 8.5, 2.2, GSW);
    const male = openVerticalMaleJoint(cx, 326, 24, 11.5, 8.8, { sw: GSW });
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
        `<path d="M37 ${y} C47 ${y + 2} 50 ${y + 4} 50 ${y + 6} C50 ${y + 8} 47 ${y + 10} 37 ${y + 12}" fill="none" stroke="${C.inner}" stroke-width="1.7" stroke-linecap="round"/>\n` +
        `<path d="M73 ${y + 9} C63 ${y + 11} 60 ${y + 13} 60 ${y + 15} C60 ${y + 17} 63 ${y + 19} 73 ${y + 21}" fill="none" stroke="${C.inner}" stroke-width="1.7" stroke-linecap="round"/>\n`;
    }
    const svg =
      `<path d="M46 32 V39 C46 45 37 46 37 54 V210 C37 218 46 219 46 225 V226 M64 226 V225 C64 219 73 218 73 210 V54 C73 46 64 45 64 39 V32" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  ${spikes}` +
      `  ${openVerticalFemaleJoint(cx, 10, 22, 8.2, 9.0, 1.8, GSW)}\n` +
      `  ${openVerticalMaleJoint(cx, 226, 22, 12, 9.8, { sw: GSW })}`;
    register(id, '分馏柱', '冷凝与蒸馏', {
      width: 110, height: 260, svg,
      ports: [
        { id: 'inlet', x: 55, y: 10, dx: 0, dy: -1, type: 'glass-female', diameter: 20, depth: 20, edge: [45, 10, 65, 10] },
        { id: 'outlet', x: 55, y: 248, dx: 0, dy: 1, type: 'glass-male', diameter: 20, depth: 22, edge: [45, 248, 65, 248] },
      ],
    });
  }

  // 37. Thiele tube (140x210 — bold wide triangular melting-point loop + open flared top rim)
  register('thiele-tube', '提勒熔点管', '冷凝与蒸馏', {
    width: 140, height: 210,
    svg:
      `<path d="M34 12 Q37 13 37 19 V162 Q37 188 57 188 Q75 188 84 176 L124 126 Q131 118 124 110 L76 68 V19 Q76 13 79 12" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linejoin="round" stroke-linecap="round"/>\n` +
      `  <path d="M76 92 L106 118 L76 144 Z" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linejoin="round"/>`,
    ports: [{ id: 'mouth', x: 56.5, y: 12, dx: 0, dy: -1, type: 'mouth', diameter: 45, edge: [34, 12, 79, 12] }],
  });

  // 38. Cold finger (140x210 — sleek round-bottom cold finger through stepped sleeve collar + concentric coolant loop)
  register('cold-finger', '冷指', '冷凝与蒸馏', {
    width: 140, height: 210,
    svg:
      `<path d="M58 10 V82 M66 10 V162 M74 10 V82 M82 10 V82" fill="none" stroke="${C.stroke}" stroke-width="2.4" stroke-linecap="round"/>\n` +
      `  <path d="M47 94 V168 A23 23 0 0 0 93 168 V94" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linejoin="round" stroke-linecap="round"/>\n` +
      `  <line x1="70" y1="94" x2="70" y2="176" stroke="${C.inner}" stroke-width="2.0" stroke-linecap="round"/>\n` +
      `  <path d="M40 82 H100 L95 96 H45 Z" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>`,
    ports: [
      { id: 'inlet', x: 62, y: 10, dx: 0, dy: -1, type: 'coolant', diameter: 8, edge: [58, 10, 66, 10] },
      { id: 'outlet', x: 78, y: 10, dx: 0, dy: -1, type: 'coolant', diameter: 8, edge: [74, 10, 82, 10] },
    ],
  });

  // 39-40. Distillation head & Claisen adapter (140x210, bold open flared female necks + open-bore 75° vapor sidearm)
  {
    const id = 'distillation-head';
    const ux = 0.94;
    const uy = 0.342;
    const arm = openAngledMaleJoint(107, 64, ux, uy, 22, 10, 7.8, GSW);
    const armTube = `<path d="M75 45 L${arm.l0[0]} ${arm.l0[1]} M75 61 L${arm.r0[0]} ${arm.r0[1]}" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round"/>`;
    const main = `<path d="M57 34 V174 M75 34 V45 M75 61 V174" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round"/>`;
    const svg =
      `${main}\n  ${armTube}\n  ${arm.svg}\n` +
      `  ${openVerticalFemaleJoint(66, 12, 22, 8.2, 9.0, 1.8, GSW)}\n` +
      `  ${openVerticalMaleJoint(66, 174, 22, 12, 9.8, { sw: GSW })}`;
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
    const ux = 0.94;
    const uy = 0.342;
    const arm = openAngledMaleJoint(120, 72, ux, uy, 19, 9.5, 7.5, GSW);
    const claisenCurve =
      `<path d="M75 110 C94 110 105 96 105 74 V34 M75 128 C102 128 119 108 119 82 L${arm.r0[0]} ${arm.r0[1]} M${arm.l0[0]} ${arm.l0[1]} L119 61 V34" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>`;
    const main = `<path d="M57 34 V174 M75 34 V110 M75 128 V174" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round"/>`;
    const svg =
      `${main}\n  ${claisenCurve}\n  ${arm.svg}\n` +
      `  ${openVerticalFemaleJoint(66, 12, 22, 8.2, 9.0, 1.8, GSW)}\n` +
      `  ${openVerticalFemaleJoint(112, 12, 22, 7.2, 7.0, 1.8, GSW)}\n` +
      `  ${openVerticalMaleJoint(66, 174, 22, 12, 9.8, { sw: GSW })}`;
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

  // 41. Dean-Stark trap (140x210 — authentic angled vapor side-tube sloping upward from lower-left male joint into upper-right graduated trap column + bottom stopcock drain)
  {
    const id = 'dean-stark-trap';
    // Lower-left male joint centered at x=26, tip at y=160 -> vapor tube rises at ~32 deg upward-right into column cx=92
    const leftX = 26;
    const colX = 92;
    const femTop = openVerticalFemaleJoint(colX, 12, 22, 9.5, 11.5, 2.5, GSW);
    const maleBot = openVerticalMaleJoint(leftX, 138, 22, 10.5, 8.2, { sw: GSW });
    const body =
      `<path d="M${leftX - 8.5} 138 V96 Q${leftX - 8.5} 82 ${leftX + 4} 75 L${colX - 11.5} 44 V34" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <path d="M${leftX + 8.5} 138 V99 L${colX - 11.5} 62 V164 Q${colX - 11.5} 174 ${colX - 3.5} 178 V204 M${colX + 3.5} 204 V178 Q${colX + 11.5} 174 ${colX + 11.5} 164 V34" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>`;
    const stopcock = drawStopcock(id, colX, 188, { w: 20, h: 8, teal: true });
    const ticks = gradTicks(colX + 9.5, 84, 158, 7, 2, 8, { dir: -1 });
    register(id, '分水器', '冷凝与蒸馏', {
      width: 140, height: 210,
      svg: `${body}\n  ${femTop}\n  ${maleBot}\n  ${ticks}\n  ${stopcock}`,
      ports: [
        { id: 'inlet', x: colX, y: 12, dx: 0, dy: -1, type: 'glass-female', diameter: 24, edge: [colX - 12, 12, colX + 12, 12] },
        { id: 'outlet', x: leftX, y: 160, dx: 0, dy: 1, type: 'glass-male', diameter: 16.4, edge: [leftX - 8.2, 160, leftX + 8.2, 160] },
        { id: 'drain', x: colX, y: 204, dx: 0, dy: 1, type: 'delivery', diameter: 7, segment: [colX, 204, colX, 186], edge: [colX - 3.5, 204, colX + 3.5, 204] },
      ],
    });
  }

  // 42. Drying tube (140x210 — open top/bottom tubes, bold spherical desiccant bulb)
  {
    const id = 'drying-tube';
    const outline =
      `<path d="M57 10 V64 C20 82 20 132 57 148 V198 M77 198 V148 C114 132 114 82 77 64 V10" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>`;
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
  // 43. Filter funnel (wide 60° open V-cone with ZERO horizontal top bar + 45° beveled drip tip)
  register('filter-funnel', '过滤漏斗', '过滤与分液', {
    width: 140, height: 210,
    svg:
      `<path d="M12 22 L62 106 V198 L78 186 V106 L128 22" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linejoin="round" stroke-linecap="round"/>`,
    ports: [
      { id: 'mouth', x: 70, y: 22, dx: 0, dy: -1, type: 'mouth', diameter: 116, edge: [12, 22, 128, 22] },
      { id: 'stem', x: 70, y: 198, dx: 0, dy: 1, type: 'stem', diameter: 16, segment: [70, 190, 70, 115], depth: 80 },
    ],
  });

  // 44. Thistle tube (open flared tulip-bulb cup curving inward into long slender open stem)
  register('thistle-tube', '长颈漏斗', '过滤与分液', {
    width: 140, height: 210,
    svg:
      `<path d="M34 15 C30 34 29 52 46 61 C59 68 63 75 63 85 V198" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linejoin="round" stroke-linecap="round"/>\n` +
      `  <path d="M106 15 C110 34 111 52 94 61 C81 68 77 75 77 85 V198" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linejoin="round" stroke-linecap="round"/>`,
    ports: [
      { id: 'mouth', x: 70, y: 15, dx: 0, dy: -1, type: 'mouth', diameter: 72, edge: [34, 15, 106, 15] },
      { id: 'stem', x: 70, y: 198, dx: 0, dy: 1, type: 'stem', diameter: 14, segment: [70, 190, 70, 115], depth: 80 },
    ],
  });

  // 45-46. Separatory funnel (broad-shouldered tapered conical pear) & Dropping funnel (cylindrical graduated)
  for (const [id, name, isGraduated] of [
    ['separatory-funnel', '分液漏斗', false],
    ['dropping-funnel', '滴液漏斗', true],
  ]) {
    const bodyLeft = isGraduated
      ? `M57 16 Q60 17 60 23 V38 Q42 46 42 56 V126 Q42 135 63 142 V198`
      : `M57 16 Q60 17 60 23 V35 C12 52 24 84 63 142 V198`;
    const bodyRight = isGraduated
      ? `M83 16 Q80 17 80 23 V38 Q98 46 98 56 V126 Q98 135 77 142 V198`
      : `M83 16 Q80 17 80 23 V35 C128 52 116 84 77 142 V198`;
    const tipCut = `<path d="M63 198 L77 190" fill="none" stroke="${C.stroke}" stroke-width="${r(GSW - 0.3)}" stroke-linecap="round"/>`;
    const ticks = isGraduated ? gradTicks(90, 60, 122, 6, 2, 10, { dir: -1 }) : '';
    const dripBulb = '';
    const hint = `<path d="M62 28 Q70 31 78 28" fill="none" stroke="${HINT_ARC}" stroke-width="1.5" stroke-linecap="round"/>`;
    const svg =
      `<path d="${bodyLeft}" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linejoin="round" stroke-linecap="round"/>\n` +
      `  <path d="${bodyRight}" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linejoin="round" stroke-linecap="round"/>\n` +
      `  ${tipCut}\n  ${hint}\n  ${ticks}\n  ${dripBulb}\n` +
      `  ${drawStopcock(id, 70, 158, { w: 22, h: 9, teal: !isGraduated })}`;
    register(id, name, '过滤与分液', {
      width: 140, height: 210, svg,
      ports: [
        { id: 'mouth', x: 70, y: 16, dx: 0, dy: -1, type: 'glass-female', diameter: 26, edge: [57, 16, 83, 16] },
        { id: 'stem', x: 70, y: 198, dx: 0, dy: 1, type: 'stem', diameter: 14, segment: [70, 190, 70, 115], depth: 80 },
      ],
    });
  }
}

function registerMeasuring(register) {
  register('cylinder', '量筒', '测量', {
    width: 80, height: 260,
    svg:
      `<path d="M20 12 L24 18 V228 H56 V17 Q56 13 58 12" fill="none" stroke="${C.stroke}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>\n` +
      `  <path d="M12 246 Q12 238 23 234 L26 228 H54 L57 234 Q68 238 68 246 Z" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.5" stroke-linejoin="round"/>\n` +
      `  <line x1="12" y1="248" x2="68" y2="248" stroke="${C.stroke}" stroke-width="2.5" stroke-linecap="round"/>\n` +
      `  ${gradTicks(55, 34, 214, 15, 3, 9, { dir: -1 })}\n` +
      `  ${labelText(43, 36.5, '100', 6.4, C.tick, 'end', false)}\n` +
      `  ${labelText(43, 113.5, '50', 6.4, C.tick, 'end', false)}\n` +
      `  ${labelText(43, 190.5, '10', 6.4, C.tick, 'end', false)}`,
    ports: [
      { id: 'mouth', x: 39, y: 12, dx: 0, dy: -1, type: 'mouth', diameter: 38, edge: [20, 12, 58, 12] },
      { id: 'base', x: 40, y: 248, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });

  // Volumetric bulb pipette: sleek slender stem + spindle bulb + open top/tip
  register('pipette', '移液管', '测量', {
    width: 80, height: 260,
    svg:
      `<path d="M35 10 V94 C24 105 24 157 35 168 V222 L38 244 M42 244 L45 222 V168 C56 157 56 105 45 94 V10" fill="none" stroke="${C.stroke}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>\n` +
      `  <line x1="34" y1="54" x2="46" y2="54" stroke="${C.red}" stroke-width="2.0"/>`,
    ports: [
      { id: 'stem', x: 40, y: 244, dx: 0, dy: 1, type: 'probe', diameter: 10, segment: [40, 234, 40, 170] },
      { id: 'mouth', x: 40, y: 10, dx: 0, dy: -1, type: 'pipette-stem', diameter: 10, edge: [35, 10, 45, 10] },
    ],
  });

  // Mohr graduated pipette: slender uniform graduated column (diameter 14 matching suction-pear cleanly), open top & tip
  register('mohr', '刻度吸管', '测量', {
    width: 80, height: 260,
    svg:
      `<path d="M33 10 V218 L38 244 M42 244 L47 218 V10" fill="none" stroke="${C.stroke}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>\n` +
      `  <rect x="34" y="16" width="12" height="4" fill="${C.teal}"/>\n` +
      `  ${gradTicks(46, 46, 198, 12, 2, 8, { dir: -1 })}`,
    ports: [
      { id: 'stem', x: 40, y: 244, dx: 0, dy: 1, type: 'probe', diameter: 10, segment: [40, 234, 40, 170] },
      { id: 'mouth', x: 40, y: 10, dx: 0, dy: -1, type: 'pipette-stem', diameter: 14, edge: [33, 10, 47, 10] },
    ],
  });

  register('burette', '滴定管', '测量', {
    width: 80, height: 260,
    svg:
      `<path d="M27 10 Q29 11 29 17 V198 L36 208 V226 L38.5 244 M41.5 244 L44 226 V208 L51 198 V17 Q51 11 53 10" fill="none" stroke="${C.stroke}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>\n` +
      `  ${gradTicks(50, 30, 186, 13, 3, 8, { dir: -1 })}\n` +
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
      `<path d="M27 10 Q29 11 29 17 V225 A11 11 0 0 0 51 225 V17 Q51 11 53 10" fill="none" stroke="${C.stroke}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>\n` +
      `  ${gradTicks(50, 30, 200, 14, 2, 10, { dir: -1 })}\n` +
      `  <line x1="27" y1="214" x2="34" y2="214" stroke="${C.brass}" stroke-width="2.0" stroke-linecap="round"/>\n` +
      `  <line x1="46" y1="214" x2="53" y2="214" stroke="${C.brass}" stroke-width="2.0" stroke-linecap="round"/>`,
    ports: [
      { id: 'mouth', x: 40, y: 10, dx: 0, dy: -1, type: 'mouth', diameter: 26, edge: [27, 10, 53, 10] },
      { id: 'base', x: 40, y: 238, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });

  register('thermometer', '温度计', '测量', {
    width: 80, height: 260,
    svg:
      `<circle cx="40" cy="11" r="4" fill="none" stroke="${C.stroke}" stroke-width="2.2"/>\n` +
      `  <path d="M32 208 V23 A8 8 0 0 1 48 23 V208 A17 17 0 1 1 32 208 Z" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.5" stroke-linejoin="round"/>\n` +
      `  <line x1="40" y1="76" x2="40" y2="222" stroke="${C.red}" stroke-width="4.6" stroke-linecap="round"/>\n` +
      `  <circle cx="40" cy="224" r="10.5" fill="${C.red}" stroke="none"/>\n` +
      `  ${gradTicks(47, 36, 188, 12, 2, 9, { dir: 1 })}\n` +
      `  ${labelText(60, 42, '100', 7, C.tick, 'start', false)}\n` +
      `  ${labelText(60, 188, '0°C', 7, C.tick, 'start', false)}`,
    ports: [{ id: 'probe', x: 40, y: 241, dx: 0, dy: 1, type: 'probe', diameter: 14, segment: [40, 200, 40, 30] }],
  });

  // Sleek streamlined hydrometer matching chemix proportions
  register('hydrometer', '液体比重计', '测量', {
    width: 80, height: 260,
    svg:
      `<path d="M36 10 V112 Q27 122 27 156 Q27 190 34 206 Q31 224 36 240 Q40 246 44 240 Q49 224 46 206 Q53 190 53 156 Q53 122 44 112 V10 Z" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.5" stroke-linejoin="round"/>\n` +
      `  <rect x="37.5" y="18" width="5" height="90" fill="#F8FAF9" stroke="${C.inner}" stroke-width="0.9"/>\n` +
      `  ${gradTicks(43, 24, 102, 10, 2, 4.5, { dir: -1 })}\n` +
      `  <path d="M33 216 Q40 223 47 216 L44 240 Q40 245 36 240 Z" fill="${C.amberMid}" stroke="${C.inner}" stroke-width="1.2"/>`,
    ports: [{ id: 'stem', x: 40, y: 244, dx: 0, dy: 1, type: 'immersible', diameter: 10, segment: [40, 234, 40, 170] }],
  });
}

function registerTransferAndSyringes(register) {
  for (const [id, name, isPump] of [
    ['pump', '三阀吸球', true],
    ['suction-pear', '吸耳球', false],
  ]) {
    const bulb = isPump
      ? `<path d="M44 200 V152 C-2 138 6 48 50 48 C94 48 102 138 56 152 V200" fill="${C.red}" stroke="${C.stroke}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>\n` +
        `  <rect x="44" y="18" width="12" height="31" rx="4" fill="${C.red}" stroke="${C.stroke}" stroke-width="2.2"/>\n` +
        `  <rect x="42" y="184" width="16" height="16" rx="2" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="2.2"/>`
      : `<path d="M44 200 V168 C28 134 10 92 12 62 C14 34 30 22 50 22 C70 22 86 34 88 62 C90 92 72 134 56 168 V200" fill="${C.red}" stroke="${C.stroke}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>\n` +
        `  <rect x="42" y="182" width="16" height="18" rx="2" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="2.2"/>`;
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
    const stem =
      `<path d="M41 69 V188 L47 215 M53 215 L59 188 V69" fill="none" stroke="${C.stroke}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    const bulb = isPlastic
      ? `<path d="M41 69 C28 16 72 16 59 69" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="2.5" stroke-linejoin="round"/>`
      : `<path d="M38 69 C26 16 74 16 62 69 Z" fill="${C.red}" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round"/>` +
        `<rect x="37" y="64" width="26" height="6" rx="2.5" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="2.0"/>`;
    const ticks = isPlastic ? gradTicks(57, 82, 162, 6, 2, 7, { dir: -1 }) : '';
    register(id, name, '移液与注射', {
      width: 100, height: 230, svg: `${stem}\n  ${bulb}\n  ${ticks}`,
      ports: [{ id: 'tip', x: 50, y: 215, dx: 0, dy: 1, type: 'stem', diameter: 6, segment: [50, 205, 50, 95] }],
    });
  }

  register('pipette-bottle', '滴瓶', '移液与注射', {
    width: 100, height: 230,
    svg:
      `<path d="M31 87 Q12 98 12 114 V208 H88 V114 Q88 98 69 87 V68 H31 Z" fill="${C.amberLight}" stroke="${C.stroke}" stroke-width="2.6" stroke-linejoin="round"/>\n` +
      `  <rect x="28" y="58" width="44" height="14" rx="2.5" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="2.2"/>\n` +
      `  <path d="M39 58 C24 14 76 14 61 58 Z" fill="${C.red}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  <rect x="24" y="128" width="52" height="48" rx="2" fill="#FFFFFF" stroke="${C.inner}" stroke-width="1.4"/>\n` +
      `  <line x1="32" y1="146" x2="68" y2="146" stroke="${C.muted}" stroke-width="1.2"/>\n` +
      `  <line x1="32" y1="158" x2="62" y2="158" stroke="${C.muted}" stroke-width="1.2"/>`,
    ports: [{ id: 'base', x: 50, y: 210, dx: 0, dy: 1, type: 'base', diameter: 0 }],
  });

  for (const [id, name, isGas] of [
    ['syringe', '注射器', false],
    ['gas-syringe', '气体注射器', true],
  ]) {
    const plungerStick = `<rect x="46" y="20" width="8" height="90" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.0"/>`;
    const thumbPad = `<rect x="28" y="14" width="44" height="7" rx="3" fill="${isGas ? C.brass : C.chassisTop}" stroke="${C.stroke}" stroke-width="2.2"/>`;
    const piston = isGas
      ? `<rect x="26" y="100" width="48" height="24" rx="2" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="2.2"/>`
      : `<rect x="26" y="106" width="48" height="14" rx="2" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="2.0"/>` +
        `<line x1="26" y1="113" x2="74" y2="113" stroke="${C.rubberDark}" stroke-width="2.2"/>`;
    const barrel = `<rect x="23" y="58" width="54" height="123" rx="3" fill="none" stroke="${C.stroke}" stroke-width="2.6"/>`;
    const flange = `<rect x="15" y="55" width="70" height="6" rx="3" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.2"/>`;
    const luerTip = `<path d="M41 181 H59 L57 196 H43 Z" fill="none" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const needleStem = isGas
      ? ''
      : `<rect x="46" y="196" width="8" height="7" rx="1" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.8"/><line x1="50" y1="203" x2="50" y2="220" stroke="${C.stroke}" stroke-width="2.4" stroke-linecap="round"/>`;
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
      `<path d="M47 48 V207 L53 192 V48 Z" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.1" stroke-linejoin="round"/>\n` +
      `  <rect x="30" y="12" width="40" height="36" rx="4" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.4"/>\n` +
      `  <rect x="26" y="12" width="48" height="7" rx="2.5" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.2"/>\n` +
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
      `<path d="M14 4 H86 L76 65 H24 Z" fill="${C.corkMid}" stroke="${C.stroke}" stroke-width="2.5" stroke-linejoin="round"/>\n` +
      `  <line x1="21" y1="11" x2="79" y2="11" stroke="${C.corkLight}" stroke-width="2.2" stroke-linecap="round"/>\n` +
      `  <line x1="28" y1="57" x2="72" y2="57" stroke="${C.corkDark}" stroke-width="1.5" stroke-linecap="round"/>`,
    ports: [{ id: 'plug', x: 50, y: 65, dx: 0, dy: 1, type: 'plug', diameter: 52, depth: 36, edge: [24, 65, 76, 65] }],
  });

  // 63. Glass stopper (classic T-head / pennyhead flat-top ground glass stopper matching chemix silhouette)
  register('glass-stopper', '玻璃塞', '塞子与密封', {
    width: 100, height: 75, boreCount: 0,
    svg:
      `<path d="M22 8 Q22 4 27 4 H73 Q78 4 78 8 V16 Q78 20 73 20 H59 V29 H64 L61 68 H39 L36 29 H41 V20 H27 Q22 20 22 16 Z" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.5" stroke-linejoin="round"/>\n` +
      `  <line x1="39" y1="30" x2="61" y2="30" stroke="${C.inner}" stroke-width="1.5" stroke-linecap="round"/>\n` +
      `  <line x1="41" y1="62" x2="59" y2="62" stroke="${C.muted}" stroke-width="1.2"/>`,
    ports: [{ id: 'plug', x: 50, y: 68, dx: 0, dy: 1, type: 'plug', diameter: 22, depth: 30, edge: [39, 68, 61, 68] }],
  });

  // 64. Septum seal (100x75)
  register('septum-seal', '隔膜密封盖', '塞子与密封', {
    width: 100, height: 75, boreCount: -1,
    svg:
      `<rect x="13" y="20" width="74" height="36" rx="6" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.5"/>\n` +
      `  <ellipse cx="50" cy="20" rx="37" ry="9.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2"/>\n` +
      `  <ellipse cx="50" cy="20" rx="22" ry="5.5" fill="${C.red}" stroke="${C.stroke}" stroke-width="1.6"/>\n` +
      `  <line x1="22" y1="30" x2="22" y2="50" stroke="${C.tick}" stroke-width="1.3"/>\n` +
      `  <line x1="78" y1="30" x2="78" y2="50" stroke="${C.tick}" stroke-width="1.3"/>`,
    ports: [{ id: 'plug', x: 50, y: 56, dx: 0, dy: 1, type: 'lid', diameter: 74, depth: 36, edge: [13, 56, 87, 56] }],
  });

  // 65. Plastic Keck joint clip (180x200 — sleek curved C-clamp Keck ring with side thumb wings)
  register('plastic-joint-clip', '磨口夹', '支撑与夹持', {
    width: 180, height: 200,
    svg:
      `<path d="M40 72 C40 40 140 40 140 72 L154 78 V98 L138 102 C136 124 126 140 112 146 V122 C120 116 122 80 114 70 C102 58 78 58 66 70 C58 80 60 116 68 122 V146 C54 140 44 124 42 102 L26 98 V78 Z" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.5" stroke-linejoin="round"/>\n` +
      `  <path d="M52 68 C68 50 112 50 128 68" fill="none" stroke="${C.tealLight}" stroke-width="2.0" stroke-linecap="round"/>`,
    ports: [{ id: 'clip', x: 90, y: 80, dx: 0, dy: -1, type: 'clip', diameter: 24 }],
  });

  // 66. Stirring rod (180x120)
  register('stirring-rod', '玻璃搅拌棒', '实验小工具', {
    width: 180, height: 120,
    svg: `<rect x="16" y="52" width="154" height="12" rx="6" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="2.5"/>`,
    ports: [{ id: 'probe', x: 170, y: 58, dx: 1, dy: 0, type: 'probe', diameter: 12, segment: [150, 58, 30, 58] }],
  });

  // 67. Syringe filter (180x120)
  register('syringe-filter', '针式过滤器', '实验小工具', {
    width: 180, height: 120,
    svg:
      `<rect x="36" y="54" width="22" height="12" rx="2" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.3"/>\n` +
      `  <path d="M126 54 H145 V66 H126 Z" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>\n` +
      `  <ellipse cx="90" cy="60" rx="38" ry="26" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.5"/>\n` +
      `  <ellipse cx="90" cy="60" rx="26" ry="17" fill="#F8FAF9" stroke="${C.inner}" stroke-width="1.5"/>\n` +
      `  <line x1="72" y1="60" x2="108" y2="60" stroke="${C.muted}" stroke-width="1.2" stroke-dasharray="3 2.5"/>`,
    ports: [
      { id: 'inlet', x: 36, y: 60, dx: -1, dy: 0, type: 'luer-female', diameter: 12, edge: [36, 54, 36, 66] },
      { id: 'outlet', x: 145, y: 60, dx: 1, dy: 0, type: 'luer-male', diameter: 12, edge: [145, 54, 145, 66] },
    ],
  });

  // 68. SPE cartridge (180x120)
  register('spe-cartridge', '固相萃取柱', '实验小工具', {
    width: 180, height: 120,
    svg:
      `<path d="M128 56 H162 V66 H128 Z" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.3"/>\n` +
      `  <rect x="44" y="33" width="84" height="56" rx="4" fill="none" stroke="${C.stroke}" stroke-width="2.5"/>\n` +
      `  <rect x="42" y="29" width="6" height="64" rx="2" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.2"/>\n` +
      `  <rect x="64" y="36" width="5" height="50" fill="${C.chassisMid}" stroke="${C.inner}" stroke-width="1.2"/>\n` +
      `  <rect x="69" y="36" width="38" height="50" fill="#F8FAF9" stroke="${C.inner}" stroke-width="1.2"/>\n` +
      `  <rect x="107" y="36" width="5" height="50" fill="${C.chassisMid}" stroke="${C.inner}" stroke-width="1.2"/>`,
    ports: [{ id: 'outlet', x: 162, y: 61, dx: 1, dy: 0, type: 'luer-male', diameter: 10, edge: [162, 56, 162, 66] }],
  });

  // 69. Piston chamber (200x170)
  register('piston-chamber', '活塞气室', '设备', {
    width: 200, height: 170,
    svg:
      `<path d="M10 47 H25 M25 59 H10" fill="none" stroke="${C.stroke}" stroke-width="2.5" stroke-linecap="round"/>\n` +
      `  <rect x="25" y="36" width="150" height="92" rx="4" fill="none" stroke="${C.stroke}" stroke-width="2.5"/>\n` +
      `  <rect x="106" y="78" width="82" height="8" rx="2" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.1"/>\n` +
      `  <rect x="184" y="64" width="8" height="36" rx="3" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.2"/>\n` +
      `  <rect x="88" y="38" width="18" height="88" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2"/>\n` +
      `  <rect x="88" y="42" width="4" height="80" fill="${C.rubberMid}"/>\n` +
      `  ${[45, 65, 85, 105, 125, 145].map((tx, i) => `<line x1="${tx}" y1="${i % 2 ? 118 : 114}" x2="${tx}" y2="127" stroke="${C.tick}" stroke-width="1.2"/>`).join('')}`,
    ports: [{ id: 'inlet', x: 10, y: 53, dx: -1, dy: 0, type: 'tube', diameter: 12, edge: [10, 47, 10, 59] }],
  });

  // 70. Desiccator (200x170)
  register('desiccator', '干燥器', '设备', {
    width: 200, height: 170,
    svg:
      `<path d="M22 54 H178 L155 144 H45 Z" fill="none" stroke="${C.stroke}" stroke-width="2.6" stroke-linejoin="round"/>\n` +
      `  <path d="M48 122 L152 122 L147 140 H53 Z" fill="${C.coolantLight}" stroke="none"/>\n` +
      `  ${[58, 72, 86, 100, 114, 128, 142].map((bx) => `<circle cx="${bx}" cy="133" r="4" fill="${C.blue}" stroke="${C.inner}" stroke-width="1.0"/>`).join('')}\n` +
      `  <rect x="34" y="102" width="132" height="6" rx="2" fill="${C.porcelainMid}" stroke="${C.stroke}" stroke-width="2.0"/>\n` +
      `  <path d="M22 52 Q100 -10 178 52 Z" fill="none" stroke="${C.stroke}" stroke-width="2.6" stroke-linejoin="round"/>\n` +
      `  <rect x="18" y="49" width="164" height="7" rx="3" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.3"/>\n` +
      `  <path d="M84 18 L87 7 H113 L116 18 Q100 22 84 18 Z" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>`,
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
    const uOuter = `<path d="M38 30 V132 A42 42 0 0 0 122 132 V30 H98 V132 A18 18 0 0 1 62 132 V30 Z" fill="none" stroke="${C.stroke}" stroke-width="2.6" stroke-linejoin="round"/>`;
    const granules = [
      [48, 84], [54, 96], [47, 110], [52, 124], [55, 138], [62, 150], [74, 158], [86, 158],
      [98, 150], [106, 138], [108, 124], [112, 110], [107, 96], [113, 84],
    ].map(([gx, gy]) => `<circle cx="${gx}" cy="${gy}" r="4.2" fill="${C.chassisTop}" stroke="${C.inner}" stroke-width="1.2"/>`).join('\n  ');
    const bungs =
      `<path d="M36 20 H64 L62 34 H38 Z" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  <path d="M96 20 H124 L122 34 H98 Z" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    register(id, 'U型干燥管', '冷凝与蒸馏', {
      width: 160, height: 200, search: 'u drying tube u tube desiccant',
      svg: `${bL.svg}\n  ${bR.svg}\n  ${uOuter}\n  ${granules}\n  ${bungs}`,
      ports: [
        { id: 'inlet', ...bL.port, type: 'tube' },
        { id: 'outlet', ...bR.port, type: 'tube' },
      ],
    });
  }

  // 72. Side-arm U-tube (160x200 — open flared top limbs, zero horizontal top bars)
  {
    const id = 'side-arm-u-tube';
    const bL = barb(id, 38, 60, -1, 0, 22, 5.2, 4.4);
    const bR = barb(id, 122, 60, 1, 0, 22, 5.2, 4.4);
    const uOuter =
      `<path d="M35 20 Q38 21 38 27 V132 A42 42 0 0 0 122 132 V27 Q122 21 125 20" fill="none" stroke="${C.stroke}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <path d="M65 20 Q62 21 62 27 V132 A18 18 0 0 0 98 132 V27 Q98 21 95 20" fill="none" stroke="${C.stroke}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    register(id, '支管U型管', '冷凝与蒸馏', {
      width: 160, height: 200, search: 'side arm u tube u tube',
      svg: `${bL.svg}\n  ${bR.svg}\n  ${uOuter}`,
      ports: [
        { id: 'mouth-left', x: 50, y: 20, dx: 0, dy: -1, type: 'mouth', diameter: 24, depth: 24, target: [50, 140], edge: [38, 20, 62, 20] },
        { id: 'mouth-right', x: 110, y: 20, dx: 0, dy: -1, type: 'mouth', diameter: 24, depth: 24, target: [110, 140], edge: [98, 20, 122, 20] },
        { id: 'inlet', ...bL.port, type: 'tube' },
        { id: 'outlet', ...bR.port, type: 'tube' },
      ],
    });
  }

  // 73. Retort (200x160 — open top female joint + open long tapering beak)
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
      `M39 48 V54 C10 68 12 138 56 138 C86 138 100 114 96 86 ` +
      `C116 90 144 114 ${r(ox + tx * halfOut)} ${r(oy + ty * halfOut)} ` +
      `M${r(ox - tx * halfOut)} ${r(oy - ty * halfOut)} ` +
      `C142 102 106 60 66 54 V48`;
    const svg =
      `<path d="${beakD}" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linejoin="round" stroke-linecap="round"/>\n` +
      `  ${openVerticalFemaleJoint(48, 28, 20, 9.5, 8.0, 1.5, GSW)}`;
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

  // 74. Glass stopcock valve (100x80)
  register('glass-stopcock', '玻璃活塞', '塞子与密封', {
    width: 100, height: 80, boreCount: 0, search: 'glass stopcock valve plug',
    svg:
      `<path d="M6 42 H36 M6 52 H36 M64 42 H94 M64 52 H94" fill="none" stroke="${C.stroke}" stroke-width="2.4" stroke-linecap="round"/>\n` +
      `  <path d="M35 28 H65 L59 68 H41 Z" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.5" stroke-linejoin="round"/>\n` +
      `  <line x1="40" y1="47" x2="60" y2="47" stroke="${C.teal}" stroke-width="2.4" stroke-linecap="round"/>\n` +
      `  <rect x="46" y="18" width="8" height="10" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.1"/>\n` +
      `  <rect x="24" y="10" width="52" height="9" rx="4.5" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.3"/>`,
    ports: [{ id: 'plug', x: 50, y: 68, dx: 0, dy: 1, type: 'plug', diameter: 18, depth: 30, edge: [41, 68, 59, 68] }],
  });

  // 75. Simple Kipp generator (160x240)
  {
    const id = 'simple-kipp-generator';
    const stand =
      `<rect x="14" y="216" width="132" height="12" rx="4" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.4"/>\n` +
      `  <rect x="26" y="18" width="7" height="198" rx="2" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.2"/>\n` +
      `  <rect x="23" y="88" width="41" height="8" rx="3" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>\n` +
      `  <rect x="61" y="85" width="46" height="14" rx="4" fill="none" stroke="${C.stroke}" stroke-width="2.3"/>`;
    const testTube =
      `<path d="M66 154 H102 V182 A18 18 0 0 1 66 182 Z" fill="${C.coolantLight}" stroke="none"/>\n` +
      `  <line x1="66" y1="154" x2="102" y2="154" stroke="${C.teal}" stroke-width="1.4"/>\n` +
      `  <path d="M64 68 V182 A20 20 0 0 0 104 182 V68 Z" fill="none" stroke="${C.stroke}" stroke-width="2.5" stroke-linejoin="round"/>\n` +
      `  <rect x="66" y="139" width="36" height="4" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.2"/>\n` +
      `  ${[72, 82, 92].map((zx) => `<circle cx="${zx}" cy="133" r="3.4" fill="${C.tick}" stroke="${C.stroke}" stroke-width="1.2"/>`).join('\n  ')}`;
    const funnel = `<path d="M56 16 L74 42 V184 H80 V42 L94 16" fill="none" stroke="${C.stroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    const tubeOut =
      `<path d="M92 66 V52 Q92 47 98 47 H144 M144 57 H100 V66" fill="none" stroke="${C.stroke}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  ${drawStopcock(id, 120, 52, { w: 18, h: 8, teal: true })}`;
    const stopper = `<path d="M62 56 H106 L102 72 H66 Z" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
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
      `<rect x="16" y="216" width="168" height="12" rx="4" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.4"/>\n` +
      `  <rect x="28" y="14" width="7" height="202" rx="2" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.2"/>\n` +
      `  <line x1="35" y1="86" x2="80" y2="86" stroke="${C.stroke}" stroke-width="4.4" stroke-linecap="round"/>\n` +
      `  <line x1="35" y1="158" x2="128" y2="158" stroke="${C.stroke}" stroke-width="4.2" stroke-linecap="round"/>\n` +
      `  <line x1="60" y1="154" x2="124" y2="154" stroke="${C.tick}" stroke-width="2.4" stroke-dasharray="3 2"/>`;
    const lamp =
      `<path d="M68 214 L74 190 Q92 186 110 190 L116 214 Z" fill="none" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>\n` +
      `  <rect x="86" y="180" width="12" height="9" rx="2" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.6"/>\n` +
      `  <path d="M92 164 C99 171 97 180 92 180 C87 180 85 171 92 164 Z" fill="${C.brassLight}" stroke="${C.brassDark}" stroke-width="1.3"/>\n` +
      `  <path d="M92 170 C95 174 94 179 92 179 C90 179 89 174 92 170 Z" fill="${C.teal}"/>`;
    const rbf = `<path d="M80 74 V96 C54 108 58 152 92 152 C126 152 130 108 104 96 V74" fill="none" stroke="${C.stroke}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    const funnel =
      `<path d="M62 12 L74 36 V78 H82 V36 L94 12" fill="none" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>\n` +
      `  ${drawStopcock(id, 78, 48, { w: 16, h: 7, teal: true })}`;
    const delivery = `<path d="M98 76 V38 Q98 31 106 31 H180 M180 41 H106 V76" fill="none" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round"/>`;
    const bung = `<path d="M77 68 H107 L104 81 H80 Z" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
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
    const baseStand = `<rect x="28" y="168" width="124" height="12" rx="4" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.5"/>`;
    const liquid =
      `<path d="M46 80 V128 A44 44 0 0 0 134 128 V80 H114 V128 A24 24 0 0 1 66 128 V80 Z" fill="${C.coolantLight}" stroke="none"/>\n` +
      `  <line x1="46" y1="80" x2="66" y2="80" stroke="${C.teal}" stroke-width="1.4"/>\n` +
      `  <line x1="114" y1="80" x2="134" y2="80" stroke="${C.teal}" stroke-width="1.4"/>`;
    const uBody = `<path d="M44 44 V128 A46 46 0 0 0 136 128 V44 H112 V128 A22 22 0 0 1 68 128 V44 Z" fill="none" stroke="${C.stroke}" stroke-width="2.5" stroke-linejoin="round"/>`;
    const electrodes =
      `<rect x="53" y="28" width="6" height="94" rx="1" fill="${C.inner}" stroke="${C.stroke}" stroke-width="1.7"/>\n` +
      `  <rect x="121" y="28" width="6" height="94" rx="1" fill="${C.inner}" stroke="${C.stroke}" stroke-width="1.7"/>`;
    const bungs =
      `<path d="M42 36 H70 L68 48 H44 Z" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="2.2"/>\n` +
      `  <path d="M110 36 H138 L136 48 H112 Z" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="2.2"/>`;
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
