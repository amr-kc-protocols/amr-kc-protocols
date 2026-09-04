/*
 * Kansas Class Builder — pass-through & stress test
 * -------------------------------------------------
 * Drives the real page (kansas-class-builder.html) in headless Chromium,
 * exercising the happy path plus edge/stress cases, and asserts that every
 * generated packet parses as a PDF with zero console errors.
 *
 * Run:  cd test && npm install && npm test
 * All data below is synthetic — no real roster/evaluation data is committed.
 */
import http from 'http';
import fs from 'fs';
import { readFile } from 'fs/promises';
import { extname, join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..'); // repo root
const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.pdf':'application/pdf','.json':'application/json','.png':'image/png','.ico':'image/x-icon' };

const srv = http.createServer(async (q, r) => {
  try { const u = decodeURIComponent(q.url.split('?')[0]); const d = await readFile(join(ROOT, u === '/' ? 'index.html' : u));
    r.writeHead(200, { 'content-type': MIME[extname(u)] || 'application/octet-stream' }); r.end(d);
  } catch { r.writeHead(404); r.end('not found'); }
});
await new Promise(r => srv.listen(0, r));
const BASE = `http://localhost:${srv.address().port}/kansas-class-builder.html`;

// Portable browser launch: honor CHROMIUM_PATH, else this env's pre-installed Chromium, else Playwright default.
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

async function fresh() {
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push('PAGEERR:' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE:' + m.text()); });
  page._errs = errs;
  await page.goto(BASE, { waitUntilEvent: 'load' }); await page.waitForSelector('#kcb-root h1');
  await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('#kcb-root h1');
  return page;
}
async function fillReq(page, o = {}) {
  await page.fill('[data-key="title"]', o.title || 'Test Course');
  await page.fill('[data-key="date"]', o.date || '2026-07-15');
  await page.fill('[data-key="startTime"]', o.start || '09:00');
  await page.fill('[data-key="endTime"]', o.end || '13:00');
  await page.fill('[data-key="location"]', o.loc || 'AMR KC, Lenexa');
  await page.fill('[data-key="instructor"]', o.instr || 'Jordan Jones');
}
async function generate(page, timeout = 30000) {
  await page.click('[data-action="generate"]');
  const link = await page.waitForSelector('a.ce-primary[download]', { timeout }).catch(() => null);
  if (!link) return { blocked: true };
  const bytes = await page.evaluate(async () => Array.from(new Uint8Array(await (await fetch(document.querySelector('a.ce-primary[download]').href)).arrayBuffer())));
  const doc = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise;
  let text = ''; for (let i = 1; i <= doc.numPages; i++) text += ' ' + (await (await doc.getPage(i)).getTextContent()).items.map(x => x.str).join(' ');
  return { pages: doc.numPages, text, bytes };
}

/* S1 — minimal happy path */
{ const p = await fresh(); await fillReq(p);
  const r = await generate(p);
  ok('S1 minimal generates', !r.blocked);
  ok('S1 page count = 5 (cover+info+eval+roster×2)', r.pages === 5, 'got ' + r.pages);
  ok('S1 hours auto-filled from time', (await p.inputValue('[data-key="courseHours"]')) === '4');
  ok('S1 no console errors', p._errs.length === 0, p._errs.join('|'));
  await p.context().close(); }

/* S2 — validation blocks + highlights */
{ const p = await fresh(); await fillReq(p); await p.fill('[data-key="title"]', ''); await p.fill('[data-key="location"]', '');
  const r = await generate(p, 2500);
  ok('S2 generate blocked when required missing', r.blocked === true);
  ok('S2 invalid fields highlighted', (await p.$$eval('.ce-invalid', e => e.length)) >= 2);
  await p.context().close(); }

/* S3 — very long strings */
{ const p = await fresh(); const long = 'Prehospital ' + 'Management '.repeat(40) + 'End';
  await fillReq(p, { title: long, loc: long, instr: 'Dr. ' + 'Longname '.repeat(20) });
  await p.fill('[data-list="objectives"][data-i="0"]', long + ' objective');
  await p.fill('[data-list="agenda"][data-sub="topic"][data-i="0"]', long + ' topic');
  await p.fill('[data-list="students"][data-sub="name"][data-i="0"]', long + ' student');
  const r = await generate(p);
  ok('S3 long strings generate & parse', !r.blocked && r.pages >= 5 && r.pages < 20, 'pages ' + r.pages);
  ok('S3 no console errors', p._errs.length === 0, p._errs.join('|'));
  await p.context().close(); }

/* S4 — special chars / injection / emoji (must not crash generation) */
{ const p = await fresh();
  await fillReq(p, { title: 'A&B <script>"O\'Brien" © é 🚑', instr: '"Quote" & <b>x</b>' });
  await p.fill('[data-list="objectives"][data-i="0"]', 'Use <tags> & "smart" quotes — dash 🚒');
  const r = await generate(p);
  ok('S4 special chars + emoji generate', !r.blocked);
  ok('S4 no injected <script> element', (await p.$$eval('script', s => s.length)) < 10);
  ok('S4 no console errors', p._errs.length === 0, p._errs.join('|'));
  await p.context().close(); }

/* S5 — >18 students via Excel paste; overflow kept & warned */
{ const p = await fresh(); await fillReq(p);
  const rows = ['Name\tEmail\tPhone\tOperation\tKSBEMS #'];
  for (let i = 1; i <= 30; i++) rows.push(`Student ${i}\ts${i}@x.com\t913-555-00${i + 10}\tKC\t${1000 + i}`);
  await p.click('[data-action="toggle-paste"]'); await p.fill('#ce-paste', rows.join('\n')); await p.click('[data-action="apply-paste"]'); await p.waitForTimeout(150);
  const n = await p.$$eval('[data-list="students"][data-sub="name"]', e => e.filter(x => x.value.trim()).length);
  ok('S5 keeps all pasted rows (overflow visible)', n === 30, 'got ' + n);
  ok('S5 overflow warning shows remaining 12', (await p.$$eval('.ce-warn:not(.hide)', e => e.filter(w => /first 18/.test(w.textContent) && /12/.test(w.textContent)).length)) >= 1);
  await p.fill('[data-key="evalCount"]', '1');
  const r = await generate(p);
  ok('S5 roster prints first 18 only', !r.blocked && /Student 18\b/.test(r.text) && !/Student 19\b/.test(r.text));
  ok('S5 no console errors', p._errs.length === 0, p._errs.join('|'));
  await p.context().close(); }

/* S6 — malformed / single-column roster pastes */
{ const p = await fresh(); await fillReq(p);
  await p.click('[data-action="toggle-paste"]'); await p.fill('#ce-paste', 'Zoe Alpha\t\t\n\nBob Beta\tbob@x.com\t\t\t\t\n   \nCarol\tcarol@x.com'); await p.click('[data-action="apply-paste"]'); await p.waitForTimeout(150);
  ok('S6 ragged paste parsed names', (await p.$$eval('[data-list="students"][data-sub="name"]', e => e.map(x => x.value).filter(Boolean))).length >= 2);
  await p.click('[data-action="toggle-paste"]'); await p.fill('#ce-paste', 'Solo One\nSolo Two\nSolo Three'); await p.click('[data-action="apply-paste"]'); await p.waitForTimeout(150);
  ok('S6 plain-name paste appends', (await p.$$eval('[data-list="students"][data-sub="name"]', e => e.map(x => x.value).filter(Boolean))).length >= 5);
  ok('S6 no console errors', p._errs.length === 0, p._errs.join('|'));
  await p.context().close(); }

/* S7 — eval-result paste variants → summary */
{ const p = await fresh(); await fillReq(p);
  await p.click('[data-action="toggle-eval-paste"]'); await p.fill('#ce-evalpaste', 'Q1\tQ2'); await p.click('[data-action="apply-eval-paste"]'); await p.waitForTimeout(120);
  ok('S7a header-only paste → no summary + error', (await p.evaluate(() => JSON.parse(localStorage.getItem('kcb_draft_v1')).evalSummary)) == null && /couldn|paste/i.test(await p.textContent('#ce-error') || ''));
  await p.fill('[data-key="evalCount"]', '5');
  const ev = ['Id\tEmail\tName\tRate it\tRelevant?\tComments', '1\ta@x\tA\t5\tYes\tGreat', '2\tb@x\tB\t4\tPartially\t', '3\tc@x\tC\t3\tYes\tMeh'].join('\n');
  await p.fill('#ce-evalpaste', ev); await p.click('[data-action="apply-eval-paste"]'); await p.waitForTimeout(150);
  const sm = await p.evaluate(() => JSON.parse(localStorage.getItem('kcb_draft_v1')).evalSummary);
  ok('S7b summary parsed (3 responses)', sm && sm.count === 3);
  ok('S7b rating avg detected (=4.0)', sm && sm.questions.length === 1 && Math.abs(sm.questions[0].avg - 4) < 0.01);
  ok('S7b yes/no tally detected', sm && sm.tallies.length === 1);
  ok('S7b comments detected', sm && sm.comments.length === 1);
  ok('S7b blank-copies field hidden while summary loaded', (await p.$('[data-key="evalCount"]')) == null);
  const r = await generate(p);
  ok('S7b summary present → 0 blanks (5 pages)', r.pages === 5, 'pages ' + r.pages);
  ok('S7b packet contains summary', /Evaluation Summary/.test(r.text));
  ok('S7 no console errors', p._errs.length === 0, p._errs.join('|'));
  await p.context().close(); }

/* S8 — time edge (crosses midnight) */
{ const p = await fresh(); await fillReq(p, { start: '22:00', end: '02:00' });
  ok('S8 midnight-cross hours = 4', (await p.inputValue('[data-key="courseHours"]')) === '4');
  await p.context().close(); }

/* S9 — category-total mismatch fix */
{ const p = await fresh(); await fillReq(p);
  await p.fill('[data-cat="Airway"]', '3'); await p.fill('[data-cat="Trauma"]', '5'); await p.waitForTimeout(80);
  ok('S9 mismatch warning + fix button', (await p.$('[data-action="use-cat-total"]')) != null);
  await p.click('[data-action="use-cat-total"]');
  ok('S9 fix sets course hours to 8', (await p.inputValue('[data-key="courseHours"]')) === '8');
  await p.context().close(); }

/* S10 — presets load/save/delete */
{ const p = await fresh();
  await p.click('[data-action="load-preset"][data-name="Impella & ECMO in Critical Care Transport"]'); await p.waitForTimeout(120);
  ok('S10 prebuilt preset loads content', (await p.$$eval('.ce-chip, .ce-compitem.on', e => e.length)) >= 1);
  p.once('dialog', d => d.accept('My Preset ' + Date.now()));
  await p.click('[data-action="save-preset"]'); await p.waitForTimeout(120);
  ok('S10 custom preset saved & deletable', (await p.$$eval('[data-action="del-preset"]', e => e.length)) >= 1);
  await p.context().close(); }

/* S11 — autosave round-trip of the student-record model */
{ const p = await fresh(); await fillReq(p, { title: 'Persist Me' });
  await p.click('[data-action="toggle-paste"]'); await p.fill('#ce-paste', 'Name\tEmail\nPat Q\tpat@x.com'); await p.click('[data-action="apply-paste"]'); await p.waitForTimeout(120);
  await p.reload(); await p.waitForSelector('#kcb-root h1');
  ok('S11 title persisted', (await p.inputValue('[data-key="title"]')) === 'Persist Me');
  ok('S11 student record persisted', (await p.inputValue('[data-list="students"][data-sub="email"][data-i="0"]')) === 'pat@x.com');
  await p.context().close(); }

/* S12 — evalCount extreme (capped at 50) */
{ const p = await fresh(); await fillReq(p);
  await p.fill('[data-key="evalCount"]', '999'); await p.waitForTimeout(50);
  const r = await generate(p, 90000);
  ok('S12 evalCount 999 → capped (2+50+2 = 54 pages)', r.pages === 54, 'pages ' + r.pages);
  ok('S12 no console errors', p._errs.length === 0, p._errs.join('|'));
  await p.context().close(); }

/* S13 — select every competency */
{ const p = await fresh(); await fillReq(p);
  await p.click('[data-action="toggle-comp"]'); await p.waitForTimeout(50);
  for (const b of await p.$$('[data-comp]')) await b.check().catch(() => {});
  const r = await generate(p);
  ok('S13 all competencies generate', !r.blocked && r.pages === 5);
  ok('S13 no console errors', p._errs.length === 0, p._errs.join('|'));
  await p.context().close(); }

/* S14 — reset keeps sticky fields */
{ const p = await fresh(); await fillReq(p, { title: 'Gone', instr: 'Keep Me', loc: 'Keep Loc' });
  p.once('dialog', d => d.accept());
  await p.click('[data-action="reset"]'); await p.waitForTimeout(120);
  ok('S14 title cleared', (await p.inputValue('[data-key="title"]')) === '');
  ok('S14 instructor kept', (await p.inputValue('[data-key="instructor"]')) === 'Keep Me');
  ok('S14 location kept', (await p.inputValue('[data-key="location"]')) === 'Keep Loc');
  await p.context().close(); }

/* S15 — generate → edit → regenerate */
{ const p = await fresh(); await fillReq(p);
  ok('S15 first generate', !(await generate(p)).blocked);
  await p.click('[data-action="edit"]'); await p.waitForTimeout(80);
  await p.fill('[data-key="title"]', 'Edited Title');
  const r2 = await generate(p);
  ok('S15 regenerate after edit reflects change', !r2.blocked && /Edited Title/.test(r2.text));
  ok('S15 no console errors across cycle', p._errs.length === 0, p._errs.join('|'));
  await p.context().close(); }

console.log(`\n==== ${pass} passed, ${fail} failed ====`);
if (fails.length) console.log('FAILURES:\n - ' + fails.join('\n - '));
await browser.close(); srv.close();
process.exit(fail ? 1 : 0);
