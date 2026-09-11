import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

const migrationDir = 'supabase/migrations';
const files = readdirSync(migrationDir).filter((name) => name.endsWith('.sql')).sort();
const baseline = readFileSync(`${migrationDir}/20250220000000_initial_public_schema_baseline.sql`, 'utf8');
const replay = readFileSync('scripts/test-full-migration-replay.sh', 'utf8');
const platform = readFileSync('tests/integration/sql/empty-supabase-platform-fixture.sql', 'utf8');

const migrationVersion = (name: string) => name.match(/^(\d+)_/)?.[1] ?? null;

test('a complete baseline precedes the first historical ALTER', () => {
  assert.equal(files[0], '20250220000000_initial_public_schema_baseline.sql');
  assert.equal(files[1], '20250221090000_add_club_id_to_opportunities.sql');
  for (const table of ['profiles','opportunities','clubs','saved_views','posts','notifications','follows','applications']) {
    assert.match(baseline, new RegExp(`create table if not exists public\\.${table}\\b`, 'i'), table);
  }
  assert.doesNotMatch(baseline, /create table if not exists (?:auth|storage)\./i);
  assert.doesNotMatch(baseline, /^\s*(?:insert\s+into|update\s+|delete\s+from)\b/im);
});

test('every migration has one unique sortable Supabase version', () => {
  const versions = files.map(migrationVersion);
  assert.ok(versions.every(Boolean));
  assert.equal(new Set(versions).size, versions.length);
  assert.ok(files.includes('20260720102500_normalize_pallavolo_to_volley.sql'));
  assert.ok(files.includes('20260720103000_seed_players_from_excel.sql'));
});

test('full replay is local, fail-fast, exhaustive and self-cleaning', () => {
  assert.match(replay, /find "\$MIGRATIONS_DIR"/);
  assert.match(replay, /ON_ERROR_STOP=1/);
  assert.match(replay, /Duplicate migration versions/);
  assert.match(replay, /FULL_MIGRATION_REPLAY_PASS/);
  assert.match(replay, /trap cleanup EXIT/);
  assert.doesNotMatch(replay, /supabase db push|--linked|Production/i);
  assert.match(platform, /Never apply this file to a Supabase project/);
  assert.doesNotMatch(platform, /auth\.set_config/);
});

for (const filename of [
  '20260702100000_migrate_davide_modica_to_player.sql',
  '20260807120000_migrate_luca_fabbrizio_to_staff.sql',
  '20261202093000_migrate_ricceri_scaparra_to_players.sql',
]) {
  test(`${filename} permits empty Preview but rejects partial identity matches`, () => {
    const sql = readFileSync(`${migrationDir}/${filename}`, 'utf8');
    assert.match(sql, /\(0, 0\)/);
    assert.match(sql, /raise exception/i);
  });
}

test('optional Campania import does not make schema replay depend on unversioned staging data', () => {
  const sql = readFileSync(`${migrationDir}/20261015100000_load_campania_into_canonical_geo_tables.sql`, 'utf8');
  assert.match(sql, /Skipping optional Campania data import/);
  assert.match(sql, /return;/);
});
