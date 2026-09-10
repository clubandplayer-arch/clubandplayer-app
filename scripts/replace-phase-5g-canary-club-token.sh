#!/usr/bin/env bash

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  printf 'PHASE_5G_CANARY_STOP source_this_script\n' >&2
  exit 64
fi

set +e
set +u
set +o history
umask 077

EXPECTED_CLUB_USER_ID='870bb095-9f8b-4800-a8b9-3e137714e8d0'
read -rsp 'Nuovo Club canary access token (input nascosto): ' NEW_CLUB_CANARY_TOKEN
printf '\n'

payload="$(printf '%s' "$NEW_CLUB_CANARY_TOKEN" | cut -d. -f2 | tr '_-' '/+')"
padding=$(( (4 - ${#payload} % 4) % 4 ))
payload="${payload}$(printf '=%.0s' $(seq 1 "$padding" 2>/dev/null))"
claims="$(printf '%s' "$payload" | base64 -d 2>/dev/null)"
subject="$(printf '%s' "$claims" | jq -er '.sub')"
expires="$(printf '%s' "$claims" | jq -er '.exp | numbers')"
now="$(date +%s)"

if [ "$subject" != "$EXPECTED_CLUB_USER_ID" ]; then
  unset NEW_CLUB_CANARY_TOKEN payload claims subject expires now
  printf 'PHASE_5G_CANARY_STOP replacement_club_subject_mismatch\n' >&2
  return 1
fi
if [ "$expires" -le "$now" ]; then
  unset NEW_CLUB_CANARY_TOKEN payload claims subject expires now
  printf 'PHASE_5G_CANARY_STOP replacement_club_token_expired\n' >&2
  return 1
fi

export CLUB_CANARY_TOKEN="$NEW_CLUB_CANARY_TOKEN"
export CLUB_CANARY_USER_ID="$EXPECTED_CLUB_USER_ID"
unset NEW_CLUB_CANARY_TOKEN payload claims subject expires now
printf 'PHASE_5G_CANARY_CLUB_TOKEN_REPLACED club=%s\n' "$CLUB_CANARY_USER_ID"

