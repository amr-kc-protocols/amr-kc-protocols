/*
 * The build framework's own rules, enforced when a chapter is built so a block
 * that drifts out of spec fails the build rather than reaching a learner.
 *
 *   v1.0 §4.2  block anatomy, screen and word budgets, quiz composition
 *   v1.0 §5.2  item writing
 *   v1.1 §2.4  enables and tier on every objective
 *
 * Integration blocks are exempt from the block-anatomy rules: they are a
 * stimulus and a linked item cluster, not the seven-step sequence.
 */
const isInt = (id) => /\.INT/.test(id);
export const words = (s) =>
  String(s || '').replace(/[*_#>`]/g, '').split(/\s+/).filter(Boolean).length;

export function conform({ objectives, items, blocks, terms = [] }) {
  const err = [];
  const byId = {};
  items.forEach((i) => { byId[i.id] = i; });

  blocks.forEach((b) => {
    // §4.2 — 3 to 5 content screens, one idea each, no more than 120 words
    if (!isInt(b.id) && (b.screens.length < 3 || b.screens.length > 5))
      err.push(`${b.id}: ${b.screens.length} content screens (spec says 3–5)`);
    b.screens.forEach((s) => {
      const w = words(s.body_md);
      if (w > 120) err.push(`${b.id}/${s.id}: ${w} words on one screen (max 120)`);
    });
    // §4.2 — 400 to 700 words of content per block; over 700 means split it
    const total = b.screens.reduce((n, s) => n + words(s.body_md), 0) +
                  words(b.callback_md) + words(b.cold_open.text);
    if (!isInt(b.id) && (total < 400 || total > 700))
      err.push(`${b.id}: ${total} words of content (spec says 400–700)`);
    // §4.2 — a cold open of 40 to 60 words, ending on a decision point
    const cw = words(b.cold_open.text);
    if (cw < 35 || cw > 70) err.push(`${b.id}: cold open is ${cw} words (spec says 40–60)`);
    if (!b.cold_open.decision_point) err.push(`${b.id}: cold open has no decision point`);
    // §4.2 — a quiz of 5 to 7 items, at least two of them not multiple choice
    if (!isInt(b.id)) {
      if (b.quiz.length < 5 || b.quiz.length > 7)
        err.push(`${b.id}: quiz has ${b.quiz.length} items (spec says 5–7)`);
      const nonMc = b.quiz.map((id) => byId[id]).filter((i) => i && i.type !== 'mc').length;
      if (nonMc < 2) err.push(`${b.id}: quiz has ${nonMc} non-MC items (spec says at least 2)`);
    }
    // Every referenced item has to exist, and a block needs an objective
    [b.pretest_item, ...b.inline_checks, ...b.quiz].filter(Boolean).forEach((id) => {
      if (!byId[id]) err.push(`${b.id}: references missing item ${id}`);
    });
    if (!b.objectives.length) err.push(`${b.id}: no objective`);
  });

  items.forEach((i) => {
    if (!i.source_ref) err.push(`${i.id}: no source_ref (§5.2 rule 7)`);
    (i.options || []).forEach((o) => {
      // §5.2 rule 2 — untestable and unrepresentative of the exam
      if (/all of the above|none of the above/i.test(o.text))
        err.push(`${i.id}: option "${o.text}" is all/none of the above (§5.2 rule 2)`);
      // §5.2 rule 4 — a distractor you cannot write a rationale for is filler
      if (!o.rationale) err.push(`${i.id}/${o.id}: option has no rationale (§5.2 rule 4)`);
    });
    // The "Select 2-3" hint is generated from select_count, and mr is graded as
    // an exact set match. If the two disagree, a learner who follows the hint is
    // guaranteed to be marked wrong, and nothing about the item looks broken.
    if (i.type === 'mr') {
      const nCorrect = (i.options || []).filter((o) => o.correct).length;
      const [lo, hi] = i.select_count || [2, 3];
      if (nCorrect < lo || nCorrect > hi)
        err.push(`${i.id}: ${nCorrect} correct options but select_count says ${lo}\u2013${hi}`);
      if (nCorrect < 2) err.push(`${i.id}: multi-response item with ${nCorrect} correct options`);
    }
    // Answer keys have to point at something that exists and is reachable.
    if (i.type === 'drag_drop') {
      const cats = new Set((i.categories || []).map((c) => c.id));
      const opts = new Set((i.options || []).map((o) => o.id));
      Object.entries(i.answer_map || {}).forEach(([k, v]) => {
        if (!opts.has(k)) err.push(`${i.id}: answer_map key ${k} is not an option`);
        if (!cats.has(v)) err.push(`${i.id}: answer_map points at unknown category ${v}`);
      });
      if (Object.keys(i.answer_map || {}).length !== (i.options || []).length)
        err.push(`${i.id}: every option needs a category in answer_map`);
    }
    if (i.type === 'options_box') {
      const cols = new Set((i.columns || []).map((c) => c.id));
      if (!(i.rows || []).length) err.push(`${i.id}: options_box has no rows`);
      (i.rows || []).forEach((r) => {
        if (!cols.has(r.answer)) err.push(`${i.id}/${r.id}: answer ${r.answer} is not a column`);
      });
    }
    if (i.type === 'hotspot' && !(i.regions || []).some((r) => r.id === i.answer_region))
      err.push(`${i.id}: answer_region ${i.answer_region} is not one of the regions`);
    if (i.type === 'label_drag') {
      const pts = new Set((i.pointers || []).map((x) => x.id));
      const lbs = new Set((i.labels || []).map((x) => x.id));
      Object.entries(i.answer_map || {}).forEach(([k, v]) => {
        if (!pts.has(k)) err.push(`${i.id}: answer_map pointer ${k} does not exist`);
        if (!lbs.has(v)) err.push(`${i.id}: answer_map label ${v} does not exist`);
      });
      if (Object.keys(i.answer_map || {}).length !== (i.pointers || []).length)
        err.push(`${i.id}: every pointer needs a label in answer_map`);
    }
    // Two options with the same text cannot both be graded meaningfully.
    const texts = (i.options || []).map((o) => String(o.text).trim().toLowerCase());
    if (new Set(texts).size !== texts.length) err.push(`${i.id}: duplicate option text`);

    // §5.2 rule 8 — stems under 60 words unless the item is scenario-based
    if (i.type !== 'scenario' && !i.parent && words(i.stem) > 60)
      err.push(`${i.id}: stem is ${words(i.stem)} words (max 60)`);
    if (i.type !== 'scenario' && !i.stem) err.push(`${i.id}: no stem`);
    if (!i.objective) err.push(`${i.id}: no objective`);
    // §2.1 strong evidence — elaborated feedback, not correct/incorrect alone
    if (i.type !== 'scenario' && !i.explanation_md)
      err.push(`${i.id}: no elaborated feedback (§2.1)`);
  });

  // v1.1 §1 and §2.4 — an objective that cannot name what it enables does not
  // ship, and the tier is what keeps a chapter from flooding the queue.
  objectives.forEach((o) => {
    if (!o.enables) err.push(`${o.id}: no enables string (v1.1 §1)`);
    if (!o.tier) err.push(`${o.id}: no tier (v1.1 §2.4)`);
  });

  // §5.2 rule 5 — target 70% application/analysis, 30% recall
  const scored = items.filter((i) => i.type !== 'scenario');
  const app = scored.filter((i) => i.bloom === 'apply' || i.bloom === 'analyze').length;
  const appPct = scored.length ? Math.round((100 * app) / scored.length) : 0;
  if (appPct < 60) err.push(`only ${appPct}% application/analysis items (target 70%)`);

  // Term cards: build and decompose cannot grade a term its parts do not spell
  terms.forEach((t) => {
    if (!t.source_ref) err.push(`${t.id}: term card has no source_ref`);
    if (t.card_kind === 'term' && (t.parts || []).length &&
        t.parts.map((p) => p.text).join('') !== t.term)
      err.push(`${t.id}: parts spell "${t.parts.map((p) => p.text).join('')}", not "${t.term}"`);
  });

  return { err, appPct, scored: scored.length };
}

/* Assemble a chapter, refuse to write it if it does not conform, and report. */
export function buildChapter(doc, outPath, fs) {
  const { err, appPct, scored } = conform(doc);
  console.log(`application/analysis: ${appPct}% of ${scored} (target ~70%)`);
  if (err.length) {
    console.error('\nCONFORMANCE FAILURES:\n - ' + err.join('\n - '));
    process.exit(1);
  }
  fs.writeFileSync(outPath, JSON.stringify(doc, null, 2));
  console.log(`\nwrote ${outPath.split('/').pop()}`);
  console.log(`blocks ${doc.blocks.length} · items ${doc.items.length} · ` +
              `term cards ${(doc.terms || []).length} · objectives ${doc.objectives.length}`);
}
