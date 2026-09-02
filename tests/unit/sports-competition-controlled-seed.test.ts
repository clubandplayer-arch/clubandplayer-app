import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { SPORTS_ROLES, STAFF_ROLES } from '../../lib/opps/constants';

const seed = readFileSync('supabase/migrations/20261206130000_sports_competition_controlled_seed.sql', 'utf8');
const executable = seed.replace(/--.*$/gm, '').replace(/\s+/g, ' ');

test('5D seeds stable gender, format, Staff and Player vocabularies', () => {
  for (const code of ['male', 'female', 'mixed']) assert.match(seed, new RegExp(`'${code}'`));
  for (const code of ['league', 'cup', 'tournament', 'playoff', 'friendly']) assert.match(seed, new RegExp(`'${code}'`));
  for (const role of STAFF_ROLES) assert.ok(seed.includes(`'${role.replaceAll("'", "''")}'`), role);
  for (const roles of Object.values(SPORTS_ROLES)) {
    for (const role of roles) assert.ok(seed.includes(`'${role.replaceAll("'", "''")}'`), role);
  }
});

test('5D uses idempotent conflict handling and stable English wire codes', () => {
  assert.match(seed, /on conflict \(code\) do update/gi);
  assert.match(seed, /on conflict \(sport_id, code\) do update/i);
  assert.match(seed, /legacy_player_role_mappings/i);
  assert.match(seed, /legacy_staff_role_mappings/i);
  assert.doesNotMatch(seed, /\('portiere'\s*,\s*'Portiere'/i);
});

test('5D deliberately leaves provenance-sensitive catalogues empty', () => {
  assert.doesNotMatch(executable, /insert into public\.(sports_organizations|sports_organization_sports|competitions|competition_levels|competition_seasons|competition_groups|age_classes)\b/i);
  assert.match(seed, /without an approved official[\s\S]*source\/provenance package/i);
});

test('5D never writes user, Opportunity or Application data', () => {
  assert.doesNotMatch(executable, /\b(insert into|update|delete from|truncate)\s+public\.(profiles|profile_sports|athlete_experiences|opportunities|applications)\b/i);
  assert.doesNotMatch(executable, /alter table public\.(profiles|athlete_experiences|opportunities|applications)\b/i);
  assert.match(seed, /^begin;/i);
  assert.match(seed, /commit;\s*$/i);
});

test('5D keeps compatibility mappings non-anonymous and admin-managed', () => {
  assert.match(seed, /create policy %I on public\.%I for select to authenticated using \(true\)/i);
  assert.match(seed, /revoke all on table public\.%I from anon/i);
  assert.match(seed, /p\.user_id=auth\.uid\(\) and p\.is_admin=true/i);
});
