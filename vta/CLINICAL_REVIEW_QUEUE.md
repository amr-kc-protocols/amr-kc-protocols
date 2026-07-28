# Clinical Review Queue — Ventilator Training Academy

Status tracker for the expert content review. **Nothing in this file has been
changed in the course content.** These items need medical-director / protocol
sign-off before certification use. Author: Jordan Hunter Jones, NRP.

Legend: ☑ = already corrected in `app.js` (factual, non-guideline) · ☐ = staged, awaiting your/MD decision.

---

## A. Factual corrections already applied (for your awareness)

- ☑ **LTV internal battery** — changed from "lithium-ion, ~60 min" to "sealed lead-acid, ~45 min at nominal settings," with a note to verify against your unit's operator manual. *(Confirm the chemistry/runtime for your specific LTV model + battery age.)*
- ☑ **Power loss is not silent** — corrected to state the LTV annunciates a **POWER LOST** alarm on transfer to internal battery (two places, plus the pitfalls list).
- ☑ **"The Six Alarms" → "The Core Alarms"** — now lists six cleanly (HIGH PRESSURE, LOW PRESSURE/LOW PEEP, LOW MINUTE VOLUME, APNEA, POWER LOST/LOW BATTERY, GAS SUPPLY) and states the manual lists additional device/self-test alarms. *(Full manufacturer alarm vocabulary still to be built — see §C.)*
- ☑ **Battery quiz item** — answer changed 60 → 45 min.
- ☑ **PBW shortcut is sex-specific** — pearl now gives 5'10" man ≈ 73 kg / woman ≈ 68.5 kg.
- ☑ **Heffner 2012** — relabeled as an **emergency-department** cohort (not EMS/prehospital); quiz stem and rationale updated.
- ☑ **Push-dose epi framing** — no longer called "first-line for most EMS shock states"; reframed as a rapid **bridge** to a continuous infusion (resolves the internal contradiction with the norepinephrine-first-line statement).
- ☑ **EtCO₂/SpO₂ vs ABG** — pearl no longer says they give "the same diagnosis as the lab"; now states they support recognition but do not replace an ABG (PaCO₂–EtCO₂ gap widens with shock/V-Q mismatch).

---

## B. Guideline-dependent targets — STAGED, need MD sign-off

Each lists the current course text, the reviewer's concern, the cited source, and a proposed direction. **Please confirm the number/wording against the live guideline and your service protocols.**

1. ☐ **COPD acute exacerbation — oxygen target.** Course implies "≥ 88%." Reviewer: express as a **target range 88–92%** during acute exacerbation. Source cited: GOLD. → *Proposed:* change to "titrate to SpO₂ 88–92%." **MD confirm.**

2. ☐ **ARDS driving pressure (ΔP < 14).** Presented as a firm "modern ARDS target." Reviewer: it's an important **risk marker**, not a stand-alone setting mandate; guidelines emphasize **4–8 mL/kg PBW and Pplat < 30**. Source cited: ATS/ARDS guideline. → *Proposed:* keep ΔP as a risk marker, lead with tidal volume 4–8 mL/kg PBW + Pplat < 30 as the mandate; soften "target." **MD confirm.**

3. ☐ **TBI targets.** Course uses older numbers. Reviewer: 2023 prehospital BTF guideline recommends **EtCO₂ 35–45 mmHg** and **adult SBP ≥ 110 mmHg**. Source cited: BTF prehospital guideline (2023). → *Proposed:* update normocapnia target to 35–45 and SBP threshold to ≥ 110. **MD confirm against the current BTF edition your service follows.**

4. ☐ **General oxygen targeting language.** Reviewer flagged O₂ targets broadly. Cross-check all SpO₂ targets (post-ROSC 90–98% is already current per 2025 AHA) against your protocols for consistency. **MD confirm.**

> Note: I'm intentionally not editing these numbers — they depend on which guideline edition and which service protocols you certify against, and that's a medical-director decision, not mine.

---

## C. Structural work — scoped, needs your direction

- ☐ **Schedule realism.** The single-day plan can't hold 9 modules + 90 quiz items + 9 matches + 9 cases + 9 sims + the exam. Recommend **two-day** or a **blended** model (self-paced modules + one live skills/sim day). *(Slide "Day 2" labels have been neutralized to Foundations/Application in the meantime.)*
- ☐ **Missing transport module.** The intro promises transport of vented patients, but there's no dedicated module for: O₂-cylinder duration math, internal/external battery planning, backup BVM & failure contingencies, tube/circuit securement, crew roles & transition checks, infusion continuity, ventilator-to-ventilator handoff, and required monitoring/documentation/reassessment. This is net-new authoring + protocol review.
- ☐ **Device lesson rebuild.** Rebuild the LTV startup/checkout around the **operator manual** (in our own words) rather than an improvised POST checklist, with the full alarm vocabulary.

---

## D. Visuals — production complete

- ☑ **Full 27-graphic course kit inserted in the live Academy.** Every graphic is mapped to its intended lesson in Modules 1–9, carries descriptive alternative text, scales responsively, and is cached for offline use.
- ☑ **Device visuals added:** the owned LTV simulator-panel image plus course-native circuit-connection, battery-indicator, alarm-response, monitored-data, and transport-readiness graphics.
- ☑ Simulator cue links are now real PowerPoint hyperlinks (were plain text). *(Relative paths — set your hosted base URL when deployed.)*

---

**Bottom line:** §A and §D are done, §B awaits your medical director, and §C needs a scope decision. Certification use should wait until §B and §C are signed off by a medical director and checked against service protocols.

---

# Round 2 — Full learner review (verdict 6/10: supervised supplement, not a credential)

## E. Safety/logic errors corrected now (clear errors, MD to confirm wording)

- ☑ **M7 — chest seal after needle decompression removed.** A chest seal treats an OPEN chest wound; it does not stop an internal pulmonary air leak and can foul the decompression site. Lesson, scenario Q4, and conclusion now teach: secure/monitor the catheter per protocol, reassess for re-tensioning (re-decompress if it recurs), definitive thoracostomy at the receiving facility. The chest-seal misconception is now an explicit wrong-answer distractor. *(Source cited: Joint Trauma System thoracic-injury guidance.)*
- ☑ **M8 — paralysis/RASS impossibility fixed.** RASS behaviors ("restless, fighting tube") are impossible during effective neuromuscular blockade. The scenario now presents **autonomic** awareness signs (rising HR/BP, lacrimation, diaphoresis) with the patient paralyzed and still, and lesson 8.2 gains a caveat that RASS cannot be scored under paralysis.
- ☑ **M1 — "PEEP replaces surfactant" softened** to "PEEP is not a substitute for surfactant; it mechanically splints alveoli open until surfactant function returns."
- ☑ **M4 — driving-pressure contradiction fixed.** The scenario no longer calls ΔP 21 "under control"/"safe lung-protective"; it now reads "improved from 29 to 21 but still elevated — flag for further optimization."

## F. Medical-director review (safe framing updated; numeric/protocol content still awaiting sign-off)

- ☑ **M3 NIV framing corrected** — removed the rigid one-hour rule and GCS/gag absolutes. The course now teaches continuous reassessment, prompt escalation for failure, and whole-patient airway-protection assessment. CPAP and bilevel NIV are both acknowledged for cardiogenic pulmonary edema. *(ERS/ATS NIV guideline.)* ☐ **MD still to approve local selection criteria and settings.**
- ☑ **M4 terminology corrected** — **predicted body weight (PBW)** now replaces generic "ideal body weight" throughout the live app, facilitator guide, and learner-facing labels. ☐ **MD still to approve disease-specific numeric targets and final driving-pressure language.**
- ☑ **M5 high-PIP and asthma framing corrected** — removed the instruction to switch to pressure control solely because PIP exceeds a number; learners now assess patient, tube, circuit, secretions, resistance, plateau pressure, and auto-PEEP. The mode-matching exercise no longer presents bilevel NIV as established first-line therapy for acute asthma. ☐ **MD still to approve mode-transition and NIV protocol language.**
- ☑ **M8 universal RASS target removed** — transport goals are now individualized to pain, synchrony, hemodynamics, neurologic needs, paralytic status, and the sending plan; RASS is explicitly unusable during effective blockade. ☐ **All drug and push-dose pressor content still requires medical-director approval.** *(SCCM PADIS.)*
- ☐ **M9 TBI** — reviewer's targets: EtCO₂ 35–40 (30–35 with active herniation), SpO₂ > 90%, adult SBP ≥ 110 — replace the module's universal SBP > 100 and SpO₂ ≥ 94. *(Brain Trauma Foundation.)* **Reconcile with the round-1 TBI item and the edition your service certifies against.**
- ☐ **M1** — distinguish **minute vs alveolar** ventilation; qualify PIP/plateau interpretation.
- ☑ **M7 alarm language qualified** — removed the non-negotiable ten-second rule and claims that bagging reliably separates patient from equipment. Backup ventilation is now taught as controlled manual ventilation with appropriate rate, volume, oxygen, and PEEP while troubleshooting.
- ☐ **M2** — EtCO₂/SpO₂ don't establish PaCO₂/pH/mixed acid-base (softened in round 1 §A; MD to confirm).

## G. Platform / assessment (software — I own)

- ☑ **Scenario completion credit for a wrong path — FIXED.** Advancement is now gated: a wrong or partial decision offers only **Try Again** (no advance button), so finishing a case means every step was ultimately answered correctly. A new `firstOutcomes` record keeps the **first** attempt at each step permanently, so retrying no longer erases a miss — the result screen reports **"First-attempt accuracy: N/total."** (Previously, retry popped the record and accuracy always read perfect.)
- ☑ **Matching keyboard/screen-reader access — FIXED.** Each category now has a real focusable **"Place ⟨item⟩ here"** button with a descriptive `aria-label`; pool items expose `aria-pressed`; placed items announce their bin and (after submit) correctness; a `role="status"` live region announces selection and progress. Bins stay non-role containers so the buttons inside remain valid. On-screen instructions now state the keyboard path. Verified end-to-end by keyboard only.
- ☑ **Locked module cards — FIXED.** Now `aria-disabled="true"` with a descriptive label ("Locked — finish Module N (Title) first").
- ☑ **Credential wording + disclaimer — FIXED.** "Final Certification Exam" → **Final Course Exam**; "Certified" → **Course Complete**. A prominent **scope-of-use notice** now sits on the Course Hub above the modules, and the certificate carries a printed disclaimer: certificate of **completion** only, not a certification/licence/competency verification, confers no scope of practice, progress is browser-local and not proctored or auditable, and local protocol + medical direction + manufacturer instructions take precedence.
- ☑ **Exam integrity improved within the static-app limit.** Each attempt draws 25 randomized questions from the curated capstone plus all nine module banks; answers and rationales are withheld until submission, then shown in an attempt review. The selected set and progress persist across reload. Attempt limits remain intentionally unenforced because browser-local limits are trivial to bypass and could imply security the static app does not have.
- ☑ **Versioned bibliography added.** The Course Hub now links primary/official sources with module tags, document versions or publication dates, and a reminder that local protocol and current manufacturer instructions control. Fine-grained claim-level footnotes remain a future editorial enhancement.
- ☐ **Auditable credentialing** (server-side exam, verified identity, tamper-proof record) — genuinely requires a backend; out of scope for the static app.

## H. Bigger builds (need your input)

- ☑ **M6 LTV rebuild — DONE (pending your config confirmation).** Rebuilt against the reviewer's cited corrections *and* cross-checked against this repo's own LTV simulator, which already modelled the device correctly — the module text was the outlier. Changes:
  - **6.1 Hardware** — removed the "settings left / monitored right" display claim; now describes the bank of **individual control windows** (Breath Rate, Tidal Volume, Pressure Control, Inspiratory Time, Pressure Support, O₂ %, Sensitivity, PEEP + alarm limits), the two **Select** buttons, and the **Set Value** knob. **USB → Comm Port** ("it is NOT a USB port"), with a note that connections vary by configuration.
  - **6.3 Display** — rebuilt. Teaches the **single scanning monitored window** (PIP, MAP, PEEP, f, Vte, VE, I:E) and **Monitor Select** (halt / step / resume); states **I:E is calculated from Inspiratory Time + rate, not set directly**; states there is **no continuously monitored plateau pressure** (hold maneuver only, per your manual/config).
  - **6.5** — "POST / Power-On Self-Test" reframed as **Startup and Pre-Use Checkout**, explicitly deferring to the operator manual + agency equipment check ("replaces neither document"). Removed the "verify Pplat on inspiratory hold" step; added the patient-setup prompt and per-patient alarm limits.
  - **6.6 Workflow** — corrected to the real select → Set Value knob → confirm grammar (matches the simulator).
  - **Quiz** — the old "settings LEFT / monitored RIGHT" answer is now a **wrong-answer distractor** with a rationale that refutes it; the Pplat question replaced with a set-vs-calculated (I:E) question.
  - **Match** — "Inspiratory Hold (measures Pplat)" replaced with "100% O₂"; controls relabelled to the real ones.
  - **Scenario** — removed "verify Pplat displays"; removed the last "switches silently to internal battery" claim (now POWER LOST). A stale conclusion in the app and facilitator guide was also removed in the final QA pass.
  - ☐ **Still needs from you:** confirmation against your **AMR unit configuration and operator manual** — O₂ inlet type, whether your units support the inspiratory-hold maneuver, exact alarm vocabulary, and the **45/10/5-minute** battery indicator behaviour. Anything config-specific is deliberately hedged ("confirm on YOUR unit") rather than asserted.
- ☑ **Visuals — FIRST BATCH DONE.** Eight teaching diagrams authored as inline SVG in `vta/figures.js` (no third-party image licences, no extra network requests, works offline) and shown in both the app and the decks:
  **capnography patterns** (normal / shark-fin / rebreathing / lost), **oxyhaemoglobin dissociation curve** (tabletop, the 90%≈60 cliff, 92–96% target band), **PIP vs Pplat** pressure–time with the resistance and driving-pressure brackets, **auto-PEEP** flow–time, **two-knob model**, **shunt vs dead space**, **DOPE + the 10-second rule**, and **volume vs pressure targeting**.
  Plus a **device visual for Module 6** captured from this project's own LTV simulator (`vta/figures/ltv-panel.jpg`) — an owned asset, so no manufacturer-image licensing problem.
  In the decks each figure takes the right column with aspect ratio preserved (verified 0.0% distortion, all within slide bounds).
  ☑ **PEEP/FiO₂ pairing figure added** (M9.3) — renders the anchor points already taught in the course (0.3→5, 0.5→8–10, 0.7→10–14, 0.9→14–18, 1.0→18–24) with the message that both rise together; captioned "anchor points only — carry the full card and follow your service protocol." No new numbers introduced.
  ☑ **Second visual batch integrated in the live Academy:** 27 responsive course graphics spanning anatomy, physiology, respiratory failure, NIV, preoxygenation, PBW, ventilation modes, ARDS, auto-PEEP, TBI, pediatric guardrails, RASS, transport readiness, and LTV circuit/battery/alarm/monitoring concepts. All are included in the PWA cache. The DOPE and RASS graphics were adjusted to preserve the course's corrected safety framing.
- ☐ **Transport module** (from round 1 §C).

**Deployment position (agreed with the review):** usable as a **supervised educational supplement** with a prominent "local protocol / medical direction / manufacturer instructions control" statement. The four identified release-blocking factual/logic errors and the static-app assessment controls are now corrected. Do **not** use the final exam as proof of competency or issue a formal credential until the remaining protocol/drug/device-configuration items receive medical-director and service sign-off; auditable credentialing still requires a backend.
