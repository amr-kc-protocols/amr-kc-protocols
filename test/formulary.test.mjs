/*
 * Formulary — scope test
 * ----------------------
 * The Field Guide states the AMR Kansas City formulary in two places:
 * `index.html` (the `D.formulary` dataset) and `flashcards.html` (its own card
 * array). They are separate literals, so they can drift apart — and they had,
 * on nitroglycerin and normal saline.
 *
 * This suite defends the scope statements, which are the part of a formulary a
 * provider can actually be disciplined over:
 *
 *   1. The two files agree on every drug's scope tag.
 *   2. Epinephrine 1:1,000 says, in both files, that the EMT route is the
 *      auto-injector and that an EMT may not draw the drug up and inject it.
 *      AMR KC medical direction is deliberately narrower than the Kansas BEMS
 *      Approved Medication List here, which permits IM at EMT level — so this
 *      is exactly the statement that a well-meaning edit "correcting" it
 *      against the state list would undo.
 *   3. No page tells a provider that an EMT may give epinephrine IM.
 *   4. Drugs an EMT may give by one route but not another carry a route note,
 *      so the scope tag is never the whole story on its own.
 *
 * Run:  cd test && node formulary.test.mjs
 */
import fs from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? `\n       ${detail}` : ''}`); }
};

function indexFormulary() {
  const s = fs.readFileSync(resolve(ROOT, 'index.html'), 'utf8');
  const i = s.indexOf('const D = {');
  const j = s.indexOf('\n', i);
  return JSON.parse(s.slice(i + 'const D = '.length, j).trim().replace(/;$/, '')).formulary;
}
function cardsFormulary() {
  const s = fs.readFileSync(resolve(ROOT, 'flashcards.html'), 'utf8');
  const out = [];
  const re = /\{num:'(III-\d+)',name:'((?:[^'\\]|\\.)*)',scope:'(all|aemt|pm)'/g;
  let m; while ((m = re.exec(s))) out.push({ num: m[1], name: m[2].replace(/\\'/g, "'"), scope: m[3] });
  return out;
}

console.log('\nFormulary — scope');
const idx = indexFormulary(), cards = cardsFormulary();

ok('both files carry all 21 drugs', idx.length === 21 && cards.length === 21,
   `index.html ${idx.length}, flashcards.html ${cards.length}`);

const byNum = Object.fromEntries(cards.map(c => [c.num, c]));
const drift = idx.filter(d => byNum[d.num] && byNum[d.num].scope !== d.scope)
                 .map(d => `${d.num} ${d.name}: index.html=${d.scope} flashcards.html=${byNum[d.num].scope}`);
ok('the two files agree on every scope tag', drift.length === 0, drift.join('\n       '));

// --- epinephrine 1:1,000: EMT is auto-injector only -------------------------
const epi = idx.find(d => d.num === 'III-8');
const epiText = JSON.stringify(epi);
ok('III-8 is still reachable by an EMT', epi.scope === 'all', `scope=${epi.scope}`);
ok('III-8 names the auto-injector as the EMT route',
   /EMT\b[^"]*auto-injector ONLY/i.test(epiText));
ok('III-8 forbids drawing epinephrine up at EMT level',
   /may not draw epinephrine/i.test(epiText));
ok('III-8 assigns drawn-up IM to AEMT+',
   epi.doses.some(d => /AEMT\+/.test(d.route) && /IM/.test(d.route)));

const cardsSrc = fs.readFileSync(resolve(ROOT, 'flashcards.html'), 'utf8');
ok('flashcards.html carries the same EMT restriction',
   /EMT SCOPE — AUTO-INJECTOR ONLY/.test(cardsSrc) && /may not draw epinephrine/.test(cardsSrc));

// --- nothing anywhere tells an EMT to inject epinephrine IM -----------------
const PAGES = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
const offenders = [];
for (const f of PAGES) {
  const t = fs.readFileSync(resolve(ROOT, f), 'utf8');
  // the retired wording, and any restatement of it
  if (/autoinjector or IM injection/i.test(t)) offenders.push(`${f}: "autoinjector or IM injection"`);
  if (/EMT[^.]{0,60}may (?:draw|administer)[^.]{0,40}epinephrine[^.]{0,30}\bIM\b/i.test(t))
    offenders.push(`${f}: states an EMT may give epinephrine IM`);
}
ok('no page tells an EMT to give epinephrine IM', offenders.length === 0, offenders.join('\n       '));

// --- route-restricted drugs carry a route note ------------------------------
// Drugs an EMT may give, but not by every route listed on the card.
const ROUTE_LIMITED = { 'III-8':'epinephrine 1:1,000', 'III-15':'naloxone', 'III-16':'nitroglycerin', 'III-20':'normal saline' };
for (const [num, label] of Object.entries(ROUTE_LIMITED)) {
  const d = idx.find(x => x.num === num);
  ok(`${num} (${label}) carries an EMT route note`,
     (d.notes || []).some(n => /EMT/.test(n) && /(only|not)/i.test(n)),
     (d.notes || []).join(' | ').slice(0, 160));
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
