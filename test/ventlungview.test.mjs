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
  ok('L16 PEEP 10 on 50% gets within 1.5 points of 100% oxygen on PEEP 5 — a shunt answers to PEEP, not oxygen', a10.spo2 >= a5o.spo2 - 1.5 && a10.shunt < a5.shunt, JSON.stringify({ p10: a10.spo2.toFixed(1), o100: a5o.spo2.toFixed(1) }));
  const c21 = await V('copd', { fio2: 21 }), c30 = await V('copd', { fio2: 30 });
  ok('L16 COPD on room air is below 90, and a little oxygen fixes it (V/Q mismatch)', c21.spo2 < 90 && c30.spo2 >= 94, JSON.stringify({ ra: c21.spo2.toFixed(0), o30: c30.spo2.toFixed(0) }));
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
