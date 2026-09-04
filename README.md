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
- 21-drug Formulary with full dosing by route and age
- 11 Procedure Cards
- Reference: Vital targets, Pediatric dosing calculator, LTV 1200 alarms, GCS, Cincinnati Stroke Scale, Broselow, Rule of Nines, APGAR

## Simulators

Two interactive trainers, both single self-contained pages, both reachable
from the home screen.

- **`vent-ltv1200.html`** — the LTV 1200 transport ventilator.
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
taught as ineffective, which is what the 2025 evidence review concluded; SYNC
ruled out for VF and pulseless VT; and **no fixed joule figure quoted as
though the AHA still set one** — the 2025 guidelines stopped naming
defibrillation and cardioversion doses and defer to the manufacturer.

LIFEPAK is a trademark of Stryker. This is a training simulation and is not a
medical device. Nothing here has been through clinical review by the Medical
Director; it is checked against published sources, which is not the same
thing.

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
