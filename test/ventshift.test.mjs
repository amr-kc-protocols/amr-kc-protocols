/*
 * Ventilator Simulator 3000 — Shift mode
 * --------------------------------------
 * vent-ltv1200.html, in headless Chromium. A shift deals five cases from
 * Levels 2, 3 and Troubleshooting, each with a new patient (sex and height,
 * so a new predicted body weight; lungs ±15%; the starting tidal volume kept
 * at its mL/kg; CO₂ production scaled by weight^0.75), graded like Level 3
 * against a per-case clock. A random patient is only worth having if every
 * one it can produce is a fair case, so most of this suite checks variants:
 *
 *   H1  fair: across 30 seeds, no variant of any of the 15 cases is solved by
 *       its own starting settings, and every one can be solved
 *   H2  the goal means the same thing for the new patient: the Vt cap is
 *       8 mL/kg of this patient's PBW (Devine/ARDSNet formula, recomputed
 *       here); herniation still lands the PaCO₂ near 30–35; the septic PaCO₂
 *       is still 20–28; the Rising CO₂ target still clears the CO₂
 *   H3  the story matches the patient: a PBW chip with the weight, height and
 *       sex; every number the change moves (the starting minute volume, the
 *       Vt cap, the height) is rewritten; the "he/his" cases stay male; the
 *       two cases that quote exact pressures keep their patient
 *   H4  the shift: five different cases, the same seed gives the same shift,
 *       graded like Level 3 (no live goal, no Show target), the clock waits
 *       for the intro, runs during the case and stops when it is passed; out
 *       of time ends the case with a debrief and no points; the results show
 *       the score and the time, and the best is kept on the chooser; ?level=8
 *       starts a shift
 *   H5  untimed: the clock can be switched off (it is a real toggle, and the
 *       choice is remembered), and then nothing runs out
 *   H6  on a phone the clock is on screen, never takes a tap, and sits above
 *       the knob dock rather than on it
 *   H7  no page errors
 *
 * Run:  cd test && node ventshift.test.mjs
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
    r.writeHead(200, { 'Content-Type': MIME[extname(u)] || 'application/octet-stream' }); r.end(d); }
  catch { r.writeHead(404); r.end(); }
});
await new Promise(res => srv.listen(0, res));
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

const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, serviceWorkers: 'block' });
const errs = [];
const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e)));
await p.goto(ORIGIN + '/vent-ltv1200.html');
await p.waitForFunction(() => typeof makeVariant === 'function' && typeof startShift === 'function');

// The knobs each goal reads, and the search grid (only what a crew could plausibly dial)
const SEARCH = {
  G: { rate: [6, 40, 1], vt: [250, 750, 10], it: [0.4, 1.6, 0.1], peep: [0, 20, 1], fio2: [21, 100, 1], ps: [0, 20, 1], lowpres: [0, 40, 1], lowmv: [0, 20, 0.5] },
  KN: { 'The Rising CO₂': ['rate', 'vt'], 'Hypoxemia That Won\'t Budge': ['peep'], 'COPD — Stop the Air-Trapping': ['rate', 'it'], 'Fighting the Vent': ['it'],
    'The Compensating Septic Patient': ['rate', 'vt'], 'Ready to Come Down': ['ps', 'peep', '@cpap'], 'The Swinging Peak Pressure': ['rate', 'it', 'vt'],
    'Losing the Oxygenation Battle': ['peep', 'fio2'], 'The Blown Pupil': ['rate', 'vt'], 'Nothing Is Going In': ['lowpres', 'lowmv'],
    'The Pressure and the Pressure': ['!hold'], 'Four Seconds to the Cot': ['fio2'],
    'The Over-Ventilated Head Injury': ['rate', 'vt'], 'The Pressure Drop on the Vent': ['peep'],
    'The Right Heart Under Pressure': ['rate', 'vt', 'peep=5', 'fio2=100'] }
};

console.log('\nH1 every variant is a fair case');
{ const r = await p.evaluate(({ G, KN }) => {
    const range = k => { const [a, z, s] = G[k], o = []; for (let v = a; v <= z + 1e-9; v += s) o.push(Math.round(v * 10) / 10); return o; };
    const bad = [], names = new Set(), kgs = [];
    gameLevel = 8;
    for (let seed = 1; seed <= 30; seed++) {
      const rng = rngFrom(seed);
      for (const base of shiftPool()) {
        const v = makeVariant(base, rng); names.add(v.name); kgs.push(v.kg);
        SCENARIO_LEVELS[8] = [v]; scenarioIdx = 0; loadScenario(v);
        const s0 = Object.assign({}, v.setup);
        const reset = () => { ventMode = s0.mode; breathType = s0.bt; for (const k of Object.keys(s0)) if (vals[k]) vals[k].v = s0[k]; inspHoldSinceLoad = false; enforceITLimit(); };
        reset(); const startPass = !!v.goal.check();
        const kn = KN[v.name] || [], knobs = kn.filter(k => G[k]), flags = kn.filter(k => !G[k]), grids = knobs.map(range);
        let found = false; const N = grids.reduce((a, g) => a * g.length, 1);
        for (let n = 0; n < N && !found; n++) {
          reset(); for (const f of flags) { if (f[0] === '@') { ventMode = f.slice(1); breathType = 'pressure'; } if (f === '!hold') inspHoldSinceLoad = true;
            if (f.includes('=')) { const [k, x] = f.split('='); vals[k].v = +x; } }
          let q = n; knobs.forEach((k, j) => { vals[k].v = grids[j][q % grids[j].length]; q = Math.floor(q / grids[j].length); }); enforceITLimit();
          found = !!v.goal.check();
        }
        if (startPass || !found || !KN[v.name]) bad.push(seed + ' ' + v.name + (startPass ? ' starts solved' : '') + (!found ? ' unsolvable' : ''));
      }
    }
    return { bad, n: names.size, lo: Math.min(...kgs), hi: Math.max(...kgs) };
  }, SEARCH);
  ok('H1 the pool is the 15 cases of Levels 2, 3 and Troubleshooting', r.n === 15, r.n);
  ok('H1 across 30 seeds no variant starts solved, and every one can be solved', r.bad.length === 0, r.bad.slice(0, 5).join(' | '));
  ok(`H1 the patients really differ: PBW ${r.lo}–${r.hi} kg`, r.lo <= 56 && r.hi >= 80); }

console.log('\nH2 the goal means the same thing for the new patient');
{ const r = await p.evaluate(() => {
    const pbw = (sex, cm) => (sex === 'M' ? 50 : 45.5) + 0.91 * (cm - 152.4);     // Devine / ARDSNet, recomputed here
    const out = { pbwBad: [], capBad: [], hern: [], sepBad: [], co2: [] };
    gameLevel = 8;
    for (let seed = 1; seed <= 20; seed++) {
      const rng = rngFrom(seed);
      for (const base of shiftPool()) {
        const v = makeVariant(base, rng); if (!v.sex) continue;
        if (Math.abs(v.kg - pbw(v.sex, v.cm)) > 0.51) out.pbwBad.push(v.name + ' ' + v.kg);
        SCENARIO_LEVELS[8] = [v]; scenarioIdx = 0; loadScenario(v);
        if (v.name === 'The Rising CO₂') {
          // the lowest passing rate at 6.5 mL/kg clears the CO₂ to a normal range; 8 mL/kg + 10 mL fails
          vals.vt.v = Math.round(6.5 * v.kg / 10) * 10; let hit = null;
          for (let rate = 8; rate <= 40 && !hit; rate++) { vals.rate.v = rate; enforceITLimit(); if (v.goal.check()) hit = settledFor(v).paco2; }
          out.co2.push(hit);
          vals.vt.v = Math.ceil(8 * v.kg / 10) * 10 + 10; vals.rate.v = Math.round(8.5 * Math.pow(v.kg / 70, 0.75) * 1000 / vals.vt.v); enforceITLimit();
          if (v.goal.check()) out.capBad.push(seed + ' Vt ' + vals.vt.v + ' for ' + v.kg + ' kg passed');
        }
        if (v.name === 'The Blown Pupil') {
          for (let rate = 10; rate <= 30; rate++) for (let vt = Math.round(5.8 * v.kg / 10) * 10; vt <= 8.5 * v.kg; vt += 20) {
            vals.rate.v = rate; vals.vt.v = vt; enforceITLimit(); if (v.goal.check()) out.hern.push(settledFor(v).paco2); }
        }
        if (v.name === 'The Compensating Septic Patient') {
          for (let rate = 20; rate <= 44; rate += 2) { vals.rate.v = rate; vals.vt.v = Math.round(6.5 * v.kg / 10) * 10; enforceITLimit();
            const pc = settledFor(v).paco2; if (!!v.goal.check() !== (pc >= 20 && pc <= 28.05)) out.sepBad.push(seed + ' rate ' + rate + ' PaCO₂ ' + pc.toFixed(1)); }
        }
      }
    }
    return out;
  });
  ok('H2 each patient\'s PBW is the Devine/ARDSNet value for their sex and height', r.pbwBad.length === 0, r.pbwBad.slice(0, 3).join(', '));
  ok('H2 the Rising CO₂ Vt cap is this patient\'s 8 mL/kg', r.capBad.length === 0, r.capBad.slice(0, 3).join(', '));
  const co2 = r.co2.filter(x => x != null);
  ok('H2 the Rising CO₂ target still clears the CO₂ (PaCO₂ 35–50 at the least that passes)', co2.length === r.co2.length && co2.every(x => x >= 35 && x <= 50), co2.map(x => x.toFixed(0)).join(','));
  const lo = Math.min(...r.hern), hi = Math.max(...r.hern);
  ok(`H2 herniation passes only where the PaCO₂ settles at 30–35 (passing range ${lo.toFixed(1)}–${hi.toFixed(1)})`, r.hern.length > 0 && lo >= 29.5 && hi <= 35.5);
  ok('H2 the septic goal still passes exactly where the PaCO₂ settles at 20–28', r.sepBad.length === 0, r.sepBad.slice(0, 3).join(', ')); }

console.log('\nH3 the story matches the patient');
{ const r = await p.evaluate(() => {
    const out = { chip: [], text: [], male: [], kept: [] };
    for (let seed = 1; seed <= 20; seed++) {
      const rng = rngFrom(seed);
      for (const base of shiftPool()) {
        const v = makeVariant(base, rng);
        if (VARY[base.name] && VARY[base.name].keep) {
          if (v.scenario !== base.scenario || v.confirm !== base.confirm || JSON.stringify(v.setup) !== JSON.stringify(base.setup)) out.kept.push(v.name);
          continue;
        }
        const chip = v.vitals.find(x => x.k === 'PBW');
        if (!chip || chip.v.indexOf(v.kg + ' kg') !== 0 || chip.v.indexOf(v.cm + ' cm') < 0) out.chip.push(v.name);
        const mv = (v.setup.rate * v.setup.vt / 1000).toFixed(1), all = [v.intro, v.scenario, v.goal.text, v.goal.aim || '', v.confirm].join(' ');
        if (v.name === 'The Rising CO₂' && (all.indexOf('only ' + mv + ' L/min') < 0 || all.indexOf(v.cm + ' cm tall') < 0 || all.indexOf('≤ ~' + Math.round(8 * v.kg / 10) * 10 + ' mL for ' + v.kg + ' kg') < 0)) out.text.push(seed + ' Rising CO₂');
        if (v.name === 'The Compensating Septic Patient' && (all.indexOf('MV is only ' + mv + ' L/min') < 0 || all.indexOf(Math.round(8 * v.kg / 10) * 10 + ' mL') < 0)) out.text.push(seed + ' Septic');
        if (v.name === 'The Blown Pupil' && all.indexOf('on ' + mv + ' L/min') < 0) out.text.push(seed + ' Pupil');
        if (v.name === 'The Right Heart Under Pressure') {
          const pp = Math.round(v.setup.peep + v.setup.vt / v.lung.compliance), chipPp = (v.vitals.find(x => x.k === 'Pplat') || {}).v;
          if (all.indexOf('Vt ' + v.setup.vt + ' (10 mL/kg)') < 0 || all.indexOf('the plateau ' + pp) < 0 || chipPp !== pp + ' cmH₂O') out.text.push(seed + ' PE');
        }
        if ((v.kg !== 70 && /\b70 kg\b/.test(all)) || (v.cm !== 178 && /178 cm/.test(all))) out.text.push(seed + ' ' + v.name + ' still says 70 kg / 178 cm');
        if ((v.name === 'The Rising CO₂' || v.name === 'COPD — Stop the Air-Trapping') && v.sex !== 'M') out.male.push(v.name);
      }
    }
    return out;
  });
  ok('H3 every varied case shows a PBW chip with this patient\'s weight and height', r.chip.length === 0, r.chip.slice(0, 3).join(', '));
  ok('H3 the numbers the change moves are rewritten (minute volume, Vt cap, height)', r.text.length === 0, r.text.slice(0, 4).join(' | '));
  ok('H3 the cases whose story says "he"/"his" stay male', r.male.length === 0, r.male.join(', '));
  ok('H3 the two cases that quote exact pressures keep their patient and story', r.kept.length === 0, r.kept.join(', ')); }

console.log('\nH4 the shift');
{ const r = await p.evaluate(() => {
    try { localStorage.removeItem(PROGRESS_KEY); localStorage.removeItem('ltv1200_shift_clock'); } catch (_) {}
    startShift(7); const a = SCENARIO_LEVELS[8].map(v => v.name);
    startShift(7); const b = SCENARIO_LEVELS[8].map(v => v.name), kgB = SCENARIO_LEVELS[8].map(v => v.kg);
    startShift(8); const c = SCENARIO_LEVELS[8].map(v => v.name);
    const pool = shiftPool().map(s => s.name);
    return { a, b, c, kgB, distinct: new Set(a).size, inPool: a.every(n => pool.includes(n)),
             kicker: document.querySelector('.intro-kicker').textContent, badge: document.querySelector('.intro-badge').textContent, assess: assessMode() };
  });
  ok('H4 a shift is five different cases from the pool', r.a.length === 5 && r.distinct === 5 && r.inPool, r.a.join(', '));
  ok('H4 the same seed deals the same shift; another seed, another', JSON.stringify(r.a) === JSON.stringify(r.b) && JSON.stringify(r.a) !== JSON.stringify(r.c));
  ok('H4 the intro says it is a shift, case 1 of 5', /Shift/.test(r.kicker) && /Case 1 of 5/.test(r.badge), r.kicker + ' | ' + r.badge);
  ok('H4 graded like Level 3', r.assess === true);
  // the clock waits for the intro
  await p.waitForTimeout(1200);
  let c = await p.evaluate(() => ({ left: shift.left, txt: document.getElementById('shift-clock').textContent, show: document.getElementById('shift-clock').classList.contains('show') }));
  ok('H4 the clock shows 3:00 and does not run while the intro is up', c.show && c.left === 180000 && /3:00/.test(c.txt), JSON.stringify(c));
  await p.evaluate(() => beginScenario()); await p.waitForTimeout(1300);
  c = await p.evaluate(() => ({ left: shift.left, txt: document.getElementById('shift-clock').textContent }));
  ok('H4 it runs once the case starts', c.left < 179500 && c.left > 176000 && /2:5\d/.test(c.txt), JSON.stringify(c));
  // graded: no live goal, no Show target, no goal-met button
  const g = await p.evaluate(() => { scenarioDiagnosed = true; renderMissionCard();
    return { submit: /SUBMIT FOR ASSESSMENT/.test(document.getElementById('mission-bar').textContent), reveal: !!document.querySelector('.show-target'), readout: !!document.querySelector('#mission-bar .scen-readout') }; });
  ok('H4 the case is submitted for grading — no live readout and no Show target', g.submit && !g.reveal && !g.readout, JSON.stringify(g));
  // out of time
  await p.evaluate(() => { shift.left = 200; }); await p.waitForTimeout(700);
  const t = await p.evaluate(() => ({ verdict: (document.querySelector('#quiz-inner .assess-verdict') || {}).textContent, needed: !!document.querySelector('#quiz-inner .assess-hint'),
    stat: Object.assign({}, caseStat()), cont: document.getElementById('quiz-continue').textContent, done: shift.caseDone }));
  ok('H4 out of time ends the case with a debrief of what it needed', /OUT OF TIME/.test(t.verdict) && t.needed && /Next case/.test(t.cont), JSON.stringify(t));
  ok('H4 …and it scores nothing', t.stat.timeUp && t.stat.set === false && t.stat.dx === false, JSON.stringify(t.stat));
  // a passed case stops the clock
  const s = await p.evaluate(async () => {
    advanceStage(); beginScenario();
    const sc = curScenario(); scenarioDiagnosed = true;
    // dial a passing answer by search over the case's own goal (whatever was dealt)
    const s0 = Object.assign({}, sc.setup), knobs = ['rate', 'vt', 'it', 'peep', 'fio2', 'ps', 'lowpres', 'lowmv'];
    let passed = false;
    if (sc.name === 'The Pressure and the Pressure') { inspHoldSinceLoad = true; passed = !!sc.goal.check(); }
    for (let i = 0; i < 4000 && !passed; i++) {
      const k1 = knobs[i % 8], k2 = knobs[Math.floor(i / 8) % 8];
      ventMode = s0.mode; breathType = s0.bt; for (const k of Object.keys(s0)) if (vals[k]) vals[k].v = s0[k];
      if (sc.name === 'Ready to Come Down') { ventMode = 'cpap'; breathType = 'pressure'; }
      const pick = k => { const c = vals[k]; return Math.round((c.min + Math.random() * (Math.min(c.max, k === 'vt' ? 800 : k === 'rate' ? 40 : c.max) - c.min)) / c.step) * c.step; };
      vals[k1].v = pick(k1); vals[k2].v = pick(k2); enforceITLimit(); passed = !!sc.goal.check();
    }
    updateUI(); submitAssessment();
    const left0 = shift.left; await new Promise(r => setTimeout(r, 900));
    return { passed, done: shift.caseDone, stopped: shift.left === left0, stat: Object.assign({}, caseStat()) };
  });
  ok('H4 a passed case scores its settings point and stops the clock', s.passed && s.done && s.stopped && s.stat.set === true, JSON.stringify(s));
  // finish the shift
  const f = await p.evaluate(() => {
    advanceStage();
    while (!gameDone()) { document.getElementById('intro-overlay').classList.remove('open'); const d = curScenario().diagnose; openDiagnose(); submitDiagnose(d.correct); closeQuiz(); submitAssessment(); advanceStage(); }
    const vc = document.querySelector('#victory-card').innerText; closeVictory();
    const card = document.getElementById('mission-bar').innerText;
    openLevelSelect(); const chip = (document.querySelector('.lvl-card[data-level="8"] .lvl-done') || {}).textContent || '';
    return { vc, card, chip, best: loadProgress().best && loadProgress().best[8] };
  });
  ok('H4 the results show the score and the time on the clock', /Score: \d+\/10/.test(f.vc) && /Time on the clock: \d+:\d\d of 15:00/.test(f.vc) && /Another shift/.test(f.vc), f.vc.replace(/\n/g, ' | '));
  ok('H4 the complete card shows them too, with Another shift', /Score: \d+\/10/.test(f.card) && /Another shift/i.test(f.card), f.card.replace(/\n/g, ' | ').slice(0, 200));
  ok('H4 the best is kept and shown on the chooser', f.best && f.best.max === 10 && /best \d+\/10/.test(f.chip), f.chip);
  const dl = await ctx.newPage(); dl.on('pageerror', e => errs.push(String(e)));
  await dl.goto(ORIGIN + '/vent-ltv1200.html?level=8'); await dl.waitForFunction(() => typeof startShift === 'function');
  ok('H4 ?level=8 starts a shift', await dl.evaluate(() => gameLevel === 8 && SCENARIO_LEVELS[8].length === 5 && deviceRunning()));
  await dl.close(); }

console.log('\nH5 untimed');
{ const r = await p.evaluate(async () => {
    const b = document.getElementById('shift-clock-toggle'), before = b.getAttribute('aria-pressed');
    b.click(); const after = b.getAttribute('aria-pressed'), txt = b.textContent, stored = localStorage.getItem('ltv1200_shift_clock');
    startShift(3); beginScenario(); shift.left = 100; await new Promise(r => setTimeout(r, 800));
    const res = { before, after, txt, stored, clock: shift.clock, shown: document.getElementById('shift-clock').classList.contains('show'),
                  timeUp: caseStat().timeUp, quiz: document.getElementById('quiz-overlay').classList.contains('open') };
    toggleShiftClock(); return res;
  });
  ok('H5 the clock toggle is a real toggle button and remembers the choice', r.before === 'true' && r.after === 'false' && r.stored === 'off' && /off/.test(r.txt), JSON.stringify(r));
  ok('H5 an untimed shift shows no clock and nothing runs out', r.clock === false && !r.shown && !r.timeUp && !r.quiz, JSON.stringify(r)); }

console.log('\nH6 the clock on a phone');
{ const pctx = await browser.newContext({ viewport: { width: 320, height: 560 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const q = await pctx.newPage(); q.on('pageerror', e => errs.push(String(e)));
  await q.goto(ORIGIN + '/vent-ltv1200.html?level=8'); await q.waitForFunction(() => typeof startShift === 'function');
  const r = await q.evaluate(async () => {
    startShift(5); beginScenario(); scenarioDiagnosed = true; renderMissionCard();
    window.scrollTo(0, 0); selectControl('rate'); renderDock(); await new Promise(r => setTimeout(r, 600));
    const c = document.getElementById('shift-clock'), d = document.getElementById('knob-dock');
    const cr = c.getBoundingClientRect(), dr = d.getBoundingClientRect();
    return { show: c.classList.contains('show'), dock: d.classList.contains('show'), cTop: cr.top, cBottom: cr.bottom, cLeft: cr.left, cRight: cr.right, dTop: dr.top,
             pe: getComputedStyle(c).pointerEvents, vw: innerWidth, vh: innerHeight, scrollW: document.documentElement.scrollWidth };
  });
  ok('H6 the clock is on screen', r.show && r.cTop >= 0 && r.cBottom <= r.vh && r.cLeft >= 0 && r.cRight <= r.vw, JSON.stringify(r));
  ok('H6 it never takes a tap', r.pe === 'none');
  ok('H6 with the knob dock up, the clock sits above it', !r.dock || r.cBottom <= r.dTop, JSON.stringify(r));
  ok('H6 no sideways scroll at 320 px', r.scrollW <= r.vw, r.scrollW);
  await pctx.close(); }

ok('H7 no page errors', errs.length === 0, errs.join(' | '));
console.log(`\n==== ${pass} passed, ${fail} failed ====`);
if (fails.length) console.log('FAILURES:\n - ' + fails.join('\n - '));
await browser.close(); srv.close();
process.exit(fail ? 1 : 0);
