#!/usr/bin/env bash
set -eo pipefail
set +u
umask 077
set +o history

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATION="$ROOT_DIR/supabase/migrations/20261210120000_opportunity_canonical_sports_context.sql"
REPORT="$ROOT_DIR/scripts/sports/reports/phase-5g-opportunity-canonical-sports-preflight-read-only.sql"
EXPECTED_SHA256='bf6eb4a7f8bc202c78ab3759c3b1b5ea80610db276672dd6d3719792b4ab7c9f'
APPLY_LOG='/tmp/phase-5g-production-exclusive-apply.log'
POST_BEFORE_HISTORY='/tmp/phase-5g-production-post-check-before-history.json'
POST_AFTER_HISTORY='/tmp/phase-5g-production-post-check-after-history.json'

cleanup() { unset PRODUCTION_DATABASE_URL PGPASSWORD PGOPTIONS; }
trap cleanup EXIT

printf '%s  %s\n' "$EXPECTED_SHA256" "$MIGRATION" | sha256sum --check --strict
read -rsp 'PRODUCTION_DATABASE_URL senza password (input nascosto): ' PRODUCTION_DATABASE_URL
printf '\n'
read -rsp 'Password database Production (input nascosto): ' PGPASSWORD
printf '\n'
export PRODUCTION_DATABASE_URL PGPASSWORD

PGOPTIONS='-c application_name=phase_5g_exclusive_apply -c lock_timeout=5s -c statement_timeout=120s' \
psql "$PRODUCTION_DATABASE_URL" -X -v ON_ERROR_STOP=1 -P pager=off -f "$MIGRATION" | tee "$APPLY_LOG"
grep -qx 'COMMIT' "$APPLY_LOG"

PGOPTIONS='-c application_name=phase_5g_post_check -c statement_timeout=60s' \
psql "$PRODUCTION_DATABASE_URL" -X -qAt -v ON_ERROR_STOP=1 -f "$REPORT" >"$POST_BEFORE_HISTORY"
jq -e '
  .classification == "PASS_SCHEMA_READY_FOR_HISTORY"
  and .transactionReadOnly == "on" and .writesPerformed == false
  and .history.phase5g == 0
  and .schema.columnsPresent == 6 and .schema.columnCollisions == 0
  and .schema.constraintsPresent == 8 and .schema.constraintCollisions == 0
  and .schema.indexesPresent == 3 and .schema.canonicalRows == 0
' "$POST_BEFORE_HISTORY" >/dev/null

PGOPTIONS='-c application_name=phase_5g_history_registration -c lock_timeout=5s -c statement_timeout=15s' \
psql "$PRODUCTION_DATABASE_URL" -X -q -v ON_ERROR_STOP=1 <<'SQL'
begin;
lock table supabase_migrations.schema_migrations in share row exclusive mode;
do $$ begin
  if (select count(*) from supabase_migrations.schema_migrations where version='20261210120000') <> 0 then
    raise exception '5G history changed before registration';
  end if;
end $$;
insert into supabase_migrations.schema_migrations(version) values ('20261210120000');
do $$ begin
  if (select count(*) from supabase_migrations.schema_migrations where version='20261210120000') <> 1 then
    raise exception '5G history registration count mismatch';
  end if;
end $$;
commit;
SQL

PGOPTIONS='-c application_name=phase_5g_final_post_check -c statement_timeout=60s' \
psql "$PRODUCTION_DATABASE_URL" -X -qAt -v ON_ERROR_STOP=1 -f "$REPORT" >"$POST_AFTER_HISTORY"
jq -e '
  .classification == "PASS_ALREADY_APPLIED"
  and .transactionReadOnly == "on" and .writesPerformed == false
  and .history.phase5g == 1
  and .schema.columnsPresent == 6 and .schema.columnCollisions == 0
  and .schema.constraintsPresent == 8 and .schema.constraintCollisions == 0
  and .schema.indexesPresent == 3 and .schema.canonicalRows == 0
' "$POST_AFTER_HISTORY" >/dev/null

printf 'PHASE_5G_PRODUCTION_SCHEMA_ROLLOUT_COMPLETE history_5g=1 columns=6 constraints=8 indexes=3 canonical_rows=0\n'

