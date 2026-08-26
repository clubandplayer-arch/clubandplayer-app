#!/usr/bin/env bash
set -euo pipefail

DB_NAME="b4_rpc_runtime"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

for command in pg_ctlcluster runuser psql createdb dropdb; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "Missing required local PostgreSQL command: $command" >&2
    exit 1
  }
done

pg_ctlcluster 16 main start >/dev/null 2>&1 || true
runuser -u postgres -- dropdb --if-exists "$DB_NAME"
runuser -u postgres -- createdb "$DB_NAME"
cleanup() {
  runuser -u postgres -- dropdb --if-exists "$DB_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -q -d "$DB_NAME" \
  -f "$ROOT_DIR/tests/integration/sql/profile-residence-rpc-runtime-setup.sql"
runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -q -d "$DB_NAME" \
  -f "$ROOT_DIR/supabase/migrations/20261204120000_transactional_profile_residence_rpc.sql"
runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -q -d "$DB_NAME" \
  -f "$ROOT_DIR/tests/integration/sql/profile-residence-rpc-runtime-tests.sql"
