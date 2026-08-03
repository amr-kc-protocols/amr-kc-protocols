# Supabase backend

Durable storage for two things the app previously kept only on the device (or
in a Google Sheet):

| What | Table | Written by |
|------|-------|-----------|
| Academy module progress & completions | `academy_completions` | the four `*-academy.html` pages and `vta/academy.html` |
| Ask the Educator submissions | `ask_educator_messages` | `index.html` |
| Caregiver Signature Form records | `caregiver_forms` | `index.html` |

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

### 3. Apply the migrations

Run both files in [`migrations/`](migrations), in filename order — paste each
into the SQL editor, or use the CLI:

```bash
supabase link --project-ref <your-ref>
supabase db push
```

| File | Adds |
|------|------|
| `20260803000000_init_academy_backend.sql` | completions + Ask tables, merge trigger, learner RLS |
| `20260803010000_educator_access.sql` | educator allowlist, read-all policies, verified `learner_email` |
| `20260803020000_vta_and_caregiver.sql` | VTA as a course, `meta` for course-specific extras, `caregiver_forms` |

All are idempotent — re-running them is safe.

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

## Setting up the educator dashboard

`educator-dashboard.html` shows every learner's completions and the Ask the
Educator inbox. Two steps to get in.

### 1. Create the educator account

*Authentication → Users → Add user*. Use a real address and tick **Auto
Confirm User**, or confirm it from the emailed link. Confirmation is not
optional: `is_educator()` requires `email_confirmed_at` to be set, so an
unconfirmed account gets nothing.

### 2. Add the address to the allowlist

```sql
insert into public.educators (email, note)
values ('you@example.com', 'clinical educator');
```

That is the whole grant. To revoke, delete the row — access stops on the
next request, with no code change and no redeploy.

```sql
delete from public.educators where email = 'someone@example.com';
```

Then open `educator-dashboard.html` and sign in.

### What the dashboard shows

Three tabs:

- **Completions** — all five courses. Searchable by name *and* verified email,
  filterable by course and status, sortable on every column, and exportable to
  CSV. The export matches what is on screen, filters and sort included.
- **Ask the Educator** — submissions newest first.
- **Caregiver Forms** — filed signature-form records.

A record with no verified email is flagged **"not linked"** rather than left
blank, so a self-typed name is never mistaken for a confirmed identity.

### What the dashboard can and cannot do

It is **read-only by construction**. There is no update or delete policy on
`academy_completions` beyond a learner's own row, so an educator cannot edit
or destroy a record from the client even deliberately. Corrections belong in
the Supabase dashboard, where they leave a trail.

The page itself is a public file — anyone can open it. That is not a leak.
Signing in as a non-allowlisted account loads a working page showing zero
rows, because RLS decides what comes back, not the JavaScript. Nothing is
hidden in the client as a security measure, since that would not be one.

### If the dashboard shows nothing

An educator who is not on the allowlist sees an empty table rather than an
error, because that is what RLS returns. The page says as much when both
lists come back empty. To check which case you are in:

```sql
select public.is_educator();   -- run while signed in as the educator
```

`false` means the account is not allowlisted, or its email is unconfirmed.

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

**Ask messages are readable only by educators.** A learner can insert but
cannot read any message, including their own. A trigger caps submissions at 10
per user per hour.

**`learner_email` cannot be spoofed.** It is stamped server-side from
`auth.users` on every write and only when the address is confirmed, so the
client can neither set it nor clear it. Once recorded, a later push from a
device that has not linked an email will not drop it.

**Caregiver forms are educator-read only, and hold no signatures.** The crew
who filed a form cannot read it back — the case numbers tie those rows to
patient care reports. Signature images are never sent: they live in the PDF
the crew generated and nowhere else, enforced both by the client stripping
them and by a test asserting no `data:image` reaches the server.

Each of these is covered by a test — see [`tests/`](tests).

## Privacy note

Ask the Educator submissions carry the submitter's `user_id`. That is a
deliberate change: the previous Google Apps Script version stored nothing
identifying, and the app's *"100% Anonymous"* badge was removed in the same
commit so the interface does not overstate the privacy on offer. The badge now
reads *"No name required"*, which is accurate — no name is collected.

Once a learner links an email to save their Academy progress, their account
stops being anonymous, and their questions would become attributable through
that `user_id`. Linking progress is not consent to be named on a question, so
two things keep those separate:

- The dashboard's inbox query never selects `user_id` or joins to
  `auth.users`. It shows the message, the reply address the sender chose to
  type, and nothing else. A test asserts this.
- The Ask screen says so plainly, rather than implying a stronger anonymity
  than the schema provides.

That protection is at the application layer. Anyone with the **service role**
key or SQL editor access can still join `ask_educator_messages.user_id` to
`auth.users` — so treat that key as the sensitive thing it is, and know that
this promise is one of practice, not of cryptography.

## Tests

```bash
cd supabase/tests && ./run.sh    # schema, triggers, RLS  (needs local Postgres)
cd test && node backend.test.mjs # client sync logic      (no dependencies)
cd test && node sync.e2e.mjs     # real pages in Chromium (needs playwright)
```

`run.sh` prints an assertion tally and exits non-zero if any check fails, so it
can gate CI. It stands up its own throwaway database — no Supabase project and
no network required.

## Not covered yet

- **Historical rows in the Google Sheets** — Ask submissions, caregiver form
  logs, and any VTA certifications written before this change. Nothing
  migrates them; the old Sheets remain the record for that period. The Apps
  Script `.gs` files are kept in the repo for reference, but nothing in the
  app calls them any more.
- **Deleting a learner's data on request.** There is no self-serve path; it is
  a manual SQL delete against `academy_completions` and `ask_educator_messages`
  by `user_id`.
- **Certificate verification.** VTA certificate ids are stored in
  `meta->>'certId'` but nothing looks them up.
