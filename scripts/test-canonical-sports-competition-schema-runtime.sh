#!/usr/bin/env bash
set -euo pipefail
DB_NAME="phase_5c_sports_competition_runtime"
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
runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -q -d "$DB_NAME" -f "$ROOT_DIR/supabase/migrations/20261206120000_canonical_sports_competition_schema.sql"
# A second application validates the repository migration's idempotent guards
# before any fixture data is inserted.
runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -q -d "$DB_NAME" -f "$ROOT_DIR/supabase/migrations/20261206120000_canonical_sports_competition_schema.sql"
runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -q -d "$DB_NAME" -f "$ROOT_DIR/tests/integration/sql/canonical-sports-competition-schema-tests.sql"
