# Supabase backend

Durable storage for two things the app previously kept only on the device (or
in a Google Sheet):

| What | Table | Written by |
|------|-------|-----------|
| Academy module progress & completions | `academy_completions` | the four `*-academy.html` pages |
| Ask the Educator submissions | `ask_educator_messages` | `index.html` |

The client is [`../amr-backend.js`](../amr-backend.js) — no dependencies, no
build step, talking to the Supabase REST and auth endpoints directly.

> **Until you complete the setup below, none of this is switched on.** With no
> URL and key configured, `amr-backend.js` is an inert no-op: the academies and
> Ask the Educator behave exactly as they did before. Nothing breaks while the
> project is half-configured.

---

## How identity works

Learners are **anonymous Supabase users**. The app signs one in silently the
first time it needs to write something, so there is no login wall in front of
the training. Every row is owned by that user id and row-level security keeps
one learner out of another's records.

A learner can later attach an email via `AMRBackend.linkEmail(...)`. The user id
survives that upgrade, so existing completions carry over and their history
follows them to a new device.

**The trade-off to know about:** an anonymous identity lives in the device's
`localStorage`. Clear the browser data, or lose the phone, and that learner
starts a new identity — the old rows remain in the database but the app can no
longer match them to the person. Linking an email is the fix, and it is the
reason the upgrade path exists. Plan on encouraging it before you rely on these
records for anything with an audit requirement.

---

## Setup

### 1. Create the project

Create a Supabase project, then note **Project URL** and the **anon /
publishable key** from *Project Settings → API*. The anon key is designed to
ship in client code — it is not a secret. Row-level security is what protects
the data, which is why every policy in the migration matters.

Never put the **service role** key in this repo. It bypasses RLS entirely.

### 2. Enable anonymous sign-ins

*Authentication → Sign In / Providers → Anonymous sign-ins* → enable.

Without this, `POST /auth/v1/signup` returns 422 and every write silently
queues in the outbox instead of landing.

### 3. Apply the migration

Either paste [`migrations/20260803000000_init_academy_backend.sql`](migrations/20260803000000_init_academy_backend.sql)
into the SQL editor and run it, or use the CLI:

```bash
supabase link --project-ref <your-ref>
supabase db push
```

The migration is idempotent — re-running it is safe.

### 4. Point the app at the project

Edit the `CONFIG` block at the top of [`../amr-backend.js`](../amr-backend.js):

```js
var CONFIG = global.AMR_BACKEND_CONFIG || {
  url: "https://<your-ref>.supabase.co",
  anonKey: "<your anon key>"
};
```

### 5. Confirm it works

Open any academy page, pass a module, then check *Table Editor →
`academy_completions`* for a row. In the browser console:

```js
AMRBackend.status()
// { configured: true, signedIn: true, userId: "…", pending: 0 }
```

`pending` is the number of writes waiting in the offline outbox. A number that
never falls to zero means writes are being rejected — check the browser network
tab for the response body.

---

## What the schema guarantees

**Completions only ever move forward.** A learner may have the same course open
on a phone and a tablet. With a plain upsert, whichever device wrote last would
win, and a stale tab could un-pass a module that was genuinely passed. A
`before update` trigger merges instead: passes stick, best scores take the
maximum, per-module state merges key by key, and the original `completed_at` is
never overwritten by a later one. `user_id`, `course_id`, and `created_at` are
pinned server-side so a client cannot rewrite them.

**Completions cannot be deleted from the client.** There is no `delete` policy,
so a delete affects zero rows regardless of what the client sends.

**Counters are derived server-side.** `modules_passed` is recomputed from the
merged JSON rather than trusted from the client.

**Ask messages are write-only.** The client can insert but not read them. Read
them in the Supabase dashboard, or through a service-role view if you later
build an educator dashboard. A trigger caps submissions at 10 per user per hour.

Each of these is covered by a test — see [`tests/`](tests).

## Privacy note

Ask the Educator submissions carry the submitter's anonymous `user_id`. That is
a deliberate change: the previous Google Apps Script version stored nothing
identifying, and the app's *"100% Anonymous"* badge was removed in the same
commit so the interface does not overstate the privacy on offer. The badge now
reads *"No name required"*, which is accurate — no name is collected, and the
account id maps to a person only if that person has linked an email.

## Tests

```bash
cd supabase/tests && ./run.sh    # schema, triggers, RLS  (needs local Postgres)
cd test && node backend.test.mjs # client sync logic      (no dependencies)
```

## Not covered yet

- **VTA academy** (`vta/academy.html`) uses a different architecture and is not
  wired up.
- **Educator-facing dashboard.** Read completions and messages in the Supabase
  dashboard for now.
- **The Caregiver Form** in `index.html` still logs to Google Apps Script via
  `SCRIPT_URL`; only Ask the Educator was migrated.
