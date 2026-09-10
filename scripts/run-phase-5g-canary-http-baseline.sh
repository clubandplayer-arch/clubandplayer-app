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

stop() { printf 'PHASE_5G_CANARY_STOP %s\n' "$1" >&2; exit 1; }
[ -n "${CLUB_CANARY_TOKEN:-}" ] || stop 'club_token_missing'
[ -n "${APPLICANT_CANARY_TOKEN:-}" ] || stop 'applicant_token_missing'
command -v curl >/dev/null 2>&1 || stop 'curl_missing'
command -v jq >/dev/null 2>&1 || stop 'jq_missing'

ENV_STATUS="$(curl -sS -o "$ENV_FILE" -w '%{http_code}' "$PROD_BASE_URL/api/env")"
APPLICANT_STATUS="$(curl -sS -o "$APPLICANT_FILE" -w '%{http_code}' \
  -H "Authorization: Bearer $APPLICANT_CANARY_TOKEN" \
  "$PROD_BASE_URL/api/applications/me?status=all")"
CLUB_STATUS="$(curl -sS -o "$CLUB_FILE" -w '%{http_code}' \
  -H "Authorization: Bearer $CLUB_CANARY_TOKEN" \
  "$PROD_BASE_URL/api/applications/received?status=all")"

[ "$ENV_STATUS" = 200 ] || stop "env_http_$ENV_STATUS"
[ "$APPLICANT_STATUS" = 200 ] || stop "applicant_http_$APPLICANT_STATUS"
[ "$CLUB_STATUS" = 200 ] || stop "club_http_$CLUB_STATUS"
jq -e --arg sha "$EXPECTED_RELEASE" '.sha==$sha and .mode=="production" and .hasUrl==true and .hasAnon==true' "$ENV_FILE" >/dev/null || stop 'release_drift'
jq -e '.data | type=="array" and length==0' "$APPLICANT_FILE" >/dev/null || stop 'applicant_baseline_drift'
jq -e '.data | type=="array" and length==0' "$CLUB_FILE" >/dev/null || stop 'club_baseline_drift'

printf 'PHASE_5G_CANARY_HTTP_BASELINE_PASS env=%s applicant_me=%s club_received=%s applicant_sha256=%s club_sha256=%s\n' \
  "$ENV_STATUS" "$APPLICANT_STATUS" "$CLUB_STATUS" \
  "$(sha256sum "$APPLICANT_FILE" | cut -d' ' -f1)" \
  "$(sha256sum "$CLUB_FILE" | cut -d' ' -f1)"
