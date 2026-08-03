/*
 * Sync layer — end-to-end
 * -----------------------
 * Drives the real academy pages and the real Ask the Educator screen in
 * headless Chromium against a scripted stand-in for Supabase, and asserts
 * that working through a module actually produces the right writes.
 *
 * The failure paths are the point. A learner finishing a module in a
 * basement must not lose the record, and a message the server rejected
 * must never show "Message Sent" — both are checked here, not assumed.
 *
 * No real Supabase project is contacted and no real learner data is used.
 */
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SUPA = "http://127.0.0.1:54321";
const received = [];

// ── fake Supabase ────────────────────────────────────────────
// Default behaviour serves the learner flows (anonymous sign-in, accept
// every write). Assigning `apiHandler` swaps in a scripted response set
// for one block of tests; set it back to null to restore the default.
let apiHandler = null;

const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "*",
};

const api = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const parsed = body ? JSON.parse(body) : null;
    received.push({ url: req.url, method: req.method, body: parsed });

    // Preflight never carries a body and must not reach the handlers.
    if (req.method === "OPTIONS") { res.writeHead(204, CORS); return res.end(); }

    let status = 201, payload = null;
    if (apiHandler) {
      [status, payload] = apiHandler(req, res, parsed);
    } else if (req.url.startsWith("/auth/v1/signup")) {
      status = 200;
      payload = {
        access_token: "jwt-e2e", refresh_token: "refresh-e2e", expires_in: 3600,
        user: { id: "e2e-user-uuid", is_anonymous: true, email: "" },
      };
    }
    res.writeHead(status, CORS);
    res.end(payload == null ? "" : JSON.stringify(payload));
  });
});
await new Promise((r) => api.listen(54321, "127.0.0.1", r));

// ── static file server ───────────────────────────────────────
const MIME = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json",
  ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon" };
const site = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(ROOT, url === "/" ? "index.html" : url);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end("nf");
  }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  res.end(fs.readFileSync(file));
});
await new Promise((r) => site.listen(8099, "127.0.0.1", r));

let PASS = 0, FAIL = 0;
const check = (n, ok, extra = "") => {
  if (ok) { PASS++; console.log("  PASS  " + n); }
  else { FAIL++; console.log("  FAIL  " + n + (extra ? "\n        " + extra : "")); }
};

// Portable browser launch: honour CHROMIUM_PATH, else this env's pre-installed Chromium, else Playwright default.
async function launch() {
  const envExe = process.env.CHROMIUM_PATH;
  const known = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  const exe = envExe || (fs.existsSync(known) ? known : null);
  try { return await chromium.launch(exe ? { executablePath: exe } : {}); }
  catch { return await chromium.launch(); }
}
const browser = await launch();

for (const [course, file] of [
  ["hemodynamics", "hemodynamics-academy.html"],
  ["airway", "airway-academy.html"],
  ["metabolic", "metabolic-academy.html"],
  ["neonate", "neonate-academy.html"],
]) {
  received.length = 0;
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  const IGNORE = /fonts\.googleapis\.com|Failed to load resource/;
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" && !IGNORE.test(m.text())) errors.push(m.text()); });
  page.on("requestfailed", (r) => { if (!IGNORE.test(r.url())) errors.push("REQFAIL " + r.url() + " :: " + (r.failure()||{}).errorText); });

  // Point the backend at the fake Supabase before any page script runs.
  await page.addInitScript((url) => {
    window.AMR_BACKEND_CONFIG = { url, anonKey: "test-anon-key" };
  }, SUPA);

  await page.goto(`http://127.0.0.1:8099/${file}`, { waitUntil: "networkidle" });

  console.log(`\n--- ${file} ---`);
  check("page loads without console/page errors", errors.length === 0, errors.join("\n        "));
  check("amr-backend.js loaded and configured",
    await page.evaluate(() => !!window.AMRBackend && window.AMRBackend.isConfigured()));

  // Simulate real progress through the academy's own state model.
  await page.evaluate(() => {
    state.learnerName = "Jane Medic, NRP";
    state.modules[1].read = true;
    state.modules[1].passed = true;
    state.modules[1].best = 90;
    saveState();
  });

  // Wait out the 2.5s debounce.
  await page.waitForTimeout(3200);

  const signup = received.find((r) => r.url.startsWith("/auth/v1/signup") && r.method === "POST");
  check("anonymous sign-in happened", !!signup);

  const upsert = received.find((r) => r.url.startsWith("/rest/v1/academy_completions") && r.method === "POST");
  check("completion upsert was sent", !!upsert,
    "got: " + received.map((r) => r.url).join(", "));

  if (upsert) {
    check("upsert targets the right conflict key", upsert.url.includes("on_conflict=user_id,course_id"));
    check(`course_id is "${course}"`, upsert.body.course_id === course,
      "got " + upsert.body.course_id);
    check("learner name carried", upsert.body.learner_name === "Jane Medic, NRP");
    check("module state carried", upsert.body.modules["1"] &&
      upsert.body.modules["1"].passed === true && upsert.body.modules["1"].best === 90);
    check("user_id stamped from session", upsert.body.user_id === "e2e-user-uuid");
    check("modules_total is the real module count", upsert.body.modules_total > 1,
      "got " + upsert.body.modules_total);
  }

  // Debounce: a burst of saves must not produce a burst of requests.
  const before = received.filter((r) => r.url.startsWith("/rest/v1/") && r.method === "POST").length;
  await page.evaluate(() => {
    for (let i = 0; i < 20; i++) { state.learnerName = "Jane Medic, NRP".slice(0, 5 + (i % 9)); saveState(); }
  });
  await page.waitForTimeout(3200);
  const after = received.filter((r) => r.url.startsWith("/rest/v1/") && r.method === "POST").length;
  check("20 rapid saves collapse to a single push", after - before === 1, `sent ${after - before}`);

  await ctx.close();
}

// ── offline behaviour ────────────────────────────────────────
{
  console.log("\n--- offline durability (hemodynamics) ---");
  received.length = 0;
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript((url) => {
    window.AMR_BACKEND_CONFIG = { url, anonKey: "test-anon-key" };
  }, SUPA);
  await page.goto("http://127.0.0.1:8099/hemodynamics-academy.html", { waitUntil: "networkidle" });

  // Cut the backend off.
  await page.route("**/127.0.0.1:54321/**", (r) => r.abort());
  await page.evaluate(() => {
    state.learnerName = "Offline Medic";
    state.modules[1].passed = true; state.modules[1].best = 95;
    state.finalPassed = true; state.finalBest = 88;
    state.completedAt = new Date().toISOString();
    saveState();
  });
  await page.waitForTimeout(3200);

  const queued = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("amr_backend_outbox_v1") || "[]"));
  check("completion queued while offline", queued.length === 1,
    "outbox length " + queued.length);
  check("queued item holds the passing record",
    queued[0] && queued[0].body.final_passed === true && queued[0].body.final_best === 88);

  // Restore the network and flush.
  await page.unroute("**/127.0.0.1:54321/**");
  const n = received.filter((r) => r.url.startsWith("/rest/v1/") && r.method === "POST").length;
  await page.evaluate(() => window.AMRBackend.flush());
  await page.waitForTimeout(1500);
  check("outbox drains once back online",
    received.filter((r) => r.url.startsWith("/rest/v1/") && r.method === "POST").length === n + 1);
  const after = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("amr_backend_outbox_v1") || "[]"));
  check("outbox is empty after drain", after.length === 0, "left " + after.length);
  await ctx.close();
}

// ── unconfigured backend must change nothing ─────────────────
{
  console.log("\n--- unconfigured backend ---");
  received.length = 0;
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("http://127.0.0.1:8099/hemodynamics-academy.html", { waitUntil: "networkidle" });
  await page.evaluate(() => { state.modules[1].passed = true; saveState(); });
  await page.waitForTimeout(3200);
  check("no errors with no backend configured", errors.length === 0, errors.join("\n"));
  check("no requests attempted", received.length === 0);
  check("localStorage progress still saved", await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hemo_academy_v1")).modules[1].passed === true));
  await ctx.close();
}


// ── Ask the Educator ─────────────────────────────────────────
async function openAsk(page) {
  // Pre-accept the "Educational Use Only" modal — otherwise it sits over the
  // page as a pointer-event blocker and every click times out.
  await page.addInitScript(() => {
    try { localStorage.setItem("amrkc_disc_v2", "1"); } catch (e) {}
  });
  await page.goto("http://127.0.0.1:8099/index.html", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof window.render === "function");
  await page.evaluate(() => { window.TAB = "ask"; window.render(); });
  await page.waitForSelector("#ask-msg");
}

{
  console.log("\n--- Ask the Educator ---");
  received.length = 0;
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript((url) => {
    window.AMR_BACKEND_CONFIG = { url, anonKey: "test-anon-key" };
  }, SUPA);
  await openAsk(page);

  const heroText = await page.textContent(".ask-hero");
  check("the '100% Anonymous' claim is gone", !/100% Anonymous/i.test(heroText), heroText.slice(0, 200));
  check("it still says no name is required", /no name required/i.test(heroText));

  check("submit is disabled until 10 chars",
    await page.isDisabled("#ask-submit"));
  await page.fill("#ask-msg", "What is the MAP target after ROSC in transport?");
  await page.dispatchEvent("#ask-msg", "input");
  check("submit enables once long enough", !(await page.isDisabled("#ask-submit")));

  await page.fill("#ask-email", "medic@example.com");
  await page.click("#ask-submit");
  await page.waitForSelector(".ask-confirm", { state: "visible" });

  const post = received.find((r) => r.url.startsWith("/rest/v1/ask_educator_messages") && r.method === "POST");
  check("message POSTed to Supabase", !!post, received.map((r) => r.method + " " + r.url).join(", "));
  if (post) {
    check("message body carried", /MAP target after ROSC/.test(post.body.message));
    check("reply email carried", post.body.reply_email === "medic@example.com");
    check("user_id stamped", post.body.user_id === "e2e-user-uuid");
    check("source recorded", post.body.source === "ask");
  }
  check("no Apps Script call remains",
    !received.some((r) => /script\.google\.com/.test(r.url)));
  const confirm = await page.textContent("#ask-confirm-sub");
  check("confirmation names the reply address", /medic@example\.com/.test(confirm), confirm);
  await ctx.close();
}

{
  console.log("\n--- Ask the Educator: failure is reported, not hidden ---");
  received.length = 0;
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript((url) => {
    window.AMR_BACKEND_CONFIG = { url, anonKey: "test-anon-key" };
  }, SUPA);
  await openAsk(page);

  // Reject the insert the way the rate-limit trigger would.
  await page.route("**/rest/v1/ask_educator_messages*", (r) => {
    if (r.request().method() === "OPTIONS") return r.continue();
    r.fulfill({ status: 400, contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Too many messages sent in the last hour." }) });
  });

  await page.fill("#ask-msg", "Another question that should be rejected outright");
  await page.dispatchEvent("#ask-msg", "input");
  await page.click("#ask-submit");
  await page.waitForTimeout(1200);

  const confirmVisible = await page.isVisible(".ask-confirm");
  check("a rejected message does NOT show 'Message Sent'", !confirmVisible);
  const status = await page.textContent("#ask-status");
  check("the rejection reason is surfaced", /Too many messages/.test(status), status);
  check("the submit button is re-enabled", !(await page.isDisabled("#ask-submit")));
  await ctx.close();
}

{
  console.log("\n--- Ask the Educator: offline is held, not lost ---");
  received.length = 0;
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript((url) => {
    window.AMR_BACKEND_CONFIG = { url, anonKey: "test-anon-key" };
  }, SUPA);
  await openAsk(page);
  await page.evaluate(() => window.AMRBackend.flush()); // establish a session first
  await page.waitForTimeout(500);
  await page.route("**/rest/v1/**", (r) => r.abort());

  await page.fill("#ask-msg", "A question typed in a basement with no signal");
  await page.dispatchEvent("#ask-msg", "input");
  await page.click("#ask-submit");
  await page.waitForSelector(".ask-confirm", { state: "visible" });

  const confirm = await page.textContent("#ask-confirm-sub");
  check("the offline case is stated plainly", /offline/i.test(confirm), confirm);
  const box = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("amr_backend_outbox_v1") || "[]"));
  check("the message is queued on the device", box.length === 1, "outbox " + box.length);
  check("the queued message is intact",
    box[0] && /basement with no signal/.test(box[0].body.message));
  await ctx.close();
}


// ── Email linking prompt ─────────────────────────────────────
{
  console.log("\n--- email linking prompt (hemodynamics) ---");
  received.length = 0;
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript((url) => {
    window.AMR_BACKEND_CONFIG = { url, anonKey: "test-anon-key" };
  }, SUPA);
  await page.goto("http://127.0.0.1:8099/hemodynamics-academy.html", { waitUntil: "domcontentloaded" });

  check("the prompt is shown when a backend is configured",
    await page.isVisible("#linkBox"));
  check("it does not block the module list", await page.isVisible("#modList"));

  await page.click("#linkToggle");
  await page.fill("#linkEmail", "jane.medic@example.com");
  await page.click("#linkSave");
  await page.waitForTimeout(900);

  const put = received.find((r) => r.url === "/auth/v1/user" && r.method === "PUT");
  check("linkEmail PUTs the address", !!put,
    received.map((r) => r.method + " " + r.url).join(", "));
  if (put) check("the typed address is sent", put.body.email === "jane.medic@example.com");

  const msg = await page.textContent("#linkMsg");
  check("it says to check the inbox rather than claiming success",
    /check .*jane\.medic@example\.com/i.test(msg) && /confirm/i.test(msg), msg);
  await ctx.close();
}

{
  console.log("\n--- email linking: hidden with no backend ---");
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("http://127.0.0.1:8099/hemodynamics-academy.html", { waitUntil: "domcontentloaded" });
  check("the prompt stays hidden when unconfigured", !(await page.isVisible("#linkBox")));
  check("no page errors", errors.length === 0, errors.join("\n"));
  await ctx.close();
}

// ── Educator dashboard ───────────────────────────────────────
const COMPLETION_ROWS = [
  { course_id: "hemodynamics", course_version: "2.0", learner_name: "Jane Medic, NRP",
    learner_email: "jane.medic@example.com", modules_passed: 8, modules_total: 8,
    final_passed: true, final_best: 91, completed_at: "2026-08-01T10:00:00Z",
    updated_at: "2026-08-02T10:00:00Z", user_id: "u1" },
  { course_id: "airway", course_version: null, learner_name: "Sam Medic, EMT",
    learner_email: null, modules_passed: 3, modules_total: 8,
    final_passed: false, final_best: 0, completed_at: null,
    updated_at: "2026-08-03T10:00:00Z", user_id: "u2" },
];
const ASK_ROWS = [
  { id: "m1", message: "What is the MAP target after ROSC?", reply_email: "medic@example.com",
    source: "ask", created_at: "2026-08-03T09:00:00Z" },
  { id: "m2", message: "<img src=x onerror=alert(1)> injection attempt", reply_email: null,
    source: "ask", created_at: "2026-08-02T09:00:00Z" },
];

function dashHandler({ signInOk = true, rows = COMPLETION_ROWS, ask = ASK_ROWS } = {}) {
  return (req, res, body) => {
    if (req.url.startsWith("/auth/v1/token?grant_type=password")) {
      if (!signInOk) return [400, { error_description: "Invalid login credentials" }];
      return [200, {
        access_token: "jwt-edu", refresh_token: "refresh-edu", expires_in: 3600,
        user: { id: "edu-uuid", is_anonymous: false, email: "hunter@example.com" },
      }];
    }
    if (req.url.startsWith("/rest/v1/academy_completions")) return [200, rows];
    if (req.url.startsWith("/rest/v1/ask_educator_messages")) return [200, ask];
    if (req.url === "/auth/v1/logout") return [204, null];
    return [404, null];
  };
}

async function openDash(page) {
  await page.addInitScript((url) => {
    window.AMR_BACKEND_CONFIG = { url, anonKey: "test-anon-key" };
  }, SUPA);
  await page.goto("http://127.0.0.1:8099/educator-dashboard.html", { waitUntil: "domcontentloaded" });
}

{
  console.log("\n--- educator dashboard: sign in and read ---");
  received.length = 0;
  apiHandler = dashHandler();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await openDash(page);

  check("the sign-in gate is shown first", await page.isVisible("#signinCard"));
  check("no data is visible before signing in", !(await page.isVisible("#dash")));

  await page.fill("#email", "hunter@example.com");
  await page.fill("#password", "correct-horse");
  await page.click("#signinBtn");
  await page.waitForSelector("#dash", { state: "visible" });

  check("the dashboard appears after sign-in", await page.isVisible("#dash"));
  check("the signed-in address is shown", (await page.textContent("#who")).includes("hunter@example.com"));

  const rows = await page.$$eval("#completionsBody tr", (trs) =>
    trs.map((tr) => Array.from(tr.children).map((td) => td.textContent.trim())));
  check("both completions render", rows.length === 2, JSON.stringify(rows));
  check("a verified email is shown", rows.some((r) => r[1] === "jane.medic@example.com"));
  check("an unlinked record is flagged, not left blank",
    rows.some((r) => /not linked/i.test(r[1])), JSON.stringify(rows.map((r) => r[1])));
  check("course names are humanised", rows.some((r) => r[2] === "Hemodynamics"));
  check("module counts render", rows.some((r) => r[3] === "8 / 8"));
  check("status pills render", rows.some((r) => /Completed/.test(r[4])) && rows.some((r) => /In progress/.test(r[4])));

  check("no page errors", errors.length === 0, errors.join("\n"));
  await ctx.close();
}

{
  console.log("\n--- educator dashboard: filters and sorting ---");
  apiHandler = dashHandler();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await openDash(page);
  await page.fill("#email", "hunter@example.com");
  await page.fill("#password", "x");
  await page.click("#signinBtn");
  await page.waitForSelector("#dash", { state: "visible" });

  await page.selectOption("#courseFilter", "airway");
  await page.waitForTimeout(150);
  let names = await page.$$eval("#completionsBody tr td:first-child", (t) => t.map((x) => x.textContent.trim()));
  check("course filter narrows the table", names.length === 1 && names[0] === "Sam Medic, EMT", JSON.stringify(names));

  await page.selectOption("#courseFilter", "");
  await page.selectOption("#statusFilter", "passed");
  await page.waitForTimeout(150);
  names = await page.$$eval("#completionsBody tr td:first-child", (t) => t.map((x) => x.textContent.trim()));
  check("status filter narrows the table", names.length === 1 && names[0] === "Jane Medic, NRP", JSON.stringify(names));

  await page.selectOption("#statusFilter", "");
  await page.fill("#q", "sam");
  await page.waitForTimeout(150);
  names = await page.$$eval("#completionsBody tr td:first-child", (t) => t.map((x) => x.textContent.trim()));
  check("search matches on name", names.length === 1 && names[0] === "Sam Medic, EMT", JSON.stringify(names));

  await page.fill("#q", "jane.medic@example.com");
  await page.waitForTimeout(150);
  names = await page.$$eval("#completionsBody tr td:first-child", (t) => t.map((x) => x.textContent.trim()));
  check("search matches on verified email", names.length === 1 && names[0] === "Jane Medic, NRP");

  await page.fill("#q", "");
  await page.click('th[data-sort="learner_name"]');
  await page.waitForTimeout(150);
  names = await page.$$eval("#completionsBody tr td:first-child", (t) => t.map((x) => x.textContent.trim()));
  check("sorting by name ascends", names[0] === "Jane Medic, NRP", JSON.stringify(names));
  await page.click('th[data-sort="learner_name"]');
  await page.waitForTimeout(150);
  names = await page.$$eval("#completionsBody tr td:first-child", (t) => t.map((x) => x.textContent.trim()));
  check("clicking again reverses it", names[0] === "Sam Medic, EMT", JSON.stringify(names));
  await ctx.close();
}

{
  console.log("\n--- educator dashboard: Ask inbox ---");
  apiHandler = dashHandler();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const alerts = [];
  page.on("dialog", (d) => { alerts.push(d.message()); d.dismiss(); });
  await openDash(page);
  await page.fill("#email", "hunter@example.com");
  await page.fill("#password", "x");
  await page.click("#signinBtn");
  await page.waitForSelector("#dash", { state: "visible" });

  await page.click("#tab-ask");
  await page.waitForSelector("#panel-ask", { state: "visible" });
  const cells = await page.$$eval("#askBody tr", (trs) =>
    trs.map((tr) => Array.from(tr.children).map((td) => td.textContent.trim())));
  check("messages render", cells.length === 2, JSON.stringify(cells));
  check("the message body is shown", cells.some((c) => /MAP target after ROSC/.test(c[1])));
  check("a reply address is shown", cells.some((c) => /medic@example\.com/.test(c[2])));
  check("a missing reply address is stated", cells.some((c) => /no reply address/i.test(c[2])));

  // The injection row must be rendered as text, never executed.
  check("markup in a message is not executed", alerts.length === 0, JSON.stringify(alerts));
  const injected = await page.$$eval("#askBody img", (n) => n.length);
  check("no element is created from message content", injected === 0);
  check("the raw text is displayed instead",
    cells.some((c) => c[1].includes("<img src=x onerror=alert(1)>")), JSON.stringify(cells.map((c) => c[1])));
  await ctx.close();
}

{
  console.log("\n--- educator dashboard: wrong password ---");
  apiHandler = dashHandler({ signInOk: false });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await openDash(page);
  await page.fill("#email", "hunter@example.com");
  await page.fill("#password", "wrong");
  await page.click("#signinBtn");
  await page.waitForTimeout(800);
  check("the dashboard stays closed", !(await page.isVisible("#dash")));
  const m = await page.textContent("#signinMsg");
  check("the failure is explained", /Invalid login credentials/.test(m), m);
  await ctx.close();
}

{
  console.log("\n--- educator dashboard: signed in but not an educator ---");
  // RLS returns an empty set rather than an error. The page must not
  // present that as "no completions exist yet" without qualification.
  apiHandler = dashHandler({ rows: [], ask: [] });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await openDash(page);
  await page.fill("#email", "nobody@example.com");
  await page.fill("#password", "x");
  await page.click("#signinBtn");
  await page.waitForSelector("#dash", { state: "visible" });
  await page.waitForTimeout(500);
  const note = await page.textContent("#loadMsg");
  check("the empty result is explained honestly",
    /allowlist/i.test(note), note);
  await ctx.close();
}

{
  console.log("\n--- educator dashboard: unconfigured build ---");
  apiHandler = dashHandler();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("http://127.0.0.1:8099/educator-dashboard.html", { waitUntil: "domcontentloaded" });
  check("it explains that no backend is set", await page.isVisible("#unconfigured"));
  check("the sign-in form is not offered", !(await page.isVisible("#signinCard")));
  check("no page errors", errors.length === 0, errors.join("\n"));
  await ctx.close();
}

{
  console.log("\n--- educator dashboard: sign out ---");
  apiHandler = dashHandler();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await openDash(page);
  await page.fill("#email", "hunter@example.com");
  await page.fill("#password", "x");
  await page.click("#signinBtn");
  await page.waitForSelector("#dash", { state: "visible" });
  await page.click("#signOutBtn");
  await page.waitForSelector("#signinCard", { state: "visible" });
  check("signing out returns to the gate", !(await page.isVisible("#dash")));
  const left = await page.evaluate(() => localStorage.getItem("amr_backend_educator_v1"));
  check("the educator session is cleared from storage", left === null, String(left));

  // And it survives a reload as signed out.
  await page.reload({ waitUntil: "domcontentloaded" });
  check("still signed out after a reload", await page.isVisible("#signinCard"));
  await ctx.close();
}


// ── VTA academy ──────────────────────────────────────────────
{
  console.log("\n--- VTA academy (vta/academy.html) ---");
  received.length = 0;
  apiHandler = null;
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  const IGNORE = /fonts\.googleapis\.com|fonts\.gstatic\.com|Failed to load resource/;
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" && !IGNORE.test(m.text())) errors.push(m.text()); });
  await page.addInitScript((url) => {
    window.AMR_BACKEND_CONFIG = { url, anonKey: "test-anon-key" };
  }, SUPA);
  await page.goto("http://127.0.0.1:8099/vta/academy.html", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof Store !== "undefined" && !!Store.state);

  check("the VTA page loads clean", errors.length === 0, errors.join("\n"));
  check("amr-backend.js resolves from the subdirectory",
    await page.evaluate(() => !!window.AMRBackend && window.AMRBackend.isConfigured()));

  // Drive real progress through VTA's own store.
  await page.evaluate(() => {
    const m = Store.mod(1);
    MODULES[0].lessons.forEach((l) => { m.lessonsRead[l.id] = true; });
    m.quizResults = { score: 9, total: 10, passed: true };
    m.matchResults = { passed: true };
    m.scenarioResults = { done: true };
    Store.state.examResults = { score: 45, total: 50, passed: true, submittedAt: Date.parse("2026-08-01T10:00:00Z") };
    Store.state.certificate = {
      name: "Jane Medic", credential: "Paramedic", score: 45, total: 50,
      issuedAt: Date.parse("2026-08-02T10:00:00Z"), certId: "VTA-2026-ABC123",
    };
    Store.save();
  });
  await page.waitForTimeout(3200);

  const up = received.find((r) => r.url.startsWith("/rest/v1/academy_completions") && r.method === "POST");
  check("a VTA completion was pushed", !!up, received.map((r) => r.method + " " + r.url).join(", "));
  if (up) {
    check('course_id is "vta"', up.body.course_id === "vta", up.body.course_id);
    check("the certificate name is used as the learner name",
      up.body.learner_name === "Jane Medic", up.body.learner_name);
    check("final_passed carried", up.body.final_passed === true);
    check("final score is a percentage", up.body.final_best === 90, String(up.body.final_best));
    check("module quiz score is a percentage",
      up.body.modules["1"] && up.body.modules["1"].best === 90,
      JSON.stringify(up.body.modules["1"]));
    check("module 1 counts as passed",
      up.body.modules["1"] && up.body.modules["1"].passed === true);
    check("all nine modules are reported",
      up.body.modules_total === 9, String(up.body.modules_total));
    check("credential and certId ride in meta",
      up.body.meta && up.body.meta.credential === "Paramedic" && up.body.meta.certId === "VTA-2026-ABC123",
      JSON.stringify(up.body.meta));
    check("completed_at is the certificate issue date",
      (up.body.completed_at || "").startsWith("2026-08-02"), up.body.completed_at);
  }
  await ctx.close();
}

{
  console.log("\n--- VTA: certificate email link ---");
  received.length = 0;
  apiHandler = null;
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript((url) => {
    window.AMR_BACKEND_CONFIG = { url, anonKey: "test-anon-key" };
  }, SUPA);
  await page.goto("http://127.0.0.1:8099/vta/academy.html", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof Store !== "undefined" && !!Store.state);

  await page.evaluate(() => {
    Store.state.examResults = { score: 45, total: 50, passed: true, submittedAt: Date.now() };
    Store.state.certificate = {
      name: "Jane Medic", credential: "Paramedic", score: 45, total: 50,
      issuedAt: Date.now(), certId: "VTA-2026-ABC123",
    };
    Store.save();
    Nav.go("certificate");
  });
  await page.waitForSelector("#vta-link-email");
  check("the link prompt appears on the certificate", await page.isVisible("#vta-link-email"));

  await page.fill("#vta-link-email", "jane.medic@example.com");
  await page.click("text=Send confirmation link");
  await page.waitForTimeout(900);
  const put = received.find((r) => r.url === "/auth/v1/user" && r.method === "PUT");
  check("the address is PUT", !!put && put.body.email === "jane.medic@example.com");

  const disclaimer = await page.textContent(".cert-disclaimer");
  check("the disclaimer no longer claims records are browser-only",
    !/not independently proctored or auditable/.test(disclaimer)
    && /not independently proctored/.test(disclaimer), disclaimer.slice(0, 400));
  await ctx.close();
}

{
  console.log("\n--- VTA: unconfigured build ---");
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("http://127.0.0.1:8099/vta/academy.html", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof Store !== "undefined");
  await page.evaluate(() => { Store.mod(1).lessonsRead["x"] = true; Store.save(); });
  await page.waitForTimeout(500);
  check("no errors with no backend configured", errors.length === 0, errors.join("\n"));
  check("progress still saves locally",
    await page.evaluate(() => !!localStorage.getItem("vta-pwa-state-v2")));
  await ctx.close();
}

// ── Caregiver form ───────────────────────────────────────────
/* jsPDF is loaded from a CDN this sandbox blocks, so PDF generation would
   throw and the confirmation panel would never appear — hiding the thing
   under test, which is the record logging that follows it. A minimal stub
   stands in for the PDF layer; building the actual PDF is not what these
   checks are about. */
async function stubJsPdf(page) {
  await page.addInitScript(() => {
    const noop = function () { return this; };
    class FakeDoc {
      constructor() { this.internal = { pageSize: { getWidth: () => 612, getHeight: () => 792 } }; }
      addFileToVFS() { return noop.call(this); }
      addFont() { return noop.call(this); }
      setFont() { return noop.call(this); }
      setFontSize() { return noop.call(this); }
      setTextColor() { return noop.call(this); }
      setDrawColor() { return noop.call(this); }
      setFillColor() { return noop.call(this); }
      setLineWidth() { return noop.call(this); }
      text() { return noop.call(this); }
      line() { return noop.call(this); }
      rect() { return noop.call(this); }
      addImage() { return noop.call(this); }
      addPage() { return noop.call(this); }
      getImageProperties() { return { width: 600, height: 200, fileType: "PNG" }; }
      splitTextToSize(t) { return [t]; }
      getTextWidth() { return 10; }
      output() { return new Blob(["%PDF-1.4 stub"], { type: "application/pdf" }); }
    }
    window.jspdf = { jsPDF: FakeDoc };
  });
}

async function fillCaregiverForm(page) {
  await page.evaluate(() => { window.TAB = "forms"; window.render(); });
  await page.waitForSelector("#cgf-date");
  await page.evaluate(() => {
    document.getElementById("cgf-date").value = "2026-08-03";
    document.getElementById("cgf-case").value = "KC-99812";
    document.getElementById("cgf-name-1").value = "Jane Medic";
    document.getElementById("cgf-cert-1").value =
      document.getElementById("cgf-cert-1").options[1].value;
    // Stand in for a drawn signature.
    if (window.CGF_SIGS) window.CGF_SIGS[0] = "data:image/png;base64,iVBORw0KGgo=";
  });
}

{
  console.log("\n--- Caregiver Form: files a record to Supabase ---");
  received.length = 0;
  apiHandler = null;
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    try { localStorage.setItem("amrkc_disc_v2", "1"); } catch (e) {}
  });
  await page.addInitScript((url) => {
    window.AMR_BACKEND_CONFIG = { url, anonKey: "test-anon-key" };
  }, SUPA);
  await stubJsPdf(page);
  await page.goto("http://127.0.0.1:8099/index.html", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof window.render === "function");
  await fillCaregiverForm(page);

  await page.click("#cgf-submit");
  await page.waitForSelector("#cgf-confirm", { state: "visible", timeout: 20000 });

  const post = received.find((r) => r.url.startsWith("/rest/v1/caregiver_forms") && r.method === "POST");
  check("the record was POSTed to Supabase", !!post,
    received.map((r) => r.method + " " + r.url).join(", "));
  if (post) {
    check("case number carried", post.body.case_number === "KC-99812");
    check("service date carried", post.body.service_date === "2026-08-03");
    check("crew carried", post.body.crew.length === 1 && post.body.crew[0].name === "Jane Medic");
    check("NO signature reached the server", !/data:image/.test(JSON.stringify(post.body)),
      JSON.stringify(post.body));
    check("user_id stamped", post.body.user_id === "e2e-user-uuid");
  }
  check("no Apps Script call remains", !received.some((r) => /script\.google\.com/.test(r.url)));
  const log = await page.textContent("#cgf-log");
  check("the crew is told the record filed", /filed/i.test(log), log);
  await ctx.close();
}

{
  console.log("\n--- Caregiver Form: logging failure does not retract the PDF ---");
  received.length = 0;
  apiHandler = null;
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    try { localStorage.setItem("amrkc_disc_v2", "1"); } catch (e) {}
  });
  await page.addInitScript((url) => {
    window.AMR_BACKEND_CONFIG = { url, anonKey: "test-anon-key" };
  }, SUPA);
  await stubJsPdf(page);
  await page.goto("http://127.0.0.1:8099/index.html", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof window.render === "function");
  await page.route("**/rest/v1/caregiver_forms*", (r) => {
    if (r.request().method() === "OPTIONS") return r.continue();
    r.fulfill({ status: 400, contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "violates check constraint" }) });
  });
  await fillCaregiverForm(page);
  await page.click("#cgf-submit");
  await page.waitForSelector("#cgf-confirm", { state: "visible", timeout: 20000 });

  check("the PDF confirmation still shows", await page.isVisible("#cgf-confirm"));
  check("the share button is still offered", await page.isVisible("#cgf-share"));
  const log = await page.textContent("#cgf-log");
  check("the filing failure is stated plainly", /could not be filed/i.test(log), log);
  check("it still tells them to send the PDF", /send the pdf/i.test(log), log);
  await ctx.close();
}

{
  console.log("\n--- Caregiver Form: offline holds the record ---");
  received.length = 0;
  apiHandler = null;
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    try { localStorage.setItem("amrkc_disc_v2", "1"); } catch (e) {}
  });
  await page.addInitScript((url) => {
    window.AMR_BACKEND_CONFIG = { url, anonKey: "test-anon-key" };
  }, SUPA);
  await stubJsPdf(page);
  await page.goto("http://127.0.0.1:8099/index.html", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof window.render === "function");
  await page.evaluate(() => window.AMRBackend.flush());
  await page.waitForTimeout(400);
  await page.route("**/rest/v1/**", (r) => r.abort());

  await fillCaregiverForm(page);
  await page.click("#cgf-submit");
  await page.waitForSelector("#cgf-confirm", { state: "visible", timeout: 20000 });
  await page.waitForTimeout(600);

  const log = await page.textContent("#cgf-log");
  check("the offline case is stated plainly", /signal|device/i.test(log), log);
  const box = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("amr_backend_outbox_v1") || "[]"));
  check("the record is queued on the device",
    box.some((i) => /caregiver_forms/.test(i.path)), JSON.stringify(box.map((i) => i.path)));
  await ctx.close();
}

// ── Dashboard: caregiver tab + CSV ───────────────────────────
{
  console.log("\n--- dashboard: caregiver tab and CSV export ---");
  const CGF_ROWS = [
    { id: "f1", service_date: "2026-08-03", case_number: "KC-99812", amended: false,
      submitted_at: "8/3/2026 09:14 AM", created_at: "2026-08-03T09:15:00Z",
      crew: [{ num: 1, name: "Jane Medic", cert: "NRP" }] },
    { id: "f2", service_date: "2026-08-02", case_number: "KC-11111", amended: true,
      submitted_at: "8/2/2026 14:02 PM", created_at: "2026-08-02T14:03:00Z",
      crew: [{ num: 1, name: "Sam Medic", cert: "EMT" }] },
  ];
  const VTA_ROW = {
    course_id: "vta", course_version: null, learner_name: "=cmd|'/c calc'!A1",
    learner_email: "jane.medic@example.com", modules_passed: 9, modules_total: 9,
    final_passed: true, final_best: 90, completed_at: "2026-08-02T10:00:00Z",
    updated_at: "2026-08-02T10:00:00Z", user_id: "u3",
    meta: { credential: "Paramedic", certId: "VTA-2026-ABC123" },
  };

  apiHandler = (req) => {
    if (req.url.startsWith("/auth/v1/token?grant_type=password")) {
      return [200, {
        access_token: "jwt-edu", refresh_token: "refresh-edu", expires_in: 3600,
        user: { id: "edu-uuid", is_anonymous: false, email: "hunter@example.com" },
      }];
    }
    if (req.url.startsWith("/rest/v1/academy_completions")) return [200, [VTA_ROW]];
    if (req.url.startsWith("/rest/v1/ask_educator_messages")) return [200, []];
    if (req.url.startsWith("/rest/v1/caregiver_forms")) return [200, CGF_ROWS];
    return [404, null];
  };

  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  await page.addInitScript((url) => {
    window.AMR_BACKEND_CONFIG = { url, anonKey: "test-anon-key" };
  }, SUPA);
  await page.goto("http://127.0.0.1:8099/educator-dashboard.html", { waitUntil: "domcontentloaded" });
  await page.fill("#email", "hunter@example.com");
  await page.fill("#password", "x");
  await page.click("#signinBtn");
  await page.waitForSelector("#dash", { state: "visible" });

  check("VTA renders with its display name",
    (await page.textContent("#completionsBody")).includes("Ventilator Training"));
  check("the credential column shows the VTA credential",
    (await page.textContent("#completionsBody")).includes("Paramedic"));

  await page.click("#tab-cgf");
  await page.waitForSelector("#panel-cgf", { state: "visible" });
  const cgfCells = await page.$$eval("#cgfBody tr", (trs) =>
    trs.map((tr) => Array.from(tr.children).map((td) => td.textContent.trim())));
  check("caregiver forms render", cgfCells.length === 2, JSON.stringify(cgfCells));
  check("case number shown", cgfCells.some((c) => c[2] === "KC-99812"));
  check("crew is summarised with certification",
    cgfCells.some((c) => /Jane Medic \(NRP\)/.test(c[3])), JSON.stringify(cgfCells));
  check("an amended form is flagged", cgfCells.some((c) => /Amended/.test(c[4])));

  await page.fill("#cgfQ", "KC-11111");
  await page.waitForTimeout(150);
  const filtered = await page.$$eval("#cgfBody tr", (t) => t.length);
  check("caregiver search filters", filtered === 1, String(filtered));

  // CSV export
  await page.click("#tab-completions");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click("#csvBtn"),
  ]);
  const stream = await download.createReadStream();
  let csv = "";
  for await (const chunk of stream) csv += chunk;

  check("the CSV names the completions export",
    /amrkc-completions-\d{4}-\d{2}-\d{2}\.csv/.test(download.suggestedFilename()),
    download.suggestedFilename());
  check("the CSV has a header row", csv.split("\r\n")[0].includes("Verified email"), csv.slice(0, 200));
  check("the verified email is exported", csv.includes("jane.medic@example.com"));
  check("the VTA credential is exported", csv.includes("Paramedic"));
  check("a formula-shaped name is neutralised for spreadsheets",
    csv.includes("\"'=cmd|'/c calc'!A1\""),
    csv.split("\r\n")[1]);
  await ctx.close();
  apiHandler = null;
}


// ── VTA admin unlock ─────────────────────────────────────────
{
  console.log("\n--- VTA admin unlock: no password in the source ---");
  const appJs = fs.readFileSync(path.join(ROOT, "vta/app.js"), "utf8");
  check("no ADMIN_PASSWORD constant remains", !/ADMIN_PASSWORD/.test(appJs));
  check("the old literal is gone", !/Brbull/i.test(appJs));
  check("the ?admin URL bypass is gone",
    !/URLSearchParams\(location\.search\)\.has\("admin"\)/.test(appJs));
}

{
  console.log("\n--- VTA admin unlock: allowlisted educator ---");
  received.length = 0;
  apiHandler = (req) => {
    if (req.url.startsWith("/auth/v1/token?grant_type=password")) {
      return [200, {
        access_token: "jwt-edu", refresh_token: "refresh-edu", expires_in: 3600,
        user: { id: "edu-uuid", is_anonymous: false, email: "hunter@example.com" },
      }];
    }
    if (req.url === "/rest/v1/rpc/is_educator") return [200, true];
    if (req.url === "/auth/v1/signup") {
      return [200, { access_token: "jwt-e2e", refresh_token: "r", expires_in: 3600,
        user: { id: "e2e-user-uuid", is_anonymous: true, email: "" } }];
    }
    return [201, null];
  };

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript((url) => {
    window.AMR_BACKEND_CONFIG = { url, anonKey: "test-anon-key" };
  }, SUPA);
  await page.goto("http://127.0.0.1:8099/vta/academy.html", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof Store !== "undefined" && !!Store.state);

  check("admin is off by default",
    await page.evaluate(() => localStorage.getItem("vta_admin") === null));

  await page.click("#adminButton");
  await page.waitForSelector(".admin-overlay", { state: "visible" });
  check("the sign-in overlay opens", await page.isVisible("#vta-admin-email"));
  check("the password field is masked",
    (await page.getAttribute("#vta-admin-pw", "type")) === "password");

  await page.fill("#vta-admin-email", "hunter@example.com");
  await page.fill("#vta-admin-pw", "correct-horse");
  await page.click("#vta-admin-submit");
  // A successful unlock reloads the page. Wait for the footer button to come
  // back showing the unlocked state rather than reading storage mid-navigation
  // — and it asserts the UI actually reflects admin mode, not just the flag.
  await page.waitForFunction(
    () => {
      const b = document.getElementById("adminButton");
      return !!b && b.textContent.indexOf("\u2713") !== -1;
    },
    { timeout: 15000 });

  check("credentials were sent to the auth endpoint",
    received.some((r) => r.url.startsWith("/auth/v1/token?grant_type=password") && r.method === "POST"));
  check("authorisation was checked against the database",
    received.some((r) => r.url === "/rest/v1/rpc/is_educator" && r.method === "POST"));
  check("admin mode is now on",
    await page.evaluate(() => localStorage.getItem("vta_admin") === "1"));
  check("locked modules are now reachable",
    await page.evaluate(() => Store.isModuleUnlocked(5) === true));
  await ctx.close();
}

{
  console.log("\n--- VTA admin unlock: valid login, NOT allowlisted ---");
  received.length = 0;
  apiHandler = (req) => {
    if (req.url.startsWith("/auth/v1/token?grant_type=password")) {
      return [200, {
        access_token: "jwt-edu", refresh_token: "refresh-edu", expires_in: 3600,
        user: { id: "other-uuid", is_anonymous: false, email: "nobody@example.com" },
      }];
    }
    if (req.url === "/rest/v1/rpc/is_educator") return [200, false];  // signed in, not authorised
    return [201, null];
  };

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript((url) => {
    window.AMR_BACKEND_CONFIG = { url, anonKey: "test-anon-key" };
  }, SUPA);
  await page.goto("http://127.0.0.1:8099/vta/academy.html", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof Store !== "undefined" && !!Store.state);

  await page.click("#adminButton");
  await page.waitForSelector(".admin-overlay", { state: "visible" });
  await page.fill("#vta-admin-email", "nobody@example.com");
  await page.fill("#vta-admin-pw", "correct-password");
  await page.click("#vta-admin-submit");
  await page.waitForTimeout(1200);

  const msg = await page.textContent("#vta-admin-status");
  check("a correct password alone does not unlock", /not on the educator allowlist/i.test(msg), msg);
  check("admin mode stays off",
    await page.evaluate(() => localStorage.getItem("vta_admin") === null));
  check("the overlay stays open", await page.isVisible(".admin-overlay"));
  await ctx.close();
}

{
  console.log("\n--- VTA admin unlock: wrong password ---");
  apiHandler = (req) => {
    if (req.url.startsWith("/auth/v1/token?grant_type=password")) {
      return [400, { error_description: "Invalid login credentials" }];
    }
    return [201, null];
  };
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript((url) => {
    window.AMR_BACKEND_CONFIG = { url, anonKey: "test-anon-key" };
  }, SUPA);
  await page.goto("http://127.0.0.1:8099/vta/academy.html", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof Store !== "undefined" && !!Store.state);

  await page.click("#adminButton");
  await page.waitForSelector(".admin-overlay", { state: "visible" });
  await page.fill("#vta-admin-email", "hunter@example.com");
  await page.fill("#vta-admin-pw", "wrong");
  await page.click("#vta-admin-submit");
  await page.waitForTimeout(1000);
  const msg = await page.textContent("#vta-admin-status");
  check("the failure is explained", /Invalid login credentials/.test(msg), msg);
  check("admin mode stays off",
    await page.evaluate(() => localStorage.getItem("vta_admin") === null));
  await ctx.close();
  apiHandler = null;
}

{
  console.log("\n--- VTA admin unlock: ?admin no longer bypasses ---");
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("http://127.0.0.1:8099/vta/academy.html?admin", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof Store !== "undefined" && !!Store.state);
  check("?admin does not grant admin",
    await page.evaluate(() => localStorage.getItem("vta_admin") === null));
  check("module 2 stays locked",
    await page.evaluate(() => Store.isModuleUnlocked(2) === false));
  await ctx.close();
}

await browser.close();
api.close(); site.close();
console.log(`\n${PASS} passed, ${FAIL} failed\n`);
process.exit(FAIL ? 1 : 0);
