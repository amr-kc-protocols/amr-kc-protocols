/*
 * Medication Math — page test
 * ---------------------------
 * Drives the real page (med-math.html) in headless Chromium: the topic menu,
 * the quick checks spaced through each topic, and the practice widget.
 *
 * Two checks here matter more than the UI ones:
 *
 *   1. Every problem the practice widget generates is recomputed independently
 *      and compared against the answer the page will grade against. A training
 *      page that teaches the wrong arithmetic is worse than no page.
 *   2. Every dose, cap and concentration the page quotes is traced back to the
 *      formulary in index.html. If the protocol changes, this fails and the
 *      training gets updated with it, instead of quietly teaching last year's
 *      numbers.
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

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..'); // repo root
const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.png':'image/png','.ico':'image/x-icon' };

const srv = http.createServer(async (q, r) => {
  try { const u = decodeURIComponent(q.url.split('?')[0]); const d = await readFile(join(ROOT, u === '/' ? 'index.html' : u));
    r.writeHead(200, { 'content-type': MIME[extname(u)] || 'application/octet-stream' }); r.end(d);
  } catch { r.writeHead(404); r.end('not found'); }
});
await new Promise(r => srv.listen(0, r));
const ORIGIN = `http://localhost:${srv.address().port}`;
const PAGE = ORIGIN + '/med-math.html';

async function launch() {
  const envExe = process.env.CHROMIUM_PATH;
  const known = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const exe = envExe || (fs.existsSync(known) ? known : null);
  try { return await chromium.launch(exe ? { executablePath: exe } : {}); }
  catch { return await chromium.launch(); }
}
const browser = await launch();

let pass = 0, fail = 0; const fails = [];
function ok(name, cond, extra) { if (cond) pass++; else { fail++; fails.push(name + (extra ? ('  [' + extra + ']') : '')); }
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (!cond && extra ? ('  [' + extra + ']') : '')); }

async function fresh(url = PAGE) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/net::ERR/.test(m.text())) errs.push('CONSOLE:' + m.text()); });
  page.on('requestfailed', r => { if (r.url().startsWith(ORIGIN)) errs.push('REQFAIL:' + r.url()); });
  page._errs = errs;
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  return page;
}
const open = (p, id) => p.click(`.topic[data-go="${id}"]`);
const TOPIC_IDS = ['draw','peds','drip','drops','push','fixed','safety','formulas'];
const PRACTICE_IDS = ['draw','peds','drip','drops'];

/* M1 — the menu is a list of questions, and each one opens */
{ const p = await fresh();
  await p.waitForSelector('.hero h1');
  ok('M1 eight topics on the menu', (await p.locator('.topic').count()) === 8);
  ok('M1 progress starts at zero', (await p.locator('#progN').textContent()).trim() === '0 of 8');
  const titles = await p.locator('.topic-q').allTextContents();
  ok('M1 every topic is phrased as a question',
     titles.every(t => t.trim().endsWith('?')), titles.join(' | '));
  for (const id of TOPIC_IDS) {
    await open(p, id);
    ok(`M1 ${id} opens with content`,
       await p.locator('#v-topic').isVisible() &&
       (await p.locator('#tBody').textContent()).trim().length > 100);
    await p.click('#backBtn');
  }
  ok('M1 no errors walking every topic', p._errs.length === 0, p._errs.join('|'));
  await p.context().close(); }

/* M2 — the checks are spaced through a topic, not stacked at the end */
{ const p = await fresh();
  for (const id of TOPIC_IDS) {
    await open(p, id);
    ok(`M2 ${id} has a quick check`, (await p.locator('.qc').count()) >= 1);
    await p.click('#backBtn');
  }
  await open(p, 'peds');
  const order = await p.locator('#tBody > *').evaluateAll(els =>
    els.map(e => e.classList.contains('qc') ? 'CHECK'
                : e.classList.contains('prac') ? 'PRACTICE' : 'content'));
  const firstCheck = order.indexOf('CHECK');
  ok('M2 a check appears before the end of the topic',
     firstCheck > 0 && firstCheck < order.length - 1, order.join(','));
  ok('M2 content follows the first check',
     order.slice(firstCheck + 1).includes('content'), order.join(','));
  await p.context().close(); }

/* M3 — answering a check: marks, explains, locks, completes the topic */
{ const p = await fresh();
  await open(p, 'formulas');
  const qc = p.locator('.qc').first();
  ok('M3 explanation hidden until answered', !(await qc.locator('.qc-exp').isVisible()));
  await qc.locator('.opt').nth(0).click();       // correct answer is B
  ok('M3 wrong pick marked wrong',
     await p.locator('.qc .opt').nth(0).evaluate(e => e.classList.contains('wrong')));
  ok('M3 correct answer revealed on a miss',
     await p.locator('.qc .opt').nth(1).evaluate(e => e.classList.contains('right')));
  ok('M3 answered check is locked', (await p.locator('.qc .opt:not([disabled])').count()) === 0);
  await p.click('#backBtn');
  ok('M3 topic marked done on the menu',
     await p.locator('.topic[data-go="formulas"]').evaluate(e => e.classList.contains('done')));
  ok('M3 progress advances', (await p.locator('#progN').textContent()).trim() === '1 of 8');
  await p.reload();
  ok('M3 progress survives a reload', (await p.locator('#progN').textContent()).trim() === '1 of 8');
  await p.context().close(); }

/* M4 — a topic is done only when ALL its checks are answered */
{ const p = await fresh();
  await open(p, 'peds');
  await p.locator('.qc').nth(0).locator('.opt').nth(1).click();
  await p.click('#backBtn');
  ok('M4 one of two checks does not finish the topic',
     !(await p.locator('.topic[data-go="peds"]').evaluate(e => e.classList.contains('done'))));
  await open(p, 'peds');
  await p.locator('.qc').nth(1).locator('.opt').nth(2).click();
  await p.click('#backBtn');
  ok('M4 both checks finish it',
     await p.locator('.topic[data-go="peds"]').evaluate(e => e.classList.contains('done')));
  await p.context().close(); }

/* M5 — the answer key is well formed across every topic */
{ const p = await fresh();
  let total = 0;
  for (const id of TOPIC_IDS) {
    await open(p, id);
    const n = await p.locator('.qc').count();
    for (let i = 0; i < n; i++) {
      total++;
      const qc = p.locator('.qc').nth(i);
      ok(`M5 ${id} check ${i + 1} has four options`, (await qc.locator('.opt').count()) === 4);
      await qc.locator('.opt').nth(0).click();
      ok(`M5 ${id} check ${i + 1} marks exactly one right`,
         (await p.locator('.qc').nth(i).locator('.opt.right').count()) === 1);
      ok(`M5 ${id} check ${i + 1} explains itself`,
         (await p.locator('.qc').nth(i).locator('.qc-exp').textContent()).trim().length > 50);
    }
    await p.click('#backBtn');
  }
  ok('M5 thirteen checks across the course', total === 13, String(total));
  ok('M5 finishing every check completes the course',
     (await p.locator('#progN').textContent()).trim() === '8 of 8');
  await p.context().close(); }

/* M6 — THE MATH. Every generated problem, recomputed independently. */
{ const p = await fresh();
  const REPS = Number(process.env.MATH_REPS || 40);
  let checked = 0, wrong = [];

  for (const topic of PRACTICE_IDS) {
    await open(p, topic);
    for (let i = 0; i < REPS; i++) {
      const { q, ans } = await p.evaluate(() => {
        const box = document.querySelector('.prac');
        // Keep the <br> breaks as spaces, or the full stop ending one line runs
        // into the next number ("mL).109 kg" reads as 0.109).
        return { q: box.querySelector('.prac-q').innerHTML
                     .replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')
                     .replace(/\s+/g, ' ').trim(),
                 ans: parseFloat(box.getAttribute('data-ans')) };
      });

      let expect = null, m;
      if (topic === 'draw') {
        m = q.match(/reads ([\d.]+) (?:mcg|mg) in ([\d.]+) mL.*?need ([\d.]+) (?:mcg|mg)/);
        if (m) expect = (+m[3]) / (+m[1]) * (+m[2]);
      } else if (topic === 'peds') {
        m = q.match(/([\d.]+) kg child\. (.+?) at ([\d.]+) (?:mg|mcg|mL)\/kg/);
        if (m) {
          const wt = +m[1], name = m[2], per = +m[3];
          const CAPS = { Epinephrine: 0.3, Midazolam: 5, Amiodarone: 300, Ondansetron: 4,
                         Diphenhydramine: 50, Atropine: 0.5, Fentanyl: 50 };
          let v = per * wt;
          for (const [k, c] of Object.entries(CAPS)) if (name.includes(k)) v = Math.min(v, c);
          if (name.includes('Atropine')) v = Math.max(v, 0.1);
          expect = v;
        }
      } else if (topic === 'drip') {
        m = q.match(/([\d.]+) kg patient ordered at ([\d.]+) mcg\/kg\/min/);
        if (m) expect = (+m[2]) * (+m[1]) * 60 / 16;
        else {
          m = q.match(/([\d.]+) kg patient at ([\d.]+) mg\/kg\/hr/);
          if (m) expect = (+m[2]) * (+m[1]);
        }
      } else {
        m = q.match(/(\d+) gtt\/mL.*?at ([\d.]+) mL\/h/);
        if (m) expect = (+m[2]) * (+m[1]) / 60;
      }

      if (expect === null) wrong.push(`[${topic}] unparsed: ${q}`);
      else if (Math.abs(expect - ans) > 1e-9 * Math.max(1, Math.abs(expect)))
        wrong.push(`[${topic}] "${q}" page=${ans} expected=${expect}`);
      checked++;
      await p.click('.prac-again');
    }
    await p.click('#backBtn');
  }
  ok(`M6 every generated problem is arithmetically correct (${checked} checked)`,
     wrong.length === 0, wrong.slice(0, 3).join(' ;; '));
  await p.context().close(); }

/* M7 — the practice widget grades, tolerates rounding, and reshuffles */
{ const p = await fresh();
  await open(p, 'drops');
  const exact = await p.locator('.prac').getAttribute('data-ans');
  await p.fill('.prac-in', exact);
  await p.click('.prac-go');
  ok('M7 the right answer is accepted',
     await p.locator('.prac-verdict').evaluate(e => e.classList.contains('good')));
  ok('M7 the working is shown', await p.locator('.prac-work').isVisible());
  ok('M7 the score updates', /1\/1 right/.test(await p.locator('.prac-score').textContent()));

  await p.click('.prac-again');
  await p.fill('.prac-in', '999999');
  await p.click('.prac-go');
  ok('M7 a wrong answer is marked wrong',
     await p.locator('.prac-verdict').evaluate(e => e.classList.contains('bad')));
  ok('M7 the wrong answer still shows the working', await p.locator('.prac-work').isVisible());
  ok('M7 the score tracks attempts', /1\/2 right/.test(await p.locator('.prac-score').textContent()));

  // Rounding a medic would actually do must not be marked wrong.
  await p.click('.prac-again');
  const a = parseFloat(await p.locator('.prac').getAttribute('data-ans'));
  await p.fill('.prac-in', String(Math.round(a * 100) / 100));
  await p.click('.prac-go');
  ok('M7 sensible rounding is accepted',
     await p.locator('.prac-verdict').evaluate(e => e.classList.contains('good')), 'answer was ' + a);

  // An order-of-magnitude slip must NOT be.
  await p.click('.prac-again');
  const b = parseFloat(await p.locator('.prac').getAttribute('data-ans'));
  await p.fill('.prac-in', String(b * 10));
  await p.click('.prac-go');
  ok('M7 a ten-fold error is rejected',
     await p.locator('.prac-verdict').evaluate(e => e.classList.contains('bad')), 'answer was ' + b);

  // A blank answer should do nothing rather than score a miss.
  await p.click('.prac-again');
  const before = await p.locator('.prac-score').textContent();
  await p.click('.prac-go');
  ok('M7 an empty answer is not graded',
     !(await p.locator('.prac').evaluate(e => e.classList.contains('answered'))) &&
     (await p.locator('.prac-score').textContent()) === before);
  await p.context().close(); }

/* M8 — practice score persists; Enter submits */
{ const p = await fresh();
  await open(p, 'draw');
  await p.fill('.prac-in', await p.locator('.prac').getAttribute('data-ans'));
  await p.press('.prac-in', 'Enter');
  ok('M8 Enter submits the answer',
     await p.locator('.prac').evaluate(e => e.classList.contains('answered')));
  await p.reload();
  await open(p, 'draw');
  ok('M8 the practice score survives a reload',
     /1\/1 right/.test(await p.locator('.prac-score').textContent()));
  await p.context().close(); }

/* M9 — every dose the page quotes still matches the formulary in index.html */
{ const idx = await readFile(join(ROOT, 'index.html'), 'utf8');
  const start = idx.indexOf('const D = {');
  const data = JSON.parse(idx.slice(idx.indexOf('{', start), idx.indexOf('\n', start)).replace(/;$/, ''));
  const drug = (name) => JSON.stringify(data.formulary.find(d => d.name === name) || {});
  const page = await readFile(join(ROOT, 'med-math.html'), 'utf8');

  // [formulary drug, what the page teaches, pattern that must still be in the protocol]
  const CLAIMS = [
    ['Epinephrine 1:1,000 (IM)', 'peds 0.01 mg/kg cap 0.3', /0\.01 mg\/kg IM \(1:1,000\); max 0\.3 mg/],
    ['Midazolam (Versed)',       'peds 0.1 mg/kg cap 5',    /0\.1 mg\/kg IV\/IO; max 5 mg/],
    ['Amiodarone',              'adult 300 fixed, not by weight',
      /300 mg IV\/IO fixed dose \(do NOT calculate weight-based for adults\)/],
    ['Amiodarone',              'peds 5 mg/kg cap 300',    /5 mg\/kg IV\/IO push; max 300 mg/],
    ['Fentanyl Citrate',        'peds cap 50 mcg',         /max 50 mcg/],
    ['Ondansetron (Zofran)',    'peds 0.15 mg/kg cap 4',   /0\.15 mg\/kg IV \(max 4 mg\)/],
    ['Diphenhydramine',         'peds 1 mg/kg cap 50',     /1 mg\/kg IV\/IM; max 50 mg/],
    ['Atropine Sulfate',        'peds 0.02, floor 0.1, cap 0.5',
      /0\.02 mg\/kg; minimum 0\.1 mg; maximum 0\.5 mg/],
    ['Normal Saline 0.9%',      'peds 20 mL/kg',           /20 mL\/kg IV\/IO/],
    ['Adenosine',               'adult 6 then 12',         /6 mg rapid IV push/],
    ['Aspirin',                 'adult 324 chewed',        /324 mg chewed/],
    ['Nitroglycerin',           'adult 0.4 SL',            /0\.4 mg SL every 5 minutes/],
    ['Epinephrine 1:10,000 (IV/IO)', 'push-dose 1 + 9 = 10 mcg/mL',
      /1 mL of 1:10,000 \+ 9 mL NS = 10 mcg\/mL/],
    ['Epinephrine 1:10,000 (IV/IO)', 'push-dose 10–20 mcg', /10–20 mcg IV q1–2 min/],
    ['Ketamine',                'infusion max 8 mg/kg/hr', /maximum 8 mg\/kg\/hr/],
    ['Norepinephrine (Levophed)', 'concentration varies — confirm it',
      /concentration varies — confirm concentration with sending facility/],
  ];
  for (const [name, teaches, pat] of CLAIMS) {
    ok(`M9 protocol still says: ${name} — ${teaches}`, pat.test(drug(name).replace(/\\u2013/g, '–')));
  }
  // And the page must not have drifted off the two concentrations it does the math with.
  ok('M9 page uses the 16 mcg/mL norepi mix the app calculates with', /16 mcg\/mL/.test(page));
  ok('M9 page uses the 60 gtt/mL micro-drip the app calculates with', /60 gtt\/mL/.test(page));
  ok('M9 page tells the reader to read the vial', /Read the vial every time/i.test(page)); }

/* M10 — phone-first, keyboard-operable, survives blocked storage */
{ const p = await fresh();
  let longest = 0, worst = '';
  for (const id of TOPIC_IDS) {
    await open(p, id);
    const of2 = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(`M10 ${id} has no horizontal overflow`, of2 <= 0, 'overflow=' + of2);
    const lens = await p.locator('#tBody p, #tBody li').evaluateAll(els =>
      els.map(e => ({ n: (e.textContent || '').trim().split(/\s+/).length,
                      t: (e.textContent || '').trim().slice(0, 60) })));
    lens.forEach(x => { if (x.n > longest) { longest = x.n; worst = x.t; } });
    await p.click('#backBtn');
  }
  ok('M10 no paragraph runs long for a phone', longest <= 55, longest + ' words: "' + worst + '…"');

  const nonButtons = await p.locator('.topic, .opt, .prac-go, .prac-again')
    .evaluateAll(els => els.filter(e => e.tagName !== 'BUTTON').map(e => e.className));
  ok('M10 every control is a real button', nonButtons.length === 0, nonButtons.join(','));
  await p.locator('.topic').first().focus();
  await p.keyboard.press('Enter');
  ok('M10 a topic opens from the keyboard', await p.locator('#v-topic').isVisible());
  await p.context().close(); }

{ const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await p.addInitScript(() => {
    const boom = () => { throw new Error('storage blocked'); };
    Object.defineProperty(window, 'localStorage', { get: boom, configurable: true });
  });
  await p.goto(PAGE);
  await p.waitForSelector('.hero h1');
  await open(p, 'drops');
  await p.fill('.prac-in', await p.locator('.prac').getAttribute('data-ans'));
  await p.click('.prac-go');
  ok('M10 practice still grades with storage blocked',
     await p.locator('.prac-verdict').evaluate(e => e.classList.contains('good')));
  await p.locator('.qc .opt').first().click();
  ok('M10 checks still answer with storage blocked',
     await p.locator('.qc').first().evaluate(e => e.classList.contains('done')));
  ok('M10 no uncaught error from blocked storage', errs.length === 0, errs.join('|'));
  await ctx.close(); }

/* M11 — reachable from the Field Guide, and precached */
{ const p = await fresh();
  ok('M11 back link returns to the Field Guide',
     (await p.locator('.hdr-back').getAttribute('href')) === 'index.html');
  await p.context().close(); }

{ const p = await fresh(ORIGIN + '/index.html');
  await p.waitForTimeout(400);
  const gate = p.locator('text=I Understand');
  if (await gate.count()) { await gate.first().click(); await p.waitForTimeout(400); }
  const feat = p.locator('.feat-card[href="med-math.html"]');
  ok('M11 home shows the feature panel', (await feat.count()) === 1);
  ok('M11 the panel is flagged new',
     /new training/i.test(await feat.locator('.feat-badge').textContent()));
  const box = await feat.boundingBox();
  ok('M11 the panel sits high on the page', box && box.y < 1200, 'y=' + (box && Math.round(box.y)));
  // Two featured panels now sit together; they must not read as one block.
  const shades = await p.locator('.feat-card').evaluateAll(els =>
    els.map(e => getComputedStyle(e).backgroundImage));
  ok('M11 the two panels are visually distinct',
     shades.length === 2 && shades[0] !== shades[1], shades.length + ' panels');
  await p.evaluate(() => { const b = document.querySelector('[data-goto="more"]'); if (b) b.click(); });
  await p.waitForTimeout(400);
  ok('M11 More lists it exactly once',
     (await p.locator('.more-card[href="med-math.html"]').count()) === 1);
  await p.context().close(); }

{ const sw = await readFile(join(ROOT, 'sw.js'), 'utf8');
  ok('M11 service worker precaches the page', /med-math\.html/.test(sw));
  ok('M11 cache version bumped past v10', /amrkc-2026-v(?:1[1-9]|[2-9]\d)/.test(sw),
     (sw.match(/amrkc-2026-v\d+/) || [])[0]); }

console.log(`\n==== ${pass} passed, ${fail} failed ====`);
if (fails.length) console.log('FAILURES:\n - ' + fails.join('\n - '));
await browser.close(); srv.close();
process.exit(fail ? 1 : 0);
