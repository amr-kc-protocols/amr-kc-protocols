# Tests

These suites live here:

- **`kcb.test.mjs`** — pass-through & stress tests for
  [`kansas-class-builder.html`](../kansas-class-builder.html), driven through
  headless Chromium.
- **`backend.test.mjs`** — unit tests for the Supabase sync layer
  ([`amr-backend.js`](../amr-backend.js)). No browser and no network: the module
  is loaded against a fake `window` and a scripted Supabase, so the offline and
  failure paths can be exercised directly.
- **`sync.e2e.mjs`** — the same sync layer end-to-end, driving the real academy
  pages and the real Ask the Educator screen in headless Chromium against a
  scripted stand-in for Supabase.
- **`fitform.test.mjs`** — the Respirator Fit Test form in
  [`immunization-forms.html`](../immunization-forms.html), filled and signed in
  headless Chromium. jsPDF is stubbed (it loads from a blocked CDN here) but the
  calls it receives are captured, so the PDF's *content* is still asserted.
- **`tbform.test.mjs`** — the TB Risk & Symptom Assessment in
  [`immunization-forms.html`](../immunization-forms.html), which reproduces GMR
  SR100.21.1 Appendix A (Rev 02, 18 JUN 2025). It checks that every question on
  the sheet is on the screen in the sheet's own words, that Section III is
  *derived* from the answers rather than left as a box to tick — a "Yes"
  anywhere in Sections I or II means an evaluation is required, and getting
  that wrong is the one error on this form that changes what happens to the
  employee — and that the finished PDF is handed to the OS share sheet so it
  can be mailed or texted, falling back to a download where a browser cannot
  share a file. jsPDF and `navigator.share` are both stubbed; what they were
  handed is asserted.
- **`alaris.test.mjs`** — the Alaris IV pump training
  ([`alaris-pump.html`](../alaris-pump.html)) in headless Chromium: the topic
  menu, all nine topics, the quick checks spaced through each one, the tappable
  pump face, the alarm picker, and the handoff checklist with its
  `localStorage` round-trip. It also defends the things that make it usable on
  a phone on shift — no long paragraphs, no horizontal scroll, checks that are
  not all bunched at the end — and that the page is reachable from the homepage
  and precached, since training nobody can find, or can't open at a bedside
  with no signal, is the failure that matters most.
- **`medmath.test.mjs`** — the Medication Math training
  ([`med-math.html`](../med-math.html)) in headless Chromium. Beyond the usual
  UI behaviour, it defends the two things that make the page safe to learn
  from: every problem the practice widget generates is recomputed
  independently and compared against the answer the page grades on, and every
  dose, cap and concentration the page quotes is traced back to the formulary
  in `index.html` — so a protocol change fails the suite instead of quietly
  leaving last year's numbers in the training.

- **`abg.test.mjs`** — the ABG Interpretation practice page
  ([`abg-practice.html`](../abg-practice.html)) in headless Chromium. Every
  gas the generator produces is checked against the Henderson–Hasselbalch
  equation and graded by an independent classifier written in the test, so the
  page's answer key cannot quietly drift from the reference card. The twelve
  hand-written cases are held to the same standard, along with the anion gap,
  Winter's and P/F arithmetic they quote. It also drives the guided practice,
  speed round, learn cards and cases end to end, at 320px and with storage
  blocked, and checks the page is listed in More and precached.

- **`aemt.test.mjs`** — the AEMT Series Phase 1 engine
  ([`aemt-series.html`](../aemt-series.html)), built to the Clinical Education
  build framework for Chapters 1–4. Nothing is stubbed: it drives the real page
  against the real seed content and the real vendored FSRS build, because the
  whole point of Phase 1 is that the engine works, and a test that mocks the
  scheduler tests nothing. It covers all seven NREMT item types rendering and
  scoring dichotomously, the fixed seven-step block sequence with its deferred
  pretest feedback, the three scheduler overrides FSRS does not handle
  (confidently-wrong re-queue, course-date anchor, 45-day lapse floor), the
  four-part mastery rule, and the two things this product must never do —
  merge completion into mastery, or make a learner drag something to answer.

  From Chapter 5 onward it also covers authored content: that an authored
  chapter supersedes its placeholder rather than sitting beside it, that the
  home screen states plainly what the app is and which chapters are written,
  that every objective names the decision it enables, that no item traces to
  the textbook, and that the Chapter 5.6 safety answers are right — U, IU and
  MS prohibited, leading zero required, trailing zero not. Structural
  conformance to the framework (screen counts, word budgets, quiz composition,
  item-writing rules) is enforced when the chapter file is built, so a block
  that drifts out of spec fails the build rather than the suite.

  It also covers the v1.1 additions for Chapters 5–9: the `tier` valve that
  keeps context and reference objectives out of the queue, lab gates (an
  objective carried by a lab-gated block stops at practicing until an
  instructor signs the checklist, and the app never claims the skill is done),
  term cards in all three modes with their fuzzy matching, `hotspot` and
  `label_drag`, the declared book-versus-evidence divergence, and the v1→v2
  migration that keeps a Phase 1 learner's saved progress working.

- **`homepage.test.mjs`** — the homepage ([`index.html`](../index.html)) in
  headless Chromium at four screen sizes, two of them Toughbook resolutions.
  Defends the two things the revamp changed: that the sign-in is gone from the
  markup *and* the source (no endpoint left to post a name to), and that the
  layout becomes a real grid on a wide screen instead of stretching the phone
  column edge to edge.

- **`lifepak.test.mjs`** — the LIFEPAK 15 station
  ([`lifepak-15.html`](../lifepak-15.html)) in headless Chromium: the whole
  item bank played correctly, every wrong answer it is meant to catch, pacing
  capture, the teaching cards, and the layout at five phone sizes. Four things
  it defends harder than the rest, because each would be silently wrong rather
  than visibly broken: that driving the whole therapy set through the unit
  moves **not one field of the patient**; that **every item in the bank can
  actually be answered** on the keys that are on the page; that **nothing
  scrolls** at any phone size in either step; and that every control clears
  44pt **by hit-testing the page**, since the rocker arrows are 39px boxes
  whose real target is a pseudo-element larger on each side. S19 holds the
  fixes from an audit that found defects with every other check green:
  replaying a run, RESTART mid-step, learn mode and the keyboard on the
  pointer-driven keys, SYNC landing on a sensed QRS, pacing after capture and
  in PEA, and the sound switch. S20 holds the tracings to the published
  figures — QRS, QT, AF response, sweep window — measured as a clinician
  would measure them. S21 covers SYNC mid-charge, a shock before naming,
  pacing below the patient's own rate, and the SYNC waiting cue.

- **`ventlungview.test.mjs`** — the lung picture in the LTV 1200's Free Play
  test lung ([`vent-ltv1200.html?free`](../vent-ltv1200.html)) in headless
  Chromium. The picture is only worth having if it tells the truth about the
  breath, so the suite recomputes the volume itself and holds the page to it:
  constant-flow filling to the set Vt, emptying on τ = R × C, expiration ending
  at auto-PEEP × compliance in an obstructed lung, a breath cut where the
  pressure ramp meets the High Pressure limit, pressure control filling to the
  readout's own PC × compliance, and the inspiratory hold. It also checks that
  the volume is a pure function of the simulator's clock, so the picture
  cannot drift from the trace, that the view is one node that survives every
  re-render, that the atlas has a lung in every cell and nothing in its
  gutters, and that it fits a 320px phone. It recomputes the SpO₂ and EtCO₂
  too: PaCO₂ from the alveolar ventilation equation, a wider PaCO₂–EtCO₂ gap
  in ARDS, oxygen masking hypoventilation that room air reveals, PEEP opening
  an ARDS shunt that oxygen barely touches, COPD answering to oxygen, high
  PEEP backfiring in one-sided pneumonia, the Severinghaus curve, and the
  numbers drifting to a change rather than jumping. It checks the ARDS shunt
  and dead space against inert-gas data (1985), Florio 2024 and Nuckton 2002. It
  recomputes the blood pressure from the published cardiac-output numbers:
  PEEP and auto-PEEP lower it (Auler 2000, Luo 2024), while CPAP in
  high-filling-pressure heart failure raises output without dropping pressure
  (De Hoyos 1995). It also checks that the pressure turns amber and red by
  the Surviving Sepsis MAP target, and by PALS thresholds for children. It checks the lung view in the tutorial and in every Level 2–3
  scenario. Each one's vitals start at its monitor's numbers, and its starting
  settings hold them there, or let the CO₂ keep climbing where the story says
  it is. Each correct answer moves the vitals the way the evidence says (PEEP
  for a shunt, permissive hypercapnia for trapping, Winter's formula for
  sepsis, ETCO₂ 30–35 for herniation), and Level 7 has no lung view. L19 checks
  usability on a phone: every Level 1–3 card's first button is on the first
  screen, the scenario monitor is labelled as the on-arrival snapshot, the
  live vitals strip follows the learner to the controls and taps back to the
  lung, the panel keeps one height as digits change, COPD trapping is worded
  by size, and a pH under 7.20 shows red. It also checks that the strip
  stays off the header, that the vitals hold still while the intro is open,
  and that the tutorial keeps one healthy-lung patient across its stages:
  every stage's answer meets its goal, a misset High Pressure limit drives
  the CO₂ up, and Pressure Control 10 delivers 500 mL. L20 checks the live
  scenario monitor: every Level 2–3 monitor starts at its story's HR, SpO₂
  and EtCO₂; after PEEP 10 in ARDS its SpO₂ matches the lung view and HR
  falls by the published reflex gains (recomputed independently); a septic
  patient left alone shows EtCO₂ climbing and HR edging up; and the ECG sweep
  keeps pace with the rate.

- **`ventscenarios.test.mjs`** — the answers the LTV 1200's clinical scenarios
  grade as correct. Each scenario's `goal.check()` is the therapy the
  simulator teaches, so the suite holds them to the evidence: no scenario is
  solved by its own starting settings; septic shock must match the
  pre-intubation drive (Winter's formula, not a PaCO₂ allowed to rise above
  the patient's own); severe ARDS pairs FiO₂ 0.9 with PEEP ≥ 14 (ARDSnet);
  herniation hyperventilation lands at PaCO₂ 30–35 and an overshoot to ~25
  fails; the weaning screen doesn't depend on RSBI (AARC 2024); and a
  one-sided pneumonia doesn't reward high PEEP. Each corrected scenario keeps
  a case for its old answer, which must now fail. It also checks the Free Play
  readout's grading: a healthy lung on healthy settings is all green; ARDS on
  those settings is not (driving pressure red, 7 mL/kg amber), and fixing it
  the ARDSnet way turns it green; obstructive lungs want I:E ≥ 1:4, flow ≥ 60
  and minute volume < 10; PEEP follows the ARDSnet table for the FiO₂; the
  driving pressure and plateau are recomputed in the test; and every flag
  carries a reason and a source.
  Goals that teach a limit on the patient are held to it (S10): COPD needs
  pH ≥ 7.20 as well as I:E ≥ 1:4, status asthmaticus pH ≥ 7.15, and the
  septic patient a PaCO₂ of 20–28 — with the pH recomputed in the test from
  the page's PaCO₂, and the old answers that broke those limits (COPD at rate
  10, asthma at pH 7.0, sepsis at 13.5 L/min) kept as cases that must fail.
  The diagnosis can't be won by a cue (S11), by the same standard as Chart
  Rx: the right answer is the longest choice in at most a third of the
  questions and as long as the wrong ones on average, and on screen the
  choices come in a random order with the right one landing in every slot.
  The first answer counts (S12): a wrong pick takes out only that choice and
  shows the case's hint, never the answer or the explanation, and a miss stays
  a miss in the level score; all 24 have a hint and none repeats its answer.
  Level 2 gives the aim, not the numbers (S13): no aim carries a target or a
  unit, and revealing the target costs the case's settings point. Herniation
  is graded on the PaCO₂ it settles at (S4): 26 × 400 mL and 19 × 600 mL,
  which the old minute-volume goal passed, now fail.
  The three cases written to the KC protocol (V-6) are held to it (S14): a
  head injury left hyperventilated passes exactly where the EtCO₂, recomputed
  with the alveolar ventilation equation, settles at 35–40; shock after
  intubation passes at PEEP 3–5, which lifts the MAP only a few mmHg; and a
  massive PE passes on low PEEP, a protective breath, oxygen and enough rate,
  while PEEP 10, room-level oxygen, a 10 mL/kg breath or a small breath that
  lets the dead-space CO₂ climb all fail. Each story's numbers are what its
  starting settings give.

- **`ventpanel.test.mjs`** — the LTV 1200's panel and level engine
  ([`vent-ltv1200.html`](../vent-ltv1200.html)), one check per bug found and
  fixed there. On/Standby only counts a press that started on the key (moving
  the mouse across it used to power the vent up, and a click then a mouse move
  ran the self-test twice), and it works from the keyboard. The 100% O₂ flush
  ends when a case, level or lung loads or the vent powers off (it used to
  revert 20 s later onto the next case's FiO₂), turning O₂% during a flush
  keeps the dialled value, and no goal or ARDSnet grade is passed by the
  flush's temporary 100%. Leaving an academy mission for a level leaves
  academy mode, so Level 3 is assessed and a finished level still saves
  progress. A deep link to a case that doesn't exist opens the level chooser.
  The teaching card's −/+ obey Control Lock and Standby and show values as the
  windows do (IPAP in NPPV, OFF). The inspiratory-time cap is checked at every
  rate from 1 to 80 against both of its limits (no more inverse than 4:1, at
  least 0.3 s to exhale); rounding to the nearest 0.1 s used to break them.
  Every teaching card's range matches its dial, and Control Lock confirms a
  flashing mode preview instead of letting it commit later on a locked panel.
  On a phone, a met goal reaches the learner at the knob (P13): GOAL MET in
  the scan window, announced, and a Confirm button on screen while the card's
  own is out of view — never before the diagnosis or in graded Level 3, and
  above the knob dock rather than on it. The menu has three ways in (P14):
  Tutorial, Scenarios and Sandbox; power-on goes from the self-test straight
  to it with no SAME PATIENT question, the tutorial leads on to Scenarios,
  and the academy's `?level=2/3/7` links still open their tracks.

- **`ventshift.test.mjs`** — the LTV 1200's Scenarios mode ("shift" in the code)
  ([`vent-ltv1200.html?level=8`](../vent-ltv1200.html)): five cases from
  Levels 2, 3 and Troubleshooting, each with a new patient, graded like
  Level 3 against a per-case clock. A random patient is only worth having if
  every one it can produce is a fair case, so it checks, across 30 seeds and
  all 12 cases, that no variant starts solved and every one can be solved;
  that each goal still means the same thing for the new patient (the Vt cap is
  8 mL/kg of a PBW recomputed here from sex and height; herniation lands the
  PaCO₂ at 30–35; the septic PaCO₂ is 20–28); and that the story matches the
  patient (a PBW chip, the starting minute volume and Vt cap rewritten, the
  "he" cases male, the two pressure-quoting cases untouched). It plays a
  shift: same seed, same shift; the clock waits for the intro, runs during the
  case, stops on a pass; out of time scores nothing and shows a debrief; the
  results and best score show; the clock can be switched off and remembers;
  and on a 320 px phone the clock never takes a tap or covers the knob dock.

All test data is synthetic — no real roster, learner, or evaluation data is committed.

## Run

```bash
cd test
npm install
npx playwright install chromium   # first time only, if Chromium isn't already present
npm test                          # all of them
```

`backend.test.mjs` has no dependencies, so it runs on its own without `npm install`:

```bash
node backend.test.mjs
```

`npm test` exits non-zero if any check fails, so it can gate CI.

### Browser resolution

The harness picks a Chromium in this order:

1. `CHROMIUM_PATH` environment variable, if set (e.g. `CHROMIUM_PATH=/path/to/chrome npm test`);
2. this container's pre-installed Chromium (`/opt/pw-browsers/chromium-1194/...`);
3. Playwright's own managed browser (`npx playwright install chromium`).

## What's covered (`kcb.test.mjs`)

| # | Scenario |
|---|----------|
| S1 | Minimal happy path — page count, hours auto-fill |
| S2 | Required-field validation blocks generation + highlights fields |
| S3 | Very long strings (title/location/instructor/objectives/students) |
| S4 | Special characters, HTML-injection input, and emoji (must not crash) |
| S5 | >18 students via Excel paste — overflow kept & warned, first 18 print |
| S6 | Malformed / single-column roster pastes |
| S7 | Evaluation-result pastes → summary (header-only, ratings, scales, yes/no, comments) |
| S8 | Time crossing midnight |
| S9 | Category-hours mismatch fix button |
| S10 | Course presets load / save / delete |
| S11 | Autosave round-trip of the student-record model |
| S12 | `evalCount` extreme value capped at 50 |
| S13 | Every competency selected |
| S14 | Reset keeps sticky fields (instructor / email / location) |
| S15 | Generate → edit → regenerate |

## What's covered (`backend.test.mjs`)

Grouped by the property being defended:

| Area | Checks |
|------|--------|
| Auth | Anonymous sign-in on first use; expired token triggers refresh then retries; a dead refresh token re-signs in; a *transient* refresh failure keeps the existing identity rather than orphaning history |
| Payload | `user_id` comes from the session, never the caller; module flags normalised; `modules_total` derived; over-long messages truncated to the column limit |
| Offline | Failed writes queue instead of vanishing; the queue drains on reconnect; `flush()` is a no-op while offline and keeps its items |
| Retry policy | 4xx dropped (never retried forever); 5xx and 429 queued; items abandoned after the attempt cap |
| Queue safety | Academy pushes for one course collapse to the newest; Ask messages never collapse; the outbox is capped so it cannot exhaust the storage quota |
| Degradation | With no URL/key configured, every call is a silent no-op |
| Educator auth | Password sign-in stores its session on a **separate** key, so signing in as educator cannot clobber a learner's anonymous identity in the same browser — and signing out cannot take it with them; an expired educator session asks for re-login rather than silently becoming an anonymous user |
| Educator reads | Queries request the right columns and ordering and use the educator token; a non-educator gets zero rows rather than an error; the Ask inbox never requests the submitter's account email |
| Educator verify | `verify()` asks the database via `is_educator()` rather than trusting the client; a signed-in but non-allowlisted account verifies as **not** an educator; an unreachable server never reads as authorised |
| Caregiver forms | Signature images **never** reach the server; blank crew slots are dropped; a form with no case number is refused before the network; an offline form queues and two forms never collapse into one; a rejected form is reported rather than swallowed |

## What's covered (`sync.e2e.mjs`)

| Area | Checks |
|------|--------|
| All four academies | Page loads clean; progress produces an upsert with the right `course_id`, conflict target, learner name, module state, and server-derived `user_id`; 20 rapid saves collapse to one push |
| Offline durability | A passing record made offline is queued on the device, survives intact, and drains on reconnect |
| Degradation | With no backend configured: no errors, no requests, and `localStorage` progress still saved |
| Ask the Educator | The `100% Anonymous` claim is gone and the honest wording is in place; the message, reply email, `user_id`, and source all reach Supabase; no Apps Script call remains |
| Ask failure handling | A rejected message does **not** show "Message Sent" — the reason is surfaced and the button re-enables |
| Ask offline | The message is held on the device and the confirmation says so plainly |
| Email linking | The prompt appears only when a backend is configured, never blocks the module list, PUTs the typed address, and says to check the inbox rather than claiming the link is already done |
| Dashboard access | The sign-in gate comes first and no data renders before it; a wrong password keeps the dashboard closed and explains why; signing out clears the stored session and survives a reload |
| Dashboard rendering | Completions render with humanised course names, module counts and status pills; a verified email is shown and an **unlinked** record is visibly flagged rather than left blank; filters (course, status, search on name *and* email) and two-way column sorting work |
| Dashboard honesty | An educator who is not on the allowlist sees an explanation, not a bare empty table that reads as "nobody has done anything" |
| Dashboard escaping | A message containing `<img src=x onerror=...>` renders as visible text — no element is created and no dialog fires |
| VTA academy | Loads clean and resolves `../amr-backend.js` from its subdirectory; VTA's richer state flattens correctly onto the shared shape (quiz and exam scores as percentages, all nine modules); credential and certificate id ride in `meta`; `completed_at` is the certificate issue date; the certificate link prompt PUTs the address; the certificate disclaimer no longer claims records are browser-only |
| Caregiver Form end-to-end | The record reaches Supabase with no signature in the payload; a **failed filing does not retract the PDF confirmation** and says so; offline holds the record on the device |
| Dashboard CSV | Exports what is on screen with the verified email and VTA credential; a learner name shaped like `=cmd\|...` is prefixed so a spreadsheet treats it as text, not a formula |
| VTA admin unlock | No password constant or `?admin` bypass survives in the source; an allowlisted educator unlocks and locked modules become reachable; **valid credentials that are not allowlisted do not unlock**; a wrong password is explained and leaves admin off |

## What's covered (`fitform.test.mjs`)

| Area | Checks |
|------|--------|
| Fidelity to SR-100.03.1 | The medical-clearance warning, OSHA 29 CFR 1910.134 Appendix A certification, employee acknowledgment, GMR training attestation and Ninth Brain upload notice all render; solution options are Bitrex/Saccharin and Smoke; result is Pass/Fail; all six sizes offered; revision and effective date cited |
| Validation | An empty form produces **no PDF**; missing clearance date, job title, training attestation, employee signature and administrator signature are each refused with a specific message |
| Output | A completed form saves a PDF named for the employee and date, with **both** signatures drawn in, and every field plus the OSHA and Ninth Brain text carried into it |
| Regression | The other three forms still open, and the page throws no errors throughout |

## What's covered (`alaris.test.mjs`)

| # | Scenario |
|---|----------|
| A1 | Nine topics on the menu, every one phrased as a question, every one opens with real content |
| A2 | Every topic carries a quick check, and in a multi-check topic a check lands mid-topic with content after it — not stacked at the end |
| A3 | Answering marks right/wrong, reveals the explanation, locks the question, completes the topic and persists |
| A4 | A topic counts as done only once *all* its checks are answered |
| A5 | All 15 checks: four options each, exactly one correct, each explains itself; finishing them completes the course |
| A6 | Every one of the 11 pump-face controls has its own plain-language detail plus a "watch for", and only one highlights |
| A7 | The alarm picker: 11 alarms, opening independently, each with what it means and at least two steps to take |
| A8 | Handoff checklist counts, unchecks, survives a reload and resets |
| A9 | Next buttons walk the whole course in order and the last one returns to the menu |
| A10 | Works with `localStorage` throwing (private browsing); every control is a real button and works from a keyboard |
| A11 | Reads on a phone: no horizontal overflow on any topic, and no paragraph longer than 55 words |
| A12 | Reachable from the homepage feature card and the More list, and precached by the service worker |

## What's covered (`medmath.test.mjs`)

| # | Scenario |
|---|----------|
| M1 | Eight topics, every one phrased as a question, every one opens with real content |
| M2 | Every topic carries a quick check, and checks land mid-topic with content after them |
| M3 | Answering marks right/wrong, explains, locks, completes the topic and persists |
| M4 | A topic counts as done only once *all* its checks are answered |
| M5 | All 13 checks: four options, exactly one correct, each explains itself |
| M6 | **The math** — 160 generated problems recomputed independently and matched against what the page grades on |
| M7 | Practice grades right and wrong, shows the working either way, accepts sensible rounding, rejects a ten-fold slip, ignores an empty answer |
| M8 | Practice score persists; Enter submits from the number pad |
| M9 | **Protocol provenance** — every dose, cap and concentration still matches the formulary in `index.html` |
| M10 | Phone-first: no overflow, no paragraph over 55 words, real buttons, keyboard-operable, survives blocked storage |
| M11 | Reachable from the home tile and the More list, and precached by the service worker |

## What's covered (`homepage.test.mjs`)

| # | Scenario |
|---|----------|
| H1 | No name field, employee number, save button or sign-in copy anywhere on the page |
| H2 | The profile code is gone from the source too — including the Apps Script endpoint it POSTed names to, and the `amrkc_profile` storage key |
| H3 | The masthead renders and names the guide, the year and the medical director — and carries **no** inventory counts, staying compact enough to keep the trainings on the first screen |
| H4 | Four screen sizes (1366, 1024, 820, 390): no sideways scroll anywhere; multi-column grids above 760px; content capped at 1180px and actually capped on a wider screen; still two-up on a phone |
| H5 | The two featured trainings share a row on a Toughbook and stack on a phone |
| H6 | Both trainings and all six quick actions are one tap away, and search still returns results |
| H7 | Cache version bumped and the homepage still precached, so installed devices get it |

## What's covered (`lifepak.test.mjs`)

| # | Scenario |
|---|----------|
| S1 | It opens as one thing: a run going, the unit off, and the first thing asked is to switch it on. Nothing left of the case engine's overlays |
| S2 | **The boundary** — SYNC, energy, charge, shock, pacer and rate driven through the unit with the station's writer stubbed out, and no field of the patient moves. Pinned to sinus rhythm, because a synchronized shock waits for a QRS |
| S3 | **Every item is answerable** — the whole bank named and treated correctly, all four therapies exercised, ending in a summary that scores both questions per rhythm |
| S4 | The wrong answers: defibrillating asystole, pacing asystole, an unsynchronized shock on an unstable tachycardia, SYNC armed on VF, declining to shock VF, shocking a normal sinus rhythm — each caught, each told what it should have been |
| S5 | A wrong name is marked, the right one revealed, the miss recorded, and the item moves on to its therapy anyway |
| S6 | Pacing answers the current: spikes without capture are not an answer, 60 mA is below threshold, 70 captures at the rate dialled in |
| S7 | **Nothing scrolls** — five phones, checked before the run, on the naming step, on the therapy step and with the verdict up; and every control clears 44pt by real hit area |
| S8 | A whole item played by **tapping** on two landscape phones, every tap landing on the key it aimed at |
| S9 | Portrait says to turn the phone, the unit is `inert` behind the notice so the keyboard cannot reach SHOCK, and nothing scrolls there either |
| S10 | A teaching card for every key on the page and none for a key that was dropped; learn mode opens the card instead of firing the key |
| S11 | Nothing that answers or distracts from the question is on the page — ANALYZE included — and the 12-lead renderer and code summary went with the keys that reached them |
| S12 | The numbers against the LIFEPAK 15 documentation and the 2025 AHA guidelines, including the split on doses: no figure quoted for defibrillation, where the AHA defers to the manufacturer, and the 200 J-or-more figure carried for cardioverting AF or flutter, where it does not |
| S13 | The bank's clinical shape: at least one rhythm with more than one right answer, VT with three, every item explaining itself and giving the context the answer turns on |
| S14 | A best score survives a reload; the station runs with `localStorage` throwing |
| S15 | `?item=` pins the bank to one rhythm, for putting a particular one on the screen |
| S16 | Reachable from the field guide, the copy describes the station rather than the old case engine, and the cache version is bumped |
| S17 | **The tracings carry the finding the item asks about** — QRS width the same at 45/min as at 150, VT and a paced beat wide where SVT and a junctional escape are narrow, AF irregularly irregular where sinus is regular, flutter with no isoelectric baseline, complete heart block with more P waves than QRS and not a multiple of them, VF never at baseline |
| S18 | **A laptop** — four desktop viewports including a 4:3 Toughbook and a half-screen window, and a whole item played with a mouse rather than a finger. Every other scenario runs at 844x390 with touch emulation on, so laptop use was being assumed rather than tested |
| S19 | **Regressions from the station audit** — Run it again and RESTART take the summary down and leave the unit reachable, a one-rhythm link neither sets the best score nor reads "1 rhythms … 0 min", RESTART inside the pause after naming no longer wedges the new run, learn mode reads ON and SHOCK instead of firing them, ON and SHOCK work from the keyboard, a synchronized shock is withheld in asystole and lands within a frame of a sensed QRS on SVT, pacing PEA gives no pressure, capture follows RATE, PAUSE and the pacer switch after the verdict, a pacer set up while naming is answered, Sound off silences the unit, Ctrl+F is left to the browser, and the flutter rate matches its 2:1 trace |
| S20 | **The tracings against the references**, measured the way a clinician measures them (onset to J, onset to T end, at 2% and 5% of the R). Narrow QRS 80–110 ms at every rate (2009 AHA/ACCF/HRS). QT within 25 ms of Fridericia at a QTc of 400 from 36/min to 212/min. T wave about a fifth of the R. Every ventricular complex 150 ms or wider, with VT no narrower at 188/min than at 146. Mobitz II conducted with a bundle branch block. AF's shortest R-R over 270 ms in ten minutes, CV 0.15–0.30, no step where an early beat lands, f-waves at 350–600/min and no isoelectric stretch. Every rhythm drawn at the rate the screen shows. The monitor's noise under 0.05 mV and kept out of the patient's signal. Five seconds of ECG on every screen with a channel of 300 px or more, and at least 60 px/s on an iPhone SE. R waves drawn to one height on a phone, read off the canvas |
| S21 | Arming SYNC mid-charge discards the charge. A shock before naming is not an answer and the station says so, while one in the pause after naming counts. Pacing below the patient's own rate does not capture: normal sinus stays at 78 and is still graded wrong, and Mobitz II waits for a rate above 42, then loses capture when turned back down. SYNC waiting on asystole is cued after two seconds and again on a second press, above the screen and without naming the rhythm, with nothing delivered. On SVT there is no cue and the shock goes |
