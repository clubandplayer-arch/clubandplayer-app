#!/usr/bin/env bash
set -euo pipefail

DB_NAME="phase_5d_sports_competition_seed"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
for command in pg_ctlcluster runuser psql createdb dropdb; do
  command -v "$command" >/dev/null 2>&1 || { echo "Missing required local PostgreSQL command: $command" >&2; exit 1; }
done
pg_ctlcluster 16 main start >/dev/null 2>&1 || true
runuser -u postgres -- dropdb --if-exists "$DB_NAME"
runuser -u postgres -- createdb "$DB_NAME"
cleanup() { runuser -u postgres -- dropdb --if-exists "$DB_NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
for sql in \
  tests/integration/sql/sports-competition-schema-runtime-setup.sql \
  supabase/migrations/20261206120000_sports_competition_canonical_schema.sql \
  supabase/migrations/20261206130000_sports_competition_controlled_seed.sql \
  supabase/migrations/20261206130000_sports_competition_controlled_seed.sql \
  tests/integration/sql/sports-competition-seed-runtime-tests.sql; do
  runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -q -d "$DB_NAME" -f "$ROOT_DIR/$sql"
done
