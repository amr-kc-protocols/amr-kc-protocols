/*
 * Ventilator Simulator 3000 — scenario answers
 * --------------------------------------------
 * vent-ltv1200.html, in headless Chromium. Each clinical scenario grades the
 * learner's settings with a goal.check(). Those checks are the therapy the
 * simulator teaches as correct, so they are held here to the evidence behind
 * them, and every scenario that was corrected keeps a case for the old
 * answer, which must now fail.
 *
 *   S1  no scenario is already solved by its own starting settings, and every
 *       one has a diagnosis whose marked answer exists
 *   S2  septic shock, compensating: ventilation must hold the PaCO₂ at or
 *       below the patient's own pre-intubation 28 (and not under 20), where
 *       Winter's formula (1.5 × HCO₃⁻ + 8 ± 2) puts full compensation at about
 *       21–26. The goal reads the PaCO₂ the settings settle at, so 10.8 and
 *       13.5 L/min, which used to pass, now fail (PaCO₂ 37 and 29); about
 *       14 L/min or more at a lung-safe Vt passes
 *   S3  severe ARDS: FiO₂ 0.9 takes PEEP ≥ 14 (ARDSnet lower-PEEP table:
 *       14–18 at 0.9). PEEP 12 at FiO₂ 0.9 is off the table and fails
 *   S4  herniation: PaCO₂ 42 on 8 L/min needs only ~10–11 L/min to reach
 *       30–35 (ENLS: brief course at 30–35). 13.5 L/min, which used to pass,
 *       drives it to about 25 and fails
 *   S5  weaning: no RSBI in the readiness screen (AARC 2024 suggests it isn't
 *       needed); the trial is CPAP/PS 5–8 with PEEP ≤ 5
 *   S6  one-sided pneumonia: moderate PEEP 8–12 passes, higher fails, and the
 *       teaching says why (it overdistends the good lung)
 *   S7  the scenarios left as they were still grade their textbook answer
 *   C1–C9 the Free Play readout grades every reading against the evidence for
 *       the lung on the panel (green inside the target, amber allowed but not
 *       the aim, red outside): an ARDS lung on healthy-lung settings is not
 *       green; fixing it to ARDSnet turns it green; obstructive lungs want a
 *       long exhale, high flow and a low minute volume; PEEP follows the
 *       ARDSnet table for the FiO₂; every flag explains itself with a source
 *   S9  scenarios now carry the lung their story describes: the capstone's
 *       plateau is 33 at 650 mL on PEEP 5, as it says, and every PEEP in its
 *       goal range can pass; "clean mechanics" means a healthy lung
 *   S10 goals that teach a limit on the patient grade the patient: COPD needs
 *       I:E ≥ 1:4 with pH ≥ 7.20 (rate 10 opened the I:E at pH ≈ 7.1 and used
 *       to pass); status asthmaticus needs pH ≥ 7.15 (rate 12 at 450 mL left
 *       pH ≈ 7.0 and used to pass). The pH is recomputed here from the
 *       page's PaCO₂ (Henderson–Hasselbalch), and the asthma floor is the
 *       panel's red line for that patient
 *   S11 the diagnosis can't be won by a test-taking cue, held to the same
 *       standard as Chart Rx: the right answer is the longest choice in at
 *       most a third of the questions and its length matches the wrong
 *       ones', and on screen the choices come in a random order — the right
 *       one lands in every slot — with grading by the choice, not the slot
 *
 * Run:  cd test && node ventscenarios.test.mjs
 */
import http from 'http';
import fs from 'fs';
import { readFile } from 'fs/promises';
import { extname, join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
const srv = http.createServer(async (q, r) => {
  try { const u = decodeURIComponent(q.url.split('?')[0]); const d = await readFile(join(ROOT, u));
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

const p = await (await browser.newContext({ viewport: { width: 430, height: 932 }, serviceWorkers: 'block' })).newPage();
const errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.goto(ORIGIN + '/vent-ltv1200.html');
await p.waitForFunction(() => typeof SCENARIO_LEVELS !== 'undefined' && typeof ACADEMY_SCENARIOS !== 'undefined');

// Grade one scenario: load it as the page does, apply settings, return goal.check().
const grade = (name, settings) => p.evaluate(([name, s]) => {
  const all = [].concat(...Object.values(SCENARIO_LEVELS)).concat(Object.values(ACADEMY_SCENARIOS));
  const sc = all.find(x => x && x.name === name); if (!sc) return 'missing';
  loadScenario(sc);
  if (s) { if (s.bt) breathType = s.bt; if (s.mode) ventMode = s.mode;
    for (const k of Object.keys(s)) if (vals[k]) vals[k].v = s[k]; enforceITLimit(); }
  return { pass: !!sc.goal.check(), mv: +estMinuteVolume().toFixed(1) };
}, [name, settings || null]);
const text = name => p.evaluate(name => { const all = [].concat(...Object.values(SCENARIO_LEVELS)).concat(Object.values(ACADEMY_SCENARIOS));
  const sc = all.find(x => x && x.name === name); return sc ? [sc.scenario, sc.diagnose.q, sc.diagnose.exp, sc.goal.text, sc.confirm].join(' ') : ''; }, name);

console.log('\nS1 every scenario starts unsolved');
{ const r = await p.evaluate(() => {
    const all = [].concat(...Object.values(SCENARIO_LEVELS).filter(Array.isArray)).concat(Object.values(ACADEMY_SCENARIOS));
    const seen = new Set(), out = [];
    for (const sc of all) { if (!sc || seen.has(sc.name)) continue; seen.add(sc.name);
      loadScenario(sc); out.push({ name: sc.name, solved: !!sc.goal.check(),
        answer: !!(sc.diagnose && sc.diagnose.choices && sc.diagnose.choices[sc.diagnose.correct]) }); }
    return out; });
  ok('S1 found the clinical scenarios (≥ 18)', r.length >= 18, r.length);
  const solved = r.filter(x => x.solved).map(x => x.name);
  ok('S1 none is already solved by its starting settings', solved.length === 0, solved.join(', '));
  const noAns = r.filter(x => !x.answer).map(x => x.name);
  ok('S1 every diagnosis marks an answer that exists', noAns.length === 0, noAns.join(', ')); }

console.log('\nS2 septic shock, compensating');
{ const N = 'The Compensating Septic Patient';
  const old = await grade(N, { rate: 22, vt: 450 });             // 9.9 L/min — the old answer's territory
  const old2 = await grade(N, { rate: 24, vt: 450 });            // 10.8 L/min — passed before
  const old3 = await grade(N, { rate: 30, vt: 450 });            // 13.5 L/min — passed before, PaCO₂ settles at 29
  const good = await grade(N, { rate: 32, vt: 450 });            // 14.4 L/min
  const good2 = await grade(N, { rate: 32, vt: 500 });           // 16 L/min
  ok('S2 10.8 L/min no longer passes (would let PaCO₂ rise above the patient\'s own)', !old2.pass && !old.pass, JSON.stringify([old, old2]));
  ok('S2 13.5 L/min no longer passes either: its PaCO₂ settles above 28', !old3.pass, JSON.stringify(old3));
  ok('S2 matching the pre-intubation drive (14.4 and 16 L/min) passes', good.pass && good2.pass, JSON.stringify([good, good2]));
  const over = await grade(N, { rate: 40, vt: 500 }), big = await grade(N, { rate: 24, vt: 600 });
  ok('S2 overshooting to a PaCO₂ under 20 fails', !over.pass, JSON.stringify(over));
  ok('S2 getting there with an oversized breath (600 mL, 8.6 mL/kg) fails', !big.pass, JSON.stringify(big));
  const pc = await p.evaluate(() => { const sc = SCENARIO_LEVELS[2][4]; loadScenario(sc);
    const out = []; for (let rate = 20; rate <= 44; rate++) { vals.rate.v = rate; vals.vt.v = 450; enforceITLimit();
      out.push({ rate, paco2: settledFor(sc).paco2, pass: !!sc.goal.check() }); } return out; });
  const wrong = pc.filter(x => x.pass !== (x.paco2 >= 20 && x.paco2 <= 28.05));
  ok('S2 at 450 mL, it passes exactly where the PaCO₂ settles at 20–28', wrong.length === 0 && pc.some(x => x.pass), JSON.stringify(wrong));
  const t = await text(N);
  ok('S2 the teaching uses Winter\'s formula and keeps PaCO₂ ≤ the pre-intubation 28', /Winter/.test(t) && /1\.5 × HCO₃/.test(t) && /21–26/.test(t) && /≤ 28|at or below the pre-intubation 28/.test(t));
  ok('S2 and no longer offers a 28–34 target', !/28–34/.test(t));
  ok('S2 warns that ETCO₂ under-reads PaCO₂ in shock', /ETCO₂ reads lower than the PaCO₂/.test(t)); }

console.log('\nS3 severe ARDS');
{ const N = 'Losing the Oxygenation Battle';
  ok('S3 PEEP 12 at FiO₂ 90% is off the ARDSnet table and fails', !(await grade(N, { peep: 12, fio2: 90 })).pass);
  ok('S3 PEEP 14 at FiO₂ 90% passes', (await grade(N, { peep: 14, fio2: 90 })).pass);
  ok('S3 PEEP 18 at FiO₂ 100% passes', (await grade(N, { peep: 18, fio2: 100 })).pass);
  ok('S3 the goal states the table pairing', /FiO₂ 0\.9 with PEEP 14–18/.test(await text(N))); }

console.log('\nS4 herniation');
{ const N = 'The Blown Pupil';
  // Independent check of the target: alveolar ventilation with ~150 mL of anatomic dead space
  const paco2 = (rate, vt) => 42 * (16 * (500 - 150)) / (rate * (vt - 150));
  const cases = [[20, 500], [22, 500], [27, 500], [26, 520]];
  for (const [rate, vt] of cases) {
    const g = await grade(N, { rate, vt }), pc = paco2(rate, vt), want = pc >= 29.5 && pc <= 35.5;
    ok(`S4 rate ${rate} × ${vt} mL → MV ${g.mv}, PaCO₂ ≈ ${pc.toFixed(0)}: ${want ? 'passes' : 'fails'}`, g.pass === want, JSON.stringify(g));
  }
  const t = await text(N);
  ok('S4 cites the brief course (ENLS) and BTF\'s actual threshold (≤ 25)', /under 2 hours/.test(t) && /PaCO₂ ≤ 25/.test(t));
  ok('S4 no longer attributes "PaCO₂ < 30 worsens outcomes" to BTF', !/sustained PaCO₂ < 30 worsens/.test(t)); }

console.log('\nS5 weaning');
{ const N = 'Ready to Come Down';
  const t = await text(N);
  ok('S5 RSBI is not part of the readiness screen (AARC 2024)', !/RSBI (is \d|< ?105|62)/.test(t) && /RSBI isn\\?'t needed|RSBI isn't needed/.test(t), t.match(/RSBI[^.]*/g));
  ok('S5 SIMV claim is attributed to the trials that showed it', /Brochard 1994, Esteban 1995/.test(t));
  ok('S5 CPAP, PS 6, PEEP 5 passes', (await grade(N, { mode: 'cpap', ps: 6, peep: 5 })).pass);
  ok('S5 PS 10 is not a low-level trial and fails', !(await grade(N, { mode: 'cpap', ps: 10, peep: 5 })).pass);
  ok('S5 SIMV fails', !(await grade(N, { mode: 'simv', ps: 6, peep: 5 })).pass); }

console.log('\nS6 one-sided pneumonia');
{ const N = 'Which Kind of Failure?';
  ok('S6 FiO₂ 60, PEEP 10 passes', (await grade(N, { fio2: 60, peep: 10 })).pass);
  ok('S6 PEEP 14 fails (overdistends the good lung)', !(await grade(N, { fio2: 60, peep: 14 })).pass);
  const t = await text(N);
  ok('S6 the teaching explains PEEP\'s limit and good-lung-down', /overdistends the <em>good<\/em> lung|overdistends the healthy lung/.test(t) && /good lung down|good-lung-down/.test(t)); }

console.log('\nS7 unchanged scenarios still grade their textbook answer');
{ const cases = [
    ['The Rising CO₂', { rate: 16, vt: 500 }, true],                    // 8 L/min, Vt 7.1 mL/kg
    ['The Rising CO₂', { rate: 12, vt: 700 }, false],                   // bigger breath, 10 mL/kg
    ['Hypoxemia That Won\'t Budge', { peep: 10 }, true],               // ARDSnet: FiO₂ 0.6 → PEEP 10
    ['COPD — Stop the Air-Trapping', { rate: 15, it: 0.65 }, true],    // I:E ≥ 1:4, pH ≥ 7.20 (S10)
    ['The Swinging Peak Pressure', { rate: 16, it: 0.8, vt: 550 }, true],   // I:E 1:3.7, pH ≥ 7.15 (S10)
    ['Non-Invasive Setup — CHF', { mode: 'cpap', peep: 10, fio2: 100 }, true],
    ['Tube or Mask?', { mode: 'nppv', ps: 10, peep: 5 }, true],
    ['Capstone — The Whole Package', { vt: 400, rate: 22, peep: 12 }, true],   // 5.7 mL/kg, Pplat ≈ 29
    ['Capstone — The Whole Package', { vt: 460, rate: 18, peep: 14 }, false],  // plateau over 30
  ];
  for (const [n, s, want] of cases) { const g = await grade(n, s); ok(`S7 ${n}: ${JSON.stringify(s)} ${want ? 'passes' : 'fails'}`, g.pass === want, JSON.stringify(g)); } }

console.log('\nS9 the lung matches the story');
{ const r = await p.evaluate(() => { const sc = ACADEMY_SCENARIOS.capstone; loadScenario(sc); const start = calcPplat().pplat;
    const reach = {}; for (let peep = 10; peep <= 14; peep += 2) { vals.peep.v = peep; vals.rate.v = 24; let any = false;
      for (let vt = 350; vt <= 460; vt += 10) { vals.vt.v = vt; if (sc.goal.check()) { any = true; break; } } reach[peep] = any; }
    const ag = ACADEMY_SCENARIOS.agitation; loadScenario(ag); return { start, reach, agC: lung.compliance }; });
  ok('S9 capstone starts at the plateau its story states (33)', Math.abs(r.start - 33) <= 1, r.start);
  ok('S9 every PEEP in the capstone goal (10–14) has a passing breath', Object.values(r.reach).every(Boolean), JSON.stringify(r.reach));
  ok('S9 the agitation case\'s "clean mechanics" is a healthy lung', r.agC >= 45, r.agC); }

// ── Free Play readout: graded for the lung on the panel ─────────────
await p.goto(ORIGIN + '/vent-ltv1200.html?free');
await p.waitForFunction(() => typeof freeMode !== 'undefined' && freeMode && document.querySelector('.tl-chip'));
// Put a lung on the panel with the shared adult settings (or a child's own start), then apply overrides.
const onLung = (k, s) => p.evaluate(([k, s]) => {
  if (!FREE_LUNGS[k].peds) { setFreeLung('normal'); applyFreeStart(FREE_ADULT_START); }
  setFreeLung(k);
  if (s) { if (s.bt) breathType = s.bt; if (s.mode) ventMode = s.mode;
    for (const x of Object.keys(s)) if (vals[x]) vals[x].v = s[x]; enforceITLimit(); Object.keys(vals).forEach(updateKnob); updateUI(); }
  renderMissionCard();
  const g = {}; tlAssess().forEach(i => { g[i.k] = i.status; });
  const chips = [...document.querySelectorAll('.tl-chip')].map(c => c.dataset.status);
  const why = [...document.querySelectorAll('.tl-why-i')].map(w => ({ cls: w.className, t: w.textContent }));
  return { g, chips, why, ok: !!document.querySelector('.tl-why.ok') };
}, [k, s || null]);
const reds = r => Object.keys(r.g).filter(k => r.g[k] === 'bad');
const ambers = r => Object.keys(r.g).filter(k => r.g[k] === 'warn');

console.log('\nC1 a healthy lung on healthy settings is all green');
{ const r = await onLung('normal');
  ok('C1 normal lung, adult start: no amber, no red', !reds(r).length && !ambers(r).length && r.ok, JSON.stringify(r.g)); }

console.log('\nC2 ARDS is not green on healthy-lung settings');
{ const r = await onLung('ards');
  ok('C2 driving pressure 20 is red (keep ≤ 15)', r.g.dp === 'bad', JSON.stringify(r.g));
  ok('C2 7.1 mL/kg is amber (ATS allows 4–8; ARDSnet aims for 6)', r.g.vt === 'warn');
  ok('C2 the card says why, worst first, with a source', r.why.length >= 2 && /bad/.test(r.why[0].cls) && /Amato 2015/.test(r.why[0].t) && /ARDSNet 2000/.test(r.why.map(w => w.t).join(' ')));
  ok('C2 and says how big a breath keeps it ≤ 15 on this lung (15 × 25 = 375 mL)', /375 mL \(5\.4 mL\/kg\) or less/.test(r.why[0].t), r.why[0].t);
  // ARDSnet at 6 mL/kg is not enough on a lung this stiff: driving pressure 420 ÷ 25 ≈ 17
  const six = await onLung('ards', { vt: 420, rate: 22, it: 0.8, peep: 8 });
  ok('C2 6 mL/kg on this stiff lung still leaves driving pressure 17 → red', six.g.dp === 'bad' && six.g.vt === 'good', JSON.stringify(six.g));
  // Lower toward 5 mL/kg (ARDSnet allows 4–6), rate up to hold minute volume, PEEP from the table
  const fixed = await onLung('ards', { vt: 370, rate: 26, it: 0.7, peep: 8 });
  ok('C2 370 mL (5.3 mL/kg), rate 26, PEEP 8 at FiO₂ 40% → no red, no amber', !reds(fixed).length && !ambers(fixed).length, JSON.stringify(fixed.g)); }

console.log('\nC3 PEEP follows the ARDSnet table for the FiO₂');
{ for (const [fio2, peep, want] of [[60, 5, 'bad'], [60, 10, 'good'], [100, 10, 'bad'], [100, 18, 'good'], [40, 5, 'good'], [40, 20, 'warn']]) {
    const r = await onLung('ards', { fio2, peep, vt: 420, rate: 20 });
    ok(`C3 ARDS, FiO₂ ${fio2}%, PEEP ${peep} → ${want}`, r.g.peep === want, r.g.peep);
  }
  const k = await onLung('pedArds', { peep: 8 });
  ok('C3 pediatric ARDS at FiO₂ 60% with PEEP 8 is red (below the table; Khemani 2018)', k.g.peep === 'bad', k.g.peep); }

console.log('\nC4 obstructive lungs want a long exhale, high flow and a low minute volume');
{ const c = await onLung('copd');
  ok('C4 COPD on the adult start: I:E 1:3.3 and 40 L/min are amber', c.g.ie === 'warn' && c.g.pf === 'warn', JSON.stringify(c.g));
  const hiFlow = await onLung('copd', { rate: 10, it: 0.6 });
  ok('C4 high flow raises the peak to the 40 limit → PIP red (raise the limit too)', hiFlow.g.pip === 'bad', JSON.stringify(hiFlow.g));
  const fixed = await onLung('copd', { rate: 10, it: 0.6, hipres: 55 });
  ok('C4 rate 10, Ti 0.6 s (I:E ≥ 1:4, flow ≥ 60), limit 55 → green', fixed.g.ie === 'good' && fixed.g.pf === 'good' && !reds(fixed).length && !ambers(fixed).length, JSON.stringify(fixed.g));
  const fast = await onLung('copd', { rate: 26, it: 0.6, hipres: 55 });
  ok('C4 rate 26 (13 L/min) → minute volume red: trapping grows with it', fast.g.mv === 'bad', JSON.stringify(fast.g));
  const inv = await onLung('copd', { rate: 20, it: 1.5 });
  ok('C4 I:E worse than 1:3 is red', inv.g.ie === 'bad', JSON.stringify(inv.g));
  const a = await onLung('asthma');
  ok('C4 asthma on the adult start: peak is at the High Pressure limit → red', a.g.pip === 'bad', JSON.stringify(a.g));
  const a2 = await onLung('asthma', { rate: 10, it: 0.6, hipres: 80, vt: 700, peep: 10 });
  ok('C4 asthma plateau over 25 is amber (aim < 25–30)', a2.g.pplat === 'warn', JSON.stringify(a2.g)); }

console.log('\nC5 the numbers are recomputed here, not trusted');
{ const r = await p.evaluate(() => { setFreeLung('normal'); applyFreeStart(FREE_ADULT_START); setFreeLung('ards'); vals.vt.v = 450; vals.peep.v = 8; updateUI();
    const m = {}; tlAssess().forEach(i => { m[i.k] = i.text; }); return { m, C: lung.compliance, a: effectiveAutoPEEP() }; });
  const dp = 450 / r.C, pplat = 8 + r.a + dp;
  ok('C5 driving pressure = Vt ÷ compliance (450 ÷ 25 = 18)', +r.m.dp === Math.round(dp), r.m.dp);
  ok('C5 plateau = PEEP + auto-PEEP + Vt ÷ C', Math.abs(+r.m.pplat - pplat) <= 0.5, r.m.pplat + ' vs ' + pplat);
  ok('C5 Vt per kg uses 70 kg PBW for the adult test lung (450 ÷ 70 = 6.4)', /^6\.4 mL\/kg/.test(r.m.vt) && await p.evaluate(() => /70 kg PBW/.test(document.querySelector('.tl-mech').textContent)), r.m.vt); }

console.log('\nC6 children are graded per kilogram, against PALICC-2');
{ for (const k of ['pedNormal', 'pedArds', 'pedAsthma', 'pedBronch']) {
    const r = await onLung(k);
    ok(`C6 ${k}: its own starting settings are all inside its targets`, !reds(r).length && !ambers(r).length, JSON.stringify(r.g));
  }
  const big = await onLung('pedNormal', { vt: 250 });
  ok('C6 12.5 mL/kg on a 20 kg child is red', big.g.vt === 'bad');
  const pa = await onLung('pedArds', { vt: 140 });
  ok('C6 pediatric ARDS at 7 mL/kg is amber (3–6 with poor compliance)', pa.g.vt === 'warn', pa.g.vt);
  const pp = await onLung('pedArds', { vt: 200 });
  ok('C6 and its plateau over 28 is red', pp.g.pplat === 'bad', pp.g.pplat); }

console.log('\nC7 every flag explains itself');
{ let missing = [];
  for (const k of Object.keys(await p.evaluate(() => FREE_LUNGS))) {
    const r = await onLung(k, { rate: 30, vt: 700, it: 1.5, peep: 0 });   // deliberately bad everywhere
    if (r.why.length !== Object.values(r.g).filter(s => s === 'bad' || s === 'warn').length) missing.push(k + ' count');
    r.why.forEach(w => { if (!/ — .{10,}/.test(w.t)) missing.push(k + ': ' + w.t.slice(0, 30)); });
  }
  ok('C7 one line per flagged reading, each with a reason and a source', missing.length === 0, missing.join(' | '));
  ok('C7 the colour key is on the card', await p.evaluate(() => /outside the evidence-based range/.test(document.querySelector('.tl-legend').textContent))); }

console.log('\nC8 spontaneous modes are not graded, and say so');
{ const r = await onLung('copd', { mode: 'cpap', ps: 10 });
  ok('C8 CPAP: every chip neutral', r.chips.every(s => s === 'neutral'), r.chips.join(','));
  ok('C8 and the card says why', r.ok && /Spontaneous mode/.test(await p.evaluate(() => document.querySelector('.tl-why').textContent))); }

console.log('\nC9 pressure control is graded too');
{ const r = await onLung('ards', { bt: 'pressure', pc: 22, peep: 8 });
  ok('C9 ARDS, PC 22 above PEEP 8: driving pressure 22 is red, and Vt 7.9 mL/kg is amber', r.g.dp === 'bad' && r.g.vt === 'warn', JSON.stringify(r.g));
  const g = await onLung('ards', { bt: 'pressure', pc: 14, peep: 8, rate: 22 });
  ok('C9 PC 14 (Vt 5 mL/kg, driving pressure 14) → no red', !reds(g).length, JSON.stringify(g.g)); }

console.log('\nS10 goals that teach a limit on the patient grade the patient');
{ // Independent pH: Henderson–Hasselbalch on the PaCO₂ the page settles at, with acute
  // buffering of +1 mmol/L HCO₃⁻ per 10 mmHg above 40 (the textbook rule of thumb).
  const sweep = (l, i, grid) => p.evaluate(([l, i, grid]) => {
    const sc = SCENARIO_LEVELS[l][i]; loadScenario(sc); const s0 = Object.assign({}, sc.setup);
    return grid.map(g => { for (const k of Object.keys(s0)) if (vals[k]) vals[k].v = s0[k];
      for (const k of Object.keys(g)) vals[k].v = g[k]; enforceITLimit();
      const d = calcPplat(); return { g, ie: ieExpRatio(), pplat: d ? d.pplat : null, paco2: settledFor(sc).paco2,
        hco3: (sc.patient.vit.hco3 || 24), pass: !!sc.goal.check() }; });
  }, [l, i, grid]);
  const pH = r => { const h = r.hco3 + (r.paco2 >= 40 ? 0.1 : 0.2) * (r.paco2 - 40); return 6.1 + Math.log10(h / (0.03 * r.paco2)); };
  const grid = []; for (const rate of [8, 10, 12, 14, 15, 16, 18, 20, 22]) for (const it of [0.5, 0.6, 0.65, 0.8, 1.0]) grid.push({ rate, it });
  const copd = await sweep(2, 2, grid);
  const cw = copd.filter(r => r.pass !== (r.ie >= 3.95 && pH(r) >= 7.195));
  ok('S10 COPD passes exactly where I:E ≥ 1:4 and the pH settles ≥ 7.20 (recomputed)', cw.length === 0 && copd.some(r => r.pass), JSON.stringify(cw.slice(0, 3)));
  const c10 = copd.find(r => r.g.rate === 10 && r.g.it === 0.8), c15 = copd.find(r => r.g.rate === 15 && r.g.it === 0.65);
  ok('S10 COPD rate 10 (the old pass) opens the I:E but drops pH to ≈ 7.1, and now fails', c10.ie >= 4 && pH(c10) < 7.15 && !c10.pass, pH(c10).toFixed(2));
  ok('S10 COPD rate 15, Ti 0.65 passes', c15.pass, pH(c15).toFixed(2));
  const ag = []; for (const rate of [8, 10, 12, 14, 16, 18, 20, 22]) for (const it of [0.5, 0.6, 0.8, 1.0]) for (const vt of [450, 500, 550, 600]) ag.push({ rate, it, vt });
  const asth = await sweep(3, 1, ag);
  const aw = asth.filter(r => r.pass !== (r.ie >= 2.95 && r.pplat <= 30 && pH(r) >= 7.145));
  ok('S10 asthma passes exactly where I:E ≥ 1:3, plateau ≤ 30 and the pH settles ≥ 7.15 (recomputed)', aw.length === 0 && asth.some(r => r.pass), JSON.stringify(aw.slice(0, 3)));
  const a12 = asth.find(r => r.g.rate === 12 && r.g.it === 0.8 && r.g.vt === 450);
  ok('S10 asthma rate 12 at 450 mL (the old pass) leaves pH ≈ 7.0 and now fails', !a12.pass && pH(a12) < 7.05, pH(a12).toFixed(2));
  ok('S10 a slowed rate still passes there: some answers at rate ≤ 18 and minute volume < 10 L/min',
     asth.some(r => r.pass && r.g.rate <= 18 && r.g.rate * r.g.vt / 1000 < 10));
  const t = await p.evaluate(() => ({ copd: SCENARIO_LEVELS[2][2].goal.text, asth: SCENARIO_LEVELS[3][1].goal.text, red: SCENARIO_LEVELS[3][1].patient.vit.phRed, freeRed: VITAL_LUNG.asthma.phRed }));
  ok('S10 the goals state their floors (COPD pH ≥ 7.20, asthma pH ≥ 7.15)', /pH stays ≥ 7\.20/.test(t.copd) && /pH ≥ 7\.15/.test(t.asth), JSON.stringify(t));
  ok('S10 the asthma floor is the panel\'s red line for that patient', t.red === 7.15 && t.freeRed === 7.15, JSON.stringify(t)); }

console.log('\nS11 the diagnosis cannot be won by a cue');
{ const q = await p.evaluate(() => {
    const all = [].concat(...[1, 2, 3, 7].map(l => l === 1 ? STAGE_DEFS : SCENARIO_LEVELS[l])).concat(Object.values(ACADEMY_SCENARIOS));
    return all.map(sc => ({ name: sc.name, c: sc.diagnose.correct, L: sc.diagnose.choices.map(x => x.replace(/<[^>]+>/g, '').length), n: new Set(sc.diagnose.choices).size }));
  });
  const strict = q.filter(x => { const s = [...x.L].sort((a, b) => b - a); return x.L[x.c] === s[0] && s[0] > s[1]; });
  ok(`S11 the right answer is the longest choice in at most a third of the ${q.length} diagnoses`, q.length === 24 && strict.length <= q.length / 3, strict.length + ': ' + strict.map(x => x.name).join(', '));
  const ratio = q.map(x => { const d = x.L.filter((_, i) => i !== x.c); return x.L[x.c] / (d.reduce((a, b) => a + b) / d.length); });
  const mean = ratio.reduce((a, b) => a + b) / ratio.length;
  ok('S11 on average the right answer is as long as the wrong ones (ratio 0.85–1.15)', mean >= 0.85 && mean <= 1.15, mean.toFixed(2));
  ok('S11 and never much longer (no question over 1.4×)', Math.max(...ratio) <= 1.4, Math.max(...ratio).toFixed(2));
  ok('S11 every diagnosis has four different choices', q.every(x => x.L.length === 4 && x.n === 4));
  const r = await p.evaluate(() => {
    deviceState = 'run'; gameLevel = 2; scenarioIdx = 0; loadScenario(SCENARIO_LEVELS[2][0]);
    document.getElementById('intro-overlay').classList.remove('open');
    const d = curScenario().diagnose, slots = [0, 0, 0, 0];
    for (let k = 0; k < 60; k++) { openDiagnose(); const b = [...document.querySelectorAll('.quiz-btn')];
      slots[b.findIndex(x => +x.dataset.choice === d.correct)]++; }
    openDiagnose(); let b = [...document.querySelectorAll('.quiz-btn')];
    const shownText = b.map(x => x.textContent).sort().join('|') === [...d.choices].sort().join('|');
    const wrongBtn = b.find(x => +x.dataset.choice !== d.correct); wrongBtn.click();
    const afterWrong = { diagnosed: scenarioDiagnosed, marked: b.find(x => x.classList.contains('correct')).textContent === d.choices[d.correct] };
    openDiagnose(); b = [...document.querySelectorAll('.quiz-btn')];
    b.find(x => x.textContent === d.choices[d.correct]).click();
    const diagnosed = scenarioDiagnosed; closeQuiz();
    return { slots, shownText, afterWrong, diagnosed };
  });
  ok('S11 on screen the right answer lands in every one of the four slots (60 opens)', r.slots.every(n => n > 0), r.slots.join('/'));
  ok('S11 the shuffled buttons show exactly the case\'s four choices', r.shownText);
  ok('S11 a wrong pick is graded wrong, and the right choice is the one marked', !r.afterWrong.diagnosed && r.afterWrong.marked, JSON.stringify(r.afterWrong));
  ok('S11 picking the right choice, wherever it lands, diagnoses the case', r.diagnosed); }

ok('S8 no page errors', errs.length === 0, errs.join(' | '));
console.log(`\n==== ${pass} passed, ${fail} failed ====`);
if (fails.length) console.log('FAILURES:\n - ' + fails.join('\n - '));
await browser.close(); srv.close();
process.exit(fail ? 1 : 0);
