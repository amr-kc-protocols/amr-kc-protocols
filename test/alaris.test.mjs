/*
 * Alaris IV Pump Training — page test
 * -----------------------------------
 * Drives the real page (alaris-pump.html) in headless Chromium: the topic
 * menu, every topic's content, the quick checks spaced through each topic,
 * the tappable pump face, the alarm picker and the handoff checklist —
 * including its localStorage round-trip. Also asserts the page is reachable
 * from the homepage and the More list, since a training page nobody can find
 * is the failure that matters most.
 *
 * Run:  cd test && npm install && npm test
 * All data below is synthetic — nothing here is a real patient or roster record.
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
const PAGE = ORIGIN + '/alaris-pump.html';

// Portable browser launch: honour CHROMIUM_PATH, else this env's pre-installed Chromium, else Playwright default.
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

// The page pulls a webfont from Google and index.html pulls jsPDF from a CDN;
// both are blocked here and neither is this page's logic, so only same-origin
// request failures count against us.
async function fresh(url = PAGE) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
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
const TOPIC_IDS = ['titrate','alarms','bag','piggyback','handoff','limits','transport','safe','buttons'];

/* A1 — the menu is a list of questions, and each one opens */
{ const p = await fresh();
  await p.waitForSelector('.hero h1');
  ok('A1 nine topics on the menu', (await p.locator('.topic').count()) === 9);
  ok('A1 progress starts at zero', (await p.locator('#progN').textContent()).trim() === '0 of 9');

  const titles = await p.locator('.topic-q').allTextContents();
  ok('A1 every topic is phrased as a question', titles.every(t => t.trim().endsWith('?')), titles.join(' | '));

  for (const id of TOPIC_IDS) {
    await open(p, id);
    ok(`A1 ${id} opens`, await p.locator('#v-topic').isVisible() &&
       (await p.locator('#tBody').textContent()).trim().length > 100);
    await p.click('#backBtn');
  }
  ok('A1 back returns to the menu', await p.locator('#v-home').isVisible());
  ok('A1 no errors walking every topic', p._errs.length === 0, p._errs.join('|'));
  await p.context().close(); }

/* A2 — the checks are spaced through a topic, not stacked at the end */
{ const p = await fresh();
  // Every topic carries at least one check.
  for (const id of TOPIC_IDS) {
    await open(p, id);
    ok(`A2 ${id} has a quick check`, (await p.locator('.qc').count()) >= 1);
    await p.click('#backBtn');
  }

  // In a multi-check topic, content must follow the first check — otherwise
  // they are bunched at the bottom, which is what this layout exists to avoid.
  await open(p, 'piggyback');
  ok('A2 piggyback has two checks', (await p.locator('.qc').count()) === 2);
  const order = await p.locator('#tBody > *').evaluateAll(els =>
    els.map(e => e.classList.contains('qc') ? 'CHECK' : 'content'));
  const firstCheck = order.indexOf('CHECK');
  ok('A2 a check appears before the end of the topic',
     firstCheck > 0 && firstCheck < order.length - 1, order.join(','));
  ok('A2 content follows the first check',
     order.slice(firstCheck + 1).includes('content'), order.join(','));
  await p.context().close(); }

/* A3 — answering a check: marks, explains, locks, scores the topic done */
{ const p = await fresh();
  await open(p, 'bag');
  const qc = p.locator('.qc').first();
  ok('A3 explanation hidden until answered', !(await qc.locator('.qc-exp').isVisible()));

  // "bag" has one check; its correct answer is C.
  await qc.locator('.opt').nth(0).click();
  ok('A3 wrong pick marked wrong',
     await p.locator('.qc .opt').nth(0).evaluate(e => e.classList.contains('wrong')));
  ok('A3 correct answer revealed on a miss',
     await p.locator('.qc .opt').nth(2).evaluate(e => e.classList.contains('right')));
  ok('A3 explanation appears', await p.locator('.qc .qc-exp').isVisible());
  ok('A3 answered check is locked', (await p.locator('.qc .opt:not([disabled])').count()) === 0);

  await p.click('#backBtn');
  ok('A3 answering marks the topic done on the menu',
     await p.locator('.topic[data-go="bag"]').evaluate(e => e.classList.contains('done')));
  ok('A3 progress advances', (await p.locator('#progN').textContent()).trim() === '1 of 9');

  await p.reload();
  ok('A3 progress survives a reload', (await p.locator('#progN').textContent()).trim() === '1 of 9');
  await p.context().close(); }

/* A4 — a topic is only done when ALL its checks are answered */
{ const p = await fresh();
  await open(p, 'titrate');
  await p.locator('.qc').nth(0).locator('.opt').nth(1).click();
  await p.click('#backBtn');
  ok('A4 one of two checks does not finish the topic',
     !(await p.locator('.topic[data-go="titrate"]').evaluate(e => e.classList.contains('done'))));
  await open(p, 'titrate');
  await p.locator('.qc').nth(1).locator('.opt').nth(2).click();
  await p.click('#backBtn');
  ok('A4 both checks finish it',
     await p.locator('.topic[data-go="titrate"]').evaluate(e => e.classList.contains('done')));
  await p.context().close(); }

/* A5 — the answer key is well formed across every topic */
{ const p = await fresh();
  let total = 0;
  for (const id of TOPIC_IDS) {
    await open(p, id);
    const n = await p.locator('.qc').count();
    for (let i = 0; i < n; i++) {
      total++;
      const qc = p.locator('.qc').nth(i);
      ok(`A5 ${id} check ${i + 1} has four options`, (await qc.locator('.opt').count()) === 4);
      await qc.locator('.opt').nth(0).click();
      const fresh_qc = p.locator('.qc').nth(i);
      ok(`A5 ${id} check ${i + 1} marks exactly one right`,
         (await fresh_qc.locator('.opt.right').count()) === 1);
      ok(`A5 ${id} check ${i + 1} explains itself`,
         (await fresh_qc.locator('.qc-exp').textContent()).trim().length > 50);
    }
    await p.click('#backBtn');
  }
  ok('A5 fifteen checks across the course', total === 15, String(total));
  ok('A5 finishing every check completes the course',
     (await p.locator('#progN').textContent()).trim() === '9 of 9');
  ok('A5 no errors answering everything', p._errs.length === 0, p._errs.join('|'));
  await p.context().close(); }

/* A6 — the pump face: every control has its own plain-language detail */
{ const p = await fresh();
  await open(p, 'buttons');
  const keys = await p.locator('#module [data-k]').evaluateAll(els => els.map(e => e.getAttribute('data-k')));
  ok('A6 eleven tappable controls', keys.length === 11, keys.join(','));
  const seen = new Set();
  for (const k of keys) {
    await p.click(`#module [data-k="${k}"]`);
    const title = (await p.locator('#pd .pd-t').textContent()).trim();
    ok(`A6 ${k} shows detail and a warning`,
       title.length > 0 &&
       (await p.locator('#pd .pd-b').textContent()).trim().length > 25 &&
       (await p.locator('#pd .pd-w').count()) === 1, title);
    seen.add(title);
    ok(`A6 ${k} is the only highlighted control`, (await p.locator('#module .sel').count()) === 1);
  }
  ok('A6 every control has its own detail', seen.size === keys.length);
  await p.context().close(); }

/* A7 — the alarm picker */
{ const p = await fresh();
  await open(p, 'alarms');
  const n = await p.locator('.acc').count();
  ok('A7 eleven alarms listed', n === 11);
  ok('A7 all closed initially', (await p.locator('.acc.open').count()) === 0);
  await p.locator('.acc').nth(1).click();
  ok('A7 tapped alarm opens', await p.locator('.acc').nth(1).locator('.acc-b').isVisible());
  ok('A7 others stay closed', (await p.locator('.acc.open').count()) === 1);
  await p.locator('.acc').nth(1).click();
  ok('A7 tapping again closes it', (await p.locator('.acc.open').count()) === 0);
  for (let i = 0; i < n; i++) {
    const acc = p.locator('.acc').nth(i);
    ok(`A7 alarm ${i} says what it means`,
       (await acc.locator('.acc-means').textContent()).trim().length > 15);
    ok(`A7 alarm ${i} gives steps to take`, (await acc.locator('.acc-b li').count()) >= 2);
  }
  await p.context().close(); }

/* A8 — handoff checklist counts, persists and resets */
{ const p = await fresh();
  await open(p, 'handoff');
  const total = await p.locator('.ck').count();
  ok('A8 eleven checklist rows', total === 11);
  ok('A8 counter starts empty', (await p.locator('#ckN').textContent()) === `0 / ${total}`);
  await p.locator('.ck').nth(0).click();
  await p.locator('.ck').nth(5).click();
  ok('A8 counter tracks taps', (await p.locator('#ckN').textContent()) === `2 / ${total}`);
  await p.locator('.ck').nth(0).click();
  ok('A8 tapping again unchecks', (await p.locator('#ckN').textContent()) === `1 / ${total}`);

  await p.reload();
  await open(p, 'handoff');
  ok('A8 checklist survives a reload', (await p.locator('#ckN').textContent()) === `1 / ${total}`);
  await p.click('#ckReset');
  ok('A8 reset clears it', (await p.locator('#ckN').textContent()) === `0 / ${total}`);
  await p.context().close(); }

/* A9 — the course walks forward without going back to the menu */
{ const p = await fresh();
  await open(p, 'titrate');
  for (let i = 0; i < TOPIC_IDS.length - 1; i++) {
    const label = (await p.locator('#nextBtn').textContent()).trim();
    ok(`A9 next button names the topic after ${TOPIC_IDS[i]}`, label.startsWith('Next:'), label);
    await p.click('#nextBtn');
  }
  ok('A9 the last topic offers the way back',
     (await p.locator('#nextBtn').textContent()).includes('Back to all topics'));
  await p.click('#nextBtn');
  ok('A9 and it goes there', await p.locator('#v-home').isVisible());
  await p.context().close(); }

/* A10 — works with localStorage blocked, and from a keyboard */
{ const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await p.addInitScript(() => {
    const boom = () => { throw new Error('storage blocked'); };
    Object.defineProperty(window, 'localStorage', { get: boom, configurable: true });
  });
  await p.goto(PAGE);
  await p.waitForSelector('.hero h1');
  await open(p, 'handoff');
  await p.locator('.ck').nth(0).click();
  ok('A10 checklist still toggles with storage blocked',
     (await p.locator('#ckN').textContent()) === '1 / 11');
  await p.locator('.qc .opt').nth(2).click();
  ok('A10 checks still answer with storage blocked',
     await p.locator('.qc').first().evaluate(e => e.classList.contains('done')));
  ok('A10 no uncaught error from blocked storage', errs.length === 0, errs.join('|'));
  await ctx.close(); }

{ const p = await fresh();
  const nonButtons = await p.locator('.topic, .ck, .acc-h, .opt, .key, .led, .disp, .chid')
    .evaluateAll(els => els.filter(e => e.tagName !== 'BUTTON').map(e => e.className));
  ok('A10 every control is a real button', nonButtons.length === 0, nonButtons.join(','));

  await p.locator('.topic').first().focus();
  await p.keyboard.press('Enter');
  ok('A10 a topic opens from the keyboard', await p.locator('#v-topic').isVisible());
  await p.locator('.qc .opt').first().focus();
  await p.keyboard.press('Enter');
  ok('A10 a check answers from the keyboard',
     await p.locator('.qc').first().evaluate(e => e.classList.contains('done')));
  await p.context().close(); }

/* A11 — it reads on a phone, and the text stays short */
{ const p = await fresh();
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok('A11 menu has no horizontal overflow at 390px', overflow <= 0, 'overflow=' + overflow);

  // Phone-sized copy: no wall-of-text paragraphs anywhere in the course.
  let longest = 0, worst = '';
  for (const id of TOPIC_IDS) {
    await open(p, id);
    const of2 = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(`A11 ${id} has no horizontal overflow`, of2 <= 0, 'overflow=' + of2);
    const lens = await p.locator('#tBody p, #tBody li').evaluateAll(els =>
      els.map(e => ({ n: (e.textContent || '').trim().split(/\s+/).length, t: (e.textContent||'').trim().slice(0,60) })));
    lens.forEach(x => { if (x.n > longest) { longest = x.n; worst = x.t; } });
    await p.click('#backBtn');
  }
  ok('A11 no paragraph runs long for a phone', longest <= 55, longest + ' words: "' + worst + '…"');
  await p.context().close(); }

/* A12 — reachable from the Field Guide, and precached for a dead-signal bedside */
{ const p = await fresh();
  ok('A12 back link returns to the Field Guide',
     (await p.locator('.hdr-back').getAttribute('href')) === 'index.html');
  await p.context().close(); }

{ const p = await fresh(ORIGIN + '/index.html');
  await p.waitForTimeout(400);
  const gate = p.locator('text=I Understand');
  if (await gate.count()) { await gate.first().click(); await p.waitForTimeout(400); }

  // Several trainings share the featured-panel treatment, so target this one.
  const feat = p.locator('.feat-card[href="alaris-pump.html"]');
  ok('A12 home shows the feature card', (await feat.count()) === 1);
  ok('A12 feature card is flagged new',
     /new training/i.test(await feat.locator('.feat-badge').textContent()));
  const box = await feat.boundingBox();
  ok('A12 feature card sits high on the page', box && box.y < 700, 'y=' + (box && Math.round(box.y)));

  await p.evaluate(() => { const b = document.querySelector('[data-goto="more"]'); if (b) b.click(); });
  await p.waitForTimeout(400);
  ok('A12 More lists the training exactly once',
     (await p.locator('.more-card[href="alaris-pump.html"]').count()) === 1);
  await p.context().close(); }

{ const sw = await readFile(join(ROOT, 'sw.js'), 'utf8');
  ok('A12 service worker precaches the training page', /alaris-pump\.html/.test(sw));
  ok('A12 cache version bumped past v9', /amrkc-2026-v(?:[1-9]\d)/.test(sw),
     (sw.match(/amrkc-2026-v\d+/) || [])[0]); }

console.log(`\n==== ${pass} passed, ${fail} failed ====`);
if (fails.length) console.log('FAILURES:\n - ' + fails.join('\n - '));
await browser.close(); srv.close();
process.exit(fail ? 1 : 0);
