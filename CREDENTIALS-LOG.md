# Credentials Expiration Log — maintainer notes

`credentials-log.html` tracks AMR KC certification and license expirations —
**ACLS**, **BLS/CPR**, their instructor variants, and **Kansas** and **Missouri**
EMS licenses. Providers use **Show my expiration** to look up their own dates
with their last name and employee number; the full roster is behind a staff
password.

## Two ways in

There is no server. Everything is AES-256-GCM ciphertext embedded in the page
and decrypted in the browser; no request leaves the device.

**Show my expiration** (default) — last name + employee number returns that one
person's credentials and nothing else. Each person's record is encrypted under a
key derived from their own credential, sharing one PBKDF2 salt:

```
SELF_SALT   one shared 16-byte PBKDF2 salt
SELF_BLOBS  base64( iv[12] || ciphertext ), one per person, shuffled
key         = PBKDF2-SHA256("lastname|empno", SELF_SALT, 150000)
```

Lookup derives one key and tries it against every record; exactly one decrypts.
The shared salt is what keeps that to a single derivation. Records are padded to
a fixed length so ciphertext size reveals nothing, the array is shuffled so order
carries no information, and `notes` is deliberately **excluded** from the
per-person records — it's the management-facing field.

**Full roster** — the whole list, keyed by the staff password:

```
ROSTER_BLOB = base64( salt[16] || iv[12] || ciphertext )
key         = PBKDF2-SHA256(password, salt, 250000)
```

In both cases the credential **is** the decryption key — no password or hash is
stored anywhere in the file, so a wrong answer just fails the GCM auth tag and
there is nothing to read out of the source.

Sessions are memory-only: reloading or closing the tab re-locks, as does 15
minutes of inactivity. A successful self-lookup writes `amrkc_profile` to
localStorage, the same key the Field Guide home page uses, so the form
pre-fills next time.

> **What this does and doesn't do.** It keeps the roster from sitting in
> plaintext in a public repo, and it stops one provider from browsing everyone
> else's dates. It is not access control. Anyone with the staff password has the
> whole file. And last name + employee number is *low-entropy* — a coworker who
> knows both can look someone up. The slow KDF makes bulk enumeration of employee
> numbers impractical, but it cannot make a known pair secret. Treat self-lookup
> as roughly directory-grade privacy, not confidentiality.
>
> Note also that old commits keep old blobs, so rotating the staff password does
> not retroactively protect a roster that already shipped under the old one.

## Record format

```json
{
  "name": "Sample, Alex",
  "role": "EMT",
  "employeeNo": "12345678",
  "creds": [
    { "k": "bls", "label": "BLS / CPR",   "exp": "2027-01-31", "term": 2 },
    { "k": "ks",  "label": "Kansas: EMT", "exp": "2027-12-31", "term": 2 }
  ],
  "notes": ""
}
```

`k` is the credential kind, used for the filter chips, the short pill label, and
the renewal term:

| `k`     | Meaning              | Term    |
|---------|----------------------|---------|
| `acls`  | ACLS                 | 2 years |
| `bls`   | BLS / CPR            | 2 years |
| `aclsI` | ACLS Instructor      | 2 years |
| `blsI`  | BLS / CPR Instructor | 2 years |
| `ks`    | Kansas EMS license   | 2 years |
| `mo`    | Missouri EMS license | 5 years |

`label` is the specific text shown to the user (`Kansas: Paramedic`,
`Missouri: EMT-B`). `exp` is the expiration date, `YYYY-MM-DD`. `role` is
derived from the highest state license level held (Paramedic > RN > AEMT > EMT).

**There is no activation date.** The Workday export's `Activation Date` column
was not reliable, so the log stores the renewal `term` instead and displays
"2-year card" / "5-year license" rather than an issue date it cannot stand
behind. The importer ignores that column outright; `term` is set from `k` via
the `TERM` map in the page. If accurate activation dates ever become available,
add them back as a separate field — don't try to reconstruct them from `exp`,
because AHA cards expire at month-end and state licenses on a calendar cycle,
so subtracting the term lands on the wrong day for one or the other.

A name may carry an alternate first name in parentheses — `Sample, Alex
(Sandy)`. This is display only: lookup still keys on the last name before the
comma, so it is unaffected.

A person with an empty `creds` array lands in the **No records** bucket rather
than being flagged as expired. Nothing is inferred about credentials a person
*ought* to hold — the log shows what has been turned in, and nothing more.

## Status thresholds

Worst to best: **Expired** → **≤30 days** → **≤90 days** → **Current**, with
**No records** for anyone with an empty credential list. A person's badge in the
roster shows their worst credential.

`ALERT_DAYS` (default `30`) is the single constant that drives the
provider-facing alert banner *and* the `≤30 days` bucket — change it in one place
and both follow. The banner is red when something has already lapsed, amber when
something is inside the window, and it names each affected credential with its
exact date and day count. The follow-up text adapts: AHA cards point at the class
signup, state licenses point at the state renewal.

## Updating the roster

### Option A — in the page (no tooling)

1. Unlock the **Full roster**, then **Manage data**.
2. Paste the Workday credential export into the second box and hit
   **Convert → JSON**. Tab- or comma-separated, header row required, one row per
   credential — `Name`, `Workday ID`, `Credential`, `Expiration Date`
   (`Activation Date` may be present; it is ignored). People already on the log
   are matched on Workday ID and have their credentials replaced; unknown IDs
   are added; anyone absent from the export keeps their existing record, alternate
   first name included. Or edit the JSON directly.
3. **Generate encrypted block** — leave the password field blank to keep the
   current password. This runs the key derivation once per person, so expect
   roughly a fifth of a second each; the button reports progress.
4. Copy the block into `credentials-log.html`, replacing everything between
   `/* ── BEGIN GENERATED DATA ── */` and `/* ── END GENERATED DATA ── */`.
   The `UPDATED` stamp is part of the block. Commit.

### Option B — from the command line (requires Node 18+)

```bash
node credentials-pack.mjs 'the-password' roster.json --write
```

That splices the whole generated block into `credentials-log.html` in place.
Drop `--write` to print it to stdout instead. `roster.sample.json` is the
template — fake data, safe to commit. Real roster files (`roster.json`,
`roster-*.json`) are gitignored; keep them out of the repo.

Both paths produce byte-compatible output, so you can start in the browser and
switch to the CLI later, or the reverse.

## Where it's linked

- **More → Forms & Admin → Credentials Log** in the field guide.
- The home page has an **AHA Classes** tile pointing at
  <https://gmrlearning.com/kansas/>, which is also the call-to-action on the
  lock screen and on a provider's own results.

## Current state

121 people, 354 credential rows, loaded from the Workday export. Self-lookup is
verified working for all 121.

The staff password is set and is **deliberately not recorded anywhere in this
repo** — share it out-of-band. To rotate it: unlock the full roster → **Manage
data** → enter a new password → **Generate encrypted block** → paste. Bear in
mind that rotating does not protect a roster that already shipped under the old
password, because previous commits keep the old blob. Self-lookup does not use
the staff password and is unaffected by a rotation.

Every activation date in the source export was unreliable — several were after
their own expiration or years in the future — so none of them were kept. See
the record-format section above.

Open items as of the last import, all of them visible in the app itself:

- **1 person is Expired** — a Kansas EMT license that lapsed at the end of 2024,
  over 18 months ago. Possibly a stale record rather than a live problem; worth
  confirming before anyone acts on it.
- **3 people show No records** — they were on the name list but had no
  credential rows in the export at all.
- **3 people were added from the export** — they appeared in the credential
  report but not on the original name list.

> **Names and employee numbers are deliberately not written down here.** Together
> they are the self-lookup key, and this file is plaintext in a public repo —
> listing them would undo the encryption for exactly the people named. Filter the
> **No records** tile in the full roster to see who is affected.

`roster.json` is gitignored and will not survive a fresh clone. It is
recoverable at any time by unlocking the log and opening **Manage data**, which
shows the decrypted roster as JSON.
