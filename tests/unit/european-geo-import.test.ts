import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { adaptCountryStateCityLocalExport } from '../../lib/geo/import/countryStateCity';
import {
  createGeoImportDryRun,
  executeGeoImport,
  type GeoImportRepository,
} from '../../lib/geo/import/pipeline';

const migrationName = '20260824140000_import_italy_legacy_geo_areas.sql';
const migrationSql = readFileSync(new URL(`../../supabase/migrations/${migrationName}`, import.meta.url), 'utf8');

test('Italy migration imports every legacy level with canonical hierarchy and provenance', () => {
  assert.match(migrationSql, /regions\.name, 'REGION', 1,[\s\S]*from public\.regions/i);
  assert.match(migrationSql, /from public\.provinces[\s\S]*'region:' \|\| provinces\.region_id::text/i);
  assert.match(migrationSql, /'PROVINCE',[\s\n]*2/i);
  assert.match(migrationSql, /from public\.municipalities[\s\S]*'province:' \|\| municipalities\.province_id::text/i);
  assert.match(migrationSql, /'MUNICIPALITY',[\s\n]*3/i);
  assert.match(migrationSql, /countries\.iso2 = 'IT'/i);
  assert.match(migrationSql, /clubandplayer_italy_legacy/g);
  assert.match(migrationSql, /internal_legacy_catalog/g);
  assert.match(migrationSql, /IT_PROVINCE_ABBREVIATION/i);
});

test('Italy import and mappings are idempotent and assert complete coherent coverage', () => {
  assert.equal((migrationSql.match(/on conflict \(source_provider, source_record_id\)/gi) ?? []).length, 3);
  assert.match(migrationSql, /on conflict \(source_system, source_entity_type, legacy_id\)[\s\S]*do update/i);
  assert.match(migrationSql, /Incomplete italy_legacy canonical geography mapping/i);
  assert.match(migrationSql, /mapping points outside canonical country IT/i);
  assert.match(migrationSql, /Invalid italy_legacy canonical geography hierarchy/i);
  assert.match(migrationSql, /select 'region'::text[\s\S]*union all[\s\S]*select 'province'[\s\S]*union all[\s\S]*select 'municipality'/i);
});

test('Italy migration never mutates legacy, application, view, function, RLS or localized-name objects', () => {
  assert.doesNotMatch(migrationSql, /(?:insert into|update|delete from|alter table) public\.(regions|provinces|municipalities|profiles|opportunities|applications)/i);
  assert.doesNotMatch(migrationSql, /players_view|athletes_view|clubs_view|location_children|municipality_sync_region|profile_location_coerce/i);
  assert.doesNotMatch(migrationSql, /create policy|drop policy|enable row level security|geo_area_names/i);
  assert.doesNotMatch(migrationSql, /residence_geo_area_id|profile_geo_area_interests|profile_organization_locations|opportunity_geo_area_id/i);
});

test('CountryStateCity local adapter requires provenance and emits provider-neutral records', () => {
  assert.throws(() => adaptCountryStateCityLocalExport([], { provider: '', sourceLicense: 'x' }), /source_provider/);
  assert.throws(() => adaptCountryStateCityLocalExport([], { provider: 'local-export', sourceLicense: '' }), /source_license/);
  const [record] = adaptCountryStateCityLocalExport([{
    id: 11, name: 'Île-de-France', country_code: 'fr', parent_id: null,
    area_type: 'region', level: 1, latitude: '48.8', longitude: '2.3',
  }], { provider: 'reviewed-local-export', sourceLicense: 'reviewed-license' });
  assert.equal(record.provider, 'reviewed-local-export');
  assert.equal(record.externalId, '11');
  assert.equal(record.countryIso2, 'FR');
  assert.equal(record.areaType, 'REGION');
  assert.equal(record.sourceLicense, 'reviewed-license');
});

test('dry-run reports duplicates, missing parents, cycles, unsupported types, inserts and updates without writes', () => {
  const records = [
    { provider: 'p', externalId: 'root', countryIso2: 'FR', officialName: 'Root', areaType: 'REGION', level: 1, sourceLicense: 'L' },
    { provider: 'p', externalId: 'child', parentExternalId: 'missing', countryIso2: 'FR', officialName: 'Child', areaType: 'COMMUNE', level: 2, sourceLicense: 'L' },
    { provider: 'p', externalId: 'a', parentExternalId: 'b', countryIso2: 'FR', officialName: 'A', areaType: 'ALIEN', level: 2, sourceLicense: 'L' },
    { provider: 'p', externalId: 'b', parentExternalId: 'a', countryIso2: 'FR', officialName: 'B', areaType: 'COMMUNE', level: 2, sourceLicense: 'L' },
    { provider: 'p', externalId: 'root', countryIso2: 'FR', officialName: 'Duplicate', areaType: 'REGION', level: 1, sourceLicense: 'L' },
  ];
  const report = createGeoImportDryRun(records, 'FR', [{ provider: 'p', externalId: 'root' }]);
  assert.equal(report.totalInputRecords, 5);
  assert.deepEqual(report.duplicateProviderIds, ['p:root']);
  assert.ok(report.missingParents.some((error) => error.includes('child')));
  assert.ok(report.cycleErrors.length >= 2);
  assert.ok(report.unsupportedAreaTypes.some((error) => error.includes('p:a')));
  assert.equal(report.recordsToInsert, 0);
  assert.equal(report.recordsToUpdate, 0);
});

test('real execution is separate from dry-run and writes only after a valid report', async () => {
  let writes = 0;
  const repository: GeoImportRepository = {
    existing: async () => [],
    upsert: async (records) => { writes += records.length; },
  };
  const input = [{
    provider: 'official-local', externalId: '1', countryIso2: 'ES', officialName: 'Área',
    areaType: 'AUTONOMOUS_COMMUNITY', level: 1, sourceLicense: 'license-id',
  }];
  createGeoImportDryRun(input, 'ES');
  assert.equal(writes, 0);
  const report = await executeGeoImport(repository, input, 'ES');
  assert.equal(report.recordsToInsert, 1);
  assert.equal(writes, 1);
});

test('foreign import tooling has no external network call or provider SDK dependency', () => {
  for (const path of [
    '../../lib/geo/import/pipeline.ts',
    '../../lib/geo/import/countryStateCity.ts',
    '../../scripts/geo/import-country-state-city.ts',
  ]) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /fetch\s*\(|axios|https?:\/\/|from\s+['"]country-state-city['"]|require\(['"]country-state-city['"]\)/i);
  }
});
