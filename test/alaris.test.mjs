/*
 * Alaris IV Pump Training — page test
 * -----------------------------------
 * Drives the real page (alaris-pump.html) in headless Chromium: the tabs, the
 * tappable module panel, the handoff checklist (including its localStorage
 * round-trip), the alarm accordion and the knowledge check. Also asserts the
 * homepage feature card and the More-page entry actually point at the page,
 * since a training page nobody can reach is the failure that matters most.
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
const tab = (p, name) => p.click(`.tab[data-p="${name}"]`);

/* A1 — the page loads and the tabs switch panes */
{ const p = await fresh();
  await p.waitForSelector('.hero h1');
  ok('A1 seven tabs render', (await p.locator('.tab').count()) === 7);
  ok('A1 module pane is the landing pane', await p.locator('#p-panel').isVisible());
  ok('A1 FDA notice is on the landing screen', await p.locator('.notice.danger').first().isVisible());
  for (const name of ['handoff','program','secondary','alarms','transport','quiz']) {
    await tab(p, name);
    ok(`A1 ${name} pane opens`, await p.locator('#p-' + name).isVisible());
  }
  ok('A1 only one pane visible at a time', (await p.locator('.pane.on').count()) === 1);
  await p.context().close(); }

/* A2 — every control on the module panel has detail text behind it */
{ const p = await fresh();
  const keys = await p.locator('#module [data-k]').evaluateAll(els => els.map(e => e.getAttribute('data-k')));
  ok('A2 eleven tappable controls', keys.length === 11, keys.join(','));
  ok('A2 tap hint matches the control count',
     /11 controls/.test(await p.locator('.taphint').textContent()));
  const seen = new Set();
  for (const k of keys) {
    await p.click(`#module [data-k="${k}"]`);
    const title = (await p.locator('#pd .pd-t').textContent()).trim();
    const body = (await p.locator('#pd .pd-b').textContent()).trim();
    const note = await p.locator('#pd .pd-note').count();
    ok(`A2 ${k} shows detail`, title.length > 0 && body.length > 30 && note === 1, title);
    seen.add(title);
    ok(`A2 ${k} is the only highlighted control`, (await p.locator('#module .sel').count()) === 1);
  }
  ok('A2 every control has its own detail', seen.size === keys.length, [...seen].join(' | '));
  ok('A2 no errors driving the panel', p._errs.length === 0, p._errs.join('|'));
  await p.context().close(); }

/* A3 — handoff checklist counts, persists and resets */
{ const p = await fresh(); await tab(p, 'handoff');
  const total = await p.locator('.ck').count();
  ok('A3 eleven checklist rows', total === 11);
  ok('A3 counter starts empty', (await p.locator('#ckCount').textContent()) === `0 / ${total}`);
  await p.locator('.ck').nth(0).click();
  await p.locator('.ck').nth(5).click();
  ok('A3 counter tracks taps', (await p.locator('#ckCount').textContent()) === `2 / ${total}`);
  ok('A3 checked row is marked', await p.locator('.ck').nth(0).evaluate(e => e.classList.contains('on')));
  ok('A3 progress bar advances', /%$/.test(await p.locator('#ckFill').evaluate(e => e.style.width)));
  await p.locator('.ck').nth(0).click();
  ok('A3 tapping again unchecks', (await p.locator('#ckCount').textContent()) === `1 / ${total}`);

  await p.reload(); await tab(p, 'handoff');
  ok('A3 state survives a reload', (await p.locator('#ckCount').textContent()) === `1 / ${total}`);
  await p.click('#ckReset');
  ok('A3 reset clears every row', (await p.locator('#ckCount').textContent()) === `0 / ${total}`);
  await p.reload(); await tab(p, 'handoff');
  ok('A3 reset persists too', (await p.locator('#ckCount').textContent()) === `0 / ${total}`);
  await p.context().close(); }

/* A4 — checklist keeps working when localStorage throws (private browsing) */
{ const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await p.addInitScript(() => {
    const boom = () => { throw new Error('storage blocked'); };
    Object.defineProperty(window, 'localStorage', { get: boom, configurable: true });
  });
  await p.goto(PAGE);
  await p.waitForSelector('.hero h1');
  await tab(p, 'handoff');
  await p.locator('.ck').nth(0).click();
  ok('A4 checklist still toggles with storage blocked',
     (await p.locator('#ckCount').textContent()) === '1 / 11');
  await tab(p, 'quiz');
  await p.locator('.q').nth(0).locator('.opt').nth(1).click();
  ok('A4 quiz still scores with storage blocked',
     (await p.locator('#scoreSlot .score-v').textContent()).trim() === '1 / 12');
  ok('A4 no uncaught error from blocked storage', errs.length === 0, errs.join('|'));
  await ctx.close(); }

/* A5 — alarm accordion opens and closes independently */
{ const p = await fresh(); await tab(p, 'alarms');
  const n = await p.locator('.acc').count();
  ok('A5 seven alarm entries', n === 7);
  ok('A5 all closed initially', (await p.locator('.acc.open').count()) === 0);
  await p.locator('.acc').nth(2).click();
  ok('A5 tapped alarm opens', await p.locator('.acc').nth(2).locator('.acc-b').isVisible());
  ok('A5 others stay closed', (await p.locator('.acc.open').count()) === 1);
  await p.locator('.acc').nth(2).click();
  ok('A5 tapping again closes it', (await p.locator('.acc.open').count()) === 0);
  for (let i = 0; i < n; i++) {
    const body = await p.locator('.acc').nth(i).locator('.acc-b p').allTextContents();
    const [meaning, action] = body.map(t => t.trim());
    ok(`A5 alarm ${i} states what it means`, body.length === 2 && meaning.length > 12, meaning);
    ok(`A5 alarm ${i} states what to do`, body.length === 2 && action.length > 40, action);
  }
  await p.context().close(); }

/* A6 — knowledge check scores, explains, locks and persists */
{ const p = await fresh(); await tab(p, 'quiz');
  const n = await p.locator('.q').count();
  ok('A6 twelve questions', n === 12);
  ok('A6 no score before the first answer', (await p.locator('#scoreSlot .score').count()) === 0);
  ok('A6 explanations hidden until answered', (await p.locator('.q-exp:visible').count()) === 0);

  // Q1's correct answer is B ("Pressing START").
  await p.locator('.q').nth(0).locator('.opt').nth(1).click();
  ok('A6 correct pick marked right',
     await p.locator('.q').nth(0).locator('.opt').nth(1).evaluate(e => e.classList.contains('right')));
  ok('A6 explanation reveals', await p.locator('.q').nth(0).locator('.q-exp').isVisible());
  ok('A6 score counts it', (await p.locator('#scoreSlot .score-v').textContent()).trim() === `1 / ${n}`);

  // Q2's correct answer is C; pick A and confirm the miss is shown, not hidden.
  await p.locator('.q').nth(1).locator('.opt').nth(0).click();
  ok('A6 wrong pick marked wrong',
     await p.locator('.q').nth(1).locator('.opt').nth(0).evaluate(e => e.classList.contains('wrong')));
  ok('A6 correct answer revealed on a miss',
     await p.locator('.q').nth(1).locator('.opt').nth(2).evaluate(e => e.classList.contains('right')));
  ok('A6 a miss does not score', (await p.locator('#scoreSlot .score-v').textContent()).trim() === `1 / ${n}`);

  ok('A6 an answered question is locked',
     (await p.locator('.q').nth(1).locator('.opt:not([disabled])').count()) === 0);
  ok('A6 an unanswered question stays open',
     (await p.locator('.q').nth(2).locator('.opt:not([disabled])').count()) === 4);
  await p.locator('.q').nth(1).locator('.opt').nth(2).click({ force: true }).catch(() => {});
  ok('A6 forcing a click on a locked option changes nothing',
     (await p.locator('#scoreSlot .score-v').textContent()).trim() === `1 / ${n}`);

  await p.reload(); await tab(p, 'quiz');
  ok('A6 results survive a reload', (await p.locator('#scoreSlot .score-v').textContent()).trim() === `1 / ${n}`);
  await p.click('#quizReset');
  ok('A6 start over clears the score', (await p.locator('#scoreSlot .score').count()) === 0);
  ok('A6 start over clears the answers', (await p.locator('.q.done').count()) === 0);
  await p.context().close(); }

/* A7 — the answer key is well formed, and the score agrees with the marking */
{ const p = await fresh(); await tab(p, 'quiz');
  const n = await p.locator('.q').count();

  // Answer every question with option A. Each question then reveals its key,
  // so we can check the key's shape and reconcile it against the score.
  for (let i = 0; i < n; i++) await p.locator('.q').nth(i).locator('.opt').nth(0).click();

  let expected = 0;
  for (let i = 0; i < n; i++) {
    const q = p.locator('.q').nth(i);
    ok(`A7 Q${i + 1} has four options`, (await q.locator('.opt').count()) === 4);
    ok(`A7 Q${i + 1} marks exactly one option correct`, (await q.locator('.opt.right').count()) === 1);
    ok(`A7 Q${i + 1} explains itself`,
       (await q.locator('.q-exp').textContent()).trim().length > 60);
    // Option A was our pick: either it is the right one, or it is the wrong one.
    const pickedRight = await q.locator('.opt').nth(0).evaluate(e => e.classList.contains('right'));
    const pickedWrong = await q.locator('.opt').nth(0).evaluate(e => e.classList.contains('wrong'));
    ok(`A7 Q${i + 1} scores the pick exactly one way`, pickedRight !== pickedWrong);
    if (pickedRight) expected++;
  }
  ok('A7 every question is answered', (await p.locator('.q.done').count()) === n);
  ok('A7 score matches the options marked right',
     (await p.locator('#scoreSlot .score-v').textContent()).trim() === `${expected} / ${n}`,
     'expected ' + expected);
  ok('A7 the key is not all one letter', expected > 0 && expected < n,
     'option A correct on ' + expected + ' of ' + n);
  ok('A7 no errors across the whole quiz', p._errs.length === 0, p._errs.join('|'));
  await p.context().close(); }

/* A8 — the page is reachable from the Field Guide, and reads on a phone */
{ const p = await fresh();
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok('A8 no horizontal overflow at 390px', overflow <= 0, 'overflow=' + overflow);
  ok('A8 back link returns to the Field Guide',
     (await p.locator('.hdr-back').getAttribute('href')) === 'index.html');
  await p.context().close(); }

{ const p = await fresh(ORIGIN + '/index.html');
  await p.waitForTimeout(400);
  const gate = p.locator('text=I Understand');
  if (await gate.count()) { await gate.first().click(); await p.waitForTimeout(400); }

  const feat = p.locator('.feat-card');
  ok('A8 home shows the feature card', (await feat.count()) === 1);
  ok('A8 feature card links to the training',
     (await feat.getAttribute('href')) === 'alaris-pump.html');
  ok('A8 feature card is flagged new',
     /new training/i.test(await p.locator('.feat-badge').textContent()));
  const box = await feat.boundingBox();
  ok('A8 feature card sits high on the page', box && box.y < 700, 'y=' + (box && Math.round(box.y)));

  await p.evaluate(() => { const b = document.querySelector('[data-goto="more"]'); if (b) b.click(); });
  await p.waitForTimeout(400);
  ok('A8 More lists the training exactly once',
     (await p.locator('.more-card[href="alaris-pump.html"]').count()) === 1);
  ok('A8 home has no horizontal overflow',
     (await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0);
  await p.context().close(); }

/* A9b — everything interactive is reachable and operable from a keyboard */
{ const p = await fresh();
  const nonButtons = await p.locator('.tab, .key, .led, .disp, .chid, .ck, .acc-h, .opt')
    .evaluateAll(els => els.filter(e => e.tagName !== 'BUTTON').map(e => e.className));
  ok('A9b every control is a real button', nonButtons.length === 0, nonButtons.join(','));

  await tab(p, 'handoff');
  await p.locator('.ck').nth(0).focus();
  await p.keyboard.press('Enter');
  ok('A9b checklist toggles from the keyboard', (await p.locator('#ckCount').textContent()) === '1 / 11');
  ok('A9b checklist row reports its state to assistive tech',
     (await p.locator('.ck').nth(0).getAttribute('aria-checked')) === 'true');

  await tab(p, 'alarms');
  await p.locator('.acc-h').nth(0).focus();
  await p.keyboard.press('Enter');
  ok('A9b alarm opens from the keyboard', (await p.locator('.acc.open').count()) === 1);
  ok('A9b alarm reports expanded state',
     (await p.locator('.acc-h').nth(0).getAttribute('aria-expanded')) === 'true');
  await p.keyboard.press('Enter');
  ok('A9b alarm collapses and updates its state',
     (await p.locator('.acc.open').count()) === 0 &&
     (await p.locator('.acc-h').nth(0).getAttribute('aria-expanded')) === 'false');

  await tab(p, 'quiz');
  await p.locator('.q').nth(0).locator('.opt').nth(1).focus();
  await p.keyboard.press('Enter');
  ok('A9b quiz answers from the keyboard',
     (await p.locator('#scoreSlot .score-v').textContent()).trim() === '1 / 12');
  ok('A9b no errors driving the page from the keyboard', p._errs.length === 0, p._errs.join('|'));
  await p.context().close(); }

/* A9 — the page is precached, so a crew can open it offline at a bedside */
{ const sw = await readFile(join(ROOT, 'sw.js'), 'utf8');
  ok('A9 service worker precaches the training page', /alaris-pump\.html/.test(sw));
  ok('A9 cache version bumped past v9', /amrkc-2026-v(?:[1-9]\d)/.test(sw),
     (sw.match(/amrkc-2026-v\d+/) || [])[0]); }

console.log(`\n==== ${pass} passed, ${fail} failed ====`);
if (fails.length) console.log('FAILURES:\n - ' + fails.join('\n - '));
await browser.close(); srv.close();
process.exit(fail ? 1 : 0);
