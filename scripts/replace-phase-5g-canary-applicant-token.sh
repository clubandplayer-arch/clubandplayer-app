#!/usr/bin/env bash

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  printf 'PHASE_5G_CANARY_STOP source_this_script\n' >&2
  exit 64
fi

set +e
set +u
set +o history
umask 077

EXPECTED_APPLICANT_USER_ID='2c988bc3-5245-45dc-8184-8582ab3b0e5a'
read -rsp 'Nuovo Applicant canary access token (input nascosto): ' NEW_APPLICANT_CANARY_TOKEN
printf '\n'

payload="$(printf '%s' "$NEW_APPLICANT_CANARY_TOKEN" | cut -d. -f2 | tr '_-' '/+')"
padding=$(( (4 - ${#payload} % 4) % 4 ))
payload="${payload}$(printf '=%.0s' $(seq 1 "$padding" 2>/dev/null))"
claims="$(printf '%s' "$payload" | base64 -d 2>/dev/null)"
subject="$(printf '%s' "$claims" | jq -er '.sub')"
expires="$(printf '%s' "$claims" | jq -er '.exp | numbers')"
now="$(date +%s)"

if [ "$subject" != "$EXPECTED_APPLICANT_USER_ID" ]; then
  unset NEW_APPLICANT_CANARY_TOKEN payload claims subject expires now
  printf 'PHASE_5G_CANARY_STOP replacement_applicant_subject_mismatch\n' >&2
  return 1
fi
if [ "$expires" -le "$now" ]; then
  unset NEW_APPLICANT_CANARY_TOKEN payload claims subject expires now
  printf 'PHASE_5G_CANARY_STOP replacement_applicant_token_expired\n' >&2
  return 1
fi

export APPLICANT_CANARY_TOKEN="$NEW_APPLICANT_CANARY_TOKEN"
export APPLICANT_CANARY_USER_ID="$EXPECTED_APPLICANT_USER_ID"
unset NEW_APPLICANT_CANARY_TOKEN payload claims subject expires now
printf 'PHASE_5G_CANARY_APPLICANT_TOKEN_REPLACED applicant=%s\n' "$APPLICANT_CANARY_USER_ID"
