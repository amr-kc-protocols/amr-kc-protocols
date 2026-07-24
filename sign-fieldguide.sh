#!/bin/sh
# Sign the Field Guide provenance manifest (FG-PROV-74EA77C4D8C5).
#
# Run this on your OWN machine, where the private key lives. The private key
# must NEVER be committed — .gitignore already excludes *PRIVATE-KEY.pem.
#
# It regenerates PROVENANCE-fieldguide.txt with live values (digest, byte count,
# UTC timestamp, current commit ref), signs it with your Ed25519 key, and
# verifies the signature against the public key already in the repo.
#
# Usage:
#   ./sign-fieldguide.sh [path-to-private-key]
# Default key path: VTA-PROVENANCE-PRIVATE-KEY.pem
set -eu

KEY="${1:-VTA-PROVENANCE-PRIVATE-KEY.pem}"
MAN=PROVENANCE-fieldguide.txt

[ -f "$KEY" ] || { echo "Private key not found: $KEY" >&2; exit 1; }
[ -f index.html ] || { echo "index.html not found — run from the repo root." >&2; exit 1; }
[ -f PROVENANCE.pub.pem ] || { echo "PROVENANCE.pub.pem not found — run from the repo root." >&2; exit 1; }

HASH=$(shasum -a 256 index.html | awk '{print $1}')
BYTES=$(wc -c < index.html | tr -d ' ')
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
REF=$(git rev-parse HEAD)

cat > "$MAN" <<EOF
FIELD GUIDE — PROVENANCE & AUTHORSHIP MANIFEST
==============================================

STATUS: SIGNED

Work:            AMR KC Field Guide — application software (index.html)
Scope:           Application software only — design, front-end code, and user
                 interface. Does NOT cover the AMR Kansas City protocol content,
                 AMR branding, or Dr. Ameet Deshmukh's clinical standing orders.
Author/Creator:  Jordan Hunter Jones <hunter04j@hotmail.com>
Copyright:       (c) 2026 Jordan Hunter Jones. All rights reserved.
Provenance ID:   FG-PROV-74EA77C4D8C5
UUID:            5f83203a-3edc-47dc-9120-da874592e328
Signed (UTC):    $TS
Git commit ref:  $REF
Signature alg:   Ed25519 over SHA-256 file digests

COVERED FILES (SHA-256)
-----------------------
$HASH  index.html  ($BYTES bytes)

HOW TO VERIFY
-------------
1) Integrity — recompute the digest and compare to the line above:
     shasum -a 256 index.html
2) Signature — verify PROVENANCE-fieldguide.sig over this file with the public key:
     openssl pkeyutl -verify -pubin -inkey PROVENANCE.pub.pem \\
       -rawin -in PROVENANCE-fieldguide.txt -sigfile PROVENANCE-fieldguide.sig.bin

The authoritative record of authorship is this signed manifest together with the
timestamped version-control history of the repository.
EOF

openssl pkeyutl -sign -inkey "$KEY" -rawin -in "$MAN" -out PROVENANCE-fieldguide.sig.bin
base64 PROVENANCE-fieldguide.sig.bin > PROVENANCE-fieldguide.sig
openssl pkeyutl -verify -pubin -inkey PROVENANCE.pub.pem -rawin \
  -in "$MAN" -sigfile PROVENANCE-fieldguide.sig.bin

echo
echo "Signed and verified. Commit the result:"
echo "  git add $MAN PROVENANCE-fieldguide.sig PROVENANCE-fieldguide.sig.bin"
echo "  git commit -m 'Sign Field Guide provenance manifest (FG-PROV-74EA77C4D8C5)'"
echo "  git push"
