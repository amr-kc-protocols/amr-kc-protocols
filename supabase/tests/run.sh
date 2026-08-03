#!/usr/bin/env bash
# Apply the migration to a throwaway Postgres and exercise it.
#
# These tests do not need Supabase — they stand up a local Postgres, add a
# minimal stand-in for the bits of Supabase the migration leans on
# (auth.users, auth.uid(), the anon/authenticated/service_role roles), then
# run the migration and the assertions against it.
#
#   ./run.sh              # uses a local cluster on port 55432
#   PGPORT=5432 ./run.sh  # or point at a Postgres you already have
#
# Expected output has every "-->" line matched by the query above it, and
# every notice reading PASS. Any FAIL notice is a real regression.

set -euo pipefail
cd "$(dirname "$0")"

PGPORT="${PGPORT:-55432}"
PGHOST="${PGHOST:-/tmp}"
PGUSER="${PGUSER:-postgres}"
PGDATABASE="${PGDATABASE:-amrtest}"
export PGPORT PGHOST PGUSER

if ! psql -d postgres -c 'select 1' >/dev/null 2>&1; then
  cat >&2 <<'EOF'
No Postgres reachable.

To start a throwaway cluster (Debian/Ubuntu, postgresql-16 installed):

  export PATH=/usr/lib/postgresql/16/bin:$PATH
  initdb -D /tmp/amrpg -A trust -U postgres
  pg_ctl -D /tmp/amrpg -o "-k /tmp -p 55432 -c listen_addresses=" -l /tmp/amrpg/log start

The cluster must run as a non-root user.
EOF
  exit 1
fi

psql -q -d postgres -c "drop database if exists ${PGDATABASE}" >/dev/null
psql -q -d postgres -c "create database ${PGDATABASE}" >/dev/null
export PGDATABASE

echo "=== harness ==="
psql -q -v ON_ERROR_STOP=1 -f 00_harness.sql

echo "=== migrations ==="
for m in ../migrations/*.sql; do
  echo "--- $(basename "$m")"
  psql -q -v ON_ERROR_STOP=1 -f "$m" 2>&1 | grep -v 'does not exist, skipping' || true
done

echo
echo "=== 01_merge ==="
psql -v ON_ERROR_STOP=1 -f 01_merge.sql 2>&1 | grep -v '^SET$\|^BEGIN$\|^COMMIT$\|^DO$'

echo
echo "=== 02_rls ==="
psql -v ON_ERROR_STOP=1 -f 02_rls.sql 2>&1 \
  | grep -v '^SET$\|^BEGIN$\|^COMMIT$\|^GRANT$\|^REVOKE$\|^DO$'

echo
echo "=== 03_educator ==="
psql -v ON_ERROR_STOP=1 -f 03_educator.sql 2>&1 \
  | grep -v '^SET$\|^BEGIN$\|^COMMIT$\|^GRANT$\|^REVOKE$\|^DO$\|^UPDATE [0-9]'

echo
if psql -tAc "select 1" >/dev/null 2>&1; then
  echo "Done. Review the output above: no line should read FAIL."
fi
