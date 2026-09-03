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
- **`lifepak-15.html`** — the LIFEPAK 15 monitor/defibrillator: the whole unit,
  with defibrillation, synchronized cardioversion, transcutaneous pacing,
  12-lead acquisition and the code summary. Three levels — a walkthrough of
  every control, seven clinical cases with coaching, and three multi-phase
  assessments — plus free play and a teaching card behind every control.

The LIFEPAK's unit is ported from the CES simulator, where it is half of a
two-window system: a facilitator drives the patient from a control panel and
the monitor never writes a field of patient state. There is no facilitator
here, so the trainer in the page plays one — and it plays one in a
facilitator's place. The crew own the device (energy, charge, lead, pacing
rate and current, alarms, shocks); the patient answers to the trainer, on the
event a press generated. So a shock is charged, delivered, announced and
logged and the rhythm does not move until the case moves it. `test/lifepak.test.mjs`
drives a whole resuscitation through the unit and asserts that not one field
of the patient changed.

The clinical shape of the assessment cases follows the ACLS algorithms. They
are deliberately **not** the AHA Megacode Testing Checklist — that is a
published, copyrighted instrument, and grading against an unapproved copy of
it would be worse than not grading at all. A run records what the learner did
at the unit and when, which is what a debrief is read from.

### On a phone

Most people open this on a phone, and the replica cannot serve them as drawn:
it is a fixed 1083x704 chassis fitted with a single scale factor, which on a
phone is 0.49. Measured across an iPhone SE, 12, 14 Pro Max, Pixel 7 and a
360px Android, **26 of 27 controls came out under Apple's 44pt minimum in
landscape on every one of them**, at a median of 21-26pt, with the smallest
silkscreen at 8px — and portrait, which is how a phone is held, showed a
prompt to turn it sideways into that.

So below the scale where the chassis can still hold a 44pt control, the unit
is **laid out rather than scaled**: the monitor sticks to the top of the
screen while the controls scroll under it, in the manufacturer's own areas,
at 56px. Held sideways it becomes two columns, monitor beside controls,
because a phone in landscape has width to spare and no height at all.

What that gives up is the millimetre geography — where a key sits relative to
its neighbours — and that is a real loss, because it is half of what a crew
learns from a replica. What it keeps is everything that survives: the same
keys with the same names, the manufacturer's control areas in their own
groups, the numbered 1-2-3 therapy path, and the screen reading as it does on
the unit. A control geography nobody can hit teaches less than a grouping they
can work. Above that scale — every iPad, every laptop — the replica is drawn
exactly as before.

The DOM is identical in both layouts, so there is one device and one set of
behaviours to reason about; only the CSS differs.

LIFEPAK is a trademark of Stryker. This is a training simulation and is not a
medical device.

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
