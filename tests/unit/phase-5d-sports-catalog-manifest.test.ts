import assert from 'node:assert/strict';
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
