# Authorship & Provenance — how it's marked and how to prove it

Author / creator / copyright holder: **Jordan Hunter Jones** <hunter04j@hotmail.com>
Provenance ID: **VTA-PROV-253AFF390A18**

This covers the Ventilator Training Academy (`vta/`) and the LTV 1200 Simulator
(`vent-ltv1200.html`).

## What's embedded (deterrence + detection)

- **Copyright headers** in `vta/app.js`, `vta/styles.css`, `vta/academy.html`,
  and `vent-ltv1200.html`.
- **Metadata**: `<meta name="author">` / `"copyright"`, `rel="author"` links,
  and Schema.org **JSON-LD** (`author` / `creator` / `copyrightHolder`).
- **Visible credit** in the academy footer and on the simulator standby screen.
- **Console banner** printed on load by both apps.
- **Hidden canary markers** carrying the Provenance ID: an HTML comment, a
  hidden `data-provenance` DOM node, a `--provenance` CSS variable, and
  `data-provenance` on `<html>`. `LICENSE` and `humans.txt` at the repo root.

To hunt for copies later, search the web / GitHub for `VTA-PROV-253AFF390A18`.
A wholesale copy carries it unless the copier finds and strips every instance.

## What proves it's yours (precedence + signature)

- **`PROVENANCE.txt`** — signed manifest listing the SHA-256 of every covered
  file, plus author, date, and Provenance ID.
- **`PROVENANCE.sig`** (base64) / **`PROVENANCE.sig.bin`** — Ed25519 signature
  over `PROVENANCE.txt`.
- **`PROVENANCE.pub`** (base64 SPKI) / **`PROVENANCE.pub.pem`** — public key.

### Verify integrity + signature

```sh
# 1) File integrity
shasum -a 256 vent-ltv1200.html vta/academy.html vta/app.js vta/styles.css vta/manifest.json vta/sw.js
#    compare against the digests in PROVENANCE.txt

# 2) Signature
openssl pkeyutl -verify -pubin -inkey PROVENANCE.pub.pem \
  -rawin -in PROVENANCE.txt -sigfile PROVENANCE.sig.bin
```

## Do these locally to make the proof airtight

1. **Store your private signing key.** It was delivered to you separately as
   `VTA-PROVENANCE-PRIVATE-KEY.pem` and is **not** in this repo. Keep it secret
   and backed up — it's what lets you re-sign and prove key ownership.

   For maximum rigor, regenerate the key on your own machine (so the key was
   never present in any managed environment) and re-sign:
   ```sh
   openssl genpkey -algorithm ed25519 -out VTA-PROVENANCE-PRIVATE-KEY.pem
   openssl pkey -in VTA-PROVENANCE-PRIVATE-KEY.pem -pubout -out PROVENANCE.pub.pem
   openssl pkeyutl -sign -inkey VTA-PROVENANCE-PRIVATE-KEY.pem \
     -rawin -in PROVENANCE.txt -out PROVENANCE.sig.bin
   base64 PROVENANCE.sig.bin > PROVENANCE.sig
   openssl pkey -pubin -in PROVENANCE.pub.pem -outform DER | base64 > PROVENANCE.pub
   git commit -am "Re-sign provenance with locally generated key" && git push
   ```

2. **Independent timestamp (proves the work existed by a date).** OpenTimestamps
   anchors a hash to the Bitcoin blockchain:
   ```sh
   pip install opentimestamps-client
   ots stamp PROVENANCE.txt        # creates PROVENANCE.txt.ots
   git add PROVENANCE.txt.ots && git commit -m "Timestamp provenance" && git push
   # later: ots verify PROVENANCE.txt.ots
   ```
   (The repository's own commit history on GitHub is already a timestamped
   record; OpenTimestamps is an independent, third-party corroboration.)

3. **Sign your commits with GPG** so future history is cryptographically yours:
   ```sh
   gpg --full-generate-key                      # RSA 4096 or ed25519
   gpg --list-secret-keys --keyid-format=long   # copy the key id
   git config --global user.signingkey <KEYID>
   git config --global commit.gpgsign true
   git config --global tag.gpgsign true
   # add the public key to GitHub → Settings → SSH and GPG keys
   ```

## If you find a copy

The embedded Provenance ID + this signed manifest + the timestamped history
establish that you authored the work first. Removing the markers doesn't
transfer copyright. For anything serious, preserve evidence (archive the copy,
note the date) and consult counsel; consider registering the copyright.
