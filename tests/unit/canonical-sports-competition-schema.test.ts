import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  'supabase/migrations/20261206120000_canonical_sports_competition_schema.sql',
  'utf8',
).toLowerCase();

const expectedTables = [
  'player_positions', 'staff_roles', 'player_position_applicability', 'staff_role_applicability',
  'sports_organizations', 'sports_organization_countries', 'gender_categories', 'competition_formats',
  'territorial_scopes', 'competition_levels', 'age_classes', 'seasons', 'competitions',
  'competition_countries', 'competition_geo_areas', 'competition_editions', 'competition_groups',
  'legacy_player_position_mappings', 'legacy_staff_role_mappings',
];

test('5C creates the canonical sports and competition schema without seeds', () => {
  for (const table of expectedTables) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}\\b`));
    assert.match(migration, new RegExp(`'${table}'`));
  }
  assert.doesNotMatch(migration, /insert\s+into/);
  assert.doesNotMatch(migration, /update\s+public\.(profiles|athlete_experiences|opportunities|applications)/);
  assert.doesNotMatch(migration, /delete\s+from/);
});

test('5C preserves protected runtime domains and uses non-destructive catalogue references', () => {
  for (const table of ['profiles', 'athlete_experiences', 'opportunities', 'applications']) {
    assert.doesNotMatch(migration, new RegExp(`alter table(?: if exists)? public\\.${table}\\b`));
    assert.doesNotMatch(migration, new RegExp(`create policy[\\s\\S]+? on public\\.${table}\\b`));
  }
  assert.doesNotMatch(migration, /references public\.(profiles|athlete_experiences|opportunities|applications)/);
  assert.match(migration, /references public\.sports\(id\) on delete restrict/);
  assert.match(migration, /references public\.competitions\(id, organization_id, sport_id\) on delete restrict/);
});

test('5C enforces scoped chains, hierarchy cycles, RLS and explicit grants', () => {
  assert.match(migration, /foreign key \(discipline_id, sport_id\) references public\.sport_disciplines\(id, sport_id\)/);
  assert.match(migration, /foreign key \(variant_id, discipline_id\) references public\.sport_variants\(id, discipline_id\)/);
  assert.match(migration, /foreign key \(season_id, organization_id\) references public\.seasons\(id, organization_id\)/);
  assert.match(migration, /prevent_sports_organization_cycle/);
  assert.match(migration, /prevent_season_cycle/);
  assert.match(migration, /prevent_competition_group_cycle/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /grant select on table public\.%i to anon, authenticated/);
  assert.match(migration, /grant all on table public\.%i to service_role/);
});
