/*
 * ABG Interpretation — page test
 * ------------------------------
 * Drives the real page (abg-practice.html) in headless Chromium.
 *
 * The checks that matter most are the ones that keep the page from teaching
 * something wrong:
 *
 *   1. Every generated gas is internally consistent (Henderson–Hasselbalch)
 *      and the page's answer key agrees with an independent classifier
 *      written here, from the reference card, without looking at the page's.
 *   2. Every hand-written case gas is consistent too, and each case's first
 *      question marks as correct exactly what that classifier says.
 *
 * Run:  cd test && npm install && npm test
 * All data below is synthetic — nothing here is a real patient record.
 */
import http from 'http';
import fs from 'fs';
import { readFile } from 'fs/promises';
import { extname, join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.ico':'image/x-icon' };
const srv = http.createServer(async (q, r) => {
  try { const u = decodeURIComponent(q.url.split('?')[0]); const d = await readFile(join(ROOT, u === '/' ? 'index.html' : u));
    r.writeHead(200, { 'content-type': MIME[extname(u)] || 'application/octet-stream' }); r.end(d);
  } catch { r.writeHead(404); r.end('not found'); }
});
await new Promise(r => srv.listen(0, r));
const ORIGIN = `http://localhost:${srv.address().port}`;
const PAGE = ORIGIN + '/abg-practice.html';

async function launch() {
  const known = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const exe = process.env.CHROMIUM_PATH || (fs.existsSync(known) ? known : null);
  try { return await chromium.launch(exe ? { executablePath: exe } : {}); }
  catch { return await chromium.launch(); }
}
const browser = await launch();

let pass = 0, fail = 0; const fails = [];
function ok(name, cond, extra) { if (cond) pass++; else { fail++; fails.push(name + (extra ? ('  [' + extra + ']') : '')); }
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (!cond && extra ? ('  [' + extra + ']') : '')); }

async function fresh(w = 390) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 844 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/net::ERR|fonts\.googleapis/.test(m.text())) errs.push('CONSOLE:' + m.text()); });
  page._errs = errs;
  await page.goto(PAGE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  return page;
}

/* An independent reading of the reference card. Deliberately written apart
   from the page's classify(): if the two ever disagree, one of them is wrong. */
function ref(g) {
  const col = (v, lo, hi, lowIsAcid) => v < lo ? (lowIsAcid ? 'acid' : 'base') : v > hi ? (lowIsAcid ? 'base' : 'acid') : 'normal';
  const ph = col(g.ph, 7.35, 7.45, true), co2 = col(g.co2, 35, 45, false), hco3 = col(g.hco3, 22, 26, true);
  const osis = d => d === 'acid' ? 'acidosis' : 'alkalosis';
  if (ph === 'normal') {
    if (co2 === 'normal' && hco3 === 'normal') return { ph, co2, hco3, label: 'Normal acid–base status' };
    if (co2 !== 'normal' && hco3 !== 'normal' && co2 !== hco3 && g.ph !== 7.4) {
      const lean = g.ph < 7.4 ? 'acid' : 'base';
      return { ph, co2, hco3, label: `Fully compensated ${co2 === lean ? 'respiratory' : 'metabolic'} ${osis(lean)}` };
    }
    return { ph, co2, hco3, label: null };
  }
  if (co2 === ph && hco3 === ph) return { ph, co2, hco3, label: `Mixed respiratory & metabolic ${osis(ph)}` };
  if (co2 === ph) return { ph, co2, hco3, label: `${hco3 === 'normal' ? 'Uncompensated' : 'Partially compensated'} respiratory ${osis(ph)}` };
  if (hco3 === ph) return { ph, co2, hco3, label: `${co2 === 'normal' ? 'Uncompensated' : 'Partially compensated'} metabolic ${osis(ph)}` };
  return { ph, co2, hco3, label: null };
}
const hh = (co2, hco3) => 6.1 + Math.log10(hco3 / (0.03 * co2));
const oxy = p => p >= 80 ? 'normal' : p >= 60 ? 'mild' : p >= 40 ? 'moderate' : 'severe';

/* A1 — home */
{ const p = await fresh();
  await p.waitForSelector('.hero h1');
  ok('A1 four ways in', (await p.locator('.topic[data-go]').count()) === 4);
  ok('A1 stats start at zero', (await p.locator('#stGas').textContent()) === '0' &&
     (await p.locator('#stCases').textContent()) === '0/12');
  ok('A1 normals on the home screen', /7\.35–7\.45/.test(await p.locator('.norms').textContent()));
  ok('A1 back link to the Field Guide', (await p.locator('.hdr-back').getAttribute('href')) === 'index.html');
  ok('A1 no errors on load', p._errs.length === 0, p._errs.join('|'));
  await p.context().close(); }

/* A2 — the generator: every type, many times, checked against the equation
   and against the independent classifier */
{ const p = await fresh();
  const out = await p.evaluate(() => {
    const r = {};
    for (const t of window.ABG.TYPES_ALL) { r[t] = []; for (let i = 0; i < 300; i++) r[t].push(window.ABG.generate(t)); }
    return { gases: r, labels: Object.fromEntries(window.ABG.TYPES_ALL.map(t => [t, window.ABG.labelFor(t)])) };
  });
  ok('A2 fifteen gas types (12 basic + mixed ×2 + normal)', Object.keys(out.gases).length === 15);
  for (const [t, list] of Object.entries(out.gases)) {
    const badHH = list.filter(g => Math.abs(hh(g.co2, g.hco3) - g.ph) > 0.0051);
    ok(`A2 ${t}: pH agrees with Henderson–Hasselbalch`, badHH.length === 0, JSON.stringify(badHH[0]));
    const badKey = list.filter(g => ref(g).label !== out.labels[t]);
    ok(`A2 ${t}: independent read agrees with the answer key`, badKey.length === 0,
       JSON.stringify(badKey[0]) + ' → ' + (badKey[0] && ref(badKey[0]).label) + ' vs ' + out.labels[t]);
    ok(`A2 ${t}: values are whole numbers in a believable range`,
       list.every(g => Number.isInteger(g.co2) && Number.isInteger(g.hco3) && g.co2 >= 15 && g.co2 <= 90 &&
                      g.hco3 >= 5 && g.hco3 <= 45 && g.ph >= 6.95 && g.ph <= 7.65 && g.pao2 >= 30 && g.pao2 <= 100));
    ok(`A2 ${t}: not the same gas every time`, new Set(list.map(g => g.ph + '/' + g.co2 + '/' + g.hco3)).size > 10);
  }
  const fullPh = Object.entries(out.gases).filter(([t]) => /full/.test(t)).flatMap(([, l]) => l);
  ok('A2 no fully-compensated gas sits on the 7.40 tie', fullPh.every(g => g.ph !== 7.4));
  await p.context().close(); }

/* A3 — the case bank */
{ const p = await fresh();
  const cases = await p.evaluate(() => window.ABG.CASES.map(c => ({ id: c.id, gas: c.gas, qs: c.qs.map(q => ({ o: q.o, a: q.a, e: q.e })), point: c.point })));
  ok('A3 twelve cases', cases.length === 12);
  ok('A3 ids unique', new Set(cases.map(c => c.id)).size === cases.length);
  for (const c of cases) {
    ok(`A3 ${c.id}: gas fits Henderson–Hasselbalch within 0.02`, Math.abs(hh(c.gas.co2, c.gas.hco3) - c.gas.ph) <= 0.02,
       `${c.gas.ph} vs ${hh(c.gas.co2, c.gas.hco3).toFixed(3)}`);
    ok(`A3 ${c.id}: first question's answer is the gas's interpretation`, c.qs[0].o[c.qs[0].a] === ref(c.gas).label,
       c.qs[0].o[c.qs[0].a] + ' vs ' + ref(c.gas).label);
    ok(`A3 ${c.id}: every question well formed`, c.qs.every(q => q.o.length >= 3 && q.a >= 0 && q.a < q.o.length &&
       new Set(q.o).size === q.o.length && q.e.length > 40) && c.point.length > 20);
  }
  // Arithmetic quoted in the cases
  const dka = cases.find(c => c.id === 'dka');
  ok('A3 DKA anion gap is 136 − (100 + 6) = 30', /^30\b/.test(dka.qs[1].o[dka.qs[1].a]));
  ok('A3 DKA Winter\'s: 1.5×6+8 = 17 = actual PaCO₂', 1.5 * 6 + 8 === dka.gas.co2);
  const pna = cases.find(c => c.id === 'pneumonia');
  ok('A3 pneumonia P/F 90 ÷ 0.6 = 150', Math.round(pna.gas.pao2 / 0.6) === 150 && /^150\b/.test(pna.qs[1].o[pna.qs[1].a]));
  const sep = cases.find(c => c.id === 'sepsis');
  ok('A3 sepsis PaCO₂ inside Winter\'s range', Math.abs(sep.gas.co2 - (1.5 * sep.gas.hco3 + 8)) <= 2);
  const asa = cases.find(c => c.id === 'aspirin');
  ok('A3 aspirin PaCO₂ well below Winter\'s range (second disorder)', asa.gas.co2 < 1.5 * asa.gas.hco3 + 8 - 2);
  await p.context().close(); }

/* A4 — guided practice, answered perfectly from what's on screen */
async function readGas(p) {
  const g = p.locator('#tGas .gas');
  return { ph: +(await g.getAttribute('data-ph')), co2: +(await g.getAttribute('data-co2')),
           hco3: +(await g.getAttribute('data-hco3')), pao2: +(await g.getAttribute('data-pao2')) };
}
function primKeyOf(label) {
  if (/^Normal/.test(label)) return 'normal';
  if (/^Mixed/.test(label)) return 'mixed';
  return (/respiratory/.test(label) ? 'resp' : 'met') + '-' + (/acidosis/.test(label) ? 'acid' : 'alk');
}
async function solve(p, wrongFirst = false) {
  const g = await readGas(p), r = ref(g);
  for (const row of ['ph', 'co2', 'hco3']) {
    let col = r[row];
    if (wrongFirst && row === 'ph') col = col === 'acid' ? 'base' : 'acid';
    await p.click(`#tSteps .cell[data-row="${row}"][data-col="${col}"]`);
  }
  await p.click(`#tSteps [data-prim="${primKeyOf(r.label)}"]`);
  const comp = /^Uncomp/.test(r.label) ? 'none' : /^Partial/.test(r.label) ? 'partial' : /^Fully/.test(r.label) ? 'full' : null;
  if (comp) await p.click(`#tSteps [data-comp="${comp}"]`);
  await p.click(`#tSteps [data-oxy="${oxy(g.pao2)}"]`);
  return r;
}
{ const p = await fresh();
  await p.click('.topic[data-go="tutor"]');
  ok('A4 a gas appears', await p.locator('#tGas .gas').isVisible());
  ok('A4 step 1 is the tic-tac-toe grid', (await p.locator('#tSteps .cell').count()) === 9);
  ok('A4 later steps hidden until the grid is done', (await p.locator('#step2').count()) === 0);
  for (let i = 0; i < 8; i++) {
    const r = await solve(p);
    ok(`A4 gas ${i + 1}: perfect read recognised`, /Perfect read/.test(await p.locator('#tAnswer').textContent()));
    ok(`A4 gas ${i + 1}: final answer matches the independent read`,
       (await p.locator('#tAnswer .answer-t').textContent()) === r.label);
    ok(`A4 gas ${i + 1}: no wrong marks`, (await p.locator('#tSteps .wrong').count()) === 0);
    await p.click('#tNext');
  }
  ok('A4 streak shown', /8 perfect/.test(await p.locator('#tStreak').textContent()));
  // A deliberate miss
  await solve(p, true);
  ok('A4 a wrong cell is marked wrong', (await p.locator('#tSteps .cell.wrong').count()) === 1);
  ok('A4 and the right one is shown', (await p.locator('#tSteps .cell[data-row="ph"].right').count()) === 1);
  ok('A4 the miss is explained', (await p.locator('#tSteps .why li.no').count()) === 1);
  ok('A4 the summary counts the miss', /1 miss/.test(await p.locator('#tAnswer').textContent()));
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('abg_practice_v1')));
  ok('A4 progress saved', st.gases === 9 && st.perfect === 8 && st.bestStreak === 8, JSON.stringify(st));
  await p.click('#tNext');
  await p.click('.back[data-home] >> visible=true');
  ok('A4 home count updates', (await p.locator('#stGas').textContent()) === '9');
  ok('A4 no errors', p._errs.length === 0, p._errs.join('|'));
  await p.context().close(); }

/* A5 — mixed & normal setting reaches the tutor */
{ const p = await fresh();
  await p.click('#mixToggle');
  ok('A5 toggle reports its state', (await p.locator('#mixToggle').getAttribute('aria-pressed')) === 'true');
  await p.click('.topic[data-go="tutor"]');
  const seen = new Set();
  for (let i = 0; i < 60; i++) { const r = await solve(p); seen.add(primKeyOf(r.label)); await p.click('#tNext'); }
  ok('A5 mixed gases appear', seen.has('mixed'), [...seen].join(','));
  ok('A5 normal gases appear', seen.has('normal'), [...seen].join(','));
  await p.context().close(); }

/* A6 — speed round */
{ const p = await fresh();
  await p.click('.topic[data-go="speed"]');
  for (let i = 0; i < 10; i++) {
    const g = { ph: +(await p.locator('#spBody .gas').getAttribute('data-ph')),
                co2: +(await p.locator('#spBody .gas').getAttribute('data-co2')),
                hco3: +(await p.locator('#spBody .gas').getAttribute('data-hco3')) };
    const opts = await p.locator('.sp-opt').allTextContents();
    const want = ref(g).label;
    ok(`A6 gas ${i + 1}: four distinct options, the right one exactly once`,
       opts.length === 4 && new Set(opts).size === 4 && opts.filter(o => o === want).length === 1, opts.join(' | ') + ' want ' + want);
    await p.locator('.sp-opt', { hasText: want }).first().click();
    ok(`A6 gas ${i + 1}: marked right`, (await p.locator('.sp-opt.right').count()) === 1 && (await p.locator('.sp-opt.wrong').count()) === 0);
    await p.click('#spNext');
  }
  ok('A6 ten for ten', (await p.locator('#spScore').textContent()) === '10/10');
  ok('A6 best saved', (await p.evaluate(() => JSON.parse(localStorage.getItem('abg_practice_v1')).speedBest)) === 10);
  // A round with a miss shows it for review
  await p.click('#spAgain');
  const wrong = await p.locator('.sp-opt').evaluateAll((els) => els.map(e => e.textContent));
  const g0 = { ph: +(await p.locator('#spBody .gas').getAttribute('data-ph')), co2: +(await p.locator('#spBody .gas').getAttribute('data-co2')), hco3: +(await p.locator('#spBody .gas').getAttribute('data-hco3')) };
  await p.locator('.sp-opt', { hasText: wrong.find(o => o !== ref(g0).label) }).first().click();
  ok('A6 a wrong pick is marked', (await p.locator('.sp-opt.wrong').count()) === 1);
  for (let i = 0; i < 10; i++) { if (i > 0) await p.locator('.sp-opt').first().click(); await p.click('#spNext'); }
  ok('A6 missed gases listed for review', (await p.locator('.miss').count()) >= 1);
  ok('A6 best not lowered by a worse round', (await p.evaluate(() => JSON.parse(localStorage.getItem('abg_practice_v1')).speedBest)) === 10);
  await p.context().close(); }

/* A7 — learn cards and the playground */
{ const p = await fresh();
  await p.click('.topic[data-go="learn"]');
  const n = await p.evaluate(() => window.ABG.LEARN.length);
  ok('A7 seven cards', n === 7);
  for (let i = 0; i < n; i++) {
    ok(`A7 card ${i + 1} has a quick check`, (await p.locator('#lQc .opt').count()) >= 3);
    if (i === 2) {
      await p.locator('#pgCo2').fill('60');
      const ph1 = await p.locator('#pgPh').textContent();
      ok('A7 playground: CO₂ 60 / HCO₃ 24 → acid', ph1 === hh(60, 24).toFixed(2) && /respiratory acidosis/.test(await p.locator('#pgLbl').textContent()), ph1);
      await p.locator('#pgHco3').fill('35');
      ok('A7 playground: raising HCO₃ brings pH back', /Fully compensated respiratory acidosis/.test(await p.locator('#pgLbl').textContent()),
         await p.locator('#pgLbl').textContent());
    }
    const ans = await p.evaluate((i) => { const c = window.ABG.LEARN[i].check; return c.o[c.a]; }, i);
    await p.locator('#lQc .opt', { hasText: ans }).first().click();
    ok(`A7 card ${i + 1} check grades right answer as right`, (await p.locator('#lQc .verdict.good').count()) === 1);
    await p.click('#lNext');
  }
  ok('A7 last card leads into practice', await p.locator('#v-tutor').isVisible());
  await p.click('.back[data-home] >> visible=true');
  ok('A7 home shows cards checked', /7 of 7/.test(await p.locator('#learnSub').textContent()));
  ok('A7 no errors', p._errs.length === 0, p._errs.join('|'));
  await p.context().close(); }

/* A8 — cases flow */
{ const p = await fresh();
  await p.click('.topic[data-go="cases"]');
  ok('A8 twelve cases listed', (await p.locator('.case-item').count()) === 12);
  await p.click('.case-item[data-case="dka"]');
  const qs = await p.evaluate(() => window.ABG.CASES.find(c => c.id === 'dka').qs.map(q => q.o[q.a]));
  for (let i = 0; i < qs.length; i++) {
    ok(`A8 DKA question ${i + 1} revealed in turn`, (await p.locator('.cq').count()) === i + 1);
    await p.locator(`.cq[data-q="${i}"] .opt`, { hasText: qs[i] }).first().click();
    ok(`A8 DKA question ${i + 1} graded right`, (await p.locator(`.cq[data-q="${i}"] .verdict.good`).count()) === 1);
  }
  ok('A8 take-home shown', await p.locator('#caseDone').isVisible());
  ok('A8 evidence tag shown', (await p.locator('.ev').count()) >= 1);
  await p.click('#caseNext');
  ok('A8 next case opens', /Case 8 of 12/.test(await p.locator('#caseBody .t-kick').textContent()));
  await p.click('#caseBack');
  ok('A8 solved case ticked in list', await p.locator('.case-item[data-case="dka"]').evaluate(e => e.classList.contains('done')));
  await p.click('.back[data-home] >> visible=true');
  ok('A8 home count', (await p.locator('#stCases').textContent()) === '1/12');
  await p.context().close(); }

/* A9 — fits the narrowest phone, in every view */
{ const p = await fresh(320);
  const wide = async () => p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  ok('A9 home fits 320px', !(await wide()));
  await p.click('.topic[data-go="tutor"]'); await solve(p);
  ok('A9 guided practice fits 320px', !(await wide()));
  await p.click('.back[data-home] >> visible=true'); await p.click('.topic[data-go="speed"]');
  await p.locator('.sp-opt').first().click();
  ok('A9 speed round fits 320px', !(await wide()));
  await p.click('.back[data-home] >> visible=true'); await p.click('.topic[data-go="learn"]');
  for (let i = 0; i < 7; i++) { ok(`A9 learn card ${i + 1} fits 320px`, !(await wide())); await p.click('#lNext'); }
  await p.click('.back[data-home] >> visible=true'); await p.click('.topic[data-go="cases"]');
  await p.click('.case-item[data-case="aspirin"]');
  ok('A9 case fits 320px', !(await wide()));
  const small = await p.evaluate(() => [...document.querySelectorAll('#v-case button.opt')].filter(b => b.offsetHeight < 40).length);
  ok('A9 answer buttons are thumb-sized', small === 0);
  await p.context().close(); }

/* A10 — storage blocked still works */
{ const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); }, configurable: true }); });
  await p.goto(PAGE);
  await p.click('.topic[data-go="tutor"]');
  await solve(p);
  ok('A10 practice works with storage blocked', /Perfect read/.test(await p.locator('#tAnswer').textContent()));
  ok('A10 no uncaught errors', errs.length === 0, errs.join('|'));
  await ctx.close(); }

/* A11 — reachable from the Field Guide, and precached */
{ const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  await p.goto(ORIGIN + '/index.html');
  await p.waitForTimeout(400);
  const gate = p.locator('text=I Understand');
  if (await gate.count()) { await gate.first().click(); await p.waitForTimeout(400); }
  await p.locator('#lv [data-goto="more"][data-sec="training"]').click();
  await p.waitForTimeout(400);
  ok('A11 More lists it exactly once', (await p.locator('.more-card[href="abg-practice.html"]').count()) === 1);
  ok('A11 under Training', await p.evaluate(() => { const c = document.querySelector('.more-card[href="abg-practice.html"]');
    const list = c && c.closest('.more-list'); const sec = list && list.previousElementSibling; return !!sec && sec.id === 'more-training'; }));
  await ctx.close();
  const sw = await readFile(join(ROOT, 'sw.js'), 'utf8');
  ok('A11 service worker precaches the page', /'\.\/abg-practice\.html'/.test(sw));
  ok('A11 cache version bumped past v42', /amrkc-2026-v(?:4[3-9]|[5-9]\d)/.test(sw)); }

console.log(`\n==== ${pass} passed, ${fail} failed ====`);
if (fails.length) console.log('FAILURES:\n - ' + fails.join('\n - '));
await browser.close(); srv.close();
process.exit(fail ? 1 : 0);
