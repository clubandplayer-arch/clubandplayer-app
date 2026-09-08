#!/usr/bin/env bash
set -euo pipefail

DB_NAME="phase_5f_b_profile_primary_sport_preflight"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT="$ROOT_DIR/scripts/sports/reports/phase-5f-b-profile-primary-sport-preflight-read-only.sql"
POSTCHECK="$ROOT_DIR/scripts/sports/reports/phase-5f-c-profile-primary-sport-post-apply-read-only.sql"

for command in pg_ctlcluster runuser psql createdb dropdb; do
  command -v "$command" >/dev/null 2>&1 || { echo "Missing required local PostgreSQL command: $command" >&2; exit 1; }
done

pg_ctlcluster 16 main start >/dev/null 2>&1 || true
runuser -u postgres -- dropdb --if-exists "$DB_NAME"
runuser -u postgres -- createdb "$DB_NAME"
cleanup() { runuser -u postgres -- dropdb --if-exists "$DB_NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -q -d "$DB_NAME" \
  -f "$ROOT_DIR/tests/integration/sql/profile-residence-rpc-runtime-setup.sql"
runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -q -d "$DB_NAME" \
  -f "$ROOT_DIR/tests/integration/sql/profile-primary-sport-runtime-setup.sql"
runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -q -d "$DB_NAME" \
  -f "$ROOT_DIR/tests/integration/sql/profile-primary-sport-preflight-history.sql"

before="$(runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -At -d "$DB_NAME" -f "$REPORT")"
grep -q 'PASS_READY_TO_APPLY_5F_A' <<<"$before"

runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -q -d "$DB_NAME" \
  -f "$ROOT_DIR/supabase/migrations/20261208120000_profile_primary_sport.sql"
post_before_history="$(runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -At -d "$DB_NAME" -f "$POSTCHECK")"
grep -q '"schemaReady": true' <<<"$post_before_history"
grep -q '"phase_5f_a_rows": 0' <<<"$post_before_history"
runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -q -d "$DB_NAME" \
  -c "insert into supabase_migrations.schema_migrations(version) values ('20261208120000')"
after="$(runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -At -d "$DB_NAME" -f "$REPORT")"
grep -q 'PASS_5F_A_ALREADY_APPLIED' <<<"$after"
post_after_history="$(runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -At -d "$DB_NAME" -f "$POSTCHECK")"
grep -q '"phase_5f_a_rows": 1' <<<"$post_after_history"

printf '%s\n' 'PHASE_5F_B_PROFILE_PRIMARY_SPORT_PREFLIGHT_PASS'
