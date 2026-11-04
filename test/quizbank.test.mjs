// Quiz bank integrity — quiz-bank.js feeds both the Protocol Quiz and the
// Daily 5, so a broken question breaks both. Run: node quizbank.test.mjs
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = {};
vm.runInNewContext(await readFile(join(ROOT, 'quiz-bank.js'), 'utf8') + ';this.QUIZ_BANK=QUIZ_BANK;', ctx);
const BANK = ctx.QUIZ_BANK;

let pass = 0, fail = 0; const fails = [];
function ok(name, cond, detail){ if(cond){ pass++; } else { fail++; fails.push(name + (detail ? '  ' + detail : '')); console.log('FAIL ' + name, detail || ''); } }

for (const b of ['emt', 'aemt', 'pm', 'vent']) ok(`bank ${b} exists`, Array.isArray(BANK[b]) && BANK[b].length > 0);

for (const [b, qs] of Object.entries(BANK)) {
  const ids = qs.map(q => q.id);
  ok(`${b}: ids are unique`, new Set(ids).size === ids.length, ids.filter((x, i) => ids.indexOf(x) !== i).join(','));
  const texts = qs.map(q => q.q.trim().toLowerCase());
  ok(`${b}: no duplicate question text`, new Set(texts).size === texts.length);
  for (const q of qs) {
    const tag = `${b}:${q.id}`;
    ok(`${tag} has text, category and explanation`, q.q && q.cat && q.exp && q.exp.length > 20);
    ok(`${tag} type is mc or tf`, q.type === 'mc' || q.type === 'tf', q.type);
    if (q.type === 'tf') ok(`${tag} true/false options`, q.opts.length === 2 && q.opts[0] === 'True' && q.opts[1] === 'False');
    else ok(`${tag} 3–6 lettered options`, q.opts.length >= 3 && q.opts.length <= 6 && q.opts.every((o, i) => o.startsWith('ABCDEF'[i] + '. ')));
    ok(`${tag} answer index in range`, Number.isInteger(q.ans) && q.ans >= 0 && q.ans < q.opts.length, String(q.ans));
    // Options are shuffled on screen, so explanations must not point at letters
    ok(`${tag} explanation does not cite an option letter`, !/\b(option|answer|choice) [A-F]\b|\([A-F]\)/i.test(q.exp));
  }
}

// Corrections from the 2026 review that must not regress
const find = (b, id) => BANK[b].find(q => q.id === id);
ok('EMT epinephrine IM is all levels (III-8)', /autoinjector or IM/i.test(find('emt', 3).opts[find('emt', 3).ans]));
ok('ARDS tidal volume is 6 mL/kg strict (V-6)', /420 mL \(6 mL\/kg/.test(find('vent', 1).opts[find('vent', 1).ans]));
ok('no 25–30 hyperventilation target anywhere', !Object.values(BANK).flat().some(q => /ETCO2 25[–-]30/.test(q.q + q.exp + q.opts.join(' '))));
ok('no "contact DMO for all intubations"', !Object.values(BANK).flat().some(q => /DMO for all intubations/i.test(q.exp)));

console.log(`\n==== ${pass} passed, ${fail} failed ====`);
if (fails.length) { console.log('FAILURES:\n - ' + fails.join('\n - ')); process.exit(1); }
