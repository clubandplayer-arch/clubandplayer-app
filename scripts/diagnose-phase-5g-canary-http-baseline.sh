#!/usr/bin/env bash
set +e
set +u
set +o history
umask 077

ENV_FILE='/tmp/phase-5g-canary-env-before.json'
APPLICANT_FILE='/tmp/phase-5g-canary-applicant-applications-before.json'
CLUB_FILE='/tmp/phase-5g-canary-club-received-before.json'
EXPECTED_CLUB_USER_ID='870bb095-9f8b-4800-a8b9-3e137714e8d0'

stop() { printf 'PHASE_5G_CANARY_DIAGNOSTIC_STOP %s\n' "$1" >&2; exit 1; }
[ -n "${CLUB_CANARY_TOKEN:-}" ] || stop 'club_token_missing'
for file in "$ENV_FILE" "$APPLICANT_FILE" "$CLUB_FILE"; do
  [ -r "$file" ] || stop "evidence_missing_$(basename "$file")"
done

payload="$(printf '%s' "$CLUB_CANARY_TOKEN" | cut -d. -f2 | tr '_-' '/+')"
padding=$(( (4 - ${#payload} % 4) % 4 ))
payload="${payload}$(printf '=%.0s' $(seq 1 "$padding" 2>/dev/null))"
claims="$(printf '%s' "$payload" | base64 -d 2>/dev/null)"
subject="$(printf '%s' "$claims" | jq -er '.sub')"
expires="$(printf '%s' "$claims" | jq -er '.exp | numbers')"
now="$(date +%s)"
[ "$subject" = "$EXPECTED_CLUB_USER_ID" ] || stop 'club_subject_mismatch'

if [ "$expires" -le "$now" ]; then token_state='expired'; else token_state='unexpired'; fi
club_shape="$(jq -r 'if type=="object" then (keys|sort|join(",")) else type end' "$CLUB_FILE" 2>/dev/null)"
club_code="$(jq -r '(.code // .error // "none") | tostring | gsub("[^A-Za-z0-9_.-]";"_") | .[0:80]' "$CLUB_FILE" 2>/dev/null)"

printf 'PHASE_5G_CANARY_HTTP_DIAGNOSTIC token=%s seconds_remaining=%s club_shape=%s club_code=%s env_sha256=%s applicant_sha256=%s club_sha256=%s\n' \
  "$token_state" "$((expires-now))" "$club_shape" "$club_code" \
  "$(sha256sum "$ENV_FILE" | cut -d' ' -f1)" \
  "$(sha256sum "$APPLICANT_FILE" | cut -d' ' -f1)" \
  "$(sha256sum "$CLUB_FILE" | cut -d' ' -f1)"

unset payload claims subject expires now token_state club_shape club_code

