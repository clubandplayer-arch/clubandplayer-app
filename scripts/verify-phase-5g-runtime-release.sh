#!/usr/bin/env bash
set -eo pipefail
set +u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ "$#" -ne 1 ] || [ -z "${1:-}" ]; then
  printf 'Usage: %s <remote-candidate-sha>\n' "$0" >&2
  exit 64
fi

CANDIDATE="$1"
RUNTIME_REVISION='905763b8'
MIGRATION='supabase/migrations/20261210120000_opportunity_canonical_sports_context.sql'
EXPECTED_MIGRATION_SHA256='bf6eb4a7f8bc202c78ab3759c3b1b5ea80610db276672dd6d3719792b4ab7c9f'

COMMIT="$(git rev-parse --verify "${CANDIDATE}^{commit}")"
RUNTIME_COMMIT="$(git rev-parse --verify "${RUNTIME_REVISION}^{commit}")"
git merge-base --is-ancestor "$RUNTIME_COMMIT" "$COMMIT"

check_marker() {
  local path="$1" marker="$2"
  git show "$COMMIT:$path" | grep -Fq "$marker"
}

check_marker 'app/api/opportunities/route.ts' 'resolveOpportunityRoleColumns'
check_marker 'app/api/opportunities/route.ts' "query.eq('sport_id', sportId)"
check_marker 'app/api/opportunities/route.ts' "toOpportunityDbValue(normalized, 'fallback')"
check_marker 'app/api/opportunities/[id]/route.ts' 'planProfilePrimarySportRequest'
check_marker 'app/api/opportunities/[id]/route.ts' 'projectOpportunityCanonicalContext'
check_marker 'app/api/opportunities/[id]/route.ts' 'update.gender_code = genderCode'
check_marker 'app/api/applications/me/route.ts' 'projectOpportunityCanonicalContext'
check_marker 'app/api/applications/received/route.ts' 'projectOpportunityCanonicalContext'

ACTUAL_MIGRATION_SHA256="$(git show "$COMMIT:$MIGRATION" | sha256sum | cut -d' ' -f1)"
[ "$ACTUAL_MIGRATION_SHA256" = "$EXPECTED_MIGRATION_SHA256" ]

printf 'PHASE_5G_RUNTIME_RELEASE_PASS commit=%s migration_sha256=%s\n' \
  "$COMMIT" "$ACTUAL_MIGRATION_SHA256"
