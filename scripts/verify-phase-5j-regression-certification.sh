#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

required_migrations=(
  supabase/migrations/20261206120000_canonical_sports_competition_schema.sql
  supabase/migrations/20261207120000_seed_controlled_sports_vocabulary.sql
  supabase/migrations/20261208120000_profile_primary_sport.sql
  supabase/migrations/20261209120000_athlete_experience_sport_context.sql
  supabase/migrations/20261210120000_opportunity_canonical_sports_context.sql
)

regression_tests=(
  tests/unit/canonical-sport-context-service.test.ts
  tests/unit/canonical-sport-search-filters.test.ts
  tests/unit/canonical-sport-selector-compatibility.test.ts
  tests/unit/canonical-sport-write-plan-service.test.ts
  tests/unit/canonical-sports-compatibility.test.ts
  tests/unit/i18n.test.ts
  tests/unit/opportunity-canonical-api-contract.test.ts
  tests/unit/opportunity-canonical-sports-context.test.ts
  tests/unit/phase-5h-canonical-consumers.test.ts
  tests/unit/phase-5h-suggestion-bearer-auth.test.ts
  tests/unit/phase-5i-canonical-sport-filters-ui.test.ts
  tests/unit/phase-5i-form-payload-contract.test.ts
  tests/unit/profile-primary-sport-runtime-contract.test.ts
)

for migration in "${required_migrations[@]}"; do
  test -s "$migration"
done

pnpm exec tsx --test "${regression_tests[@]}"
pnpm typecheck
pnpm exec eslint --max-warnings=0 \
  app/api/applications/me/route.ts \
  app/api/applications/received/route.ts \
  app/api/follows/suggestions/route.ts \
  app/api/opportunities/route.ts \
  'app/api/opportunities/[id]/route.ts' \
  app/api/search/route.ts \
  app/api/sports/catalog/route.ts \
  app/api/suggestions/who-to-follow/route.ts \
  app/search/page.tsx \
  'app/(dashboard)/opportunities/OpportunitiesClient.tsx' \
  components/opportunities/OpportunityForm.tsx \
  components/profiles/ProfileEditForm.tsx \
  components/sports/CanonicalSportFilter.tsx \
  lib/api/auth.ts \
  lib/opportunities/canonicalSportsContext.server.ts \
  lib/profiles/pastExperiences.ts \
  lib/search/canonicalSportFilters.ts \
  lib/taxonomy/canonicalSportFormPayload.ts \
  lib/taxonomy/canonicalSportSelector.ts

git diff --check

printf '%s\n' \
  'PHASE_5J_REPOSITORY_REGRESSION_PASS migrations=5 canonical_legacy_contracts=pass consumers=pass payloads=pass i18n=pass typecheck=pass lint=pass'
