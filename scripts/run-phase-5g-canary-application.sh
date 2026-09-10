#!/usr/bin/env bash
set +e
set +u
set +o history
umask 077

PROD_BASE_URL="${PROD_BASE_URL:-https://www.clubandplayer.com}"
EXPECTED_RELEASE_SHA="${PHASE_5G_EXPECTED_RELEASE_SHA:-cdb84458c61e72b75ee42a9327cd6510f357887e}"
OPPORTUNITY_RESPONSE='/tmp/phase-5g-canary-opportunity-create.json'
CREATE_RESPONSE='/tmp/phase-5g-canary-application-create.json'
APPLICANT_RESPONSE='/tmp/phase-5g-canary-application-me.json'
CLUB_RESPONSE='/tmp/phase-5g-canary-application-received.json'
ENV_RESPONSE='/tmp/phase-5g-canary-env-application.json'

stop() { printf 'PHASE_5G_CANARY_STOP %s\n' "$1" >&2; exit 1; }
[ -n "${CLUB_CANARY_TOKEN:-}" ] || stop 'club_token_missing'
[ -n "${APPLICANT_CANARY_TOKEN:-}" ] || stop 'applicant_token_missing'
[ -r "$OPPORTUNITY_RESPONSE" ] || stop 'opportunity_evidence_missing'

OPPORTUNITY_ID="$(jq -er '.data.id | select(type=="string")' "$OPPORTUNITY_RESPONSE")" \
  || stop 'opportunity_id_missing'

ENV_STATUS="$(curl -sS -o "$ENV_RESPONSE" -w '%{http_code}' "$PROD_BASE_URL/api/env")"
[ "$ENV_STATUS" = 200 ] || stop "env_http_$ENV_STATUS"
jq -e --arg sha "$EXPECTED_RELEASE_SHA" '.sha==$sha and .mode=="production"' "$ENV_RESPONSE" >/dev/null \
  || stop 'release_sha_drift'

CREATE_STATUS="$(curl -sS -o "$CREATE_RESPONSE" -w '%{http_code}' \
  -H "Authorization: Bearer $APPLICANT_CANARY_TOKEN" -H 'Content-Type: application/json' \
  --data-binary "$(jq -nc --arg id "$OPPORTUNITY_ID" '{opportunity_id:$id,note:"Disposable Phase 5G canary"}')" \
  "$PROD_BASE_URL/api/applications")"
[ "$CREATE_STATUS" = 201 ] || stop "application_create_http_$CREATE_STATUS"
APPLICATION_ID="$(jq -er --arg opportunity "$OPPORTUNITY_ID" \
  '.data | select(.opportunity_id==$opportunity and .status=="submitted") | .id' "$CREATE_RESPONSE")" \
  || stop 'application_create_contract_drift'

APPLICANT_STATUS="$(curl -sS -G -o "$APPLICANT_RESPONSE" -w '%{http_code}' \
  -H "Authorization: Bearer $APPLICANT_CANARY_TOKEN" \
  --data-urlencode 'status=all' --data-urlencode "opportunity_id=$OPPORTUNITY_ID" \
  "$PROD_BASE_URL/api/applications/me")"
[ "$APPLICANT_STATUS" = 200 ] || stop "applicant_read_http_$APPLICANT_STATUS"

CLUB_STATUS="$(curl -sS -G -o "$CLUB_RESPONSE" -w '%{http_code}' \
  -H "Authorization: Bearer $CLUB_CANARY_TOKEN" \
  --data-urlencode 'status=all' --data-urlencode "opportunity_id=$OPPORTUNITY_ID" \
  "$PROD_BASE_URL/api/applications/received")"
[ "$CLUB_STATUS" = 200 ] || stop "club_read_http_$CLUB_STATUS"

for response in "$APPLICANT_RESPONSE" "$CLUB_RESPONSE"; do
  jq -e --arg app "$APPLICATION_ID" --arg opportunity "$OPPORTUNITY_ID" '
    [.data[] | select(.id==$app and .opportunity_id==$opportunity
      and .opportunity.genderCode=="male"
      and (.opportunity.primarySport.sportId | type)=="string"
      and (.opportunity.playerPositionId | type)=="string"
      and .opportunity.staffRoleId==null)] | length==1
  ' "$response" >/dev/null || stop "application_read_contract_drift_$(basename "$response")"
done

printf 'PHASE_5G_CANARY_APPLICATION_PASS create=%s applicant_me=%s club_received=%s opportunity=%s application=%s applicant_sha256=%s club_sha256=%s\n' \
  "$CREATE_STATUS" "$APPLICANT_STATUS" "$CLUB_STATUS" "$OPPORTUNITY_ID" "$APPLICATION_ID" \
  "$(sha256sum "$APPLICANT_RESPONSE" | cut -d' ' -f1)" "$(sha256sum "$CLUB_RESPONSE" | cut -d' ' -f1)"
