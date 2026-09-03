import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  'supabase/migrations/20261206120000_sports_competition_canonical_schema.sql',
  'utf8',
);
const executable = migration.replace(/--.*$/gm, '').replace(/\s+/g, ' ');

test('5C creates the empty canonical competition graph required by 5B', () => {
  for (const table of [
    'sports_organizations', 'sports_organization_sports', 'player_roles', 'staff_roles',
    'age_classes', 'gender_classes', 'competition_formats', 'competitions',
    'competition_levels', 'competition_seasons', 'competition_groups', 'profile_sports',
  ]) assert.match(migration, new RegExp(`create table if not exists public\\.${table}\\b`, 'i'), table);

  assert.match(migration, /competitions_organization_sport_fk/i);
  assert.match(migration, /competition_groups_season_competition_fk/i);
  assert.match(migration, /profile_sports_one_primary_idx/i);
});

test('5C adds nullable canonical references while retaining every frozen legacy field', () => {
  assert.match(migration, /alter table public\.athlete_experiences[\s\S]*add column if not exists sport_id uuid/i);
  assert.match(migration, /alter table public\.opportunities[\s\S]*add column if not exists sport_id uuid/i);
  for (const legacy of ['sport', 'role', 'role_group', 'category', 'required_category', 'gender', 'age_min', 'age_max']) {
    assert.doesNotMatch(executable, new RegExp(`drop column(?: if exists)? ${legacy}\\b`, 'i'), legacy);
  }
  assert.doesNotMatch(migration, /add column if not exists [a-z_]+_id uuid not null/i);
  assert.doesNotMatch(migration, /add column if not exists [a-z_]+_id uuid[^,;]*default/i);
});

test('5C enforces sport tuples, season dates and role separation', () => {
  for (const constraint of [
    'competitions_discipline_sport_fk', 'competitions_variant_discipline_fk',
    'athlete_experiences_discipline_sport_fk', 'athlete_experiences_variant_discipline_fk',
    'opportunities_discipline_sport_fk', 'opportunities_variant_discipline_fk',
    'opportunities_player_role_sport_fk', 'opportunities_role_kind_check',
    'competition_seasons_dates_check',
  ]) assert.match(migration, new RegExp(constraint, 'i'), constraint);
});

test('5C defines explicit catalogue and private profile-sport RLS/grants', () => {
  assert.match(migration, /alter table public\.%I enable row level security/i);
  assert.match(migration, /create policy profile_sports_owner_admin_select/i);
  assert.match(migration, /revoke all on table public\.profile_sports from anon/i);
  assert.match(migration, /revoke insert, update, delete on table public\.%I from anon/i);
  assert.match(migration, /grant select on table public\.%I to anon, authenticated/i);
});

test('5C never seeds, backfills, translates or changes Applications and ownership', () => {
  assert.doesNotMatch(executable, /\b(insert into|update|delete from|truncate)\s+public\.(profiles|athlete_experiences|opportunities|applications)\b/i);
  assert.doesNotMatch(executable, /alter table public\.applications|create table if not exists public\.applications/i);
  assert.doesNotMatch(executable, /drop column(?: if exists)? (club_id|owner_id|created_by|status)\b/i);
  assert.doesNotMatch(executable, /\b(calcio|football|serie d|maschile|femminile)\b/i);
  assert.match(migration, /^begin;/i);
  assert.match(migration, /commit;\s*$/i);
});
