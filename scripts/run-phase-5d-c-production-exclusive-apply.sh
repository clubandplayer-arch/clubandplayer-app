#!/usr/bin/env bash
set -eo pipefail
set +u
umask 077
set +o history

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATION="$ROOT_DIR/supabase/migrations/20261207120000_seed_controlled_sports_vocabulary.sql"
MANIFEST="$ROOT_DIR/data/sports/phase-5d-c-controlled-vocabulary.json"
REPORT="$ROOT_DIR/scripts/sports/reports/phase-5d-c-production-preflight-read-only.sql"
EXPECTED_SHA256='85367f245d3f216b8678a7701be3bbc413067d0b007dac79cb1f199d854fbfa6'
APPLY_LOG='/tmp/phase-5d-c-production-exclusive-apply.log'
POST_BEFORE_HISTORY='/tmp/phase-5d-c-production-post-check-before-history.json'
POST_AFTER_HISTORY='/tmp/phase-5d-c-production-post-check-after-history.json'

cleanup() {
  unset PRODUCTION_DATABASE_URL PGPASSWORD MANIFEST_JSON PGOPTIONS
}
trap cleanup EXIT

printf '%s  %s\n' "$EXPECTED_SHA256" "$MIGRATION" | sha256sum --check --strict
MANIFEST_JSON="$(jq -ce '. | select(.records | length == 356)' "$MANIFEST")"

read -rsp 'PRODUCTION_DATABASE_URL senza password (input nascosto): ' PRODUCTION_DATABASE_URL
printf '\n'
read -rsp 'Password database Production (input nascosto): ' PGPASSWORD
printf '\n'
export PRODUCTION_DATABASE_URL PGPASSWORD

PGOPTIONS='-c application_name=phase_5d_c_exclusive_apply -c lock_timeout=5s -c statement_timeout=120s' \
psql "$PRODUCTION_DATABASE_URL" -X -v ON_ERROR_STOP=1 -P pager=off -f "$MIGRATION" \
  | tee "$APPLY_LOG"

grep -qx 'COMMIT' "$APPLY_LOG"

PGOPTIONS='-c application_name=phase_5d_c_post_check -c statement_timeout=60s' \
psql "$PRODUCTION_DATABASE_URL" -X -qAt -v ON_ERROR_STOP=1 \
  -v manifest_json="$MANIFEST_JSON" -f "$REPORT" >"$POST_BEFORE_HISTORY"

jq -e '
  .classification == "PASS_READY_FOR_EXCLUSIVE_APPLY"
  and .transactionReadOnly == "on"
  and .writesPerformed == false
  and .history.phase5dC == 0
  and .payload == {collisions: 0, evaluated: 356, exact: 356, missing: 0}
  and .foundation.missingReferences == 0
' "$POST_BEFORE_HISTORY" >/dev/null

PGOPTIONS='-c application_name=phase_5d_c_history_registration -c lock_timeout=5s -c statement_timeout=15s' \
psql "$PRODUCTION_DATABASE_URL" -X -v ON_ERROR_STOP=1 -q <<'SQL'
begin;
lock table supabase_migrations.schema_migrations in share row exclusive mode;
do $$
begin
  if (select count(*) from supabase_migrations.schema_migrations where version = '20261207120000') <> 0 then
    raise exception '5D-C history changed before registration';
  end if;
end
$$;
insert into supabase_migrations.schema_migrations(version) values ('20261207120000');
do $$
begin
  if (select count(*) from supabase_migrations.schema_migrations where version = '20261207120000') <> 1 then
    raise exception '5D-C history registration count mismatch';
  end if;
end
$$;
commit;
SQL

PGOPTIONS='-c application_name=phase_5d_c_final_post_check -c statement_timeout=60s' \
psql "$PRODUCTION_DATABASE_URL" -X -qAt -v ON_ERROR_STOP=1 \
  -v manifest_json="$MANIFEST_JSON" -f "$REPORT" >"$POST_AFTER_HISTORY"

jq -e '
  .classification == "PASS_ALREADY_APPLIED"
  and .transactionReadOnly == "on"
  and .writesPerformed == false
  and .history.phase5dC == 1
  and .payload == {collisions: 0, evaluated: 356, exact: 356, missing: 0}
  and .foundation.missingReferences == 0
' "$POST_AFTER_HISTORY" >/dev/null

printf 'PHASE_5D_C_PRODUCTION_ROLLOUT_COMPLETE history_5dc=1 evaluated=356 exact=356 missing=0 collisions=0 foundation_missing=0\n'
