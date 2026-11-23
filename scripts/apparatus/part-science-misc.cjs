'use strict';

const S = require('./svg-style.cjs');
const {
  C, SW, r, rad, safeId,
  chassis, oledScreen, screenText, labelText, rotaryKnob, softButton, bindingPost,
} = S;

/**
 * Registers all 72 electrical, optical, mechanics, biological specimen,
 * substance/fill, and diagram annotation items in the Chemix Neutral Charcoal
 * & Stepped-Collar House Style (zero gradients, zero url(#...), pale LCDs).
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

  // 1. cable (exact inlet (16,32) & outlet (122,152) wire ports + segment/edge)
  add('cable', '电缆', '导管', 140, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M51 32 C98 32 40 152 87 152" fill="none" stroke="${C.stroke}" stroke-width="10.8"/>
      <path d="M51 32 C98 32 40 152 87 152" fill="none" stroke="${C.crimson}" stroke-width="5.8"/>
      <!-- Left banana plug + charcoal strain boot -->
      <rect x="26" y="25" width="25" height="14" rx="3.5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <line x1="34" y1="26" x2="34" y2="38" stroke="${C.muted}" stroke-width="1.3"/>
      <line x1="41" y1="26" x2="41" y2="38" stroke="${C.muted}" stroke-width="1.3"/>
      <rect x="16" y="29" width="10" height="6" rx="1.2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <line x1="16" y1="28.5" x2="16" y2="35.5" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <!-- Right banana plug + charcoal strain boot -->
      <rect x="87" y="145" width="25" height="14" rx="3.5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <line x1="97" y1="146" x2="97" y2="158" stroke="${C.muted}" stroke-width="1.3"/>
      <line x1="104" y1="146" x2="104" y2="158" stroke="${C.muted}" stroke-width="1.3"/>
      <rect x="112" y="149" width="10" height="6" rx="1.2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <line x1="122" y1="148.5" x2="122" y2="155.5" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
    </g>
  `, {
    ports: [
      { id: 'inlet', x: 16, y: 32, dx: -1, dy: 0, type: 'wire', diameter: 9, segment: [21, 32, 51, 32], edge: [16, 29.5, 16, 34.5] },
      { id: 'outlet', x: 122, y: 152, dx: 1, dy: 0, type: 'wire', diameter: 9, segment: [117, 152, 87, 152], edge: [122, 154.5, 122, 149.5] },
    ],
  });

  // 2. powerpack (tight 182x102 brushed-aluminum benchtop PSU matching chemix)
  add('powerpack', '直流电源', '电学', 182, 102, (p) => {
    const cx = 74;
    const cy = 52;
    let dialMarks = '';
    for (let i = 0; i <= 12; i++) {
      const deg = -135 + (270 * i) / 12;
      const a = rad(deg - 90);
      const x1 = cx + Math.cos(a) * 15.5;
      const y1 = cy + Math.sin(a) * 15.5;
      const x2 = cx + Math.cos(a) * (i % 2 === 0 ? 19.5 : 18);
      const y2 = cy + Math.sin(a) * (i % 2 === 0 ? 19.5 : 18);
      dialMarks += `<line x1="${r(x1)}" y1="${r(y1)}" x2="${r(x2)}" y2="${r(y2)}" stroke="${C.inner}" stroke-width="${i % 2 === 0 ? 1.3 : 0.9}"/>`;
      if (i % 2 === 0) {
        const lx = cx + Math.cos(a) * 24.5;
        const ly = cy + Math.sin(a) * 24.5 + 2.1;
        dialMarks += labelText(lx, ly, String(i), 5.6, C.inner, 'middle', true);
      }
    }
    return `<g stroke-linecap="round" stroke-linejoin="round">
      ${chassis(p, 5, 5, 172, 88, { rx: 5, accentBar: false, footW: 16, footH: 5, footInset: 14 })}
      <!-- Left rocker mains switch -->
      <rect x="13" y="21" width="18" height="36" rx="2.5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="16" y="24" width="12" height="15" rx="1" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="1.0"/>
      ${labelText(22, 34, 'O', 5.8, '#FFFFFF', 'middle', true)}
      ${labelText(22, 51, 'I', 6.2, '#FFFFFF', 'middle', true)}
      ${labelText(22, 74, '230V', 5.4, C.muted, 'middle', true)}
      <!-- Central 0-12V rotary selector -->
      ${dialMarks}
      ${rotaryKnob(p, cx, cy, 12.5, 42, { dark: true })}
      <!-- AC / DC socket brackets & color-coded terminals -->
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

  // 3. battery
  add('battery', '电池', '电学', 90, 170, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="34" y="13" width="22" height="11" rx="3" fill="${C.brass}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <rect x="26" y="148" width="38" height="8" rx="2.5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="21" y="24" width="48" height="124" rx="5.5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <path d="M22.2 29.5 Q22.2 25.2 26.5 25.2 H63.5 Q67.8 25.2 67.8 29.5 V62 H22.2 Z" fill="${C.copper}" stroke="none"/>
      <line x1="21" y1="62" x2="69" y2="62" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="26" y="30" width="5" height="112" rx="2" fill="#FFFFFF" fill-opacity="0.28" stroke="none"/>
      ${labelText(45, 48, '+', 15, '#FFFFFF', 'middle', true)}
      ${labelText(45, 93, '1.5 V', 11, '#FFFFFF', 'middle', true)}
      ${labelText(45, 108, 'DRY CELL', 6.2, C.chassisBot, 'middle', true)}
      ${labelText(45, 136, '−', 14, '#FFFFFF', 'middle', true)}
    </g>
  `, {
    ports: [
      { id: 'positive', x: 45, y: 15, dx: 0, dy: -1, type: 'wire', diameter: 0 },
      { id: 'negative', x: 45, y: 154, dx: 0, dy: 1, type: 'wire', diameter: 0 },
    ],
  });

  // 4. digital-ammeter (tight 164x112 neutral charcoal bezel + pale LCD)
  add('digital-ammeter', '数字电流表', '电学', 164, 112, (p) => `
    <g stroke-linecap="round" stroke-linejoin="round">
      ${chassis(p, 5, 5, 154, 98, { rx: 7, accentBar: false, footW: 16, footH: 4, footInset: 14 })}
      ${oledScreen(p, 15, 14, 134, 44,
        screenText(22, 26, 'DC AMMETER', 6.2, C.inner, 'start') +
        screenText(142, 26, 'A', 7.5, C.traceBlue, 'end') +
        screenText(82, 47, '1.250 A', 13.5, C.lcdText, 'middle'),
        { green: true }
      )}
      ${softButton(56, 65, 52, 13, 'RANGE 2A', C.chassisTop, C.stroke)}
      ${bindingPost(38, 86, C.crimson, '+', -12, 6.2)}
      ${bindingPost(126, 86, C.stroke, '−', -12, 6.2)}
    </g>
  `, {
    ports: [
      { id: 'positive', x: 38, y: 86, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'negative', x: 126, y: 86, dx: 0, dy: 1, type: 'wire', diameter: 0 },
    ],
  });

  // 5. digital-voltmeter (tight 164x112 neutral charcoal bezel + pale LCD)
  add('digital-voltmeter', '数字电压表', '电学', 164, 112, (p) => `
    <g stroke-linecap="round" stroke-linejoin="round">
      ${chassis(p, 5, 5, 154, 98, { rx: 7, accentBar: false, footW: 16, footH: 4, footInset: 14 })}
      ${oledScreen(p, 15, 14, 134, 44,
        screenText(22, 26, 'DC VOLTMETER', 6.2, C.inner, 'start') +
        screenText(142, 26, 'V', 7.5, C.traceBlue, 'end') +
        screenText(82, 47, '12.40 V', 13.5, C.lcdText, 'middle'),
        { green: true }
      )}
      ${softButton(56, 65, 52, 13, 'RANGE 20V', C.chassisTop, C.stroke)}
      ${bindingPost(38, 86, C.crimson, '+', -12, 6.2)}
      ${bindingPost(126, 86, C.stroke, '−', -12, 6.2)}
    </g>
  `, {
    ports: [
      { id: 'positive', x: 38, y: 86, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'negative', x: 126, y: 86, dx: 0, dy: 1, type: 'wire', diameter: 0 },
    ],
  });

  // 6. resistor
  add('resistor', '电阻', '电学', 180, 150, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="12" y="72.5" width="36" height="5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="132" y="72.5" width="36" height="5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="10" cy="75" r="4.2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="170" cy="75" r="4.2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <path d="M44 62 Q44 52 55 52 H62 Q68 57 73 57 H107 Q112 57 118 52 H125 Q136 52 136 62 V88 Q136 98 125 98 H118 Q112 93 107 93 H73 Q68 93 62 98 H55 Q44 98 44 88 Z" fill="#EAD7BD" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <rect x="55" y="53.5" width="7" height="43" fill="${C.corkDark}" stroke="none"/>
      <rect x="75" y="58.5" width="6.5" height="33" fill="${C.stroke}" stroke="none"/>
      <rect x="90" y="58.5" width="6.5" height="33" fill="${C.red}" stroke="none"/>
      <rect x="118" y="53.5" width="7" height="43" fill="${C.brass}" stroke="none"/>
      <path d="M52 58 H128" fill="none" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="2.4"/>
      <path d="M44 62 Q44 52 55 52 H62 Q68 57 73 57 H107 Q112 57 118 52 H125 Q136 52 136 62 V88 Q136 98 125 98 H118 Q112 93 107 93 H73 Q68 93 62 98 H55 Q44 98 44 88 Z" fill="none" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
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
      <!-- Pear glass bulb -->
      <path d="M74 91 C74 79 56 68 56 46 A34 34 0 1 1 124 46 C124 68 106 79 106 91 Z" fill="${C.glass}" stroke="${C.stroke}" stroke-width="3.4"/>
      <path d="M65 44 A25 25 0 0 1 82 22" fill="none" stroke="${C.jointArc}" stroke-width="2.6"/>
      <!-- Internal stem & tungsten filament -->
      <path d="M84 91 V68 L79 50 M96 91 V68 L101 50" fill="none" stroke="${C.inner}" stroke-width="1.6"/>
      <path d="M79 50 Q82 42 85 50 Q88 42 90 50 Q92 42 95 50 Q98 42 101 50" fill="none" stroke="${C.amber}" stroke-width="2.2"/>
      <!-- E10 threaded brass collar -->
      <rect x="74" y="90" width="32" height="23" rx="2" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.2"/>
      <line x1="74" y1="97" x2="106" y2="94" stroke="${C.amberDark}" stroke-width="1.5"/>
      <line x1="74" y1="104" x2="106" y2="101" stroke="${C.amberDark}" stroke-width="1.5"/>
      <line x1="74" y1="110" x2="106" y2="107" stroke="${C.amberDark}" stroke-width="1.5"/>
      <!-- Benchtop socket base -->
      <rect x="48" y="113" width="84" height="22" rx="4.5" fill="${C.porcelainMid}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <rect x="64" y="109" width="52" height="6" rx="2" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.8"/>
      ${bindingPost(73, 141, C.crimson, '', 0, 5.8)}
      ${bindingPost(107, 141, C.stroke, '', 0, 5.8)}
    </g>
  `, {
    ports: [
      { id: 'positive', x: 73, y: 141, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'negative', x: 107, y: 141, dx: 0, dy: 1, type: 'wire', diameter: 0 },
    ],
  });

  // 8. diode
  add('diode', '二极管', '电学', 180, 150, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="12" y="72.5" width="40" height="5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="128" y="72.5" width="40" height="5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="10" cy="75" r="4.2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="170" cy="75" r="4.2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="52" y="54" width="76" height="42" rx="5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <rect x="108" y="55.2" width="12" height="39.6" fill="${C.chassisMid}" stroke="none"/>
      <line x1="108" y1="54" x2="108" y2="96" stroke="${C.stroke}" stroke-width="1.5"/>
      <line x1="120" y1="54" x2="120" y2="96" stroke="${C.stroke}" stroke-width="1.5"/>
      <line x1="56" y1="60" x2="124" y2="60" stroke="#FFFFFF" stroke-opacity="0.22" stroke-width="2.2"/>
      <polygon points="71,66 71,84 88,75" fill="#FFFFFF" stroke="none"/>
      <line x1="88" y1="66" x2="88" y2="84" stroke="#FFFFFF" stroke-width="2.2"/>
      <rect x="52" y="54" width="76" height="42" rx="5" fill="none" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
    </g>
  `, {
    ports: [
      { id: 'a', x: 10, y: 75, dx: -1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'b', x: 170, y: 75, dx: 1, dy: 0, type: 'wire', diameter: 0 },
    ],
  });

  // 9. led
  add('led', '发光二极管', '电学', 180, 150, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="70.5" y="90" width="5" height="50" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="104.5" y="90" width="5" height="50" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.8"/>
      <circle cx="73" cy="141" r="4.2" fill="${C.crimson}" stroke="${C.stroke}" stroke-width="1.8"/>
      <circle cx="107" cy="141" r="4.2" fill="${C.stroke}" stroke-width="1.8"/>
      <path d="M62 84 V52 A28 28 0 0 1 118 52 V84 Z" fill="#F5D3CC" stroke="${C.stroke}" stroke-width="3.2"/>
      <path d="M69 72 V52 A21 21 0 0 1 83 32" fill="none" stroke="#FFFFFF" stroke-width="2.6"/>
      <path d="M74 84 V55 H86 L92 64 V84 M106 84 V55" fill="none" stroke="${C.crimson}" stroke-width="1.8"/>
      <circle cx="80" cy="59" r="3" fill="${C.crimson}" stroke="none"/>
      <rect x="57" y="83" width="66" height="9" rx="2.5" fill="${C.crimson}" stroke="${C.stroke}" stroke-width="2.2"/>
      <line x1="127" y1="36" x2="141" y2="26" stroke="${C.amber}" stroke-width="2.2"/>
      <line x1="131" y1="52" x2="147" y2="48" stroke="${C.amber}" stroke-width="2.2"/>
      <line x1="53" y1="36" x2="39" y2="26" stroke="${C.amber}" stroke-width="2.2"/>
      ${labelText(60, 124, '+', 10, C.crimson, 'middle', true)}
      ${labelText(120, 124, '−', 10, C.stroke, 'middle', true)}
    </g>
  `, {
    ports: [
      { id: 'positive', x: 73, y: 141, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'negative', x: 107, y: 141, dx: 0, dy: 1, type: 'wire', diameter: 0 },
    ],
  });

  // 10. capacitor
  add('capacitor', '电容', '电学', 180, 150, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="12" y="72.5" width="38" height="5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="130" y="72.5" width="38" height="5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="10" cy="75" r="4.2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="170" cy="75" r="4.2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="49" y="50" width="82" height="50" rx="5.5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <rect x="50.2" y="51.2" width="8" height="47.6" rx="3" fill="${C.chassisBot}" stroke="none"/>
      <rect x="121.8" y="51.2" width="8" height="47.6" rx="3" fill="${C.chassisBot}" stroke="none"/>
      <rect x="105" y="51.2" width="12" height="47.6" fill="${C.chassisMid}" stroke="none"/>
      <line x1="60" y1="51" x2="60" y2="99" stroke="${C.stroke}" stroke-width="1.6"/>
      <line x1="120" y1="51" x2="120" y2="99" stroke="${C.stroke}" stroke-width="1.6"/>
      <rect x="49" y="50" width="82" height="50" rx="5.5" fill="none" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      ${labelText(82, 78, '100 µF', 9.2, '#FFFFFF', 'middle', true)}
      ${labelText(111, 78, '−', 11.5, C.stroke, 'middle', true)}
    </g>
  `, {
    ports: [
      { id: 'a', x: 10, y: 75, dx: -1, dy: 0, type: 'wire', diameter: 0 },
      { id: 'b', x: 170, y: 75, dx: 1, dy: 0, type: 'wire', diameter: 0 },
    ],
  });

  // 11. magnet
  add('magnet', '磁铁', '电学', 180, 150, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="18" y="52" width="72" height="46" rx="3" fill="${C.traceRed}" stroke="none"/>
      <rect x="90" y="52" width="72" height="46" rx="3" fill="${C.steelBlue}" stroke="none"/>
      <line x1="22" y1="58" x2="158" y2="58" stroke="#FFFFFF" stroke-opacity="0.30" stroke-width="2.4"/>
      <line x1="90" y1="52" x2="90" y2="98" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <rect x="18" y="52" width="144" height="46" rx="3.5" fill="none" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      ${labelText(54, 81, 'N', 18, '#FFFFFF', 'middle', true)}
      ${labelText(126, 81, 'S', 18, '#FFFFFF', 'middle', true)}
    </g>
  `);

  // 12. compass
  add('compass', '指南针', '电学', 180, 150, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <circle cx="90" cy="75" r="52" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <circle cx="90" cy="75" r="44" fill="${C.chassisTop}" stroke="${C.inner}" stroke-width="1.6"/>
      ${labelText(90, 41, 'N', 9, C.crimson)}
      ${labelText(90, 114, 'S', 8.5, C.stroke)}
      ${labelText(53, 78, 'W', 8, C.muted)}
      ${labelText(127, 78, 'E', 8, C.muted)}
      <polygon points="90,75 83,68 112,50 96,76" fill="${C.crimson}" stroke="${C.stroke}" stroke-width="1.6"/>
      <polygon points="90,75 83,68 68,100 96,76" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.6"/>
      <circle cx="90" cy="75" r="4.5" fill="${C.amber}" stroke="${C.stroke}" stroke-width="1.6"/>
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
        backCoils += `<path d="M${r(topX)} 50 Q${r(topX + 2.5)} 44 ${r(topX + 4.5)} 52" fill="none" stroke="${C.stroke}" stroke-width="4.4"/>` +
          `<path d="M${r(topX)} 50 Q${r(topX + 2.5)} 44 ${r(topX + 4.5)} 52" fill="none" stroke="${C.corkDark}" stroke-width="2.0"/>` +
          `<path d="M${r(nextBotX)} 102 Q${r(nextBotX - 2.2)} 107 ${r(nextBotX - 4.2)} 99" fill="none" stroke="${C.stroke}" stroke-width="4.4"/>` +
          `<path d="M${r(nextBotX)} 102 Q${r(nextBotX - 2.2)} 107 ${r(nextBotX - 4.2)} 99" fill="none" stroke="${C.corkDark}" stroke-width="2.0"/>`;
      }
      frontCoils += `<line x1="${r(x)}" y1="102" x2="${r(topX)}" y2="50" stroke="${C.stroke}" stroke-width="5.8"/>` +
        `<line x1="${r(x)}" y1="102" x2="${r(topX)}" y2="50" stroke="${C.copper}" stroke-width="3.0"/>` +
        `<line x1="${r(x + 0.8)}" y1="96" x2="${r(topX - 0.8)}" y2="56" stroke="#F6DFC2" stroke-width="0.9"/>`;
    }
    const lastTopX = x0 + (n - 1) * pitch + 4.4;
    return `<g stroke-linecap="round" stroke-linejoin="round">
      ${backCoils}
      <rect x="33" y="51" width="114" height="50" rx="5" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <rect x="35" y="53" width="6" height="46" rx="2" fill="${C.chassisMid}" stroke="${C.inner}" stroke-width="1.2"/>
      <rect x="139" y="53" width="6" height="46" rx="2" fill="${C.chassisMid}" stroke="${C.inner}" stroke-width="1.2"/>
      <path d="M10 76 H26 Q34 76 44 102" fill="none" stroke="${C.stroke}" stroke-width="5.4"/>
      <path d="M10 76 H26 Q34 76 44 102" fill="none" stroke="${C.copper}" stroke-width="2.8"/>
      <path d="M${r(lastTopX)} 50 Q142 76 154 76 H174" fill="none" stroke="${C.stroke}" stroke-width="5.4"/>
      <path d="M${r(lastTopX)} 50 Q142 76 154 76 H174" fill="none" stroke="${C.copper}" stroke-width="2.8"/>
      ${frontCoils}
      <circle cx="10" cy="76" r="4.2" fill="${C.amber}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="174" cy="76" r="4.2" fill="${C.amber}" stroke="${C.stroke}" stroke-width="2.0"/>
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

  // 14. petri-dish (tight 160x38 2D side cross-section open shallow glass dish matching chemix)
  add('petri-dish', '培养皿', '生物实验', 160, 38, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 4 V31 Q12 34 15 34 H145 Q148 34 148 31 V4 Z" fill="${C.glass}" stroke="none"/>
      <path d="M15 24 H145 V31 Q145 32 143 32 H17 Q15 32 15 31 Z" fill="${C.liquid}" stroke="${C.liquidLine}" stroke-width="1.2"/>
      <path d="M6 4 Q12 4 12 10 V31 Q12 34 15 34 H145 Q148 34 148 31 V10 Q148 4 154 4" fill="none" stroke="${C.stroke}" stroke-width="${SW.glassSw}"/>
    </g>
  `, {
    ports: [{ id: 'base', x: 80, y: 34, dx: 0, dy: 1, type: 'base', diameter: 0 }],
  });

  // 15. petri-top
  add('petri-top', '培养皿俯视图', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <circle cx="90" cy="90" r="66" fill="${C.glass}" stroke="${C.stroke}" stroke-width="${SW.glassSw}"/>
      <circle cx="90" cy="90" r="56" fill="${C.glassTop}" stroke="${C.inner}" stroke-width="1.6"/>
      <path d="M46 66 A48 48 0 0 1 82 38" fill="none" stroke="#FFFFFF" stroke-width="3.2"/>
      <path d="M126 122 A48 48 0 0 1 98 136" fill="none" stroke="#FFFFFF" stroke-width="2.0"/>
    </g>
  `);

  // 16. choice-chamber
  add('choice-chamber', '选择室', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <circle cx="90" cy="90" r="65" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="${SW.glassSw}"/>
      <path d="M90 90 V32 A58 58 0 0 1 148 90 Z" fill="${C.coolantLight}" stroke="none"/>
      <path d="M90 90 H148 A58 58 0 0 1 90 148 Z" fill="${C.glassTop}" stroke="none"/>
      <path d="M90 90 V148 A58 58 0 0 1 32 90 Z" fill="${C.chassisMid}" stroke="none"/>
      <path d="M90 90 H32 A58 58 0 0 1 90 32 Z" fill="${C.coolant}" stroke="none"/>
      <circle cx="90" cy="90" r="58" fill="none" stroke="${C.inner}" stroke-width="1.6"/>
      <line x1="32" y1="90" x2="148" y2="90" stroke="${C.stroke}" stroke-width="1.8"/>
      <line x1="90" y1="32" x2="90" y2="148" stroke="${C.stroke}" stroke-width="1.8"/>
      <circle cx="90" cy="90" r="14" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="90" cy="90" r="4" fill="${C.teal}" stroke="none"/>
    </g>
  `);

  // 17. microscope-slide (clean flat frosted end without diagonal XXX lines)
  add('microscope-slide', '载玻片', '生物实验', 180, 100, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="14" y="27" width="152" height="46" rx="2.5" fill="${C.glass}" stroke="${C.stroke}" stroke-width="${SW.glassSw}"/>
      <rect x="15.5" y="28.5" width="32" height="43" fill="${C.chassisMid}" stroke="${C.inner}" stroke-width="1.4"/>
      <line x1="60" y1="34" x2="72" y2="46" stroke="#FFFFFF" stroke-width="2.4"/>
      <line x1="66" y1="32" x2="74" y2="40" stroke="#FFFFFF" stroke-width="1.8"/>
      <rect x="86" y="33" width="38" height="34" rx="1.5" fill="${C.glassTop}" fill-opacity="0.72" stroke="${C.inner}" stroke-width="1.5"/>
      <ellipse cx="105" cy="50" rx="10" ry="7" fill="${C.teal}" fill-opacity="0.45" stroke="none"/>
    </g>
  `);

  // 18. cover-slip
  add('cover-slip', '盖玻片', '生物实验', 180, 100, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="53" y="13" width="74" height="74" rx="2.5" fill="${C.glass}" stroke="${C.stroke}" stroke-width="${SW.glassSw}"/>
      <rect x="59" y="19" width="62" height="62" rx="1" fill="${C.glassTop}" fill-opacity="0.55" stroke="${C.inner}" stroke-width="1.2"/>
      <line x1="64" y1="38" x2="84" y2="18" stroke="#FFFFFF" stroke-width="2.6"/>
      <line x1="64" y1="47" x2="93" y2="18" stroke="#FFFFFF" stroke-width="1.8"/>
    </g>
  `);

  // 19. quadrat
  add('quadrat', '样方框', '生物实验', 180, 180, () => {
    let lines = '';
    for (let i = 1; i < 5; i++) {
      const k = 28 + i * 24.8;
      lines += `<line x1="${r(k)}" y1="28" x2="${r(k)}" y2="152" stroke="${C.inner}" stroke-width="1.5"/>` +
        `<line x1="28" y1="${r(k)}" x2="152" y2="${r(k)}" stroke="${C.inner}" stroke-width="1.5"/>`;
    }
    return `<g stroke-linecap="round" stroke-linejoin="round">
      ${lines}
      <rect x="24" y="24" width="132" height="132" rx="3" fill="none" stroke="${C.stroke}" stroke-width="6.8"/>
      <rect x="24" y="24" width="132" height="132" rx="3" fill="none" stroke="${C.chassisBot}" stroke-width="3.0"/>
    </g>`;
  });

  // 20. bacteria
  add('bacteria', '杆菌示意', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M40 94 Q24 80 14 96 Q24 114 10 120" fill="none" stroke="${C.inner}" stroke-width="2.2"/>
      <path d="M42 104 Q26 116 18 106" fill="none" stroke="${C.inner}" stroke-width="2.0"/>
      <rect x="38" y="66" width="106" height="48" rx="24" fill="${C.leaf}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <rect x="44" y="72" width="94" height="36" rx="18" fill="${C.leafSoft}" stroke="${C.stroke}" stroke-width="1.5"/>
      <path d="M62 90 Q72 78 82 90 T102 90 T120 90" fill="none" stroke="${C.crimson}" stroke-width="2.0"/>
      <circle cx="58" cy="84" r="2" fill="${C.stroke}" stroke="none"/>
      <circle cx="116" cy="82" r="2" fill="${C.stroke}" stroke="none"/>
      <circle cx="90" cy="99" r="2" fill="${C.stroke}" stroke="none"/>
    </g>
  `);

  // 21. seed (classic dicot kidney bean seed)
  add('seed', '种子', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M56 124 C32 96 42 48 80 38 C118 28 144 58 134 94 C124 128 96 146 78 138 C68 134 62 130 56 124 Z" fill="${C.corkLight}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <path d="M64 114 C50 96 54 62 82 52 C108 42 126 64 118 92" fill="none" stroke="#FFFFFF" stroke-opacity="0.45" stroke-width="2.4"/>
      <ellipse cx="64" cy="116" rx="11" ry="4.5" transform="rotate(42 64 116)" fill="${C.porcelainTop}" stroke="${C.corkDark}" stroke-width="1.5"/>
      <path d="M84 68 Q94 92 86 116" fill="none" stroke="${C.corkDark}" stroke-width="1.4" stroke-dasharray="3 3"/>
    </g>
  `);

  // 22. potato
  add('potato', '马铃薯', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M28 104 C18 66 54 40 104 44 C150 48 164 82 148 114 C132 144 40 142 28 104 Z" fill="${C.corkLight}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <path d="M46 66 C70 50 112 52 130 62" fill="none" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="2.6"/>
      <path d="M62 74 Q66 78 72 74 M108 88 Q114 92 120 88 M78 108 Q84 112 88 108" fill="none" stroke="${C.corkDark}" stroke-width="1.8"/>
      <circle cx="67" cy="72" r="1.5" fill="${C.corkDark}" stroke="none"/>
      <circle cx="114" cy="86" r="1.5" fill="${C.corkDark}" stroke="none"/>
      <circle cx="83" cy="106" r="1.4" fill="${C.corkDark}" stroke="none"/>
    </g>
  `);

  // 23. agar
  add('agar', '琼脂块', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="38" y="40" width="104" height="100" rx="8" fill="${C.lcdGreenBg}" stroke="${C.stroke}" stroke-width="${SW.glassSw}"/>
      <rect x="46" y="48" width="88" height="84" rx="4" fill="none" stroke="${C.muted}" stroke-width="1.4"/>
      <line x1="48" y1="62" x2="62" y2="48" stroke="#FFFFFF" stroke-width="2.4"/>
      <circle cx="90" cy="90" r="15" fill="${C.coolant}" stroke="${C.steelBlue}" stroke-width="1.6" stroke-dasharray="3 2"/>
      <circle cx="90" cy="90" r="4.5" fill="${C.steelBlue}" stroke="none"/>
    </g>
  `);

  // 24. pot (exact base port at (90, 158))
  add('pot', '花盆', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="48" y="150" width="84" height="8" rx="3" fill="${C.corkDark}" stroke="${C.stroke}" stroke-width="2.2"/>
      <path d="M46 58 L60 150 H120 L134 58 Z" fill="${C.corkMid}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <path d="M52 38 Q90 25 128 38 Z" fill="${C.corkDark}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="38" y="38" width="104" height="20" rx="4" fill="${C.corkLight}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
    </g>
  `, {
    ports: [{ id: 'base', x: 90, y: 158, dx: 0, dy: 1, type: 'base', diameter: 0 }],
  });

  // 25. daisy
  add('daisy', '雏菊', '生物实验', 180, 180, () => {
    let petals = '';
    for (let i = 0; i < 12; i++) {
      const deg = i * 30;
      petals += `<ellipse cx="90" cy="36" rx="8.5" ry="22" transform="rotate(${deg} 90 66)" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.0"/>`;
    }
    return `<g stroke-linecap="round" stroke-linejoin="round">
      <path d="M90 88 Q88 128 90 168" fill="none" stroke="${C.leaf}" stroke-width="4.4"/>
      <path d="M90 88 Q88 128 90 168" fill="none" stroke="${C.stroke}" stroke-width="1.6"/>
      <path d="M89 144 Q58 134 52 114 Q74 114 89 138 Z" fill="${C.leafSoft}" stroke="${C.stroke}" stroke-width="2.0"/>
      <path d="M91 136 Q122 126 128 106 Q106 106 91 130 Z" fill="${C.leaf}" stroke="${C.stroke}" stroke-width="2.0"/>
      ${petals}
      <circle cx="90" cy="66" r="15" fill="${C.brass}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
    </g>`;
  });

  // 26. tree (unified deciduous lobed botanical crown)
  add('tree', '树', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M78 96 L70 168 H110 L102 96 Z" fill="${C.corkMid}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <path d="M90 112 L72 90 M90 108 L108 88" fill="none" stroke="${C.stroke}" stroke-width="2.2"/>
      <path d="M52 104 C28 104 20 80 34 62 C36 42 54 32 68 38 C76 18 106 18 114 38 C130 34 146 46 146 64 C160 82 150 104 128 104 Z" fill="${C.leaf}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <path d="M54 58 C58 38 82 28 104 34" fill="none" stroke="${C.leafSoft}" stroke-width="4.0"/>
    </g>
  `);

  // 27. leaf
  add('leaf', '叶片', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M30 144 C-2 54 96 14 152 22 C158 102 92 166 30 144 Z" fill="${C.leaf}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <path d="M22 156 Q80 88 144 30" fill="none" stroke="${C.stroke}" stroke-width="2.4"/>
      <path d="M58 116 L46 80 M84 90 L114 98 M104 68 L94 42 M74 100 L66 64" fill="none" stroke="${C.stroke}" stroke-width="1.8"/>
    </g>
  `);

  // 28. plant-shoot
  add('plant-shoot', '植物幼苗', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M90 152 V172 M90 156 L70 168 M90 160 L110 170 M82 162 L76 172" fill="none" stroke="${C.corkDark}" stroke-width="2.0"/>
      <path d="M90 152 Q86 100 92 26" fill="none" stroke="${C.leaf}" stroke-width="4.4"/>
      <path d="M90 152 Q86 100 92 26" fill="none" stroke="${C.stroke}" stroke-width="1.4"/>
      <path d="M89 124 Q42 114 38 88 Q74 86 89 116 Z" fill="${C.leafSoft}" stroke="${C.stroke}" stroke-width="2.2"/>
      <path d="M91 96 Q138 86 142 60 Q106 58 91 88 Z" fill="${C.leaf}" stroke="${C.stroke}" stroke-width="2.2"/>
      <path d="M91 64 Q50 54 48 30 Q78 30 91 56 Z" fill="${C.leaf}" stroke="${C.stroke}" stroke-width="2.2"/>
      <path d="M92 40 Q124 30 128 14 Q102 14 92 34 Z" fill="${C.leafSoft}" stroke="${C.stroke}" stroke-width="2.0"/>
    </g>
  `);

  // 29. shoot (clean excised green stem cutting with apex bud leaves)
  add('shoot', '嫩枝', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M84 162 L96 154 L94 42 Q90 38 86 42 Z" fill="${C.leaf}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <ellipse cx="90" cy="158" rx="6.2" ry="2.6" transform="rotate(-32 90 158)" fill="${C.leafSoft}" stroke="${C.stroke}" stroke-width="1.6"/>
      <path d="M88 70 Q54 58 50 32 Q78 32 88 60 Z" fill="${C.leafSoft}" stroke="${C.stroke}" stroke-width="2.2"/>
      <path d="M92 64 Q126 52 130 26 Q102 26 92 54 Z" fill="${C.leaf}" stroke="${C.stroke}" stroke-width="2.2"/>
      <path d="M90 42 Q84 20 90 12 Q96 20 90 42 Z" fill="${C.leafSoft}" stroke="${C.stroke}" stroke-width="1.8"/>
    </g>
  `);

  // 30. pond-weed (Elodea aquatic sprig with opposite leaves & O2 bubbles)
  add('pond-weed', '水草', '生物实验', 180, 180, () => {
    let whorls = '';
    for (const y of [136, 114, 92, 70, 48]) {
      whorls += `<path d="M90 ${y} Q58 ${y - 6} 50 ${y - 18} Q74 ${y - 18} 90 ${y - 4} Z" fill="${y % 44 === 0 ? C.leafSoft : C.leaf}" stroke="${C.stroke}" stroke-width="1.8"/>`;
      whorls += `<path d="M90 ${y} Q122 ${y - 6} 130 ${y - 18} Q106 ${y - 18} 90 ${y - 4} Z" fill="${y % 44 === 0 ? C.leaf : C.leafSoft}" stroke="${C.stroke}" stroke-width="1.8"/>`;
    }
    return `<g stroke-linecap="round" stroke-linejoin="round">
      <line x1="20" y1="154" x2="160" y2="154" stroke="${C.teal}" stroke-width="2.0" stroke-dasharray="5 5"/>
      <line x1="90" y1="164" x2="90" y2="28" stroke="${C.leaf}" stroke-width="4.0"/>
      <line x1="90" y1="164" x2="90" y2="28" stroke="${C.stroke}" stroke-width="1.4"/>
      ${whorls}
      <circle cx="72" cy="30" r="3.8" fill="${C.glassTop}" stroke="${C.teal}" stroke-width="1.5"/>
      <circle cx="108" cy="20" r="4.8" fill="${C.glassTop}" stroke="${C.teal}" stroke-width="1.5"/>
      <circle cx="94" cy="12" r="3.2" fill="${C.glassTop}" stroke="${C.teal}" stroke-width="1.5"/>
    </g>`;
  });

  // 31. metal-strip (exact probe port (170, 58) dia 12, segment [150,58,30,58])
  add('metal-strip', '金属条', '实验小工具', 180, 120, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="16" y="48" width="154" height="20" rx="4" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <circle cx="30" cy="58" r="3.5" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="1.4"/>
      ${labelText(96, 61, 'Zn / Mg / Fe', 7.2, C.stroke)}
    </g>
  `, {
    ports: [{ id: 'probe', x: 170, y: 58, dx: 1, dy: 0, type: 'probe', diameter: 12, segment: [150, 58, 30, 58] }],
  });

  // 32. swab (exact probe port (170, 58) dia 12, segment [150,58,30,58])
  add('swab', '棉签', '实验小工具', 180, 120, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="14" y="55" width="132" height="6" rx="2" fill="${C.corkLight}" stroke="${C.stroke}" stroke-width="2.0"/>
      <ellipse cx="155" cy="58" rx="15" ry="7.5" fill="${C.porcelainTop}" stroke="${C.stroke}" stroke-width="2.2"/>
    </g>
  `, {
    ports: [{ id: 'probe', x: 170, y: 58, dx: 1, dy: 0, type: 'probe', diameter: 12, segment: [150, 58, 30, 58] }],
  });

  // 33. nail (exact probe port (170, 58) dia 12, segment [150,58,30,58])
  add('nail', '铁钉', '实验小工具', 180, 120, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="14" y="42" width="8" height="32" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2"/>
      <path d="M22 52 H146 L170 58 L146 64 H22 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2"/>
    </g>
  `, {
    ports: [{ id: 'probe', x: 170, y: 58, dx: 1, dy: 0, type: 'probe', diameter: 12, segment: [150, 58, 30, 58] }],
  });

  // 34. capsule-pill
  add('capsule-pill', '胶囊', '实验小工具', 180, 120, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M90 38 H56 A22 22 0 0 0 56 82 H90 Z" fill="${C.crimson}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <path d="M90 38 H124 A22 22 0 0 1 124 82 H90 Z" fill="${C.porcelainMid}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <path d="M46 50 Q52 44 64 44 H120" fill="none" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="2.6"/>
      <line x1="90" y1="38" x2="90" y2="82" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
    </g>
  `);

  // =========================================================================
  // 3. SUBSTANCES, FILLS & HUMAN HAND (10)
  // =========================================================================

  // 35. bubbles
  add('bubbles', '气泡', '物质与填充', 170, 130, () => {
    const specs = [[38, 92, 11], [68, 72, 16], [104, 96, 13], [132, 68, 9], [86, 36, 14], [52, 42, 8], [122, 30, 7]];
    return `<g stroke-linecap="round" stroke-linejoin="round">` +
      specs.map(([cx, cy, rad]) =>
        `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="2.6"/>` +
        `<path d="M${r(cx - rad * 0.55)} ${r(cy - rad * 0.15)} A${r(rad * 0.6)} ${r(rad * 0.6)} 0 0 1 ${r(cx - rad * 0.1)} ${r(cy - rad * 0.58)}" fill="none" stroke="#FFFFFF" stroke-width="1.8"/>`
      ).join('') +
      `</g>`;
  });

  // 36. beads
  add('beads', '微珠', '物质与填充', 170, 130, () => {
    const pts = [[36, 86], [56, 70], [78, 86], [100, 68], [124, 84], [46, 50], [72, 46], [116, 46], [92, 92], [136, 62]];
    return `<g stroke-linecap="round" stroke-linejoin="round">` +
      pts.map(([cx, cy], i) => {
        const rad = i % 2 ? 9.5 : 8;
        const fill = i % 3 === 0 ? C.steelBlue : (i % 3 === 1 ? C.leafSoft : C.chassisMid);
        return `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${fill}" stroke="${C.stroke}" stroke-width="2.4"/>` +
          `<circle cx="${r(cx - rad * 0.34)}" cy="${r(cy - rad * 0.34)}" r="${r(rad * 0.22)}" fill="#FFFFFF" stroke="none"/>`;
      }).join('') +
      `</g>`;
  });

  // 37. particles
  add('particles', '颗粒', '物质与填充', 170, 130, () => {
    const pts = [
      [34, 84, 7], [52, 62, 6], [68, 92, 8], [86, 56, 7], [104, 84, 6.5],
      [124, 64, 7.5], [138, 90, 6], [48, 38, 5.5], [76, 30, 6.5], [108, 38, 5.5],
      [126, 32, 6], [54, 108, 6], [88, 106, 7], [118, 106, 6.5], [70, 70, 5.5],
    ];
    return `<g stroke-linecap="round" stroke-linejoin="round">` +
      pts.map(([cx, cy, rad], i) => {
        const fill = i % 3 === 0 ? C.darkPanel : (i % 3 === 1 ? C.corkLight : C.chassisBot);
        return `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${fill}" stroke="${C.stroke}" stroke-width="2.0"/>`;
      }).join('') +
      `</g>`;
  });

  // 38. crystals
  add('crystals', '晶体', '物质与填充', 170, 130, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <polygon points="34,104 34,48 54,28 74,48 74,104" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="${SW.glassSw}"/>
      <line x1="54" y1="28" x2="54" y2="104" stroke="${C.inner}" stroke-width="1.3"/>
      <polygon points="74,104 74,40 96,18 118,40 118,104" fill="${C.coolant}" stroke="${C.stroke}" stroke-width="${SW.glassSw}"/>
      <line x1="96" y1="18" x2="96" y2="104" stroke="${C.teal}" stroke-width="1.4"/>
      <line x1="82" y1="44" x2="91" y2="30" stroke="#FFFFFF" stroke-width="2.2"/>
      <polygon points="116,104 116,64 132,48 148,64 148,104" fill="${C.glass}" stroke="${C.stroke}" stroke-width="${SW.glassSw}"/>
      <line x1="132" y1="48" x2="132" y2="104" stroke="${C.inner}" stroke-width="1.3"/>
    </g>
  `);

  // 39. drop
  add('drop', '液滴', '物质与填充', 170, 130, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M85 14 C68 46 42 64 46 92 C50 116 70 120 85 120 C100 120 120 116 124 92 C128 64 102 46 85 14 Z" fill="${C.coolant}" stroke="${C.stroke}" stroke-width="${SW.glassSw}"/>
      <path d="M62 74 C57 86 60 100 72 106" fill="none" stroke="#FFFFFF" stroke-width="3.2"/>
      <circle cx="65" cy="64" r="2.2" fill="#FFFFFF" stroke="none"/>
    </g>
  `);

  // 40. ice-cube
  add('ice-cube', '冰块', '物质与填充', 170, 130, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="38" y="20" width="94" height="90" rx="14" fill="${C.coolantLight}" stroke="${C.stroke}" stroke-width="${SW.glassSw}"/>
      <rect x="46" y="28" width="78" height="74" rx="10" fill="${C.glassTop}" stroke="${C.inner}" stroke-width="1.4"/>
      <path d="M52 46 V38 Q52 33 57 33 H68" fill="none" stroke="#FFFFFF" stroke-width="3.0"/>
      <path d="M60 62 L80 48 L96 66 M78 86 L108 72" fill="none" stroke="${C.teal}" stroke-opacity="0.55" stroke-width="1.6"/>
    </g>
  `);

  // 41. powder
  add('powder', '粉末', '物质与填充', 170, 130, () => {
    const pts = [[85, 62], [75, 76], [95, 76], [66, 90], [85, 88], [104, 90], [54, 102], [74, 101], [94, 102], [116, 102]];
    const dots = pts.map(([dx, dy]) => `<circle cx="${dx}" cy="${dy}" r="1.4" fill="${C.stroke}" stroke="none"/>`).join('');
    return `<g stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 112 Q46 102 68 62 Q85 34 102 62 Q124 102 154 112 Z" fill="${C.porcelainMid}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      ${dots}
    </g>`;
  });

  // 42. dirt
  add('dirt', '土壤', '物质与填充', 170, 130, () => {
    const pts = [[86, 62, 2.2], [74, 78, 1.8], [98, 80, 2.5], [62, 94, 2.0], [84, 94, 2.8], [108, 94, 1.9], [48, 104, 1.8], [72, 105, 2.2], [100, 105, 2.4], [122, 104, 1.8]];
    const pebbles = pts.map(([dx, dy, rad]) => `<circle cx="${dx}" cy="${dy}" r="${rad}" fill="${C.corkDark}" stroke="none"/>`).join('');
    return `<g stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 112 Q44 98 64 66 Q86 38 108 66 Q128 98 154 112 Z" fill="${C.corkLight}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      ${pebbles}
    </g>`;
  });

  // 43. smoke (graceful tapered rising plumes)
  add('smoke', '烟雾', '物质与填充', 170, 130, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M56 114 C40 90 74 78 58 52 C48 34 62 20 72 14 C68 28 62 40 70 54 C84 78 54 92 64 114 Z" fill="${C.chassisBot}" stroke="${C.tick}" stroke-width="1.4"/>
      <path d="M84 118 C64 88 104 72 86 40 C76 24 92 14 102 10 C96 24 92 38 100 54 C114 80 80 94 94 118 Z" fill="${C.muted}" fill-opacity="0.72" stroke="${C.inner}" stroke-width="1.5"/>
      <path d="M112 114 C100 92 128 80 116 54 C108 38 120 26 128 20 C124 32 120 42 126 56 C136 78 110 94 120 114 Z" fill="${C.chassisBot}" stroke="${C.tick}" stroke-width="1.4"/>
    </g>
  `);

  // 44. hand
  add('hand', '手部示意', '测量与防护', 180, 150, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M52 134 L34 88 Q24 68 38 66 L54 84 V32 Q54 18 65 26 V64 V18 Q70 8 79 18 V62 V22 Q89 10 94 24 V66 V36 Q104 26 108 42 V88 L130 72 Q146 68 136 90 L114 134 Z" fill="${C.porcelainMid}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <path d="M68 92 Q86 86 100 96" fill="none" stroke="${C.tick}" stroke-width="1.6"/>
    </g>
  `);

  // =========================================================================
  // 4. OPTICS (8)
  // =========================================================================

  // 45. prism
  add('prism', '三棱镜', '光学', 190, 160, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="84" x2="72" y2="84" stroke="${C.brass}" stroke-width="2.6"/>
      <line x1="72" y1="84" x2="122" y2="78" stroke="${C.amberLight}" stroke-width="2.0"/>
      <line x1="122" y1="78" x2="178" y2="62" stroke="${C.red}" stroke-width="2.2"/>
      <line x1="123" y1="81" x2="178" y2="78" stroke="${C.brass}" stroke-width="2.2"/>
      <line x1="125" y1="84" x2="178" y2="94" stroke="${C.leaf}" stroke-width="2.2"/>
      <line x1="127" y1="87" x2="178" y2="110" stroke="${C.blue}" stroke-width="2.2"/>
      <polygon points="95,24 44,128 146,128" fill="${C.glass}" fill-opacity="0.78" stroke="${C.stroke}" stroke-width="${SW.glassSw}"/>
      <line x1="91" y1="40" x2="62" y2="100" stroke="#FFFFFF" stroke-width="2.4"/>
    </g>
  `);

  // 46. lens
  add('lens', '凸透镜', '光学', 190, 160, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <line x1="14" y1="80" x2="176" y2="80" stroke="${C.tick}" stroke-width="1.5" stroke-dasharray="6 5"/>
      <path d="M95 16 Q50 80 95 144 Q140 80 95 16 Z" fill="${C.glass}" fill-opacity="0.82" stroke="${C.stroke}" stroke-width="${SW.glassSw}"/>
      <path d="M88 30 Q68 62 74 96" fill="none" stroke="#FFFFFF" stroke-width="2.8"/>
      <line x1="95" y1="74" x2="95" y2="86" stroke="${C.inner}" stroke-width="1.4"/>
    </g>
  `);

  // 47. glass-block
  add('glass-block', '玻璃砖', '光学', 190, 160, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="28" y="38" width="134" height="84" rx="4" fill="${C.glass}" stroke="${C.stroke}" stroke-width="${SW.glassSw}"/>
      <rect x="35" y="45" width="120" height="70" rx="2" fill="${C.glassTop}" fill-opacity="0.55" stroke="${C.inner}" stroke-width="1.3"/>
      <line x1="48" y1="76" x2="78" y2="46" stroke="#FFFFFF" stroke-width="3.2"/>
      <line x1="48" y1="92" x2="94" y2="46" stroke="#FFFFFF" stroke-width="2.0"/>
      <line x1="114" y1="114" x2="144" y2="84" stroke="#FFFFFF" stroke-width="2.2"/>
    </g>
  `);

  // 48. mirror
  add('mirror', '平面镜', '光学', 190, 160, () => {
    let hatch = '';
    for (let y = 26; y <= 140; y += 11.4) {
      hatch += `<line x1="100" y1="${r(y)}" x2="112" y2="${r(y - 8)}" stroke="${C.inner}" stroke-width="1.6"/>`;
    }
    return `<g stroke-linecap="round" stroke-linejoin="round">
      ${hatch}
      <rect x="88" y="18" width="12" height="124" rx="2" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="${SW.glassSw}"/>
      <line x1="92" y1="30" x2="92" y2="90" stroke="#FFFFFF" stroke-width="2.2"/>
    </g>`;
  });

  // 49. curved-mirror (concentric spherical glass plate + crisp normal backing hatches)
  add('curved-mirror', '凹面镜', '光学', 190, 160, () => {
    const cx = 166;
    const cy = 80;
    const rOut = 92;
    const rBack = 83;
    const aMax = 0.74;
    const pt = (rad, ang) => [cx - rad * Math.cos(ang), cy + rad * Math.sin(ang)];
    const [x1, y1] = pt(rOut, -aMax);
    const [x2, y2] = pt(rOut, aMax);
    const [bx1, by1] = pt(rBack, -aMax);
    const [bx2, by2] = pt(rBack, aMax);
    let hatch = '';
    for (let i = 0; i <= 10; i++) {
      const a = -aMax + (2 * aMax * i) / 10;
      const [hx, hy] = pt(rBack, a);
      const nx = Math.cos(a);
      const ny = -Math.sin(a);
      hatch += `<line x1="${r(hx)}" y1="${r(hy)}" x2="${r(hx + 10 * nx)}" y2="${r(hy + 10 * ny)}" stroke="${C.inner}" stroke-width="1.6"/>`;
    }
    return `<g stroke-linecap="round" stroke-linejoin="round">
      ${hatch}
      <path d="M${r(x1)} ${r(y1)} A${rOut} ${rOut} 0 0 0 ${r(x2)} ${r(y2)} L${r(bx2)} ${r(by2)} A${rBack} ${rBack} 0 0 1 ${r(bx1)} ${r(by1)} Z" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="${SW.glassSw}"/>
    </g>`;
  });

  // 50. raybox
  add('raybox', '光源盒', '光学', 190, 160, (p) => `
    <g stroke-linecap="round" stroke-linejoin="round">
      ${chassis(p, 16, 40, 102, 82, { rx: 6, accentBar: false, feet: false })}
      <line x1="30" y1="58" x2="72" y2="58" stroke="${C.muted}" stroke-width="1.5"/>
      <line x1="30" y1="66" x2="72" y2="66" stroke="${C.muted}" stroke-width="1.5"/>
      <line x1="30" y1="74" x2="72" y2="74" stroke="${C.muted}" stroke-width="1.5"/>
      ${softButton(30, 90, 36, 17, 'LAMP', C.darkPanel, '#FFFFFF')}
      <rect x="114" y="54" width="9" height="10" rx="1" fill="${C.stroke}" stroke="${C.stroke}" stroke-width="1.3"/>
      <rect x="114" y="76" width="9" height="10" rx="1" fill="${C.stroke}" stroke="${C.stroke}" stroke-width="1.3"/>
      <rect x="114" y="98" width="9" height="10" rx="1" fill="${C.stroke}" stroke="${C.stroke}" stroke-width="1.3"/>
      <line x1="124" y1="59" x2="176" y2="59" stroke="${C.amber}" stroke-width="2.6"/>
      <line x1="124" y1="81" x2="176" y2="81" stroke="${C.amber}" stroke-width="2.6"/>
      <line x1="124" y1="103" x2="176" y2="103" stroke="${C.amber}" stroke-width="2.6"/>
    </g>
  `);

  // 51. ray (crisp optical light ray with directional chevron)
  add('ray', '光线', '光学', 190, 160, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <line x1="16" y1="98" x2="168" y2="54" stroke="${C.crimson}" stroke-width="3.0"/>
      <path d="M84 70 L98 74 L89 86" fill="none" stroke="${C.crimson}" stroke-width="2.6"/>
      <polygon points="176,52 158,50 163,64" fill="${C.crimson}" stroke="${C.stroke}" stroke-width="1.5"/>
    </g>
  `);

  // 52. sun
  add('sun', '太阳', '光学', 190, 160, () => {
    let rays = '';
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      const x1 = 95 + Math.cos(a) * 42;
      const y1 = 80 + Math.sin(a) * 42;
      const x2 = 95 + Math.cos(a) * 62;
      const y2 = 80 + Math.sin(a) * 62;
      rays += `<line x1="${r(x1)}" y1="${r(y1)}" x2="${r(x2)}" y2="${r(y2)}" stroke="${C.amber}" stroke-width="3.4"/>`;
    }
    return `<g stroke-linecap="round" stroke-linejoin="round">
      ${rays}
      <circle cx="95" cy="80" r="34" fill="${C.brassLight}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
    </g>`;
  });

  // =========================================================================
  // 5. MECHANICS (6 — PRESERVING EXACT PORTS & SEGMENTS)
  // =========================================================================

  // 53. trolley (hook at (172, 90))
  add('trolley', '小车', '力学', 190, 165, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <!-- Front spring-plunger bumper -->
      <line x1="12" y1="88" x2="26" y2="88" stroke="${C.stroke}" stroke-width="2.6"/>
      <rect x="9" y="80" width="5" height="16" rx="1.5" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="1.8"/>
      <!-- Hitch hook at exact (172, 90) -->
      <path d="M164 90 H172 C177 90 177 98 171 98" fill="none" stroke="${C.stroke}" stroke-width="2.6"/>
      <!-- Top machined mass tray step -->
      <rect x="34" y="62" width="114" height="10" rx="2.5" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.0"/>
      <!-- Low-profile brushed-aluminum & charcoal cart chassis -->
      <rect x="24" y="70" width="140" height="38" rx="6" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <rect x="26" y="72" width="136" height="8" rx="2" fill="${C.darkPanel}" stroke="none"/>
      ${labelText(94, 96, 'DYNAMICS CART', 7.0, C.stroke, 'middle', true)}
      <!-- Precision wheels with hub bearings -->
      <circle cx="52" cy="118" r="15" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <circle cx="52" cy="118" r="9.5" fill="${C.chassisTop}" stroke="${C.inner}" stroke-width="1.4"/>
      <circle cx="52" cy="118" r="3.8" fill="${C.stroke}" stroke="none"/>
      <circle cx="136" cy="118" r="15" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <circle cx="136" cy="118" r="9.5" fill="${C.chassisTop}" stroke="${C.inner}" stroke-width="1.4"/>
      <circle cx="136" cy="118" r="3.8" fill="${C.stroke}" stroke="none"/>
    </g>
  `, {
    ports: [{ id: 'hook', x: 172, y: 90, dx: 1, dy: 0, type: 'hanger', diameter: 0 }],
  });

  // 54. ramp (exact surface segment [12, 139, 176, 34])
  add('ramp', '斜面', '力学', 190, 165, () => {
    let scaleTicks = '';
    for (let i = 1; i <= 10; i++) {
      const t = i / 11;
      const sx = 12 + (176 - 12) * t;
      const sy = 139 + (34 - 139) * t;
      scaleTicks += `<line x1="${r(sx)}" y1="${r(sy)}" x2="${r(sx + 3.2)}" y2="${r(sy + 5.0)}" stroke="${C.stroke}" stroke-width="1.3"/>`;
    }
    return `<g stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 139 L176 34 V145 H12 Z" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <polygon points="88,128 158,83 158,128" fill="#FFFFFF" stroke="${C.inner}" stroke-width="1.6"/>
      <line x1="12" y1="139" x2="176" y2="34" stroke="${C.steelBlue}" stroke-width="3.0"/>
      <line x1="12" y1="145" x2="178" y2="145" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      ${scaleTicks}
      <path d="M46 139 A24 24 0 0 0 40 121" fill="none" stroke="${C.steelBlue}" stroke-width="1.8"/>
      ${labelText(58, 132, 'θ', 9.5, C.steelBlue, 'middle', true)}
    </g>`;
  }, {
    ports: [{ id: 'surface', x: 94, y: 86.5, dx: -105, dy: -164, type: 'surface', diameter: 0, segment: [12, 139, 176, 34] }],
  });

  // 55. light-gate (exact signal (141, 43) & grip-site (48, 100))
  add('light-gate', '光电门', '力学', 190, 165, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M36 138 V30 H154 V138 H124 V60 H66 V138 Z" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <rect x="36" y="30" width="118" height="12" rx="3" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <rect x="61" y="94" width="6" height="10" rx="1" fill="${C.stroke}" stroke="none"/>
      <rect x="123" y="94" width="6" height="10" rx="1" fill="${C.stroke}" stroke="none"/>
      <line x1="67" y1="99" x2="123" y2="99" stroke="${C.crimson}" stroke-width="1.8" stroke-dasharray="4 3"/>
      <circle cx="48" cy="100" r="5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.8"/>
      ${bindingPost(141, 43, C.stroke, '', 0, 5.5)}
    </g>
  `, {
    ports: [
      { id: 'signal', x: 141, y: 43, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'grip-site', x: 48, y: 100, dx: 1, dy: 0, type: 'grip-site', diameter: 0 },
    ],
  });

  // 56. pulley (exact hanger port (95, 12); clean precision pulley block without stray loose cords)
  add('pulley', '滑轮', '力学', 190, 165, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M95 28 V12 C95 7 103 7 103 12" fill="none" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <circle cx="95" cy="90" r="46" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <circle cx="95" cy="90" r="37" fill="${C.chassisTop}" stroke="${C.inner}" stroke-width="1.6"/>
      <circle cx="95" cy="90" r="28" fill="none" stroke="${C.muted}" stroke-width="1.2" stroke-dasharray="6 4"/>
      <rect x="87" y="28" width="16" height="66" rx="4" fill="${C.darkPanel}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <circle cx="95" cy="90" r="6.5" fill="${C.amber}" stroke="${C.stroke}" stroke-width="1.8"/>
    </g>
  `, {
    ports: [{ id: 'hanger', x: 95, y: 12, dx: 0, dy: -1, type: 'hanger', diameter: 0 }],
  });

  // 57. spring (exact top (95, 9) & bottom (95, 151); smooth sinusoidal 3D helix)
  add('spring', '弹簧', '力学', 190, 165, () => {
    let backStrands = '';
    let frontStrands = '';
    const turns = 8;
    const yStart = 28;
    const pitch = 13.2;
    for (let i = 0; i < turns; i++) {
      const y = yStart + i * pitch;
      const yMid = y + pitch * 0.5;
      const yNext = y + pitch;
      if (i < turns - 1) {
        backStrands += `<path d="M111 ${r(yMid)} C111 ${r(yMid + 4.0)} 79 ${r(yNext - 4.0)} 79 ${r(yNext)}" fill="none" stroke="${C.stroke}" stroke-width="4.6"/>` +
          `<path d="M111 ${r(yMid)} C111 ${r(yMid + 4.0)} 79 ${r(yNext - 4.0)} 79 ${r(yNext)}" fill="none" stroke="${C.inner}" stroke-width="2.0"/>`;
      }
      frontStrands += `<path d="M79 ${r(y)} C79 ${r(y + 4.0)} 111 ${r(yMid - 4.0)} 111 ${r(yMid)}" fill="none" stroke="${C.stroke}" stroke-width="5.2"/>` +
        `<path d="M79 ${r(y)} C79 ${r(y + 4.0)} 111 ${r(yMid - 4.0)} 111 ${r(yMid)}" fill="none" stroke="${C.chassisTop}" stroke-width="2.4"/>`;
    }
    const yEnd = yStart + (turns - 1) * pitch + pitch * 0.5;
    return `<g stroke-linecap="round" stroke-linejoin="round">
      <circle cx="95" cy="14.5" r="5.5" fill="none" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <path d="M95 20 V24 Q95 28 79 28" fill="none" stroke="${C.stroke}" stroke-width="2.6"/>
      ${backStrands}
      ${frontStrands}
      <path d="M111 ${r(yEnd)} Q95 ${r(yEnd + 5)} 95 ${r(yEnd + 11)} V144 C95 154 103 156 103 149" fill="none" stroke="${C.stroke}" stroke-width="2.6"/>
    </g>`;
  }, {
    ports: [
      { id: 'top', x: 95, y: 9, dx: 0, dy: -1, type: 'hanger', diameter: 0 },
      { id: 'bottom', x: 95, y: 151, dx: 0, dy: 1, type: 'hook', diameter: 0 },
    ],
  });

  // 58. slotted-weight (exact hanger port (77, 25))
  add('slotted-weight', '钩码', '力学', 190, 165, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M77 25 C77 18 86 18 86 24" fill="none" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <line x1="77" y1="25" x2="77" y2="140" stroke="${C.stroke}" stroke-width="3.2"/>
      <rect x="45" y="76" width="64" height="18" rx="3" fill="${C.brass}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <rect x="45" y="96" width="64" height="18" rx="3" fill="${C.brass}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <rect x="45" y="116" width="64" height="18" rx="3" fill="${C.brass}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <rect x="74" y="80" width="6" height="13.5" fill="${C.stroke}" stroke="none"/>
      <rect x="74" y="100" width="6" height="13.5" fill="${C.stroke}" stroke="none"/>
      <rect x="74" y="120" width="6" height="13.5" fill="${C.stroke}" stroke="none"/>
      <rect x="41" y="135" width="72" height="7" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.2"/>
      ${labelText(134, 112, '50 g ×3', 8.5, C.stroke, 'middle', true)}
    </g>
  `, {
    ports: [{ id: 'hanger', x: 77, y: 25, dx: 0, dy: -1, type: 'hanger', diameter: 0 }],
  });

  // =========================================================================
  // 6. GEOMETRIC SHAPES & DIAGRAM ANNOTATIONS (14)
  // =========================================================================

  add('rectangle', '矩形框', '图形与标记', 180, 140, () => `
    <rect x="20" y="24" width="140" height="92" rx="3" fill="#D5DAE0" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
  `);

  add('ellipse', '椭圆', '图形与标记', 180, 140, () => `
    <ellipse cx="90" cy="70" rx="64" ry="44" fill="#D5DAE0" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
  `);

  add('triangle', '三角形', '图形与标记', 180, 140, () => `
    <polygon points="90,22 150,118 30,118" fill="#D5DAE0" stroke="${C.stroke}" stroke-width="${SW.outer}" stroke-linejoin="round"/>
  `);

  add('line', '直线', '图形与标记', 180, 140, () => `
    <line x1="20" y1="108" x2="160" y2="32" stroke="${C.stroke}" stroke-width="2.8" stroke-linecap="round"/>
  `);

  add('arrow', '箭头', '图形与标记', 180, 140, () => `
    <path d="M22 60 H116 V42 L158 70 L116 98 V80 H22 Z" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="${SW.outer}" stroke-linejoin="round"/>
  `);

  add('curve', '曲线', '图形与标记', 180, 140, () => `
    <path d="M20 106 C58 18 122 122 160 34" fill="none" stroke="${C.stroke}" stroke-width="2.8" stroke-linecap="round"/>
  `);

  add('curved-arrow', '曲线箭头', '图形与标记', 180, 140, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M26 98 Q90 22 148 92" fill="none" stroke="${C.inner}" stroke-width="3.2"/>
      <polygon points="154,100 134,92 148,80" fill="${C.inner}" stroke="${C.stroke}" stroke-width="2.2"/>
    </g>
  `);

  add('stir-arrow', '旋转箭头', '图形与标记', 180, 140, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M46 66 A44 22 0 1 1 134 66" fill="none" stroke="${C.inner}" stroke-width="3.0"/>
      <path d="M134 74 A44 22 0 1 1 46 74" fill="none" stroke="${C.inner}" stroke-width="3.0"/>
      <polygon points="134,68 125,58 139,56" fill="${C.inner}" stroke="${C.stroke}" stroke-width="1.8"/>
      <polygon points="46,72 55,82 41,84" fill="${C.inner}" stroke="${C.stroke}" stroke-width="1.8"/>
    </g>
  `);

  add('cross', '十字', '图形与标记', 180, 140, () => `
    <path d="M78 24 H102 V58 H136 V82 H102 V116 H78 V82 H44 V58 H78 Z" fill="#D5DAE0" stroke="${C.stroke}" stroke-width="${SW.outer}" stroke-linejoin="round"/>
  `);

  add('cuboid', '长方体', '图形与标记', 180, 140, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <polygon points="28,46 112,46 146,24 62,24" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <polygon points="28,46 112,46 112,114 28,114" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <polygon points="112,46 146,24 146,92 112,114" fill="#D5DAE0" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
    </g>
  `);

  add('isocube', '立方体', '图形与标记', 180, 140, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <polygon points="90,16 140,44 90,72 40,44" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <polygon points="40,44 90,72 90,124 40,96" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <polygon points="90,72 140,44 140,96 90,124" fill="#D5DAE0" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
    </g>
  `);

  add('3dcylinder', '圆柱体', '图形与标记', 180, 140, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M50 34 V104 A40 16 0 0 0 130 104 V34 Z" fill="${C.chassisMid}" stroke="none"/>
      <path d="M50 34 V104 A40 16 0 0 0 130 104 V34" fill="none" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <ellipse cx="90" cy="34" rx="40" ry="16" fill="#D5DAE0" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
    </g>
  `);

  add('label', '标签', '图形与标记', 180, 140, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="26" y="42" width="128" height="56" rx="5" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      ${labelText(90, 75, 'Label', 13, C.stroke, 'middle', true)}
    </g>
  `);

  add('eye', '眼睛', '图形与标记', 180, 140, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 70 Q90 20 160 70 Q90 120 20 70 Z" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <circle cx="90" cy="70" r="22" fill="${C.steelBlue}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <circle cx="90" cy="70" r="9.5" fill="${C.stroke}" stroke="none"/>
      <circle cx="83" cy="63" r="3.8" fill="#FFFFFF" stroke="none"/>
    </g>
  `);
};
