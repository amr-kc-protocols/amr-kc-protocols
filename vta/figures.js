// =====================================================================
// Ventilator Training Academy — teaching figures (inline SVG)
// © 2026 Jordan Hunter Jones <hunter04j@hotmail.com>. All rights reserved.
// Provenance ID: VTA-PROV-253AFF390A18
// ---------------------------------------------------------------------
// Self-contained SVG so the app stays offline-capable with no extra
// requests. Each figure has a `title` (rendered as the caption) and `svg`.
// Colours come from the app palette; text uses the inherited font stack.
// =====================================================================

"use strict";

const F_NAVY = "#173a68", F_BLUE = "#1b63c4", F_TERRA = "#1b63c4",
      F_GOLD = "#a1590b", F_RED = "#b3261e", F_GREEN = "#1c7d4d",
      F_INK = "#152238", F_MUTE = "#66707c", F_LINE = "#c9d3e0", F_SOFT = "#eef2f7";

const FIGURES = {

// ---------- Capnography waveform patterns ----------
capno: {
  title: "Four capnography patterns",
  alt: "Four capnography waveform shapes side by side: normal box, shark fin, rebreathing with elevated baseline, and a lost waveform.",
  svg: `<svg viewBox="0 0 640 260" xmlns="http://www.w3.org/2000/svg" role="img">
  ${[0,1,2,3].map(i=>`<rect x="${8+i*158}" y="8" width="146" height="176" rx="8" fill="${F_SOFT}"/>`).join("")}
  <!-- axes -->
  ${[0,1,2,3].map(i=>`<line x1="${22+i*158}" y1="168" x2="${150+i*158}" y2="168" stroke="${F_LINE}" stroke-width="2"/>`).join("")}
  <!-- 1 normal: sharp up, flat plateau, sharp down -->
  <path d="M22 168 L38 168 L44 52 L96 48 L102 168 L118 168 L124 52 L150 50" fill="none" stroke="${F_GREEN}" stroke-width="3.5" stroke-linejoin="round"/>
  <!-- 2 shark fin: sloped upstroke, no flat plateau -->
  <path d="M180 168 L196 168 L206 96 L254 50 L260 168 L276 168 L286 96 L308 58" fill="none" stroke="${F_GOLD}" stroke-width="3.5" stroke-linejoin="round"/>
  <!-- 3 rebreathing: baseline never returns to zero -->
  <line x1="338" y1="132" x2="466" y2="132" stroke="${F_MUTE}" stroke-width="1.5" stroke-dasharray="4 4"/>
  <path d="M338 132 L354 132 L360 52 L412 48 L418 132 L434 132 L440 52 L466 50" fill="none" stroke="${F_BLUE}" stroke-width="3.5" stroke-linejoin="round"/>
  <!-- 4 lost -->
  <path d="M496 168 L508 168 L514 52 L534 48 L540 166 L624 166" fill="none" stroke="${F_RED}" stroke-width="3.5" stroke-linejoin="round"/>
  <text x="588" y="128" font-size="13" font-weight="700" fill="${F_RED}" text-anchor="middle">no waveform</text>
  <!-- captions -->
  ${[["Normal",F_GREEN,"box — sharp up, flat top"],["Shark fin",F_GOLD,"bronchospasm"],["Rebreathing",F_BLUE,"baseline ↑, not zero"],["Lost",F_RED,"DOPE — act now"]]
    .map((c,i)=>`<text x="${81+i*158}" y="206" font-size="15" font-weight="700" fill="${c[1]}" text-anchor="middle">${c[0]}</text>
    <text x="${81+i*158}" y="226" font-size="12" fill="${F_MUTE}" text-anchor="middle">${c[2]}</text>`).join("")}
  <text x="320" y="250" font-size="12" fill="${F_MUTE}" text-anchor="middle">Time →   (vertical axis = EtCO₂)</text>
</svg>`
},

// ---------- Oxyhaemoglobin dissociation curve ----------
oxyhb: {
  title: "The oxyhaemoglobin dissociation curve — the tabletop and the cliff",
  alt: "S-shaped curve of oxygen saturation against arterial oxygen tension, flat above 90 percent and falling steeply below it.",
  svg: `<svg viewBox="0 0 620 320" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect x="0" y="0" width="620" height="320" fill="#fff"/>
  <!-- target band 92-96% -->
  <rect x="60" y="39" width="500" height="10" fill="${F_GREEN}" opacity="0.15"/>
  <text x="554" y="34" font-size="11" fill="${F_GREEN}" font-weight="700" text-anchor="end">target 92–96%</text>
  <!-- grid -->
  ${[0,20,40,60,80,100].map(s=>`<line x1="60" y1="${260-s*2.3}" x2="560" y2="${260-s*2.3}" stroke="${F_LINE}" stroke-width="1"/>
     <text x="52" y="${264-s*2.3}" font-size="11" fill="${F_MUTE}" text-anchor="end">${s}</text>`).join("")}
  ${[0,20,40,60,80,100].map(p=>`<line x1="${60+p*4.545}" y1="260" x2="${60+p*4.545}" y2="264" stroke="${F_MUTE}" stroke-width="1"/>
     <text x="${60+p*4.545}" y="280" font-size="11" fill="${F_MUTE}" text-anchor="middle">${p}</text>`).join("")}
  <!-- the curve -->
  <polyline points="60,260 105,230 151,180 183,145 196,129 242,88 287,67 333,53 378,45 424,40 469,37 515,35 560,34"
            fill="none" stroke="${F_NAVY}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>
  <!-- the cliff marker at SpO2 90 / PaO2 60 -->
  <line x1="333" y1="53" x2="333" y2="260" stroke="${F_RED}" stroke-width="1.5" stroke-dasharray="5 4"/>
  <circle cx="333" cy="53" r="6" fill="${F_RED}"/>
  <text x="345" y="86" font-size="13" font-weight="700" fill="${F_RED}">SpO₂ 90% ≈ PaO₂ 60</text>
  <text x="345" y="104" font-size="12" fill="${F_RED}">the edge of the cliff</text>
  <!-- zone labels -->
  <text x="556" y="70" font-size="12.5" font-weight="700" fill="${F_NAVY}" text-anchor="end">flat tabletop — big PaO₂ swings, tiny SpO₂ change</text>
  <path d="M204 196 L188 158" stroke="${F_GOLD}" stroke-width="2" marker-end="url(#fa)"/>
  <text x="212" y="206" font-size="12.5" font-weight="700" fill="${F_GOLD}">steep — small drops cost a lot</text>
  <defs><marker id="fa" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0 0 L8 4 L0 8 z" fill="${F_GOLD}"/></marker></defs>
  <!-- axes -->
  <line x1="60" y1="260" x2="560" y2="260" stroke="${F_INK}" stroke-width="2"/>
  <line x1="60" y1="30" x2="60" y2="260" stroke="${F_INK}" stroke-width="2"/>
  <text x="310" y="300" font-size="13" fill="${F_INK}" text-anchor="middle" font-weight="700">PaO₂ (mmHg)</text>
  <text x="18" y="150" font-size="13" fill="${F_INK}" text-anchor="middle" font-weight="700" transform="rotate(-90 18 150)">SpO₂ (%)</text>
</svg>`
},

// ---------- PIP vs Pplat ----------
pip_pplat: {
  title: "PIP vs Pplat on an inspiratory hold",
  alt: "Airway pressure over time rising to peak pressure, dropping to a plateau during an inspiratory hold, then falling to PEEP.",
  svg: `<svg viewBox="0 0 620 300" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect x="0" y="0" width="620" height="300" fill="#fff"/>
  <!-- reference lines -->
  <line x1="70" y1="60"  x2="560" y2="60"  stroke="${F_RED}"   stroke-width="1.5" stroke-dasharray="5 4"/>
  <line x1="70" y1="115" x2="560" y2="115" stroke="${F_GOLD}"  stroke-width="1.5" stroke-dasharray="5 4"/>
  <line x1="70" y1="215" x2="560" y2="215" stroke="${F_BLUE}"  stroke-width="1.5" stroke-dasharray="5 4"/>
  <text x="566" y="64"  font-size="13" font-weight="700" fill="${F_RED}">PIP</text>
  <text x="566" y="119" font-size="13" font-weight="700" fill="${F_GOLD}">Pplat</text>
  <text x="566" y="219" font-size="13" font-weight="700" fill="${F_BLUE}">PEEP</text>
  <!-- pressure trace: rise -> peak -> hold plateau -> decay to PEEP -->
  <path d="M70 215 L96 215 C130 215 150 90 176 62 L182 60 L200 115 L286 115 C320 115 340 200 366 215 L560 215"
        fill="none" stroke="${F_NAVY}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>
  <!-- bracket: resistance component PIP - Pplat -->
  <line x1="212" y1="60" x2="212" y2="115" stroke="${F_RED}" stroke-width="2"/>
  <path d="M206 66 L212 60 L218 66 M206 109 L212 115 L218 109" fill="none" stroke="${F_RED}" stroke-width="2"/>
  <text x="222" y="84" font-size="12.5" font-weight="700" fill="${F_RED}">PIP − Pplat</text>
  <text x="222" y="100" font-size="12" fill="${F_RED}">resistance (airway)</text>
  <!-- bracket: driving pressure Pplat - PEEP -->
  <line x1="330" y1="115" x2="330" y2="215" stroke="${F_GOLD}" stroke-width="2"/>
  <path d="M324 121 L330 115 L336 121 M324 209 L330 215 L336 209" fill="none" stroke="${F_GOLD}" stroke-width="2"/>
  <text x="340" y="156" font-size="12.5" font-weight="700" fill="${F_GOLD}">Pplat − PEEP</text>
  <text x="340" y="172" font-size="12" fill="${F_GOLD}">driving pressure (compliance)</text>
  <!-- hold marker -->
  <line x1="200" y1="115" x2="286" y2="115" stroke="${F_GOLD}" stroke-width="5"/>
  <text x="243" y="137" font-size="12" font-weight="700" fill="${F_GOLD}" text-anchor="middle">inspiratory hold — no flow</text>
  <!-- axes -->
  <line x1="70" y1="245" x2="560" y2="245" stroke="${F_INK}" stroke-width="2"/>
  <line x1="70" y1="40"  x2="70"  y2="245" stroke="${F_INK}" stroke-width="2"/>
  <text x="315" y="270" font-size="13" font-weight="700" fill="${F_INK}" text-anchor="middle">Time →</text>
  <text x="24" y="142" font-size="13" font-weight="700" fill="${F_INK}" text-anchor="middle" transform="rotate(-90 24 142)">Airway pressure</text>
  <text x="315" y="292" font-size="12" fill="${F_MUTE}" text-anchor="middle">Both up = lung problem · PIP up with normal Pplat = airway problem</text>
</svg>`
},

// ---------- Auto-PEEP / breath stacking ----------
autopeep: {
  title: "Auto-PEEP — expiratory flow never reaches zero",
  alt: "Flow against time showing expiratory flow cut off by the next breath before returning to baseline, causing air trapping.",
  svg: `<svg viewBox="0 0 620 290" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect x="0" y="0" width="620" height="290" fill="#fff"/>
  <line x1="60" y1="130" x2="560" y2="130" stroke="${F_INK}" stroke-width="2"/>
  <text x="52" y="134" font-size="12" fill="${F_MUTE}" text-anchor="end">0</text>
  <text x="20" y="80"  font-size="12" fill="${F_MUTE}">insp</text>
  <text x="20" y="196" font-size="12" fill="${F_MUTE}">exp</text>
  <!-- three breaths; expiratory limb truncated before baseline -->
  ${[0,1,2].map(i=>{const x=80+i*160;return `
    <path d="M${x} 130 L${x} 62 L${x+34} 62 L${x+34} 130" fill="none" stroke="${F_BLUE}" stroke-width="3.5"/>
    <path d="M${x+34} 130 L${x+38} 196 C${x+62} 196 ${x+80} 156 ${x+96} 150" fill="none" stroke="${F_NAVY}" stroke-width="3.5"/>
    <circle cx="${x+96}" cy="150" r="5" fill="${F_RED}"/>
    <line x1="${x+96}" y1="150" x2="${x+96}" y2="130" stroke="${F_RED}" stroke-width="2" stroke-dasharray="3 3"/>`;}).join("")}
  <text x="345" y="176" font-size="13" font-weight="700" fill="${F_RED}">next breath starts here — flow never returned to zero</text>
  <text x="345" y="194" font-size="12.5" fill="${F_RED}">trapped volume accumulates = auto-PEEP</text>
  <text x="310" y="240" font-size="13" font-weight="700" fill="${F_INK}" text-anchor="middle">Time →</text>
  <text x="310" y="266" font-size="12.5" fill="${F_MUTE}" text-anchor="middle">Fix: lengthen expiratory time — lower rate, shorter inspiratory time, treat the obstruction</text>
</svg>`
},

// ---------- Two-knob mental model ----------
twoknobs: {
  title: "Two knobs each — ventilation vs oxygenation",
  alt: "Two panels: ventilation controlled by respiratory rate and tidal volume moves carbon dioxide out; oxygenation controlled by FiO2 and PEEP moves oxygen in.",
  svg: `<svg viewBox="0 0 620 250" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect x="0" y="0" width="620" height="250" fill="#fff"/>
  <!-- ventilation -->
  <rect x="14" y="14" width="288" height="204" rx="12" fill="${F_SOFT}" stroke="${F_BLUE}" stroke-width="2"/>
  <text x="158" y="46" font-size="17" font-weight="700" fill="${F_BLUE}" text-anchor="middle">VENTILATION</text>
  <text x="158" y="68" font-size="13" fill="${F_MUTE}" text-anchor="middle">taking the trash out — clears CO₂</text>
  <rect x="42" y="86" width="106" height="46" rx="9" fill="#fff" stroke="${F_BLUE}" stroke-width="2"/>
  <text x="95" y="108" font-size="16" font-weight="700" fill="${F_NAVY}" text-anchor="middle">RR</text>
  <text x="95" y="124" font-size="11" fill="${F_MUTE}" text-anchor="middle">rate</text>
  <rect x="168" y="86" width="106" height="46" rx="9" fill="#fff" stroke="${F_BLUE}" stroke-width="2"/>
  <text x="221" y="108" font-size="16" font-weight="700" fill="${F_NAVY}" text-anchor="middle">Vt</text>
  <text x="221" y="124" font-size="11" fill="${F_MUTE}" text-anchor="middle">tidal volume</text>
  <text x="158" y="160" font-size="13" font-weight="700" fill="${F_NAVY}" text-anchor="middle">RR × Vt = minute ventilation</text>
  <text x="158" y="192" font-size="13" fill="${F_INK}" text-anchor="middle">CO₂ too high? Turn one UP.</text>
  <!-- oxygenation -->
  <rect x="318" y="14" width="288" height="204" rx="12" fill="#fdf1e3" stroke="${F_GOLD}" stroke-width="2"/>
  <text x="462" y="46" font-size="17" font-weight="700" fill="${F_GOLD}" text-anchor="middle">OXYGENATION</text>
  <text x="462" y="68" font-size="13" fill="${F_MUTE}" text-anchor="middle">bringing the groceries in — loads O₂</text>
  <rect x="346" y="86" width="106" height="46" rx="9" fill="#fff" stroke="${F_GOLD}" stroke-width="2"/>
  <text x="399" y="108" font-size="16" font-weight="700" fill="${F_NAVY}" text-anchor="middle">FiO₂</text>
  <text x="399" y="124" font-size="11" fill="${F_MUTE}" text-anchor="middle">inspired O₂</text>
  <rect x="472" y="86" width="106" height="46" rx="9" fill="#fff" stroke="${F_GOLD}" stroke-width="2"/>
  <text x="525" y="108" font-size="16" font-weight="700" fill="${F_NAVY}" text-anchor="middle">PEEP</text>
  <text x="525" y="124" font-size="11" fill="${F_MUTE}" text-anchor="middle">holds alveoli open</text>
  <text x="462" y="160" font-size="13" font-weight="700" fill="${F_NAVY}" text-anchor="middle">shunt? PEEP, not more FiO₂</text>
  <text x="462" y="192" font-size="13" fill="${F_INK}" text-anchor="middle">SpO₂ too low? Raise FiO₂, then PEEP.</text>
  <text x="310" y="238" font-size="12.5" font-weight="700" fill="${F_RED}" text-anchor="middle">Most vent errors are turning a knob from the wrong box.</text>
</svg>`
},

// ---------- Shunt vs dead space ----------
vq: {
  title: "Shunt vs dead space",
  alt: "Two alveolus and capillary diagrams: shunt has perfusion without ventilation; dead space has ventilation without perfusion.",
  svg: `<svg viewBox="0 0 620 250" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect x="0" y="0" width="620" height="250" fill="#fff"/>
  <!-- SHUNT -->
  <text x="158" y="30" font-size="16" font-weight="700" fill="${F_RED}" text-anchor="middle">SHUNT — V/Q → 0</text>
  <text x="158" y="50" font-size="12.5" fill="${F_MUTE}" text-anchor="middle">blood flows past an unventilated alveolus</text>
  <circle cx="158" cy="112" r="42" fill="#f3d9d6" stroke="${F_RED}" stroke-width="2.5"/>
  <text x="158" y="110" font-size="12" font-weight="700" fill="${F_RED}" text-anchor="middle">collapsed /</text>
  <text x="158" y="126" font-size="12" font-weight="700" fill="${F_RED}" text-anchor="middle">flooded</text>
  <line x1="158" y1="46" x2="158" y2="68" stroke="${F_RED}" stroke-width="3" stroke-dasharray="4 4"/>
  <path d="M78 178 C118 178 198 178 238 178" stroke="${F_RED}" stroke-width="7" fill="none" stroke-linecap="round"/>
  <text x="158" y="200" font-size="12" fill="${F_RED}" text-anchor="middle">perfusion continues (blue in, blue out)</text>
  <text x="158" y="226" font-size="12.5" font-weight="700" fill="${F_NAVY}" text-anchor="middle">Fix: PEEP — recruit the alveolus</text>
  <line x1="310" y1="20" x2="310" y2="230" stroke="${F_LINE}" stroke-width="2"/>
  <!-- DEAD SPACE -->
  <text x="462" y="30" font-size="16" font-weight="700" fill="${F_BLUE}" text-anchor="middle">DEAD SPACE — V/Q → ∞</text>
  <text x="462" y="50" font-size="12.5" fill="${F_MUTE}" text-anchor="middle">gas reaches an unperfused alveolus</text>
  <circle cx="462" cy="112" r="42" fill="#e7f0fd" stroke="${F_BLUE}" stroke-width="2.5"/>
  <text x="462" y="118" font-size="12" font-weight="700" fill="${F_BLUE}" text-anchor="middle">ventilated</text>
  <line x1="462" y1="46" x2="462" y2="68" stroke="${F_BLUE}" stroke-width="3"/>
  <path d="M382 178 C402 178 422 178 438 178" stroke="${F_BLUE}" stroke-width="7" fill="none" stroke-linecap="round"/>
  <path d="M486 178 C502 178 522 178 542 178" stroke="${F_BLUE}" stroke-width="7" fill="none" stroke-linecap="round"/>
  <line x1="446" y1="164" x2="478" y2="192" stroke="${F_RED}" stroke-width="4"/>
  <line x1="478" y1="164" x2="446" y2="192" stroke="${F_RED}" stroke-width="4"/>
  <text x="462" y="212" font-size="12" fill="${F_BLUE}" text-anchor="middle">perfusion blocked (e.g. PE)</text>
  <text x="462" y="236" font-size="12.5" font-weight="700" fill="${F_NAVY}" text-anchor="middle">Clue: PaCO₂–EtCO₂ gap widens</text>
</svg>`
},

// ---------- DOPE ----------
dope: {
  title: "DOPE — the universal vent-crisis algorithm",
  alt: "Four steps: Dislodgement, Obstruction, Pneumothorax, Equipment, with the ten second rule to disconnect and bag.",
  svg: `<svg viewBox="0 0 620 250" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect x="0" y="0" width="620" height="250" fill="#fff"/>
  ${[["D","Dislodgement","tube moved / out",F_RED],
     ["O","Obstruction","plug, kink, biting",F_GOLD],
     ["P","Pneumothorax","sudden ↑PIP, ↓BP",F_BLUE],
     ["E","Equipment","circuit, valve, vent",F_GREEN]]
   .map((d,i)=>{const x=14+i*152;return `
     <rect x="${x}" y="30" width="138" height="118" rx="11" fill="${F_SOFT}" stroke="${d[3]}" stroke-width="2"/>
     <circle cx="${x+69}" cy="66" r="22" fill="${d[3]}"/>
     <text x="${x+69}" y="74" font-size="24" font-weight="700" fill="#fff" text-anchor="middle">${d[0]}</text>
     <text x="${x+69}" y="110" font-size="14" font-weight="700" fill="${F_NAVY}" text-anchor="middle">${d[1]}</text>
     <text x="${x+69}" y="130" font-size="11.5" fill="${F_MUTE}" text-anchor="middle">${d[2]}</text>`;}).join("")}
  <rect x="14" y="166" width="592" height="62" rx="11" fill="#fdece9" stroke="${F_RED}" stroke-width="2"/>
  <text x="310" y="192" font-size="16" font-weight="700" fill="${F_RED}" text-anchor="middle">The 10-second rule</text>
  <text x="310" y="214" font-size="13" fill="${F_INK}" text-anchor="middle">Can't identify and fix it in 10 seconds? Disconnect and ventilate manually with 100% O₂ — with controlled rate, volume and PEEP.</text>
  <text x="310" y="20" font-size="12.5" fill="${F_MUTE}" text-anchor="middle">Work the letters in order, every time</text>
</svg>`
},

// ---------- LTV control panel (captured from this project's own simulator,
// so it carries no third-party image licence) ----------
ltv_panel: {
  title: "The LTV control panel — individual control windows and one scanning display",
  alt: "Ventilator control panel showing separate windows for each setting, alarm limit windows, mode and breath-type select buttons, a set value knob, and a single scanning monitored-data display.",
  img: "figures/ltv-panel.jpg",
  note: "Captured from this course's LTV simulator. Confirm against your own unit — configurations vary."
},

// ---------- Volume vs pressure targeting ----------
volpress: {
  title: "Volume-targeted vs pressure-targeted breaths",
  alt: "Volume control guarantees tidal volume while pressure varies; pressure control guarantees pressure while volume varies.",
  svg: `<svg viewBox="0 0 620 250" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect x="0" y="0" width="620" height="250" fill="#fff"/>
  <rect x="14" y="14" width="288" height="222" rx="12" fill="${F_SOFT}" stroke="${F_BLUE}" stroke-width="2"/>
  <text x="158" y="40" font-size="16" font-weight="700" fill="${F_BLUE}" text-anchor="middle">VOLUME TARGETED</text>
  <text x="158" y="60" font-size="12.5" fill="${F_MUTE}" text-anchor="middle">Vt guaranteed · pressure varies</text>
  <text x="40" y="86" font-size="11.5" font-weight="700" fill="${F_NAVY}">Volume</text>
  <path d="M40 130 L74 100 L130 100 L142 130 L186 130 L220 100 L272 100 L282 130" fill="none" stroke="${F_NAVY}" stroke-width="3"/>
  <text x="40" y="158" font-size="11.5" font-weight="700" fill="${F_RED}">Pressure</text>
  <path d="M40 208 L70 178 L128 172 L142 208 L186 208 L216 166 L272 156 L282 208" fill="none" stroke="${F_RED}" stroke-width="3" stroke-dasharray="6 3"/>
  <text x="158" y="228" font-size="12" fill="${F_RED}" text-anchor="middle">stiff lung → pressure climbs (watch Pplat)</text>
  <rect x="318" y="14" width="288" height="222" rx="12" fill="#fdf1e3" stroke="${F_GOLD}" stroke-width="2"/>
  <text x="462" y="40" font-size="16" font-weight="700" fill="${F_GOLD}" text-anchor="middle">PRESSURE TARGETED</text>
  <text x="462" y="60" font-size="12.5" fill="${F_MUTE}" text-anchor="middle">pressure guaranteed · Vt varies</text>
  <text x="344" y="86" font-size="11.5" font-weight="700" fill="${F_RED}">Pressure</text>
  <path d="M344 130 L374 100 L430 100 L446 130 L490 130 L520 100 L576 100 L586 130" fill="none" stroke="${F_RED}" stroke-width="3"/>
  <text x="344" y="158" font-size="11.5" font-weight="700" fill="${F_NAVY}">Volume</text>
  <path d="M344 208 L374 180 L430 176 L446 208 L490 208 L520 194 L576 190 L586 208" fill="none" stroke="${F_NAVY}" stroke-width="3" stroke-dasharray="6 3"/>
  <text x="462" y="228" font-size="12" fill="${F_NAVY}" text-anchor="middle">stiff lung → delivered Vt falls (watch Vte)</text>
</svg>`
}

};

if (typeof module !== "undefined" && module.exports) module.exports = { FIGURES };
