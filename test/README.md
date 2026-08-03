# Tests

Two suites live here:

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

All test data is synthetic — no real roster, learner, or evaluation data is committed.

## Run

```bash
cd test
npm install
npx playwright install chromium   # first time only, if Chromium isn't already present
npm test                          # both suites
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

## What's covered (`sync.e2e.mjs`)

| Area | Checks |
|------|--------|
| All four academies | Page loads clean; progress produces an upsert with the right `course_id`, conflict target, learner name, module state, and server-derived `user_id`; 20 rapid saves collapse to one push |
| Offline durability | A passing record made offline is queued on the device, survives intact, and drains on reconnect |
| Degradation | With no backend configured: no errors, no requests, and `localStorage` progress still saved |
| Ask the Educator | The `100% Anonymous` claim is gone and the honest wording is in place; the message, reply email, `user_id`, and source all reach Supabase; no Apps Script call remains |
| Ask failure handling | A rejected message does **not** show "Message Sent" — the reason is surfaced and the button re-enables |
| Ask offline | The message is held on the device and the confirmation says so plainly |

When you change either tool, run `npm test` and add a scenario for any new behaviour.

The database side is tested separately — see [`../supabase/tests`](../supabase/tests).
