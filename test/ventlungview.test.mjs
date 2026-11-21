/*
 * Ventilator Simulator 3000 — Free Play lung view
 * -----------------------------------------------
 * vent-ltv1200.html?free, driven in headless Chromium. The test-lung card
 * shows a picture of the lung that fills and empties with each breath. The
 * picture is only worth having if it tells the truth about the breath, so
 * most of this suite recomputes the volume here, independently, and holds
 * the page to it.
 *
 *   L1  the view is mounted in the test-lung card, and it is one node that
 *       survives every re-render (no reloading art, no restarting fades)
 *   L2  the atlas: every test lung has art, every row of art is used, the
 *       gutters are empty and every cell has a lung in it
 *   L3  it rides the simulator's clock, not a clock of its own: the volume is
 *       a pure function of simTime, the picture shows exactly that volume,
 *       and one breath ends where the next begins
 *   L4  a normal volume breath, recomputed: fills at constant flow to the set
 *       Vt, empties on τ = R × C, and passes rest → part → full → part → rest
 *   L5  gas trapping: an obstructed lung ends expiration at auto-PEEP ×
 *       compliance, stays partly inflated, and empties more as expiration
 *       is lengthened; a normal lung empties fully
 *   L6  the High Pressure limit ends the breath where the pressure ramp meets
 *       it, and the picture shows the smaller breath
 *   L7  pressure control fills to PC × compliance (the readout's number),
 *       fast first and slower after
 *   L8  an inspiratory hold keeps the lung full for the hold
 *   L9  spontaneous breaths (CPAP) fill to the readout's own estimate
 *   L10 standby shows a resting lung and says so
 *   L11 switching lungs swaps the art without fetching it again
 *   L12 the two new adult lungs: pneumonia and pulmonary edema sit between
 *       normal and ARDS, and start without an alarm
 *   L15 smooth: the CPAP breath clock only runs forward (it used to run
 *       backwards after a minute), the picture takes at least 7 frames to go
 *       from empty to full (the old frame-switching jumped half-way at once),
 *       a mid-breath rate change glides
 *       instead of snapping, airflow streams the right way, no airflow arrows
 *       are baked into the art, and reduced motion keeps it still
 *   L16 SpO₂ and EtCO₂ in the lung panel, recomputed here from textbook
 *       physiology: PaCO₂ = 0.863 × V̇CO₂ ÷ V̇A; EtCO₂ below PaCO₂, further in
 *       ARDS; oxygen masks hypoventilation that room air reveals; PEEP opens
 *       an ARDS shunt that oxygen barely touches; COPD's V/Q mismatch answers
 *       to oxygen; high PEEP backfires in one-sided pneumonia; a breath cut by
 *       the High Pressure limit raises CO₂; the Severinghaus curve; and the
 *       numbers drift to a change rather than jump. ARDS shunt and dead
 *       space checked against Florio 2024 and Nuckton 2002
 *   L17 blood pressure, recomputed from the published cardiac-output
 *       numbers: PEEP and auto-PEEP lower it (Auler 2000, Luo 2024); CPAP in
 *       high-filling-pressure heart failure raises output without dropping
 *       pressure (De Hoyos 1995); red and amber by Surviving Sepsis and PALS
 *   L13 accessible, and fits a 320px phone without sideways scroll
 *   L14 no page errors
 *
 * Run:  cd test && node ventlungview.test.mjs
 */
import http from 'http';
import fs from 'fs';
import { readFile } from 'fs/promises';
import { extname, join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
let atlasHits = 0;
const srv = http.createServer(async (q, r) => {
  try { const u = decodeURIComponent(q.url.split('?')[0]); if (/lungs-atlas\.png$/.test(u)) atlasHits++;
    const d = await readFile(join(ROOT, u));
    r.writeHead(200, { 'content-type': MIME[extname(u)] || 'application/octet-stream' }); r.end(d);
  } catch { r.writeHead(404); r.end('not found'); }
});
await new Promise(r => srv.listen(0, r));
const ORIGIN = `http://localhost:${srv.address().port}`;
async function launch() {
  const known = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const exe = process.env.CHROMIUM_PATH || (fs.existsSync(known) ? known : null);
  try { return await chromium.launch(exe ? { executablePath: exe } : {}); }
  catch { return await chromium.launch(); }
}
const browser = await launch();
let pass = 0, fail = 0; const fails = [];
function ok(name, cond, extra) { if (cond) pass++; else { fail++; fails.push(name + (extra !== undefined ? '  [' + extra + ']' : '')); }
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (!cond && extra !== undefined ? '  [' + extra + ']' : '')); }
const near = (a, b, tol) => Math.abs(a - b) <= tol;

const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, serviceWorkers: 'block' });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.goto(ORIGIN + '/vent-ltv1200.html?free');
await p.waitForFunction(() => typeof freeMode !== 'undefined' && freeMode && document.querySelector('#tl-viz'));

// Settings for a lung, applied the way the panel applies them.
const setup = (lungKey, s) => p.evaluate(([k, s]) => {
  setFreeLung(k);
  if (s) { if (s.bt) breathType = s.bt; if (s.mode) ventMode = s.mode;
    for (const key of Object.keys(s)) if (vals[key]) vals[key].v = s[key];
    enforceITLimit(); Object.keys(vals).forEach(updateKnob); updateUI(); }
  inspHoldActive = false; manualBreathActive = false;
}, [lungKey, s || null]);
// Everything the independent recomputation needs, read off the simulator's own state.
const state = () => p.evaluate(() => ({
  C: lung.compliance, R: lung.resistance, peep: vals.peep.v, hi: vals.hipres.v, vt: vals.vt.v, pc: vals.pc.v,
  it: vals.it.v, rate: vals.rate.v, ps: vals.ps.v, bt: breathType, mode: ventMode,
  aPEEP: effectiveAutoPEEP(), pf: peakFlowLPM(), ref: lvRefMl(), mid: LV_MID, full: LV_FULL }));
// Volume (and pose) across one breath, straight from the page, at fixed sim times.
const sweep = (stepMs) => p.evaluate((step) => {
  const cyc = 60000 / vals.rate.v, ref = lvRefMl(), out = [];
  const base = Math.ceil(simTime / cyc + 2) * cyc;      // a breath boundary, well clear of now
  // 1 ms in from each end: k × cycle can land a hair short of the boundary in floating point
  for (let t = 1; t <= cyc - 1; t += step) { const s = lungVolumeAt(base + t);
    out.push({ t, v: s.v, phase: s.phase, pose: s.v / ref >= LV_FULL ? 2 : (s.v / ref >= LV_MID ? 1 : 0) }); }
  return { cyc, pts: out };
}, stepMs);
const collapse = a => a.filter((x, i) => i === 0 || x !== a[i - 1]);

console.log('\nL1 mounted, and one node for good');
{ const r = await p.evaluate(() => { const v = document.querySelectorAll('#tl-viz');
    return { n: v.length, inBar: !!document.querySelector('#mission-bar #tl-viz'), poses: document.querySelectorAll('#tl-viz .lv-pose').length }; });
  ok('L1 the lung view is in the test-lung card', r.n === 1 && r.inBar, JSON.stringify(r));
  ok('L1 with the rest and full poses stacked, and a flow overlay', r.poses === 2 && await p.evaluate(() => !!document.querySelector('#tl-viz .lv-pose.rest') && !!document.querySelector('#tl-viz .lv-pose.full') && !!document.querySelector('#tl-viz .lv-flow')));
  await p.evaluate(() => { document.getElementById('tl-viz').__mark = 'same'; });
  await p.evaluate(() => { setFreeLung('copd'); vals.rate.v = 18; updateKnob('rate'); updateUI(); renderMissionCard(); setFreeLung('pedNormal'); renderMissionCard(); });
  const same = await p.evaluate(() => { const v = document.querySelectorAll('#tl-viz'); return v.length === 1 && v[0].__mark === 'same' && v[0].isConnected; });
  ok('L1 the same node survives lung changes and re-renders', same); }

console.log('\nL2 the art');
{ const r = await p.evaluate(() => {
    const rows = Object.keys(LV_ROWS), lungs = Object.keys(FREE_LUNGS);
    return { missing: lungs.filter(k => !(FREE_LUNGS[k].sprite in LV_ROWS)),
             unused: rows.filter(s => !lungs.some(k => FREE_LUNGS[k].sprite === s)) }; });
  ok('L2 every test lung has art', r.missing.length === 0, r.missing.join(','));
  ok('L2 all six conditions of art are used', r.unused.length === 0, r.unused.join(','));
  const a = await p.evaluate(async () => {
    const img = new Image(); img.src = 'vent-sprites/lungs-atlas.png'; await img.decode();
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data;
    const A = (x, y) => d[(y * c.width + x) * 4 + 3];
    const CW = 254, CH = 252; let gutter = 0, fills = [];
    for (let r = 0; r < 6; r++) for (let col = 0; col < 3; col++) {
      const x0 = col * CW, y0 = r * CH;
      for (let i = 0; i < CW; i++) for (const y of [y0, y0 + 1, y0 + CH - 2, y0 + CH - 1]) if (A(x0 + i, y)) gutter++;
      for (let j = 0; j < CH; j++) for (const x of [x0, x0 + 1, x0 + CW - 2, x0 + CW - 1]) if (A(x, y0 + j)) gutter++;
      let on = 0; for (let j = 0; j < CH; j += 3) for (let i = 0; i < CW; i += 3) if (A(x0 + i, y0 + j) > 200) on++;
      fills.push(on / (Math.ceil(CW / 3) * Math.ceil(CH / 3)));
    }
    return { w: img.naturalWidth, h: img.naturalHeight, gutter, minFill: Math.min(...fills) }; });
  ok('L2 the atlas is 3 poses × 6 conditions of 254×252 cells', a.w === 762 && a.h === 1512, a.w + '×' + a.h);
  ok('L2 the gutters are empty, so no cell bleeds into the next', a.gutter === 0, a.gutter + ' opaque gutter px');
  ok('L2 every cell has a lung in it', a.minFill > 0.2, a.minFill.toFixed(2));
  // As delivered, asthma's full pose was drawn in the COPD style and COPD's in
  // the asthma style, so bronchospasm vanished at end-inspiration. The build
  // script swaps them back; this holds it there. Bronchospasm is drawn as
  // saturated orange rings on the bronchi, and only asthma has them.
  const bands = await p.evaluate(async () => {
    const img = new Image(); img.src = 'vent-sprites/lungs-atlas.png'; await img.decode();
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data;
    const CW = 254, CH = 252, out = {};
    Object.keys(LV_ROWS).forEach(cond => { const r = LV_ROWS[cond]; out[cond] = [0, 1, 2].map(col => { let n = 0;
      for (let y = r * CH; y < (r + 1) * CH; y++) for (let x = col * CW; x < (col + 1) * CW; x++) {
        const i = (y * c.width + x) * 4; if (d[i + 3] <= 200) continue;
        const R = d[i] / 255, G = d[i + 1] / 255, B = d[i + 2] / 255, mx = Math.max(R, G, B), mn = Math.min(R, G, B);
        if (mx === mn || mx !== R) continue;
        const h = (((G - B) / (mx - mn)) % 6) / 6, s = (mx - mn) / mx;
        if (h > 0.01 && h < 0.07 && s > 0.45 && mx > 0.75) n++; }
      return n; }); });
    return out; });
  ok('L2 asthma shows bronchospasm at rest and at full inspiration', bands.asthma[0] > 100 && bands.asthma[2] > 100, bands.asthma.join('/'));
  const banded = Object.keys(bands).filter(k => k !== 'asthma' && bands[k].some(n => n > 20));
  ok('L2 and no other condition does (COPD\'s full pose is COPD\'s own)', banded.length === 0, banded.map(k => k + ' ' + bands[k].join('/')).join(', '));
  await setup('copd');
  const pos = await p.evaluate(() => [...document.querySelectorAll('#tl-viz .lv-pose')].map(e => e.style.backgroundPosition));
  ok('L2 COPD shows the COPD row: rest pose under full pose', JSON.stringify(pos) === JSON.stringify(['0% 20%', '100% 20%']), JSON.stringify(pos)); }

console.log('\nL3 on the simulator\'s clock');
{ await setup('normal', { mode: 'ac', bt: 'volume', rate: 14, vt: 500, it: 1.0, peep: 5, hipres: 40 });
  const r = await p.evaluate(() => { updateLungView(); const a = lvLast.v, b = lungVolumeAt(simTime).v;
    const t = simTime + 1234, x = lungVolumeAt(t).v, y = lungVolumeAt(t).v; return { a, b, x, y }; });
  ok('L3 the picture shows the volume at the simulator\'s current time', r.a === r.b, JSON.stringify(r));
  ok('L3 the volume is a pure function of sim time (no clock of its own)', r.x === r.y);
  await p.waitForTimeout(600);
  const r2 = await p.evaluate(() => { const before = lvLast.v; updateLungView(); return { moved: before !== null, same: lvLast.v === lungVolumeAt(simTime).v }; });
  ok('L3 and keeps doing so as the sim runs', r2.same);
  for (const k of ['normal', 'copd', 'asthma']) {
    await setup(k, { mode: 'ac', bt: 'volume', rate: 20, vt: 500, it: 1.0, peep: 5, hipres: 60 });
    const j = await p.evaluate(() => { const cyc = 60000 / vals.rate.v, T = 50 * cyc;
      return { end: lungVolumeAt(T - 0.5).v, start: lungVolumeAt(T + 0.5).v, vee: lvBreath().vee }; });
    ok(`L3 ${k}: one breath ends where the next begins`, near(j.end, j.start, 3) && near(j.start, j.vee, 3), JSON.stringify(j));
  }
  await setup('normal', { mode: 'ac', bt: 'pressure', rate: 14, pc: 12, it: 1.0, peep: 5, hipres: 40 });
  const jp = await p.evaluate(() => { const cyc = 60000 / vals.rate.v, T = 50 * cyc; return { end: lungVolumeAt(T - 0.5).v, start: lungVolumeAt(T + 0.5).v }; });
  ok('L3 pressure control: one breath ends where the next begins', near(jp.end, jp.start, 3), JSON.stringify(jp)); }

console.log('\nL4 a normal volume breath, recomputed');
{ await setup('normal', { mode: 'ac', bt: 'volume', rate: 14, vt: 500, it: 1.0, peep: 5, hipres: 40 });
  const s = await state(), cyc = 60000 / s.rate, ti = Math.min(s.it * 1000, 0.85 * cyc), te = cyc - ti, tau = s.R * s.C;
  const { pts } = await sweep(10);
  const at = t => pts.reduce((b, x) => Math.abs(x.t - t) < Math.abs(b.t - t) ? x : b);
  ok('L4 starts empty (no auto-PEEP in a normal lung)', near(at(0).v, 0, 1), at(0).v);
  ok('L4 halfway through inspiration it holds half the breath (constant flow)', near(at(ti / 2).v, s.vt / 2, 6), at(ti / 2).v);
  ok('L4 end of inspiration holds the set Vt', near(at(ti - 10).v, s.vt, 8), at(ti - 10).v);
  const k = Math.exp(-te / tau), want = s.vt * (Math.exp(-1) - k) / (1 - k);
  ok('L4 one time constant into expiration it has emptied to e⁻¹ (τ = R × C = ' + tau + ' ms)', near(at(ti + tau).v, want, 6), at(ti + tau).v.toFixed(1) + ' vs ' + want.toFixed(1));
  ok('L4 empty by the end of expiration', near(pts[pts.length - 1].v, 0, 2), pts[pts.length - 1].v);
  const poses = collapse(pts.map(x => x.pose)).join('');
  ok('L4 the picture goes rest → part → full → part → rest', poses === '01210', poses);
  const ph = collapse(pts.map(x => x.phase)).join(',');
  ok('L4 labelled inspiration, then expiration', ph === 'insp,exp', ph); }

console.log('\nL5 gas trapping');
{ await setup('copd', { mode: 'ac', bt: 'volume', rate: 30, vt: 500, it: 1.0, peep: 5, hipres: 80 });
  const s = await state(), { pts } = await sweep(10);
  const vee = s.aPEEP * s.C, minV = Math.min(...pts.map(x => x.v)), minPose = Math.min(...pts.map(x => x.pose));
  ok('L5 COPD at rate 30 traps gas: auto-PEEP ' + s.aPEEP + ' × C ' + s.C + ' = ' + Math.round(vee) + ' mL', vee > 0.25 * s.ref, Math.round(vee));
  ok('L5 expiration ends at the trapped volume, not at PEEP', near(minV, vee, 3), minV.toFixed(1) + ' vs ' + vee.toFixed(1));
  ok('L5 so the lung never returns to the resting picture', minPose >= 1, minPose);
  ok('L5 and the peak is the breath on top of the trapped gas', near(Math.max(...pts.map(x => x.v)), vee + s.vt, 8));
  await p.evaluate(() => updateLungView());
  const txt = await p.evaluate(() => document.querySelector('#tl-viz .lv-trapv').textContent + ' | ' + document.querySelector('#tl-viz .lv-note').textContent);
  ok('L5 the view says how much is trapped', txt.includes(Math.round(vee) + ' mL trapped'), txt);
  ok('L5 and the dashed floor is on the gauge', await p.evaluate(() => document.querySelector('#tl-viz .lv-floor').classList.contains('on')));
  // The fix the scenarios teach: give it time to empty
  const trapped = [];
  for (const [rate, it] of [[30, 1.0], [20, 1.0], [12, 0.8], [8, 0.8]]) {
    await setup('copd', { mode: 'ac', bt: 'volume', rate, vt: 500, it, peep: 5, hipres: 80 });
    trapped.push(await p.evaluate(() => Math.round(lvBreath().vee)));
  }
  ok('L5 lengthening expiration lets more of it out', trapped.every((v, i) => i === 0 || v <= trapped[i - 1]) && trapped[3] < trapped[0], trapped.join(' → '));
  await setup('normal', { mode: 'ac', bt: 'volume', rate: 30, vt: 500, it: 1.0, peep: 5, hipres: 80 });
  const n = await sweep(10);
  ok('L5 a normal lung empties to PEEP every breath', near(Math.min(...n.pts.map(x => x.v)), 0, 2) && n.pts.some(x => x.pose === 0));
  await p.evaluate(() => updateLungView());
  ok('L5 and says so', /Back to PEEP/.test(await p.evaluate(() => document.querySelector('#tl-viz .lv-trapv').textContent))); }

console.log('\nL6 the High Pressure limit ends the breath');
{ await setup('normal', { mode: 'ac', bt: 'volume', rate: 14, vt: 500, it: 1.0, peep: 5, hipres: 15 });
  const s = await state();
  const pip = s.peep + s.aPEEP + s.vt / s.C + (s.pf / 60) * s.R;
  const want = s.vt * (s.hi - s.peep) / (pip - s.peep);
  const { pts } = await sweep(5), peak = Math.max(...pts.map(x => x.v));
  ok('L6 the breath stops where the pressure ramp meets the limit (' + Math.round(want) + ' of ' + s.vt + ' mL)', near(peak, want, 6), peak.toFixed(1));
  ok('L6 inspiration is labelled as cut short', pts.some(x => x.phase === 'cut') && !pts.some(x => x.phase === 'insp'));
  await p.evaluate(() => updateLungView());
  const note = await p.evaluate(() => document.querySelector('#tl-viz .lv-note').textContent);
  ok('L6 and the view says how much got in', note.includes('High Pressure') && note.includes(Math.round(want) + ' of 500'), note);
  await setup('normal', { hipres: 40 });
  ok('L6 raising the limit gives the whole breath back', await p.evaluate(() => !lvBreath().cut && lvBreath().vt === 500)); }

console.log('\nL7 pressure control');
{ await setup('pedBronch');
  const s = await state(), cyc = 60000 / s.rate, ti = Math.min(s.it * 1000, 0.8 * cyc);
  ok('L7 the infant is in pressure control', s.bt === 'pressure');
  const { pts } = await sweep(5);
  const at = t => pts.reduce((b, x) => Math.abs(x.t - t) < Math.abs(b.t - t) ? x : b);
  const full = Math.max(...pts.map(x => x.v)), vee = s.aPEEP * s.C;
  ok('L7 fills to PC × compliance on top of any trapped gas (' + s.pc * s.C + ' mL)', near(full - vee, s.pc * s.C, 1.5), (full - vee).toFixed(1));
  const chip = await p.evaluate(() => { const c = [...document.querySelectorAll('.tl-chip')].find(x => /Vt\/kg/i.test(x.textContent)); return c && (c.textContent + ' | ' + c.title); });
  ok('L7 the same number as the Vt/kg readout', chip && chip.includes((s.pc * s.C / 6).toFixed(1) + ' mL/kg') && chip.includes(Math.round(s.pc * s.C) + ' mL'), chip);
  ok('L7 fills fast first: more than half the breath by half the inspiratory time', at(ti / 2).v - vee > 0.5 * (full - vee), (at(ti / 2).v - vee).toFixed(1)); }

console.log('\nL8 inspiratory hold');
{ await setup('normal', { mode: 'ac', bt: 'volume', rate: 14, vt: 500, it: 1.0, peep: 5, hipres: 40 });
  await p.evaluate(() => triggerInspHold());
  await p.waitForTimeout(400);
  const h = await p.evaluate(() => lungVolumeAt(simTime));
  ok('L8 the lung is held full during the hold', h.phase === 'hold' && near(h.v, 500, 1), JSON.stringify({ phase: h.phase, v: h.v }));
  await p.waitForTimeout(100);
  ok('L8 and the view says INSP HOLD', /INSP HOLD/.test(await p.evaluate(() => document.querySelector('#tl-viz .lv-phase').textContent)));
  await p.waitForTimeout(4400);
  ok('L8 then breathing resumes', await p.evaluate(() => lungVolumeAt(simTime).phase !== 'hold')); }

console.log('\nL9 spontaneous breathing');
{ await setup('normal', { mode: 'cpap', bt: 'volume', ps: 10, peep: 5 });
  const s = await state();
  const r = await p.evaluate(() => { let mx = 0, ph = new Set(); for (let t = 0; t < 20000; t += 10) { const x = lungVolumeAt(t); mx = Math.max(mx, x.v); ph.add(x.phase); } return { mx, ph: [...ph] }; });
  ok('L9 CPAP + PS fills to the readout\'s estimate (400 + PS × C = ' + (400 + s.ps * s.C) + ' mL)', near(r.mx, 400 + s.ps * s.C, 6), r.mx.toFixed(1));
  ok('L9 and alternates inspiration and expiration', r.ph.includes('insp') && r.ph.includes('exp'), r.ph.join(',')); }

console.log('\nL10 standby');
{ await setup('normal', { mode: 'ac', bt: 'volume', rate: 14, vt: 500, it: 1.0, peep: 5, hipres: 40 });
  await p.evaluate(() => { deviceState = 'standby'; applyStandbyVisual(); });
  await p.waitForTimeout(600);                     // the picture eases down rather than snapping
  const r = await p.evaluate(() => ({ phase: document.querySelector('#tl-viz .lv-phase').textContent, full: +getComputedStyle(document.querySelector('#tl-viz .lv-pose.full')).opacity, flow: +getComputedStyle(document.querySelector('#tl-viz .lv-flow')).opacity }));
  ok('L10 standby shows the resting lung and says STANDBY', r.full < 0.02 && /STANDBY/.test(r.phase), JSON.stringify(r));
  ok('L10 with no airflow drawn', r.flow < 0.02, r.flow);
  await p.evaluate(() => { deviceState = 'run'; applyStandbyVisual(); }); }

console.log('\nL11 one download of the art');
{ for (const k of ['ards', 'asthma', 'pneumonia', 'edema', 'pedArds', 'normal']) { await p.evaluate(k => setFreeLung(k), k); await p.waitForTimeout(60); }
  ok('L11 the atlas is fetched once, however many lungs are tried', atlasHits === 1 || atlasHits === 2, atlasHits + ' fetches'); }
// (2 allowed: L2 decodes the file itself, which may or may not hit the memory cache)

console.log('\nL12 the new adult lungs');
{ const m = await p.evaluate(() => ({ n: FREE_LUNGS.normal, a: FREE_LUNGS.ards, pn: FREE_LUNGS.pneumonia, ed: FREE_LUNGS.edema }));
  for (const [k, l] of [['pneumonia', m.pn], ['pulmonary edema', m.ed]]) {
    ok(`L12 ${k} is an adult lung`, !!l && !l.peds);
    ok(`L12 ${k} is stiffer than normal and less stiff than ARDS`, l.compliance < m.n.compliance && l.compliance > m.a.compliance, l.compliance);
  }
  ok('L12 edema has more airway resistance than pneumonia (airway-wall edema)', m.ed.resistance > m.pn.resistance);
  for (const k of ['pneumonia', 'edema']) {
    await p.evaluate(() => setFreeLung('normal'));
    await p.evaluate(() => applyFreeStart(FREE_ADULT_START));
    await p.evaluate(k => setFreeLung(k), k);
    await p.waitForTimeout(4600);
    const al = await p.evaluate(() => Object.keys(alarms).filter(a => alarms[a].active));
    ok(`L12 ${k} starts on the adult settings without an alarm`, al.length === 0, al.join(','));
  }
  const rows = await p.evaluate(() => document.querySelector('.tl-lungs.six') && getComputedStyle(document.querySelector('.tl-lungs.six')).gridTemplateColumns.split(' ').length);
  ok('L12 six adult lungs sit in two tidy rows of three', rows === 3, rows); }

console.log('\nL15 smooth');
{ // The spontaneous-breathing clock (CPAP / NPPV), over 15 minutes of 60 fps frames
  const c = await p.evaluate(() => { let back = 0, maxStep = 0, prev = spontBreath(0).ph;
    for (let t = 16; t < 15 * 60000; t += 16) { const ph = spontBreath(t).ph; let d = ph - prev; if (d < -0.5) d += 1;
      if (d < 0) back++; maxStep = Math.max(maxStep, d); prev = ph; } return { back, maxStep }; });
  ok('L15 the CPAP breath clock never runs backwards (15 min of frames)', c.back === 0, c.back + ' backwards frames');
  ok('L15 and never skips ahead (≤ one 18.5/min breath\'s worth per frame)', c.maxStep <= 18.5 / 60000 * 16 + 1e-6, c.maxStep.toFixed(5));
  await setup('normal', { mode: 'cpap', bt: 'volume', ps: 10, peep: 5 });
  const tr = await p.evaluate(() => { let mx = 0, prev = calcPressure(10 * 60000);
    for (let t = 10 * 60000 + 16; t < 12 * 60000; t += 16) { const q = calcPressure(t); mx = Math.max(mx, Math.abs(q - prev)); prev = q; } return mx; });
  ok('L15 so the CPAP pressure trace is continuous ten minutes in (≤ 1 cmH₂O a frame)', tr <= 1, tr.toFixed(2));
  // The picture itself, frame by frame (60 fps), across whole breaths
  for (const [k, cfg, label] of [['normal', { mode: 'ac', bt: 'volume', rate: 14, vt: 500, it: 1.0, peep: 5, hipres: 40 }, 'normal, volume control'],
                                 ['asthma', { mode: 'ac', bt: 'volume', rate: 14, vt: 500, it: 1.0, peep: 5, hipres: 60 }, 'asthma, volume control'],
                                 ['normal', { mode: 'ac', bt: 'pressure', rate: 14, pc: 12, it: 1.0, peep: 5, hipres: 40 }, 'normal, pressure control'],
                                 ['normal', { mode: 'cpap', bt: 'volume', ps: 10, peep: 5 }, 'CPAP + PS']]) {
    await setup(k, cfg);
    const mx = await p.evaluate(() => { const ref = lvRefMl(), w = t => Math.max(0, Math.min(1, lungVolumeAt(t).v / ref / LV_FULL));
      let m = 0, prev = w(600000); for (let t = 600016; t < 612000; t += 16) { const x = w(t); m = Math.max(m, Math.abs(x - prev)); prev = x; } return m; });
    ok(`L15 ${label}: the lung never jumps; it takes at least 7 frames to go from empty to full`, mx <= 0.15, mx.toFixed(3));
  }
  // A rate change mid-breath moves the breath clock; the picture should glide, not snap
  await setup('normal', { mode: 'ac', bt: 'volume', rate: 14, vt: 500, it: 1.0, peep: 5, hipres: 40 });
  const g = await p.evaluate(() => { const ref = lvRefMl(), w = (t, rate) => { vals.rate.v = rate; const x = Math.max(0, Math.min(1, lungVolumeAt(t).v / ref / LV_FULL)); vals.rate.v = 14; return x; };
    let T = 0; for (let t = 400000; t < 460000; t += 10) if (w(t, 14) < 0.05 && w(t, 30) > 0.95) { T = t; break; }
    simTime = T; _lv.t = 0; updateLungView(); const before = lvLast.w;
    vals.rate.v = 30; _lv.t = performance.now() - 16; updateLungView(); const after = lvLast.w;
    for (let i = 0; i < 20; i++) { _lv.t = performance.now() - 16; simTime += 16; updateLungView(); }
    const target = Math.max(0, Math.min(1, lungVolumeAt(simTime).v / ref / LV_FULL));
    vals.rate.v = 14; return { T, before, after, settled: lvLast.w, target }; });
  ok('L15 a mid-breath rate change that jumps the lung from empty to full glides in over several frames', g.T > 0 && g.before < 0.05 && g.after - g.before < 0.3, JSON.stringify(g));
  ok('L15 and has caught up with the breath a third of a second later', Math.abs(g.settled - g.target) < 0.05, JSON.stringify(g));
  // Airflow direction
  await setup('normal', { mode: 'ac', bt: 'volume', rate: 14, vt: 500, it: 1.0, peep: 5, hipres: 40 });
  const f = await p.evaluate(() => { const c = lvBreath().cycleMs, at = t => { simTime = 50 * c + t; _lv.t = 0; updateLungView(); return { dir: lvLast.flowDir, flow: Math.round(lvLast.flow), cls: document.querySelector('#tl-viz .lv-flow').className }; };
    return { insp: at(500), exp: at(1150) }; });
  ok('L15 airflow streams in during inspiration (500 mL over 1 s = 500 mL/s)', f.insp.dir === 'in' && /\bin\b/.test(f.insp.cls) && Math.abs(f.insp.flow - 500) < 10, JSON.stringify(f.insp));
  ok('L15 and out during expiration', f.exp.dir === 'out' && /\bout\b/.test(f.exp.cls) && f.exp.flow < 0, JSON.stringify(f.exp));
  // No airflow arrows baked into any trachea (they point one way all breath; the page draws flow itself)
  const glyphs = await p.evaluate(async () => {
    const img = new Image(); img.src = 'vent-sprites/lungs-atlas.png'; await img.decode();
    const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    const g = cv.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, cv.width, cv.height).data;
    const CW = 254, CH = 252, out = [], counts = {};
    for (const cond of Object.keys(LV_ROWS)) for (const col of [0, 2]) { let n = 0; const r = LV_ROWS[cond];
      for (let y = Math.round(r * CH + 0.17 * CH); y < r * CH + 0.44 * CH; y++) for (let x = Math.round(col * CW + 0.47 * CW); x < col * CW + 0.525 * CW; x++) {
        const i = (y * cv.width + x) * 4; if (d[i + 3] < 200) continue;
        const R = d[i] / 255, G = d[i + 1] / 255, B = d[i + 2] / 255, mx = Math.max(R, G, B), mn = Math.min(R, G, B);
        if (mx > 0.95 && (mx - mn) / mx < 0.12) n++; }    // near-white: the arrows, not the pale-pink rings
      counts[cond + col] = n; }
    for (const cond of Object.keys(LV_ROWS)) if (counts[cond + 2] > counts[cond + 0] + 10) out.push(cond + ' full ' + counts[cond + 2] + ' vs rest ' + counts[cond + 0]);
    return out; });
  ok('L15 no airflow arrows are baked into any trachea (full pose no whiter than rest)', glyphs.length === 0, glyphs.join(', '));
  ok('L15 every condition\'s outlines were measured, so the lung swells rather than ghosts', await p.evaluate(() => lvBoxes && Object.keys(LV_ROWS).every(k => lvBoxes[k] && lvBoxes[k].full[3] > lvBoxes[k].rest[3] - 0.02)));
  // Reduced motion: still blends by volume, but nothing stretches or streams
  const rm = await (await browser.newContext({ viewport: { width: 430, height: 932 }, serviceWorkers: 'block', reducedMotion: 'reduce' })).newPage();
  rm.on('pageerror', e => errs.push(String(e)));
  await rm.goto(ORIGIN + '/vent-ltv1200.html?free');
  await rm.waitForFunction(() => document.querySelector('#tl-viz') && lvBoxes !== null);
  const r1 = await rm.evaluate(() => ({ still: lvStill, tf: document.querySelector('#tl-viz .lv-pose.full').style.transform, y: document.querySelector('#tl-viz .lv-flow').style.backgroundPosition }));
  await rm.waitForTimeout(1500);
  const r2 = await rm.evaluate(() => ({ tf: document.querySelector('#tl-viz .lv-pose.full').style.transform, y: document.querySelector('#tl-viz .lv-flow').style.backgroundPosition, op: document.querySelector('#tl-viz .lv-pose.full').style.opacity }));
  ok('L15 reduced motion: no stretching and no streaming, just the blend', r1.still && !r1.tf && !r2.tf && r1.y === r2.y && r2.op !== '', JSON.stringify({ r1, r2 }));
  await rm.context().close(); }

console.log('\nL16 SpO₂ and EtCO₂');
{ const vp = await (await browser.newContext({ viewport: { width: 430, height: 932 }, serviceWorkers: 'block' })).newPage();
  vp.on('pageerror', e => errs.push(String(e)));
  await vp.goto(ORIGIN + '/vent-ltv1200.html?free');
  await vp.waitForFunction(() => document.querySelector('#tl-viz .lv-spo2'));
  await vp.waitForTimeout(300);
  const shown = await vp.evaluate(() => ({ spo2: document.querySelector('#tl-viz .lv-spo2').textContent, et: document.querySelector('#tl-viz .lv-etco2').textContent }));
  ok('L16 the panel shows SpO₂ and EtCO₂', /^\d{2,3}$/.test(shown.spo2) && /^\d{1,3}$/.test(shown.et), JSON.stringify(shown));
  await vp.evaluate(() => { window.requestAnimationFrame = () => 0; });   // freeze the sim: this section steps the clock itself
  await vp.waitForTimeout(100);
  const V = (k, s) => vp.evaluate(([k, s]) => {
    if (!FREE_LUNGS[k].peds) { setFreeLung('normal'); applyFreeStart(FREE_ADULT_START); }
    setFreeLung(k); if (s) { for (const x of Object.keys(s)) vals[x].v = s[x]; enforceITLimit(); updateUI(); }
    return vitalsTarget(); }, [k, s || null]);
  // CO₂, recomputed: 70 kg, dead space 2.2 mL/kg + 35 mL equipment + 5% of Vt, V̇CO₂ 200 mL/min
  const n = await V('normal');
  const va = 14 * (500 - 154 - 35 - 0.05 * 500) / 1000, want = 0.863 * 200 / va;
  ok(`L16 normal lung, 14 × 500 mL: PaCO₂ = 0.863 × 200 ÷ ${va.toFixed(2)} L/min = ${want.toFixed(0)}`, Math.abs(n.paco2 - want) < 0.5, n.paco2.toFixed(1));
  ok('L16 and a normal ETCO₂ 2–5 mmHg below it', n.paco2 - n.etco2 >= 2 && n.paco2 - n.etco2 <= 5 && n.etco2 >= 35 && n.etco2 <= 45, (n.paco2 - n.etco2).toFixed(1));
  const fast = await V('normal', { rate: 28 });
  ok('L16 doubling the rate halves the PaCO₂ (alveolar ventilation doubles)', Math.abs(fast.paco2 - n.paco2 / 2) < 0.5, fast.paco2.toFixed(1));
  const a = await V('ards');
  ok('L16 ARDS dead space widens the PaCO₂–EtCO₂ gap', (a.paco2 - a.etco2) > 3 * (n.paco2 - n.etco2), (a.paco2 - a.etco2).toFixed(1));
  const a6 = await V('ards', { vt: 420 });
  ok('L16 ARDS physiologic Vd/Vt at 6 mL/kg is 0.58 ± 0.03 (Nuckton 2002: 0.58 ± 0.09)', Math.abs(a6.vdvt - 0.58) <= 0.03, a6.vdvt.toFixed(3));
  const sh = [];
  for (const pe of [5, 10, 15]) sh.push((await V('ards', { peep: pe, hipres: 60 })).shunt);
  const r10 = sh[1] / sh[0], r15 = sh[2] / sh[0];
  ok('L16 ARDS shunt at PEEP 5 is 0.32 (inert gas, Am Rev Respir Dis 1985: 32 ± 14%)', Math.abs(sh[0] - 0.32) < 0.005, sh[0].toFixed(3));
  ok(`L16 and PEEP 5 → 10 → 15 shrinks it ×1 → ×${r10.toFixed(2)} → ×${r15.toFixed(2)}, inside Florio 2024 (×0.70–0.75, ×0.55–0.67)`,
     r10 >= 0.69 && r10 <= 0.76 && r15 >= 0.54 && r15 <= 0.67, sh.map(x => x.toFixed(3)).join(' → '));
  // Oxygen
  ok('L16 normal lung on room air: SpO₂ ≥ 95 (PaO₂ ~90)', (await V('normal', { fio2: 21 })).spo2 >= 95);
  const hypoRA = await V('normal', { rate: 7, fio2: 21 }), hypoO2 = await V('normal', { rate: 7, fio2: 40 });
  ok('L16 hypoventilation on room air drops SpO₂ below 90 (alveolar gas equation)', hypoRA.spo2 < 90, hypoRA.spo2.toFixed(0));
  ok('L16 …and 40% oxygen hides it: SpO₂ ≥ 97 with PaCO₂ over 70', hypoO2.spo2 >= 97 && hypoO2.paco2 > 70, JSON.stringify({ s: hypoO2.spo2.toFixed(0), c: hypoO2.paco2.toFixed(0) }));
  const a5 = await V('ards', { peep: 5, fio2: 40 }), a5o = await V('ards', { peep: 5, fio2: 100 }), a10 = await V('ards', { peep: 10, fio2: 50 });
  ok('L16 ARDS at PEEP 5 / 40% is hypoxemic (SpO₂ ≤ 90)', a5.spo2 < 90.5, a5.spo2.toFixed(1));
  ok('L16 even 100% oxygen can\'t lift PaO₂ to 100 through a 32% shunt (iso-shunt)', a5o.pao2 < 100, a5o.pao2.toFixed(0));
  ok('L16 PEEP 10 on 50% gets within 2 points of 100% oxygen on PEEP 5 — a shunt answers to PEEP, not oxygen', a10.spo2 >= a5o.spo2 - 2 && a10.shunt < a5.shunt, JSON.stringify({ p10: a10.spo2.toFixed(1), o100: a5o.spo2.toFixed(1) }));
  const c21 = await V('copd', { fio2: 21 }), c30 = await V('copd', { fio2: 30 });
  ok('L16 COPD on room air is below 90, and 30% oxygen reaches the 88–92 target (low V/Q answers to oxygen)', c21.spo2 < 90 && c30.spo2 >= 92 && c30.spo2 - c21.spo2 > 10, JSON.stringify({ ra: c21.spo2.toFixed(0), o30: c30.spo2.toFixed(0) }));
  const cd = await V('copd', { vt: 500, rate: 14 });
  ok('L16 ventilated COPD: physiologic Vd/Vt ≈ 0.70 (measured 0.69–0.71)', Math.abs(cd.vdvt - 0.70) <= 0.02, cd.vdvt.toFixed(3));
  ok('L16 …and EtCO₂ ≈ 0.76 × PaCO₂ (Tyagi 2021: 61 vs 80 mmHg)', Math.abs(cd.etco2 / cd.paco2 - 0.763) < 0.02, (cd.etco2 / cd.paco2).toFixed(3));
  const p10 = await V('pneumonia', { peep: 10 }), p14 = await V('pneumonia', { peep: 14 });
  ok('L16 one-sided pneumonia: PEEP 14 is worse than PEEP 10 (overdistends the good lung)', p14.spo2 < p10.spo2, JSON.stringify({ p10: p10.spo2.toFixed(1), p14: p14.spo2.toFixed(1) }));
  const e5 = await V('edema', { peep: 5 }), e10 = await V('edema', { peep: 10 });
  ok('L16 pulmonary edema answers strongly to PEEP', e10.spo2 - e5.spo2 >= 3, JSON.stringify({ e5: e5.spo2.toFixed(1), e10: e10.spo2.toFixed(1) }));
  const cut = await V('normal', { hipres: 15 }), full = await V('normal', { hipres: 40 });
  ok('L16 a breath cut short by the High Pressure limit raises the CO₂', cut.paco2 > full.paco2 + 10, JSON.stringify({ cut: cut.paco2.toFixed(0), full: full.paco2.toFixed(0) }));
  const sev = await vp.evaluate(() => [sevSat(27), sevSat(40), sevSat(60), sevSat(100)].map(x => +(x * 100).toFixed(1)));
  ok('L16 the oxygen–hemoglobin curve (Severinghaus): P50 27 → 50%, 40 → 75%, 60 → 91%, 100 → 97%', Math.abs(sev[0] - 50) < 2 && Math.abs(sev[1] - 75) < 2 && Math.abs(sev[2] - 91) < 1.5 && Math.abs(sev[3] - 97.5) < 1, sev.join(','));
  // Drift, not jump: drop FiO₂ on an ARDS lung and step the sim clock
  const d = await vp.evaluate(() => {
    setFreeLung('normal'); applyFreeStart(FREE_ADULT_START); setFreeLung('ards'); vals.peep.v = 10; vals.fio2.v = 60; updateUI();
    simTime = 100000; _lv.vit = null; updateLungView(); const before = lvVitals.shown.spo2;
    vals.fio2.v = 30; updateUI(); const target = vitalsTarget().spo2;
    simTime += 1000; updateLungView(); const oneSec = lvVitals.shown.spo2;
    for (let i = 0; i < 120; i++) { simTime += 1000; updateLungView(); } const twoMin = lvVitals.shown.spo2;
    return { before, target, oneSec, twoMin }; });
  ok('L16 after a change the SpO₂ drifts — one second in it has moved under 10% of the way', d.before - d.oneSec > 0 && (d.before - d.oneSec) < 0.1 * (d.before - d.target), JSON.stringify(d));
  ok('L16 …and has settled within two minutes of sim time', Math.abs(d.twoMin - d.target) < 0.2, JSON.stringify(d));
  const st = await vp.evaluate(() => { deviceState = 'standby'; applyStandbyVisual(); updateLungView(); return document.querySelector('#tl-viz .lv-spo2').textContent + '|' + document.querySelector('#tl-viz .lv-etco2').textContent; });
  ok('L16 standby: no numbers', st === '—|—', st);
  await vp.context().close(); }

console.log('\nL17 blood pressure');
{ const vp = await (await browser.newContext({ viewport: { width: 430, height: 932 }, serviceWorkers: 'block' })).newPage();
  vp.on('pageerror', e => errs.push(String(e)));
  await vp.goto(ORIGIN + '/vent-ltv1200.html?free');
  await vp.waitForFunction(() => document.querySelector('#tl-viz .lv-bp'));
  await vp.waitForTimeout(300);
  const shown = await vp.evaluate(() => document.querySelector('#tl-viz .lv-bp').textContent + '|' + document.querySelector('#tl-viz .lv-map').textContent);
  ok('L17 the panel shows a blood pressure and MAP', /^\d{2,3}\/\d{2,3}\|MAP \d{2,3}$/.test(shown), shown);
  await vp.evaluate(() => { window.requestAnimationFrame = () => 0; });
  await vp.waitForTimeout(100);
  const V = (k, s) => vp.evaluate(([k, s]) => {
    if (!FREE_LUNGS[k].peds) { setFreeLung('normal'); applyFreeStart(FREE_ADULT_START); }
    setFreeLung(k); if (s) { for (const x of Object.keys(s)) vals[x].v = s[x]; enforceITLimit(); updateUI(); }
    return vitalsTarget(); }, [k, s || null]);
  // Independent recomputation. Cardiac output relative to PEEP 5:
  //   0 → 3.90/3.43 (Auler 2000); 10 → 3.00/3.07, 15 → 2.63/3.07 (Luo 2024); past 15, the 10→15 slope.
  // Heart failure, wedge ≥ 12: 0 → 2.47/2.91, 10 → 3.12/2.91 (De Hoyos 1995); flat to 15.
  // MAP = MAP₅ × (1 + ½(CO − 1)); pulse pressure × CO.
  const coN = x => { const pts = [[0, 3.90 / 3.43], [5, 1], [10, 3.00 / 3.07], [15, 2.63 / 3.07]];
    for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) return pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * (x - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]);
    return Math.max(0.35, 2.63 / 3.07 - (3.00 - 2.63) / 3.07 / 5 * (x - 15)); };
  const bpOf = (sbp, dbp, co) => { const m0 = (sbp + 2 * dbp) / 3, m = m0 * (1 + 0.5 * (co - 1)), pp = (sbp - dbp) * co; return { map: m, sbp: m + 2 * pp / 3, dbp: m - pp / 3 }; };
  const n5 = await V('normal', { peep: 5 });
  ok('L17 normal lung at PEEP 5: 120/75, MAP 90', Math.round(n5.sbp) === 120 && Math.round(n5.dbp) === 75 && Math.round(n5.map) === 90, `${n5.sbp.toFixed(1)}/${n5.dbp.toFixed(1)} (${n5.map.toFixed(1)})`);
  for (const pe of [0, 10, 15, 20]) {
    const got = await V('normal', { peep: pe, hipres: 60 }), co = coN(pe), w = bpOf(120, 75, co);
    ok(`L17 normal lung, PEEP ${pe}: output ×${co.toFixed(3)} → ${Math.round(w.sbp)}/${Math.round(w.dbp)} (${Math.round(w.map)})`,
       Math.abs(got.co - co) < 1e-6 && Math.abs(got.map - w.map) < 0.05 && Math.abs(got.sbp - w.sbp) < 0.05 && Math.abs(got.dbp - w.dbp) < 0.05,
       `${got.sbp.toFixed(1)}/${got.dbp.toFixed(1)} (${got.map.toFixed(1)}) ×${got.co.toFixed(3)}`);
  }
  const ladder = [];
  for (let pe = 0; pe <= 20; pe += 2) ladder.push((await V('ards', { peep: pe, hipres: 80 })).map);
  ok('L17 in ARDS every step up in PEEP lowers the MAP', ladder.every((m, i) => i === 0 || m < ladder[i - 1]), ladder.map(m => m.toFixed(0)).join(' → '));
  const a5 = await V('ards', { peep: 5, hipres: 80 }), a15 = await V('ards', { peep: 15, hipres: 80 });
  ok('L17 ARDS PEEP 5 → 15 costs the MAP about 7% (half the 14% fall in cardiac index)', Math.abs(a15.map / a5.map - (1 + 0.5 * (coN(15) - 1))) < 0.001, (a15.map / a5.map).toFixed(3));
  // Auto-PEEP: the same set PEEP, a faster rate traps gas, and the heart sees the total
  const c14 = await V('copd', { rate: 14, peep: 5, hipres: 80 }), c30 = await V('copd', { rate: 30, peep: 5, hipres: 80 });
  ok('L17 COPD: trapping gas (rate 30) lowers the blood pressure at the same set PEEP', c30.peepTotal > c14.peepTotal + 3 && c30.map < c14.map - 2, JSON.stringify({ r14: [c14.peepTotal, c14.map.toFixed(1)], r30: [c30.peepTotal, c30.map.toFixed(1)] }));
  const cw = bpOf(132, 80, coN(c30.peepTotal));
  ok('L17 …by exactly what that much set PEEP would (auto-PEEP counts as PEEP)', Math.abs(c30.map - cw.map) < 0.05, `${c30.map.toFixed(2)} vs ${cw.map.toFixed(2)}`);
  const cs = await vp.evaluate(() => { ventMode = 'cpap'; vals.rate.v = 30; vals.peep.v = 5; updateUI(); const t = vitalsTarget(); ventMode = 'ac'; updateUI(); return t; });
  ok('L17 and spontaneous CPAP breathing traps none', cs.peepTotal === 5, cs.peepTotal);
  // Heart failure with high filling pressures: CPAP unloads the ventricle
  const e = {};
  for (const pe of [0, 5, 10, 15, 20]) e[pe] = await V('edema', { peep: pe, hipres: 60 });
  ok('L17 edema (heart failure): cardiac output rises with PEEP 0 → 5 → 10 as De Hoyos 1995 measured (2.47 → 2.91 → 3.12)',
     Math.abs(e[0].co - 2.47 / 2.91) < 1e-6 && e[5].co === 1 && Math.abs(e[10].co - 3.12 / 2.91) < 1e-6, [e[0].co, e[5].co, e[10].co].map(x => x.toFixed(3)).join(' → '));
  ok('L17 …with no change in arterial pressure from 0 to 15', [0, 10, 15].every(k => Math.abs(e[k].map - e[5].map) < 0.01 && Math.abs(e[k].sbp - e[5].sbp) < 0.01), [0, 5, 10, 15].map(k => e[k].sbp.toFixed(0) + '/' + e[k].dbp.toFixed(0)).join(', '));
  ok('L17 …and past 15, where there are no data, it falls like any other lung', e[20].map < e[15].map - 3, e[20].map.toFixed(1));
  // Colour by the evidence
  const cls = (k, s) => vp.evaluate(([k, s]) => {
    if (!FREE_LUNGS[k].peds) { setFreeLung('normal'); applyFreeStart(FREE_ADULT_START); }
    setFreeLung(k); for (const x of Object.keys(s)) vals[x].v = s[x]; enforceITLimit(); updateUI();
    deviceState = 'run'; simTime += 1000; _lv.vit = null; updateLungView();
    const b = document.querySelector('#tl-viz .lv-vit.bp'); return { cls: b.className, title: b.title, bp: document.querySelector('#tl-viz .lv-bp').textContent, map: lvVitals.shown.map, sbp: lvVitals.shown.sbp }; }, [k, s]);
  const g = await cls('normal', { peep: 5 }), am = await cls('ards', { peep: 18, fio2: 80, hipres: 80 }), rd = await cls('ards', { peep: 24, fio2: 80, hipres: 80 });
  ok('L17 a normal pressure is not coloured', g.cls === 'lv-vit bp', g.cls);
  ok(`L17 ARDS on PEEP 18 is amber (${am.bp}, MAP ${Math.round(am.map)}: SBP 90–99)`, /\bwarn\b/.test(am.cls) && am.sbp >= 90 && am.sbp < 100 && am.map >= 65, am.cls);
  ok(`L17 ARDS on PEEP 24 is red (${rd.bp}, MAP ${Math.round(rd.map)}: SBP < 90 or MAP < 65)`, /\bbad\b/.test(rd.cls) && (rd.sbp < 90 || rd.map < 65), rd.cls);
  ok('L17 and says why: the Surviving Sepsis MAP target', /MAP ≥ 65/.test(rd.title) && /Surviving Sepsis/.test(rd.title), rd.title);
  const kid = await cls('pedArds', { peep: 22, fio2: 80, hipres: 80 }), kidOk = await cls('pedArds', { peep: 10 });
  ok(`L17 a 6-year-old is judged by PALS (SBP < 70 + 2 × 6 = 82), not adult numbers`, /SBP < 82/.test(kid.title) && kidOk.cls === 'lv-vit bp', kid.title);
  ok(`L17 …so ${kid.bp} on PEEP 22 is coloured`, /\b(warn|bad)\b/.test(kid.cls) && kid.sbp < 92, kid.cls);
  const inf = await cls('pedBronch', { peep: 6 });
  ok('L17 an infant\'s limit is SBP 70', /SBP < 70/.test(inf.title) && inf.cls === 'lv-vit bp', inf.title + ' ' + inf.bp);
  // Drift: about 10 s of sim time
  const d = await vp.evaluate(() => {
    setFreeLung('normal'); applyFreeStart(FREE_ADULT_START); vals.peep.v = 5; vals.hipres.v = 60; updateUI();
    simTime = 200000; _lv.vit = null; updateLungView(); const before = lvVitals.shown.map;
    vals.peep.v = 20; updateUI(); const target = vitalsTarget().map;
    simTime += 1000; updateLungView(); const oneSec = lvVitals.shown.map;
    for (let i = 0; i < 60; i++) { simTime += 1000; updateLungView(); } const oneMin = lvVitals.shown.map;
    return { before, target, oneSec, oneMin }; });
  ok('L17 after a PEEP change the pressure drifts — one second in it has moved 5–15% of the way', (d.before - d.oneSec) > 0.05 * (d.before - d.target) && (d.before - d.oneSec) < 0.15 * (d.before - d.target), JSON.stringify(d));
  ok('L17 …and has settled within a minute', Math.abs(d.oneMin - d.target) < 0.05, JSON.stringify(d));
  const st = await vp.evaluate(() => { deviceState = 'standby'; applyStandbyVisual(); updateLungView(); return document.querySelector('#tl-viz .lv-bp').textContent; });
  ok('L17 standby: no pressure shown', st === '—', st);
  await vp.context().close(); }

console.log('\nL18 the lung view in the tutorial and the Level 2–3 scenarios');
{ const sp = await (await browser.newContext({ viewport: { width: 400, height: 900 }, serviceWorkers: 'block' })).newPage();
  sp.on('pageerror', e => errs.push(String(e)));
  await sp.goto(ORIGIN + '/vent-ltv1200.html');
  await sp.waitForFunction(() => typeof startLevel === 'function');
  // Load a level/scenario, close the intro, render; optionally change settings. Returns the steady state
  // for those settings plus what the card shows.
  const S = (lvl, idx, set) => sp.evaluate(([lvl, idx, set]) => {
    startLevel(lvl); if (lvl > 1) { scenarioIdx = idx; loadScenario(SCENARIO_LEVELS[lvl][idx]); }
    document.getElementById('intro-overlay').classList.remove('open');
    if (set) { for (const k of Object.keys(set)) { if (k === 'mode') ventMode = set[k]; else vals[k].v = set[k]; } enforceITLimit(); updateUI(); }
    renderMissionCard(); updateLungView();
    const bar = document.getElementById('mission-bar'), sc = lvl > 1 ? SCENARIO_LEVELS[lvl][idx] : null;
    const story = {}; if (sc) sc.vitals.forEach(v => { const k = v.k.replace(/₂/g, '2').toLowerCase(), n = parseFloat(v.v); if (!isNaN(n)) story[k] = n; });
    const pt = lvPatient();
    return { t: vitalsTarget(), shown: lvVitals && lvVitals.shown, story, card: !!bar.querySelector('.lv-vitals'), sprite: pt && pt.sprite,
             label: bar.querySelector('.lv-stage') && bar.querySelector('.lv-stage').getAttribute('aria-label'),
             bpCls: bar.querySelector('.lv-vit.bp') && bar.querySelector('.lv-vit.bp').className, bpTitle: bar.querySelector('.lv-vit.bp') && bar.querySelector('.lv-vit.bp').title,
             goal: sc && sc.goal ? !!sc.goal.check() : null };
  }, [lvl, idx, set || null]);

  const tut = await S(1, 0);
  ok('L18 Level 1: the tutorial card shows the lung view and its vitals', tut.card && tut.sprite === 'normal', tut.label);
  const tut2 = await S(1, 0, { rate: 16, vt: 500 });
  ok('L18 …and the tutorial\'s first fix (MV 7–9 L/min) brings PaCO₂ from ' + tut.t.paco2.toFixed(0) + ' to 35–45', tut.t.paco2 > 50 && tut2.t.paco2 >= 35 && tut2.t.paco2 <= 45, tut2.t.paco2.toFixed(1));

  const scen = [[2, 0, 'normal'], [2, 1, 'ards'], [2, 2, 'copd'], [2, 3, 'normal'], [2, 4, 'ards'], [3, 0, 'normal'], [3, 1, 'asthma'], [3, 2, 'ards'], [3, 3, 'normal']];
  for (const [l, i, spr] of scen) {
    const r = await S(l, i);
    const tag = `L${l}S${i + 1}`;
    ok(`L18 ${tag}: the card shows the lung view, drawn as ${spr}`, r.card && r.sprite === spr, r.sprite);
    if (r.story.spo2 != null)
      ok(`L18 ${tag}: SpO₂ starts at the monitor's ${r.story.spo2}% and the settings hold it there (steady ${r.t.spo2.toFixed(1)})`,
         Math.abs(r.shown.spo2 - r.story.spo2) <= 1.5 && Math.abs(r.t.spo2 - r.story.spo2) <= 1.5, r.shown.spo2.toFixed(1));
    if (r.story.etco2 != null)
      ok(`L18 ${tag}: EtCO₂ starts at the monitor's ${r.story.etco2}`, Math.abs(r.shown.etco2 - r.story.etco2) <= 1.5, r.shown.etco2.toFixed(1));
    if (r.story.paco2 != null)
      ok(`L18 ${tag}: PaCO₂ starts at the story's ${r.story.paco2}`, Math.abs(r.shown.paco2 - r.story.paco2) <= 1.5, r.shown.paco2.toFixed(1));
    if (r.story.ph != null)
      ok(`L18 ${tag}: pH starts at the story's ${r.story.ph} (Henderson–Hasselbalch)`, Math.abs(r.shown.ph - r.story.ph) <= 0.015, r.shown.ph.toFixed(3));
    if (r.story.pao2 != null)
      ok(`L18 ${tag}: the story's PaO₂ ${r.story.pao2} agrees with its SpO₂ (Severinghaus)`, Math.abs(r.t.pao2 - r.story.pao2) <= 4, r.t.pao2.toFixed(0));
  }

  // Each scenario's correct answer moves the vitals the way the evidence says
  let a = await S(2, 0), b = await S(2, 0, { rate: 18 });
  ok('L18 L2S1 Rising CO₂: left alone, the CO₂ keeps climbing past 62', a.t.paco2 > 66, a.t.paco2.toFixed(1));
  ok('L18 …raising the rate to 18 (MV 8.1) brings PaCO₂ to 35–45', b.goal && b.t.paco2 >= 35 && b.t.paco2 <= 45, b.t.paco2.toFixed(1));

  a = await S(2, 1); b = await S(2, 1, { peep: 10 }); let c = await S(2, 1, { fio2: 100 });
  ok('L18 L2S2 ARDS: PEEP 10 (the answer) lifts SpO₂ above 92 on the same FiO₂', b.goal && b.t.spo2 >= 92, b.t.spo2.toFixed(1));
  ok('L18 …while 100% oxygen on PEEP 3 does less — a shunt answers to PEEP', c.t.spo2 < b.t.spo2 - 2, c.t.spo2.toFixed(1));
  ok('L18 …and the PEEP costs some blood pressure', b.t.map < a.t.map - 2, `${a.t.map.toFixed(0)} → ${b.t.map.toFixed(0)}`);

  a = await S(2, 2); b = await S(2, 2, { it: 0.65 }); c = await S(2, 2, { rate: 12 });
  ok('L18 L2S3 COPD: left alone, EtCO₂ keeps climbing past 52', a.t.etco2 > 52.5, a.t.etco2.toFixed(1));
  ok('L18 …shortening Ti to 0.65 (I:E ≥ 1:4) cuts the auto-PEEP and lifts the BP, CO₂ unchanged', b.goal && b.t.peepTotal < a.t.peepTotal && b.t.map > a.t.map && Math.abs(b.t.paco2 - a.t.paco2) < 0.5, `${a.t.peepTotal}→${b.t.peepTotal}, MAP ${a.t.map.toFixed(1)}→${b.t.map.toFixed(1)}`);
  ok('L18 …dropping the rate to 12 opens the I:E too, but the CO₂ cost takes pH under 7.20, so the goal says no', !c.goal && c.t.paco2 > a.t.paco2 + 20 && c.t.ph < 7.20, c.t.paco2.toFixed(0) + ' / pH ' + c.t.ph.toFixed(2));
  const e = await S(2, 2, { rate: 15, it: 0.65 }), f = await S(2, 2, { rate: 10, it: 0.8 });
  ok('L18 …a balanced answer (rate 15, Ti 0.65) gets auto-PEEP under 5 and keeps pH ≥ 7.20', e.goal && e.t.peepTotal < 5 && e.t.ph >= 7.20, `${e.t.peepTotal} / pH ${e.t.ph.toFixed(2)}`);
  ok('L18 …and rate 10 (I:E 1:6.5) drives pH below 7.20 and fails — the goal grades the patient, not only the I:E', !f.goal && f.t.ph < 7.20, f.t.ph.toFixed(2));

  a = await S(2, 3); b = await S(2, 3, { it: 0.8 });
  ok('L18 L2S4 Fighting the Vent: the fix is mechanical — gas exchange barely moves', b.goal && Math.abs(b.t.spo2 - a.t.spo2) < 1 && Math.abs(b.t.paco2 - a.t.paco2) < 1, `${a.t.paco2.toFixed(1)} → ${b.t.paco2.toFixed(1)}`);

  a = await S(2, 4); b = await S(2, 4, { rate: 32 });
  ok('L18 L2S5 Septic: left at 7.2 L/min, PaCO₂ heads far above the pre-intubation 28', a.t.paco2 > 45, a.t.paco2.toFixed(0));
  ok('L18 …matching the drive (MV 14.4) holds it at or below 28', b.goal && b.t.paco2 <= 28, b.t.paco2.toFixed(1));
  ok('L18 …and the BP reads septic shock: red (MAP < 65)', /\bbad\b/.test(a.bpCls) && a.t.map < 65, a.t.map.toFixed(1));
  ok('L18 …left alone, the pH falls from 7.18 toward 7.0 as the CO₂ climbs', a.t.ph < 7.08, a.t.ph.toFixed(2));

  a = await S(3, 0); b = await S(3, 0, { mode: 'cpap', ps: 6, peep: 5 });
  ok('L18 L3S1 weaning: on CPAP/PS 6 the patient holds SpO₂ and their own PaCO₂ (≈ 42)', b.goal && Math.abs(b.t.spo2 - a.t.spo2) < 1 && Math.abs(b.t.paco2 - 42) < 0.5, `${b.t.spo2.toFixed(1)} / ${b.t.paco2.toFixed(1)}`);

  a = await S(3, 1); b = await S(3, 1, { rate: 16, it: 0.8 });
  ok('L18 L3S2 asthma: slowing to 16 with a shorter Ti cuts the trapping and lifts the BP', b.goal && b.t.peepTotal < a.t.peepTotal - 3 && b.t.map > a.t.map + 2, `${a.t.peepTotal}→${b.t.peepTotal}`);
  ok('L18 …at the price of permissive hypercapnia, within the pH 7.15 floor', b.t.paco2 > a.t.paco2 + 15 && b.t.ph >= 7.15, b.t.paco2.toFixed(0) + ' / pH ' + b.t.ph.toFixed(2));
  c = await S(3, 1, { rate: 10 });
  ok('L18 …while slowing to 10 drops the pH under 7.15 and fails', !c.goal && c.t.ph < 7.15, c.t.ph.toFixed(2));

  a = await S(3, 2); b = await S(3, 2, { peep: 14, fio2: 90 }); c = await S(3, 2, { fio2: 100 });
  ok('L18 L3S3 severe ARDS: PEEP 14 + FiO₂ 90% reaches the ARDSnet SpO₂ band (≥ 88)', b.goal && b.t.spo2 >= 88, b.t.spo2.toFixed(1));
  ok('L18 …100% oxygen on PEEP 8 alone falls short of that', c.t.spo2 < b.t.spo2 - 2, c.t.spo2.toFixed(1));

  a = await S(3, 3); b = await S(3, 3, { rate: 20 }); c = await S(3, 3, { rate: 19 }); const d = await S(3, 3, { rate: 23 });
  ok('L18 L3S4 TBI: the answer (MV 10 L/min) brings EtCO₂ into 30–35', b.goal && b.t.etco2 >= 30 && b.t.etco2 <= 35, b.t.etco2.toFixed(1));
  ok('L18 …across the whole graded range (9.5–11.5 L/min) PaCO₂ stays 29–36', c.goal && d.goal && c.t.paco2 <= 36 && d.t.paco2 >= 29, `${c.t.paco2.toFixed(1)} … ${d.t.paco2.toFixed(1)}`);
  ok('L18 …and BP is judged by the Brain Trauma Foundation (SBP ≥ 110), not MAP 65', /Brain Trauma Foundation/.test(a.bpTitle), a.bpTitle);

  const none = await sp.evaluate(() => { startLevel(7); document.getElementById('intro-overlay').classList.remove('open'); renderMissionCard(); return !!document.querySelector('#mission-bar .lv-vitals'); });
  ok('L18 Level 7 (not asked for) has no lung view', !none);
  await sp.context().close(); }

console.log('\nL19 usability on a phone: live strip, snapshot label, first button, stable panel');
{ const up = await (await browser.newContext({ viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' })).newPage();
  up.on('pageerror', e => errs.push(String(e)));
  await up.goto(ORIGIN + '/vent-ltv1200.html');
  await up.waitForFunction(() => typeof startLevel === 'function');
  const load = (l, i) => up.evaluate(([l, i]) => { deviceState = 'run'; applyStandbyVisual(); startLevel(l); if (l > 1) { scenarioIdx = i; loadScenario(SCENARIO_LEVELS[l][i]); }
    document.getElementById('intro-overlay').classList.remove('open'); renderMissionCard(); window.scrollTo(0, 0); }, [l, i]);
  // The first button is on the first screen for every card
  const cards = [[1, 0], [2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [3, 0], [3, 1], [3, 2], [3, 3]], below = [];
  for (const [l, i] of cards) { await load(l, i); await up.waitForTimeout(80);
    const b = await up.evaluate(() => { const c = document.querySelector('#mission-bar .mission-cta'); return c ? Math.round(c.getBoundingClientRect().bottom) : 0; });
    if (b > 664) below.push(`L${l}S${i + 1}:${b}`); }
  ok('L19 on a 390×664 phone every L1–L3 card shows its first button without scrolling', below.length === 0, below.join(' '));
  // Snapshot label on the scenario monitor, not on Level 7
  await load(2, 1);
  ok('L19 a scenario monitor is live, and its arrival labs/settings are captioned "On arrival"', await up.evaluate(() => !!document.querySelector('#mission-bar .monitor[data-live]') && /on arrival/i.test(document.querySelector('#mission-bar .mon-chips-tag')?.textContent || '')));
  const l7 = await up.evaluate(() => { startLevel(7); document.getElementById('intro-overlay').classList.remove('open'); renderMissionCard(); return !!document.querySelector('#mission-bar .monitor[data-live]') || !!document.querySelector('#mission-bar .mon-chips-tag'); });
  ok('L19 …and a Level 7 monitor (no lung view) stays the story\'s', !l7);
  // The live strip
  await load(2, 1); await up.waitForTimeout(400);
  const top = await up.evaluate(() => { const s = document.querySelector('.lv-strip'); return { show: s.classList.contains('show'), hidden: s.getAttribute('aria-hidden') }; });
  ok('L19 with the lung view on screen the strip stays hidden (and hidden from screen readers)', !top.show && top.hidden === 'true', JSON.stringify(top));
  await up.evaluate(() => document.querySelector('#cw-peep').scrollIntoView({ block: 'center' })); await up.waitForTimeout(500);
  const down = await up.evaluate(() => { const s = document.querySelector('.lv-strip'), r = s.getBoundingClientRect();
    return { show: s.classList.contains('show'), top: r.top, right: r.right, w: innerWidth, txt: s.textContent,
             spo2: Math.round(lvVitals.shown.spo2), et: Math.round(lvVitals.shown.etco2), bp: Math.round(lvVitals.shown.sbp) + '/' + Math.round(lvVitals.shown.dbp) }; });
  ok('L19 down at the controls, the strip shows the live SpO₂, EtCO₂ and BP at the top of the screen', down.show && down.top >= 0 && down.top < 20 && down.right <= down.w
     && down.txt.includes(down.spo2 + '%') && down.txt.includes(String(down.et)) && down.txt.includes(down.bp), JSON.stringify(down));
  await up.locator('.lv-strip').click(); await up.waitForTimeout(900);
  const back = await up.evaluate(() => { const r = document.getElementById('tl-viz').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, show: document.querySelector('.lv-strip').classList.contains('show') }; });
  ok('L19 tapping the strip brings the lung view back, and the strip goes away', back.top >= 0 && back.bottom <= 664 && !back.show, JSON.stringify(back));
  // Stable panel height whatever the digits
  const hts = await up.evaluate(() => { const h = []; for (const [sb, db, sp] of [[99, 60, 85], [138, 86, 100], [72, 41, 9]]) {
      _lv.vit.sbp = sb; _lv.vit.dbp = db; _lv.vit.map = (sb + 2 * db) / 3; _lv.vit.spo2 = sp; _lv.vitT = simTime; updateLungView();
      h.push(Math.round(document.getElementById('tl-viz').getBoundingClientRect().height)); } return h; });
  ok('L19 the panel keeps one height as the numbers change digits', hts.every(x => x === hts[0]), hts.join(', '));
  // COPD: significant vs residual trapping are worded differently
  const note = (set) => up.evaluate((set) => { for (const k of Object.keys(set)) vals[k].v = set[k]; enforceITLimit(); updateUI(); updateLungView();
    const n = document.querySelector('#tl-viz .lv-note'); return { cls: n.className, txt: n.textContent, ap: effectiveAutoPEEP() }; }, set);
  await load(2, 2);
  const n0 = await note({}), n1 = await note({ rate: 15, it: 0.65 });
  ok(`L19 COPD start: auto-PEEP ${n0.ap} (≥ 5) is called out as trapping`, n0.ap >= 5 && /trap\b/.test(n0.cls) && /Not enough time/.test(n0.txt), JSON.stringify(n0));
  ok(`L19 …after a good fix, auto-PEEP ${n1.ap} (< 5) reads as the usual small residual`, n1.ap < 5 && !/trap\b/.test(n1.cls) && /usual aim/.test(n1.txt), JSON.stringify(n1));
  // pH colour
  const ph = await up.evaluate(() => { vals.rate.v = 10; vals.it.v = 0.8; enforceITLimit(); updateUI(); for (let k = 0; k < 400; k++) { simTime += 1000; updateLungView(); }
    const e = document.querySelector('#tl-viz .lv-ph'); return { cls: e.className, txt: e.textContent }; });
  ok('L19 a pH under 7.20 shows red', /\bbad\b/.test(ph.cls) && parseFloat(ph.txt.replace('pH', '')) < 7.20, JSON.stringify(ph));
  // The strip never covers the page header, and leaves no trace when hidden
  const land = await (await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' })).newPage();
  await land.goto(ORIGIN + '/vent-ltv1200.html'); await land.waitForFunction(() => typeof startLevel === 'function');
  const lh = await land.evaluate(async () => { deviceState = 'run'; applyStandbyVisual(); startLevel(2); scenarioIdx = 1; loadScenario(SCENARIO_LEVELS[2][1]);
    document.getElementById('intro-overlay').classList.remove('open'); renderMissionCard(); window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 400)); const s = document.querySelector('.lv-strip');
    return { lungOff: document.querySelector('#tl-viz .lv-vitals').getBoundingClientRect().bottom > innerHeight, show: s.classList.contains('show'), vis: getComputedStyle(s).visibility }; });
  ok('L19 landscape phone at the top: the vitals are below the fold, but the strip stays off the header', lh.lungOff && !lh.show && lh.vis === 'hidden', JSON.stringify(lh));
  await land.context().close();
  // The patient waits while the intro covers the case
  const ps = await up.evaluate(() => { startLevel(2); scenarioIdx = 4; loadScenario(SCENARIO_LEVELS[2][4]); document.getElementById('intro-overlay').classList.add('open'); renderMissionCard();
    updateLungView(); const a = lvVitals.shown.paco2; for (let k = 0; k < 60; k++) { simTime += 1000; updateLungView(); } const b = lvVitals.shown.paco2;
    document.getElementById('intro-overlay').classList.remove('open'); for (let k = 0; k < 60; k++) { simTime += 1000; updateLungView(); } return { a, b, c: lvVitals.shown.paco2 }; });
  ok('L19 the vitals hold still while the intro is open, and start moving once it closes', Math.abs(ps.b - ps.a) < 0.01 && ps.c > ps.b + 5, JSON.stringify(ps));
  // Tutorial: one patient across the stages; a misset High Pressure limit hurts them over time
  const tu = await up.evaluate(() => { startLevel(1); document.getElementById('intro-overlay').classList.remove('open'); renderMissionCard();
    const go = (fix) => { for (const k of Object.keys(fix)) { if (k === 'mode') ventMode = fix[k]; else if (k === 'breathType') breathType = fix[k]; else vals[k].v = fix[k]; } enforceITLimit(); updateUI();
      for (let i = 0; i < 300; i++) { simTime += 1000; updateLungView(); } const ok = curStage().goal.check(); scenarioDiagnosed = true; advanceStage(); updateLungView(); return ok; };
    const g1 = go({ rate: 16 }), g2 = go({ it: 1.2 }), g3 = go({ peep: 5, sens: 2 });
    const enter4 = lvVitals.shown.paco2; for (let i = 0; i < 60; i++) { simTime += 1000; updateLungView(); } const min4 = lvVitals.shown.paco2;
    const g4 = go({ hipres: Math.round(estPIP() + 8) }), g5 = go({ mode: 'simv', ps: 8 });
    vals.pc.v = 10; breathType = 'pressure'; updateUI(); for (let i = 0; i < 300; i++) { simTime += 1000; updateLungView(); }
    return { goals: [g1, g2, g3, g4, g5, curStage().goal.check()], enter4, min4, pc10: { paco2: vitalsTarget().paco2, ph: vitalsTarget().ph, vt: vals.pc.v * lung.compliance }, plat: estPplat() }; });
  ok('L19 tutorial: each stage\'s answer meets its goal on the healthy-lung patient', tu.goals.every(Boolean), JSON.stringify(tu.goals));
  ok(`L19 …Stage 4 carries the patient over (PaCO₂ ${tu.enter4.toFixed(0)}) and the misset limit drives it up as it cuts breaths`, tu.enter4 < 45 && tu.min4 > tu.enter4 + 10, `${tu.enter4.toFixed(1)} → ${tu.min4.toFixed(1)}`);
  ok('L19 …Stage 6: Pressure Control 10 delivers 500 mL and keeps PaCO₂ 35–45', tu.pc10.vt === 500 && tu.pc10.paco2 >= 35 && tu.pc10.paco2 <= 45, JSON.stringify(tu.pc10));
  await up.context().close(); }

console.log('\nL20 the scenario monitor is live: HR, SpO₂ and EtCO₂ follow the vent');
{ const mp = await (await browser.newContext({ viewport: { width: 390, height: 664 }, serviceWorkers: 'block' })).newPage();
  mp.on('pageerror', e => errs.push(String(e)));
  await mp.goto(ORIGIN + '/vent-ltv1200.html'); await mp.waitForFunction(() => typeof startLevel === 'function');
  const mon = (l, i, set, secs) => mp.evaluate(([l, i, set, secs]) => {
    deviceState = 'run'; applyStandbyVisual(); startLevel(l); scenarioIdx = i; loadScenario(SCENARIO_LEVELS[l][i]);
    document.getElementById('intro-overlay').classList.remove('open'); renderMissionCard(); updateLungView();
    const read = () => { const n = c => { const e = document.querySelector('#mission-bar .' + c + ' .mon-val-num'); return e ? +e.textContent : null; };
      return { hr: n('mon-ecg'), spo2: n('mon-spo2'), et: n('mon-co2'), sh: lvVitals.shown }; };
    const story = {}; SCENARIO_LEVELS[l][i].vitals.forEach(v => { story[v.k.replace(/₂/g, '2').toLowerCase()] = parseFloat(v.v); });
    const a = read();
    if (set) { for (const k of Object.keys(set)) vals[k].v = set[k]; enforceITLimit(); updateUI(); }
    for (let k = 0; k < (secs || 0); k++) { simTime += 1000; updateLungView(); }
    return { story, a, b: read() };
  }, [l, i, set || null, secs || 0]);
  // Every Level 2–3 monitor starts at its story
  const bad = [];
  for (const [l, n] of [[2, 5], [3, 4]]) for (let i = 0; i < n; i++) {
    const r = await mon(l, i);
    if (r.story.hr != null && r.a.hr !== r.story.hr) bad.push(`L${l}S${i + 1} HR ${r.a.hr}≠${r.story.hr}`);
    if (r.story.spo2 != null && Math.abs(r.a.spo2 - r.story.spo2) > 1.5) bad.push(`L${l}S${i + 1} SpO₂ ${r.a.spo2}≠${r.story.spo2}`);
    if (r.story.etco2 != null && Math.abs(r.a.et - r.story.etco2) > 1.5) bad.push(`L${l}S${i + 1} EtCO₂ ${r.a.et}≠${r.story.etco2}`);
  }
  ok('L20 every Level 2–3 monitor starts at its story\'s HR, SpO₂ and EtCO₂', bad.length === 0, bad.join('; '));
  // ARDS: PEEP 10, two minutes later
  const r = await mon(2, 1, { peep: 10 }, 120);
  ok('L20 ARDS: after PEEP 10 the monitor\'s SpO₂ rises with the lung view\'s', r.b.spo2 === Math.round(r.b.sh.spo2) && r.b.spo2 >= r.a.spo2 + 7, `${r.a.spo2} → ${r.b.spo2}`);
  const wantHR = 118 + 0.83 * (Math.max(0, 98 - r.b.sh.spo2) - Math.max(0, 98 - r.a.sh.spo2)) + 0.3 * (Math.max(0, r.b.sh.paco2 - 45) - Math.max(0, r.a.sh.paco2 - 45)) + 3 * 118 * 118 / 60000 * (r.a.sh.map - r.b.sh.map);
  ok(`L20 …and HR follows the reflexes: 118 → ${Math.round(wantHR)} (0.83 bpm per % SaO₂, baroreflex 3 ms/mmHg)`, r.b.hr === Math.round(wantHR) && r.b.hr < 118, `${r.b.hr} vs ${wantHR.toFixed(1)}`);
  ok('L20 …while EtCO₂ on the monitor matches the lung view', r.b.et === Math.round(r.b.sh.etco2), `${r.b.et}`);
  // Septic, left alone: CO₂ climbs, HR edges up (weak CO₂ term only; BP unchanged)
  const sp = await mon(2, 4, null, 120);
  ok('L20 septic, left at 7.2 L/min: EtCO₂ on the monitor climbs from 26', sp.b.et > sp.a.et + 8, `${sp.a.et} → ${sp.b.et}`);
  ok('L20 …and HR edges up only a little (the CO₂ effect is weak)', sp.b.hr > sp.a.hr && sp.b.hr - sp.a.hr < 8, `${sp.a.hr} → ${sp.b.hr}`);
  // A sweep that matches the rate
  const sw = await mp.evaluate(() => { const ecg = document.querySelector('#mission-bar .mon-ecg'); const svg = ecg && ecg.parentNode.querySelector('svg');
    return { dur: parseFloat(svg.style.animationDuration), hr: +ecg.querySelector('.mon-val-num').textContent }; });
  ok('L20 the ECG sweep keeps about three complexes per window at the new rate', Math.abs(sw.dur - 180 / sw.hr) < 180 / sw.hr * 0.12, JSON.stringify(sw));
  await mp.context().close(); }

console.log('\nL13 accessible, and fits a phone');
{ const a = await p.evaluate(() => { const st = document.querySelector('#tl-viz .lv-stage');
    return { role: st.getAttribute('role'), label: st.getAttribute('aria-label'), live: document.querySelector('#tl-viz [aria-live]') }; });
  ok('L13 the picture is an image with a label naming the lung', a.role === 'img' && /test lung/.test(a.label || ''), a.label);
  ok('L13 the ever-changing phase and volume are not announced', !a.live && await p.evaluate(() => document.querySelector('#tl-viz .lv-phase').getAttribute('aria-hidden') === 'true'));
  const small = await (await browser.newContext({ viewport: { width: 320, height: 640 }, serviceWorkers: 'block' })).newPage();
  small.on('pageerror', e => errs.push(String(e)));
  await small.goto(ORIGIN + '/vent-ltv1200.html?free');
  await small.waitForFunction(() => document.querySelector('#tl-viz'));
  const fit = await small.evaluate(() => { const v = document.getElementById('tl-viz').getBoundingClientRect(), st = document.querySelector('#tl-viz .lv-stage').getBoundingClientRect();
    return { over: document.documentElement.scrollWidth - innerWidth, right: v.right, w: innerWidth, art: Math.round(st.width) }; });
  ok('L13 no sideways scroll at 320px', fit.over <= 0 && fit.right <= fit.w, JSON.stringify(fit));
  ok('L13 and the lung is still big enough to read (≥ 110px)', fit.art >= 110, fit.art);
  await small.context().close(); }

ok('L14 no page errors', errs.length === 0, errs.join(' | '));
console.log(`\n==== ${pass} passed, ${fail} failed ====`);
if (fails.length) console.log('FAILURES:\n - ' + fails.join('\n - '));
await browser.close(); srv.close();
process.exit(fail ? 1 : 0);
