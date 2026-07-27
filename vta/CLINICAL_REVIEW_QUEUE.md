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
- ☑ **IBW shortcut is sex-specific** — pearl now gives 5'10" man ≈ 73 kg / woman ≈ 68.5 kg.
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

## D. Visuals — next production batch (no clinical decision needed)

- ☐ Native diagrams to be built and inserted: capnography waveforms (normal/shark-fin/rebreathing/lost), oxyhemoglobin dissociation curve, PIP vs Pplat pressure–time, auto-PEEP flow–time, ARDSNet PEEP/FiO₂ ladder, DOPE flow.
- ☐ Device visuals: screenshots of the LTV **simulator** panel/alarm/scan screens (owned asset — avoids copyrighted manufacturer photos).
- ☑ Simulator cue links are now real PowerPoint hyperlinks (were plain text). *(Relative paths — set your hosted base URL when deployed.)*

---

**Bottom line:** §A is done, §B awaits your medical director, §C needs a scope decision, §D is queued production. Certification use should wait until §B and §C are signed off by a medical director and checked against service protocols.

---

# Round 2 — Full learner review (verdict 6/10: supervised supplement, not a credential)

## E. Safety/logic errors corrected now (clear errors, MD to confirm wording)

- ☑ **M7 — chest seal after needle decompression removed.** A chest seal treats an OPEN chest wound; it does not stop an internal pulmonary air leak and can foul the decompression site. Lesson, scenario Q4, and conclusion now teach: secure/monitor the catheter per protocol, reassess for re-tensioning (re-decompress if it recurs), definitive thoracostomy at the receiving facility. The chest-seal misconception is now an explicit wrong-answer distractor. *(Source cited: Joint Trauma System thoracic-injury guidance.)*
- ☑ **M8 — paralysis/RASS impossibility fixed.** RASS behaviors ("restless, fighting tube") are impossible during effective neuromuscular blockade. The scenario now presents **autonomic** awareness signs (rising HR/BP, lacrimation, diaphoresis) with the patient paralyzed and still, and lesson 8.2 gains a caveat that RASS cannot be scored under paralysis.
- ☑ **M1 — "PEEP replaces surfactant" softened** to "PEEP is not a substitute for surfactant; it mechanically splints alveoli open until surfactant function returns."
- ☑ **M4 — driving-pressure contradiction fixed.** The scenario no longer calls ΔP 21 "under control"/"safe lung-protective"; it now reads "improved from 29 to 21 but still elevated — flag for further optimization."

## F. Staged for medical director (guideline / drug dependent — NOT changed)

- ☐ **M3 NIV** — CPAP and bilevel NIV are both evidence-supported in cardiogenic pulmonary edema; reconsider the rigid "one-hour rule" and the GCS/gag absolutes. *(ERS/ATS NIV guideline.)*
- ☐ **M4** — use **predicted** body weight terminology (not generic "ideal"); make targets disease-specific; frame driving pressure as a **risk marker** computed with total PEEP under passive conditions, not a universal pass/fail threshold. *(ARDSNet.)*
- ☐ **M5** — "high PIP alone → switch to pressure control" is unsafe; teach assessing Pplat / resistance / circuit / tube / patient first. NIV should not be presented as established first-line for acute asthma.
- ☐ **M8** — reconsider a **universal** RASS −1 to −2 transport target; **all drug and push-dose pressor content requires medical-director approval.** *(SCCM PADIS.)*
- ☐ **M9 TBI** — reviewer's targets: EtCO₂ 35–40 (30–35 with active herniation), SpO₂ > 90%, adult SBP ≥ 110 — replace the module's universal SBP > 100 and SpO₂ ≥ 94. *(Brain Trauma Foundation.)* **Reconcile with the round-1 TBI item and the edition your service certifies against.**
- ☐ **M1** — distinguish **minute vs alveolar** ventilation; qualify PIP/plateau interpretation.
- ☐ **M7** — qualify the "ten-second," "always bag," and "rules out equipment" absolutes; note manual ventilation can also harm without controlled rate, volume, and PEEP.
- ☐ **M2** — EtCO₂/SpO₂ don't establish PaCO₂/pH/mixed acid-base (softened in round 1 §A; MD to confirm).

## G. Platform / assessment (software — I own; scoped, not yet built)

- ☐ **Scenario gives completion credit for a wrong path.** Gate advancement so only the correct decision progresses (competency enforcement).
- ☐ **Matching is keyboard/screen-reader-inoperable.** Make destination bins semantic, focusable, ARIA-labeled.
- ☐ **Locked module cards are a focus trap.** Add `aria-disabled` + accessible "locked" labeling.
- ☐ **Credential integrity.** Rename to **certificate of completion** (not "certification"); add a prominent disclaimer that local protocol, medical direction, and manufacturer instructions control and that this is not proof of competency. A truly auditable credential requires a server-side backend (separate project).
- ☐ **Exam integrity.** Options: randomize/expand the item pool, limit attempts, optionally withhold rationale until submission. (Design choices — confirm.)
- ☐ **Versioned bibliography** with per-claim source links.

## H. Bigger builds (need your input)

- ☐ **M6 LTV rebuild** from the operator manual (our own words) + your **AMR unit configuration**. The reviewer flagged specifics: individually selected controls (not a left/right set-vs-monitored split); a central sequential monitored-data window; **Comm Port** (not USB); a **POWER LOST** alarm; nominal battery indicators ≈ 45/10/5 min; **no monitored plateau value**; **I:E is calculated/monitored, not directly set**. *(LTV 1200/1150 Quick Reference Guide.)*
- ☐ **Visuals** — waveforms, oxyhemoglobin curve, PEEP/FiO₂, annotated device images + simulator screenshots.
- ☐ **Transport module** (from round 1 §C).

**Deployment position (agreed with the review):** usable as a **supervised educational supplement** with a prominent "local protocol / medical direction / manufacturer instructions control" statement. Do **not** require Modules 6–8, use the final exam as proof of competency, or issue a formal credential until the four release blockers (§E started; §H M6 pending) and the assessment controls (§G) are corrected and a medical director signs off §F.
