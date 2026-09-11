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
    blocks: window.AEMT.series.blocks.length,
    types: [...new Set(window.AEMT.series.items.map((i) => i.type))].sort(),
    noRationale: window.AEMT.series.items.filter((i) =>
      (i.options || []).some((o) => !o.rationale)).map((i) => i.id),
    noSource: window.AEMT.series.items.filter((i) => !i.source_ref).map((i) => i.id),
    seed: window.AEMT.series.seed_throwaway,
    allSeed: window.AEMT.series.items.every((i) => i.seed_throwaway === true),
  }));
  check("A3 the seed carries 20 items, as §12 specifies", s.items === 20, String(s.items));
  check("A4 every NREMT item type is represented",
    ["build_list", "drag_drop", "graphical", "mc", "mr", "options_box", "scenario"]
      .every((t) => s.types.includes(t)), s.types.join(","));
  // §5.2 rule 4: a distractor you cannot write a rationale for is filler.
  check("A5 every option carries a rationale", s.noRationale.length === 0, s.noRationale.join(","));
  // §5.2 rule 7: cite the source on every item.
  check("A6 every item carries a source_ref", s.noSource.length === 0, s.noSource.join(","));
  check("A7 the seed is flagged as throwaway at both levels",
    s.seed === true && s.allSeed === true);
  check("A8 and the page says so on screen",
    /Phase 1|not reviewed/i.test(await p.textContent(".seed-banner")));
  check("A9 no errors", p._errs.length === 0, p._errs.join("|"));
  await p.context().close(); }

/* ── B. The seven renderers, right and wrong (§5.1) ────────────────────── */
{ const p = await open();
  const cases = [
    ["mc", "itm-seed.002"], ["mr", "itm-seed.004"], ["build_list", "itm-seed.006"],
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
    const item = A.itemById("itm-seed.002");   // chapter 1, not high stakes
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
             hasSchema: back.schema_version === 1,
             hasUser: typeof back.user_id === "string" && back.user_id.length > 0 };
  });
  check("I1 state survives a JSON round trip", round.roundTripped);
  check("I2 the mastery model reads the imported record", round.mastery === "mastered", round.mastery);
  check("I3 the export carries a schema version", round.hasSchema);
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
  for (const asset of ["aemt-series.html", "aemt/series-preparatory.json", "aemt/fsrs-5.4.2.umd.js"]) {
    check(`K precached: ${asset}`, sw.includes(asset), "not in sw.js ASSETS");
  }
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

await browser.close();
site.close();
console.log(`\n==== ${PASS} passed, ${FAIL} failed ====`);
if (fails.length) console.log("FAILURES:\n - " + fails.join("\n - "));
process.exit(FAIL ? 1 : 0);
