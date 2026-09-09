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

jq -r '"PHASE_5D_C_PRODUCTION_PREFLIGHT_\(.classification) history_5c=\(.history.phase5c) history_5dc=\(.history.phase5dC) history_5f_profile=\(.history.phase5fProfile) history_5f_experiences=\(.history.phase5fExperiences) tables=\(.schema.requiredTablesPresent) keys=\(.schema.requiredKeysPresent) evaluated=\(.payload.evaluated) exact=\(.payload.exact) missing=\(.payload.missing) collisions=\(.payload.collisions) foundation_missing=\(.foundation.missingReferences) read_only=\(.transactionReadOnly)"' "$OUTPUT"

CLASSIFICATION="$(jq -er '.classification' "$OUTPUT")"
READ_ONLY="$(jq -er '.transactionReadOnly' "$OUTPUT")"
WRITES_PERFORMED="$(jq -er '.writesPerformed' "$OUTPUT")"
unset PRODUCTION_DATABASE_URL MANIFEST_JSON

if [ "$READ_ONLY" != 'on' ] || [ "$WRITES_PERFORMED" != 'false' ]; then
  exit 2
fi

case "$CLASSIFICATION" in
  PASS_READY_FOR_EXCLUSIVE_APPLY|PASS_ALREADY_APPLIED) exit 0 ;;
  *) exit 1 ;;
esac
