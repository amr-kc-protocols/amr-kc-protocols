# VTA Accuracy & Currency Audit

**Scope:** All 9 modules of the Ventilator Training Academy (`app.js`) — every lesson, all 90 module-quiz items, the 25-question final certification exam, and all branching scenarios. Reviewed for clinical accuracy, correct answer keys, internal consistency, and whether guideline-dependent content is current as of June 2026.

**Bottom line:** The course is clinically sound and unusually well-referenced. Quiz and final-exam answer keys are all correct. One genuinely outdated number (a 2025 guideline change) was found and fixed; two optional currency enhancements were added. No incorrect answer keys, no physiology errors, no dosing errors were found.

---

## Changes applied to app.js

A backup was saved as `app.js.backup` before editing. `app.js` was re-parsed after editing — it loads cleanly and every answer-key index is unchanged.

### 1. Post-ROSC oxygenation target — OUTDATED → fixed (the one real correction)

The course stated the post-ROSC SpO₂ target as **92–98%**, attributed to AHA. That was the AHA 2020 number. The **2025 AHA post–cardiac arrest guidelines** (Circulation, Oct 2025) revised the target to **SpO₂ 90–98%** (PaO₂ 60–105 mmHg). Updated in all four places it appeared:

- Module 2 "Hyperoxia after ROSC" evidence box
- Module 4 lesson 4.3 (Oxygenation Knobs)
- Module 4 quiz Q7 (answer choice + rationale)
- Final exam Q17 (answer choice + rationale)

The keyed correct answer is unchanged — "90–98%" remains the obvious right choice against the same distractors. (For reference, ESICM's 2025 guideline uses 94–98%; the course follows AHA, so 90–98% is the consistent choice.)

### 2. ARDS definition — currency enhancement (was not wrong)

Module 9 cited only the **Berlin definition (2012)**. Added a one-line note that the **2023/2024 Global Definition of ARDS** now also permits diagnosis by SpO₂/FiO₂ and includes patients on HFNO ≥ 30 L/min or CPAP/NIV ≥ 5 cmH₂O. The Berlin P/F severity bands the course teaches remain in everyday bedside use, so this is an addition, not a correction.

### 3. Module 8 vasopressor parity — consistency with the slide decks

Module 8's push-dose-pressor lesson ended with "move to a continuous infusion as soon as practical" without naming the agent. Added that **norepinephrine** is the first-line infused vasopressor (Surviving Sepsis 2021), 0.05–0.1 mcg/kg/min titrated to MAP ≥ 65, safe peripherally for transport — matching the new vasopressor section added to the Module 8 / Module 3 / Module 9 PowerPoint decks.

---

## Verified accurate (spot-checked against the literature)

These are correct and current, and were left unchanged:

- **ARDSNet ARMA** (NEJM 2000): 6 vs 12 mL/kg IBW, mortality 39.8% → 31.0%, NNT ~11. Correct.
- **Driving pressure** (Amato, NEJM 2015): ΔP = Pplat − PEEP, > 14 predicts mortality. Correct.
- **PROSEVA** (Guérin, NEJM 2013): prone in severe ARDS, mortality 33% → 16%, NNT 6. Correct.
- **OSCILLATE** (NEJM 2013): HFOV stopped for harm (47% vs 35%). Correct.
- **Esteban** (NEJM 1995): SIMV slowest weaning mode. Correct.
- **Bersten 1991 / Brochard 1995** NIV trials: figures correct.
- **BTF 4th ed. (2017)** TBI: EtCO₂ 35–40, avoid prophylactic hyperventilation (Level IIB), SBP threshold, herniation rescue to EtCO₂ 30–35 (never < 30). Correct and still current (no 5th edition).
- **PALS 2020:** cuffed ETTs preferred including infants. Correct and current.
- **KETASED** (Jabre, NEJM 2009), push-dose epi/phenylephrine mixes, Devine IBW math, RASS scale, PRIS thresholds, DOPE, oxyhemoglobin curve anchors. All correct.

## Minor notes (judgment calls — not changed)

- **Module 4 scenario, final step:** accepts "continue" at a driving pressure of 21 (Pplat 26 / PEEP 5), which is still above the < 14 target the course teaches elsewhere. Defensible as a transport endpoint once Pplat < 30, but you may want the feedback to acknowledge ΔP is still high. Flagging for your call.
- **ARDS general SpO₂ target (92–96%)** in Module 2.2 is a reasonable general ventilation target and is left as written; it is not the post-ROSC target.

---

## Sources

- [Part 11: Post–Cardiac Arrest Care: 2025 AHA Guidelines (Circulation)](https://www.ahajournals.org/doi/10.1161/CIR.0000000000001375)
- [PulmCrit — 2025 AHA & ESICM post-arrest guidelines (SpO₂ 90–98%)](https://emcrit.org/pulmcrit/2025-arrest/)
- [The New Global Definition of ARDS (CHEST Critical Care, 2024)](https://www.chestcc.org/article/S2949-7884(24)00075-3/fulltext)
- [Surviving Sepsis — norepinephrine first-line / peripheral start](https://guidelines.redcross.org/guidelines-database/initial-management-of-sepsis-and-septic-shock-in-adults/)
