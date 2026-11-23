'use strict';

const S = require('./svg-style.cjs');
const {
  C, SW, r, safeId,
  chassis, oledScreen, screenText, labelText, rotaryKnob, softButton, bindingPost,
} = S;

/**
 * Registers all 72 electrical, optical, mechanics, biological specimen,
 * substance/fill, and diagram annotation items in the Classic Flat #294454 House Style
 * (zero gradients, zero url(#...), uniform rounded linework, light #EEF6F1 LCD panels).
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
      <path d="M51 32 C98 32 40 152 87 152" fill="none" stroke="${C.stroke}" stroke-width="10.5"/>
      <path d="M51 32 C98 32 40 152 87 152" fill="none" stroke="${C.teal}" stroke-width="6.0"/>
      <!-- Left banana plug -->
      <rect x="26" y="25.5" width="25" height="13" rx="3" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="16" y="29" width="10" height="6" rx="1" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <line x1="16" y1="28.5" x2="16" y2="35.5" stroke="${C.stroke}" stroke-width="2.2"/>
      <!-- Right banana plug -->
      <rect x="87" y="145.5" width="25" height="13" rx="3" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="112" y="149" width="10" height="6" rx="1" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <line x1="122" y1="148.5" x2="122" y2="155.5" stroke="${C.stroke}" stroke-width="2.2"/>
    </g>
  `, {
    ports: [
      { id: 'inlet', x: 16, y: 32, dx: -1, dy: 0, type: 'wire', diameter: 9, segment: [21, 32, 51, 32], edge: [16, 29.5, 16, 34.5] },
      { id: 'outlet', x: 122, y: 152, dx: 1, dy: 0, type: 'wire', diameter: 9, segment: [117, 152, 87, 152], edge: [122, 154.5, 122, 149.5] },
    ],
  });

  // 2. powerpack
  add('powerpack', '直流电源', '电学', 180, 150, (p) => `
    <g stroke-linecap="round" stroke-linejoin="round">
      ${chassis(p, 16, 16, 148, 118, { rx: 8, accentBar: true, footW: 16, footH: 6, footInset: 14 })}
      ${oledScreen(p, 32, 30, 116, 36,
        screenText(90, 45, '12.0 V   DC', 10.5, C.teal, 'middle') +
        screenText(90, 58, 'POWER PACK  2A', 6.8, C.stroke, 'middle')
      )}
      ${softButton(28, 76, 30, 16, 'ON', C.red, '#FFFFFF')}
      ${rotaryKnob(p, 90, 86, 13, 15, { ticks: 7, teal: true })}
      ${labelText(138, 86, 'STEP V', 6.5, C.inner)}
      ${bindingPost(42, 116, C.red, '+', -11, 7)}
      ${bindingPost(138, 116, C.stroke, '−', -11, 7)}
    </g>
  `, {
    ports: [
      { id: 'positive', x: 42, y: 116, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'negative', x: 138, y: 116, dx: 0, dy: 1, type: 'wire', diameter: 0 },
    ],
  });

  // 3. battery
  add('battery', '电池', '电学', 90, 170, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="35" y="13" width="20" height="11" rx="3" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="26" y="148" width="38" height="8" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="22" y="24" width="46" height="124" rx="5" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <rect x="23" y="25" width="44" height="37" rx="3" fill="${C.teal}" stroke="none"/>
      <line x1="22" y1="62" x2="68" y2="62" stroke="${C.stroke}" stroke-width="2.0"/>
      ${labelText(45, 48, '+', 15, '#FFFFFF', 'middle', true)}
      ${labelText(45, 92, '1.5 V', 10.5, C.stroke, 'middle', true)}
      ${labelText(45, 108, 'DRY CELL', 6.2, C.tick, 'middle', true)}
      ${labelText(45, 137, '−', 14, C.stroke, 'middle', true)}
    </g>
  `, {
    ports: [
      { id: 'positive', x: 45, y: 15, dx: 0, dy: -1, type: 'wire', diameter: 0 },
      { id: 'negative', x: 45, y: 154, dx: 0, dy: 1, type: 'wire', diameter: 0 },
    ],
  });

  // 4. digital-ammeter
  add('digital-ammeter', '数字电流表', '电学', 180, 150, (p) => `
    <g stroke-linecap="round" stroke-linejoin="round">
      ${chassis(p, 16, 16, 148, 118, { rx: 8, accentBar: true, accentColor: C.teal, footW: 16, footH: 6, footInset: 14 })}
      ${oledScreen(p, 28, 30, 124, 48,
        screenText(36, 44, 'DC AMMETER', 6.8, C.stroke, 'start') +
        screenText(144, 44, 'AUTO', 6.5, C.amberDark, 'end') +
        screenText(90, 66, '1.250 A', 13, C.teal, 'middle')
      )}
      ${softButton(64, 88, 52, 16, 'RANGE 2A', C.chassisTop, C.stroke)}
      ${bindingPost(42, 116, C.red, '+', -11, 7)}
      ${bindingPost(138, 116, C.stroke, '−', -11, 7)}
    </g>
  `, {
    ports: [
      { id: 'positive', x: 42, y: 116, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'negative', x: 138, y: 116, dx: 0, dy: 1, type: 'wire', diameter: 0 },
    ],
  });

  // 5. digital-voltmeter
  add('digital-voltmeter', '数字电压表', '电学', 180, 150, (p) => `
    <g stroke-linecap="round" stroke-linejoin="round">
      ${chassis(p, 16, 16, 148, 118, { rx: 8, accentBar: true, accentColor: C.inner, footW: 16, footH: 6, footInset: 14 })}
      ${oledScreen(p, 28, 30, 124, 48,
        screenText(36, 44, 'DC VOLTMETER', 6.8, C.stroke, 'start') +
        screenText(144, 44, 'HOLD', 6.5, C.amberDark, 'end') +
        screenText(90, 66, '12.40 V', 13, C.teal, 'middle')
      )}
      ${softButton(64, 88, 52, 16, 'RANGE 20V', C.chassisTop, C.stroke)}
      ${bindingPost(42, 116, C.red, '+', -11, 7)}
      ${bindingPost(138, 116, C.stroke, '−', -11, 7)}
    </g>
  `, {
    ports: [
      { id: 'positive', x: 42, y: 116, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'negative', x: 138, y: 116, dx: 0, dy: 1, type: 'wire', diameter: 0 },
    ],
  });

  // 6. resistor
  add('resistor', '电阻', '电学', 180, 150, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="12" y="72.5" width="38" height="5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="130" y="72.5" width="38" height="5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="10" cy="75" r="4" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="170" cy="75" r="4" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <path d="M48 60 Q48 54 56 54 H64 Q68 58 72 58 H108 Q112 58 116 54 H124 Q132 54 132 60 V90 Q132 96 124 96 H116 Q112 92 108 92 H72 Q68 92 64 96 H56 Q48 96 48 90 Z" fill="${C.porcelainMid}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <rect x="57" y="55" width="7" height="40" fill="${C.copper}" stroke="none"/>
      <rect x="74" y="59" width="7" height="32" fill="${C.stroke}" stroke="none"/>
      <rect x="90" y="59" width="7" height="32" fill="${C.teal}" stroke="none"/>
      <rect x="116" y="55" width="7" height="40" fill="${C.brass}" stroke="none"/>
      ${labelText(90, 118, '1.0 kΩ  ±5%', 8, C.inner)}
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
      <rect x="46" y="114" width="88" height="22" rx="4" fill="${C.porcelainMid}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <rect x="74" y="92" width="32" height="22" rx="2" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.0"/>
      <line x1="74" y1="100" x2="106" y2="97" stroke="${C.amberDark}" stroke-width="1.3"/>
      <line x1="74" y1="108" x2="106" y2="105" stroke="${C.amberDark}" stroke-width="1.3"/>
      <circle cx="90" cy="56" r="37" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <path d="M82 92 L84 56 L87 52 L90 58 L93 52 L96 56 L98 92" fill="none" stroke="${C.brass}" stroke-width="2.2"/>
      ${bindingPost(73, 141, C.red, '', 0, 5.8)}
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
      <rect x="12" y="72.5" width="42" height="5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="126" y="72.5" width="42" height="5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="10" cy="75" r="4" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="170" cy="75" r="4" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="52" y="54" width="76" height="42" rx="4" fill="${C.inner}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <rect x="108" y="55" width="12" height="40" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="1.2"/>
      <polygon points="72,65 72,85 90,75" fill="${C.chassisTop}" stroke="none"/>
      <line x1="90" y1="65" x2="90" y2="85" stroke="${C.chassisTop}" stroke-width="2.2"/>
      ${labelText(90, 114, '1N4007  DIODE', 7.5, C.inner)}
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
      <circle cx="73" cy="141" r="4" fill="${C.red}" stroke="${C.stroke}" stroke-width="1.6"/>
      <circle cx="107" cy="141" r="4" fill="${C.stroke}" stroke="${C.stroke}" stroke-width="1.6"/>
      <path d="M62 84 V52 A28 28 0 0 1 118 52 V84 Z" fill="${C.tealSoft}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <rect x="57" y="83" width="66" height="9" rx="2" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.0"/>
      <path d="M74 83 V56 H86 L92 64 V83 M106 83 V56" fill="none" stroke="${C.inner}" stroke-width="1.6"/>
      <line x1="126" y1="36" x2="140" y2="26" stroke="${C.brass}" stroke-width="2.2"/>
      <line x1="130" y1="52" x2="146" y2="48" stroke="${C.brass}" stroke-width="2.2"/>
      <line x1="54" y1="36" x2="40" y2="26" stroke="${C.brass}" stroke-width="2.2"/>
      ${labelText(60, 126, '+', 9, C.red)}
      ${labelText(120, 126, '−', 9, C.stroke)}
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
      <rect x="12" y="72.5" width="40" height="5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="128" y="72.5" width="40" height="5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="10" cy="75" r="4" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="170" cy="75" r="4" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="52" y="50" width="76" height="50" rx="5" fill="${C.teal}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <rect x="108" y="51" width="12" height="48" fill="${C.chassisMid}" stroke="none"/>
      <line x1="59" y1="52" x2="59" y2="98" stroke="${C.stroke}" stroke-width="1.5"/>
      <line x1="120" y1="52" x2="120" y2="98" stroke="${C.stroke}" stroke-width="1.5"/>
      ${labelText(84, 78, '100 µF', 9.5, '#FFFFFF', 'middle', true)}
      ${labelText(114, 78, '−', 11, C.stroke, 'middle', true)}
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
      <rect x="18" y="52" width="72" height="46" rx="3" fill="${C.red}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <rect x="90" y="52" width="72" height="46" rx="3" fill="${C.inner}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <line x1="90" y1="52" x2="90" y2="98" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="18" y="52" width="144" height="46" rx="3" fill="none" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      ${labelText(54, 81, 'N', 18, '#FFFFFF', 'middle', true)}
      ${labelText(126, 81, 'S', 18, '#FFFFFF', 'middle', true)}
    </g>
  `);

  // 12. compass
  add('compass', '指南针', '电学', 180, 150, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <circle cx="90" cy="75" r="52" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <circle cx="90" cy="75" r="44" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="1.6"/>
      ${labelText(90, 41, 'N', 9, C.red)}
      ${labelText(90, 114, 'S', 8.5, C.stroke)}
      ${labelText(53, 78, 'W', 8, C.tick)}
      ${labelText(127, 78, 'E', 8, C.tick)}
      <polygon points="90,75 83,68 112,50 96,76" fill="${C.red}" stroke="${C.stroke}" stroke-width="1.6"/>
      <polygon points="90,75 83,68 68,100 96,76" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.6"/>
      <circle cx="90" cy="75" r="4.5" fill="${C.brass}" stroke="${C.stroke}" stroke-width="1.5"/>
    </g>
  `);

  // 13. solenoid
  add('solenoid', '螺线管', '电学', 180, 150, () => {
    let coils = '';
    for (let x = 44; x <= 134; x += 9) {
      coils += `<path d="M${x} 48 Q${x + 4} 43 ${x + 7} 48 V104 Q${x + 4} 109 ${x} 104 Z" fill="${C.copper}" stroke="${C.stroke}" stroke-width="1.3"/>`;
    }
    return `<g stroke-linecap="round" stroke-linejoin="round">
      <path d="M10 76 H44 M141 76 H174" fill="none" stroke="${C.copper}" stroke-width="3.2"/>
      <circle cx="10" cy="76" r="4" fill="${C.brass}" stroke="${C.stroke}" stroke-width="1.8"/>
      <circle cx="174" cy="76" r="4" fill="${C.brass}" stroke="${C.stroke}" stroke-width="1.8"/>
      <rect x="34" y="46" width="114" height="60" rx="4" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="2.2"/>
      ${coils}
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

  // 14. petri-dish (exact base port at (90,130))
  add('petri-dish', '培养皿', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="32" y="92" width="116" height="38" rx="4" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <rect x="35" y="108" width="110" height="19" rx="2" fill="${C.liquid}" stroke="${C.teal}" stroke-width="1.2"/>
      <rect x="26" y="78" width="128" height="22" rx="4" fill="${C.glass}" fill-opacity="0.7" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
    </g>
  `, {
    ports: [{ id: 'base', x: 90, y: 130, dx: 0, dy: 1, type: 'base', diameter: 0 }],
  });

  // 15. petri-top
  add('petri-top', '培养皿俯视图', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <circle cx="90" cy="90" r="66" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <circle cx="90" cy="90" r="56" fill="${C.liquid}" stroke="${C.inner}" stroke-width="1.5"/>
      <path d="M52 72 Q86 58 118 68 M60 88 Q96 76 124 88 M64 108 L108 106" fill="none" stroke="${C.tealDark}" stroke-width="1.5"/>
      <circle cx="64" cy="112" r="4" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.3"/>
      <circle cx="80" cy="120" r="3.2" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.2"/>
      <circle cx="104" cy="118" r="4.5" fill="${C.brassLight}" stroke="${C.stroke}" stroke-width="1.3"/>
      <circle cx="118" cy="100" r="3" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.2"/>
    </g>
  `);

  // 16. choice-chamber
  add('choice-chamber', '选择室', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <circle cx="90" cy="90" r="65" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <path d="M90 90 V32 A58 58 0 0 1 148 90 Z" fill="${C.coolant}" stroke="${C.stroke}" stroke-width="1.5"/>
      <path d="M90 90 H148 A58 58 0 0 1 90 148 Z" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="1.5"/>
      <path d="M90 90 V148 A58 58 0 0 1 32 90 Z" fill="${C.rubberMid}" stroke="${C.stroke}" stroke-width="1.5"/>
      <path d="M90 90 H32 A58 58 0 0 1 90 32 Z" fill="${C.muted}" stroke="${C.stroke}" stroke-width="1.5"/>
      <circle cx="90" cy="90" r="15" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="90" cy="90" r="5" fill="${C.teal}" stroke="none"/>
    </g>
  `);

  // 17. microscope-slide (clean flat frosted end without diagonal XXX lines)
  add('microscope-slide', '载玻片', '生物实验', 180, 100, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="14" y="28" width="152" height="44" rx="2" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <rect x="16" y="30" width="32" height="40" fill="${C.chassisMid}" stroke="${C.inner}" stroke-width="1.3"/>
      <ellipse cx="105" cy="50" rx="11" ry="8" fill="${C.teal}" fill-opacity="0.45" stroke="none"/>
      <rect x="86" y="33" width="38" height="34" rx="1" fill="${C.glass}" fill-opacity="0.45" stroke="${C.inner}" stroke-width="1.4"/>
    </g>
  `);

  // 18. cover-slip
  add('cover-slip', '盖玻片', '生物实验', 180, 100, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="54" y="14" width="72" height="72" rx="2" fill="${C.glass}" fill-opacity="0.72" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="59" y="19" width="62" height="62" rx="1" fill="none" stroke="${C.inner}" stroke-width="1.0"/>
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
      <rect x="24" y="24" width="132" height="132" rx="3" fill="none" stroke="${C.stroke}" stroke-width="6.5"/>
      <rect x="24" y="24" width="132" height="132" rx="3" fill="none" stroke="${C.chassisBot}" stroke-width="3.0"/>
    </g>`;
  });

  // 20. bacteria
  add('bacteria', '杆菌示意', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M40 94 Q24 80 14 96 Q24 114 10 120" fill="none" stroke="${C.tealDark}" stroke-width="2.2"/>
      <path d="M42 104 Q26 116 18 106" fill="none" stroke="${C.tealDark}" stroke-width="2.0"/>
      <rect x="38" y="66" width="106" height="48" rx="24" fill="${C.teal}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <rect x="44" y="72" width="94" height="36" rx="18" fill="${C.tealSoft}" stroke="${C.tealDark}" stroke-width="1.5"/>
      <path d="M62 90 Q72 78 82 90 T102 90 T120 90" fill="none" stroke="${C.red}" stroke-width="2.0"/>
      <circle cx="58" cy="84" r="2" fill="${C.stroke}" stroke="none"/>
      <circle cx="116" cy="82" r="2" fill="${C.stroke}" stroke="none"/>
      <circle cx="90" cy="99" r="2" fill="${C.stroke}" stroke="none"/>
    </g>
  `);

  // 21. seed
  add('seed', '种子', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M42 94 C36 46 82 32 126 52 C156 66 154 120 116 136 C86 148 76 114 64 118 C48 124 44 108 42 94 Z" fill="${C.corkMid}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <ellipse cx="74" cy="110" rx="10" ry="4" transform="rotate(-24 74 110)" fill="${C.porcelainMid}" stroke="${C.corkDark}" stroke-width="1.3"/>
      <path d="M44 98 C28 104 20 122 28 134 C36 122 44 114 52 110" fill="${C.leafSoft}" stroke="${C.stroke}" stroke-width="2.0"/>
    </g>
  `);

  // 22. potato
  add('potato', '马铃薯', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M30 100 C20 64 56 42 104 46 C148 50 162 84 148 114 C132 142 42 140 30 100 Z" fill="${C.corkLight}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <path d="M62 74 Q66 78 72 74" fill="none" stroke="${C.corkDark}" stroke-width="1.8"/>
      <path d="M108 88 Q114 92 120 88" fill="none" stroke="${C.corkDark}" stroke-width="1.8"/>
      <path d="M78 108 Q84 112 88 108" fill="none" stroke="${C.corkDark}" stroke-width="1.8"/>
      <circle cx="67" cy="72" r="1.5" fill="${C.corkDark}" stroke="none"/>
      <circle cx="114" cy="86" r="1.5" fill="${C.corkDark}" stroke="none"/>
    </g>
  `);

  // 23. agar
  add('agar', '琼脂块', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="40" y="42" width="100" height="96" rx="8" fill="${C.liquid}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <rect x="47" y="49" width="86" height="82" rx="4" fill="none" stroke="${C.teal}" stroke-width="1.2"/>
      <circle cx="90" cy="90" r="14" fill="${C.tealLight}" stroke="${C.teal}" stroke-width="1.4" stroke-dasharray="3 2"/>
      <circle cx="90" cy="90" r="4" fill="${C.teal}" stroke="none"/>
    </g>
  `);

  // 24. pot (exact base port at (90, 158))
  add('pot', '花盆', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="48" y="150" width="84" height="8" rx="3" fill="${C.corkMid}" stroke="${C.stroke}" stroke-width="2.2"/>
      <path d="M46 58 L60 150 H120 L134 58 Z" fill="${C.corkMid}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <rect x="38" y="38" width="104" height="20" rx="4" fill="${C.corkLight}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <path d="M52 38 Q90 28 128 38" fill="${C.corkDark}" stroke="${C.stroke}" stroke-width="1.8"/>
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
      <path d="M90 88 Q88 128 90 168" fill="none" stroke="${C.stroke}" stroke-width="1.4"/>
      <path d="M89 144 Q58 134 52 114 Q74 114 89 138 Z" fill="${C.leafSoft}" stroke="${C.stroke}" stroke-width="2.0"/>
      <path d="M91 136 Q122 126 128 106 Q106 106 91 130 Z" fill="${C.leaf}" stroke="${C.stroke}" stroke-width="2.0"/>
      ${petals}
      <circle cx="90" cy="66" r="15" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.2"/>
    </g>`;
  });

  // 26. tree
  add('tree', '树', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M78 96 L70 168 H110 L102 96 Z" fill="${C.corkMid}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <circle cx="54" cy="76" r="30" fill="${C.leaf}" stroke="${C.stroke}" stroke-width="2.2"/>
      <circle cx="126" cy="74" r="32" fill="${C.leaf}" stroke="${C.stroke}" stroke-width="2.2"/>
      <circle cx="90" cy="44" r="32" fill="${C.leafSoft}" stroke="${C.stroke}" stroke-width="2.2"/>
      <circle cx="90" cy="84" r="34" fill="${C.leaf}" stroke="${C.stroke}" stroke-width="2.2"/>
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

  // 29. shoot
  add('shoot', '嫩枝', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M88 164 Q86 102 92 24" fill="none" stroke="${C.leaf}" stroke-width="4.4"/>
      <path d="M88 164 Q86 102 92 24" fill="none" stroke="${C.stroke}" stroke-width="1.4"/>
      <line x1="83" y1="166" x2="94" y2="162" stroke="${C.stroke}" stroke-width="2.2"/>
      <path d="M88 124 Q42 112 36 86 Q74 86 88 118 Z" fill="${C.leaf}" stroke="${C.stroke}" stroke-width="2.2"/>
      <path d="M90 94 Q138 84 142 58 Q104 58 90 88 Z" fill="${C.leafSoft}" stroke="${C.stroke}" stroke-width="2.2"/>
      <path d="M91 62 Q48 52 46 28 Q78 28 91 56 Z" fill="${C.leafSoft}" stroke="${C.stroke}" stroke-width="2.2"/>
    </g>
  `);

  // 30. pond-weed
  add('pond-weed', '水草', '生物实验', 180, 180, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="154" x2="162" y2="154" stroke="${C.teal}" stroke-width="2.0" stroke-dasharray="5 5"/>
      <path d="M90 166 Q84 102 92 26" fill="none" stroke="${C.leaf}" stroke-width="3.8"/>
      <path d="M89 130 Q50 120 44 96 Q74 96 89 124 Z" fill="${C.leaf}" stroke="${C.stroke}" stroke-width="2.0"/>
      <path d="M90 112 Q132 102 136 78 Q104 78 90 106 Z" fill="${C.leafSoft}" stroke="${C.stroke}" stroke-width="2.0"/>
      <path d="M90 84 Q48 74 44 50 Q74 50 90 78 Z" fill="${C.leafSoft}" stroke="${C.stroke}" stroke-width="2.0"/>
      <path d="M91 60 Q128 50 132 28 Q104 28 91 54 Z" fill="${C.leaf}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="72" cy="40" r="4" fill="${C.glassTop}" stroke="${C.teal}" stroke-width="1.4"/>
      <circle cx="110" cy="24" r="5" fill="${C.glassTop}" stroke="${C.teal}" stroke-width="1.4"/>
      <circle cx="96" cy="14" r="3.5" fill="${C.glassTop}" stroke="${C.teal}" stroke-width="1.4"/>
    </g>
  `);

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
      <path d="M90 38 H56 A22 22 0 0 0 56 82 H90 Z" fill="${C.teal}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <path d="M90 38 H124 A22 22 0 0 1 124 82 H90 Z" fill="${C.porcelainMid}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <line x1="90" y1="38" x2="90" y2="82" stroke="${C.stroke}" stroke-width="2.2"/>
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
        `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="1.8"/>`
      ).join('') +
      `</g>`;
  });

  // 36. beads
  add('beads', '微珠', '物质与填充', 170, 130, () => {
    const pts = [[36, 86], [56, 70], [78, 86], [100, 68], [124, 84], [46, 50], [72, 46], [116, 46], [92, 92], [136, 62]];
    return `<g stroke-linecap="round" stroke-linejoin="round">` +
      pts.map(([cx, cy], i) =>
        `<circle cx="${cx}" cy="${cy}" r="${i % 2 ? 9.5 : 8}" fill="${i % 3 === 0 ? C.teal : C.glass}" stroke="${C.stroke}" stroke-width="2.0"/>`
      ).join('') +
      `</g>`;
  });

  // 37. particles
  add('particles', '颗粒', '物质与填充', 170, 130, () => {
    const pts = [[32, 74, 7], [58, 52, 9], [86, 68, 8], [114, 48, 7], [136, 76, 9], [64, 94, 8], [102, 96, 7], [44, 40, 5], [124, 102, 5]];
    return `<g stroke-linecap="round" stroke-linejoin="round">` +
      pts.map(([cx, cy, rad], i) =>
        `<polygon points="${cx},${cy - rad} ${cx + rad},${cy} ${cx + rad * 0.4},${cy + rad} ${cx - rad * 0.7},${cy + rad * 0.6}" fill="${i % 2 ? C.corkLight : C.chassisBot}" stroke="${C.stroke}" stroke-width="1.8"/>`
      ).join('') +
      `</g>`;
  });

  // 38. crystals
  add('crystals', '晶体', '物质与填充', 170, 130, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <polygon points="34,104 34,48 54,28 74,48 74,104" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="2.2"/>
      <line x1="54" y1="28" x2="54" y2="104" stroke="${C.inner}" stroke-width="1.2"/>
      <polygon points="74,104 74,40 96,18 118,40 118,104" fill="${C.coolant}" stroke="${C.stroke}" stroke-width="2.2"/>
      <line x1="96" y1="18" x2="96" y2="104" stroke="${C.teal}" stroke-width="1.2"/>
      <polygon points="116,104 116,64 132,48 148,64 148,104" fill="${C.glass}" stroke="${C.stroke}" stroke-width="2.2"/>
    </g>
  `);

  // 39. drop
  add('drop', '液滴', '物质与填充', 170, 130, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M85 14 C68 46 42 64 46 92 C50 116 70 120 85 120 C100 120 120 116 124 92 C128 64 102 46 85 14 Z" fill="${C.teal}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
    </g>
  `);

  // 40. ice-cube
  add('ice-cube', '冰块', '物质与填充', 170, 130, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="38" y="20" width="94" height="90" rx="14" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <rect x="46" y="28" width="78" height="74" rx="10" fill="${C.coolant}" fill-opacity="0.4" stroke="${C.inner}" stroke-width="1.3"/>
      <path d="M58 58 L78 46 L94 64 M78 84 L106 72" fill="none" stroke="${C.tick}" stroke-width="1.4"/>
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

  // 43. smoke
  add('smoke', '烟雾', '物质与填充', 170, 130, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M52 114 C36 86 78 78 58 50 C44 30 68 18 76 14" fill="none" stroke="${C.muted}" stroke-width="8"/>
      <path d="M84 116 C68 88 110 72 90 42 C78 24 96 16 104 12" fill="none" stroke="${C.chassisBot}" stroke-width="9"/>
      <path d="M114 114 C100 88 134 78 118 48 C108 32 124 22 132 18" fill="none" stroke="${C.muted}" stroke-width="7"/>
      <path d="M84 116 C68 88 110 72 90 42 C78 24 96 16 104 12" fill="none" stroke="${C.inner}" stroke-width="1.5"/>
    </g>
  `);

  // 44. hand
  add('hand', '手部示意', '测量与防护', 180, 150, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M52 134 L34 88 Q24 68 38 66 L54 84 V32 Q54 18 65 26 V64 V18 Q70 8 79 18 V62 V22 Q89 10 94 24 V66 V36 Q104 26 108 42 V88 L130 72 Q146 68 136 90 L114 134 Z" fill="${C.porcelainMid}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <path d="M68 92 Q86 86 100 96" fill="none" stroke="${C.tick}" stroke-width="1.5"/>
    </g>
  `);

  // =========================================================================
  // 4. OPTICS (8)
  // =========================================================================

  // 45. prism
  add('prism', '三棱镜', '光学', 190, 160, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="84" x2="72" y2="84" stroke="${C.brass}" stroke-width="2.4"/>
      <line x1="72" y1="84" x2="122" y2="78" stroke="${C.amberLight}" stroke-width="1.8"/>
      <line x1="122" y1="78" x2="178" y2="62" stroke="${C.red}" stroke-width="2.0"/>
      <line x1="123" y1="81" x2="178" y2="78" stroke="${C.brass}" stroke-width="2.0"/>
      <line x1="125" y1="84" x2="178" y2="94" stroke="${C.leaf}" stroke-width="2.0"/>
      <line x1="127" y1="87" x2="178" y2="110" stroke="${C.blue}" stroke-width="2.0"/>
      <polygon points="95,24 44,128 146,128" fill="${C.glassTop}" fill-opacity="0.72" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
    </g>
  `);

  // 46. lens
  add('lens', '凸透镜', '光学', 190, 160, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <line x1="14" y1="80" x2="176" y2="80" stroke="${C.tick}" stroke-width="1.4" stroke-dasharray="6 5"/>
      <path d="M95 16 Q50 80 95 144 Q140 80 95 16 Z" fill="${C.glassTop}" fill-opacity="0.78" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
    </g>
  `);

  // 47. glass-block
  add('glass-block', '玻璃砖', '光学', 190, 160, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="28" y="38" width="134" height="84" rx="4" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <rect x="35" y="45" width="120" height="70" rx="2" fill="none" stroke="${C.inner}" stroke-width="1.2"/>
    </g>
  `);

  // 48. mirror
  add('mirror', '平面镜', '光学', 190, 160, () => {
    let hatch = '';
    for (let y = 24; y <= 142; y += 12) {
      hatch += `<line x1="100" y1="${y}" x2="112" y2="${y - 9}" stroke="${C.inner}" stroke-width="1.6"/>`;
    }
    return `<g stroke-linecap="round" stroke-linejoin="round">
      <rect x="88" y="18" width="12" height="124" rx="2" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      ${hatch}
    </g>`;
  });

  // 49. curved-mirror
  add('curved-mirror', '凹面镜', '光学', 190, 160, () => {
    let hatch = '';
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const y = 20 + t * 120;
      const x = 114 - 4 * t * (1 - t) * 24;
      hatch += `<line x1="${r(x + 2)}" y1="${r(y)}" x2="${r(x + 12)}" y2="${r(y - 7)}" stroke="${C.inner}" stroke-width="1.6"/>`;
    }
    return `<g stroke-linecap="round" stroke-linejoin="round">
      ${hatch}
      <path d="M114 16 Q66 80 114 144" fill="none" stroke="${C.stroke}" stroke-width="5.2"/>
      <path d="M112 18 Q66 80 112 142" fill="none" stroke="${C.glassTop}" stroke-width="2.4"/>
    </g>`;
  });

  // 50. raybox
  add('raybox', '光源盒', '光学', 190, 160, (p) => `
    <g stroke-linecap="round" stroke-linejoin="round">
      ${chassis(p, 16, 40, 102, 82, { rx: 6, accentBar: true, feet: false })}
      <line x1="30" y1="62" x2="72" y2="62" stroke="${C.tick}" stroke-width="1.5"/>
      <line x1="30" y1="70" x2="72" y2="70" stroke="${C.tick}" stroke-width="1.5"/>
      <line x1="30" y1="78" x2="72" y2="78" stroke="${C.tick}" stroke-width="1.5"/>
      ${softButton(30, 92, 34, 16, 'LAMP', C.teal, '#FFFFFF')}
      <rect x="114" y="54" width="9" height="10" rx="1" fill="${C.stroke}" stroke="${C.stroke}" stroke-width="1.3"/>
      <rect x="114" y="76" width="9" height="10" rx="1" fill="${C.stroke}" stroke="${C.stroke}" stroke-width="1.3"/>
      <rect x="114" y="98" width="9" height="10" rx="1" fill="${C.stroke}" stroke="${C.stroke}" stroke-width="1.3"/>
      <line x1="124" y1="59" x2="176" y2="59" stroke="${C.brass}" stroke-width="2.4"/>
      <line x1="124" y1="81" x2="176" y2="81" stroke="${C.brass}" stroke-width="2.4"/>
      <line x1="124" y1="103" x2="176" y2="103" stroke="${C.brass}" stroke-width="2.4"/>
    </g>
  `);

  // 51. ray
  add('ray', '光线', '光学', 190, 160, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <line x1="14" y1="90" x2="172" y2="54" stroke="${C.stroke}" stroke-width="5.0"/>
      <line x1="14" y1="90" x2="172" y2="54" stroke="${C.brass}" stroke-width="2.6"/>
      <polygon points="178,52 156,46 160,64" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.0"/>
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
      rays += `<line x1="${r(x1)}" y1="${r(y1)}" x2="${r(x2)}" y2="${r(y2)}" stroke="${C.brass}" stroke-width="3.2"/>`;
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
      <path d="M164 90 H172 C177 90 177 98 171 98" fill="none" stroke="${C.stroke}" stroke-width="2.4"/>
      <rect x="20" y="64" width="144" height="52" rx="6" fill="${C.teal}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <rect x="30" y="70" width="124" height="14" rx="2" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="1.3"/>
      ${labelText(92, 98, 'DYNAMICS CART', 7.2, '#FFFFFF')}
      <circle cx="52" cy="126" r="16" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <circle cx="52" cy="126" r="5" fill="${C.stroke}" stroke="none"/>
      <circle cx="136" cy="126" r="16" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <circle cx="136" cy="126" r="5" fill="${C.stroke}" stroke="none"/>
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
      scaleTicks += `<line x1="${r(sx)}" y1="${r(sy)}" x2="${r(sx + 3)}" y2="${r(sy + 4.8)}" stroke="${C.stroke}" stroke-width="1.2"/>`;
    }
    return `<g stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 139 L176 34 V145 H12 Z" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <line x1="12" y1="145" x2="178" y2="145" stroke="${C.stroke}" stroke-width="2.4"/>
      ${scaleTicks}
      <path d="M46 139 A24 24 0 0 0 40 121" fill="none" stroke="${C.teal}" stroke-width="1.8"/>
      ${labelText(58, 132, 'θ', 9, C.teal)}
    </g>`;
  }, {
    ports: [{ id: 'surface', x: 94, y: 86.5, dx: -105, dy: -164, type: 'surface', diameter: 0, segment: [12, 139, 176, 34] }],
  });

  // 55. light-gate (exact signal (141, 43) & grip-site (48, 100))
  add('light-gate', '光电门', '力学', 190, 165, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M36 138 V30 H154 V138 H124 V60 H66 V138 Z" fill="${C.chassisMid}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <rect x="36" y="30" width="118" height="12" rx="3" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.0"/>
      <rect x="61" y="94" width="6" height="10" rx="1" fill="${C.stroke}" stroke="none"/>
      <rect x="123" y="94" width="6" height="10" rx="1" fill="${C.stroke}" stroke="none"/>
      <line x1="67" y1="99" x2="123" y2="99" stroke="${C.red}" stroke-width="1.8" stroke-dasharray="4 3"/>
      <circle cx="48" cy="100" r="5" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="1.6"/>
      ${bindingPost(141, 43, C.stroke, '', 0, 5.5)}
    </g>
  `, {
    ports: [
      { id: 'signal', x: 141, y: 43, dx: 0, dy: 1, type: 'wire', diameter: 0 },
      { id: 'grip-site', x: 48, y: 100, dx: 1, dy: 0, type: 'grip-site', diameter: 0 },
    ],
  });

  // 56. pulley (exact hanger port (95, 12))
  add('pulley', '滑轮', '力学', 190, 165, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M95 28 V12 C95 7 102 7 102 12" fill="none" stroke="${C.stroke}" stroke-width="2.2"/>
      <path d="M51 148 V82 A44 44 0 0 1 139 82 V148" fill="none" stroke="${C.copper}" stroke-width="2.4"/>
      <circle cx="95" cy="82" r="44" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="${SW.outer}"/>
      <circle cx="95" cy="82" r="34" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="1.6"/>
      <rect x="88" y="28" width="14" height="58" rx="3" fill="${C.inner}" stroke="${C.stroke}" stroke-width="2.0"/>
      <circle cx="95" cy="82" r="6" fill="${C.brass}" stroke="${C.stroke}" stroke-width="1.6"/>
    </g>
  `, {
    ports: [{ id: 'hanger', x: 95, y: 12, dx: 0, dy: -1, type: 'hanger', diameter: 0 }],
  });

  // 57. spring (exact top (95, 9) & bottom (95, 151))
  add('spring', '弹簧', '力学', 190, 165, () => {
    let path = 'M95 20 V28';
    for (let i = 0; i < 9; i++) {
      const y0 = 28 + i * 12;
      path += ` L112 ${y0 + 3} L78 ${y0 + 9}`;
    }
    path += ' L95 138 V146';
    return `<g stroke-linecap="round" stroke-linejoin="round">
      <circle cx="95" cy="14" r="5.5" fill="none" stroke="${C.stroke}" stroke-width="2.2"/>
      <path d="${path}" fill="none" stroke="${C.stroke}" stroke-width="3.6"/>
      <path d="${path}" fill="none" stroke="${C.chassisBot}" stroke-width="1.5"/>
      <path d="M95 144 C95 154 102 156 102 149" fill="none" stroke="${C.stroke}" stroke-width="2.2"/>
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
      <path d="M77 25 C77 18 85 18 85 24" fill="none" stroke="${C.stroke}" stroke-width="2.2"/>
      <line x1="77" y1="25" x2="77" y2="140" stroke="${C.stroke}" stroke-width="3.2"/>
      <rect x="46" y="78" width="62" height="18" rx="3" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="46" y="98" width="62" height="18" rx="3" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="46" y="118" width="62" height="18" rx="3" fill="${C.brass}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="42" y="136" width="70" height="7" rx="2" fill="${C.chassisBot}" stroke="${C.stroke}" stroke-width="2.0"/>
      ${labelText(132, 114, '50 g ×3', 8, C.stroke)}
    </g>
  `, {
    ports: [{ id: 'hanger', x: 77, y: 25, dx: 0, dy: -1, type: 'hanger', diameter: 0 }],
  });

  // =========================================================================
  // 6. GEOMETRIC SHAPES & DIAGRAM ANNOTATIONS (14)
  // =========================================================================

  add('rectangle', '矩形框', '图形与标记', 180, 140, () => `
    <rect x="20" y="24" width="140" height="92" rx="4" fill="${C.glassTop}" fill-opacity="0.35" stroke="${C.stroke}" stroke-width="2.4"/>
  `);

  add('ellipse', '椭圆', '图形与标记', 180, 140, () => `
    <ellipse cx="90" cy="70" rx="64" ry="44" fill="${C.glassTop}" fill-opacity="0.35" stroke="${C.stroke}" stroke-width="2.4"/>
  `);

  add('triangle', '三角形', '图形与标记', 180, 140, () => `
    <polygon points="90,22 150,118 30,118" fill="${C.glassTop}" fill-opacity="0.35" stroke="${C.stroke}" stroke-width="2.4" stroke-linejoin="round"/>
  `);

  add('line', '直线', '图形与标记', 180, 140, () => `
    <line x1="20" y1="108" x2="160" y2="32" stroke="${C.stroke}" stroke-width="2.8" stroke-linecap="round"/>
  `);

  add('arrow', '箭头', '图形与标记', 180, 140, () => `
    <path d="M22 60 H116 V42 L158 70 L116 98 V80 H22 Z" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.2" stroke-linejoin="round"/>
  `);

  add('curve', '曲线', '图形与标记', 180, 140, () => `
    <path d="M20 106 C58 18 122 122 160 34" fill="none" stroke="${C.stroke}" stroke-width="2.8" stroke-linecap="round"/>
  `);

  add('curved-arrow', '曲线箭头', '图形与标记', 180, 140, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M26 98 Q90 22 148 92" fill="none" stroke="${C.teal}" stroke-width="3.2"/>
      <polygon points="154,100 134,92 148,80" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.0"/>
    </g>
  `);

  add('stir-arrow', '旋转箭头', '图形与标记', 180, 140, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M46 66 A44 22 0 1 1 134 66" fill="none" stroke="${C.teal}" stroke-width="2.8"/>
      <path d="M134 74 A44 22 0 1 1 46 74" fill="none" stroke="${C.teal}" stroke-width="2.8"/>
      <polygon points="134,68 125,58 139,56" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.6"/>
      <polygon points="46,72 55,82 41,84" fill="${C.teal}" stroke="${C.stroke}" stroke-width="1.6"/>
    </g>
  `);

  add('cross', '十字', '图形与标记', 180, 140, () => `
    <g stroke="${C.stroke}" stroke-width="3.4" stroke-linecap="round">
      <line x1="56" y1="36" x2="124" y2="104"/>
      <line x1="124" y1="36" x2="56" y2="104"/>
    </g>
  `);

  add('cuboid', '长方体', '图形与标记', 180, 140, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <polygon points="28,46 112,46 146,24 62,24" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="2.2"/>
      <polygon points="28,46 112,46 112,114 28,114" fill="${C.coolant}" stroke="${C.stroke}" stroke-width="2.2"/>
      <polygon points="112,46 146,24 146,92 112,114" fill="${C.glass}" stroke="${C.stroke}" stroke-width="2.2"/>
    </g>
  `);

  add('isocube', '立方体', '图形与标记', 180, 140, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <polygon points="90,16 140,44 90,72 40,44" fill="${C.glassTop}" stroke="${C.stroke}" stroke-width="2.2"/>
      <polygon points="40,44 90,72 90,124 40,96" fill="${C.coolant}" stroke="${C.stroke}" stroke-width="2.2"/>
      <polygon points="90,72 140,44 140,96 90,124" fill="${C.glass}" stroke="${C.stroke}" stroke-width="2.2"/>
    </g>
  `);

  add('3dcylinder', '圆柱体', '图形与标记', 180, 140, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M50 34 V104 A40 16 0 0 0 130 104 V34 Z" fill="${C.glassTop}" stroke="none"/>
      <path d="M50 34 V104 A40 16 0 0 0 130 104 V34" fill="none" stroke="${C.stroke}" stroke-width="2.2"/>
      <ellipse cx="90" cy="34" rx="40" ry="16" fill="${C.coolant}" stroke="${C.stroke}" stroke-width="2.2"/>
    </g>
  `);

  add('label', '标签', '图形与标记', 180, 140, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <rect x="26" y="42" width="128" height="56" rx="6" fill="${C.chassisTop}" stroke="${C.stroke}" stroke-width="2.2"/>
      <rect x="28" y="44" width="124" height="8" rx="3" fill="${C.teal}" stroke="none"/>
      ${labelText(90, 79, 'Label', 13, C.stroke)}
    </g>
  `);

  add('eye', '眼睛', '图形与标记', 180, 140, () => `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 70 Q90 20 160 70 Q90 120 20 70 Z" fill="#FFFFFF" stroke="${C.stroke}" stroke-width="2.4"/>
      <circle cx="90" cy="70" r="22" fill="${C.teal}" stroke="${C.stroke}" stroke-width="2.2"/>
      <circle cx="90" cy="70" r="9.5" fill="${C.stroke}" stroke="none"/>
      <circle cx="83" cy="63" r="3.5" fill="#FFFFFF" stroke="none"/>
    </g>
  `);
};
