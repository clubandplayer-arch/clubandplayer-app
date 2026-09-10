#!/usr/bin/env bash
set -euo pipefail
DB_NAME="phase_5d_c_controlled_sports_vocabulary"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
for command in pg_ctlcluster runuser psql createdb dropdb; do
  command -v "$command" >/dev/null || { echo "Missing required local PostgreSQL command: $command" >&2; exit 1; }
done
pg_ctlcluster 16 main start >/dev/null 2>&1 || true
runuser -u postgres -- dropdb --if-exists "$DB_NAME"
runuser -u postgres -- createdb "$DB_NAME"
cleanup() { runuser -u postgres -- dropdb --if-exists "$DB_NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -q -d "$DB_NAME" -f "$ROOT_DIR/tests/integration/sql/canonical-sports-competition-schema-setup.sql"
runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -q -d "$DB_NAME" -f "$ROOT_DIR/tests/integration/sql/controlled-sports-vocabulary-foundation.sql"
runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -q -d "$DB_NAME" -f "$ROOT_DIR/supabase/migrations/20261206120000_canonical_sports_competition_schema.sql"
runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -q -d "$DB_NAME" -f "$ROOT_DIR/supabase/migrations/20261207120000_seed_controlled_sports_vocabulary.sql"
# A second apply must be a no-op and retain exactly the reviewed records.
runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -q -d "$DB_NAME" -f "$ROOT_DIR/supabase/migrations/20261207120000_seed_controlled_sports_vocabulary.sql"
runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -q -d "$DB_NAME" -f "$ROOT_DIR/tests/integration/sql/controlled-sports-vocabulary-tests.sql"

# A natural-key collision with different approved content must abort instead of
# silently overwriting or accepting drift.
runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -q -d "$DB_NAME" \
  -c "update public.gender_categories set canonical_name = 'Unexpected drift' where code = 'male'"
if runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -q -d "$DB_NAME" \
  -f "$ROOT_DIR/supabase/migrations/20261207120000_seed_controlled_sports_vocabulary.sql" \
  >"$ROOT_DIR/.phase-5d-c-expected-failure.log" 2>&1; then
  echo "Expected the 5D-C migration to reject catalog drift" >&2
  rm -f "$ROOT_DIR/.phase-5d-c-expected-failure.log"
  exit 1
fi
grep -q "5D-C gender_categories payload mismatch" "$ROOT_DIR/.phase-5d-c-expected-failure.log"
rm -f "$ROOT_DIR/.phase-5d-c-expected-failure.log"
