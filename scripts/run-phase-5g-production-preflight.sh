#!/usr/bin/env bash
set -eo pipefail
set +u
umask 077
set +o history

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT="$ROOT_DIR/scripts/sports/reports/phase-5g-opportunity-canonical-sports-preflight-read-only.sql"
OUTPUT='/tmp/phase-5g-opportunity-canonical-sports-preflight.json'

read -rsp 'PRODUCTION_DATABASE_URL senza password (input nascosto): ' PRODUCTION_DATABASE_URL
printf '\n'
psql "$PRODUCTION_DATABASE_URL" -W -X -qAt -v ON_ERROR_STOP=1 -f "$REPORT" >"$OUTPUT"
unset PRODUCTION_DATABASE_URL

jq -r '"PHASE_5G_PRODUCTION_PREFLIGHT_\(.classification) history_5c=\(.history.phase5c) history_5dc=\(.history.phase5dC) history_5g=\(.history.phase5g) tables=\(.schema.requiredTablesPresent) keys=\(.schema.requiredKeysPresent) columns=\(.schema.columnsPresent) column_collisions=\(.schema.columnCollisions) constraints=\(.schema.constraintsPresent) read_only=\(.transactionReadOnly)"' "$OUTPUT"

CLASSIFICATION="$(jq -er '.classification' "$OUTPUT")"
[ "$(jq -er '.transactionReadOnly' "$OUTPUT")" = 'on' ]
[ "$(jq -er '.writesPerformed' "$OUTPUT")" = 'false' ]
case "$CLASSIFICATION" in
  PASS_READY_FOR_EXCLUSIVE_APPLY|PASS_ALREADY_APPLIED) exit 0 ;;
  *) exit 1 ;;
esac

