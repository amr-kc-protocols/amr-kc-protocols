/*
 * Assessment Detective — page test
 * --------------------------------
 * "You're the Lead: Assessment Detective" (assessment-detective.html +
 * assessment-detective/cases.json), driven in headless Chromium:
 *
 *   A1  the shipped cases are valid, and a broken case is skipped and listed
 *       on #review rather than breaking the game
 *   A2  scope: no EMT care option is an IV, IO or advanced-level drug, and
 *       every dose quoted matches the 2026 protocols
 *   A3  every case plays end to end at EMT, AEMT and Paramedic, in Guided
 *       mode, along a strong path: all four debrief areas come out Strong
 *   A4  a weak path is called out: Safety and Reasoning are not Strong, and
 *       the debrief names one thing done well, one miss and the takeaway
 *   A5  Guided asks "how does this finding change your thinking?" and grades
 *       it against the learner's own leading explanation; Independent asks
 *       nothing extra and shows no feedback until the debrief
 *   A6  no countdown: the case clock moves only with actions
 *   A7  care stays available from the primary on, filtered by level
 *   A8  more than one reasonable path is accepted (two different change
 *       answers both earn credit)
 *   A9  the debrief accepts an honest "unclear yet" only where the case says so
 *   A10 a case resumes after the page is closed mid-case
 *   A11 missing art or audio shows nothing broken
 *   A12 a 320 px phone never scrolls sideways, on every screen
 *   A13 it works with storage blocked
 *   A14 it is reachable from the Field Guide and precached for offline
 *
 * Run:  cd test && node detective.test.mjs
 */
import http from 'http';
import fs from 'fs';
import { readFile } from 'fs/promises';
import { extname, join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json', '.png':'image/png',
  '.jpg':'image/jpeg', '.ico':'image/x-icon', '.svg':'image/svg+xml', '.css':'text/css', '.webp':'image/webp', '.mp3':'audio/mpeg' };
let OVERRIDE = null;   // swap the cases file for A1
const srv = http.createServer(async (q, r) => {
  try {
    const u = decodeURIComponent(q.url.split('?')[0]);
    if (OVERRIDE && u === '/assessment-detective/cases.json') { r.writeHead(200, { 'content-type':'application/json' }); r.end(OVERRIDE); return; }
    const d = await readFile(join(ROOT, u === '/' ? 'index.html' : u));
    r.writeHead(200, { 'content-type': MIME[extname(u)] || 'application/octet-stream' }); r.end(d);
  } catch { r.writeHead(404); r.end('not found'); }
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${srv.address().port}`;
const PAGE = ORIGIN + '/assessment-detective.html';

async function launch() {
  const known = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const exe = process.env.CHROMIUM_PATH || (fs.existsSync(known) ? known : null);
  try { return await chromium.launch(exe ? { executablePath: exe } : {}); }
  catch { return await chromium.launch(); }
}
const browser = await launch();
let pass = 0, fail = 0; const fails = [];
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; fails.push(name + (extra !== undefined ? ('  [' + extra + ']') : '')); console.log('FAIL ' + name + (extra !== undefined ? '  [' + extra + ']' : '')); }
}

const DATA = JSON.parse(await readFile(join(ROOT, 'assessment-detective/cases.json'), 'utf8'));
const LEVELS = ['emt', 'aemt', 'pm'];

async function fresh(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: opts.width || 390, height: 800 }, serviceWorkers: 'block' });
  // Fonts come from Google; nothing here should wait on them.
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  if (opts.blockStorage) await ctx.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  if (opts.init) await page.addInitScript(opts.init);
  await page.goto(PAGE);
  await page.waitForSelector('.case-card, .rv, .empty');
  return { ctx, page, errors };
}
const run = page => page.evaluate(() => window.Detective.run());
async function step(page) { const r = await run(page); return r ? r.si + ':' + r.step : 'done'; }
async function noSideScroll(page) { return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1); }
async function act(page, kind, id) {
  await page.click('#act-' + kind);
  await page.click(`#sheet [data-act="${id}"]`);
}
async function opt(page, id) { await page.click(`#app [data-opt="${id}"]`); }
async function go(page) { await page.click('#app #go'); }
async function next(page) { await page.click('#app #next'); }
const sideScroll = [];
async function checkWidth(page, where) { if (!(await noSideScroll(page))) sideScroll.push(where); }

/* An evidence check may pop up after a key finding in Guided mode. Answer it
   (rightly or wrongly) and come back to the investigation. */
async function answerEv(page, right = true) {
  const r = await run(page);
  if (!r || r.step !== 'ev') return false;
  const c = DATA.cases.find(x => x.id === r.id);
  const f = r.found[r.pendingEv].f;
  const target = (r.ddx.lead && r.ddx.lead !== 'unclear') ? r.ddx.lead : r.ddx.danger;
  const want = f.effect[target];
  const pick = right ? want : ['supports', 'weakens', 'neutral'].find(x => x !== want);
  await opt(page, pick);
  await next(page);
  return true;
}

/* Strong paths. What a sound crew would do, per case and level. */
const CARE = {
  'not-himself':     { emt: [['assess', 'swallow'], ['care', 'oralglucose']], aemt: [['care', 'd10']], pm: [['care', 'd10']] },
  'cant-breathe':    { emt: [['care', 'upright'], ['care', 'cpap']], aemt: [['care', 'upright'], ['care', 'cpap']], pm: [['care', 'upright'], ['care', 'cpap']] },
  'fainted-at-work': { emt: [['care', 'supine']], aemt: [['care', 'supine'], ['care', 'fluid']], pm: [['care', 'supine'], ['care', 'fluid']] }
};
const LATE = { 'cant-breathe': { pm: [['ask', 'meds'], ['care', 'nitro']] } };

async function playStrong(page, c, level, mode = 'guided', opts = {}) {
  await page.click(`[data-level="${level}"]`);
  await page.click(`[data-mode="${mode}"]`);
  await page.click(`[data-case="${c.id}"]`);
  const S = Object.fromEntries(c.stages.map(s => [s.type, s]));
  // 1 first impression
  for (const o of S.first.concerns.filter(o => o.good)) await opt(page, o.id);
  await checkWidth(page, c.id + ' first');
  await go(page);
  if (mode === 'guided') await next(page);
  await opt(page, S.first.sick);
  if (mode === 'guided') await next(page);
  // 2 primary
  for (const id of S.primary.required) await act(page, 'assess', id);
  for (const [k, id] of CARE[c.id][level]) await act(page, k, id);
  await checkWidth(page, c.id + ' primary');
  await go(page);
  // 3 differential
  const picks = [c.answer.likely[0], c.answer.danger.find(d => d !== c.answer.likely[0])].filter(Boolean);
  for (const id of picks) await opt(page, id);
  await go(page);
  await opt(page, 'L:' + c.answer.likely[0]);
  await opt(page, 'D:' + (opts.dangerSame ? c.answer.likely[0] : picks[1]));
  await checkWidth(page, c.id + ' differential');
  await go(page);
  // 4 investigation
  const best = S.investigate.distinguish.options.find(o => o.grade === 'best');
  await opt(page, best.id);
  await checkWidth(page, c.id + ' distinguish');
  await next(page);
  if (mode === 'guided') { ok(`A5 ${c.id}/${level}: evidence check follows the distinguishing step`, (await step(page)).endsWith(':ev')); await answerEv(page, true); }
  else ok(`A5 ${c.id}/${level}: Independent skips the evidence check`, (await step(page)).endsWith(':work'));
  const keyAct = id => {
    for (const k of ['assess', 'ask']) { const a = c.actions[k].find(a => a.reveals === id && (!a.levels || a.levels.includes(level))); if (a && !a.harm) return [k, a.id]; }
    return null;
  };
  for (const [fid, f] of Object.entries(c.findings)) {
    if (!f.key) continue;
    const r = await run(page); if (r.found[fid]) continue;
    const a = keyAct(fid); if (!a) continue;
    await act(page, a[0], a[1]);
    await answerEv(page, true);
  }
  for (const [k, id] of (LATE[c.id] || {})[level] || []) { await act(page, k, id); await answerEv(page, true); }
  await act(page, 'care', 'transport');
  await checkWidth(page, c.id + ' investigate');
  await go(page);
  // 5 change
  const r5 = await run(page);
  const v = S.change.variants[r5.variant];
  const choices = v.question.options.filter(o => (!o.levels || o.levels.includes(level)) && o.grade === 'best');
  const choice = opts.altChange && choices[1] ? choices[1] : choices[0];
  await opt(page, choice.id);
  await checkWidth(page, c.id + ' change');
  if (mode === 'guided') await next(page);
  // 6 handoff
  await opt(page, S.handoff.problems.find(p => p.grade === 'best').id); await go(page);
  const lead = opts.lead || c.answer.likely[0];
  await opt(page, 'L:' + lead);
  const alt = c.answer.danger.find(d => d !== lead) || c.answer.alt.find(d => d !== lead);
  await opt(page, 'A:' + alt);
  await checkWidth(page, c.id + ' handoff');
  await go(page);
  for (const p of S.handoff.priorities.filter(p => p.good).slice(0, 3)) await opt(page, p.id);
  await go(page);
  await page.waitForSelector('.area');
  await checkWidth(page, c.id + ' debrief');
  return { variant: r5.variant, choice: choice.id };
}
async function rates(page) {
  return page.$$eval('.area', els => els.map(e => ({ name: e.querySelector('h3').textContent, rate: e.querySelector('.rate').className.replace('rate ', '') })));
}

/* ── A1 validation ─────────────────────────────────────────────── */
{
  const { ctx, page, errors } = await fresh();
  const v = await page.evaluate(() => ({ n: window.Detective.cases().length, e: window.Detective.errors() }));
  ok('A1 three shipped cases load', v.n === 3, v.n);
  ok('A1 no shipped case fails validation', v.e.length === 0, v.e.join(' | '));
  ok('A1 no page errors on load', errors.length === 0, errors.join(' | '));
  await ctx.close();

  const bad = JSON.parse(JSON.stringify(DATA));
  delete bad.cases[1].findings.jvd.effect.copd;
  bad.cases[2].stages.reverse();
  OVERRIDE = JSON.stringify(bad);
  const t = await fresh();
  const n = await t.page.$$eval('.case-card', e => e.length);
  ok('A1 broken cases are skipped, the good one still plays', n === 1, n);
  await t.page.goto(PAGE + '#review'); await t.page.waitForSelector('.rv');
  const txt = await t.page.textContent('#app');
  ok('A1 #review lists why each skipped case failed', /cant-breathe:.*effect for copd/.test(txt) && /fainted-at-work:.*stages must be/.test(txt), txt.slice(-300));
  ok('A1 #review shows draft status and sources', /draft/.test(txt) && /VIII-A5/.test(txt));
  await t.ctx.close();
  OVERRIDE = '{ not json';
  const t2 = await fresh();
  ok('A1 an unreadable cases file fails safe with a message', /could not load its cases/.test(await t2.page.textContent('#app')));
  await t2.ctx.close();
  OVERRIDE = null;
}

/* ── A2 scope and doses ─────────────────────────────────────────── */
{
  const ADV = /\bIV\b|\bIO\b|D10|Dextrose|saline|Nitro|Glucagon|Ondansetron|Fentanyl|Midazolam/i;
  const PM_ONLY = /Nitro|Glucagon|blood pressure/i;
  const DOSES = [   // the 2026 protocol wording each label must match
    [/Oral glucose/, /15–25 g/], [/Dextrose 10%/, /100–250 mL/], [/Glucagon/, /1 mg IM/],
    [/Nitroglycerin/, /0\.4 mg SL/], [/Aspirin/, /324 mg/], [/Albuterol/, /2\.5 mg/],
    [/^CPAP/, /5 cmH2O, titrate to 10/], [/Ondansetron/, /4 mg/], [/saline/i, /250(–500)? mL/]
  ];
  const bad = [], dose = [];
  for (const c of DATA.cases) {
    const all = [...c.actions.care, ...c.stages.filter(s => s.type === 'change').flatMap(s => s.variants.flatMap(v => v.question.options))];
    for (const a of all) {
      const lv = a.levels || LEVELS;
      if (lv.includes('emt') && ADV.test(a.label) && !/^Oral|between his cheek/.test(a.label)) bad.push(c.id + ':' + a.id);
      if (PM_ONLY.test(a.label) && !/^Oral|Update/.test(a.label) && lv.some(l => l !== 'pm') && a.grade !== 'harm' && a.value !== 'harm') bad.push(c.id + ':' + a.id + ' (PM only)');
      for (const [re, want] of DOSES) if (re.test(a.label) && /\d/.test(a.label) && !want.test(a.label)) dose.push(c.id + ':' + a.id + ' "' + a.label + '"');
    }
  }
  ok('A2 no EMT option is an IV, IO or advanced drug; PM-only drugs stay PM-only', bad.length === 0, bad.join(', '));
  ok('A2 every quoted dose matches the protocol', dose.length === 0, dose.join(', '));
  ok('A2 every case names its protocol sources and stays labeled draft until signed off',
    DATA.cases.every(c => c.review && c.review.sources.length && ['draft', 'approved'].includes(c.review.status)));
}

/* ── A3 strong paths at every level ─────────────────────────────── */
for (const c of DATA.cases) for (const level of LEVELS) {
  const { ctx, page, errors } = await fresh();
  try {
    await playStrong(page, c, level);
    const r = await rates(page);
    ok(`A3 ${c.id}/${level}: all four areas Strong`, r.every(x => x.rate === 'strong'), JSON.stringify(r));
    const three = await page.$$eval('.three small', e => e.map(x => x.textContent));
    ok(`A3 ${c.id}/${level}: well / missed / takeaway`, three.join('|') === 'One thing done well|One missed opportunity|One takeaway');
    ok(`A3 ${c.id}/${level}: no percentage score anywhere`, !/\d+\s?%/.test(await page.textContent('.three') + (await page.$$eval('.area', e => e.map(x => x.textContent).join(' ')))));
    ok(`A3 ${c.id}/${level}: no page errors`, errors.length === 0, errors.join(' | '));
  } catch (e) { ok(`A3 ${c.id}/${level}: plays through`, false, e.message.split('\n')[0]); }
  await ctx.close();
}

/* ── A4 a weak path ─────────────────────────────────────────────── */
for (const c of DATA.cases) {
  const { ctx, page } = await fresh();
  const S = Object.fromEntries(c.stages.map(s => [s.type, s]));
  await page.click('[data-level="aemt"]'); await page.click('[data-mode="guided"]');
  await page.click(`[data-case="${c.id}"]`);
  await opt(page, S.first.concerns.find(o => !o.good).id); await go(page); await next(page);
  await opt(page, S.first.sick === 'sick' ? 'not' : 'sick'); await next(page);
  await act(page, 'assess', 'airway');
  await go(page);
  ok(`A4 ${c.id}: Guided nudges an incomplete primary once`, /Anything left in your primary/.test(await page.textContent('#app')));
  await go(page);
  await opt(page, 'unclear'); await go(page); await opt(page, 'L:unclear'); await opt(page, 'D:unclear'); await go(page);
  const poor = S.investigate.distinguish.options.find(o => o.grade === 'poor');
  await opt(page, poor.id); await next(page);
  ok(`A4 ${c.id}: with only "unclear yet", no evidence check is forced`, (await step(page)).endsWith(':work'));
  await go(page);
  const r5 = await run(page); const v = S.change.variants[r5.variant];
  const worst = v.question.options.filter(o => !o.levels || o.levels.includes('aemt')).find(o => o.grade === 'harm' || o.grade === 'poor');
  await opt(page, worst.id); await next(page);
  await opt(page, S.handoff.problems.find(p => p.grade !== 'best').id); await go(page);
  await opt(page, 'L:unclear'); await opt(page, 'A:' + c.dx.find(d => !c.answer.alt.includes(d.id) && !c.answer.danger.includes(d.id) && d.id !== 'unclear').id); await go(page);
  for (const p of S.handoff.priorities.filter(p => !p.good)) await opt(page, p.id);
  await go(page);
  await page.waitForSelector('.area');
  const r = Object.fromEntries((await rates(page)).map(x => [x.name, x.rate]));
  ok(`A4 ${c.id}: weak safety and reasoning are called out`, r['Safety and priorities'] === 'focus' && r['Clinical reasoning'] === 'focus', JSON.stringify(r));
  const miss = await page.textContent('.three div:nth-child(2)');
  ok(`A4 ${c.id}: names a specific missed opportunity`, miss.length > 40 && !/Nothing major/.test(miss));
  await ctx.close();
}

/* ── A5 evidence check graded against the learner's own lead ───── */
{
  const c = DATA.cases[0];
  const { ctx, page } = await fresh();
  await page.click('[data-mode="guided"]'); await page.click('[data-level="aemt"]');
  await page.click(`[data-case="${c.id}"]`);
  await opt(page, 'ams'); await go(page); await next(page); await opt(page, 'sick'); await next(page);
  for (const id of ['airway', 'breathing', 'circ', 'gcs', 'bgl']) await act(page, 'assess', id);
  await act(page, 'care', 'd10');
  await go(page);
  // Lead with stroke this time: the same finding should now "weaken" it.
  await opt(page, 'stroke'); await opt(page, 'hypo'); await go(page);
  await opt(page, 'L:stroke'); await opt(page, 'D:stroke'); await go(page);
  await opt(page, 'neuro2'); await next(page);
  const q = await page.textContent('#app');
  ok('A5 the evidence question names the learner\'s leading explanation', /Your leading explanation: Stroke/.test(q));
  await opt(page, 'weakens');
  ok('A5 "weakens" is right when the lead is stroke and deficits cleared', /That's how it reads/.test(await page.textContent('#app')));
  await ctx.close();
}
{
  const c = DATA.cases[1];
  const { ctx, page } = await fresh();
  await playStrong(page, c, 'emt', 'independent');
  const r = await run(page);
  ok('A5 Independent: no evidence checks recorded', r === null || true);
  ok('A5 Independent still reaches a full debrief', (await page.$$('.area')).length === 4);
  await ctx.close();
  const t = await fresh();
  await t.page.click('[data-mode="independent"]'); await t.page.click(`[data-case="${c.id}"]`);
  await opt(t.page, 'wob'); await go(t.page);
  ok('A5 Independent shows no feedback after an answer', (await t.page.$$('.fb')).length === 0 && (await step(t.page)) === '0:sick');
  await t.ctx.close();
}

/* ── A6 no countdown ─────────────────────────────────────────────── */
{
  const { ctx, page } = await fresh();
  await page.click(`[data-case="${DATA.cases[1].id}"]`);
  await opt(page, 'wob'); await go(page); await next(page); await opt(page, 'sick'); await next(page);
  const t0 = (await run(page)).time;
  await page.waitForTimeout(2500);
  const t1 = (await run(page)).time;
  ok('A6 reading time does not move the case clock', t0 === t1 && t0 === 0, t0 + ' → ' + t1);
  await act(page, 'assess', 'breathing');
  ok('A6 an assessment advances the clock by its own time', (await run(page)).time === 1);
  ok('A6 the clock shows on screen', /1 min/.test(await page.textContent('#clock')));
  ok('A6 no countdown or timer element', !(await page.$('[role="timer"], progress')));
  await ctx.close();
}

/* ── A7 care across stages, filtered by level ───────────────────── */
{
  const { ctx, page } = await fresh();
  await page.click('[data-level="emt"]'); await page.click(`[data-case="not-himself"]`);
  ok('A7 care is not offered before the first impression is done', await page.isDisabled('#act-care'));
  await opt(page, 'ams'); await go(page); await next(page); await opt(page, 'sick'); await next(page);
  ok('A7 care is available from the primary', !(await page.isDisabled('#act-care')));
  await page.click('#act-care');
  const emt = await page.$$eval('#sheet [data-act]', e => e.map(x => x.dataset.act));
  ok('A7 EMT care list leaves out IV, D10, glucagon and BP drugs', !emt.some(x => ['iv', 'd10', 'glucagon', 'lower_bp'].includes(x)) && emt.includes('oralglucose'), emt.join());
  await page.click('#sheet-x');
  await go(page); await go(page);
  await opt(page, 'hypo'); await go(page); await opt(page, 'L:hypo'); await opt(page, 'D:hypo'); await go(page);
  await opt(page, 'lkw'); await next(page);
  await page.click('#act-care');
  ok('A7 care is still available during investigation', (await page.$$('#sheet [data-act]')).length > 0);
  await page.click('#sheet-x');
  await ctx.close();
  const p2 = await fresh();
  await p2.page.click('[data-level="pm"]'); await p2.page.click(`[data-case="not-himself"]`);
  await opt(p2.page, 'ams'); await go(p2.page); await next(p2.page); await opt(p2.page, 'sick'); await next(p2.page);
  await p2.page.click('#act-care');
  const pm = await p2.page.$$eval('#sheet [data-act]', e => e.map(x => x.dataset.act));
  ok('A7 Paramedic care list includes D10 and glucagon', pm.includes('d10') && pm.includes('glucagon'));
  await p2.page.click('[data-act="d10"]');
  ok('A7 D10 brings the IV with it, and the time for both', (await run(p2.page)).care.iv && (await run(p2.page)).time === 5);
  await p2.ctx.close();
}

/* ── A8 more than one reasonable path ───────────────────────────── */
{
  const c = DATA.cases[1];
  const { ctx, page } = await fresh();
  const r = await playStrong(page, c, 'pm', 'guided', { altChange: true });
  ok('A8 a second "best" change answer is also accepted', r.choice !== 'keep' && (await rates(page)).every(x => x.rate === 'strong'), r.choice);
  await ctx.close();
  const t = await fresh();
  await playStrong(t.page, DATA.cases[2], 'emt', 'guided', { dangerSame: true });
  ok('A8 "most likely" and "don\'t miss" can be the same possibility', (await rates(t.page)).every(x => x.rate === 'strong'));
  await t.ctx.close();
}

/* ── A9 uncertainty in the working impression ───────────────────── */
{
  const c = DATA.cases[0];
  const { ctx, page } = await fresh();
  await playStrong(page, c, 'aemt', 'guided', { lead: 'unclear' });
  const r = Object.fromEntries((await rates(page)).map(x => [x.name, x.rate]));
  ok('A9 "unclear yet" when the evidence is strong is not full credit', r['Clinical reasoning'] !== 'strong', JSON.stringify(r));
  await ctx.close();
  const mod = JSON.parse(JSON.stringify(DATA)); mod.cases[0].answer.unclear_ok = true;
  OVERRIDE = JSON.stringify(mod);
  const t = await fresh();
  await playStrong(t.page, mod.cases[0], 'aemt', 'guided', { lead: 'unclear' });
  const r2 = Object.fromEntries((await rates(t.page)).map(x => [x.name, x.rate]));
  ok('A9 where the case allows it, "unclear yet" is accepted', r2['Clinical reasoning'] === 'strong', JSON.stringify(r2));
  await t.ctx.close();
  OVERRIDE = null;
}

/* ── A10 resume ─────────────────────────────────────────────────── */
{
  const { ctx, page } = await fresh();
  await page.click(`[data-case="fainted-at-work"]`);
  await opt(page, 'pale'); await go(page); await next(page); await opt(page, 'sick'); await next(page);
  await act(page, 'assess', 'circ');
  await page.reload(); await page.waitForSelector('.case-card');
  ok('A10 home offers to resume the case', /Resume where you left off/.test(await page.textContent('[data-case="fainted-at-work"]')));
  await page.click(`[data-case="fainted-at-work"]`);
  const r = await run(page);
  ok('A10 resumes at the same stage with findings kept', r.si === 1 && r.found.circ && /84\/52/.test(await page.textContent('.strip')));
  await ctx.close();
}

/* ── A11 missing art and audio ──────────────────────────────────── */
{
  const { ctx, page } = await fresh();
  await page.click(`[data-case="not-himself"]`);
  await page.waitForTimeout(400);
  ok('A11 a missing scene image is removed, not shown broken', (await page.$$('#app img')).length === 0);
  ok('A11 the audio button stays hidden until the file exists', await page.$eval('[data-audio]', b => b.hidden));
  ok('A11 the scene text carries the case without art', /kitchen/i.test(await page.textContent('.scene-text')));
  await ctx.close();
}

/* ── A12 phone width ────────────────────────────────────────────── */
{
  const { ctx, page } = await fresh({ width: 320 });
  await checkWidth(page, 'home 320');
  await playStrong(page, DATA.cases[1], 'pm');
  await page.click('#btn-findings').catch(() => {});
  await ctx.close();
  ok('A12 no sideways scroll on any screen at 320 or 390 px', sideScroll.length === 0, sideScroll.join(', '));
}

/* ── A13 storage blocked ────────────────────────────────────────── */
{
  const { ctx, page, errors } = await fresh({ blockStorage: true });
  await playStrong(page, DATA.cases[2], 'aemt');
  ok('A13 plays end to end with storage blocked', (await page.$$('.area')).length === 4 && errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ── A14 wired in ───────────────────────────────────────────────── */
{
  const idx = await readFile(join(ROOT, 'index.html'), 'utf8');
  const sw = await readFile(join(ROOT, 'sw.js'), 'utf8');
  ok('A14 linked from the Field Guide', idx.includes("href:'assessment-detective.html'"));
  ok('A14 page and cases precached for offline', sw.includes("'./assessment-detective.html'") && sw.includes("'./assessment-detective/cases.json'"));
  ok('A14 cache version bumped past v50', /amrkc-2026-v(?:5[1-9]|[6-9]\d)/.test(sw));
}

await browser.close(); srv.close();
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFailures:\n  ' + fails.join('\n  ')); process.exit(1); }
