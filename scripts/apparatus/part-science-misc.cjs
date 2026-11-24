'use strict';

const S = require('./svg-style.cjs');
const {
  C, r, rad, safeId,
  chassis, oledScreen, screenText, labelText, rotaryKnob, bindingPost,
} = S;

/**
 * Registers all 72 electrical, optical, mechanics, biological specimen,
 * substance/fill, and diagram annotation items in the Round-6 Chemix
 * Minimalist Neutral Style (zero gradients, zero url(#...), pale/lime LCDs).
 */
module.exports = function registerScienceMisc(register) {
  const add = (slug, name, category, width, height, bodyFn, opts = {}) => {
    const p = safeId(slug);
    register(slug, name, category, {
      width,
      height,
      ports: opts.ports || [],
      boreCount: opts.boreCount ?? -1,
      neckCount: opts.neckCount ?? 0,
      search: opts.search || `${slug.replaceAll('-', ' ')} ${name}`,
      svg: bodyFn(p, width, height),
    });
  };

  // =========================================================================
  // 1. ELECTRICAL & MAGNETICS (13)
  // =========================================================================

  // 1. cable (clean horizontal crimson flex wave; exact inlet/outlet wire ports)
  add('cable', '电缆', '导管', 180, 60, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 30 C64 8 116 52 172 30" fill="none" stroke="${C.traceRed}" stroke-width="3.4"/>
    </g>
  `, {
    ports: [
      { id: 'inlet', x: 8, y: 30, dx: -1, dy: 0, type: 'wire', diameter: 4, segment: [12, 30, 44, 30], edge: [8, 28, 8, 32] },
      { id: 'outlet', x: 172, y: 30, dx: 1, dy: 0, type: 'wire', diameter: 4, segment: [168, 30, 136, 30], edge: [172, 32, 172, 28] },
    ],
  });

  // 2. powerpack (182x102 light-silver brushed PSU + I/O rocker + 0-12 dial + AC/DC sockets)
  add('powerpack', '直流电源', '电学', 182, 102, (p) => {
    const cx = 74;
    const cy = 52;
    let dialMarks = '';
    for (let i = 0; i <= 12; i++) {
      const deg = -135 + (270 * i) / 12;
      const a = rad(deg - 90);
      const x1 = cx + Math.cos(a) * 15.5;
      const y1 = cy + Math.sin(a) * 15.5;
      const x2 = cx + Math.cos(a) * (i % 2 === 0 ? 19.2 : 17.8);
      const y2 = cy + Math.sin(a) * (i % 2 === 0 ? 19.2 : 17.8);
      dialMarks += `<line x1="${r(x1)}" y1="${r(y1)}" x2="${r(x2)}" y2="${r(y2)}" stroke="${C.inner}" stroke-width="${i % 2 === 0 ? 1.2 : 0.9}"/>`;
      if (i % 2 === 0) {
        const lx = cx + Math.cos(a) * 24.5;
        const ly = cy + Math.sin(a) * 24.5 + 2.0;
        dialMarks += labelText(lx, ly, String(i), 5.6, C.inner, 'middle', true);
      }
    }
    return `<g stroke-linecap="round" stroke-linejoin="round">
      <rect x="5" y="5" width="172" height="90" rx="5" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.4"/>
      <rect x="9" y="9" width="164" height="82" rx="3" fill="${C.chassisTop}" stroke="${C.chassisBot}" stroke-width="1.0"/>
      <!-- Left rocker switch -->
      <rect x="14" y="22" width="18" height="36" rx="2" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="17" y="25" width="12" height="15" rx="1" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="1.0"/>
      ${labelText(23, 35, 'O', 5.8, '#FFFFFF', 'middle', true)}
      ${labelText(23, 52, 'I', 6.2, '#FFFFFF', 'middle', true)}
      <!-- Center 0-12V rotary voltage dial -->
      ${dialMarks}
      ${rotaryKnob(p, cx, cy, 12.5, 42, { dark: true })}
      <!-- AC & DC brackets + jacks -->
      <path d="M118 22 H130 M152 22 H164" fill="none" stroke="${C.muted}" stroke-width="1.2"/>
      ${labelText(141, 24, 'AC', 6.5, C.inner, 'middle', true)}
      ${bindingPost(126, 36, C.amber, '', 0, 5.8)}
      ${bindingPost(156, 36, C.amber, '', 0, 5.8)}
      <path d="M118 57 H130 M152 57 H164" fill="none" stroke="${C.muted}" stroke-width="1.2"/>
      ${labelText(141, 59, 'DC', 6.5, C.inner, 'middle', true)}
      ${bindingPost(126, 74, C.crimson, '+', 13, 6.0)}
      ${bindingPost(156, 74, C.stroke, '−', 13, 6.0)}
    </g>`;
  }, {
    ports: [
      { id: 'positive', x: 126, y: 74, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'negative', x: 156, y: 74, dx: 0, dy: 1, type: 'wire', diameter: 0 },
    ],
  });

  // 3. battery (clean copper-top + dark charcoal cell; zero micro text)
  add('battery', '电池', '电学', 90, 170, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="34" y="13" width="22" height="11" rx="3" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.4"/>
      <rect x="26" y="148" width="38" height="8" rx="2.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="21" y="24" width="48" height="124" rx="5.5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="2.6"/>
      <path d="M22.2 29.5 Q22.2 25.2 26.5 25.2 H63.5 Q67.8 25.2 67.8 29.5 V62 H22.2 Z" fill="${C.copper}" stroke="none"/>
      <line x1="21" y1="62" x2="69" y2="62" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="27" y="30" width="5.5" height="112" rx="2" fill="#FFFFFF" fill-opacity="0.24" stroke="none"/>
    </g>
  `, {
    ports: [
      { id: 'positive', x: 45, y: 15, dx: 0, dy: -1, type: 'wire', diameter: 0 },
      { id: 'negative', x: 45, y: 154, dx: 0, dy: 1, type: 'wire', diameter: 0 },
    ],
  });

  // 4. digital-ammeter (164x112 light-silver body + large #CBE590 LCD + black/red jacks)
  add('digital-ammeter', '数字电流表', '电学', 164, 112, (p) => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="5" y="5" width="154" height="100" rx="7" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.4"/>
      <rect x="9" y="9" width="146" height="92" rx="5" fill="${C.chassisTop}" stroke="${C.chassisBot}" stroke-width="1.0"/>
      <rect x="16" y="15" width="132" height="45" rx="4" fill="${C.lcdGreen}" stroke="${C.stroke}" stroke-width="2.0"/>
      ${screenText(34, 45, 'A', 17, C.inner, 'middle')}
      ${screenText(98, 46, '12.00', 20, C.lcdText, 'middle')}
      ${bindingPost(42, 82, C.stroke, '', 0, 7.2)}
      ${bindingPost(122, 82, C.crimson, '', 0, 7.2)}
    </g>
  `, {
    ports: [
      { id: 'negative', x: 42, y: 82, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'positive', x: 122, y: 82, dx: 0, dy: 1, type: 'wire', diameter: 0 },
    ],
  });

  // 5. digital-voltmeter (164x112 light-silver body + large #CBE590 LCD + black/red jacks)
  add('digital-voltmeter', '数字电压表', '电学', 164, 112, (p) => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="5" y="5" width="154" height="100" rx="7" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.4"/>
      <rect x="9" y="9" width="146" height="92" rx="5" fill="${C.chassisTop}" stroke="${C.chassisBot}" stroke-width="1.0"/>
      <rect x="16" y="15" width="132" height="45" rx="4" fill="${C.lcdGreen}" stroke="${C.stroke}" stroke-width="2.0"/>
      ${screenText(34, 45, 'V', 17, C.inner, 'middle')}
      ${screenText(98, 46, '12.00', 20, C.lcdText, 'middle')}
      ${bindingPost(42, 82, C.stroke, '', 0, 7.2)}
      ${bindingPost(122, 82, C.crimson, '', 0, 7.2)}
    </g>
  `, {
    ports: [
      { id: 'negative', x: 42, y: 82, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'positive', x: 122, y: 82, dx: 0, dy: 1, type: 'wire', diameter: 0 },
    ],
  });

  // 6. resistor (sleek ceramic beige dog-bone body + 4 color bands + clean steel leads)
  add('resistor', '电阻', '电学', 180, 150, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <line x1="10" y1="75" x2="46" y2="75" stroke="${C.stroke}" stroke-width="3.2"/>
      <line x1="134" y1="75" x2="170" y2="75" stroke="${C.stroke}" stroke-width="3.2"/>
      <path d="M46 64 Q46 56 56 56 H63 Q68 60 73 60 H107 Q112 60 117 56 H124 Q134 56 134 64 V86 Q134 94 124 94 H117 Q112 90 107 90 H73 Q68 90 63 94 H56 Q46 94 46 86 Z" fill="#EAE0CE" stroke="${C.stroke}" stroke-width="2.4"/>
      <rect x="57" y="57.2" width="6" height="35.6" fill="#9E5EA8" stroke="none"/>
      <rect x="76" y="61" width="6" height="28" fill="${C.stroke}" stroke="none"/>
      <rect x="91" y="61" width="6" height="28" fill="${C.crimson}" stroke="none"/>
      <rect x="117" y="57.2" width="6" height="35.6" fill="${C.amber}" stroke="none"/>
      <path d="M46 64 Q46 56 56 56 H63 Q68 60 73 60 H107 Q112 60 117 56 H124 Q134 56 134 64 V86 Q134 94 124 94 H117 Q112 90 107 90 H73 Q68 90 63 94 H56 Q46 94 46 86 Z" fill="none" stroke="${C.stroke}" stroke-width="2.4"/>
    </g>
  `, {
    ports: [
      { id: 'a', x: 10, y: 75, dx: -1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'b', x: 170, y: 75, dx: 1, dy: 0, type: 'wire', diameter: 0 },
    ],
  });

  // 7. lamp
  add('lamp', '灯泡', '电学', 180, 150, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M74 91 C74 79 56 68 56 46 A34 34 0 1 1 124 46 C124 68 106 79 106 91 Z" fill="#FBF5D6" stroke="${C.stroke}" stroke-width="2.6"/>
      <path d="M66 44 A24 24 0 0 1 82 22" fill="none" stroke="#FFFFFF" stroke-width="2.6"/>
      <path d="M84 91 V68 L79 50 M96 91 V68 L101 50" fill="none" stroke="${C.inner}" stroke-width="1.5"/>
      <path d="M79 50 Q82 42 85 50 Q88 42 90 50 Q92 42 95 50 Q98 42 101 50" fill="none" stroke="${C.amber}" stroke-width="2.0"/>
      <rect x="74" y="90" width="32" height="22" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <line x1="74" y1="97" x2="106" y2="94" stroke="${C.inner}" stroke-width="1.3"/>
      <line x1="74" y1="104" x2="106" y2="101" stroke="${C.inner}" stroke-width="1.3"/>
      <rect x="60" y="112" width="60" height="21" rx="3" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.4"/>
      ${bindingPost(73, 141, C.crimson, '', 0, 5.6)}
      ${bindingPost(107, 141, C.stroke, '', 0, 5.6)}
    </g>
  `, {
    ports: [
      { id: 'positive', x: 73, y: 141, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'negative', x: 107, y: 141, dx: 0, dy: 1, type: 'wire', diameter: 0 },
    ],
  });

  // 8. diode (vertical axial package + cathode band matching chemix)
  add('diode', '二极管', '电学', 150, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <line x1="75" y1="10" x2="75" y2="48" stroke="${C.stroke}" stroke-width="3.2"/>
      <line x1="75" y1="132" x2="75" y2="170" stroke="${C.stroke}" stroke-width="3.2"/>
      <rect x="59" y="48" width="32" height="84" rx="5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="2.4"/>
      <rect x="60.2" y="60" width="29.6" height="12" fill="${C.chassisBot}" stroke="none"/>
      <line x1="59" y1="60" x2="91" y2="60" stroke="${C.stroke}" stroke-width="1.4"/>
      <line x1="59" y1="72" x2="91" y2="72" stroke="${C.stroke}" stroke-width="1.4"/>
      <rect x="64" y="54" width="4" height="72" rx="1.5" fill="#FFFFFF" fill-opacity="0.18" stroke="none"/>
    </g>
  `, {
    ports: [
      { id: 'a', x: 75, y: 10, dx: 0, dy: -1, type: 'wire', diameter: 0 },
      { id: 'b', x: 75, y: 170, dx: 0, dy: 1, type: 'wire', diameter: 0 },
    ],
  });

  // 9. led (soft translucent coral-red dome + clean vertical leads)
  add('led', '发光二极管', '电学', 180, 150, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="70.8" y="88" width="4.4" height="53" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="104.8" y="88" width="4.4" height="53" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.8"/>
      <path d="M63 82 V50 A27 27 0 0 1 117 50 V82 Z" fill="#F5D3CC" stroke="${C.stroke}" stroke-width="2.4"/>
      <path d="M70 70 V50 A20 20 0 0 1 84 31" fill="none" stroke="#FFFFFF" stroke-width="2.4"/>
      <path d="M75 82 V54 H86 L92 63 V82 M105 82 V54" fill="none" stroke="${C.subaRed}" stroke-width="1.6"/>
      <rect x="59" y="81" width="62" height="8" rx="2.5" fill="${C.subaRed}" stroke="${C.stroke}" stroke-width="2.0"/>
    </g>
  `, {
    ports: [
      { id: 'positive', x: 73, y: 141, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'negative', x: 107, y: 141, dx: 0, dy: 1, type: 'wire', diameter: 0 },
    ],
  });

  // 10. capacitor (upright cylindrical electrolytic capacitor + 2 bottom leads)
  add('capacitor', '电容', '电学', 150, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <line x1="62" y1="110" x2="62" y2="162" stroke="${C.stroke}" stroke-width="3.0"/>
      <line x1="88" y1="110" x2="88" y2="162" stroke="${C.stroke}" stroke-width="3.0"/>
      <path d="M47 32 V102 A28 10 0 0 0 103 102 V32 Z" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="2.4"/>
      <rect x="54" y="42" width="6" height="60" rx="2" fill="#FFFFFF" fill-opacity="0.18" stroke="none"/>
      <rect x="86" y="42" width="11" height="62" fill="${C.chassisBot}" fill-opacity="0.85" stroke="none"/>
      <ellipse cx="75" cy="32" rx="28" ry="10" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.4"/>
      <ellipse cx="75" cy="32" rx="21" ry="6.5" fill="${C.chassisTop}" stroke="${C.inner}" stroke-width="1.2"/>
    </g>
  `, {
    ports: [
      { id: 'a', x: 62, y: 162, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'b', x: 88, y: 162, dx: 0, dy: 1, type: 'wire', diameter: 0 },
    ],
  });

  // 11. magnet
  add('magnet', '磁铁', '电学', 180, 150, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="18" y="52" width="72" height="46" rx="3" fill="${C.traceRed}" stroke="none"/>
      <rect x="90" y="52" width="72" height="46" rx="3" fill="${C.steelBlue}" stroke="none"/>
      <line x1="22" y1="58" x2="158" y2="58" stroke="#FFFFFF" stroke-opacity="0.30" stroke-width="2.2"/>
      <line x1="90" y1="52" x2="90" y2="98" stroke="${C.stroke}" stroke-width="2.4"/>
      <rect x="18" y="52" width="144" height="46" rx="3.5" fill="none" stroke="${C.stroke}" stroke-width="2.6"/>
      ${labelText(54, 81, 'N', 18, '#FFFFFF', 'middle', true)}
      ${labelText(126, 81, 'S', 18, '#FFFFFF', 'middle', true)}
    </g>
  `);

  // 12. compass
  add('compass', '指南针', '电学', 180, 150, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <circle cx="90" cy="75" r="52" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.8"/>
      <circle cx="90" cy="75" r="44" fill="#FFFFFF" stroke="${C.inner}" stroke-width="1.4"/>
      ${labelText(90, 41, 'N', 9, C.crimson)}
      ${labelText(90, 114, 'S', 8.5, C.stroke)}
      ${labelText(53, 78, 'W', 8, C.muted)}
      ${labelText(127, 78, 'E', 8, C.muted)}
      <polygon points="90,75 83,68 112,50 96,76" fill="${C.crimson}" stroke="${C.stroke}" stroke-width="1.5"/>
      <polygon points="90,75 83,68 68,100 96,76" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.5"/>
      <circle cx="90" cy="75" r="4" fill="${C.amber}" stroke="${C.stroke}" stroke-width="1.5"/>
    </g>
  `);

  // 13. solenoid
  add('solenoid', '螺线管', '电学', 180, 150, () => {
    let backCoils = '';
    let frontCoils = '';
    const n = 10;
    const x0 = 44;
    const pitch = 9.2;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * pitch;
      const topX = x + 4.4;
      const nextBotX = x + pitch;
      if (i < n - 1) {
        backCoils += `<path d="M${r(topX)} 50 Q${r(topX + 2.5)} 44 ${r(topX + 4.5)} 52" fill="none" stroke="${C.stroke}" stroke-width="4.2"/>` +
          `<path d="M${r(topX)} 50 Q${r(topX + 2.5)} 44 ${r(topX + 4.5)} 52" fill="none" stroke="${C.corkDark}" stroke-width="2.0"/>` +
          `<path d="M${r(nextBotX)} 102 Q${r(nextBotX - 2.2)} 107 ${r(nextBotX - 4.2)} 99" fill="none" stroke="${C.stroke}" stroke-width="4.2"/>` +
          `<path d="M${r(nextBotX)} 102 Q${r(nextBotX - 2.2)} 107 ${r(nextBotX - 4.2)} 99" fill="none" stroke="${C.corkDark}" stroke-width="2.0"/>`;
      }
      frontCoils += `<line x1="${r(x)}" y1="102" x2="${r(topX)}" y2="50" stroke="${C.stroke}" stroke-width="5.2"/>` +
        `<line x1="${r(x)}" y1="102" x2="${r(topX)}" y2="50" stroke="${C.copper}" stroke-width="2.8"/>`;
    }
    const lastTopX = x0 + (n - 1) * pitch + 4.4;
    return `<g stroke-linecap="round" stroke-linejoin="round">
      ${backCoils}
      <rect x="33" y="51" width="114" height="50" rx="5" fill="${C.corkLight}" stroke="${C.stroke}" stroke-width="2.4"/>
      <path d="M10 76 H26 Q34 76 44 102" fill="none" stroke="${C.stroke}" stroke-width="4.6"/>
      <path d="M10 76 H26 Q34 76 44 102" fill="none" stroke="${C.copper}" stroke-width="2.4"/>
      <path d="M${r(lastTopX)} 50 Q142 76 154 76 H174" fill="none" stroke="${C.stroke}" stroke-width="4.6"/>
      <path d="M${r(lastTopX)} 50 Q142 76 154 76 H174" fill="none" stroke="${C.copper}" stroke-width="2.4"/>
      ${frontCoils}
    </g>`;
  }, {
    ports: [
      { id: 'a', x: 10, y: 76, dx: -1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'b', x: 174, y: 76, dx: 1, dy: 0, type: 'wire', diameter: 0 },
    ],
  });

  // =========================================================================
  // 2. BIO SPECIMENS, CULTURE & LAB TOOLS (21)
  // =========================================================================

  // 14. petri-dish (160x38 2D side cross-section open shallow dish)
  add('petri-dish', '培养皿', '生物实验', 160, 38, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 4 V31 Q12 34 15 34 H145 Q148 34 148 31 V4 Z" fill="${C.glass}" stroke="none"/>
      <path d="M15 24 H145 V31 Q145 32 143 32 H17 Q15 32 15 31 Z" fill="${C.liquid}" stroke="${C.liquidLine}" stroke-width="1.2"/>
      <path d="M8 4 Q12 4 12 10 V31 Q12 34 15 34 H145 Q148 34 148 31 V10 Q148 4 152 4" fill="none" stroke="${C.stroke}" stroke-width="3.2"/>
    </g>
  `, {
    ports: [{ id: 'base', x: 80, y: 34, dx: 0, dy: 1, type: 'base', diameter: 0 }],
  });

  // 15. petri-top
  add('petri-top', '培养皿俯视图', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <circle cx="90" cy="90" r="66" fill="${C.liquid}" stroke="${C.stroke}" stroke-width="3.0"/>
      <circle cx="90" cy="90" r="58" fill="${C.glass}" fill-opacity="0.45" stroke="none"/>
      <path d="M46 66 A48 48 0 0 1 82 38" fill="none" stroke="#FFFFFF" stroke-width="2.6"/>
    </g>
  `);

  // 16. choice-chamber
  add('choice-chamber', '选择室', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <circle cx="90" cy="90" r="65" fill="${C.glass}" stroke="${C.stroke}" stroke-width="2.4"/>
      <line x1="25" y1="90" x2="155" y2="90" stroke="${C.inner}" stroke-width="1.6"/>
      <line x1="90" y1="25" x2="90" y2="155" stroke="${C.inner}" stroke-width="1.6"/>
      <circle cx="90" cy="90" r="14" fill="#FFFFFF" stroke="${C.liquidLine}" stroke-width="2.2"/>
    </g>
  `);

  // 17. microscope-slide (thin pale-grey glass rectangle, NOT heavy dark border)
  add('microscope-slide', '载玻片', '生物实验', 180, 100, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="14" y="28" width="152" height="44" rx="1.5" fill="${C.glass}" stroke="${C.tick}" stroke-width="2.6"/>
      <rect x="16" y="30" width="28" height="40" fill="${C.chassisMid}" stroke="none"/>
      <line x1="56" y1="34" x2="68" y2="46" stroke="#FFFFFF" stroke-width="2.0"/>
    </g>
  `);

  // 18. cover-slip (thin pale-grey glass square, NOT heavy dark border)
  add('cover-slip', '盖玻片', '生物实验', 180, 100, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="54" y="14" width="72" height="72" rx="1.5" fill="${C.glass}" stroke="${C.tick}" stroke-width="2.6"/>
      <line x1="64" y1="36" x2="84" y2="16" stroke="#FFFFFF" stroke-width="2.0"/>
    </g>
  `);

  // 19. quadrat
  add('quadrat', '样方框', '生物实验', 180, 180, () => {
    let lines = '';
    for (let i = 1; i < 5; i++) {
      const k = 28 + i * 24.8;
      lines += `<line x1="${r(k)}" y1="28" x2="${r(k)}" y2="152" stroke="${C.tick}" stroke-width="1.5"/>` +
        `<line x1="28" y1="${r(k)}" x2="152" y2="${r(k)}" stroke="${C.tick}" stroke-width="1.5"/>`;
    }
    return `<g stroke-linecap="round" stroke-linejoin="round">
      ${lines}
      <rect x="24" y="24" width="132" height="132" rx="2" fill="none" stroke="${C.corkMid}" stroke-width="4.8"/>
    </g>`;
  });

  // 20. bacteria
  add('bacteria', '杆菌示意', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M40 94 Q24 80 14 96 Q24 114 10 120" fill="none" stroke="${C.inner}" stroke-width="2.0"/>
      <path d="M42 104 Q26 116 18 106" fill="none" stroke="${C.inner}" stroke-width="1.8"/>
      <rect x="38" y="66" width="106" height="48" rx="24" fill="${C.leaf}" stroke="${C.stroke}" stroke-width="2.4"/>
      <rect x="44" y="72" width="94" height="36" rx="18" fill="${C.leafSoft}" stroke="${C.stroke}" stroke-width="1.4"/>
      <path d="M62 90 Q72 78 82 90 T102 90 T120 90" fill="none" stroke="${C.crimson}" stroke-width="1.8"/>
      <circle cx="58" cy="84" r="1.8" fill="${C.stroke}" stroke="none"/>
      <circle cx="116" cy="82" r="1.8" fill="${C.stroke}" stroke="none"/>
      <circle cx="90" cy="99" r="1.8" fill="${C.stroke}" stroke="none"/>
    </g>
  `);

  // 21. seed (vibrant botanical dicot bean seed)
  add('seed', '种子', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M62 128 C38 100 44 48 80 38 C114 28 138 52 126 90 C116 118 102 124 88 134 C76 142 68 136 62 128 Z" fill="${C.leaf}" stroke="${C.stroke}" stroke-width="2.2"/>
      <path d="M68 112 C56 96 60 64 82 54 C102 44 116 62 110 88" fill="none" stroke="${C.leafSoft}" stroke-width="4.0"/>
    </g>
  `);

  // 22. potato
  add('potato', '马铃薯', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M28 104 C18 66 54 40 104 44 C150 48 164 82 148 114 C132 144 40 142 28 104 Z" fill="${C.corkLight}" stroke="${C.stroke}" stroke-width="2.4"/>
      <path d="M46 66 C70 50 112 52 130 62" fill="none" stroke="#FFFFFF" stroke-opacity="0.38" stroke-width="2.4"/>
      <path d="M62 74 Q66 78 72 74 M108 88 Q114 92 120 88 M78 108 Q84 112 88 108" fill="none" stroke="${C.corkDark}" stroke-width="1.6"/>
    </g>
  `);

  // 23. agar (clean flat nutrient agar block)
  add('agar', '琼脂块', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="38" y="38" width="104" height="104" rx="4" fill="${C.crimson}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="46" y="46" width="88" height="88" rx="2" fill="${C.traceRed}" stroke="none"/>
    </g>
  `);

  // 24. pot (exact base port at (90, 158))
  add('pot', '花盆', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M44 58 L58 158 H122 L136 58 Z" fill="${C.corkMid}" stroke="${C.stroke}" stroke-width="2.4"/>
      <rect x="36" y="38" width="108" height="20" rx="3" fill="${C.corkDark}" stroke="${C.stroke}" stroke-width="2.4"/>
    </g>
  `, {
    ports: [{ id: 'base', x: 90, y: 158, dx: 0, dy: 1, type: 'base', diameter: 0 }],
  });

  // 25. daisy
  add('daisy', '雏菊', '生物实验', 180, 180, () => {
    let petals = '';
    for (let i = 0; i < 12; i++) {
      const deg = i * 30;
      petals += `<ellipse cx="90" cy="36" rx="8.5" ry="22" transform="rotate(${deg} 90 66)" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="1.8"/>`;
    }
    return `<g stroke-linecap="round" stroke-linejoin="round">
      <path d="M90 88 Q88 128 90 168" fill="none" stroke="${C.leaf}" stroke-width="4.2"/>
      <path d="M89 144 Q58 134 52 114 Q74 114 89 138 Z" fill="${C.leafSoft}" stroke="${C.stroke}" stroke-width="1.8"/>
      <path d="M91 136 Q122 126 128 106 Q106 106 91 130 Z" fill="${C.leaf}" stroke="${C.stroke}" stroke-width="1.8"/>
      ${petals}
      <circle cx="90" cy="66" r="15" fill="${C.amber}" stroke="${C.stroke}" stroke-width="2.0"/>
    </g>`;
  });

  // 26. tree
  add('tree', '树', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M78 96 L70 168 H110 L102 96 Z" fill="${C.corkDark}" stroke="${C.stroke}" stroke-width="2.2"/>
      <path d="M52 104 C28 104 20 80 34 62 C36 42 54 32 68 38 C76 18 106 18 114 38 C130 34 146 46 146 64 C160 82 150 104 128 104 Z" fill="${C.leaf}" stroke="${C.stroke}" stroke-width="2.2"/>
      <path d="M54 58 C58 38 82 28 104 34" fill="none" stroke="${C.leafSoft}" stroke-width="3.6"/>
    </g>
  `);

  // 27. leaf
  add('leaf', '叶片', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M30 144 C-2 54 96 14 152 22 C158 102 92 166 30 144 Z" fill="${C.leaf}" stroke="${C.stroke}" stroke-width="2.2"/>
      <path d="M22 156 Q80 88 144 30" fill="none" stroke="${C.stroke}" stroke-width="2.2"/>
      <path d="M58 116 L46 80 M84 90 L114 98 M104 68 L94 42 M74 100 L66 64" fill="none" stroke="${C.stroke}" stroke-width="1.6"/>
    </g>
  `);

  // 28. plant-shoot
  add('plant-shoot', '植物幼苗', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M90 152 V170 M90 156 L72 168 M90 160 L108 169" fill="none" stroke="${C.corkDark}" stroke-width="1.8"/>
      <path d="M90 152 Q86 100 92 26" fill="none" stroke="${C.leaf}" stroke-width="4.2"/>
      <path d="M89 124 Q42 114 38 88 Q74 86 89 116 Z" fill="${C.leafSoft}" stroke="${C.stroke}" stroke-width="1.8"/>
      <path d="M91 96 Q138 86 142 60 Q106 58 91 88 Z" fill="${C.leaf}" stroke="${C.stroke}" stroke-width="1.8"/>
      <path d="M91 64 Q50 54 48 30 Q78 30 91 56 Z" fill="${C.leaf}" stroke="${C.stroke}" stroke-width="1.8"/>
    </g>
  `);

  // 29. shoot (fresh cut green botanical stem)
  add('shoot', '嫩枝', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M84 162 L96 154 L94 34 Q90 28 86 34 Z" fill="${C.leaf}" stroke="${C.stroke}" stroke-width="2.0"/>
      <path d="M88 64 Q58 52 54 30 Q78 30 88 54 Z" fill="${C.leafSoft}" stroke="${C.stroke}" stroke-width="1.8"/>
      <path d="M92 58 Q122 46 126 24 Q102 24 92 48 Z" fill="${C.leaf}" stroke="${C.stroke}" stroke-width="1.8"/>
    </g>
  `);

  // 30. pond-weed (clean Elodea sprig)
  add('pond-weed', '水草', '生物实验', 180, 180, () => {
    let whorls = '';
    for (const y of [140, 118, 96, 74, 52]) {
      whorls += `<path d="M90 ${y} Q58 ${y - 6} 50 ${y - 16} Q74 ${y - 16} 90 ${y - 4} Z" fill="${C.leafSoft}" stroke="${C.stroke}" stroke-width="1.6"/>`;
      whorls += `<path d="M90 ${y} Q122 ${y - 6} 130 ${y - 16} Q106 ${y - 16} 90 ${y - 4} Z" fill="${C.leaf}" stroke="${C.stroke}" stroke-width="1.6"/>`;
    }
    return `<g stroke-linecap="round" stroke-linejoin="round">
      <line x1="90" y1="164" x2="90" y2="28" stroke="${C.leaf}" stroke-width="3.6"/>
      ${whorls}
    </g>`;
  });

  // 31. metal-strip (vertical 120x180, bottom probe tip at (60,170), segment [60,150,60,30])
  add('metal-strip', '金属条', '实验小工具', 120, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="49" y="16" width="22" height="154" rx="3" fill="${C.copper}" stroke="${C.stroke}" stroke-width="2.2"/>
      <line x1="54" y1="24" x2="54" y2="162" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="2.0"/>
    </g>
  `, {
    ports: [{ id: 'probe', x: 60, y: 170, dx: 0, dy: 1, type: 'probe', diameter: 12, segment: [60, 150, 60, 30] }],
  });

  // 32. swab (vertical 120x180, bottom cotton probe tip at (60,170), segment [60,150,60,30])
  add('swab', '棉签', '实验小工具', 120, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="57.5" y="14" width="5" height="134" rx="2" fill="${C.corkLight}" stroke="${C.stroke}" stroke-width="1.6"/>
      <ellipse cx="60" cy="156" rx="7" ry="14" fill="${C.porcelainTop}" stroke="${C.stroke}" stroke-width="2.0"/>
    </g>
  `, {
    ports: [{ id: 'probe', x: 60, y: 170, dx: 0, dy: 1, type: 'probe', diameter: 12, segment: [60, 150, 60, 30] }],
  });

  // 33. nail (vertical 120x180, bottom sharp probe tip at (60,170), segment [60,150,60,30])
  add('nail', '铁钉', '实验小工具', 120, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="44" y="14" width="32" height="7" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <path d="M55 21 V148 L60 170 L65 148 V21 Z" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.0"/>
    </g>
  `, {
    ports: [{ id: 'probe', x: 60, y: 170, dx: 0, dy: 1, type: 'probe', diameter: 12, segment: [60, 150, 60, 30] }],
  });

  // 34. capsule-pill
  add('capsule-pill', '胶囊', '实验小工具', 180, 120, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M90 38 H56 A22 22 0 0 0 56 82 H90 Z" fill="${C.crimson}" stroke="${C.stroke}" stroke-width="2.4"/>
      <path d="M90 38 H124 A22 22 0 0 1 124 82 H90 Z" fill="${C.porcelainMid}" stroke="${C.stroke}" stroke-width="2.4"/>
      <path d="M46 50 Q52 44 64 44 H120" fill="none" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="2.4"/>
      <line x1="90" y1="38" x2="90" y2="82" stroke="${C.stroke}" stroke-width="2.2"/>
    </g>
  `);

  // =========================================================================
  // 3. SUBSTANCES, FILLS & HUMAN HAND (10)
  // =========================================================================

  // 35. bubbles (delicate light translucent bubbles)
  add('bubbles', '气泡', '物质与填充', 170, 130, () => {
    const specs = [[38, 92, 11], [68, 72, 16], [104, 96, 13], [132, 68, 9], [86, 36, 14], [52, 42, 8], [122, 30, 7]];
    return `<g stroke-linecap="round" stroke-linejoin="round">` +
      specs.map(([cx, cy, rad]) =>
        `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${C.glass}" stroke="${C.tick}" stroke-width="2.0"/>` +
        `<path d="M${r(cx - rad * 0.55)} ${r(cy - rad * 0.15)} A${r(rad * 0.6)} ${r(rad * 0.6)} 0 0 1 ${r(cx - rad * 0.1)} ${r(cy - rad * 0.58)}" fill="none" stroke="#FFFFFF" stroke-width="1.6"/>`
      ).join('') +
      `</g>`;
  });

  // 36. beads (vibrant green spherical microbeads)
  add('beads', '微珠', '物质与填充', 170, 130, () => {
    const pts = [[36, 86], [56, 70], [78, 86], [100, 68], [124, 84], [46, 50], [72, 46], [116, 46], [92, 92], [136, 62], [66, 98], [108, 96]];
    return `<g stroke-linecap="round" stroke-linejoin="round">` +
      pts.map(([cx, cy], i) => {
        const rad = i % 2 ? 9 : 7.5;
        const fill = i % 2 === 0 ? C.leaf : '#78B856';
        return `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${fill}" stroke="${C.stroke}" stroke-width="1.4"/>`;
      }).join('') +
      `</g>`;
  });

  // 37. particles (dense charcoal kinetics granular swarm)
  add('particles', '颗粒', '物质与填充', 170, 130, () => {
    const pts = [
      [42, 98, 7], [60, 102, 8], [78, 96, 7], [98, 100, 8], [118, 98, 7], [132, 94, 6],
      [48, 80, 6], [68, 80, 7], [88, 78, 6.5], [108, 80, 7], [126, 76, 5.5],
      [56, 60, 5.5], [76, 58, 6], [96, 56, 5.5], [116, 60, 5],
      [64, 40, 4.5], [86, 36, 5], [108, 42, 4.5], [74, 24, 4], [98, 22, 3.5],
    ];
    return `<g>` +
      pts.map(([cx, cy, rad], i) =>
        `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${i % 3 === 0 ? C.inner : C.darkPanel}" stroke="none"/>`
      ).join('') +
      `</g>`;
  });

  // 38. crystals (clean translucent pale-blue faceted prisms)
  add('crystals', '晶体', '物质与填充', 170, 130, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <polygon points="34,104 34,48 54,28 74,48 74,104" fill="${C.iceFill}" stroke="${C.iceEdge}" stroke-width="2.4"/>
      <line x1="54" y1="28" x2="54" y2="104" stroke="${C.liquidLine}" stroke-width="1.2"/>
      <polygon points="74,104 74,40 96,18 118,40 118,104" fill="${C.liquid}" stroke="${C.liquidLine}" stroke-width="2.4"/>
      <line x1="96" y1="18" x2="96" y2="104" stroke="${C.steelBlue}" stroke-opacity="0.55" stroke-width="1.2"/>
      <polygon points="116,104 116,64 132,48 148,64 148,104" fill="${C.glass}" stroke="${C.iceEdge}" stroke-width="2.4"/>
      <line x1="132" y1="48" x2="132" y2="104" stroke="${C.liquidLine}" stroke-width="1.2"/>
    </g>
  `);

  // 39. drop (clean soft aquatic droplet matching chemix)
  add('drop', '液滴', '物质与填充', 170, 130, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M85 16 C68 46 44 64 48 92 C52 114 70 118 85 118 C100 118 118 114 122 92 C126 64 102 46 85 16 Z" fill="${C.liquid}" stroke="${C.liquidLine}" stroke-width="3.2"/>
      <path d="M62 74 C57 86 60 100 72 106" fill="none" stroke="#FFFFFF" stroke-width="2.8"/>
    </g>
  `);

  // 40. ice-cube (clean translucent pale-cyan rounded ice cube matching chemix)
  add('ice-cube', '冰块', '物质与填充', 170, 130, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="38" y="20" width="94" height="90" rx="16" fill="${C.iceFill}" stroke="${C.iceEdge}" stroke-width="3.6"/>
      <path d="M52 46 V38 Q52 33 57 33 H70" fill="none" stroke="#FFFFFF" stroke-width="3.0"/>
    </g>
  `);

  // 41. powder
  add('powder', '粉末', '物质与填充', 170, 130, () => {
    const pts = [[85, 62], [75, 76], [95, 76], [66, 90], [85, 88], [104, 90], [54, 102], [74, 101], [94, 102], [116, 102]];
    const dots = pts.map(([dx, dy]) => `<circle cx="${dx}" cy="${dy}" r="1.5" fill="${C.muted}" stroke="none"/>`).join('');
    return `<g stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 112 Q46 102 68 62 Q85 34 102 62 Q124 102 154 112 Z" fill="${C.porcelainMid}" stroke="${C.muted}" stroke-width="2.2"/>
      ${dots}
    </g>`;
  });

  // 42. dirt
  add('dirt', '土壤', '物质与填充', 170, 130, () => {
    const pts = [[86, 62, 2.2], [74, 78, 1.8], [98, 80, 2.5], [62, 94, 2.0], [84, 94, 2.8], [108, 94, 1.9], [48, 104, 1.8], [72, 105, 2.2], [100, 105, 2.4], [122, 104, 1.8]];
    const pebbles = pts.map(([dx, dy, rad]) => `<circle cx="${dx}" cy="${dy}" r="${rad}" fill="#5E3C26" stroke="none"/>`).join('');
    return `<g stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 112 Q44 98 64 66 Q86 38 108 66 Q128 98 154 112 Z" fill="#8C5B3D" stroke="#5E3C26" stroke-width="2.2"/>
      ${pebbles}
    </g>`;
  });

  // 43. smoke (soft delicate wispy gray plumes without harsh dark borders)
  add('smoke', '烟雾', '物质与填充', 170, 130, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M56 114 C40 90 74 78 58 52 C48 34 62 20 72 14 C68 28 62 40 70 54 C84 78 54 92 64 114 Z" fill="${C.chassisMid}" stroke="none"/>
      <path d="M84 118 C64 88 104 72 86 40 C76 24 92 14 102 10 C96 24 92 38 100 54 C114 80 80 94 94 118 Z" fill="${C.chassisBot}" stroke="none"/>
      <path d="M112 114 C100 92 128 80 116 54 C108 38 120 26 128 20 C124 32 120 42 126 56 C136 78 110 94 120 114 Z" fill="${C.chassisMid}" stroke="none"/>
    </g>
  `);

  // 44. hand
  add('hand', '手部示意', '测量与防护', 180, 150, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M52 134 L34 88 Q24 68 38 66 L54 84 V32 Q54 18 65 26 V64 V18 Q70 8 79 18 V62 V22 Q89 10 94 24 V66 V36 Q104 26 108 42 V88 L130 72 Q146 68 136 90 L114 134 Z" fill="${C.chassisMid}" stroke="${C.muted}" stroke-width="2.6"/>
      <path d="M68 92 Q86 86 100 96" fill="none" stroke="${C.muted}" stroke-width="1.5"/>
    </g>
  `);

  // =========================================================================
  // 4. OPTICS (8)
  // =========================================================================

  // 45. prism (light ice glass triangle + crisp spectrum dispersion)
  add('prism', '三棱镜', '光学', 190, 160, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="84" x2="72" y2="84" stroke="${C.stroke}" stroke-width="2.0"/>
      <line x1="72" y1="84" x2="122" y2="78" stroke="${C.amberLight}" stroke-width="1.8"/>
      <line x1="122" y1="78" x2="178" y2="62" stroke="${C.traceRed}" stroke-width="2.2"/>
      <line x1="123" y1="81" x2="178" y2="78" stroke="${C.amber}" stroke-width="2.2"/>
      <line x1="125" y1="84" x2="178" y2="94" stroke="${C.leaf}" stroke-width="2.2"/>
      <line x1="127" y1="87" x2="178" y2="110" stroke="${C.steelBlue}" stroke-width="2.2"/>
      <polygon points="95,24 44,128 146,128" fill="${C.iceFill}" fill-opacity="0.72" stroke="${C.liquidLine}" stroke-width="2.6"/>
    </g>
  `);

  // 46. lens (light glass biconvex lens + converging rays)
  add('lens', '凸透镜', '光学', 190, 160, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <line x1="14" y1="48" x2="95" y2="48" stroke="${C.traceRed}" stroke-width="1.4"/>
      <line x1="95" y1="48" x2="176" y2="92" stroke="${C.traceRed}" stroke-width="1.4"/>
      <line x1="14" y1="80" x2="176" y2="80" stroke="${C.traceRed}" stroke-width="1.4"/>
      <line x1="14" y1="112" x2="95" y2="112" stroke="${C.traceRed}" stroke-width="1.4"/>
      <line x1="95" y1="112" x2="176" y2="68" stroke="${C.traceRed}" stroke-width="1.4"/>
      <path d="M95 18 Q62 80 95 142 Q128 80 95 18 Z" fill="${C.iceFill}" fill-opacity="0.78" stroke="${C.liquidLine}" stroke-width="2.4"/>
    </g>
  `);

  // 47. glass-block (light glass rectangle + refracted red ray)
  add('glass-block', '玻璃砖', '光学', 190, 160, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <line x1="36" y1="18" x2="72" y2="56" stroke="${C.traceRed}" stroke-width="1.8"/>
      <line x1="72" y1="56" x2="108" y2="104" stroke="${C.traceRed}" stroke-width="1.8"/>
      <line x1="108" y1="104" x2="152" y2="146" stroke="${C.traceRed}" stroke-width="1.8"/>
      <rect x="40" y="56" width="110" height="48" rx="1.5" fill="${C.iceFill}" fill-opacity="0.72" stroke="${C.liquidLine}" stroke-width="2.2"/>
    </g>
  `);

  // 48. mirror (slim clean reflective edge + uniform backing hatches)
  add('mirror', '平面镜', '光学', 190, 160, () => {
    let hatch = '';
    for (let y = 24; y <= 142; y += 9.5) {
      hatch += `<line x1="95" y1="${r(y)}" x2="105" y2="${r(y - 7)}" stroke="${C.muted}" stroke-width="1.2"/>`;
    }
    return `<g stroke-linecap="round" stroke-linejoin="round">
      ${hatch}
      <line x1="95" y1="18" x2="95" y2="142" stroke="${C.stroke}" stroke-width="2.6"/>
    </g>`;
  });

  // 49. curved-mirror (slim concentric reflective arc + clean backing hatches)
  add('curved-mirror', '凹面镜', '光学', 190, 160, () => {
    const cx = 166;
    const cy = 80;
    const radOut = 92;
    const aMax = 0.72;
    const pt = (r0, ang) => [cx - r0 * Math.cos(ang), cy + r0 * Math.sin(ang)];
    const [x1, y1] = pt(radOut, -aMax);
    const [x2, y2] = pt(radOut, aMax);
    let hatch = '';
    for (let i = 0; i <= 11; i++) {
      const a = -aMax + (2 * aMax * i) / 11;
      const [hx, hy] = pt(radOut, a);
      const nx = Math.cos(a);
      const ny = -Math.sin(a);
      hatch += `<line x1="${r(hx)}" y1="${r(hy)}" x2="${r(hx + 9 * nx)}" y2="${r(hy + 9 * ny)}" stroke="${C.muted}" stroke-width="1.2"/>`;
    }
    return `<g stroke-linecap="round" stroke-linejoin="round">
      ${hatch}
      <path d="M${r(x1)} ${r(y1)} A${radOut} ${radOut} 0 0 0 ${r(x2)} ${r(y2)}" fill="none" stroke="${C.stroke}" stroke-width="2.6"/>
    </g>`;
  });

  // 50. raybox (sleek upright dark-charcoal U-slot raybox housing matching chemix)
  add('raybox', '光源盒', '光学', 190, 160, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="64" y="14" width="62" height="132" rx="2" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="2.4"/>
      <rect x="72" y="14" width="46" height="92" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="64" y="106" width="62" height="40" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="2.2"/>
    </g>
  `);

  // 51. ray (slim crisp crimson optical ray)
  add('ray', '光线', '光学', 190, 160, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M24 62 H112 L164 102" fill="none" stroke="${C.traceRed}" stroke-width="2.4"/>
      <polygon points="168,105 154,102 162,92" fill="${C.traceRed}" stroke="none"/>
    </g>
  `);

  // 52. sun (clean soft golden sun disc + fine rays)
  add('sun', '太阳', '光学', 190, 160, () => {
    let rays = '';
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      const x1 = 95 + Math.cos(a) * 42;
      const y1 = 80 + Math.sin(a) * 42;
      const x2 = 95 + Math.cos(a) * 60;
      const y2 = 80 + Math.sin(a) * 60;
      rays += `<line x1="${r(x1)}" y1="${r(y1)}" x2="${r(x2)}" y2="${r(y2)}" stroke="${C.amber}" stroke-width="3.0"/>`;
    }
    return `<g stroke-linecap="round" stroke-linejoin="round">
      ${rays}
      <circle cx="95" cy="80" r="34" fill="${C.brassLight}" stroke="${C.amber}" stroke-width="2.2"/>
    </g>`;
  });

  // =========================================================================
  // 5. MECHANICS (6 — PRESERVING EXACT PORTS & SEGMENTS)
  // =========================================================================

  // 53. trolley (clean plank dynamics cart; hook at (172, 90))
  add('trolley', '小车', '力学', 190, 165, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="88" x2="26" y2="88" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="9" y="81" width="4" height="14" rx="1" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.6"/>
      <rect x="92" y="42" width="5" height="44" rx="1" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.6"/>
      <path d="M164 90 H172 C177 90 177 98 171 98" fill="none" stroke="${C.stroke}" stroke-width="2.4"/>
      <rect x="24" y="84" width="140" height="20" rx="4" fill="${C.corkMid}" stroke="${C.stroke}" stroke-width="2.2"/>
      <circle cx="52" cy="112" r="14" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="2.2"/>
      <circle cx="52" cy="112" r="4" fill="${C.chassisBot}" stroke="none"/>
      <circle cx="136" cy="112" r="14" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="2.2"/>
      <circle cx="136" cy="112" r="4" fill="${C.chassisBot}" stroke="none"/>
    </g>
  `, {
    ports: [{ id: 'hook', x: 172, y: 90, dx: 1, dy: 0, type: 'hanger', diameter: 0 }],
  });

  // 54. ramp (clean solid neutral wedge along exact segment [12, 139, 176, 34])
  add('ramp', '斜面', '力学', 190, 165, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 139 L176 34 V139 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.4"/>
    </g>
  `, {
    ports: [{ id: 'surface', x: 94, y: 86.5, dx: -105, dy: -164, type: 'surface', diameter: 0, segment: [12, 139, 176, 34] }],
  });

  // 55. light-gate (tall upright dark U-slot photogate matching chemix)
  add('light-gate', '光电门', '力学', 190, 165, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M62 18 H128 V148 H108 V42 H82 V148 H62 Z" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="2.4"/>
      <line x1="82" y1="100" x2="108" y2="100" stroke="${C.crimson}" stroke-width="1.6" stroke-dasharray="3 2"/>
      <circle cx="72" cy="100" r="4" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.4"/>
      ${bindingPost(118, 30, C.crimson, '', 0, 4.8)}
    </g>
  `, {
    ports: [
      { id: 'signal', x: 118, y: 30, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'grip-site', x: 72, y: 100, dx: 1, dy: 0, type: 'grip-site', diameter: 0 },
    ],
  });

  // 56. pulley (hanger port (95, 12); clean silver disc + strap)
  add('pulley', '滑轮', '力学', 190, 165, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M95 28 V12 C95 7 103 7 103 12" fill="none" stroke="${C.stroke}" stroke-width="2.2"/>
      <circle cx="95" cy="92" r="44" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.4"/>
      <rect x="88" y="28" width="14" height="68" rx="4" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="95" cy="92" r="5" fill="${C.inner}" stroke="${C.stroke}" stroke-width="1.4"/>
    </g>
  `, {
    ports: [{ id: 'hanger', x: 95, y: 12, dx: 0, dy: -1, type: 'hanger', diameter: 0 }],
  });

  // 57. spring (clean uniform sinusoidal coil spring; top (95,9), bottom (95,151))
  add('spring', '弹簧', '力学', 190, 165, () => {
    let d = 'M95 9 V22';
    for (let i = 0; i < 8; i++) {
      const y = 22 + i * 14;
      d += ` Q112 ${y + 3.5} 95 ${y + 7} Q78 ${y + 10.5} 95 ${y + 14}`;
    }
    d += ' V151';
    return `<g stroke-linecap="round" stroke-linejoin="round">
      <path d="${d}" fill="none" stroke="${C.stroke}" stroke-width="2.6"/>
    </g>`;
  }, {
    ports: [
      { id: 'top', x: 95, y: 9, dx: 0, dy: -1, type: 'hanger', diameter: 0 },
      { id: 'bottom', x: 95, y: 151, dx: 0, dy: 1, type: 'hook', diameter: 0 },
    ],
  });

  // 58. slotted-weight (sleek hooked metallic weight mass; hanger port (77, 25))
  add('slotted-weight', '钩码', '力学', 190, 165, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M77 25 C77 18 88 18 88 26" fill="none" stroke="${C.stroke}" stroke-width="2.6"/>
      <line x1="77" y1="25" x2="77" y2="108" stroke="${C.stroke}" stroke-width="2.8"/>
      <rect x="44" y="108" width="66" height="30" rx="5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.4"/>
      <rect x="50" y="113" width="54" height="5" rx="2" fill="${C.chassisTop}" fill-opacity="0.5" stroke="none"/>
    </g>
  `, {
    ports: [{ id: 'hanger', x: 77, y: 25, dx: 0, dy: -1, type: 'hanger', diameter: 0 }],
  });

  // =========================================================================
  // 6. GEOMETRIC SHAPES & DIAGRAM ANNOTATIONS (14)
  // =========================================================================

  add('rectangle', '矩形框', '图形与标记', 180, 140, () => `
    <rect x="20" y="24" width="140" height="92" rx="2" fill="#D5DAE0" stroke="${C.stroke}" stroke-width="2.4"/>
  `);

  add('ellipse', '椭圆', '图形与标记', 180, 140, () => `
    <ellipse cx="90" cy="70" rx="64" ry="44" fill="#D5DAE0" stroke="${C.stroke}" stroke-width="2.4"/>
  `);

  add('triangle', '三角形', '图形与标记', 180, 140, () => `
    <polygon points="90,22 150,118 30,118" fill="#D5DAE0" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round"/>
  `);

  add('line', '直线', '图形与标记', 180, 140, () => `
    <line x1="20" y1="108" x2="160" y2="32" stroke="${C.stroke}" stroke-width="2.6" stroke-linecap="round"/>
  `);

  add('arrow', '箭头', '图形与标记', 180, 140, () => `
    <path d="M22 60 H116 V42 L158 70 L116 98 V80 H22 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round"/>
  `);

  add('curve', '曲线', '图形与标记', 180, 140, () => `
    <path d="M20 106 C58 18 122 122 160 34" fill="none" stroke="${C.stroke}" stroke-width="2.4" stroke-linecap="round"/>
  `);

  add('curved-arrow', '曲线箭头', '图形与标记', 180, 140, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M26 98 Q90 22 148 92" fill="none" stroke="${C.inner}" stroke-width="2.6"/>
      <polygon points="154,100 134,92 148,80" fill="${C.inner}" stroke="${C.stroke}" stroke-width="2.0"/>
    </g>
  `);

  add('stir-arrow', '旋转箭头', '图形与标记', 180, 140, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M46 66 A44 22 0 1 1 134 66" fill="none" stroke="${C.inner}" stroke-width="2.8"/>
      <path d="M134 74 A44 22 0 1 1 46 74" fill="none" stroke="${C.inner}" stroke-width="2.8"/>
      <polygon points="134,68 125,58 139,56" fill="${C.inner}" stroke="${C.stroke}" stroke-width="1.6"/>
      <polygon points="46,72 55,82 41,84" fill="${C.inner}" stroke="${C.stroke}" stroke-width="1.6"/>
    </g>
  `);

  add('cross', '十字', '图形与标记', 180, 140, () => `
    <path d="M78 24 H102 V58 H136 V82 H102 V116 H78 V82 H44 V58 H78 Z" fill="#D5DAE0" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round"/>
  `);

  add('cuboid', '长方体', '图形与标记', 180, 140, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <polygon points="28,46 112,46 146,24 62,24" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.4"/>
      <polygon points="28,46 112,46 112,114 28,114" fill="#D5DAE0" stroke="${C.stroke}" stroke-width="2.4"/>
      <polygon points="112,46 146,24 146,92 112,114" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.4"/>
    </g>
  `);

  add('isocube', '立方体', '图形与标记', 180, 140, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <polygon points="90,16 140,44 90,72 40,44" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.4"/>
      <polygon points="40,44 90,72 90,124 40,96" fill="#D5DAE0" stroke="${C.stroke}" stroke-width="2.4"/>
      <polygon points="90,72 140,44 140,96 90,124" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.4"/>
    </g>
  `);

  add('3dcylinder', '圆柱体', '图形与标记', 180, 140, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M50 34 V104 A40 16 0 0 0 130 104 V34 Z" fill="#D5DAE0" stroke="none"/>
      <path d="M50 34 V104 A40 16 0 0 0 130 104 V34" fill="none" stroke="${C.stroke}" stroke-width="2.4"/>
      <ellipse cx="90" cy="34" rx="40" ry="16" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="2.4"/>
    </g>
  `);

  add('label', '标签', '图形与标记', 180, 140, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="26" y="42" width="128" height="56" rx="4" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.4"/>
      ${labelText(90, 75, 'Label', 13, C.stroke, 'middle', true)}
    </g>
  `);

  add('eye', '眼睛', '图形与标记', 180, 140, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 70 Q90 20 160 70 Q90 120 20 70 Z" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.4"/>
      <circle cx="90" cy="70" r="22" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="2.4"/>
      <circle cx="90" cy="70" r="9.5" fill="${C.stroke}" stroke="none"/>
      <circle cx="83" cy="63" r="3.8" fill="#FFFFFF" stroke="none"/>
    </g>
  `);
};
