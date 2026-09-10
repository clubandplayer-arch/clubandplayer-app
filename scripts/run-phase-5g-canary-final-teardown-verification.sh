#!/usr/bin/env bash
set -eo pipefail
set +u
set +o history
umask 077

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT="$ROOT_DIR/scripts/sports/reports/phase-5g-canary-final-teardown-read-only.sql"
OUTPUT='/tmp/phase-5g-canary-final-teardown.json'

read -rsp 'PRODUCTION_DATABASE_URL senza password (input nascosto): ' PRODUCTION_DATABASE_URL
printf '\n'
psql "$PRODUCTION_DATABASE_URL" -W -X -qAt -v ON_ERROR_STOP=1 -f "$REPORT" >"$OUTPUT"
unset PRODUCTION_DATABASE_URL

jq -r '"PHASE_5G_CANARY_FINAL_TEARDOWN_\(.classification) auth=\(.counts.auth_users) profiles=\(.counts.profiles) opportunities=\(.counts.opportunities) applications=\(.counts.applications) read_only=\(.transactionReadOnly)"' "$OUTPUT"
jq -e '
  .classification == "PASS_PHASE_5G_CANARY_FINAL_TEARDOWN"
  and .counts == {auth_users:0, profiles:0, opportunities:0, applications:0}
  and .transactionReadOnly == "on"
  and .writesPerformed == false
  and .containsPii == false
' "$OUTPUT" >/dev/null
