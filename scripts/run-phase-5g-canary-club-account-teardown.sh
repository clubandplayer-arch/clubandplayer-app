#!/usr/bin/env bash
set +e
set +u
set +o history
umask 077

PROD_BASE_URL="${PROD_BASE_URL:-https://www.clubandplayer.com}"
EXPECTED_RELEASE_SHA="${PHASE_5G_EXPECTED_RELEASE_SHA:-cdb84458c61e72b75ee42a9327cd6510f357887e}"
ENV_RESPONSE='/tmp/phase-5g-canary-env-club-account-teardown.json'
CLUB_AUTH_RESPONSE='/tmp/phase-5g-canary-club-auth-before-delete.json'
CLUB_DELETE_RESPONSE='/tmp/phase-5g-canary-club-account-delete.json'

stop() { printf 'PHASE_5G_CANARY_STOP %s\n' "$1" >&2; exit 1; }
[ -n "${CLUB_CANARY_TOKEN:-}" ] || stop 'club_token_missing'

ENV_STATUS="$(curl -sS -o "$ENV_RESPONSE" -w '%{http_code}' "$PROD_BASE_URL/api/env")"
[ "$ENV_STATUS" = 200 ] || stop "env_http_$ENV_STATUS"
jq -e --arg sha "$EXPECTED_RELEASE_SHA" '.sha==$sha and .mode=="production"' "$ENV_RESPONSE" >/dev/null \
  || stop 'release_sha_drift'

CLUB_AUTH_STATUS="$(curl -sS -o "$CLUB_AUTH_RESPONSE" -w '%{http_code}' \
  -H "Authorization: Bearer $CLUB_CANARY_TOKEN" "$PROD_BASE_URL/api/applications/received?status=all")"
[ "$CLUB_AUTH_STATUS" = 200 ] || stop "club_auth_http_$CLUB_AUTH_STATUS"
jq -e '.data | type=="array" and length==0' "$CLUB_AUTH_RESPONSE" >/dev/null || stop 'club_residue'

CLUB_DELETE_STATUS="$(curl -sS -X DELETE -o "$CLUB_DELETE_RESPONSE" -w '%{http_code}' \
  -H "Authorization: Bearer $CLUB_CANARY_TOKEN" "$PROD_BASE_URL/api/account/delete")"
[ "$CLUB_DELETE_STATUS" = 200 ] || stop "club_account_delete_http_$CLUB_DELETE_STATUS"
jq -e '.ok==true' "$CLUB_DELETE_RESPONSE" >/dev/null || stop 'club_account_delete_contract_drift'

unset CLUB_CANARY_TOKEN
printf 'PHASE_5G_CANARY_CLUB_ACCOUNT_TEARDOWN_PASS club_delete=%s\n' "$CLUB_DELETE_STATUS"
