#!/usr/bin/env bash
set +e
set +u
set +o history
umask 077

PROD_BASE_URL="${PROD_BASE_URL:-https://www.clubandplayer.com}"
EXPECTED_RELEASE_SHA="${PHASE_5G_EXPECTED_RELEASE_SHA:-cdb84458c61e72b75ee42a9327cd6510f357887e}"
ENV_RESPONSE='/tmp/phase-5g-canary-env-current.json'
QUALIFICATION='/tmp/phase-5g-canary-accounts-qualification.json'
APPLICANT_BASELINE='/tmp/phase-5g-canary-applicant-applications-before.json'
CLUB_BASELINE='/tmp/phase-5g-canary-club-received-before.json'
PAYLOAD='/tmp/phase-5g-canary-opportunity-payload.json'
CREATE_RESPONSE='/tmp/phase-5g-canary-opportunity-create.json'
DETAIL_RESPONSE='/tmp/phase-5g-canary-opportunity-detail.json'
FILTER_RESPONSE='/tmp/phase-5g-canary-opportunity-filter.json'
EXPECTED_BASELINE_SHA256='8fe32e407a1038ee38753b70e5374b3a46d6ae9d5f16cd5b73c53abaca8f5ed0'

stop() { printf 'PHASE_5G_CANARY_STOP %s\n' "$1" >&2; exit 1; }
[ -n "${CLUB_CANARY_TOKEN:-}" ] || stop 'club_token_missing'
[ -n "$EXPECTED_RELEASE_SHA" ] || stop 'expected_release_sha_missing'

ENV_STATUS="$(curl -sS -o "$ENV_RESPONSE" -w '%{http_code}' "$PROD_BASE_URL/api/env")"
[ "$ENV_STATUS" = 200 ] || stop "env_http_$ENV_STATUS"
jq -e --arg sha "$EXPECTED_RELEASE_SHA" '.sha==$sha and .mode=="production"' "$ENV_RESPONSE" >/dev/null \
  || stop 'release_sha_drift'

for file in "$QUALIFICATION" "$APPLICANT_BASELINE" "$CLUB_BASELINE"; do
  [ -r "$file" ] || stop "evidence_missing_$(basename "$file")"
done
[ "$(sha256sum "$APPLICANT_BASELINE" | cut -d' ' -f1)" = "$EXPECTED_BASELINE_SHA256" ] || stop 'applicant_baseline_hash_drift'
[ "$(sha256sum "$CLUB_BASELINE" | cut -d' ' -f1)" = "$EXPECTED_BASELINE_SHA256" ] || stop 'club_baseline_hash_drift'
jq -e '.classification=="PASS_READ_ONLY_TECHNICAL_QUALIFICATION_DISPOSABLE_ATTESTATION_PENDING" and .canonicalContextCount==1' "$QUALIFICATION" >/dev/null || stop 'qualification_drift'

jq -n --argjson c "$(jq -c '.canonicalContext' "$QUALIFICATION")" '{
  title:"Phase 5G Canary Opportunity", description:"Disposable Phase 5G runtime canary",
  primarySport:{canonical:{sportId:$c.sport_id,disciplineId:$c.discipline_id,variantId:$c.variant_id}},
  playerPositionId:$c.player_position_id, role:"Portiere", roleGroup:"player",
  requiredCategory:"goalkeeper", gender:"male"
}' >"$PAYLOAD"

CREATE_STATUS="$(curl -sS -o "$CREATE_RESPONSE" -w '%{http_code}' \
  -H "Authorization: Bearer $CLUB_CANARY_TOKEN" -H 'Content-Type: application/json' \
  --data-binary "@$PAYLOAD" "$PROD_BASE_URL/api/opportunities")"
[ "$CREATE_STATUS" = 201 ] || stop "opportunity_create_http_$CREATE_STATUS"
OPPORTUNITY_ID="$(jq -er '.data.id | select(type=="string")' "$CREATE_RESPONSE")" || stop 'opportunity_id_missing'

SPORT_ID="$(jq -er '.canonicalContext.sport_id' "$QUALIFICATION")"
DISCIPLINE_ID="$(jq -er '.canonicalContext.discipline_id' "$QUALIFICATION")"
VARIANT_ID="$(jq -er '.canonicalContext.variant_id' "$QUALIFICATION")"
POSITION_ID="$(jq -er '.canonicalContext.player_position_id' "$QUALIFICATION")"
jq -e --arg sport "$SPORT_ID" --arg discipline "$DISCIPLINE_ID" --arg variant "$VARIANT_ID" --arg position "$POSITION_ID" '
  .data.primarySport=={sportId:$sport,disciplineId:$discipline,variantId:$variant}
  and .data.playerPositionId==$position and .data.staffRoleId==null
  and .data.genderCode=="male" and .data.sport!=null and .data.role=="Portiere"
' "$CREATE_RESPONSE" >/dev/null || stop 'opportunity_create_contract_drift'

DETAIL_STATUS="$(curl -sS -o "$DETAIL_RESPONSE" -w '%{http_code}' "$PROD_BASE_URL/api/opportunities/$OPPORTUNITY_ID")"
[ "$DETAIL_STATUS" = 200 ] || stop "opportunity_detail_http_$DETAIL_STATUS"
jq -e --arg id "$OPPORTUNITY_ID" --arg position "$POSITION_ID" '.data.id==$id and .data.playerPositionId==$position' "$DETAIL_RESPONSE" >/dev/null || stop 'opportunity_detail_drift'

FILTER_STATUS="$(curl -sS -G -o "$FILTER_RESPONSE" -w '%{http_code}' "$PROD_BASE_URL/api/opportunities" \
  --data-urlencode "sportId=$SPORT_ID" --data-urlencode "disciplineId=$DISCIPLINE_ID" \
  --data-urlencode "variantId=$VARIANT_ID" --data-urlencode "playerPositionId=$POSITION_ID" \
  --data-urlencode 'genderCode=male' --data-urlencode 'pageSize=100')"
[ "$FILTER_STATUS" = 200 ] || stop "opportunity_filter_http_$FILTER_STATUS"
jq -e --arg id "$OPPORTUNITY_ID" '[.data[] | select(.id==$id)] | length==1' "$FILTER_RESPONSE" >/dev/null || stop 'opportunity_filter_drift'

printf 'PHASE_5G_CANARY_OPPORTUNITY_PASS create=%s detail=%s filter=%s opportunity=%s create_sha256=%s detail_sha256=%s filter_sha256=%s\n' \
  "$CREATE_STATUS" "$DETAIL_STATUS" "$FILTER_STATUS" "$OPPORTUNITY_ID" \
  "$(sha256sum "$CREATE_RESPONSE" | cut -d' ' -f1)" "$(sha256sum "$DETAIL_RESPONSE" | cut -d' ' -f1)" \
  "$(sha256sum "$FILTER_RESPONSE" | cut -d' ' -f1)"
