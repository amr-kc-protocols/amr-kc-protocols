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

## Backend

Academy completions and Ask the Educator submissions can be mirrored to
Supabase so a CE record survives a lost or wiped phone. The app stays
offline-first: `localStorage` remains the source of truth for what a learner
sees, and writes that cannot go out are queued and retried on reconnect.

Learners can optionally link an email, which turns a self-typed name into a
verified identity and lets their progress follow them to another device.

`educator-dashboard.html` shows completions and the Ask the Educator inbox to
approved educator accounts. It is read-only: nothing there can edit or delete
a record. Access is an allowlist in the database, not a check in the page.

Setup lives in [`supabase/README.md`](supabase/README.md). Until a project is
configured the sync layer is an inert no-op and every page behaves as it did
before.

## Confidential — For Authorized AMR EMS Personnel Only
