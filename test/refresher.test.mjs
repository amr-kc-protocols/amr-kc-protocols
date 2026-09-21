/*
 * Refresher sign-up banner — page test
 * ------------------------------------
 * The home screen advertises the National Registry Refresher. The banner is
 * time-boxed: it appears now, counts down to the first session, tracks the
 * next class night once the course is running, and then stops rendering after
 * the last session.
 *
 * That last part is the reason this suite exists. The Field Guide is a PWA
 * installed on crew phones and Toughbooks and used offline, so a sign-up link
 * left on the home screen after the course has ended is not a cosmetic
 * problem — it is a dead link in the most prominent slot on the app, and
 * nobody gets a reminder to take it down. The expiry is the feature.
 *
 * `refresherCard(now)` takes its clock as an argument so the whole lifecycle
 * can be exercised without touching the system date.
 *
 * Run:  cd test && node refresher.test.mjs
 */
import http from 'http';
import fs from 'fs';
import { readFile } from 'fs/promises';
import { extname, join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.png':'image/png','.ico':'image/x-icon','.pdf':'application/pdf','.svg':'image/svg+xml','.css':'text/css','.woff2':'font/woff2' };

const srv = http.createServer(async (q, r) => {
  try { const u = decodeURIComponent(q.url.split('?')[0]); const d = await readFile(join(ROOT, u === '/' ? 'index.html' : u));
    r.writeHead(200, { 'content-type': MIME[extname(u)] || 'application/octet-stream' }); r.end(d);
  } catch { r.writeHead(404); r.end('not found'); }
});
await new Promise(r => srv.listen(0, r));
const ORIGIN = `http://localhost:${srv.address().port}`;

async function launch() {
  const envExe = process.env.CHROMIUM_PATH;
  const known = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const exe = envExe || (fs.existsSync(known) ? known : null);
  try { return await chromium.launch(exe ? { executablePath: exe } : {}); }
  catch { return await chromium.launch(); }
}

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? `\n       ${detail}` : ''}`); }
};

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(e.message));
await page.goto(`${ORIGIN}/index.html`, { waitUntil: 'networkidle' });
const gate = page.getByRole('button', { name: /I Understand/i });
if (await gate.count()) { await gate.first().click(); await page.waitForTimeout(250); }

console.log('\nRefresher banner — lifecycle');

// Ask the page to render the card at a given local date.
const at = (iso) => page.evaluate((d) => {
  const p = d.split('-');
  return window.refresherCard(new Date(+p[0], +p[1] - 1, +p[2]));
}, iso);
const whenOf = (h) => { const m = h.match(/rfr-when">([^<]*)</); return m ? m[1] : null; };

const cfg = await page.evaluate(() => window.REFRESHER || null);
ok('the class config is reachable', cfg !== null);

const dayBefore = await at('2026-10-11');
ok('counts down before the first session',
   dayBefore !== '' && /Starts Monday, October 12/.test(whenOf(dayBefore) || ''), whenOf(dayBefore));

const firstNight = await at('2026-10-12');
ok('says "Tonight" on a class night', /Tonight/.test(whenOf(firstNight) || ''), whenOf(firstNight));

const betweenNights = await at('2026-10-13');
ok('points at the next class night mid-week',
   /Next session Wednesday, October 14/.test(whenOf(betweenNights) || ''), whenOf(betweenNights));

const afterWed = await at('2026-10-15');
ok('rolls to the following Monday after Wednesday',
   /Next session Monday, October 19/.test(whenOf(afterWed) || ''), whenOf(afterWed));

const lastNight = await at('2026-11-18');
ok('still shows on the last session', lastNight !== '', 'expected markup on the final night');

ok('takes itself down the day after the last session', (await at('2026-11-19')) === '');
ok('stays down well afterwards', (await at('2027-03-01')) === '');

// A UTC-parsed date string would shift the boundary a day earlier in Kansas City.
ok('boundary is local, not UTC', (await at('2026-11-18')) !== '' && (await at('2026-11-19')) === '');

console.log('\nRefresher banner — on the home screen');
const card = page.locator('.rfr');
ok('one banner renders on the home screen', (await card.count()) === 1);
ok('it links to the sign-up', /signupgenius\.com/.test(await card.getAttribute('href') || ''));
ok('it opens externally without leaking the referrer',
   (await card.getAttribute('target')) === '_blank' &&
   /noopener/.test(await card.getAttribute('rel') || '') &&
   /noreferrer/.test(await card.getAttribute('rel') || ''));
ok('it names the class', /National Registry Refresher/.test(await page.locator('.rfr-title').innerText()));
ok('it gives the nights and times', /Mondays.*Wednesdays.*1700/s.test(await page.locator('.rfr-meta').innerText()));

// It sits between the masthead and the featured training, not below the fold.
const order = await page.evaluate(() => {
  const m = document.querySelector('.mast'), r = document.querySelector('.rfr'), f = document.querySelector('.home-feats');
  if (!m || !r || !f) return null;
  return (m.compareDocumentPosition(r) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 &&
         (r.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
});
ok('it sits between the masthead and the featured training', order === true);

ok('no horizontal scroll at 390px',
   !(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
ok('no page errors', pageErrors.length === 0, pageErrors.join('; '));

await browser.close(); srv.close();
console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
