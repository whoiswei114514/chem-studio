// Chemix Neutral Charcoal & Stepped-Collar Glassware Module (#333333 house style, Qt6 safe).
// Zero <linearGradient>/<radialGradient>, zero url(#...), zero cross-hatched XXX joints,
// zero white specular bars, zero sealed top rims on open glassware, zero teal roof/key bars.
// Owns 77 studio:* items + 3 RBF neck variants = 80 plates with tight Chemix bounding boxes.
'use strict';

const S = require('./svg-style.cjs');
const {
  C, r, rad, jointArc,
  verticalFemaleJoint, verticalMaleJoint, angledMaleJoint,
  gradTicks, barb, oliveBarb,
  drawStopcock, labelText, bindingPost,
} = S;

const GSW = C.glassSw || 4.0;

function drawAngledStopcock(cx, cy, ux, uy, opts = {}) {
  const w = opts.w || 22;
  const h = opts.h || 10;
  const handleColor = opts.steel ? C.steelBlue : C.crimson;
  const px = -uy;
  const py = ux;
  const qx = ux;
  const qy = uy;
  const pt = (alongPlug, alongTube) =>
    `${r(cx + px * alongPlug + qx * alongTube)},${r(cy + py * alongPlug + qy * alongTube)}`;
  const body = `<polygon points="${pt(-w / 2, -h / 2)} ${pt(w / 2, -h / 2 + 1)} ${pt(w / 2, h / 2 - 1)} ${pt(-w / 2, h / 2)}" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
  const key = `<polygon points="${pt(-w / 2 - 7, -6)} ${pt(-w / 2, -6)} ${pt(-w / 2, 6)} ${pt(-w / 2 - 7, 6)}" fill="${handleColor}" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>`;
  const nut = `<polygon points="${pt(w / 2, -3.8)} ${pt(w / 2 + 4.8, -3.8)} ${pt(w / 2 + 4.8, 3.8)} ${pt(w / 2, 3.8)}" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.8" stroke-linejoin="round"/>`;
  const knob = `<circle cx="${r(cx)}" cy="${r(cy)}" r="4.2" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="1.8"/>`;
  return `<g>${body}${key}${nut}${knob}</g>`;
}

function openTubeWall(d, strokeW, innerFill = '#FFFFFF', cap = 'butt') {
  return (
    `<path d="${d}" fill="none" stroke="${C.stroke}" stroke-width="${r(strokeW)}" stroke-linecap="${cap}" stroke-linejoin="round"/>\n` +
    `  <path d="${d}" fill="none" stroke="${innerFill}" stroke-width="${r(Math.max(1.5, strokeW - 7.2))}" stroke-linecap="${cap}" stroke-linejoin="round"/>`
  );
}

function registerContainers(register) {
  // 1-3. Open beakers & displacement vessels (tight 150x172 / 160x172)
  {
    const glassStroke = `stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"`;
    // Beaker (150x172)
    register('beaker', '烧杯', 'beaker', {
      width: 150, height: 172,
      svg:
        `<path d="M12 14 L23 24 V152 Q23 164 36 164 H123 Q135 164 135 152 V21 Q135 16 140 14" fill="none" ${glassStroke}/>\n` +
        `  ${gradTicks(125, 48, 140, 7, 2, 11, { dir: -1 })}`,
      ports: [
        { id: 'mouth', x: 76, y: 14, dx: 0, dy: -1, type: 'mouth', diameter: 128, depth: 25, target: [79, 138], edge: [12, 14, 140, 14] },
        { id: 'contents-seat', x: 79, y: 149, dx: 0, dy: -1, type: 'contents-seat', diameter: 0 },
        { id: 'base', x: 79, y: 166, dx: 0, dy: 1, type: 'base', diameter: 0 },
      ],
    });

    // Displacement beaker & Eureka (160x172)
    register('displacement-beaker', '溢流杯', 'displacement beaker', {
      width: 160, height: 172,
      svg:
        `<path d="M23 58 H132 V152 Q132 164 120 164 H35 Q23 164 23 152 Z" fill="${C.liquid}" stroke="none"/>\n` +
        `  <line x1="25" y1="58" x2="132" y2="58" stroke="${C.liquidLine}" stroke-width="2.0"/>\n` +
        `  <path d="M12 14 L23 24 V152 Q23 164 36 164 H120 Q132 164 132 152 V60 L150 71 M156 63 L132 48 V21 Q132 16 136 14" fill="none" ${glassStroke}/>\n` +
        `  ${gradTicks(122, 66, 144, 6, 2, 10, { dir: -1 })}`,
      ports: [
        { id: 'mouth', x: 74, y: 14, dx: 0, dy: -1, type: 'mouth', diameter: 124, depth: 25, target: [78, 138], edge: [12, 14, 136, 14] },
        { id: 'outlet', x: 153, y: 67, dx: 0.814, dy: 0.581, type: 'tube', diameter: 10, edge: [156, 63, 150, 71] },
        { id: 'base', x: 78, y: 166, dx: 0, dy: 1, type: 'base', diameter: 0 },
      ],
    });

    register('eureka', '排水罐', 'eureka', {
      width: 160, height: 172,
      svg:
        `<path d="M18 66 H112 V154 Q112 162 104 162 H26 Q18 162 18 154 Z" fill="${C.liquid}" stroke="none"/>\n` +
        `  <line x1="20" y1="66" x2="112" y2="66" stroke="${C.liquidLine}" stroke-width="2.0"/>\n` +
        `  <path d="M16 14 V154 Q16 164 26 164 H104 Q114 164 114 154 V66 L146 98 M152 92 L114 54 V14" fill="none" ${glassStroke}/>`,
      ports: [
        { id: 'mouth', x: 65, y: 14, dx: 0, dy: -1, type: 'mouth', diameter: 98, depth: 25, target: [65, 138], edge: [16, 14, 114, 14] },
        { id: 'outlet', x: 149, y: 95, dx: 0.707, dy: 0.707, type: 'tube', diameter: 8.5, edge: [152, 92, 146, 98] },
        { id: 'base', x: 65, y: 166, dx: 0, dy: 1, type: 'base', diameter: 0 },
      ],
    });

    // 4. Tank (160x154 — crisp rectangular trough with no top lip flare)
    register('tank', '水槽', 'tank', {
      width: 160, height: 154, search: 'tank',
      svg:
        `<path d="M18 76 H142 V142 H18 Z" fill="${C.liquid}" stroke="none"/>\n` +
        `  <line x1="18" y1="76" x2="142" y2="76" stroke="${C.liquidLine}" stroke-width="2.2"/>\n` +
        `  <path d="M16 14 V144 H144 V14" fill="none" ${glassStroke}/>`,
      ports: [
        { id: 'mouth', x: 80, y: 14, dx: 0, dy: -1, type: 'mouth', diameter: 128, depth: 25, target: [80, 120], edge: [16, 14, 144, 14] },
        { id: 'base', x: 80, y: 146, dx: 0, dy: 1, type: 'base', diameter: 0 },
      ],
    });

    // 5. TLC chamber (150x176 — clean empty rectangular tank + subtle solvent fill)
    register('tlc-chamber', '展开缸', 'tlc chamber', {
      width: 150, height: 176,
      svg:
        `<path d="M21 134 H129 V158 Q129 164 123 164 H27 Q21 164 21 158 Z" fill="${C.liquid}" stroke="none"/>\n` +
        `  <line x1="21" y1="134" x2="129" y2="134" stroke="${C.liquidLine}" stroke-width="2.0"/>\n` +
        `  <path d="M14 14 Q19 16 19 22 V158 Q19 165 26 165 H124 Q131 165 131 158 V22 Q131 16 136 14" fill="none" ${glassStroke}/>`,
      ports: [
        { id: 'mouth', x: 75, y: 14, dx: 0, dy: -1, type: 'mouth', diameter: 122, depth: 25, target: [75, 134], edge: [14, 14, 136, 14] },
        { id: 'base', x: 75, y: 166, dx: 0, dy: 1, type: 'base', diameter: 0 },
      ],
    });
  }

  // 6. Calorimetry cup (144x172 — stepped top collar + double insulated tapered casing + pale liquid)
  register('calorimetry-cup', '量热杯', '容器', {
    width: 144, height: 172, search: 'calorimetry cup',
    svg:
      `<path d="M35 86 H109 L103 154 H41 Z" fill="${C.liquid}" stroke="none"/>\n` +
      `  <line x1="35" y1="86" x2="109" y2="86" stroke="${C.liquidLine}" stroke-width="2.0"/>\n` +
      `  <path d="M16 14 H26 L36 154 H108 L118 14 H128 L125 32 H120 L112 164 H32 L24 32 H19 Z" fill="${C.chassisBot}" stroke="${C.inner}" stroke-width="2.4" stroke-linejoin="round"/>\n` +
      `  <path d="M16 14 L24 156 Q25 164 33 164 H111 Q119 164 120 156 L128 14" fill="none" stroke="${C.stroke}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    ports: [
      { id: 'mouth', x: 72, y: 14, dx: 0, dy: -1, type: 'mouth', diameter: 112, depth: 25, target: [72, 135], edge: [16, 14, 128, 14] },
      { id: 'base', x: 72, y: 166, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });

  // 7. Watch glass (156x40 — graceful single shallow downward arc)
  register('watch-glass', '表面皿', '容器', {
    width: 156, height: 40, search: 'watch glass',
    svg: `<path d="M12 12 Q78 38 144 12" fill="none" stroke="${C.stroke}" stroke-width="4.2" stroke-linecap="round"/>`,
    ports: [{ id: 'base', x: 78, y: 26, dx: 0, dy: 1, type: 'base', diameter: 0 }],
  });

  // 8. Stemmed glass (130x178 — sleek V-profile chalice + sturdy flat base)
  register('stemmed-glass', '高脚杯', '容器', {
    width: 130, height: 178, search: 'stemmed glass',
    svg:
      `<path d="M40 94 H90 L76 138 Q65 148 54 138 Z" fill="${C.liquid}" stroke="none"/>\n` +
      `  <line x1="40" y1="94" x2="90" y2="94" stroke="${C.liquidLine}" stroke-width="2.2"/>\n` +
      `  <path d="M14 12 L46 132 Q53 150 65 150 Q77 150 84 132 L116 12" fill="none" stroke="${C.stroke}" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <path d="M48 140 Q46 164 24 166 H106 Q84 164 82 140" fill="none" stroke="${C.stroke}" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    ports: [{ id: 'base', x: 65, y: 166, dx: 0, dy: 1, type: 'base', diameter: 0 }],
  });

  // 9. Conical flask (140x206)
  register('conical-flask', '锥形瓶', '容器', {
    width: 140, height: 206,
    svg:
      `<path d="M51 10 Q55 12 55 18 V56 L14 176 Q10 194 28 194 H112 Q130 194 126 176 L85 56 V18 Q85 12 89 10" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  ${jointArc(59, 19, 81, 19, 2.5, { sw: 2.0 })}\n` +
      `  ${gradTicks(114, 122, 168, 4, 2, 11, { dir: -1 })}`,
    ports: [
      { id: 'mouth', x: 70, y: 10, dx: 0, dy: -1, type: 'mouth', diameter: 38, depth: 24, target: [70, 156], edge: [51, 10, 89, 10] },
      { id: 'contents-seat', x: 70, y: 178, dx: 0, dy: -1, type: 'contents-seat', diameter: 0 },
      { id: 'base', x: 70, y: 196, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });

  // 10. Conical flask with side arm (130x206 — short smooth horizontal side spout)
  register('conical-flask-with-side-arm', '侧支锥形瓶', '容器', {
    width: 130, height: 206,
    svg:
      `<path d="M44 10 Q48 12 48 18 V56 L11 176 Q8 194 26 194 H100 Q118 194 115 176 L78 56 V44 H112 M112 36 H78 V18 Q78 12 82 10" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  ${jointArc(52, 19, 74, 19, 2.5, { sw: 2.0 })}\n` +
      `  ${gradTicks(102, 122, 168, 4, 2, 11, { dir: -1 })}`,
    ports: [
      { id: 'mouth', x: 63, y: 10, dx: 0, dy: -1, type: 'mouth', diameter: 38, depth: 24, target: [63, 156], edge: [44, 10, 82, 10] },
      { id: 'outlet', x: 112, y: 40, dx: 1, dy: 0, type: 'tube', diameter: 8, segment: [108, 40, 84, 40], edge: [112, 36, 112, 44] },
      { id: 'base', x: 63, y: 196, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });

  // 11-12. Test tubes (48x200 and 76x200)
  register('test-tube', '试管', '容器', {
    width: 48, height: 200,
    svg:
      `<path d="M8 10 Q11 12 11 18 V168 A13 13 0 0 0 37 168 V18 Q37 12 40 10" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>`,
    ports: [
      { id: 'mouth', x: 24, y: 10, dx: 0, dy: -1, type: 'mouth', diameter: 32, depth: 28, target: [24, 145], edge: [8, 10, 40, 10] },
    ],
  });

  register('test-tube-with-side-arm', '侧支试管', '容器', {
    width: 76, height: 200,
    svg:
      `<path d="M8 10 Q11 12 11 18 V168 A13 13 0 0 0 37 168 V49 H70 M70 42 H37 V18 Q37 12 40 10" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>`,
    ports: [
      { id: 'mouth', x: 24, y: 10, dx: 0, dy: -1, type: 'mouth', diameter: 32, depth: 28, target: [24, 145], edge: [8, 10, 40, 10] },
      { id: 'outlet', x: 70, y: 45.5, dx: 1, dy: 0, type: 'tube', diameter: 7, edge: [70, 42, 70, 49] },
    ],
  });

  // 13. Round-bottom flask (1, 2, 3, 4 necks): tight 160x184, R=68 globe at (80, 112)
  function buildChemixRbf(necks, opts = {}) {
    const cx0 = 80;
    const cy0 = 112;
    const R = 68;
    const sw = 4.2;

    const makeNeck = (n) => {
      const a = rad(n.deg);
      const ux = Math.sin(a);
      const uy = -Math.cos(a);
      const tx = Math.cos(a);
      const ty = Math.sin(a);
      const mx = n.mx;
      const my = n.my;
      const hw = n.hw;
      const lipHw = n.lipHw;
      const P = (pt, along, perp) => [r(pt[0] - ux * along + tx * perp), r(pt[1] - uy * along + ty * perp)];
      const LT = P([mx, my], 0, -lipHw);
      const RT = P([mx, my], 0, lipHw);
      const LC = P([mx, my], 1.2, -hw);
      const RC = P([mx, my], 1.2, hw);
      const LF = P([mx, my], 5.0, -hw);
      const RF = P([mx, my], 5.0, hw);

      const thBaseL = rad(n.baseDegL ?? 0);
      const thBaseR = rad(n.baseDegR ?? 0);
      const LB = [r(cx0 + R * Math.sin(thBaseL)), r(cy0 - R * Math.cos(thBaseL))];
      const RB = [r(cx0 + R * Math.sin(thBaseR)), r(cy0 - R * Math.cos(thBaseR))];
      const thArcMid = rad(((n.baseDegL ?? 0) + (n.baseDegR ?? 0)) / 2);
      const arcR = R - 5.5;
      const arcSpan = ((n.baseDegR ?? 0) - (n.baseDegL ?? 0)) * 0.34;
      const AL = [r(cx0 + arcR * Math.sin(thArcMid - rad(arcSpan))), r(cy0 - arcR * Math.cos(thArcMid - rad(arcSpan)))];
      const AR = [r(cx0 + arcR * Math.sin(thArcMid + rad(arcSpan))), r(cy0 - arcR * Math.cos(thArcMid + rad(arcSpan)))];

      const ctrlL = n.ctrlL || P([mx, my], 24, -hw);
      const ctrlR = n.ctrlR || P([mx, my], 24, hw);
      const target = [r(mx - ux * 102), r(my - uy * 102)];

      return {
        id: n.id,
        mx: r(mx),
        my: r(my),
        ux: r(ux),
        uy: r(uy),
        lipW: r(lipHw * 2),
        depth: n.depth ?? 22,
        edge: [LT[0], LT[1], RT[0], RT[1]],
        target,
        LT, RT, LC, RC, LF, RF, LB, RB, AL, AR, ctrlL, ctrlR,
        P, hw,
        straightDrop: Boolean(n.straightDrop),
        rearRimColor: n.rearRimColor || null,
      };
    };

    const geom = necks.map(makeNeck);
    const first = geom[0];
    const last = geom[geom.length - 1];

    const downSeg = (g) => {
      if (g.straightDrop) return `L${g.LB[0]} ${g.LB[1]}`;
      const midY = r((g.LF[1] + g.LB[1]) * 0.56);
      return `L${g.ctrlL[0]} ${g.ctrlL[1]} Q${g.ctrlL[0]} ${midY} ${g.LB[0]} ${g.LB[1]}`;
    };
    const upSeg = (g) => {
      if (g.straightDrop) return `L${g.RF[0]} ${g.RF[1]}`;
      const midY = r((g.RF[1] + g.RB[1]) * 0.56);
      return `Q${g.ctrlR[0]} ${midY} ${g.ctrlR[0]} ${g.ctrlR[1]} L${g.RF[0]} ${g.RF[1]}`;
    };

    const outerPath =
      `<path d="M${first.LT[0]} ${first.LT[1]} Q${first.LC[0]} ${first.LC[1]} ${first.LF[0]} ${first.LF[1]} ` +
      `${downSeg(first)} ` +
      `A${R} ${R} 0 1 0 ${last.RB[0]} ${last.RB[1]} ` +
      `${upSeg(last)} Q${last.RC[0]} ${last.RC[1]} ${last.RT[0]} ${last.RT[1]}" ` +
      `fill="none" stroke="${C.stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;

    let bridges = '';
    for (let i = 0; i < geom.length - 1; i++) {
      const leftN = geom[i];
      const rightN = geom[i + 1];
      const downRight = (g) => {
        if (g.straightDrop) return `L${g.RB[0]} ${g.RB[1]}`;
        const midY = r((g.RF[1] + g.RB[1]) * 0.54);
        return `L${g.ctrlR[0]} ${g.ctrlR[1]} Q${g.ctrlR[0]} ${midY} ${g.RB[0]} ${g.RB[1]}`;
      };
      const upLeft = (g) => {
        if (g.straightDrop) return `L${g.LF[0]} ${g.LF[1]}`;
        const midY = r((g.LF[1] + g.LB[1]) * 0.54);
        return `Q${g.ctrlL[0]} ${midY} ${g.ctrlL[0]} ${g.ctrlL[1]} L${g.LF[0]} ${g.LF[1]}`;
      };
      if (leftN.rearRimColor) {
        bridges +=
          `\n  <path d="M${leftN.RT[0]} ${leftN.RT[1]} Q${leftN.RC[0]} ${leftN.RC[1]} ${leftN.RF[0]} ${leftN.RF[1]} ${downRight(leftN)}" fill="none" stroke="${C.stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>` +
          `\n  <path d="M${leftN.RB[0]} ${leftN.RB[1]} A${R} ${R} 0 0 1 ${rightN.LB[0]} ${rightN.LB[1]}" fill="none" stroke="${leftN.rearRimColor}" stroke-width="${sw}" stroke-linecap="round"/>` +
          `\n  <path d="M${rightN.LB[0]} ${rightN.LB[1]} ${upLeft(rightN)} Q${rightN.LC[0]} ${rightN.LC[1]} ${rightN.LT[0]} ${rightN.LT[1]}" fill="none" stroke="${C.stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
      } else {
        bridges +=
          `\n  <path d="M${leftN.RT[0]} ${leftN.RT[1]} Q${leftN.RC[0]} ${leftN.RC[1]} ${leftN.RF[0]} ${leftN.RF[1]} ` +
          `${downRight(leftN)} ` +
          `A${R} ${R} 0 0 1 ${rightN.LB[0]} ${rightN.LB[1]} ` +
          `${upLeft(rightN)} Q${rightN.LC[0]} ${rightN.LC[1]} ${rightN.LT[0]} ${rightN.LT[1]}" ` +
          `fill="none" stroke="${C.stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
    }

    let frontSvg = '';
    const orderedGeom = [...geom];
    if (opts.frontNeck) {
      const f = makeNeck(opts.frontNeck);
      const dropLen = opts.frontNeck.dropLen || 54;
      const mL = f.P([f.mx, f.my], 12, -f.hw);
      const mR = f.P([f.mx, f.my], 12, f.hw);
      const bL = f.P([f.mx, f.my], dropLen, -f.hw);
      const bR = f.P([f.mx, f.my], dropLen, f.hw);
      const aL = f.P([f.mx, f.my], dropLen + 3.2, -(f.hw - 1.5));
      const aR = f.P([f.mx, f.my], dropLen + 3.2, f.hw - 1.5);
      // White mask below y=20 occludes the #B8BCC2 rear rim behind front neck without touching lip opening
      const mask = `<polygon points="${mL.join(',')} ${mR.join(',')} ${bR.join(',')} ${bL.join(',')}" fill="#FFFFFF" stroke="none"/>`;
      const fWalls =
        `<path d="M${f.LT[0]} ${f.LT[1]} Q${f.LC[0]} ${f.LC[1]} ${f.LF[0]} ${f.LF[1]} L${bL[0]} ${bL[1]} ` +
        `M${f.RT[0]} ${f.RT[1]} Q${f.RC[0]} ${f.RC[1]} ${f.RF[0]} ${f.RF[1]} L${bR[0]} ${bR[1]}" ` +
        `fill="none" stroke="${C.stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
      const fArc = jointArc(aL[0], aL[1], aR[0], aR[1], 2.6, { sw: 2.3 });
      frontSvg = `\n  ${mask}\n  ${fWalls}\n  ${fArc}`;
      orderedGeom.splice(opts.frontNeck.insertIndex ?? geom.length, 0, f);
    }

    const arcs = geom.map((g) => jointArc(g.AL[0], g.AL[1], g.AR[0], g.AR[1], 3.0, { sw: 2.3 })).join('\n  ');
    const ports = orderedGeom.map((g) => ({
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
    ports.push({ id: 'contents-seat', x: 80, y: 162, dx: 0, dy: -1, type: 'contents-seat', diameter: 0 });
    return { svg: `${outerPath}${bridges}\n  ${arcs}${frontSvg}`, ports };
  }

  const rbf1 = buildChemixRbf([
    { id: 'mouth', deg: 0, mx: 80, my: 6, hw: 13.5, lipHw: 17.5, baseDegL: -11.5, baseDegR: 11.5, straightDrop: true, depth: 25 },
  ]);
  rbf1.ports.push({ id: 'base', x: 80, y: 180, dx: 0, dy: 1, type: 'base', diameter: 0 });

  const rbf2 = buildChemixRbf([
    { id: 'mouth', deg: 0, mx: 72, my: 8, hw: 13.5, lipHw: 17.0, baseDegL: -18.5, baseDegR: 5.5, straightDrop: true },
    { id: 'mouth-2', deg: 20, mx: 132, my: 14, hw: 11.5, lipHw: 14.5, baseDegL: 24, baseDegR: 50, ctrlL: [115.5, 34], ctrlR: [143.5, 50] },
  ]);

  const rbf3 = buildChemixRbf([
    { id: 'mouth', deg: -20, mx: 28, my: 14, hw: 11.5, lipHw: 14.5, baseDegL: -50, baseDegR: -24, ctrlL: [16.5, 50], ctrlR: [44.5, 34] },
    { id: 'mouth-2', deg: 0, mx: 80, my: 8, hw: 12.5, lipHw: 15.5, baseDegL: -10.5, baseDegR: 10.5, straightDrop: true },
    { id: 'mouth-3', deg: 20, mx: 132, my: 14, hw: 11.5, lipHw: 14.5, baseDegL: 24, baseDegR: 50, ctrlL: [115.5, 34], ctrlR: [143.5, 50] },
  ]);

  // 4-neck RBF matching Chemix: 3 crown necks + #B8BCC2 occluded rear sphere rim + foreground 4th neck (mouth-3)
  const rbf4 = buildChemixRbf(
    [
      { id: 'mouth', deg: -21, mx: 26, my: 12, hw: 10.5, lipHw: 13.0, baseDegL: -50, baseDegR: -26, ctrlL: [15.5, 48], ctrlR: [42, 34] },
      { id: 'mouth-2', deg: -3, mx: 71, my: 8, hw: 11.0, lipHw: 13.5, baseDegL: -16, baseDegR: 4, straightDrop: true, rearRimColor: C.glassBack },
      { id: 'mouth-4', deg: 21, mx: 135, my: 12, hw: 10.5, lipHw: 13.0, baseDegL: 27, baseDegR: 50, ctrlL: [119, 34], ctrlR: [145.5, 48] },
    ],
    {
      frontNeck: { id: 'mouth-3', deg: 12, mx: 102.5, my: 11, hw: 9.5, lipHw: 12.0, dropLen: 52, insertIndex: 2 },
    }
  );

  register('round-bottom-flask', '圆底烧瓶', '容器', {
    width: 160, height: 184, neckCount: 1,
    svg: rbf1.svg,
    ports: rbf1.ports,
    variants: [
      { neckCount: 2, width: 160, height: 184, svg: rbf2.svg, ports: rbf2.ports },
      { neckCount: 3, width: 160, height: 184, svg: rbf3.svg, ports: rbf3.ports },
      { neckCount: 4, width: 160, height: 184, svg: rbf4.svg, ports: rbf4.ports },
    ],
  });

  // 14. Boiling flask (150x214 — R=62 globe + flat bottom chord + tall sturdy open flared neck)
  register('boiling-flask', '平底烧瓶', '容器', {
    width: 150, height: 214, neckCount: 1,
    svg:
      `<path d="M57 10 Q61 12 61 18 V83.6 A62 62 0 0 0 50 202 H100 A62 62 0 0 0 89 83.6 V18 Q89 12 93 10" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  ${jointArc(64, 88, 86, 88, 2.8, { sw: 2.2 })}`,
    ports: [
      { id: 'mouth', x: 75, y: 10, dx: 0, dy: -1, type: 'glass-female', diameter: 36, depth: 25, target: [75, 165], edge: [57, 10, 93, 10] },
      { id: 'contents-seat', x: 75, y: 188, dx: 0, dy: -1, type: 'contents-seat', diameter: 0 },
      { id: 'base', x: 75, y: 204, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });

  // 15. Distillation flask (150x214 — R=54 sphere + tall open neck + ~17° downward open-bore sidearm)
  {
    const id = 'distillation-flask';
    const ox = 142;
    const oy = 70;
    const ux = 0.956;
    const uy = 0.292;
    const bx = ox - uy * 5;
    const by = oy + ux * 5;
    const tx = ox + uy * 5;
    const ty = oy - ux * 5;
    const svg =
      `<path d="M46 10 Q50 12 50 18 V101.4 A54 54 0 1 0 74 101.4 V54 L${r(bx)} ${r(by)}" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <path d="M78 10 Q74 12 74 18 V44 L${r(tx)} ${r(ty)}" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  ${jointArc(53, 106, 71, 106, 2.6, { sw: 2.2 })}`;
    register(id, '蒸馏烧瓶', '容器', {
      width: 150, height: 214, neckCount: 1, svg,
      ports: [
        { id: 'mouth', x: 62, y: 10, dx: 0, dy: -1, type: 'glass-female', diameter: 32, depth: 25, target: [62, 162], edge: [46, 10, 78, 10] },
        {
          id: 'outlet',
          x: ox,
          y: oy,
          dx: ux,
          dy: uy,
          type: 'tube',
          diameter: 10,
          segment: [ox, oy, r(ox - ux * 42), r(oy - uy * 42)],
          edge: [r(tx), r(ty), r(bx), r(by)],
        },
        { id: 'contents-seat', x: 62, y: 186, dx: 0, dy: -1, type: 'contents-seat', diameter: 0 },
        { id: 'base', x: 62, y: 206, dx: 0, dy: 1, type: 'base', diameter: 0 },
      ],
    });
  }

  // 16. Schlenk flask (154x190 — stepped-collar vertical neck + ~40° upward sidearm + crimson PTFE stopcock)
  {
    const id = 'schlenk-flask';
    const cx0 = 60, cy0 = 130, R = 54;
    const ux = 0.766, uy = -0.643;
    const armLen = 78;
    const jx = 80, jy = 78;
    const tipX = r(jx + ux * armLen);
    const tipY = r(jy + uy * armLen);
    const hwArm = 5.2;
    const p = (along, perp) => [r(jx + ux * along - uy * perp), r(jy + uy * along + ux * perp)];
    const l0 = p(6, hwArm);
    const uTip = p(armLen, -hwArm);
    const lTip = p(armLen, hwArm);
    const midArm = p(armLen * 0.46, 0);

    const svg =
      `<path d="M44 10 Q48 12 48 18 V48 H46 V77.8 A${R} ${R} 0 1 0 ${l0[0]} ${l0[1]} L${lTip[0]} ${lTip[1]}" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <path d="M76 10 Q72 12 72 18 V48 H74 V70 L${uTip[0]} ${uTip[1]}" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  ${jointArc(50, 51, 70, 51, 2.5, { sw: 2.0 })}\n` +
      `  ${drawAngledStopcock(midArm[0], midArm[1], ux, uy, { w: 22, h: 10 })}`;

    register(id, '施伦克瓶', '容器', {
      width: 154, height: 190, neckCount: 1, svg,
      ports: [
        { id: 'mouth', x: cx0, y: 10, dx: 0, dy: -1, type: 'glass-female', diameter: 32, depth: 25, target: [cx0, 145], edge: [44, 10, 76, 10] },
        { id: 'outlet', x: tipX, y: tipY, dx: ux, dy: uy, type: 'tube', diameter: r(hwArm * 2), edge: [uTip[0], uTip[1], lTip[0], lTip[1]] },
        { id: 'contents-seat', x: cx0, y: 168, dx: 0, dy: -1, type: 'contents-seat', diameter: 0 },
        { id: 'base', x: cx0, y: 184, dx: 0, dy: 1, type: 'base', diameter: 0 },
      ],
    });
  }

  // 17. Volumetric flask (108x244 — tall slim neck ~45% height, crisp calibration line, wide teardrop flat base)
  register('volumetric-flask', '容量瓶', '容器', {
    width: 108, height: 244, neckCount: 1,
    svg:
      `<path d="M41 10 Q44 12 44 18 V122 L12 182 Q4 202 10 218 Q16 234 32 234 H76 Q92 234 98 218 Q104 202 96 182 L64 122 V18 Q64 12 67 10" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <line x1="45" y1="74" x2="63" y2="74" stroke="${C.tick}" stroke-width="2.4" stroke-linecap="round"/>`,
    ports: [
      { id: 'mouth', x: 54, y: 10, dx: 0, dy: -1, type: 'glass-female', diameter: 26, depth: 25, target: [54, 180], edge: [41, 10, 67, 10] },
      { id: 'base', x: 54, y: 236, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });

  // 18. Pycnometer (100x200 — conical/pear body + stepped ground stopper + tall slender capillary neck)
  register('pycnometer', '比重瓶', '容器', {
    width: 100, height: 200, neckCount: 1,
    svg:
      `<path d="M36 104 H64 C88 134 92 174 72 190 H28 C8 174 12 134 36 104 Z" fill="${C.liquid}" stroke="none"/>\n` +
      `  <line x1="36" y1="104" x2="64" y2="104" stroke="${C.liquidLine}" stroke-width="2.0"/>\n` +
      `  <rect x="46" y="10" width="8" height="72" fill="${C.liquid}" stroke="none"/>\n` +
      `  <path d="M34 54 L39 84 V92 L12 142 Q6 172 24 190 H76 Q94 172 88 142 L61 92 V84 L66 54" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <path d="M43 10 V48 L36 54 H64 L57 48 V10" fill="none" stroke="${C.stroke}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <line x1="40" y1="84" x2="60" y2="84" stroke="${C.stroke}" stroke-width="3.2" stroke-linecap="round"/>`,
    ports: [
      { id: 'mouth', x: 50, y: 10, dx: 0, dy: -1, type: 'glass-female', diameter: 14, depth: 22, target: [50, 145], edge: [43, 10, 57, 10] },
      { id: 'base', x: 50, y: 192, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });

  // 19. Gas jar (100x216)
  register('gas-jar', '集气瓶', '容器', {
    width: 100, height: 216,
    svg:
      `<path d="M16 12 Q21 14 22 20 V194 L12 204 H88 L78 194 V20 Q79 14 84 12" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <line x1="22" y1="194" x2="78" y2="194" stroke="${C.inner}" stroke-width="1.6"/>`,
    ports: [
      { id: 'mouth', x: 50, y: 12, dx: 0, dy: -1, type: 'mouth', diameter: 68, depth: 24, target: [50, 160], edge: [16, 12, 84, 12] },
      { id: 'base', x: 50, y: 206, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });

  // 20-21. Reagent bottle (112x196 — square shoulder + ground stopper collar + pale water) & Bottle (84x206 — sleek capped bottle)
  register('reagent-bottle', '试剂瓶', '容器', {
    width: 112, height: 196,
    svg:
      `<path d="M12 114 H100 V184 H12 Z" fill="${C.liquid}" stroke="none"/>\n` +
      `  <line x1="12" y1="114" x2="100" y2="114" stroke="${C.liquidLine}" stroke-width="2.0"/>\n` +
      `  <path d="M36 22 Q40 24 41 30 V54 Q12 56 12 72 V184 H100 V72 Q100 56 71 54 V30 Q72 24 76 22" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <rect x="28" y="10" width="56" height="8" rx="1.5" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="3.4"/>\n` +
      `  <path d="M40 18 L43 44 H69 L72 18" fill="none" stroke="${C.stroke}" stroke-width="3.2" stroke-linejoin="round"/>`,
    ports: [
      { id: 'mouth', x: 56, y: 10, dx: 0, dy: -1, type: 'mouth', diameter: 40, depth: 24, target: [56, 150], edge: [28, 10, 84, 10] },
      { id: 'base', x: 56, y: 186, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });

  register('bottle', '玻璃瓶', '容器', {
    width: 84, height: 206,
    svg:
      `<path d="M14 114 H70 V186 Q60 198 48 190 Q42 198 36 190 Q24 198 14 186 Z" fill="${C.liquid}" stroke="none"/>\n` +
      `  <line x1="14" y1="114" x2="70" y2="114" stroke="${C.liquidLine}" stroke-width="2.0"/>\n` +
      `  <path d="M32 22 V34 Q14 48 14 72 V184 Q20 198 34 192 Q42 200 50 192 Q64 198 70 184 V72 Q70 48 52 34 V22" fill="none" stroke="${C.stroke}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <rect x="26" y="8" width="32" height="14" rx="3" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="2.6"/>\n` +
      `  <rect x="24" y="21" width="36" height="5" rx="2" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.0"/>`,
    ports: [
      { id: 'mouth', x: 42, y: 8, dx: 0, dy: -1, type: 'mouth', diameter: 28, depth: 20, target: [42, 150], edge: [26, 8, 58, 8] },
      { id: 'base', x: 42, y: 196, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });

  // Thermos (108x200)
  register('thermos', '真空保温瓶', '容器', {
    width: 108, height: 200,
    svg:
      `<path d="M34 12 Q37 14 37 20 V42 Q14 52 14 72 V148 A40 40 0 0 0 94 148 V72 Q94 52 71 42 V20 Q71 14 74 12" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <path d="M43 18 V46 Q24 55 24 74 V148 A30 30 0 0 0 84 148 V74 Q84 55 65 46 V18" fill="none" stroke="${C.inner}" stroke-width="1.8" stroke-linecap="round"/>`,
    ports: [
      { id: 'mouth', x: 54, y: 12, dx: 0, dy: -1, type: 'mouth', diameter: 40, depth: 24, target: [54, 150], edge: [34, 12, 74, 12] },
      { id: 'base', x: 54, y: 188, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });

  // 23. Wash bottle (120x204 — crisp left-angling delivery spout + pale liquid + white cap collar)
  register('wash-bottle', '洗瓶', '容器', {
    width: 120, height: 204,
    svg:
      `<path d="M38 122 H106 V182 Q106 192 96 192 H48 Q38 192 38 182 Z" fill="${C.liquid}" stroke="none"/>\n` +
      `  <line x1="38" y1="122" x2="106" y2="122" stroke="${C.liquidLine}" stroke-width="2.0"/>\n` +
      `  <path d="M72 178 V14 Q72 8 64 14 L8 53" fill="none" stroke="${C.stroke}" stroke-width="9.0" stroke-linecap="butt" stroke-linejoin="round"/>\n` +
      `  <path d="M72 178 V14 Q72 8 64 14 L8 53" fill="none" stroke="#FFFFFF" stroke-width="3.6" stroke-linecap="butt" stroke-linejoin="round"/>\n` +
      `  <path d="M56 58 V66 Q36 74 36 92 V182 Q36 194 48 194 H96 Q108 194 108 182 V92 Q108 74 88 66 V58" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <rect x="52" y="44" width="40" height="14" rx="2" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="3.0"/>`,
    ports: [
      { id: 'mouth', x: 72, y: 44, dx: 0, dy: -1, type: 'mouth', diameter: 40, depth: 24, target: [72, 150], edge: [52, 44, 92, 44] },
      { id: 'outlet', x: 8, y: 53, dx: -0.822, dy: 0.569, type: 'tube', diameter: 9, edge: [5.4, 49.3, 10.6, 56.7] },
      { id: 'base', x: 72, y: 196, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });
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
        id: i === 0 ? 'inlet' : i === 1 ? 'outlet' : 'branch',
        x, y, dx, dy,
        type: portType,
        diameter: wOuter,
        segment: [r(x - ux * 5), r(y - uy * 5), r(x - ux * 35), r(y - uy * 35)],
        edge: [r(x - tx * hwEdge), r(y - ty * hwEdge), r(x + tx * hwEdge), r(y + ty * hwEdge)],
      };
    });
  }

  for (const [id, name, widthBox, w, cap] of [
    ['tube', '直玻璃管', 40, 20, false],
    ['capillary-tube', '毛细管', 32, 12, true],
  ]) {
    const cx = widthBox / 2;
    const hw = w / 2;
    const svg =
      `<path d="M${cx - hw} 10 V170 M${cx + hw} 10 V170" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round"/>` +
      (cap ? `\n  <line x1="${cx}" y1="12" x2="${cx}" y2="168" stroke="${C.inner}" stroke-width="2.0" stroke-linecap="round"/>` : '');
    register(id, name, '导管', {
      width: widthBox, height: 180, svg,
      ports: endsToPorts([[cx, 10, 0, -1], [cx, 170, 0, 1]], w, hw, 'tube'),
    });
  }

  // Tube-bend (136x152): MUST keep straight segments > 67.5px (studio:bung.height * 0.9 = 67.5)
  {
    const id = 'tube-bend';
    const d = 'M14 134 H88 Q120 134 120 102 V12';
    const ports = endsToPorts([[14, 134, -1, 0], [120, 12, 0, -1]], 20, 8.2, 'tube');
    ports[0].segment = [14, 134, 88, 134]; // 74px > 67.5px
    ports[1].segment = [120, 12, 120, 100]; // 88px > 67.5px
    register(id, '90° 弯管', '导管', {
      width: 136, height: 152,
      svg: openTubeWall(d, 20, '#FFFFFF', 'butt'),
      ports,
    });
  }

  // S-bent-tube (160x110 — Chemix horizontal curved delivery glass tube)
  register('s-bent-tube', 'S 形管', '导管', {
    width: 160, height: 110,
    svg: openTubeWall('M20 12 V38 C20 56 36 56 56 56 H104 C124 56 140 56 140 74 V98', 20, '#FFFFFF', 'butt'),
    ports: endsToPorts([[20, 12, 0, -1], [140, 98, 0, 1]], 20, 8.2, 'tube'),
  });

  // U-bent-tube (144x132 — wide Chemix U-bend)
  register('u-bent-tube', 'U 形管', '导管', {
    width: 144, height: 132,
    svg: openTubeWall('M22 12 V68 A50 50 0 0 0 122 68 V12', 20, '#FFFFFF', 'butt'),
    ports: endsToPorts([[22, 12, 0, -1], [122, 12, 0, -1]], 20, 8.2, 'tube'),
  });

  // Salt bridge (164x148 — inverted ∩-shape matching Chemix; inlet bottom-left dy:1, outlet bottom-right dy:1)
  {
    const d = 'M22 134 V68 Q22 16 74 16 H90 Q142 16 142 68 V134';
    const svg =
      `${openTubeWall(d, 20, C.liquid, 'butt')}\n` +
      `  <line x1="16" y1="126" x2="28" y2="126" stroke="${C.liquidLine}" stroke-width="1.6"/>\n` +
      `  <line x1="136" y1="126" x2="148" y2="126" stroke="${C.liquidLine}" stroke-width="1.6"/>`;
    register('salt-bridge', '盐桥', '导管', {
      width: 164, height: 148, svg,
      ports: endsToPorts([[22, 134, 0, 1], [142, 134, 0, 1]], 20, 8.2, 'tube'),
    });
  }

  // Rubber hose (200x68 — sleek horizontal natural-rubber S-wave hose)
  {
    const d = 'M12 40 C66 8 134 60 188 28';
    const svg =
      `<path d="${d}" fill="none" stroke="${C.stroke}" stroke-width="15.0" stroke-linecap="butt"/>\n` +
      `  <path d="${d}" fill="none" stroke="#D0735B" stroke-width="8.8" stroke-linecap="butt"/>`;
    register('rubber-tube', '橡胶软管', '导管', {
      width: 200, height: 68, svg,
      ports: endsToPorts([[12, 40, -0.92, 0.39], [188, 28, 0.92, -0.39]], 15, 6.0, 'hose'),
    });
  }

  // Tube adapter (70x170)
  register('tube-adapter', '变径接头', '导管', {
    width: 70, height: 170,
    svg:
      `<path d="M16 10 Q18 12 18 18 V66 L27 100 V158 M43 158 V100 L52 66 V18 Q52 12 54 10" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>`,
    ports: [
      { id: 'inlet', x: 35, y: 10, dx: 0, dy: -1, type: 'tube', diameter: 38, edge: [16, 10, 54, 10] },
      { id: 'outlet', x: 35, y: 158, dx: 0, dy: 1, type: 'tube', diameter: 16, edge: [27, 158, 43, 158] },
    ],
  });

  // 3-way-crossing (96x156 — Chemix 3-port T-junction)
  {
    const ends = [[28, 10, 0, -1], [28, 146, 0, 1], [86, 78, 1, 0]];
    const svg =
      `<path d="M18 10 V146 M38 10 V68 H86 M86 88 H38 V146" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>`;
    register('3-way-crossing', '交叉导管', '导管', {
      width: 96, height: 156, svg,
      ports: endsToPorts(ends, 20, 10, 'tube'),
    });
  }
}

function registerCondensersAndDistillation(register) {
  // 33-35. Water condensers (92x320): bold #333333 walls + stepped-collar #DCE8EC joints + OPPOSITE coolant ports
  for (const [id, name] of [
    ['liebig-condenser', '直形冷凝管'],
    ['allihn', '球形冷凝管'],
    ['graham', '蛇形冷凝管'],
  ]) {
    const cx = 46;
    const jTop = 52;
    const jBot = 264;
    const jHw = 17;
    const inBarb = oliveBarb(id, cx - jHw, 238, -1, 22, 5.2, 4.4);
    const outBarb = oliveBarb(id, cx + jHw, 78, 1, 22, 5.2, 4.4);

    const outerWall =
      `<path d="M${cx - 8.5} 28 V42 C${cx - 8.5} 48 ${cx - jHw} 48 ${cx - jHw} ${jTop + 10} V${jBot - 10} ` +
      `C${cx - jHw} ${jBot} ${cx - 8.5} ${jBot} ${cx - 8.5} ${jBot + 8} V292 M${cx + 8.5} 292 V${jBot + 8} ` +
      `C${cx + 8.5} ${jBot} ${cx + jHw} ${jBot} ${cx + jHw} ${jBot - 10} V${jTop + 10} ` +
      `C${cx + jHw} 48 ${cx + 8.5} 48 ${cx + 8.5} 42 V28" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>`;

    let innerBody = '';
    if (id === 'liebig-condenser') {
      innerBody =
        `<line x1="${cx - 6}" y1="28" x2="${cx - 6}" y2="292" stroke="${C.inner}" stroke-width="2.0"/>\n` +
        `  <line x1="${cx + 6}" y1="28" x2="${cx + 6}" y2="292" stroke="${C.inner}" stroke-width="2.0"/>`;
    } else if (id === 'allihn') {
      const bulbs = 5;
      const span = jBot - jTop - 24;
      const step = span / bulbs;
      const yStart = jTop + 12;
      let dL = `M${cx - 6} 28 V${r(yStart)}`;
      let dR = `M${cx + 6} 28 V${r(yStart)}`;
      for (let i = 0; i < bulbs; i++) {
        const y0 = yStart + i * step;
        const y1 = y0 + step;
        const ym = (y0 + y1) / 2;
        dL += ` C${cx - 6} ${r(y0 + step * 0.16)} ${cx - 13.5} ${r(y0 + step * 0.22)} ${cx - 13.5} ${r(ym)} C${cx - 13.5} ${r(y1 - step * 0.22)} ${cx - 6} ${r(y1 - step * 0.16)} ${cx - 6} ${r(y1)}`;
        dR += ` C${cx + 6} ${r(y0 + step * 0.16)} ${cx + 13.5} ${r(y0 + step * 0.22)} ${cx + 13.5} ${r(ym)} C${cx + 13.5} ${r(y1 - step * 0.22)} ${cx + 6} ${r(y1 - step * 0.16)} ${cx + 6} ${r(y1)}`;
      }
      dL += ' V292';
      dR += ' V292';
      innerBody = `<path d="${dL}" fill="none" stroke="${C.inner}" stroke-width="2.0" stroke-linejoin="round"/>\n` +
        `  <path d="${dR}" fill="none" stroke="${C.inner}" stroke-width="2.0" stroke-linejoin="round"/>`;
    } else {
      const turns = 7;
      const y0 = jTop + 16;
      const y1 = jBot - 16;
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
      coil += ` C${cx + amp} ${r(y1 + 6)} ${cx} ${r(y1 + 6)} ${cx} ${r(y1 + 12)} V292`;
      innerBody =
        `<path d="${coil}" fill="none" stroke="${C.inner}" stroke-width="5.6" stroke-linecap="round" stroke-linejoin="round"/>\n` +
        `  <path d="${coil}" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
    }

    const fem = verticalFemaleJoint(id, cx, 4, 24, 12, 8.5, { sw: GSW, stepOut: 2.0 });
    const male = verticalMaleJoint(id, cx, 292, 24, 11.5, 8.8, { sw: GSW, stepIn: 3.0 });
    const seals =
      `<path d="M${cx - 10} ${jTop + 4} Q${cx} ${jTop + 8} ${cx + 10} ${jTop + 4}" fill="none" stroke="${C.inner}" stroke-width="1.3"/>\n` +
      `  <path d="M${cx - 10} ${jBot - 4} Q${cx} ${jBot - 8} ${cx + 10} ${jBot - 4}" fill="none" stroke="${C.inner}" stroke-width="1.3"/>`;
    const svg = `${inBarb.svg}\n  ${outBarb.svg}\n  ${outerWall}\n  ${innerBody}\n  ${seals}\n  ${fem}\n  ${male}`;
    register(id, name, '冷凝与蒸馏', {
      width: 92, height: 320, svg,
      ports: [
        { id: 'inlet', x: cx, y: 4, dx: 0, dy: -1, type: 'glass-joint', diameter: 24, depth: 24, edge: [cx - 12, 4, cx + 12, 4] },
        { id: 'outlet', x: cx, y: 316, dx: 0, dy: 1, type: 'glass-joint', diameter: 17.6, depth: 24, edge: [cx - 8.8, 316, cx + 8.8, 316] },
        { id: 'water-in', ...inBarb.port, type: 'coolant' },
        { id: 'water-out', ...outBarb.port, type: 'coolant' },
        { id: 'grip-site', x: cx, y: 158, dx: 1, dy: 0, type: 'grip-site', diameter: 0, segment: [cx, 96, cx, 224] },
      ],
    });
  }

  // 36. Vigreux fractionating column (76x260)
  {
    const id = 'fractionating-column';
    const cx = 38;
    let spikes = '';
    for (let y = 58; y <= 198; y += 22) {
      spikes +=
        `<path d="M20 ${y} C30 ${y + 2} 33 ${y + 4} 33 ${y + 6} C33 ${y + 8} 30 ${y + 10} 20 ${y + 12}" fill="none" stroke="${C.inner}" stroke-width="1.8" stroke-linecap="round"/>\n` +
        `<path d="M56 ${y + 9} C46 ${y + 11} 43 ${y + 13} 43 ${y + 15} C43 ${y + 17} 46 ${y + 19} 56 ${y + 21}" fill="none" stroke="${C.inner}" stroke-width="1.8" stroke-linecap="round"/>\n`;
    }
    const svg =
      `<path d="M27.5 32 V39 C27.5 45 20 46 20 54 V210 C20 218 29.5 219 29.5 225 V226 M46.5 226 V225 C46.5 219 56 218 56 210 V54 C56 46 48.5 45 48.5 39 V32" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  ${spikes}` +
      `  ${verticalFemaleJoint(id, cx, 10, 22, 11, 8.5, { sw: GSW, stepOut: 2.0 })}\n` +
      `  ${verticalMaleJoint(id, cx, 226, 22, 12, 9.8, { sw: GSW, stepIn: 3.5 })}`;
    register(id, '分馏柱', '冷凝与蒸馏', {
      width: 76, height: 260, svg,
      ports: [
        { id: 'inlet', x: cx, y: 10, dx: 0, dy: -1, type: 'glass-female', diameter: 22, depth: 20, edge: [cx - 11, 10, cx + 11, 10] },
        { id: 'outlet', x: cx, y: 248, dx: 0, dy: 1, type: 'glass-male', diameter: 19.6, depth: 22, edge: [cx - 9.8, 248, cx + 9.8, 248] },
      ],
    });
  }

  // 37. Thiele tube (116x200)
  register('thiele-tube', '提勒熔点管', '冷凝与蒸馏', {
    width: 116, height: 200,
    svg:
      `<path d="M16 10 Q19 12 19 18 V154 Q19 182 39 182 Q57 182 66 170 L104 120 Q111 112 104 104 L58 64 V18 Q58 12 61 10" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <path d="M58 88 L88 112 L58 136 Z" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linejoin="round"/>`,
    ports: [{ id: 'mouth', x: 38.5, y: 10, dx: 0, dy: -1, type: 'mouth', diameter: 45, edge: [16, 10, 61, 10] }],
  });

  // 38. Cold finger (112x196 — Chemix tapered collar + inner coolant dip tube + left & top-right olive barbs)
  {
    const id = 'cold-finger';
    const bL = oliveBarb(`${id}-in`, 44, 52, -1, 32, 4.5, 3.8);
    const bR = oliveBarb(`${id}-out`, 80, 14, 1, 22, 4.5, 3.8);
    const outer =
      `<path d="M44 47.5 C44 39 48 35 52 34 M60 34 C64 35 68 39 68 47.5 V174 A12 12 0 0 1 44 174 V56.5" fill="none" stroke="${C.stroke}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`;
    const dipTube =
      `<path d="M52 158 V16 Q52 10 58 10 H80 M80 18 H60 V158 H52" fill="none" stroke="${C.stroke}" stroke-width="3.0" stroke-linecap="round" stroke-linejoin="round"/>`;
    const collar =
      `<path d="M34 92 H78 V98 H74 L70 132 H42 L38 98 H34 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.6" stroke-linejoin="round"/>\n` +
      `  <path d="M44 98 V132 M52 98 V132 M60 98 V132 M68 98 V132" fill="none" stroke="${C.inner}" stroke-width="1.6"/>`;
    register(id, '冷指', '冷凝与蒸馏', {
      width: 112, height: 196,
      svg: `${bL.svg}\n  ${bR.svg}\n  ${outer}\n  ${dipTube}\n  ${collar}`,
      ports: [
        { id: 'inlet', ...bL.port, type: 'tube' },
        { id: 'outlet', ...bR.port, type: 'tube' },
      ],
    });
  }

  // 39. Distillation head (120x190 — Chemix stepped-collar joints + #DCE8EC inner arcs + curved junction)
  {
    const id = 'distillation-head';
    const cx = 24;
    const ux = 0.94, uy = 0.342;
    const tx = -uy, ty = ux;
    const sx = 92, sy = 64;
    const ex = sx + ux * 22, ey = sy + uy * 22;
    const fem = verticalFemaleJoint(id, cx, 10, 22, 12, 9.0, { sw: GSW, stepOut: 2.0 });
    const male = verticalMaleJoint(id, cx, 156, 22, 12.5, 9.8, { sw: GSW, stepIn: 1.5 });
    const arm = angledMaleJoint(id, sx, sy, ux, uy, 22, 11.5, 9.0, { sw: GSW, collar: false });
    const l0 = [r(sx - tx * 11.5), r(sy - ty * 11.5)];
    const r0 = [r(sx + tx * 11.5), r(sy + ty * 11.5)];
    const main =
      `<path d="M${cx - 11} 32 V156 M${cx + 11} 32 V40 Q${cx + 11} 48 ${cx + 22} 51 L${l0[0]} ${l0[1]} M${r0[0]} ${r0[1]} L${cx + 19} 65 Q${cx + 11} 63 ${cx + 11} 72 V156" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>`;
    const sideArc = jointArc(cx + 5, 48, cx + 5, 68, -4.0, { sw: 2.2 });
    register(id, '蒸馏头', '冷凝与蒸馏', {
      width: 120, height: 190,
      svg: `${main}\n  ${sideArc}\n  ${fem}\n  ${male}\n  ${arm.svg}`,
      ports: [
        { id: 'mouth', x: cx, y: 10, dx: 0, dy: -1, type: 'glass-female', diameter: 24, edge: [cx - 12, 10, cx + 12, 10] },
        { id: 'outlet', x: r(ex), y: r(ey), dx: ux, dy: uy, type: 'glass-male', diameter: arm.diameter, edge: arm.edge },
        { id: 'base', x: cx, y: 178, dx: 0, dy: 1, type: 'glass-male', diameter: 19.6, edge: [cx - 9.8, 178, cx + 9.8, 178] },
      ],
    });
  }

  // 40. Claisen adapter (130x196 — Chemix stepped-collar joints + #DCE8EC arcs)
  {
    const id = 'claisen';
    const cx1 = 24, cx2 = 76;
    const ux = 0.94, uy = 0.342;
    const tx = -uy, ty = ux;
    const sx = 102, sy = 76;
    const l0 = [r(sx - tx * 10), r(sy - ty * 10)];
    const r0 = [r(sx + tx * 10), r(sy + ty * 10)];
    const fem1 = verticalFemaleJoint(id, cx1, 16, 22, 11.5, 8.5, { sw: GSW, stepOut: 2.5 });
    const fem2 = verticalFemaleJoint(id, cx2, 10, 22, 11.5, 8.5, { sw: GSW, stepOut: 2.5 });
    const male = verticalMaleJoint(id, cx1, 162, 22, 12.5, 9.8, { sw: GSW, stepIn: 1.5 });
    const arm = angledMaleJoint(id, sx, sy, ux, uy, 20, 10, 7.8, { sw: GSW, collar: false });
    const claisenBody =
      `<path d="M${cx1 - 11} 38 V162 M${cx1 + 11} 38 V106 C${cx1 + 28} 106 ${cx2 - 11} 92 ${cx2 - 11} 70 V32 M${cx2 + 11} 32 V58 Q${cx2 + 11} 65 ${cx2 + 20} 67 L${l0[0]} ${l0[1]} M${r0[0]} ${r0[1]} L${cx2 + 14} 84 C${cx2 + 14} 108 ${cx1 + 30} 124 ${cx1 + 11} 126 V162" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>`;
    const branchArc = jointArc(cx1 + 4, 106, cx1 + 4, 126, -4.0, { sw: 2.2 });
    register(id, '克莱森接头', '冷凝与蒸馏', {
      width: 130, height: 196,
      svg: `${claisenBody}\n  ${branchArc}\n  ${fem1}\n  ${fem2}\n  ${male}\n  ${arm.svg}`,
      ports: [
        { id: 'mouth', x: cx1, y: 16, dx: 0, dy: -1, type: 'glass-female', diameter: 23, edge: [cx1 - 11.5, 16, cx1 + 11.5, 16] },
        { id: 'outlet', x: arm.tip[0], y: arm.tip[1], dx: ux, dy: uy, type: 'glass-male', diameter: arm.diameter, edge: arm.edge },
        { id: 'base', x: cx1, y: 184, dx: 0, dy: 1, type: 'glass-male', diameter: 19.6, edge: [cx1 - 9.8, 184, cx1 + 9.8, 184] },
        { id: 'mouth-right', x: cx2, y: 10, dx: 0, dy: -1, type: 'glass-female', diameter: 23, edge: [cx2 - 11.5, 10, cx2 + 11.5, 10] },
      ],
    });
  }

  // 41. Dean-Stark trap (130x210 — angled vapor sidearm from lower-left male cone -> graduated trap + crimson PTFE valve)
  {
    const id = 'dean-stark-trap';
    const leftX = 24;
    const colX = 96;
    const femTop = verticalFemaleJoint(id, colX, 10, 22, 12, 9.5, { sw: GSW, stepOut: 1.5 });
    const maleBot = verticalMaleJoint(id, leftX, 138, 22, 10.5, 8.2, { sw: GSW, stepIn: 1.5 });
    const body =
      `<path d="M${leftX - 9} 138 V94 Q${leftX - 9} 80 ${leftX + 4} 73 L${colX - 11} 44 V32" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <path d="M${leftX + 9} 138 V97 L${colX - 11} 62 V166 Q${colX - 11} 176 ${colX - 4} 180 V204 M${colX + 4} 204 V180 Q${colX + 11} 176 ${colX + 11} 166 V32" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>`;
    const jArc = jointArc(colX - 5, 45, colX - 5, 61, -3.5, { sw: 2.2 });
    const stopcock = drawStopcock(id, colX, 188, { w: 22, h: 9 });
    const ticks = gradTicks(colX + 9, 86, 160, 7, 2, 8, { dir: -1 });
    register(id, '分水器', '冷凝与蒸馏', {
      width: 130, height: 210,
      svg: `${body}\n  ${jArc}\n  ${femTop}\n  ${maleBot}\n  ${ticks}\n  ${stopcock}`,
      ports: [
        { id: 'inlet', x: colX, y: 10, dx: 0, dy: -1, type: 'glass-female', diameter: 24, edge: [colX - 12, 10, colX + 12, 10] },
        { id: 'outlet', x: leftX, y: 160, dx: 0, dy: 1, type: 'glass-male', diameter: 16.4, edge: [leftX - 8.2, 160, leftX + 8.2, 160] },
        { id: 'drain', x: colX, y: 204, dx: 0, dy: 1, type: 'delivery', diameter: 8, segment: [colX, 204, colX, 186], edge: [colX - 4, 204, colX + 4, 204] },
      ],
    });
  }

  // 42. Drying tube (172x148 — Chemix bent L-shaped bulb drying tube; inlet & outlet segments >= 34px)
  {
    const topWall = 'M11 136 Q9 116 12 96 H10 V62 Q10 34 41.2 34.8 A17 17 0 0 1 73.1 35.5 L161 56';
    const botWall = 'M29 136 Q31 116 28 96 H30 V62 Q30 49.8 42.5 49.8 A17 17 0 0 0 71.2 50.3 L159 73';
    const wool =
      `<path d="M86 42 Q89 47 85 52 M140 54 Q143 60 139 65" fill="none" stroke="${C.muted}" stroke-width="1.8" stroke-linecap="round"/>`;
    register('drying-tube', '干燥管', '冷凝与蒸馏', {
      width: 172, height: 148,
      svg:
        `<path d="${topWall}" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
        `  <path d="${botWall}" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
        `  ${wool}`,
      ports: [
        { id: 'inlet', x: 20, y: 136, dx: 0, dy: 1, type: 'tube', diameter: 18, segment: [20, 130, 20, 96], edge: [11, 136, 29, 136] },
        { id: 'outlet', x: 160, y: 64.5, dx: 0.974, dy: 0.228, type: 'tube', diameter: 17, segment: [154, 63.1, 118, 54.9], edge: [161, 56, 159, 73] },
      ],
    });
  }
}

function registerFunnels(register) {
  // 43. Filter funnel (140x150 — wide open 60° V-cone + 45° beveled drip tip)
  register('filter-funnel', '过滤漏斗', '过滤与分液', {
    width: 140, height: 150,
    svg:
      `<path d="M10 12 L62 78 V144 L78 134 V78 L130 12" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>`,
    ports: [
      { id: 'mouth', x: 70, y: 12, dx: 0, dy: -1, type: 'mouth', diameter: 120, edge: [10, 12, 130, 12] },
      { id: 'stem', x: 70, y: 144, dx: 0, dy: 1, type: 'stem', diameter: 16, segment: [70, 138, 70, 84], depth: 60 },
    ],
  });

  // 44. Thistle tube (64x256 — Chemix flared tulip rim + bulbous thistle top + long slender stem)
  register('thistle-tube', '长颈漏斗', '过滤与分液', {
    width: 64, height: 256,
    svg:
      `<path d="M9 40 H55 C53 54 41 60 37 64 V248 H27 V64 C23 60 11 54 9 40 Z" fill="${C.liquid}" stroke="none"/>\n` +
      `  <line x1="9" y1="40" x2="55" y2="40" stroke="${C.liquidLine}" stroke-width="2.0"/>\n` +
      `  <path d="M16 10 L23 21 C7 28 7 58 27 64 V248 M48 10 L41 21 C57 28 57 58 37 64 V248" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>`,
    ports: [
      { id: 'mouth', x: 32, y: 10, dx: 0, dy: -1, type: 'mouth', diameter: 32, edge: [16, 10, 48, 10] },
      { id: 'stem', x: 32, y: 248, dx: 0, dy: 1, type: 'stem', diameter: 10, segment: [32, 240, 32, 150], depth: 90, edge: [27, 248, 37, 248] },
    ],
  });

  // 45. Separatory funnel (106x236 — graceful tapered conical pear + crimson PTFE stopcock)
  register('separatory-funnel', '分液漏斗', '过滤与分液', {
    width: 106, height: 236,
    svg:
      `<path d="M39 10 Q42 12 42 18 V34 C6 50 10 88 46 168 V228 M67 10 Q64 12 64 18 V34 C100 50 96 88 60 168 V228" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  ${jointArc(44, 24, 62, 24, 2.4, { sw: 2.0 })}\n` +
      `  ${drawStopcock('separatory-funnel', 53, 184, { w: 22, h: 10 })}`,
    ports: [
      { id: 'mouth', x: 53, y: 10, dx: 0, dy: -1, type: 'glass-female', diameter: 28, edge: [39, 10, 67, 10] },
      { id: 'stem', x: 53, y: 228, dx: 0, dy: 1, type: 'stem', diameter: 14, segment: [53, 220, 53, 140], depth: 80 },
    ],
  });

  // 46. Dropping funnel (92x236 — cylindrical graduated body + stepped open neck + crimson PTFE stopcock)
  register('dropping-funnel', '滴液漏斗', '过滤与分液', {
    width: 92, height: 236,
    svg:
      `<path d="M32 10 Q35 12 35 18 V36 Q18 44 18 54 V134 Q18 144 39 152 V228 M60 10 Q57 12 57 18 V36 Q74 44 74 54 V134 Q74 144 53 152 V228" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  ${jointArc(37, 24, 55, 24, 2.4, { sw: 2.0 })}\n` +
      `  ${gradTicks(71, 60, 126, 6, 2, 10, { dir: -1 })}\n` +
      `  ${drawStopcock('dropping-funnel', 46, 182, { w: 22, h: 10 })}`,
    ports: [
      { id: 'mouth', x: 46, y: 10, dx: 0, dy: -1, type: 'glass-female', diameter: 28, edge: [32, 10, 60, 10] },
      { id: 'stem', x: 46, y: 228, dx: 0, dy: 1, type: 'stem', diameter: 14, segment: [46, 220, 46, 140], depth: 80 },
    ],
  });
}

function registerMeasuring(register) {
  // 47. Graduated cylinder (64x250)
  register('cylinder', '量筒', '测量', {
    width: 64, height: 250,
    svg:
      `<path d="M12 10 L16 17 V218 H48 V16 Q48 12 50 10" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <path d="M6 238 Q6 230 16 226 L18 218 H46 L48 226 Q58 230 58 238 Z" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="3.2" stroke-linejoin="round"/>\n` +
      `  <line x1="6" y1="240" x2="58" y2="240" stroke="${C.stroke}" stroke-width="3.2" stroke-linecap="round"/>\n` +
      `  ${gradTicks(46, 32, 206, 15, 3, 9, { dir: -1 })}\n` +
      `  ${labelText(34, 34.5, '100', 6.4, C.muted, 'end', false)}\n` +
      `  ${labelText(34, 104.5, '50', 6.4, C.muted, 'end', false)}\n` +
      `  ${labelText(34, 174.5, '10', 6.4, C.muted, 'end', false)}`,
    ports: [
      { id: 'mouth', x: 31, y: 10, dx: 0, dy: -1, type: 'mouth', diameter: 38, edge: [12, 10, 50, 10] },
      { id: 'base', x: 32, y: 240, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });

  // 48-49. Bulb pipette & Mohr graduated pipette (48x260)
  register('pipette', '移液管', '测量', {
    width: 48, height: 260,
    svg:
      `<path d="M19 10 V94 C8 105 8 157 19 168 V224 L22 248 M26 248 L29 224 V168 C40 157 40 105 29 94 V10" fill="none" stroke="${C.stroke}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <line x1="18" y1="54" x2="30" y2="54" stroke="${C.crimson}" stroke-width="2.2"/>`,
    ports: [
      { id: 'stem', x: 24, y: 248, dx: 0, dy: 1, type: 'probe', diameter: 8, segment: [24, 238, 24, 170] },
      { id: 'mouth', x: 24, y: 10, dx: 0, dy: -1, type: 'pipette-stem', diameter: 10, edge: [19, 10, 29, 10] },
    ],
  });

  register('mohr', '刻度吸管', '测量', {
    width: 48, height: 260,
    svg:
      `<path d="M17 10 V220 L22 248 M26 248 L31 220 V10" fill="none" stroke="${C.stroke}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <rect x="18" y="18" width="12" height="4" fill="${C.steelBlue}"/>\n` +
      `  ${gradTicks(30, 46, 200, 12, 2, 8, { dir: -1 })}`,
    ports: [
      { id: 'stem', x: 24, y: 248, dx: 0, dy: 1, type: 'probe', diameter: 8, segment: [24, 238, 24, 170] },
      { id: 'mouth', x: 24, y: 10, dx: 0, dy: -1, type: 'pipette-stem', diameter: 14, edge: [17, 10, 31, 10] },
    ],
  });

  // 50. Burette (46x310 — tall slender column + crimson PTFE stopcock)
  register('burette', '滴定管', '测量', {
    width: 46, height: 310,
    svg:
      `<path d="M10 10 Q13 12 13 18 V246 L19 256 V278 L21.5 300 M24.5 300 L27 278 V256 L33 246 V18 Q33 12 36 10" fill="none" stroke="${C.stroke}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  ${gradTicks(32, 32, 234, 16, 4, 8, { dir: -1 })}\n` +
      `  ${labelText(22, 34.5, '0', 6.4, C.muted, 'end', false)}\n` +
      `  ${labelText(22, 236.5, '50', 6.4, C.muted, 'end', false)}\n` +
      `  ${drawStopcock('burette', 23, 266, { w: 22, h: 9 })}`,
    ports: [
      { id: 'stem', x: 23, y: 300, dx: 0, dy: 1, type: 'probe', diameter: 8, segment: [23, 290, 23, 210] },
      { id: 'mouth', x: 23, y: 10, dx: 0, dy: -1, type: 'mouth', diameter: 26, edge: [10, 10, 36, 10] },
    ],
  });

  // 51. Eudiometer (56x250)
  register('eudiometer', '量气管', '测量', {
    width: 56, height: 250,
    svg:
      `<path d="M14 10 Q17 12 17 18 V216 A11 11 0 0 0 39 216 V18 Q39 12 42 10" fill="none" stroke="${C.stroke}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  ${gradTicks(38, 30, 194, 14, 2, 10, { dir: -1 })}\n` +
      `  <line x1="15" y1="208" x2="22" y2="208" stroke="${C.brass}" stroke-width="2.2" stroke-linecap="round"/>\n` +
      `  <line x1="34" y1="208" x2="41" y2="208" stroke="${C.brass}" stroke-width="2.2" stroke-linecap="round"/>`,
    ports: [
      { id: 'mouth', x: 28, y: 10, dx: 0, dy: -1, type: 'mouth', diameter: 28, edge: [14, 10, 42, 10] },
      { id: 'base', x: 28, y: 230, dx: 0, dy: 1, type: 'base', diameter: 0 },
    ],
  });

  // 52. Thermometer (60x250 — preserves diameter 14 probe)
  register('thermometer', '温度计', '测量', {
    width: 60, height: 250,
    svg:
      `<circle cx="28" cy="11" r="4" fill="none" stroke="${C.stroke}" stroke-width="2.4"/>\n` +
      `  <path d="M20 202 V23 A8 8 0 0 1 36 23 V202 A16 16 0 1 1 20 202 Z" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="3.2" stroke-linejoin="round"/>\n` +
      `  <line x1="28" y1="74" x2="28" y2="218" stroke="${C.crimson}" stroke-width="4.6" stroke-linecap="round"/>\n` +
      `  <circle cx="28" cy="218" r="10.5" fill="${C.crimson}" stroke="none"/>\n` +
      `  ${gradTicks(35, 36, 184, 12, 2, 8, { dir: 1 })}\n` +
      `  ${labelText(46, 41, '100', 7, C.muted, 'start', false)}\n` +
      `  ${labelText(46, 184, '0°C', 7, C.muted, 'start', false)}`,
    ports: [{ id: 'probe', x: 28, y: 234, dx: 0, dy: 1, type: 'probe', diameter: 14, segment: [28, 194, 28, 30] }],
  });

  // 53. Hydrometer (56x250)
  register('hydrometer', '液体比重计', '测量', {
    width: 56, height: 250,
    svg:
      `<path d="M24 10 V106 Q14 118 14 152 Q14 186 22 202 Q19 220 24 236 Q28 242 32 236 Q37 220 34 202 Q42 186 42 152 Q42 118 32 106 V10 Z" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="3.2" stroke-linejoin="round"/>\n` +
      `  <rect x="25.5" y="18" width="5" height="84" fill="${C.chassisTop}" stroke="${C.inner}" stroke-width="0.9"/>\n` +
      `  ${gradTicks(31, 24, 96, 10, 2, 4.5, { dir: -1 })}\n` +
      `  <path d="M21 212 Q28 219 35 212 L32 236 Q28 241 24 236 Z" fill="${C.amber}" stroke="${C.inner}" stroke-width="1.2"/>`,
    ports: [{ id: 'stem', x: 28, y: 240, dx: 0, dy: 1, type: 'immersible', diameter: 10, segment: [28, 230, 28, 170] }],
  });
}

function registerTransferAndSyringes(register) {
  // 54. Pump (64x210 — Chemix vertical thumb-wheel pipette pump, preserves mouth pipette-filler)
  {
    const cx = 26;
    const svg =
      `<path d="M18 12 V68 M32 12 V68" fill="none" stroke="${C.stroke}" stroke-width="2.6" stroke-linecap="round"/>\n` +
      `  <path d="M32 18 Q28 21 32 24 M32 28 Q28 31 32 34 M32 38 Q28 41 32 44 M32 48 Q28 51 32 54" fill="none" stroke="${C.stroke}" stroke-width="2.0" stroke-linecap="round"/>\n` +
      `  <line x1="10" y1="12" x2="40" y2="12" stroke="${C.stroke}" stroke-width="3.6" stroke-linecap="round"/>\n` +
      `  <path d="M44 90 C58 90 58 134 44 134 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.6" stroke-linejoin="round"/>\n` +
      `  <circle cx="51" cy="100" r="1.5" fill="${C.stroke}"/><circle cx="53" cy="112" r="1.5" fill="${C.stroke}"/><circle cx="51" cy="124" r="1.5" fill="${C.stroke}"/>\n` +
      `  <rect x="8" y="68" width="36" height="126" rx="2" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="3.2"/>\n` +
      `  <rect x="13" y="71" width="12" height="120" fill="${C.chassisTop}" stroke="none"/>\n` +
      `  <path d="M18 194 V204 M34 194 V204" fill="none" stroke="${C.stroke}" stroke-width="3.2" stroke-linecap="round"/>`;
    register('pump', '三阀吸球', '移液与注射', {
      width: 64, height: 210, svg,
      ports: [{ id: 'mouth', x: cx, y: 204, dx: 0, dy: 1, type: 'pipette-filler', diameter: 16, edge: [18, 204, 34, 204] }],
    });
  }

  // 55. Suction pear (80x190)
  {
    const W = 80, H = 190, cx = 40, yBot = 170;
    const bulb =
      `<path d="M${cx - 6} ${yBot} V142 C20 112 4 74 6 48 C8 22 22 10 ${cx} 10 C${W - 22} 10 ${W - 8} 22 ${W - 6} 48 C${W - 4} 74 ${cx + 20} 112 ${cx + 6} 142 V${yBot}" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="3.0" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <rect x="${cx - 8}" y="${yBot - 16}" width="16" height="16" rx="2" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="2.4"/>`;
    register('suction-pear', '吸耳球', '移液与注射', {
      width: W, height: H, svg: bulb,
      ports: [{ id: 'mouth', x: cx, y: yBot, dx: 0, dy: 1, type: 'pipette-filler', diameter: 12, edge: [cx - 6, yBot, cx + 6, yBot] }],
    });
  }

  // 56-57. Dropper pipette (48x220, charcoal bulb) & Plastic pipette (44x220)
  {
    const cx = 24;
    const svg =
      `<path d="M16 142 H32 L28 182 L26 208 H22 L20 182 Z" fill="${C.liquid}" stroke="none"/>\n` +
      `  <line x1="16" y1="142" x2="32" y2="142" stroke="${C.liquidLine}" stroke-width="1.8"/>\n` +
      `  <path d="M16 64 V182 L22 208 M26 208 L32 182 V64" fill="none" stroke="${C.stroke}" stroke-width="3.0" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <path d="M16 58 C12 28 16 10 24 10 C32 10 36 28 32 58 Z" fill="${C.bezel}" stroke="${C.stroke}" stroke-width="2.6" stroke-linejoin="round"/>\n` +
      `  <rect x="13" y="56" width="22" height="8" rx="3" fill="${C.bezel}" stroke="${C.stroke}" stroke-width="2.4"/>`;
    register('dropper-pipette', '滴管', '移液与注射', {
      width: 48, height: 220, svg,
      ports: [{ id: 'tip', x: cx, y: 208, dx: 0, dy: 1, type: 'stem', diameter: 6, segment: [cx, 198, cx, 90], edge: [21, 208, 27, 208] }],
    });
  }

  {
    const cx = 22;
    const svg =
      `<path d="M17 156 H27 L25 186 L24 208 H20 L19 186 Z" fill="${C.liquid}" stroke="none"/>\n` +
      `  <path d="M16 62 C11 32 14 10 22 10 C30 10 33 32 28 62 L27 180 L24 208 M20 208 L17 180 Z" fill="none" stroke="${C.stroke}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  ${gradTicks(26, 78, 152, 6, 2, 5, { dir: -1 })}`;
    register('plastic-pipette', '塑料滴管', '移液与注射', {
      width: 44, height: 220, svg,
      ports: [{ id: 'tip', x: cx, y: 208, dx: 0, dy: 1, type: 'stem', diameter: 6, segment: [cx, 198, cx, 90], edge: [19, 208, 25, 208] }],
    });
  }

  // 58. Pipette bottle (84x200 — Chemix clear tapered dropper bottle + pale liquid)
  register('pipette-bottle', '滴瓶', '移液与注射', {
    width: 84, height: 200,
    svg:
      `<path d="M12 128 H72 V186 Q72 190 66 190 H18 Q12 190 12 186 Z" fill="${C.liquid}" stroke="none"/>\n` +
      `  <line x1="12" y1="128" x2="72" y2="128" stroke="${C.liquidLine}" stroke-width="2.0"/>\n` +
      `  <path d="M31 12 L29 48 C15 62 12 78 12 96 V186 Q12 190 18 190 H66 Q72 190 72 186 V96 C72 78 69 62 55 48 L53 12" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <line x1="29" y1="48" x2="55" y2="48" stroke="${C.inner}" stroke-width="1.6"/>`,
    ports: [{ id: 'base', x: 42, y: 192, dx: 0, dy: 1, type: 'base', diameter: 0 }],
  });

  // 59. Syringe (56x230 — sleek Chemix syringe + pale liquid + #5F9A6E green needle hub + needle)
  {
    const cx = 28;
    const svg =
      `<rect x="19" y="122" width="18" height="44" fill="${C.liquid}" stroke="none"/>\n` +
      `  <line x1="19" y1="122" x2="37" y2="122" stroke="${C.liquidLine}" stroke-width="1.8"/>\n` +
      `  <rect x="21" y="14" width="14" height="100" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.4"/>\n` +
      `  <line x1="14" y1="12" x2="42" y2="12" stroke="${C.stroke}" stroke-width="4.2" stroke-linecap="round"/>\n` +
      `  <line x1="8" y1="54" x2="48" y2="54" stroke="${C.stroke}" stroke-width="4.2" stroke-linecap="round"/>\n` +
      `  <path d="M18 54 V162 Q18 166 23 166 H33 Q38 166 38 162 V54" fill="none" stroke="${C.stroke}" stroke-width="3.2" stroke-linejoin="round"/>\n` +
      `  <path d="M18 114 Q28 120 38 114" fill="none" stroke="${C.stroke}" stroke-width="3.2" stroke-linecap="round"/>\n` +
      `  ${gradTicks(36, 78, 154, 6, 2, 7, { dir: -1 })}\n` +
      `  <path d="M22 166 H34 L32 190 H24 Z" fill="${C.leaf}" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>\n` +
      `  <line x1="${cx}" y1="190" x2="${cx}" y2="222" stroke="${C.stroke}" stroke-width="2.6" stroke-linecap="round"/>`;
    register('syringe', '注射器', '移液与注射', {
      width: 56, height: 230, svg,
      ports: [{ id: 'outlet', x: cx, y: 222, dx: 0, dy: 1, type: 'probe', diameter: 2.6, segment: [cx, 218, cx, 190] }],
    });
  }

  // 60. Gas syringe (60x230 — sleek glass cylinder + ground glass plunger + Luer male tip)
  {
    const cx = 30;
    const svg =
      `<rect x="17" y="172" width="26" height="24" fill="${C.liquid}" stroke="none"/>\n` +
      `  <line x1="17" y1="172" x2="43" y2="172" stroke="${C.liquidLine}" stroke-width="1.8"/>\n` +
      `  <rect x="20" y="14" width="20" height="128" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.6"/>\n` +
      `  <line x1="12" y1="12" x2="48" y2="12" stroke="${C.stroke}" stroke-width="4.4" stroke-linecap="round"/>\n` +
      `  <path d="M17 142 Q30 148 43 142" fill="none" stroke="${C.stroke}" stroke-width="3.0" stroke-linecap="round"/>\n` +
      `  <path d="M10 56 Q16 58 16 66 V196 Q16 202 25 204 V222 M35 222 V204 Q44 202 44 196 V66 Q44 58 50 56" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  ${gradTicks(42, 82, 188, 7, 2, 8, { dir: -1 })}`;
    register('gas-syringe', '气体注射器', '移液与注射', {
      width: 60, height: 230, svg,
      ports: [{ id: 'outlet', x: cx, y: 222, dx: 0, dy: 1, type: 'luer-male', diameter: 10, edge: [25, 222, 35, 222] }],
    });
  }

  // 61. Needle (40x210 — Chemix tapered green Luer hub + clean vertical shaft)
  register('needle', '针头', '移液与注射', {
    width: 40, height: 210,
    svg:
      `<path d="M12 12 H28 L26 42 L24 44 L23 64 H17 L16 44 L14 42 Z" fill="${C.leaf}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>\n` +
      `  <line x1="20" y1="64" x2="20" y2="198" stroke="${C.stroke}" stroke-width="3.2" stroke-linecap="round"/>`,
    ports: [{ id: 'tip', x: 20, y: 198, dx: 0, dy: 1, type: 'probe', diameter: 4, segment: [20, 192, 20, 76] }],
  });
}

function registerStoppersAndMisc(register) {
  // 62. Bung — MUST keep exact 100x75 dimensions & alpha=255 at (50, 25) (#115, #116)
  register('bung', '木塞 / 橡胶塞', '塞子与密封', {
    width: 100, height: 75, boreCount: 0,
    svg:
      `<path d="M14 5 H86 L76 62 Q75 66 70 66 H30 Q25 66 24 62 Z" fill="${C.cork}" stroke="${C.stroke}" stroke-width="3.2" stroke-linejoin="round"/>\n` +
      `  <line x1="22" y1="12" x2="78" y2="12" stroke="${C.corkLight}" stroke-width="2.0" stroke-linecap="round"/>`,
    ports: [{ id: 'plug', x: 50, y: 66, dx: 0, dy: 1, type: 'plug', diameter: 50, depth: 36, edge: [25, 66, 75, 66] }],
  });

  // 63. Glass stopper (80x96 — Chemix tall T-head ground-glass stopper)
  register('glass-stopper', '玻璃塞', '塞子与密封', {
    width: 80, height: 96, boreCount: 0,
    svg:
      `<path d="M14 14 Q14 8 20 8 H60 Q66 8 66 14 V22 Q66 28 60 28 H49 V34 L55 37 L51 86 Q50 90 46 90 H34 Q30 90 29 86 L25 37 L31 34 V28 H20 Q14 28 14 22 Z" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="3.2" stroke-linejoin="round"/>\n` +
      `  ${jointArc(30, 38, 50, 38, 2.2, { sw: 1.8 })}`,
    ports: [{ id: 'plug', x: 40, y: 90, dx: 0, dy: 1, type: 'plug', diameter: 20, depth: 34, edge: [30, 90, 50, 90] }],
  });

  // 64. Septum seal (76x112 — Chemix red ribbed fold-over Suba-Seal; plug port)
  register('septum-seal', '隔膜密封盖', '塞子与密封', {
    width: 76, height: 112, boreCount: -1,
    svg:
      `<path d="M18 62 H58 V94 L52 102 H24 L18 94 Z" fill="${C.subaRed}" stroke="${C.stroke}" stroke-width="2.6" stroke-linejoin="round"/>\n` +
      `  <g fill="${C.subaRed}" stroke="${C.stroke}" stroke-width="1.8" stroke-linejoin="round">\n` +
      `    <polygon points="15,67 61,69 61,73 15,71"/>\n` +
      `    <polygon points="15,75 61,77 61,81 15,79"/>\n` +
      `    <polygon points="15,83 61,85 61,89 15,87"/>\n` +
      `    <polygon points="15,91 61,93 61,97 15,95"/>\n` +
      `  </g>\n` +
      `  <path d="M13 18 H63 V48 Q63 60 55 62 H21 Q13 60 13 48 Z" fill="${C.subaRed}" stroke="${C.stroke}" stroke-width="2.8" stroke-linejoin="round"/>\n` +
      `  <rect x="9" y="10" width="58" height="10" rx="3" fill="${C.crimson}" stroke="${C.stroke}" stroke-width="2.6"/>`,
    ports: [{ id: 'plug', x: 38, y: 102, dx: 0, dy: 1, type: 'plug', diameter: 28, depth: 38, edge: [24, 102, 52, 102] }],
  });

  // 65. Plastic Keck joint clip (144x72 — Chemix compact horizontal side-elevation red Keck clip)
  register('plastic-joint-clip', '磨口夹', '支撑与夹持', {
    width: 144, height: 72,
    svg:
      `<path d="M26 18 C6 22 6 50 26 54 L26 42 C18 40 18 32 26 30 Z M118 18 C138 22 138 50 118 54 L118 42 C126 40 126 32 118 30 Z" fill="${C.crimson}" stroke="${C.stroke}" stroke-width="2.6" stroke-linejoin="round"/>\n` +
      `  <rect x="26" y="10" width="92" height="14" rx="5" fill="${C.subaRed}" stroke="${C.stroke}" stroke-width="2.8"/>\n` +
      `  <rect x="26" y="48" width="92" height="14" rx="5" fill="${C.subaRed}" stroke="${C.stroke}" stroke-width="2.8"/>\n` +
      `  <rect x="64" y="12" width="16" height="48" fill="${C.crimson}" stroke="${C.stroke}" stroke-width="2.4"/>`,
    ports: [{ id: 'clip', x: 72, y: 36, dx: 0, dy: -1, type: 'clip', diameter: 24 }],
  });

  // 66. Stirring rod (36x200 — Chemix vertical rod, bottom probe dy: 1, segment >= 30px)
  register('stirring-rod', '玻璃搅拌棒', '实验小工具', {
    width: 36, height: 200,
    svg: `<rect x="13" y="10" width="10" height="176" rx="5" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="3.0"/>`,
    ports: [{ id: 'probe', x: 18, y: 186, dx: 0, dy: 1, type: 'probe', diameter: 10, segment: [18, 178, 18, 30] }],
  });

  // 67. Syringe filter (112x124 — Chemix vertical Luer filter: top inlet dy: -1, bottom outlet dy: 1)
  register('syringe-filter', '针式过滤器', '实验小工具', {
    width: 112, height: 124,
    svg:
      `<path d="M42 12 L46 42 H66 L70 12" fill="none" stroke="${C.stroke}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <path d="M46 74 L50 112 M62 112 L66 74" fill="none" stroke="${C.stroke}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <rect x="14" y="42" width="84" height="32" rx="10" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="3.2"/>\n` +
      `  <line x1="26" y1="58" x2="86" y2="58" stroke="${C.muted}" stroke-width="1.6" stroke-dasharray="4 3"/>`,
    ports: [
      { id: 'inlet', x: 56, y: 12, dx: 0, dy: -1, type: 'luer-female', diameter: 28, depth: 26, edge: [42, 12, 70, 12] },
      { id: 'outlet', x: 56, y: 112, dx: 0, dy: 1, type: 'luer-male', diameter: 12, segment: [56, 108, 56, 74], depth: 24, edge: [50, 112, 62, 112] },
    ],
  });

  // 68. SPE cartridge (44x196 — Chemix slim vertical column, bottom outlet dy: 1)
  register('spe-cartridge', '固相萃取柱', '实验小工具', {
    width: 44, height: 196,
    svg:
      `<path d="M16 108 H28 V144 L25 150 V184 H19 V150 L16 144 Z" fill="${C.liquid}" stroke="none"/>\n` +
      `  <line x1="16" y1="108" x2="28" y2="108" stroke="${C.liquidLine}" stroke-width="1.8"/>\n` +
      `  <path d="M11 14 H16 V144 L18 150 V184 M26 184 V150 L28 144 V14 H33" fill="none" stroke="${C.stroke}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    ports: [
      { id: 'mouth', x: 22, y: 14, dx: 0, dy: -1, type: 'mouth', diameter: 14, depth: 24, target: [22, 130], edge: [11, 14, 33, 14] },
      { id: 'outlet', x: 22, y: 184, dx: 0, dy: 1, type: 'luer-male', diameter: 8, edge: [18, 184, 26, 184] },
    ],
  });

  // 69. Piston chamber (160x196 — Chemix upright cylinder + plunger + open continuous left inlet channel)
  register('piston-chamber', '活塞气室', '设备', {
    width: 160, height: 196,
    svg:
      `<path d="M32 96 H128 V172 H32 Z" fill="${C.liquid}" stroke="none"/>\n` +
      `  <line x1="32" y1="96" x2="128" y2="96" stroke="${C.liquidLine}" stroke-width="2.0"/>\n` +
      `  <rect x="4" y="135" width="29" height="10" fill="${C.liquid}" stroke="none"/>\n` +
      `  <path d="M18 14 H32 V134 H18 Z M18 146 H32 V172 H128 V14 H142 V186 H18 Z" fill="${C.chassisBot}" stroke="none"/>\n` +
      `  <path d="M4 134 H32 V14 H18 V134 M18 146 V186 H142 V14 H128 V172 H32 V146 H4" fill="none" stroke="${C.stroke}" stroke-width="3.0" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <rect x="32" y="86" width="96" height="10" fill="${C.metalDark}" stroke="${C.stroke}" stroke-width="2.6"/>\n` +
      `  <rect x="73" y="12" width="14" height="74" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.6"/>`,
    ports: [{ id: 'inlet', x: 4, y: 140, dx: -1, dy: 0, type: 'tube', diameter: 12, segment: [8, 140, 28, 140], edge: [4, 134, 4, 146] }],
  });

  // 70. Desiccator (180x154 — Chemix flat-rimmed tapered jar + perforated dashed plate + silica beads)
  {
    const beads = [
      [40, 133], [55, 132], [70, 134], [85, 133], [100, 132], [116, 134], [131, 133],
      [47, 121], [63, 120], [78, 121], [93, 120], [108, 121], [124, 120], [139, 122],
      [38, 111], [54, 109], [71, 110], [88, 109], [104, 110], [120, 109], [136, 111],
    ].map(([bx, by]) => `<circle cx="${bx}" cy="${by}" r="6.2" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.2"/>`).join('');
    register('desiccator', '干燥器', '设备', {
      width: 180, height: 154,
      svg:
        `<path d="M12 18 L24 92 Q25 97 30 97 L34 137 Q35 144 43 144 H137 Q145 144 146 137 L150 97 Q155 97 156 92 L168 18" fill="none" stroke="${C.stroke}" stroke-width="3.2" stroke-linejoin="round"/>\n` +
        `  <rect x="6" y="12" width="168" height="6" rx="1.5" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.8"/>\n` +
        `  <line x1="31" y1="97" x2="149" y2="97" stroke="${C.stroke}" stroke-width="2.6" stroke-dasharray="8 6" stroke-linecap="round"/>\n` +
        `  ${beads}`,
      ports: [
        { id: 'base', x: 90, y: 144, dx: 0, dy: 1, type: 'base', diameter: 0 },
        { id: 'surface', x: 90, y: 97, dx: 0, dy: -128, type: 'surface', diameter: 0, segment: [31, 97, 149, 97] },
      ],
    });
  }
}

function registerNewGlassware(register) {
  // 71. U-drying tube (130x186)
  {
    const id = 'u-drying-tube';
    const bL = barb(id, 28, 60, -1, 0, 20, 5.2, 4.4);
    const bR = barb(id, 102, 60, 1, 0, 20, 5.2, 4.4);
    const uOuter = `<path d="M28 24 V126 A37 37 0 0 0 102 126 V24 H80 V126 A15 15 0 0 1 50 126 V24 Z" fill="none" stroke="${C.stroke}" stroke-width="3.2" stroke-linejoin="round"/>`;
    const granules = [
      [37, 78], [43, 90], [36, 104], [40, 118], [44, 132], [51, 144], [61, 151], [72, 151],
      [81, 144], [89, 132], [91, 118], [94, 104], [89, 90], [94, 78],
    ].map(([gx, gy]) => `<circle cx="${gx}" cy="${gy}" r="3.8" fill="${C.chassisTop}" stroke="${C.inner}" stroke-width="1.2"/>`).join('\n  ');
    const bungs =
      `<path d="M26 14 H52 L50 28 H28 Z" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round"/>\n` +
      `  <path d="M78 14 H104 L102 28 H80 Z" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round"/>`;
    register(id, 'U型干燥管', '冷凝与蒸馏', {
      width: 130, height: 186, search: 'u drying tube u tube desiccant',
      svg: `${bL.svg}\n  ${bR.svg}\n  ${uOuter}\n  ${granules}\n  ${bungs}`,
      ports: [
        { id: 'inlet', ...bL.port, type: 'tube' },
        { id: 'outlet', ...bR.port, type: 'tube' },
      ],
    });
  }

  // 72. Side-arm U-tube (130x186)
  {
    const id = 'side-arm-u-tube';
    const bL = barb(id, 28, 54, -1, 0, 20, 5.2, 4.4);
    const bR = barb(id, 102, 54, 1, 0, 20, 5.2, 4.4);
    const uOuter =
      `<path d="M25 14 Q28 16 28 22 V126 A37 37 0 0 0 102 126 V22 Q102 16 105 14" fill="none" stroke="${C.stroke}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  <path d="M53 14 Q50 16 50 22 V126 A15 15 0 0 0 80 126 V22 Q80 16 77 14" fill="none" stroke="${C.stroke}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    register(id, '支管U型管', '冷凝与蒸馏', {
      width: 130, height: 186, search: 'side arm u tube u tube',
      svg: `${bL.svg}\n  ${bR.svg}\n  ${uOuter}`,
      ports: [
        { id: 'mouth-left', x: 39, y: 14, dx: 0, dy: -1, type: 'mouth', diameter: 22, depth: 24, target: [39, 134], edge: [28, 14, 50, 14] },
        { id: 'mouth-right', x: 91, y: 14, dx: 0, dy: -1, type: 'mouth', diameter: 22, depth: 24, target: [91, 134], edge: [80, 14, 102, 14] },
        { id: 'inlet', ...bL.port, type: 'tube' },
        { id: 'outlet', ...bR.port, type: 'tube' },
      ],
    });
  }

  // 73. Retort (190x150 — stepped-collar top female joint + open long tapering beak)
  {
    const id = 'retort';
    const ox = 176;
    const oy = 126;
    const ux = 0.8944;
    const uy = 0.4472;
    const tx = -uy;
    const ty = ux;
    const halfOut = 5;
    const fem = verticalFemaleJoint(id, 46, 12, 20, 11, 8.5, { sw: GSW, stepOut: 2.0 });
    const beakD =
      `M35.5 32 V48 C8 62 10 134 54 134 C84 134 98 110 94 82 ` +
      `C114 86 142 108 ${r(ox + tx * halfOut)} ${r(oy + ty * halfOut)} ` +
      `M${r(ox - tx * halfOut)} ${r(oy - ty * halfOut)} ` +
      `C140 96 104 54 64 48 H56.5 V32`;
    register(id, '曲颈甑', '冷凝与蒸馏', {
      width: 190, height: 150, search: 'retort alembic',
      svg: `<path d="${beakD}" fill="none" stroke="${C.stroke}" stroke-width="${GSW}" stroke-linecap="round" stroke-linejoin="round"/>\n  ${fem}`,
      ports: [
        { id: 'mouth', x: 46, y: 12, dx: 0, dy: -1, type: 'glass-female', diameter: 22, edge: [35, 12, 57, 12] },
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
        { id: 'base', x: 52, y: 134, dx: 0, dy: 1, type: 'base', diameter: 0 },
      ],
    });
  }

  // 74. Glass stopcock valve (96x64 — neutral charcoal + crimson PTFE key)
  register('glass-stopcock', '玻璃活塞', '塞子与密封', {
    width: 96, height: 64, boreCount: 0, search: 'glass stopcock valve plug',
    svg:
      `<path d="M6 34 H34 M6 44 H34 M62 34 H90 M62 44 H90" fill="none" stroke="${C.stroke}" stroke-width="2.8" stroke-linecap="round"/>\n` +
      `  <path d="M33 20 H63 L57 58 H39 Z" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.8" stroke-linejoin="round"/>\n` +
      `  <line x1="38" y1="39" x2="58" y2="39" stroke="${C.crimson}" stroke-width="2.6" stroke-linecap="round"/>\n` +
      `  <rect x="44" y="10" width="8" height="10" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.2"/>\n` +
      `  <rect x="22" y="4" width="52" height="8" rx="4" fill="${C.crimson}" stroke="${C.stroke}" stroke-width="2.4"/>`,
    ports: [{ id: 'plug', x: 48, y: 58, dx: 0, dy: 1, type: 'plug', diameter: 18, depth: 30, edge: [39, 58, 57, 58] }],
  });

  // 75. Simple Kipp generator (148x224)
  {
    const id = 'simple-kipp-generator';
    const stand =
      `<rect x="10" y="202" width="128" height="12" rx="4" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.6"/>\n` +
      `  <rect x="22" y="14" width="7" height="188" rx="2" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.4"/>\n` +
      `  <rect x="19" y="82" width="40" height="8" rx="3" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2"/>\n` +
      `  <rect x="57" y="79" width="44" height="14" rx="4" fill="none" stroke="${C.stroke}" stroke-width="2.4"/>`;
    const testTube =
      `<path d="M62 146 H98 V174 A18 18 0 0 1 62 174 Z" fill="${C.liquid}" stroke="none"/>\n` +
      `  <line x1="62" y1="146" x2="98" y2="146" stroke="${C.liquidLine}" stroke-width="1.6"/>\n` +
      `  <path d="M60 62 V174 A20 20 0 0 0 100 174 V62 Z" fill="none" stroke="${C.stroke}" stroke-width="2.8" stroke-linejoin="round"/>\n` +
      `  <rect x="62" y="131" width="36" height="4" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.2"/>\n` +
      `  ${[68, 78, 88].map((zx) => `<circle cx="${zx}" cy="125" r="3.4" fill="${C.tick}" stroke="${C.stroke}" stroke-width="1.2"/>`).join('\n  ')}`;
    const funnel = `<path d="M52 12 L70 38 V176 H76 V38 L90 12" fill="none" stroke="${C.stroke}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    const tubeOut =
      `<path d="M88 60 V46 Q88 41 94 41 H138 M138 51 H96 V60" fill="none" stroke="${C.stroke}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  ${drawStopcock(id, 114, 46, { w: 18, h: 8 })}`;
    const stopper = `<path d="M58 50 H102 L98 66 H62 Z" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round"/>`;
    register(id, '简易启普发生器', '实验装置', {
      width: 148, height: 224, search: 'simple kipp generator gas',
      svg: `${stand}\n  ${testTube}\n  ${funnel}\n  ${tubeOut}\n  ${stopper}`,
      ports: [
        { id: 'outlet', x: 138, y: 46, dx: 1, dy: 0, type: 'tube', diameter: 10, segment: [132, 46, 112, 46], edge: [138, 41, 138, 51] },
        { id: 'base', x: 74, y: 214, dx: 0, dy: 1, type: 'base', diameter: 0 },
      ],
    });
  }

  // 76. Solid-liquid heating gas setup (188x228)
  {
    const id = 'solid-liquid-gas-setup';
    const stand =
      `<rect x="12" y="206" width="164" height="12" rx="4" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.6"/>\n` +
      `  <rect x="24" y="10" width="7" height="196" rx="2" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.4"/>\n` +
      `  <line x1="31" y1="82" x2="76" y2="82" stroke="${C.stroke}" stroke-width="4.4" stroke-linecap="round"/>\n` +
      `  <line x1="31" y1="154" x2="124" y2="154" stroke="${C.stroke}" stroke-width="4.2" stroke-linecap="round"/>\n` +
      `  <line x1="56" y1="150" x2="120" y2="150" stroke="${C.muted}" stroke-width="2.4" stroke-dasharray="3 2"/>`;
    const lamp =
      `<path d="M64 204 L70 182 Q88 178 106 182 L112 204 Z" fill="none" stroke="${C.stroke}" stroke-width="2.5" stroke-linejoin="round"/>\n` +
      `  <rect x="82" y="172" width="12" height="9" rx="2" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.8"/>\n` +
      `  <path d="M88 156 C95 163 93 172 88 172 C83 172 81 163 88 156 Z" fill="${C.amberLight}" stroke="${C.amberDark}" stroke-width="1.3"/>\n` +
      `  <path d="M88 162 C91 166 90 171 88 171 C86 171 85 166 88 162 Z" fill="${C.steelBlue}"/>`;
    const rbf = `<path d="M76 70 V92 C50 104 54 148 88 148 C122 148 126 104 100 92 V70" fill="none" stroke="${C.stroke}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`;
    const funnel =
      `<path d="M58 8 L70 32 V74 H78 V32 L90 8" fill="none" stroke="${C.stroke}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>\n` +
      `  ${drawStopcock(id, 74, 44, { w: 16, h: 7 })}`;
    const delivery = `<path d="M94 72 V34 Q94 27 102 27 H174 M174 37 H102 V72" fill="none" stroke="${C.stroke}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    const bung = `<path d="M73 64 H103 L100 77 H76 Z" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round"/>`;
    register(id, '固液加热造气装置', '实验装置', {
      width: 188, height: 228, search: 'solid liquid heating gas setup',
      svg: `${stand}\n  ${lamp}\n  ${rbf}\n  ${funnel}\n  ${delivery}\n  ${bung}`,
      ports: [
        { id: 'outlet', x: 174, y: 32, dx: 1, dy: 0, type: 'tube', diameter: 10, segment: [166, 32, 134, 32], edge: [174, 27, 174, 37] },
        { id: 'base', x: 94, y: 218, dx: 0, dy: 1, type: 'base', diameter: 0 },
      ],
    });
  }

  // 77. Electrolysis cell (160x188)
  {
    const id = 'electrolysis-cell';
    const bL = barb(id, 34, 64, -1, 0, 24, 5.2, 4.4);
    const bR = barb(id, 126, 64, 1, 0, 24, 5.2, 4.4);
    const baseStand = `<rect x="18" y="160" width="124" height="12" rx="4" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.8"/>`;
    const liquid =
      `<path d="M36 76 V122 A44 44 0 0 0 124 122 V76 H104 V122 A24 24 0 0 1 56 122 V76 Z" fill="${C.liquid}" stroke="none"/>\n` +
      `  <line x1="36" y1="76" x2="56" y2="76" stroke="${C.liquidLine}" stroke-width="1.6"/>\n` +
      `  <line x1="104" y1="76" x2="124" y2="76" stroke="${C.liquidLine}" stroke-width="1.6"/>`;
    const uBody = `<path d="M34 40 V122 A46 46 0 0 0 126 122 V40 H102 V122 A22 22 0 0 1 58 122 V40 Z" fill="none" stroke="${C.stroke}" stroke-width="2.8" stroke-linejoin="round"/>`;
    const electrodes =
      `<rect x="43" y="24" width="6" height="92" rx="1" fill="${C.inner}" stroke="${C.stroke}" stroke-width="1.8"/>\n` +
      `  <rect x="111" y="24" width="6" height="92" rx="1" fill="${C.inner}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    const bungs =
      `<path d="M32 32 H60 L58 44 H34 Z" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="2.4"/>\n` +
      `  <path d="M100 32 H128 L126 44 H102 Z" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="2.4"/>`;
    const posts =
      `${bindingPost(46, 18, C.crimson, '+', -9, 6.2)}\n` +
      `  ${bindingPost(114, 18, C.stroke, '-', -9, 6.2)}`;
    const bubbles =
      `<circle cx="42" cy="92" r="2.2" fill="#FFFFFF" stroke="${C.liquidLine}" stroke-width="1.0"/>\n` +
      `  <circle cx="49" cy="82" r="2.5" fill="#FFFFFF" stroke="${C.liquidLine}" stroke-width="1.0"/>\n` +
      `  <circle cx="110" cy="90" r="2.2" fill="#FFFFFF" stroke="${C.liquidLine}" stroke-width="1.0"/>\n` +
      `  <circle cx="117" cy="81" r="2.6" fill="#FFFFFF" stroke="${C.liquidLine}" stroke-width="1.0"/>`;
    register(id, '电解装置', '实验装置', {
      width: 160, height: 188, search: 'electrolysis cell hofmann',
      svg: `${bL.svg}\n  ${bR.svg}\n  ${baseStand}\n  ${liquid}\n  ${uBody}\n  ${electrodes}\n  ${bubbles}\n  ${bungs}\n  ${posts}`,
      ports: [
        { id: 'positive', x: 46, y: 18, dx: 0, dy: -1, type: 'wire', diameter: 0 },
        { id: 'negative', x: 114, y: 18, dx: 0, dy: -1, type: 'wire', diameter: 0 },
        { id: 'outlet-left', ...bL.port, type: 'tube' },
        { id: 'outlet-right', ...bR.port, type: 'tube' },
        { id: 'base', x: 80, y: 172, dx: 0, dy: 1, type: 'base', diameter: 0 },
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
