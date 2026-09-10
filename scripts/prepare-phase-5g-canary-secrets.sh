#!/usr/bin/env bash

# Must be sourced so the two secrets remain available in the caller terminal.
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  printf 'PHASE_5G_CANARY_STOP source_this_script\n' >&2
  exit 64
fi

set +e
set +u
set +o history
umask 077

export CLUB_CANARY_USER_ID='870bb095-9f8b-4800-a8b9-3e137714e8d0'
export APPLICANT_CANARY_USER_ID='2c988bc3-5245-45dc-8184-8582ab3b0e5a'
export PROD_BASE_URL='https://www.clubandplayer.com'
export PHASE_5G_EXPECTED_RELEASE_SHA='cdb84458c61e72b75ee42a9327cd6510f357887e'

read -rsp 'Club canary access token (input nascosto): ' CLUB_CANARY_TOKEN
printf '\n'
read -rsp 'Applicant canary access token (input nascosto): ' APPLICANT_CANARY_TOKEN
printf '\n'

decode_claims() {
  local token="$1" payload padding
  payload="$(printf '%s' "$token" | cut -d. -f2 | tr '_-' '/+')"
  padding=$(( (4 - ${#payload} % 4) % 4 ))
  payload="${payload}$(printf '=%.0s' $(seq 1 "$padding" 2>/dev/null))"
  printf '%s' "$payload" | base64 -d 2>/dev/null
}

CLUB_CLAIMS="$(decode_claims "$CLUB_CANARY_TOKEN")"
APPLICANT_CLAIMS="$(decode_claims "$APPLICANT_CANARY_TOKEN")"
CLUB_SUB="$(printf '%s' "$CLUB_CLAIMS" | jq -er '.sub')"
APPLICANT_SUB="$(printf '%s' "$APPLICANT_CLAIMS" | jq -er '.sub')"
CLUB_EXP="$(printf '%s' "$CLUB_CLAIMS" | jq -er '.exp | numbers')"
APPLICANT_EXP="$(printf '%s' "$APPLICANT_CLAIMS" | jq -er '.exp | numbers')"
NOW="$(date +%s)"

if [ "$CLUB_SUB" != "$CLUB_CANARY_USER_ID" ] || [ "$APPLICANT_SUB" != "$APPLICANT_CANARY_USER_ID" ]; then
  unset CLUB_CANARY_TOKEN APPLICANT_CANARY_TOKEN CLUB_CLAIMS APPLICANT_CLAIMS
  printf 'PHASE_5G_CANARY_STOP token_subject_mismatch\n' >&2
  return 1
fi
if [ "$CLUB_EXP" -le "$NOW" ] || [ "$APPLICANT_EXP" -le "$NOW" ]; then
  unset CLUB_CANARY_TOKEN APPLICANT_CANARY_TOKEN CLUB_CLAIMS APPLICANT_CLAIMS
  printf 'PHASE_5G_CANARY_STOP token_expired\n' >&2
  return 1
fi

export CLUB_CANARY_TOKEN APPLICANT_CANARY_TOKEN
unset CLUB_CLAIMS APPLICANT_CLAIMS CLUB_SUB APPLICANT_SUB CLUB_EXP APPLICANT_EXP NOW
printf 'PHASE_5G_CANARY_SECRETS_READY club=%s applicant=%s release=%s\n' \
  "$CLUB_CANARY_USER_ID" "$APPLICANT_CANARY_USER_ID" "$PHASE_5G_EXPECTED_RELEASE_SHA"
