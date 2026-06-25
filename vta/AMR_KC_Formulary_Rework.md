# AMR KC Formulary Rework — Change Log

Reworked the medication content of the Ventilator Training Academy to reinforce the **AMR Kansas City Medical Protocols (effective May 15 2026)** while keeping the general-EMS education intact. Approach: layered "AMR Kansas City Formulary" callouts and reference content on top of the existing material rather than replacing it. Source: `protocols-2026.pdf`, Section III (Ambulance Formulary) and Section IV (Hospital-Supplied Infusion Monitoring).

## Interactive academy (`app.js`, `styles.css`)

- **New callout type.** Added a distinct red "AMR Kansas City Formulary" callout box (renderer + `callout-kc` style) so KC standing-order content is visually separated from general teaching.
- **Lesson 8.3 (Agents).** Added a KC box mapping each agent to KC scope/dosing, and inline scope tags: Ketamine flagged as **Paramedic-only, intubated-adults-only — not a field induction drug**; **propofol** and **etomidate** flagged as **not carried** (propofol = hospital-supplied infusion you monitor).
- **Lesson 8.4 (Push-Dose Pressors).** Added a KC box: push-dose **epinephrine is the only carried push-dose pressor (PM only, 10–20 mcg q1–2 min)**, prepared by the **10 mL-syringe method** (1 mL of 1:10,000 into 10 mL NS = 10 mcg/mL); **push-dose phenylephrine is not carried**; norepinephrine infusion is PM-only, titrated to MAP ≥ 65.
- **New Lesson 8.6 — AMR KC Formulary.** Full carried-drug list grouped by use, each tagged AEMT+ / PM, plus the core scope rule (AEMTs may not initiate or titrate any infusion).
- **New Lesson 8.7 — Hospital Infusions.** What crews monitor on IFT (vasopressors, sedation/paralysis, cardiac, endocrine, antibiotics, blood), pre-departure verification, and the AEMT monitoring boundary.
- **Quiz rationales.** Added KC notes to the push-dose-epi prep, phenylephrine, and ketamine questions (answer keys unchanged — general-EMS answers preserved, KC specifics noted).

## Module 8 PowerPoint deck

- Added two slides matching the deck style: **8.9 · AMR KC Formulary** ("What You Carry — and Who Can Give It") and **8.10 · Hospital Infusions** ("What You Monitor on a Transfer"). Deck renumbered to 16 slides; mini-case is now 8.11. Both new slides render within the layout.

## Key KC-specific points now reinforced

| Topic | General teaching (kept) | AMR KC standing order (added) |
|---|---|---|
| Ketamine | Induction agent, preferred in shock RSI | Intubated adults only, Paramedic only — not field induction |
| Push-dose pressor | Epi (bag method) + phenylephrine | Epi only, 10 mL-syringe prep, PM only; no phenylephrine |
| Fentanyl | 1–2 mcg/kg | 25–100 mcg, max 200 mcg (AEMT+) |
| Midazolam | 0.05–0.1 mg/kg | 2–5 mg; seizure for AEMT, sedation/infusion PM only |
| Propofol / etomidate | Taught as agents | Not carried; propofol = hospital-supplied monitor-only |
| Norepinephrine | First-line infusion | Carried, Paramedic only, MAP ≥ 65 |
| Infusions generally | — | AEMTs may not initiate/titrate; scope-matched monitoring only |

## Notes / left for your review

- Quiz/exam **answer keys were not changed** — they still reward the general-EMS best answer, with KC specifics layered in the rationale. If you want the assessments to test KC standing orders directly (e.g., make the 10 mL-syringe prep the keyed answer, or add KC-scope questions), say the word and I'll convert them.
- `app.js.backup` from the earlier accuracy audit remains; a fresh backup can be made before any further edits.
