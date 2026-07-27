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
