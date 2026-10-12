/*
 * Ventilator Simulator 3000 — Free Play pediatric test lungs
 * ----------------------------------------------------------
 * vent-ltv1200.html?free, driven in headless Chromium:
 *
 *   V1  the adult and pediatric lungs are offered in two labelled rows
 *   V2  each pediatric lung loads its own patient and a starting point that is
 *       inside its own targets: Vt per kg, minute volume per kg, plateau ≤ 28,
 *       and no alarm sounding
 *   V3  the readout judges a child per kilogram (it turns amber when you dial
 *       the tidal volume past the patient's range)
 *   V4  the infant teaches the LTV's 50 mL floor: pressure control
 *   V5  going back to an adult lung restores adult settings; switching between
 *       adult lungs leaves your settings alone
 *   V6  no page errors
 *
 * Run:  cd test && node ventpeds.test.mjs
 */
import http from 'http';
import fs from 'fs';
import { readFile } from 'fs/promises';
import { extname, join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
const srv = http.createServer(async (q, r) => {
  try { const u = decodeURIComponent(q.url.split('?')[0]); const d = await readFile(join(ROOT, u));
    r.writeHead(200, { 'content-type': MIME[extname(u)] || 'application/octet-stream' }); r.end(d);
  } catch { r.writeHead(404); r.end('not found'); }
});
await new Promise(r => srv.listen(0, r));
const ORIGIN = `http://localhost:${srv.address().port}`;
async function launch() {
  const known = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const exe = process.env.CHROMIUM_PATH || (fs.existsSync(known) ? known : null);
  try { return await chromium.launch(exe ? { executablePath: exe } : {}); }
  catch { return await chromium.launch(); }
}
const browser = await launch();
let pass = 0, fail = 0; const fails = [];
function ok(name, cond, extra) { if (cond) pass++; else { fail++; fails.push(name + (extra !== undefined ? '  [' + extra + ']' : '')); }
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (!cond && extra !== undefined ? '  [' + extra + ']' : '')); }

const p = await (await browser.newContext({ viewport: { width: 430, height: 932 }, serviceWorkers: 'block' })).newPage();
const errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.goto(ORIGIN + '/vent-ltv1200.html?free');
await p.waitForFunction(() => typeof freeMode !== 'undefined' && freeMode && document.querySelector('.tl-lung'));
const bar = () => p.evaluate(() => document.getElementById('mission-bar').innerText.replace(/\s+/g, ' '));

console.log('\nV1 lung rows');
{ const rows = await p.evaluate(() => [...document.querySelectorAll('.tl-group')].map(g => g.textContent.trim().toLowerCase()));
  ok('V1 adult and pediatric rows are labelled', JSON.stringify(rows) === '["adult","pediatric"]', JSON.stringify(rows));
  const peds = await p.evaluate(() => Object.keys(FREE_LUNGS).filter(k => FREE_LUNGS[k].peds));
  ok('V1 four pediatric lungs: healthy child, PARDS, status asthmaticus, infant bronchiolitis', peds.length === 4, peds.join(','));
  ok('V1 the adult lungs are unchanged', await p.evaluate(() => ['normal', 'ards', 'copd', 'asthma'].every(k => FREE_LUNGS[k] && !FREE_LUNGS[k].peds))); }

console.log('\nV2 each child starts inside their own targets');
const PEDS = await p.evaluate(() => Object.keys(FREE_LUNGS).filter(k => FREE_LUNGS[k].peds));
for (const k of PEDS) {
  await p.evaluate(k => setFreeLung(k), k);
  await p.waitForTimeout(2600);                         // a few breaths, so the alarms have something to judge
  const r = await p.evaluate(() => { const fl = FREE_LUNGS[freeLungKey], d = calcPplat();
    const vt = breathType === 'volume' ? vals.vt.v : vals.pc.v * lung.compliance;
    return { kg: fl.kg, vtKg: vt / fl.kg, vtR: fl.vtKg, mvKg: estMinuteVolume() * 1000 / fl.kg, mvR: fl.mvKg,
             pplat: d ? d.pplat : vals.peep.v + vals.pc.v, pplatMax: fl.pplatMax, alarms: Object.keys(alarms).filter(a => alarms[a].active),
             compliance: lung.compliance, label: fl.label }; });
  ok(`V2 ${r.label}: Vt ${r.vtKg.toFixed(1)} mL/kg is within ${r.vtR.join('–')}`, r.vtKg >= r.vtR[0] && r.vtKg <= r.vtR[1]);
  ok(`V2 ${r.label}: minute volume ${Math.round(r.mvKg)} mL/kg/min is within ${r.mvR.join('–')}`, r.mvKg >= r.mvR[0] && r.mvKg <= r.mvR[1]);
  ok(`V2 ${r.label}: plateau (or PIP in pressure control) ${r.pplat} ≤ ${r.pplatMax}`, r.pplat <= r.pplatMax);
  ok(`V2 ${r.label}: no alarm sounding at the starting point`, r.alarms.length === 0, r.alarms.join(','));
  ok(`V2 ${r.label}: the readout names the patient and their weight`, (await bar()).includes(r.kg + ' kg'));
}
{ const c = await p.evaluate(() => ({ normal: FREE_LUNGS.pedNormal.compliance / FREE_LUNGS.pedNormal.kg, ards: FREE_LUNGS.pedArds.compliance / FREE_LUNGS.pedArds.kg }));
  ok('V2 pediatric ARDS is stiffer per kg than the healthy child', c.ards < c.normal, JSON.stringify(c)); }

console.log('\nV3 judged per kilogram');
{ await p.evaluate(() => setFreeLung('pedNormal'));
  await p.evaluate(() => { vals.vt.v = 250; enforceITLimit(); updateKnob('vt'); updateUI(); });   // 12.5 mL/kg — an adult habit on a 20 kg child
  await p.waitForTimeout(300);
  const chip = await p.evaluate(() => { const c = [...document.querySelectorAll('.tl-chip')].find(x => /Vt \/ kg/i.test(x.textContent)); return c && { text: c.textContent, warn: /orange|253|#fdf0e7/.test(c.getAttribute('style')) }; });
  ok('V3 a 250 mL breath on a 20 kg child reads 12.5 mL/kg', !!chip && /12\.5 mL\/kg/.test(chip.text), chip && chip.text);
  ok('V3 and turns amber', !!chip && chip.warn); }

console.log('\nV4 the infant');
{ await p.evaluate(() => setFreeLung('pedBronch'));
  const r = await p.evaluate(() => ({ bt: breathType, vtMin: vals.vt.min, kg: FREE_LUNGS.pedBronch.kg }));
  ok('V4 the infant starts in pressure control', r.bt === 'pressure');
  ok('V4 because the LTV\'s smallest volume breath is over 8 mL/kg for this infant', r.vtMin / r.kg > 8 && /50 mL/.test(await bar())); }

console.log('\nV5 back to adult');
{ await p.evaluate(() => setFreeLung('ards'));
  const a = await p.evaluate(() => ({ vt: vals.vt.v, rate: vals.rate.v, bt: breathType }));
  ok('V5 an adult lung after a child restores adult settings', a.vt === 500 && a.rate === 14 && a.bt === 'volume', JSON.stringify(a));
  await p.evaluate(() => { vals.vt.v = 420; updateKnob('vt'); setFreeLung('copd'); });
  ok('V5 switching between adult lungs keeps your settings', (await p.evaluate(() => vals.vt.v)) === 420);
  ok('V5 the adult readout has no per-kg chip', !/Vt \/ kg/i.test(await bar())); }

ok('V6 no page errors', errs.length === 0, errs.join(' | '));
console.log(`\n==== ${pass} passed, ${fail} failed ====`);
if (fails.length) console.log('FAILURES:\n - ' + fails.join('\n - '));
await browser.close(); srv.close();
process.exit(fail ? 1 : 0);
