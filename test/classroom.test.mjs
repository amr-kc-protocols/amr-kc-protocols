/* Phase 1 of the classroom companion: the content layer and the record store.

   Two things are being defended here.

   The content layer has to agree with the PowerPoint. The instructor says a
   slide number out loud and the app has to land on the same thing the class is
   looking at, which means the overlapping ranges (a calculation prompt inside
   a lesson, a quiz question inside a quiz block) have to resolve in the
   documented order. Every mapping in the brief's acceptance criteria is
   checked against the real vendored content, not a fixture.

   The store has to be honest about what it has kept. A submitted attempt is
   immutable, a retake does not erase the attempt below target that preceded
   it, and "Saved" is only said after the transaction completed. It also must
   not touch the self-paced record, which is a different course with its own
   certificate.                                                              */

import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";

const ROOT = "/home/user/amr-kc-protocols";
let PASS = 0, FAIL = 0;
const failures = [];

async function check(name, fn) {
  try { await fn(); PASS++; console.log("  PASS  " + name); }
  catch (e) { FAIL++; failures.push(name); console.log("  FAIL  " + name + "\n        " + e.message); }
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json",
                ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg" };

function serve(root) {
  const srv = http.createServer((req, res) => {
    const p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
    if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) {
      res.writeHead(404); res.end("nope"); return;
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(p)] || "application/octet-stream" });
    res.end(fs.readFileSync(p));
  });
  return new Promise(r => srv.listen(0, () => r({ srv, port: srv.address().port })));
}

// A bare page on the /vta/ path so the modules' relative content URLs resolve
// exactly as they will in the real academy.
const HARNESS = `<!doctype html><meta charset="utf-8"><title>harness</title>
<script src="classroom-content.js"></script>
<script src="classroom-store.js"></script>`;

const { srv, port } = await serve(ROOT);
fs.writeFileSync(path.join(ROOT, "vta/__harness.html"), HARNESS);
// Portable browser launch: honour CHROMIUM_PATH, else this env's pre-installed Chromium, else Playwright default.
async function launch() {
  const envExe = process.env.CHROMIUM_PATH;
  const known = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  const exe = envExe || (fs.existsSync(known) ? known : null);
  try { return await chromium.launch(exe ? { executablePath: exe } : {}); }
  catch { return await chromium.launch(); }
}
const browser = await launch();
const page = await browser.newPage();
const pageErrors = [];
page.on("pageerror", e => pageErrors.push(e.message));
await page.goto(`http://localhost:${port}/vta/__harness.html`);
await page.evaluate(() => ClassroomContent.load());

console.log("\nclassroom content — versioning");

await check("map and questions load and agree on course version and deck", async () => {
  const r = await page.evaluate(() => ({
    v: ClassroomContent.courseVersion,
    sha: ClassroomContent.deckSha256,
    slides: ClassroomContent.slideCount
  }));
  assert.equal(r.v, "vta-classroom-2026-09-25-r1");
  assert.equal(r.sha, "9a66e7daaabc1459032b9ad181828d6539de340f72e6b6dbd47625326fc220b4");
  assert.equal(r.slides, 273, "the deck is 273 slides");
});

await check("a question file from another course version is refused, not merged", async () => {
  const msg = await page.evaluate(async () => {
    const map = JSON.parse(JSON.stringify(ClassroomContent.map));
    const q = { courseVersion: "some-other-version", deck: map.deck, questions: [] };
    try { ClassroomContent.adopt(map, q); return "accepted"; }
    catch (e) { return e.message; }
  });
  assert.match(msg, /mismatch/i, "mismatched content must be refused");
  await page.evaluate(() => ClassroomContent.load({ force: true }));
});

console.log("\nclassroom content — the deck's own structure");

await check("nine modules, 56 lesson activities, 115 questions", async () => {
  const r = await page.evaluate(() => ({
    modules: ClassroomContent.modules.length,
    lessons: ClassroomContent.activities.filter(a => a.kind === "lesson").length,
    module: [1,2,3,4,5,6,7,8,9].reduce((n, m) => n + ClassroomContent.questionsFor("m" + m + "-quiz").length, 0),
    final: ClassroomContent.questionsFor("classroom-final").length
  }));
  assert.equal(r.modules, 9);
  assert.equal(r.lessons, 56, "the map covers all 56 existing PWA lessons");
  assert.equal(r.module, 90, "90 module questions");
  assert.equal(r.final, 25, "25 final questions");
});

await check("the class totals the 480 instructional minutes slide 3 claims", async () => {
  const mins = await page.evaluate(() =>
    ClassroomContent.map.slides
      .filter(s => !s.outsideClassTime)
      .reduce((n, s) => n + (s.minutes || 0), 0));
  assert.equal(Math.round(mins), 480, `instructional minutes came to ${mins}`);
});

await check("follow-up material sits outside class time", async () => {
  const r = await page.evaluate(() => {
    const f = ClassroomContent.activities.filter(a => a.kind === "follow-up");
    return { n: f.length, allOutside: f.every(a => a.outsideClassTime === true),
             ids: f.map(a => a.id).sort() };
  });
  assert.equal(r.n, 2);
  assert.deepEqual(r.ids, ["month-1", "week-1"]);
  assert.ok(r.allOutside, "week-1 and month-1 must not add classroom minutes");
});

console.log("\nclassroom content — slide lookup (acceptance criterion 4)");

await check("slide 97 opens the COPD recall prompt; 98 is its feedback", async () => {
  const r = await page.evaluate(() => [97, 98].map(n => ClassroomContent.resolveSlide(n)));
  assert.equal(r[0].kind, "recall");
  assert.equal(r[0].phase, "prompt", "97 is the prompt");
  assert.equal(r[0].moduleId, 4);
  assert.equal(r[1].activityId, r[0].activityId, "98 belongs to the same activity");
  assert.equal(r[1].phase, "feedback", "98 is the feedback and must not show at 97");
});

await check("all eight recall pairs resolve prompt then feedback", async () => {
  const bad = await page.evaluate(() => {
    const out = [];
    ClassroomContent.activities.filter(a => a.kind === "recall").forEach(a => {
      const p = ClassroomContent.resolveSlide(a.promptSlide);
      const f = ClassroomContent.resolveSlide(a.feedbackSlide);
      if (!p || p.activityId !== a.id || p.phase !== "prompt") out.push(a.id + " prompt");
      if (!f || f.activityId !== a.id || f.phase !== "feedback") out.push(a.id + " feedback");
    });
    return out;
  });
  assert.deepEqual(bad, [], "every recall pair must resolve to its own activity and phase");
});

await check("all five calculation pairs beat their parent lesson to the slide", async () => {
  const r = await page.evaluate(() => {
    const calcs = ClassroomContent.map.calculationSlideOverrides;
    return calcs.map(c => {
      const p = ClassroomContent.resolveSlide(c.promptSlide);
      const f = ClassroomContent.resolveSlide(c.feedbackSlide);
      return { id: c.id, parent: c.parentLessonId,
               pOk: p.activityId === c.id && p.phase === "prompt" && p.kind === "calculation",
               fOk: f.activityId === c.id && f.phase === "feedback",
               pLesson: p.lessonId };
    });
  });
  assert.equal(r.length, 5);
  r.forEach(x => {
    assert.ok(x.pOk, x.id + " prompt slide should resolve to the calculation, not the lesson");
    assert.ok(x.fOk, x.id + " feedback slide should resolve to the calculation");
    assert.equal(x.pLesson, x.parent, x.id + " should still name its parent lesson");
  });
});

await check("the deck's documented calculation slides are the ones in the map", async () => {
  const pairs = await page.evaluate(() =>
    ClassroomContent.map.calculationSlideOverrides.map(c => [c.promptSlide, c.feedbackSlide]));
  // Brief section 6: minute ventilation 83/84, breath timing 86/87,
  // worked PBW 89/90, guided ARDS 91/92, independent TBI 93/94.
  assert.deepEqual(pairs, [[83,84],[86,87],[89,90],[91,92],[93,94]]);
});

await check("a knowledge-check slide resolves to its questions, two per slide", async () => {
  const r = await page.evaluate(() => ClassroomContent.resolveSlide(103));
  assert.equal(r.kind, "question");
  assert.equal(r.activityId, "m4-quiz");
  assert.equal(r.questionIds.length, 2, "each knowledge-check slide carries two questions");
});

await check("every one of the 273 slides resolves to something", async () => {
  const misses = await page.evaluate(() => {
    const out = [];
    for (let n = 1; n <= 273; n++) if (!ClassroomContent.resolveSlide(n)) out.push(n);
    return out;
  });
  assert.deepEqual(misses, [], "no slide may leave the instructor with nowhere to go");
});

await check("out-of-range slide numbers return nothing rather than guessing", async () => {
  const r = await page.evaluate(() => [0, -1, 274, 9999, NaN, "abc"].map(n => ClassroomContent.resolveSlide(n)));
  assert.ok(r.every(x => x === null), "an invalid slide must not resolve to an activity");
});

console.log("\nclassroom content — teaching order");

await check("module order is teach, match, recall, case, practice, quiz, review", async () => {
  const kinds = await page.evaluate(() =>
    ClassroomContent.moduleOrder(4).map(a => a.kind));
  const firstOf = k => kinds.indexOf(k);
  assert.equal(kinds[0], "module_open", "the module opening comes before teaching");
  assert.ok(firstOf("lesson") < firstOf("match"), "teaching precedes matching");
  assert.ok(firstOf("match") < firstOf("recall"), "matching precedes recall");
  assert.ok(firstOf("recall") < firstOf("case"), "recall precedes the case");
  assert.ok(firstOf("case") < firstOf("practice"), "the case precedes practice");
  assert.ok(firstOf("practice") < firstOf("quiz"), "practice precedes the check");
  assert.ok(firstOf("quiz") < firstOf("review"), "the check precedes the review");
});

await check("the outline runs opening, nine modules, final, close, follow-ups", async () => {
  const r = await page.evaluate(() => {
    const o = ClassroomContent.outline();
    return { first: o[0].kind, kinds: o.map(a => a.kind),
             tail: o.slice(-4).map(a => a.id) };
  });
  assert.equal(r.first, "opening");
  assert.equal(r.kinds.indexOf("final") > 0, true);
  assert.ok(r.kinds.lastIndexOf("final") < r.kinds.lastIndexOf("closing"), "the final precedes the close");
  assert.deepEqual(r.tail.slice(-2), ["week-1", "month-1"], "follow-ups come last");
});

console.log("\nclassroom content — what it must NOT carry");

await check("no answer key reaches the learner bundle", async () => {
  const q = fs.readFileSync(path.join(ROOT, "vta/content/classroom-questions.json"), "utf8");
  const parsed = JSON.parse(q);
  const leaked = parsed.questions.filter(x =>
    "correct" in x || "correctChoiceId" in x || "answer" in x || "rationale" in x);
  assert.deepEqual(leaked, [], "learner questions must not carry correct-answer fields");
  assert.ok(!fs.existsSync(path.join(ROOT, "vta/content/instructor-reference.json")),
    "the instructor reference (keys + rationales) is not vendored into the public bundle in phase 1");
});

console.log("\nclassroom store — attempts");

await check("a store round trip keeps a class run, a learner and an attempt", async () => {
  const r = await page.evaluate(async () => {
    ClassroomStore.configure({ courseVersion: ClassroomContent.courseVersion,
                               deckSha256: ClassroomContent.deckSha256 });
    await ClassroomStore.resetClassroomData();
    const run = await ClassroomStore.createClassRun({ title: "T", classDate: "2026-10-01" });
    const lrn = await ClassroomStore.createLearner(run.classRunId, { displayName: "A" });
    const att = await ClassroomStore.startAttempt({
      classRunId: run.classRunId, learnerId: lrn.learnerId, activityId: "m4-quiz",
      itemIds: ClassroomContent.questionsFor("m4-quiz").map(q => q.id)
    });
    return { run: run.classRunId, lrn: lrn.learnerId, att: att.attemptId,
             n: att.attemptNumber, status: att.status, items: att.itemIds.length,
             verified: lrn.identityVerified };
  });
  assert.ok(r.run && r.lrn && r.att);
  assert.equal(r.n, 1);
  assert.equal(r.status, "draft");
  assert.equal(r.items, 10, "the attempt records the ten questions it was opened against");
  assert.equal(r.verified, false, "a typed name is not a verified identity");
});

await check("saving an answer reveals no key and does not submit", async () => {
  const r = await page.evaluate(async () => {
    const runs = await ClassroomStore.listClassRuns();
    const ls = await ClassroomStore.listLearners(runs[0].classRunId);
    const list = await ClassroomStore.attemptsFor(runs[0].classRunId, ls[0].learnerId, "m4-quiz");
    const a = await ClassroomStore.saveAnswer(list[0].attemptId, "m4-q01", "B");
    return { status: a.status, answers: a.answers, keys: Object.keys(a),
             submitted: a.submittedAt, released: a.feedbackReleasedAt };
  });
  assert.equal(r.status, "draft", "selecting an answer must not submit the attempt");
  assert.equal(r.answers["m4-q01"], "B");
  assert.equal(r.submitted, null);
  assert.equal(r.released, null, "feedback is not released by answering");
  assert.ok(!r.keys.some(k => /correct|rationale|key/i.test(k)), "no key is written into the attempt");
});

await check("an interrupted attempt resumes rather than starting a second", async () => {
  const r = await page.evaluate(async () => {
    const runs = await ClassroomStore.listClassRuns();
    const ls = await ClassroomStore.listLearners(runs[0].classRunId);
    const again = await ClassroomStore.startAttempt({
      classRunId: runs[0].classRunId, learnerId: ls[0].learnerId, activityId: "m4-quiz" });
    const all = await ClassroomStore.attemptsFor(runs[0].classRunId, ls[0].learnerId, "m4-quiz");
    return { n: all.length, number: again.attemptNumber, keptAnswer: again.answers["m4-q01"] };
  });
  assert.equal(r.n, 1, "reopening a draft must not create a second attempt");
  assert.equal(r.number, 1);
  assert.equal(r.keptAnswer, "B", "the saved choice survives the interruption");
});

await check("a submitted attempt is immutable", async () => {
  const r = await page.evaluate(async () => {
    const runs = await ClassroomStore.listClassRuns();
    const ls = await ClassroomStore.listLearners(runs[0].classRunId);
    const all = await ClassroomStore.attemptsFor(runs[0].classRunId, ls[0].learnerId, "m4-quiz");
    const sub = await ClassroomStore.submitAttempt(all[0].attemptId, { score: 7 });
    let editErr = null, resubmitErr = null;
    try { await ClassroomStore.saveAnswer(sub.attemptId, "m4-q01", "C"); }
    catch (e) { editErr = e.message; }
    try { await ClassroomStore.submitAttempt(sub.attemptId, { score: 10 }); }
    catch (e) { resubmitErr = e.message; }
    const after = await ClassroomStore.getAttempt(sub.attemptId);
    return { editErr, resubmitErr, answer: after.answers["m4-q01"], score: after.score };
  });
  assert.ok(r.editErr, "editing a submitted attempt must fail");
  assert.ok(r.resubmitErr, "double submission must be prevented");
  assert.equal(r.answer, "B", "the submitted answer is unchanged");
  assert.equal(r.score, 7);
});

await check("a 7/10 stays on the record after a later 9/10 (criterion 5)", async () => {
  const r = await page.evaluate(async () => {
    const runs = await ClassroomStore.listClassRuns();
    const ls = await ClassroomStore.listLearners(runs[0].classRunId);
    const retake = await ClassroomStore.startAttempt({
      classRunId: runs[0].classRunId, learnerId: ls[0].learnerId, activityId: "m4-quiz" });
    await ClassroomStore.submitAttempt(retake.attemptId, { score: 9 });
    const all = await ClassroomStore.attemptsFor(runs[0].classRunId, ls[0].learnerId, "m4-quiz");
    return all.map(a => ({ n: a.attemptNumber, score: a.score }));
  });
  assert.equal(r.length, 2, "a retake is a new attempt, not an overwrite");
  assert.deepEqual(r, [{ n: 1, score: 7 }, { n: 2, score: 9 }]);
});

await check("feedback release is recorded separately from submission", async () => {
  const r = await page.evaluate(async () => {
    const runs = await ClassroomStore.listClassRuns();
    const ls = await ClassroomStore.listLearners(runs[0].classRunId);
    const all = await ClassroomStore.attemptsFor(runs[0].classRunId, ls[0].learnerId, "m4-quiz");
    const fresh = await ClassroomStore.startAttempt({
      classRunId: runs[0].classRunId, learnerId: ls[0].learnerId, activityId: "m5-quiz" });
    let early = null;
    try { await ClassroomStore.releaseFeedback(fresh.attemptId); } catch (e) { early = e.message; }
    const released = await ClassroomStore.releaseFeedback(all[0].attemptId);
    return { early, released: !!released.feedbackReleasedAt,
             submittedFirst: released.submittedAt < released.feedbackReleasedAt };
  });
  assert.ok(r.early, "feedback cannot be released before an attempt is submitted");
  assert.ok(r.released);
  assert.ok(r.submittedFirst, "submission must precede the key");
});

console.log("\nclassroom store — drafts, observations, export");

await check("free-text drafts debounce, and flush before navigation", async () => {
  const r = await page.evaluate(async () => {
    const runs = await ClassroomStore.listClassRuns();
    const ls = await ClassroomStore.listLearners(runs[0].classRunId);
    const saver = ClassroomStore.makeDebouncedDraftSaver(50);
    for (const t of ["a", "ab", "abc", "abcd"]) {
      saver.queue(runs[0].classRunId, ls[0].learnerId, "m1-case", { notes: t });
    }
    const pendingBefore = saver.pendingCount;
    await saver.flush();
    const d = await ClassroomStore.getDraft(runs[0].classRunId, ls[0].learnerId, "m1-case");
    return { pendingBefore, notes: d.data.notes, pendingAfter: saver.pendingCount };
  });
  assert.equal(r.pendingBefore, 1, "four keystrokes collapse to one pending write");
  assert.equal(r.notes, "abcd", "the flush writes the latest text");
  assert.equal(r.pendingAfter, 0);
});

await check("observations record independent / prompted / not-observed, unverified", async () => {
  const r = await page.evaluate(async () => {
    const runs = await ClassroomStore.listClassRuns();
    const ls = await ClassroomStore.listLearners(runs[0].classRunId);
    const o1 = await ClassroomStore.recordObservation({
      classRunId: runs[0].classRunId, learnerId: ls[0].learnerId, activityId: "m6-practice",
      criterionId: "readiness", status: "prompted", attemptNumber: 1, observerName: "Instructor" });
    const o2 = await ClassroomStore.recordObservation({
      classRunId: runs[0].classRunId, learnerId: ls[0].learnerId, activityId: "m6-practice",
      criterionId: "readiness", status: "independent", attemptNumber: 2, observerName: "Instructor" });
    let bad = null;
    try {
      await ClassroomStore.recordObservation({
        classRunId: runs[0].classRunId, learnerId: ls[0].learnerId, activityId: "m6-practice",
        criterionId: "readiness", status: "passed" });
    } catch (e) { bad = e.message; }
    const all = await ClassroomStore.listObservations(runs[0].classRunId, ls[0].learnerId, "m6-practice");
    return { n: all.length, verified: o1.verified, statuses: all.map(x => x.status).sort(), bad };
  });
  assert.equal(r.n, 2, "the prompted first attempt is retained after a successful retry");
  assert.deepEqual(r.statuses, ["independent", "prompted"]);
  assert.equal(r.verified, false, "a local save is not a server-verified observation");
  assert.ok(r.bad, "an invented observation status must be refused");
});

await check("CSV export neutralises spreadsheet formulas in learner text", async () => {
  const csv = await page.evaluate(async () => {
    const runs = await ClassroomStore.listClassRuns();
    const ls = await ClassroomStore.createLearner(runs[0].classRunId, {
      displayName: '=HYPERLINK("http://evil","click")' });
    const a = await ClassroomStore.startAttempt({
      classRunId: runs[0].classRunId, learnerId: ls.learnerId, activityId: "m2-quiz" });
    await ClassroomStore.submitAttempt(a.attemptId, { score: 8 });
    return ClassroomStore.exportCSV(runs[0].classRunId);
  });
  assert.ok(csv.includes(`"'=HYPERLINK`), "a leading = must be escaped so Excel does not execute it");
  assert.ok(!/\n=/.test(csv) && !/,=/.test(csv), "no bare formula prefix survives");
});

await check("a JSON export/import round trip keeps ids and attempt history", async () => {
  const r = await page.evaluate(async () => {
    const runs = await ClassroomStore.listClassRuns();
    const before = await ClassroomStore.exportJSON(runs[0].classRunId);
    await ClassroomStore.resetClassroomData();
    const emptied = (await ClassroomStore.listAttempts(runs[0].classRunId)).length;
    const first = await ClassroomStore.importJSON(before);
    const second = await ClassroomStore.importJSON(before);   // re-import the same backup
    const after = await ClassroomStore.exportJSON(runs[0].classRunId);
    return {
      emptied,
      sameAttempts: before.attempts.length === after.attempts.length,
      sameIds: before.attempts.map(a => a.attemptId).sort().join() ===
               after.attempts.map(a => a.attemptId).sort().join(),
      numbers: after.attempts.filter(a => a.activityId === "m4-quiz")
                             .map(a => a.attemptNumber).sort(),
      firstImported: first.attempts, secondSkipped: second.skipped
    };
  });
  assert.equal(r.emptied, 0);
  assert.ok(r.sameAttempts && r.sameIds, "ids and attempts survive the round trip");
  assert.deepEqual(r.numbers, [1, 2], "both attempts come back, in order");
  assert.ok(r.firstImported > 0);
  assert.equal(r.secondSkipped, r.firstImported, "re-importing the same backup duplicates nothing");
});

await check("an export from a different course version is refused", async () => {
  const msg = await page.evaluate(async () => {
    const runs = await ClassroomStore.listClassRuns();
    const d = await ClassroomStore.exportJSON(runs[0].classRunId);
    d.courseVersion = "vta-classroom-2099-01-01-r9";
    try { await ClassroomStore.importJSON(d); return "accepted"; } catch (e) { return e.message; }
  });
  assert.match(msg, /course/i, "records answered against other questions must not merge silently");
});

console.log("\nseparation from the self-paced course (criterion 14)");

await check("nothing in the classroom layer reads or writes the self-paced state", async () => {
  for (const f of ["vta/classroom-store.js", "vta/classroom-content.js"]) {
    const src = fs.readFileSync(path.join(ROOT, f), "utf8");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assert.ok(!/vta-pwa-state-v2/.test(code), f + " must not touch the self-paced record");
    assert.ok(!/localStorage/.test(code), f + " keeps classroom work in its own database");
    assert.ok(!/certificate/i.test(code), f + " must not be able to issue the self-paced certificate");
  }
});

await check("the classroom database is its own, separate from the academy's", async () => {
  const name = await page.evaluate(() => ClassroomStore.DB_NAME);
  assert.equal(name, "vta-classroom");
  const survived = await page.evaluate(async () => {
    localStorage.setItem("vta-pwa-state-v2", JSON.stringify({ modules: { 1: { done: true } } }));
    await ClassroomStore.resetClassroomData();
    return localStorage.getItem("vta-pwa-state-v2");
  });
  assert.ok(survived && survived.includes("done"),
    "clearing classroom records must not erase self-paced history");
});

await check("no page errors were raised during the whole run", async () => {
  assert.deepEqual(pageErrors, []);
});

fs.unlinkSync(path.join(ROOT, "vta/__harness.html"));
await browser.close();
srv.close();

console.log(`\n${PASS} passed, ${FAIL} failed`);
if (FAIL) { console.log("failed: " + failures.join(", ")); process.exit(1); }
