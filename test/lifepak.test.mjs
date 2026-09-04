/*
 * LIFEPAK 15 — Rhythm & Electrical Therapy station — page test
 * ------------------------------------------------------------
 * Drives the real page in headless Chromium. The page is one thing: a rhythm
 * on the monitor, name it, then deliver the right electrical therapy on the
 * unit's own keys.
 *
 * Four things are defended harder than the rest, because each of them would be
 * silently wrong rather than visibly broken:
 *
 *   - THE BOUNDARY. The crew own the device; somebody else owns the patient.
 *     Charging, arming SYNC, shocking and pacing are driven through the unit
 *     with the station's own writer stubbed out, and not one field of S may
 *     move. That check is what fails the day somebody makes the shock button
 *     convert the rhythm to make a demo look right.
 *
 *   - EVERY ITEM IS ANSWERABLE. The whole bank is played correctly, item by
 *     item, and every answer must be accepted. A rhythm whose therapy cannot
 *     be delivered on the keys that are on the page is a question with no way
 *     to answer it, and nothing about the page would say so.
 *
 *   - NOTHING SCROLLS, ANYWHERE. This is worked on a phone held sideways and
 *     the answer must never be below the fold. Asserted at five phone sizes,
 *     in both the naming step and the therapy step, because the two steps put
 *     different things in the bar.
 *
 *   - THE HIT AREA, NOT THE BOX. The rocker arrows are 39px boxes whose real
 *     target is a pseudo-element five pixels larger on each side. A test that
 *     read getBoundingClientRect would fail them and one that read the
 *     stylesheet would pass them for the wrong reason; only hit-testing the
 *     page answers.
 *
 * Run:  cd test && npm install && npm test
 * Every patient here is a synthetic teaching case — nothing is a record.
 */
import http from 'http';
import fs from 'fs';
import { readFile } from 'fs/promises';
import { extname, join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.png':'image/png','.ico':'image/x-icon' };

const srv = http.createServer(async (q, r) => {
  try { const u = decodeURIComponent(q.url.split('?')[0]); const d = await readFile(join(ROOT, u === '/' ? 'index.html' : u));
    r.writeHead(200, { 'content-type': MIME[extname(u)] || 'application/octet-stream' }); r.end(d);
  } catch { r.writeHead(404); r.end('not found'); }
});
await new Promise(r => srv.listen(0, r));
const ORIGIN = `http://localhost:${srv.address().port}`;
const PAGE = ORIGIN + '/lifepak-15.html';

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

/* Landscape by default. The station is a landscape drill and says so in
   portrait rather than stacking into something that needs scrolling. */
async function fresh(url = PAGE, w = 844, h = 390) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 1000, hasTouch: w < 1000 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/net::ERR/.test(m.text())) errs.push('CONSOLE:' + m.text()); });
  page.on('requestfailed', r => { if (r.url().startsWith(ORIGIN)) errs.push('REQFAIL:' + r.url()); });
  page._errs = errs;
  await page.goto(url);
  await page.waitForTimeout(600);
  return page;
}
const tap = async (p, id, ms = 200) => { await p.click('#' + id); await p.waitForTimeout(ms); };
/* Switching the unit on is the one thing asked before any rhythm appears. */
const powerUp = async p => { await tap(p, 'kON', 2300); };
/* Answer the naming step correctly, by the name the item carries. */
const nameIt = async p => {
  const n = await p.evaluate(() => RUN.items[RUN.ix].name);
  const found = await p.evaluate(nm => {
    const b = [...document.querySelectorAll('#stnOpts .stnb')].find(x => x.textContent.trim() === nm);
    if (!b) return false; b.click(); return true;
  }, n);
  await p.waitForTimeout(950);
  return found;
};
/* Deliver a therapy the way a learner does: on the keys. */
const deliver = async (p, therapy) => {
  if (therapy === 'defib') { await tap(p, 'kCHARGE', 6200); await tap(p, 'kSHOCK', 500); }
  else if (therapy === 'sync') { await tap(p, 'kSYNC', 250); await tap(p, 'kCHARGE', 6200); await tap(p, 'kSHOCK', 500); }
  else if (therapy === 'pace') { await tap(p, 'kPACER', 250);
    for (let i = 0; i < 8; i++) await tap(p, 'kCurUp', 70); await p.waitForTimeout(400); }
  else { await p.click('#stnOpts .stnb'); await p.waitForTimeout(400); }
};
const verdict = p => p.evaluate(() => {
  const e = document.getElementById('stnFb');
  return { good: e.classList.contains('good'), bad: e.classList.contains('bad'), txt: e.textContent };
});

/* S1 — the page opens as one thing, asking one question */
{ const p = await fresh();
  const r = await p.evaluate(() => ({
    step: RUN && RUN.step, on: D.on, ask: document.getElementById('stnQ').textContent,
    items: RUN && RUN.items.length, connected: S.patientConnected,
  }));
  ok('S1 it opens in the station, with a run already going', r.step === 'boot' && r.items > 0, JSON.stringify(r));
  ok('S1 the unit is off, the way a crew finds it', r.on === false);
  ok('S1 and the first thing asked is to switch it on', /switch the unit on/i.test(r.ask), r.ask);
  ok('S1 no patient until there is a rhythm to show', r.connected === false);
  ok('S1 no errors on load', p._errs.length === 0, p._errs.join('|'));

  /* One mode means no picker, no brief, no free play and no level select. */
  const gone = await p.evaluate(() => ['ovrLevels', 'ovrBrief', 'ovrFree'].filter(id => document.getElementById(id)));
  ok('S1 nothing is left of the case engine\'s overlays', gone.length === 0, gone.join(','));
  await p.context().close(); }

/* S2 — THE BOUNDARY. The keys do not touch the patient; the station does. */
{ const p = await fresh();
  await powerUp(p);
  await p.evaluate(() => { window.__before = JSON.stringify(S); window.setPatient = () => { window.__wrote = true; }; });
  await tap(p, 'kSYNC', 250);
  await tap(p, 'kEnergyUp', 200); await tap(p, 'kEnergyDn', 200);
  await tap(p, 'kCHARGE', 6300);
  await tap(p, 'kSHOCK', 500);
  await tap(p, 'kPACER', 250);
  for (let i = 0; i < 10; i++) await tap(p, 'kCurUp', 60);
  await tap(p, 'kRateUp', 200);
  const same = await p.evaluate(() => JSON.stringify(S) === window.__before);
  ok('S2 not one field of the patient moved under the whole therapy set', same,
     await p.evaluate(() => { const b = JSON.parse(window.__before);
       return Object.keys(S).filter(k => JSON.stringify(S[k]) !== JSON.stringify(b[k])).join(','); }));
  ok('S2 the device recorded all of it anyway', await p.evaluate(() => D.log.length > 6));
  ok('S2 the shock was delivered and counted', await p.evaluate(() => D.shocks === 1));
  await p.context().close(); }

/* S3 — EVERY ITEM IS ANSWERABLE. The whole bank, played right, item by item. */
{ const p = await fresh();
  const n = await p.evaluate(() => ITEMS.length);
  ok('S3 the bank covers the ACLS rhythms', n >= 14, String(n));
  await powerUp(p);
  const seen = { defib: 0, sync: 0, pace: 0, none: 0 };
  let done = 0, trouble = [];
  for (let i = 0; i < n; i++) {
    const it = await p.evaluate(() => RUN ? { name: RUN.items[RUN.ix].name, t: RUN.items[RUN.ix].therapy } : null);
    if (!it) break;
    if (!await nameIt(p)) { trouble.push(it.name + ': no answer button'); break; }
    const step = await p.evaluate(() => RUN && RUN.step);
    if (step !== 'treat') { trouble.push(it.name + ': stuck at ' + step); break; }
    await deliver(p, it.t);
    const v = await verdict(p);
    if (!v.good) trouble.push(it.name + ' (' + it.t + '): ' + v.txt.slice(0, 60));
    else { seen[it.t]++; done++; }
    if (!(await p.locator('#stnNext').count())) { trouble.push(it.name + ': no way onward'); break; }
    await p.click('#stnNext'); await p.waitForTimeout(500);
  }
  ok('S3 every rhythm in the bank can be named and treated', trouble.length === 0, trouble.join(' | '));
  ok('S3 all of them were reached', done === n, done + ' of ' + n);
  ok('S3 and all four therapies are exercised',
     seen.defib > 0 && seen.sync > 0 && seen.pace > 0 && seen.none > 0, JSON.stringify(seen));
  ok('S3 the run ends in a summary', await p.locator('#ovrDebrief').isVisible());
  const sum = await p.locator('#ovrDebrief .ovrh').textContent();
  ok('S3 which scores both questions per rhythm', sum.trim() === (n * 2) + ' of ' + (n * 2) + ' correct', sum);
  ok('S3 with nothing to go back over', (await p.locator('#ovrDebrief .dbrow.miss').count()) === 0);
  ok('S3 no errors through the whole bank', p._errs.length === 0, p._errs.join('|'));
  await p.context().close(); }

/* S4 — the wrong answers, which are the whole point of a drill. The two shock
   answers are told apart by whether SYNC was armed, because that is the thing
   crews get wrong and the thing the unit can be asked. */
{ const at = async (find, act, what) => {
    const bank = await (async () => { const q = await fresh();
      const r = await q.evaluate(() => ITEMS.map((x, i) => ({ i: i + 1, name: x.name, t: x.therapy })));
      await q.context().close(); return r; })();
    const item = bank.find(find);
    const p = await fresh(PAGE + '?item=' + item.i);
    await powerUp(p);
    await nameIt(p);
    await act(p);
    await p.waitForTimeout(500);
    const v = await verdict(p);
    ok('S4 ' + what, v.bad, v.good ? 'accepted as correct' : 'no verdict');
    ok('S4 ' + what + ' — and says what it should have been',
       v.bad && /Defibrillation|Synchronized cardioversion|Transcutaneous pacing|No electrical therapy/.test(v.txt),
       v.txt.slice(0, 80));
    await p.context().close();
  };
  await at(x => /Asystole/.test(x.name), p => deliver(p, 'defib'), 'defibrillating asystole is caught');
  await at(x => /Asystole/.test(x.name), p => deliver(p, 'pace'), 'pacing asystole is caught');
  await at(x => x.t === 'sync' && /SVT/.test(x.name), p => deliver(p, 'defib'),
           'an unsynchronized shock on an unstable tachycardia is caught');
  await at(x => x.t === 'defib' && /fibrillation/.test(x.name), p => deliver(p, 'sync'),
           'SYNC armed on VF is caught');
  await at(x => x.t === 'defib' && /fibrillation/.test(x.name), p => deliver(p, 'none'),
           'declining to shock VF is caught');
  await at(x => /Normal sinus/.test(x.name), p => deliver(p, 'defib'),
           'shocking a normal sinus rhythm is caught'); }

/* S5 — naming it wrong is scored too, and the right name is shown */
{ const p = await fresh();
  await powerUp(p);
  const right = await p.evaluate(() => RUN.items[RUN.ix].name);
  await p.evaluate(nm => { const b = [...document.querySelectorAll('#stnOpts .stnb')]
    .find(x => x.textContent.trim() !== nm); b.click(); }, right);
  await p.waitForTimeout(400);
  const marks = await p.evaluate(() => [...document.querySelectorAll('#stnOpts .stnb')]
    .map(b => ({ t: b.textContent.trim(), c: b.className })));
  ok('S5 a wrong name is marked wrong', marks.some(m => /wrong/.test(m.c)));
  ok('S5 and the right one is shown', marks.some(m => /reveal/.test(m.c) && m.t === right), right);
  ok('S5 the miss is recorded', await p.evaluate(() => RUN.misses.length === 1));
  await p.waitForTimeout(1300);
  ok('S5 and it moves on to the therapy anyway', await p.evaluate(() => RUN.step === 'treat'));
  await p.context().close(); }

/* S6 — pacing answers the current, and only where pacing can do anything */
{ const bank = await (async () => { const q = await fresh();
    const r = await q.evaluate(() => ITEMS.map((x, i) => ({ i: i + 1, name: x.name, t: x.therapy })));
    await q.context().close(); return r; })();
  const brady = bank.find(x => x.t === 'pace');
  const p = await fresh(PAGE + '?item=' + brady.i);
  await powerUp(p); await nameIt(p);
  await tap(p, 'kPACER', 250);
  ok('S6 spikes without capture are not an answer',
     await p.evaluate(() => D.pacer && !captured && RUN.step === 'treat'));
  for (let i = 0; i < 6; i++) await tap(p, 'kCurUp', 70);
  ok('S6 60 mA is below this patient\'s threshold',
     await p.evaluate(() => D.pacerMa === 60 && !captured), await p.evaluate(() => String(D.pacerMa)));
  await tap(p, 'kCurUp', 400);
  ok('S6 70 mA captures, at the rate that was dialled in',
     await p.evaluate(() => captured && S.rhythm === 'paced' && S.hr === D.pacerRate));
  ok('S6 and capture is the answer', (await verdict(p)).good);
  await p.context().close(); }

/* S7 — NOTHING SCROLLS. Five phones, both steps, plus the summary. */
const PHONES = [['iPhone SE', 667, 375], ['iPhone 12/13/14', 844, 390],
                ['iPhone 14 Pro Max', 932, 430], ['Pixel 7', 915, 412], ['small Android', 800, 360]];
for (const [name, w, h] of PHONES) {
  const p = await fresh(PAGE, w, h);
  const noScroll = async where => {
    const r = await p.evaluate(() => ({
      y: document.documentElement.scrollHeight - window.innerHeight,
      x: document.documentElement.scrollWidth - window.innerWidth,
      bottom: Math.round(document.getElementById('device').getBoundingClientRect().bottom),
      vh: window.innerHeight,
    }));
    ok(`S7 ${name} — nothing scrolls ${where}`, r.y <= 1 && r.x <= 1, JSON.stringify(r));
    ok(`S7 ${name} — the unit ends at the bottom of the screen ${where}`,
       r.bottom <= r.vh + 1, JSON.stringify(r));
  };
  await noScroll('before it starts');
  await powerUp(p);
  await noScroll('with four names to choose from');
  await nameIt(p);
  await noScroll('on the therapy step');
  await deliver(p, await p.evaluate(() => RUN.items[RUN.ix].therapy));
  await noScroll('with the verdict up');

  /* Everything a thumb lands on, measured by hit-testing rather than by
     reading the box: the rocker arrows are 39px boxes with a larger target. */
  const small = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('#device button,#stnOpts .stnb,#stnFb button,#fgHdr button,#fgHdr a').forEach(el => {
      if (!el.checkVisibility || !el.checkVisibility()) return;
      const b = el.getBoundingClientRect();
      const owns = (x, y) => { const n = document.elementFromPoint(x, y); return !!(n && (n === el || el.contains(n))); };
      const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      if (!owns(cx, cy)) { out.push((el.id || el.textContent.trim().slice(0, 10)) + ' covered'); return; }
      let u = 0; while (u < 12 && owns(cx, cy - b.height / 2 - u - 1)) u++;
      let d = 0; while (d < 12 && owns(cx, cy + b.height / 2 + d + 1)) d++;
      let l = 0; while (l < 12 && owns(cx - b.width / 2 - l - 1, cy)) l++;
      let r2 = 0; while (r2 < 12 && owns(cx + b.width / 2 + r2 + 1, cy)) r2++;
      const t = Math.min(b.width + l + r2, b.height + u + d);
      if (t < 44) out.push((el.id || el.textContent.trim().slice(0, 10)) + ' ' + t.toFixed(0));
    });
    return out;
  });
  ok(`S7 ${name} — every control clears 44pt by real hit area`, small.length === 0, small.join(', '));
  ok(`S7 ${name} — no errors`, p._errs.length === 0, p._errs.join('|'));
  await p.context().close();
}

/* S8 — a whole item played by tapping, on the phone this is for */
for (const [name, w, h] of [['iPhone 14 landscape', 844, 390], ['iPhone SE landscape', 667, 375]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(PAGE); await p.waitForTimeout(700);
  const touch = async sel => {
    const b = await p.locator(sel).boundingBox();
    if (!b) return false;
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    const hit = await p.evaluate(([x, y, s]) => {
      const n = document.elementFromPoint(x, y), el = document.querySelector(s);
      return !!(n && el && (n === el || el.contains(n)));
    }, [x, y, sel]);
    if (!hit) return false;
    await p.touchscreen.tap(x, y);
    return true;
  };
  const trouble = [];
  if (!await touch('#kON')) trouble.push('kON'); await p.waitForTimeout(2300);
  const nm = await p.evaluate(() => RUN.items[RUN.ix].name);
  const optSel = await p.evaluate(n2 => { const bs = [...document.querySelectorAll('#stnOpts .stnb')];
    const i = bs.findIndex(x => x.textContent.trim() === n2); return i < 0 ? null : '#stnOpts .stnb:nth-child(' + (i + 1) + ')'; }, nm);
  if (!optSel || !await touch(optSel)) trouble.push('name'); await p.waitForTimeout(950);
  const t = await p.evaluate(() => RUN.items[RUN.ix].therapy);
  if (t === 'none') { if (!await touch('#stnOpts .stnb')) trouble.push('none'); }
  else if (t === 'pace') { if (!await touch('#kPACER')) trouble.push('kPACER'); await p.waitForTimeout(250);
    for (let i = 0; i < 8; i++) { if (!await touch('#kCurUp')) { trouble.push('kCurUp'); break; } await p.waitForTimeout(80); } }
  else { if (t === 'sync') { if (!await touch('#kSYNC')) trouble.push('kSYNC'); await p.waitForTimeout(250); }
    if (!await touch('#kCHARGE')) trouble.push('kCHARGE'); await p.waitForTimeout(6300);
    if (!await touch('#kSHOCK')) trouble.push('kSHOCK'); }
  await p.waitForTimeout(700);
  ok(`S8 ${name} — every tap landed on the key it aimed at`, trouble.length === 0, trouble.join(', '));
  ok(`S8 ${name} — and the item was answered`, (await verdict(p)).good);
  ok(`S8 ${name} — no errors`, errs.length === 0, errs.join('|'));
  await ctx.close();
}

/* S9 — portrait. Held upright the three things that must be in view together
   cannot be, so it says to turn the phone rather than stacking into a scroll. */
for (const [w, h] of [[390, 844], [375, 667], [820, 1180]]) {
  const p = await fresh(PAGE, w, h);
  const r = await p.evaluate(() => ({
    portrait: document.body.classList.contains('portrait'),
    notice: getComputedStyle(document.getElementById('rotate')).display !== 'none',
    inert: document.getElementById('device').hasAttribute('inert'),
    reachable: (() => { const b = document.getElementById('kSHOCK'); b.focus(); return document.activeElement === b; })(),
    scrolls: document.documentElement.scrollHeight > window.innerHeight + 1,
  }));
  ok(`S9 ${w}x${h} portrait says to turn it`, r.portrait && r.notice, JSON.stringify(r));
  ok(`S9 ${w}x${h} the unit is inert behind the notice`, r.inert && !r.reachable, JSON.stringify(r));
  ok(`S9 ${w}x${h} and nothing scrolls there either`, !r.scrolls);
  await p.context().close();
}

/* S10 — teaching cards, for the keys that are left and no others */
{ const p = await fresh();
  const visible = await p.evaluate(() => [...document.querySelectorAll('#device .k,#device .shock')]
    .filter(e => e.checkVisibility && e.checkVisibility()).map(e => e.id).filter(Boolean));
  const cards = await p.evaluate(() => Object.keys(CARDS));
  ok('S10 the station is down to the therapy keys', visible.length === 9, visible.join(','));
  const orphanKeys = visible.filter(id => !cards.includes(id));
  ok('S10 every key on the page has a card', orphanKeys.length === 0, orphanKeys.join(','));
  const orphanCards = await p.evaluate(() => Object.keys(CARDS).filter(id => {
    const e = document.getElementById(id); return !e || !e.checkVisibility();
  }));
  /* The two rocker halves share their parent's card, so a card per rocker is
     expected; a card for a key that is gone is not. */
  ok('S10 and no card describes a key that was dropped', orphanCards.length === 0, orphanCards.join(','));
  const thin = await p.evaluate(() => Object.entries(CARDS)
    .filter(([, c]) => !c.what || !c.how || !c.watch || c.watch.length < 60).map(([k]) => k));
  ok('S10 every card says what it does, how it is worked and what to watch for', thin.length === 0, thin.join(','));

  await p.click('#btnLearn'); await p.waitForTimeout(200);
  await p.click('#kSHOCK'); await p.waitForTimeout(250);
  ok('S10 learn mode opens the card', await p.locator('#ovrCard').isVisible());
  ok('S10 and does not fire the key', await p.evaluate(() => D.shocks === 0));
  ok('S10 the card is the one that was tapped', (await p.locator('#ovrCard .tckey').textContent()) === 'SHOCK');
  await p.context().close(); }

/* S11 — ANALYZE is gone, and for a reason worth keeping written down: it is a
   working control that answers the question the station is asking. */
{ const p = await fresh();
  const reachable = await p.evaluate(() => ['kANALYZE', 'kCPR', 'kLEAD', 'kSIZE', 'kNIBP', 'kALARMS',
    'k12LEAD', 'kCODESUM', 'kDIAL', 'kHOME']
    .filter(id => { const e = document.getElementById(id); return e && e.checkVisibility && e.checkVisibility(); }));
  ok('S11 nothing that answers or distracts from the question is on the page', reachable.length === 0, reachable.join(','));
  const src = await readFile(join(ROOT, 'lifepak-15.html'), 'utf8');
  ok('S11 the 12-lead renderer went with them', !/function open12Lead/.test(src));
  ok('S11 so did the code summary', !/function buildCodeSummary/.test(src));
  ok('S11 and the page is the smaller for it', src.length < 245000, String(src.length)); }

/* S12 — the numbers, against the manufacturer and the guidelines */
{ const p = await fresh();
  const d = await p.evaluate(() => ({ energies: ENERGIES, pacerRate: D.pacerRate,
    disarm: DISARM_MS, silence: SILENCE_MS }));
  ok('S12 the energy ladder is the unit\'s own',
     JSON.stringify(d.energies) === JSON.stringify(
       [2,3,4,5,6,7,8,9,10,15,20,30,50,70,100,125,150,175,200,225,250,275,300,325,360]));
  ok('S12 it reaches this unit\'s 200-300-360 adult sequence', [200,300,360].every(j => d.energies.includes(j)));
  ok('S12 the pacer starts at the unit\'s 60 PPM default', d.pacerRate === 60, String(d.pacerRate));
  const pace = await p.evaluate(() => { D.on = true; D.pacer = true;
    for (let i = 0; i < 40; i++) nudgeMa(1); const hi = D.pacerMa;
    for (let i = 0; i < 60; i++) nudgeMa(-1); const lo = D.pacerMa;
    for (let i = 0; i < 40; i++) nudgeRate(1); const rHi = D.pacerRate;
    for (let i = 0; i < 60; i++) nudgeRate(-1); return { hi, lo, rHi, rLo: D.pacerRate }; });
  ok('S12 pacing current stops at the unit\'s 0-200 mA', pace.hi === 200 && pace.lo === 0, JSON.stringify(pace));
  ok('S12 pacing rate stays inside the unit\'s 40-170 PPM', pace.rHi <= 170 && pace.rLo >= 40, JSON.stringify(pace));
  ok('S12 the unit disarms after 60 seconds, as the manual says', d.disarm === 60000);

  /* The 2025 guidelines stopped naming doses and defer to the device, so no
     card may quote a fixed joule figure as though the AHA still set one. */
  const src = await readFile(join(ROOT, 'lifepak-15.html'), 'utf8');
  const cards = src.slice(src.indexOf('const CARDS={'), src.indexOf('\nfunction openCard('));
  /* The 2025 guidelines split on doses and the cards have to split with them:
     no named figure for defibrillation, a named one for cardioverting AF or
     flutter. Asserting one rule for both is how the sync card ended up telling
     learners the AHA had stopped naming cardioversion energies. */
  ok('S12 the energy card points at the device rather than a remembered defibrillation dose',
     /defer to the defibrillator manufacturer/.test(cards));
  ok('S12 the sync card carries the 2025 AF and flutter figure',
     /atrial fibrillation and atrial flutter[^]*?200 J or more/.test(cards));
  ok('S12 and does not still say the AHA stopped naming cardioversion energies',
     !/stopped naming cardioversion energies/.test(cards));
  ok('S12 pacing is still placed after atropine', /has not answered atropine/.test(cards));
  ok('S12 pacing asystole is still taught as wrong', /not for asystole/.test(cards));
  ok('S12 SYNC is still ruled out for VF and pulseless VT', /never for VF or pulseless VT/.test(cards));
  await p.context().close(); }

/* S13 — the bank's clinical shape. The same rhythm at different pulses has to
   take different answers, or the station is teaching rhythm-to-therapy lookup
   rather than the decision an ACLS provider actually makes. */
{ const p = await fresh();
  const bank = await p.evaluate(() => ITEMS.map(x => ({ name: x.name, t: x.therapy, why: x.why, ctx: x.context })));
  const byName = {};
  bank.forEach(x => { (byName[x.name] = byName[x.name] || new Set()).add(x.t); });
  const split = Object.entries(byName).filter(([, s]) => s.size > 1);
  ok('S13 at least one rhythm appears with more than one right answer', split.length >= 1,
     JSON.stringify(Object.fromEntries(Object.entries(byName).map(([k, v]) => [k, [...v]]))));
  ok('S13 VT is one of them — pulseless, unstable and stable are three answers',
     (byName['Ventricular tachycardia'] || new Set()).size === 3,
     JSON.stringify([...(byName['Ventricular tachycardia'] || [])]));
  ok('S13 every item explains itself', bank.every(x => x.why && x.why.length > 60));
  ok('S13 and every item gives the context the answer turns on',
     bank.every(x => x.ctx && x.ctx.length > 20));
  const nones = bank.filter(x => x.t === 'none');
  ok('S13 "no electrical therapy" says what the patient does need instead',
     nones.every(x => x.why.length > 80), nones.filter(x => x.why.length <= 80).map(x => x.name).join(','));
  await p.context().close(); }

/* S14 — a run is remembered, and the page survives a device that stores none */
{ const p = await fresh();
  await p.evaluate(() => { best = 88; saveProgress(); });
  await p.reload(); await p.waitForTimeout(600);
  ok('S14 a best score survives a reload', await p.evaluate(() => best === 88));
  await p.context().close(); }

{ const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  await p.goto(PAGE); await p.waitForTimeout(800);
  ok('S14 the station runs with storage blocked', await p.evaluate(() => !!RUN));
  await p.click('#kON'); await p.waitForTimeout(2300);
  ok('S14 and reaches a rhythm', await p.evaluate(() => RUN.step === 'name'));
  ok('S14 with no errors', errs.length === 0, errs.join('|'));
  await ctx.close(); }

/* S15 — ?item= pins the bank to one rhythm, which is how an instructor puts a
   particular one on the screen without working through to it */
{ const p = await fresh(PAGE + '?item=3');
  ok('S15 a deep link opens one rhythm', await p.evaluate(() => RUN.items.length === 1));
  ok('S15 and it is the one asked for', await p.evaluate(() => RUN.items[0] === ITEMS[2]));
  await p.context().close(); }

/* S16 — reachable from the field guide, and installed devices get it */
{ const idx = await readFile(join(ROOT, 'index.html'), 'utf8');
  ok('S16 there is a hero panel and a More entry', (idx.match(/lifepak-15\.html/g) || []).length >= 2);
  ok('S16 the copy describes the station rather than the old case engine',
     /rhythm and electrical therapy station/i.test(idx) && !/11 CASES|3 LEVELS/.test(idx));
  const sw = await readFile(join(ROOT, 'sw.js'), 'utf8');
  ok('S16 the cache version was bumped so installed devices see it',
     /amrkc-2026-v(?:1[3-9]|[2-9]\d)/.test(sw), (sw.match(/amrkc-2026-v\d+/) || [])[0]);
  const p = await fresh(ORIGIN + '/index.html', 1366, 768);
  ok('S16 the link is really on the rendered homepage',
     (await p.locator('a[href="lifepak-15.html"]').count()) >= 1);
  await p.context().close(); }

/* S17 — the tracings carry the findings the items ask about. The rhythm on the
   screen is the question, so each one is sampled the way the sweep samples it
   and measured, rather than eyeballed. */
{ const p = await fresh(PAGE);
  const m = await p.evaluate(() => {
    /* Sample a rhythm at 1 kHz, as deviation from baseline. */
    const trace = (rhythm, hr, secs = 6) => {
      S.patientConnected = true; S.rhythm = rhythm; S.hr = hr;
      D.leadFromPanel = null; S.lead = 'II';
      const out = [];
      for (let i = 0; i < secs * 1000; i++) out.push(sEcg(i / 1000) - 0.5);
      return out;
    };
    /* A pacing spike is not a complex: a deflection that comes and goes inside
       25 ms is the pacemaker firing, and left in it swamps every measurement
       below — it is the tallest thing on a paced strip. */
    const deSpike = v => { const o = v.slice(), th = Math.max(...v.map(Math.abs)) * 0.35;
      let i = 0;
      while (i < o.length) {
        if (Math.abs(o[i]) > th) { let j = i; while (j < o.length && Math.abs(o[j]) > th) j++;
          if (j - i < 25) for (let k = i; k < j; k++) o[k] = 0;
          i = j; } else i++;
      }
      return o; };
    /* QRS duration, in ms: the longest run of fast deflection. Measured on the
       slope rather than the amplitude because a QRS crosses the baseline on its
       way from R to S — an amplitude threshold stops at that crossing and
       reports the R wave alone, which came out the same width for a narrow SVT
       and a wide VT. Gaps up to 25 ms are bridged so the crossing does not end
       the run; the slow ST-T falls below the threshold and is left out. */
    const qrsWidth = (rhythm, hr) => {
      const v = deSpike(trace(rhythm, hr));
      const d = v.map((_, i) => i ? Math.abs(v[i] - v[i - 1]) : 0);
      const th = Math.max(...d) * 0.2;
      let best = 0, i = 0;
      while (i < d.length) {
        if (d[i] > th) { let j = i, gap = 0;
          while (j < d.length && gap < 25) { if (d[j] > th) gap = 0; else gap++; j++; }
          best = Math.max(best, j - i - gap); i = j; } else i++;
      }
      return best;
    };
    /* The longest isoelectric stretch, in ms. "No baseline between complexes"
       is about a segment you could rest a caliper on, not about the instants a
       chaotic trace happens to cross zero. */
    const flat = (rhythm, hr) => { const v = trace(rhythm, hr);
      let best = 0, n = 0;
      for (const x of v) { if (Math.abs(x) < 0.012) { n++; if (n > best) best = n; } else n = 0; }
      return best; };
    const peaks = v => { const hi = Math.max(...v.map(Math.abs)) * 0.6, r = [];
      for (let i = 1; i < v.length - 1; i++)
        if (v[i] > hi && v[i] >= v[i - 1] && v[i] > v[i + 1] && (!r.length || i - r[r.length - 1] > 200)) r.push(i);
      return r; };
    const rr = (rhythm, hr) => { const r = peaks(trace(rhythm, hr, 10)), d = [];
      for (let i = 1; i < r.length; i++) d.push(r[i] - r[i - 1]); return d; };
    return {
      qrsSlow: qrsWidth('nsr', 45), qrsFast: qrsWidth('nsr', 150),
      vt: qrsWidth('vtach', 180), svt: qrsWidth('svt', 200),
      paced: qrsWidth('paced', 72), junctional: qrsWidth('junctional', 44),
      escape: qrsWidth('hb3', 32),
      afRR: rr('afib', 88), nsrRR: rr('nsr', 75),
      flatNsr: flat('nsr', 75), flatFlutter: flat('aflutter', 100), flatVfib: flat('vfib', 0),
      // Complete heart block: the atria are on their own clock, so over 20 s the
      // P count must exceed the QRS count and not be a whole multiple of it.
      hb3P: (() => { const v = trace('hb3', 32, 20);
        let n = 0; for (let i = 1; i < v.length - 1; i++)
          if (v[i] > 0.02 && v[i] < 0.12 && v[i] >= v[i - 1] && v[i] > v[i + 1]) n++;
        return n; })(),
      hb3R: peaks(trace('hb3', 32, 20)).length,
    };
  });
  const spread = d => (Math.max(...d) - Math.min(...d)) / (d.reduce((a, b) => a + b, 0) / d.length);

  ok('S17 the QRS is the same width at 45/min as at 150 — it is not stretched to fill the R-R',
     Math.abs(m.qrsSlow - m.qrsFast) < 20, `${m.qrsSlow} vs ${m.qrsFast} ms`);
  ok('S17 a normal QRS is inside the 120 ms a learner is taught to measure against',
     m.qrsSlow < 120, `${m.qrsSlow} ms`);
  ok('S17 ventricular tachycardia is wide where SVT is narrow, at nearly the same rate',
     m.vt > m.svt * 1.4, `VT ${m.vt} vs SVT ${m.svt} ms`);
  ok('S17 a paced beat is wide too — it is a distractor on the wide-complex items',
     m.paced > m.svt * 1.4, `paced ${m.paced} vs SVT ${m.svt} ms`);
  ok('S17 so is the escape in complete heart block', m.escape > m.svt * 1.4, `${m.escape} ms`);
  ok('S17 junctional escape is narrow, which is what tells it from that block',
     m.junctional < m.escape * 0.7, `junctional ${m.junctional} vs escape ${m.escape} ms`);
  ok('S17 atrial fibrillation is irregularly irregular where sinus rhythm is regular',
     spread(m.afRR) > 0.25 && spread(m.nsrRR) < 0.05,
     `AF ${spread(m.afRR).toFixed(2)}, NSR ${spread(m.nsrRR).toFixed(2)}`);
  ok('S17 flutter leaves no isoelectric segment, where sinus rhythm has a long one',
     m.flatFlutter < 100 && m.flatNsr > 200, `flutter ${m.flatFlutter} ms, NSR ${m.flatNsr} ms`);
  ok('S17 nor does ventricular fibrillation', m.flatVfib < 100, `${m.flatVfib} ms`);
  ok('S17 in complete heart block the P waves outnumber the QRS and are not a multiple of them',
     m.hb3P > m.hb3R && m.hb3P % m.hb3R !== 0, `${m.hb3P} P to ${m.hb3R} QRS`);
  await p.context().close(); }

/* S18 — a laptop. Students open this on a Toughbook as well as a phone, and
   every other scenario here runs at 844x390 with touch emulation on, so a
   mouse and a desktop-sized viewport were being assumed rather than tested. */
{ const SIZES = [[1024, 624, 'CF-31 4:3'], [1366, 640, 'laptop'], [1920, 950, 'FZ-55'], [800, 600, 'half window']];
  for (const [w, h, label] of SIZES) {
    // No isMobile, no hasTouch: a real pointer.
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(PAGE); await p.waitForTimeout(700);
    const r = await p.evaluate(() => {
      const vw = innerWidth, vh = innerHeight;
      const ids = ['kON','kSYNC','kEnergyUp','kEnergyDn','kCHARGE','kSHOCK','kPACER','kRateUp','kRateDn','kCurUp','kCurDn','kPAUSE'];
      const bad = [];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) { bad.push(id + ':missing'); continue; }
        const b = el.getBoundingClientRect();
        if (b.bottom > vh + 0.5 || b.right > vw + 0.5 || b.top < -0.5 || b.left < -0.5) bad.push(id + ':offscreen');
        const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        if (!hit || (hit !== el && !el.contains(hit))) bad.push(id + ':covered');
      }
      return { portrait: document.body.classList.contains('portrait'), bad,
        oy: document.documentElement.scrollHeight - vh, ox: document.documentElement.scrollWidth - vw };
    });
    ok(`S18 ${label} shows the unit rather than the turn-your-phone notice`, !r.portrait);
    ok(`S18 ${label} nothing scrolls`, r.oy <= 0 && r.ox <= 0, `y=${r.oy} x=${r.ox}`);
    ok(`S18 ${label} every therapy key is on screen and clickable`, r.bad.length === 0, r.bad.join(','));
    ok(`S18 ${label} no errors`, errs.length === 0, errs.join('|'));
    await ctx.close();
  }
  /* The chassis stops at the size of the unit it is a picture of: 15.8 x 12.5
     inches, which is 1517 x 1200 CSS px at 96/in. Left uncapped it rendered at
     roughly twice that on a 2160-wide Toughbook. */
  for (const [w, h, capped] of [[844, 390, false], [1366, 640, false], [2160, 1290, true], [2560, 1400, true]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 1000, hasTouch: w < 1000 });
    const p = await ctx.newPage(); await p.goto(PAGE); await p.waitForTimeout(700);
    const d = await p.evaluate(() => { const r = document.getElementById('device').getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), l: Math.round(r.left), r: Math.round(innerWidth - r.right) }; });
    ok(`S18 ${w}x${h} the unit is never larger than the real one`,
       d.w <= 1518 && d.h <= 1201, `${d.w}x${d.h}`);
    if (capped) ok(`S18 ${w}x${h} and is centred once the cap bites`, Math.abs(d.l - d.r) <= 2, `left ${d.l}, right ${d.r}`);
    else ok(`S18 ${w}x${h} still fills the screen, which is what a phone needs`, d.w === w, `${d.w} of ${w}`);
    await ctx.close();
  }

  /* And a whole item played with the mouse, end to end. */
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 640 } });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(PAGE + '?item=1'); await p.waitForTimeout(800);
  await p.click('#kON'); await p.waitForTimeout(2300);
  const named = await p.evaluate(() => {
    const nm = RUN.items[RUN.ix].name;
    const b = [...document.querySelectorAll('#stnOpts .stnb')].find(x => x.textContent.trim() === nm);
    if (!b) return false; b.click(); return true;
  });
  await p.waitForTimeout(950);
  await p.click('#kCHARGE'); await p.waitForTimeout(6200);
  await p.click('#kSHOCK'); await p.waitForTimeout(900);
  const end = await p.evaluate(() => ({ step: RUN.step, shocks: D.shocks,
    good: document.getElementById('stnFb').classList.contains('good') }));
  ok('S18 the naming options are clickable with a mouse', named);
  ok('S18 an item plays through to a verdict on a laptop', end.step === 'done', JSON.stringify(end));
  ok('S18 the shock was delivered by mouse and graded right', end.shocks === 1 && end.good, JSON.stringify(end));
  ok('S18 no errors through the mouse playthrough', errs.length === 0, errs.join('|'));
  await ctx.close(); }

console.log(`\n${pass} passed, ${fail} failed`);
if (fails.length) { console.log('\nFailures:'); fails.forEach(f => console.log(' - ' + f)); }
await browser.close(); srv.close();
process.exit(fail ? 1 : 0);
