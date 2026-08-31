/*
 * Homepage — page test
 * --------------------
 * The Field Guide is installed on crew Toughbooks as well as phones, and it no
 * longer asks anyone to sign in. This suite defends both of those:
 *
 *   1. No sign-in. No name field, no employee number, and — the part that
 *      matters most — no code left in the page that posts either to an
 *      external endpoint. A UI that is merely hidden is not removed.
 *   2. It works on the screen it is actually opened on. At Toughbook widths
 *      the single phone column becomes a real grid instead of stretching into
 *      letterbox-shaped tiles, and nothing scrolls sideways at any width.
 *
 * Run:  cd test && npm install && npm test
 */
import http from 'http';
import fs from 'fs';
import { readFile } from 'fs/promises';
import { extname, join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..'); // repo root
const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.png':'image/png','.ico':'image/x-icon','.pdf':'application/pdf' };

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
const browser = await launch();

let pass = 0, fail = 0; const fails = [];
function ok(name, cond, extra) { if (cond) pass++; else { fail++; fails.push(name + (extra ? ('  [' + extra + ']') : '')); }
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (!cond && extra ? ('  [' + extra + ']') : '')); }

// Screens the app is actually opened on: two Toughbook resolutions, a tablet,
// and a phone.
const SCREENS = [
  ['Toughbook 1366', 1366, 768],
  ['Toughbook 1024', 1024, 768],
  ['tablet 820',      820, 1180],
  ['phone 390',       390,  844],
];

async function home(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/net::ERR/.test(m.text())) errs.push('CONSOLE:' + m.text()); });
  page._errs = errs;
  await page.goto(ORIGIN + '/index.html');
  await page.waitForTimeout(300);
  const gate = page.locator('text=I Understand');
  if (await gate.count()) { await gate.first().click(); await page.waitForTimeout(500); }
  await page.waitForSelector('.mast');
  return page;
}

/* H1 — the sign-in is gone from the page, not just hidden */
{ const p = await home(1366, 768);
  for (const sel of ['#home-lastname-input', '#home-empnum-input', '#home-name-save-btn',
                     '#home-name-edit-btn', '.home-name-form']) {
    ok(`H1 no ${sel}`, (await p.locator(sel).count()) === 0);
  }
  const body = (await p.locator('body').textContent()).toLowerCase();
  for (const phrase of ['set up your field guide', 'save profile', 'employee #', 'welcome back']) {
    ok(`H1 no "${phrase}" copy`, !body.includes(phrase));
  }
  ok('H1 nothing asks for a name', (await p.locator('input[type="text"]').count()) === 0);
  ok('H1 no errors rendering', p._errs.length === 0, p._errs.join('|'));
  await p.context().close(); }

/* H2 — and the code behind it is gone too, including the endpoint it posted to */
{ const src = await readFile(join(ROOT, 'index.html'), 'utf8');
  for (const gone of ['PROFILE_ENDPOINT', 'submitProfile', 'lookupProfile', 'saveProfileRemote',
                      'setProfile', 'clearProfile', 'profileConfigured']) {
    ok(`H2 ${gone} removed from source`, !src.includes(gone));
  }
  // The one that actually mattered: names and employee numbers were POSTed to
  // an Apps Script. Nothing on the homepage should reach that host any more.
  ok('H2 no Apps Script endpoint left in index.html',
     !/script\.google\.com/.test(src));
  ok('H2 no profile record written to storage', !/amrkc_profile/.test(src)); }

/* H3 — the masthead is there, and its numbers come from the real data */
{ const p = await home(1366, 768);
  ok('H3 masthead renders', await p.locator('.mast').isVisible());
  ok('H3 it names the guide', /Field Guide/.test(await p.locator('.mast-title').textContent()));
  ok('H3 it names the medical director',
     /Deshmukh/.test(await p.locator('.mast-sub').textContent()));

  const facts = await p.locator('.mast-fact').evaluateAll(els =>
    els.map(e => ({ n: e.querySelector('b').textContent.trim(),
                    l: e.querySelector('span').textContent.trim() })));
  ok('H3 four facts shown', facts.length === 4, JSON.stringify(facts));

  // These must be counted from the loaded data, not typed into the markup —
  // a hand-written "21 medications" goes stale the first time the formulary changes.
  const real = await p.evaluate(() => ({
    drugs: D.formulary.length,
    hosp: D.hosp_meds.length,
    doors: typeof PCS_DATA !== 'undefined' ? PCS_DATA.length : 0,
  }));
  const byLabel = (l) => (facts.find(f => f.l === l) || {}).n;
  ok('H3 medication count matches the formulary',
     byLabel('MEDICATIONS') === String(real.drugs), byLabel('MEDICATIONS') + ' vs ' + real.drugs);
  ok('H3 infusion count matches the hospital meds list',
     byLabel('HOSP INFUSIONS') === String(real.hosp), byLabel('HOSP INFUSIONS') + ' vs ' + real.hosp);
  ok('H3 facility count matches the door-code data',
     byLabel('FACILITIES') === String(real.doors), byLabel('FACILITIES') + ' vs ' + real.doors);
  ok('H3 the counts are non-trivial', real.drugs > 5 && real.hosp > 5 && real.doors > 5,
     JSON.stringify(real));
  await p.context().close(); }

/* H4 — it lays out for the screen it is opened on */
for (const [label, w, h] of SCREENS) {
  const p = await home(w, h);
  const m = await p.evaluate(() => {
    const cols = (sel) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el).gridTemplateColumns.split(' ').length : 0;
    };
    const lv = document.getElementById('lv').getBoundingClientRect();
    return {
      qa: cols('.qa-grid'), stat: cols('.stat-strip'),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      lvWidth: Math.round(lv.width),
      height: document.body.scrollHeight,
    };
  });
  ok(`H4 ${label}: no sideways scroll`, m.overflow <= 0, 'overflow=' + m.overflow);
  if (w >= 760) {
    ok(`H4 ${label}: quick actions go multi-column`, m.qa >= 3, m.qa + ' columns');
    ok(`H4 ${label}: stat tiles go multi-column`, m.stat >= 3, m.stat + ' columns');
    // Below the 1180px cap there is nothing to cap, so only assert the cap
    // itself — and that it actually bites on a screen wider than it.
    ok(`H4 ${label}: content never exceeds the 1180px cap`,
       m.lvWidth <= 1180, m.lvWidth + 'px of ' + w);
    if (w > 1180) {
      ok(`H4 ${label}: wide screen is capped, not stretched edge to edge`,
         m.lvWidth < w, m.lvWidth + 'px of ' + w);
    }
  } else {
    ok(`H4 ${label}: stays two-up on a phone`, m.qa === 2, m.qa + ' columns');
  }
  ok(`H4 ${label}: no errors`, p._errs.length === 0, p._errs.join('|'));
  await p.context().close();
}

/* H5 — the featured trainings sit side by side once there is room for them */
{ const wide = await home(1366, 768);
  const pos = await wide.locator('.feat-card').evaluateAll(els =>
    els.map(e => Math.round(e.getBoundingClientRect().top)));
  ok('H5 both featured panels render', pos.length === 2, JSON.stringify(pos));
  ok('H5 they share a row on a Toughbook', pos.length === 2 && pos[0] === pos[1], JSON.stringify(pos));
  await wide.context().close();

  const narrow = await home(390, 844);
  const stacked = await narrow.locator('.feat-card').evaluateAll(els =>
    els.map(e => Math.round(e.getBoundingClientRect().top)));
  ok('H5 they stack on a phone', stacked.length === 2 && stacked[0] !== stacked[1],
     JSON.stringify(stacked));
  await narrow.context().close(); }

/* H6 — the things a crew opens are still one tap away */
{ const p = await home(1366, 768);
  for (const [label, sel] of [
    ['Alaris training',  '.feat-card[href="alaris-pump.html"]'],
    ['Medication Math',  '.feat-card[href="med-math.html"]'],
    ['dose calculator',  '.qa-tile[data-goto="calc"]'],
    ['hospital meds',    '.qa-tile[data-goto="hosp"]'],
    ['formulary',        '.qa-tile[data-goto="formulary"]'],
    ['ventilator',       '.qa-tile[data-goto="vent"]'],
    ['door codes',       '.qa-tile[data-goto="pcs"]'],
    ['More',             '.qa-tile[data-goto="more"]'],
  ]) {
    ok(`H6 ${label} is on the homepage`, (await p.locator(sel).count()) === 1);
  }
  // And the search still works, since it is the fastest route to a dose.
  await p.fill('#srch', 'adenosine');
  await p.waitForTimeout(400);
  ok('H6 search still returns results',
     (await p.locator('#lv').textContent()).toLowerCase().includes('adenosine'));
  await p.context().close(); }

/* H7 — installed devices get the new homepage */
{ const sw = await readFile(join(ROOT, 'sw.js'), 'utf8');
  ok('H7 cache version bumped past v11', /amrkc-2026-v(?:1[2-9]|[2-9]\d)/.test(sw),
     (sw.match(/amrkc-2026-v\d+/) || [])[0]);
  ok('H7 the homepage is still precached', /'\.\/index\.html'/.test(sw)); }

console.log(`\n==== ${pass} passed, ${fail} failed ====`);
if (fails.length) console.log('FAILURES:\n - ' + fails.join('\n - '));
await browser.close(); srv.close();
process.exit(fail ? 1 : 0);
