#!/usr/bin/env bash

# Fail closed without terminating the caller's interactive terminal.
set +e
set +u
umask 077

EXPECTED_CANARY_USER_ID='b5ba567a-194b-4e07-afe7-f8f9ce29a808'
EXPECTED_PROFILE_BEFORE_SHA256='7646c11e47c833ca306a125ad399733d0bb15ee884a5d015472bed91415850f5'
PROFILE_BEFORE='/tmp/phase-5f-canary-profile-before.json'
TEARDOWN_REPORT='/tmp/phase-5f-canary-teardown-verification.json'
TEARDOWN_STDERR='/tmp/phase-5f-canary-teardown-verification.stderr'
SQL_REPORT='scripts/sports/reports/phase-5f-canary-teardown-verification-read-only.sql'

stop() {
  printf 'PHASE_5F_CANARY_STOP %s\n' "$1"
  unset PRODUCTION_DATABASE_URL
  exit 0
}

if [ -z "${PRODUCTION_DATABASE_URL:-}" ]; then
  read -rsp 'PRODUCTION_DATABASE_URL (input nascosto): ' PRODUCTION_DATABASE_URL
  printf '\n'
  export PRODUCTION_DATABASE_URL
fi

[ -n "${PRODUCTION_DATABASE_URL:-}" ] || stop 'db_secret_empty'
command -v psql >/dev/null 2>&1 || stop 'psql_missing'
command -v jq >/dev/null 2>&1 || stop 'jq_missing'
[ -r "$PROFILE_BEFORE" ] || stop 'baseline_missing'
[ -r "$SQL_REPORT" ] || stop 'report_missing'

PROFILE_SHA256="$(sha256sum "$PROFILE_BEFORE" 2>/dev/null | cut -d' ' -f1)"
[ "$PROFILE_SHA256" = "$EXPECTED_PROFILE_BEFORE_SHA256" ] || stop 'baseline_hash_drift'

CANARY_PROFILE_ID="$(jq -er '.data.id | select(type == "string" and test("^[0-9a-fA-F-]{36}$"))' "$PROFILE_BEFORE" 2>"$TEARDOWN_STDERR")"
[ $? -eq 0 ] && [ -n "$CANARY_PROFILE_ID" ] || stop "profile_id evidence=$TEARDOWN_STDERR"

psql "$PRODUCTION_DATABASE_URL" -X -qAt -v ON_ERROR_STOP=1 \
  -v canary_user_id="$EXPECTED_CANARY_USER_ID" \
  -v canary_profile_id="$CANARY_PROFILE_ID" \
  -f "$SQL_REPORT" >"$TEARDOWN_REPORT" 2>"$TEARDOWN_STDERR"
PSQL_STATUS=$?
unset PRODUCTION_DATABASE_URL

[ "$PSQL_STATUS" -eq 0 ] || stop "psql_exit=$PSQL_STATUS evidence=$TEARDOWN_STDERR"

jq -e '
  .classification == "PASS_PHASE_5F_CANARY_TEARDOWN_VERIFIED"
  and .transactionReadOnly == "on"
  and .writesPerformed == false
  and .containsPii == false
  and .counts == {auth_users: 0, experiences: 0, profiles: 0}
' "$TEARDOWN_REPORT" >/dev/null 2>"$TEARDOWN_STDERR"
[ $? -eq 0 ] || stop "teardown_residue evidence=$TEARDOWN_REPORT"

printf 'PHASE_5F_CANARY_TEARDOWN_VERIFIED auth=0 profiles=0 experiences=0 read_only=on\n'
exit 0
