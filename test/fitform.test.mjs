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

check("no page errors throughout", errors.length === 0, errors.join("\n"));

await ctx.close();
await browser.close();
site.close();
console.log(`\n${PASS} passed, ${FAIL} failed\n`);
process.exit(FAIL ? 1 : 0);
