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
  ok('L1 with three stacked poses', r.poses === 3);
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
  await setup('copd');
  const pos = await p.evaluate(() => [...document.querySelectorAll('#tl-viz .lv-pose')].map(e => e.style.backgroundPosition));
  ok('L2 COPD shows the COPD row in all three poses', JSON.stringify(pos) === JSON.stringify(['0% 20%', '50% 20%', '100% 20%']), JSON.stringify(pos)); }

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
  const chip = await p.evaluate(() => [...document.querySelectorAll('.tl-chip')].map(c => c.textContent).find(t => /Vt \/ kg/.test(t)));
  ok('L7 the same number as the Vt / kg readout', chip && chip.includes(Math.round(s.pc * s.C) + ' mL'), chip);
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
  await p.waitForTimeout(200);
  const r = await p.evaluate(() => ({ phase: document.querySelector('#tl-viz .lv-phase').textContent, pose: [...document.querySelectorAll('#tl-viz .lv-pose')].findIndex(e => e.classList.contains('on')) }));
  ok('L10 standby shows the resting lung and says STANDBY', r.pose === 0 && /STANDBY/.test(r.phase), JSON.stringify(r));
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
