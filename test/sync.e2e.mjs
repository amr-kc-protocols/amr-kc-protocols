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
const api = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    received.push({ url: req.url, method: req.method, body: body ? JSON.parse(body) : null });
    res.writeHead(req.url.startsWith("/auth/v1/signup") ? 200 : 201, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "*",
    });
    if (req.method === "OPTIONS") return res.end();
    if (req.url.startsWith("/auth/v1/signup")) {
      return res.end(JSON.stringify({
        access_token: "jwt-e2e", refresh_token: "refresh-e2e", expires_in: 3600,
        user: { id: "e2e-user-uuid", is_anonymous: true, email: "" },
      }));
    }
    res.end("");
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

await browser.close();
api.close(); site.close();
console.log(`\n${PASS} passed, ${FAIL} failed\n`);
process.exit(FAIL ? 1 : 0);
