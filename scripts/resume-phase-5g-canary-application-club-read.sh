#!/usr/bin/env bash
set +e
set +u
set +o history
umask 077

PROD_BASE_URL="${PROD_BASE_URL:-https://www.clubandplayer.com}"
EXPECTED_RELEASE_SHA="${PHASE_5G_EXPECTED_RELEASE_SHA:-cdb84458c61e72b75ee42a9327cd6510f357887e}"
CREATE_RESPONSE='/tmp/phase-5g-canary-application-create.json'
APPLICANT_RESPONSE='/tmp/phase-5g-canary-application-me.json'
CLUB_RESPONSE='/tmp/phase-5g-canary-application-received.json'
CLUB_401_RESPONSE='/tmp/phase-5g-canary-application-received-401.json'
CLUB_NEW_RESPONSE='/tmp/phase-5g-canary-application-received-after-token-replacement.json'
ENV_RESPONSE='/tmp/phase-5g-canary-env-application.json'

stop() { printf 'PHASE_5G_CANARY_STOP %s\n' "$1" >&2; exit 1; }
[ -n "${CLUB_CANARY_TOKEN:-}" ] || stop 'replacement_club_token_missing'
for file in "$CREATE_RESPONSE" "$APPLICANT_RESPONSE" "$CLUB_RESPONSE" "$ENV_RESPONSE"; do
  [ -r "$file" ] || stop "evidence_missing_$(basename "$file")"
done

jq -e --arg sha "$EXPECTED_RELEASE_SHA" '.sha==$sha and .mode=="production"' "$ENV_RESPONSE" >/dev/null \
  || stop 'preserved_release_drift'
OPPORTUNITY_ID="$(jq -er '.data.opportunity_id' "$CREATE_RESPONSE")" || stop 'opportunity_id_missing'
APPLICATION_ID="$(jq -er '.data.id' "$CREATE_RESPONSE")" || stop 'application_id_missing'

jq -e --arg app "$APPLICATION_ID" --arg opportunity "$OPPORTUNITY_ID" '
  [.data[] | select(.id==$app and .opportunity_id==$opportunity
    and .opportunity.genderCode=="male"
    and (.opportunity.primarySport.sportId | type)=="string"
    and (.opportunity.playerPositionId | type)=="string"
    and .opportunity.staffRoleId==null)] | length==1
' "$APPLICANT_RESPONSE" >/dev/null || stop 'preserved_applicant_read_drift'

[ ! -e "$CLUB_401_RESPONSE" ] && cp "$CLUB_RESPONSE" "$CLUB_401_RESPONSE"
CLUB_STATUS="$(curl -sS -G -o "$CLUB_NEW_RESPONSE" -w '%{http_code}' \
  -H "Authorization: Bearer $CLUB_CANARY_TOKEN" \
  --data-urlencode 'status=all' --data-urlencode "opportunity_id=$OPPORTUNITY_ID" \
  "$PROD_BASE_URL/api/applications/received")"
[ "$CLUB_STATUS" = 200 ] || stop "replacement_club_read_http_$CLUB_STATUS"

jq -e --arg app "$APPLICATION_ID" --arg opportunity "$OPPORTUNITY_ID" '
  [.data[] | select(.id==$app and .opportunity_id==$opportunity
    and .opportunity.genderCode=="male"
    and (.opportunity.primarySport.sportId | type)=="string"
    and (.opportunity.playerPositionId | type)=="string"
    and .opportunity.staffRoleId==null)] | length==1
' "$CLUB_NEW_RESPONSE" >/dev/null || stop 'replacement_club_read_contract_drift'

mv "$CLUB_NEW_RESPONSE" "$CLUB_RESPONSE"
printf 'PHASE_5G_CANARY_APPLICATION_PASS create=201 applicant_me=200 club_received=%s opportunity=%s application=%s applicant_sha256=%s club_sha256=%s rejected_club_sha256=%s\n' \
  "$CLUB_STATUS" "$OPPORTUNITY_ID" "$APPLICATION_ID" \
  "$(sha256sum "$APPLICANT_RESPONSE" | cut -d' ' -f1)" "$(sha256sum "$CLUB_RESPONSE" | cut -d' ' -f1)" \
  "$(sha256sum "$CLUB_401_RESPONSE" | cut -d' ' -f1)"
