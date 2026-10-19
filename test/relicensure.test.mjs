/*
 * Kansas license renewal guide — page test
 * ----------------------------------------
 * The guide is read on a phone by first-time renewers, so it has to:
 *   1. load with no errors and never scroll sideways, down to 320px;
 *   2. keep its hours table honest — core topics add up to the core total,
 *      and core + flex match the Kansas totals (28 / 44 / 60);
 *   3. link out only over https, and keep the KBEMS portal link;
 *   4. be reachable from More → Classes & CE and cached for offline use.
 *
 * Run:  cd test && npm install && node relicensure.test.mjs
 */
import http from 'http';
import fs from 'fs';
import { readFile } from 'fs/promises';
import { extname, join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json', '.png':'image/png' };
const srv = http.createServer(async (q, r) => {
  try { const u = decodeURIComponent(q.url.split('?')[0]); const d = await readFile(join(ROOT, u === '/' ? 'index.html' : u));
    r.writeHead(200, { 'content-type': MIME[extname(u)] || 'application/octet-stream' }); r.end(d);
  } catch { r.writeHead(404); r.end('not found'); }
});
await new Promise(r => srv.listen(0, r));
const ORIGIN = `http://localhost:${srv.address().port}`;

const known = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const exe = process.env.CHROMIUM_PATH || (fs.existsSync(known) ? known : null);
let browser;
try { browser = await chromium.launch(exe ? { executablePath: exe } : {}); }
catch { browser = await chromium.launch(); }

let pass = 0, fail = 0; const fails = [];
function ok(name, cond, extra) { if (cond) pass++; else { fail++; fails.push(name + (extra ? '  [' + extra + ']' : '')); }
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (!cond && extra ? '  [' + extra + ']' : '')); }

/* R1 — loads clean and fits the phone */
for (const w of [320, 390, 1024]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(ORIGIN + '/kansas-relicensure.html');
  ok(`R1 no page errors at ${w}`, errs.length === 0, errs.join(' | '));
  const sx = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(`R1 no sideways scroll at ${w}`, sx <= 0, `overflow ${sx}px`);
  await ctx.close();
}

/* R2 — the hours table adds up */
{ const ctx = await browser.newContext({ serviceWorkers: 'block' });
  const p = await ctx.newPage();
  await p.goto(ORIGIN + '/kansas-relicensure.html');
  const rows = await p.evaluate(() => {
    const t = document.querySelector('#hours ~ table.tbl');
    return [...t.querySelectorAll('tr')].slice(1).map(tr => [...tr.cells].map(c => c.textContent.trim()));
  });
  const num = r => r.slice(1).map(Number);
  const topics = rows.slice(0, 6).map(num);
  const core = num(rows.find(r => /core total/i.test(r[0])));
  const flex = num(rows.find(r => /^flex/i.test(r[0])));
  const total = num(rows.find(r => /^total/i.test(r[0])));
  ['EMT', 'AEMT', 'Paramedic'].forEach((lvl, i) => {
    const sum = topics.reduce((a, r) => a + r[i], 0);
    ok(`R2 ${lvl} topics add up to core`, sum === core[i], `${sum} vs ${core[i]}`);
    ok(`R2 ${lvl} core + flex = total`, core[i] + flex[i] === total[i]);
  });
  ok('R2 Kansas totals are 28 / 44 / 60', total.join() === '28,44,60', total.join());

  /* R3 — links */
  const hrefs = await p.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')));
  const ext = hrefs.filter(h => /^[a-z]+:/i.test(h) && !h.startsWith('tel:'));
  ok('R3 every outside link is https', ext.every(h => h.startsWith('https://')), ext.filter(h => !h.startsWith('https://')).join());
  ok('R3 links to the KBEMS portal', hrefs.some(h => h.includes('kemsis.org/lms/public/portal')));
  ok('R3 links back home', hrefs.includes('index.html'));
  const ids = new Set(await p.evaluate(() => [...document.querySelectorAll('[id]')].map(e => e.id)));
  const anchors = hrefs.filter(h => h.startsWith('#'));
  ok('R3 every in-page link has a target', anchors.every(h => ids.has(h.slice(1))), anchors.filter(h => !ids.has(h.slice(1))).join());
  await ctx.close(); }

/* R4 — wired in and cached */
{ const idx = await readFile(join(ROOT, 'index.html'), 'utf8');
  const sw = await readFile(join(ROOT, 'sw.js'), 'utf8');
  ok('R4 linked from the home app', idx.includes("href:'kansas-relicensure.html'"));
  ok('R4 precached for offline', sw.includes("'./kansas-relicensure.html'"));
  ok('R4 cache version bumped past v45', /amrkc-2026-v(?:4[6-9]|[5-9]\d)/.test(sw)); }

/* R5 — the home renewal bar: on Aug 1 – Dec 31, counts down to Dec 1,
   turns late after it, and is gone the rest of the year */
{ const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  await p.goto(ORIGIN + '/index.html');
  const gate = p.locator('text=I Understand');
  if (await gate.count()) await gate.first().click();
  await p.waitForSelector('.mast');
  const card = (y, m, d) => p.evaluate(([y, m, d]) => window.renewalCard(new Date(y, m - 1, d, 12)), [y, m, d]);
  ok('R5 hidden in July', (await card(2026, 7, 31)) === '');
  ok('R5 hidden in January', (await card(2027, 1, 1)) === '');
  ok('R5 shows Aug 1', /due Dec 1/.test(await card(2026, 8, 1)));
  const oct = await card(2026, 10, 19);
  ok('R5 counts down to Dec 1', /<b>43<\/b>/.test(oct) && !/late/.test(oct), oct);
  ok('R5 due today on Dec 1', /due today/.test(await card(2026, 12, 1)));
  const dec2 = await card(2026, 12, 2);
  ok('R5 late from Dec 2', /class="rnw late"/.test(dec2) && /<b>29<\/b>/.test(dec2), dec2);
  ok('R5 links to the guide', /href="kansas-relicensure\.html"/.test(oct));
  // Rendered on the real home screen, above everything but the masthead.
  await p.evaluate(() => { const c = window.renewalCard(new Date(2026, 9, 19, 12));
    document.querySelector('.mast').insertAdjacentHTML('afterend', c.replace('class="rnw"', 'class="rnw" data-probe'));
  });
  const box = await p.locator('[data-probe]').boundingBox();
  ok('R5 the bar stays two lines tall', box && box.height <= 80, box && Math.round(box.height) + 'px');
  await ctx.close(); }

await browser.close(); srv.close();
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) { console.log(fails.map(f => '  - ' + f).join('\n')); process.exit(1); }
