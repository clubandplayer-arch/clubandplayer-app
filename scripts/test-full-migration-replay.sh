#!/usr/bin/env bash
set -euo pipefail

DB_NAME="clubandplayer_full_migration_replay"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="$ROOT_DIR/supabase/migrations"
export PGOPTIONS='-c search_path=public,extensions'
PLATFORM_FIXTURE="$ROOT_DIR/tests/integration/sql/empty-supabase-platform-fixture.sql"

for command in pg_ctlcluster runuser psql createdb dropdb find sort; do
  command -v "$command" >/dev/null || { echo "Missing local replay dependency: $command" >&2; exit 1; }
done

mapfile -t migrations < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' | sort)
((${#migrations[@]} > 0)) || { echo 'No migrations found' >&2; exit 1; }

mapfile -t duplicate_versions < <(
  printf '%s\n' "${migrations[@]##*/}" |
    sed -E 's/^([0-9]+)_.*/\1/' |
    sort | uniq -d
)
((${#duplicate_versions[@]} == 0)) || {
  printf 'Duplicate migration versions: %s\n' "${duplicate_versions[*]}" >&2
  exit 1
}

pg_ctlcluster 16 main start >/dev/null 2>&1 || true
runuser -u postgres -- dropdb --if-exists "$DB_NAME" >/dev/null
runuser -u postgres -- createdb "$DB_NAME"
cleanup() { runuser -u postgres -- dropdb --if-exists "$DB_NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -q -d "$DB_NAME" -f "$PLATFORM_FIXTURE"
for migration in "${migrations[@]}"; do
  echo "Applying ${migration##*/}"
  runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -q -d "$DB_NAME" -f "$migration"
done

runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -qAt -d "$DB_NAME" <<'SQL'
do $$
declare
  required text;
begin
  foreach required in array array[
    'profiles', 'opportunities', 'clubs', 'saved_views', 'posts',
    'notifications', 'follows', 'applications', 'registry_claims',
    'registry_claim_disputes', 'countries', 'geo_areas', 'sports',
    'sport_disciplines', 'sport_variants', 'competition_levels'
  ] loop
    if to_regclass('public.' || required) is null then
      raise exception 'Full replay missing public.%', required;
    end if;
  end loop;

  if not exists (
    select 1
    from public.sport_variants variants
    join public.sport_disciplines disciplines on disciplines.id = variants.discipline_id
    join public.sports sports on sports.id = disciplines.sport_id
    where sports.code = 'football'
      and disciplines.code = 'association_football'
      and variants.code = 'seven_a_side'
      and variants.team_size = 7
  ) then
    raise exception 'Full replay missing canonical seven_a_side variant';
  end if;
end
$$;
select 'FULL_MIGRATION_REPLAY_PASS';
SQL
