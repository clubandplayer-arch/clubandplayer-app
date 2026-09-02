import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

import { createGeoImportDryRun } from '../../lib/geo/import/pipeline';
import { adaptFranceInseeStaging, FRANCE_INSEE_PROVIDER } from '../../lib/geo/import/providers/franceInsee';
import { adaptPolandTerytStaging } from '../../lib/geo/import/providers/polandTeryt';
import { adaptSloveniaOfficialStaging } from '../../lib/geo/import/providers/sloveniaOfficial';
import { adaptSpainIneStaging } from '../../lib/geo/import/providers/spainIne';
import { adaptSwitzerlandBfsStaging } from '../../lib/geo/import/providers/switzerlandBfs';
import type { OfficialDatasetContext, OfficialGeoStagingRecord } from '../../lib/geo/import/providers/staging';

const context: OfficialDatasetContext = {
  sourceLicense: 'declared-license', datasetVersion: '2026-test',
  datasetPublishedAt: '2026-01-01', sourceUrlIdentifier: 'official-release-id',
};
const row = (countryIso2: string, areaType: string, officialCode: string, officialName: string,
  parentAreaType?: string, parentOfficialCode?: string): OfficialGeoStagingRecord => ({
  countryIso2, areaType, officialCode, officialName, parentAreaType, parentOfficialCode,
});

test('FR INSEE maps deterministic IDs and REGION → DEPARTMENT → COMMUNE parents', () => {
  const records = adaptFranceInseeStaging([
    row('FR', 'REGION', '11', 'Région'),
    row('FR', 'DEPARTMENT', '75', 'Département', 'REGION', '11'),
    row('FR', 'COMMUNE', '75056', 'Commune', 'DEPARTMENT', '75'),
  ], context);
  assert.deepEqual(records.map(({ externalId, parentExternalId, level }) => ({ externalId, parentExternalId, level })), [
    { externalId: 'region:11', parentExternalId: null, level: 1 },
    { externalId: 'department:75', parentExternalId: 'region:11', level: 2 },
    { externalId: 'commune:75056', parentExternalId: 'department:75', level: 3 },
  ]);
  assert.equal(records[0].provider, FRANCE_INSEE_PROVIDER);
  assert.equal(records[0].metadata.datasetVersion, '2026-test');
});

test('ES INE maps autonomous community, province and municipality', () => {
  const records = adaptSpainIneStaging([
    row('ES', 'AUTONOMOUS_COMMUNITY', '01', 'Comunidad'),
    row('ES', 'PROVINCE', '04', 'Provincia', 'AUTONOMOUS_COMMUNITY', '01'),
    row('ES', 'MUNICIPALITY', '04001', 'Municipio', 'PROVINCE', '04'),
  ], context);
  assert.deepEqual(records.map((record) => record.externalId), ['autonomous-community:01', 'province:04', 'municipality:04001']);
  assert.equal(records[2].parentExternalId, 'province:04');
});

test('CH BFS preserves real depth with and without a district', () => {
  const records = adaptSwitzerlandBfsStaging([
    row('CH', 'CANTON', 'ZH', 'Kanton'),
    row('CH', 'DISTRICT', '101', 'Bezirk', 'CANTON', 'ZH'),
    row('CH', 'MUNICIPALITY', '261', 'Gemeinde A', 'DISTRICT', '101'),
    row('CH', 'MUNICIPALITY', '262', 'Gemeinde B', 'CANTON', 'ZH'),
  ], context);
  assert.deepEqual(records.slice(2).map(({ parentExternalId, level }) => ({ parentExternalId, level })), [
    { parentExternalId: 'district:101', level: 3 },
    { parentExternalId: 'canton:ZH', level: 2 },
  ]);
});

test('SI and PL adapters implement only the approved hierarchies', () => {
  const si = adaptSloveniaOfficialStaging([
    row('SI', 'STATISTICAL_REGION', '01', 'Regija'),
    row('SI', 'MUNICIPALITY', '001', 'Občina', 'STATISTICAL_REGION', '01'),
  ], context);
  assert.equal(si[1].parentExternalId, 'statistical-region:01');
  assert.equal(si[1].level, 2);

  const pl = adaptPolandTerytStaging([
    row('PL', 'VOIVODESHIP', '02', 'Województwo'),
    row('PL', 'POWIAT', '0201', 'Powiat', 'VOIVODESHIP', '02'),
    row('PL', 'GMINA', '020101', 'Gmina', 'POWIAT', '0201'),
  ], context);
  assert.deepEqual(pl.map((record) => record.externalId), ['voivodeship:02', 'powiat:0201', 'gmina:020101']);
  assert.equal(pl[2].parentExternalId, 'powiat:0201');
});

test('official adapters require license, version, correct country and valid parent contract', () => {
  assert.throws(() => adaptFranceInseeStaging([], { ...context, sourceLicense: '' }), /source_license/);
  assert.throws(() => adaptFranceInseeStaging([], { ...context, datasetVersion: '' }), /dataset_version/);
  assert.throws(() => adaptFranceInseeStaging([row('ES', 'REGION', '1', 'Wrong')], context), /expected country FR/);
  assert.throws(() => adaptFranceInseeStaging([row('FR', 'COMMUNE', '1', 'Missing')], context), /parent required/);
});

test('expanded dry-run reports completeness, validity, duplicates and obsolete candidates without writing', () => {
  const records = adaptFranceInseeStaging([
    row('FR', 'REGION', '11', 'A'), row('FR', 'REGION', '11', 'Duplicate'),
    row('FR', 'DEPARTMENT', '75', 'B', 'REGION', '99'),
  ], context);
  const report = createGeoImportDryRun(records, 'FR', [
    { provider: FRANCE_INSEE_PROVIDER, externalId: 'region:11' },
    { provider: FRANCE_INSEE_PROVIDER, externalId: 'region:obsolete' },
  ], { datasetVersion: context.datasetVersion, expected: { COMMUNE: { min: 1 } } });
  assert.equal(report.provider, FRANCE_INSEE_PROVIDER);
  assert.equal(report.datasetVersion, '2026-test');
  assert.equal(report.countByAreaType.REGION, 2);
  assert.equal(report.totalRecords, 3);
  assert.equal(report.wouldInsert, report.recordsToInsert);
  assert.equal(report.wouldUpdate, report.recordsToUpdate);
  assert.deepEqual(report.duplicateProviderIds, [`${FRANCE_INSEE_PROVIDER}:region:11`]);
  assert.deepEqual(report.duplicateExternalIds, report.duplicateProviderIds);
  assert.ok(report.missingParents.length > 0);
  assert.deepEqual(report.potentiallyObsolete, [`${FRANCE_INSEE_PROVIDER}:region:obsolete`]);
  assert.ok(report.errors.includes('manifest:COMMUNE:below_minimum'));
});

test('dry-run classifies cross-country parents, coordinates, bounds and unsupported types', () => {
  const report = createGeoImportDryRun([
    { provider: 'test', externalId: 'root', countryIso2: 'FR', officialName: 'Root', areaType: 'REGION', level: 1, sourceLicense: 'L' },
    { provider: 'test', externalId: 'cross', parentExternalId: 'root', countryIso2: 'ES', officialName: 'Cross', areaType: 'COMMUNE', level: 2, sourceLicense: 'L' },
    { provider: 'test', externalId: 'invalid', countryIso2: 'FR', officialName: 'Invalid', areaType: 'UNKNOWN_TYPE', level: 1, sourceLicense: 'L', coordinates: { lat: 91, lng: 181 }, bounds: { minLat: 10, minLng: 10, maxLat: 5, maxLng: 5 } },
  ], 'FR');
  assert.ok(report.crossCountryParents.some((error) => error.includes('cross')));
  assert.ok(report.invalidCoordinates.length >= 2);
  assert.ok(report.invalidBounds.length >= 2);
  assert.ok(report.unsupportedAreaTypes.some((error) => error.includes('invalid')));
});

test('3B-E1 adds no migration, credentials, network call, SDK, DB write or Italy mutation', () => {
  const migrations = readdirSync(new URL('../../supabase/migrations/', import.meta.url));
  assert.equal(migrations.filter((name) => name.includes('official') || name.includes('3b_e1')).length, 0);
  const paths = [
    '../../lib/geo/import/providers/staging.ts', '../../lib/geo/import/providers/franceInsee.ts',
    '../../lib/geo/import/providers/spainIne.ts', '../../lib/geo/import/providers/switzerlandBfs.ts',
    '../../lib/geo/import/providers/sloveniaOfficial.ts', '../../lib/geo/import/providers/polandTeryt.ts',
    '../../scripts/geo/dry-run-official.ts',
  ];
  const source = paths.map((path) => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');
  assert.doesNotMatch(source, /fetch\s*\(|axios|createClient|SUPABASE|service.role|country-state-city|countrystatecity|https?:\/\//i);
  assert.doesNotMatch(source, /executeGeoImport|\.upsert\(|\.insert\(|\.update\(|\.delete\(/i);
  assert.ok(readFileSync(new URL('../../lib/geo/import/countryStateCity.ts', import.meta.url), 'utf8').length > 0);
});
