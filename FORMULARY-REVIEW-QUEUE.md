# Formulary Review Queue

Audit of the AMR Kansas City formulary (21 drugs at audit time; glucagon added as III-22 since) as stated in the Field Guide
(`index.html` → `D.formulary`) and the formulary card deck (`flashcards.html`),
against the **Kansas Board of EMS Approved Medication List, dated June 4, 2021**
(EMR / EMT / AEMT).

Two limits on what that list can settle:

- **It does not cover Paramedic scope.** It is the EMR–EMT–AEMT list, so the six
  PM-tagged drugs (adenosine, ketamine, magnesium sulfate, norepinephrine,
  sodium bicarbonate) cannot be checked against it either way.
- **It is a ceiling, not a floor.** A service medical director may authorize
  less than the state permits. Several items below are exactly that, and are
  listed so the narrowing stays a recorded decision rather than drifting into
  looking like an error.

The list supplied is dated June 4, 2021. **Confirm it is still the current
version** before it is relied on for anything downstream.

---

## Settled in this change

| Drug | What it said | What it says now |
|---|---|---|
| **Epinephrine 1:1,000 (III-8)** | Routes listed as "Adult IM" and "EpiPen" with no scope split; `quiz.html` and `quiz-daily5.html` both taught "autoinjector **or IM injection**" at EMT level | EMT route is the **auto-injector only**. An EMT may not draw epinephrine from a vial or ampule and inject it. Drawing up and giving IM is AEMT+ |
| **Naloxone (III-15)** | Tagged All Levels, first route listed is IV/IO | Carries an EMT route note: auto-injector, IN or IM only. IV/IO is AEMT+ |
| **Nitroglycerin (III-16)** | `flashcards.html` said All Levels, `index.html` said AEMT+ — the two files disagreed | All Levels in both, with an EMT note: **SL only**; applying or adjusting a transdermal patch is Paramedic scope |
| **Normal saline (III-20)** | Same disagreement — All Levels vs AEMT+ | All Levels in both. The existing EMT note (pre-existing access only, may not initiate) is unchanged |

**On epinephrine specifically:** the state list permits **`Autoinjector; IM`** at
EMT level. Restricting AMR Kansas City EMTs to the auto-injector is therefore
*narrower than Kansas allows* — a local medical-direction decision, not a
reading of the state list. It is recorded here, and pinned by
`test/formulary.test.mjs`, so that a later edit checking the guide against the
state list does not "correct" it back.

---

## Open — needs a ruling from Dr. Deshmukh

Nothing below was changed. Each is a place where our stated scope and the state
list do not line up, and the resolution depends on what AMR KC actually carries
and what the Medical Director intends.

1. **Glucagon — now carried (III-22), Paramedic scope. Scope question still open.**
   Glucagon has been added to the formulary as III-22, tagged PM, which matches
   the protocol's own standing orders (VIII-A5 and II-26 put glucagon 1 mg IM/IN
   in the PM column; II-28 and VIII-A10 give 3–5 mg IV/IM for beta blocker / CCB
   toxicity). The state list authorizes glucagon `IM; IN` at **EMR, EMT and
   AEMT**, so PM-only is *narrower than Kansas allows* — confirm that is the
   intended local restriction. Also open: the protocol gives **no pediatric
   dose** (the card says "contact DMO"), and "1 mg IN" should be checked against
   the product actually stocked — the FDA-approved nasal product (Baqsimi) is a
   fixed 3 mg dose.

2. **Atropine is tagged AEMT+, but antidote-by-auto-injector is an EMT route.**
   III-5 notes *"AEMT authorization: autoinjector route only in OPG context."*
   The state list's `Antidote*` row gives **EMR and EMT** `Oral; Autoinjector; IN`.
   If AMR KC carries nerve-agent auto-injectors, EMTs are state-authorized to use
   them. The asterisk leaves agent selection to local protocol, so this may be
   deliberate — worth confirming, since it is a time-critical intervention.

3. **Diphenhydramine is tagged AEMT+; the state allows EMT by mouth.**
   State: EMT `Oral`, AEMT `Oral; IM; IV/IO`. The card lists only IV/IM doses. If
   oral diphenhydramine is carried, EMT scope should be stated.

4. **Ondansetron's scope tag hides it from the EMT filter.**
   III-19 is tagged AEMT+ and then notes *"EMT authorization: PO and ODT routes
   only"* — which matches the state (`Oral; SL` at EMT). But an EMT filtering the
   deck to their own level never sees the card. Epinephrine solves the same
   problem the other way: tagged All Levels with the route restriction in a note.
   **Pick one convention.** The epinephrine pattern is the safer one — it shows
   the provider the drug and the limit together, instead of hiding it.

5. **Transdermal nitroglycerin — confirm the narrowing is intended.**
   State: EMT `SL; Transdermal`. The AMR KC scope matrix puts *Topical / Dermal
   (Prescription Transdermal Medications)* at **Paramedic only**. Local is
   narrower, which is permitted. Flagging it because the same row drives crew
   assignment on interfacility transfers, so the two should stay deliberate and
   consistent.

6. **TXA — state-approved for AEMT, treated here as Paramedic.**
   State: `Tranexamic Acid (TXA)` at **AEMT `IV/IO`**. Protocol §IV-C6 groups TXA
   with blood products under Paramedic-managed. TXA is not carried in the ambulance
   formulary, so this only bites on hospital-supplied infusions during IFT — but
   §IV's own stated principle is that an AEMT may monitor an infusion *"when the
   medication corresponds to a drug within their KBEMS-authorized scope,"* and
   TXA is within it. Worth reconciling.

7. **Isotonic crystalloid at EMT — documented, noted for completeness.**
   State: EMT `IV/IO`. AMR KC narrows this to administration through
   *pre-existing access only*, citing KSA 65-6121, and says so in the protocol
   and on the card. No action; recorded so the difference is not read as an error.

---

## Not carried, state-approved at AEMT or below

Neither a defect nor a gap — recorded so the next audit does not re-derive it.
Activated charcoal (EMT, oral) · glucose (EMT, oral) · OTC antipyretics and
non-opioid analgesics (EMT, oral) · corticosteroids (AEMT) · ketorolac (AEMT) ·
nitrous oxide (AEMT).
