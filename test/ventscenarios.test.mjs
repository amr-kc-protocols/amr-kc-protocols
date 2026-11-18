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
 *   S2  septic shock, compensating: minute ventilation must match the
 *       pre-intubation drive (≥ 12 L/min). The old 10 L/min pass let the
 *       PaCO₂ rise above the patient's own 28, where Winter's formula
 *       (1.5 × HCO₃⁻ + 8 ± 2) puts full compensation at about 21–26
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
 *   S9  scenarios now carry the lung their story describes: the capstone's
 *       plateau is 33 at 650 mL on PEEP 5, as it says, and every PEEP in its
 *       goal range can pass; "clean mechanics" means a healthy lung
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
  const good = await grade(N, { rate: 30, vt: 450 });            // 13.5 L/min
  const good2 = await grade(N, { rate: 32, vt: 500 });           // 16 L/min
  ok('S2 10.8 L/min no longer passes (would let PaCO₂ rise above the patient\'s own)', !old2.pass && !old.pass, JSON.stringify([old, old2]));
  ok('S2 matching the pre-intubation drive (13.5 and 16 L/min) passes', good.pass && good2.pass, JSON.stringify([good, good2]));
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
    ['COPD — Stop the Air-Trapping', { rate: 10, it: 0.8 }, true],     // I:E ≥ 1:4
    ['The Swinging Peak Pressure', { rate: 12, it: 0.8, vt: 450 }, true],
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

ok('S8 no page errors', errs.length === 0, errs.join(' | '));
console.log(`\n==== ${pass} passed, ${fail} failed ====`);
if (fails.length) console.log('FAILURES:\n - ' + fails.join('\n - '));
await browser.close(); srv.close();
process.exit(fail ? 1 : 0);
