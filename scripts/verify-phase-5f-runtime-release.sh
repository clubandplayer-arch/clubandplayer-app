#!/usr/bin/env bash
set -euo pipefail

release_commit="${1:-}"

if [[ -z "$release_commit" ]]; then
  echo "usage: $0 <immutable-release-commit>" >&2
  exit 64
fi

release_commit="$(git rev-parse --verify "${release_commit}^{commit}")"

required_ancestors=(
  ad9862991d9d6d3c8992796c976601e6e3f917ea
  c65da3e070c1274049b9ebc2382884fd10e7f909
)

for ancestor in "${required_ancestors[@]}"; do
  git merge-base --is-ancestor "$ancestor" "$release_commit" || {
    echo "FAIL: $release_commit does not contain required runtime revision $ancestor" >&2
    exit 1
  }
done

profile_route="$(git show "$release_commit:app/api/profiles/me/route.ts")"
experience_route="$(git show "$release_commit:app/api/profiles/me/experiences/route.ts")"

required_profile_markers=(
  planProfilePrimarySportRequest
  CanonicalSportWritePlanService
  'Object.assign(updates, sportUpdate)'
  mapProfilePrimarySportContractError
)

required_experience_markers=(
  planExperienceSportRequest
  replace_my_athlete_experiences
  sport_discipline_id
  sport_variant_id
)

for marker in "${required_profile_markers[@]}"; do
  grep -Fq "$marker" <<<"$profile_route" || {
    echo "FAIL: Profile route is missing $marker at $release_commit" >&2
    exit 1
  }
done

for marker in "${required_experience_markers[@]}"; do
  grep -Fq "$marker" <<<"$experience_route" || {
    echo "FAIL: experiences route is missing $marker at $release_commit" >&2
    exit 1
  }
done

printf 'PHASE_5F_RUNTIME_RELEASE_PASS commit=%s profile=%s experiences=%s\n' \
  "$release_commit" \
  "app/api/profiles/me/route.ts" \
  "app/api/profiles/me/experiences/route.ts"
