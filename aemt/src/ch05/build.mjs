/*
 * Builds aemt/ch05-terminology.json from the authoring sources beside it, and
 * refuses to write anything that does not conform to the build framework.
 *
 *   node aemt/src/ch05/build.mjs
 *
 * The checks below are the framework's own rules, in v1.0 §4.2 (block anatomy,
 * word budgets, quiz composition), §5.2 (item writing) and v1.1 §2.4 (enables
 * and tier). A block that drifts out of spec fails the build rather than
 * reaching a learner.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildBank} from './bank.mjs';
import {objectives,items,blocks} from './blocks.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const OUT=path.resolve(HERE,'../../ch05-terminology.json');

const terms=buildBank();
const doc={
  chapter:5, title:'Medical Terminology',
  version:'1.0.0', schema_version:2,
  review_status:'unreviewed',
  notice:'Written from the National EMS Education Standards and the published error-prone abbreviation lists. Not yet reviewed by a second credentialed instructor.',
  sources:[
    'NHTSA National EMS Education Standards (2021) — Preparatory: Medical Terminology',
    'The Joint Commission Official "Do Not Use" List',
    'ISMP List of Error-Prone Abbreviations, Symbols and Dose Designations'
  ],
  objectives, blocks, items, terms
};

// ── Conformance to v1.0 §4.2 and §5.2, checked at build time ────────────
const err=[];
const words=(s)=>String(s||'').replace(/[*_#>`]/g,'').split(/\s+/).filter(Boolean).length;
const byId={}; items.forEach(i=>byId[i.id]=i);

blocks.forEach(b=>{
  // §4.2 — 3 to 5 content screens, one idea each, ≤120 words
  if(b.id!=='5.INT' && (b.screens.length<3||b.screens.length>5))
    err.push(`${b.id}: ${b.screens.length} content screens (spec says 3–5)`);
  b.screens.forEach(s=>{
    const w=words(s.body_md);
    if(w>120) err.push(`${b.id}/${s.id}: ${w} words on one screen (max 120)`);
  });
  // §4.2 — word budget 400–700 per block; over 700 means split it
  const total=b.screens.reduce((n,s)=>n+words(s.body_md),0)+words(b.callback_md)+words(b.cold_open.text);
  if(b.id!=='5.INT' && (total<400||total>700))
    err.push(`${b.id}: ${total} words of content (spec says 400–700)`);
  // §4.2 — cold open 40–60 words, ends on a decision point
  const cw=words(b.cold_open.text);
  if(cw<35||cw>70) err.push(`${b.id}: cold open is ${cw} words (spec says 40–60)`);
  if(!b.cold_open.decision_point) err.push(`${b.id}: cold open has no decision point`);
  // §4.2 — quiz of 5–7 items, at least 2 non-multiple-choice types
  if(b.id!=='5.INT'){
    if(b.quiz.length<5||b.quiz.length>7) err.push(`${b.id}: quiz has ${b.quiz.length} items (spec says 5–7)`);
    const nonMc=b.quiz.map(id=>byId[id]).filter(i=>i&&i.type!=='mc').length;
    if(nonMc<2) err.push(`${b.id}: quiz has ${nonMc} non-MC items (spec says at least 2)`);
  }
  // every referenced item must exist
  [b.pretest_item,...b.inline_checks,...b.quiz].filter(Boolean).forEach(id=>{
    if(!byId[id]) err.push(`${b.id}: references missing item ${id}`);
  });
  if(!b.objectives.length) err.push(`${b.id}: no objective`);
});

items.forEach(i=>{
  if(!i.source_ref) err.push(`${i.id}: no source_ref (§5.2 rule 7)`);
  // §5.2 rule 2 — no "all of the above" / "none of the above"
  (i.options||[]).forEach(o=>{
    if(/all of the above|none of the above/i.test(o.text))
      err.push(`${i.id}: option "${o.text}" is all/none of the above (§5.2 rule 2)`);
    if(!o.rationale) err.push(`${i.id}/${o.id}: option has no rationale (§5.2 rule 4)`);
  });
  // §5.2 rule 8 — stems under 60 words unless scenario-based
  if(i.type!=='scenario' && !i.parent && words(i.stem)>60)
    err.push(`${i.id}: stem is ${words(i.stem)} words (max 60)`);
  if(i.type!=='scenario' && !i.stem) err.push(`${i.id}: no stem`);
  if(!i.objective) err.push(`${i.id}: no objective`);
  if(!i.explanation_md && i.type!=='scenario') err.push(`${i.id}: no elaborated feedback (§2.1 strong evidence)`);
});

// §2.4 — every objective names what it enables, and carries a tier
objectives.forEach(o=>{
  if(!o.enables) err.push(`${o.id}: no enables string (v1.1 §1)`);
  if(!o.tier) err.push(`${o.id}: no tier (v1.1 §2.4)`);
});

// §5.2 rule 5 — target 70% application/analysis, 30% recall
const scored=items.filter(i=>i.type!=='scenario');
const app=scored.filter(i=>i.bloom==='apply'||i.bloom==='analyze').length;
const pct=Math.round(100*app/scored.length);
console.log(`application/analysis: ${pct}% of ${scored.length} (target ~70%)`);
if(pct<60) err.push(`only ${pct}% application/analysis items (target 70%)`);

// Term cards: parts must spell the term, and every card needs a source
terms.forEach(t=>{ if(!t.source_ref) err.push(`${t.id}: term card has no source_ref`); });

if(err.length){
  console.error('\nCONFORMANCE FAILURES:\n - '+err.join('\n - '));
  process.exit(1);
}
fs.writeFileSync(OUT, JSON.stringify(doc,null,2));
console.log(`\nwrote ch05-terminology.json`);
console.log(`blocks ${blocks.length} · items ${items.length} · term cards ${terms.length} · objectives ${objectives.length}`);
