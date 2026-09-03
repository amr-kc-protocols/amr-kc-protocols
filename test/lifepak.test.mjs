/*
 * LIFEPAK 15 Simulator — page test
 * --------------------------------
 * Drives the real page (lifepak-15.html) in headless Chromium: the level
 * picker, the walkthrough, the clinical cases, pacing capture, the faults an
 * assessment is supposed to catch, the teaching cards, and the two records
 * that used to be popup windows.
 *
 * Two things here are defended harder than the rest, because they are the two
 * that would be silently wrong:
 *
 *   - THE BOUNDARY. The crew own the device; somebody else owns the patient.
 *     A whole resuscitation is driven through the unit with the trainer's own
 *     writer stubbed out, and not one field of S may move. That check is what
 *     fails the day somebody makes the shock button convert the rhythm to make
 *     a demo look right.
 *
 *   - THE HIT AREA, not the box. Three of this page's controls are 43.5px
 *     boxes at the scale a 1024x768 iPad reaches and are fine, because the
 *     real target is a pseudo-element four pixels larger on each side. A test
 *     that read getBoundingClientRect would fail them and a test that read the
 *     stylesheet would pass them; only hit-testing the page answers.
 *
 * Run:  cd test && npm install && npm test
 * All patients below are synthetic teaching cases — nothing here is a record.
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

/* Landscape by default: the unit is a landscape object and says so in
   portrait rather than rearranging its controls into a column. */
async function fresh(url = PAGE, w = 1180, h = 820) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
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
/* Power the unit up and wait out its self test. */
async function powerUp(p) { await p.click('#kON'); await p.waitForTimeout(1900); }
async function begin(p) { await p.click('#ovrBrief .ovrbtn.go'); await p.waitForTimeout(200); }
/* The dial is a vertical drag, as it is on the unit. */
async function dialTurn(p, dy) {
  const d = await p.locator('#kDIAL').boundingBox();
  await p.mouse.move(d.x + d.width / 2, d.y + d.height / 2);
  await p.mouse.down();
  await p.mouse.move(d.x + d.width / 2, d.y + d.height / 2 + dy, { steps: 10 });
  await p.mouse.up(); await p.waitForTimeout(150);
}

/* L1 — the page comes up, and it comes up asking nothing of anybody */
{ const p = await fresh();
  ok('L1 the level picker is up on arrival', await p.locator('#ovrLevels').isVisible());
  ok('L1 nothing is running until a case is chosen', await p.evaluate(() => RUN === null));
  ok('L1 the unit is off, the way it sits on the shelf', await p.evaluate(() => D.on === false));
  ok('L1 it is wearing the LIFEPAK skin and only that',
     await p.evaluate(() => document.body.classList.contains('lp-skin') && currentSkin === 'lp'));
  const cases = await p.evaluate(() => Object.values(LEVELS).reduce((n, l) => n + l.cases.length, 0));
  ok('L1 every case in every level is on the picker',
     (await p.locator('.lvcard').count()) === cases + 2, cases + ' cases');
  ok('L1 no errors on load', p._errs.length === 0, p._errs.join('|'));
  await p.context().close(); }

/* L2 — every case starts, briefs, and puts its own patient on the screen */
{ const p = await fresh();
  const all = await p.evaluate(() => Object.keys(LEVELS).flatMap(n =>
    LEVELS[n].cases.map((c, i) => ({ n: +n, i, id: c.id, rhythm: c.patient.rhythm }))));
  for (const c of all) {
    await p.evaluate(([n, i]) => startCase(n, i), [c.n, c.i]);
    await p.waitForTimeout(200);
    const briefed = await p.locator('#ovrBrief .ovrh').textContent();
    await begin(p);
    const st = await p.evaluate(() => ({ r: S.rhythm, run: !!RUN, task: document.getElementById('fgTaskText').textContent }));
    ok(`L2 ${c.id} opens with a brief and its own patient`,
       briefed.length > 2 && st.run && st.r === c.rhythm, c.id + ' ' + st.r);
    ok(`L2 ${c.id} asks for something`, (st.task || '').trim().length > 8, st.task);
  }
  ok('L2 no errors walking every case', p._errs.length === 0, p._errs.join('|'));
  await p.context().close(); }

/* L3 — THE BOUNDARY. A whole resuscitation through the device, with the
   trainer's writer stubbed out, must not move one field of the patient. */
{ const p = await fresh();
  await p.evaluate(() => { startCase(2, 0); });
  await begin(p);
  await p.evaluate(() => { window.__before = JSON.stringify(S); window.setPatient = () => { window.__wrote = true; }; });
  await powerUp(p);
  await p.click('#kCPR'); await p.waitForTimeout(200);
  await p.click('#kANALYZE'); await p.waitForTimeout(9000);
  await p.click('#kLEAD'); await p.waitForTimeout(200); await dialTurn(p, 30); await p.locator('#kDIAL').click();
  await p.click('#kSIZE'); await p.waitForTimeout(200); await dialTurn(p, 30); await p.locator('#kDIAL').click();
  await p.click('#kEnergyUp'); await p.waitForTimeout(150);
  await p.click('#kCHARGE'); await p.waitForTimeout(6000);
  await p.click('#kSHOCK'); await p.waitForTimeout(400);
  await p.click('#kSYNC'); await p.waitForTimeout(200);
  await p.click('#kPACER'); await p.waitForTimeout(200);
  await p.click('#kCurUp'); await p.click('#kCurUp'); await p.waitForTimeout(200);
  await p.click('#kALARMS'); await p.waitForTimeout(200);
  await p.click('#kSUN'); await p.waitForTimeout(200);
  await p.click('#kPRINT'); await p.waitForTimeout(200);
  const same = await p.evaluate(() => JSON.stringify(S) === window.__before);
  ok('L3 not one field of the patient moved under a whole resuscitation', same,
     await p.evaluate(() => window.__before === JSON.stringify(S) ? '' :
       Object.keys(S).filter(k => JSON.stringify(S[k]) !== JSON.stringify(JSON.parse(window.__before)[k])).join(',')));
  ok('L3 the device did record all of it', await p.evaluate(() => D.log.length > 10));
  ok('L3 the shock was delivered and counted', await p.evaluate(() => D.shocks === 1));
  await p.context().close(); }

/* L4 — the trainer is the one that moves the patient, on the event a press
   generated. That is a facilitator's job, done in a facilitator's place. */
{ const p = await fresh(PAGE + '?case=vf');
  await begin(p); await powerUp(p);
  await p.click('#kCHARGE'); await p.waitForTimeout(6000);
  await p.click('#kSHOCK'); await p.waitForTimeout(300);
  ok('L4 the rhythm is unchanged the instant the shock lands',
     await p.evaluate(() => S.rhythm === 'vfib'));
  await p.waitForTimeout(2000);
  ok('L4 the case moves on afterwards, as a facilitator would move it',
     await p.evaluate(() => RUN.phase.id === 'shock2'));
  await p.context().close(); }

/* L5 — pacing capture answers the current, and only the current */
{ const p = await fresh(PAGE + '?case=chb');
  await begin(p); await powerUp(p);
  ok('L5 the patient is in complete heart block at 32', await p.evaluate(() => S.rhythm === 'hb3' && S.hr === 32));
  await p.click('#kPACER'); await p.waitForTimeout(200);
  ok('L5 spikes without capture — the pacer is on and the patient has not answered',
     await p.evaluate(() => D.pacer && !captured && S.rhythm === 'hb3'));
  for (let i = 0; i < 6; i++) { await p.click('#kCurUp'); await p.waitForTimeout(50); }
  ok('L5 60 mA is below this patient\'s threshold', await p.evaluate(() => D.pacerMa === 60 && !captured));
  await p.click('#kCurUp'); await p.waitForTimeout(200);
  ok('L5 70 mA captures at the rate that was dialled in',
     await p.evaluate(() => captured && S.rhythm === 'paced' && S.hr === D.pacerRate));
  ok('L5 capture brings a pressure with it', await p.evaluate(() => S.sbp > 80));
  await p.click('#kCurDn'); await p.waitForTimeout(200);
  ok('L5 backing off below the threshold loses capture, and the block comes back',
     await p.evaluate(() => !captured && S.rhythm === 'hb3' && S.hr === 32));
  await p.context().close(); }

/* L6 — pacing does nothing to a rhythm pacing does nothing to */
{ const p = await fresh(PAGE + '?case=vf');
  await begin(p); await powerUp(p);
  await p.click('#kPACER'); await p.waitForTimeout(150);
  for (let i = 0; i < 12; i++) { await p.click('#kCurUp'); await p.waitForTimeout(30); }
  ok('L6 VF does not convert on a current dial',
     await p.evaluate(() => D.pacerMa >= 100 && !captured && S.rhythm === 'vfib'));
  await p.context().close(); }

/* L7 — the faults an assessment exists to catch */
{ const p = await fresh(PAGE + '?case=asystole');
  await begin(p); await powerUp(p);
  await p.click('#kCHARGE'); await p.waitForTimeout(6000);
  await p.click('#kSHOCK'); await p.waitForTimeout(400);
  ok('L7 shocking asystole is caught as a fault',
     await p.evaluate(() => RUN.faults.some(f => f.id === 'shock')));
  ok('L7 and it fails the step that said not to',
     await p.evaluate(() => RUN.hits.noshock === false));
  await p.click('#kPACER'); await p.waitForTimeout(300);
  ok('L7 pacing asystole is caught too',
     await p.evaluate(() => RUN.faults.some(f => f.id === 'pace')));
  await p.evaluate(() => endRun('abandoned')); await p.waitForTimeout(300);
  ok('L7 both faults reach the debrief', (await p.locator('#ovrDebrief .dbrow.miss').count()) >= 3);
  await p.context().close(); }

{ const p = await fresh(PAGE + '?case=svt');
  await begin(p); await powerUp(p);
  await p.click('#kCHARGE'); await p.waitForTimeout(6000);
  await p.click('#kSHOCK'); await p.waitForTimeout(400);
  ok('L7 an unsynchronized shock on a perfusing rhythm is caught',
     await p.evaluate(() => RUN.faults.some(f => f.id === 'unsync')));
  await p.context().close(); }

/* L8 — a step whose phase has moved on is still gradeable inside its window.
   Without this the "compressions back within fifteen seconds" step comes off
   the board a second after the shock and marks down something the learner was
   given no time to do. */
{ const p = await fresh(PAGE + '?case=vf');
  await begin(p); await powerUp(p);
  await p.click('#kCHARGE'); await p.waitForTimeout(6000);
  await p.click('#kSHOCK'); await p.waitForTimeout(2500);
  ok('L8 the case has already moved to the next phase', await p.evaluate(() => RUN.phase.id === 'shock2'));
  await p.click('#kCPR'); await p.waitForTimeout(400);
  ok('L8 compressions still tick the step they belong to', await p.evaluate(() => RUN.hits.cpr === true));
  await p.context().close(); }

/* L9 — the walkthrough walks, and nobody can be stranded on a step */
{ const p = await fresh(PAGE + '?level=1');
  await begin(p);
  ok('L9 the walk starts at the first step', (await p.locator('#fgTick').textContent()).trim().startsWith('0 /'));
  ok('L9 it does not lead with the hint', !(await p.locator('#fgTaskText em').count()));
  await powerUp(p);
  ok('L9 powering on advances it', (await p.locator('#fgTick').textContent()).trim().startsWith('1 /'));
  await p.click('#kALARMS'); await p.waitForTimeout(150);
  await p.click('#kALARMS'); await p.waitForTimeout(250);
  ok('L9 the alarm silence cycle advances it', (await p.locator('#fgTick').textContent()).trim().startsWith('2 /'));
  await p.click('#kLEAD'); await p.waitForTimeout(250);
  ok('L9 LEAD opens a list rather than cycling', await p.evaluate(() => D.menu && D.menu.title === 'LEAD'));
  await dialTurn(p, 40); await p.locator('#kDIAL').click(); await p.waitForTimeout(250);
  ok('L9 picking from it with the dial advances the walk',
     (await p.locator('#fgTick').textContent()).trim().startsWith('3 /'));
  ok('L9 no way out is offered while somebody is making progress', await p.locator('#btnSkip').isHidden());
  await p.evaluate(() => { hintAt = Date.now() - 30000; renderTask(); }); await p.waitForTimeout(150);
  ok('L9 the hint appears for somebody stuck', (await p.locator('#fgTaskText em').count()) === 1);
  ok('L9 and so does a way past it', await p.locator('#btnSkip').isVisible());
  const before = (await p.locator('#fgTick').textContent()).trim();
  await p.click('#btnSkip'); await p.waitForTimeout(200);
  ok('L9 skipping moves on without ticking', (await p.locator('#fgTick').textContent()).trim() !== before);
  await p.evaluate(() => endRun('abandoned')); await p.waitForTimeout(250);
  ok('L9 a skipped step is a miss in the debrief, not a pass',
     (await p.locator('#ovrDebrief .dbrow.miss').count()) >= 1);
  ok('L9 no errors through the walk', p._errs.length === 0, p._errs.join('|'));
  await p.context().close(); }

/* L10 — the speed dial does the half of Table 3-3 that has no menu in it */
{ const p = await fresh(); await p.evaluate(() => { closeAllOverlays(); setPower(true); });
  await p.waitForTimeout(1900);
  ok('L10 nothing is highlighted to begin with', await p.evaluate(() => D.homeSel === -1));
  await dialTurn(p, 40);
  ok('L10 turning the dial moves a highlight across the home screen',
     await p.evaluate(() => D.homeSel >= 0));
  await p.click('#kHOME'); await p.waitForTimeout(200);
  ok('L10 HOME SCREEN clears it', await p.evaluate(() => D.homeSel === -1));
  await p.context().close(); }

/* L11 — teaching cards: one per control, none orphaned, and the mode is a
   mode rather than a second thing the key does */
{ const p = await fresh();
  await p.evaluate(() => closeAllOverlays());
  const orphanControls = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('#device .k,#device .fk,#device .rk,#device .shock,#device .dial').forEach(e => {
      let n = e; while (n && n !== document.body) { if (n.id && CARDS[n.id]) return; n = n.parentElement; }
      out.push(e.id || e.className);
    });
    return out;
  });
  ok('L11 every control on the unit has a card behind it', orphanControls.length === 0, orphanControls.join(','));
  const orphanCards = await p.evaluate(() => Object.keys(CARDS).filter(id => !document.getElementById(id)));
  ok('L11 and no card describes a control that is not there', orphanCards.length === 0, orphanCards.join(','));
  const thin = await p.evaluate(() => Object.entries(CARDS)
    .filter(([, c]) => !c.what || !c.how || !c.watch || c.watch.length < 60).map(([k]) => k));
  ok('L11 every card says what it does, how it is worked, and what to watch for', thin.length === 0, thin.join(','));

  await p.click('#btnLearn'); await p.waitForTimeout(200);
  await p.click('#kSHOCK'); await p.waitForTimeout(250);
  ok('L11 in learn mode a tap opens the card', await p.locator('#ovrCard').isVisible());
  ok('L11 and does not fire the key', await p.evaluate(() => D.shocks === 0));
  ok('L11 the card is the one that was tapped', (await p.locator('#ovrCard .tckey').textContent()) === 'SHOCK');
  await p.click('#ovrCard .ovrbtn'); await p.waitForTimeout(150);
  await p.click('#btnLearn'); await p.waitForTimeout(150);
  ok('L11 the mode says when it is off', !(await p.evaluate(() => document.body.classList.contains('learn'))));
  await p.context().close(); }

/* L12 — the two records. These were popup windows in CES, which on a phone is
   a new tab at best and a silently blocked popup at worst. */
{ const p = await fresh(PAGE + '?case=stemi');
  await begin(p); await powerUp(p);
  const src = await (await readFile(join(ROOT, 'lifepak-15.html'), 'utf8'));
  ok('L12 nothing on this page opens a window', !/window\.open\s*\(\s*['"]/.test(src));
  const open12 = async () => { await p.click('#k12LEAD');
    await p.frameLocator('#ovr12frame').locator('.closebtn').waitFor({ timeout: 8000 }); };
  await open12();
  ok('L12 the 12-lead opens in the page', await p.locator('#ovr12').isVisible());
  const fr = p.frameLocator('#ovr12frame');
  ok('L12 all twelve leads plus the rhythm strip are drawn', (await fr.locator('canvas').count()) === 13);
  ok('L12 it names the rhythm it was acquired on',
     /Inferior Wall STEMI/.test(await fr.locator('#rhythmLabel').textContent()));
  // Its own bar button lives in the framed document and can only reach this
  // one by posting to it — the path that replaced window.close().
  await fr.locator('.closebtn').click(); await p.waitForTimeout(350);
  ok('L12 the acquisition\'s own Close button reaches back out', !(await p.locator('#ovr12').isVisible()));
  ok('L12 there is exactly one Close on the acquisition, not two stacked',
     (await p.locator('#ovr12 .framex').count()) === 0);
  await open12();
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  ok('L12 and Escape', !(await p.locator('#ovr12').isVisible()));
  await p.click('#kCODESUM'); await p.waitForTimeout(700);
  ok('L12 the code summary opens in the page too', await p.locator('#ovrSum').isVisible());
  ok('L12 and carries the run', /LIFEPAK 15/.test(await p.frameLocator('#ovrSumframe').locator('h2').textContent()));
  await p.click('#ovrSum .framex'); await p.waitForTimeout(200);
  ok('L12 no errors around either record', p._errs.length === 0, p._errs.join('|'));
  await p.context().close(); }

/* L13 — free play is the facilitator's side, for one person with nobody to
   run it, and it is the only place the patient can be changed by hand */
{ const p = await fresh(PAGE + '?free');
  ok('L13 free play opens its own panel', await p.locator('#ovrFree').isVisible());
  ok('L13 every rhythm the engine draws is offered',
     (await p.evaluate(() => FP_RHYTHMS.length)) >= 16);
  await p.evaluate(() => fpSet({ rhythm: 'vfib', hr: 0 }));
  ok('L13 setting a rhythm reaches the patient', await p.evaluate(() => S.rhythm === 'vfib'));
  ok('L13 nothing is being graded in free play', await p.evaluate(() => RUN === null));
  await p.context().close(); }

/* L14 — progress, including on a device that refuses to store any */
{ const p = await fresh();
  await p.evaluate(() => { progress.done['2:chb'] = 1; cardsSeen['kSHOCK'] = 1; saveProgress(); });
  await p.reload(); await p.waitForTimeout(700);
  ok('L14 a finished case is remembered', await p.evaluate(() => progress.done['2:chb'] === 1));
  ok('L14 so is a card that has been read', await p.evaluate(() => !!cardsSeen['kSHOCK']));
  ok('L14 and the picker shows it', (await p.locator('.lvcard.done').count()) === 1);
  await p.context().close(); }

{ const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 } });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await p.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  await p.goto(PAGE); await p.waitForTimeout(800);
  ok('L14 the page works with storage blocked', await p.locator('#ovrLevels').isVisible());
  await p.evaluate(() => startCase(2, 0)); await p.waitForTimeout(300);
  ok('L14 and a case still runs', await p.evaluate(() => !!RUN));
  ok('L14 with no errors', errs.length === 0, errs.join('|'));
  await ctx.close(); }

/* L15 — deep links, the way the academy pages link into a single scenario */
{ for (const [q, check, name] of [
    ['?case=svt', () => RUN && RUN.cse.id === 'svt', 'a named case'],
    ['?level=3', () => RUN && RUN.levelNo === 3, 'a level'],
    ['?free', () => RUN === null && S.scenario === 'Free play', 'free play'],
  ]) {
    const p = await fresh(PAGE + q);
    ok('L15 ' + q + ' opens ' + name, await p.evaluate(check));
    await p.context().close();
  }
  const p = await fresh(PAGE + '?case=nonsense');
  ok('L15 a name that means nothing falls back to the picker', await p.locator('#ovrLevels').isVisible());
  await p.context().close(); }

/* L16 — a thumb's minimum, measured by hit-testing rather than by reading the
   box. Three controls here are 43.5px boxes at 1024x768 and are fine: their
   real target is a pseudo-element four pixels larger on every side. */
for (const [w, h, name] of [[1024, 768, 'iPad 9.7 landscape'], [1180, 820, 'iPad Air landscape'], [1366, 1024, 'iPad Pro 12.9']]) {
  const p = await fresh(PAGE, w, h);
  await p.evaluate(() => { closeAllOverlays(); setPower(true); });
  await p.waitForTimeout(1900);
  const small = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('#device button,#device .dial').forEach(el => {
      if (!el.checkVisibility || !el.checkVisibility()) return;
      const b = el.getBoundingClientRect();
      const owns = (x, y) => { const n = document.elementFromPoint(x, y); return !!(n && (n === el || el.contains(n))); };
      const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      if (!owns(cx, cy)) { out.push((el.id || el.className) + ' centre not owned'); return; }
      let up = 0; while (up < 14 && owns(cx, cy - b.height / 2 - up - 1)) up++;
      let dn = 0; while (dn < 14 && owns(cx, cy + b.height / 2 + dn + 1)) dn++;
      let lf = 0; while (lf < 14 && owns(cx - b.width / 2 - lf - 1, cy)) lf++;
      let rt = 0; while (rt < 14 && owns(cx + b.width / 2 + rt + 1, cy)) rt++;
      const t = Math.min(b.width + lf + rt, b.height + up + dn);
      if (t < 44) out.push((el.id || el.className) + ' ' + t.toFixed(1));
    });
    return out;
  });
  ok('L16 ' + name + ' — every control clears 44pt by real hit area', small.length === 0, small.join(', '));
  const fit = await p.evaluate(() => {
    const d = document.getElementById('device').getBoundingClientRect();
    const hh = document.getElementById('fgHdr').getBoundingClientRect().height;
    return { top: d.top, hdr: hh, bottom: d.bottom, vh: window.innerHeight,
             sw: document.documentElement.scrollWidth, iw: window.innerWidth };
  });
  ok('L16 ' + name + ' — the unit clears the page header', fit.top >= fit.hdr - 1, JSON.stringify(fit));
  ok('L16 ' + name + ' — and the whole unit is on the screen', fit.bottom <= fit.vh + 1, JSON.stringify(fit));
  ok('L16 ' + name + ' — no sideways scroll', fit.sw <= fit.iw + 1);
  // A silkscreen that does not fit its key is a control the crew reads wrong.
  // CURRENT is the long one, and in CES it renders as "CURRI".
  // Measured off the rendered text with a Range — reading the computed `font`
  // shorthand gives an empty string whenever font-size is set on its own,
  // which silently measures everything in the body font instead.
  const clipped = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('#device .udlbl').forEach(l => {
      const box = l.getBoundingClientRect().width;
      let need = 0;
      l.childNodes.forEach(n => {
        if (n.nodeType !== 3 || !n.textContent.trim()) return;
        const r = document.createRange(); r.selectNodeContents(n);
        for (const b of r.getClientRects()) need = Math.max(need, b.width);
      });
      if (need > box + 0.5) out.push(l.textContent.trim() + ' needs ' + need.toFixed(1) + ' has ' + box.toFixed(1));
    });
    return out;
  });
  ok('L16 ' + name + ' — every rocker label fits its key', clipped.length === 0, clipped.join('; '));
  await p.context().close();
}

/* L17 — the task line is measured, not assumed. A case whose task wraps has
   to take that room from the unit rather than from the bottom of the screen. */
{ const p = await fresh(PAGE, 820, 620);
  await p.evaluate(() => startCase(1, 0)); await begin(p);
  const r = await p.evaluate(() => {
    const d = document.getElementById('device').getBoundingClientRect();
    const hh = document.getElementById('fgHdr').getBoundingClientRect().height;
    return { top: d.top, hdr: hh, bottom: d.bottom, vh: window.innerHeight };
  });
  ok('L17 a running case still leaves the unit under its own header',
     r.top >= r.hdr - 1 && r.bottom <= r.vh + 1, JSON.stringify(r));
  ok('L17 the header is taller while a case is running', r.hdr > 46, String(r.hdr));
  await p.context().close(); }

/* L18 — portrait. The unit is not rearranged, and covering it is not enough:
   without inert the whole chassis stays in the tab order behind the notice,
   SHOCK included. */
{ const p = await fresh(PAGE, 390, 844);
  ok('L18 portrait is announced rather than laid out',
     await p.evaluate(() => document.body.classList.contains('portrait')));
  ok('L18 the unit is inert behind the notice',
     await p.evaluate(() => document.getElementById('device').hasAttribute('inert')));
  ok('L18 so the keyboard cannot reach SHOCK',
     await p.evaluate(() => { const b = document.getElementById('kSHOCK'); b.focus(); return document.activeElement !== b; }));
  ok('L18 the picker is still readable in portrait', await p.locator('#ovrLevels').isVisible());
  ok('L18 no sideways scroll on a phone',
     await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await p.context().close(); }

/* L19 — nothing of the two-window CES build came across. Any of these left in
   would be a control with a dead path behind it. */
{ const src = await readFile(join(ROOT, 'lifepak-15.html'), 'utf8');
  for (const [pat, what] of [
    [/CESRelay|relay\.js|joinSession/, 'the Supabase relay'],
    [/new BroadcastChannel/, 'the control panel channel'],
    [/control_panel\.html/, 'a link to the control panel'],
    [/localStorage\.getItem\('simState'\)/, "the panel's state snapshot"],
    [/simCmd12Lead/, "the panel's 12-lead command"],
    [/id="skinbar"|setSkin\('zx'\)/, 'the skin switcher'],
  ]) ok('L19 no ' + what + ' left in the page', !pat.test(src), (src.match(pat) || [])[0]);
  ok('L19 the page says where the unit came from', /CES simulator/.test(src));
  ok('L19 and that it is not a medical device', /not a medical device/.test(src)); }

/* L20 — reachable from the field guide, and installed devices get it */
{ const idx = await readFile(join(ROOT, 'index.html'), 'utf8');
  ok('L20 there is a tile on the home screen', /stat-tile[^']*'[^]*?href="lifepak-15\.html"/.test(idx)
     || /href="lifepak-15\.html"/.test(idx));
  ok('L20 and a card in the More list', (idx.match(/lifepak-15\.html/g) || []).length >= 2);
  const sw = await readFile(join(ROOT, 'sw.js'), 'utf8');
  ok('L20 the cache version was bumped so installed devices see it',
     /amrkc-2026-v(?:1[3-9]|[2-9]\d)/.test(sw), (sw.match(/amrkc-2026-v\d+/) || [])[0]);
  const p = await fresh(ORIGIN + '/index.html');
  const href = await p.locator('a[href="lifepak-15.html"]').first();
  ok('L20 the link is really on the rendered homepage', (await p.locator('a[href="lifepak-15.html"]').count()) >= 1);
  await p.context().close(); }

console.log(`\n${pass} passed, ${fail} failed`);
if (fails.length) { console.log('\nFailures:'); fails.forEach(f => console.log(' - ' + f)); }
await browser.close(); srv.close();
process.exit(fail ? 1 : 0);
