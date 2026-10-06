/*
 * Chart Rx — page test
 * --------------------
 * The PCR documentation micro-quiz (chart-rx.html + chart-rx/questions.json),
 * driven in headless Chromium against the build spec's acceptance checklist:
 *
 *   C1  every question comes from questions.json, and the shipped bank is valid
 *   C2  no patient-identifying data anywhere in the page or the bank
 *   C3  rounds: 8 questions, ≤2 per module, ≥1 spot, no repeats of recent wins
 *   C4  all 34 questions render, answer and grade — and fit a phone screen
 *       with nothing to scroll for
 *   C5  feedback lands inside 150 ms on a CPU slowed four-fold
 *   C6  swipe by touch, by mouse, by button and by arrow key
 *   C7  the keyboard path a Toughbook trackpad user takes
 *   C8  XP, the speed bonus, and the streak labels
 *   C9  a round resumes after the app is closed mid-question
 *   C10 the summary names the weak spot; badges and the streak record persist
 *   C11 today's challenge is the same question on every device on a date
 *   C12 the completion code matches SHA-256, the supervisor check, and copy/share
 *   C13 the optional submit sends only name, ID, date, score and weak module
 *   C14 the whole thing works offline after one load, through the real worker
 *   C15 theme: dark from 1900, a manual choice lasts until the next switch
 *   C16 reduced motion, and right/wrong is never shown by color alone
 *   C17 a broken or missing question bank fails safe
 *   C18 it is reachable from the Field Guide
 *   C19 axe-core finds no accessibility violation on any screen, either theme
 *
 * Run:  cd test && node chartrx.test.mjs
 */
import http from 'http';
import fs from 'fs';
import crypto from 'crypto';
import { readFile } from 'fs/promises';
import { extname, join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.json':'application/json',
  '.png':'image/png', '.jpg':'image/jpeg', '.ico':'image/x-icon', '.pdf':'application/pdf', '.svg':'image/svg+xml',
  '.css':'text/css', '.ttf':'font/ttf', '.woff2':'font/woff2' };
const srv = http.createServer(async (q, r) => {
  try { const u = decodeURIComponent(q.url.split('?')[0]); const d = await readFile(join(ROOT, u === '/' ? 'index.html' : u));
    r.writeHead(200, { 'content-type': MIME[extname(u)] || 'application/octet-stream' }); r.end(d);
  } catch { r.writeHead(404); r.end('not found'); }
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${srv.address().port}`;
const PAGE = ORIGIN + '/chart-rx.html';

async function launch() {
  const known = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const exe = process.env.CHROMIUM_PATH || (fs.existsSync(known) ? known : null);
  try { return await chromium.launch(exe ? { executablePath: exe } : {}); }
  catch { return await chromium.launch(); }
}
const browser = await launch();
let pass = 0, fail = 0; const fails = [];
function ok(name, cond, extra) {
  if (cond) pass++; else { fail++; fails.push(name + (extra !== undefined ? ('  [' + extra + ']') : '')); }
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (!cond && extra !== undefined ? ('  [' + extra + ']') : ''));
}

const BANK = JSON.parse(await readFile(join(ROOT, 'chart-rx/questions.json'), 'utf8'));
const SRC = await readFile(join(ROOT, 'chart-rx.html'), 'utf8');
const Q = BANK.questions;

/* A fresh page. `seed` goes into localStorage once, before the first load
   only, so a reload in the middle of a test sees what the app saved. */
async function open({ w = 390, h = 844, seed = null, clock = null, tz = 'America/Chicago', motion = 'no-preference',
                      sw = 'block', touch = false, init = null, perms = [] } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, timezoneId: tz, reducedMotion: motion,
                                         serviceWorkers: sw, hasTouch: touch });
  if (perms.length) await ctx.grantPermissions(perms, { origin: ORIGIN });
  const p = await ctx.newPage();
  p._errs = [];
  p.on('pageerror', e => p._errs.push(String(e)));
  if (clock) await p.clock.install({ time: clock });
  if (init) await p.addInitScript(init);
  if (seed) await p.addInitScript((s) => {
    if (sessionStorage.getItem('__seeded')) return;
    sessionStorage.setItem('__seeded', '1');
    for (const [k, v] of Object.entries(s)) localStorage.setItem('chartrx.' + k, JSON.stringify(v));
  }, seed);
  await p.goto(PAGE);
  await p.waitForFunction(() => window.ChartRx && window.ChartRx.bank());
  return p;
}
const cur = (p) => p.evaluate(() => window.ChartRx.current());
const round = (p) => p.evaluate(() => window.ChartRx.round());
const stats = (p) => p.evaluate(() => window.ChartRx.stats());
function lineIds(q) { return [...(q.chart.vitals || []), ...(q.chart.narrative || [])].map(l => l.id); }
function pickSel(q, right) {
  if (q.type === 'swipe') return `.tf .opt[data-id="${right ? q.answer : !q.answer}"]`;
  if (q.type === 'spot') { const id = right ? q.answer[0] : lineIds(q).find(x => !q.answer.includes(x)); return `.row[data-id="${id}"]`; }
  const id = right ? q.answer : q.options.find(o => o.id !== q.answer).id; return `.opt[data-id="${id}"]`;
}
async function answer(p, right) { const q = await cur(p); await p.click(pickSel(q, right)); return q; }
function seedRound(ids) { return { round: { ids, i: 0, res: [], xp: 0, streak: 0, best: 0 } }; }
const nonSpot = Q.filter(q => q.type !== 'spot').map(q => q.id);

/* ── C1 — the bank, and nothing hard-coded ───────────────────────────── */
console.log('\nC1 question bank');
{ const p = await open();
  const b = await p.evaluate(() => { const B = window.ChartRx.bank(); return { n: B.questions.length, errors: B.errors }; });
  ok('C1 every shipped question passes the schema', b.errors.length === 0, b.errors.join(' | '));
  ok('C1 all 34 load', b.n === Q.length && Q.length === 34, b.n);
  const types = new Set(Q.map(q => q.type));
  ok('C1 all five question types are in the bank', ['swipe','spot','fix','mc','match'].every(t => types.has(t)), [...types].join(','));
  ok('C1 every module has questions', Object.keys(BANK.modules).every(m => Q.some(q => q.module === m)));
  const leaked = Q.filter(q => SRC.includes(q.prompt.slice(0, 40)) || SRC.includes(q.explain.slice(0, 40))).map(q => q.id);
  ok('C1 no question text is hard-coded in the page', leaked.length === 0, leaked.join(','));
  const leakedMods = Object.values(BANK.modules).filter(m => SRC.includes(m.tip)).map(m => m.name);
  ok('C1 no module tip is hard-coded either', leakedMods.length === 0, leakedMods.join(','));

  // The validator: bad questions are skipped and named, good ones still load.
  const v = await p.evaluate(() => {
    const mods = { a: { name: 'A' } };
    const good = { id: 'g', module: 'a', type: 'mc', prompt: 'p', explain: 'e', options: [{ id: 'x', text: 'x' }, { id: 'y', text: 'y' }], answer: 'x' };
    const bad = [
      { ...good, id: 'b1', module: 'nope' }, { ...good, id: 'b2', type: 'essay' }, { ...good, id: 'b3', answer: 'z' },
      { ...good, id: 'b4', options: [{ id: 'x', text: 'x' }] }, { ...good, id: 'b5', prompt: '' },
      { id: 'b6', module: 'a', type: 'swipe', prompt: 'p', explain: 'e', answer: 'yes' },
      { id: 'b7', module: 'a', type: 'spot', prompt: 'p', explain: 'e', chart: { vitals: [{ id: 'v1', text: 't' }] }, answer: ['n9'] },
      { ...good }, null ];
    const r = window.ChartRx.validate({ modules: mods, questions: [good, ...bad] });
    return { kept: r.questions.map(q => q.id), errors: r.errors.length };
  });
  ok('C1 the validator keeps a good question', v.kept.length === 1 && v.kept[0] === 'g', JSON.stringify(v.kept));
  ok('C1 and names every bad one (9 of 9)', v.errors === 9, v.errors);
  await p.context().close(); }

/* ── C2 — no patient-identifying data ────────────────────────────────── */
console.log('\nC2 no patient data');
{ const text = JSON.stringify(BANK) + '\n' + SRC;
  const PATTERNS = [
    ['a calendar date (MM/DD/YY)', /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/],
    ['a DOB label', /\bD\.?O\.?B\b/i],
    ['an SSN', /\b\d{3}-\d{2}-\d{4}\b/],
    ['a phone number', /\(?\b\d{3}\)?[-. ]\d{3}-\d{4}\b/],
    ['an incident/MRN-length number', /(?<![#\w.])\d{6,}(?![\w])/],
    ['a titled name', /\b(?:Mr|Mrs|Ms|Miss)\.? [A-Z][a-z]+/],
  ];
    // Leave out the SHA-256 routine and the FNV constants: numbers, not content.
  const scan = text.replace(/function sha256js[\s\S]*?\nfunction codeFor/, '').replace(/2166136261|16777619/g, '');
  for (const [label, re] of PATTERNS) {
    const m = scan.match(re);
    ok(`C2 no ${label}`, !m, m && m[0]);
  }
  ok('C2 the spec\'s de-identification is stated on the page', /de-identified composite/.test(SRC)); }

/* ── C3 — the round builder ──────────────────────────────────────────── */
console.log('\nC3 round builder');
{ const p = await open();
  const r = await p.evaluate(() => {
    const B = window.ChartRx.bank(), out = { n: 0, bad: [] };
    let s = 7; const rng = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 500; i++) {
      const ids = window.ChartRx.buildRound(rng), qs = ids.map(id => B.byId[id]), per = {};
      qs.forEach(q => per[q.module] = (per[q.module] || 0) + 1);
      if (ids.length !== 8) out.bad.push('len ' + ids.length);
      if (new Set(ids).size !== ids.length) out.bad.push('dupe');
      if (Math.max(...Object.values(per)) > 2) out.bad.push('3 from a module');
      if (!qs.some(q => q.type === 'spot')) out.bad.push('no spot');
      out.n++;
    }
    return out;
  });
  ok('C3 500 rounds: always 8, no duplicates, ≤2 per module, ≥1 spot', r.bad.length === 0, r.bad.slice(0, 5).join(', '));
  await p.context().close();

  // Questions answered right in the last two finished rounds are held back.
  const A = nonSpot.slice(0, 8), B2 = nonSpot.slice(8, 16);
  const p2 = await open({ seed: { stats: { recent: [A, B2] } } });
  const held = await p2.evaluate((h) => { const seen = new Set();
    for (let i = 0; i < 300; i++) window.ChartRx.buildRound().forEach(id => seen.add(id));
    return h.filter(id => seen.has(id)); }, [...A, ...B2]);
  ok('C3 nothing right in the last two rounds comes back', held.length === 0, held.join(','));
  await p2.context().close();
  // ...unless there is not enough else to fill a round, and then it still fills.
  const most = Q.map(q => q.id).filter(id => id !== 'vitals-01');
  const p3 = await open({ seed: { stats: { recent: [most.slice(0, 17), most.slice(17)] } } });
  const full = await p3.evaluate(() => window.ChartRx.buildRound());
  ok('C3 a round still fills when almost everything is held back', full.length === 8 && full.includes('vitals-01'), full.join(','));
  await p3.context().close(); }

/* ── C4 — every question renders, grades and fits ────────────────────── */
console.log('\nC4 every question');
for (const [w, h, right] of [[390, 844, true], [360, 740, false]]) {
  const label = `${w}x${h}`;
  const p = await open({ w, h, seed: seedRound(Q.map(q => q.id)) });
  await p.waitForSelector('#v-q:not([hidden])');
  const overflow = [], small = [], wrongVerdict = [], noKey = [], shuffled = new Set();
  for (let i = 0; i < Q.length; i++) {
    const q = await cur(p);
    const m = await p.evaluate(() => {
      const bs = [...document.querySelectorAll('#q-body button')];
      return { bottom: Math.max(...bs.map(b => b.getBoundingClientRect().bottom)), vh: innerHeight,
               minH: Math.min(...bs.map(b => b.getBoundingClientRect().height)),
               order: [...document.querySelectorAll('#q-body .opts .opt')].map(b => b.dataset.id).join('') };
    });
    if (m.bottom > m.vh) overflow.push(q.id + '@' + Math.round(m.bottom));
    if (m.minH < 48) small.push(q.id + ':' + Math.round(m.minH));
    if (m.order) shuffled.add(q.id + m.order);
    await p.click(pickSel(q, right));
    const v = await p.textContent('.vtext');
    if (v !== (right ? 'Correct' : 'Not quite')) wrongVerdict.push(q.id + ':' + v);
    if (!right && (await p.locator('#q-body .is-right').count()) === 0) noKey.push(q.id);
    await p.click('#btn-next');
    if (i < Q.length - 1) await p.waitForFunction((n) => window.ChartRx.round() && window.ChartRx.round().i === n, i + 1);
  }
  ok(`C4 ${label}: all 34 grade ${right ? 'right' : 'wrong'} as expected`, wrongVerdict.length === 0, wrongVerdict.join(', '));
  ok(`C4 ${label}: every answer control is on screen with no scrolling`, overflow.length === 0, overflow.join(', '));
  ok(`C4 ${label}: every target is at least 48px tall`, small.length === 0, small.join(', '));
  if (!right) ok(`C4 ${label}: a miss always shows the right answer`, noKey.length === 0, noKey.join(','));
  ok(`C4 ${label}: the round ends on the summary`, await p.isVisible('#v-sum'));
  ok(`C4 ${label}: no errors`, p._errs.length === 0, p._errs.join('|'));
  await p.context().close();
}
{ // Options are shuffled at runtime, and graded by id rather than position.
  const orders = new Set();
  for (let i = 0; i < 6; i++) {
    const p = await open({ seed: seedRound(['sign-02']) });
    await p.waitForSelector('#v-q:not([hidden])');
    orders.add(await p.evaluate(() => [...document.querySelectorAll('.opts .opt')].map(b => b.dataset.id).join('')));
    await p.context().close();
  }
  ok('C4 answer options come up in a different order across loads', orders.size > 1, [...orders].join(' '));
}

/* ── C5 — feedback inside 150 ms on a slow phone ─────────────────────── */
console.log('\nC5 feedback speed');
{ const ids = ['vitals-01', 'sign-01', 'meds-01', 'sign-02', 'impression-01', 'fullset-01', 'psych-01', 'narrative-02'];
  const p = await open({ seed: seedRound(ids) });
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.waitForSelector('#v-q:not([hidden])');
  const times = [];
  for (let i = 0; i < ids.length; i++) {
    const q = await cur(p);
    const ms = await p.evaluate((sel) => new Promise(res => {
      const b = document.querySelector(sel), t0 = performance.now();
      b.click();
      requestAnimationFrame(() => requestAnimationFrame(() =>
        res(document.getElementById('sheet').hidden ? -1 : performance.now() - t0)));
    }), pickSel(q, i % 2 === 0));
    times.push(Math.round(ms));
    await p.click('#btn-next');
    if (i < ids.length - 1) await p.waitForFunction((n) => window.ChartRx.round().i === n, i + 1);
  }
  ok('C5 the verdict is painted within 150 ms, CPU slowed 4x', times.every(t => t >= 0 && t < 150), times.join(', ') + ' ms');
  await p.context().close(); }

/* ── C6 — swipe ──────────────────────────────────────────────────────── */
console.log('\nC6 swipe');
{ // A real touch drag, as a phone sends it.
  const p = await open({ touch: true, seed: seedRound(['sign-01', 'meds-03', 'sign-03']) });
  await p.waitForSelector('#scard');
  const cdp = await p.context().newCDPSession(p);
  async function touchDrag(dx) {
    const b = await p.locator('#scard').boundingBox();
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * i / 8, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(120);
  }
  await touchDrag(25);
  ok('C6 a short nudge is not an answer', (await p.locator('#sheet:not([hidden])').count()) === 0);
  await touchDrag(-160);                                   // sign-01 is false
  ok('C6 a touch swipe left answers FALSE', (await p.textContent('.vtext')) === 'Correct');
  ok('C6 the card settles with the FALSE stamp', await p.evaluate(() => document.getElementById('scard').classList.contains('settle-l')));
  ok('C6 the statement stays on screen to read', await p.isVisible('#scard-text'));
  await p.click('#btn-next');
  await p.waitForSelector('#scard:not(.done)');
  // The mouse, as on a Toughbook.
  const b = await p.locator('#scard').boundingBox();
  await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.down();
  await p.mouse.move(b.x + b.width / 2 + 170, b.y + b.height / 2, { steps: 10 }); await p.mouse.up();
  await p.waitForTimeout(100);
  ok('C6 a mouse drag right answers TRUE', /Not quite/.test(await p.textContent('.vtext')));   // meds-03 is false
  await p.click('#btn-next');
  await p.waitForSelector('#scard');
  await p.keyboard.press('ArrowLeft');
  ok('C6 the left arrow key answers FALSE', (await p.textContent('.vtext')) === 'Correct');
  ok('C6 no errors', p._errs.length === 0, p._errs.join('|'));
  await p.context().close(); }

/* ── C7 — keyboard only ──────────────────────────────────────────────── */
console.log('\nC7 keyboard');
{ const p = await open({ w: 1366, h: 768 });
  await p.focus('#btn-start'); await p.keyboard.press('Enter');
  await p.waitForSelector('#v-q:not([hidden])');
  ok('C7 Enter on Start opens a question', await p.isVisible('#v-q'));
  ok('C7 focus lands inside the question', await p.evaluate(() => document.getElementById('q-body').contains(document.activeElement)));
  let n = 0;
  for (let i = 0; i < 8; i++) {
    const q = await cur(p);
    if (q.type === 'swipe') await p.keyboard.press(q.answer ? 'ArrowRight' : 'ArrowLeft');
    else if (q.type === 'spot') { await p.focus(`.row[data-id="${q.answer[0]}"]`); await p.keyboard.press('Enter'); }
    else { const idx = await p.evaluate((a) => [...document.querySelectorAll('.opts .opt')].findIndex(b => b.dataset.id === a), q.answer);
           await p.keyboard.press(String(idx + 1)); }
    if (await p.evaluate(() => document.activeElement && document.activeElement.id === 'btn-next')) n++;
    await p.keyboard.press('Enter');
    await p.waitForTimeout(80);
  }
  ok('C7 Next takes focus after every answer', n === 8, n + ' of 8');
  ok('C7 Enter on Next walks the round to the summary', await p.isVisible('#v-sum'));
  ok('C7 a keyboard-only round scores 8/8', (await stats(p)).last.score === 8, (await stats(p)).last.score);
  await p.context().close(); }

/* ── C8 — XP, speed bonus, streak ────────────────────────────────────── */
console.log('\nC8 XP and streak');
{ const ids = nonSpot.slice(0, 6).concat(['vitals-01', 'fullset-01']);
  const p = await open({ clock: new Date('2026-10-06T10:00:00-05:00'), seed: seedRound(ids) });
  await p.waitForSelector('#v-q:not([hidden])');
  await answer(p, true);
  ok('C8 a fast right answer is 15 XP (10 + 5 speed)', (await round(p)).xp === 15, (await round(p)).xp);
  ok('C8 the sheet shows the speed bonus', /\+5 speed/.test(await p.textContent('#sheet')));
  await p.click('#btn-next'); await p.waitForFunction(() => window.ChartRx.round().i === 1);
  await p.clock.runFor(9000);
  await answer(p, true);
  ok('C8 a slow right answer is 10 XP, no speed bonus', (await round(p)).xp === 25, (await round(p)).xp);
  ok('C8 and the sheet does not claim one', !/speed/.test(await p.textContent('#sheet')));
  await p.click('#btn-next'); await p.waitForFunction(() => window.ChartRx.round().i === 2);
  await answer(p, true);
  ok('C8 three in a row: "On a roll"', /On a roll/.test(await p.textContent('#sheet')));
  await p.click('#btn-next'); await p.waitForFunction(() => window.ChartRx.round().i === 3);
  await answer(p, true); await p.click('#btn-next'); await p.waitForFunction(() => window.ChartRx.round().i === 4);
  await answer(p, true);
  ok('C8 five in a row: "Chart Doctor"', /Chart Doctor/.test(await p.textContent('#sheet')));
  await p.click('#btn-next'); await p.waitForFunction(() => window.ChartRx.round().i === 5);
  await p.clock.runFor(60000);
  await answer(p, false);
  // 15 + 10 (slow) + 15 + 15 + 15 = 70 before the miss.
  ok('C8 a miss resets the streak and earns nothing', (await round(p)).streak === 0 && (await round(p)).xp === 70, JSON.stringify(await round(p)));
  ok('C8 a miss never costs XP, however slow', (await round(p)).xp === 70);
  await p.context().close(); }

/* ── C9 — resume after closing mid-round ─────────────────────────────── */
console.log('\nC9 resume');
{ const ids = ['sign-02', 'vitals-01', 'meds-01', 'psych-01', 'sign-01', 'impression-01', 'hospice-03', 'narrative-03'];
  const p = await open({ seed: seedRound(ids) });
  await p.waitForSelector('#v-q:not([hidden])');
  for (let i = 0; i < 3; i++) { await answer(p, i !== 1); await p.click('#btn-next'); await p.waitForFunction((n) => window.ChartRx.round().i === n, i + 1); }
  const before = await round(p), onScreen = (await cur(p)).id;
  await p.reload();                       // toned out: the app is closed and reopened
  await p.waitForSelector('#v-q:not([hidden])');
  const after = await round(p);
  ok('C9 reopening goes straight back to the question you were on', (await cur(p)).id === onScreen && onScreen === ids[3], (await cur(p)).id);
  ok('C9 the same round, same questions, same order', JSON.stringify(after.ids) === JSON.stringify(before.ids));
  ok('C9 XP and streak carried over', after.xp === before.xp && after.streak === before.streak, after.xp + '/' + after.streak);
  ok('C9 the progress dots show the three answered', (await p.locator('.dot.ok').count()) === 2 && (await p.locator('.dot.no').count()) === 1);
  // Close after answering but before Next: the answer is not lost.
  await answer(p, true);
  await p.reload(); await p.waitForSelector('#v-q:not([hidden])');
  ok('C9 an answer given just before closing is kept', (await round(p)).i === 4 && (await cur(p)).id === ids[4], (await round(p)).i);
  // The quit button pauses rather than abandons.
  await p.click('#q-quit');
  ok('C9 quitting shows a Resume button on the home screen', /Resume round — question 5 of 8/.test(await p.textContent('#btn-start')), await p.textContent('#btn-start'));
  await p.click('#btn-start');
  ok('C9 and Resume returns to question 5', (await cur(p)).id === ids[4]);
  await p.context().close(); }

/* ── C10 — summary, weak spot, badges, records ───────────────────────── */
console.log('\nC10 summary and badges');
{ const ids = ['meds-01', 'meds-04', 'psych-01', 'sign-02', 'vitals-01', 'hospice-03', 'narrative-03', 'impression-01'];
  const miss = new Set(['meds-01', 'meds-04', 'psych-01']);
  const p = await open({ seed: { ...seedRound(ids), stats: { mod: { impression: 4 } } } });
  await p.waitForSelector('#v-q:not([hidden])');
  for (let i = 0; i < 8; i++) {
    const q = await cur(p);
    await p.click(pickSel(q, !miss.has(q.id)));
    await p.click('#btn-next');
    if (i < 7) await p.waitForFunction((n) => window.ChartRx.round().i === n, i + 1);
  }
  await p.waitForSelector('#v-sum:not([hidden])');
  const sum = await p.textContent('#v-sum');
  ok('C10 the summary shows the score', /5\/8/.test(sum.replace(/\s/g, '')), sum.slice(0, 80));
  ok('C10 the weak spot is the module missed most (Dose Detective, 2 misses)', /weak spot: 💊 Dose Detective/.test(sum));
  ok('C10 with its one-line tip', sum.includes(BANK.modules.meds.tip));
  ok('C10 the misses are listed to review', (await p.locator('.rv').count()) === 3);
  ok('C10 the impression badge was earned on the 5th right answer', !!(await stats(p)).badges.impression);
  ok('C10 the summary announces it', /New badge: 🩺 Impression Matcher/.test(sum));
  ok('C10 right answers are held back next time', JSON.stringify([...(await stats(p)).recent[0]].sort()) ===
     JSON.stringify(ids.filter(id => !miss.has(id)).sort()));
  await p.reload();
  await p.waitForSelector('#v-home:not([hidden])');
  ok('C10 the badge survives a reload', (await p.textContent('#st-badges')) === '1/8');
  ok('C10 so does the streak record', (await p.textContent('#st-streak')) === '5', await p.textContent('#st-streak'));
  await p.click('#btn-badges');
  ok('C10 the badge screen shows it earned, the rest locked',
     (await p.locator('.badge.earned').count()) === 1 && (await p.locator('.badge.locked').count()) === 7);
  ok('C10 every badge carries its habit, so the screen doubles as a cheat sheet', (await p.locator('.badge .tip').count()) === 8);
  await p.context().close();

  const p2 = await open({ seed: seedRound(ids) });
  await p2.waitForSelector('#v-q:not([hidden])');
  for (let i = 0; i < 8; i++) { await answer(p2, true); await p2.click('#btn-next'); if (i < 7) await p2.waitForFunction((n) => window.ChartRx.round().i === n, i + 1); }
  await p2.waitForSelector('#v-sum:not([hidden])');
  ok('C10 a clean round says there is no weak spot', /No weak spot this round/.test(await p2.textContent('#v-sum')));
  await p2.context().close(); }

/* ── C11 — today's challenge ─────────────────────────────────────────── */
console.log('\nC11 daily challenge');
{ const d1 = new Date('2026-10-06T09:00:00-05:00');
  const a = await open({ clock: d1 }), b = await open({ clock: d1, w: 1366, h: 768 });
  const qa = await a.evaluate(() => window.ChartRx.dailyFor('2026-10-06'));
  const qb = await b.evaluate(() => window.ChartRx.dailyFor('2026-10-06'));
  ok('C11 two devices get the same question on the same date', qa === qb && !!qa, qa + ' / ' + qb);
  const week = await a.evaluate(() => ['01','02','03','04','05','06','07'].map(d => window.ChartRx.dailyFor('2026-10-' + d)));
  ok('C11 it changes from day to day', new Set(week).size > 3, week.join(','));
  await a.click('#btn-daily');
  ok('C11 the challenge opens today\'s question', (await cur(a)).id === qa);
  await answer(a, true);
  ok('C11 it says Done, not Next', /Done/.test(await a.textContent('#btn-next')));
  const xp1 = (await stats(a)).xp;
  await a.click('#btn-next');
  ok('C11 home marks it done', /Done/.test(await a.textContent('#daily-sub')));
  await a.click('#btn-daily'); await answer(a, true);
  ok('C11 playing it twice does not pay twice', (await stats(a)).xp === xp1, (await stats(a)).xp + ' vs ' + xp1);
  await a.context().close(); await b.context().close(); }

/* ── C12 — completion code, supervisor check, copy and share ─────────── */
console.log('\nC12 completion');
const expected = (id, date, score) =>
  crypto.createHash('sha256').update(`${String(id).trim()}|${date}|${score}|chartrx-oct26`).digest('hex').slice(0, 8);
{ const p = await open({ clock: new Date('2026-10-06T14:00:00-05:00'), perms: ['clipboard-read', 'clipboard-write'],
                         seed: seedRound(['sign-02', 'sign-01', 'meds-01', 'vitals-01', 'psych-01', 'hospice-03', 'narrative-03', 'impression-01']) });
  await p.waitForSelector('#v-q:not([hidden])');
  for (let i = 0; i < 8; i++) { await answer(p, i !== 3); await p.click('#btn-next'); if (i < 7) await p.waitForFunction((n) => window.ChartRx.round().i === n, i + 1); }
  await p.click('#btn-credit');
  await p.click('#credit-form button[type=submit]');
  ok('C12 a blank name is refused', /name/i.test(await p.textContent('#cr-err')));
  await p.fill('#cr-name', 'Test Medic'); await p.fill('#cr-id', '  E10293  ');
  await p.click('#credit-form button[type=submit]');
  await p.waitForSelector('#cr-code');
  const code = await p.textContent('#cr-code');
  ok('C12 the code is SHA-256 of ID|date|score|salt, first 8 hex', code === expected('E10293', '2026-10-06', 7), code + ' vs ' + expected('E10293', '2026-10-06', 7));
  const cert = await p.textContent('.cert');
  ok('C12 the screen shows name, ID, date and score', /Test Medic/.test(cert) && /E10293/.test(cert) && /2026-10-06/.test(cert) && /7 \/ 8/.test(cert));
  await p.click('#cr-copy');
  await p.waitForFunction(() => /Copied/.test(document.getElementById('cr-copied').textContent));
  const clip = await p.evaluate(() => navigator.clipboard.readText());
  ok('C12 Copy puts the completion and the code on the clipboard', clip.includes(code) && clip.includes('7/8'), clip);
  await p.evaluate(() => navigator.clipboard.writeText(''));
  await p.evaluate(() => { delete Navigator.prototype.share; });
  await p.click('#cr-share');
  await p.waitForTimeout(150);
  ok('C12 Share falls back to copying where there is no share sheet', (await p.evaluate(() => navigator.clipboard.readText())).includes(code));
  const stored = await p.evaluate(() => Object.keys(localStorage).map(k => localStorage.getItem(k)).join('\n'));
  ok('C12 the name and ID are not saved on the device', !/Test Medic|E10293/.test(stored));
  // The plain-JS SHA-256 the page falls back to agrees with Web Crypto and Node.
  const inputs = ['', 'abc', 'E1|2026-10-06|8|chartrx-oct26', 'é—ü 漢字 ' + 'x'.repeat(130)];
  const js = await p.evaluate((xs) => xs.map(x => window.ChartRx.sha256js(x)), inputs);
  ok('C12 the fallback SHA-256 matches Node on every input', js.every((h, i) => h === crypto.createHash('sha256').update(inputs[i]).digest('hex')), js[0]);
  await p.context().close(); }
{ const p = await open({ clock: new Date('2026-10-06T14:00:00-05:00') });
  await p.goto(PAGE + '#verify'); await p.waitForSelector('#vf');
  await p.fill('#vf-id', 'E10293'); await p.fill('#vf-date', '2026-10-06'); await p.fill('#vf-score', '7');
  await p.click('#vf button[type=submit]');
  await p.waitForFunction(() => document.getElementById('vf-code').textContent.length === 8);
  ok('C12 the supervisor check reproduces the code', (await p.textContent('#vf-code')) === expected('E10293', '2026-10-06', 7));
  ok('C12 and reports the bank as healthy', /34 loaded, none skipped/.test(await p.textContent('.health')));
  await p.context().close(); }

/* ── C13 — optional submit ───────────────────────────────────────────── */
console.log('\nC13 submit');
for (const mode of ['ok', 'down']) {
  const hook = 'https://hooks.example.test/chartrx';
  const p = await open({ init: 'window.CHARTRX_CONFIG = { submitUrl: ' + JSON.stringify(hook) + ' };', clock: new Date('2026-10-06T14:00:00-05:00'),
                         seed: seedRound(['meds-01', 'sign-02', 'sign-01', 'vitals-01', 'psych-01', 'hospice-03', 'narrative-03', 'impression-01']) });
  let body = null;
  await p.route(hook, (r) => { body = r.request().postData(); return mode === 'ok' ? r.fulfill({ status: 200, body: 'ok' }) : r.abort(); });
  await p.reload(); await p.waitForSelector('#v-q:not([hidden])');
  for (let i = 0; i < 8; i++) { await answer(p, i !== 0); await p.click('#btn-next'); if (i < 7) await p.waitForFunction((n) => window.ChartRx.round().i === n, i + 1); }
  await p.click('#btn-credit'); await p.fill('#cr-name', 'Test Medic'); await p.fill('#cr-id', 'E10293');
  await p.click('#credit-form button[type=submit]');
  await p.waitForSelector('#cr-code'); await p.waitForTimeout(300);
  if (mode === 'ok') {
    const j = body && JSON.parse(body);
    ok('C13 it POSTs the completion', !!j);
    ok('C13 with exactly name, employeeId, date, score, weakModule', j && JSON.stringify(Object.keys(j).sort()) ===
       JSON.stringify(['date', 'employeeId', 'name', 'score', 'weakModule']), j && Object.keys(j).join(','));
    ok('C13 the values are right', j && j.score === 7 && j.date === '2026-10-06' && j.weakModule === 'Dose Detective', body);
  } else {
    ok('C13 an unreachable endpoint still leaves the code on screen', (await p.textContent('#cr-code')).length === 8);
    ok('C13 and fails silently', p._errs.length === 0, p._errs.join('|'));
  }
  await p.context().close();
}
{ const p = await open({ seed: seedRound(['sign-02']) });
  let posted = false; await p.route('**/*', (r) => { if (r.request().method() === 'POST') posted = true; return r.continue(); });
  await p.reload(); await p.waitForSelector('#v-q:not([hidden])');
  await answer(p, true); await p.click('#btn-next'); await p.click('#btn-credit');
  await p.fill('#cr-name', 'A'); await p.fill('#cr-id', 'B'); await p.click('#credit-form button[type=submit]');
  await p.waitForSelector('#cr-code'); await p.waitForTimeout(200);
  ok('C13 with no submitUrl set, nothing leaves the device', !posted);
  await p.context().close(); }

/* ── C14 — offline after one load, through the real service worker ────── */
console.log('\nC14 offline');
{ const sw = await readFile(join(ROOT, 'sw.js'), 'utf8');
  ok('C14 the worker precaches the page and the question bank', /'\.\/chart-rx\.html'/.test(sw) && /'\.\/chart-rx\/questions\.json'/.test(sw));
  const p = await open({ sw: 'allow' });
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.waitForFunction(async () => {
    const names = await caches.keys(); for (const n of names) { const c = await caches.open(n);
      if (await c.match('chart-rx/questions.json') && await c.match('chart-rx.html')) return true; } return false;
  }, null, { timeout: 30000 });
  await p.context().setOffline(true);
  await p.reload();
  await p.waitForSelector('#v-home:not([hidden])', { timeout: 10000 }).catch(() => {});
  ok('C14 offline, the home screen loads with the questions', await p.isVisible('#v-home') && (await p.textContent('#st-badges')).endsWith('/8'));
  await p.click('#btn-start');
  ok('C14 offline, a round starts', await p.isVisible('#v-q') && (await round(p)).ids.length === 8);
  await p.context().close(); }

/* ── C15 — theme ─────────────────────────────────────────────────────── */
console.log('\nC15 theme');
{ const at = async (iso) => { const p = await open({ clock: new Date(iso) }); const t = await p.evaluate(() => document.documentElement.dataset.theme); return [p, t]; };
  let [p, t] = await at('2026-10-06T10:00:00-05:00'); ok('C15 10:00 opens light', t === 'light', t); await p.context().close();
  [p, t] = await at('2026-10-06T19:00:00-05:00'); ok('C15 19:00 opens dark', t === 'dark', t); await p.context().close();
  [p, t] = await at('2026-10-07T03:00:00-05:00'); ok('C15 03:00 is still dark', t === 'dark', t);
  await p.click('#theme-btn');
  ok('C15 the toggle switches to light', (await p.evaluate(() => document.documentElement.dataset.theme)) === 'light');
  await p.reload();
  ok('C15 the choice survives a reload', (await p.evaluate(() => document.documentElement.dataset.theme)) === 'light');
  // 03:00 → 20:00: past the 07:00 switch and dark again. A stuck override says light.
  await p.clock.runFor(17 * 3600e3);
  await p.reload();
  const after = await p.evaluate(() => ({ t: document.documentElement.dataset.theme, now: new Date().toString().slice(0, 21) }));
  ok('C15 after the next switch it goes back to auto — dark at 20:00, not the old light', after.t === 'dark', JSON.stringify(after));
  await p.context().close();
  const dark = await open({ clock: new Date('2026-10-06T21:00:00-05:00'), seed: seedRound(['vitals-01']) });
  await dark.waitForSelector('#v-q:not([hidden])');
  const bg = await dark.evaluate(() => getComputedStyle(document.body).backgroundColor);
  ok('C15 night shift gets a dark page', bg === 'rgb(11, 18, 32)', bg);
  await dark.context().close(); }

/* ── C16 — reduced motion; never color alone ─────────────────────────── */
console.log('\nC16 motion and color');
{ const p = await open({ motion: 'reduce', seed: seedRound(['vitals-01', 'sign-02']) });
  await p.waitForSelector('#v-q:not([hidden])');
  await answer(p, false);
  const m = await p.evaluate(() => ({
    pulse: getComputedStyle(document.querySelector('.is-right')).animationDuration,
    sheet: getComputedStyle(document.querySelector('.sheet-in')).animationName }));
  ok('C16 reduced motion: no pulsing', parseFloat(m.pulse) <= 0.0001, m.pulse);
  ok('C16 reduced motion: the sheet fades instead of sliding', m.sheet === 'fade', m.sheet);
  ok('C16 a miss says so in words and an icon', (await p.textContent('.vtext')) === 'Not quite' && (await p.textContent('.vicon')).trim() === '✗');
  ok('C16 the picked row says "Your pick", the right one says "Answer"',
     /Your pick/.test(await p.textContent('.is-wrong .mark')) && /Answer/.test(await p.textContent('.is-right .mark')));
  await p.click('#btn-next'); await answer(p, true);
  ok('C16 a hit says so in words and an icon', (await p.textContent('.vtext')) === 'Correct' && (await p.textContent('.vicon')).trim() === '✓');
  ok('C16 no errors', p._errs.length === 0, p._errs.join('|'));
  await p.context().close(); }

/* ── C17 — a broken or missing bank fails safe ───────────────────────── */
console.log('\nC17 bad bank');
{ const broken = JSON.parse(JSON.stringify(BANK));
  broken.questions.push({ id: 'bad-1', module: 'meds', type: 'mc', prompt: 'x', explain: 'y', options: [{ id: 'a', text: 'a' }], answer: 'a' });
  broken.questions.push({ id: 'sign-01', module: 'sign', type: 'swipe', prompt: 'dupe', explain: 'dupe', answer: true });
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.route('**/chart-rx/questions.json', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(broken) }));
  await p.goto(PAGE + '#verify'); await p.waitForSelector('.health');
  const hl = await p.textContent('.health');
  ok('C17 bad questions are skipped, good ones still load', /34 loaded, 2 skipped/.test(hl), hl);
  ok('C17 the supervisor screen says which and why', /bad-1: needs 2 to 4 options/.test(hl) && /sign-01: duplicate id/.test(hl), hl);
  ok('C17 no errors', errs.length === 0, errs.join('|'));
  await ctx.close();
  const ctx2 = await browser.newContext({ serviceWorkers: 'block' });
  const p2 = await ctx2.newPage(); const e2 = []; p2.on('pageerror', e => e2.push(String(e)));
  await p2.route('**/chart-rx/questions.json', r => r.fulfill({ status: 404, body: 'nf' }));
  await p2.goto(PAGE); await p2.waitForSelector('#v-fail:not([hidden])');
  ok('C17 a missing bank says what to do instead of breaking', /Open it once with a signal/.test(await p2.textContent('#v-fail')));
  ok('C17 no errors', e2.length === 0, e2.join('|'));
  await ctx2.close(); }

/* ── C18 — reachable from the Field Guide ────────────────────────────── */
console.log('\nC18 Field Guide');
{ const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const p = await ctx.newPage(); await p.goto(ORIGIN + '/index.html'); await p.waitForTimeout(300);
  const gate = p.getByRole('button', { name: /I Understand/i });
  if (await gate.count()) { await gate.first().click(); await p.waitForTimeout(250); }
  ok('C18 it is the featured new training on the home screen', (await p.locator('.feat-card.feat-hero[href="chart-rx.html"]').count()) === 1);
  await p.locator('#nav .nb[data-tab="more"]').click(); await p.waitForTimeout(250);
  ok('C18 More lists it once, under Quizzes', (await p.locator('#lv a[href="chart-rx.html"]').count()) === 1 &&
     (await p.locator('#more-quiz + .more-list a[href="chart-rx.html"]').count()) === 1);
  await p.goto(PAGE); await p.waitForSelector('#v-home:not([hidden])');
  ok('C18 and its header leads back to the Field Guide', (await p.getAttribute('.hdr a.hdr-btn', 'href')) === 'index.html');
  await ctx.close(); }

/* ── C19 — axe-core on every screen, in both themes ───────────────────
   Lighthouse audits only the first screen. This walks the rest: each question
   type before and after answering, the summary, badges, credit and the
   supervisor check — light at 10:00, dark at 21:00. */
console.log('\nC19 accessibility (axe-core)');
{ const AXE = await readFile(join(ROOT, 'test/node_modules/axe-core/axe.min.js'), 'utf8');
  const ids = ['sign-01', 'vitals-01', 'meds-01', 'sign-02', 'impression-01', 'fullset-01', 'psych-04', 'hospice-01'];
  for (const [theme, clock] of [['light', '2026-10-06T10:00:00-05:00'], ['dark', '2026-10-06T21:00:00-05:00']]) {
    const p = await open({ clock: new Date(clock), seed: seedRound(ids) });
    const found = [];
    const audit = async (where) => {
      await p.addScriptTag({ content: AXE });
      // Fonts are blocked in the sandbox, so contrast is measured on the fallback face; the colors are the same.
      const r = await p.evaluate(() => window.axe.run(document, { resultTypes: ['violations'] }));
      r.violations.forEach(v => v.nodes.forEach(n => found.push(`${where}: ${v.id} ${n.target.join(' ')}`)));
    };
    await p.waitForSelector('#v-q:not([hidden])');
    for (let i = 0; i < ids.length; i++) {
      const q = await cur(p);
      await audit(q.type + ' question');
      await p.click(pickSel(q, i % 2 === 0));
      await p.waitForTimeout(700);              // let the fade-ins finish: mid-fade text reads as low contrast
      await audit(q.type + ' feedback');
      await p.click('#btn-next');
      if (i < ids.length - 1) await p.waitForFunction((n) => window.ChartRx.round().i === n, i + 1);
    }
    await p.waitForSelector('#v-sum:not([hidden])'); await p.waitForTimeout(900); await audit('summary');
    await p.click('#btn-credit'); await audit('credit form');
    await p.fill('#cr-name', 'A'); await p.fill('#cr-id', 'B'); await p.click('#credit-form button[type=submit]');
    await p.waitForSelector('#cr-code'); await audit('completion');
    await p.click('#cr-home'); await audit('home');
    await p.click('#btn-badges'); await audit('badges');
    await p.goto(PAGE + '#verify'); await p.waitForSelector('#vf'); await audit('supervisor check');
    ok(`C19 ${theme}: no axe violations on any screen`, found.length === 0, [...new Set(found)].slice(0, 12).join(' | '));
    await p.context().close();
  }
}

console.log(`\n==== ${pass} passed, ${fail} failed ====`);
if (fails.length) console.log('FAILURES:\n - ' + fails.join('\n - '));
await browser.close(); srv.close();
process.exit(fail ? 1 : 0);
