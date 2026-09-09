import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  calculateSportsCatalogPayloadChecksum,
  type SportsCatalogManifest,
  type SportsCatalogManifestRecord,
  validateSportsCatalogManifest,
} from '../../lib/taxonomy/sportsCatalogManifest';

const records: SportsCatalogManifestRecord[] = [
  { kind: 'gender_category', key: 'gender:male', code: 'male', canonicalName: 'Male' },
  {
    kind: 'territorial_scope', key: 'scope:national', code: 'national', canonicalName: 'National',
    attributes: { requiresCountry: true, allowsMultipleCountries: false, allowsGeoArea: false },
  },
  { kind: 'player_position', key: 'position:goalkeeper', code: 'goalkeeper', canonicalName: 'Goalkeeper' },
  { kind: 'staff_role', key: 'staff_role:coach', code: 'coach', canonicalName: 'Coach' },
  {
    kind: 'player_position_applicability', key: 'position_scope:football_goalkeeper',
    references: { position: 'position:goalkeeper', sport: 'sport:football' },
  },
  {
    kind: 'staff_role_applicability', key: 'staff_scope:football_coach',
    references: { staffRole: 'staff_role:coach', sport: 'sport:football' },
  },
  {
    kind: 'sports_organization', key: 'organization:example', code: 'example_federation',
    canonicalName: 'Example Federation', sourceRecordId: 'example-federation', countryIso2: 'IT',
  },
  {
    kind: 'sports_organization_country', key: 'organization_country:example_it', countryIso2: 'IT',
    references: { organization: 'organization:example', country: 'country:IT' },
  },
  {
    kind: 'season', key: 'season:example_2026', code: '2026', canonicalName: '2026',
    references: { organization: 'organization:example' },
    attributes: { seasonType: 'calendar_year', startDate: '2026-01-01', endDate: '2026-12-31' },
  },
  {
    kind: 'competition', key: 'competition:example_cup', code: 'example_cup', canonicalName: 'Example Cup',
    sourceRecordId: 'example-cup', countryIso2: 'IT',
    references: {
      organization: 'organization:example', sport: 'sport:football', territorialScope: 'scope:national',
    },
  },
  {
    kind: 'competition_edition', key: 'edition:example_cup_2026', code: '2026', canonicalName: '2026',
    references: {
      competition: 'competition:example_cup', organization: 'organization:example',
      sport: 'sport:football', season: 'season:example_2026',
    },
  },
  {
    kind: 'legacy_player_position_mapping', key: 'legacy_position:portiere_football',
    references: { position: 'position:goalkeeper', sport: 'sport:football' },
    attributes: { sourceValue: 'Portiere', normalizedSourceValue: 'portiere' },
  },
];

function validManifest(): SportsCatalogManifest {
  return {
    schemaVersion: 1,
    manifestVersion: '2026.09.07.test',
    source: {
      provider: 'clubandplayer_reviewed_fixture',
      datasetVersion: 'test-v1',
      publishedAt: '2026-09-07',
      retrievedAt: '2026-09-07',
      sourceUrl: 'https://example.invalid/sports-catalog-fixture',
      license: 'INTERNAL_TEST_FIXTURE',
      attribution: 'Synthetic test fixture; not production data',
    },
    countries: ['IT'],
    expectedCounts: {
      gender_category: 1, territorial_scope: 1, player_position: 1, staff_role: 1,
      player_position_applicability: 1, staff_role_applicability: 1, sports_organization: 1,
      sports_organization_country: 1, season: 1, competition: 1, competition_edition: 1,
      legacy_player_position_mapping: 1,
    },
    payloadChecksum: calculateSportsCatalogPayloadChecksum(records),
    records: structuredClone(records),
  };
}

const foundation = new Set(['sport:football', 'country:IT']);

const controlledFoundation = new Set([
  'sport:football', 'sport:volleyball', 'sport:basketball', 'sport:water_polo', 'sport:handball',
  'sport:rugby', 'sport:field_hockey', 'sport:ice_hockey', 'sport:baseball', 'sport:softball',
  'sport:lacrosse', 'sport:american_football', 'discipline:association_football', 'discipline:futsal',
  'variant:eleven_a_side', 'variant:eight_a_side',
]);

test('5D-B accepts a versioned, checksummed manifest with provenance and ordered stable references', () => {
  const report = validateSportsCatalogManifest(validManifest(), { knownReferences: foundation });
  assert.equal(report.valid, true, report.errors.join('\n'));
  assert.equal(report.recordCounts.competition, 1);
  assert.match(report.calculatedChecksum, /^sha256:[a-f0-9]{64}$/);
});

test('5D-B checksum is deterministic across object key order but detects payload changes', () => {
  const reordered = records.map((record) => ({ ...record, attributes: record.attributes && { ...record.attributes } }));
  assert.equal(calculateSportsCatalogPayloadChecksum(reordered), calculateSportsCatalogPayloadChecksum(records));
  reordered[0] = { ...reordered[0], canonicalName: 'Changed' };
  assert.notEqual(calculateSportsCatalogPayloadChecksum(reordered), calculateSportsCatalogPayloadChecksum(records));
});

test('5D-B fails closed on placeholders, unconfirmed provenance, undeclared countries and checksum drift', () => {
  const manifest = validManifest();
  manifest.source.license = 'CONFIRM_REQUIRED';
  manifest.records[6] = { ...manifest.records[6], countryIso2: 'FR' };
  manifest.records[0] = { ...manifest.records[0], canonicalName: 'Changed without checksum update' };
  const report = validateSportsCatalogManifest(manifest, { knownReferences: foundation });
  assert.equal(report.valid, false);
  assert.ok(report.errors.includes('source.license:placeholder_forbidden'));
  assert.ok(report.errors.includes('records[6].countryIso2:not_declared:FR'));
  assert.ok(report.errors.includes('payloadChecksum:mismatch'));
});

test('5D-B rejects duplicate identities, missing references, forward dependencies and count drift', () => {
  const manifest = validManifest();
  manifest.records.splice(1, 0, {
    kind: 'gender_category', key: 'gender:male_duplicate', code: 'male', canonicalName: 'Male duplicate',
  });
  manifest.records[5] = {
    kind: 'player_position_applicability', key: 'position_scope:broken',
    references: { position: 'position:not_present', sport: 'sport:football' },
  };
  manifest.expectedCounts.gender_category = 1;
  manifest.payloadChecksum = calculateSportsCatalogPayloadChecksum(manifest.records);
  const report = validateSportsCatalogManifest(manifest, { knownReferences: foundation });
  assert.equal(report.valid, false);
  assert.ok(report.errors.some((error) => error.includes('code:collision:gender_category:male')));
  assert.ok(report.errors.some((error) => error.includes('missing_or_forward:position:not_present')));
  assert.ok(report.errors.includes('expectedCounts.gender_category:expected_1:actual_2'));
});

test('5D-B never guesses Italian categories or accepts environment UUIDs as unresolved references', () => {
  const manifest = validManifest();
  manifest.records.push({
    kind: 'competition_level', key: 'level:prima_categoria', code: 'prima_categoria',
    canonicalName: 'Prima Categoria', references: { organization: 'uuid:1234', sport: 'sport:football' },
  });
  manifest.payloadChecksum = calculateSportsCatalogPayloadChecksum(manifest.records);
  const report = validateSportsCatalogManifest(manifest, { knownReferences: foundation });
  assert.equal(report.valid, false);
  assert.ok(report.errors.some((error) => error.endsWith('missing_or_forward:uuid:1234')));
});

test('5D-C controlled manifest validates with fixed checksum and contains no organization or competition claims', () => {
  const manifest = JSON.parse(
    readFileSync('data/sports/phase-5d-c-controlled-vocabulary.json', 'utf8'),
  ) as SportsCatalogManifest;
  const report = validateSportsCatalogManifest(manifest, { knownReferences: controlledFoundation });
  assert.equal(report.valid, true, report.errors.join('\n'));
  assert.equal(manifest.payloadChecksum, 'sha256:cff8258b19c1ec73ee075227c402535e2648328cf699baf22e492ec8a4c6d5a0');
  assert.equal(report.recordCounts.player_position, 97);
  assert.equal(report.recordCounts.staff_role, 26);
  assert.equal(report.recordCounts.sports_organization, 0);
  assert.equal(report.recordCounts.competition, 0);
});

test('5D-C maps every current legacy player and staff option exactly once without category inference', async () => {
  const manifest = JSON.parse(
    readFileSync('data/sports/phase-5d-c-controlled-vocabulary.json', 'utf8'),
  ) as SportsCatalogManifest;
  const { SPORTS_ROLES, STAFF_ROLES } = await import('../../lib/opps/constants');
  const playerSourceValues = manifest.records
    .filter((record) => record.kind === 'legacy_player_position_mapping')
    .map((record) => String(record.attributes?.sourceValue));
  const expectedPlayerValues = Object.values(SPORTS_ROLES).flat();
  assert.deepEqual(playerSourceValues.sort(), expectedPlayerValues.sort());
  const staffSourceValues = manifest.records
    .filter((record) => record.kind === 'legacy_staff_role_mapping')
    .map((record) => String(record.attributes?.sourceValue));
  assert.deepEqual(staffSourceValues.sort(), [...STAFF_ROLES].sort());
  assert.equal(manifest.records.some((record) => record.key.includes('prima_categoria')), false);
});

test('5D-C seed migration is additive, fail-closed and does not touch runtime or security contracts', () => {
  const sql = readFileSync(
    'supabase/migrations/20261207120000_seed_controlled_sports_vocabulary.sql',
    'utf8',
  ).toLowerCase();
  for (const table of [
    'gender_categories', 'competition_formats', 'territorial_scopes', 'player_positions', 'staff_roles',
    'player_position_applicability', 'legacy_player_position_mappings', 'legacy_staff_role_mappings',
  ]) assert.match(sql, new RegExp(`insert into public\\.${table}\\b`));
  assert.doesNotMatch(sql, /(?:insert into|update|delete from|alter table)\s+public\.(?:profiles|athlete_experiences|opportunities|applications)\b/);
  assert.doesNotMatch(sql, /create\s+(?:policy|table|function|trigger)|\bgrant\b|\brevoke\b/);
  assert.doesNotMatch(sql, /insert into public\.(?:sports_organizations|competitions|competition_levels|age_classes|seasons)\b/);
  assert.match(sql, /on conflict[\s\S]*do nothing/);
  assert.match(sql, /raise exception '5d-c player legacy mapping payload mismatch'/);
});

test('5D-C Production preflight checks the complete manifest without writes', () => {
  const sql = readFileSync(
    'scripts/sports/reports/phase-5d-c-production-preflight-read-only.sql',
    'utf8',
  ).toLowerCase();
  assert.match(sql, /begin transaction read only;/);
  assert.match(sql, /rollback;/);
  assert.match(sql, /:'manifest_json'::jsonb/);
  assert.match(sql, /manifest_records <> 356/);
  assert.match(sql, /required_tables_present <> 8 or required_keys_present <> 8/);
  assert.match(sql, /collisions <> 0/);
  assert.match(sql, /missing_foundation_refs <> 0/);
  assert.match(sql, /pass_ready_for_exclusive_apply/);
  assert.equal((sql.match(/left join public\.player_positions/g) ?? []).length >= 2, true);
  assert.match(sql, /left join public\.staff_roles sr/);
  assert.doesNotMatch(sql, /\b(?:insert|update|delete|alter|create|drop|truncate)\b/);

  const runner = readFileSync('scripts/run-phase-5d-c-production-preflight.sh', 'utf8');
  assert.match(runner, /set -eo pipefail/);
  assert.match(runner, /set \+u/);
  assert.match(runner, /read -rsp/);
  assert.match(runner, /psql "\$PRODUCTION_DATABASE_URL" -W/);
  assert.match(runner, /case "\$CLASSIFICATION" in/);
  assert.match(runner, /\*\) exit 1/);
  assert.doesNotMatch(runner, /set -u|set -x|echo "\$PRODUCTION_DATABASE_URL"/);
});
