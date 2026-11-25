# Protocols PDF: contradiction review (November 2026)

Scope: `protocols-2026.pdf` (175 pages, "Effective May 15 2026"), read in full on 2026-11-25.
Page numbers are PDF pages. Nothing in the PDF has been changed yet. Every item below
is a proposed fix waiting for a decision.

The items fall into three groups:

- **A. Contradictions where the PDF already says which side wins.** The formulary
  (Section III) is named as the source for drug information (p.11, and the
  non-redundancy rule on p.72). The scope matrix (pp.7–11) and the Section IV KBEMS
  position settle scope. Here the fix is to make the outlier match.
- **B. Contradictions that need a decision from the Medical Director.** Both sides
  are plausible, or the fix adds or removes something a crew is allowed to do.
- **C. Not contradictions, but errors I found while reading.** Wrong numbers,
  broken references and duplicated pages.

---

## A. Contradictions where the PDF already says which side wins

| # | Where | Conflict | Proposed fix |
|---|---|---|---|
| A1 | II-10 (p.30), II-11 (p.32), II-12 (p.33), AEMT column | The AEMT is told to "prepare midazolam for Paramedic administration" for seizures. Formulary III-11 (p.64–65) and VIII-A8 (p.137) authorize the AEMT to give midazolam IV/IO/IM/IN for an active seizure. | Change the AEMT step to give midazolam per III-11 (seizure only). |
| A2 | II-26 Hypoglycemia (p.53), AEMT step 4 | "Hold or reduce insulin infusion rate." II-17 (p.40) says "AEMT does not adjust insulin rates." p.13 says AEMTs may not titrate infusions. Insulin is not on the IV-B list of infusions an AEMT may monitor (p.74–75). | AEMT: notify the Paramedic and contact DMO. Holding or reducing insulin moves to the PM column. |
| A3 | II-28 Toxicology (p.56), PM step 6 | "Succinylcholine is contraindicated in hyperkalemia (consider rocuronium — hospital supplied)." V-4 (p.88) and VIII-C1 (p.143–144) say no RSI is permitted. | Remove the paralytic sentence. |
| A4 | p.11, AEMT scope paragraph | "AEMTs may not ... manage ventilators independently." The matrix (p.8) and V-6 (p.89) now authorize the AEMT for the LTV 1200 (changed per the protocol owner in commit 129ae7c). | Remove "manage ventilators independently" from the list. |
| A5 | VIII-B6 TOR (p.142), EMT and AEMT step | "Continue resuscitation until Paramedic **or** DMO authorizes termination." The overview says "TOR requires DMO concurrence." | "...until DMO authorizes termination." |
| A6 | VIII-A7 Pain (p.136), AEMT step 4 | "Fentanyl IN: 1–2 mcg/kg **per nostril**." That is a total of 2–4 mcg/kg. Formulary III-10 (p.64) gives 1–2 mcg/kg IN total (max 100 mcg per nostril). | "1–2 mcg/kg IN, divided between nostrils (max 100 mcg per nostril)." |
| A7 | Peds quick reference (p.156) vs III-5 Atropine (p.60–61) | The quick reference gives a maximum single pediatric dose of 0.5 mg. The formulary gives 1 mg. | Change the formulary to a 0.5 mg maximum. This matches the AHA 2020 PALS bradycardia algorithm (0.02 mg/kg, minimum 0.1 mg, maximum single dose 0.5 mg). |
| A8 | Peds quick reference (p.156) vs VIII-G3 Croup (p.159) | The quick reference says racemic epinephrine "0.5 mg/mL". VIII-G3 says the 2.25% solution, which is 22.5 mg/mL. Both give 0.05 mL/kg, maximum 0.5 mL. | Quick reference: "2.25% racemic epinephrine 0.05 mL/kg (max 0.5 mL)". |
| A9 | VIII-G1 Peds arrest (p.157), PM step 3 | "1 breath every 2–3 seconds (20–30 breaths/min for infant, **15–20 for child**)." One breath every 2–3 seconds is 20–30/min. | "1 breath every 2–3 seconds (20–30/min) for infants and children." This is the AHA 2020 recommendation. |
| A10 | V-30 LIFEPAK 15 (p.119–120) | "Confirm battery >50% before transport" is followed by "if below 20%, connect to AC power or swap battery before departure." | Startup step 2: "if below 50%". The 20% figure stays in the during-transport bullet. |
| A11 | p.14, High-Risk Transport | "Pre-departure verification per the High-Risk Transport Checklist (**Appendix B**)." Appendix B is the hospital capability chart, and no such checklist exists in the PDF. | Point to the pre-departure verification in Section IV-A (p.72–73) and TP02 (p.162). If a checklist exists outside the PDF, it should be added as an appendix instead. |
| A12 | V-19 iGel (p.108) | One indication reads "cardiac arrest requiring airway control at AEMT or PM level." The card badge, the matrix (p.8) and VIII-C1 (EMT step 6) authorize all levels. | "Cardiac arrest requiring airway control." |
| A13 | VIII-B1 Cardiac arrest (p.139), PM step 5 | Lidocaine 1–1.5 mg/kg is given as the alternative to amiodarone for refractory VF. Formulary III-13 (p.65–66) lists only stable VT and ectopy. | Add "VF/pulseless VT refractory to defibrillation (alternative to amiodarone)" to the III-13 indications. AHA 2020 and 2025 support lidocaine here. |
| A14 | Peds quick reference (p.156) vs formulary | The quick reference gives fentanyl 1–2 mcg/kg IV (III-10 gives 1 mcg/kg), midazolam IM 0.1–0.15 mg/kg (III-11 gives 0.1 mg/kg), and naloxone IM (III-15 lists no pediatric IM route). | Make the quick reference match the formulary, or change the formulary. Either way, one source. |
| A15 | VIII-A10 Overdose (p.153), EMT step 5 | Naloxone "0.4 mg IM". III-15 (p.67) gives IM or IN as 2 mg. | "2 mg IN or IM" per III-15. |
| A16 | V-6 (p.89) vs its own TBI row (p.90) | "Use 6 mL/kg for ARDS or TBI." The TBI row says 6–7 mL/kg. | "Use 6 mL/kg for ARDS." The TBI row stays as it is. |

## B. Contradictions that need a decision from the Medical Director

| # | Where | Conflict | Options |
|---|---|---|---|
| B1 | **CPAP**: the matrix (p.8) and V-5 (p.88) say all levels | Every protocol that starts CPAP puts it in the AEMT column, with the EMT only assisting: II-6 (p.24), II-13 (p.34), VIII-C1 (p.143), VIII-C2 (p.144). | (a) The EMT may start CPAP, so add it to the EMT columns. (b) CPAP is AEMT and up, so change the matrix and the V-5 badge. |
| B2 | **Nitroglycerin**: III-16 (p.67) authorizes AEMT SL *and transdermal* | The matrix (p.9–10) makes prescription transdermal medications PM only, and names nitroglycerin patches. The AEMT gives SL nitroglycerin in VIII-A11 (p.154), but II-5, II-6 and VIII-B2 list it in the PM column only. | (a) AEMT SL only: drop "Transdermal" from the AEMT cell and add SL nitroglycerin to the AEMT column in II-5, II-6 and VIII-B2. (b) PM only: change III-16 and VIII-A11. |
| B3 | **Lidocaine for IO pain**: V-8 (p.96) and VIII-A7 (p.136) say Paramedic scope | Formulary III-13 makes lidocaine AEMT+ IV/IO, but lists no IO-analgesia indication. | (a) Add IO analgesia (40–50 mg IO) to III-13 as PM only. (b) Allow the AEMT to give it, matching the III-13 badge. |
| B4 | **Behavioral sedation route**: II-23 (p.48), V-12 (p.99) and III-11 say IV only | VIII-A4 (p.134) says "midazolam 2–5 mg IV/IO/IM". | (a) IV/IO only: change VIII-A4. (b) Allow IM for a patient without IV access: add the IM dose (for example 5 mg) to III-11, V-12 and II-23. |
| B5 | **TBI blood pressure target**: VIII-D3 PM step 5 (p.147) says "MAP ≥85 mmHg for confirmed TBI" | The VIII-D3 overview, II-10 (p.30) and the IV transport defaults (p.73) all say SBP ≥90. A MAP of 85 is the acute spinal cord injury target, and it looks copied from VIII-D7. | (a) SBP ≥90 everywhere. (b) Adopt the Brain Trauma Foundation 4th-edition targets: SBP ≥100 at ages 50–69, ≥110 at ages 15–49 or >70. That evidence is observational (Level III). Change II-10, VIII-D3 and V-6 together. |
| B6 | **Intranasal volume limit** (p.13): "maximum 1 mL total (ideally ≤0.5 mL per nostril)" | Fentanyl 100 mcg IN is 2 mL at 50 mcg/mL. Naloxone 2 mg IN from a 2 mg/2 mL syringe is 2 mL. Both are standing doses. Midazolam IN 5 mg fits only at 5 mg/mL. | (a) Change the rule to "maximum 1 mL per nostril". (b) Keep 1 mL total and state the concentrations that make the doses fit, for example a 4 mg/0.1 mL naloxone spray. |
| B7 | **Epinephrine outside the formulary** | VIII-A3 (p.134) has the PM give "epinephrine 1:10,000 0.1 mg IV slow push" for bronchospasm. II-27 (p.54) and VIII-B3 (p.140) order an epinephrine infusion at 2–10 mcg/min. III-9 lists only the arrest dose, pediatric bradycardia and push-dose 10–20 mcg. VIII-B3 also says "dopamine is not a carried agent", which implies epinephrine for an infusion is carried. | Add the infusion (and the 0.1 mg anaphylaxis dose, if wanted) to III-9 as PM only. Or change VIII-A3 to push-dose or infusion per III-9. |
| B8 | **Drugs ordered that are not carried** | Calcium gluconate or chloride: II-19, II-28 and **VIII-A10, a 911 protocol** (p.153). III-14 (p.67) says calcium gluconate is hospital-supplied and "not carried on the truck", so on a 911 call there is none. Others: thiamine (VIII-A2, "if available"), dexamethasone (VIII-G3, AEMT), racemic and L-epinephrine nebulized (VIII-G3, VIII-G4) and oral glucose (EMT steps). None of these is in Section III. | For each drug, either add a formulary card or mark it "if carried / hospital-supplied; contact DMO". |
| B9 | **What an AEMT may do with infusions** | p.11 says AEMTs may not start IV infusions, and p.13 says they may not start or titrate them. Section IV-B (p.74) lets the AEMT "monitor, maintain, and adjust" the normal saline rate. V-13 (p.100) lets the AEMT set up the Sapphire pump for in-scope drugs. NS boluses are AEMT standing orders throughout. | Most likely intent: add "except isotonic crystalloid per standing orders and pump setup for in-scope infusions" to pp.11 and 13. |
| B10 | **EMT infusion monitoring** | The matrix (p.9) gives the EMT a ✓ for "Infusion Pump Monitoring (hospital-supplied)". IV-A (p.72) says EMT crews "maintain normal saline continuity only. No medication infusion monitoring beyond NS." | Qualify the matrix row: "NS only on EMT crews". |
| B11 | **Pediatric termination of resuscitation** | VIII-B6 (p.143) lists "pediatric patient" as a special circumstance that means continued resuscitation and transport regardless of the TOR criteria. VIII-G1 (p.157) PM step 7 copies the adult note that ETCO2 ≤10 after 20 minutes "may be considered ... to terminate". | Most likely intent: drop the ETCO2 termination note from VIII-G1 and keep "contact DMO for prolonged resuscitation". |

## C. Not contradictions, but errors I found while reading

| # | Where | Issue |
|---|---|---|
| C1 | V-6 IBW quick estimates (p.89) | "Average adult male 70 **cm** (5'11") = ~70 kg." The units are wrong, and 70 in is 5'10", which gives an IBW of 73 kg (50 + 2.3 × 10) and 6–8 mL/kg = 440–580 mL. The female line, "65 cm (5'7") ≈ 60 kg", has the same problems: 5'7" is 67 in and gives 61.6 kg. |
| C2 | V-8 EZ-IO needles (p.95) | "15 mm standard adult." In the manufacturer's sizing, 15 mm is the 3–39 kg needle, 25 mm is the standard adult needle (≥40 kg) and 45 mm is for the humerus or excess tissue. |
| C3 | V-3 Suctioning (pp.82–87) | V-3B appears three times, twice with its steps in reverse order (9 → 1), and V-3A is printed twice. This is an assembly defect. Fixing it removes pages and moves every later page number, so it means re-assembling the PDF and regenerating `protocols-index.js`. |
| C4 | VIII-G1 (p.157), PM step 4 | Pediatric amiodarone "after second shock". The AHA 2020 PALS algorithm gives amiodarone or lidocaine after the third shock, which also matches the adult VIII-B1. |
| C5 | V-15 step 6 (p.102) | "Hold charge button until shock fires." This should be the shock button, as V-30 says. |
| C6 | TP03 (p.163) | The main text recognizes "POLST". The hospice page (p.164) uses TPOPP, which is the Kansas/Missouri form. One name should be used throughout. |
| C7 | Evidence currency (not internal) | V-29 and VIII-F1 assess the newborn at 30 s and give epinephrine after 30 s of compressions. NRP 8th edition uses the first 60 s and 60 s of compressions. VIII-G2 makes uncuffed ETTs the default under 8 years, while AHA 2020 rates cuffed tubes as reasonable for infants and children. These are worth reviewing with the Medical Director, but they are not internal conflicts. |

## Already known: the app and the PDF disagree on DMO

p.14 says "contact dispatch first, then the DMO line". The app's DMO algorithm says base
hospital first, then dispatch, then the backup line. The README already records this
difference. It stays until the PDF is updated.
