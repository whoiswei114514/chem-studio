'use strict';

const S = require('./svg-style.cjs');
const { C, r } = S;

/**
 * Registers all 84 thermal, ceramic, support, clamp, safety, lab-tool,
 * measurement, and unique hardware (`studio:*`) items in the classic flat
 * `#294454` scientific line-art house style (zero gradients, light `#EEF6F1` LCDs).
 */
module.exports = function registerEquipment(register) {
  const strokeLine = (x1, y1, x2, y2, sw = 1.6, col = C.stroke, extra = '') =>
    `<line x1="${r(x1)}" y1="${r(y1)}" x2="${r(x2)}" y2="${r(y2)}" stroke="${col}" stroke-width="${sw}" stroke-linecap="round"${extra ? ' ' + extra : ''}/>`;
  const surfacePort = (id, x1, y1, x2, y2) => ({
    id,
    x: r((x1 + x2) / 2),
    y: r((y1 + y2) / 2),
    dx: r(y2 - y1),
    dy: r(x1 - x2),
    type: 'surface',
    diameter: 0,
    segment: [x1, y1, x2, y2],
  });
  const basePort = (x, y) => ({ id: 'base', x, y, dx: 0, dy: 1, type: 'base', diameter: 0 });
  const glassSw = C.glassSw || 2.8;
  const flamePaths = (cx, yTop, yBot, outerW, innerW) => {
    const h = yBot - yTop;
    const outer = `M${r(cx)} ${r(yTop)} C${r(cx + outerW * 0.72)} ${r(yTop + h * 0.36)} ${r(cx + outerW)} ${r(yBot - h * 0.12)} ${r(cx)} ${r(yBot)} C${r(cx - outerW)} ${r(yBot - h * 0.12)} ${r(cx - outerW * 0.72)} ${r(yTop + h * 0.36)} ${r(cx)} ${r(yTop)} Z`;
    const core = `M${r(cx)} ${r(yTop + h * 0.38)} C${r(cx + innerW)} ${r(yTop + h * 0.62)} ${r(cx + innerW)} ${r(yBot - h * 0.08)} ${r(cx)} ${r(yBot)} C${r(cx - innerW)} ${r(yBot - h * 0.08)} ${r(cx - innerW)} ${r(yTop + h * 0.62)} ${r(cx)} ${r(yTop + h * 0.38)} Z`;
    return { outer, core };
  };

  // =========================================================================
  // 1. THERMAL, HEATING & BATHS
  // =========================================================================

  // bunsen (180x190) — gas: (153,136, d=11), surface: (85,48)
  {
    const id = 'bunsen';
    const cx = 85;
    const { outer, core } = flamePaths(cx, 6, 48, 12.5, 5.8);
    const flame = `<path d="${outer}" fill="${C.flameBlue}" stroke="${C.stroke}" stroke-width="1.9" stroke-linejoin="round"/>
      <path d="${core}" fill="${C.flameCore}" stroke="none"/>`;
    const gasPipe = `<path d="M94 131.5 H131 L136 129.5 L138 131.5 L144 129.5 L146 131.5 L153 130.5 V141.5 L146 140.5 L144 142.5 L138 140.5 L136 142.5 L131 140.5 H94 Z" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.1" stroke-linejoin="round"/>`;
    const base = `<path d="M26 168 C26 155 44 150 85 150 C126 150 144 155 144 168 L148 175 H22 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>
      <path d="M34 164 Q85 157 136 164" fill="none" stroke="${C.inner}" stroke-width="1.4" stroke-linecap="round"/>
      <rect x="20" y="173" width="130" height="6" rx="2.5" fill="${C.inner}" stroke="${C.stroke}" stroke-width="2.1"/>
      <rect x="72" y="141" width="26" height="12" rx="3" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.1"/>`;
    const collar = `<rect x="74" y="114" width="22" height="23" rx="2" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.2"/>
      <ellipse cx="${cx}" cy="125.5" rx="4.5" ry="5.5" fill="${C.inner}" stroke="${C.stroke}" stroke-width="1.6"/>
      <line x1="74" y1="118" x2="96" y2="118" stroke="${C.brassDark}" stroke-width="1.4"/>`;
    const chimney = `<rect x="78" y="48" width="14" height="68" rx="1.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.3"/>
      <rect x="75.5" y="48" width="19" height="6" rx="1.8" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.0"/>`;
    register(id, '本生灯', '加热', {
      width: 180,
      height: 190,
      svg: `${flame}\n  ${gasPipe}\n  ${base}\n  ${chimney}\n  ${collar}`,
      search: 'bunsen burner 本生灯 煤气灯 燃气加热器 可调风门高温火焰',
      ports: [
        { id: 'gas', x: 153, y: 136, dx: 1, dy: 0, type: 'tube', diameter: 11 },
        { id: 'surface', x: 85, y: 48, dx: 0, dy: -1, type: 'surface', diameter: 0 },
      ],
    });
  }

  // flame (180x190) — tall tapered flat dual-tone Bunsen/alcohol flame
  {
    const id = 'flame';
    const cx = 90;
    const body = `<path d="M${cx} 8 C${cx + 22} 54 ${cx + 42} 102 ${cx + 38} 142 C${cx + 34} 168 ${cx + 18} 180 ${cx} 180 C${cx - 18} 180 ${cx - 34} 168 ${cx - 38} 142 C${cx - 42} 102 ${cx - 22} 54 ${cx} 8 Z" fill="#F4B942" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M${cx} 68 C${cx + 15} 102 ${cx + 20} 144 ${cx + 13} 166 C${cx + 6} 175 ${cx - 6} 175 ${cx - 13} 166 C${cx - 20} 144 ${cx - 15} 102 ${cx} 68 Z" fill="${C.coolant}" stroke="${C.stroke}" stroke-width="1.8" stroke-linejoin="round"/>`;
    register(id, '火焰', '加热', {
      width: 180,
      height: 190,
      svg: body,
      search: 'flame 火焰 加热焰 外焰 内焰 焰心',
      ports: [],
    });
  }

  // hot-plate (180x190) — surface: (90, 76)
  {
    const id = 'hot-plate';
    const plate = `<rect x="14" y="76" width="152" height="12" rx="3.5" fill="${C.porcelainMid}" stroke="${C.stroke}" stroke-width="2.3"/>
      <line x1="22" y1="84" x2="158" y2="84" stroke="${C.muted}" stroke-width="1.2" stroke-linecap="round"/>
      <rect x="26" y="88" width="128" height="4" fill="${C.inner}" stroke="none"/>`;
    const body = S.chassis(id, 18, 91, 144, 71, { rx: 8, footInset: 16 });
    const oled = S.oledScreen(
      id,
      28,
      110,
      64,
      36,
      S.screenText(60, 133, '180°C', 11.5, C.stroke)
    );
    const knob = S.rotaryKnob(id, 132, 128, 13.5, 35, { teal: true, ticks: 7 });
    const indicator = `<circle cx="104" cy="128" r="4" fill="${C.red}" stroke="${C.stroke}" stroke-width="1.5"/>
      <rect x="148" y="148" width="10" height="4" rx="1" fill="${C.muted}"/>`;
    register(id, '加热板', '加热', {
      width: 180,
      height: 190,
      svg: `${body}\n  ${plate}\n  ${oled}\n  ${knob}\n  ${indicator}`,
      search: 'hot plate 加热板 电热板 恒温加热台',
      ports: [{ id: 'surface', x: 90, y: 76, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // magnetic-stirrer-heater (180x190) — surface: (90, 76)
  {
    const id = 'magnetic-stirrer-heater';
    const plate = `<rect x="14" y="76" width="152" height="12" rx="3.5" fill="${C.porcelainMid}" stroke="${C.stroke}" stroke-width="2.3"/>
      <line x1="74" y1="82" x2="106" y2="82" stroke="${C.teal}" stroke-width="2.4" stroke-linecap="round"/>
      <rect x="26" y="88" width="128" height="4" fill="${C.inner}" stroke="none"/>`;
    const body = S.chassis(id, 18, 91, 144, 71, { rx: 8, footInset: 16 });
    const oled = S.oledScreen(
      id,
      24,
      107,
      64,
      38,
      S.screenText(56, 123, '350 rpm', 8.2, C.stroke) +
        S.screenText(56, 137, '80.0 °C', 8.2, C.teal)
    );
    const k1 = S.rotaryKnob(id, 108, 126, 10.5, -25, { ticks: 5 });
    const k2 = S.rotaryKnob(id, 142, 126, 10.5, 40, { teal: true, ticks: 5 });
    register(id, '磁力加热搅拌器', '加热', {
      width: 180,
      height: 190,
      svg: `${body}\n  ${plate}\n  ${oled}\n  ${k1}\n  ${k2}`,
      search: 'magnetic stirrer heater 磁力加热搅拌器 磁力搅拌恒温加热台',
      ports: [{ id: 'surface', x: 90, y: 76, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // heating-mantle (180x190) — surface: (90, 56)
  {
    const id = 'heating-mantle';
    const cup = `<path d="M20 56 H160 L152 114 Q90 128 28 114 Z" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>
      ${S.ventSlots(34, 78, 4, 18, 6)}
      ${S.ventSlots(128, 78, 4, 18, 6)}
      <ellipse cx="90" cy="56" rx="70" ry="15" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.3"/>
      <ellipse cx="90" cy="57" rx="54" ry="10.5" fill="${C.chassisBot}" stroke="${C.inner}" stroke-width="1.6"/>
      <path d="M44 58 Q90 66 136 58" fill="none" stroke="${C.inner}" stroke-width="1.3" stroke-dasharray="3 2"/>`;
    const base = S.chassis(id, 24, 112, 132, 56, { rx: 6 });
    const oled = S.oledScreen(id, 36, 129, 56, 26, S.screenText(64, 146, '150 °C', 9, C.stroke));
    const knob = S.rotaryKnob(id, 128, 142, 10.5, 20, { teal: true, ticks: 5 });
    const led = `<circle cx="104" cy="142" r="3.8" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.4"/>`;
    register(id, '电热套', '加热', {
      width: 180,
      height: 190,
      svg: `${cup}\n  ${base}\n  ${oled}\n  ${knob}\n  ${led}`,
      search: 'heating mantle 电热套 调温电热套 圆底烧瓶加热套',
      ports: [{ id: 'surface', x: 90, y: 56, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // sand-bath (180x190) — surface: (90, 56)
  {
    const id = 'sand-bath';
    const sandDots = [
      [50, 56], [64, 52], [78, 56], [92, 52], [106, 56], [120, 53], [134, 57],
      [58, 60], [72, 62], [86, 59], [100, 62], [114, 59], [128, 61],
    ]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.3" fill="${C.brassDark}" stroke="none"/>`)
      .join('');
    const pan = `<path d="M18 68 H10 Q8 68 8 73 V82 Q8 87 12 87 H22 M162 68 H170 Q172 68 172 73 V82 Q172 87 168 87 H158" fill="none" stroke="${C.stroke}" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M20 56 H160 L150 118 H30 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>
      <ellipse cx="90" cy="56" rx="70" ry="13.5" fill="${C.corkLight}" stroke="${C.stroke}" stroke-width="2.3"/>
      <ellipse cx="90" cy="56" rx="60" ry="9.5" fill="#EAD79B" stroke="${C.brassDark}" stroke-width="1.2"/>
      ${sandDots}`;
    const base = S.chassis(id, 26, 116, 128, 52, { rx: 6 });
    const oled = S.oledScreen(id, 38, 131, 54, 25, S.screenText(65, 147, '220 °C', 8.5, C.stroke));
    const knob = S.rotaryKnob(id, 128, 143, 10, 30, { teal: true, ticks: 5 });
    register(id, '砂浴', '加热', {
      width: 180,
      height: 190,
      svg: `${pan}\n  ${base}\n  ${oled}\n  ${knob}`,
      search: 'sand bath 砂浴 高温砂浴锅 均匀加热',
      ports: [{ id: 'surface', x: 90, y: 56, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // kettle (180x190) — base: (85, 161)
  {
    const id = 'kettle';
    const handle = `<path d="M124 54 H154 Q166 54 166 70 V126 Q166 140 150 140 H134" fill="none" stroke="${C.stroke}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M124 54 H154 Q166 54 166 70 V126 Q166 140 150 140 H134" fill="none" stroke="${C.inner}" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    const spout = `<path d="M36 72 L12 42 L18 39 L40 50 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>`;
    const body = `<path d="M40 38 H120 L136 148 Q136 155 126 155 H34 Q24 155 24 148 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>
      <path d="M38 40 L26 148 H35 L46 40 Z" fill="${C.chassisTop}" stroke="none" opacity="0.65"/>
      <rect x="20" y="153" width="120" height="8" rx="3" fill="${C.inner}" stroke="${C.stroke}" stroke-width="2.1"/>
      <path d="M40 38 C42 26 118 26 120 38 Z" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="68" y="21" width="24" height="8" rx="3" fill="${C.inner}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="104" y="58" width="12" height="72" rx="3" fill="${C.glassTop}" stroke="${C.inner}" stroke-width="1.6"/>
      <rect x="106" y="84" width="8" height="44" rx="2" fill="${C.coolant}" stroke="none"/>
      ${S.gradTicks(114, 66, 122, 4, 2, 4, { dir: -1 })}`;
    register(id, '水壶', '加热', {
      width: 180,
      height: 190,
      svg: `${handle}\n  ${spout}\n  ${body}`,
      search: 'kettle 电水壶 烧水壶 实验室热水壶',
      ports: [basePort(85, 161)],
    });
  }

  // ice-bath (160x200) — mouth: (76.5, 34, d=121, edge=[16,34,137,34]), base: (80, 182)
  // Unsealed open glass bath rim (NO closing horizontal line across mouth!)
  {
    const id = 'ice-bath';
    const glassBody = `<path d="M16 34 L27 42 V167 Q27 180 40 180 H124 Q137 180 137 167 V34 Z" fill="${C.glassTop}" stroke="none"/>`;
    const bathFluid = `<path d="M27 72 Q82 78 137 72 V167 Q137 179 124 179 H40 Q27 179 27 167 Z" fill="${C.coolantLight}" stroke="none"/>
      <path d="M28 72 Q82 77 136 72" fill="none" stroke="${C.teal}" stroke-width="1.5" stroke-linecap="round"/>`;
    const cubes = [
      [48, 98, 25, -14],
      [82, 86, 26, 14],
      [112, 102, 24, -8],
      [62, 132, 24, 9],
      [98, 128, 25, -18],
      [78, 156, 22, 6],
    ]
      .map(
        ([x, y, s, deg]) =>
          `<g transform="translate(${x},${y}) rotate(${deg})"><rect x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}" rx="4" fill="${C.glass}" stroke="${C.stroke}" stroke-width="1.8"/><line x1="${-s / 4}" y1="${-s / 3}" x2="${s / 4}" y2="${-s / 3}" stroke="${C.chassisTop}" stroke-width="1.6" stroke-linecap="round"/></g>`
      )
      .join('\n  ');
    const wall = `<path d="M16 34 L27 42 V167 Q27 180 40 180 H124 Q137 180 137 167 V34" fill="none" stroke="${C.stroke}" stroke-width="${glassSw}" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="137" y1="34" x2="142" y2="30" stroke="${C.stroke}" stroke-width="${glassSw}" stroke-linecap="round"/>
      <path d="M33 48 V162" fill="none" stroke="#FFFFFF" stroke-width="2.0" stroke-linecap="round"/>`;
    register(id, '冰浴', '容器', {
      width: 160,
      height: 200,
      svg: `${glassBody}\n  ${bathFluid}\n  ${cubes}\n  ${wall}`,
      search: 'ice bath 冰浴 冰水浴槽 低温冷却槽',
      ports: [
        {
          id: 'mouth',
          x: 76.5,
          y: 34,
          dx: 0,
          dy: -1,
          type: 'mouth',
          diameter: 121,
          depth: 25,
          target: [82, 150],
          edge: [16, 34, 137, 34],
        },
        basePort(80, 182),
      ],
    });
  }

  // water-bath (160x200) — mouth: (76.5, 34, d=121, edge=[16,34,137,34]), base: (80, 182)
  // Recessed open-mouth stainless deck (unsealed top gap between flanges) + light #EEF6F1 controller
  {
    const id = 'water-bath';
    const topOpening = `<rect x="30" y="34" width="93" height="10" fill="${C.coolant}" stroke="none"/>
      <path d="M16 34 V46 H137 V34 H123 V40 H30 V34 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>
      <path d="M32 39 Q76.5 42 121 39" fill="none" stroke="${C.teal}" stroke-width="1.5" stroke-linecap="round"/>`;
    const handles = `<path d="M22 66 H14 Q10 66 10 72 V86 Q10 92 14 92 H22" fill="none" stroke="${C.stroke}" stroke-width="2.3" stroke-linecap="round"/>
      <path d="M131 66 H139 Q143 66 143 72 V86 Q143 92 139 92 H131" fill="none" stroke="${C.stroke}" stroke-width="2.3" stroke-linecap="round"/>`;
    const body = `<rect x="22" y="46" width="109" height="130" rx="5" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.3"/>
      <rect x="22" y="46" width="109" height="6" fill="${C.teal}" stroke="none"/>
      <rect x="28" y="57" width="97" height="64" rx="3" fill="${C.chassisTop}" stroke="${C.muted}" stroke-width="1.3"/>
      <rect x="38" y="72" width="77" height="34" rx="3" fill="${C.coolantLight}" stroke="${C.inner}" stroke-width="1.4"/>
      <path d="M46 96 C54 88 64 102 74 94 C84 86 94 102 104 94" fill="none" stroke="${C.teal}" stroke-width="2.0" stroke-linecap="round"/>
      ${S.labFeet(22, 176, 109, 16, 6, 12)}`;
    const ctrl = S.oledScreen(
      id,
      30,
      128,
      58,
      36,
      S.screenText(59, 145, '37.0°C', 9.5, C.stroke) +
        S.screenText(59, 156, 'SET 37.0', 6.8, C.teal)
    ) +
      S.rotaryKnob(id, 108, 146, 10.5, -20, { teal: true, ticks: 5 });
    register(id, '水浴锅', '容器', {
      width: 160,
      height: 200,
      svg: `${handles}\n  ${body}\n  ${topOpening}\n  ${ctrl}`,
      search: 'water bath thermostatic bath 水浴锅 恒温水浴锅 恒温加热水浴槽',
      ports: [
        {
          id: 'mouth',
          x: 76.5,
          y: 34,
          dx: 0,
          dy: -1,
          type: 'mouth',
          diameter: 121,
          depth: 25,
          target: [82, 150],
          edge: [16, 34, 137, 34],
        },
        basePort(80, 182),
      ],
    });
  }

  // oven (180x190) — base: (90,175), surface: (76.5, 126, segment:[37,126,116,126])
  {
    const id = 'oven';
    const body = S.chassis(id, 14, 14, 152, 156, { rx: 7, footH: 5 });
    const door = `<rect x="22" y="28" width="90" height="132" rx="4" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="30" y="40" width="74" height="106" rx="3" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="2.0"/>
      <line x1="34" y1="88" x2="100" y2="88" stroke="${C.inner}" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="34" y1="126" x2="100" y2="126" stroke="${C.stroke}" stroke-width="2.4" stroke-linecap="round"/>
      <rect x="105" y="74" width="5" height="36" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.6"/>`;
    const panel = `<rect x="116" y="28" width="44" height="132" rx="3" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="120" y="35" width="36" height="22" rx="2.5" fill="${C.lcdBg}" stroke="${C.stroke}" stroke-width="1.4"/>
      ${S.screenText(138, 49.5, '105°C', 7.8, C.stroke)}
      ${S.rotaryKnob(id, 138, 86, 9, 25, { teal: true })}
      <circle cx="138" cy="116" r="4" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.3"/>
      <rect x="130" y="132" width="16" height="16" rx="2" fill="${C.red}" stroke="${C.stroke}" stroke-width="1.5"/>`;
    register(id, '烘箱', '加热', {
      width: 180,
      height: 190,
      svg: `${body}\n  ${door}\n  ${panel}`,
      search: 'drying oven 烘箱 干燥箱 恒温干燥箱',
      ports: [basePort(90, 175), surfacePort('surface', 37, 126, 116, 126)],
    });
  }

  // magnetic-stir-bar (180x120) — contents: (90, 58)
  {
    const id = 'magnetic-stir-bar';
    const bar = `<rect x="24" y="40" width="132" height="36" rx="14" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.4"/>
      <line x1="40" y1="47" x2="140" y2="47" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round"/>
      <rect x="84" y="37" width="12" height="42" rx="3.5" fill="${C.chassisMid}" stroke="${C.inner}" stroke-width="1.8"/>`;
    register(id, '磁力搅拌子', '实验小工具', {
      width: 180,
      height: 120,
      svg: bar,
      search: 'magnetic stir bar 磁力搅拌子 PTFE聚四氟乙烯搅拌磁子',
      ports: [{ id: 'contents', x: 90, y: 58, dx: 0, dy: 1, type: 'contents', diameter: 0 }],
    });
  }

  // stirbar2 (180x120) — contents: (90, 58)
  {
    const id = 'stirbar2';
    const bar = `<ellipse cx="90" cy="58" rx="60" ry="21" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.4"/>
      <path d="M46 47 Q90 42 134 47" fill="none" stroke="#FFFFFF" stroke-width="2.0" stroke-linecap="round"/>
      <path d="M90 37 C95 47 95 69 90 79" fill="none" stroke="${C.tick}" stroke-width="1.6"/>`;
    register(id, '椭圆搅拌子', '实验小工具', {
      width: 180,
      height: 120,
      svg: bar,
      search: 'oval stir bar 椭圆搅拌子 橄榄型磁力搅拌子',
      ports: [{ id: 'contents', x: 90, y: 58, dx: 0, dy: 1, type: 'contents', diameter: 0 }],
    });
  }

  // wire-gauze (180x120) — surface: (90, 16)
  {
    const id = 'wire-gauze';
    let grid = '';
    for (let x = 30; x <= 150; x += 10) grid += strokeLine(x, 21, x, 99, 0.95, C.tick);
    for (let y = 25; y <= 95; y += 10) grid += strokeLine(24, y, 156, y, 0.95, C.tick);
    const frame = `<rect x="20" y="16" width="140" height="88" rx="4" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.3"/>
      ${grid}
      <rect x="20" y="16" width="140" height="88" rx="4" fill="none" stroke="${C.stroke}" stroke-width="2.3"/>
      <rect x="23" y="19" width="134" height="82" rx="2" fill="none" stroke="${C.chassisBot}" stroke-width="2.6"/>
      <path d="M20 26 L30 16 M150 16 L160 26 M20 94 L30 104 M150 104 L160 94" stroke="${C.stroke}" stroke-width="1.6" stroke-linecap="round"/>
      <ellipse cx="90" cy="60" rx="35" ry="29" fill="${C.porcelainMid}" stroke="${C.stroke}" stroke-width="1.9"/>
      <ellipse cx="90" cy="60" rx="27" ry="21" fill="none" stroke="${C.muted}" stroke-width="1.2" stroke-dasharray="3 2"/>`;
    register(id, '金属纱网', '实验小工具', {
      width: 180,
      height: 120,
      svg: frame,
      search: 'wire gauze 石棉网 金属纱网 陶土网 加热隔热网',
      ports: [{ id: 'surface', x: 90, y: 16, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // clay-triangle (180x120) — surface: (90, 64)
  {
    const id = 'clay-triangle';
    const wire = `<path d="M30 98 L90 14 L150 98 Z" fill="none" stroke="${C.stroke}" stroke-width="3.2" stroke-linejoin="round"/>
      <path d="M26 101 L18 106 M154 101 L162 106 M90 14 V6" fill="none" stroke="${C.stroke}" stroke-width="2.6" stroke-linecap="round"/>`;
    const sleeves = `
      <rect x="60" y="92" width="60" height="12" rx="4" fill="${C.porcelainMid}" stroke="${C.stroke}" stroke-width="2.1"/>
      <line x1="68" y1="95" x2="112" y2="95" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/>
      <g transform="translate(60, 56) rotate(-54.5)"><rect x="-28" y="-6" width="56" height="12" rx="4" fill="${C.porcelainMid}" stroke="${C.stroke}" stroke-width="2.1"/></g>
      <g transform="translate(120, 56) rotate(54.5)"><rect x="-28" y="-6" width="56" height="12" rx="4" fill="${C.porcelainMid}" stroke="${C.stroke}" stroke-width="2.1"/></g>`;
    register(id, '泥三角', '实验小工具', {
      width: 180,
      height: 120,
      svg: `${wire}\n  ${sleeves}`,
      search: 'clay triangle pipe clay triangle 泥三角 坩埚架 灼烧支撑',
      ports: [{ id: 'surface', x: 90, y: 64, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // tripod (180x200) — surface: (90, 34)
  {
    const id = 'tripod';
    const legs = `
      <path d="M35 42 L17 183 H25 L43 44 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M145 42 L163 183 H155 L137 44 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <rect x="86.5" y="45" width="7" height="145" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="33" y="41" width="12" height="9" rx="2" fill="${C.inner}" stroke="${C.stroke}" stroke-width="1.6"/>
      <rect x="135" y="41" width="12" height="9" rx="2" fill="${C.inner}" stroke="${C.stroke}" stroke-width="1.6"/>
      <rect x="15" y="181" width="12" height="6" rx="2" fill="${C.inner}" stroke="${C.stroke}" stroke-width="1.6"/>
      <rect x="153" y="181" width="12" height="6" rx="2" fill="${C.inner}" stroke="${C.stroke}" stroke-width="1.6"/>
      <rect x="84" y="187" width="12" height="6" rx="2" fill="${C.inner}" stroke="${C.stroke}" stroke-width="1.6"/>`;
    const ring = `<path d="M30 34 A60 13 0 1 0 150 34 V40 A60 13 0 1 1 30 40 Z" fill="${C.inner}" stroke="${C.stroke}" stroke-width="2.0"/>
      <ellipse cx="90" cy="34" rx="60" ry="13" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.3"/>
      <ellipse cx="90" cy="34" rx="45" ry="7.8" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.1"/>`;
    register(id, '三脚架', '支撑与夹持', {
      width: 180,
      height: 200,
      svg: `${legs}\n  ${ring}`,
      search: 'tripod 三脚架 加热铁三脚架 酒精灯支撑架',
      ports: [{ id: 'surface', x: 90, y: 34, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // crucible (170x135) — mouth: (85, 26, d=110)
  // Unsealed open flared ceramic rim (NO flat closing top bar)
  {
    const id = 'crucible';
    const fill = `<path d="M29 26 L36 33 L46 112 Q50 124 85 124 Q120 124 124 112 L134 33 L141 26 Z" fill="${C.porcelainMid}" stroke="none"/>`;
    const shade = `<path d="M37 35 Q85 41 133 35" fill="none" stroke="${C.tick}" stroke-width="1.3" stroke-linecap="round"/>
      <path d="M44 46 L52 108" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M52 117 Q85 124 118 117" fill="none" stroke="${C.tick}" stroke-width="1.4"/>`;
    const wall = `<path d="M29 26 L36 33 L46 112 Q50 124 85 124 Q120 124 124 112 L134 33 L141 26" fill="none" stroke="${C.stroke}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    register(id, '坩埚', '陶瓷', {
      width: 170,
      height: 135,
      svg: `${fill}\n  ${shade}\n  ${wall}`,
      search: 'crucible 坩埚 瓷坩埚 灼烧容器 高温灰化',
      ports: [{ id: 'mouth', x: 85, y: 26, dx: 0, dy: -1, type: 'mouth', diameter: 110 }],
    });
  }

  // crucible-cover (170x135) — lid: (85, 96, d=133)
  {
    const id = 'crucible-cover';
    const cover = `<path d="M74 52 C74 42 96 42 96 52 L92 66 H78 Z" fill="${C.porcelainMid}" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>
      <path d="M18 96 Q85 45 152 96 Z" fill="${C.porcelainMid}" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M42 84 Q85 57 128 84" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>
      <rect x="18" y="92" width="134" height="6" rx="3" fill="${C.porcelainTop}" stroke="${C.stroke}" stroke-width="2.3"/>`;
    register(id, '坩埚盖', '陶瓷', {
      width: 170,
      height: 135,
      svg: cover,
      search: 'crucible cover lid 坩埚盖 瓷坩埚盖',
      ports: [{ id: 'lid', x: 85, y: 96, dx: 0, dy: 1, type: 'lid', diameter: 133 }],
    });
  }

  // evaporating-dish (160x70) — base: (80, 52)
  // Unsealed open wide shallow porcelain dish with pouring lip flare
  {
    const id = 'evaporating-dish';
    const fill = `<path d="M12 18 L20 26 C26 44 42 52 54 52 H106 C118 52 134 44 140 26 L148 18 Z" fill="${C.porcelainMid}" stroke="none"/>`;
    const detail = `<path d="M22 25 Q80 31 138 25" fill="none" stroke="${C.tick}" stroke-width="1.3" stroke-linecap="round"/>
      <path d="M50 52 H110" fill="none" stroke="${C.stroke}" stroke-width="2.5" stroke-linecap="round"/>`;
    const wall = `<path d="M12 18 L20 26 C26 44 42 52 54 52 H106 C118 52 134 44 140 26 L148 18" fill="none" stroke="${C.stroke}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
    register(id, '蒸发皿', '容器', {
      width: 160,
      height: 70,
      svg: `${fill}\n  ${detail}\n  ${wall}`,
      search: 'evaporating dish 蒸发皿 瓷蒸发皿 浓缩结晶',
      ports: [basePort(80, 52)],
    });
  }

  // mortar (170x135) — mouth: (85, 38, d=140)
  // Heavy glazed porcelain mortar with pouring lip flare & pedestal base (unsealed open top)
  {
    const id = 'mortar';
    const fill = `<path d="M14 38 L22 48 C25 90 44 111 54 114 V122 H116 V114 C126 111 145 90 148 48 L156 38 Z" fill="${C.porcelainMid}" stroke="none"/>`;
    const rim = `<path d="M24 46 Q85 56 146 46" fill="none" stroke="${C.tick}" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M32 58 C34 86 46 100 56 104" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/>
      <line x1="54" y1="114" x2="116" y2="114" stroke="${C.inner}" stroke-width="1.6"/>`;
    const wall = `<path d="M14 38 L22 48 C25 90 44 111 54 114 V122 H116 V114 C126 111 145 90 148 48 L156 38" fill="none" stroke="${C.stroke}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    register(id, '研钵', '陶瓷', {
      width: 170,
      height: 135,
      svg: `${fill}\n  ${rim}\n  ${wall}`,
      search: 'mortar 研钵 瓷研钵 研磨固体',
      ports: [{ id: 'mouth', x: 85, y: 38, dx: 0, dy: -1, type: 'mouth', diameter: 140 }],
    });
  }

  // pestle (180x120) — probe: (170, 58, d=12, seg=[150,58,30,58])
  // Bold heavy porcelain pestle club silhouette matching mortar weight
  {
    const id = 'pestle';
    const body = `<path d="M18 47 C9 47 9 69 18 69 L112 77 C134 86 170 84 170 58 C170 32 134 30 112 39 Z" fill="${C.porcelainMid}" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M24 52 L114 44 C132 38 152 40 158 46" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M126 42 C121 52 121 64 126 74" fill="none" stroke="${C.tick}" stroke-width="1.4" stroke-dasharray="2.5 2.5"/>`;
    register(id, '研杵', '实验小工具', {
      width: 180,
      height: 120,
      svg: body,
      search: 'pestle 研杵 研棒 研磨棒',
      ports: [{ id: 'probe', x: 170, y: 58, dx: 1, dy: 0, type: 'probe', diameter: 12, segment: [150, 58, 30, 58] }],
    });
  }

  // spotting-tile (170x135) — 9 well ports
  {
    const id = 'spotting-tile';
    const plate = `<rect x="13" y="15" width="144" height="106" rx="8" fill="${C.porcelainMid}" stroke="${C.stroke}" stroke-width="2.3"/>
      <rect x="17" y="19" width="136" height="98" rx="5" fill="none" stroke="${C.muted}" stroke-width="1.1"/>`;
    const wells = [];
    const ports = [];
    for (let y = 37; y < 109; y += 34) {
      for (let x = 39; x < 146; x += 45) {
        wells.push(
          `<ellipse cx="${x}" cy="${y}" rx="14.5" ry="10.5" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.6"/>` +
            `<ellipse cx="${x}" cy="${y + 1}" rx="10" ry="6.5" fill="${C.chassisTop}" stroke="none"/>`
        );
        ports.push({ id: `well-${x}-${y}`, x, y, dx: 0, dy: -1, type: 'well', diameter: 0 });
      }
    }
    register(id, '点滴板', '陶瓷', {
      width: 170,
      height: 135,
      svg: `${plate}\n  ${wells.join('\n  ')}`,
      search: 'spotting tile 点滴板 白色点滴反应板 九孔点滴板',
      ports,
    });
  }

  // weight-boat (160x70) — base: (80, 52)
  {
    const id = 'weight-boat';
    const boat = `<path d="M12 14 H148 L131 52 H29 Z" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M21 18 H139 L125 47 H35 Z" fill="${C.chassisTop}" stroke="${C.inner}" stroke-width="1.4" stroke-linejoin="round"/>
      <line x1="12" y1="14" x2="148" y2="14" stroke="${C.stroke}" stroke-width="2.6" stroke-linecap="round"/>`;
    register(id, '称量舟', '容器', {
      width: 160,
      height: 70,
      svg: boat,
      search: 'weighing boat 称量舟 称量盘 塑料称量皿',
      ports: [basePort(80, 52)],
    });
  }

  // bench-mat (180x120) — surface: (90, 16) — NO literal "HEAT RESISTANT" text
  {
    const id = 'bench-mat';
    const mat = `<rect x="18" y="16" width="144" height="88" rx="4" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.3"/>
      <rect x="25" y="23" width="130" height="70" rx="2" fill="${C.chassisTop}" stroke="${C.teal}" stroke-width="1.6"/>
      <rect x="18" y="97" width="144" height="7" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    register(id, '实验台垫', '实验小工具', {
      width: 180,
      height: 120,
      svg: mat,
      search: 'bench mat 实验台垫 防火垫 隔热实验垫',
      ports: [{ id: 'surface', x: 90, y: 16, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // filter-paper (180x120) — surface: (90, 16)
  {
    const id = 'filter-paper';
    const paper = `<circle cx="90" cy="60" r="44" fill="${C.porcelainMid}" stroke="${C.stroke}" stroke-width="2.3"/>
      <circle cx="90" cy="60" r="39" fill="none" stroke="${C.muted}" stroke-width="1.0"/>
      <line x1="90" y1="18" x2="90" y2="102" stroke="${C.tick}" stroke-width="1.2" stroke-dasharray="4 4"/>
      <line x1="48" y1="60" x2="132" y2="60" stroke="${C.tick}" stroke-width="1.2" stroke-dasharray="4 4"/>`;
    register(id, '滤纸', '实验小工具', {
      width: 180,
      height: 120,
      svg: paper,
      search: 'filter paper 滤纸 定性滤纸 定量滤纸 圆形滤纸',
      ports: [{ id: 'surface', x: 90, y: 16, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // sieve (180x120) — surface: (90, 16) — NO literal "TEST SIEVE" text
  {
    const id = 'sieve';
    let mesh = '';
    for (let x = 42; x <= 138; x += 9) mesh += strokeLine(x, 22, x, 86, 0.95, C.tick);
    for (let y = 26; y <= 84; y += 9) mesh += strokeLine(34, y, 146, y, 0.95, C.tick);
    const body = `<path d="M22 16 H158 L150 96 Q150 104 142 104 H38 Q30 104 30 96 Z" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>
      <rect x="22" y="16" width="136" height="10" rx="3" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="33" y="23" width="114" height="63" rx="3" fill="${C.chassisTop}" stroke="${C.inner}" stroke-width="1.6"/>
      ${mesh}
      <rect x="33" y="23" width="114" height="63" rx="3" fill="none" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="31" y="92" width="118" height="8" rx="2" fill="${C.brassDark}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    register(id, '筛网', '实验小工具', {
      width: 180,
      height: 120,
      svg: body,
      search: 'sieve 筛网 分样筛 金属试验筛',
      ports: [{ id: 'surface', x: 90, y: 16, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // tlc-plate (180x150) — lane: (90, 120, seg:[39,120,141,120])
  {
    const id = 'tlc-plate';
    const plate = `<rect x="28" y="10" width="124" height="130" rx="2" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.3"/>
      <rect x="32" y="14" width="116" height="122" rx="1" fill="${C.chassisTop}" stroke="${C.inner}" stroke-width="1.1"/>
      <line x1="36" y1="28" x2="144" y2="28" stroke="${C.tick}" stroke-width="1.2" stroke-dasharray="4 3"/>
      <line x1="39" y1="120" x2="141" y2="120" stroke="${C.stroke}" stroke-width="1.4"/>
      <circle cx="58" cy="120" r="2" fill="${C.stroke}" stroke="none"/>
      <circle cx="90" cy="120" r="2" fill="${C.stroke}" stroke="none"/>
      <circle cx="122" cy="120" r="2" fill="${C.stroke}" stroke="none"/>
      <ellipse cx="58" cy="88" rx="6" ry="4.5" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.4"/>
      <ellipse cx="90" cy="52" rx="6.5" ry="5" fill="${C.blue}" stroke="${C.stroke}" stroke-width="1.4"/>
      <ellipse cx="122" cy="70" rx="5.5" ry="4.5" fill="${C.brass}" stroke="${C.stroke}" stroke-width="1.4"/>`;
    register(id, '薄层色谱板', '测量与防护', {
      width: 180,
      height: 150,
      svg: plate,
      search: 'tlc plate 薄层色谱板 硅胶板 层析板',
      ports: [{ id: 'lane', x: 90, y: 120, dx: 0, dy: -1, type: 'lane', diameter: 0, segment: [39, 120, 141, 120] }],
    });
  }

  // tlc-spot (180x150) — spot: (90, 74)
  {
    const id = 'tlc-spot';
    const spot = `<ellipse cx="90" cy="74" rx="24" ry="16" fill="${C.tealLight}" stroke="${C.teal}" stroke-width="1.5" stroke-dasharray="3 2"/>
      <ellipse cx="90" cy="74" rx="15" ry="10" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.1"/>`;
    register(id, '色谱斑点', '测量与防护', {
      width: 180,
      height: 150,
      svg: spot,
      search: 'tlc spot 色谱斑点 显色斑点 层析斑点',
      ports: [{ id: 'spot', x: 90, y: 74, dx: 0, dy: 1, type: 'spot', diameter: 0 }],
    });
  }

  // vacuum-pump (200x170) — inlet: (137, 55, d=12)
  {
    const id = 'vacuum-pump';
    const inletBarb = `<path d="M132 82 V68 L130 66 L131 55 H143 L144 66 L142 68 V82 Z" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <line x1="131" y1="61" x2="143" y2="61" stroke="${C.brassDark}" stroke-width="1.4"/>`;
    const housing = S.chassis(id, 18, 70, 96, 80, { rx: 8 }) +
      S.chassis(id, 110, 82, 72, 68, { rx: 5, accentBar: false, footInset: 10 });
    const fan = `<circle cx="66" cy="112" r="28" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2"/>
      <circle cx="66" cy="112" r="22" fill="${C.chassisTop}" stroke="${C.inner}" stroke-width="1.3"/>
      ${S.ventSlots(46, 98, 6, 40, 5.5)}
      <line x1="36" y1="62" x2="36" y2="70" stroke="${C.inner}" stroke-width="3"/>
      <line x1="46" y1="62" x2="46" y2="70" stroke="${C.inner}" stroke-width="3"/>
      <line x1="94" y1="62" x2="94" y2="70" stroke="${C.inner}" stroke-width="3"/>`;
    const gauge = `<circle cx="152" cy="113" r="16" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.0"/>
      <path d="M142 118 A11 11 0 1 1 162 118" fill="none" stroke="${C.teal}" stroke-width="1.8"/>
      <line x1="152" y1="113" x2="144" y2="105" stroke="${C.red}" stroke-width="2.0" stroke-linecap="round"/>
      <circle cx="152" cy="113" r="2.5" fill="${C.stroke}" stroke="none"/>
      <circle cx="122" cy="108" r="5" fill="${C.coolant}" stroke="${C.stroke}" stroke-width="1.5"/>
      <rect x="118" y="130" width="16" height="11" rx="2" fill="${C.red}" stroke="${C.stroke}" stroke-width="1.5"/>
      <path d="M50 70 V55 H90 V70" fill="none" stroke="${C.stroke}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    register(id, '真空泵', '设备', {
      width: 200,
      height: 170,
      svg: `${inletBarb}\n  ${housing}\n  ${fan}\n  ${gauge}`,
      search: 'vacuum pump 真空泵 隔膜真空泵 减压抽滤泵',
      ports: [{ id: 'inlet', x: 137, y: 55, dx: 0, dy: -1, type: 'tube', diameter: 12 }],
    });
  }

  // syringe-pump (200x170) — outlet: (20, 65, dx:-1, luer-male, d=8)
  {
    const id = 'syringe-pump';
    const base = S.chassis(id, 12, 86, 176, 66, { rx: 6 });
    const oled = S.oledScreen(
      id,
      24,
      102,
      84,
      36,
      S.screenText(66, 124, '1.00 mL/h', 10.2, C.stroke)
    );
    const controls = S.softButton(116, 108, 22, 13, '', C.teal, C.stroke) +
      S.softButton(143, 108, 22, 13, '', C.chassisBot, C.stroke) +
      S.rotaryKnob(id, 141, 136, 9, -15, { teal: true });
    const cradle = `<rect x="20" y="61" width="19" height="8" rx="1.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="39" y="51" width="88" height="28" rx="3" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="42" y="55" width="54" height="20" fill="${C.liquid}" stroke="none"/>
      ${S.gradTicks(52, 52, 92, 6, 3, 5, { dir: 1, vertical: false })}
      <rect x="96" y="54" width="12" height="22" rx="2" fill="${C.inner}" stroke="${C.stroke}" stroke-width="1.8"/>
      <line x1="108" y1="65" x2="152" y2="65" stroke="${C.stroke}" stroke-width="5" stroke-linecap="round"/>
      <rect x="125" y="45" width="7" height="40" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="150" y="41" width="18" height="45" rx="3" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.0"/>`;
    register(id, '注射泵', '设备', {
      width: 200,
      height: 170,
      svg: `${base}\n  ${oled}\n  ${controls}\n  ${cradle}`,
      search: 'syringe pump 注射泵 微量注射泵 精密进样泵',
      ports: [{ id: 'outlet', x: 20, y: 65, dx: -1, dy: 0, type: 'luer-male', diameter: 8 }],
    });
  }

  // gas-cylinder (110x240) — outlet: (80, 18, d=10)
  {
    const id = 'gas-cylinder';
    const valve = `<rect x="47" y="14" width="16" height="17" rx="2" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.1"/>
      <rect x="38" y="6" width="34" height="6" rx="2.5" fill="${C.inner}" stroke="${C.stroke}" stroke-width="2.0"/>
      <path d="M63 13 H80 V23 H63 Z" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.0"/>
      <line x1="74" y1="13" x2="74" y2="23" stroke="${C.brassDark}" stroke-width="1.3"/>
      <circle cx="38" cy="21" r="7.5" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="1.9"/>
      <line x1="38" y1="21" x2="42" y2="16.5" stroke="${C.red}" stroke-width="1.7" stroke-linecap="round"/>`;
    const body = `<path d="M23 224 V58 C23 36 37 28 55 28 C73 28 87 36 87 58 V224 Q87 230 80 230 H30 Q23 230 23 224 Z" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M31 60 C31 44 40 37 48 35" fill="none" stroke="${C.tealLight}" stroke-width="2.2" stroke-linecap="round"/>
      <rect x="43" y="28" width="24" height="7" rx="2" fill="${C.brassDark}" stroke="${C.stroke}" stroke-width="1.6"/>
      <rect x="23" y="216" width="64" height="12" rx="3" fill="${C.inner}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="33" y="88" width="44" height="58" rx="4" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="1.8"/>
      ${S.labelText(55, 118, 'GAS', 13, C.stroke)}
      ${S.labelText(55, 134, '20 MPa', 7.5, C.tealDark)}`;
    register(id, '气瓶', '设备', {
      width: 110,
      height: 240,
      svg: `${valve}\n  ${body}`,
      search: 'gas cylinder 气瓶 高压钢瓶 气体钢瓶 氮气瓶 氧气瓶',
      ports: [{ id: 'outlet', x: 80, y: 18, dx: 1, dy: 0, type: 'tube', diameter: 10 }],
    });
  }

  // ring-with-gauze [NEW] (180x200) — clamp: (16,72), surface: (119,66, seg:[78,66,160,66])
  {
    const id = 'ring-with-gauze';
    const arm = `<rect x="16" y="63" width="15" height="18" rx="3" fill="${C.inner}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="4" y="69" width="12" height="6" rx="2" fill="${C.brass}" stroke="${C.stroke}" stroke-width="1.8"/>
      <line x1="6" y1="65" x2="6" y2="79" stroke="${C.stroke}" stroke-width="2.8" stroke-linecap="round"/>
      <rect x="31" y="69" width="46" height="6" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>`;
    const ringFront = `<path d="M76 74 A43 11.5 0 0 0 162 74" fill="none" stroke="${C.stroke}" stroke-width="6.4" stroke-linecap="round"/>
      <path d="M76 74 A43 11.5 0 0 0 162 74" fill="none" stroke="${C.chassisBot}" stroke-width="2.6" stroke-linecap="round"/>`;
    let mesh = '';
    for (let x = 80; x <= 158; x += 8) mesh += strokeLine(x, 60, x, 72, 0.9, C.tick);
    const gauze = `<path d="M70 61 H168 L161 73 H77 Z" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      ${mesh}
      <path d="M70 61 H168 L161 73 H77 Z" fill="none" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <ellipse cx="119" cy="67" rx="24" ry="5.5" fill="${C.porcelainMid}" stroke="${C.stroke}" stroke-width="1.6"/>`;
    register(id, '铁圈带石棉网', '加热', {
      width: 180,
      height: 200,
      svg: `${ringFront}\n  ${arm}\n  ${gauze}`,
      search: 'retort ring with wire gauze 铁圈带石棉网 铁架台铁圈陶土网 烧杯加热支撑',
      ports: [
        { id: 'clamp', x: 16, y: 72, dx: -1, dy: 0, type: 'clamp', diameter: 8 },
        surfacePort('surface', 78, 66, 160, 66),
      ],
    });
  }

  // combustion-spoon [NEW] (70x210) — probe: (35,196, immersible, d=20, seg:[35,36,35,190]), grip-site
  {
    const id = 'combustion-spoon';
    const cx = 35;
    const handle = `<path d="M${cx - 6.5} 18 A6.5 6.5 0 1 1 ${cx + 6.5} 18 V32 H${cx - 6.5} Z" fill="none" stroke="${C.stroke}" stroke-width="2.8"/>
      <rect x="20" y="30" width="30" height="7" rx="3" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="${cx - 2.3}" y="37" width="4.6" height="146" fill="${C.brass}" stroke="${C.stroke}" stroke-width="1.9"/>`;
    const cup = `<path d="M${cx - 10.5} 182 H${cx + 10.5} C${cx + 10.5} 197 ${cx - 10.5} 197 ${cx - 10.5} 182 Z" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <ellipse cx="${cx}" cy="182" rx="10.5" ry="3.4" fill="${C.brassLight}" stroke="${C.stroke}" stroke-width="1.7"/>`;
    register(id, '燃烧匙', '加热', {
      width: 70,
      height: 210,
      svg: `${handle}\n  ${cup}`,
      search: 'combustion spoon deflagrating spoon 燃烧匙 集气瓶燃烧实验 硫粉红磷燃烧',
      ports: [
        {
          id: 'probe',
          x: cx,
          y: 196,
          dx: 0,
          dy: 1,
          type: 'immersible',
          diameter: 20,
          depth: 12,
          segment: [cx, 36, cx, 190],
        },
        { id: 'grip-site', x: cx, y: 82, dx: 1, dy: 0, type: 'grip-site', diameter: 0, segment: [cx, 42, cx, 130] },
      ],
    });
  }

  // =========================================================================
  // 2. SUPPORTS, CLAMPS, SAFETY & LAB TOOLS
  // =========================================================================

  // retort-stand (180x200) — rail: (40, 75, d=7, seg:[40,20,40,170])
  {
    const id = 'retort-stand';
    const base = `<path d="M18 176 H162 L168 188 H12 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>
      <rect x="12" y="185" width="156" height="6" rx="2.5" fill="${C.inner}" stroke="${C.stroke}" stroke-width="2.1"/>
      <rect x="22" y="191" width="16" height="3.5" rx="1.5" fill="${C.stroke}"/>
      <rect x="142" y="191" width="16" height="3.5" rx="1.5" fill="${C.stroke}"/>`;
    const rod = `<rect x="31" y="168" width="18" height="9" rx="2.5" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="36.5" y="10" width="7" height="160" rx="3" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2"/>
      <line x1="39" y1="14" x2="39" y2="165" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round"/>`;
    register(id, '铁架台', '支撑与夹持', {
      width: 180,
      height: 200,
      svg: `${base}\n  ${rod}`,
      search: 'retort stand ring stand 铁架台 铁架底座 支撑立杆',
      ports: [{ id: 'rail', x: 40, y: 75, dx: 0, dy: -1, type: 'rail', diameter: 7, segment: [40, 20, 40, 170] }],
    });
  }

  // clamp (180x200) — clamp: (12,100, d=8), grip: (146,100, d=25)
  {
    const id = 'clamp';
    const bosshead = `<rect x="12" y="88" width="18" height="24" rx="3" fill="${C.inner}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="3" y="97" width="9" height="6" rx="1.5" fill="${C.brass}" stroke="${C.stroke}" stroke-width="1.6"/>
      <line x1="4" y1="92" x2="4" y2="108" stroke="${C.stroke}" stroke-width="2.8" stroke-linecap="round"/>`;
    const shaft = `<rect x="30" y="96.5" width="66" height="7" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="64" y="93" width="12" height="14" rx="2" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    const jaws = `<path d="M96 95 C108 92 118 71 135 71 H158 C164 71 164 78 158 78 H137 C124 78 114 96 102 99 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.1" stroke-linejoin="round"/>
      <path d="M96 105 C108 108 118 129 135 129 H158 C164 129 164 122 158 122 H137 C124 122 114 104 102 101 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.1" stroke-linejoin="round"/>
      <rect x="134" y="71" width="25" height="7" rx="3" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.7"/>
      <rect x="134" y="122" width="25" height="7" rx="3" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.7"/>
      <circle cx="96" cy="100" r="6.5" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.0"/>
      <line x1="128" y1="78" x2="128" y2="122" stroke="${C.stroke}" stroke-width="2.0" stroke-linecap="round"/>
      <rect x="124.5" y="129" width="7" height="7" rx="1.5" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.5"/>`;
    register(id, '万能夹', '支撑与夹持', {
      width: 180,
      height: 200,
      svg: `${bosshead}\n  ${shaft}\n  ${jaws}`,
      search: 'clamp universal clamp 万能夹 三爪夹 烧瓶夹 冷凝管夹',
      ports: [
        { id: 'clamp', x: 12, y: 100, dx: -1, dy: 0, type: 'clamp', diameter: 8 },
        { id: 'grip', x: 146, y: 100, dx: 1, dy: 0, type: 'grip', diameter: 25 },
      ],
    });
  }

  // clamp-front (180x200) — clamp: (12,100, d=8), grip: (146,100, d=25)
  {
    const id = 'clamp-front';
    const body = `<rect x="12" y="88" width="16" height="24" rx="3" fill="${C.inner}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="4" y="97" width="8" height="6" rx="1.5" fill="${C.brass}" stroke="${C.stroke}" stroke-width="1.6"/>
      <line x1="5" y1="93" x2="5" y2="107" stroke="${C.stroke}" stroke-width="2.6" stroke-linecap="round"/>
      <rect x="28" y="96.5" width="90" height="7" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <path d="M116 96 L128 74 M116 104 L128 126" fill="none" stroke="${C.stroke}" stroke-width="4.2" stroke-linecap="round"/>
      <path d="M116 96 L128 74 M116 104 L128 126" fill="none" stroke="${C.chassisBot}" stroke-width="2.0" stroke-linecap="round"/>
      <path d="M130 68 C116 84 116 116 130 132 C134 136 139 131 135 125 C124 112 124 88 135 75 C139 69 134 64 130 68 Z" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.1"/>
      <path d="M162 68 C176 84 176 116 162 132 C158 136 153 131 157 125 C168 112 168 88 157 75 C153 69 158 64 162 68 Z" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.1"/>
      <rect x="110" y="90" width="12" height="20" rx="3" fill="${C.brass}" stroke="${C.stroke}" stroke-width="1.9"/>`;
    register(id, '夹具正视图', '支撑与夹持', {
      width: 180,
      height: 200,
      svg: body,
      search: 'clamp front 夹具正视图 双爪夹 正视铁夹',
      ports: [
        { id: 'clamp', x: 12, y: 100, dx: -1, dy: 0, type: 'clamp', diameter: 8 },
        { id: 'grip', x: 146, y: 100, dx: 1, dy: 0, type: 'grip', diameter: 25 },
      ],
    });
  }

  // retort-ring (180x200) — clamp: (16,72, d=8), surface: (119,72)
  {
    const id = 'retort-ring';
    const body = `<ellipse cx="119" cy="72" rx="44" ry="17" fill="none" stroke="${C.stroke}" stroke-width="7.2"/>
      <ellipse cx="119" cy="72" rx="44" ry="17" fill="none" stroke="${C.chassisBot}" stroke-width="2.8"/>
      <rect x="16" y="62" width="15" height="20" rx="3" fill="${C.inner}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="4" y="69" width="12" height="6" rx="2" fill="${C.brass}" stroke="${C.stroke}" stroke-width="1.7"/>
      <line x1="6" y1="64" x2="6" y2="80" stroke="${C.stroke}" stroke-width="2.6" stroke-linecap="round"/>
      <rect x="31" y="69" width="44" height="6" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>`;
    register(id, '铁圈', '支撑与夹持', {
      width: 180,
      height: 200,
      svg: body,
      search: 'retort ring 铁圈 铁环 铁架台圆环',
      ports: [
        { id: 'clamp', x: 16, y: 72, dx: -1, dy: 0, type: 'clamp', diameter: 8 },
        { id: 'surface', x: 119, y: 72, dx: 0, dy: -1, type: 'surface', diameter: 0 },
      ],
    });
  }

  // g-clamp (180x200)
  {
    const id = 'g-clamp';
    const body = `<path d="M142 28 H54 Q24 28 24 58 V130 Q24 160 54 160 H142 V136 H58 Q48 136 48 126 V62 Q48 52 58 52 H142 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M134 36 H56 Q34 36 34 58 V130 Q34 152 56 152 H134" fill="none" stroke="${C.inner}" stroke-width="1.6"/>
      <rect x="120" y="64" width="10" height="106" rx="2" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.1"/>
      <path d="M120 74 H130 M120 82 H130 M120 90 H130 M120 98 H130 M120 106 H130 M120 114 H130 M120 122 H130" stroke="${C.tick}" stroke-width="1.2"/>
      <rect x="108" y="56" width="34" height="10" rx="3" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="98" y="168" width="54" height="8" rx="4" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.1"/>`;
    register(id, 'G 形夹', '支撑与夹持', {
      width: 180,
      height: 200,
      svg: body,
      search: 'g clamp c clamp G形夹 台面固定夹',
      ports: [],
    });
  }

  // test-tube-rack (180x200) — rack-40/73/106/139 at y=70, d=20
  {
    const id = 'test-tube-rack';
    const rack = `<rect x="18" y="70" width="10" height="98" fill="${C.corkMid}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="152" y="70" width="10" height="98" fill="${C.corkMid}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="12" y="60" width="156" height="18" rx="4" fill="${C.corkMid}" stroke="${C.stroke}" stroke-width="2.3"/>
      <rect x="12" y="164" width="156" height="16" rx="4" fill="${C.corkMid}" stroke="${C.stroke}" stroke-width="2.3"/>
      <circle cx="23" cy="69" r="2.2" fill="${C.corkDark}"/>
      <circle cx="157" cy="69" r="2.2" fill="${C.corkDark}"/>
      <circle cx="23" cy="172" r="2.2" fill="${C.corkDark}"/>
      <circle cx="157" cy="172" r="2.2" fill="${C.corkDark}"/>
      ${[40, 73, 106, 139]
        .map(
          (x) =>
            `<ellipse cx="${x}" cy="70" rx="11" ry="4.8" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="1.9"/>` +
            `<ellipse cx="${x}" cy="169" rx="8.5" ry="3.2" fill="${C.corkDark}" stroke="${C.inner}" stroke-width="1.4"/>`
        )
        .join('')}`;
    register(id, '试管架', '支撑与夹持', {
      width: 180,
      height: 200,
      svg: rack,
      search: 'test tube rack 试管架 四孔试管架 木质试管架',
      ports: [40, 73, 106, 139].map((x) => ({
        id: `rack-${x}`,
        x,
        y: 70,
        dx: 0,
        dy: -1,
        type: 'rack',
        diameter: 20,
      })),
    });
  }

  // test-tube-holder (180x200) — grip: (95, 163, d=38)
  {
    const id = 'test-tube-holder';
    const body = `<path d="M52 20 C56 38 76 48 84 68 L68 152 L50 166" fill="none" stroke="${C.stroke}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M52 20 C56 38 76 48 84 68 L68 152 L50 166" fill="none" stroke="${C.chassisBot}" stroke-width="3.0" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M132 20 C128 38 108 48 100 68 L118 152 L138 166" fill="none" stroke="${C.stroke}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M132 20 C128 38 108 48 100 68 L118 152 L138 166" fill="none" stroke="${C.chassisBot}" stroke-width="3.0" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M41 16 C41 10 53 10 55 17 L64 49 C65 55 53 58 50 51 Z" fill="${C.corkMid}" stroke="${C.stroke}" stroke-width="2.1" stroke-linejoin="round"/>
      <path d="M143 16 C143 10 131 10 129 17 L120 49 C119 55 131 58 134 51 Z" fill="${C.corkMid}" stroke="${C.stroke}" stroke-width="2.1" stroke-linejoin="round"/>
      <circle cx="92" cy="68" r="8" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="92" cy="68" r="3" fill="${C.inner}"/>
      <path d="M50 156 C44 162 46 172 56 172" fill="none" stroke="${C.teal}" stroke-width="5" stroke-linecap="round"/>
      <path d="M138 156 C144 162 142 172 132 172" fill="none" stroke="${C.teal}" stroke-width="5" stroke-linecap="round"/>`;
    register(id, '试管夹', '支撑与夹持', {
      width: 180,
      height: 200,
      svg: body,
      search: 'test tube holder 试管夹 弹簧试管钳',
      ports: [{ id: 'grip', x: 95, y: 163, dx: 0, dy: 1, type: 'grip', diameter: 38 }],
    });
  }

  // peg (180x200) — grip: (64, 167)
  {
    const id = 'peg';
    const body = `<path d="M58 18 H78 L75 168 L56 168 L60 120 L54 102 Z" fill="${C.corkMid}" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>
      <path d="M84 22 L104 25 L92 170 L73 169 L79 118 L86 102 Z" fill="${C.corkMid}" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>
      <circle cx="79" cy="102" r="11.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2"/>
      <circle cx="79" cy="102" r="4.5" fill="${C.inner}" stroke="none"/>
      <line x1="65" y1="30" x2="65" y2="86" stroke="${C.corkDark}" stroke-width="1.2"/>
      <line x1="94" y1="34" x2="91" y2="88" stroke="${C.corkDark}" stroke-width="1.2"/>`;
    register(id, '木夹', '支撑与夹持', {
      width: 180,
      height: 200,
      svg: body,
      search: 'peg wooden clip 木夹 弹簧木质试管夹',
      ports: [{ id: 'grip', x: 64, y: 167, dx: 0, dy: 1, type: 'grip', diameter: 0 }],
    });
  }

  // tongs (180x200) — grip: (95, 163, d=38)
  {
    const id = 'tongs';
    const body = `<ellipse cx="48" cy="28" rx="14" ry="11" fill="none" stroke="${C.stroke}" stroke-width="4.5"/>
      <ellipse cx="136" cy="28" rx="14" ry="11" fill="none" stroke="${C.stroke}" stroke-width="4.5"/>
      <path d="M56 38 L94 74 C76 108 66 136 71 158 C73 167 78 171 84 171" fill="none" stroke="${C.stroke}" stroke-width="6.2" stroke-linecap="round"/>
      <path d="M56 38 L94 74 C76 108 66 136 71 158 C73 167 78 171 84 171" fill="none" stroke="${C.chassisBot}" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M128 38 L90 74 C108 108 118 136 113 158 C111 167 106 171 100 171" fill="none" stroke="${C.stroke}" stroke-width="6.2" stroke-linecap="round"/>
      <path d="M128 38 L90 74 C108 108 118 136 113 158 C111 167 106 171 100 171" fill="none" stroke="${C.chassisBot}" stroke-width="2.8" stroke-linecap="round"/>
      <circle cx="92" cy="74" r="6" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.0"/>`;
    register(id, '坩埚钳', '支撑与夹持', {
      width: 180,
      height: 200,
      svg: body,
      search: 'tongs crucible tongs 坩埚钳 不锈钢坩埚钳',
      ports: [{ id: 'grip', x: 95, y: 163, dx: 0, dy: 1, type: 'grip', diameter: 38 }],
    });
  }

  // tweezers (180x200)
  {
    const id = 'tweezers';
    const body = `<path d="M74 22 C74 12 106 12 106 22 L102 126 L93 184 H87 L78 126 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>
      <path d="M81 26 L88 182 M99 26 L92 182" fill="none" stroke="${C.inner}" stroke-width="1.5"/>
      <line x1="87" y1="22" x2="87" y2="112" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/>
      ${S.gradTicks(79, 68, 108, 6, 2, 4, { dir: 1 })}
      ${S.gradTicks(101, 68, 108, 6, 2, 4, { dir: -1 })}`;
    register(id, '镊子', '支撑与夹持', {
      width: 180,
      height: 200,
      svg: body,
      search: 'tweezers forceps 镊子 不锈钢镊子',
      ports: [],
    });
  }

  // fume-hood (200x170) — base: (100,159), surface: (100,140, seg:[29,140,171,140]) — NO literal "FUME HOOD" text
  {
    const id = 'fume-hood';
    const body = S.chassis(id, 14, 10, 172, 149, { rx: 6, footH: 4, footInset: 16 }) +
      `<rect x="76" y="4" width="48" height="7" rx="2" fill="${C.inner}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="28" y="34" width="144" height="106" rx="2" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.2"/>
      ${S.ventSlots(44, 96, 3, 112, 6)}
      <rect x="28" y="34" width="144" height="48" fill="${C.glassTop}" stroke="${C.inner}" stroke-width="1.5"/>
      <rect x="28" y="78" width="144" height="6" rx="1.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.6"/>
      <rect x="86" y="79.5" width="28" height="3" rx="1" fill="${C.inner}"/>
      <line x1="29" y1="140" x2="171" y2="140" stroke="${C.stroke}" stroke-width="3.0" stroke-linecap="round"/>
      <rect x="122" y="15" width="50" height="14" rx="2.5" fill="${C.lcdBg}" stroke="${C.stroke}" stroke-width="1.4"/>
      ${S.screenText(147, 25, '0.50 m/s', 7.0, C.stroke)}
      <circle cx="34" cy="22" r="3.5" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.2"/>`;
    register(id, '通风橱', '设备', {
      width: 200,
      height: 170,
      svg: body,
      search: 'fume hood 通风橱 排风柜 化学通风柜',
      ports: [basePort(100, 159), surfacePort('surface', 29, 140, 171, 140)],
    });
  }

  // glove (180x150)
  {
    const id = 'glove';
    const body = `<path d="M54 134 L34 86 C26 70 38 62 48 74 L56 86 V32 C56 20 68 20 68 32 V64 V18 C68 6 82 6 82 18 V62 V22 C82 10 96 10 96 22 V66 V36 C96 24 110 24 110 36 V88 L128 70 C138 62 148 72 138 86 L116 134 Z" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>
      <rect x="52" y="128" width="66" height="9" rx="4" fill="${C.tealLight}" stroke="${C.stroke}" stroke-width="2.0"/>`;
    register(id, '手套', '测量与防护', {
      width: 180,
      height: 150,
      svg: body,
      search: 'glove nitrile glove 手套 丁腈手套 实验防护手套',
      ports: [],
    });
  }

  // goggles (180x150)
  {
    const id = 'goggles';
    const body = `<path d="M18 52 Q90 41 162 52 L152 106 Q130 112 104 104 L90 88 L76 104 Q50 112 28 106 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>
      <path d="M26 56 Q90 48 154 56 L146 98 Q126 103 106 96 L90 80 L74 96 Q54 103 34 98 Z" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>
      <path d="M40 66 L54 90 M116 64 L130 88" fill="none" stroke="#FFFFFF" stroke-width="3.0" stroke-linecap="round"/>
      <path d="M18 58 L8 68 M162 58 L172 68" fill="none" stroke="${C.teal}" stroke-width="4.5" stroke-linecap="round"/>`;
    register(id, '护目镜', '测量与防护', {
      width: 180,
      height: 150,
      svg: body,
      search: 'safety goggles 护目镜 防护眼镜 实验护目镜',
      ports: [],
    });
  }

  // lab-coat (180x150) — tailored full-length lab coat silhouette
  {
    const id = 'lab-coat';
    const body = `<path d="M68 12 L34 26 L14 86 L34 92 L48 54 V140 H132 V54 L146 92 L166 86 L146 26 L112 12 L90 38 Z" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>
      <path d="M20 71 L38 77 M160 71 L142 77" fill="none" stroke="${C.inner}" stroke-width="1.6"/>
      <path d="M68 12 L72 48 L90 38 M112 12 L108 48 L90 38" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.7" stroke-linejoin="round"/>
      <line x1="90" y1="38" x2="90" y2="140" stroke="${C.stroke}" stroke-width="1.8"/>
      ${[50, 70, 90, 110, 128].map((y) => `<circle cx="94" cy="${y}" r="2.2" fill="${C.teal}" stroke="none"/>`).join('')}
      <rect x="55" y="46" width="16" height="19" rx="2" fill="${C.chassisMid}" stroke="${C.inner}" stroke-width="1.4"/>
      <line x1="60" y1="42" x2="60" y2="49" stroke="${C.teal}" stroke-width="2.0" stroke-linecap="round"/>
      <rect x="55" y="90" width="21" height="26" rx="2.5" fill="${C.chassisMid}" stroke="${C.inner}" stroke-width="1.4"/>
      <rect x="104" y="90" width="21" height="26" rx="2.5" fill="${C.chassisMid}" stroke="${C.inner}" stroke-width="1.4"/>`;
    register(id, '实验服', '测量与防护', {
      width: 180,
      height: 150,
      svg: body,
      search: 'lab coat 实验服 白大褂 防护服',
      ports: [],
    });
  }

  // ghs-hazard (180x140)
  {
    const id = 'ghs-hazard';
    const body = `<path d="M90 10 L150 70 L90 130 L30 70 Z" fill="${C.chassisTop}" stroke="${C.red}" stroke-width="7.5" stroke-linejoin="round"/>
      <rect x="86" y="38" width="8" height="42" rx="4" fill="${C.stroke}" stroke="none"/>
      <circle cx="90" cy="96" r="5" fill="${C.stroke}" stroke="none"/>`;
    register(id, '危险提示菱形', '图形与标记', {
      width: 180,
      height: 140,
      svg: body,
      search: 'ghs hazard warning diamond 危险提示菱形 化学品警示标志',
      ports: [],
    });
  }

  // table (200x170) — surface: (100, 48, seg:[10,48,190,48])
  {
    const id = 'table';
    const body = `<rect x="20" y="62" width="10" height="96" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="170" y="62" width="10" height="96" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="30" y="62" width="140" height="32" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="38" y="68" width="58" height="20" rx="2" fill="${C.chassisTop}" stroke="${C.inner}" stroke-width="1.5"/>
      <rect x="104" y="68" width="58" height="20" rx="2" fill="${C.chassisTop}" stroke="${C.inner}" stroke-width="1.5"/>
      <rect x="58" y="76" width="18" height="4" rx="1.5" fill="${C.teal}" stroke="none"/>
      <rect x="124" y="76" width="18" height="4" rx="1.5" fill="${C.teal}" stroke="none"/>
      <rect x="30" y="122" width="140" height="8" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="10" y="48" width="180" height="14" rx="3" fill="${C.inner}" stroke="${C.stroke}" stroke-width="2.3"/>
      <rect x="12" y="57" width="176" height="4" fill="${C.teal}" stroke="none"/>`;
    register(id, '实验桌', '设备', {
      width: 200,
      height: 170,
      svg: body,
      search: 'lab bench table 实验桌 实验台 化学操作台',
      ports: [surfacePort('surface', 10, 48, 190, 48)],
    });
  }

  // spatula (180x120) — probe: (170,58, d=12, seg:[150,58,30,58])
  {
    const id = 'spatula';
    const body = `<rect x="10" y="49" width="42" height="18" rx="4" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.2"/>
      <line x1="18" y1="54" x2="44" y2="54" stroke="${C.tealLight}" stroke-width="1.6" stroke-linecap="round"/>
      <rect x="52" y="54" width="74" height="8" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.1"/>
      <ellipse cx="148" cy="58" rx="22" ry="12.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2"/>
      <ellipse cx="149" cy="58" rx="15" ry="7.2" fill="${C.chassisMid}" stroke="${C.inner}" stroke-width="1.3"/>`;
    register(id, '药匙', '实验小工具', {
      width: 180,
      height: 120,
      svg: body,
      search: 'spatula 药匙 不锈钢药匙 取药勺',
      ports: [{ id: 'probe', x: 170, y: 58, dx: 1, dy: 0, type: 'probe', diameter: 12, segment: [150, 58, 30, 58] }],
    });
  }

  // corkborer (180x120)
  {
    const id = 'corkborer';
    const tubes = [0, 1, 2, 3]
      .map((i) => {
        const x = 22 + i * 38;
        const w = 13 + i * 3;
        const y = 32 - i * 4;
        const h = 66 + i * 4;
        return `<line x1="${x - 5}" y1="${y - 6}" x2="${x + w + 5}" y2="${y - 6}" stroke="${C.stroke}" stroke-width="4.5" stroke-linecap="round"/>
          <line x1="${x - 5}" y1="${y - 6}" x2="${x + w + 5}" y2="${y - 6}" stroke="${C.teal}" stroke-width="2.0" stroke-linecap="round"/>
          <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.0"/>
          <line x1="${x + 2}" y1="${y + h - 4}" x2="${x + w - 2}" y2="${y + h - 4}" stroke="${C.brassDark}" stroke-width="1.4"/>`;
      })
      .join('\n  ');
    register(id, '打孔器', '实验小工具', {
      width: 180,
      height: 120,
      svg: tubes,
      search: 'cork borer 打孔器 橡皮塞打孔器',
      ports: [],
    });
  }

  // scissors (180x120)
  {
    const id = 'scissors';
    const body = `<path d="M54 70 L150 18 L142 30 L76 74 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M70 76 L62 14 L74 22 L84 74 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <ellipse cx="38" cy="84" rx="18" ry="13" fill="none" stroke="${C.stroke}" stroke-width="6.5"/>
      <ellipse cx="38" cy="84" rx="18" ry="13" fill="none" stroke="${C.teal}" stroke-width="3.2"/>
      <ellipse cx="96" cy="96" rx="18" ry="13" fill="none" stroke="${C.stroke}" stroke-width="6.5"/>
      <ellipse cx="96" cy="96" rx="18" ry="13" fill="none" stroke="${C.teal}" stroke-width="3.2"/>
      <circle cx="76" cy="71" r="5" fill="${C.brass}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    register(id, '剪刀', '实验小工具', {
      width: 180,
      height: 120,
      svg: body,
      search: 'scissors 剪刀 实验剪刀 解剖剪',
      ports: [],
    });
  }

  // magnifying-glass (180x150)
  {
    const id = 'magnifying-glass';
    const body = `<line x1="103" y1="91" x2="154" y2="138" stroke="${C.stroke}" stroke-width="15" stroke-linecap="round"/>
      <line x1="103" y1="91" x2="154" y2="138" stroke="${C.teal}" stroke-width="9.5" stroke-linecap="round"/>
      <rect x="97" y="83" width="14" height="14" rx="3" transform="rotate(42 104 90)" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="70" cy="59" r="48" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.4"/>
      <circle cx="70" cy="59" r="40" fill="${C.glassTop}" stroke="${C.inner}" stroke-width="1.9"/>
      <path d="M46 42 A30 30 0 0 1 78 30" fill="none" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round"/>`;
    register(id, '放大镜', '测量与防护', {
      width: 180,
      height: 150,
      svg: body,
      search: 'magnifying glass hand lens 放大镜 手持放大镜',
      ports: [],
    });
  }

  // desk-lamp (200x170) — base: (88, 164)
  {
    const id = 'desk-lamp';
    const body = `<ellipse cx="88" cy="156" rx="56" ry="9.5" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.3"/>
      <rect x="80" y="141" width="16" height="13" rx="3" fill="${C.inner}" stroke="${C.stroke}" stroke-width="2.0"/>
      <path d="M88 141 L58 92 L120 38" fill="none" stroke="${C.stroke}" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M88 141 L58 92 L120 38" fill="none" stroke="${C.chassisBot}" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="58" cy="92" r="7.5" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.0"/>
      <path d="M104 20 C122 6 148 12 158 30 L176 68 L112 80 Z" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>
      <ellipse cx="144" cy="74" rx="24" ry="6.5" transform="rotate(-10 144 74)" fill="${C.brassLight}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    register(id, '台灯', '设备', {
      width: 200,
      height: 170,
      svg: body,
      search: 'desk lamp 台灯 实验照明灯',
      ports: [basePort(88, 164)],
    });
  }

  // desk-fan (200x170) — base: (99, 164)
  {
    const id = 'desk-fan';
    const blades = [0, 120, 240]
      .map(
        (deg) =>
          `<path d="M99 66 C91 22 128 14 121 51 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.9" transform="rotate(${deg} 99 66)"/>`
      )
      .join('');
    const body = `<rect x="93" y="122" width="12" height="33" rx="3" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2"/>
      <ellipse cx="99" cy="157" rx="50" ry="8.5" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.3"/>
      <circle cx="99" cy="66" r="58" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.4"/>
      <circle cx="99" cy="66" r="51" fill="none" stroke="${C.tick}" stroke-width="1.4"/>
      <circle cx="99" cy="66" r="32" fill="none" stroke="${C.muted}" stroke-width="1.1"/>
      ${blades}
      <circle cx="99" cy="66" r="11.5" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.2"/>`;
    register(id, '台式风扇', '设备', {
      width: 200,
      height: 170,
      svg: body,
      search: 'desk fan 台式风扇 风扇',
      ports: [basePort(99, 164)],
    });
  }

  // computer (200x170) — base: (100, 162) — NO literal "CHEM WORKSTATION" text
  {
    const id = 'computer';
    const body = `<rect x="92" y="116" width="16" height="28" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="64" y="140" width="72" height="7" rx="3" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <path d="M24 162 H176 L164 150 H36 Z" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <rect x="16" y="14" width="168" height="104" rx="6" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.3"/>
      ${S.oledScreen(
        id,
        24,
        22,
        152,
        88,
        `<polyline points="34,94 56,94 68,52 78,94 102,94 114,38 124,94 166,94" fill="none" stroke="${C.teal}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>` +
          `<polyline points="34,82 70,80 100,66 135,70 166,60" fill="none" stroke="${C.stroke}" stroke-width="1.5" stroke-dasharray="3 2"/>`
      )}`;
    register(id, '电脑', '设备', {
      width: 200,
      height: 170,
      svg: body,
      search: 'computer monitor workstation 电脑 工作站 数据采集仪',
      ports: [basePort(100, 162)],
    });
  }

  // camera (200x170)
  {
    const id = 'camera';
    const body = `<path d="M62 46 L74 28 H114 L126 46 Z" fill="${C.inner}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <rect x="30" y="34" width="20" height="10" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="18" y="44" width="164" height="94" rx="9" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.3"/>
      <rect x="18" y="64" width="164" height="58" fill="${C.inner}" stroke="none"/>
      <circle cx="96" cy="92" r="34" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.3"/>
      <circle cx="96" cy="92" r="24" fill="${C.stroke}" stroke="${C.stroke}" stroke-width="1.8"/>
      <circle cx="96" cy="92" r="16" fill="${C.glass}" stroke="${C.teal}" stroke-width="1.6"/>
      <circle cx="152" cy="54" r="4" fill="${C.red}" stroke="${C.stroke}" stroke-width="1.3"/>`;
    register(id, '相机', '设备', {
      width: 200,
      height: 170,
      svg: body,
      search: 'camera 相机 数码相机 实验摄影',
      ports: [],
    });
  }

  // videocamera (200x170)
  {
    const id = 'videocamera';
    const body = `<path d="M46 46 V26 H122 V46" fill="none" stroke="${C.stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="18" y="46" width="132" height="84" rx="8" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.3"/>
      <rect x="28" y="62" width="66" height="50" rx="4" fill="${C.inner}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="116" cy="88" r="22" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2"/>
      <circle cx="116" cy="88" r="13" fill="${C.glass}" stroke="${C.teal}" stroke-width="1.6"/>
      <path d="M150 64 L184 52 V124 L150 112 Z" fill="${C.inner}" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>
      <circle cx="136" cy="58" r="4" fill="${C.red}" stroke="none"/>`;
    register(id, '摄像机', '设备', {
      width: 200,
      height: 170,
      svg: body,
      search: 'videocamera camcorder 摄像机 录像机',
      ports: [],
    });
  }

  // pencil (180x120) — probe: (170,58, d=12, seg:[150,58,30,58])
  {
    const id = 'pencil';
    const body = `<rect x="14" y="51" width="14" height="14" rx="3" fill="${C.red}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="27" y="51" width="9" height="14" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="36" y="51" width="108" height="14" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.2"/>
      <line x1="38" y1="58" x2="142" y2="58" stroke="${C.brassLight}" stroke-width="1.5"/>
      <path d="M144 51 L170 58 L144 65 Z" fill="${C.corkLight}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M161 55.6 L170 58 L161 60.4 Z" fill="${C.stroke}" stroke="none"/>`;
    register(id, '铅笔', '实验小工具', {
      width: 180,
      height: 120,
      svg: body,
      search: 'pencil 铅笔 绘图铅笔 色谱画线铅笔',
      ports: [{ id: 'probe', x: 170, y: 58, dx: 1, dy: 0, type: 'probe', diameter: 12, segment: [150, 58, 30, 58] }],
    });
  }

  // felt-tip-pen (180x120) — probe: (170,58, d=12, seg:[150,58,30,58]) — NO literal "LAB" text
  {
    const id = 'felt-tip-pen';
    const body = `<rect x="16" y="48" width="24" height="20" rx="4" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="38" y="48" width="94" height="20" rx="2" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="64" y="51" width="44" height="14" rx="2" fill="${C.tealSoft}" stroke="${C.teal}" stroke-width="1.2"/>
      <path d="M132 49 L158 54 V62 L132 67 Z" fill="${C.inner}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M158 55 L170 57 V59 L158 61 Z" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    register(id, '记号笔', '实验小工具', {
      width: 180,
      height: 120,
      svg: body,
      search: 'marker felt tip pen 记号笔 玻璃记号笔 标签笔',
      ports: [{ id: 'probe', x: 170, y: 58, dx: 1, dy: 0, type: 'probe', diameter: 12, segment: [150, 58, 30, 58] }],
    });
  }

  // adhesive-tape (180x120)
  {
    const id = 'adhesive-tape';
    const body = `<path d="M74 96 H162 L156 88 L162 80 H102 Z" fill="${C.brassLight}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <ellipse cx="74" cy="58" rx="46" ry="38" fill="${C.brassLight}" stroke="${C.stroke}" stroke-width="2.3"/>
      <ellipse cx="74" cy="58" rx="34" ry="27" fill="none" stroke="${C.brassDark}" stroke-width="1.2"/>
      <ellipse cx="74" cy="58" rx="23" ry="18" fill="${C.corkMid}" stroke="${C.stroke}" stroke-width="2.2"/>
      <ellipse cx="74" cy="58" rx="15" ry="11.5" fill="${C.chassisTop}" stroke="${C.inner}" stroke-width="1.5"/>`;
    register(id, '胶带', '实验小工具', {
      width: 180,
      height: 120,
      svg: body,
      search: 'adhesive tape 胶带 标签胶带 封口膜',
      ports: [],
    });
  }

  // paperclip (180x120)
  {
    const id = 'paperclip';
    const d = 'M50 82 V30 Q50 12 72 12 H108 Q132 12 132 36 V86 Q132 108 108 108 H74 Q66 108 66 86 V38 Q66 28 78 28 H102 Q114 28 114 40 V78 Q114 92 96 92';
    const body = `<path d="${d}" fill="none" stroke="${C.stroke}" stroke-width="5.2" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="${C.chassisMid}" stroke-width="2.4" stroke-linecap="round"/>`;
    register(id, '回形针', '实验小工具', {
      width: 180,
      height: 120,
      svg: body,
      search: 'paperclip 回形针 金属曲别针',
      ports: [],
    });
  }

  // wooden-splint (180x120) — probe: (170,58, d=12, seg:[150,58,30,58])
  {
    const id = 'wooden-splint';
    const body = `<rect x="14" y="52" width="156" height="12" rx="3" fill="${C.corkMid}" stroke="${C.stroke}" stroke-width="2.2"/>
      <line x1="26" y1="56" x2="148" y2="56" stroke="${C.corkDark}" stroke-width="1.0"/>
      <line x1="42" y1="60" x2="156" y2="60" stroke="${C.corkLight}" stroke-width="1.0"/>`;
    register(id, '木条', '实验小工具', {
      width: 180,
      height: 120,
      svg: body,
      search: 'wooden splint 木条 带火星木条 燃着木条 气体检验',
      ports: [{ id: 'probe', x: 170, y: 58, dx: 1, dy: 0, type: 'probe', diameter: 12, segment: [150, 58, 30, 58] }],
    });
  }

  // cotton-wool (170x130)
  {
    const id = 'cotton-wool';
    const body = `<path d="M28 90 C10 68 24 38 48 44 C56 20 96 14 110 38 C138 24 162 56 144 84 C156 104 128 116 106 108 C86 120 44 116 28 90 Z" fill="${C.porcelainMid}" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>
      <path d="M46 68 C58 58 76 62 84 74 M94 56 C108 50 122 58 124 72 M54 90 C68 96 86 92 94 84" fill="none" stroke="${C.tick}" stroke-width="1.5" stroke-linecap="round"/>`;
    register(id, '脱脂棉', '物质与填充', {
      width: 170,
      height: 130,
      svg: body,
      search: 'cotton wool 脱脂棉 棉花 过滤棉塞',
      ports: [],
    });
  }

  // steel-wool (170x130)
  {
    const id = 'steel-wool';
    let strands = '';
    for (let i = 0; i < 16; i++) {
      const y0 = 38 + ((i * 19) % 54);
      const y1 = 24 + ((i * 23) % 78);
      strands += `<path d="M${26 + i * 4} ${y0} C${126 - i * 3} ${12 + i * 5} ${32 + i * 6} ${118 - i * 3} ${142 - i * 3} ${y1}" fill="none" stroke="${i % 2 ? C.inner : C.tick}" stroke-width="1.6" stroke-linecap="round"/>`;
    }
    const pad = `<ellipse cx="85" cy="65" rx="64" ry="44" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.0" stroke-dasharray="4 3"/>`;
    register(id, '钢丝绒', '物质与填充', {
      width: 170,
      height: 130,
      svg: `${pad}\n  ${strands}`,
      search: 'steel wool 钢丝绒 铁丝绵',
      ports: [],
    });
  }

  // glass-wool (170x130)
  {
    const id = 'glass-wool';
    let strands = '';
    for (let i = 0; i < 16; i++) {
      const y0 = 36 + ((i * 17) % 58);
      const y1 = 24 + ((i * 29) % 76);
      strands += `<path d="M${24 + i * 4} ${y0} C${130 - i * 3} ${14 + i * 5} ${28 + i * 6} ${116 - i * 3} ${144 - i * 3} ${y1}" fill="none" stroke="${i % 3 === 0 ? C.chassisTop : i % 2 ? C.tick : C.teal}" stroke-width="1.5" stroke-linecap="round"/>`;
    }
    const pad = `<path d="M26 88 C10 66 24 38 48 44 C56 22 96 16 112 38 C140 24 162 58 144 86 C154 106 126 116 106 108 C84 120 42 114 26 88 Z" fill="${C.coolantLight}" stroke="${C.stroke}" stroke-width="2.1" stroke-linejoin="round"/>`;
    register(id, '玻璃棉', '物质与填充', {
      width: 170,
      height: 130,
      svg: `${pad}\n  ${strands}`,
      search: 'glass wool 玻璃棉 玻璃纤维棉 填料',
      ports: [],
    });
  }

  // soda-can (180x150) — base: (90, 131)
  {
    const id = 'soda-can';
    const body = `<path d="M52 16 H128 L135 28 V122 L127 131 H53 L45 122 V28 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>
      <rect x="45" y="48" width="90" height="54" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.8"/>
      <line x1="56" y1="34" x2="56" y2="116" stroke="#FFFFFF" stroke-width="2.0" stroke-linecap="round" opacity="0.5"/>
      <ellipse cx="90" cy="16" rx="38" ry="6" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.1"/>
      <ellipse cx="90" cy="16" rx="12" ry="2.5" fill="${C.inner}" stroke="none"/>`;
    register(id, '易拉罐', '测量与防护', {
      width: 180,
      height: 150,
      svg: body,
      search: 'soda can aluminum can 易拉罐 铝罐 量热罐',
      ports: [basePort(90, 131)],
    });
  }

  // faucet (180x150) — outlet: (142, 98, d=23)
  {
    const id = 'faucet';
    const body = `<path d="M28 134 V56 H134 Q153.5 56 153.5 76 V98 H130.5 V78 H50 V134 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>
      <rect x="20" y="128" width="38" height="10" rx="3" fill="${C.inner}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="128" y="92" width="28" height="6" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="64" y="42" width="38" height="14" rx="3" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="80" y="18" width="6" height="24" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="54" y="14" width="58" height="7" rx="3.5" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.0"/>`;
    register(id, '水龙头', '测量与防护', {
      width: 180,
      height: 150,
      svg: body,
      search: 'faucet water tap 水龙头 冷凝水龙头 给水口',
      ports: [{ id: 'outlet', x: 142, y: 98, dx: 0, dy: 1, type: 'tube', diameter: 23 }],
    });
  }

  // balloon (180x150) — inlet: (90, 120, hose, d=14), hanger: (90, 147)
  {
    const id = 'balloon';
    const body = `<path d="M90 120 C76 128 98 136 90 147" fill="none" stroke="${C.stroke}" stroke-width="2.0" stroke-linecap="round"/>
      <path d="M84 111 L78 120 H102 L96 111 Z" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>
      <path d="M90 10 C125 10 144 36 140 66 C136 94 112 112 90 112 C68 112 44 94 40 66 C36 36 55 10 90 10 Z" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M56 38 C59 27 67 21 76 19" fill="none" stroke="${C.tealLight}" stroke-width="3.0" stroke-linecap="round"/>`;
    register(id, '气球', '测量与防护', {
      width: 180,
      height: 150,
      svg: body,
      search: 'balloon 气球 气体收集气球 弹性气球',
      ports: [
        { id: 'inlet', x: 90, y: 120, dx: 0, dy: 1, type: 'hose', diameter: 14, depth: 8, edge: [83, 120, 97, 120] },
        { id: 'hanger', x: 90, y: 147, dx: 0, dy: 1, type: 'hanger', diameter: 0 },
      ],
    });
  }

  // burette-clamp [NEW] (190x120) — clamp:(95,60), grip-left:(24,60), grip-right:(166,60)
  {
    const id = 'burette-clamp';
    const arms = `<path d="M84 55 H36 C20 55 16 41 28 41 M84 65 H36 C20 65 16 79 28 79" fill="none" stroke="${C.stroke}" stroke-width="5.6" stroke-linecap="round"/>
      <path d="M84 55 H36 C20 55 16 41 28 41 M84 65 H36 C20 65 16 79 28 79" fill="none" stroke="${C.chassisBot}" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M106 55 H154 C170 55 174 41 162 41 M106 65 H154 C170 65 174 79 162 79" fill="none" stroke="${C.stroke}" stroke-width="5.6" stroke-linecap="round"/>
      <path d="M106 55 H154 C170 55 174 41 162 41 M106 65 H154 C170 65 174 79 162 79" fill="none" stroke="${C.chassisBot}" stroke-width="2.4" stroke-linecap="round"/>`;
    const sleeves = `<rect x="34" y="49" width="14" height="22" rx="4" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="142" y="49" width="14" height="22" rx="4" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="19" y="41" width="9" height="8" rx="3" fill="${C.tealDark}" stroke="${C.stroke}" stroke-width="1.5"/>
      <rect x="19" y="71" width="9" height="8" rx="3" fill="${C.tealDark}" stroke="${C.stroke}" stroke-width="1.5"/>
      <rect x="162" y="41" width="9" height="8" rx="3" fill="${C.tealDark}" stroke="${C.stroke}" stroke-width="1.5"/>
      <rect x="162" y="71" width="9" height="8" rx="3" fill="${C.tealDark}" stroke="${C.stroke}" stroke-width="1.5"/>
      <rect x="82" y="45" width="26" height="30" rx="4" fill="${C.inner}" stroke="${C.stroke}" stroke-width="2.2"/>
      <circle cx="95" cy="60" r="6" fill="${C.brass}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    register(id, '滴定管夹', '支撑与夹持', {
      width: 190,
      height: 120,
      svg: `${arms}\n  ${sleeves}`,
      search: 'burette clamp butterfly clamp 滴定管夹 蝴蝶夹 双联滴定夹',
      ports: [
        { id: 'clamp', x: 95, y: 60, dx: 0, dy: -1, type: 'clamp', diameter: 9 },
        { id: 'grip-left', x: 24, y: 60, dx: -1, dy: 0, type: 'grip', diameter: 20 },
        { id: 'grip-right', x: 166, y: 60, dx: 1, dy: 0, type: 'grip', diameter: 20 },
      ],
    });
  }

  // pinch-clamp [NEW] (120x120) — grip:(60,38, d=14)
  {
    const id = 'pinch-clamp';
    const body = `<path d="M34 31 H86 M34 45 H86" fill="none" stroke="${C.stroke}" stroke-width="6.4" stroke-linecap="round"/>
      <path d="M34 31 H86 M34 45 H86" fill="none" stroke="${C.chassisBot}" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M40 31 V58 L84 102 M80 31 V58 L36 102" fill="none" stroke="${C.stroke}" stroke-width="5.4" stroke-linecap="round"/>
      <path d="M40 31 V58 L84 102 M80 31 V58 L36 102" fill="none" stroke="${C.chassisBot}" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="60" cy="68" r="4.5" fill="${C.brass}" stroke="${C.stroke}" stroke-width="1.6"/>
      <rect x="27" y="94" width="18" height="17" rx="4" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="75" y="94" width="18" height="17" rx="4" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.0"/>`;
    register(id, '止水夹', '导管', {
      width: 120,
      height: 120,
      svg: body,
      search: 'pinch clamp Mohr clip pinchcock 止水夹 弹簧夹 螺旋夹 胶管夹',
      ports: [{ id: 'grip', x: 60, y: 38, dx: 1, dy: 0, type: 'grip', diameter: 14 }],
    });
  }

  // =========================================================================
  // 3. MEASUREMENT & ANALYTICAL INSTRUMENTS
  // =========================================================================

  // balance (200x170) — surface: (100, 37)
  {
    const id = 'balance';
    const pan = `<rect x="92" y="48" width="16" height="28" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="44" y="37" width="112" height="11" rx="4" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.3"/>
      <line x1="52" y1="41" x2="148" y2="41" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round"/>`;
    const base = S.chassis(id, 18, 74, 164, 78, { rx: 8 });
    const oled = S.oledScreen(
      id,
      30,
      96,
      94,
      40,
      S.screenText(77, 121, '0.000 g', 13, C.stroke)
    );
    const btns = S.softButton(132, 98, 36, 15, 'TARE', C.teal, C.chassisTop) +
      S.softButton(132, 120, 36, 15, 'CAL', C.chassisTop, C.stroke) +
      `<circle cx="170" cy="88" r="3" fill="${C.coolant}" stroke="${C.stroke}" stroke-width="1.2"/>`;
    register(id, '电子天平', '设备', {
      width: 200,
      height: 170,
      svg: `${pan}\n  ${base}\n  ${oled}\n  ${btns}`,
      search: 'balance electronic scale 电子天平 分析天平 精密称量天平',
      ports: [{ id: 'surface', x: 100, y: 37, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // digital-thermometer (110x210) — probe: (55, 194, d=8, seg:[55,180,55,113])
  {
    const id = 'digital-thermometer';
    const stem = `<path d="M51.5 88 H58.5 V189 Q58.5 194 55 194 Q51.5 194 51.5 189 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <line x1="53.5" y1="102" x2="53.5" y2="184" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round"/>
      <rect x="46" y="84" width="18" height="16" rx="3" fill="${C.inner}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    const head = S.chassis(id, 15, 12, 80, 74, { rx: 8, feet: false }) +
      S.oledScreen(
        id,
        23,
        25,
        64,
        34,
        S.screenText(55, 46, '24.8°C', 11.5, C.stroke)
      ) +
      S.softButton(25, 65, 27, 13, '', C.chassisTop, C.stroke) +
      S.softButton(58, 65, 27, 13, '', C.teal, C.stroke);
    register(id, '数字温度计', '测量', {
      width: 110,
      height: 210,
      svg: `${stem}\n  ${head}`,
      search: 'digital thermometer 数字温度计 数显温度探针 测温仪',
      ports: [{ id: 'probe', x: 55, y: 194, dx: 0, dy: 1, type: 'probe', diameter: 8, segment: [55, 180, 55, 113] }],
    });
  }

  // ruler (180x75)
  {
    const id = 'ruler';
    let ticks = '';
    for (let i = 0; i <= 30; i++) {
      const x = 15 + i * 5;
      const major = i % 5 === 0;
      ticks += `<line x1="${x}" y1="16" x2="${x}" y2="${major ? 36 : 26}" stroke="${C.stroke}" stroke-width="${major ? 1.4 : 0.95}"/>`;
      if (i % 10 === 0) ticks += S.labelText(x, 48, String(i / 2), 7.5, C.inner);
    }
    const body = `<rect x="8" y="16" width="164" height="42" rx="3" fill="${C.corkLight}" stroke="${C.stroke}" stroke-width="2.3"/>
      ${ticks}`;
    register(id, '直尺', '测量与防护', {
      width: 180,
      height: 75,
      svg: body,
      search: 'ruler 直尺 刻度尺 长度测量',
      ports: [],
    });
  }

  // tape-measure (180x150)
  {
    const id = 'tape-measure';
    let ticks = '';
    for (let x = 114; x < 164; x += 8) ticks += strokeLine(x, 88, x, x % 16 === 2 ? 98 : 95, 1.1, C.stroke);
    const body = `<rect x="108" y="88" width="60" height="20" rx="2" fill="${C.brassLight}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="164" y="88" width="6" height="24" rx="1" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.8"/>
      ${ticks}
      <rect x="20" y="28" width="94" height="84" rx="22" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.3"/>
      <circle cx="67" cy="70" r="24" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.2"/>
      <circle cx="67" cy="70" r="10" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    register(id, '卷尺', '测量与防护', {
      width: 180,
      height: 150,
      svg: body,
      search: 'tape measure 卷尺 软尺 钢卷尺',
      ports: [],
    });
  }

  // protractor (180x150)
  {
    const id = 'protractor';
    let ticks = '';
    for (let i = 0; i <= 18; i++) {
      const t = (i * Math.PI) / 18;
      const major = i % 3 === 0;
      const rOuter = 72;
      const rInner = major ? 58 : 64;
      ticks += `<line x1="${r(90 - rOuter * Math.cos(t))}" y1="${r(120 - rOuter * Math.sin(t))}" x2="${r(90 - rInner * Math.cos(t))}" y2="${r(120 - rInner * Math.sin(t))}" stroke="${C.stroke}" stroke-width="${major ? 1.5 : 1.0}"/>`;
    }
    const body = `<path d="M16 120 A74 74 0 0 1 164 120 Z" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>
      <path d="M48 120 A42 42 0 0 1 132 120 Z" fill="#FFFFFF" stroke="${C.inner}" stroke-width="1.8"/>
      ${ticks}
      <circle cx="90" cy="112" r="2.5" fill="${C.teal}" stroke="none"/>`;
    register(id, '量角器', '测量与防护', {
      width: 180,
      height: 150,
      svg: body,
      search: 'protractor 量角器 半圆仪 角度测量',
      ports: [],
    });
  }

  // timer (200x170)
  {
    const id = 'timer';
    let ticks = '';
    for (let i = 0; i < 24; i++) {
      const t = (i * Math.PI) / 12;
      const major = i % 2 === 0;
      ticks += `<line x1="${r(100 + (major ? 41 : 45) * Math.sin(t))}" y1="${r(94 - (major ? 41 : 45) * Math.cos(t))}" x2="${r(100 + 49 * Math.sin(t))}" y2="${r(94 - 49 * Math.cos(t))}" stroke="${C.stroke}" stroke-width="${i % 6 === 0 ? 2.2 : major ? 1.5 : 0.9}"/>`;
    }
    const body = `<rect x="91" y="10" width="18" height="22" rx="3" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.1"/>
      <rect x="87" y="9" width="26" height="6" rx="2.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.9"/>
      <rect x="138" y="30" width="13" height="17" rx="2.5" transform="rotate(38 144 38)" fill="${C.inner}" stroke="${C.stroke}" stroke-width="1.9"/>
      <circle cx="100" cy="94" r="60" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.4"/>
      <circle cx="100" cy="94" r="51" fill="${C.chassisTop}" stroke="${C.inner}" stroke-width="1.8"/>
      ${ticks}
      <line x1="100" y1="94" x2="100" y2="51" stroke="${C.stroke}" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="100" y1="94" x2="130" y2="106" stroke="${C.red}" stroke-width="1.9" stroke-linecap="round"/>
      <circle cx="100" cy="94" r="5" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.7"/>`;
    register(id, '秒表', '设备', {
      width: 200,
      height: 170,
      svg: body,
      search: 'timer stopwatch 秒表 计时器 实验秒表',
      ports: [],
    });
  }

  // ph-probe (110x210) — probe: (55, 194, d=8, seg:[55,180,55,113])
  {
    const id = 'ph-probe';
    const stem = `<rect x="51" y="86" width="8" height="98" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="55" cy="188.5" r="5.5" fill="${C.coolant}" stroke="${C.stroke}" stroke-width="2.0"/>
      <line x1="55" y1="88" x2="55" y2="181" stroke="${C.teal}" stroke-width="1.5"/>
      <rect x="45" y="84" width="20" height="15" rx="3" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.9"/>`;
    const head = S.chassis(id, 15, 12, 80, 74, { rx: 8, feet: false }) +
      S.oledScreen(
        id,
        23,
        25,
        64,
        34,
        S.screenText(55, 46, 'pH 7.0', 11.5, C.stroke)
      ) +
      S.softButton(25, 65, 27, 13, '', C.chassisTop, C.stroke) +
      S.softButton(58, 65, 27, 13, '', C.teal, C.stroke);
    register(id, 'pH 探头', '测量', {
      width: 110,
      height: 210,
      svg: `${stem}\n  ${head}`,
      search: 'ph probe ph electrode meter pH探头 酸度计电极 pH计',
      ports: [{ id: 'probe', x: 55, y: 194, dx: 0, dy: 1, type: 'probe', diameter: 8, segment: [55, 180, 55, 113] }],
    });
  }

  // ph-paper (180x150) — clean color indicator strips without text clutter
  {
    const id = 'ph-paper';
    const colors = [C.red, C.brass, C.leaf, C.teal, C.blue];
    const strips = colors
      .map(
        (col, i) =>
          `<rect x="${22 + i * 28}" y="22" width="22" height="104" rx="2" fill="${col}" stroke="${C.stroke}" stroke-width="2.0"/>`
      )
      .join('\n  ');
    register(id, 'pH 试纸', '测量与防护', {
      width: 180,
      height: 150,
      svg: strips,
      search: 'ph paper indicator strips pH试纸 广泛pH试纸 酸碱试纸',
      ports: [],
    });
  }

  // litmus-paper (180x150) — clean flat red/blue strips
  {
    const id = 'litmus-paper';
    const body = `<rect x="40" y="22" width="38" height="104" rx="2" fill="${C.red}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="102" y="22" width="38" height="104" rx="2" fill="${C.blue}" stroke="${C.stroke}" stroke-width="2.2"/>`;
    register(id, '石蕊试纸', '测量与防护', {
      width: 180,
      height: 150,
      svg: body,
      search: 'litmus paper 石蕊试纸 红蓝石蕊试纸 酸碱指示试纸',
      ports: [],
    });
  }

  // electrode (180x120) — wire: (170, 58, d=12, seg:[150,58,30,58])
  {
    const id = 'electrode';
    const body = `<rect x="12" y="48" width="12" height="20" rx="4" fill="${C.porcelainMid}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="22" y="46" width="114" height="24" rx="2" fill="${C.coolantLight}" stroke="${C.stroke}" stroke-width="2.2"/>
      <line x1="28" y1="58" x2="132" y2="58" stroke="${C.teal}" stroke-width="2.2" stroke-linecap="round"/>
      <rect x="136" y="42" width="20" height="32" rx="3" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.1"/>
      <rect x="156" y="51" width="14" height="14" rx="3" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.0"/>`;
    register(id, '电极', '实验小工具', {
      width: 180,
      height: 120,
      svg: body,
      search: 'electrode 电极 金属电极 石墨电极 铂电极',
      ports: [{ id: 'wire', x: 170, y: 58, dx: 1, dy: 0, type: 'wire', diameter: 12, segment: [150, 58, 30, 58] }],
    });
  }

  // dynamometer (80x260) — hook: (42, 237)
  {
    const id = 'dynamometer';
    let coil = 'M40 48';
    for (let y = 48; y < 146; y += 12) coil += ` L32 ${y + 4} L48 ${y + 9} L40 ${y + 12}`;
    const body = `<path d="M40 28 V14 A8 8 0 1 1 28 20" fill="none" stroke="${C.stroke}" stroke-width="3.2" stroke-linecap="round"/>
      <rect x="16" y="28" width="48" height="164" rx="11" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.4"/>
      <rect x="24" y="40" width="32" height="140" rx="5" fill="${C.glassTop}" stroke="${C.inner}" stroke-width="1.6"/>
      <path d="${coil}" fill="none" stroke="${C.inner}" stroke-width="1.8" stroke-linejoin="round"/>
      <rect x="26" y="144" width="28" height="5.5" rx="1.5" fill="${C.red}" stroke="${C.stroke}" stroke-width="1.3"/>
      ${S.gradTicks(56, 56, 166, 11, 2, 5, { dir: -1 })}
      <path d="M40 192 V216 C52 216 54 232 42 237" fill="none" stroke="${C.stroke}" stroke-width="3.2" stroke-linecap="round"/>`;
    register(id, '测力计', '测量', {
      width: 80,
      height: 260,
      svg: body,
      search: 'dynamometer spring balance 测力计 弹簧测力计 牛顿计',
      ports: [{ id: 'hook', x: 42, y: 237, dx: 0, dy: 1, type: 'hook', diameter: 0 }],
    });
  }

  // multimeter (180x150) — positive: (42,116), negative: (138,116)
  {
    const id = 'multimeter';
    const body = `<rect x="22" y="7" width="136" height="136" rx="12" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.4"/>` +
      S.chassis(id, 27, 12, 126, 126, { rx: 8, feet: false, accentBar: false }) +
      S.oledScreen(
        id,
        35,
        20,
        110,
        38,
        S.screenText(90, 44, '0.000 V', 15.5, C.stroke) + S.screenText(41, 31, 'DC', 7.5, C.teal, 'start')
      ) +
      S.rotaryKnob(id, 90, 92, 23, -35, { teal: true, ticks: 11 }) +
      S.bindingPost(42, 116, C.red, 'VΩ', -11, 7.2) +
      S.bindingPost(138, 116, C.inner, 'COM', -11, 7.2);
    register(id, '万用表', '电学', {
      width: 180,
      height: 150,
      svg: body,
      search: 'multimeter 数字万用表 万用表 电表',
      ports: [
        { id: 'positive', x: 42, y: 116, dx: 0, dy: 1, type: 'wire', diameter: 0 },
        { id: 'negative', x: 138, y: 116, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      ],
    });
  }

  // microscope (200x170) — base:(100,159), surface:(82.5,101, seg:[28,101,137,101])
  {
    const id = 'microscope';
    const base = `<path d="M26 159 H174 L170 144 H30 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round"/>
      <ellipse cx="82" cy="130" rx="22" ry="7.5" fill="${C.coolant}" stroke="${C.stroke}" stroke-width="2.0"/>
      <path d="M60 130 Q82 140 104 130" fill="none" stroke="${C.inner}" stroke-width="1.8"/>`;
    const arm = `<path d="M148 144 V72 C148 34 122 18 88 20 L80 38 C108 36 128 50 128 80 V144 Z" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.3" stroke-linejoin="round"/>
      ${S.rotaryKnob(id, 138, 116, 12, 18, { teal: true })}`;
    const stage = `<rect x="28" y="101" width="109" height="7" rx="2" fill="${C.inner}" stroke="${C.stroke}" stroke-width="2.1"/>
      <rect x="64" y="108" width="36" height="6" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.6"/>
      <line x1="60" y1="98" x2="105" y2="98" stroke="${C.chassisBot}" stroke-width="2.2" stroke-linecap="round"/>`;
    const head = `<g transform="translate(80, 44) rotate(24)">
        <rect x="-10" y="-36" width="20" height="58" rx="3" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2"/>
        <rect x="-8" y="-44" width="16" height="8" rx="2" fill="${C.inner}" stroke="${C.stroke}" stroke-width="1.8"/>
        <ellipse cx="0" cy="22" rx="14" ry="5" fill="${C.inner}" stroke="${C.stroke}" stroke-width="1.8"/>
        <rect x="-11" y="25" width="9" height="16" rx="2" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.8"/>
        <rect x="2" y="25" width="9" height="13" rx="2" transform="rotate(-18 6 25)" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.7"/>
      </g>`;
    register(id, '显微镜', '设备', {
      width: 200,
      height: 170,
      svg: `${base}\n  ${arm}\n  ${stage}\n  ${head}`,
      search: 'microscope 显微镜 光学显微镜 生物显微镜',
      ports: [basePort(100, 159), surfacePort('surface', 28, 101, 137, 101)],
    });
  }

  // calibration-weights [NEW] (120x150) — base:(60,138), hook:(60,20)
  {
    const id = 'calibration-weights';
    const body = `<circle cx="60" cy="20" r="4.5" fill="none" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="50" y="23" width="20" height="11" rx="4" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="46" y="34" width="28" height="9" rx="3" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.2"/>
      <path d="M30 56 C30 46 38 43 60 43 C82 43 90 46 90 56 V132 Q90 138 82 138 H38 Q30 138 30 132 Z" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round"/>
      <rect x="30" y="128" width="60" height="8" rx="2" fill="${C.brassDark}" stroke="none"/>
      <ellipse cx="60" cy="48" rx="26" ry="4" fill="${C.brassLight}" stroke="none"/>
      <line x1="38" y1="62" x2="38" y2="122" stroke="${C.brassLight}" stroke-width="2.2" stroke-linecap="round"/>
      ${S.labelText(60, 96, '100 g', 13, C.stroke)}`;
    register(id, '砝码', '测量', {
      width: 120,
      height: 150,
      svg: body,
      search: 'calibration weight brass weight 砝码 托盘天平砝码 金属砝码',
      ports: [basePort(60, 138), { id: 'hook', x: 60, y: 20, dx: 0, dy: -1, type: 'hook', diameter: 0 }],
    });
  }
};
