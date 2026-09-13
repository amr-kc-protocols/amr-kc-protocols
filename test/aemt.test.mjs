/*
 * AEMT Series — Phase 1 engine (aemt-series.html)
 * ------------------------------------------------
 * Drives the real page in headless Chromium against the real seed content and
 * the real vendored FSRS build. Nothing is stubbed: the point of Phase 1 is
 * that the engine works, so a test that mocks the scheduler tests nothing.
 *
 * What this defends, in the order the spec argues for it:
 *
 *   1. All seven NREMT item types render and score dichotomously (§5.1). If
 *      the PWA only serves four-option multiple choice we are training the
 *      wrong motor pattern, so each renderer is exercised for both a right
 *      and a wrong answer.
 *   2. The block runs its fixed seven-step sequence (§4.2), pretest feedback
 *      is withheld until the callback, and completing a block never marks it
 *      mastered (§9).
 *   3. The three scheduler overrides FSRS does not handle (§8.3) — the
 *      confidently-wrong re-queue, the course-date anchor, and the 45-day
 *      lapse floor on high-stakes items.
 *   4. The mastery model is the deterministic four-part rule in §9, and
 *      completion and mastery are never merged into one number.
 *   5. Due-count outranks new material on the home screen (§4.3), the queue
 *      interleaves only attempted chapters, and state survives a reload.
 *
 * Run:  cd test && npm install && node aemt.test.mjs
 */
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json",
  ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon" };
const site = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  const f = path.join(ROOT, u === "/" ? "index.html" : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    res.writeHead(404); return res.end("nf");
  }
  res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" });
  res.end(fs.readFileSync(f));
});
await new Promise((r) => site.listen(8104, "127.0.0.1", r));

let PASS = 0, FAIL = 0; const fails = [];
const check = (n, ok, extra = "") => {
  if (ok) { PASS++; console.log("  PASS  " + n); }
  else { FAIL++; fails.push(n); console.log("  FAIL  " + n + (extra ? "\n        " + extra : "")); }
};

async function launch() {
  const known = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  const exe = process.env.CHROMIUM_PATH || (fs.existsSync(known) ? known : null);
  try { return await chromium.launch(exe ? { executablePath: exe } : {}); }
  catch { return await chromium.launch(); }
}
const browser = await launch();

async function open() {
  const ctx = await browser.newContext({ viewport: { width: 414, height: 900 } });
  const page = await ctx.newPage();
  page._errs = [];
  page.on("pageerror", (e) => page._errs.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error" && !/net::ERR/.test(m.text())) page._errs.push("CONSOLE:" + m.text());
  });
  await page.goto("http://127.0.0.1:8104/aemt-series.html", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__AEMT_READY || window.__AEMT_ERROR, { timeout: 20000 });
  return page;
}

/* Render one item by id into a scratch host and answer it. `how` is "right"
   or "wrong". Returns what the renderer graded. */
async function answerItem(page, itemId, how) {
  return page.evaluate(([id, how]) => {
    const it = window.AEMT.itemById(id);
    const host = document.createElement("div");
    document.body.appendChild(host);
    const r = window.AEMT.Render[it.type](it);
    host.appendChild(r.el);

    const correctIds = (it.options || []).filter((o) => o.correct).map((o) => o.id);
    const click = (sel) => { const e = host.querySelector(sel); if (e) e.click(); return !!e; };

    if (it.type === "mc" || it.type === "graphical") {
      const want = how === "right" ? correctIds[0]
        : (it.options.find((o) => !o.correct) || {}).id;
      click(`.opt[data-opt="${want}"]`);
    } else if (it.type === "mr") {
      const ids = how === "right" ? correctIds
        : correctIds.slice(0, 1);                      // too few = wrong, dichotomous
      ids.forEach((i) => click(`.opt[data-opt="${i}"]`));
    } else if (it.type === "build_list") {
      // Move rows until the order matches the authored order, then optionally
      // swap the first two to make it wrong.
      const target = it.options.map((o) => o.id);
      for (let pass = 0; pass < 12; pass++) {
        const now = [...host.querySelectorAll(".ord-row")].map((r) => r.getAttribute("data-opt"));
        let done = true;
        for (let i = 0; i < target.length; i++) {
          if (now[i] !== target[i]) {
            const from = now.indexOf(target[i]);
            const rows = host.querySelectorAll(".ord-row");
            for (let k = from; k > i; k--) rows[k] && rows[k].querySelector(".ord-btn").click();
            done = false; break;
          }
        }
        if (done) break;
      }
      if (how === "wrong") {
        const rows = host.querySelectorAll(".ord-row");
        rows[1] && rows[1].querySelector(".ord-btn").click();
      }
    } else if (it.type === "drag_drop") {
      const map = it.answer_map || {};
      const cats = it.categories.map((c) => c.id);
      it.options.forEach((o) => {
        const want = how === "right" ? map[o.id] : cats.find((c) => c !== map[o.id]);
        click(`.dd-pool .dd-chip[data-opt="${o.id}"]`);
        const bin = host.querySelector(`.dd-bin[data-cat="${want}"]`);
        if (bin) bin.click();
      });
    } else if (it.type === "options_box") {
      it.rows.forEach((row, idx) => {
        const want = how === "right" ? row.answer
          : it.columns.map((c) => c.id).find((c) => c !== row.answer);
        click(`.ob-pick[data-row="${row.id}"][data-col="${want}"]`);
      });
    }
    const resp = r.read();
    const graded = r.grade(resp);
    r.showAnswer();
    const painted = host.querySelectorAll(".was-correct,.graded-ok,.graded-no").length;
    host.remove();
    return { graded, painted, type: it.type };
  }, [itemId, how]);
}

/* ── A. Boot, vendored scheduler, seed integrity ───────────────────────── */
{ const p = await open();
  check("A1 the page boots with no error", await p.evaluate(() => !!window.__AEMT_READY),
    await p.evaluate(() => window.__AEMT_ERROR));
  check("A2 the vendored FSRS build loaded", await p.evaluate(() => typeof window.FSRS.fsrs === "function"));
  const s = await p.evaluate(() => ({
    items: window.AEMT.series.items.length,
    v10Items: window.AEMT.series.items.filter((i) => i.chapter <= 4).length,
    blocks: window.AEMT.series.blocks.length,
    types: [...new Set(window.AEMT.series.items.map((i) => i.type))].sort(),
    noRationale: window.AEMT.series.items.filter((i) =>
      (i.options || []).some((o) => !o.rationale)).map((i) => i.id),
    noSource: window.AEMT.series.items.filter((i) => !i.source_ref).map((i) => i.id),
    // Placeholder chapters must still be flagged; authored ones must not be.
    placeholderUnflagged: window.AEMT.series.items
      .filter((i) => (window.AEMT.series.chapter_meta[i.chapter] || {}).seed)
      .filter((i) => i.seed_throwaway !== true).map((i) => i.id),
    authoredFlagged: window.AEMT.series.items
      .filter((i) => !(window.AEMT.series.chapter_meta[i.chapter] || {}).seed)
      .filter((i) => i.seed_throwaway === true).map((i) => i.id),
  }));
  // §12 asked for 20 throwaway items for the Phase 1 engine. v1.1 adds its own
  // on top, so the v1.0 portion is what that number refers to. Read it from the
  // seed file rather than from what is loaded: an authored chapter drops its
  // seed, so the loaded count falls as chapters are written.
  const seedDoc = JSON.parse(fs.readFileSync(path.join(ROOT, "aemt/series-preparatory.json"), "utf8"));
  check("A3 the Phase 1 seed file still carries its 20 items",
    seedDoc.items.filter((i) => i.chapter <= 4).length === 20,
    String(seedDoc.items.length) + " in file, " + String(s.items) + " loaded");
  check("A4 every NREMT item type is represented",
    ["build_list", "drag_drop", "graphical", "mc", "mr", "options_box", "scenario"]
      .every((t) => s.types.includes(t)), s.types.join(","));
  // §5.2 rule 4: a distractor you cannot write a rationale for is filler.
  check("A5 every option carries a rationale", s.noRationale.length === 0, s.noRationale.join(","));
  // §5.2 rule 7: cite the source on every item.
  check("A6 every item carries a source_ref", s.noSource.length === 0, s.noSource.join(","));
  check("A7 every item in a placeholder chapter is still flagged throwaway",
    s.placeholderUnflagged.length === 0, s.placeholderUnflagged.join(","));
  check("A8 and nothing in an authored chapter is",
    s.authoredFlagged.length === 0, s.authoredFlagged.join(","));
  // The claim on the home screen is the honest one for a study supplement.
  const about = await p.textContent(".about");
  check("A9 the page says what it is, and what it is not",
    /study tool, not a course of record/i.test(about) &&
    /does not certify/i.test(about), about.slice(0, 160));
  check("A10 it names the chapters that are written",
    /Written:/.test(about) && /Ch 5/.test(about), about.slice(0, 200));
  check("A11 and flags them as not yet instructor-reviewed",
    /not yet instructor-reviewed/i.test(about));
  check("A12 and names the chapters that are still placeholder",
    /Placeholder so far/i.test(about) && /Ch 3/.test(about));
  check("A9 no errors", p._errs.length === 0, p._errs.join("|"));
  await p.context().close(); }

/* ── B. The seven renderers, right and wrong (§5.1) ────────────────────── */
{ const p = await open();
  const cases = [
    ["mc", "itm-1.1.001"], ["mr", "itm-seed.004"], ["build_list", "itm-seed.006"],
    ["drag_drop", "itm-seed.008"], ["options_box", "itm-seed.010"], ["graphical", "itm-seed.011"],
  ];
  for (const [type, id] of cases) {
    const right = await answerItem(p, id, "right");
    const wrong = await answerItem(p, id, "wrong");
    check(`B ${type}: a correct answer grades correct`, right.graded === true, JSON.stringify(right));
    check(`B ${type}: a wrong answer grades wrong`, wrong.graded === false, JSON.stringify(wrong));
    check(`B ${type}: showAnswer paints the answer`, right.painted > 0, String(right.painted));
  }
  // mr is dichotomous — a subset of the correct options is still wrong (§5.1).
  const partial = await p.evaluate(() => {
    const it = window.AEMT.itemById("itm-seed.004");
    const r = window.AEMT.Render.mr(it);
    const correct = it.options.filter((o) => o.correct).map((o) => o.id);
    return r.grade(correct.slice(0, correct.length - 1));
  });
  check("B mr: a partly-right selection earns nothing", partial === false);
  // scenario children are separate items and are not themselves queued
  const sc = await p.evaluate(() => {
    const parent = window.AEMT.itemById("itm-seed.012");
    return { kids: parent.children.length,
             kidsExist: parent.children.every((c) => !!window.AEMT.itemById(c)),
             parentInDue: window.AEMT.drillItems(null, 99).some((i) => i.type === "scenario") };
  });
  check("B scenario: its linked items resolve", sc.kids >= 2 && sc.kidsExist, JSON.stringify(sc));
  check("B scenario: the container itself never enters a queue", sc.parentInDue === false);
  check("B no errors", p._errs.length === 0, p._errs.join("|"));
  await p.context().close(); }

/* ── C. §8.3 override 1 — confidently wrong ────────────────────────────── */
{ const p = await open();
  const r = await p.evaluate(() => {
    const A = window.AEMT;
    const hs = A.itemById("itm-seed.001");     // high_stakes
    const lo = A.itemById("itm-seed.016");     // not high_stakes
    // Build a real history forward in time, then branch at one moment so the
    // three outcomes are compared from identical state.
    let prev = null, d = new Date("2026-01-01T12:00:00Z");
    for (let i = 0; i < 5; i++) { prev = A.Sched.review(hs, prev, true, null, d); d = new Date(prev.due); }
    const now = d;
    const stillRight  = A.Sched.review(hs, prev, true,  "sure",   now).due;
    const sureWrong   = A.Sched.review(hs, prev, false, "sure",   now).due;
    const unsureWrong = A.Sched.review(hs, prev, false, "unsure", now).due;
    const lowSureWrong = A.Sched.review(lo, null, false, "sure", now).due;
    return { stillRight, sureWrong, unsureWrong, lowSureWrong,
             tomorrow: A.dayKey(A.addDays(now, 1)), today: A.dayKey(now),
             sureDay: A.dayKey(new Date(sureWrong)),
             unsureDay: A.dayKey(new Date(unsureWrong)),
             lowDay: A.dayKey(new Date(lowSureWrong)) };
  });
  check("C1 a confidently-wrong high-stakes item is forced to tomorrow",
    r.sureDay === r.tomorrow, `${r.sureDay} vs ${r.tomorrow}`);
  check("C2 the same item answered correctly goes much further out",
    new Date(r.stillRight) > new Date(r.sureWrong), `${r.stillRight} vs ${r.sureWrong}`);
  // A hesitant wrong answer is a normal lapse — FSRS relearns it the same day.
  check("C3 a hesitant wrong answer is left to FSRS, not forced to tomorrow",
    r.unsureDay === r.today, `${r.unsureDay} vs today ${r.today}`);
  check("C4 the override does not fire on a low-stakes item",
    r.lowDay === r.today, `${r.lowDay} vs today ${r.today}`);
  check("C5 which is the whole point — the two wrong answers differ only by stakes",
    r.sureDay !== r.lowDay, `${r.sureDay} / ${r.lowDay}`);
  check("C no errors", p._errs.length === 0, p._errs.join("|"));
  await p.context().close(); }

/* ── D. §8.3 override 3 — the 45-day lapse floor ───────────────────────── */
{ const p = await open();
  const r = await p.evaluate(() => {
    const A = window.AEMT;
    // Identical all-correct histories, differing only in high_stakes.
    function drive(item, n) {
      let prev = null, d = new Date("2026-01-01T12:00:00Z"), gaps = [];
      for (let i = 0; i < n; i++) {
        const rec = A.Sched.review(item, prev, true, null, d);
        gaps.push(Math.round((new Date(rec.due) - d) / 86400000));
        prev = rec; d = new Date(rec.due);
      }
      return { gaps, stability: prev.stability };
    }
    return { high: drive(A.itemById("itm-seed.001"), 12),
             low:  drive(A.itemById("itm-seed.016"), 12),
             floor: A.LAPSE_FLOOR_DAYS };
  });
  // If intervals never expand, the scheduler is running but spacing is not —
  // this is the assertion that catches a card being reset to New each review.
  check("D1 intervals actually expand across reviews",
    r.low.gaps[5] > r.low.gaps[3] && r.low.gaps[3] > r.low.gaps[2],
    JSON.stringify(r.low.gaps));
  check("D2 a low-stakes item is allowed well past 45 days",
    Math.max(...r.low.gaps) > r.floor, JSON.stringify(r.low.gaps));
  check("D3 a high-stakes item never is",
    Math.max(...r.high.gaps) <= r.floor, JSON.stringify(r.high.gaps));
  check("D4 and it sits at the floor rather than short of it",
    r.high.gaps.filter((g) => g === r.floor).length >= 3, JSON.stringify(r.high.gaps));
  check("D5 the two only diverge once the floor bites",
    r.high.gaps[2] === r.low.gaps[2], `${r.high.gaps[2]} vs ${r.low.gaps[2]}`);
  check("D no errors", p._errs.length === 0, p._errs.join("|"));
  await p.context().close(); }

/* ── E. §8.3 override 2 — the course-date anchor ───────────────────────── */
{ const p = await open();
  const r = await p.evaluate(() => {
    const A = window.AEMT;
    const item = A.itemById("itm-1.1.001");    // chapter 1, not high stakes
    const now = new Date("2026-09-11T12:00:00Z");
    const noAnchor = A.Sched.review(item, null, true, null, now).due;
    A.state.settings.course_dates = { "1": "2026-09-25" };
    const first = A.Sched.review(item, null, true, null, now);
    // One success recorded; one more is still needed before the course date.
    const second = A.Sched.review(item, first, true, null, new Date(first.due));
    A.state.settings.course_dates = {};
    return { noAnchor, first: first.due, second: second.due,
             course: "2026-09-25",
             firstDay: A.dayKey(new Date(first.due)), secondDay: A.dayKey(new Date(second.due)) };
  });
  check("E1 the first review lands at least a day before the course date",
    new Date(r.first) <= new Date("2026-09-24T23:59:59Z"), r.firstDay);
  check("E2 and the second still lands on or before it",
    new Date(r.second) <= new Date("2026-09-25T23:59:59Z"), r.secondDay);
  check("E3 with no course date set, nothing is compressed",
    new Date(r.noAnchor) >= new Date("2026-09-11T00:00:00Z"), r.noAnchor);
  check("E no errors", p._errs.length === 0, p._errs.join("|"));
  await p.context().close(); }

/* ── F. §9 mastery — all four conditions, and completion ≠ mastery ─────── */
{ const p = await open();
  const r = await p.evaluate(() => {
    const M = window.AEMT.Mastery;
    const base = { successes: 3, attempts: 3, correct_items: ["a", "b", "c"],
                   correct_intervals: [1, 9, 14], last_attempts: [true, true] };
    const mut = (o) => M.objective(Object.assign({}, base, o));
    return {
      full:            M.objective(base),
      tooFewSuccesses: mut({ successes: 2, correct_intervals: [1, 9] }),
      tooFewItems:     mut({ correct_items: ["a", "b"] }),
      oneInterval:     mut({ correct_intervals: [7, 7, 7] }),
      lastTooSoon:     mut({ correct_intervals: [1, 9, 3] }),
      recentLapse:     mut({ last_attempts: [true, false] }),
      untouched:       M.objective(null),
      startedOnly:     M.objective({ successes: 0, attempts: 1, correct_items: [],
                                     correct_intervals: [], last_attempts: [false] }),
    };
  });
  check("F1 all four conditions met is mastered", r.full === "mastered", r.full);
  check("F2 fewer than 3 successes is not", r.tooFewSuccesses === "practicing", r.tooFewSuccesses);
  check("F3 fewer than 3 distinct items is not", r.tooFewItems === "practicing", r.tooFewItems);
  check("F4 a single spacing interval is not", r.oneInterval === "practicing", r.oneInterval);
  check("F5 a most-recent interval under 7 days is not", r.lastTooSoon === "practicing", r.lastTooSoon);
  check("F6 a lapse in the last two attempts is not", r.recentLapse === "practicing", r.recentLapse);
  check("F7 never attempted reads not_started", r.untouched === "not_started", r.untouched);
  check("F8 attempted but never right reads practicing", r.startedOnly === "practicing", r.startedOnly);

  // Chapter mastery threshold is 90% of its objectives.
  const ch = await p.evaluate(() => {
    const A = window.AEMT;
    const objs = A.series.objectives.filter((o) => o.chapter === 3);
    const win = { successes: 3, attempts: 3, correct_items: ["a", "b", "c"],
                  correct_intervals: [1, 9, 14], last_attempts: [true, true] };
    objs.forEach((o) => { A.state.objectives[o.id] = Object.assign({}, win); });
    const all = A.Mastery.chapter(3);
    A.state.objectives[objs[0].id] = { successes: 0, attempts: 1, correct_items: [],
                                       correct_intervals: [], last_attempts: [false] };
    const partial = A.Mastery.chapter(3);
    objs.forEach((o) => delete A.state.objectives[o.id]);
    return { all, partial, count: objs.length };
  });
  check("F9 a chapter with every objective mastered is mastered", ch.all.mastered === true,
    JSON.stringify(ch.all));
  check("F10 dropping one below 90% un-masters the chapter", ch.partial.mastered === false,
    JSON.stringify(ch.partial));
  await p.context().close(); }

/* ── G. The block sequence (§4.2) and completion ≠ mastery (§9) ────────── */
{ const p = await open();
  check("G1 the home screen offers a block", await p.isVisible("#btn-next-block"));
  // Pin to the block this was written against rather than whichever happens to
  // be first — the running order changes every time a chapter is authored.
  await p.evaluate(() => {
    const A = window.AEMT;
    const i = A.series.blocks.findIndex((b) => b.id === "3.5");
    A.series.blocks.unshift(A.series.blocks.splice(i, 1)[0]);
    A.state.blocks = {};
    A.renderHome();
  });
  await p.click("#btn-next-block");
  await p.waitForSelector("#screen-session .cold");
  check("G2 it opens on the cold open", /gas-station|parking lot/i.test(await p.textContent(".cold")));
  check("G3 which ends on a decision point", (await p.locator(".cold-dp").count()) === 1);
  await p.click('#screen-session button.btn:text-is("Start")');
  await p.waitForTimeout(250);

  const pre = await p.textContent("#screen-session");
  check("G4 the pretest tells the learner guessing is fine", /Guessing is fine/i.test(pre));
  check("G5 the pretest item renders before any content",
    (await p.locator("#screen-session .opt").count()) > 0);
  await p.click("#screen-session .opt");
  await p.click('#screen-session button.btn:text-is("Check answer")');
  await p.waitForTimeout(200);
  // itm-seed.001 is high-stakes, so confidence is asked.
  check("G6 a high-stakes item asks for confidence",
    (await p.locator(".conf").count()) === 1);
  await p.click('.conf button.btn:text-is("Sure")');
  await p.waitForTimeout(200);
  check("G7 pretest feedback is withheld until the callback",
    (await p.locator("#screen-session .fb").count()) === 0);
  check("G8 and it hands off to the content",
    (await p.locator('#screen-session button.btn:text-is("Now the content")').count()) === 1);

  // Walk the rest of the block.
  let guard = 0;
  while (guard++ < 80) {
    if (await p.locator("#screen-home:not(.hidden)").count()) break;
    const check1 = p.locator('#screen-session button.btn:text-is("Check answer")');
    if (await check1.count()) {
      const t = await p.evaluate(() => {
        const h = document.querySelector("#screen-session");
        if (h.querySelector(".ord")) return "ord";
        if (h.querySelector(".dd-bins")) return "dd";
        if (h.querySelector(".ob")) return "ob";
        return "opt";
      });
      // The walker's job is to get through the block; how each renderer takes
      // input is asserted in blocks B and L. Driving the DOM directly keeps it
      // from fighting actionability waits on nodes that re-render mid-answer.
      await p.evaluate((kind) => {
        const h = document.querySelector("#screen-session");
        if (kind === "opt") { const o = h.querySelector(".opt"); if (o) o.click(); }
        else if (kind === "ob") {
          h.querySelectorAll(".ob-row").forEach((row) => {
            const pick = row.querySelector(".ob-pick"); if (pick) pick.click();
          });
        } else if (kind === "dd") {
          for (let i = 0; i < 8; i++) {
            const chip = h.querySelector(".dd-pool .dd-chip"); if (!chip) break;
            chip.click();
            h.querySelector(".dd-bin").click();
          }
        }
      }, t);
      await p.waitForTimeout(80);
      if (await check1.count() && !(await check1.isDisabled())) await check1.click();
      await p.waitForTimeout(150);
      const conf = p.locator('.conf button.btn:text-is("Not sure")');
      if (await conf.count()) { await conf.click(); await p.waitForTimeout(120); }
    }
    let moved = false;
    for (const label of ["Now the content", "Next", "Continue", "Next question", "Finish block", "Back to home"]) {
      const b = p.locator(`#screen-session button.btn:text-is("${label}")`);
      if (await b.count()) { await b.first().click(); moved = true; break; }
    }
    await p.waitForTimeout(180);
    if (!moved && !(await check1.count())) break;
  }

  const after = await p.evaluate(() => {
    const A = window.AEMT;
    return { block: A.state.blocks["3.5"],
             scheduled: Object.keys(A.state.items).length,
             mastered: Object.keys(A.state.objectives)
               .filter((k) => A.Mastery.objective(A.state.objectives[k]) === "mastered").length };
  });
  check("G9 the block is marked completed", !!(after.block && after.block.completed_at),
    JSON.stringify(after.block));
  check("G10 every item answered entered the queue", after.scheduled >= 6, String(after.scheduled));
  // The standard failure mode of every EMS LMS these crews have been through.
  check("G11 completing a block masters nothing", after.mastered === 0, String(after.mastered));
  check("G no errors", p._errs.length === 0, p._errs.join("|"));
  await p.context().close(); }

/* ── H. Home ordering, queue scope, persistence (§4.3, §7.3, §10) ──────── */
{ const p = await open();
  // Review outranks new material: the due count is the first thing on screen.
  const order = await p.evaluate(() => {
    const hero = document.querySelector(".due-hero");
    const nb = document.querySelector("#btn-next-block") || document.querySelector(".card");
    return { heroTop: hero.getBoundingClientRect().top, nbTop: nb.getBoundingClientRect().top };
  });
  check("H1 the due count sits above the next block", order.heroTop < order.nbTop,
    JSON.stringify(order));
  check("H2 two progress bars, and they are separate",
    (await p.locator(".bar-fill.completion").count()) === 1 &&
    (await p.locator(".bar-fill.mastery").count()) === 1);

  // The queue only draws from chapters the learner has actually opened.
  const scope = await p.evaluate(() => {
    const A = window.AEMT;
    const before = A.dueItems(new Date()).length;
    const past = new Date(Date.now() - 86400000).toISOString();
    A.series.items.filter((i) => i.type !== "scenario").forEach((i) => {
      A.state.items[i.id] = { due: past, stability: 1, difficulty: 5, reps: 1, lapses: 0,
                              state: "review", last_review: past };
    });
    const noBlocks = A.dueItems(new Date()).length;
    A.state.blocks["3.5"] = { attempted: true, completed_at: null };
    const ch3 = A.dueItems(new Date());
    return { before, noBlocks, ch3Count: ch3.length,
             ch3Only: ch3.every((i) => i.chapter === 3),
             chapters: [...new Set(ch3.map((i) => i.chapter))] };
  });
  check("H3 nothing is due before any block is attempted", scope.noBlocks === 0, String(scope.noBlocks));
  check("H4 attempting a chapter 3 block brings only chapter 3 items due",
    scope.ch3Count > 0 && scope.ch3Only, JSON.stringify(scope.chapters));

  // State survives a reload — local-first is the whole storage story (§7.3).
  await p.evaluate(() => {
    window.AEMT.state.blocks["3.5"] = { attempted: true, completed_at: new Date().toISOString() };
    window.AEMT.state.streak_days = 4;
    return window.AEMT.saveState();
  });
  await p.reload({ waitUntil: "domcontentloaded" });
  await p.waitForFunction(() => window.__AEMT_READY);
  const persisted = await p.evaluate(() => ({
    completed: !!(window.AEMT.state.blocks["3.5"] || {}).completed_at,
    streak: window.AEMT.state.streak_days,
    items: Object.keys(window.AEMT.state.items).length,
  }));
  check("H5 block completion survives a reload", persisted.completed === true);
  check("H6 so does the streak", persisted.streak === 4, String(persisted.streak));
  check("H7 and the scheduled items", persisted.items > 0, String(persisted.items));
  check("H no errors", p._errs.length === 0, p._errs.join("|"));
  await p.context().close(); }

/* ── I. Export / import round-trip (§7.3) ──────────────────────────────── */
{ const p = await open();
  const round = await p.evaluate(() => {
    const A = window.AEMT;
    A.state.streak_days = 9;
    A.state.objectives["obj-seed.a"] = { successes: 3, attempts: 3,
      correct_items: ["a", "b", "c"], correct_intervals: [1, 9, 14], last_attempts: [true, true] };
    const payload = { exported_at: new Date().toISOString(), series: A.series.id,
                      series_version: A.series.version, state: A.state };
    const json = JSON.stringify(payload);
    const back = JSON.parse(json).state;
    return { roundTripped: back.streak_days === 9,
             mastery: A.Mastery.objective(back.objectives["obj-seed.a"]),
             hasSchema: back.schema_version === 2, schema: String(back.schema_version),
             hasUser: typeof back.user_id === "string" && back.user_id.length > 0 };
  });
  check("I1 state survives a JSON round trip", round.roundTripped);
  check("I2 the mastery model reads the imported record", round.mastery === "mastered", round.mastery);
  check("I3 the export carries the current schema version", round.hasSchema, round.schema);
  check("I4 and a local user id", round.hasUser);
  check("I5 the export and import controls exist",
    await p.evaluate(() => { document.getElementById("btn-progress").click();
      return !!document.getElementById("btn-export") && !!document.getElementById("btn-import"); }));
  await p.context().close(); }

/* ── J. Accessibility and the offline shell ────────────────────────────── */
{ const p = await open();
  await p.click("#btn-next-block");
  await p.waitForSelector('#screen-session button.btn:text-is("Start")');
  await p.click('#screen-session button.btn:text-is("Start")');
  await p.waitForTimeout(250);
  const a11y = await p.evaluate(() => {
    const small = [...document.querySelectorAll("button")]
      .filter((b) => b.offsetParent !== null)
      .map((b) => ({ t: (b.textContent || "").trim().slice(0, 24), h: Math.round(b.getBoundingClientRect().height) }))
      .filter((b) => b.h < 44);
    return { small, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  check("J1 every visible control clears the 44px target", a11y.small.length === 0,
    JSON.stringify(a11y.small));
  check("J2 nothing scrolls sideways on a phone", a11y.overflow <= 0, String(a11y.overflow));

  // §5.1 build_list and drag_drop must be operable without dragging — WCAG 2.2
  // SC 2.5.7, which the spec's own accessibility constraint pulls in.
  const noDrag = await p.evaluate(() => {
    const A = window.AEMT;
    const bl = A.Render.build_list(A.itemById("itm-seed.006"));
    const dd = A.Render.drag_drop(A.itemById("itm-seed.008"));
    document.body.appendChild(bl.el); document.body.appendChild(dd.el);
    const r = { orderButtons: bl.el.querySelectorAll(".ord-btn").length,
                orderLabelled: [...bl.el.querySelectorAll(".ord-btn")].every((b) => b.getAttribute("aria-label")),
                ddTapTargets: dd.el.querySelectorAll(".dd-chip").length,
                usesHtml5Drag: !!(bl.el.querySelector("[draggable]") || dd.el.querySelector("[draggable]")) };
    bl.el.remove(); dd.el.remove();
    return r;
  });
  check("J3 build_list is reorderable by button", noDrag.orderButtons > 0, String(noDrag.orderButtons));
  check("J4 and those buttons are labelled", noDrag.orderLabelled === true);
  check("J5 drag_drop is operable by tapping", noDrag.ddTapTargets > 0, String(noDrag.ddTapTargets));
  check("J6 neither depends on a drag gesture", noDrag.usesHtml5Drag === false);
  await p.context().close(); }

/* ── K. It ships inside the existing PWA, not beside it (§10) ──────────── */
{ const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  // Every source the manifest names has to be precached, or an authored
  // chapter simply does not exist in a bay with no signal.
  for (const asset of ["aemt-series.html", "aemt/series.json", "aemt/ch05-terminology.json",
                       "aemt/series-preparatory.json", "aemt/fsrs-5.4.2.umd.js",
                       "aemt/seed-tpopp-placeholder.svg", "aemt/seed-airway-placeholder.svg",
                       "aemt/fig-abdominal-quadrants.svg"]) {
    check(`K precached: ${asset}`, sw.includes(asset), "not in sw.js ASSETS");
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "aemt/series.json"), "utf8"));
  const unprecached = manifest.sources.map((x) => x.file).filter((f) => !sw.includes(f));
  check("K every chapter file in the manifest is precached",
    unprecached.length === 0, unprecached.join(","));
  const missingFile = manifest.sources.map((x) => x.file)
    .filter((f) => !fs.existsSync(path.join(ROOT, f)));
  check("K and every one of them exists", missingFile.length === 0, missingFile.join(","));

  const idx = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  check("K the field guide links to the series", /aemt-series\.html/.test(idx));
  const page = fs.readFileSync(path.join(ROOT, "aemt-series.html"), "utf8");
  check("K no separate manifest — same PWA", !/rel=["']manifest["']/.test(page));
  check("K the scheduler is vendored, not fetched from a CDN",
    /src="aemt\/fsrs-5\.4\.2\.umd\.js"/.test(page) && !/cdn|unpkg|jsdelivr/i.test(page));
  check("K the vendored library keeps its licence",
    fs.existsSync(path.join(ROOT, "aemt/fsrs-5.4.2.LICENSE.txt"))); }

/* ── L. A filled bin still accepts the next placement ──────────────────────
   Once a bin holds a chip, that chip covers the bin's centre. Before this was
   fixed, a learner aiming at the bin to place their second item hit the chip
   already in it and removed it instead — so the bin could never hold more
   than one, and the item became unanswerable. */
{ const p = await open();
  const r = await p.evaluate(() => {
    const A = window.AEMT;
    const it = A.itemById("itm-seed.008");
    const host = document.createElement("div");
    document.body.appendChild(host);
    const rend = A.Render.drag_drop(it);
    host.appendChild(rend.el);
    const steps = [];
    for (let i = 0; i < 4; i++) {
      const chip = host.querySelector(".dd-pool .dd-chip");
      if (!chip) break;
      chip.click();
      // Click the chip already sitting in the bin — the exact miss a thumb
      // makes on a filled bin — then the bin itself.
      const sitting = host.querySelector(".dd-bin .dd-chip");
      if (sitting) sitting.click();
      else host.querySelector(".dd-bin").click();
      steps.push(Object.keys(rend.read()).length);
    }
    const placed = rend.read();
    const dropHints = host.querySelectorAll(".dd-drop").length;
    host.remove();
    return { steps, count: Object.keys(placed).length, dropHints };
  });
  check("L1 each placement sticks, even onto a filled bin",
    JSON.stringify(r.steps) === JSON.stringify([1, 2, 3, 4]), JSON.stringify(r.steps));
  check("L2 all four options end up placed", r.count === 4, String(r.count));

  // And removing still works when nothing is armed.
  const rm = await p.evaluate(() => {
    const A = window.AEMT;
    const it = A.itemById("itm-seed.008");
    const host = document.createElement("div");
    document.body.appendChild(host);
    const rend = A.Render.drag_drop(it);
    host.appendChild(rend.el);
    host.querySelector(".dd-pool .dd-chip").click();
    host.querySelector(".dd-bin").click();
    const after = Object.keys(rend.read()).length;
    host.querySelector(".dd-bin .dd-chip").click();   // nothing armed now
    const removed = Object.keys(rend.read()).length;
    host.remove();
    return { after, removed };
  });
  check("L3 a placed chip is still removable when nothing is armed",
    rm.after === 1 && rm.removed === 0, JSON.stringify(rm));
  check("L no errors", p._errs.length === 0, p._errs.join("|"));
  await p.context().close(); }

/* ══ v1.1 (Chapters 5–9) ═══════════════════════════════════════════════════
   The three engine additions §2 requires before that batch can ship, plus the
   schema fields in §2.4. Content for Ch 5–9 is blocked on the five decisions
   in §5, so what is tested here is the machinery, seeded. */

/* ── M. §2.4 tier — the volume-control valve ───────────────────────────── */
{ const p = await open();
  const r = await p.evaluate(() => {
    const A = window.AEMT;
    return { core: A.objectiveTier("obj-seed.a1"),
             context: A.objectiveTier("obj-seed.a2"),
             reference: A.objectiveTier("obj-seed.a3"),
             legacy: A.objectiveTier("obj-seed.a"),
             coreQueued: A.isQueued(A.itemById("itm-seed.101")),
             contextQueued: A.isQueued(A.itemById("itm-seed.103")) };
  });
  check("M1 tiers read off the objective", r.core === "core" && r.context === "context" &&
    r.reference === "reference", JSON.stringify(r));
  check("M2 an objective authored before v1.1 is treated as core", r.legacy === "core", r.legacy);
  check("M3 a core objective's items are queued", r.coreQueued === true);
  check("M4 a context objective's items are not", r.contextQueued === false);

  // Answering a context item records progress but schedules nothing — that is
  // what stops Ch 7 producing 300 items nobody finishes reviewing.
  const after = await p.evaluate(() => {
    const A = window.AEMT;
    A.state.blocks["7.7"] = { attempted: true, completed_at: null };
    A.recordAnswer(A.itemById("itm-seed.103"), true, null, new Date());
    A.recordAnswer(A.itemById("itm-seed.101"), true, null, new Date());
    const ctx = A.state.items["itm-seed.103"], core = A.state.items["itm-seed.101"];
    const past = new Date(Date.now() + 40 * 86400000);
    return { ctxQueued: ctx.queued, ctxHasDue: !!ctx.due, coreHasDue: !!core.due,
             ctxRecorded: ctx.last_correct === true,
             dueIds: A.dueItems(past).map((i) => i.id) };
  });
  check("M5 a context item is recorded", after.ctxRecorded === true);
  check("M6 but never given a due date", after.ctxQueued === false && after.ctxHasDue === false,
    JSON.stringify(after));
  check("M7 while a core item is scheduled", after.coreHasDue === true);
  check("M8 and only the core item ever reaches the queue",
    after.dueIds.indexOf("itm-seed.101") !== -1 && after.dueIds.indexOf("itm-seed.103") === -1,
    JSON.stringify(after.dueIds));
  check("M no errors", p._errs.length === 0, p._errs.join("|"));
  await p.context().close(); }

/* ── N. §2.3 lab gates ─────────────────────────────────────────────────── */
{ const p = await open();
  const r = await p.evaluate(() => {
    const A = window.AEMT;
    const earned = { successes: 3, attempts: 3, correct_items: ["a", "b", "c"],
                     correct_intervals: [1, 9, 14], last_attempts: [true, true] };
    const gatedBefore = A.Mastery.objective(earned, "obj-seed.m1");
    const ungated = A.Mastery.objective(earned, "obj-seed.a1");
    const gate = A.gateFor("obj-seed.m1");
    return { gatedBefore, ungated, gatedBlocks: gate.gated.map((b) => b.id),
             unverified: gate.unverified.map((b) => b.id) };
  });
  // Knowing the steps is not being able to perform them.
  check("N1 a lab-gated objective stops at practicing however well it is answered",
    r.gatedBefore === "practicing", r.gatedBefore);
  check("N2 an ungated objective with the same record is mastered",
    r.ungated === "mastered", r.ungated);
  check("N3 the gate names the block holding it",
    JSON.stringify(r.unverified) === JSON.stringify(["6.2"]), JSON.stringify(r));

  const signed = await p.evaluate(async () => {
    const A = window.AEMT;
    await A.recordVerification("6.2", { instructor_id: "J. Jones NRP", checklist_version: "v2" });
    const earned = { successes: 3, attempts: 3, correct_items: ["a", "b", "c"],
                     correct_intervals: [1, 9, 14], last_attempts: [true, true] };
    const rec = A.verificationFor("6.2");
    return { status: A.Mastery.objective(earned, "obj-seed.m1"),
             instructor: rec.instructor_id, version: rec.checklist_version,
             checklist: rec.checklist_ref, role: rec.verifier_role, dated: !!rec.verified_at,
             unverified: A.gateFor("obj-seed.m1").unverified.length };
  });
  check("N4 an instructor sign-off releases the gate", signed.status === "mastered", signed.status);
  check("N5 the record carries who signed", signed.instructor === "J. Jones NRP");
  check("N6 which checklist, and its version",
    signed.checklist === "chk-6.2" && signed.version === "v2", JSON.stringify(signed));
  check("N7 the verifier role and a date", signed.role === "credentialed_instructor" && signed.dated);
  check("N8 and the gate is clear", signed.unverified === 0);

  // It has to survive a reload and leave in the export — this is the artifact
  // the program and the state need now NREMT no longer runs the psychomotor exam.
  await p.reload({ waitUntil: "domcontentloaded" });
  await p.waitForFunction(() => window.__AEMT_READY);
  const persisted = await p.evaluate(() => ({
    kept: !!window.AEMT.verificationFor("6.2"),
    inExport: JSON.stringify({ state: window.AEMT.state }).includes("J. Jones NRP"),
  }));
  check("N9 the sign-off survives a reload", persisted.kept === true);
  check("N10 and travels in the export", persisted.inExport === true);

  // What the learner is actually shown at the end of a lab-gated block.
  await p.evaluate(() => {
    const A = window.AEMT;
    A.state.blocks = {}; A.state.verifications = {};
    const i = A.series.blocks.findIndex((b) => b.id === "6.2");
    A.series.blocks.unshift(A.series.blocks.splice(i, 1)[0]);
    A.renderHome();
  });
  await p.click("#btn-next-block");
  await p.waitForSelector('#screen-session button.btn:text-is("Start")');
  await p.click('#screen-session button.btn:text-is("Start")');
  await p.waitForTimeout(200);
  for (let n = 0; n < 40; n++) {
    if (await p.locator("#screen-home:not(.hidden)").count()) break;
    const chk = p.locator('#screen-session button.btn:text-is("Check answer")');
    if (await chk.count()) {
      await p.evaluate(() => {
        const h = document.querySelector("#screen-session");
        h.querySelectorAll(".opt").forEach((o) => o.click());   // mr: select everything
      });
      await p.waitForTimeout(60);
      if (!(await chk.isDisabled())) await chk.click();
      await p.waitForTimeout(120);
      const conf = p.locator('.conf button.btn:text-is("Not sure")');
      if (await conf.count()) { await conf.click(); await p.waitForTimeout(100); }
    }
    let moved = false;
    for (const label of ["Got it", "Next", "Continue", "Finish block"]) {
      const b = p.locator(`#screen-session button.btn:text-is("${label}")`);
      if (await b.count()) { await b.first().click(); moved = true; break; }
    }
    await p.waitForTimeout(140);
    if (!moved && !(await chk.count())) break;
  }
  const shown = await p.textContent("#screen-session");
  check("N11 the app never claims the skill is done",
    !/skill complete|competent to perform|certified to perform/i.test(shown), shown.slice(0, 200));
  check("N12 and says plainly what it does claim",
    /know what to do and in what order/i.test(shown), shown.slice(-300));
  check("N13 naming the checklist it is verified against",
    /chk-6\.2/.test(shown), shown.slice(-300));
  check("N no errors", p._errs.length === 0, p._errs.join("|"));
  await p.context().close(); }

/* ── O. §2.1 term cards ────────────────────────────────────────────────── */
{ const p = await open();
  const modes = await p.evaluate(() => {
    const A = window.AEMT;
    return { fresh: A.termMode(null), once: A.termMode({ reps: 1 }), twice: A.termMode({ reps: 2 }),
             thrice: A.termMode({ reps: 3 }), four: A.termMode({ reps: 4 }), many: A.termMode({ reps: 9 }) };
  });
  // §5: build and recall only once the learner has seen a card twice.
  check("O1 a new card starts on decompose", modes.fresh === "decompose" && modes.once === "decompose",
    JSON.stringify(modes));
  check("O2 it hardens to build after two exposures",
    modes.twice === "build" && modes.thrice === "build", JSON.stringify(modes));
  check("O3 and to free recall after four", modes.four === "recall" && modes.many === "recall",
    JSON.stringify(modes));

  const fuzzy = await p.evaluate(() => {
    const A = window.AEMT;
    const card = A.termById("trm-hypoglycemia");     // hypoglycemia
    return { exact: A.termMatches(card, "hypoglycemia"),
             caseSpace: A.termMatches(card, "  HypoGlycemia  "),
             synonym: A.termMatches(card, "low blood sugar"),
             oneTypo: A.termMatches(card, "hypoglycemi"),
             twoTypos: A.termMatches(card, "hypoglycemai"),
             oppositePrefix: A.termMatches(card, "hyperglycemia"),
             wrongPrefix: A.termMatches(A.termById("trm-bradycardia"), "tachycardia"),
             shortWord: A.termMatches({ term: "apnea", synonyms: [] }, "apnee"),
             empty: A.termMatches(card, "   ") };
  });
  check("O4 an exact answer matches", fuzzy.exact === true);
  check("O5 case and whitespace are normalized", fuzzy.caseSpace === true);
  check("O6 documented synonyms are accepted", fuzzy.synonym === true);
  check("O7 typos within two edits are forgiven",
    fuzzy.oneTypo === true && fuzzy.twoTypos === true, JSON.stringify(fuzzy));
  // The spec's rule taken literally accepts the opposite term: hyperglycemia
  // is two edits from hypoglycemia, and that pair is dextrose or no dextrose.
  check("O8 a flipped prefix is NOT forgiven, however close",
    fuzzy.oppositePrefix === false, "hyperglycemia matched hypoglycemia");
  check("O9 nor brady- for tachy-", fuzzy.wrongPrefix === false);
  check("O10 words of 8 characters or fewer get no fuzz at all", fuzzy.shortWord === false);
  check("O11 an empty answer is not a match", fuzzy.empty === false);

  // Each mode renders, grades dichotomously, and shows the exact spelling.
  const render = await p.evaluate(() => {
    const A = window.AEMT;
    const card = A.termById("trm-bradycardia");     // brady | card | ia
    const host = document.createElement("div"); document.body.appendChild(host);
    const out = {};

    // decompose: split after "brady" and after "card", then name each part
    const d = A.makeTermRenderer(card, "decompose");
    host.appendChild(d.el);
    out.emptyRead = d.read() === null;
    const gaps = [...host.querySelectorAll(".tc-gap")];
    gaps[4].click();                                   // brady|cardia
    [...host.querySelectorAll(".tc-gap")][8].click();   // brady|card|ia
    const kinds = ["prefix", "root", "suffix"];
    kinds.forEach((k, i) => {
      const b = host.querySelector(`.ob-pick[data-seg="${i}"][data-kind="${k}"]`);
      if (b) b.click();
    });
    out.decomposeRight = d.grade(d.read());
    d.showAnswer();
    out.decomposeShowsMeaning = /slow/.test(host.textContent);
    host.innerHTML = "";

    // build: assemble from the part bank
    const b2 = A.makeTermRenderer(card, "build");
    host.appendChild(b2.el);
    ["brady", "card", "ia"].forEach((t) => {
      const c = host.querySelector(`.dd-chip[data-part="${t}"]`); if (c) c.click();
    });
    out.buildRight = b2.grade(b2.read());
    out.buildWrong = b2.grade(["card", "brady", "ia"]);
    host.innerHTML = "";

    // recall: free text, and the exact spelling shows either way
    const r3 = A.makeTermRenderer(card, "recall");
    host.appendChild(r3.el);
    const inp = host.querySelector(".tc-input");
    inp.value = "bradycardai"; inp.dispatchEvent(new Event("input"));
    out.recallFuzzy = r3.grade(r3.read());
    r3.showAnswer();
    out.recallShowsSpelling = host.textContent.indexOf("bradycardia") !== -1;
    host.remove();
    return out;
  });
  check("O12 decompose refuses an unlabelled split", render.emptyRead === true);
  check("O13 a correct split and labelling grades correct", render.decomposeRight === true);
  check("O14 and the answer shows what each part means", render.decomposeShowsMeaning === true);
  check("O15 build grades a correctly assembled term", render.buildRight === true);
  check("O16 and rejects the right parts in the wrong order", render.buildWrong === false);
  check("O17 recall accepts a near-miss spelling", render.recallFuzzy === true);
  // Spelling matters in a legal record, so it is shown every time (§2.1).
  check("O18 and shows the exact spelling regardless", render.recallShowsSpelling === true);

  // The term bank runs on its own cap so it cannot crowd out reasoning items.
  const cap = await p.evaluate(() => {
    const A = window.AEMT;
    A.state.settings.max_new_terms_per_day = 2;
    A.state.terms = {}; A.state.new_terms_today = { date: null, count: 0 };
    const first = A.dueTerms(new Date()).length;
    // Spend the day's allowance on whichever two the queue actually offered.
    A.dueTerms(new Date()).slice(0, 2).forEach((t) => A.recordTerm(t, true, new Date()));
    const afterTwo = A.dueTerms(new Date()).filter((t) => !A.state.terms[t.id]).length;
    A.state.settings.max_new_terms_per_day = 15;
    return { first, afterTwo, total: A.series.terms.length,
             capSeparateFromItems: A.state.settings.max_new_per_day !== 2 };
  });
  // A term that wraps mid-word reads as two words, which is the opposite of
  // what decompose is teaching.
  const wrapping = await p.evaluate(() => {
    const A = window.AEMT, host = document.getElementById("screen-home");
    return A.series.terms.filter((t) => (t.parts || []).length > 1).map((t) => {
      const d = A.makeTermRenderer(t, "decompose");
      host.appendChild(d.el);
      const word = d.el.querySelector(".tc-word");
      const rows = new Set([...word.querySelectorAll(".tc-l")]
        .map((x) => Math.round(x.getBoundingClientRect().top))).size;
      d.el.remove();
      return { term: t.term, rows };
    });
  });
  check("O19 every term stays on one line",
    wrapping.every((w) => w.rows === 1),
    JSON.stringify(wrapping.filter((w) => w.rows !== 1)));
  check("O20 new terms are capped per day", cap.first === 2, String(cap.first));
  check("O21 and the cap is spent once they are seen", cap.afterTwo === 0, String(cap.afterTwo));
  check("O22 the term cap is separate from the item cap", cap.capSeparateFromItems === true);
  check("O no errors", p._errs.length === 0, p._errs.join("|"));
  await p.context().close(); }

/* ── P. §2.2 hotspot and label_drag ────────────────────────────────────── */
{ const p = await open();
  const hs = await p.evaluate(() => {
    const A = window.AEMT;
    const item = A.itemById("itm-seed.101");
    const host = document.createElement("div"); document.body.appendChild(host);
    const r = A.Render.hotspot(item); host.appendChild(r.el);
    const regions = [...host.querySelectorAll(".hs-region")];
    const pick = (id) => regions.find((x) => x.getAttribute("data-region") === id)
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    pick("trachea");
    const wrong = r.grade(r.read());
    pick(item.answer_region);
    const right = r.grade(r.read());
    // Keyboard operable, and the labels must not give the answer away.
    const labels = regions.map((x) => x.getAttribute("aria-label"));
    const focusable = regions.every((x) => x.getAttribute("tabindex") === "0");
    const roles = regions.every((x) => x.getAttribute("role") === "button");
    r.showAnswer();
    const painted = host.querySelectorAll(".hs-right").length;
    const licence = /SEED PLACEHOLDER/.test(host.textContent);
    host.remove();
    return { right, wrong, labels, focusable, roles, painted, licence };
  });
  check("P1 hotspot grades the right region correct", hs.right === true);
  check("P2 and any other region wrong", hs.wrong === false);
  check("P3 every region is keyboard focusable", hs.focusable === true);
  check("P4 with a button role", hs.roles === true);
  // "Trachea" as an accessible name would hand the answer to a screen reader.
  check("P5 the accessible names are neutral, not the answers",
    hs.labels.every((l) => /^Region \d+$/.test(l)), JSON.stringify(hs.labels));
  check("P6 showAnswer marks the right region", hs.painted === 1, String(hs.painted));
  // §2.2 — every figure's licence is recorded and shown where it is used.
  check("P7 the figure carries its licence", hs.licence === true);

  const kb = await p.evaluate(() => {
    const A = window.AEMT;
    const host = document.createElement("div"); document.body.appendChild(host);
    const r = A.Render.hotspot(A.itemById("itm-seed.101")); host.appendChild(r.el);
    const reg = host.querySelector('.hs-region[data-region="cricoid"]');
    reg.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    const viaEnter = r.grade(r.read());
    host.remove();
    return viaEnter;
  });
  check("P8 and is answerable from the keyboard", kb === true);

  const ld = await p.evaluate(() => {
    const A = window.AEMT;
    const item = A.itemById("itm-seed.102");
    const host = document.createElement("div"); document.body.appendChild(host);
    const r = A.Render.label_drag(item); host.appendChild(r.el);
    const place = (pid, lid) => {
      host.querySelector(`.dd-chip[data-label="${lid}"]`).click();
      host.querySelector(`.ld-pin[data-pointer="${pid}"]`).click();
    };
    const map = item.answer_map;
    Object.keys(map).forEach((pid) => place(pid, map[pid]));
    const right = r.grade(r.read());
    const noDrag = !host.querySelector("[draggable]");
    // One label wrong makes the whole item wrong — dichotomous (§2.2).
    const ids = Object.keys(map);
    const swapped = r.grade(Object.assign({}, (() => {
      const m = {}; ids.forEach((pid) => { m[map[pid]] = pid; });
      const a = map[ids[0]], b = map[ids[1]];
      m[a] = ids[1]; m[b] = ids[0];
      return m;
    })()));
    r.showAnswer();
    const painted = host.querySelectorAll(".ld-pin.was-correct").length;
    host.remove();
    return { right, swapped, noDrag, painted, pointers: item.pointers.length };
  });
  check("P9 label_drag grades a fully correct placement", ld.right === true);
  check("P10 two labels swapped fails the whole item", ld.swapped === false);
  check("P11 it needs no drag gesture", ld.noDrag === true);
  check("P12 showAnswer places every label", ld.painted === ld.pointers, `${ld.painted}/${ld.pointers}`);
  check("P no errors", p._errs.length === 0, p._errs.join("|"));
  await p.context().close(); }

/* ── Q. §2.4 evidence_flag, and the enables rule ───────────────────────── */
{ const p = await open();
  await p.evaluate(() => {
    const b = window.AEMT.series.blocks.findIndex((x) => x.id === "6.7");
    window.AEMT.series.blocks.unshift(window.AEMT.series.blocks.splice(b, 1)[0]);
    window.AEMT.state.blocks = {};
    window.AEMT.renderHome();
  });
  await p.click("#btn-next-block");
  await p.waitForSelector('#screen-session button.btn:text-is("Start")');
  await p.click('#screen-session button.btn:text-is("Start")');
  await p.waitForTimeout(250);
  const ev = await p.textContent("#screen-session");
  check("Q1 a declared divergence is shown before the content",
    /Where the book and the evidence differ/i.test(ev), ev.slice(0, 160));
  check("Q2 it gives the textbook position", /The textbook says/i.test(ev));
  check("Q3 alongside the current guidance", /Current guidance/i.test(ev));
  check("Q4 and is honest about what is still uncertain",
    /still uncertain/i.test(ev) && /without definitive evidence/i.test(ev));
  check("Q5 with its source", /Fischer|NAEMSP/.test(ev));

  // §1: A&P is instrumental, never terminal. An objective that cannot name the
  // decision it enables does not ship.
  const enables = await p.evaluate(() => {
    const A = window.AEMT;
    const v11 = A.series.objectives.filter((o) => o.chapter >= 5);
    return { total: v11.length,
             missing: v11.filter((o) => !o.enables || !o.enables.trim()).map((o) => o.id),
             tiers: [...new Set(v11.map((o) => o.tier))].sort() };
  });
  check("Q6 every Chapter 5+ objective names what it enables",
    enables.missing.length === 0, enables.missing.join(","));
  check("Q7 and carries a tier",
    JSON.stringify(enables.tiers) === JSON.stringify(["context", "core", "reference"]),
    JSON.stringify(enables.tiers));
  check("Q no errors", p._errs.length === 0, p._errs.join("|"));
  await p.context().close(); }

/* ── S. A Phase 1 learner's saved progress survives the v1.1 upgrade ──────
   v1.1 added the term bank and the verification record. A learner who studied
   on the Phase 1 build has neither key, and the home screen reads both before
   it draws — so without a migration their next session is a blank page. */
{ const p = await open();
  const r = await p.evaluate(() => {
    const A = window.AEMT;
    // Exactly the shape Phase 1 wrote: no terms, no verifications, schema 1.
    const v1 = { user_id: "local-old", schema_version: 1,
      items: { "itm-seed.002": { due: new Date().toISOString(), stability: 3, difficulty: 5,
                                 reps: 2, lapses: 0, state: "review",
                                 last_review: new Date().toISOString() } },
      objectives: { "obj-seed.b": { successes: 1, attempts: 1, correct_items: ["itm-seed.002"],
                                    correct_intervals: [0], last_attempts: [true] } },
      blocks: { "3.5": { attempted: true, completed_at: new Date().toISOString() } },
      streak_days: 5, last_active: null, new_today: { date: null, count: 0 },
      settings: { request_retention: 0.9, max_new_per_day: 20, session_cap: 15, course_dates: {} } };
    const m = A.migrateState(JSON.parse(JSON.stringify(v1)));
    return { schema: m.schema_version, terms: !!m.terms, verifications: !!m.verifications,
             termCap: m.settings.max_new_terms_per_day,
             keptItems: Object.keys(m.items).length, keptStreak: m.streak_days,
             keptBlock: !!m.blocks["3.5"].completed_at };
  });
  check("S1 the migration brings the document to schema 2", r.schema === 2, String(r.schema));
  check("S2 it adds the term bank", r.terms === true);
  check("S3 and the verification record", r.verifications === true);
  check("S4 and the term cap the settings never had", r.termCap === 15, String(r.termCap));
  check("S5 without losing scheduled items", r.keptItems === 1, String(r.keptItems));
  check("S6 the streak", r.keptStreak === 5, String(r.keptStreak));
  check("S7 or block completion", r.keptBlock === true);

  // And the whole thing renders rather than throwing on the missing stores.
  const rendered = await p.evaluate(() => {
    const A = window.AEMT;
    const v1 = { user_id: "local-old", schema_version: 1, items: {}, objectives: {},
                 blocks: { "3.5": { attempted: true, completed_at: null } },
                 streak_days: 2, settings: {} };
    A.state = A.migrateState(v1);
    A.renderHome();
    return { terms: A.dueTerms(new Date()).length,
             homeDrew: !!document.querySelector(".due-hero") };
  });
  check("S8 the term queue works on a migrated document", rendered.terms > 0, String(rendered.terms));
  check("S9 and the home screen draws", rendered.homeDrew === true);
  check("S no errors", p._errs.length === 0, p._errs.join("|"));
  await p.context().close(); }

/* ── R. The v1.1 seed is still flagged as throwaway ────────────────────── */
{ const p = await open();
  const r = await p.evaluate(() => {
    const A = window.AEMT;
    const placeholder = (x) => (A.series.chapter_meta[x.chapter] || {}).seed;
    return { terms: A.series.terms.length,
             termsFlagged: A.series.terms.filter(placeholder).every((t) => t.seed_throwaway === true),
             itemsFlagged: A.series.items.filter(placeholder).every((i) => i.seed_throwaway === true),
             blocksFlagged: A.series.blocks.filter(placeholder).every((b) => b.seed_throwaway === true),
             figuresLicensed: A.series.items
               .filter((i) => i.stimulus && i.stimulus.kind === "image")
               .every((i) => !!i.stimulus.asset_license) };
  });
  check("R1 the term bank is seeded", r.terms >= 5, String(r.terms));
  check("R2 placeholder term cards are flagged throwaway", r.termsFlagged === true);
  check("R3 so are placeholder items and blocks",
    r.itemsFlagged === true && r.blocksFlagged === true);
  // §2.2 — do not let licensing get decided informally at build time.
  check("R4 every figure records an asset_license", r.figuresLicensed === true);
  check("R no errors", p._errs.length === 0, p._errs.join("|"));
  await p.context().close(); }

/* ══ CHAPTER 5 — MEDICAL TERMINOLOGY ══════════════════════════════════════
   The first authored chapter. Structural conformance to §4.2 and §5.2 is
   enforced when the file is built; what is checked here is that the chapter
   loads, replaces its placeholder, and that the safety content is right. */

/* ── T. The chapter loads and supersedes its seed ──────────────────────── */
{ const p = await open();
  const r = await p.evaluate(() => {
    const A = window.AEMT;
    const ch5 = (x) => x.chapter === 5;
    return { blocks: A.series.blocks.filter(ch5).length,
             items: A.series.items.filter(ch5).length,
             objectives: A.series.objectives.filter(ch5).length,
             terms: A.series.terms.length,
             seedLeft: A.series.blocks.filter((b) => ch5(b) && b.seed_throwaway).length +
                       A.series.items.filter((i) => ch5(i) && i.seed_throwaway).length +
                       A.series.terms.filter((t) => t.seed_throwaway).length,
             otherSeedKept: A.series.blocks.filter((b) => b.chapter === 3 && b.seed_throwaway).length,
             meta: A.series.chapter_meta[5] };
  });
  check("T1 seven blocks, as the framework specifies", r.blocks === 7, String(r.blocks));
  check("T2 fifty-nine items", r.items === 59, String(r.items));
  check("T3 and the term bank", r.terms > 200, String(r.terms));
  // An authored chapter replaces its placeholder rather than sitting beside it.
  check("T4 no seed content survives in an authored chapter", r.seedLeft === 0, String(r.seedLeft));
  check("T5 while other chapters keep theirs", r.otherSeedKept > 0, String(r.otherSeedKept));
  check("T6 the chapter is not marked seed", r.meta.seed === false);
  check("T7 it declares its review status honestly",
    r.meta.review_status === "unreviewed", r.meta.review_status);
  check("T8 and names its sources", (r.meta.sources || []).length >= 3,
    JSON.stringify(r.meta.sources));

  // v1.1 §1 — an objective that cannot name what it enables does not ship.
  const objs = await p.evaluate(() => window.AEMT.series.objectives.filter((o) => o.chapter === 5)
    .map((o) => ({ id: o.id, enables: o.enables, tier: o.tier })));
  check("T9 every objective names what it enables",
    objs.every((o) => o.enables && o.enables.length > 20), JSON.stringify(objs.filter((o) => !o.enables)));
  check("T10 and carries a tier", objs.every((o) => o.tier === "core"));

  // v1.0 §11.2 — nothing may trace to the textbook.
  const src = await p.evaluate(() => {
    const A = window.AEMT;
    const refs = A.series.items.filter((i) => i.chapter === 5).map((i) => i.source_ref)
      .concat(A.series.terms.map((t) => t.source_ref));
    return { missing: refs.filter((r) => !r).length,
             textbook: refs.filter((r) => /jones|bartlett|emergency care and transportation/i.test(r || "")).length,
             distinct: [...new Set(refs)].length };
  });
  check("T11 every item and term cites a source", src.missing === 0, String(src.missing));
  check("T12 none of them is the textbook", src.textbook === 0, String(src.textbook));
  check("T no errors", p._errs.length === 0, p._errs.join("|"));
  await p.context().close(); }

/* ── U. The safety block. These answers are the point of Chapter 5.6. ──── */
{ const p = await open();
  const facts = await p.evaluate(() => {
    const A = window.AEMT;
    const byId = {}; A.series.items.forEach((i) => { byId[i.id] = i; });
    const correctOf = (id) => (byId[id].options || []).filter((o) => o.correct).map((o) => o.text);
    const rowsOf = (id) => (byId[id].rows || []).map((r) => r.label + "=" + r.answer);
    return { u: correctOf("itm-5.6.001")[0],
             tjc: correctOf("itm-5.6.002"),
             zeros: rowsOf("itm-5.6.003"),
             ms: correctOf("itm-5.6.004")[0],
             errorProne: correctOf("itm-5.6.008") };
  });
  // U for unit is read as a zero or a four — the failure mode is a tenfold dose.
  check("U1 U is prohibited because it is misread as a digit",
    /misread as a zero or a four/i.test(facts.u), facts.u);
  check("U2 the Do Not Use answers are U, IU and MS",
    facts.tjc.length === 3 && facts.tjc.join("|").includes("U for unit") &&
    facts.tjc.join("|").includes("IU") && facts.tjc.join("|").includes("MS"),
    JSON.stringify(facts.tjc));
  // Leading zero required, trailing zero prohibited. Both fail by ten.
  check("U3 a leading zero is required and a bare decimal is not acceptable",
    facts.zeros.includes("0.5 mg=ok") && facts.zeros.includes(".5 mg=no"),
    JSON.stringify(facts.zeros));
  check("U4 a trailing zero is not acceptable and a bare integer is",
    facts.zeros.includes("5 mg=ok") && facts.zeros.includes("5.0 mg=no"),
    JSON.stringify(facts.zeros));
  check("U5 MS is prohibited because it names two different drugs",
    /morphine sulfate or magnesium sulfate/i.test(facts.ms), facts.ms);
  check("U6 the error-prone symbols are @, cc and microgram",
    facts.errorProne.length === 3 && facts.errorProne.join("|").includes("@") &&
    facts.errorProne.join("|").includes("cc") && facts.errorProne.join("|").includes("µg"),
    JSON.stringify(facts.errorProne));
  check("U no errors", p._errs.length === 0, p._errs.join("|"));
  await p.context().close(); }

/* ── V. The term bank as built, in all three modes ─────────────────────── */
{ const p = await open();
  const bank = await p.evaluate(() => {
    const A = window.AEMT;
    const parts = A.series.terms.filter((t) => t.card_kind === "part");
    const whole = A.series.terms.filter((t) => t.card_kind === "term");
    // build and decompose both require the parts to spell the term.
    const broken = whole.filter((t) => (t.parts || []).length &&
      t.parts.map((x) => x.text).join("") !== t.term).map((t) => t.term);
    return { parts: parts.length, whole: whole.length, broken,
             partModeIsRecall: A.termMode({ reps: 0 }, parts[0]),
             wholeModeStarts: A.termMode({ reps: 0 }, whole.find((t) => (t.parts || []).length > 1)),
             kinds: [...new Set(parts.map((x) => x.part_kind))].sort() };
  });
  check("V1 the bank is mostly word parts, as the framework asks",
    bank.parts > 120, String(bank.parts));
  check("V2 with whole terms alongside them", bank.whole > 40, String(bank.whole));
  check("V3 every whole term spells out from its parts",
    bank.broken.length === 0, bank.broken.join(","));
  check("V4 a one-morpheme card goes straight to production",
    bank.partModeIsRecall === "recall", bank.partModeIsRecall);
  check("V5 while a whole term starts by being taken apart",
    bank.wholeModeStarts === "decompose", bank.wholeModeStarts);
  check("V6 all four kinds of part are represented",
    JSON.stringify(bank.kinds) === JSON.stringify(["prefix", "root", "suffix", "vowel"]),
    JSON.stringify(bank.kinds));

  // The guard that matters, now against the real bank where both terms exist.
  const guard = await p.evaluate(() => {
    const A = window.AEMT;
    const hypo = A.termById("trm-hypoglycemia");
    const brady = A.termById("trm-bradycardia");
    return { exact: A.termMatches(hypo, "hypoglycemia"),
             typo: A.termMatches(hypo, "hypoglycemi"),
             synonym: A.termMatches(hypo, "low blood sugar"),
             opposite: A.termMatches(hypo, "hyperglycemia"),
             oppositeBack: A.termMatches(A.termById("trm-hyperglycemia"), "hypoglycemia"),
             bradyTachy: A.termMatches(brady, "tachycardia"),
             apnea: A.termMatches(A.termById("trm-apnea"), "dyspnea") };
  });
  check("V7 an exact answer matches", guard.exact === true);
  check("V8 a tail typo is forgiven", guard.typo === true);
  check("V9 a documented synonym is accepted", guard.synonym === true);
  // Two edits apart, and the difference is whether you give dextrose.
  check("V10 hyperglycemia is never accepted for hypoglycemia", guard.opposite === false);
  check("V11 nor the other way round", guard.oppositeBack === false);
  check("V12 nor tachycardia for bradycardia", guard.bradyTachy === false);
  check("V13 nor dyspnea for apnea", guard.apnea === false);

  // Each mode renders and grades against a real card.
  const modes = await p.evaluate(() => {
    const A = window.AEMT;
    const card = A.termById("trm-bradycardia");   // brady | card | ia
    const host = document.createElement("div"); document.body.appendChild(host);
    const out = {};
    const b = A.makeTermRenderer(card, "build");
    host.appendChild(b.el);
    ["brady", "card", "ia"].forEach((t) => {
      const c = host.querySelector(`.dd-chip[data-part="${t}"]`); if (c) c.click();
    });
    out.build = b.grade(b.read());
    host.innerHTML = "";
    const r = A.makeTermRenderer(card, "recall");
    host.appendChild(r.el);
    const inp = host.querySelector(".tc-input");
    inp.value = "bradycardia"; inp.dispatchEvent(new Event("input"));
    out.recall = r.grade(r.read());
    r.showAnswer();
    out.spelling = host.textContent.indexOf("bradycardia") !== -1;
    host.remove();
    return out;
  });
  check("V14 build assembles a real card", modes.build === true);
  check("V15 recall grades a real card", modes.recall === true);
  check("V16 and shows the exact spelling", modes.spelling === true);
  check("V no errors", p._errs.length === 0, p._errs.join("|"));
  await p.context().close(); }

/* ── W. The quadrants hotspot, on an original figure ───────────────────── */
{ const p = await open();
  const hs = await p.evaluate(() => {
    const A = window.AEMT;
    const item = A.itemById("itm-5.5.002");
    const host = document.createElement("div"); document.body.appendChild(host);
    const r = A.Render.hotspot(item); host.appendChild(r.el);
    const pick = (id) => host.querySelector(`.hs-region[data-region="${id}"]`)
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    pick("luq"); const wrong = r.grade(r.read());
    pick("rlq"); const right = r.grade(r.read());
    const licence = host.querySelector(".fig-lic");
    const names = [...host.querySelectorAll(".hs-region")].map((x) => x.getAttribute("aria-label"));
    host.remove();
    return { right, wrong, answer: item.answer_region, names,
             licence: licence ? licence.textContent : null,
             regions: item.regions.length };
  });
  check("W1 the appendix is in the right lower quadrant", hs.answer === "rlq", hs.answer);
  check("W2 tapping it grades correct", hs.right === true);
  check("W3 another quadrant does not", hs.wrong === false);
  check("W4 all four quadrants are targets", hs.regions === 4, String(hs.regions));
  check("W5 the region names do not give the answer away",
    hs.names.every((n) => /^Region \d+$/.test(n)), JSON.stringify(hs.names));
  // §2.2 — original work, and the licence recorded where the figure is used.
  check("W6 the figure declares its licence", !!hs.licence, String(hs.licence));
  check("W7 and it is original rather than third-party",
    /Original schematic/i.test(hs.licence || ""), hs.licence);
  check("W no errors", p._errs.length === 0, p._errs.join("|"));
  await p.context().close(); }

/* ── X. Chapter 1, EMS Systems ─────────────────────────────────────────── */
{ const p = await open();
  const r = await p.evaluate(() => {
    const A = window.AEMT;
    const ch1 = (x) => x.chapter === 1;
    return { blocks: A.series.blocks.filter(ch1).length,
             items: A.series.items.filter(ch1).length,
             objectives: A.series.objectives.filter(ch1).length,
             seedLeft: A.series.blocks.filter((b) => ch1(b) && b.seed_throwaway).length +
                       A.series.items.filter((i) => ch1(i) && i.seed_throwaway).length,
             otherSeedKept: A.series.blocks.filter((b) => b.chapter === 3 && b.seed_throwaway).length,
             meta: A.series.chapter_meta[1],
             tiers: [...new Set(A.series.objectives.filter(ch1).map((o) => o.tier))].sort(),
             noEnables: A.series.objectives.filter(ch1).filter((o) => !o.enables).map((o) => o.id) };
  });
  check("X1 seven teaching blocks and an integration block",
    r.blocks === 8, String(r.blocks));
  check("X2 sixty-eight items", r.items === 68, String(r.items));
  check("X3 no seed content survives in an authored chapter", r.seedLeft === 0, String(r.seedLeft));
  check("X4 while other chapters keep theirs", r.otherSeedKept > 0, String(r.otherSeedKept));
  check("X5 the chapter is not marked seed", r.meta.seed === false);
  check("X6 it declares its review status honestly",
    r.meta.review_status === "unreviewed", r.meta.review_status);
  check("X7 every objective names what it enables", r.noEnables.length === 0, r.noEnables.join(","));
  check("X8 and the tiers are set", r.tiers.join(",") === "context,core", r.tiers.join(","));

  // v1.0 §11.2 — nothing traces to the textbook, and Kansas/AMR specifics are
  // deliberately absent: the base module has to stay portable.
  const src = await p.evaluate(() => {
    const A = window.AEMT;
    const refs = A.series.items.filter((i) => i.chapter === 1).map((i) => i.source_ref);
    const text = A.series.blocks.filter((b) => b.chapter === 1)
      .map((b) => b.callback_md + b.screens.map((x) => x.body_md).join(" ")).join(" ");
    return { missing: refs.filter((x) => !x).length,
             textbook: refs.filter((x) => /jones|bartlett|emergency care and transportation/i.test(x || "")).length,
             localClaim: /Kansas AEMT scope is|KC standing order (?:is|says)/i.test(text) };
  });
  check("X9 every item cites a source", src.missing === 0, String(src.missing));
  check("X10 none of them is the textbook", src.textbook === 0, String(src.textbook));
  check("X11 no unsourced Kansas or AMR KC specifics are asserted", src.localClaim === false);

  // 1.2 is the block the chapter is built around: scope is a legal ceiling
  // nobody on scene can move. Wrong answers here are the ones that end licences.
  const scope = await p.evaluate(() => {
    const A = window.AEMT;
    const pick = (id) => { const it = A.itemById(id);
      return { hs: it.high_stakes, correct: (it.options || []).filter((o) => o.correct).map((o) => o.text) }; };
    return { partner: pick("itm-1.1.005"), narrower: pick("itm-1.2.003"), order: pick("itm-1.4.004") };
  });
  check("X12 a paramedic cannot widen your scope",
    /Decline/i.test(scope.partner.correct[0]) && scope.partner.hs === true,
    JSON.stringify(scope.partner));
  check("X13 protocol narrower than scope governs",
    /^No/.test(scope.narrower.correct[0]) && scope.narrower.hs === true,
    JSON.stringify(scope.narrower));
  check("X14 and neither can a physician on the radio",
    scope.order.correct.length === 1 && scope.order.hs === true, JSON.stringify(scope.order));

  // §4.2 — every block opens on a decision point and closes by answering it.
  const shape = await p.evaluate(() => window.AEMT.series.blocks.filter((b) => b.chapter === 1)
    .map((b) => ({ id: b.id, dp: !!(b.cold_open || {}).decision_point, cb: !!b.callback_md,
                   quiz: (b.quiz || []).length })));
  check("X15 every block opens on a decision point", shape.every((b) => b.dp),
    JSON.stringify(shape.filter((b) => !b.dp)));
  check("X16 and closes by answering it", shape.every((b) => b.cb));
  check("X17 every teaching block quizzes five to seven items",
    shape.filter((b) => !/INT/.test(b.id)).every((b) => b.quiz >= 5 && b.quiz <= 7),
    JSON.stringify(shape.map((b) => b.id + ":" + b.quiz)));
  check("X no errors", p._errs.length === 0, p._errs.join("|"));
  await p.context().close(); }

/* ── Y. Chapter 2, Workforce Safety and Wellness ───────────────────────── */
{ const p = await open();
  const r = await p.evaluate(() => {
    const A = window.AEMT;
    const ch2 = (x) => x.chapter === 2;
    return { blocks: A.series.blocks.filter(ch2).length,
             items: A.series.items.filter(ch2).length,
             objectives: A.series.objectives.filter(ch2).length,
             seedLeft: A.series.blocks.filter((b) => ch2(b) && b.seed_throwaway).length +
                       A.series.items.filter((i) => ch2(i) && i.seed_throwaway).length,
             meta: A.series.chapter_meta[2],
             noEnables: A.series.objectives.filter(ch2).filter((o) => !o.enables).map((o) => o.id),
             noSource: A.series.items.filter(ch2).filter((i) => !i.source_ref).map((i) => i.id) };
  });
  check("Y1 eight teaching blocks and an integration block", r.blocks === 9, String(r.blocks));
  check("Y2 seventy-two items", r.items === 72, String(r.items));
  check("Y3 no seed content survives in an authored chapter", r.seedLeft === 0, String(r.seedLeft));
  check("Y4 the chapter is not marked seed", r.meta.seed === false);
  check("Y5 it declares its review status honestly",
    r.meta.review_status === "unreviewed", r.meta.review_status);
  check("Y6 every objective names what it enables", r.noEnables.length === 0, r.noEnables.join(","));
  check("Y7 every item cites a source", r.noSource.length === 0, r.noSource.join(","));

  // The point of this chapter is that two widely taught practices do not hold
  // up. If a rewrite ever softens these, the learner is being told the
  // comfortable thing rather than the supported one.
  const ev = await p.evaluate(() => {
    const A = window.AEMT;
    const right = (id) => (A.itemById(id).options || []).filter((o) => o.correct).map((o) => o.text);
    const block = (id) => { const b = A.series.blocks.find((x) => x.id === id);
      return b.callback_md + " " + b.screens.map((s) => s.body_md).join(" "); };
    return { debrief: right("itm-2.8.001"), mandatory: right("itm-2.8.002"),
             treat: right("itm-2.8.006"), stages: right("itm-2.5.008"),
             presence: right("itm-2.5.006"),
             b28: block("2.8"), b25: block("2.5"), b27: block("2.7") };
  });
  check("Y8 single-session debriefing is reported as not preventing PTSD",
    /no prevention of PTSD/i.test(ev.debrief[0]), JSON.stringify(ev.debrief));
  check("Y9 and mandatory attendance is not the supported position",
    /do not compel|not compel/i.test(ev.mandatory[0]), JSON.stringify(ev.mandatory));
  check("Y10 the block states the limit of that evidence honestly",
    /individual debriefing/i.test(ev.b28) && /studied less/i.test(ev.b28));
  check("Y11 and names what is supported instead",
    /trauma-focused/i.test(ev.treat[0]) && /watchful waiting/i.test(ev.b28),
    JSON.stringify(ev.treat));
  check("Y12 the five stages are flagged as taught but unsupported",
    /not supported as a sequence/i.test(ev.stages[0]), JSON.stringify(ev.stages));
  check("Y13 while family presence is reported as supported",
    /fewer PTSD-related symptoms/i.test(ev.presence[0]), JSON.stringify(ev.presence));
  // A guideline quoted without its evidence grade is the failure mode 1.6 warns about.
  check("Y14 the fatigue guideline is quoted with its evidence grade",
    /conditional/i.test(ev.b27) && /low to very low/i.test(ev.b27));

  // The exposure clock and the scope of the roadway risk are the two facts in
  // this chapter that change what someone does in the next ten minutes.
  const facts = await p.evaluate(() => {
    const A = window.AEMT;
    const right = (id) => (A.itemById(id).options || []).filter((o) => o.correct).map((o) => o.text);
    return { report: right("itm-2.2.002"), first: right("itm-2.2.001"),
             fatal: right("itm-2.3.001"), stick: A.itemById("itm-2.2.001").high_stakes,
             confined: A.itemById("itm-2.3.005").high_stakes };
  });
  check("Y15 the prophylaxis window is stated, not implied",
    /72 hours/.test(facts.report[0]), JSON.stringify(facts.report));
  check("Y16 washing comes before anything else after a needlestick",
    /soap and running water/i.test(facts.first[0]), JSON.stringify(facts.first));
  check("Y17 transportation events are named as the leading cause of death",
    /Transportation/i.test(facts.fatal[0]), JSON.stringify(facts.fatal));
  check("Y18 and both are marked high stakes", facts.stick === true && facts.confined === true);

  const shape = await p.evaluate(() => window.AEMT.series.blocks.filter((b) => b.chapter === 2)
    .map((b) => ({ id: b.id, dp: !!(b.cold_open || {}).decision_point, cb: !!b.callback_md,
                   quiz: (b.quiz || []).length, screens: b.screens.length })));
  check("Y19 every block opens on a decision point and answers it",
    shape.every((b) => b.dp && b.cb), JSON.stringify(shape.filter((b) => !b.dp || !b.cb)));
  check("Y20 every teaching block runs three to five screens and quizzes five to seven items",
    shape.filter((b) => !/INT/.test(b.id))
      .every((b) => b.screens >= 3 && b.screens <= 5 && b.quiz >= 5 && b.quiz <= 7),
    JSON.stringify(shape.map((b) => b.id + ":" + b.screens + "/" + b.quiz)));
  check("Y no errors", p._errs.length === 0, p._errs.join("|"));
  await p.context().close(); }

await browser.close();
site.close();
console.log(`\n==== ${PASS} passed, ${FAIL} failed ====`);
if (fails.length) console.log("FAILURES:\n - " + fails.join("\n - "));
process.exit(FAIL ? 1 : 0);
