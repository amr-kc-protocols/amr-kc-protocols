/*
 * Respirator Fit Test form (immunization-forms.html)
 * --------------------------------------------------
 * Drives the real page in headless Chromium: fills SR-100.03.1, signs both
 * pads, and asserts a valid PDF comes out with the right content.
 *
 * jsPDF is stubbed because it loads from a CDN this sandbox blocks; the
 * calls it receives are captured so the PDF's *content* is still asserted.
 * All data is synthetic.
 */
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json",
  ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon" };
const site = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  const f = path.join(ROOT, u === "/" ? "index.html" : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    res.writeHead(404); return res.end("nf");
  }
  res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" });
  res.end(fs.readFileSync(f));
});
await new Promise((r) => site.listen(8097, "127.0.0.1", r));

let PASS = 0, FAIL = 0;
const check = (n, ok, extra = "") => {
  if (ok) { PASS++; console.log("  PASS  " + n); }
  else { FAIL++; console.log("  FAIL  " + n + (extra ? "\n        " + extra : "")); }
};

async function launch() {
  const known = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  const exe = process.env.CHROMIUM_PATH || (fs.existsSync(known) ? known : null);
  try { return await chromium.launch(exe ? { executablePath: exe } : {}); }
  catch { return await chromium.launch(); }
}
const browser = await launch();

// Capture what the page asks jsPDF to draw, and whether it saved.
const STUB = () => {
  window.__pdf = { text: [], images: 0, saved: null };
  class FakeDoc {
    constructor() { this.internal = { pageSize: { getWidth: () => 612, getHeight: () => 792 } }; }
    setFont() { return this; } setFontSize() { return this; }
    setTextColor() { return this; } setDrawColor() { return this; }
    setLineWidth() { return this; } line() { return this; }
    addPage() { return this; }
    text(t) { window.__pdf.text.push(Array.isArray(t) ? t.join(" ") : String(t)); return this; }
    splitTextToSize(t) { return [t]; }
    getTextWidth() { return 40; }
    getTextDimensions() { return { h: 12 }; }
    addImage() { window.__pdf.images++; return this; }
    save(name) { window.__pdf.saved = name; return this; }
  }
  window.jspdf = { jsPDF: FakeDoc };
};

async function open(page) {
  await page.addInitScript(STUB);
  await page.goto("http://127.0.0.1:8097/immunization-forms.html", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof openForm === "function");
}

// Chip radios are visually hidden inside their label; tap the label.
function chip(page, name, value) {
  return page.click(`.chip:has(input[name="${name}"][value="${value}"]) span`);
}

// Draw on a signature canvas the way a finger would.
async function sign(page, id) {
  // boundingBox is viewport-relative and so are mouse coordinates, so a pad
  // below the fold must be scrolled to first or the strokes land elsewhere.
  await page.locator("#" + id).scrollIntoViewIfNeeded();
  // Read the box only after the scroll settles — a box captured mid-scroll
  // sends the strokes to the wrong place and the pad records nothing.
  await page.waitForTimeout(150);
  const box = await page.locator("#" + id).boundingBox();
  // Stroke through the vertical middle of the pad. Near the top the sticky
  // page header can sit over the canvas, and mousedown then lands on the
  // header instead — the pad records nothing and validation rejects it.
  const midY = box.y + box.height / 2;
  await page.mouse.move(box.x + 20, midY);
  await page.mouse.down();
  await page.mouse.move(box.x + 90, midY + 20, { steps: 8 });
  await page.mouse.move(box.x + 160, midY - 20, { steps: 8 });
  await page.mouse.up();
}

const ctx = await browser.newContext();
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await open(page);

console.log("\n--- picker ---");
check("the fit test card is listed", await page.isVisible(".pick-card.fit"));
check("it names the source document",
  (await page.textContent(".pick-card.fit")).includes("SR-100.03.1"));

await page.click(".pick-card.fit");
await page.waitForSelector("#fit-name");

console.log("\n--- form renders SR-100.03.1 ---");
const body = await page.textContent("#f-body");
check("the medical clearance warning is shown",
  /DO NOT PROCEED until a Medical Clearance is issued/i.test(body));
check("the OSHA certification text is present",
  /29 CFR 1910\.134 Appendix A/.test(body));
check("the employee acknowledgment is present",
  /does not provide breathing air in an oxygen-deficient environment/.test(body));
check("the GMR training attestation is present",
  /GMR procedures for Respiratory Fit Testing/.test(body));
check("the Ninth Brain upload notice is present",
  /NINTH BRAIN CERTIFICATION PROFILE/i.test(body));
check("solution options match the form",
  /Bitrex \/ Saccharin/.test(body) && /Smoke/.test(body));
check("result options are Pass and Fail",
  (await page.locator('input[name="fit-result"]').count()) === 2);
check("all six sizes are offered",
  (await page.locator('input[name="fit-size"]').count()) === 6);
check("both signature pads exist",
  (await page.locator("#fit-empsig").count()) === 1 &&
  (await page.locator("#fit-adminsig").count()) === 1);
check("the source line cites revision and effective date",
  /Revision 02/.test(await page.textContent("#f-src")) &&
  /24 FEB 2026/.test(await page.textContent("#f-src")));

console.log("\n--- validation refuses an incomplete form ---");
await page.click("#f-submit");
check("an empty form is refused", /required/i.test(await page.textContent("#f-status")),
  await page.textContent("#f-status"));
check("no PDF was produced", await page.evaluate(() => window.__pdf.saved === null));

await page.fill("#fit-name", "Jane Medic / 44821");
await page.click("#f-submit");
check("a missing clearance date is refused",
  /clearance/i.test(await page.textContent("#f-status")), await page.textContent("#f-status"));

await page.fill("#fit-clear", "07/15/2026");
await page.click("#f-submit");
check("a missing job title is refused",
  /job title/i.test(await page.textContent("#f-status")), await page.textContent("#f-status"));

await chip(page, "fit-job", "Paramedic");
await page.fill("#fit-brand", "3M");
await chip(page, "fit-size", "M");
await chip(page, "fit-style", "N95");
await chip(page, "fit-sol", "Bitrex / Saccharin");
await chip(page, "fit-result", "Pass");
await page.fill("#fit-admin", "Hunter Jones, NRP");
await page.click("#f-submit");
check("an unconfirmed training attestation is refused",
  /training/i.test(await page.textContent("#f-status")), await page.textContent("#f-status"));

await page.check("#fit-trained");
await page.click("#f-submit");
check("a missing employee signature is refused",
  /employee must sign/i.test(await page.textContent("#f-status")), await page.textContent("#f-status"));

await sign(page, "fit-empsig");
await page.click("#f-submit");
check("a missing administrator signature is refused",
  /administrator must sign/i.test(await page.textContent("#f-status")), await page.textContent("#f-status"));

console.log("\n--- completed form produces the PDF ---");
await page.fill("#fit-op", "AMR Kansas City");
await page.fill("#fit-loc", "Station 3");
await page.fill("#fit-model", "1860");
await sign(page, "fit-adminsig");
await page.click("#f-submit");
await page.waitForTimeout(600);

const pdf = await page.evaluate(() => window.__pdf);
const text = pdf.text.join("\n");
check("the PDF was saved", !!pdf.saved, String(pdf.saved));
check("the filename identifies the form and employee",
  /^FIT_Jane_Medic_44821_\d{4}-\d{2}-\d{2}\.pdf$/.test(pdf.saved || ""), String(pdf.saved));
check("both signatures were drawn into it", pdf.images === 2, String(pdf.images));
check("employee name carried", /Jane Medic \/ 44821/.test(text));
check("job title carried", /Paramedic/.test(text));
check("clearance date carried", /07\/15\/2026/.test(text));
check("respirator details carried", /3M/.test(text) && /1860/.test(text) && /N95/.test(text));
check("result is recorded in caps", /PASS/.test(text));
check("administrator name carried", /Hunter Jones, NRP/.test(text));
check("the OSHA certification is in the PDF", /29 CFR 1910\.134 Appendix A/.test(text));
check("the Ninth Brain instruction is in the PDF", /NINTH BRAIN/i.test(text));
check("the guide's working never reaches the record",
  !/Rainbow|sensitivity|sprays|seal check|Before you start/i.test(text), text.slice(0, 200));
check("the status confirms the download",
  /downloaded/i.test(await page.textContent("#f-status")), await page.textContent("#f-status"));

console.log("\n--- the 'Other' path reaches the PDF ---");
// Reuse the same page rather than a second tab: synthetic mouse events only
// reach the foreground tab, so signature pads on a background page silently
// record nothing.
await page.click("#f-back");
await page.click(".pick-card.fit");
await page.waitForSelector("#fit-name");
await page.evaluate(() => { window.__pdf = { text: [], images: 0, saved: null }; });

console.log("\n--- 'Other' reveals its text box ---");
check("the job-title other box is hidden initially",
  !(await page.isVisible("#fit-job-other")));
await chip(page, "fit-job", "Other");
check("choosing Other reveals it", await page.isVisible("#fit-job-other"));
await page.fill("#fit-job-other", "Field Training Officer");
await chip(page, "fit-job", "EMT");
check("choosing a named title hides it again",
  !(await page.isVisible("#fit-job-other")));
check("and clears what was typed",
  (await page.inputValue("#fit-job-other")) === "");
check("the style other box is hidden initially",
  !(await page.isVisible("#fit-style-other")));


await page.fill("#fit-name", "Sam Medic / 90210");
await page.fill("#fit-clear", "06/01/2026");
await chip(page, "fit-job", "Other");
await page.fill("#fit-job-other", "Field Training Officer");
await page.fill("#fit-brand", "Moldex");
await chip(page, "fit-size", "One size fits all");
await chip(page, "fit-style", "Other");
await page.fill("#fit-style-other", "Elastomeric half-mask");
await chip(page, "fit-sol", "Smoke");
await chip(page, "fit-result", "Fail");
await page.fill("#fit-admin", "Hunter Jones, NRP");
await page.check("#fit-trained");
await sign(page, "fit-empsig");
await sign(page, "fit-adminsig");
await page.click("#f-submit");
await page.waitForTimeout(600);

const t2 = (await page.evaluate(() => window.__pdf.text)).join("\n");
check("the Other-path form generated a PDF",
  await page.evaluate(() => window.__pdf.saved !== null),
  await page.textContent("#f-status"));
check("a custom job title reaches the PDF", /Other — Field Training Officer/.test(t2));
check("a custom respirator style reaches the PDF", /Other — Elastomeric half-mask/.test(t2));
check("'One size fits all' is recorded", /One size fits all/.test(t2));
check("a FAIL result is recorded", /FAIL/.test(t2));

console.log("\n--- other forms still work ---");
await page.click("#f-back");
await page.click(".pick-card.ppd");
await page.waitForSelector("#ppd-name");
check("the PPD form still opens", await page.isVisible("#ppd-name"));

/* ---------------------------------------------------------------------------
 * The 3M qualitative fit test guide (Bitrex / saccharin). It walks the
 * administrator through the 3M quick guide inside the Qualitative Fit Test
 * card and runs the seven exercises on a clock. The page clock is Playwright's,
 * so seven minutes of exercises run in a moment and every cue lands on an
 * exact second.
 * ------------------------------------------------------------------------- */
console.log("\n--- 3M fit test guide ---");
const gctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const g = await gctx.newPage();
const gerrors = [];
g.on("pageerror", (e) => gerrors.push(String(e)));
await g.clock.install({ time: new Date("2026-09-30T09:00:00") });
await open(g);
await g.click(".pick-card.fit");
await g.waitForSelector("#fit-name");
const gtext = () => g.textContent("#fit-guide");
const spray = () => g.textContent("#fg-spray");
const result = () => g.evaluate(() => (document.querySelector('input[name="fit-result"]:checked') || {}).value || "");

check("no guide before a solution is chosen", (await g.innerHTML("#fit-guide")) === "");
await chip(g, "fit-sol", "Smoke");
check("smoke gets a pointer to its own kit, not the 3M steps",
  /smoke kit/i.test(await gtext()) && (await g.locator(".fg-step").count()) === 0);
await chip(g, "fit-sol", "Bitrex / Saccharin");
check("Bitrex / saccharin opens the step-by-step guide", (await g.locator(".fg-step").count()) >= 5);
const gt = await gtext();
check("the before-you-start checks are the 3M sheet's",
  /Clean-shaven where the respirator seals/.test(gt) && /drinks other than water for 15 minutes/.test(gt));
check("step 1 is the sensitivity test with no mask",
  /Sensitivity test/.test(gt) && /no mask/.test(gt) && /groups of 10 squeezes/.test(gt));
check("step 3 warns to switch to the FIT TEST solution", /FIT TEST<\/b> solution|FIT TEST solution/.test(await g.innerHTML("#fit-guide")));
check("all seven exercises are listed, in order",
  JSON.stringify(await g.locator(".fg-list li").allTextContents()) === JSON.stringify(
    ["Normal breathing","Deep breathing","Turn head side to side","Move head up and down",
     "Read the Rainbow Passage aloud","Bend at the waist","Normal breathing"]));
check("the Rainbow Passage is available before the test", /pot of gold at the end of the rainbow/.test(gt));
check("the clock cannot start before any setup", await g.isDisabled("#fg-start"));

console.log("\n--- dose follows the sensitivity result ---");
for (const [lvl, init, half] of [[10, "10", "5"], [20, "20", "10"], [30, "30", "15"]]) {
  await g.click(`#fg-l${lvl}`);
  check(`sensitivity ${lvl}: ${init} to start, ${half} every 30 s`,
    (await g.textContent("#fg-dose-init")) === init && (await g.textContent("#fg-dose-half")) === half);
}
await g.click("#fg-lnone");
check("not tasted after 30 stops the test", /Cannot be fit tested with this solution/.test(await gtext()));
check("and says where that rule comes from", /OSHA 29 CFR 1910\.134 Appendix A/.test(await gtext()));
check("the seal check is locked out", await g.isDisabled("#fg-sealed"));

await g.click("#fg-l20");
check("choosing a level clears the stop", !/Cannot be fit tested/.test(await gtext()));
check("still needs the pre-checks and seal check", await g.isDisabled("#fg-start") &&
  /the two checks before you start/.test(await g.textContent("#fg-why")));
await g.check("#fg-shaven"); await g.check("#fg-water");
check("then only the seal check", await g.isDisabled("#fg-start") &&
  /user seal check/.test(await g.textContent("#fg-why")));
await g.check("#fg-sealed");
check("with all of it done the clock can start", !(await g.isDisabled("#fg-start")));
check("the start button names the dose", /Gave 20 sprays/.test(await g.textContent("#fg-start")));

console.log("\n--- the clock ---");
await g.click("#fg-start");
check("setup collapses to one line once the clock runs",
  (await g.locator("#fg-setup").count()) === 1 && (await g.locator("#fg-shaven").count()) === 0);
check("exercise 1 is normal breathing", (await g.textContent("#fg-ex")) === "Normal breathing");
check("the first cue counts down from 30 s", /Next 10 sprays in 0:30/.test(await spray()));
await g.clock.runFor(29000);
check("at 29 s it is one second out", /in 0:01/.test(await spray()), await spray());
await g.clock.runFor(1500);
check("at 30 s it calls for 10 sprays", /Spray 10 now/.test(await spray()) &&
  await g.evaluate(() => document.getElementById("fg-spray").classList.contains("now")));
await g.clock.runFor(6000);
check("the call clears after a few seconds", /Next 10 sprays in/.test(await spray()), await spray());
await g.clock.runFor(24000);                          // 36.5 s → 60.5 s
check("at 1:00 it moves to deep breathing", (await g.textContent("#fg-ex")) === "Deep breathing");
check("and calls for sprays on the minute too", /Spray 10 now/.test(await spray()), await spray());
check("the finished exercise is ticked off",
  await g.evaluate(() => document.querySelector(".fg-list li").classList.contains("done")));

await g.clock.runFor(3 * 60000);                      // 60.5 s → 4:00.5, exercise 5
check("exercise 5 is the Rainbow Passage", /Rainbow Passage/.test(await g.textContent("#fg-ex")));
check("and the passage is on screen to read", await g.isVisible("#fg-rainbow"));
await g.clock.runFor(60000);
check("the passage goes away for exercise 6", (await g.locator("#fg-rainbow").count()) === 0);

await g.click("#fg-pause");
const pausedOn = await g.textContent("#fg-ex");
await g.clock.runFor(3 * 60000);
check("pausing stops the clock", (await g.textContent("#fg-ex")) === pausedOn && /paused/.test(await g.textContent("#fg-of")));
check("no pass while paused", (await result()) === "");
await g.click("#fg-resume");
await g.clock.runFor(99500);                          // 5:00.5 → 6:40, exercise 7, past the last cue
check("the last cue says no more sprays are due",
  /No more sprays/.test(await spray()) && (await g.textContent("#fg-ex")) === "Normal breathing", await spray());
await g.clock.runFor(21000);                          // 6:40 → 7:01
check("after seven minutes with nothing tasted: PASS", /PASS/.test(await g.textContent("#fg-out")));
check("and the form's Result is set to Pass", (await result()) === "Pass");

console.log("\n--- a failed test ---");
await g.click("#fg-again");
check("a retest needs a fresh seal check after the refit",
  !(await g.isChecked("#fg-sealed")) && await g.isDisabled("#fg-start"));
check("but keeps the sensitivity result", (await g.textContent("#fg-dose-init")) === "20");
await g.check("#fg-sealed");
await g.click("#fg-start");
await g.clock.runFor(2 * 60000 + 14000);
await g.click("#fg-taste");
const out = await g.textContent("#fg-out");
check("tasting ends the test as FAIL", /FAIL/.test(out));
check("it records the exercise and the time",
  /exercise 3 \(turn head side to side\)/.test(out) && /at 2:14/.test(out), out);
check("and says to refit and retest", /refit, then retest/.test(out));
check("the form's Result is set to Fail", (await result()) === "Fail");
await g.clock.runFor(10 * 60000);
check("nothing more happens after a fail", (await result()) === "Fail" && /FAIL/.test(await g.textContent("#fg-out")));

console.log("\n--- the Result is still the administrator's ---");
await chip(g, "fit-result", "Pass");
check("the Result can still be set by hand", (await result()) === "Pass");

console.log("\n--- leaving mid-test ---");
await g.click("#fg-again");
await g.check("#fg-sealed");
await g.click("#fg-start");
await g.clock.runFor(45000);
await g.click("#f-back");
await g.clock.runFor(10 * 60000);
check("closing the form mid-test throws nothing", gerrors.length === 0, gerrors.join("\n"));
await g.click(".pick-card.fit");
await g.waitForSelector("#fit-name");
check("reopening starts the guide fresh", (await g.innerHTML("#fit-guide")) === "");

console.log("\n--- keyboard ---");
await chip(g, "fit-sol", "Bitrex / Saccharin");
await g.focus("#fg-l20");
await g.keyboard.press("Enter");
check("a sensitivity result can be chosen from the keyboard",
  (await g.getAttribute("#fg-l20", "aria-pressed")) === "true");
check("focus stays on it after the guide redraws",
  await g.evaluate(() => document.activeElement && document.activeElement.id === "fg-l20"));
check("no page errors in the guide", gerrors.length === 0, gerrors.join("\n"));
await gctx.close();

check("no page errors throughout", errors.length === 0, errors.join("\n"));

await ctx.close();
await browser.close();
site.close();
console.log(`\n${PASS} passed, ${FAIL} failed\n`);
process.exit(FAIL ? 1 : 0);
