#!/usr/bin/env bash
set +e
set +u
set +o history
umask 077

EXPECTED_RELEASE="${PHASE_5G_EXPECTED_RELEASE_SHA:-cdb84458c61e72b75ee42a9327cd6510f357887e}"
PROD_BASE_URL="${PROD_BASE_URL:-https://www.clubandplayer.com}"
ENV_FILE='/tmp/phase-5g-canary-env-before.json'
APPLICANT_FILE='/tmp/phase-5g-canary-applicant-applications-before.json'
CLUB_FILE='/tmp/phase-5g-canary-club-received-before.json'
CLUB_401_FILE='/tmp/phase-5g-canary-club-received-401.json'
CLUB_NEW_FILE='/tmp/phase-5g-canary-club-received-after-token-replacement.json'

stop() { printf 'PHASE_5G_CANARY_STOP %s\n' "$1" >&2; exit 1; }
[ -n "${CLUB_CANARY_TOKEN:-}" ] || stop 'replacement_club_token_missing'
for file in "$ENV_FILE" "$APPLICANT_FILE" "$CLUB_FILE"; do
  [ -r "$file" ] || stop "evidence_missing_$(basename "$file")"
done
command -v curl >/dev/null 2>&1 || stop 'curl_missing'
command -v jq >/dev/null 2>&1 || stop 'jq_missing'

# Preserve the rejected response before the only replacement-token request.
if [ ! -e "$CLUB_401_FILE" ]; then cp "$CLUB_FILE" "$CLUB_401_FILE" || stop 'cannot_archive_401'; fi

CLUB_STATUS="$(curl -sS -o "$CLUB_NEW_FILE" -w '%{http_code}' \
  -H "Authorization: Bearer $CLUB_CANARY_TOKEN" \
  "$PROD_BASE_URL/api/applications/received?status=all")"
[ "$CLUB_STATUS" = 200 ] || stop "replacement_club_http_$CLUB_STATUS"

jq -e --arg sha "$EXPECTED_RELEASE" '.sha==$sha and .mode=="production" and .hasUrl==true and .hasAnon==true' "$ENV_FILE" >/dev/null || stop 'preserved_release_drift'
jq -e '.data | type=="array" and length==0' "$APPLICANT_FILE" >/dev/null || stop 'preserved_applicant_baseline_drift'
jq -e '.data | type=="array" and length==0' "$CLUB_NEW_FILE" >/dev/null || stop 'replacement_club_baseline_drift'

mv "$CLUB_NEW_FILE" "$CLUB_FILE"
printf 'PHASE_5G_CANARY_HTTP_BASELINE_PASS env=200 applicant_me=200 club_received=%s applicant_sha256=%s club_sha256=%s rejected_club_sha256=%s\n' \
  "$CLUB_STATUS" \
  "$(sha256sum "$APPLICANT_FILE" | cut -d' ' -f1)" \
  "$(sha256sum "$CLUB_FILE" | cut -d' ' -f1)" \
  "$(sha256sum "$CLUB_401_FILE" | cut -d' ' -f1)"
