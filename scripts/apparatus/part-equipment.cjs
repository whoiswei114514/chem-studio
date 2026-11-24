'use strict';

const S = require('./svg-style.cjs');
const { C, r } = S;

/**
 * Registers all 84 thermal, ceramic, support, clamp, safety, lab-tool,
 * measurement, and unique hardware (`studio:*`) items in the Round 6
 * Chemix Sleek Flat Industrial Minimalism House Style.
 * Zero gradients, zero url(#...), zero `#294454`/`#258F89`/`#0F172A`.
 */
module.exports = function registerEquipment(register) {
  const outerSw = 2.6;
  const fineSw = 1.6;

  const strokeLine = (x1, y1, x2, y2, sw = fineSw, col = C.stroke, extra = '') =>
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
    const outer = `M${r(cx)} ${r(yTop)} C${r(cx + outerW * 0.65)} ${r(yTop + h * 0.34)} ${r(cx + outerW)} ${r(yBot - h * 0.12)} ${r(cx)} ${r(yBot)} C${r(cx - outerW)} ${r(yBot - h * 0.12)} ${r(cx - outerW * 0.65)} ${r(yTop + h * 0.34)} ${r(cx)} ${r(yTop)} Z`;
    const core = `M${r(cx)} ${r(yTop + h * 0.4)} C${r(cx + innerW)} ${r(yTop + h * 0.62)} ${r(cx + innerW)} ${r(yBot - h * 0.08)} ${r(cx)} ${r(yBot)} C${r(cx - innerW)} ${r(yBot - h * 0.08)} ${r(cx - innerW)} ${r(yTop + h * 0.62)} ${r(cx)} ${r(yTop + h * 0.4)} Z`;
    return { outer, core };
  };

  const bossHead = (x, y, h = 16) => {
    const cy = y + h / 2;
    return `<rect x="${r(x)}" y="${r(y)}" width="13" height="${r(h)}" rx="2.5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="2.0"/>` +
      `<rect x="${r(x - 6)}" y="${r(cy - 2)}" width="6" height="4" rx="1.2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.4"/>` +
      `<line x1="${r(x - 5.5)}" y1="${r(cy - 5)}" x2="${r(x - 5.5)}" y2="${r(cy + 5)}" stroke="${C.stroke}" stroke-width="2.2" stroke-linecap="round"/>`;
  };

  // =========================================================================
  // 1. THERMAL, HEATING & BATHS (Sleek Chemix Industrial Minimalism)
  // =========================================================================

  // bunsen (92x216) — gas: (88, 184, d=10), surface: (46, 66)
  {
    const id = 'bunsen';
    const cx = 46;
    const { outer, core } = flamePaths(cx, 8, 66, 11, 5.2);
    const flame = `<path d="${outer}" fill="${C.flameTip}" stroke="${C.stroke}" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="${core}" fill="${C.flameCore}" stroke="none"/>`;
    const gasPipe = `<path d="M51 180 H74 L77 178.5 L80 180.5 L83 178.5 L88 179.5 V188.5 L83 189.5 L80 187.5 L77 189.5 L74 188 H51 Z" fill="${C.brass}" stroke="${C.stroke}" stroke-width="1.8" stroke-linejoin="round"/>`;
    const base = `<path d="M10 212 C12 198 28 192 46 192 C64 192 80 198 82 212 Z" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <rect x="37" y="182" width="18" height="11" rx="2" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    const collar = `<rect x="38.5" y="160" width="15" height="20" rx="1.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.8"/>
      <ellipse cx="${cx}" cy="170" rx="3.4" ry="4.5" fill="${C.darkPanel}" stroke="none"/>`;
    const chimney = `<rect x="40.5" y="66" width="11" height="96" rx="1.2" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.2"/>
      <line x1="43" y1="72" x2="43" y2="156" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round"/>`;
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

  // flame (80x160) — clean lightweight dual-tone luminous cone
  {
    const id = 'flame';
    const cx = 40;
    const body = `<path d="M${cx} 8 C${cx + 18} 44 ${cx + 28} 86 ${cx + 26} 120 C${cx + 23} 142 ${cx + 12} 152 ${cx} 152 C${cx - 12} 152 ${cx - 23} 142 ${cx - 26} 120 C${cx - 28} 86 ${cx - 18} 44 ${cx} 8 Z" fill="${C.amberLight}" stroke="${C.stroke}" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M${cx} 58 C${cx + 10} 90 ${cx + 14} 124 ${cx + 9} 142 C${cx + 4} 148 ${cx - 4} 148 ${cx - 9} 142 C${cx - 14} 124 ${cx - 10} 90 ${cx} 58 Z" fill="${C.coolant}" stroke="none"/>`;
    register(id, '火焰', '加热', {
      width: 80,
      height: 160,
      svg: body,
      search: 'flame 火焰 加热焰 外焰 内焰 焰心',
      ports: [],
    });
  }

  // hot-plate (196x48) — surface: (98, 6)
  // Low silver slab + indicator dot + round knob (NO text clutter)
  {
    const id = 'hot-plate';
    const body = `<rect x="20" y="6" width="156" height="5" rx="2" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.8"/>
      <path d="M14 11 H182 Q186 11 186 16 V34 Q186 40 180 40 H16 Q10 40 10 34 V16 Q10 11 14 11 Z" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <line x1="16" y1="15" x2="180" y2="15" stroke="${C.chassisTop}" stroke-width="2.0" stroke-linecap="round"/>
      <rect x="22" y="40" width="14" height="4" rx="1.5" fill="${C.metalDark}" stroke="${C.stroke}" stroke-width="1.2"/>
      <rect x="160" y="40" width="14" height="4" rx="1.5" fill="${C.metalDark}" stroke="${C.stroke}" stroke-width="1.2"/>
      <circle cx="28" cy="25.5" r="3.5" fill="${C.subaRed}" stroke="${C.stroke}" stroke-width="1.2"/>
      ${S.rotaryKnob(id, 162, 25.5, 8.5, 35, { dark: false })}`;
    register(id, '加热板', '加热', {
      width: 196,
      height: 48,
      svg: body,
      search: 'hot plate 加热板 电热板 恒温加热台',
      ports: [{ id: 'surface', x: 98, y: 6, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // magnetic-stirrer-heater (184x82) — surface: (92, 8)
  // Trapezoidal slanted silver panel + rocker switch + dual rotary knobs (NO LCD text clutter)
  {
    const id = 'magnetic-stirrer-heater';
    const body = `<rect x="34" y="8" width="116" height="7" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="24" y="15" width="136" height="10" rx="2" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.0"/>
      <path d="M24 25 H160 L174 68 Q175 73 168 73 H16 Q9 73 10 68 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M26 28 H158 L169 66 H15 Z" fill="${C.chassisMid}" stroke="none"/>
      <rect x="24" y="40" width="14" height="20" rx="2" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.5"/>
      <rect x="26.5" y="43" width="9" height="7" rx="1" fill="${C.chassisTop}" stroke="none"/>
      ${S.rotaryKnob(id, 114, 51, 11, -35)}
      ${S.rotaryKnob(id, 148, 51, 11, 35)}
      <rect x="20" y="73" width="14" height="4" rx="1.5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.2"/>
      <rect x="150" y="73" width="14" height="4" rx="1.5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.2"/>`;
    register(id, '磁力加热搅拌器', '加热', {
      width: 184,
      height: 82,
      svg: body,
      search: 'magnetic stirrer heater 磁力加热搅拌器 磁力搅拌恒温加热台',
      ports: [{ id: 'surface', x: 92, y: 8, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // heating-mantle (154x132) — surface: (77, 14)
  // Steel-blue housing + silver top rim + white lower control strip + central knob + 2 dots
  {
    const id = 'heating-mantle';
    const body = `<rect x="14" y="22" width="126" height="98" rx="3" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="14" y="14" width="126" height="10" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2"/>
      <line x1="20" y1="18" x2="134" y2="18" stroke="${C.chassisTop}" stroke-width="2.0" stroke-linecap="round"/>
      <rect x="24" y="80" width="106" height="32" rx="3" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="1.6"/>
      <circle cx="44" cy="96" r="4" fill="${C.amber}" stroke="${C.stroke}" stroke-width="1.2"/>
      ${S.rotaryKnob(id, 77, 96, 11, 15, { dark: true })}
      <circle cx="110" cy="96" r="4" fill="${C.subaRed}" stroke="${C.stroke}" stroke-width="1.2"/>
      <rect x="22" y="120" width="16" height="5" rx="1.5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.4"/>
      <rect x="116" y="120" width="16" height="5" rx="1.5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.4"/>`;
    register(id, '电热套', '加热', {
      width: 154,
      height: 132,
      svg: body,
      search: 'heating mantle 电热套 调温电热套 圆底烧瓶加热套',
      ports: [{ id: 'surface', x: 77, y: 14, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // sand-bath (200x84) — surface: (100, 22)
  // Clean open rectangular sand trough w/ C.sandLight / C.sandDark (NO hot-plate base underneath)
  {
    const id = 'sand-bath';
    const sandDots = [
      [24, 30], [42, 28], [60, 33], [78, 27], [96, 32], [114, 28], [132, 33], [150, 28], [168, 32],
      [32, 42], [52, 45], [72, 40], [92, 46], [112, 41], [132, 45], [152, 40], [174, 44],
      [26, 56], [46, 58], [66, 54], [86, 59], [106, 55], [126, 58], [146, 54], [166, 57],
    ]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.5" fill="${C.sandDark}" stroke="none"/>`)
      .join('');
    const body = `<rect x="12" y="22" width="176" height="48" fill="${C.sandLight}" stroke="none"/>
      <line x1="12" y1="22" x2="188" y2="22" stroke="${C.sandDark}" stroke-width="1.4"/>
      ${sandDots}
      <path d="M10 10 V70 H190 V10" fill="none" stroke="${C.stroke}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`;
    register(id, '砂浴', '加热', {
      width: 200,
      height: 84,
      svg: body,
      search: 'sand bath 砂浴 高温砂浴锅 均匀加热',
      ports: [{ id: 'surface', x: 100, y: 22, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // kettle (160x182) — base: (75, 174)
  {
    const id = 'kettle';
    const handle = `<path d="M110 54 H136 Q146 54 146 68 V130 Q146 142 134 142 H120" fill="none" stroke="${C.stroke}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M110 54 H136 Q146 54 146 68 V130 Q146 142 134 142 H120" fill="none" stroke="${C.darkPanel}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    const spout = `<path d="M36 72 L12 42 L19 39 L40 50 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const body = `<path d="M38 38 H108 L124 160 Q124 167 114 167 H32 Q22 167 22 160 Z" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M40 42 L30 158 H38 L48 42 Z" fill="${C.chassisTop}" stroke="none"/>
      <rect x="20" y="166" width="108" height="8" rx="3" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="2.0"/>
      <path d="M38 38 C40 26 106 26 108 38 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="61" y="21" width="24" height="6" rx="3" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.6"/>
      <rect x="90" y="64" width="10" height="74" rx="4" fill="${C.liquid}" stroke="${C.inner}" stroke-width="1.4"/>`;
    register(id, '水壶', '加热', {
      width: 160,
      height: 182,
      svg: `${handle}\n  ${spout}\n  ${body}`,
      search: 'kettle 电水壶 烧水壶 实验室热水壶',
      ports: [basePort(75, 174)],
    });
  }

  // ice-bath (180x112) — mouth: (90, 14, d=156, edge:[12,14,168,14]), base: (90, 108)
  // Open glass/acrylic trough + translucent C.iceFill/#A8DDF0 ice cubes
  {
    const id = 'ice-bath';
    const bathFluid = `<path d="M13 38 H167 V100 Q167 105 160 105 H20 Q13 105 13 100 Z" fill="${C.liquid}" stroke="none"/>
      <line x1="13" y1="38" x2="167" y2="38" stroke="${C.liquidLine}" stroke-width="1.6" stroke-linecap="round"/>`;
    const cubes = [
      [30, 56, 20, -10], [54, 52, 20, 14], [80, 56, 21, -8], [106, 52, 20, 12], [132, 56, 21, -14], [154, 58, 18, 9],
      [28, 82, 20, 8], [56, 80, 21, -15], [84, 82, 20, 10], [112, 80, 21, -7], [138, 82, 20, 14], [156, 84, 17, -11],
    ]
      .map(
        ([x, y, s, deg]) =>
          `<g transform="translate(${x},${y}) rotate(${deg})"><rect x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}" rx="4" fill="${C.iceFill}" stroke="${C.iceEdge}" stroke-width="1.8"/></g>`
      )
      .join('\n  ');
    const wall = `<path d="M12 14 V99 Q12 106 19 106 H161 Q168 106 168 99 V14" fill="none" stroke="${C.stroke}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    register(id, '冰浴', '容器', {
      width: 180,
      height: 112,
      svg: `${bathFluid}\n  ${cubes}\n  ${wall}`,
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

  // water-bath (210x88) — mouth: (84, 14, d=144, edge:[12,14,156,14]), base: (105, 84)
  // Brushed silver open bath + compact right grey digital controller + flat #DCF0F7/#7ECAE6 water
  {
    const id = 'water-bath';
    const water = `<rect x="17" y="28" width="134" height="48" fill="${C.liquid}" stroke="none"/>
      <line x1="17" y1="28" x2="151" y2="28" stroke="${C.liquidLine}" stroke-width="1.8" stroke-linecap="round"/>`;
    const tank = `<path d="M12 14 H17 V74 H151 V14 H156 V80 H12 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
    const sideCtrl = `<rect x="156" y="18" width="44" height="62" rx="3" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="161" y="24" width="34" height="20" rx="2" fill="${C.lcdPale}" stroke="${C.muted}" stroke-width="1.2"/>
      ${S.screenText(178, 37, '37°C', 7.5, C.lcdText)}
      <circle cx="171" cy="57" r="2.8" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="1.0"/>
      <circle cx="185" cy="57" r="2.8" fill="${C.subaRed}" stroke="${C.stroke}" stroke-width="1.0"/>
      <rect x="165" y="67" width="26" height="5" rx="1.5" fill="${C.chassisBot}" stroke="none"/>`;
    register(id, '水浴锅', '容器', {
      width: 210,
      height: 88,
      svg: `${water}\n  ${tank}\n  ${sideCtrl}`,
      search: 'water bath thermostatic bath 水浴锅 恒温水浴锅 恒温加热水浴槽',
      ports: [
        {
          id: 'mouth',
          x: 84,
          y: 14,
          dx: 0,
          dy: -1,
          type: 'mouth',
          diameter: 144,
          depth: 18,
          target: [84, 62],
          edge: [12, 14, 156, 14],
        },
        basePort(105, 80),
      ],
    });
  }

  // oven (154x170) — base: (77,167), surface: (77, 108, seg:[28,108,126,108])
  // Sleek silver door + single bottom knob & indicator dot (minimal clutter)
  {
    const id = 'oven';
    const body = `<rect x="12" y="10" width="130" height="152" rx="4" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.4"/>
      <rect x="24" y="22" width="106" height="106" rx="3" fill="${C.chassisBot}" stroke="${C.muted}" stroke-width="1.6"/>
      <rect x="30" y="28" width="94" height="94" rx="2" fill="${C.chassisTop}" stroke="${C.inner}" stroke-width="1.2"/>
      <line x1="34" y1="108" x2="120" y2="108" stroke="${C.muted}" stroke-width="1.5" stroke-dasharray="3 2"/>
      ${S.rotaryKnob(id, 77, 145, 9, 25)}
      <circle cx="48" cy="145" r="3.8" fill="${C.subaRed}" stroke="${C.stroke}" stroke-width="1.2"/>
      <rect x="22" y="162" width="14" height="4" rx="1.5" fill="${C.metalDark}" stroke="${C.stroke}" stroke-width="1.2"/>
      <rect x="118" y="162" width="14" height="4" rx="1.5" fill="${C.metalDark}" stroke="${C.stroke}" stroke-width="1.2"/>`;
    register(id, '烘箱', '加热', {
      width: 154,
      height: 170,
      svg: body,
      search: 'drying oven 烘箱 干燥箱 恒温干燥箱',
      ports: [basePort(77, 167), surfacePort('surface', 28, 108, 126, 108)],
    });
  }

  // magnetic-stir-bar (130x38) — contents: (65, 19)
  {
    const id = 'magnetic-stir-bar';
    const bar = `<rect x="10" y="8" width="110" height="22" rx="11" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.2"/>
      <line x1="22" y1="13" x2="108" y2="13" stroke="#FFFFFF" stroke-width="2.0" stroke-linecap="round"/>
      <rect x="61" y="6" width="8" height="26" rx="2.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.6"/>`;
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
    const bar = `<ellipse cx="55" cy="27" rx="45" ry="17" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.2"/>
      <path d="M24 19 Q55 14 86 19" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>
      <line x1="12" y1="27" x2="98" y2="27" stroke="${C.chassisBot}" stroke-width="1.6"/>`;
    register(id, '椭圆搅拌子', '实验小工具', {
      width: 110,
      height: 54,
      svg: bar,
      search: 'oval stir bar 椭圆搅拌子 橄榄型磁力搅拌子',
      ports: [{ id: 'contents', x: 55, y: 27, dx: 0, dy: 1, type: 'contents', diameter: 0 }],
    });
  }

  // wire-gauze (168x32) — surface: (84, 11)
  // Smooth continuous sinusoidal grey wave (clean Chemix wire gauze)
  {
    const id = 'wire-gauze';
    let wave = 'M10 16';
    for (let x = 10; x < 154; x += 18) {
      wave += ` Q${x + 4.5} 9 ${x + 9} 16 Q${x + 13.5} 23 ${x + 18} 16`;
    }
    const body = `<path d="${wave}" fill="none" stroke="${C.inner}" stroke-width="3.0" stroke-linecap="round" stroke-linejoin="round"/>`;
    register(id, '金属纱网', '实验小工具', {
      width: 168,
      height: 32,
      svg: body,
      search: 'wire gauze 石棉网 金属纱网 陶土网 加热隔热网',
      ports: [{ id: 'surface', x: 84, y: 11, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // clay-triangle (176x24) — surface: (88, 7)
  // C.ceramic sleeve on thin straight wire
  {
    const id = 'clay-triangle';
    const body = `<line x1="8" y1="12" x2="168" y2="12" stroke="${C.stroke}" stroke-width="2.2" stroke-linecap="round"/>
      <rect x="52" y="7" width="72" height="10" rx="4" fill="${C.ceramic}" stroke="${C.stroke}" stroke-width="1.6"/>`;
    register(id, '泥三角', '实验小工具', {
      width: 176,
      height: 24,
      svg: body,
      search: 'clay triangle pipe clay triangle 泥三角 坩埚架 灼烧支撑',
      ports: [{ id: 'surface', x: 88, y: 7, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // tripod (136x200) — surface: (68, 12)
  // Airy slender steel side-elevation inverted-U stand
  {
    const id = 'tripod';
    const body = `<path d="M12 192 L17 15 Q17 12 21 12 H115 Q119 12 119 15 L124 192" fill="none" stroke="${C.stroke}" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M12 192 L17 15 Q17 12 21 12 H115 Q119 12 119 15 L124 192" fill="none" stroke="${C.chassisBot}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    register(id, '三脚架', '支撑与夹持', {
      width: 136,
      height: 200,
      svg: body,
      search: 'tripod 三脚架 加热铁三脚架 酒精灯支撑架',
      ports: [{ id: 'surface', x: 68, y: 12, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // crucible (90x94) — mouth: (45, 12, d=70, edge:[10,12,80,12])
  // Bold smooth open U-crucible matching Chemix
  {
    const id = 'crucible';
    const fill = `<path d="M10 12 L19 72 Q22 84 45 84 Q68 84 71 72 L80 12 Z" fill="${C.chassisTop}" stroke="none"/>
      <path d="M18 66 Q45 69 72 66 L70 76 Q66 84 45 84 Q24 84 20 76 Z" fill="${C.chassisMid}" stroke="none"/>`;
    const wall = `<path d="M10 12 L19 72 Q22 84 45 84 Q68 84 71 72 L80 12" fill="none" stroke="${C.stroke}" stroke-width="4.0" stroke-linecap="round" stroke-linejoin="round"/>`;
    register(id, '坩埚', '陶瓷', {
      width: 90,
      height: 94,
      svg: `${fill}\n  ${wall}`,
      search: 'crucible 坩埚 瓷坩埚 灼烧容器 高温灰化',
      ports: [{ id: 'mouth', x: 45, y: 12, dx: 0, dy: -1, type: 'mouth', diameter: 70, depth: 20, target: [45, 72], edge: [10, 12, 80, 12] }],
    });
  }

  // crucible-cover (100x36) — lid: (50, 29, d=84)
  {
    const id = 'crucible-cover';
    const cover = `<path d="M43 17 C43 8 57 8 57 17" fill="none" stroke="${C.stroke}" stroke-width="3.8" stroke-linecap="round"/>
      <path d="M8 29 Q50 10 92 29" fill="none" stroke="${C.stroke}" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/>`;
    register(id, '坩埚盖', '陶瓷', {
      width: 100,
      height: 36,
      svg: cover,
      search: 'crucible cover lid 坩埚盖 瓷坩埚盖',
      ports: [{ id: 'lid', x: 50, y: 29, dx: 0, dy: 1, type: 'lid', diameter: 84 }],
    });
  }

  // evaporating-dish (130x66) — base: (65, 56)
  // Bold spouted open dish (pure smooth open wall + curled pouring spout)
  {
    const id = 'evaporating-dish';
    const fill = `<path d="M10 14 L22 44 Q28 56 65 56 Q100 56 106 42 L114 18 L122 12 Z" fill="${C.porcelainTop}" stroke="none"/>`;
    const wall = `<path d="M10 14 L22 44 Q28 56 65 56 Q100 56 106 42 L114 18 Q116 13 122 12" fill="none" stroke="${C.stroke}" stroke-width="4.0" stroke-linecap="round" stroke-linejoin="round"/>`;
    register(id, '蒸发皿', '容器', {
      width: 130,
      height: 66,
      svg: `${fill}\n  ${wall}`,
      search: 'evaporating dish 蒸发皿 瓷蒸发皿 浓缩结晶',
      ports: [basePort(65, 56)],
    });
  }

  // mortar (148x76) — mouth: (74, 14, d=124, edge:[12,14,136,14])
  // Bold porcelain crescent mortar w/ trapezoidal pedestal base
  {
    const id = 'mortar';
    const body = `<path d="M12 14 C22 48 44 58 50 60 L44 68 H104 L98 60 C104 58 126 48 136 14 L126 14 C116 42 96 52 74 52 C52 52 32 42 22 14 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.8" stroke-linejoin="round"/>
      <path d="M22 14 C32 42 52 52 74 52 C96 52 116 42 126 14 Z" fill="${C.porcelainTop}" stroke="none"/>
      <path d="M12 14 C22 48 44 58 50 60 L44 68 H104 L98 60 C104 58 126 48 136 14" fill="none" stroke="${C.stroke}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    register(id, '研钵', '陶瓷', {
      width: 148,
      height: 76,
      svg: body,
      search: 'mortar 研钵 瓷研钵 研磨固体',
      ports: [{ id: 'mouth', x: 74, y: 14, dx: 0, dy: -1, type: 'mouth', diameter: 124, depth: 20, target: [74, 52], edge: [12, 14, 136, 14] }],
    });
  }

  // pestle (136x88) — probe: (22, 66, d=14, seg:[112,20,24,65])
  // Bold rounded-club Chemix porcelain pestle
  {
    const id = 'pestle';
    const body = `<g transform="translate(68, 44) rotate(-27)">
        <path d="M52 -7 C60 -7 60 7 52 7 L-12 12 C-34 22 -58 20 -58 0 C-58 -20 -34 -22 -12 -12 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="3.2" stroke-linejoin="round"/>
        <path d="M44 -3 L-18 -8" fill="none" stroke="#FFFFFF" stroke-width="2.0" stroke-linecap="round"/>
      </g>`;
    register(id, '研杵', '实验小工具', {
      width: 136,
      height: 88,
      svg: body,
      search: 'pestle 研杵 研棒 研磨棒',
      ports: [{ id: 'probe', x: 22, y: 66, dx: -0.89, dy: 0.45, type: 'probe', diameter: 14, segment: [112, 20, 24, 65] }],
    });
  }

  // spotting-tile (148x118) — 9 well ports (preserving exact well-39-37..well-129-105 IDs)
  // Clean matte porcelain plate w/ soft dimples (NO heavy dark inner rings)
  {
    const id = 'spotting-tile';
    const plate = `<rect x="10" y="10" width="128" height="98" rx="6" fill="${C.chassisMid}" stroke="${C.muted}" stroke-width="1.8"/>`;
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
          `<circle cx="${x}" cy="${y}" r="11.5" fill="${C.chassisTop}" stroke="${C.chassisBot}" stroke-width="1.4"/>`
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
    const boat = `<path d="M8 12 H18 L28 44 H102 L112 12 H122" fill="none" stroke="${C.stroke}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    register(id, '称量舟', '容器', {
      width: 130,
      height: 54,
      svg: boat,
      search: 'weighing boat 称量舟 称量盘 塑料称量皿',
      ports: [basePort(65, 45)],
    });
  }

  // bench-mat (184x26) — surface: (92, 8)
  {
    const id = 'bench-mat';
    const mat = `<rect x="8" y="8" width="168" height="10" rx="5" fill="${C.ceramic}" stroke="${C.muted}" stroke-width="1.6"/>`;
    register(id, '实验台垫', '实验小工具', {
      width: 184,
      height: 26,
      svg: mat,
      search: 'bench mat 实验台垫 防火垫 隔热实验垫',
      ports: [{ id: 'surface', x: 92, y: 8, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // filter-paper (116x80) — surface: (58, 10)
  // Soft #F3F4F6/#B8BCC2 folded filter cone
  {
    const id = 'filter-paper';
    const cone = `<path d="M12 18 L58 72 L104 18 Q58 8 12 18 Z" fill="${C.chassisTop}" stroke="${C.tick}" stroke-width="2.0" stroke-linejoin="round"/>
      <path d="M12 18 Q58 26 104 18" fill="none" stroke="${C.tick}" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="58" y1="22" x2="58" y2="70" stroke="${C.chassisBot}" stroke-width="1.2" stroke-dasharray="3 3"/>`;
    register(id, '滤纸', '实验小工具', {
      width: 116,
      height: 80,
      svg: cone,
      search: 'filter paper 滤纸 定性滤纸 定量滤纸 圆形滤纸',
      ports: [{ id: 'surface', x: 58, y: 10, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // sieve (140x42) — surface: (70, 12)
  // Open dashed-mesh side profile matching Chemix
  {
    const id = 'sieve';
    const body = `<path d="M12 12 V30" fill="none" stroke="${C.stroke}" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M128 12 V30" fill="none" stroke="${C.stroke}" stroke-width="3.2" stroke-linecap="round"/>
      <line x1="12" y1="30" x2="128" y2="30" stroke="${C.stroke}" stroke-width="2.6" stroke-dasharray="6 4" stroke-linecap="round"/>`;
    register(id, '筛网', '实验小工具', {
      width: 140,
      height: 42,
      svg: body,
      search: 'sieve 筛网 分样筛 金属试验筛',
      ports: [{ id: 'surface', x: 70, y: 12, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // tlc-plate (58x184) — lane: (29, 148, seg:[13,148,45,148])
  {
    const id = 'tlc-plate';
    const plate = `<rect x="10" y="8" width="38" height="168" rx="1.5" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.0"/>
      <line x1="12" y1="26" x2="46" y2="26" stroke="${C.liquidLine}" stroke-width="1.3"/>
      <line x1="13" y1="148" x2="45" y2="148" stroke="${C.stroke}" stroke-width="1.5"/>`;
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
    const spot = `<circle cx="40" cy="40" r="22" fill="${C.leaf}" stroke="none"/>`;
    register(id, '色谱斑点', '测量与防护', {
      width: 80,
      height: 80,
      svg: spot,
      search: 'tlc spot 色谱斑点 显色斑点 层析斑点',
      ports: [{ id: 'spot', x: 40, y: 40, dx: 0, dy: 1, type: 'spot', diameter: 0 }],
    });
  }

  // vacuum-pump (184x118) — inlet: (72, 16, d=12)
  // C.steelBlue motor + ribbed silver compressor (matching Chemix)
  {
    const id = 'vacuum-pump';
    const body = `<path d="M67 42 V28 L65 26 L66 16 H78 L79 26 L77 28 V42 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>
      <path d="M36 42 V28 H60 V42" fill="none" stroke="${C.steelBlue}" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="14" y="42" width="76" height="62" rx="4" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="90" y="52" width="80" height="46" rx="4" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="96" y="54" width="68" height="42" fill="${C.chassisMid}" stroke="none"/>
      ${S.ventSlots(102, 60, 5, 56, 6)}
      <rect x="24" y="104" width="16" height="5" rx="1.5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.3"/>
      <rect x="144" y="98" width="16" height="11" rx="1.5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.3"/>`;
    register(id, '真空泵', '设备', {
      width: 184,
      height: 118,
      svg: body,
      search: 'vacuum pump 真空泵 隔膜真空泵 减压抽滤泵',
      ports: [{ id: 'inlet', x: 72, y: 16, dx: 0, dy: -1, type: 'tube', diameter: 12 }],
    });
  }

  // syringe-pump (180x110) — outlet: (10, 26, dx:-1, luer-male, d=8)
  // Wide sleek brushed-grey chassis + mounted syringe + clean 1.00 mL/h LCD (zero Pro bolt)
  {
    const id = 'syringe-pump';
    const chassis = `<rect x="16" y="46" width="154" height="54" rx="5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="20" y="50" width="146" height="46" rx="3" fill="${C.chassisMid}" stroke="none"/>
      <rect x="26" y="58" width="70" height="24" rx="2.5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.5"/>
      <rect x="29" y="61" width="64" height="18" rx="1.5" fill="${C.lcdPale}" stroke="none"/>
      ${S.screenText(61, 73, '1.00 mL/h', 8.2, C.lcdText)}
      <circle cx="114" cy="70" r="4" fill="${C.leaf}" stroke="${C.stroke}" stroke-width="1.2"/>
      <circle cx="130" cy="70" r="4" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="1.2"/>
      <circle cx="146" cy="70" r="4" fill="${C.amber}" stroke="${C.stroke}" stroke-width="1.2"/>
      <rect x="28" y="100" width="14" height="4" rx="1" fill="${C.darkPanel}"/>
      <rect x="144" y="100" width="14" height="4" rx="1" fill="${C.darkPanel}"/>`;
    const syringe = `<rect x="10" y="23" width="18" height="6" rx="1.2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.6"/>
      <rect x="28" y="15" width="80" height="22" rx="2" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="30" y="18" width="46" height="16" fill="${C.liquid}" stroke="none"/>
      ${S.gradTicks(40, 16, 76, 5, 2, 4, { dir: 1, vertical: false })}
      <rect x="76" y="17" width="10" height="18" rx="1.2" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.4"/>
      <line x1="86" y1="26" x2="142" y2="26" stroke="${C.stroke}" stroke-width="3.6" stroke-linecap="round"/>
      <rect x="108" y="11" width="5" height="30" rx="1.2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.4"/>
      <rect x="140" y="9" width="12" height="34" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    register(id, '注射泵', '设备', {
      width: 180,
      height: 110,
      svg: `${chassis}\n  ${syringe}`,
      search: 'syringe pump 注射泵 微量注射泵 精密进样泵',
      ports: [{ id: 'outlet', x: 10, y: 26, dx: -1, dy: 0, type: 'luer-male', diameter: 8 }],
    });
  }

  // gas-cylinder (84x228) — outlet: (66, 20, d=10)
  {
    const id = 'gas-cylinder';
    const valve = `<rect x="36" y="15" width="12" height="16" rx="1.5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="28" y="8" width="28" height="5" rx="2" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.6"/>
      <path d="M48 15 H66 V25 H48 Z" fill="${C.brass}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    const body = `<path d="M18 218 V62 C18 40 28 31 42 31 C56 31 66 40 66 62 V218 Q66 222 61 222 H23 Q18 222 18 218 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M19.5 62 C19.5 41 29 32.5 42 32.5 C55 32.5 64.5 41 64.5 62 Z" fill="${C.leaf}" stroke="none"/>
      <line x1="25" y1="74" x2="25" y2="206" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/>`;
    register(id, '气瓶', '设备', {
      width: 84,
      height: 228,
      svg: `${valve}\n  ${body}`,
      search: 'gas cylinder 气瓶 高压钢瓶 气体钢瓶 氮气瓶 氧气瓶',
      ports: [{ id: 'outlet', x: 66, y: 20, dx: 1, dy: 0, type: 'tube', diameter: 10 }],
    });
  }

  // ring-with-gauze [NEW] (184x36) — clamp: (10,18), surface: (126,11, seg:[82,11,170,11])
  {
    const id = 'ring-with-gauze';
    let wave = 'M78 14';
    for (let x = 78; x < 174; x += 12) wave += ` Q${x + 3} 9 ${x + 6} 14 Q${x + 9} 19 ${x + 12} 14`;
    const body = `${bossHead(10, 10, 16)}
      <rect x="23" y="16" width="54" height="4" rx="1" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.6"/>
      <ellipse cx="126" cy="18" rx="49" ry="5" fill="none" stroke="${C.stroke}" stroke-width="2.8"/>
      <path d="${wave}" fill="none" stroke="${C.inner}" stroke-width="2.4" stroke-linecap="round"/>`;
    register(id, '铁圈带石棉网', '加热', {
      width: 184,
      height: 36,
      svg: body,
      search: 'retort ring with wire gauze 铁圈带石棉网 铁架台铁圈陶土网 烧杯加热支撑',
      ports: [
        { id: 'clamp', x: 10, y: 18, dx: -1, dy: 0, type: 'clamp', diameter: 8 },
        surfacePort('surface', 82, 11, 170, 11),
      ],
    });
  }

  // combustion-spoon [NEW] (48x210) — probe: (24,196, immersible, d=18, seg:[24,36,24,190]), grip-site
  {
    const id = 'combustion-spoon';
    const cx = 24;
    const handle = `<path d="M${cx - 5.5} 16 A5.5 5.5 0 1 1 ${cx + 5.5} 16 V30 H${cx - 5.5} Z" fill="none" stroke="${C.stroke}" stroke-width="2.4"/>
      <rect x="12" y="28" width="24" height="6" rx="2.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="${cx - 2}" y="34" width="4" height="149" fill="${C.brass}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    const cup = `<path d="M${cx - 9.5} 182 H${cx + 9.5} C${cx + 9.5} 197 ${cx - 9.5} 197 ${cx - 9.5} 182 Z" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <ellipse cx="${cx}" cy="182" rx="9.5" ry="2.8" fill="${C.brassLight}" stroke="${C.stroke}" stroke-width="1.4"/>`;
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
  // Slender rod & thin beveled base
  {
    const id = 'retort-stand';
    const body = `<rect x="8" y="250" width="100" height="7" rx="3" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="25.5" y="10" width="5" height="240" rx="2.5" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.0"/>`;
    register(id, '铁架台', '支撑与夹持', {
      width: 116,
      height: 268,
      svg: body,
      search: 'retort stand ring stand 铁架台 铁架底座 支撑立杆',
      ports: [{ id: 'rail', x: 28, y: 120, dx: 0, dy: -1, type: 'rail', diameter: 7, segment: [28, 22, 28, 236] }],
    });
  }

  // clamp (184x32) — clamp: (10,16, d=8), grip: (164,16, d=22)
  {
    const id = 'clamp';
    const body = `${bossHead(10, 8, 16)}
      <rect x="23" y="14" width="108" height="4" rx="1" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.6"/>
      <path d="M130 13.5 L145 7 H172 Q175 7 175 10 Q175 12 171 12 H148 L134 15.5 Z" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M130 18.5 L145 25 H172 Q175 25 175 22 Q175 20 171 20 H148 L134 16.5 Z" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="1.6" stroke-linejoin="round"/>
      <circle cx="131" cy="16" r="4" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.5"/>`;
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
  // Clean blue-knob bosshead front view
  {
    const id = 'clamp-front';
    const body = `<rect x="10" y="18" width="64" height="8" rx="3" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.8"/>
      <circle cx="16" cy="22" r="9.5" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="86" cy="22" r="11" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="34" y="12" width="14" height="20" rx="3" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.8"/>`;
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
  // Slender rod + horizontal oval loop
  {
    const id = 'retort-ring';
    const body = `${bossHead(10, 6, 16)}
      <rect x="23" y="12" width="54" height="4" rx="1" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.6"/>
      <ellipse cx="127" cy="14" rx="49" ry="5" fill="none" stroke="${C.stroke}" stroke-width="2.8"/>`;
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
    const body = `<path d="M96 16 H40 C16 16 12 36 12 64 V98 C12 126 16 144 40 144 H96 V124 H44 C34 124 34 114 34 98 V64 C34 46 34 36 44 36 H96 Z" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round"/>
      <rect x="81" y="48" width="7" height="126" rx="2" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="70" y="42" width="29" height="7" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.6"/>
      <rect x="56" y="170" width="56" height="6" rx="2.5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.6"/>`;
    register(id, 'G 形夹', '支撑与夹持', {
      width: 124,
      height: 188,
      svg: body,
      search: 'g clamp c clamp G形夹 台面固定夹',
      ports: [],
    });
  }

  // test-tube-rack (160x106) — rack-40/73/106/139 mapped cleanly into open Chemix wooden frame
  {
    const id = 'test-tube-rack';
    const xs = [36, 65, 95, 124];
    const portIds = ['rack-40', 'rack-73', 'rack-106', 'rack-139'];
    const body = `<rect x="14" y="20" width="8" height="74" fill="${C.cork}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="138" y="20" width="8" height="74" fill="${C.cork}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="8" y="16" width="144" height="10" rx="2" fill="${C.cork}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="8" y="88" width="144" height="10" rx="2" fill="${C.cork}" stroke="${C.stroke}" stroke-width="2.2"/>`;
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
  {
    const id = 'test-tube-holder';
    const body = `<path d="M164 16 L82 16 C64 16 48 33 30 33 C14 33 12 22 18 19" fill="none" stroke="${C.inner}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M164 32 L82 32 C64 32 48 15 30 15 C14 15 12 26 18 29" fill="none" stroke="${C.inner}" stroke-width="2.6" stroke-linecap="round"/>
      <rect x="122" y="11" width="44" height="26" rx="6" fill="none" stroke="${C.inner}" stroke-width="2.6"/>`;
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
    const body = `<path d="M10 14 L84 8 H148 V17 H10 Z" fill="${C.amberLight}" stroke="${C.corkDark}" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M10 22 L84 28 H148 V19 H10 Z" fill="${C.amber}" stroke="${C.corkDark}" stroke-width="1.8" stroke-linejoin="round"/>
      <line x1="78" y1="10" x2="78" y2="26" stroke="${C.metalDark}" stroke-width="2.0" stroke-linecap="round"/>`;
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
    const body = `<path d="M14 10 H36 Q42 10 42 18 Q42 26 36 26 H14 Z" fill="none" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M14 32 H36 Q42 32 42 40 Q42 48 36 48 H14 Z" fill="none" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M42 18 L78 30 C108 38 134 38 158 31" fill="none" stroke="${C.stroke}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M42 40 L78 28 C108 20 134 20 158 27" fill="none" stroke="${C.stroke}" stroke-width="2.6" stroke-linecap="round"/>`;
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
    const body = `<path d="M144 8 C152 8 152 20 144 20 L48 19 L8 15 V13 L48 9 Z" fill="${C.chassisBot}" stroke="${C.inner}" stroke-width="1.8" stroke-linejoin="round"/>
      <line x1="140" y1="14" x2="10" y2="14" stroke="#FFFFFF" stroke-width="1.2"/>`;
    register(id, '镊子', '支撑与夹持', {
      width: 156,
      height: 28,
      svg: body,
      search: 'tweezers forceps 镊子 不锈钢镊子',
      ports: [],
    });
  }

  // fume-hood (176x176) — base: (88,168), surface: (88,154, seg:[18,154,158,154])
  // Tall open-interior Chemix cutaway frame
  {
    const id = 'fume-hood';
    const body = `<rect x="14" y="10" width="148" height="156" fill="#FFFFFF" stroke="none"/>
      <path d="M14 14 V162 H162 V14" fill="none" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round"/>
      <rect x="12" y="156" width="152" height="10" rx="1.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <line x1="20" y1="22" x2="20" y2="96" stroke="${C.liquidLine}" stroke-width="2.2" stroke-linecap="round"/>`;
    register(id, '通风橱', '设备', {
      width: 176,
      height: 176,
      svg: body,
      search: 'fume hood 通风橱 排风柜 化学通风柜',
      ports: [basePort(88, 168), surfacePort('surface', 18, 154, 158, 154)],
    });
  }

  // glove (130x140)
  {
    const id = 'glove';
    const body = `<path d="M40 124 L20 78 C13 62 24 54 34 66 L42 78 V28 C42 16 54 16 54 28 V58 V14 C54 4 68 4 68 14 V56 V18 C68 8 82 8 82 18 V60 V32 C82 20 96 20 96 32 V82 L112 64 C121 56 130 66 121 78 L100 124 Z" fill="none" stroke="${C.stroke}" stroke-width="3.2" stroke-linejoin="round"/>
      <rect x="38" y="118" width="64" height="9" rx="4" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.2"/>`;
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
    const body = `<path d="M16 14 Q82 4 148 14 L140 62 Q120 68 96 60 L82 46 L68 60 Q44 68 24 62 Z" fill="none" stroke="${C.stroke}" stroke-width="3.2" stroke-linejoin="round"/>
      <path d="M24 19 Q82 11 140 19 L133 54 Q114 59 96 52 L82 38 L68 52 Q50 59 31 54 Z" fill="${C.glass}" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>
      <path d="M36 28 L46 46 M112 26 L122 44" fill="none" stroke="${C.stroke}" stroke-width="1.6" stroke-linecap="round"/>`;
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
    const body = `<path d="M50 10 L22 24 L6 96 L24 100 L34 54 V158 H102 V54 L112 100 L130 96 L114 24 L86 10 L68 38 Z" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.6" stroke-linejoin="round"/>
      <path d="M50 10 L54 46 L68 38 M86 10 L82 46 L68 38" fill="none" stroke="${C.stroke}" stroke-width="1.8" stroke-linejoin="round"/>
      <line x1="68" y1="38" x2="68" y2="158" stroke="${C.stroke}" stroke-width="1.8"/>
      ${[52, 74, 96, 118].map((y) => `<circle cx="72" cy="${y}" r="2.0" fill="${C.stroke}"/>`).join('')}
      <rect x="38" y="98" width="18" height="24" rx="2" fill="none" stroke="${C.inner}" stroke-width="1.5"/>
      <rect x="80" y="98" width="18" height="24" rx="2" fill="none" stroke="${C.inner}" stroke-width="1.5"/>`;
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
    const body = `<path d="M70 10 L130 70 L70 130 L10 70 Z" fill="#FFFFFF" stroke="${C.subaRed}" stroke-width="8" stroke-linejoin="round"/>
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

  // table (200x40) — surface: (100, 8, seg:[6,8,194,8])
  {
    const id = 'table';
    const body = `<rect x="18" y="18" width="10" height="16" rx="1" fill="${C.corkDark}" stroke="${C.stroke}" stroke-width="1.6"/>
      <rect x="172" y="18" width="10" height="16" rx="1" fill="${C.corkDark}" stroke="${C.stroke}" stroke-width="1.6"/>
      <rect x="6" y="8" width="188" height="10" rx="2" fill="${C.cork}" stroke="${C.corkDark}" stroke-width="1.8"/>`;
    register(id, '实验桌', '设备', {
      width: 200,
      height: 40,
      svg: body,
      search: 'lab bench table 实验桌 实验台 化学操作台',
      ports: [surfacePort('surface', 6, 8, 194, 8)],
    });
  }

  // spatula (152x90) — probe: (18, 76, dx:-1, d=10, seg:[54,76,18,76])
  // Sleek Chemix bent spatula keeping >=30px horizontal collinear probe segment
  {
    const id = 'spatula';
    const body = `<path d="M138 14 L54 76 H12" fill="none" stroke="${C.stroke}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    register(id, '药匙', '实验小工具', {
      width: 152,
      height: 90,
      svg: body,
      search: 'spatula 药匙 不锈钢药匙 取药勺',
      ports: [{ id: 'probe', x: 18, y: 76, dx: -1, dy: 0, type: 'probe', diameter: 10, segment: [54, 76, 18, 76] }],
    });
  }

  // corkborer (110x130)
  {
    const id = 'corkborer';
    const body = `<rect x="48" y="26" width="14" height="92" rx="1.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <line x1="51.5" y1="32" x2="51.5" y2="112" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>
      <rect x="16" y="10" width="78" height="16" rx="7" fill="${C.subaRed}" stroke="${C.stroke}" stroke-width="2.0"/>`;
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
    const body = `<path d="M40 62 L124 14 L116 26 L58 64 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>
      <path d="M54 66 L48 10 L58 18 L66 64 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>
      <ellipse cx="28" cy="76" rx="16" ry="11" fill="none" stroke="${C.subaRed}" stroke-width="5.5"/>
      <ellipse cx="80" cy="88" rx="16" ry="11" fill="none" stroke="${C.subaRed}" stroke-width="5.5"/>
      <circle cx="58" cy="61" r="4" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.6"/>`;
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
    const body = `<rect x="44" y="88" width="12" height="72" rx="5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="50" cy="50" r="40" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.6"/>
      <circle cx="50" cy="50" r="34" fill="${C.chassisTop}" stroke="${C.inner}" stroke-width="1.5"/>`;
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
    const body = `<ellipse cx="46" cy="161" rx="34" ry="6.5" fill="${C.chassisBot}" stroke="${C.inner}" stroke-width="1.8"/>
      <path d="M46 156 L22 92 L82 40" fill="none" stroke="${C.chassisBot}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="22" cy="92" r="5.5" fill="${C.metalDark}" stroke="${C.inner}" stroke-width="1.5"/>
      <path d="M70 22 C86 8 110 12 120 30 L134 66 L76 76 Z" fill="${C.metalDark}" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>
      <ellipse cx="106" cy="71" rx="20" ry="5" transform="rotate(-10 106 71)" fill="${C.amberLight}" stroke="none"/>`;
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
          `<path d="M54 58 C47 22 76 16 70 46 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.6" transform="rotate(${deg} 54 58)"/>`
      )
      .join('');
    const body = `<rect x="49" y="106" width="10" height="52" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <ellipse cx="54" cy="161" rx="34" ry="6.5" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="54" cy="58" r="46" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.4"/>
      <circle cx="54" cy="58" r="40" fill="none" stroke="${C.tick}" stroke-width="1.2"/>
      ${blades}
      <circle cx="54" cy="58" r="9" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.8"/>`;
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
    const body = `<rect x="81" y="96" width="14" height="24" fill="${C.chassisBot}" stroke="${C.muted}" stroke-width="1.6"/>
      <rect x="54" y="120" width="68" height="5" rx="2" fill="${C.chassisBot}" stroke="${C.muted}" stroke-width="1.6"/>
      <rect x="10" y="10" width="156" height="88" rx="4" fill="${C.chassisMid}" stroke="${C.muted}" stroke-width="2.0"/>
      <rect x="17" y="17" width="142" height="74" rx="2" fill="#8EA2B6" stroke="${C.inner}" stroke-width="1.2"/>`;
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
    const body = `<path d="M40 34 L50 18 H84 L94 34 Z" fill="${C.darkPanel}" stroke="none"/>
      <rect x="10" y="34" width="116" height="96" rx="8" fill="${C.darkPanel}" stroke="none"/>
      <circle cx="68" cy="84" r="30" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="68" cy="84" r="20" fill="${C.stroke}" stroke="none"/>
      <circle cx="68" cy="84" r="12" fill="${C.glass}" stroke="${C.steelBlue}" stroke-width="1.5"/>`;
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
    const body = `<rect x="12" y="20" width="114" height="58" rx="6" fill="${C.darkPanel}" stroke="none"/>
      <circle cx="102" cy="34" r="4" fill="${C.subaRed}"/>
      <path d="M126 32 L164 20 V78 L126 66 Z" fill="${C.darkPanel}" stroke="none"/>`;
    register(id, '摄像机', '设备', {
      width: 176,
      height: 90,
      svg: body,
      search: 'videocamera camcorder 摄像机 录像机',
      ports: [],
    });
  }

  // pencil (160x30) — probe: (150, 15, d=10, seg:[110,15,150,15])
  {
    const id = 'pencil';
    const body = `<rect x="8" y="10" width="122" height="10" rx="1" fill="${C.amber}" stroke="${C.stroke}" stroke-width="1.8"/>
      <path d="M130 10 L152 15 L130 20 Z" fill="${C.corkLight}" stroke="${C.stroke}" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M144 13 L152 15 L144 17 Z" fill="${C.stroke}"/>`;
    register(id, '铅笔', '实验小工具', {
      width: 160,
      height: 30,
      svg: body,
      search: 'pencil 铅笔 绘图铅笔 色谱画线铅笔',
      ports: [{ id: 'probe', x: 150, y: 15, dx: 1, dy: 0, type: 'probe', diameter: 10, segment: [108, 15, 150, 15] }],
    });
  }

  // felt-tip-pen (160x32) — probe: (150, 16, d=10, seg:[108,16,150,16])
  {
    const id = 'felt-tip-pen';
    const body = `<rect x="8" y="9" width="110" height="14" rx="4" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.8"/>
      <path d="M118 9 L142 13 V19 L118 23 Z" fill="${C.subaRed}" stroke="${C.stroke}" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M142 14 L152 15.2 V16.8 L142 18 Z" fill="${C.subaRed}"/>`;
    register(id, '记号笔', '实验小工具', {
      width: 160,
      height: 32,
      svg: body,
      search: 'marker felt tip pen 记号笔 玻璃记号笔 标签笔',
      ports: [{ id: 'probe', x: 150, y: 16, dx: 1, dy: 0, type: 'probe', diameter: 10, segment: [108, 16, 150, 16] }],
    });
  }

  // adhesive-tape (150x60)
  {
    const id = 'adhesive-tape';
    const body = `<path d="M10 22 H138 L132 30 L138 38 H10 L16 30 Z" fill="${C.iceFill}" stroke="${C.iceEdge}" stroke-width="1.8" stroke-linejoin="round"/>`;
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
    const body = `<path d="${d}" fill="none" stroke="${C.stroke}" stroke-width="3.6" stroke-linecap="round"/>`;
    register(id, '回形针', '实验小工具', {
      width: 56,
      height: 120,
      svg: body,
      search: 'paperclip 回形针 金属曲别针',
      ports: [],
    });
  }

  // wooden-splint (44x168) — probe: (22, 158, d=10, seg:[22,120,22,158])
  {
    const id = 'wooden-splint';
    const body = `<rect x="17" y="10" width="10" height="148" rx="5" fill="${C.corkLight}" stroke="${C.corkDark}" stroke-width="1.4"/>`;
    register(id, '木条', '实验小工具', {
      width: 44,
      height: 168,
      svg: body,
      search: 'wooden splint 木条 带火星木条 燃着木条 气体检验',
      ports: [{ id: 'probe', x: 22, y: 158, dx: 0, dy: 1, type: 'probe', diameter: 10, segment: [22, 118, 22, 158] }],
    });
  }

  // cotton-wool (120x120)
  {
    const id = 'cotton-wool';
    const body = `<path d="M22 76 C10 56 20 32 40 36 C48 16 78 14 90 34 C110 24 116 54 102 74 C108 92 88 100 72 94 C56 102 32 98 22 76 Z" fill="${C.chassisTop}" stroke="${C.tick}" stroke-width="2.4" stroke-linejoin="round"/>`;
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
    for (let i = 0; i < 18; i++) {
      const y0 = 26 + ((i * 19) % 52);
      const y1 = 18 + ((i * 23) % 72);
      strands += `<path d="M${18 + i * 3} ${y0} C${108 - i * 3} ${10 + i * 5} ${24 + i * 5} ${98 - i * 3} ${120 - i * 2.5} ${y1}" fill="none" stroke="${i % 2 ? C.muted : C.tick}" stroke-width="1.8" stroke-linecap="round"/>`;
    }
    register(id, '钢丝绒', '物质与填充', {
      width: 140,
      height: 110,
      svg: strands,
      search: 'steel wool 钢丝绒 铁丝绵',
      ports: [],
    });
  }

  // glass-wool (120x110)
  {
    const id = 'glass-wool';
    const body = `<path d="M20 74 C8 54 20 32 40 36 C48 18 78 14 90 34 C110 22 114 52 102 72 C108 88 88 96 74 90 C56 98 30 94 20 74 Z" fill="${C.chassisMid}" stroke="${C.inner}" stroke-width="2.6" stroke-linejoin="round"/>`;
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
    const body = `<path d="M18 14 H78 L84 24 V136 L76 146 H20 L12 136 V24 Z" fill="${C.subaRed}" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>
      <rect x="14" y="14" width="68" height="6" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.6"/>
      <rect x="16" y="138" width="64" height="6" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.6"/>
      <line x1="26" y1="28" x2="26" y2="128" stroke="#FFFFFF" stroke-width="3.0" stroke-linecap="round" opacity="0.45"/>`;
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
    const body = `<path d="M18 156 V56 H80 Q98 56 98 76 V94 H78 V76 H38 V156 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <rect x="12" y="148" width="32" height="10" rx="2.5" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="75" y="88" width="26" height="6" rx="1.5" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.6"/>
      <rect x="40" y="42" width="32" height="14" rx="2" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="53" y="18" width="6" height="24" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.6"/>
      <rect x="30" y="12" width="52" height="7" rx="3" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="1.8"/>`;
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
    const body = `<path d="M56 130 C44 138 64 144 56 154" fill="none" stroke="${C.stroke}" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M51 120 L49 130 H63 L61 120 Z" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>
      <path d="M56 8 C86 8 102 34 98 66 C94 98 76 120 56 120 C36 120 18 98 14 66 C10 34 26 8 56 8 Z" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
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
    const arms = `<path d="M80 21 H34 C18 21 16 10 26 10 M80 31 H34 C18 31 16 42 26 42" fill="none" stroke="${C.stroke}" stroke-width="4.4" stroke-linecap="round"/>
      <path d="M80 21 H34 C18 21 16 10 26 10 M80 31 H34 C18 31 16 42 26 42" fill="none" stroke="${C.chassisMid}" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M104 21 H150 C166 21 168 10 158 10 M104 31 H150 C166 31 168 42 158 42" fill="none" stroke="${C.stroke}" stroke-width="4.4" stroke-linecap="round"/>
      <path d="M104 21 H150 C166 21 168 10 158 10 M104 31 H150 C166 31 168 42 158 42" fill="none" stroke="${C.chassisMid}" stroke-width="1.8" stroke-linecap="round"/>`;
    const detail = `<rect x="32" y="16" width="12" height="20" rx="3" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="1.6"/>
      <rect x="140" y="16" width="12" height="20" rx="3" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="1.6"/>
      <rect x="18" y="9.5" width="7" height="6.5" rx="2" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="1.3"/>
      <rect x="18" y="36" width="7" height="6.5" rx="2" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="1.3"/>
      <rect x="159" y="9.5" width="7" height="6.5" rx="2" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="1.3"/>
      <rect x="159" y="36" width="7" height="6.5" rx="2" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="1.3"/>
      <rect x="81" y="14" width="22" height="24" rx="3" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="92" cy="26" r="4.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.4"/>`;
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
    const body = `<path d="M20 18 H68 M20 30 H68" fill="none" stroke="${C.stroke}" stroke-width="5.2" stroke-linecap="round"/>
      <path d="M20 18 H68 M20 30 H68" fill="none" stroke="${C.chassisBot}" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M26 18 V44 L64 80 M62 18 V44 L24 80" fill="none" stroke="${C.stroke}" stroke-width="4.4" stroke-linecap="round"/>
      <path d="M26 18 V44 L64 80 M62 18 V44 L24 80" fill="none" stroke="${C.chassisBot}" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="44" cy="52" r="3.8" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.4"/>
      <rect x="16" y="72" width="15" height="14" rx="3" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="1.6"/>
      <rect x="57" y="72" width="15" height="14" rx="3" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="1.6"/>`;
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
  // Sleek light-silver balance + slanted C.lcdCyan 0.00 g LCD + crisp ON/TARE
  {
    const id = 'balance';
    const body = `<rect x="26" y="10" width="144" height="4" rx="1.5" fill="${C.chassisBot}" stroke="${C.muted}" stroke-width="1.2"/>
      <rect x="88" y="14" width="20" height="4" fill="${C.chassisBot}" stroke="none"/>
      <path d="M12 45 L24 18 H172 L184 45 Z" fill="${C.chassisTop}" stroke="${C.muted}" stroke-width="1.6" stroke-linejoin="round"/>
      <rect x="16" y="45" width="164" height="4" rx="1.5" fill="${C.chassisBot}" stroke="none"/>
      <polygon points="88,23 170,23 176,41 84,41" fill="${C.lcdCyan}" stroke="${C.chassisBot}" stroke-width="1.2" stroke-linejoin="round"/>
      ${S.screenText(130, 35.5, '0.00 g', 9.5, C.lcdText)}
      <rect x="24" y="29" width="20" height="9" rx="2" fill="${C.amberLight}" stroke="none"/>
      ${S.labelText(34, 35.5, 'ON', 5.8, C.inner)}
      <rect x="48" y="29" width="26" height="9" rx="2" fill="${C.amberLight}" stroke="none"/>
      ${S.labelText(61, 35.5, 'TARE', 5.4, C.inner)}`;
    register(id, '电子天平', '设备', {
      width: 196,
      height: 56,
      svg: body,
      search: 'balance electronic scale 电子天平 分析天平 精密称量天平',
      ports: [{ id: 'surface', x: 98, y: 10, dx: 0, dy: -1, type: 'surface', diameter: 0 }],
    });
  }

  // digital-thermometer (64x200) — probe: (32, 190, d=7, seg:[32,140,32,190])
  // #3A3E44 dark body + 20°C + red dot + stainless stem
  {
    const id = 'digital-thermometer';
    const body = `<rect x="29.5" y="72" width="5" height="118" rx="2.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.8"/>
      <path d="M10 12 Q10 8 14 8 H50 Q54 8 54 12 V42 L42 64 V72 H22 V64 L10 42 Z" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="2.0" stroke-linejoin="round"/>
      <rect x="16" y="15" width="32" height="20" rx="2" fill="${C.lcdPale}" stroke="none"/>
      ${S.screenText(32, 28.5, '20°C', 8.5, C.lcdText)}
      <circle cx="32" cy="49" r="5.5" fill="${C.subaRed}" stroke="none"/>`;
    register(id, '数字温度计', '测量', {
      width: 64,
      height: 200,
      svg: body,
      search: 'digital thermometer 数字温度计 数显温度探针 测温仪',
      ports: [{ id: 'probe', x: 32, y: 190, dx: 0, dy: 1, type: 'probe', diameter: 7, segment: [32, 140, 32, 190] }],
    });
  }

  // ruler (184x34)
  {
    const id = 'ruler';
    let ticks = '';
    for (let i = 0; i <= 30; i++) {
      const x = 17 + i * 5;
      const major = i % 5 === 0;
      ticks += `<line x1="${x}" y1="8" x2="${x}" y2="${major ? 18 : 13}" stroke="${C.inner}" stroke-width="${major ? 1.2 : 0.8}"/>`;
    }
    const body = `<rect x="8" y="8" width="168" height="18" rx="1.5" fill="${C.porcelainMid}" stroke="${C.muted}" stroke-width="1.6"/>
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
    for (let x = 70; x < 156; x += 8) ticks += strokeLine(x, 22, x, x % 16 === 6 ? 31 : 27, 1.0, C.stroke);
    const body = `<rect x="64" y="22" width="94" height="15" rx="1" fill="${C.amber}" stroke="${C.stroke}" stroke-width="1.6"/>
      <rect x="154" y="21" width="6" height="17" rx="1" fill="${C.darkPanel}"/>
      ${ticks}
      <rect x="8" y="14" width="56" height="26" rx="4" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.8"/>`;
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
      ticks += `<line x1="${r(80 - rOuter * Math.cos(t))}" y1="${r(84 - rOuter * Math.sin(t))}" x2="${r(80 - rInner * Math.cos(t))}" y2="${r(84 - rInner * Math.sin(t))}" stroke="${C.inner}" stroke-width="${major ? 1.3 : 0.9}"/>`;
    }
    const body = `<path d="M10 84 A70 70 0 0 1 150 84 Z" fill="${C.chassisTop}" stroke="${C.inner}" stroke-width="2.0" stroke-linejoin="round"/>
      <path d="M44 84 A36 36 0 0 1 116 84 Z" fill="#FFFFFF" stroke="${C.muted}" stroke-width="1.4"/>
      ${ticks}
      <circle cx="80" cy="78" r="1.8" fill="${C.inner}"/>`;
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
      ticks += `<line x1="${r(65 + 31 * Math.sin(t))}" y1="${r(60 - 31 * Math.cos(t))}" x2="${r(65 + 36 * Math.sin(t))}" y2="${r(60 - 36 * Math.cos(t))}" stroke="${C.inner}" stroke-width="${i % 3 === 0 ? 1.8 : 1.0}"/>`;
    }
    const body = `<rect x="58" y="6" width="14" height="14" rx="2" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.6"/>
      <rect x="94" y="20" width="9" height="12" rx="1.5" transform="rotate(38 98 26)" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.4"/>
      <circle cx="65" cy="60" r="44" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.4"/>
      <circle cx="65" cy="60" r="37" fill="#FFFFFF" stroke="${C.inner}" stroke-width="1.4"/>
      ${ticks}
      <line x1="65" y1="60" x2="65" y2="30" stroke="${C.stroke}" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="65" y1="60" x2="88" y2="68" stroke="${C.subaRed}" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="65" cy="60" r="3.4" fill="${C.darkPanel}"/>`;
    register(id, '秒表', '设备', {
      width: 130,
      height: 110,
      svg: body,
      search: 'timer stopwatch 秒表 计时器 实验秒表',
      ports: [],
    });
  }

  // ph-probe (132x176) — probe: (110, 166, d=8, seg:[110,120,110,166])
  // Compact 7.0 pH box wired by smooth curved lead to vertical glass electrode on right
  {
    const id = 'ph-probe';
    const box = `<rect x="8" y="24" width="54" height="62" rx="5" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="14" y="31" width="42" height="22" rx="2" fill="${C.lcdPale}" stroke="${C.inner}" stroke-width="1.2"/>
      ${S.screenText(35, 45.5, '7.0 pH', 8.2, C.lcdText)}
      <circle cx="24" cy="68" r="5" fill="${C.leaf}" stroke="${C.stroke}" stroke-width="1.2"/>
      <circle cx="46" cy="68" r="5" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="1.2"/>`;
    const lead = `<path d="M62 62 C86 62 76 112 96 96 C106 88 110 74 110 54" fill="none" stroke="${C.stroke}" stroke-width="2.0" stroke-linecap="round"/>`;
    const electrode = `<rect x="106.5" y="54" width="7" height="104" rx="1.5" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="2.0"/>
      <line x1="110" y1="58" x2="110" y2="152" stroke="${C.muted}" stroke-width="1.4"/>
      <circle cx="110" cy="161.5" r="4.8" fill="${C.liquid}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="105" y="48" width="10" height="10" rx="2" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.6"/>`;
    register(id, 'pH 探头', '测量', {
      width: 132,
      height: 176,
      svg: `${lead}\n  ${box}\n  ${electrode}`,
      search: 'ph probe ph electrode meter pH探头 酸度计电极 pH计',
      ports: [{ id: 'probe', x: 110, y: 166, dx: 0, dy: 1, type: 'probe', diameter: 8, segment: [110, 120, 110, 166] }],
    });
  }

  // ph-paper (76x160)
  {
    const id = 'ph-paper';
    const cols = [C.subaRed, C.amber, C.leaf, C.steelBlue];
    const strips = cols
      .map(
        (col, i) =>
          `<rect x="${10 + i * 14}" y="12" width="12" height="136" rx="1.5" fill="${col}" stroke="${C.stroke}" stroke-width="1.8"/>`
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
    const body = `<rect x="12" y="12" width="22" height="136" rx="1.5" fill="${C.subaRed}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="42" y="12" width="22" height="136" rx="1.5" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    register(id, '石蕊试纸', '测量与防护', {
      width: 76,
      height: 160,
      svg: body,
      search: 'litmus paper 石蕊试纸 红蓝石蕊试纸 酸碱指示试纸',
      ports: [],
    });
  }

  // electrode (54x176) — wire: (27, 14, dx:0, dy:-1, d=12, seg:[27,14,27,158])
  {
    const id = 'electrode';
    const body = `<rect x="19" y="14" width="16" height="148" rx="7" fill="${C.chassisBot}" stroke="${C.inner}" stroke-width="2.0"/>
      <line x1="23" y1="22" x2="23" y2="154" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" opacity="0.6"/>`;
    register(id, '电极', '实验小工具', {
      width: 54,
      height: 176,
      svg: body,
      search: 'electrode 电极 金属电极 石墨电极 铂电极',
      ports: [{ id: 'wire', x: 27, y: 14, dx: 0, dy: -1, type: 'wire', diameter: 12, segment: [27, 14, 27, 158] }],
    });
  }

  // dynamometer (58x210) — hook: (29, 196)
  {
    const id = 'dynamometer';
    let ticks = '';
    for (let y = 36; y <= 144; y += 9) {
      ticks += `<line x1="20" y1="${y}" x2="${y % 18 === 0 ? 29 : 25}" y2="${y}" stroke="${C.inner}" stroke-width="1.3" stroke-linecap="round"/>`;
    }
    const body = `<rect x="14" y="16" width="30" height="146" rx="4" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="20" y="26" width="18" height="126" rx="2" fill="${C.chassisTop}" stroke="${C.inner}" stroke-width="1.3"/>
      ${ticks}
      <line x1="20" y1="120" x2="38" y2="120" stroke="${C.subaRed}" stroke-width="2.4" stroke-linecap="round"/>
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
  // #3A3E44 dark body + bright C.lcdGreen 12 V LCD + dial + red/black jacks
  {
    const id = 'multimeter';
    const body = `<rect x="12" y="10" width="92" height="176" rx="9" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="2.4"/>
      <rect x="20" y="20" width="76" height="36" rx="3" fill="${C.lcdGreen}" stroke="${C.stroke}" stroke-width="1.6"/>
      ${S.screenText(58, 43, '12 V', 14, C.lcdText)}
      <circle cx="32" cy="68" r="3" fill="${C.amber}"/>
      <circle cx="46" cy="68" r="3" fill="${C.chassisBot}"/>
      <circle cx="70" cy="68" r="3" fill="${C.chassisBot}"/>
      <circle cx="84" cy="68" r="3" fill="${C.chassisBot}"/>
      <circle cx="58" cy="112" r="24" fill="${C.inner}" stroke="${C.stroke}" stroke-width="2.0"/>
      <line x1="58" y1="112" x2="46" y2="96" stroke="${C.chassisTop}" stroke-width="3.0" stroke-linecap="round"/>
      ${S.bindingPost(34, 168, C.subaRed, '', 0, 7)}
      ${S.bindingPost(82, 168, C.stroke, '', 0, 7)}`;
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
  {
    const id = 'microscope';
    const base = `<path d="M16 186 H124 L120 172 H20 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <ellipse cx="56" cy="158" rx="18" ry="6" fill="${C.liquid}" stroke="${C.stroke}" stroke-width="1.6"/>`;
    const arm = `<path d="M112 172 V78 C112 40 94 26 68 28 L60 44 C82 42 94 56 94 84 V172 Z" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      ${S.rotaryKnob(id, 102, 138, 10, 20)}`;
    const stage = `<rect x="16" y="128" width="80" height="6" rx="1.5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="40" y="134" width="32" height="5" rx="1" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.4"/>`;
    const head = `<g transform="translate(56, 56) rotate(22)">
        <rect x="-8.5" y="-42" width="17" height="68" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
        <rect x="-6.5" y="-50" width="13" height="8" rx="1.5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.6"/>
        <rect x="-8" y="27" width="7" height="15" rx="1.5" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.6"/>
        <rect x="2" y="27" width="7" height="12" rx="1.5" transform="rotate(-18 6 27)" fill="${C.metalDark}" stroke="${C.stroke}" stroke-width="1.5"/>
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
    const body = `<circle cx="48" cy="14" r="4" fill="none" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="40" y="17" width="16" height="10" rx="3" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="36" y="27" width="24" height="8" rx="2" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.0"/>
      <path d="M20 46 C20 37 28 35 48 35 C68 35 76 37 76 46 V120 Q76 126 68 126 H28 Q20 126 20 120 Z" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
      <rect x="21" y="117" width="54" height="7" rx="1.5" fill="${C.brassDark}" stroke="none"/>
      <line x1="28" y1="52" x2="28" y2="110" stroke="${C.brassLight}" stroke-width="2.0" stroke-linecap="round"/>
      ${S.labelText(48, 86, '100 g', 11.5, C.stroke)}`;
    register(id, '砝码', '测量', {
      width: 96,
      height: 136,
      svg: body,
      search: 'calibration weight brass weight 砝码 托盘天平砝码 金属砝码',
      ports: [basePort(48, 126), { id: 'hook', x: 48, y: 14, dx: 0, dy: -1, type: 'hook', diameter: 0 }],
    });
  }
};
