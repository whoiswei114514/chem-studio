'use strict';

const S = require('./svg-style.cjs');
const { C, r } = S;

/**
 * Registers all 84 thermal, ceramic, support, clamp, safety, lab-tool,
 * measurement, and unique hardware (`studio:*`) items in the Round 5 Chemix
 * Neutral Charcoal (`#333333`) & 2D Orthographic Side-Elevation House Style.
 * Zero gradients, zero url(#...), zero teal-navy lines, pale `#E6EEF2` LCDs.
 */
module.exports = function registerEquipment(register) {
  const glassSw = C.glassSw || 4.0;
  const outerSw = C.outerSw || 2.8;
  const innerSw = C.innerSw || 1.8;

  const strokeLine = (x1, y1, x2, y2, sw = innerSw, col = C.stroke, extra = '') =>
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

  const flamePaths = (cx, yTop, yBot, outerW, innerW) => {
    const h = yBot - yTop;
    const outer = `M${r(cx)} ${r(yTop)} C${r(cx + outerW * 0.68)} ${r(yTop + h * 0.34)} ${r(cx + outerW)} ${r(yBot - h * 0.12)} ${r(cx)} ${r(yBot)} C${r(cx - outerW)} ${r(yBot - h * 0.12)} ${r(cx - outerW * 0.68)} ${r(yTop + h * 0.34)} ${r(cx)} ${r(yTop)} Z`;
    const core = `M${r(cx)} ${r(yTop + h * 0.38)} C${r(cx + innerW)} ${r(yTop + h * 0.6)} ${r(cx + innerW)} ${r(yBot - h * 0.08)} ${r(cx)} ${r(yBot)} C${r(cx - innerW)} ${r(yBot - h * 0.08)} ${r(cx - innerW)} ${r(yTop + h * 0.6)} ${r(cx)} ${r(yTop + h * 0.38)} Z`;
    return { outer, core };
  };

  const bossHead = (x, y, h = 18) => {
    const cy = y + h / 2;
    return `<rect x="${r(x)}" y="${r(y)}" width="15" height="${r(h)}" rx="2.5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="${outerSw}"/>` +
      `<rect x="${r(x - 7)}" y="${r(cy - 2.5)}" width="7" height="5" rx="1.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.6"/>` +
      `<line x1="${r(x - 6)}" y1="${r(cy - 6)}" x2="${r(x - 6)}" y2="${r(cy + 6)}" stroke="${C.stroke}" stroke-width="2.6" stroke-linecap="round"/>`;
  };

  // =========================================================================
  // 1. THERMAL, HEATING & BATHS (2D Orthographic Side-Elevation & Open Rims)
  // =========================================================================

  // bunsen (92x216) — gas: (88, 184, d=10), surface: (46, 66)
  {
    const id = 'bunsen';
    const cx = 46;
    const { outer, core } = flamePaths(cx, 10, 66, 11.5, 5.2);
    const flame = `<path d="${outer}" fill="${C.flameBlue}" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>
      <path d="${core}" fill="${C.flameCore}" stroke="none"/>`;
    const gasPipe = `<path d="M52 179.5 H75 L78 178 L81 180 L84 178 L88 179 V189 L84 190 L81 188 L78 190 L75 188.5 H52 Z" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const base = `<path d="M14 205 C14 194 26 190 46 190 C66 190 78 194 78 205 L81 211 H11 Z" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="${outerSw}" stroke-linejoin="round"/>
      <rect x="9" y="209" width="74" height="5" rx="2" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="35" y="182" width="22" height="10" rx="2" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="2.0"/>`;
    const collar = `<rect x="37" y="158" width="18" height="20" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2"/>
      <ellipse cx="${cx}" cy="168" rx="4" ry="5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.5"/>`;
    const chimney = `<rect x="40" y="66" width="12" height="94" rx="1.5" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="${outerSw}"/>
      <line x1="43" y1="74" x2="43" y2="152" stroke="${C.chassisTop}" stroke-width="1.8" stroke-linecap="round"/>
      <rect x="38" y="66" width="16" height="5" rx="1.5" fill="${C.brass}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    register(id, '本生灯', '加热', {
      width: 92,
      height: 216,
      svg: `${flame}\n  ${gasPipe}\n  ${base}\n  ${chimney}\n  ${collar}`,
      search: 'bunsen burner 本生灯 煤气灯 燃气加热器 可调风门高温火焰',
      ports: [
        { id: 'gas', x: 88, y: 184, dx: 1, dy: 0, type: 'tube', diameter: 10 },
        { id: 'surface', x: 46, y: 66, dx: 0, dy: -1, type: 'surface', diameter: 0 },
      ],
    });
  }

  // flame (80x160) — clean tall orthographic amber/sky-core flame
  {
    const id = 'flame';
    const cx = 40;
    const body = `<path d="M${cx} 8 C${cx + 18} 44 ${cx + 30} 86 ${cx + 28} 120 C${cx + 25} 142 ${cx + 13} 152 ${cx} 152 C${cx - 13} 152 ${cx - 25} 142 ${cx - 28} 120 C${cx - 30} 86 ${cx - 18} 44 ${cx} 8 Z" fill="${C.amber}" stroke="${C.stroke}" stroke-width="${outerSw}" stroke-linejoin="round"/>
      <path d="M${cx} 58 C${cx + 11} 88 ${cx + 15} 124 ${cx + 10} 142 C${cx + 5} 149 ${cx - 5} 149 ${cx - 10} 142 C${cx - 15} 124 ${cx - 11} 88 ${cx} 58 Z" fill="${C.coolant}" stroke="${C.stroke}" stroke-width="1.8" stroke-linejoin="round"/>`;
    register(id, '火焰', '加热', {
      width: 80,
      height: 160,
      svg: body,
      search: 'flame 火焰 加热焰 外焰 内焰 焰心',
      ports: [],
    });
  }

  // hot-plate (196x48) — surface: (98, 6)
  {
    const id = 'hot-plate';
    const plate = `<rect x="14" y="6" width="168" height="7" rx="2.5" fill="${C.porcelainTop}" stroke="${C.stroke}" stroke-width="2.4"/>
      <rect x="28" y="13" width="140" height="3.5" fill="${C.metalDark}" stroke="none"/>`;
    const chassis = S.chassis(id, 10, 16, 176, 25, { rx: 5, footW: 16, footH: 4, footInset: 18 });
    const controls = `<rect x="22" y="22" width="44" height="14" rx="2.5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.4"/>
      <rect x="24.5" y="24.5" width="39" height="9" rx="1.5" fill="${C.lcdBg}" stroke="none"/>
      ${S.screenText(44, 31.8, '180°C', 7.5, C.lcdText)}
      <circle cx="84" cy="29" r="3.5" fill="${C.crimson}" stroke="${C.stroke}" stroke-width="1.4"/>
      ${S.rotaryKnob(id, 154, 29, 8.5, 35, { dark: true })}
      <rect x="114" y="24" width="16" height="10" rx="2" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="1.4"/>`;
    register(id, '加热板', '加热', {
      width: 196,
      height: 48,
      svg: `${chassis}\n  ${plate}\n  ${controls}`,
      search: 'hot plate 加热板 电热板 恒温加热台',
      ports: [{ id: 'surface', x: 98, y: 6, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // magnetic-stirrer-heater (184x82) — surface: (92, 8)
  {
    const id = 'magnetic-stirrer-heater';
    const plate = `<rect x="16" y="8" width="152" height="9" rx="3" fill="${C.porcelainTop}" stroke="${C.stroke}" stroke-width="2.4"/>
      <rect x="28" y="17" width="128" height="4" fill="${C.metalDark}" stroke="none"/>`;
    const body = S.chassis(id, 12, 20, 160, 54, { rx: 6, footW: 16, footH: 5, footInset: 18 });
    const oled = S.oledScreen(
      id,
      20,
      30,
      68,
      34,
      S.screenText(54, 44.5, '350 rpm', 8.0, C.lcdText) +
        S.screenText(54, 56.5, '80.0 °C', 8.0, C.traceBlue)
    );
    const k1 = S.rotaryKnob(id, 114, 47, 10.5, -30, { ticks: 5 });
    const k2 = S.rotaryKnob(id, 148, 47, 10.5, 40, { dark: true, ticks: 5 });
    register(id, '磁力加热搅拌器', '加热', {
      width: 184,
      height: 82,
      svg: `${body}\n  ${plate}\n  ${oled}\n  ${k1}\n  ${k2}`,
      search: 'magnetic stirrer heater 磁力加热搅拌器 磁力搅拌恒温加热台',
      ports: [{ id: 'surface', x: 92, y: 8, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // heating-mantle (154x132) — surface: (77, 16)
  {
    const id = 'heating-mantle';
    const body = `${S.labFeet(16, 122, 122, 16, 6, 14)}
      <path d="M14 20 H140 L134 118 Q134 123 128 123 H26 Q20 123 20 118 Z" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="${outerSw}" stroke-linejoin="round"/>
      <rect x="12" y="14" width="130" height="9" rx="3" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2"/>
      <line x1="28" y1="16" x2="126" y2="16" stroke="${C.darkPanel}" stroke-width="2.5" stroke-linecap="round"/>
      <rect x="26" y="76" width="102" height="40" rx="5" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.2"/>
      ${S.oledScreen(id, 33, 84, 46, 24, S.screenText(56, 99.5, '150°C', 8.0, C.lcdText))}
      ${S.rotaryKnob(id, 108, 96, 10, 20, { dark: true, ticks: 5 })}
      <circle cx="88" cy="96" r="3.4" fill="${C.amber}" stroke="${C.stroke}" stroke-width="1.3"/>`;
    register(id, '电热套', '加热', {
      width: 154,
      height: 132,
      svg: body,
      search: 'heating mantle 电热套 调温电热套 圆底烧瓶加热套',
      ports: [{ id: 'surface', x: 77, y: 16, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // sand-bath (200x84) — surface: (100, 26)
  // Pure 2D open cross-section sand trough
  {
    const id = 'sand-bath';
    const sandDots = [
      [26, 32], [44, 30], [62, 34], [80, 29], [98, 33], [116, 30], [134, 34], [152, 30], [170, 33],
      [34, 40], [54, 42], [74, 39], [94, 43], [114, 40], [134, 42], [154, 39], [168, 42],
    ]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="${C.corkDark}" stroke="none"/>`)
      .join('');
    const body = `<rect x="14" y="26" width="172" height="32" fill="${C.corkLight}" stroke="none"/>
      <path d="M14 26 Q100 29 186 26" fill="none" stroke="${C.corkDark}" stroke-width="1.5" stroke-linecap="round"/>
      ${sandDots}
      <path d="M8 10 L14 14 V56 H186 V14 L192 10" fill="none" stroke="${C.stroke}" stroke-width="${outerSw}" stroke-linecap="round" stroke-linejoin="round"/>
      ${S.chassis(id, 12, 51, 176, 26, { rx: 4, footW: 16, footH: 4, footInset: 18 })}
      ${S.oledScreen(id, 24, 55, 58, 18, S.screenText(53, 67, '220°C', 7.8, C.lcdText))}
      ${S.rotaryKnob(id, 160, 64, 7.5, 30, { dark: true })}
      <circle cx="136" cy="64" r="3" fill="${C.crimson}" stroke="${C.stroke}" stroke-width="1.2"/>`;
    register(id, '砂浴', '加热', {
      width: 200,
      height: 84,
      svg: body,
      search: 'sand bath 砂浴 高温砂浴锅 均匀加热',
      ports: [{ id: 'surface', x: 100, y: 26, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // kettle (160x182) — base: (75, 174)
  {
    const id = 'kettle';
    const handle = `<path d="M112 52 H140 Q150 52 150 66 V132 Q150 144 136 144 H122" fill="none" stroke="${C.stroke}" stroke-width="9.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M112 52 H140 Q150 52 150 66 V132 Q150 144 136 144 H122" fill="none" stroke="${C.darkPanel}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    const spout = `<path d="M36 72 L12 42 L19 39 L40 50 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="${outerSw}" stroke-linejoin="round"/>`;
    const body = `<path d="M38 38 H110 L126 160 Q126 167 116 167 H32 Q22 167 22 160 Z" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="${outerSw}" stroke-linejoin="round"/>
      <path d="M40 42 L29 158 H36 L47 42 Z" fill="${C.chassisTop}" stroke="none"/>
      <rect x="20" y="166" width="110" height="8" rx="3" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="2.2"/>
      <path d="M38 38 C40 26 108 26 110 38 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.4"/>
      <rect x="62" y="20" width="24" height="7" rx="3" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="94" y="60" width="11" height="82" rx="3" fill="${C.glassTop}" stroke="${C.inner}" stroke-width="1.6"/>
      <rect x="96" y="92" width="7" height="48" rx="2" fill="${C.liquid}" stroke="none"/>
      ${S.gradTicks(103, 68, 134, 4, 2, 4, { dir: -1 })}`;
    register(id, '水壶', '加热', {
      width: 160,
      height: 182,
      svg: `${handle}\n  ${spout}\n  ${body}`,
      search: 'kettle 电水壶 烧水壶 实验室热水壶',
      ports: [basePort(75, 174)],
    });
  }

  // ice-bath (180x112) — mouth: (90, 14, d=156, edge:[12,14,168,14]), base: (90, 108)
  // Pure 2D open cross-section ice cooling trough with #333333 open rim walls
  {
    const id = 'ice-bath';
    const glassBody = `<path d="M12 14 L22 22 V98 Q22 106 30 106 H150 Q158 106 158 98 V22 L168 14 Z" fill="${C.glassTop}" stroke="none"/>`;
    const bathFluid = `<path d="M22 44 H158 V98 Q158 105 150 105 H30 Q22 105 22 98 Z" fill="${C.coolantLight}" stroke="none"/>
      <line x1="23" y1="44" x2="157" y2="44" stroke="${C.liquidLine}" stroke-width="1.8" stroke-linecap="round"/>`;
    const cubes = [
      [42, 62, 22, -12], [68, 56, 22, 14], [96, 62, 23, -8], [124, 58, 22, 12], [142, 66, 20, -16],
      [48, 86, 22, 8], [78, 84, 23, -15], [108, 86, 22, 10], [136, 86, 21, -7],
    ]
      .map(
        ([x, y, s, deg]) =>
          `<g transform="translate(${x},${y}) rotate(${deg})"><rect x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}" rx="4" fill="${C.glass}" stroke="${C.stroke}" stroke-width="1.8"/><line x1="${-s / 4}" y1="${-s / 3}" x2="${s / 4}" y2="${-s / 3}" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/></g>`
      )
      .join('\n  ');
    const wall = `<path d="M12 14 L22 22 V98 Q22 106 30 106 H150 Q158 106 158 98 V22 L168 14" fill="none" stroke="${C.stroke}" stroke-width="${glassSw}" stroke-linecap="round" stroke-linejoin="round"/>`;
    register(id, '冰浴', '容器', {
      width: 180,
      height: 112,
      svg: `${glassBody}\n  ${bathFluid}\n  ${cubes}\n  ${wall}`,
      search: 'ice bath 冰浴 冰水浴槽 低温冷却槽',
      ports: [
        {
          id: 'mouth',
          x: 90,
          y: 14,
          dx: 0,
          dy: -1,
          type: 'mouth',
          diameter: 156,
          depth: 20,
          target: [90, 76],
          edge: [12, 14, 168, 14],
        },
        basePort(90, 108),
      ],
    });
  }

  // water-bath (210x88) — mouth: (83, 14, d=142, edge:[12,14,154,14]), base: (105, 84)
  // Pure 2D open cross-section laboratory thermostatic bath + side digital controller
  {
    const id = 'water-bath';
    const water = `<rect x="20" y="28" width="126" height="48" fill="${C.liquid}" stroke="none"/>
      <path d="M21 28 Q52 31 83 28 Q114 25 145 28" fill="none" stroke="${C.liquidLine}" stroke-width="1.8" stroke-linecap="round"/>`;
    const tank = `<path d="M12 14 H20 V74 H146 V14 H154 V80 H12 Z" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="${outerSw}" stroke-linejoin="round"/>`;
    const sideCtrl = S.chassis(id, 154, 28, 50, 52, { rx: 4, feet: false }) +
      S.oledScreen(id, 158, 34, 42, 24, S.screenText(179, 49, '37°C', 7.8, C.lcdText)) +
      `<circle cx="171" cy="68" r="3.2" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="1.2"/>` +
      `<circle cx="187" cy="68" r="3.2" fill="${C.crimson}" stroke="${C.stroke}" stroke-width="1.2"/>`;
    register(id, '水浴锅', '容器', {
      width: 210,
      height: 88,
      svg: `${water}\n  ${tank}\n  ${sideCtrl}`,
      search: 'water bath thermostatic bath 水浴锅 恒温水浴锅 恒温加热水浴槽',
      ports: [
        {
          id: 'mouth',
          x: 83,
          y: 14,
          dx: 0,
          dy: -1,
          type: 'mouth',
          diameter: 142,
          depth: 18,
          target: [83, 62],
          edge: [12, 14, 154, 14],
        },
        basePort(105, 84),
      ],
    });
  }

  // oven (154x170) — base: (77,167), surface: (77, 98, seg:[32,98,122,98])
  {
    const id = 'oven';
    const body = S.chassis(id, 8, 8, 138, 154, { rx: 6, footW: 16, footH: 5, footInset: 16 });
    const chamber = `<rect x="20" y="20" width="114" height="106" rx="4" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="27" y="28" width="100" height="90" rx="3" fill="${C.glass}" stroke="${C.inner}" stroke-width="1.8"/>
      <line x1="31" y1="64" x2="123" y2="64" stroke="${C.inner}" stroke-width="2.0" stroke-linecap="round"/>
      <line x1="31" y1="98" x2="123" y2="98" stroke="${C.stroke}" stroke-width="2.4" stroke-linecap="round"/>
      <rect x="128" y="60" width="4" height="28" rx="1.5" fill="${C.metalDark}" stroke="${C.stroke}" stroke-width="1.4"/>`;
    const panel = `<rect x="20" y="132" width="114" height="23" rx="3" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="26" y="136" width="42" height="15" rx="2" fill="${C.lcdBg}" stroke="${C.stroke}" stroke-width="1.3"/>
      ${S.screenText(47, 146.5, '105°C', 7.8, C.lcdText)}
      ${S.rotaryKnob(id, 92, 143.5, 7, 25, { dark: true })}
      <rect x="114" y="138" width="12" height="11" rx="2" fill="${C.crimson}" stroke="${C.stroke}" stroke-width="1.4"/>`;
    register(id, '烘箱', '加热', {
      width: 154,
      height: 170,
      svg: `${body}\n  ${chamber}\n  ${panel}`,
      search: 'drying oven 烘箱 干燥箱 恒温干燥箱',
      ports: [basePort(77, 167), surfacePort('surface', 32, 98, 122, 98)],
    });
  }

  // magnetic-stir-bar (130x38) — contents: (65, 19)
  {
    const id = 'magnetic-stir-bar';
    const bar = `<rect x="10" y="7" width="110" height="24" rx="11" fill="${C.ptfe}" stroke="${C.stroke}" stroke-width="2.6"/>
      <line x1="22" y1="12" x2="108" y2="12" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>
      <rect x="60" y="5" width="10" height="28" rx="3" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    register(id, '磁力搅拌子', '实验小工具', {
      width: 130,
      height: 38,
      svg: bar,
      search: 'magnetic stir bar 磁力搅拌子 PTFE聚四氟乙烯搅拌磁子',
      ports: [{ id: 'contents', x: 65, y: 19, dx: 0, dy: 1, type: 'contents', diameter: 0 }],
    });
  }

  // stirbar2 (110x54) — contents: (55, 27)
  {
    const id = 'stirbar2';
    const bar = `<ellipse cx="55" cy="27" rx="46" ry="18" fill="${C.ptfe}" stroke="${C.stroke}" stroke-width="2.6"/>
      <path d="M24 18 Q55 13 86 18" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M55 9 C59 18 59 36 55 45" fill="none" stroke="${C.muted}" stroke-width="1.5"/>`;
    register(id, '椭圆搅拌子', '实验小工具', {
      width: 110,
      height: 54,
      svg: bar,
      search: 'oval stir bar 椭圆搅拌子 橄榄型磁力搅拌子',
      ports: [{ id: 'contents', x: 55, y: 27, dx: 0, dy: 1, type: 'contents', diameter: 0 }],
    });
  }

  // wire-gauze (168x32) — surface: (84, 10)
  // Pure 2D side-elevation wavy wire mesh strip
  {
    const id = 'wire-gauze';
    let wave = 'M10 16';
    for (let x = 10; x < 158; x += 12) {
      wave += ` Q${x + 3} 10 ${x + 6} 16 Q${x + 9} 22 ${x + 12} 16`;
    }
    const body = `<rect x="52" y="11" width="64" height="10" rx="3" fill="${C.porcelainMid}" stroke="${C.inner}" stroke-width="1.6"/>
      <path d="${wave}" fill="none" stroke="${C.stroke}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="6" y="13" width="6" height="6" rx="1.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="156" y="13" width="6" height="6" rx="1.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    register(id, '金属纱网', '实验小工具', {
      width: 168,
      height: 32,
      svg: body,
      search: 'wire gauze 石棉网 金属纱网 陶土网 加热隔热网',
      ports: [{ id: 'surface', x: 84, y: 10, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // clay-triangle (176x24) — surface: (88, 6)
  // Pure 2D side-elevation pipe-clay triangle bar
  {
    const id = 'clay-triangle';
    const body = `<line x1="8" y1="12" x2="168" y2="12" stroke="${C.stroke}" stroke-width="3.0" stroke-linecap="round"/>
      <rect x="50" y="6" width="76" height="12" rx="4" fill="${C.porcelainMid}" stroke="${C.stroke}" stroke-width="2.4"/>
      <line x1="60" y1="9.5" x2="116" y2="9.5" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/>`;
    register(id, '泥三角', '实验小工具', {
      width: 176,
      height: 24,
      svg: body,
      search: 'clay triangle pipe clay triangle 泥三角 坩埚架 灼烧支撑',
      ports: [{ id: 'surface', x: 88, y: 6, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // tripod (136x200) — surface: (68, 12)
  // Pure 2D orthographic side-view stand
  {
    const id = 'tripod';
    const body = `<path d="M22 19 L14 192 H21 L29 19 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M114 19 L122 192 H115 L107 19 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round"/>
      <rect x="65" y="19" width="6" height="173" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="10" y="12" width="116" height="8" rx="3" fill="${C.metalDark}" stroke="${C.stroke}" stroke-width="${outerSw}"/>
      <rect x="12" y="189" width="11" height="5" rx="1.5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.5"/>
      <rect x="62.5" y="189" width="11" height="5" rx="1.5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.5"/>
      <rect x="113" y="189" width="11" height="5" rx="1.5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.5"/>`;
    register(id, '三脚架', '支撑与夹持', {
      width: 136,
      height: 200,
      svg: body,
      search: 'tripod 三脚架 加热铁三脚架 酒精灯支撑架',
      ports: [{ id: 'surface', x: 68, y: 12, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // crucible (90x94) — mouth: (45, 12, d=70, edge:[10,12,80,12])
  // Bold unsealed open porcelain vessel
  {
    const id = 'crucible';
    const fill = `<path d="M10 12 L15 20 L22 76 Q25 85 45 85 Q65 85 68 76 L75 20 L80 12 Z" fill="${C.porcelainMid}" stroke="none"/>`;
    const shade = `<path d="M17 22 Q45 26 73 22" fill="none" stroke="${C.tick}" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M22 30 L27 72" fill="none" stroke="#FFFFFF" stroke-width="2.0" stroke-linecap="round"/>`;
    const wall = `<path d="M10 12 L15 20 L22 76 Q25 85 45 85 Q65 85 68 76 L75 20 L80 12" fill="none" stroke="${C.stroke}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    register(id, '坩埚', '陶瓷', {
      width: 90,
      height: 94,
      svg: `${fill}\n  ${shade}\n  ${wall}`,
      search: 'crucible 坩埚 瓷坩埚 灼烧容器 高温灰化',
      ports: [{ id: 'mouth', x: 45, y: 12, dx: 0, dy: -1, type: 'mouth', diameter: 70, depth: 20, target: [45, 72], edge: [10, 12, 80, 12] }],
    });
  }

  // crucible-cover (100x36) — lid: (50, 29, d=84)
  {
    const id = 'crucible-cover';
    const cover = `<path d="M42 15 C42 7 58 7 58 15" fill="none" stroke="${C.stroke}" stroke-width="3.0" stroke-linecap="round"/>
      <path d="M8 29 Q50 8 92 29 Z" fill="${C.porcelainMid}" stroke="${C.stroke}" stroke-width="${outerSw}" stroke-linejoin="round"/>
      <rect x="8" y="25" width="84" height="5" rx="2" fill="${C.porcelainTop}" stroke="${C.stroke}" stroke-width="2.2"/>`;
    register(id, '坩埚盖', '陶瓷', {
      width: 100,
      height: 36,
      svg: cover,
      search: 'crucible cover lid 坩埚盖 瓷坩埚盖',
      ports: [{ id: 'lid', x: 50, y: 29, dx: 0, dy: 1, type: 'lid', diameter: 84 }],
    });
  }

  // evaporating-dish (130x66) — base: (65, 56)
  // Unsealed open flared porcelain dish
  {
    const id = 'evaporating-dish';
    const fill = `<path d="M10 14 L18 22 C24 44 36 56 48 56 H82 C94 56 106 44 112 22 L120 14 Z" fill="${C.porcelainMid}" stroke="none"/>`;
    const shade = `<path d="M20 22 Q65 27 110 22" fill="none" stroke="${C.tick}" stroke-width="1.3" stroke-linecap="round"/>
      <path d="M46 56 H84" fill="none" stroke="${C.stroke}" stroke-width="2.8" stroke-linecap="round"/>`;
    const wall = `<path d="M10 14 L18 22 C24 44 36 56 48 56 H82 C94 56 106 44 112 22 L120 14" fill="none" stroke="${C.stroke}" stroke-width="3.0" stroke-linecap="round" stroke-linejoin="round"/>`;
    register(id, '蒸发皿', '容器', {
      width: 130,
      height: 66,
      svg: `${fill}\n  ${shade}\n  ${wall}`,
      search: 'evaporating dish 蒸发皿 瓷蒸发皿 浓缩结晶',
      ports: [basePort(65, 56)],
    });
  }

  // mortar (148x76) — mouth: (74, 14, d=124, edge:[12,14,136,14])
  // Unsealed open heavy porcelain mortar with pedestal ring foot
  {
    const id = 'mortar';
    const fill = `<path d="M12 14 L20 24 C25 50 40 60 50 62 V68 H98 V62 C108 60 123 50 128 24 L136 14 Z" fill="${C.porcelainMid}" stroke="none"/>`;
    const detail = `<path d="M22 22 Q74 29 126 22" fill="none" stroke="${C.tick}" stroke-width="1.4" stroke-linecap="round"/>
      <line x1="50" y1="62" x2="98" y2="62" stroke="${C.inner}" stroke-width="1.6"/>`;
    const wall = `<path d="M12 14 L20 24 C25 50 40 60 50 62 V68 H98 V62 C108 60 123 50 128 24 L136 14" fill="none" stroke="${C.stroke}" stroke-width="3.0" stroke-linecap="round" stroke-linejoin="round"/>`;
    register(id, '研钵', '陶瓷', {
      width: 148,
      height: 76,
      svg: `${fill}\n  ${detail}\n  ${wall}`,
      search: 'mortar 研钵 瓷研钵 研磨固体',
      ports: [{ id: 'mouth', x: 74, y: 14, dx: 0, dy: -1, type: 'mouth', diameter: 124, depth: 20, target: [74, 52], edge: [12, 14, 136, 14] }],
    });
  }

  // pestle (136x88) — probe: (114, 64, d=14, seg:[24,18,112,62])
  {
    const id = 'pestle';
    const body = `<g transform="translate(68, 44) rotate(24)">
        <path d="M-54 -6 C-62 -6 -62 6 -54 6 L20 11 C38 17 58 15 58 0 C58 -15 38 -17 20 -11 Z" fill="${C.porcelainMid}" stroke="${C.stroke}" stroke-width="${outerSw}" stroke-linejoin="round"/>
        <path d="M-48 -2 L22 -7" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>
      </g>`;
    register(id, '研杵', '实验小工具', {
      width: 136,
      height: 88,
      svg: body,
      search: 'pestle 研杵 研棒 研磨棒',
      ports: [{ id: 'probe', x: 114, y: 64, dx: 0.91, dy: 0.41, type: 'probe', diameter: 14, segment: [24, 24, 110, 62] }],
    });
  }

  // spotting-tile (148x118) — 9 well ports
  {
    const id = 'spotting-tile';
    const plate = `<rect x="10" y="10" width="128" height="98" rx="6" fill="${C.porcelainMid}" stroke="${C.stroke}" stroke-width="${outerSw}"/>`;
    const wells = [];
    const ports = [];
    const xs = [34, 74, 114];
    const ys = [30, 59, 88];
    const oldXs = [39, 84, 129];
    const oldYs = [37, 71, 105];
    for (let rIdx = 0; rIdx < ys.length; rIdx++) {
      for (let cIdx = 0; cIdx < xs.length; cIdx++) {
        const x = xs[cIdx];
        const y = ys[rIdx];
        wells.push(
          `<circle cx="${x}" cy="${y}" r="11" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.6"/>` +
            `<circle cx="${x}" cy="${y + 1}" r="7.5" fill="${C.chassisTop}" stroke="none"/>`
        );
        ports.push({ id: `well-${oldXs[cIdx]}-${oldYs[rIdx]}`, x, y, dx: 0, dy: -1, type: 'well', diameter: 0 });
      }
    }
    register(id, '点滴板', '陶瓷', {
      width: 148,
      height: 118,
      svg: `${plate}\n  ${wells.join('\n  ')}`,
      search: 'spotting tile 点滴板 白色点滴反应板 九孔点滴板',
      ports,
    });
  }

  // weight-boat (130x54) — base: (65, 45)
  {
    const id = 'weight-boat';
    const boat = `<path d="M8 10 L20 15 L30 45 H100 L110 15 L122 10 Z" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="${outerSw}" stroke-linejoin="round"/>
      <path d="M18 16 H112" fill="none" stroke="${C.muted}" stroke-width="1.3"/>`;
    register(id, '称量舟', '容器', {
      width: 130,
      height: 54,
      svg: boat,
      search: 'weighing boat 称量舟 称量盘 塑料称量皿',
      ports: [basePort(65, 45)],
    });
  }

  // bench-mat (184x26) — surface: (92, 8) — Pure 2D side-elevation mat slab
  {
    const id = 'bench-mat';
    const mat = `<rect x="8" y="8" width="168" height="10" rx="2.5" fill="${C.corkLight}" stroke="${C.stroke}" stroke-width="2.4"/>
      <line x1="14" y1="12" x2="170" y2="12" stroke="${C.corkDark}" stroke-width="1.3" stroke-linecap="round"/>`;
    register(id, '实验台垫', '实验小工具', {
      width: 184,
      height: 26,
      svg: mat,
      search: 'bench mat 实验台垫 防火垫 隔热实验垫',
      ports: [{ id: 'surface', x: 92, y: 8, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // filter-paper (116x80) — surface: (58, 10) — Pure 2D folded filter cone
  {
    const id = 'filter-paper';
    const cone = `<path d="M12 18 L58 72 L104 18 Q58 8 12 18 Z" fill="${C.porcelainTop}" stroke="${C.stroke}" stroke-width="${outerSw}" stroke-linejoin="round"/>
      <path d="M12 18 Q58 26 104 18" fill="none" stroke="${C.inner}" stroke-width="1.6" stroke-linecap="round"/>
      <line x1="58" y1="22" x2="58" y2="70" stroke="${C.tick}" stroke-width="1.3" stroke-dasharray="3 3"/>`;
    register(id, '滤纸', '实验小工具', {
      width: 116,
      height: 80,
      svg: cone,
      search: 'filter paper 滤纸 定性滤纸 定量滤纸 圆形滤纸',
      ports: [{ id: 'surface', x: 58, y: 10, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // sieve (140x42) — surface: (70, 8) — Pure 2D side-elevation test sieve tray
  {
    const id = 'sieve';
    const body = `<rect x="10" y="8" width="120" height="26" rx="2" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="${outerSw}"/>
      <rect x="14" y="8" width="112" height="5" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="1.6"/>
      <line x1="14" y1="29" x2="126" y2="29" stroke="${C.stroke}" stroke-width="2.0" stroke-dasharray="4 3"/>`;
    register(id, '筛网', '实验小工具', {
      width: 140,
      height: 42,
      svg: body,
      search: 'sieve 筛网 分样筛 金属试验筛',
      ports: [{ id: 'surface', x: 70, y: 8, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // tlc-plate (58x184) — lane: (29, 148, seg:[13,148,45,148])
  {
    const id = 'tlc-plate';
    const plate = `<rect x="9" y="8" width="40" height="168" rx="2" fill="${C.porcelainTop}" stroke="${C.stroke}" stroke-width="${outerSw}"/>
      <line x1="12" y1="26" x2="46" y2="26" stroke="${C.tick}" stroke-width="1.3" stroke-dasharray="3 2"/>
      <line x1="13" y1="148" x2="45" y2="148" stroke="${C.stroke}" stroke-width="1.5"/>
      <circle cx="29" cy="148" r="2" fill="${C.stroke}"/>
      <ellipse cx="22" cy="112" rx="4.5" ry="3.5" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="1.3"/>
      <ellipse cx="35" cy="70" rx="5" ry="4" fill="${C.amber}" stroke="${C.stroke}" stroke-width="1.3"/>
      <ellipse cx="26" cy="46" rx="4.5" ry="3.5" fill="${C.crimson}" stroke="${C.stroke}" stroke-width="1.3"/>`;
    register(id, '薄层色谱板', '测量与防护', {
      width: 58,
      height: 184,
      svg: plate,
      search: 'tlc plate 薄层色谱板 硅胶板 层析板',
      ports: [{ id: 'lane', x: 29, y: 148, dx: 0, dy: -1, type: 'lane', diameter: 0, segment: [13, 148, 45, 148] }],
    });
  }

  // tlc-spot (80x80) — spot: (40, 40)
  {
    const id = 'tlc-spot';
    const spot = `<circle cx="40" cy="40" r="22" fill="${C.liquid}" stroke="${C.steelBlue}" stroke-width="1.5" stroke-dasharray="3 2"/>
      <circle cx="40" cy="40" r="14" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="2.2"/>`;
    register(id, '色谱斑点', '测量与防护', {
      width: 80,
      height: 80,
      svg: spot,
      search: 'tlc spot 色谱斑点 显色斑点 层析斑点',
      ports: [{ id: 'spot', x: 40, y: 40, dx: 0, dy: 1, type: 'spot', diameter: 0 }],
    });
  }

  // vacuum-pump (184x118) — inlet: (72, 16, d=12)
  {
    const id = 'vacuum-pump';
    const inletBarb = `<path d="M67 42 V28 L65 26 L66 16 H78 L79 26 L77 28 V42 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <line x1="66" y1="21" x2="78" y2="21" stroke="${C.inner}" stroke-width="1.3"/>`;
    const housing = `${S.labFeet(16, 108, 152, 18, 6, 14)}
      <rect x="16" y="42" width="76" height="66" rx="5" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="${outerSw}"/>
      <rect x="88" y="48" width="82" height="60" rx="5" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="${outerSw}"/>`;
    const detail = `<circle cx="48" cy="75" r="20" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.0"/>
      <path d="M38 80 A12 12 0 1 1 58 80" fill="none" stroke="${C.steelBlue}" stroke-width="1.8"/>
      <line x1="48" y1="75" x2="42" y2="66" stroke="${C.crimson}" stroke-width="2.0" stroke-linecap="round"/>
      <circle cx="48" cy="75" r="2.2" fill="${C.stroke}"/>
      ${S.ventSlots(104, 60, 6, 48, 6)}
      <rect x="22" y="92" width="12" height="9" rx="1.5" fill="${C.crimson}" stroke="${C.stroke}" stroke-width="1.4"/>
      <path d="M36 42 V30 H58 V42" fill="none" stroke="${C.stroke}" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    register(id, '真空泵', '设备', {
      width: 184,
      height: 118,
      svg: `${inletBarb}\n  ${housing}\n  ${detail}`,
      search: 'vacuum pump 真空泵 隔膜真空泵 减压抽滤泵',
      ports: [{ id: 'inlet', x: 72, y: 16, dx: 0, dy: -1, type: 'tube', diameter: 12 }],
    });
  }

  // syringe-pump (180x110) — outlet: (10, 26, dx:-1, luer-male, d=8)
  {
    const id = 'syringe-pump';
    const base = S.chassis(id, 14, 46, 158, 56, { rx: 5, footW: 16, footH: 4, footInset: 16 });
    const oled = S.oledScreen(id, 24, 56, 76, 34, S.screenText(62, 76.5, '1.00 mL/h', 9.2, C.lcdText));
    const controls = S.softButton(108, 60, 22, 12, '', C.steelBlue, C.chassisTop) +
      S.softButton(134, 60, 22, 12, '', C.chassisTop, C.stroke) +
      S.rotaryKnob(id, 132, 86, 8, -15, { dark: true });
    const syringe = `<rect x="10" y="22.5" width="18" height="7" rx="1.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="28" y="14" width="80" height="24" rx="2.5" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="30" y="17" width="48" height="18" fill="${C.liquid}" stroke="none"/>
      ${S.gradTicks(40, 15, 76, 5, 2, 4, { dir: 1, vertical: false })}
      <rect x="78" y="16" width="11" height="20" rx="1.5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.6"/>
      <line x1="89" y1="26" x2="142" y2="26" stroke="${C.stroke}" stroke-width="4.5" stroke-linecap="round"/>
      <rect x="108" y="10" width="6" height="32" rx="1.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.6"/>
      <rect x="138" y="7" width="15" height="36" rx="2.5" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="2.0"/>`;
    register(id, '注射泵', '设备', {
      width: 180,
      height: 110,
      svg: `${base}\n  ${oled}\n  ${controls}\n  ${syringe}`,
      search: 'syringe pump 注射泵 微量注射泵 精密进样泵',
      ports: [{ id: 'outlet', x: 10, y: 26, dx: -1, dy: 0, type: 'luer-male', diameter: 8 }],
    });
  }

  // gas-cylinder (84x228) — outlet: (66, 20, d=10)
  {
    const id = 'gas-cylinder';
    const valve = `<rect x="35" y="15" width="14" height="16" rx="2" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="27" y="7" width="30" height="6" rx="2.5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.9"/>
      <path d="M49 15 H66 V25 H49 Z" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="28" cy="22" r="6.5" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="1.8"/>
      <line x1="28" y1="22" x2="31.5" y2="18" stroke="${C.crimson}" stroke-width="1.6" stroke-linecap="round"/>`;
    const body = `<path d="M16 216 V62 C16 40 28 31 42 31 C56 31 68 40 68 62 V216 Q68 222 62 222 H22 Q16 222 16 216 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="${outerSw}" stroke-linejoin="round"/>
      <path d="M18 58 C18 40 28 32 42 32 C56 32 66 40 66 58 Z" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="2.2"/>
      <line x1="24" y1="74" x2="24" y2="200" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round"/>
      <rect x="16" y="210" width="52" height="10" rx="2" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    register(id, '气瓶', '设备', {
      width: 84,
      height: 228,
      svg: `${valve}\n  ${body}`,
      search: 'gas cylinder 气瓶 高压钢瓶 气体钢瓶 氮气瓶 氧气瓶',
      ports: [{ id: 'outlet', x: 66, y: 20, dx: 1, dy: 0, type: 'tube', diameter: 10 }],
    });
  }

  // ring-with-gauze [NEW] (184x36) — clamp: (10,18), surface: (126,10, seg:[82,10,170,10])
  {
    const id = 'ring-with-gauze';
    let wave = 'M78 16';
    for (let x = 78; x < 174; x += 12) wave += ` Q${x + 3} 10 ${x + 6} 16 Q${x + 9} 22 ${x + 12} 16`;
    const body = `${bossHead(10, 9, 18)}
      <rect x="25" y="15" width="54" height="6" rx="1.5" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="78" y="14" width="96" height="8" rx="3" fill="${C.metalDark}" stroke="${C.stroke}" stroke-width="2.4"/>
      <rect x="96" y="11" width="60" height="8" rx="2" fill="${C.porcelainMid}" stroke="${C.inner}" stroke-width="1.4"/>
      <path d="${wave}" fill="none" stroke="${C.stroke}" stroke-width="2.4" stroke-linecap="round"/>`;
    register(id, '铁圈带石棉网', '加热', {
      width: 184,
      height: 36,
      svg: body,
      search: 'retort ring with wire gauze 铁圈带石棉网 铁架台铁圈陶土网 烧杯加热支撑',
      ports: [
        { id: 'clamp', x: 10, y: 18, dx: -1, dy: 0, type: 'clamp', diameter: 8 },
        surfacePort('surface', 82, 10, 170, 10),
      ],
    });
  }

  // combustion-spoon [NEW] (48x210) — probe: (24,196, immersible, d=18, seg:[24,36,24,190]), grip-site
  {
    const id = 'combustion-spoon';
    const cx = 24;
    const handle = `<path d="M${cx - 6} 16 A6 6 0 1 1 ${cx + 6} 16 V30 H${cx - 6} Z" fill="none" stroke="${C.stroke}" stroke-width="2.8"/>
      <rect x="11" y="28" width="26" height="7" rx="3" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="${cx - 2.2}" y="35" width="4.4" height="148" fill="${C.brass}" stroke="${C.stroke}" stroke-width="1.9"/>`;
    const cup = `<path d="M${cx - 10} 182 H${cx + 10} C${cx + 10} 197 ${cx - 10} 197 ${cx - 10} 182 Z" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <ellipse cx="${cx}" cy="182" rx="10" ry="3" fill="${C.brassLight}" stroke="${C.stroke}" stroke-width="1.6"/>`;
    register(id, '燃烧匙', '加热', {
      width: 48,
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
          diameter: 18,
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

  // retort-stand (116x268) — rail: (28, 120, d=7, seg:[28,22,28,236])
  {
    const id = 'retort-stand';
    const base = `<rect x="8" y="246" width="100" height="10" rx="2.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="${outerSw}"/>
      <rect x="8" y="254" width="100" height="4" rx="1.5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.6"/>`;
    const rod = `<rect x="21" y="238" width="14" height="8" rx="2" fill="${C.metalDark}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="24.5" y="10" width="7" height="230" rx="3" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.4"/>
      <line x1="27" y1="14" x2="27" y2="236" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round"/>`;
    register(id, '铁架台', '支撑与夹持', {
      width: 116,
      height: 268,
      svg: `${base}\n  ${rod}`,
      search: 'retort stand ring stand 铁架台 铁架底座 支撑立杆',
      ports: [{ id: 'rail', x: 28, y: 120, dx: 0, dy: -1, type: 'rail', diameter: 7, segment: [28, 22, 28, 236] }],
    });
  }

  // clamp (184x32) — clamp: (10,16, d=8), grip: (164,16, d=22)
  // Sleek horizontal 3-prong clamp with star boss knob & steel-blue jaws
  {
    const id = 'clamp';
    const body = `${bossHead(10, 7, 18)}
      <rect x="25" y="13" width="106" height="6" rx="1.5" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.0"/>
      <path d="M130 13 L144 6 H172 C176 6 176 11 172 11 H148 L134 15 Z" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M130 19 L144 26 H172 C176 26 176 21 172 21 H148 L134 17 Z" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="1.8" stroke-linejoin="round"/>
      <circle cx="131" cy="16" r="4.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.6"/>`;
    register(id, '万能夹', '支撑与夹持', {
      width: 184,
      height: 32,
      svg: body,
      search: 'clamp universal clamp 万能夹 三爪夹 烧瓶夹 冷凝管夹',
      ports: [
        { id: 'clamp', x: 10, y: 16, dx: -1, dy: 0, type: 'clamp', diameter: 8 },
        { id: 'grip', x: 164, y: 16, dx: 1, dy: 0, type: 'grip', diameter: 22 },
      ],
    });
  }

  // clamp-front (110x44) — clamp: (10,22, d=8), grip: (86,22, d=22)
  {
    const id = 'clamp-front';
    const body = `${bossHead(10, 13, 18)}
      <rect x="25" y="19" width="44" height="6" rx="1.5" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.0"/>
      <path d="M68 19 L98 10 M68 25 L98 34" fill="none" stroke="${C.stroke}" stroke-width="3.6" stroke-linecap="round"/>
      <path d="M68 19 L98 10 M68 25 L98 34" fill="none" stroke="${C.chassisMid}" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M74 6 C60 14 60 30 74 38 C77 40 81 37 78 33 C69 27 69 17 78 11 C81 7 77 4 74 6 Z" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="2.0"/>
      <path d="M98 6 C112 14 112 30 98 38 C95 40 91 37 94 33 C103 27 103 17 94 11 C91 7 95 4 98 6 Z" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="59" y="16" width="10" height="12" rx="2.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.6"/>`;
    register(id, '夹具正视图', '支撑与夹持', {
      width: 110,
      height: 44,
      svg: body,
      search: 'clamp front 夹具正视图 双爪夹 正视铁夹',
      ports: [
        { id: 'clamp', x: 10, y: 22, dx: -1, dy: 0, type: 'clamp', diameter: 8 },
        { id: 'grip', x: 86, y: 22, dx: 1, dy: 0, type: 'grip', diameter: 22 },
      ],
    });
  }

  // retort-ring (184x28) — clamp: (10,14, d=8), surface: (127,10)
  // Pure 2D side-elevation ring bar + clamp boss
  {
    const id = 'retort-ring';
    const body = `${bossHead(10, 5, 18)}
      <rect x="25" y="11" width="54" height="6" rx="1.5" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="78" y="10" width="96" height="8" rx="3" fill="${C.metalDark}" stroke="${C.stroke}" stroke-width="2.4"/>`;
    register(id, '铁圈', '支撑与夹持', {
      width: 184,
      height: 28,
      svg: body,
      search: 'retort ring 铁圈 铁环 铁架台圆环',
      ports: [
        { id: 'clamp', x: 10, y: 14, dx: -1, dy: 0, type: 'clamp', diameter: 8 },
        { id: 'surface', x: 127, y: 10, dx: 0, dy: -1, type: 'surface', diameter: 0 },
      ],
    });
  }

  // g-clamp (124x188)
  {
    const id = 'g-clamp';
    const body = `<path d="M98 16 H38 Q14 16 14 40 V120 Q14 144 38 144 H98 V124 H42 Q34 124 34 116 V44 Q34 36 42 36 H98 Z" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="${outerSw}" stroke-linejoin="round"/>
      <path d="M92 23 H40 Q23 23 23 40 V120 Q23 137 40 137 H92" fill="none" stroke="${C.steelBlue}" stroke-width="1.5"/>
      <rect x="80" y="48" width="9" height="126" rx="2" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.2"/>
      ${S.gradTicks(80, 62, 118, 6, 1, 9, { dir: 1, vertical: true })}
      <rect x="68" y="42" width="32" height="8" rx="2.5" fill="${C.brass}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="54" y="170" width="60" height="7" rx="3" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="2.0"/>`;
    register(id, 'G 形夹', '支撑与夹持', {
      width: 124,
      height: 188,
      svg: body,
      search: 'g clamp c clamp G形夹 台面固定夹',
      ports: [],
    });
  }

  // test-tube-rack (160x106) — rack-40/73/106/139 mapped cleanly into 2D open rack
  {
    const id = 'test-tube-rack';
    const xs = [36, 65, 95, 124];
    const portIds = ['rack-40', 'rack-73', 'rack-106', 'rack-139'];
    const body = `<rect x="14" y="24" width="8" height="68" fill="${C.corkMid}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="138" y="24" width="8" height="68" fill="${C.corkMid}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="8" y="18" width="144" height="12" rx="3" fill="${C.corkMid}" stroke="${C.stroke}" stroke-width="2.4"/>
      <rect x="8" y="88" width="144" height="12" rx="3" fill="${C.corkMid}" stroke="${C.stroke}" stroke-width="2.4"/>
      ${xs
        .map(
          (x) =>
            `<rect x="${x - 8}" y="18" width="16" height="5" rx="2" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="1.6"/>` +
            `<line x1="${x - 6}" y1="88" x2="${x + 6}" y2="88" stroke="${C.corkDark}" stroke-width="2.2" stroke-linecap="round"/>`
        )
        .join('')}`;
    register(id, '试管架', '支撑与夹持', {
      width: 160,
      height: 106,
      svg: body,
      search: 'test tube rack 试管架 四孔试管架 木质试管架',
      ports: xs.map((x, idx) => ({
        id: portIds[idx],
        x,
        y: 20,
        dx: 0,
        dy: -1,
        type: 'rack',
        diameter: 18,
      })),
    });
  }

  // test-tube-holder (176x48) — grip: (24, 24, d=26)
  // Pure 2D horizontal side-view spring holder
  {
    const id = 'test-tube-holder';
    const body = `<path d="M164 14 L82 14 C62 14 48 34 30 34 C14 34 12 22 18 18" fill="none" stroke="${C.stroke}" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M164 14 L82 14 C62 14 48 34 30 34 C14 34 12 22 18 18" fill="none" stroke="${C.chassisBot}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M164 34 L82 34 C62 34 48 14 30 14 C14 14 12 26 18 30" fill="none" stroke="${C.stroke}" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M164 34 L82 34 C62 34 48 14 30 14 C14 14 12 26 18 30" fill="none" stroke="${C.chassisBot}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="116" y="8" width="52" height="10" rx="3" fill="${C.corkMid}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="116" y="30" width="52" height="10" rx="3" fill="${C.corkMid}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="82" cy="24" r="5" fill="${C.brass}" stroke="${C.stroke}" stroke-width="1.6"/>`;
    register(id, '试管夹', '支撑与夹持', {
      width: 176,
      height: 48,
      svg: body,
      search: 'test tube holder 试管夹 弹簧试管钳',
      ports: [{ id: 'grip', x: 24, y: 24, dx: -1, dy: 0, type: 'grip', diameter: 26 }],
    });
  }

  // peg (160x36) — grip: (22, 18)
  {
    const id = 'peg';
    const body = `<path d="M12 14 L84 6 H148 V16 H84 L12 18 Z" fill="${C.corkMid}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M12 22 L84 30 H148 V20 H84 L12 18 Z" fill="${C.corkMid}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <circle cx="78" cy="18" r="6" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    register(id, '木夹', '支撑与夹持', {
      width: 160,
      height: 36,
      svg: body,
      search: 'peg wooden clip 木夹 弹簧木质试管夹',
      ports: [{ id: 'grip', x: 22, y: 18, dx: -1, dy: 0, type: 'grip', diameter: 0 }],
    });
  }

  // tongs (168x58) — grip: (146, 29, d=28)
  {
    const id = 'tongs';
    const body = `<ellipse cx="24" cy="15" rx="13" ry="8" fill="none" stroke="${C.stroke}" stroke-width="3.6"/>
      <ellipse cx="24" cy="43" rx="13" ry="8" fill="none" stroke="${C.stroke}" stroke-width="3.6"/>
      <path d="M36 18 L74 30 C102 39 124 44 148 39 C155 37 158 34 158 31" fill="none" stroke="${C.stroke}" stroke-width="4.6" stroke-linecap="round"/>
      <path d="M36 18 L74 30 C102 39 124 44 148 39 C155 37 158 34 158 31" fill="none" stroke="${C.chassisMid}" stroke-width="2.0" stroke-linecap="round"/>
      <path d="M36 40 L74 28 C102 19 124 14 148 19 C155 21 158 24 158 27" fill="none" stroke="${C.stroke}" stroke-width="4.6" stroke-linecap="round"/>
      <path d="M36 40 L74 28 C102 19 124 14 148 19 C155 21 158 24 158 27" fill="none" stroke="${C.chassisMid}" stroke-width="2.0" stroke-linecap="round"/>
      <circle cx="72" cy="29" r="4.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.6"/>`;
    register(id, '坩埚钳', '支撑与夹持', {
      width: 168,
      height: 58,
      svg: body,
      search: 'tongs crucible tongs 坩埚钳 不锈钢坩埚钳',
      ports: [{ id: 'grip', x: 146, y: 29, dx: 1, dy: 0, type: 'grip', diameter: 28 }],
    });
  }

  // tweezers (156x28)
  {
    const id = 'tweezers';
    const body = `<path d="M144 6 C152 6 152 22 144 22 L46 20 L8 15 V13 L46 8 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M140 10 L10 13.5 M140 18 L10 14.5" fill="none" stroke="${C.inner}" stroke-width="1.3"/>`;
    register(id, '镊子', '支撑与夹持', {
      width: 156,
      height: 28,
      svg: body,
      search: 'tweezers forceps 镊子 不锈钢镊子',
      ports: [],
    });
  }

  // fume-hood (176x176) — base: (88,168), surface: (88,144, seg:[24,144,152,144])
  {
    const id = 'fume-hood';
    const body = S.chassis(id, 10, 10, 156, 156, { rx: 5, footW: 16, footH: 4, footInset: 16 }) +
      `<rect x="66" y="4" width="44" height="7" rx="2" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="22" y="34" width="132" height="110" rx="2" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.2"/>
      ${S.ventSlots(36, 98, 3, 104, 6)}
      <rect x="22" y="34" width="132" height="50" fill="${C.glass}" stroke="${C.inner}" stroke-width="1.5"/>
      <rect x="22" y="80" width="132" height="6" rx="1.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.6"/>
      <rect x="74" y="81.5" width="28" height="3" rx="1" fill="${C.darkPanel}"/>
      <line x1="24" y1="144" x2="152" y2="144" stroke="${C.stroke}" stroke-width="2.8" stroke-linecap="round"/>
      <rect x="106" y="15" width="46" height="14" rx="2" fill="${C.lcdBg}" stroke="${C.stroke}" stroke-width="1.4"/>
      ${S.screenText(129, 24.5, '0.50 m/s', 6.8, C.lcdText)}
      <circle cx="28" cy="22" r="3.2" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="1.2"/>`;
    register(id, '通风橱', '设备', {
      width: 176,
      height: 176,
      svg: body,
      search: 'fume hood 通风橱 排风柜 化学通风柜',
      ports: [basePort(88, 168), surfacePort('surface', 24, 144, 152, 144)],
    });
  }

  // glove (130x140)
  {
    const id = 'glove';
    const body = `<path d="M40 124 L20 78 C13 62 24 54 34 66 L42 78 V28 C42 16 54 16 54 28 V58 V14 C54 4 68 4 68 14 V56 V18 C68 8 82 8 82 18 V60 V32 C82 20 96 20 96 32 V82 L112 64 C121 56 130 66 121 78 L100 124 Z" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="${outerSw}" stroke-linejoin="round"/>
      <rect x="38" y="118" width="64" height="9" rx="4" fill="${C.coolant}" stroke="${C.stroke}" stroke-width="2.0"/>`;
    register(id, '手套', '测量与防护', {
      width: 130,
      height: 140,
      svg: body,
      search: 'glove nitrile glove 手套 丁腈手套 实验防护手套',
      ports: [],
    });
  }

  // goggles (164x76)
  {
    const id = 'goggles';
    const body = `<path d="M16 14 Q82 4 148 14 L140 62 Q120 68 96 60 L82 46 L68 60 Q44 68 24 62 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="${outerSw}" stroke-linejoin="round"/>
      <path d="M24 18 Q82 10 140 18 L133 55 Q114 60 96 53 L82 39 L68 53 Q50 60 31 55 Z" fill="${C.glass}" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>
      <path d="M38 26 L50 48 M112 24 L124 46" fill="none" stroke="#FFFFFF" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M16 20 L6 28 M148 20 L158 28" fill="none" stroke="${C.darkPanel}" stroke-width="4.2" stroke-linecap="round"/>`;
    register(id, '护目镜', '测量与防护', {
      width: 164,
      height: 76,
      svg: body,
      search: 'safety goggles 护目镜 防护眼镜 实验护目镜',
      ports: [],
    });
  }

  // lab-coat (136x168)
  {
    const id = 'lab-coat';
    const body = `<path d="M50 10 L22 24 L6 96 L24 100 L34 54 V158 H102 V54 L112 100 L130 96 L114 24 L86 10 L68 38 Z" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="${outerSw}" stroke-linejoin="round"/>
      <path d="M50 10 L54 46 L68 38 M86 10 L82 46 L68 38" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.8" stroke-linejoin="round"/>
      <line x1="68" y1="38" x2="68" y2="158" stroke="${C.stroke}" stroke-width="1.8"/>
      ${[52, 74, 96, 118].map((y) => `<circle cx="72" cy="${y}" r="2.2" fill="${C.darkPanel}" stroke="none"/>`).join('')}
      <rect x="38" y="48" width="14" height="17" rx="2" fill="${C.chassisMid}" stroke="${C.inner}" stroke-width="1.4"/>
      <rect x="38" y="98" width="18" height="24" rx="2.5" fill="${C.chassisMid}" stroke="${C.inner}" stroke-width="1.4"/>
      <rect x="80" y="98" width="18" height="24" rx="2.5" fill="${C.chassisMid}" stroke="${C.inner}" stroke-width="1.4"/>`;
    register(id, '实验服', '测量与防护', {
      width: 136,
      height: 168,
      svg: body,
      search: 'lab coat 实验服 白大褂 防护服',
      ports: [],
    });
  }

  // ghs-hazard (140x140)
  {
    const id = 'ghs-hazard';
    const body = `<path d="M70 10 L130 70 L70 130 L10 70 Z" fill="#FFFFFF" stroke="${C.crimson}" stroke-width="8" stroke-linejoin="round"/>
      <rect x="65.5" y="38" width="9" height="42" rx="4.5" fill="${C.stroke}" stroke="none"/>
      <circle cx="70" cy="96" r="5" fill="${C.stroke}" stroke="none"/>`;
    register(id, '危险提示菱形', '图形与标记', {
      width: 140,
      height: 140,
      svg: body,
      search: 'ghs hazard warning diamond 危险提示菱形 化学品警示标志',
      ports: [],
    });
  }

  // table (200x40) — surface: (100, 8, seg:[6,8,194,8]) — Pure 2D sleek benchtop slab
  {
    const id = 'table';
    const body = `<rect x="18" y="18" width="10" height="16" rx="1.5" fill="${C.corkDark}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="172" y="18" width="10" height="16" rx="1.5" fill="${C.corkDark}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="6" y="8" width="188" height="11" rx="2" fill="${C.corkMid}" stroke="${C.stroke}" stroke-width="${outerSw}"/>`;
    register(id, '实验桌', '设备', {
      width: 200,
      height: 40,
      svg: body,
      search: 'lab bench table 实验桌 实验台 化学操作台',
      ports: [surfacePort('surface', 6, 8, 194, 8)],
    });
  }

  // spatula (152x90) — probe: (18, 76, dx:-1, d=10, seg:[52,76,18,76])
  // Cranked micro-spatula
  {
    const id = 'spatula';
    const body = `<path d="M138 14 L52 76 H12" fill="none" stroke="${C.stroke}" stroke-width="6.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M138 14 L52 76 H12" fill="none" stroke="${C.chassisMid}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M138 14 L108 35.5" fill="none" stroke="${C.darkPanel}" stroke-width="7.5" stroke-linecap="round"/>`;
    register(id, '药匙', '实验小工具', {
      width: 152,
      height: 90,
      svg: body,
      search: 'spatula 药匙 不锈钢药匙 取药勺',
      ports: [{ id: 'probe', x: 18, y: 76, dx: -1, dy: 0, type: 'probe', diameter: 10, segment: [52, 76, 18, 76] }],
    });
  }

  // corkborer (110x130)
  {
    const id = 'corkborer';
    const body = `<rect x="47" y="26" width="16" height="92" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.4"/>
      <line x1="51" y1="32" x2="51" y2="112" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>
      <rect x="16" y="10" width="78" height="16" rx="7" fill="${C.crimson}" stroke="${C.stroke}" stroke-width="2.4"/>`;
    register(id, '打孔器', '实验小工具', {
      width: 110,
      height: 130,
      svg: body,
      search: 'cork borer 打孔器 橡皮塞打孔器',
      ports: [],
    });
  }

  // scissors (136x116)
  {
    const id = 'scissors';
    const body = `<path d="M40 62 L124 14 L116 26 L58 64 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M54 66 L48 10 L58 18 L66 64 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <ellipse cx="28" cy="76" rx="16" ry="11" fill="none" stroke="${C.stroke}" stroke-width="6.5"/>
      <ellipse cx="28" cy="76" rx="16" ry="11" fill="none" stroke="${C.crimson}" stroke-width="3.2"/>
      <ellipse cx="80" cy="88" rx="16" ry="11" fill="none" stroke="${C.stroke}" stroke-width="6.5"/>
      <ellipse cx="80" cy="88" rx="16" ry="11" fill="none" stroke="${C.crimson}" stroke-width="3.2"/>
      <circle cx="58" cy="61" r="4.5" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    register(id, '剪刀', '实验小工具', {
      width: 136,
      height: 116,
      svg: body,
      search: 'scissors 剪刀 实验剪刀 解剖剪',
      ports: [],
    });
  }

  // magnifying-glass (100x170)
  {
    const id = 'magnifying-glass';
    const body = `<rect x="44" y="88" width="12" height="72" rx="5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="2.4"/>
      <circle cx="50" cy="50" r="40" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="${outerSw}"/>
      <circle cx="50" cy="50" r="33" fill="${C.glass}" stroke="${C.inner}" stroke-width="1.8"/>
      <path d="M30 34 A24 24 0 0 1 56 24" fill="none" stroke="#FFFFFF" stroke-width="2.8" stroke-linecap="round"/>`;
    register(id, '放大镜', '测量与防护', {
      width: 100,
      height: 170,
      svg: body,
      search: 'magnifying glass hand lens 放大镜 手持放大镜',
      ports: [],
    });
  }

  // desk-lamp (144x176) — base: (46, 166)
  {
    const id = 'desk-lamp';
    const body = `<ellipse cx="46" cy="161" rx="34" ry="7" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.4"/>
      <rect x="40" y="148" width="12" height="10" rx="2" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.8"/>
      <path d="M46 148 L24 90 L86 38" fill="none" stroke="${C.stroke}" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M46 148 L24 90 L86 38" fill="none" stroke="${C.chassisMid}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="24" cy="90" r="6" fill="${C.metalDark}" stroke="${C.stroke}" stroke-width="1.8"/>
      <path d="M72 22 C88 8 112 12 122 30 L136 66 L78 76 Z" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="${outerSw}" stroke-linejoin="round"/>
      <ellipse cx="108" cy="72" rx="22" ry="5.5" transform="rotate(-10 108 72)" fill="${C.amberLight}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    register(id, '台灯', '设备', {
      width: 144,
      height: 176,
      svg: body,
      search: 'desk lamp 台灯 实验照明灯',
      ports: [basePort(46, 166)],
    });
  }

  // desk-fan (108x176) — base: (54, 166)
  {
    const id = 'desk-fan';
    const blades = [0, 120, 240]
      .map(
        (deg) =>
          `<path d="M54 58 C47 22 76 16 70 46 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.8" transform="rotate(${deg} 54 58)"/>`
      )
      .join('');
    const body = `<rect x="49" y="106" width="10" height="52" rx="2.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2"/>
      <ellipse cx="54" cy="161" rx="34" ry="7" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.4"/>
      <circle cx="54" cy="58" r="46" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="${outerSw}"/>
      <circle cx="54" cy="58" r="40" fill="none" stroke="${C.tick}" stroke-width="1.4"/>
      ${blades}
      <circle cx="54" cy="58" r="9.5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="2.0"/>`;
    register(id, '台式风扇', '设备', {
      width: 108,
      height: 176,
      svg: body,
      search: 'desk fan 台式风扇 风扇',
      ports: [basePort(54, 166)],
    });
  }

  // computer (176x136) — base: (88, 128)
  {
    const id = 'computer';
    const body = `<rect x="81" y="96" width="14" height="22" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="54" y="118" width="68" height="6" rx="2.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="10" y="10" width="156" height="88" rx="5" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="${outerSw}"/>
      ${S.oledScreen(
        id,
        17,
        17,
        142,
        74,
        `<polyline points="26,76 48,76 60,40 70,76 92,76 104,28 114,76 150,76" fill="none" stroke="${C.traceBlue}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>` +
          `<polyline points="26,66 64,64 94,54 126,56 150,46" fill="none" stroke="${C.stroke}" stroke-width="1.4" stroke-dasharray="3 2"/>`
      )}`;
    register(id, '电脑', '设备', {
      width: 176,
      height: 136,
      svg: body,
      search: 'computer monitor workstation 电脑 工作站 数据采集仪',
      ports: [basePort(88, 128)],
    });
  }

  // camera (136x146)
  {
    const id = 'camera';
    const body = `<path d="M40 34 L50 18 H84 L94 34 Z" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <rect x="18" y="24" width="16" height="8" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="10" y="34" width="116" height="96" rx="8" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="${outerSw}"/>
      <circle cx="68" cy="84" r="32" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.4"/>
      <circle cx="68" cy="84" r="22" fill="${C.stroke}" stroke="${C.stroke}" stroke-width="1.8"/>
      <circle cx="68" cy="84" r="14" fill="${C.glass}" stroke="${C.steelBlue}" stroke-width="1.6"/>
      <circle cx="108" cy="46" r="3.8" fill="${C.crimson}" stroke="${C.stroke}" stroke-width="1.2"/>`;
    register(id, '相机', '设备', {
      width: 136,
      height: 146,
      svg: body,
      search: 'camera 相机 数码相机 实验摄影',
      ports: [],
    });
  }

  // videocamera (176x90)
  {
    const id = 'videocamera';
    const body = `<path d="M36 22 V10 H102 V22" fill="none" stroke="${C.stroke}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="12" y="22" width="114" height="58" rx="6" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="${outerSw}"/>
      <rect x="22" y="32" width="52" height="36" rx="3" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.8"/>
      <circle cx="98" cy="50" r="16" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="98" cy="50" r="9.5" fill="${C.glass}" stroke="${C.steelBlue}" stroke-width="1.5"/>
      <path d="M126 32 L164 20 V80 L126 68 Z" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round"/>
      <circle cx="114" cy="30" r="3.5" fill="${C.crimson}"/>`;
    register(id, '摄像机', '设备', {
      width: 176,
      height: 90,
      svg: body,
      search: 'videocamera camcorder 摄像机 录像机',
      ports: [],
    });
  }

  // pencil (160x30) — probe: (150, 15, d=10, seg:[134,15,24,15])
  {
    const id = 'pencil';
    const body = `<rect x="8" y="9" width="12" height="12" rx="2.5" fill="${C.crimson}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="19" y="9" width="8" height="12" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="27" y="9" width="102" height="12" fill="${C.amber}" stroke="${C.stroke}" stroke-width="2.2"/>
      <line x1="29" y1="15" x2="127" y2="15" stroke="${C.amberLight}" stroke-width="1.4"/>
      <path d="M129 9 L152 15 L129 21 Z" fill="${C.corkLight}" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>
      <path d="M144 13 L152 15 L144 17 Z" fill="${C.stroke}"/>`;
    register(id, '铅笔', '实验小工具', {
      width: 160,
      height: 30,
      svg: body,
      search: 'pencil 铅笔 绘图铅笔 色谱画线铅笔',
      ports: [{ id: 'probe', x: 150, y: 15, dx: 1, dy: 0, type: 'probe', diameter: 10, segment: [134, 15, 24, 15] }],
    });
  }

  // felt-tip-pen (160x32) — probe: (150, 16, d=10, seg:[134,16,24,16])
  {
    const id = 'felt-tip-pen';
    const body = `<rect x="8" y="8" width="22" height="16" rx="3.5" fill="${C.crimson}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="29" y="8" width="90" height="16" rx="2" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.2"/>
      <path d="M119 9 L142 13 V19 L119 23 Z" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>
      <path d="M142 13.5 L152 15 V17 L142 18.5 Z" fill="${C.crimson}" stroke="${C.stroke}" stroke-width="1.6"/>`;
    register(id, '记号笔', '实验小工具', {
      width: 160,
      height: 32,
      svg: body,
      search: 'marker felt tip pen 记号笔 玻璃记号笔 标签笔',
      ports: [{ id: 'probe', x: 150, y: 16, dx: 1, dy: 0, type: 'probe', diameter: 10, segment: [134, 16, 24, 16] }],
    });
  }

  // adhesive-tape (150x60)
  {
    const id = 'adhesive-tape';
    const body = `<path d="M10 22 H138 L132 30 L138 38 H10 L16 30 Z" fill="${C.coolantLight}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    register(id, '胶带', '实验小工具', {
      width: 150,
      height: 60,
      svg: body,
      search: 'adhesive tape 胶带 标签胶带 封口膜',
      ports: [],
    });
  }

  // paperclip (56x120)
  {
    const id = 'paperclip';
    const d = 'M14 88 V28 Q14 10 28 10 Q42 10 42 28 V94 Q42 108 28 108 Q16 108 16 94 V34 Q16 24 26 24 Q35 24 35 34 V84';
    const body = `<path d="${d}" fill="none" stroke="${C.stroke}" stroke-width="4.6" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="${C.chassisMid}" stroke-width="2.0" stroke-linecap="round"/>`;
    register(id, '回形针', '实验小工具', {
      width: 56,
      height: 120,
      svg: body,
      search: 'paperclip 回形针 金属曲别针',
      ports: [],
    });
  }

  // wooden-splint (44x168) — probe: (22, 158, d=10, seg:[22,144,22,22])
  {
    const id = 'wooden-splint';
    const body = `<rect x="16" y="10" width="12" height="148" rx="4" fill="${C.corkLight}" stroke="${C.stroke}" stroke-width="2.2"/>
      <line x1="20" y1="22" x2="20" y2="146" stroke="${C.corkDark}" stroke-width="1.1"/>`;
    register(id, '木条', '实验小工具', {
      width: 44,
      height: 168,
      svg: body,
      search: 'wooden splint 木条 带火星木条 燃着木条 气体检验',
      ports: [{ id: 'probe', x: 22, y: 158, dx: 0, dy: 1, type: 'probe', diameter: 10, segment: [22, 144, 22, 22] }],
    });
  }

  // cotton-wool (120x120)
  {
    const id = 'cotton-wool';
    const body = `<path d="M20 76 C8 56 18 32 38 36 C46 16 78 12 90 32 C112 22 118 54 104 76 C112 94 92 104 74 96 C58 106 30 100 20 76 Z" fill="${C.porcelainMid}" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M36 58 C46 50 60 54 66 64 M76 48 C88 44 96 52 96 64" fill="none" stroke="${C.muted}" stroke-width="1.5" stroke-linecap="round"/>`;
    register(id, '脱脂棉', '物质与填充', {
      width: 120,
      height: 120,
      svg: body,
      search: 'cotton wool 脱脂棉 棉花 过滤棉塞',
      ports: [],
    });
  }

  // steel-wool (140x110)
  {
    const id = 'steel-wool';
    let strands = '';
    for (let i = 0; i < 16; i++) {
      const y0 = 28 + ((i * 19) % 50);
      const y1 = 18 + ((i * 23) % 72);
      strands += `<path d="M${20 + i * 3} ${y0} C${106 - i * 3} ${10 + i * 5} ${28 + i * 5} ${98 - i * 3} ${118 - i * 2.5} ${y1}" fill="none" stroke="${i % 2 ? C.inner : C.muted}" stroke-width="1.6" stroke-linecap="round"/>`;
    }
    const pad = `<ellipse cx="70" cy="55" rx="54" ry="38" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.0" stroke-dasharray="4 3"/>`;
    register(id, '钢丝绒', '物质与填充', {
      width: 140,
      height: 110,
      svg: `${pad}\n  ${strands}`,
      search: 'steel wool 钢丝绒 铁丝绵',
      ports: [],
    });
  }

  // glass-wool (120x110)
  {
    const id = 'glass-wool';
    const body = `<path d="M18 72 C6 54 18 30 38 36 C46 16 78 14 90 34 C112 22 116 52 104 72 C110 88 90 98 74 90 C56 100 28 94 18 72 Z" fill="${C.glass}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M32 54 C46 44 64 56 76 48 M42 74 C58 64 76 74 88 64" fill="none" stroke="${C.muted}" stroke-width="1.4" stroke-linecap="round"/>`;
    register(id, '玻璃棉', '物质与填充', {
      width: 120,
      height: 110,
      svg: body,
      search: 'glass wool 玻璃棉 玻璃纤维棉 填料',
      ports: [],
    });
  }

  // soda-can (96x156) — base: (48, 146)
  {
    const id = 'soda-can';
    const body = `<path d="M18 14 H78 L84 26 V136 L76 146 H20 L12 136 V26 Z" fill="${C.crimson}" stroke="${C.stroke}" stroke-width="${outerSw}" stroke-linejoin="round"/>
      <rect x="14" y="14" width="68" height="8" rx="2" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="14" y="136" width="68" height="8" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <line x1="24" y1="30" x2="24" y2="128" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" opacity="0.5"/>`;
    register(id, '易拉罐', '测量与防护', {
      width: 96,
      height: 156,
      svg: body,
      search: 'soda can aluminum can 易拉罐 铝罐 量热罐',
      ports: [basePort(48, 146)],
    });
  }

  // faucet (116x168) — outlet: (88, 94, d=20)
  {
    const id = 'faucet';
    const body = `<path d="M18 156 V56 H80 Q98 56 98 76 V94 H78 V76 H38 V156 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="${outerSw}" stroke-linejoin="round"/>
      <rect x="12" y="148" width="32" height="10" rx="3" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="75" y="88" width="26" height="6" rx="2" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="40" y="42" width="32" height="14" rx="2.5" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="53" y="18" width="6" height="24" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="30" y="12" width="52" height="7" rx="3" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.0"/>`;
    register(id, '水龙头', '测量与防护', {
      width: 116,
      height: 168,
      svg: body,
      search: 'faucet water tap 水龙头 冷凝水龙头 给水口',
      ports: [{ id: 'outlet', x: 88, y: 94, dx: 0, dy: 1, type: 'tube', diameter: 20 }],
    });
  }

  // balloon (112x160) — inlet: (56, 130, hose, d=14), hanger: (56, 154)
  {
    const id = 'balloon';
    const body = `<path d="M56 130 C44 138 64 144 56 154" fill="none" stroke="${C.stroke}" stroke-width="2.0" stroke-linecap="round"/>
      <path d="M51 120 L49 130 H63 L61 120 Z" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M56 8 C86 8 102 34 98 66 C94 98 76 120 56 120 C36 120 18 98 14 66 C10 34 26 8 56 8 Z" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="${outerSw}" stroke-linejoin="round"/>
      <path d="M28 38 C31 27 38 20 46 18" fill="none" stroke="#FFFFFF" stroke-width="2.8" stroke-linecap="round" opacity="0.65"/>`;
    register(id, '气球', '测量与防护', {
      width: 112,
      height: 160,
      svg: body,
      search: 'balloon 气球 气体收集气球 弹性气球',
      ports: [
        { id: 'inlet', x: 56, y: 130, dx: 0, dy: 1, type: 'hose', diameter: 14, depth: 8, edge: [49, 130, 63, 130] },
        { id: 'hanger', x: 56, y: 154, dx: 0, dy: 1, type: 'hanger', diameter: 0 },
      ],
    });
  }

  // burette-clamp [NEW] (184x52) — clamp:(92,26), grip-left:(22,26), grip-right:(162,26)
  {
    const id = 'burette-clamp';
    const arms = `<path d="M80 21 H34 C18 21 16 9 26 9 M80 31 H34 C18 31 16 43 26 43" fill="none" stroke="${C.stroke}" stroke-width="5.0" stroke-linecap="round"/>
      <path d="M80 21 H34 C18 21 16 9 26 9 M80 31 H34 C18 31 16 43 26 43" fill="none" stroke="${C.chassisMid}" stroke-width="2.0" stroke-linecap="round"/>
      <path d="M104 21 H150 C166 21 168 9 158 9 M104 31 H150 C166 31 168 43 158 43" fill="none" stroke="${C.stroke}" stroke-width="5.0" stroke-linecap="round"/>
      <path d="M104 21 H150 C166 21 168 9 158 9 M104 31 H150 C166 31 168 43 158 43" fill="none" stroke="${C.chassisMid}" stroke-width="2.0" stroke-linecap="round"/>`;
    const detail = `<rect x="32" y="16" width="12" height="20" rx="3" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="140" y="16" width="12" height="20" rx="3" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="17" y="9" width="8" height="7" rx="2.5" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="1.4"/>
      <rect x="17" y="36" width="8" height="7" rx="2.5" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="1.4"/>
      <rect x="159" y="9" width="8" height="7" rx="2.5" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="1.4"/>
      <rect x="159" y="36" width="8" height="7" rx="2.5" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="1.4"/>
      <rect x="80" y="13" width="24" height="26" rx="3" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="2.2"/>
      <circle cx="92" cy="26" r="5" fill="${C.brass}" stroke="${C.stroke}" stroke-width="1.6"/>`;
    register(id, '滴定管夹', '支撑与夹持', {
      width: 184,
      height: 52,
      svg: `${arms}\n  ${detail}`,
      search: 'burette clamp butterfly clamp 滴定管夹 蝴蝶夹 双联滴定夹',
      ports: [
        { id: 'clamp', x: 92, y: 26, dx: 0, dy: -1, type: 'clamp', diameter: 9 },
        { id: 'grip-left', x: 22, y: 26, dx: -1, dy: 0, type: 'grip', diameter: 20 },
        { id: 'grip-right', x: 162, y: 26, dx: 1, dy: 0, type: 'grip', diameter: 20 },
      ],
    });
  }

  // pinch-clamp [NEW] (88x96) — grip:(44,24, d=14)
  {
    const id = 'pinch-clamp';
    const body = `<path d="M20 18 H68 M20 30 H68" fill="none" stroke="${C.stroke}" stroke-width="5.8" stroke-linecap="round"/>
      <path d="M20 18 H68 M20 30 H68" fill="none" stroke="${C.chassisBot}" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M26 18 V44 L64 80 M62 18 V44 L24 80" fill="none" stroke="${C.stroke}" stroke-width="4.8" stroke-linecap="round"/>
      <path d="M26 18 V44 L64 80 M62 18 V44 L24 80" fill="none" stroke="${C.chassisBot}" stroke-width="2.0" stroke-linecap="round"/>
      <circle cx="44" cy="52" r="4" fill="${C.brass}" stroke="${C.stroke}" stroke-width="1.5"/>
      <rect x="15" y="72" width="16" height="15" rx="3.5" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="57" y="72" width="16" height="15" rx="3.5" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    register(id, '止水夹', '导管', {
      width: 88,
      height: 96,
      svg: body,
      search: 'pinch clamp Mohr clip pinchcock 止水夹 弹簧夹 螺旋夹 胶管夹',
      ports: [{ id: 'grip', x: 44, y: 24, dx: 1, dy: 0, type: 'grip', diameter: 14 }],
    });
  }

  // =========================================================================
  // 3. MEASUREMENT & ANALYTICAL INSTRUMENTS
  // =========================================================================

  // balance (196x56) — surface: (98, 10)
  // Low-profile Chemix top-loading balance + pale-blue LCD + amber O/I & TARE buttons
  {
    const id = 'balance';
    const body = `${S.labFeet(16, 47, 164, 14, 4, 16)}
      <rect x="30" y="10" width="136" height="5" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="86" y="15" width="24" height="5" fill="${C.metalDark}" stroke="${C.stroke}" stroke-width="1.6"/>
      <path d="M10 47 L22 20 H174 L186 47 Z" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="${outerSw}" stroke-linejoin="round"/>
      <line x1="25" y1="23" x2="171" y2="23" stroke="${C.chassisTop}" stroke-width="1.8" stroke-linecap="round"/>
      <rect x="64" y="27" width="68" height="15" rx="2.5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.6"/>
      <rect x="66.5" y="29" width="63" height="11" rx="1.5" fill="${C.lcdBlue}" stroke="none"/>
      ${S.screenText(98, 37.3, '0.00 g', 8.5, C.lcdText)}
      <rect x="26" y="29" width="24" height="11" rx="2" fill="${C.amber}" stroke="${C.stroke}" stroke-width="1.4"/>
      ${S.labelText(38, 36.8, 'O/I', 6.2, C.stroke)}
      <rect x="146" y="29" width="26" height="11" rx="2" fill="${C.amber}" stroke="${C.stroke}" stroke-width="1.4"/>
      ${S.labelText(159, 36.8, 'TARE', 5.8, C.stroke)}`;
    register(id, '电子天平', '设备', {
      width: 196,
      height: 56,
      svg: body,
      search: 'balance electronic scale 电子天平 分析天平 精密称量天平',
      ports: [{ id: 'surface', x: 98, y: 10, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // digital-thermometer (64x200) — probe: (32, 190, d=7, seg:[32,176,32,96])
  {
    const id = 'digital-thermometer';
    const stem = `<path d="M29 74 H35 V186 Q35 190 32 190 Q29 190 29 186 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="26" y="70" width="12" height="14" rx="2" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.6"/>`;
    const head = `<rect x="8" y="8" width="48" height="64" rx="6" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="${outerSw}"/>
      <rect x="13" y="15" width="38" height="24" rx="2.5" fill="${C.lcdBg}" stroke="${C.stroke}" stroke-width="1.4"/>
      ${S.screenText(32, 30.5, '24.8°C', 8.2, C.lcdText)}
      <circle cx="32" cy="54" r="6" fill="${C.crimson}" stroke="${C.stroke}" stroke-width="1.5"/>`;
    register(id, '数字温度计', '测量', {
      width: 64,
      height: 200,
      svg: `${stem}\n  ${head}`,
      search: 'digital thermometer 数字温度计 数显温度探针 测温仪',
      ports: [{ id: 'probe', x: 32, y: 190, dx: 0, dy: 1, type: 'probe', diameter: 7, segment: [32, 176, 32, 96] }],
    });
  }

  // ruler (184x34)
  {
    const id = 'ruler';
    let ticks = '';
    for (let i = 0; i <= 30; i++) {
      const x = 17 + i * 5;
      const major = i % 5 === 0;
      ticks += `<line x1="${x}" y1="7" x2="${x}" y2="${major ? 19 : 13}" stroke="${C.stroke}" stroke-width="${major ? 1.3 : 0.9}"/>`;
      if (i % 10 === 0) ticks += S.labelText(x, 25.5, String(i / 2), 6.2, C.inner);
    }
    const body = `<rect x="8" y="7" width="168" height="21" rx="2" fill="${C.corkLight}" stroke="${C.stroke}" stroke-width="2.2"/>
      ${ticks}`;
    register(id, '直尺', '测量与防护', {
      width: 184,
      height: 34,
      svg: body,
      search: 'ruler 直尺 刻度尺 长度测量',
      ports: [],
    });
  }

  // tape-measure (168x54)
  {
    const id = 'tape-measure';
    let ticks = '';
    for (let x = 70; x < 156; x += 8) ticks += strokeLine(x, 22, x, x % 16 === 6 ? 32 : 28, 1.1, C.stroke);
    const body = `<rect x="64" y="22" width="94" height="16" rx="1.5" fill="${C.amberLight}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="154" y="21" width="6" height="19" rx="1" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.6"/>
      ${ticks}
      <rect x="8" y="8" width="56" height="38" rx="12" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="${outerSw}"/>
      <circle cx="36" cy="27" r="11" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    register(id, '卷尺', '测量与防护', {
      width: 168,
      height: 54,
      svg: body,
      search: 'tape measure 卷尺 软尺 钢卷尺',
      ports: [],
    });
  }

  // protractor (160x96)
  {
    const id = 'protractor';
    let ticks = '';
    for (let i = 0; i <= 18; i++) {
      const t = (i * Math.PI) / 18;
      const major = i % 3 === 0;
      const rOuter = 68;
      const rInner = major ? 54 : 60;
      ticks += `<line x1="${r(80 - rOuter * Math.cos(t))}" y1="${r(84 - rOuter * Math.sin(t))}" x2="${r(80 - rInner * Math.cos(t))}" y2="${r(84 - rInner * Math.sin(t))}" stroke="${C.stroke}" stroke-width="${major ? 1.5 : 1.0}"/>`;
    }
    const body = `<path d="M10 84 A70 70 0 0 1 150 84 Z" fill="${C.glass}" stroke="${C.stroke}" stroke-width="${outerSw}" stroke-linejoin="round"/>
      <path d="M44 84 A36 36 0 0 1 116 84 Z" fill="#FFFFFF" stroke="${C.inner}" stroke-width="1.8"/>
      ${ticks}
      <circle cx="80" cy="77" r="2.2" fill="${C.stroke}"/>`;
    register(id, '量角器', '测量与防护', {
      width: 160,
      height: 96,
      svg: body,
      search: 'protractor 量角器 半圆仪 角度测量',
      ports: [],
    });
  }

  // timer (130x110)
  {
    const id = 'timer';
    let ticks = '';
    for (let i = 0; i < 12; i++) {
      const t = (i * Math.PI) / 6;
      ticks += `<line x1="${r(65 + 31 * Math.sin(t))}" y1="${r(60 - 31 * Math.cos(t))}" x2="${r(65 + 36 * Math.sin(t))}" y2="${r(60 - 36 * Math.cos(t))}" stroke="${C.stroke}" stroke-width="${i % 3 === 0 ? 2.0 : 1.2}"/>`;
    }
    const body = `<rect x="58" y="6" width="14" height="14" rx="2.5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="94" y="20" width="10" height="12" rx="2" transform="rotate(38 99 26)" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.6"/>
      <circle cx="65" cy="60" r="44" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="${outerSw}"/>
      <circle cx="65" cy="60" r="37" fill="${C.chassisTop}" stroke="${C.inner}" stroke-width="1.6"/>
      ${ticks}
      <line x1="65" y1="60" x2="65" y2="30" stroke="${C.stroke}" stroke-width="2.4" stroke-linecap="round"/>
      <line x1="65" y1="60" x2="88" y2="68" stroke="${C.crimson}" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="65" cy="60" r="3.8" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.4"/>`;
    register(id, '秒表', '设备', {
      width: 130,
      height: 110,
      svg: body,
      search: 'timer stopwatch 秒表 计时器 实验秒表',
      ports: [],
    });
  }

  // ph-probe (74x200) — probe: (37, 190, d=8, seg:[37,176,37,96])
  {
    const id = 'ph-probe';
    const stem = `<rect x="33.5" y="74" width="7" height="106" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="37" cy="184.5" r="5.2" fill="${C.coolant}" stroke="${C.stroke}" stroke-width="2.0"/>
      <line x1="37" y1="76" x2="37" y2="178" stroke="${C.inner}" stroke-width="1.4"/>
      <rect x="29" y="70" width="16" height="12" rx="2.5" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    const head = S.chassis(id, 9, 8, 56, 64, { rx: 6, feet: false }) +
      S.oledScreen(id, 14, 15, 46, 26, S.screenText(37, 31.5, 'pH 7.0', 8.5, C.lcdText)) +
      S.softButton(15, 47, 20, 11, '', C.chassisTop, C.stroke) +
      S.softButton(39, 47, 20, 11, '', C.steelBlue, C.chassisTop);
    register(id, 'pH 探头', '测量', {
      width: 74,
      height: 200,
      svg: `${stem}\n  ${head}`,
      search: 'ph probe ph electrode meter pH探头 酸度计电极 pH计',
      ports: [{ id: 'probe', x: 37, y: 190, dx: 0, dy: 1, type: 'probe', diameter: 8, segment: [37, 176, 37, 96] }],
    });
  }

  // ph-paper (76x160)
  {
    const id = 'ph-paper';
    const cols = [C.crimson, C.amber, C.leaf, C.steelBlue];
    const strips = cols
      .map(
        (col, i) =>
          `<rect x="${10 + i * 14}" y="12" width="12" height="136" rx="2" fill="${col}" stroke="${C.stroke}" stroke-width="2.0"/>`
      )
      .join('\n  ');
    register(id, 'pH 试纸', '测量与防护', {
      width: 76,
      height: 160,
      svg: strips,
      search: 'ph paper indicator strips pH试纸 广泛pH试纸 酸碱试纸',
      ports: [],
    });
  }

  // litmus-paper (76x160)
  {
    const id = 'litmus-paper';
    const body = `<rect x="12" y="12" width="22" height="136" rx="2" fill="${C.crimson}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="42" y="12" width="22" height="136" rx="2" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="2.2"/>`;
    register(id, '石蕊试纸', '测量与防护', {
      width: 76,
      height: 160,
      svg: body,
      search: 'litmus paper 石蕊试纸 红蓝石蕊试纸 酸碱指示试纸',
      ports: [],
    });
  }

  // electrode (54x176) — wire: (27, 14, dx:0, dy:-1, d=12, seg:[27,28,27,158])
  {
    const id = 'electrode';
    const body = `<rect x="21" y="12" width="12" height="12" rx="2.5" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="15" y="24" width="24" height="18" rx="3" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="17" y="42" width="20" height="114" rx="2" fill="${C.coolantLight}" stroke="${C.stroke}" stroke-width="2.2"/>
      <line x1="27" y1="44" x2="27" y2="148" stroke="${C.inner}" stroke-width="2.2" stroke-linecap="round"/>
      <rect x="19" y="156" width="16" height="10" rx="3" fill="${C.porcelainMid}" stroke="${C.stroke}" stroke-width="2.0"/>`;
    register(id, '电极', '实验小工具', {
      width: 54,
      height: 176,
      svg: body,
      search: 'electrode 电极 金属电极 石墨电极 铂电极',
      ports: [{ id: 'wire', x: 27, y: 14, dx: 0, dy: -1, type: 'wire', diameter: 12, segment: [27, 28, 27, 158] }],
    });
  }

  // dynamometer (58x210) — hook: (29, 196)
  {
    const id = 'dynamometer';
    let coil = 'M29 36';
    for (let y = 36; y < 120; y += 12) coil += ` L22 ${y + 4} L36 ${y + 9} L29 ${y + 12}`;
    const body = `<path d="M29 22 V10 A7 7 0 1 1 19 16" fill="none" stroke="${C.stroke}" stroke-width="2.8" stroke-linecap="round"/>
      <rect x="11" y="22" width="36" height="140" rx="8" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="${outerSw}"/>
      <rect x="17" y="32" width="24" height="118" rx="4" fill="${C.glassTop}" stroke="${C.inner}" stroke-width="1.4"/>
      <path d="${coil}" fill="none" stroke="${C.inner}" stroke-width="1.6" stroke-linejoin="round"/>
      <rect x="19" y="120" width="20" height="5" rx="1" fill="${C.crimson}" stroke="${C.stroke}" stroke-width="1.1"/>
      ${S.gradTicks(41, 44, 140, 10, 2, 4, { dir: -1 })}
      <path d="M29 162 V180 C38 180 39 192 29 196" fill="none" stroke="${C.stroke}" stroke-width="2.8" stroke-linecap="round"/>`;
    register(id, '测力计', '测量', {
      width: 58,
      height: 210,
      svg: body,
      search: 'dynamometer spring balance 测力计 弹簧测力计 牛顿计',
      ports: [{ id: 'hook', x: 29, y: 196, dx: 0, dy: 1, type: 'hook', diameter: 0 }],
    });
  }

  // multimeter (116x196) — positive: (34,168), negative: (82,168)
  {
    const id = 'multimeter';
    const body = `<rect x="8" y="8" width="100" height="180" rx="10" fill="${C.crimson}" stroke="${C.stroke}" stroke-width="${outerSw}"/>` +
      `<rect x="14" y="14" width="88" height="168" rx="6" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.0"/>` +
      S.oledScreen(
        id,
        20,
        22,
        76,
        36,
        S.screenText(58, 44, '0.000 V', 12, C.lcdText) + S.screenText(25, 32, 'DC', 6.8, C.traceBlue, 'start'),
        { green: true }
      ) +
      S.rotaryKnob(id, 58, 100, 22, -35, { dark: true, ticks: 9 }) +
      S.bindingPost(34, 168, C.crimson, 'VΩ', -10, 6.5) +
      S.bindingPost(82, 168, C.darkPanel, 'COM', -10, 6.5);
    register(id, '万用表', '电学', {
      width: 116,
      height: 196,
      svg: body,
      search: 'multimeter 数字万用表 万用表 电表',
      ports: [
        { id: 'positive', x: 34, y: 168, dx: 0, dy: 1, type: 'wire', diameter: 0 },
        { id: 'negative', x: 82, y: 168, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      ],
    });
  }

  // microscope (140x196) — base:(70,186), surface:(56,128, seg:[16,128,96,128])
  // Brushed silver & neutral charcoal compound optical microscope (ZERO teal)
  {
    const id = 'microscope';
    const base = `<path d="M16 186 H124 L120 171 H20 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="${outerSw}" stroke-linejoin="round"/>
      <ellipse cx="56" cy="158" rx="18" ry="6.5" fill="${C.coolant}" stroke="${C.stroke}" stroke-width="1.9"/>
      <path d="M38 158 Q56 167 74 158" fill="none" stroke="${C.inner}" stroke-width="1.6"/>`;
    const arm = `<path d="M112 171 V78 C112 40 94 26 68 28 L60 44 C82 42 94 56 94 84 V171 Z" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="${outerSw}" stroke-linejoin="round"/>
      ${S.rotaryKnob(id, 102, 138, 11, 20, { dark: true })}`;
    const stage = `<rect x="16" y="128" width="80" height="6.5" rx="2" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="40" y="134.5" width="32" height="6" rx="1.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.5"/>
      <line x1="38" y1="125" x2="74" y2="125" stroke="${C.chassisMid}" stroke-width="2.0" stroke-linecap="round"/>`;
    const head = `<g transform="translate(56, 56) rotate(22)">
        <rect x="-9" y="-42" width="18" height="68" rx="2.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2"/>
        <rect x="-7" y="-50" width="14" height="8" rx="2" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.8"/>
        <ellipse cx="0" cy="26" rx="12" ry="4.5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.8"/>
        <rect x="-9.5" y="29" width="8" height="16" rx="1.5" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.8"/>
        <rect x="2" y="29" width="8" height="13" rx="1.5" transform="rotate(-18 6 29)" fill="${C.metalDark}" stroke="${C.stroke}" stroke-width="1.6"/>
      </g>`;
    register(id, '显微镜', '设备', {
      width: 140,
      height: 196,
      svg: `${base}\n  ${arm}\n  ${stage}\n  ${head}`,
      search: 'microscope 显微镜 光学显微镜 生物显微镜',
      ports: [basePort(70, 186), surfacePort('surface', 16, 128, 96, 128)],
    });
  }

  // calibration-weights [NEW] (96x136) — base:(48,126), hook:(48,14)
  {
    const id = 'calibration-weights';
    const body = `<circle cx="48" cy="14" r="4" fill="none" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="40" y="17" width="16" height="10" rx="3.5" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="36" y="27" width="24" height="8" rx="2.5" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.2"/>
      <path d="M20 46 C20 37 28 35 48 35 C68 35 76 37 76 46 V120 Q76 126 68 126 H28 Q20 126 20 120 Z" fill="${C.brass}" stroke="${C.stroke}" stroke-width="${outerSw}" stroke-linejoin="round"/>
      <rect x="20" y="117" width="56" height="7" rx="2" fill="${C.brassDark}" stroke="none"/>
      <ellipse cx="48" cy="39" rx="24" ry="3.5" fill="${C.brassLight}" stroke="none"/>
      <line x1="27" y1="52" x2="27" y2="110" stroke="${C.brassLight}" stroke-width="2.0" stroke-linecap="round"/>
      ${S.labelText(48, 86, '100 g', 12, C.stroke)}`;
    register(id, '砝码', '测量', {
      width: 96,
      height: 136,
      svg: body,
      search: 'calibration weight brass weight 砝码 托盘天平砝码 金属砝码',
      ports: [basePort(48, 126), { id: 'hook', x: 48, y: 14, dx: 0, dy: -1, type: 'hook', diameter: 0 }],
    });
  }
};
