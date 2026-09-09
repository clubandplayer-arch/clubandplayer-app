#!/usr/bin/env bash
set +e
set +u
set +o history
umask 077

PAYLOAD='/tmp/phase-5g-canary-opportunity-payload.json'
RESPONSE='/tmp/phase-5g-canary-opportunity-create.json'

stop() { printf 'PHASE_5G_CANARY_OPPORTUNITY_DIAGNOSTIC_STOP %s\n' "$1" >&2; exit 1; }
for file in "$PAYLOAD" "$RESPONSE"; do
  [ -r "$file" ] || stop "evidence_missing_$(basename "$file")"
done
command -v jq >/dev/null 2>&1 || stop 'jq_missing'

shape="$(jq -r 'if type=="object" then (keys|sort|join(",")) else type end' "$RESPONSE" 2>/dev/null)"
code="$(jq -r '(.code // .error // "none") | tostring | gsub("[^A-Za-z0-9_.-]";"_") | .[0:80]' "$RESPONSE" 2>/dev/null)"
message="$(jq -r '(.message // "none") | tostring | gsub("[^A-Za-z0-9_. -]";"_") | .[0:160]' "$RESPONSE" 2>/dev/null)"
response_id="$(jq -r '(.data.id // "none") | tostring | if test("^[0-9a-fA-F-]{36}$") then "present" else "absent" end' "$RESPONSE" 2>/dev/null)"
payload_shape="$(jq -r 'keys|sort|join(",")' "$PAYLOAD" 2>/dev/null)"

printf 'PHASE_5G_CANARY_OPPORTUNITY_DIAGNOSTIC shape=%s code=%s message=%s response_id=%s payload_shape=%s payload_sha256=%s response_sha256=%s\n' \
  "$shape" "$code" "$message" "$response_id" "$payload_shape" \
  "$(sha256sum "$PAYLOAD" | cut -d' ' -f1)" "$(sha256sum "$RESPONSE" | cut -d' ' -f1)"

unset shape code message response_id payload_shape

