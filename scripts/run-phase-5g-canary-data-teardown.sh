#!/usr/bin/env bash
set +e
set +u
set +o history
umask 077

PROD_BASE_URL="${PROD_BASE_URL:-https://www.clubandplayer.com}"
EXPECTED_RELEASE_SHA="${PHASE_5G_EXPECTED_RELEASE_SHA:-cdb84458c61e72b75ee42a9327cd6510f357887e}"
CREATE_RESPONSE='/tmp/phase-5g-canary-application-create.json'
ENV_RESPONSE='/tmp/phase-5g-canary-env-teardown.json'
APPLICATION_DELETE_RESPONSE='/tmp/phase-5g-canary-application-delete.json'
OPPORTUNITY_DELETE_RESPONSE='/tmp/phase-5g-canary-opportunity-delete.json'
OPPORTUNITY_AFTER_RESPONSE='/tmp/phase-5g-canary-opportunity-after-delete.json'

stop() { printf 'PHASE_5G_CANARY_STOP %s\n' "$1" >&2; exit 1; }
[ -n "${CLUB_CANARY_TOKEN:-}" ] || stop 'club_token_missing'
[ -n "${APPLICANT_CANARY_TOKEN:-}" ] || stop 'applicant_token_missing'
[ -r "$CREATE_RESPONSE" ] || stop 'application_evidence_missing'

OPPORTUNITY_ID="$(jq -er '.data.opportunity_id' "$CREATE_RESPONSE")" || stop 'opportunity_id_missing'
APPLICATION_ID="$(jq -er '.data.id' "$CREATE_RESPONSE")" || stop 'application_id_missing'

ENV_STATUS="$(curl -sS -o "$ENV_RESPONSE" -w '%{http_code}' "$PROD_BASE_URL/api/env")"
[ "$ENV_STATUS" = 200 ] || stop "env_http_$ENV_STATUS"
jq -e --arg sha "$EXPECTED_RELEASE_SHA" '.sha==$sha and .mode=="production"' "$ENV_RESPONSE" >/dev/null \
  || stop 'release_sha_drift'

APPLICATION_DELETE_STATUS="$(curl -sS -X DELETE -o "$APPLICATION_DELETE_RESPONSE" -w '%{http_code}' \
  -H "Authorization: Bearer $APPLICANT_CANARY_TOKEN" \
  "$PROD_BASE_URL/api/applications/$APPLICATION_ID")"
[ "$APPLICATION_DELETE_STATUS" = 200 ] || stop "application_delete_http_$APPLICATION_DELETE_STATUS"
jq -e '.ok==true' "$APPLICATION_DELETE_RESPONSE" >/dev/null || stop 'application_delete_contract_drift'

OPPORTUNITY_DELETE_STATUS="$(curl -sS -X DELETE -o "$OPPORTUNITY_DELETE_RESPONSE" -w '%{http_code}' \
  -H "Authorization: Bearer $CLUB_CANARY_TOKEN" \
  "$PROD_BASE_URL/api/opportunities/$OPPORTUNITY_ID")"
[ "$OPPORTUNITY_DELETE_STATUS" = 200 ] || stop "opportunity_delete_http_$OPPORTUNITY_DELETE_STATUS"
jq -e '.success==true' "$OPPORTUNITY_DELETE_RESPONSE" >/dev/null || stop 'opportunity_delete_contract_drift'

OPPORTUNITY_AFTER_STATUS="$(curl -sS -o "$OPPORTUNITY_AFTER_RESPONSE" -w '%{http_code}' \
  "$PROD_BASE_URL/api/opportunities/$OPPORTUNITY_ID")"
[ "$OPPORTUNITY_AFTER_STATUS" = 404 ] || stop "opportunity_after_delete_http_$OPPORTUNITY_AFTER_STATUS"

printf 'PHASE_5G_CANARY_DATA_TEARDOWN_PASS application_delete=%s opportunity_delete=%s opportunity_after=%s opportunity=%s application=%s\n' \
  "$APPLICATION_DELETE_STATUS" "$OPPORTUNITY_DELETE_STATUS" "$OPPORTUNITY_AFTER_STATUS" \
  "$OPPORTUNITY_ID" "$APPLICATION_ID"
