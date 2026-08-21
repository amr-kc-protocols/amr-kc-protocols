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

When you change either tool, run `npm test` and add a scenario for any new behaviour.

The database side is tested separately — see [`../supabase/tests`](../supabase/tests).
