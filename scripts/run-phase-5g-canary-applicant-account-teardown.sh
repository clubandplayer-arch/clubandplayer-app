#!/usr/bin/env bash
set +e
set +u
set +o history
umask 077

PROD_BASE_URL="${PROD_BASE_URL:-https://www.clubandplayer.com}"
EXPECTED_RELEASE_SHA="${PHASE_5G_EXPECTED_RELEASE_SHA:-cdb84458c61e72b75ee42a9327cd6510f357887e}"
CLUB_DELETE_RESPONSE='/tmp/phase-5g-canary-club-account-delete.json'
ENV_RESPONSE='/tmp/phase-5g-canary-env-applicant-account-teardown.json'
APPLICANT_AUTH_RESPONSE='/tmp/phase-5g-canary-applicant-auth-before-delete.json'
APPLICANT_DELETE_RESPONSE='/tmp/phase-5g-canary-applicant-account-delete.json'

stop() { printf 'PHASE_5G_CANARY_STOP %s\n' "$1" >&2; exit 1; }
[ -n "${APPLICANT_CANARY_TOKEN:-}" ] || stop 'applicant_token_missing'
[ -r "$CLUB_DELETE_RESPONSE" ] || stop 'club_delete_evidence_missing'
jq -e '.ok==true' "$CLUB_DELETE_RESPONSE" >/dev/null || stop 'club_delete_evidence_drift'

ENV_STATUS="$(curl -sS -o "$ENV_RESPONSE" -w '%{http_code}' "$PROD_BASE_URL/api/env")"
[ "$ENV_STATUS" = 200 ] || stop "env_http_$ENV_STATUS"
jq -e --arg sha "$EXPECTED_RELEASE_SHA" '.sha==$sha and .mode=="production"' "$ENV_RESPONSE" >/dev/null \
  || stop 'release_sha_drift'

APPLICANT_AUTH_STATUS="$(curl -sS -o "$APPLICANT_AUTH_RESPONSE" -w '%{http_code}' \
  -H "Authorization: Bearer $APPLICANT_CANARY_TOKEN" "$PROD_BASE_URL/api/applications/me?status=all")"
[ "$APPLICANT_AUTH_STATUS" = 200 ] || stop "applicant_auth_http_$APPLICANT_AUTH_STATUS"
jq -e '.data | type=="array" and length==0' "$APPLICANT_AUTH_RESPONSE" >/dev/null || stop 'applicant_residue'

APPLICANT_DELETE_STATUS="$(curl -sS -X DELETE -o "$APPLICANT_DELETE_RESPONSE" -w '%{http_code}' \
  -H "Authorization: Bearer $APPLICANT_CANARY_TOKEN" "$PROD_BASE_URL/api/account/delete")"
[ "$APPLICANT_DELETE_STATUS" = 200 ] || stop "applicant_account_delete_http_$APPLICANT_DELETE_STATUS"
jq -e '.ok==true' "$APPLICANT_DELETE_RESPONSE" >/dev/null || stop 'applicant_account_delete_contract_drift'

unset APPLICANT_CANARY_TOKEN
printf 'PHASE_5G_CANARY_ACCOUNT_TEARDOWN_PASS club_delete=200 applicant_delete=%s\n' "$APPLICANT_DELETE_STATUS"
