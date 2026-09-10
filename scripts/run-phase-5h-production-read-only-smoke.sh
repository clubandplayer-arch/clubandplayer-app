#!/usr/bin/env bash
set +e
set +u
set +o history
umask 077

EXPECTED_RELEASE="${PHASE_5H_EXPECTED_RELEASE_SHA:-199ccbeac489faae4e161e300b3e92d06b48f12f}"
PROD_BASE_URL="${PROD_BASE_URL:-https://www.clubandplayer.com}"
WORK_DIR="$(mktemp -d /tmp/phase-5h-read-only-smoke.XXXXXX)" || exit 1

cleanup() {
  unset PHASE_5H_ACCESS_TOKEN
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

stop() { printf 'PHASE_5H_READ_ONLY_SMOKE_STOP %s\n' "$1" >&2; exit 1; }
command -v curl >/dev/null 2>&1 || stop 'curl_missing'
command -v jq >/dev/null 2>&1 || stop 'jq_missing'

if [ -z "${PHASE_5H_ACCESS_TOKEN:-}" ]; then
  read -rsp 'Production access token di un profilo con sport canonico (input nascosto): ' PHASE_5H_ACCESS_TOKEN
  printf '\n'
fi
[ -n "${PHASE_5H_ACCESS_TOKEN:-}" ] || stop 'access_token_missing'

request() {
  local output="$1"
  shift
  curl -sS -o "$output" -w '%{http_code}' "$@"
}

ENV_FILE="$WORK_DIR/env.json"
PROFILE_FILE="$WORK_DIR/profile.json"
CANONICAL_FILE="$WORK_DIR/search-canonical.json"
LEGACY_FILE="$WORK_DIR/search-legacy.json"
INVALID_FILE="$WORK_DIR/search-invalid.json"
DISCOVER_FILE="$WORK_DIR/discover.json"
WHO_FILE="$WORK_DIR/who-to-follow.json"

ENV_STATUS="$(request "$ENV_FILE" "$PROD_BASE_URL/api/env")"
[ "$ENV_STATUS" = 200 ] || stop "env_http_$ENV_STATUS"
jq -e --arg sha "$EXPECTED_RELEASE" \
  '.sha==$sha and .mode=="production" and .hasUrl==true and .hasAnon==true' \
  "$ENV_FILE" >/dev/null || stop 'release_drift'

PROFILE_STATUS="$(request "$PROFILE_FILE" \
  -H "Authorization: Bearer $PHASE_5H_ACCESS_TOKEN" \
  "$PROD_BASE_URL/api/profiles/me")"
[ "$PROFILE_STATUS" = 200 ] || stop "profile_http_$PROFILE_STATUS"

SPORT_ID="$(jq -r '.data.sport_id // empty' "$PROFILE_FILE")"
DISCIPLINE_ID="$(jq -r '.data.sport_discipline_id // empty' "$PROFILE_FILE")"
VARIANT_ID="$(jq -r '.data.sport_variant_id // empty' "$PROFILE_FILE")"
LEGACY_SPORT="$(jq -r '.data.sport // "football"' "$PROFILE_FILE")"
[ -n "$SPORT_ID" ] || stop 'profile_canonical_sport_missing'
[ -n "$LEGACY_SPORT" ] || LEGACY_SPORT='football'

CANONICAL_ARGS=(
  -G "$PROD_BASE_URL/api/search"
  --data-urlencode 'q=football'
  --data-urlencode 'type=all'
  --data-urlencode 'limit=5'
  --data-urlencode "sportId=$SPORT_ID"
)
[ -z "$DISCIPLINE_ID" ] || CANONICAL_ARGS+=(--data-urlencode "disciplineId=$DISCIPLINE_ID")
[ -z "$VARIANT_ID" ] || CANONICAL_ARGS+=(--data-urlencode "variantId=$VARIANT_ID")

CANONICAL_STATUS="$(request "$CANONICAL_FILE" "${CANONICAL_ARGS[@]}")"
[ "$CANONICAL_STATUS" = 200 ] || stop "canonical_search_http_$CANONICAL_STATUS"
jq -e --arg sport "$SPORT_ID" --arg discipline "$DISCIPLINE_ID" --arg variant "$VARIANT_ID" '
  .ok==true and
  .filters.sportId==$sport and
  .filters.disciplineId==($discipline | select(length > 0) // null) and
  .filters.variantId==($variant | select(length > 0) // null)
' "$CANONICAL_FILE" >/dev/null || stop 'canonical_search_contract'

LEGACY_STATUS="$(request "$LEGACY_FILE" -G "$PROD_BASE_URL/api/search" \
  --data-urlencode 'q=football' --data-urlencode 'type=all' --data-urlencode 'limit=5' \
  --data-urlencode "sport=$LEGACY_SPORT")"
[ "$LEGACY_STATUS" = 200 ] || stop "legacy_search_http_$LEGACY_STATUS"
jq -e --arg sport "$LEGACY_SPORT" \
  '.ok==true and .filters.sport==$sport and .filters.sportId==null and .filters.disciplineId==null and .filters.variantId==null' \
  "$LEGACY_FILE" >/dev/null || stop 'legacy_search_contract'

INVALID_STATUS="$(request "$INVALID_FILE" -G "$PROD_BASE_URL/api/search" \
  --data-urlencode 'q=football' --data-urlencode 'type=all' --data-urlencode 'sportId=football')"
[ "$INVALID_STATUS" = 400 ] || stop "invalid_search_http_$INVALID_STATUS"
jq -e '.ok==false and .code=="INVALID_PAYLOAD" and .message=="invalid_sport_id"' \
  "$INVALID_FILE" >/dev/null || stop 'invalid_search_contract'

DISCOVER_STATUS="$(request "$DISCOVER_FILE" \
  -H "Authorization: Bearer $PHASE_5H_ACCESS_TOKEN" \
  "$PROD_BASE_URL/api/follows/suggestions?limit=5&sportScope=mine")"
[ "$DISCOVER_STATUS" = 200 ] || stop "discover_http_$DISCOVER_STATUS"
jq -e '.ok==true and (.items | type)=="array"' "$DISCOVER_FILE" >/dev/null || stop 'discover_contract'

WHO_STATUS="$(request "$WHO_FILE" \
  -H "Authorization: Bearer $PHASE_5H_ACCESS_TOKEN" \
  "$PROD_BASE_URL/api/suggestions/who-to-follow?limit=5")"
[ "$WHO_STATUS" = 200 ] || stop "who_to_follow_http_$WHO_STATUS"
jq -e '.ok==true and (.suggestions | type)=="array"' "$WHO_FILE" >/dev/null || stop 'who_to_follow_contract'

printf 'PHASE_5H_PRODUCTION_READ_ONLY_SMOKE_PASS release=%s profile=%s canonical_search=%s legacy_search=%s invalid_search=%s discover=%s who_to_follow=%s sport_id=%s responses_sha256=%s\n' \
  "$EXPECTED_RELEASE" "$PROFILE_STATUS" "$CANONICAL_STATUS" "$LEGACY_STATUS" "$INVALID_STATUS" \
  "$DISCOVER_STATUS" "$WHO_STATUS" "$SPORT_ID" \
  "$(cat "$CANONICAL_FILE" "$LEGACY_FILE" "$DISCOVER_FILE" "$WHO_FILE" | sha256sum | cut -d' ' -f1)"
