#!/usr/bin/env bash
set -eo pipefail
set +u
umask 077
set +o history

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT="$ROOT_DIR/scripts/sports/reports/phase-5g-canary-accounts-qualification-read-only.sql"
OUTPUT='/tmp/phase-5g-canary-accounts-qualification.json'
CLUB_CANARY_USER_ID='870bb095-9f8b-4800-a8b9-3e137714e8d0'
APPLICANT_CANARY_USER_ID='2c988bc3-5245-45dc-8184-8582ab3b0e5a'

read -rsp 'PRODUCTION_DATABASE_URL senza password (input nascosto): ' PRODUCTION_DATABASE_URL
printf '\n'
psql "$PRODUCTION_DATABASE_URL" -W -X -qAt -v ON_ERROR_STOP=1 \
  -v club_user_id="$CLUB_CANARY_USER_ID" \
  -v applicant_user_id="$APPLICANT_CANARY_USER_ID" \
  -f "$REPORT" >"$OUTPUT"
unset PRODUCTION_DATABASE_URL

jq -r '"PHASE_5G_CANARY_QUALIFICATION_\(.classification) club_auth=\(.auth.club) applicant_auth=\(.auth.applicant) club_profiles=\(.profiles.club) applicant_profiles=\(.profiles.applicant) club_type=\(.profiles.clubType) applicant_type=\(.profiles.applicantType) club_opportunities=\(.baseline.club_opportunities) applicant_opportunities=\(.baseline.applicant_opportunities) applicant_applications=\(.baseline.applicant_applications) club_received=\(.baseline.club_received_applications) context=\(.canonicalContextCount) read_only=\(.transactionReadOnly)"' "$OUTPUT"

jq -e '
  .classification == "PASS_READ_ONLY_TECHNICAL_QUALIFICATION_DISPOSABLE_ATTESTATION_PENDING"
  and .transactionReadOnly == "on" and .writesPerformed == false and .containsPii == false
' "$OUTPUT" >/dev/null

