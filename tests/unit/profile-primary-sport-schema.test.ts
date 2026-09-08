import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

const migrationName = '20261208120000_profile_primary_sport.sql';
const migration = readFileSync(new URL(`../../supabase/migrations/${migrationName}`, import.meta.url), 'utf8');
const runtimeScript = readFileSync(new URL('../../scripts/test-profile-primary-sport-runtime.sh', import.meta.url), 'utf8');

test('5F-A migration version is unique in the repository', () => {
  const versions = readdirSync(new URL('../../supabase/migrations', import.meta.url))
    .filter((name) => name.startsWith('20261208120000'));
  assert.deepEqual(versions, [migrationName]);
});

test('5F-A adds exactly the nullable canonical Profile sport columns without defaults', () => {
  for (const column of ['sport_id', 'sport_discipline_id', 'sport_variant_id']) {
    assert.match(migration, new RegExp(`add column if not exists ${column} uuid`, 'i'));
    assert.doesNotMatch(migration, new RegExp(`add column if not exists ${column} uuid[^,;]*default`, 'i'));
    assert.doesNotMatch(migration, new RegExp(`add column if not exists ${column} uuid\\s+not null`, 'i'));
  }
});

test('5F-A enforces direct, composite and shape integrity with restricted deletes', () => {
  assert.match(migration, /foreign key \(sport_id\) references public\.sports\(id\) on delete restrict/i);
  assert.match(migration, /foreign key \(sport_discipline_id, sport_id\)[\s\S]*references public\.sport_disciplines\(id, sport_id\) on delete restrict/i);
  assert.match(migration, /foreign key \(sport_variant_id, sport_discipline_id\)[\s\S]*references public\.sport_variants\(id, discipline_id\) on delete restrict/i);
  assert.match(migration, /sport_discipline_id is null or sport_id is not null/i);
  assert.match(migration, /sport_variant_id is null or sport_discipline_id is not null/i);
});

test('5F-A remains schema-only and does not rewrite unrelated migrations or runtime domains', () => {
  assert.match(migration, /^begin;/m);
  assert.match(migration, /^commit;/m);
  assert.doesNotMatch(migration, /\b(?:insert|update|delete|truncate)\b\s+(?:into\s+|from\s+)?public\./i);
  assert.doesNotMatch(migration, /alter table public\.(?:opportunities|applications|athlete_experiences)/i);
  assert.doesNotMatch(migration, /\b(?:create|drop|alter)\s+(?:policy|trigger|function)\b/i);
  assert.doesNotMatch(migration, /\b(?:grant|revoke)\b/i);
});

test('runtime harness applies only the isolated fixture and 5F-A migration twice', () => {
  assert.match(runtimeScript, /profile-residence-rpc-runtime-setup\.sql/);
  assert.match(runtimeScript, /profile-primary-sport-runtime-setup\.sql/);
  assert.match(runtimeScript, /20261204121000_profile_residence_trigger_guards\.sql/);
  assert.match(runtimeScript, /profile-residence-trigger-runtime-install\.sql/);
  assert.equal((runtimeScript.match(/20261208120000_profile_primary_sport\.sql/g) ?? []).length, 2);
  assert.match(runtimeScript, /profile-primary-sport-runtime-tests\.sql/);
  assert.doesNotMatch(runtimeScript, /supabase (?:db push|migration repair)/);
});
