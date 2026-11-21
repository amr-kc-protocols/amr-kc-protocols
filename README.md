# AMR Kansas City Field Guide 2026

**Medical Director:** Dr. Ameet Deshmukh, MD
**Authorized under:** Kansas Board of Emergency Medical Services
**Effective:** 2026

Quiz available at **https://amr-kc-protocols.github.io/amr-kc-protocols/quiz.html**

## Installing on Your Phone

1. Open your browser and go to: **https://amr-kc-protocols.github.io/amr-kc-protocols**
2. On iPhone: Tap the Share button → "Add to Home Screen"
3. On Android: Tap the menu → "Add to Home Screen" or "Install App"
4. The app will install and work fully offline

## Contents

- 28 IFT Clinical Protocols (Section II)
- 34 Section VIII 911 Mutual Aid Protocols
- 22-drug Formulary with full dosing by route and age
- 11 Procedure Cards
- Reference: Vital targets, Pediatric dosing calculator, LTV 1200 alarms, GCS, Cincinnati Stroke Scale, Broselow, Rule of Nines, APGAR

## Home and the protocol viewer
Home is field tools first, in this order:

1. **Need orders? (DMO)**, which opens the medical control algorithm.
2. **Protocols.** Six most-used (Diversion, Hospital Capability, Cardiac Rhythms, ACS/STEMI, Stroke, Hospice Transport), then a button for each of the nine PDF sections, plus "All & search". The header search also finds protocols by number or title.
3. **On shift** tools.
4. **Training & Education**, under its own divider: the license-renewal notice, the featured training, and Keep learning.

Every protocol opens in **`protocols.html`**, a pdf.js viewer of the signed `protocols-2026.pdf`, scrolled to the exact spot the PDF's own table-of-contents link lands on. Linking to the PDF directly isn't enough, because iOS Safari ignores `#page=`. The viewer has zoom, a searchable contents list, tappable in-document links (e.g. "see Procedure V-17B"), and works offline once cached.

- `protocols-index.js`: the 131 entries (code, title, section, page, y-position), extracted from the PDF's TOC links, plus `PROTOCOL_FAVORITES`. **Regenerate it if the PDF is re-assembled**, or entries will open at the wrong page.
- `pdfjs/`: vendored pdf.js 4.10.38 legacy build (Apache-2.0, `pdfjs/LICENSE`).
## Protocol Quiz and Daily 5
Both run on one shared engine (`quiz-kit.js`, `quiz-kit.css`) and one question file, `quiz-bank.js`: EMT 50, AEMT 15, Paramedic 50, ventilator 20. **Fix a question there once and both quizzes get it.** Each level includes the levels below it (EMT 50, AEMT 65, Paramedic 135).

- **Protocol Quiz** (`quiz.html`): pick a level, a length (10, 25 or all) and optionally one topic. You see the explanation and protocol reference after each answer; the results page breaks the score down by topic and lists every miss. Missed questions are saved on the device (`amrkc_quiz_v2`) for a "Review missed" round.
- **Daily 5** (`quiz-daily5.html`): five a day. Streaks keep using the `d5stats` key, so existing streaks carried over. A missed day now shows the streak as 0, on Home as well.

Answer choices are shuffled each time. The questions were reviewed against the 2026 PDF in November 2026, and `test/quizbank.test.mjs` guards the bank's structure and the corrections.

## Medical Control (DMO)
The red **DMO** header button, the Home card ("Need orders?") and every "DMO" / "Direct Medical Oversight" in rendered text open a medical control algorithm instead of dialing:

1. If transporting to a **base hospital**, contact its ED physician for orders. The 12 base hospitals are listed in this step.
2. Non-base destination, no destination yet, or base hospital unreachable: ask dispatch to reach medical control.
3. Only if both fail: the **backup line, 1-833-805-9381**. This is the only `tel:` link for it in the app.
4. Still no contact: continue within standing orders, don't delay stabilization or diversion, document attempts.

It also covers when to call, closed-loop orders, staying with the same physician, and non-base hospital destinations. The structure and base hospital list follow the Johnson County EMS System protocols (Direct Medical Oversight page; Appendix H, Base Hospital column), matching the Linn County app. The 2026 PDF (page 13) still says "contact dispatch first, then the DMO line," so the app and PDF differ until the PDF is updated. Code: `BASE_HOSPITALS`, `dmoAlgoHtml()` and `openDmo()` in `index.html`.

## Simulators

Two interactive trainers, both single self-contained pages, both reachable
from the home screen.

- **`vent-ltv1200.html`** — the LTV 1200 transport ventilator. Three ways in:
  the **Tutorial**, **Scenarios** (five mixed, graded cases at a time, each
  with a new patient) and the **Sandbox** test lung.
- **`lifepak-15.html`** — the LIFEPAK 15 as the AHA's **Rhythm Recognition and
  Electrical Therapy** station: a rhythm on the monitor, name it from four,
  then deliver the right therapy on the unit's own keys. Sixteen rhythms
  covering the ACLS set, four answers — defibrillate, cardiovert, pace, or
  recognise that none of them is the answer — and a reason line on every one.

### Why it is a station and not a console

It began as the whole unit with a walkthrough, seven coached cases and three
multi-phase assessments, and it was too much for the screen it is worked on.
The drill is the thing that teaches, and everything around it was in the way.

So the page is one loop now. What decides the answer is the rhythm **and the
patient**: monomorphic VT is in the bank three times — pulseless, unstable
with a pulse, and stable with a pulse — and takes a different answer each
time. A station that mapped rhythm to therapy one-to-one would be teaching a
lookup table rather than the decision an ACLS provider makes.

The two shock answers are told apart the way the real unit tells them apart:
**whether SYNC was armed when the shock landed.** That is the thing crews get
wrong, so it is asked of the device rather than accepted as a word.

And a synchronized shock lands on a QRS. SHOCK with SYNC armed is latched and
delivered on the next complex the detector senses — the same detection that
flashes the SYNC LED and draws the markers — so on a perfusing tachycardia it
goes within a fraction of a second, and into asystole it never goes at all. It
used to fire on the press whatever was on the screen, which let a
"synchronized" shock be delivered into a flat line.

Because a SHOCK that never fires looks like a broken button, the station says
why after two seconds: SYNC is waiting for a QRS and the unit is not sensing
one. That is the station speaking, in the page header, not a message the
LIFEPAK shows, and it describes what the unit is doing without naming the
rhythm. Arming SYNC part-way through a charge discards the charge, as it already
did once the unit was charged. That rule is this page's own and has not been
checked against the operating instructions, which could not be reached from
where this was written.

Pacing captures only above the patient's own rate, which is what the RATE card
tells the crew to do. Paced below it, the normal-sinus item used to "capture"
and drop from 78 to 60. Pacing a patient who doesn't need it is graded wrong
whether or not anything captures. Where pacing is the right answer, it isn't
accepted until it captures. A shock delivered before the rhythm has been named
is not taken as an answer, and the station says so; one delivered in the pause
just after naming counts.

`none` is never "do nothing" — it is "nothing electrical", and the reason line
says what the patient does need instead. A learner who reads "none" and stops
has taken the wrong lesson from a right answer.

### The screen it is worked on

A phone held sideways, and **nothing scrolls**. A drill whose answer is below
the fold is a drill nobody finishes.

That decided the layout. The unit is laid out fluidly rather than drawn at
1083×704 and scaled — the scaled chassis was exact and could not be made to
fit, putting every control at 21–26pt against a 44pt floor on a phone. And it
is down to the nine keys electrical therapy is delivered with: ON, SYNC,
ENERGY SELECT, CHARGE, SHOCK, PACER, RATE, CURRENT, PAUSE.

The record keys, the monitoring and display areas, LEAD, SIZE and the speed
dial are gone. **ANALYZE is gone for a different reason than the rest:** it is
a working control that would answer the question being asked. A learner
deciding whether a rhythm is shockable could press it and be told.

Held upright the page says to turn the phone rather than stacking into a
scroll, and the unit is `inert` behind that notice — covering is only paint,
and without it the whole chassis stays in the tab order, SHOCK included.

It is also capped at the size of the thing it is a picture of. A LIFEPAK 15 is
15.8 × 12.5 inches, so past that the chassis stops growing and centres instead:
left to fill the screen it rendered at roughly twice life size on a 2160-wide
Toughbook, which reads as a mockup rather than a unit. CSS inches are nominal —
96px to the inch, before the panel's own DPI and the OS scaling factor — so
this is about life size, not calibrated to it. Phones are unaffected, being
well under 15.8in wide. The keys are still larger in proportion than the real
unit's, because the station shows nine of them where the device has far more;
that is the cost of dropping the keys the drill does not use.

The unit is sized against the **visual** viewport, not the layout viewport.
Sideways in mobile Safari with the toolbars showing, the layout viewport stays
full height while the visible area is 80–100 px shorter, so a chassis pinned to
`bottom:0` puts CHARGE and SHOCK behind the browser chrome — the two keys the
drill ends on. It tracks `visualViewport` instead and gives up density in tiers
as the visible height falls, down to 285 px.

### How the tracings are drawn

The rhythm on the screen *is* the question, so it has to carry the finding the
item is asking about. Most of them are built rather than replayed.

The original simulator drew each rhythm as one keyframed beat stretched to fill
the R-R interval. That is fine at 75/min and wrong everywhere else: a QRS is
about 0.09 s wide whatever the rate, so stretching made it broad at 45/min and
a spike at 200 — the exact feature that separates a wide-complex tachycardia
from a narrow one, scaled away by the rate. It also cannot show a rhythm whose
parts run on different clocks.

So the station's rhythms are summed from parts measured **in seconds** — a P
wave, a normal QRS-with-T, a ventricular complex — laid on the trace where the
rhythm puts them. Each complex is two parts on two clocks, because the heart
runs them that way:

- **The QRS is a fixed width at every rate.** Measured the way a clinician
  measures it, first deflection to J point, a narrow complex is about 90 ms
  (86–95 depending on how fine the caliper is), close to the 95 ms mean of the
  reference population behind the 2009 AHA/ACCF/HRS limit of 110 ms. VT, a
  paced beat and a ventricular escape are about 175 ms, and a beat conducted
  with bundle branch block about 130.
- **The ST-T shortens as the rate rises.** It follows Fridericia,
  QT = QTc × RR^⅓, around a QTc of 400 ms, so the QT is about 475 ms at 36/min,
  365 at 78 and 265 at 212. A wide complex keeps a normal JT on top of its
  wider QRS (about 480 ms at 60/min), which is the relation QT corrections for
  bundle branch block rest on.

An earlier version of this section put the narrow QRS at "about 75 ms". That
was the steepest part of the complex only; onset to J it measured 100–109 ms,
normal but at the top of the range and crowding the wide complexes. Two other
things measured wrong before they were fixed: the QT was 330–370 ms at every
rate (so at 212/min each T wave ran into the next QRS), and VT was squeezed
whole to fit its R-R, so it got narrower as it got faster — 140 ms at 188/min
against 181 at 146. Now only its repolarisation shortens. That gets each rhythm
its diagnosis rather than its outline:

- **Atrial flutter** — the flutter waves are their own generator at 300/min and
  run straight through the QRS, so there is no isoelectric baseline anywhere.
  The conduction ratio falls out of the ventricular rate: 150 is 2:1, 100 is
  3:1, without either being written down.
- **Atrial fibrillation** — no two R-R intervals alike and no pattern to them
  (coefficient of variation about 0.2), drawn from a fixed pseudo-random table
  with a soft floor at the AV node's limit. The closed-form jitter it replaced
  had no floor and conducted beats 219 ms apart in the 164/min item, inside the
  250 ms range that in AF marks an accessory pathway; the shortest is now about
  290 ms. Each beat carries the two before it, so an early one no longer cuts
  the last T wave off. The fibrillatory waves wander between about 340 and
  550/min at roughly 0.1 mV, in place of a flat line.
- **Mobitz II** — the P waves march at a fixed P-P whether or not the ventricle
  answers, and the PR on the conducted beats never varies. That constant PR is
  what separates it from Wenckebach. The conducted beats carry a bundle branch
  block, as 70–80% of Mobitz II does: the block is below the AV node, which is
  also why atropine is unreliable for it.
- **Third-degree block** — the P waves are on their own clock at 76/min and the
  wide escape is on the patient's, fully dissociated. A single repeating
  keyframe cannot show that, and the dissociation is the diagnosis.
- **Ventricular tachycardia, the paced rhythm and the third-degree escape**
  share one wide complex with a T pointing away from the R, because they are
  the same complex arriving for three different reasons. The paced rhythm used
  to be a normal sinus beat with a spike in front of it — and it is a distractor
  on the wide-complex tachycardia items, so it has to be wrong for the right
  reason.
- **Junctional escape** — narrow complexes at 40–60 with no P in front of them,
  which is the whole read and what tells it from the third-degree block sitting
  next to it in the options.
- **Ventricular fibrillation** is not a template at all: a few incommensurate
  sinusoids under a slow envelope, so it never repeats cycle to cycle.

The lead transform is applied to the parts rather than to fixed fractions of
the cardiac cycle. Applied by phase it cut notches into whatever happened to be
at that fraction of the R-R — at 32/min, a visible step in the baseline a third
of the way between escape beats, nowhere near a complex.

**How much of it is on the screen.** The LIFEPAK 15 shows at least five
seconds of ECG at 25 mm/s, according to its data sheet, so the sweep is set from
the width of the ECG channel to hold five seconds. It used to run at a fixed
180 px/s, which showed 1.1 s on an iPhone SE and 1.9 s on an iPhone 14: less than one beat-to-beat interval of
the 32/min complete heart block, and less than half the Mobitz II's repeating
group. The sweep never drops below 60 px/s, because at 41 px/s (five seconds on
an SE's 205 px channel) VT and SVT became the same dense comb. So an SE shows
3.4 s; every phone from the iPhone 12 size up shows the full five. The grid
keeps 0.2 s large boxes and drops the small ones when they would be under 4 px
apart. The capnogram runs at half the ECG's speed, the unit's 12.5 mm/s, which
is ten seconds of CO₂.

Each pixel column is drawn peak-preserving, from its highest to its lowest
point across 2 ms samples, the way monitors decimate. With one sample per column
at a phone's sweep, R waves came out a different height every beat and a 12 ms
pacing spike could fall between columns.

The unit draws a small noise floor of its own, about 0.02 mV either side of the
line and all inside its 0.5–40 Hz monitor bandwidth, so asystole is not a
ruler-straight line. That is the look of a lead that has come off. The noise is
added on the way to the screen, and the patient's signal stays exact.

### The boundary

The unit is ported from the CES simulator, where it is half of a two-window
system: a facilitator drives the patient from a control panel and the monitor
never writes a field of patient state. There is no facilitator here, so the
station plays one — in a facilitator's place, rather than by letting the keys
reach into the patient. The crew own the device; the patient answers to the
station, on the event a press generated. `test/lifepak.test.mjs` drives the
whole therapy set through the unit with the station's writer stubbed out and
asserts that not one field of the patient moved.

### What the clinical content is checked against

Two sources, answering different questions. The device's behaviour and its
numbers come from Stryker/Physio-Control's documentation for the LIFEPAK 15 —
the data sheet and the Setup Options guide. The clinical calls come from the
**2025 AHA Guidelines for CPR and ECC**, Part 9. The suite asserts the
published figures directly, so drift fails rather than sits there.

Matching the device: the manual-mode energy ladder, the 200-300-360 J adult
sequence that is its factory default, pacing at 40–170 PPM from a 60 PPM
default and 0–200 mA, the 60-second disarm.

Matching the guidelines: atropine before pacing; pacing an asystolic arrest
taught as ineffective, which is what the 2025 evidence review concluded; and
SYNC ruled out for VF and pulseless VT.

On doses, the station teaches **the standing orders these learners are actually
held to**, not a reading of the guidelines. `protocols-2026.pdf` in this repo
names them in four places — V-15 (Synchronized Cardioversion), the LIFEPAK 15
device operation page, the II-2/II-3/II-4 tachycardia protocols, and the
tachycardia reference — and they agree:

| Therapy | AMR Kansas City 2026 |
|---|---|
| Manual defibrillation, VF / pulseless VT | 200 J biphasic |
| Synchronized cardioversion, SVT | 50–100 J |
| Synchronized cardioversion, atrial fibrillation | 200 J biphasic *(cites AHA 2025)* |
| Synchronized cardioversion, VT with a pulse | 100 J |

Every item whose answer is a shock names the joules for that rhythm, and the
suite asserts it.

This corrects two earlier mistakes of mine, in opposite directions. I first
stripped the fixed figures out on the grounds that the 2025 AHA no longer sets
them. That was wrong twice over: the AHA *does* set the atrial fibrillation one
— 200 J or more on a biphasic unit, a reversal of the older low-and-climb
approach, because a 200 J first shock converts more often and is less likely to
induce VF — and the service sets all of them regardless of what the AHA does.
The protocol's own citation of AHA 2025 for the A-fib figure is what confirmed
it; `ahajournals.org` and `cpr.heart.org` are both unreachable from the
environment this was written in, so the guideline could not be read directly.
The protocol is the better authority here anyway: it is what the students are
examined and employed against.

LIFEPAK is a trademark of Stryker. This is a training simulation and is not a
medical device. Nothing here has been through clinical review by the Medical
Director; it is checked against published sources, which is not the same
thing.

### SpO₂, EtCO₂ and blood pressure in the test lung panel

The lung panel shows SpO₂ (with PaO₂), EtCO₂ (with PaCO₂) and blood pressure
(with MAP), and all of them respond to the vent. They are modelled, not
measured. This is a template patient for teaching, so the goal is to be as
close to the published evidence as the evidence allows, and to say plainly
where it runs out. Each number below is marked:

- **Established:** textbook physiology or a guideline target.
- **Measured:** taken from a named study; the size of the study is given
  because several are small.
- **Estimate:** a teaching choice where no good number exists.

**Equations (established).** PaCO₂ = 0.863 × V̇CO₂ ÷ V̇A, the alveolar
ventilation equation, where V̇A = rate × (delivered Vt − anatomic −
equipment − alveolar dead space). A breath cut short by the High Pressure
limit therefore raises the CO₂. Alveolar dead space dilutes exhaled gas
(Bohr), so EtCO₂ reads below PaCO₂. In obstruction only part of it does,
because slow units empty last and lift the end-tidal value.

Then PAO₂ = FiO₂ × 713 − PaCO₂ ÷ 0.8, the alveolar gas equation at sea
level, so hypoventilation lowers the O₂ and extra oxygen hides it. Blood
flow is split three ways (the Riley model, and the shape inert-gas studies
report): to shunt, to low-V/Q units (V/Q 0.08, an estimate inside the
inert-gas "< 0.1" band) and to ideal units. A low-V/Q unit's PO₂ comes from
its own oxygen balance, so oxygen fixes V/Q mismatch but barely touches a
shunt. The Severinghaus equation turns PaO₂ into SpO₂.

Fixed values: V̇CO₂ 200 mL/min at 70 kg (scaled by weight^0.75 for
children), anatomic dead space 2.2 mL/kg, Hb 14 g/dL, a–vO₂ difference
5 mL/dL. Equipment dead space of 0.5 mL/kg, up to 35 mL, is an estimate. On
CPAP or pressure support the patient breathes for themselves, and a patient
with an intact drive holds PaCO₂ at their own set point (40 unless stated).
Fatigue isn't modelled.

| Lung | Number in the model | Source | Strength |
|---|---|---|---|
| Normal | Shunt 3%; PaCO₂–EtCO₂ gap 2–5 mmHg | Normal venous admixture; normal gradient | Established |
| ARDS | Shunt 32% at PEEP 5 (49% at PEEP 0) | Inert-gas PEEP study, shunt 32 ± 14% (Am Rev Respir Dis 1985;131:54, n=16). About half of cardiac output to shunt or very-low-V/Q units (Dantzker 1979, n=16) | Measured |
| ARDS | PEEP 5 → 10 → 15 shrinks shunt ×1 → ×0.71 → ×0.56 | COVID-19 ARDS (Florio 2024, n=14): venous admixture 33 → 23 → 18%, shunt 36 → 27 → 24% | Measured, small; some patients don't respond (7 of 12 did in Karbing 2020) |
| ARDS | Vd/Vt ≈ 0.58 at 6 mL/kg | Nuckton 2002: 0.58 ± 0.09 | Measured |
| Pneumonia | Shunt 22%, plus low-V/Q units | Ventilated pneumonia, inert gas (Gea 1991, n=10): shunt 22 ± 5%, low V/Q 11 ± 5% | Measured |
| Pneumonia | Recruits poorly; PEEP above 10 overdistends the good lung | Physiology | Estimate |
| Asthma | No shunt; 10.5% of blood flow to low-V/Q units | Acute severe asthma, inert gas (Ballester 1989, n=19) | Measured |
| COPD | Low-V/Q units, essentially no shunt; 20% of flow | Pattern from inert gas (Wagner 1977); the amount is an estimate | Direction established; size is an estimate |
| COPD, asthma | Physiologic Vd/Vt ≈ 0.70 | Ventilated COPD 0.69–0.71 (a crossover study); Tuxen 1987's patients needed 15.7 L/min for normocapnia, which implies about the same | Measured (asthma borrows the COPD number) |
| COPD, asthma | EtCO₂ ≈ 0.76 × PaCO₂ | Ventilated COPD (Tyagi 2021, n=73): EtCO₂ 61 vs PaCO₂ 80 | Measured (asthma borrows it) |
| Edema | Large shunt that PEEP/CPAP recruits | CPAP improves oxygenation in cardiogenic edema (trials) | Direction established; size is an estimate |

**Blood pressure.** PEEP raises intrathoracic pressure and cuts venous
return, so cardiac output falls. Values relative to PEEP 5:

| PEEP | Cardiac output | Source | Strength |
|---|---|---|---|
| 0 | ×1.14 | Postop cardiac surgery (Auler 2000, n=10): CI 3.90 vs 3.43 | Measured, not ARDS |
| 10 | ×0.98 | Moderate–severe ARDS (Luo 2024, n=52): CI 3.07 / 3.00 / 2.63 | Measured |
| 15 | ×0.86 | Same study; Florio 2024 agrees (CO 5.4 / 4.8 / 4.7) | Measured |
| > 15 | Keeps falling at the 10→15 slope | Jardin 1981: output and mean BP fell progressively up to PEEP 30 | Extrapolation |

- **Auto-PEEP counts the same as set PEEP.** The heart feels total PEEP, so
  trapping gas lowers the pressure. Dynamic hyperinflation causes
  hypotension: Pepe & Marini 1982 and Tuxen 1987. In Williams 1992, 18 of 88
  ICU stays for severe asthma had hypotension, and all 18 were ventilated. Strength: mechanism established; equal
  weighting is an estimate. The simulator caps auto-PEEP at 1.2 × the lung's
  base value, so it understates extreme hyperinflation.
- **Heart failure with high filling pressures (the edema lung) is the
  exception.** In De Hoyos 1995 (n=8, wedge ≥ 12), CPAP raised cardiac index
  from 2.47 to 2.91 to 3.12 at 0, 5 and 10 cmH₂O, by unloading the left
  ventricle. With a normal wedge, output fell instead. Not every patient
  responds (7 of 13 in Baratz 1992), so the model shows a responder.
  Arterial pressure did not change on CPAP or BiPAP in heart failure
  (Philip-Joet 1999, n=20). Strength: measured, but small studies. There
  are no data past 10, so the model holds output flat to 15 (estimate).
- **Blood pressure falls less than cardiac output,** because vascular
  resistance rises. The model passes on half the change, and pulse pressure
  follows stroke volume (estimate). For comparison, mean pressure stayed
  flat from PEEP 10 to 20 in ARDS patients who were given fluids to hold
  preload (Bruhn 2004, n=8). This patient gets no fluids.
- **The starting pressures are presets, not evidence.** For example,
  normal 120/75 and edema 160/95.

**Colours (guideline thresholds).**

- SpO₂: amber below the lung's floor and red 4 points under it. The floor is
  88% for ARDS and obstructive disease, where 88–92/95% is the accepted
  target, and 92% otherwise.
- Adult blood pressure: red when MAP < 65 (Surviving Sepsis 2021) or
  SBP < 90, and amber within 5 MAP or 10 SBP of those.
- Children: red when SBP < 70 + 2 × age (PALS hypotension; 70 under one
  year, 90 from ten years), and amber within 10 of it.

**Not modelled:** fluids, vasopressors, or a baroreflex beyond the
half-change. Also the effect of cardiac output on oxygenation, which cuts
both ways: lower output lowers mixed venous O₂ but also shrinks the shunt
(Dantzker 1980). And hypercapnia's effect on pressure, hemoglobin, and
altitude. Inspiratory pressure doesn't move the cardiac output; only PEEP
and auto-PEEP do, which matches how the studies were run.

**Speed:** the numbers drift to a change, with time constants of 20 s (O₂),
45 s (CO₂) and 10 s (blood pressure) of sim time. A real patient's CO₂
takes 10–20 minutes to settle, and recruitment can take longer, so this is
faster than life on purpose, so that a change can be watched.

**In the tutorial and the scenarios.** Level 1 and the Level 2–3
scenarios show the same panel. The picture and the vitals come from that
scenario's own patient. Each patient starts from the matching Free Play
lung and is tuned, inside the published ranges above, so the starting
settings reproduce the numbers on the scenario's monitor. A scenario whose
story says the CO₂ is rising starts at the story's value and drifts toward
what the settings produce, so it keeps rising until it's fixed. The
scenario's monitor is live too: its HR, SpO₂ and EtCO₂ start at the story's
numbers and follow the same patient as the lung view. Lanes the story
doesn't measure stay off, as on a real monitor, and the story's labs and
settings are captioned "On arrival". The graded chips stay in Free Play, so
they can't give the answer away.

**Heart rate.** HR changes from the story's value through three reflexes,
each measured against the patient's own starting numbers:

| Reflex | Model | Source | Strength |
|---|---|---|---|
| Hypoxia | +0.83 bpm per 1% fall in SaO₂, below 98% | Isocapnic hypoxia in awake healthy adults (Slutsky 1979, n=10) | Measured; may overstate it under deep sedation |
| Blood pressure | ΔHR = BRS × HR² ÷ 60000 per mmHg of MAP. BRS 3 ms/mmHg; 1 in septic shock | Under 6 ms/mmHg counts as baroreflex dysfunction; septic shock measured 0.3–1.7 | Ranges measured; the values chosen are estimates |
| CO₂ | +0.3 bpm per mmHg above 45 | In healthy people the small HR rise with CO₂ matched that of breathing harder alone | Weak; estimate |

Not modelled: Cushing's reflex, arrhythmias, drugs, pain, fever. The ECG
sweep re-times itself when HR moves 8 bpm or more.

**pH.** The panel shows pH under PaCO₂, from Henderson–Hasselbalch. Each
patient has a bicarbonate at PaCO₂ 40: 24 unless the story's pH says
otherwise, and 30 for the Free Play COPD lung, a chronic retainer
(estimate). Acute buffering moves it +1 per 10 mmHg rise in PaCO₂ and −2 per
10 mmHg fall (established rules of thumb). pH turns amber outside 7.30–7.50
and red below 7.20 or above 7.55: ARDSnet aims for 7.30–7.45, and permissive
hypercapnia accepts down to 7.20. Severe asthma draws its red line at 7.15:
reviews of controlled hypoventilation in status asthmaticus accept about
7.15–7.20 (expert opinion; the supporting data are case series), and on this
model's asthma patient a slowed rate cannot keep 7.20 without raising the
minute volume past the 10 L/min the readout itself grades as too much.

**Goals that grade the patient.** Where a case teaches a limit on the
patient, its goal checks that limit on the steady state the settings lead to,
from the same model the panel draws, not only the knob that gets there. COPD
needs I:E ≥ 1:4 *and* pH ≥ 7.20; status asthmaticus needs I:E ≥ 1:3,
plateau ≤ 30 *and* pH ≥ 7.15; the septic patient needs PaCO₂ 20–28 (the
pre-intubation 28, toward Winter's 21–26) at a Vt ≤ 560 mL. Before this, the
COPD goal passed rate 10 at pH 7.1, the asthma goal passed pH 7.0, and the
septic goal passed 12.6 L/min with PaCO₂ settling at 32. The guided readout
shows the pH or PaCO₂ the settings settle at.

**Goal met.** On a phone the learner is down at the knob when a goal is met,
a screen below the card's Confirm. So in guided play (the tutorial, Levels 2
and 7, and the academy missions) the scan window says GOAL MET (announced to
screen readers), a short chime plays, and a Confirm button appears at the
bottom of the screen while the card's own is out of view; it sits above the
knob dock when that is up. Level 3 is graded without live feedback, so it
gets none of this.

**The diagnosis question.** The right answer used to be the second choice in
22 of 24 questions and the longest in 23. The choices now come in a random
order each time, and they were rewritten so the right one is the longest in
only 2 of 24, about as long as the wrong ones on average (each wrong choice is
a real misconception, not filler).

**The first answer counts.** A wrong pick takes out only that choice and shows
a hint written for the case, pointing at the reasoning without naming the
answer; the right answer and the explanation stay hidden until the learner
finds it. It used to light up the right answer and show the explanation, so the
retry was a free click. Each case can earn two points, both on the first
attempt: the diagnosis right first time, and the settings — right on the first
submission in Scenarios and Level 3, or reached without revealing the target in
Levels 2 and 7 (the academy's practice links). The tutorial and the academy missions score the diagnosis only.
The score shows on the level's complete card and victory card, and the best is
kept on the chooser (with the completion, in `localStorage`).

**Level 2 gives the aim, not the numbers** (Levels 2, 3 and Troubleshooting
are off the menu now, but each still opens on its own from the academy's
module practice links, `?level=2`, `3` and `7`). Its goals (and the one
Troubleshooting goal with a number in it) say what to achieve — "recruit the
lung with PEEP, enough to open alveoli, not so much you drop the pressure" —
and leave the target to the learner. *Show the target numbers* reveals them,
at the cost of that case's settings point; the met goal and the confirmation
show them anyway, so the learner leaves knowing what they were. The tutorial
and the academy missions keep their numbers: they teach rather than test.

**The menu: Tutorial, Scenarios, Sandbox.** Power-on runs the self-test and
opens the menu. (The real LTV then asks SAME PATIENT?; in the game every
stage, case and test lung loads its own settings, so the answer never
mattered and the question is gone. How to Use still says what the real unit
asks and what protocol V-6 says to answer.) After the tutorial comes
**Scenarios**: five cases drawn from all fifteen — the clinical, advanced and
troubleshooting cases — in a random order, graded like Level 3 (submit, no
live green, no numbers up front), with three minutes on the clock for each.
(In the code this mode is still `startShift()`, level 8.) The clock waits
while the case intro is up, stops when the case is passed, and can be
switched off on the menu (*Clock*) for anyone who wants it untimed. Out of time, the case scores nothing and the debrief says what it
needed. Every case gets a new patient, so a remembered setting is not an
answer:

| What changes | How |
|---|---|
| Size | Sex and height (men 165–190 cm, women 160–180 cm) give a new predicted body weight (Devine/ARDSNet: 50 or 45.5 + 0.91 × (cm − 152.4)), about 52–84 kg. A PBW chip shows it |
| Starting breath | Scaled to keep the case's mL/kg |
| Lungs | Compliance and resistance each ×0.85–1.15 |
| CO₂ production | Scaled by weight^0.75 |
| Goals | Vt limits are per kg of this patient's PBW; minute-volume targets scale by weight^0.75 |
| Story | Every number the change moves (the starting minute volume, the Vt cap, the height) is rewritten to match; cases whose story says "he" stay male |

Two Troubleshooting cases quote exact pressures in their story (the 33/38
plateau and peak; the PIP before and after the tube was pulled back), so
they keep their patient. `test/ventshift.test.mjs` checks that across 30
seeds no variant of any case starts solved and every one can be solved, and
that each goal still means the same thing for the new patient. Building those
checks found that the herniation goal, graded on minute volume, passed
26 × 400 mL (PaCO₂ settling at 39) and 19 × 600 mL (27): at the same minute
volume a smaller breath is more dead space. It now grades the PaCO₂ itself,
30–35.

**Using it on a phone.** The controls sit well below the lung view, so a
learner turning a knob can't see the patient. When the vitals scroll off
screen, a small strip with the live SpO₂, EtCO₂ and BP pins to the top of
the screen; tapping it (a 44 px target) scrolls back to the lung. It never
covers the page header. On a narrow panel the phase
label shortens (INSP / EXP) so it shares a line with the volume. BP is a box
like the others, so the panel keeps one height as digits change. On a
390 × 664 phone, every Level 1–3 card's first button is on the first screen.

| Scenario | Picture | Tuned to the story | What the right answer does |
|---|---|---|---|
| L2 · Rising CO₂ | Normal | Post-op shunt 12% (estimate). PaCO₂ starts at 62 and climbs toward 72 | Rate 18 brings PaCO₂ to about 40 |
| L2 · ARDS hypoxemia | ARDS | Shunt 41% at PEEP 3, inside 32 ± 14% | PEEP 8–14 lifts SpO₂ 85 → 93–96; 100% oxygen alone reaches about 90; BP falls a little |
| L2 · COPD trapping | COPD | Shunt 11% plus 28% low V/Q; V̇CO₂ 220 for a patient fighting the vent (estimate). EtCO₂ climbs from 52; pH 7.30 (bicarbonate 32). Auto-PEEP about 8 on the starting settings | Rate 15 with Ti 0.65 gets auto-PEEP under 5 with pH above 7.20. Rate 10 opens the I:E just as well, but the pH falls to about 7.1, so the goal also asks for pH ≥ 7.20 and rate 10 fails |
| L2 · Fighting the vent | Normal | Shunt 12%; V̇CO₂ 210 | Gas exchange doesn't change; the fix is mechanical |
| L2 · Septic | ARDS (lung injury: SpO₂ 95 on 60%) | Shunt 25% at PEEP 8; V̇CO₂ 230 (sepsis, estimate); bicarbonate 10 (pH 7.18); BP 90/52, red (septic shock) | Left at 7.2 L/min, PaCO₂ heads to 55 and pH toward 7.0; MV 14+ holds PaCO₂ at 28 or below (Winter's). The goal is graded on that PaCO₂: 20–28 at a Vt ≤ 560 mL, so 12–13.5 L/min (PaCO₂ 29–32) no longer passes |
| L2 · Over-ventilated head injury | Normal | Healthy lungs at V̇CO₂ 200: the sending rate 24 × 450 mL settles at PaCO₂ 30, EtCO₂ 28, pH 7.49. BP judged by the Brain Trauma Foundation (SBP ≥ 110 at 15–49) | Rate 17–18 (14–15 at 500 mL) settles the EtCO₂ at 35–40, KC protocol V-6's TBI target |
| L2 · Shock on PEEP 12 | Normal (clear lungs) | Shunt 4%; alveolar dead space 12% (low output widens it: estimate), so EtCO₂ 35 against PaCO₂ 43. BP preset 86/49 at PEEP 5, which the usual PEEP–output curve puts at 82/48 on PEEP 12 | PEEP 3–5 (KC protocol V-6, shock) lifts the MAP only from 59 to 61–63 — the vent stops making it worse; the fix is blood |
| L3 · Ready to come down | Normal | Shunt 13%; V̇CO₂ 192; own PaCO₂ 42 | On CPAP/PS 5–8 the vitals hold |
| L3 · Status asthmaticus | Asthma | 25% low V/Q, set above Ballester's 10.5% for an intubated patient (estimate); V̇CO₂ 265 (β-agonists, work of breathing; estimate) | Slowing the rate cuts auto-PEEP and lifts BP; PaCO₂ rises (permissive hypercapnia). The goal holds the pH ≥ 7.15 (this patient's red line): rate 12 at 450 mL (pH ≈ 7.0) fails; rate 16, Ti 0.8, 550 mL (pH 7.18) passes |
| L3 · Severe ARDS | ARDS | Shunt 45% at PEEP 8, about half recruitable | PEEP 14 + FiO₂ 90% reaches SpO₂ 88+; oxygen alone falls short |
| L3 · Blown pupil | Normal | V̇CO₂ 225 (estimate) so PaCO₂ is 42 at 8 L/min | MV 10 gives EtCO₂ 30–35. BP is judged by the Brain Trauma Foundation (SBP ≥ 110 at 15–49), not MAP 65. The goal grades that PaCO₂ (30–35 once it settles) |
| L3 · Massive PE | Normal (airspaces clear) | Hypoxemia from V/Q mismatch, low mixed-venous O₂ and a possible PFO lumped as a 37% shunt that PEEP does not recruit, plus 5% low V/Q (estimates); alveolar dead space 30% of the breath (EtCO₂ 24 against PaCO₂ 41); compliance 40 (plateau 31 at 700 mL on PEEP 14); BP preset 91/55 at PEEP 5, 84/52 on PEEP 14 | Low PEEP, 7–8 mL/kg, rate 18–24 and FiO₂ ≥ about 80% settle SpO₂ ≥ 90 and PaCO₂ ≤ 48 (RV-protective thresholds: Mekontso Dessap 2016, extrapolated from ARDS; ESC 2019: low Vt, PEEP with caution). PEEP changes nothing for the SpO₂; a 6 mL/kg breath needs a rate near 34 to hold the CO₂ |

Three story numbers changed so the monitor and the physiology agree:

- **Rising CO₂:** SpO₂ went from 93% to 98%. The story says oxygenation is
  fine, and 93% on 50% would need a 27% shunt.
- **ARDS hypoxemia:** the starting rate went from 16 to 22. EtCO₂ 38 on
  6.4 L/min is impossible with ARDS dead space; at 22 it's 37.
- **Severe ARDS:** PaO₂ went from 41 to 47 and P/F from 59 to 67. SpO₂ 82%
  sits at PaO₂ 47 on the Severinghaus curve, and the case is still severe
  ARDS.

One scenario's mechanics changed. The COPD lung's auto-PEEP anchor went from
6 to 18, so the starting settings now trap about 8 cmH₂O instead of 2.6.
At 2.6 the lung view called the trapping minor, which contradicted the
story. Ventilated COPD measures 11.7 ± 4.0 cmH₂O at clinicians' settings (a
crossover study) and 10.5–13.1 on ZEEP (ERJ 1996).

**The tutorial's patient.** The tutorial used to run on the simulator's
generic lung (compliance 20, as stiff as ARDS). With live vitals that showed:

- Stage 4's "normal plateau" read 30.
- Stage 6's Pressure Control 12–20 gave PaCO₂ 100 and a red pH on the right
  answer.

It now uses the same healthy lung as Free Play (C 50, R 8), and two stages
were retuned to keep their lessons:

- **Stage 4** starts the High Pressure limit at 15, below this patient's PIP
  of about 19, so it still fires every breath.
- **Stage 6** asks for a delivered volume of 6–8 mL/kg (400–600 mL, about PC
  8–12 on healthy lungs) instead of a fixed PC 12–20. That is the stage's own
  lesson: in pressure control, watch the delivered volume.

The tutorial keeps one patient across its stages, so a misset High Pressure
limit in Stage 4 visibly drives the CO₂ up as it cuts breaths.

**Timing.** While the intro card, the level chooser, a victory card or the
boot screen covers the case, the vitals hold still, so a story's CO₂ doesn't
climb before the learner has seen it. They keep moving while the learner
works the Diagnose question, as a real patient would.

Limits: triggered breaths above the set rate aren't counted, and neither is
heart rate.

This is a teaching model, and it should be reviewed by the Medical Director
before it is used to teach.

### The LTV 1200 test lung readout

Under the picture, every reading is graded against the evidence for the lung
on the panel, not one "normal" range for all. Green on an ARDS lung dialled to
healthy-lung settings was false reassurance. Now each reading is green inside
that lung's target, amber where guidelines allow it but don't aim for it
(ARDS at 7 mL/kg, say), and red outside the evidence-based range. A line under
the chips says why each one is flagged, worst first, with its source and how
strong that source is. Where it can, it says how far to go: "on this lung that
means a breath of 375 mL (5.4 mL/kg) or less." To keep the card short on a
phone, that is folded to one line: the worst flag and a count, tap for the rest
and the colour key.

| Lung | Graded on |
|---|---|
| ARDS | Vt 4–6.5 mL/kg PBW (amber to 8) and plateau ≤ 30 (ATS 2017/2024, strong); driving pressure ≤ 15 (Amato 2015, observational); PEEP no lower than the ARDSnet table for the FiO₂ |
| COPD, asthma | I:E ≥ 1:4 (amber from 1:3), inspiratory flow 60–100 L/min, minute volume < 10 L/min, auto-PEEP < 5, applied PEEP 0–5; asthma plateau < 25 (amber to 30). Expert consensus and physiology, not trials |
| Normal, pneumonia, pulmonary edema | Vt 6–8 mL/kg PBW, plateau ≤ 30; PEEP 5–10 for pneumonia and edema |
| Children | PALICC-2: Vt 5–8 mL/kg (3–6 in pediatric ARDS), plateau ≤ 28, driving pressure ≤ 15; pediatric ARDS PEEP from the ARDSnet table (Khemani 2018) |

The adult test lungs are a 70 kg PBW patient, a man about 175 cm tall, so
tidal volume is graded per kg for adults too. PIP is red only when it reaches
the High Pressure limit, because the vent is then cutting the breath short;
otherwise a high peak with a normal plateau is airway resistance, not lung
injury. Spontaneous modes aren't graded, since the patient sets the rate and
the size of each breath and the readings are estimates. The targets live in
`tlTargetsFor()`, each with its source, and `test/ventscenarios.test.mjs`
checks them, including that fixing an ARDS lung the ARDSnet way turns it green.
During a 100% O₂ flush the PEEP grade, like every scenario goal, reads the
FiO₂ that is set, not the temporary 100%.

### The LTV 1200 test lung picture

Free Play (`vent-ltv1200.html?free`), the Level 1 tutorial and the Level 2
and 3 scenarios show a picture of the lung that fills and empties with every
breath, so the learner can see what the airway
pressure bar can't: whether the lung actually got the breath, and whether it
emptied before the next one.

**It runs on the simulator's clock, not one of its own.** The simulator only
modelled airway pressure, so the picture needed a volume: `lungVolumeAt()`
works it out from the same `simTime`, settings and lung mechanics as
`calcPressure()`. A separate animation timer would drift from the trace
within a few breaths, and a picture that disagrees with the numbers teaches
nothing.

- **Inspiration:** volume control fills at constant flow (the trace's linear
  ramp); pressure control and spontaneous breaths fill fast, then slower, on
  the lung's time constant τ = R × C. Delivered volume uses the readout's own
  estimates, so the picture and the chips agree.
- **Expiration** is passive on τ and ends at the gas still trapped, the
  displayed auto-PEEP × compliance. COPD and asthma that haven't had time to
  empty start the next breath partly inflated, while the pressure trace sits
  back at PEEP. That's the finding the picture is there to show.
- **The High Pressure limit** ends the breath where the pressure ramp meets
  it, as the LTV ends inspiration, and the view says how much got in. An
  inspiratory hold keeps the lung full for the hold.

The pose (end-expiration, part-filled, end-inspiration) is judged against a
normal-size breath for that patient, 7 mL/kg (70 kg for an adult test lung),
not against the set Vt. Judged against the set Vt, every breath would look
full, and a cut-short or trapped breath would look the same as a good one.
The 25% and 60% thresholds are display choices, not clinical ones.

The art is one atlas, `vent-sprites/lungs-atlas.png`: six conditions down
(normal, COPD, asthma, ARDS, pneumonia, pulmonary edema), three poses across.
One file means one download: every lung works offline once the page has been
opened.

**Drawing it smoothly.** The pack's part-filled pose turned out to be its full
pose at 50% over its rest pose, so the view stacks just those two and blends
them by volume, passing through exactly that frame and every point between.
Each outline is also stretched toward a box part-way between the rest and full
outlines (measured from the atlas when it loads), so the lung swells rather
than one outline ghosting in over the other. The blend follows the volume
exactly but never faster than empty-to-full in an eighth of a second, so
breathing is drawn with no lag while a jump in the clock (the rate changed
mid-breath, a hold ending) glides. Airflow is drawn in the trachea from the
slope of the same volume curve: chevrons stream in on inspiration and out on
expiration, faster with higher flow. Under reduced motion it is a plain blend,
with nothing stretching or streaming.

The spontaneous breathing in CPAP and NPPV used to take its phase from
`simTime % (current cycle length)` while the cycle length drifted. That jumps
by more with every breath already taken, so after a minute the pressure trace
ran backwards on one frame in six, and on most frames by five minutes.
`spontBreath()` counts breaths as the integral of the rate instead, which only
moves forward and is still a pure function of the clock.

`vent-sprites/build-atlas.py` builds the atlas from the art pack, either from
its overview sheet or, better, from the 1254 px originals. It also corrects
the pack. As delivered, asthma's full-inspiration pose was drawn in the COPD
style (dusky, no bronchospasm) and COPD's in the asthma style (bright, with
bronchospasm bands), so bronchospasm vanished at end-inspiration in asthma.
The script swaps the two back. It also replaces the inside of each full pose's
trachea with the rest pose's plain rings, because four of them had airflow
arrows drawn in, frozen in one direction for the whole breath (asthma's
pointed out of the lung at end-inspiration). The page draws airflow itself.
`test/ventlungview.test.mjs` checks that only asthma shows the bands, in
every pose, and that no trachea is whiter than its rest pose's. The infant with bronchiolitis borrows the asthma art, because
there is no bronchiolitis set and both are small-airway obstruction with
trapping.

Pneumonia and pulmonary edema were added as adult test lungs to use the art.
Their mechanics are teaching values placed between normal and ARDS: ventilated
compliance runs 50–100 mL/cmH₂O normally and about 39 in mild ARDS, and
LUNG SAFE's cardiogenic-edema patients ran driving pressures of 12–15 cmH₂O,
which puts compliance in the mid-30s. They are not measured values for any
patient.

`test/ventlungview.test.mjs` recomputes every breath independently and holds
the picture to it.

## Backend

Academy completions and Ask the Educator submissions can be mirrored to
Supabase so a CE record survives a lost or wiped phone. The app stays
offline-first: `localStorage` remains the source of truth for what a learner
sees, and writes that cannot go out are queued and retried on reconnect.

All five academies are covered — the four in the repo root plus the Ventilator
Training Academy. Caregiver Signature Form records go to the same place; the
PDF stays the deliverable and signature images are never uploaded.

Learners can optionally link an email, which turns a self-typed name into a
verified identity and lets their progress follow them to another device.

`educator-dashboard.html` shows completions (with CSV export), the Ask the
Educator inbox, and filed caregiver forms to approved educator accounts. It is
read-only: nothing there can edit or delete a record. Access is an allowlist in
the database, not a check in the page.

Setup lives in [`supabase/README.md`](supabase/README.md). Until a project is
configured the sync layer is an inert no-op and every page behaves as it did
before.

## Confidential — For Authorized AMR EMS Personnel Only

## Crew login
Every page loads `auth-gate.js` first, which shows a login screen asking for the same username and password crews use on the Toughbooks, with a hint saying so. A device stays logged in after the first success, and both the KC and Linn sites share the login (same `amr-kc-protocols.github.io` origin).

- The repo is public, so the password is **not** stored anywhere in it: only a slow one-way hash (PBKDF2-SHA256). To change the credentials, follow the comment at the top of `auth-gate.js` and copy the file to both repos.
- This keeps casual visitors out; it is not real security. The files (including the PDF) are still public on GitHub and can be opened by direct link.
- Local test servers (`localhost`, `127.0.0.1`) skip the screen so tests run unchanged.

- Not gated, because new hires and class attendees may not have Toughbook logins yet: `class-signin.html`, `orientation-exit-survey.html`, `immunization-forms.html`.
