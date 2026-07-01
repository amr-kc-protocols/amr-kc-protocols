# Kansas Class Builder — tests

Automated pass-through & stress tests for [`kansas-class-builder.html`](../kansas-class-builder.html).
They launch the real page in headless Chromium, exercise the happy path plus
edge/stress cases, and assert that every generated packet parses as a valid PDF
with **zero console errors**.

All test data is synthetic — no real roster or evaluation data is committed.

## Run

```bash
cd test
npm install
npx playwright install chromium   # first time only, if Chromium isn't already present
npm test
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

When you change the tool, run `npm test` and add a scenario for any new behaviour.
