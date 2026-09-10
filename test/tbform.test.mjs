/*
 * TB Risk & Symptom Assessment (immunization-forms.html)
 * ------------------------------------------------------
 * Drives the real page in headless Chromium. The form reproduces GMR
 * SR100.21.1 Appendix A (Revision 02, 18 JUN 2025), so this suite defends the
 * three things that make it worth using instead of the paper sheet:
 *
 *   1. Every question on the sheet is on the screen, worded as the sheet
 *      words it. A screening form that quietly drops a risk factor is worse
 *      than no form.
 *   2. Section III is computed, not ticked. On paper an assessor decides
 *      whether any answer was "Yes"; that is the one error on this form that
 *      changes what happens to the employee, so the page derives it.
 *   3. The finished PDF goes to the OS share sheet — mail, Messages — rather
 *      than into a Downloads folder the crew member then has to go find.
 *
 * jsPDF is stubbed (it loads from a CDN this sandbox blocks) but every call it
 * receives is captured, so the PDF's *content* is still asserted. navigator's
 * share is stubbed too, and records what file it was handed. All data is
 * synthetic.
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
await new Promise((r) => site.listen(8098, "127.0.0.1", r));

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

// Capture what the page asks jsPDF to draw, whether it saved, and — when
// `sharing` is true — what file it handed to the share sheet.
const STUB = (sharing) => {
  window.__pdf = { text: [], images: 0, saved: null, blobs: 0 };
  window.__shared = null;
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
    output() { window.__pdf.blobs++; return new Blob(["%PDF-1.3"], { type: "application/pdf" }); }
  }
  window.jspdf = { jsPDF: FakeDoc };
  navigator.canShare = (d) => sharing && !!(d && d.files && d.files.length);
  navigator.share = (d) => {
    window.__shared = { name: d.files[0].name, type: d.files[0].type, title: d.title };
    return Promise.resolve();
  };
};

async function open(sharing = true) {
  const ctx = await browser.newContext({ viewport: { width: 414, height: 900 } });
  const page = await ctx.newPage();
  page._errs = [];
  page.on("pageerror", (e) => page._errs.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error" && !/net::ERR/.test(m.text())) page._errs.push("CONSOLE:" + m.text());
  });
  await page.addInitScript(STUB, sharing);
  await page.goto("http://127.0.0.1:8098/immunization-forms.html", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof openForm === "function");
  return page;
}
const chip = (page, name, value) =>
  page.click(`.chip:has(input[name="${name}"][value="${value}"]) span`);
const box = (page, group, value) =>
  page.click(`.chk:has(input[data-group="${group}"][value="${value}"]) span`);
const evalText = async (page) =>
  (await page.textContent("#ppd-eval")).replace(/\s+/g, " ").trim();

async function sign(page, id) {
  await page.locator("#" + id).scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const b = await page.locator("#" + id).boundingBox();
  const midY = b.y + b.height / 2;
  await page.mouse.move(b.x + 20, midY);
  await page.mouse.down();
  await page.mouse.move(b.x + 90, midY + 20, { steps: 8 });
  await page.mouse.move(b.x + 170, midY - 20, { steps: 8 });
  await page.mouse.up();
}
// Answer every Yes/No on the sheet, so only the thing under test is variable.
const YESNO = ["ppd-i1", "ppd-i2", "ppd-ii2", "ppd-ii3", "ppd-ii4", "ppd-ii5", "ppd-ii6", "ppd-ii7"];
async function answerAll(page, v = "No") { for (const g of YESNO) await chip(page, g, v); }

const SYMPTOMS = ["Cough >3 weeks", "Productive cough", "Coughing up blood (hemoptysis)",
  "Night sweats", "Unexplained weight loss / loss of appetite", "Chest pain",
  "Fatigue, lethargy, or weakness", "Low body weight (>10% below Ideal Body Weight)"];
const CONDITIONS = ["Chronic steroid use", "Crohn’s disease", "HIV infection",
  "Rheumatoid arthritis", "Organ transplant", "Kidney disease", "Diabetes mellitus",
  "Leukemia, lymphoma, Hodgkin’s", "N/A"];

/* T1 — the picker points at the sheet this form now is */
{ const p = await open();
  const card = (await p.textContent(".pick-card.ppd")).replace(/\s+/g, " ");
  check("T1 the card names the assessment", /TB Risk & Symptom Assessment/.test(card), card);
  check("T1 it cites the source document", /SR100\.21\.1/.test(card), card);
  await p.click(".pick-card.ppd");
  await p.waitForSelector("#ppd-name");
  const src = await p.textContent("#f-src");
  check("T1 the source line carries the revision", /Revision 02/.test(src), src);
  check("T1 and its effective date", /18 JUN 2025/.test(src), src);
  await p.context().close(); }

/* T2 — every question on the sheet is on the screen */
{ const p = await open();
  await p.click(".pick-card.ppd"); await p.waitForSelector("#ppd-name");
  const body = await p.textContent("#f-body");
  for (const id of ["ppd-date", "ppd-name", "ppd-empid", "ppd-email", "ppd-phone"])
    check(`T2 demographics: ${id}`, (await p.locator("#" + id).count()) === 1);
  check("T2 the purpose text is reproduced",
    /tool to assess and document TB symptoms and\/or risk factors/.test(body));
  for (const s of SYMPTOMS)
    check(`T2 symptom listed: ${s}`, (await p.locator(`input[data-group="ppd-sym"][value="${s}"]`).count()) === 1);
  for (const c of CONDITIONS)
    check(`T2 condition listed: ${c}`, (await p.locator(`input[data-group="ppd-cond"][value="${c}"]`).count()) === 1);
  for (const g of YESNO)
    check(`T2 Yes/No offered for ${g}`, (await p.locator(`input[name="${g}"]`).count()) === 2);
  check("T2 the correctional-facility question is asked",
    /correctional facility or homeless shelter/.test(body));
  check("T2 the Africa/Asia/Latin America question is asked",
    /Africa, Asia, or Latin America in the last 5 years/.test(body));
  check("T2 the BCG question is asked", /Have you ever received the BCG vaccine\?/.test(body));
  check("T2 Section IV keeps the OSHA interpretation letter",
    /September 23, 1997/.test(body) && /does not require that employees participate/.test(body));
  await p.context().close(); }

/* T3 — the "if yes" detail only appears once Yes is the answer */
{ const p = await open();
  await p.click(".pick-card.ppd"); await p.waitForSelector("#ppd-name");
  check("T3 history detail starts hidden", !(await p.isVisible("#rev-ppd-i1")));
  check("T3 symptom list starts hidden", !(await p.isVisible("#rev-ppd-i2")));
  check("T3 induration detail starts hidden", !(await p.isVisible("#rev-ppd-ii7")));
  await chip(p, "ppd-i1", "Yes"); await p.waitForTimeout(120);
  check("T3 history detail opens on Yes", await p.isVisible("#rev-ppd-i1"));
  await chip(p, "ppd-i1", "No"); await p.waitForTimeout(120);
  check("T3 and closes again on No", !(await p.isVisible("#rev-ppd-i1")));
  await chip(p, "ppd-ii7", "Yes"); await p.waitForTimeout(120);
  check("T3 induration detail opens on Yes", await p.isVisible("#rev-ppd-ii7"));
  await p.context().close(); }

/* T4 — Section III is derived from the answers, not left to be ticked */
{ const p = await open();
  await p.click(".pick-card.ppd"); await p.waitForSelector("#ppd-name");
  check("T4 it asks for the answers before evaluating",
    /Answer every question/.test(await evalText(p)), await evalText(p));

  await answerAll(p, "No"); await p.waitForTimeout(150);
  let t = await evalText(p);
  check("T4 all-No reads as a clear screen", /“No” selected in Sections I and II/.test(t), t);
  check("T4 and carries the sheet's new-employee rule", /within the past 365 days/.test(t), t);
  check("T4 and its existing-employee rule", /no annual TB Test is required/.test(t), t);
  check("T4 a clear screen is not styled as a warning",
    /notice-ok/.test(await p.getAttribute("#ppd-eval", "class")));

  await chip(p, "ppd-ii6", "Yes"); await p.waitForTimeout(150);
  t = await evalText(p);
  check("T4 one Yes requires an evaluation", /Tb evaluation required/.test(t), t);
  check("T4 and says which question flagged it", /Section II Q6/.test(t), t);
  check("T4 and is styled as a warning",
    /notice-strong/.test(await p.getAttribute("#ppd-eval", "class")));
  await chip(p, "ppd-ii6", "No"); await p.waitForTimeout(150);

  // N/A is the sheet's way of saying "none of these", so it is not a risk —
  // but any real condition is, even with every Yes/No answered No.
  await box(p, "ppd-cond", "N/A"); await p.waitForTimeout(150);
  check("T4 N/A alone stays a clear screen",
    /“No” selected/.test(await evalText(p)), await evalText(p));
  await box(p, "ppd-cond", "HIV infection"); await p.waitForTimeout(150);
  t = await evalText(p);
  check("T4 an immune condition requires an evaluation", /Tb evaluation required/.test(t), t);
  check("T4 and flags it as Section II Q1", /Section II Q1/.test(t), t);
  check("T4 checking a condition clears N/A",
    !(await p.isChecked('input[data-group="ppd-cond"][value="N/A"]')));
  await box(p, "ppd-cond", "N/A"); await p.waitForTimeout(150);
  check("T4 and checking N/A clears the conditions",
    !(await p.isChecked('input[data-group="ppd-cond"][value="HIV infection"]')));
  check("T4 which returns it to a clear screen",
    /“No” selected/.test(await evalText(p)), await evalText(p));
  check("T4 no errors", p._errs.length === 0, p._errs.join("|"));
  await p.context().close(); }

/* T5 — an incomplete assessment is refused, one reason at a time */
{ const p = await open();
  await p.click(".pick-card.ppd"); await p.waitForSelector("#ppd-name");
  const status = () => p.textContent("#f-status");

  await p.click("#f-share"); await p.waitForTimeout(120);
  check("T5 a blank form is refused", /name is required/i.test(await status()), await status());
  check("T5 and nothing was produced",
    await p.evaluate(() => window.__pdf.saved === null && window.__shared === null));

  await p.fill("#ppd-name", "Jane Medic");
  await p.click("#f-share"); await p.waitForTimeout(120);
  check("T5 an unanswered question is refused",
    /Section I question 1/.test(await status()), await status());

  await answerAll(p, "No");
  await p.click("#f-share"); await p.waitForTimeout(120);
  check("T5 no Section IV choice is refused",
    /Accept or Decline/i.test(await status()), await status());

  await p.click('.opt-row:has(input[value="decline"])'); await p.waitForTimeout(120);
  check("T5 the declination statement appears", await p.isVisible("#ppd-decline-card"));
  check("T5 and the acceptance statement does not", !(await p.isVisible("#ppd-accept-card")));
  await p.click("#f-share"); await p.waitForTimeout(120);
  check("T5 an unsigned attestation is refused",
    /sign the employee attestation/i.test(await status()), await status());
  check("T5 still nothing produced",
    await p.evaluate(() => window.__pdf.saved === null && window.__shared === null));
  await p.context().close(); }

/* T6 — a completed assessment reaches the PDF, and the PDF reaches the share
   sheet rather than a Downloads folder */
{ const p = await open(true);
  await p.click(".pick-card.ppd"); await p.waitForSelector("#ppd-name");
  check("T6 the send button leads on a device that can share", await p.isVisible("#f-share"));
  check("T6 and the download is the second option",
    /secondary/.test(await p.getAttribute("#f-submit", "class")));

  await p.fill("#ppd-name", "Jane Medic");
  await p.fill("#ppd-empid", "44821");
  await p.fill("#ppd-email", "jane@example.org");
  await p.fill("#ppd-phone", "816-555-0134");
  await answerAll(p, "No");
  await chip(p, "ppd-i2", "Yes"); await p.waitForTimeout(120);
  await box(p, "ppd-sym", "Night sweats");
  await chip(p, "ppd-ii7", "Yes"); await p.waitForTimeout(120);
  await p.fill("#ppd-ii7-when", "03/2019");
  await p.fill("#ppd-ii7-mm", "12");
  await box(p, "ppd-cond", "Diabetes mellitus");
  await p.click('.opt-row:has(input[value="decline"])');
  await sign(p, "ppd-sig");
  await p.click("#f-share"); await p.waitForTimeout(600);

  const r = await p.evaluate(() => ({ shared: window.__shared, pdf: window.__pdf,
                                      status: document.getElementById("f-status").textContent }));
  const text = r.pdf.text.join("\n");
  check("T6 the PDF went to the share sheet", !!r.shared, JSON.stringify(r.shared));
  check("T6 it is named for the form and the employee",
    /^TB_RISK_Jane_Medic_\d{4}-\d{2}-\d{2}\.pdf$/.test(r.shared ? r.shared.name : ""),
    r.shared && r.shared.name);
  check("T6 and handed over as a PDF",
    r.shared && r.shared.type === "application/pdf", r.shared && r.shared.type);
  check("T6 it did not silently download instead", r.pdf.saved === null, String(r.pdf.saved));
  check("T6 the signature was drawn into it", r.pdf.images === 1, String(r.pdf.images));
  check("T6 the status confirms it was sent", /sent/i.test(r.status), r.status);

  for (const [label, re] of [
    ["the employee's name", /Jane Medic/],
    ["the employee ID", /44821/],
    ["the email", /jane@example\.org/],
    ["the phone", /816-555-0134/],
    ["Section I as a heading", /Section I — Screen for TB Symptoms/],
    ["Section II as a heading", /Section II — Assess Risk for Acquiring or Developing Tb/],
    ["Section III as a heading", /Section III — Screening and Risk Assessment Evaluation/],
    ["the reported symptom", /Night sweats/],
    ["the immune condition", /Diabetes mellitus/],
    ["the induration size", /12 mm/],
    ["the date of the positive test", /03\/2019/],
    ["the derived evaluation", /Tb evaluation required/],
    ["which answers flagged it", /Flagged by:/],
    ["the declination", /DECLINATION/],
    ["the OSHA interpretation letter", /September 23, 1997/],
    ["the attestation", /ATTESTATION/],
    ["the source document", /SR100\.21\.1/],
  ]) check(`T6 the PDF carries ${label}`, re.test(text), text.slice(0, 200));
  check("T6 no errors", p._errs.length === 0, p._errs.join("|"));
  await p.context().close(); }

/* T6b — Section II Q1 is check-all-that-apply, and prints as one.
   The sheet carries no Yes/No boxes on it, so nothing may be derived for the
   answer column. A derived "Yes" counted N/A as a condition and printed "Yes"
   beside "diagnosed with a chronic condition" for an employee who had said
   none of them applied — a false positive on a medical screening record. */
{ const p = await open(true);
  await p.click(".pick-card.ppd"); await p.waitForSelector("#ppd-name");
  await p.fill("#ppd-name", "Jordan Jones");
  await p.fill("#ppd-empid", "19959195");
  await answerAll(p, "No");
  await box(p, "ppd-cond", "N/A");
  await p.click('.opt-row:has(input[value="decline"])');
  await sign(p, "ppd-sig");
  await p.click("#f-share"); await p.waitForTimeout(600);

  const lines = await p.evaluate(() => window.__pdf.text);
  const q1 = lines.findIndex((l) => /diagnosed with a chronic condition/.test(l));
  check("T6b Section II Q1 reaches the PDF", q1 !== -1, lines.join("|").slice(0, 200));
  // The renderer draws the answer as its own text call right after the
  // question, so a Yes or No for this question would sit in the next line.
  const after = lines.slice(q1 + 1, q1 + 3).join(" ");
  check("T6b it carries no derived Yes", !/\bYes\b/.test(after), after);
  check("T6b and no derived No either", !/\bNo\b/.test(after), after);
  check("T6b what it does carry is the selection", /CONDITIONS CHECKED/.test(after), after);
  check("T6b which is N/A", /N\/A/.test(lines.slice(q1 + 1, q1 + 4).join(" ")),
    lines.slice(q1 + 1, q1 + 4).join(" "));
  // The evaluation already filtered N/A, and must keep doing so.
  const text = lines.join("\n");
  check("T6b N/A alone still reads as a clear screen",
    /“No” selected in Sections I and II/.test(text) && !/Tb evaluation required/.test(text),
    text.slice(0, 200));
  check("T6b the Yes/No questions still print their answers",
    /Have you ever received the BCG vaccine\?/.test(text) && lines.includes("No"),
    text.slice(0, 200));
  check("T6b no errors", p._errs.length === 0, p._errs.join("|"));
  await p.context().close(); }

/* T6c — a real condition still prints, and nothing checked says so plainly */
{ const p = await open(true);
  await p.click(".pick-card.ppd"); await p.waitForSelector("#ppd-name");
  await p.fill("#ppd-name", "Dana Wu");
  await answerAll(p, "No");
  await box(p, "ppd-cond", "HIV infection");
  await box(p, "ppd-cond", "Organ transplant");
  await p.click('.opt-row:has(input[value="decline"])');
  await sign(p, "ppd-sig");
  await p.click("#f-share"); await p.waitForTimeout(600);
  let text = (await p.evaluate(() => window.__pdf.text)).join("\n");
  check("T6c both checked conditions are listed",
    /HIV infection/.test(text) && /Organ transplant/.test(text), text.slice(0, 200));
  check("T6c and they still require an evaluation", /Tb evaluation required/.test(text));
  await p.context().close();

  const q = await open(true);
  await q.click(".pick-card.ppd"); await q.waitForSelector("#ppd-name");
  await q.fill("#ppd-name", "Lee Park");
  await answerAll(q, "No");
  await q.click('.opt-row:has(input[value="decline"])');
  await sign(q, "ppd-sig");
  await q.click("#f-share"); await q.waitForTimeout(600);
  text = (await q.evaluate(() => window.__pdf.text)).join("\n");
  check("T6c nothing checked reads as None checked", /None checked/.test(text), text.slice(0, 200));
  check("T6c and is not asserted as none reported", !/None reported/.test(text.split("Conditions")[1] || ""));
  check("T6c no errors", q._errs.length === 0, q._errs.join("|"));
  await q.context().close(); }

/* T7 — the acceptance path, and the clinic record that only it collects */
{ const p = await open(true);
  await p.click(".pick-card.ppd"); await p.waitForSelector("#ppd-name");
  await p.fill("#ppd-name", "Chris Rivera");
  await answerAll(p, "No");
  await p.click('.opt-row:has(input[value="accept"])'); await p.waitForTimeout(150);
  check("T7 the acceptance statement appears", await p.isVisible("#ppd-accept-card"));
  check("T7 and the declination does not", !(await p.isVisible("#ppd-decline-card")));
  await p.fill("#ppd-mfr", "Sanofi");
  await p.fill("#ppd-lot", "U4821AA");
  await p.fill("#ppd-planted", "09/02/2026");
  await p.fill("#ppd-site", "L forearm");
  await p.fill("#ppd-examdate", "09/04/2026");
  await p.fill("#ppd-results", "0 mm — negative");
  await sign(p, "ppd-sig");
  await p.click("#f-share"); await p.waitForTimeout(600);
  const text = (await p.evaluate(() => window.__pdf.text)).join("\n");
  check("T7 the acceptance reaches the PDF", /ACCEPTANCE/.test(text));
  check("T7 a clear screen reaches the PDF", /“No” selected in Sections I and II/.test(text), text.slice(0, 160));
  check("T7 the clinic record is carried", /Sanofi/.test(text) && /U4821AA/.test(text));
  check("T7 including the read", /0 mm — negative/.test(text));
  check("T7 no errors", p._errs.length === 0, p._errs.join("|"));
  await p.context().close(); }

/* T8 — on a desktop, where a file cannot be shared, the download leads and
   still produces the same PDF */
{ const p = await open(false);
  await p.click(".pick-card.ppd"); await p.waitForSelector("#ppd-name");
  check("T8 the send button is not offered", !(await p.isVisible("#f-share")));
  check("T8 the download is the primary action",
    !/secondary/.test(await p.getAttribute("#f-submit", "class")),
    await p.getAttribute("#f-submit", "class"));
  await p.fill("#ppd-name", "Sam Ortiz");
  await answerAll(p, "No");
  await p.click('.opt-row:has(input[value="decline"])');
  await sign(p, "ppd-sig");
  await p.click("#f-submit"); await p.waitForTimeout(400);
  const r = await p.evaluate(() => ({ saved: window.__pdf.saved,
                                      status: document.getElementById("f-status").textContent }));
  check("T8 the PDF downloads", /^TB_RISK_Sam_Ortiz_/.test(r.saved || ""), String(r.saved));
  check("T8 and the status says so", /downloaded/i.test(r.status), r.status);
  check("T8 no errors", p._errs.length === 0, p._errs.join("|"));
  await p.context().close(); }

/* T9 — nothing leaves the device except through the share sheet the crew
   member chose. This form carries a medical history; it may not be posted. */
{ const src = fs.readFileSync(path.join(ROOT, "immunization-forms.html"), "utf8");
  check("T9 the page posts nothing anywhere", !/fetch\s*\(|XMLHttpRequest|navigator\.sendBeacon/.test(src));
  check("T9 and stores no answers on the device", !/localStorage|sessionStorage|indexedDB/.test(src));
  check("T9 the privacy line still says so", /Nothing is uploaded to us at any point/.test(src)); }

/* T10 — the other forms are untouched */
{ const p = await open();
  for (const [label, sel, first] of [
    ["influenza", ".pick-card.flu", "#flu-name"],
    ["hepatitis B", ".pick-card.hbv", "#hbv-name"],
    ["fit test", ".pick-card.fit", "#fit-name"],
  ]) {
    await p.click(sel);
    await p.waitForSelector(first, { timeout: 3000 });
    check(`T10 the ${label} form still opens`, await p.isVisible(first));
    await p.click("#f-back");
  }
  check("T10 no errors", p._errs.length === 0, p._errs.join("|"));
  await p.context().close(); }

await browser.close();
site.close();
console.log(`\n${PASS} passed, ${FAIL} failed\n`);
process.exit(FAIL ? 1 : 0);
