#!/usr/bin/env bash
set -euo pipefail
DB_NAME="c7_opportunity_geography_backfill"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
for command in pg_ctlcluster runuser psql createdb dropdb; do command -v "$command" >/dev/null || { echo "Missing: $command" >&2; exit 1; }; done
pg_ctlcluster 16 main start >/dev/null 2>&1 || true
runuser -u postgres -- dropdb --if-exists "$DB_NAME"
runuser -u postgres -- createdb "$DB_NAME"
trap 'runuser -u postgres -- dropdb --if-exists "$DB_NAME" >/dev/null 2>&1 || true' EXIT
PSQL=(runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -q -d "$DB_NAME")
"${PSQL[@]}" -f "$ROOT_DIR/tests/integration/sql/opportunity-legacy-geography-backfill-setup.sql"
"${PSQL[@]}" -f "$ROOT_DIR/supabase/migrations/20261205120000_opportunity_canonical_geography.sql"
"${PSQL[@]}" -f "$ROOT_DIR/supabase/runbooks/manual/audit_opportunity_legacy_geography_production_read_only.sql"
(cd "$ROOT_DIR/supabase/runbooks/manual" && "${PSQL[@]}" -f audit_opportunity_legacy_geography_backfill.sql)
(cd "$ROOT_DIR/supabase/runbooks/manual" && "${PSQL[@]}" -f apply_opportunity_legacy_geography_backfill.sql)
# Second execution certifies idempotence (empty plan, zero further updates).
(cd "$ROOT_DIR/supabase/runbooks/manual" && "${PSQL[@]}" -f apply_opportunity_legacy_geography_backfill.sql)
"${PSQL[@]}" -f "$ROOT_DIR/supabase/rollbacks/20261205_opportunity_legacy_geography_backfill.sql"
"${PSQL[@]}" -f "$ROOT_DIR/tests/integration/sql/opportunity-legacy-geography-backfill-tests.sql"
