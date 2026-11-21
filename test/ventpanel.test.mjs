/*
 * Ventilator Simulator 3000 — the panel and the game engine
 * ----------------------------------------------------------
 * vent-ltv1200.html, driven in headless Chromium. Each check here is a bug
 * that was found in the panel or the level engine and fixed, held so it
 * stays fixed:
 *
 *   P1  On/Standby: only a press that started on the key counts. Moving the
 *       mouse across it in Standby used to power the vent up, and a click
 *       followed by a mouse move ran the self-test twice. The key also works
 *       from the keyboard (tap to power on, hold 3 s to power off)
 *   P2  the 100% O₂ flush ends when a case, level or lung loads, or the vent
 *       powers off. It used to revert 20 s later onto the next case,
 *       overwriting its FiO₂ with the old case's. Turning O₂% during a flush
 *       ends it and keeps the dialled value
 *   P3  a flush never passes a goal: goals and the Free Play ARDSnet grade
 *       read the set FiO₂, not the temporary 100%
 *   P4  leaving an academy mission for a level leaves academy mode: the level
 *       gets its own back button, Level 3 is assessed, and finishing a level
 *       still shows the victory card and saves progress
 *   P5  a deep link to something that doesn't exist opens the level chooser
 *       instead of a live panel with no case
 *   P6  the teaching card's −/+ buttons obey Control Lock and Standby
 *   P7  the teaching card and the dock show a value as its window does: IPAP
 *       in NPPV, OFF for a zero alarm
 *   P8  the inspiratory-time cap honours both of its limits at every rate
 *       (I:E no more inverse than 4:1, at least 0.3 s to exhale), and the
 *       teaching card quotes the limit the panel enforces
 *   P9  every teaching card's range matches its dial, and the rate card does
 *       not call the NPPV apnea-backup rate inactive
 *   P10 Control Lock confirms a flashing mode preview instead of letting it
 *       commit later on a locked panel
 *   P11 the insp-hold card colours a driving pressure within target green
 *   P12 no page errors
 *   P13 on a phone, the goal turning green reaches the learner at the knob:
 *       GOAL MET in the scan window (announced), and a Confirm button on
 *       screen while the card's own Confirm is out of view — not before the
 *       diagnosis, not one click short, not in graded Level 3, above the knob
 *       dock rather than on it, and gone on the next case
 *
 * Run:  cd test && node ventpanel.test.mjs
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

const ctx = await browser.newContext({ viewport: { width: 1024, height: 900 }, serviceWorkers: 'block' });
const errs = [];
// A fresh page, with runPOST counted so a doubled self-test shows up.
async function open(q = '') {
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(ORIGIN + '/vent-ltv1200.html' + q);
  await p.waitForFunction(() => typeof startLevel === 'function' && typeof initGameEntry === 'function');
  await p.evaluate(() => { window.__post = 0; const o = runPOST; runPOST = function () { window.__post++; return o.apply(this, arguments); }; });
  return p;
}
const closeIntro = p => p.evaluate(() => document.getElementById('intro-overlay').classList.remove('open'));
async function standbyKey(p) {
  const b = await p.$('#btn-onstandby'); await b.scrollIntoViewIfNeeded();
  const bb = await b.boundingBox(); return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
}

console.log('\nP1 On/Standby');
{ const p = await open(); const k = await standbyKey(p);
  await p.mouse.move(k.x, k.y); await p.mouse.move(2, 2); await p.waitForTimeout(150);
  ok('P1 moving the mouse across the key in Standby does not power up', (await p.evaluate(() => __post + '|' + deviceState)) === '0|standby');
  await p.mouse.click(k.x, k.y); await p.mouse.move(2, 2); await p.waitForTimeout(150);
  ok('P1 a click powers up once, even when the mouse then moves off', (await p.evaluate(() => __post)) === 1);
  await p.evaluate(() => powerOnSequence(openLevelSelect)); await p.waitForTimeout(50);
  ok('P1 a second power-on during the self-test is ignored', (await p.evaluate(() => __post)) === 1);
  await p.close(); }
{ const p = await open(); await p.focus('#btn-onstandby'); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
  ok('P1 Enter on the focused key powers up', (await p.evaluate(() => __post)) === 1);
  await p.close(); }
{ const p = await open('?level=2'); await closeIntro(p);
  await p.focus('#btn-onstandby'); await p.keyboard.down('Enter'); await p.waitForTimeout(3300); await p.keyboard.up('Enter');
  ok('P1 holding Enter 3 s powers off', (await p.evaluate(() => deviceState)) === 'standby');
  await p.close(); }
{ const p = await open('?level=2'); await closeIntro(p); const k = await standbyKey(p);
  await p.mouse.move(k.x, k.y); await p.mouse.down(); await p.waitForTimeout(1000); await p.mouse.move(2, 2); await p.waitForTimeout(2500); await p.mouse.up();
  ok('P1 sliding off the key cancels a hold to power off', (await p.evaluate(() => deviceState)) === 'run');
  const k2 = await standbyKey(p);
  await p.mouse.move(k2.x, k2.y); await p.mouse.down(); await p.waitForTimeout(3300); await p.mouse.up();
  const k3 = await standbyKey(p); await p.mouse.move(k3.x, k3.y); await p.mouse.move(2, 2); await p.waitForTimeout(150);
  ok('P1 after a 3 s hold the vent stays off when the mouse moves away', (await p.evaluate(() => deviceState + '|' + __post)) === 'standby|0');
  await p.close(); }

console.log('\nP2 the O₂ flush ends with its case');
{ const p = await open('?level=2'); await closeIntro(p);
  const r = await p.evaluate(() => {
    o2Flush(); const during = vals.fio2.v;
    advanceStage();                          // L2 S1 (FiO₂ 50) → L2 S2 (FiO₂ 60)
    const loaded = vals.fio2.v, armed = !!_o2Timer, saved = _o2SavedFio2;
    revertO2();                              // what the old 20 s timer did
    return { during, loaded, armed, saved, afterLateRevert: vals.fio2.v, setup: curScenario().setup.fio2,
             badge: document.getElementById('o2-flush-badge').style.display };
  });
  ok('P2 the flush delivers 100%', r.during === 100, JSON.stringify(r));
  ok('P2 the next case loads its own FiO₂, with no flush left armed', r.loaded === r.setup && !r.armed && r.saved === null && r.badge === 'none', JSON.stringify(r));
  ok('P2 nothing from the old case can revert onto the new one', r.afterLateRevert === r.setup, JSON.stringify(r));
  const lv = await p.evaluate(() => { o2Flush(); startLevel(3); return { fio2: vals.fio2.v, armed: !!_o2Timer, setup: curScenario().setup.fio2 }; });
  ok('P2 starting a level ends a flush', lv.fio2 === lv.setup && !lv.armed, JSON.stringify(lv));
  const off = await p.evaluate(() => { vals.fio2.v = 45; updateKnob('fio2'); o2Flush(); shutdownDevice(); return { fio2: vals.fio2.v, armed: !!_o2Timer }; });
  ok('P2 powering off ends a flush and restores the set FiO₂', off.fio2 === 45 && !off.armed, JSON.stringify(off));
  await p.close(); }
{ const p = await open('?free');
  const r = await p.evaluate(() => {
    vals.fio2.v = 40; updateKnob('fio2'); o2Flush(); setFreeLung('pedNormal');
    const ped = { fio2: vals.fio2.v, armed: !!_o2Timer };
    setFreeLung('normal'); vals.fio2.v = 40; updateKnob('fio2'); o2Flush();
    selectControl('fio2'); knobTurn(-1);
    const turned = { fio2: vals.fio2.v, armed: !!_o2Timer, saved: _o2SavedFio2 };
    revertO2();
    return { ped, turned, kept: vals.fio2.v };
  });
  ok('P2 a pediatric lung loads its own FiO₂ over a flush', r.ped.fio2 === 40 && !r.ped.armed, JSON.stringify(r.ped));
  ok('P2 turning O₂% during a flush ends it at the dialled value', r.turned.fio2 === 99 && !r.turned.armed && r.turned.saved === null && r.kept === 99, JSON.stringify(r));
  await p.close(); }

console.log('\nP3 a flush never passes a goal');
{ const p = await open('?level=3'); await closeIntro(p);
  const r = await p.evaluate(() => {
    scenarioIdx = 2; loadScenario(SCENARIO_LEVELS[3][2]); document.getElementById('intro-overlay').classList.remove('open');
    vals.peep.v = 14; scenarioDiagnosed = true; updateUI();
    o2Flush(); const met = allTargetsMet(); submitAssessment();
    const txt = s => (document.querySelector(s) || {}).textContent || '';
    const verdict = txt('.assess-verdict'), readout = txt('.assess-current');
    closeQuiz(); revertO2(); vals.fio2.v = 90; updateUI(); o2Flush();
    return { met, verdict, readout, metWhenSet: allTargetsMet(), shownDuring: vals.fio2.v };
  });
  ok('P3 severe ARDS on FiO₂ 70 does not pass during a flush', r.met === false && /NOT YET/.test(r.verdict), JSON.stringify(r));
  ok('P3 the assessment reports the set FiO₂, not the flush', /FiO₂ 70%/.test(r.readout), r.readout);
  ok('P3 a set FiO₂ of 90 still passes, flush or not', r.metWhenSet === true, JSON.stringify(r));
  await p.close(); }
{ const p = await open('?scenario=niv-setup'); await closeIntro(p);
  const r = await p.evaluate(() => { setMode('cpap'); vals.peep.v = 12; scenarioDiagnosed = true; updateUI(); o2Flush(); updateUI();
    return { met: allTargetsMet(), cta: document.querySelector('#mission-bar .mission-cta').textContent }; });
  ok('P3 the CPAP mission is not passed by a flush on FiO₂ 40', r.met === false && !/GOAL REACHED/.test(r.cta), JSON.stringify(r));
  await p.close(); }
{ const p = await open('?free');
  const r = await p.evaluate(() => { setFreeLung('ards'); vals.fio2.v = 40; vals.peep.v = 5; updateUI(); o2Flush(); updateUI();
    return tlAssess().find(i => i.k === 'peep'); });
  ok('P3 the Free Play ARDSnet PEEP grade reads the set FiO₂ during a flush', r.status === 'good' && /FiO₂ 0\.4/.test(r.why), JSON.stringify(r));
  await p.close(); }

console.log('\nP4 academy mode ends when a level starts');
{ const p = await open('?scenario=agitation');
  const r = await p.evaluate(() => {
    openLevelSelect(); startLevel(3);
    const a = { academyMode, assess: assessMode(), back: document.querySelector('.scen-back-btn').getAttribute('onclick'),
                kicker: document.querySelector('.intro-kicker').textContent };
    try { localStorage.removeItem(PROGRESS_KEY); } catch (_) {}
    scenarioIdx = SCENARIO_LEVELS[3].length - 1; advanceStage();
    a.victory = document.getElementById('victory-overlay').classList.contains('show');
    a.saved = !!loadProgress().levels[3];
    closeVictory();
    return a;
  });
  ok('P4 the level is not in academy mode', r.academyMode === false, JSON.stringify(r));
  ok('P4 Level 3 is assessed again', r.assess === true);
  ok('P4 the back button goes to the level chooser, not the academy', /openLevelSelect/.test(r.back), r.back);
  ok('P4 the intro is the level\'s, not the academy\'s', !/Academy/.test(r.kicker), r.kicker);
  ok('P4 finishing the level shows the victory card and saves progress', r.victory && r.saved, JSON.stringify(r));
  await p.close(); }
{ const p = await open('?scenario=agitation'); await closeIntro(p);
  const r = await p.evaluate(() => { scenarioIdx = 1; renderMissionCard();
    const b = [...document.querySelectorAll('#mission-bar .lc-btn')].find(x => /Free Play/.test(x.textContent));
    b.click(); return { freeMode, academyMode }; });
  ok('P4 the academy complete card\'s Free Play button opens Free Play', r.freeMode === true && r.academyMode === false, JSON.stringify(r));
  await p.close(); }

console.log('\nP5 unknown deep links');
for (const q of ['?level=5', '?scenario=no-such-case', '?mode=ac']) {
  const p = await open(q);
  const r = await p.evaluate(() => ({ chooser: !document.getElementById('lvlsel-overlay').classList.contains('hidden'), state: deviceState }));
  ok('P5 ' + q + ' opens the level chooser', r.chooser === true, JSON.stringify(r));
  await p.close();
}
{ const p = await open();
  ok('P5 a plain load still starts in Standby with no chooser',
     (await p.evaluate(() => deviceState + '|' + document.getElementById('lvlsel-overlay').classList.contains('hidden'))) === 'standby|true');
  await p.close(); }

console.log('\nP6–P7 the teaching card');
{ const p = await open('?level=2'); await closeIntro(p);
  const r = await p.evaluate(() => {
    const out = {};
    toggleLock(); openDrawer('rate'); const r0 = vals.rate.v; adjAndUpdate('rate', 1); out.locked = vals.rate.v === r0; toggleLock(); closeDrawer();
    openDrawer('rate'); adjAndUpdate('rate', 1); out.unlocked = vals.rate.v === r0 + 1; closeDrawer();
    setMode('nppv'); vals.peep.v = 5; vals.ps.v = 10; updateUI(); openDrawer('ps');
    out.ipap = document.getElementById('dv-num-ps').textContent; out.tile = document.getElementById('kv-ps').textContent;
    adjAndUpdate('ps', 1); out.ipapAfter = document.getElementById('dv-num-ps').textContent; closeDrawer();
    vals.lowmv.v = 0; updateUI(); openDrawer('lowmv'); out.off = document.getElementById('dv-num-lowmv').textContent; closeDrawer();
    vals.lowmv.v = 3; updateUI(); openDrawer('lowmv'); out.lowmv = document.getElementById('dv-num-lowmv').textContent; closeDrawer();
    selectControl('ps'); window.scrollTo(0, document.body.scrollHeight); renderDock(); out.dock = document.getElementById('dock-val').textContent; deselect();
    shutdownDevice(); const v0 = vals.vt.v; openDrawer('vt'); adjAndUpdate('vt', 10); out.standby = vals.vt.v === v0; closeDrawer();
    return out;
  });
  ok('P6 −/+ does nothing under Control Lock', r.locked, JSON.stringify(r));
  ok('P6 −/+ still works when unlocked', r.unlocked);
  ok('P6 −/+ does nothing in Standby', r.standby);
  ok('P7 in NPPV the card shows IPAP, as the window does', r.ipap === '15' && r.tile === '15' && r.ipapAfter === '16', JSON.stringify(r));
  ok('P7 a zero alarm reads OFF on the card, Low MV to one decimal', r.off === 'OFF' && r.lowmv === '3.0', JSON.stringify(r));
  ok('P7 the dock shows IPAP in NPPV', r.dock === '16', r.dock);
  await p.close(); }

console.log('\nP8 the inspiratory-time cap');
{ const p = await open('?level=2'); await closeIntro(p);
  const r = await p.evaluate(() => { const bad = [];
    for (let rate = 1; rate <= 80; rate++) { const c = 60 / rate, m = maxITForRate(rate);
      if (m > 0.8 * c + 1e-9 || c - m < MIN_EXH_TIME - 1e-9 || Math.abs(m * 10 - Math.round(m * 10)) > 1e-9) bad.push(rate + ':' + m); }
    return { bad, m12: maxITForRate(12), m20: maxITForRate(20), card: CONTROLS.it.desc + ' ' + CONTROLS.it.pearl }; });
  ok('P8 at every rate 1–80 the cap is no more inverse than 4:1 and leaves ≥ 0.3 s to exhale', r.bad.length === 0, r.bad.join(' '));
  ok('P8 the card quotes the enforced max (rate 12 → 4.0 s, rate 20 → 2.4 s)',
     r.m12 === 4 && r.m20 === 2.4 && /max IT = 4\.0 s/.test(r.card) && /max IT = 2\.4 s/.test(r.card) && !/− 0\.5 s/.test(r.card), JSON.stringify({ m12: r.m12, m20: r.m20 }));
  await p.close(); }

console.log('\nP9 card ranges match the dials');
{ const p = await open('?level=2'); await closeIntro(p);
  const r = await p.evaluate(() => ['rate', 'vt', 'pc', 'ps', 'fio2', 'sens', 'peep', 'hipres', 'lowpres', 'lowmv', 'apnea'].map(k => {
    const c = vals[k], rg = CONTROLS[k].range, nums = (rg.split('|')[0].match(/\d+(\.\d+)?/g) || []).map(Number);
    return { k, rg, max: c.max, hasMax: nums.includes(c.max), off: (k === 'ps' || k === 'lowpres' || k === 'lowmv') ? /OFF/.test(rg) : true };
  }).concat([{ k: 'rate-nppv', desc: CONTROLS.rate.desc, nppv: CONTROLS.rate.avail.find(a => /NPPV/.test(a.mode)).yes }]));
  for (const x of r.filter(x => x.max !== undefined)) ok('P9 ' + x.k + ' card range reaches the dial\'s ' + x.max + (x.off !== true ? '' : ''), x.hasMax && x.off, x.rg);
  const n = r.find(x => x.k === 'rate-nppv');
  ok('P9 the rate card calls NPPV\'s rate the apnea backup, not inactive', n.nppv === true && !/Inactive in CPAP and NPPV/.test(n.desc) && /apnea backup/i.test(n.desc), n.desc);
  await p.close(); }

console.log('\nP10 Control Lock and a flashing mode');
{ const p = await open('?level=2'); await closeIntro(p);
  const r = await p.evaluate(async () => { pressModeSelect(); const cand = _modeCandidate; toggleLock();
    const atLock = { mode: ventMode, cand: _modeCandidate }; await new Promise(res => setTimeout(res, 4300));
    return { cand, atLock, later: ventMode, locked: controlsLocked }; });
  ok('P10 locking confirms the flashing mode at once', r.cand === 'simv' && r.atLock.mode === 'simv' && r.atLock.cand === null, JSON.stringify(r));
  ok('P10 nothing commits later on the locked panel', r.later === 'simv' && r.locked, JSON.stringify(r));
  await p.close(); }

console.log('\nP11 the insp-hold card');
{ const p = await open('?free');
  const r = await p.evaluate(() => { vals.vt.v = 400; vals.peep.v = 5; updateUI(); openDrawer('insphold');
    const cards = [...document.querySelectorAll('#drawer-content div')].filter(d => /DRIVING PRESSURE/.test(d.textContent) && d.children.length === 3);
    const v = cards[0] && cards[0].children[1]; return { drive: calcPplat().drive, color: v && getComputedStyle(v).color }; });
  ok('P11 a driving pressure within target (≤ 12) is green', r.drive <= 12 && r.color === 'rgb(57, 255, 90)', JSON.stringify(r));
  await p.close(); }

console.log('\nP13 the goal turning green reaches the learner at the knob');
{ const pctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const p = await pctx.newPage(); p.on('pageerror', e => errs.push(String(e)));
  await p.goto(ORIGIN + '/vent-ltv1200.html?level=2');
  await p.waitForFunction(() => typeof SCENARIO_LEVELS !== 'undefined' && typeof updateGoalNudge === 'function');
  const nudge = () => p.evaluate(() => { const e = document.getElementById('goal-nudge'), r = e.getBoundingClientRect();
    return { show: e.classList.contains('show'), vis: getComputedStyle(e).visibility, top: r.top, bottom: r.bottom, h: r.height, left: r.left, right: r.right,
             hidden: e.getAttribute('aria-hidden'), tab: e.tabIndex, scan: document.getElementById('scan-value').textContent, sr: document.getElementById('sr-status').textContent }; });
  await p.evaluate(() => { scenarioIdx = 1; loadScenario(SCENARIO_LEVELS[2][1]); document.getElementById('intro-overlay').classList.remove('open'); });
  // Before the diagnosis, a goal setting must not announce anything
  await p.evaluate(() => { vals.peep.v = 10; updateUI(); });
  ok('P13 nothing shows before the case is diagnosed', !(await nudge()).show);
  await p.evaluate(() => { vals.peep.v = 3; scenarioDiagnosed = true; updateUI(); });
  await p.locator('#cw-peep').scrollIntoViewIfNeeded(); await p.locator('#cw-peep').tap(); await p.waitForTimeout(100);
  for (let i = 0; i < 4; i++) await p.evaluate(() => knobTurn(1));
  ok('P13 one click short of the goal, nothing shows', !(await nudge()).show);
  await p.evaluate(() => knobTurn(1)); await p.waitForTimeout(300);
  const n = await nudge();
  const cta = await p.evaluate(() => { const r = document.querySelector('#mission-bar .mission-cta.ready').getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; });
  ok('P13 at the goal (PEEP 8), with the card\'s Confirm off-screen, the Confirm button shows', n.show && n.vis === 'visible' && (cta.bottom < 0 || cta.top > 844), JSON.stringify({ n, cta }));
  ok('P13 it is on screen, a 44 px target, inside a 390 px phone', n.top >= 0 && n.bottom <= 844 && n.h >= 44 && n.left >= 0 && n.right <= 390, JSON.stringify(n));
  ok('P13 it is reachable by keyboard and screen reader while shown', n.hidden === null && n.tab === 0);
  ok('P13 the scan window says GOAL MET, and it is announced', /GOAL MET/.test(n.scan) && /GOAL MET/.test(n.sr), n.scan + ' | ' + n.sr);
  const dock = await p.evaluate(() => { window.scrollTo(0, document.body.scrollHeight); window.scrollTo(0, 0); selectControl('peep'); renderDock(); updateGoalNudge();
    const d = document.getElementById('knob-dock'), e = document.getElementById('goal-nudge');
    return { dock: d.classList.contains('show'), d: d.getBoundingClientRect().top, eBottom: e.getBoundingClientRect().bottom, show: e.classList.contains('show') }; });
  // at the top of the page the card's own Confirm is in view, so the button stands down
  ok('P13 with the card\'s Confirm in view, the button is not needed and hides', !dock.show, JSON.stringify(dock));
  // A short screen (a phone on its side) where the deck knob and the card's Confirm
  // are both out of view: the dock and the button are up together.
  await p.setViewportSize({ width: 390, height: 560 }); await p.waitForTimeout(100);
  const placed = await p.evaluate(() => {
    const abs = s => { const r = document.querySelector(s).getBoundingClientRect(); return { top: r.top + scrollY, bottom: r.bottom + scrollY }; };
    const y = abs('#mission-bar .mission-cta.ready').bottom + 5; window.scrollTo(0, y);
    deselect(); selectControl('peep'); renderDock(); updateGoalNudge();
    return { fits: abs('#setknob').top > y + innerHeight };
  });
  await p.waitForTimeout(300);
  const stack = await p.evaluate(() => { const d = document.getElementById('knob-dock'), e = document.getElementById('goal-nudge');
    const dr = d.getBoundingClientRect(), er = e.getBoundingClientRect(); return { dock: d.classList.contains('show'), show: e.classList.contains('show'), dTop: dr.top, eBottom: er.bottom }; });
  ok('P13 when the knob dock is up too, the button sits above it, not on it', placed.fits && stack.dock && stack.show && stack.eBottom <= stack.dTop, JSON.stringify({ placed, stack }));
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(100);
  await p.evaluate(() => { deselect(); window.scrollTo(0, document.body.scrollHeight); updateGoalNudge(); });
  await p.locator('#goal-nudge').tap(); await p.waitForTimeout(200);
  const conf = await p.evaluate(() => ({ open: document.getElementById('quiz-overlay').classList.contains('open'), badge: (document.querySelector('#quiz-inner .quiz-badge') || {}).textContent }));
  ok('P13 tapping it opens the case\'s confirmation', conf.open && /Solved/.test(conf.badge), JSON.stringify(conf));
  await p.evaluate(() => advanceStage()); await p.waitForTimeout(100);
  ok('P13 the next case starts with it hidden', !(await nudge()).show);
  // Below the goal again → it goes away
  await p.evaluate(() => { closeQuiz(); scenarioIdx = 1; loadScenario(SCENARIO_LEVELS[2][1]); document.getElementById('intro-overlay').classList.remove('open');
    scenarioDiagnosed = true; vals.peep.v = 8; updateUI(); window.scrollTo(0, document.body.scrollHeight); updateGoalNudge(); });
  const on = (await nudge()).show;
  await p.evaluate(() => { vals.peep.v = 7; updateUI(); });
  ok('P13 dialling back off the goal hides it again', on && !(await nudge()).show);
  // Level 3 is graded without live feedback: never shown there
  // (clear the last step's GOAL MET from the window and the live region first)
  await p.evaluate(() => { _scanMsg = null; _scanMsgUntil = 0; renderScan(); document.getElementById('sr-status').textContent = ''; startLevel(3); scenarioIdx = 2; loadScenario(SCENARIO_LEVELS[3][2]); document.getElementById('intro-overlay').classList.remove('open');
    scenarioDiagnosed = true; vals.peep.v = 14; vals.fio2.v = 90; updateUI(); window.scrollTo(0, document.body.scrollHeight); updateGoalNudge(); });
  const l3 = await nudge();
  ok('P13 Level 3 (graded, no live feedback) never shows it, even at the goal', !l3.show && !/GOAL MET/.test(l3.scan), JSON.stringify(l3));
  // The tutorial gets it too
  await p.evaluate(() => { startLevel(1); document.getElementById('intro-overlay').classList.remove('open'); scenarioDiagnosed = true;
    vals.rate.v = 16; updateUI(); window.scrollTo(0, document.body.scrollHeight); updateGoalNudge(); });
  ok('P13 the tutorial shows it too (guided)', (await nudge()).show);
  await pctx.close(); }

ok('P12 no page errors', errs.length === 0, errs.join(' | '));
console.log(`\n==== ${pass} passed, ${fail} failed ====`);
if (fails.length) console.log('FAILURES:\n - ' + fails.join('\n - '));
await browser.close(); srv.close();
process.exit(fail ? 1 : 0);
