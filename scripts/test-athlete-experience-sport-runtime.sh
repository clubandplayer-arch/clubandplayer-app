#!/usr/bin/env bash
set -euo pipefail
DB_NAME="phase_5f_experience_sport_runtime"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
for command in pg_ctlcluster runuser psql createdb dropdb; do command -v "$command" >/dev/null || { echo "Missing: $command" >&2; exit 1; }; done
pg_ctlcluster 16 main start >/dev/null 2>&1 || true
runuser -u postgres -- dropdb --if-exists "$DB_NAME"
runuser -u postgres -- createdb "$DB_NAME"
trap 'runuser -u postgres -- dropdb --if-exists "$DB_NAME" >/dev/null 2>&1 || true' EXIT
for file in \
  tests/integration/sql/profile-residence-rpc-runtime-setup.sql \
  tests/integration/sql/profile-primary-sport-runtime-setup.sql \
  tests/integration/sql/athlete-experience-sport-runtime-setup.sql \
  supabase/migrations/20261209120000_athlete_experience_sport_context.sql \
  supabase/migrations/20261209120000_athlete_experience_sport_context.sql \
  tests/integration/sql/athlete-experience-sport-runtime-tests.sql; do
  runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -q -d "$DB_NAME" -f "$ROOT_DIR/$file"
done
