#!/usr/bin/env bash
set -eo pipefail
set +u
umask 077
set +o history

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST="$ROOT_DIR/data/sports/phase-5d-c-controlled-vocabulary.json"
REPORT="$ROOT_DIR/scripts/sports/reports/phase-5d-c-production-preflight-read-only.sql"
OUTPUT='/tmp/phase-5d-c-production-preflight.json'

read -rsp 'PRODUCTION_DATABASE_URL senza password (input nascosto): ' PRODUCTION_DATABASE_URL
printf '\n'

MANIFEST_JSON="$(jq -ce '. | select(.records | length == 356)' "$MANIFEST")"

psql "$PRODUCTION_DATABASE_URL" -W -X -qAt -v ON_ERROR_STOP=1 \
  -v manifest_json="$MANIFEST_JSON" -f "$REPORT" >"$OUTPUT"

jq -e '
  .transactionReadOnly == "on"
  and .writesPerformed == false
  and (.classification == "PASS_READY_FOR_EXCLUSIVE_APPLY" or .classification == "PASS_ALREADY_APPLIED")
' "$OUTPUT" >/dev/null

jq -r '"PHASE_5D_C_PRODUCTION_PREFLIGHT_\(.classification) history_5c=\(.history.phase5c) history_5dc=\(.history.phase5dC) history_5f_profile=\(.history.phase5fProfile) history_5f_experiences=\(.history.phase5fExperiences) tables=\(.schema.requiredTablesPresent) keys=\(.schema.requiredKeysPresent) evaluated=\(.payload.evaluated) exact=\(.payload.exact) missing=\(.payload.missing) collisions=\(.payload.collisions) foundation_missing=\(.foundation.missingReferences) read_only=\(.transactionReadOnly)"' "$OUTPUT"

unset PRODUCTION_DATABASE_URL MANIFEST_JSON
