import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import type { CanonicalGeoAreaImportRecord } from '../../lib/geo/canonical';
import { createGeoImportDryRun } from '../../lib/geo/import/pipeline';
import { EUROPEAN_PRODUCTION_IMPORTS } from '../../lib/geo/import/productionConfig';
import { assertProductionSafety, canonicalFingerprint, prepareEuropeanProductionImport, ProductionImportFailure, type ProductionExistingRecord, type ProductionGeoRepository } from '../../lib/geo/import/productionImport';

const config = EUROPEAN_PRODUCTION_IMPORTS.ES;
const record = (externalId: string, areaType: string, level: number, parentExternalId: string | null): CanonicalGeoAreaImportRecord => ({ provider: config.provider, externalId, countryIso2: 'ES', parentExternalId, code: externalId.split(':')[1], codeAuthority: config.codeAuthority, officialName: externalId, shortName: null, areaType, level, coordinates: null, bounds: null, sourceUpdatedAt: null, sourceLicense: config.sourceLicense, metadata: { datasetVersion: config.datasetVersion } });
const validSpain = (() => {
  const roots = Array.from({ length: 19 }, (_, index) => record(`autonomous-community:${index + 1}`, 'AUTONOMOUS_COMMUNITY', 1, null));
  const provinces = Array.from({ length: 52 }, (_, index) => record(`province:${index + 1}`, 'PROVINCE', 2, roots[index % roots.length].externalId));
  const municipalities = Array.from({ length: 8132 }, (_, index) => record(`municipality:${index + 1}`, 'MUNICIPALITY', 3, provinces[index % provinces.length].externalId));
  return [...roots, ...provinces, ...municipalities];
})();

class MemoryRepository implements ProductionGeoRepository {
  readonly ids = new Map<string, string>(); readonly levels: number[] = []; writes = 0; failAt = -1;
  async existing(): Promise<ProductionExistingRecord[]> { return validSpain.filter((item) => this.ids.has(item.externalId)).map((item) => ({ provider: item.provider, externalId: item.externalId, id: this.ids.get(item.externalId)!, fingerprint: canonicalFingerprint(item) })); }
  async upsertBatch(records: readonly CanonicalGeoAreaImportRecord[]) {
    if (this.writes === this.failAt) throw new Error('simulated batch failure');
    this.writes += 1; this.levels.push(...records.map((item) => item.level));
    let inserted = 0; let unchanged = 0;
    for (const item of records) { if (this.ids.has(item.externalId)) unchanged += 1; else { this.ids.set(item.externalId, `uuid-${this.ids.size + 1}`); inserted += 1; } }
    return { inserted, updated: 0, unchanged };
  }
}

test('production provenance is definitive and manifests total 48,580 areas', () => {
  assert.equal(Object.values(EUROPEAN_PRODUCTION_IMPORTS).reduce((sum, item) => sum + item.total, 0), 48580);
  assert.deepEqual(Object.fromEntries(Object.entries(EUROPEAN_PRODUCTION_IMPORTS).map(([country, item]) => [country, item.sourceLicense])), { FR: 'ETALAB_OPEN_LICENSE_2_0', ES: 'CC-BY-4.0', CH: 'SWISSTOPO_OGD_TERMS', SI: 'SURS_FREE_USE_WITH_ATTRIBUTION', PL: 'GUS_PUBLIC_SECTOR_REUSE_TERMS' });
  assert.equal(EUROPEAN_PRODUCTION_IMPORTS.ES.datasetPublishedAt, null);
});

test('safety gate rejects CONFIRM_REQUIRED and all validation blockers before writes', () => {
  const report = createGeoImportDryRun([record('province:bad', 'PROVINCE', 2, 'province:missing')], 'ES', [], { datasetVersion: 'x' });
  assert.throws(() => assertProductionSafety(report, 'ES', 'CONFIRM_REQUIRED'), /not confirmed/);
  assert.throws(() => assertProductionSafety(report, 'ES', 'CC-BY-4.0'), /safety gate failed/);
  assert.throws(() => assertProductionSafety({ ...report, errors: [], invalidRecords: 0, missingParents: [], duplicateExternalIds: [], crossCountryParents: [], cycles: [], unsupportedAreaTypes: [], datasetVersion: null }, 'ES', 'CC-BY-4.0'), /version is required/);
  assert.throws(() => assertProductionSafety({ ...report, errors: [], invalidRecords: 0, missingParents: [], duplicateExternalIds: [], crossCountryParents: [], cycles: [], unsupportedAreaTypes: [], datasetVersion: 'x' }, 'IT', 'CC-BY-4.0'), /Unsupported production country/);
});

test('imports one selected country parent-first and only with explicit apply', async () => {
  const repository = new MemoryRepository();
  const preview = await prepareEuropeanProductionImport(repository, 'ES', validSpain);
  assert.equal(preview.applied, false); assert.equal(repository.writes, 0);
  const applied = await prepareEuropeanProductionImport(repository, 'ES', validSpain, { apply: true, batchSize: 500 });
  assert.equal(applied.inserted, 8203); assert.equal(applied.failed, 0);
  assert.deepEqual([...repository.levels].sort((a, b) => a - b), repository.levels);
});

test('rerun is idempotent, reports no inserts, and preserves canonical UUIDs', async () => {
  const repository = new MemoryRepository();
  await prepareEuropeanProductionImport(repository, 'ES', validSpain, { apply: true });
  const originalIds = new Map(repository.ids);
  const preview = await prepareEuropeanProductionImport(repository, 'ES', validSpain);
  assert.equal(preview.wouldInsert, 0); assert.equal(preview.unchanged, 8203);
  const rerun = await prepareEuropeanProductionImport(repository, 'ES', validSpain, { apply: true });
  assert.deepEqual(repository.ids, originalIds); assert.equal(rerun.inserted, 0); assert.equal(rerun.unchanged, 8203);
  assert.equal(canonicalFingerprint({ ...validSpain[0], sourceUpdatedAt: '2026-01-01', metadata: { b: 2, a: 1 } }), canonicalFingerprint({ ...validSpain[0], sourceUpdatedAt: '2026-01-01T00:00:00.000Z', metadata: { a: 1, b: 2 } }));
});

test('duplicate provider IDs and manifest mismatch stop before writes', async () => {
  const repository = new MemoryRepository();
  await assert.rejects(prepareEuropeanProductionImport(repository, 'ES', [...validSpain, validSpain[0]], { apply: true }), /safety gate failed/);
  await assert.rejects(prepareEuropeanProductionImport(repository, 'ES', validSpain.slice(0, -1), { apply: true }), /safety gate failed/);
  assert.equal(repository.writes, 0);
});

test('production preparation rejects placeholder record provenance and mixed-country/provider input', async () => {
  const repository = new MemoryRepository();
  await assert.rejects(prepareEuropeanProductionImport(repository, 'ES', [{ ...validSpain[0], sourceLicense: 'CONFIRM_REQUIRED' }, ...validSpain.slice(1)]), /license mismatch/);
  await assert.rejects(prepareEuropeanProductionImport(repository, 'ES', [{ ...validSpain[0], provider: 'other' }, ...validSpain.slice(1)]), /provider\/code authority mismatch/);
  assert.equal(repository.writes, 0);
});

test('batch failure is explicit, recoverable, and reports unfinished records', async () => {
  const repository = new MemoryRepository(); repository.failAt = 1;
  await assert.rejects(prepareEuropeanProductionImport(repository, 'ES', validSpain, { apply: true, batchSize: 20 }), (error: unknown) => error instanceof ProductionImportFailure && error.report.failed > 0 && error.report.batchesCompleted === 1);
  repository.failAt = -1;
  const recovered = await prepareEuropeanProductionImport(repository, 'ES', validSpain, { apply: true, batchSize: 500 });
  assert.equal(recovered.failed, 0); assert.equal(repository.ids.size, 8203);
});

test('production command is dry-run by default and code cannot delete, deactivate, touch Italy/application tables, migrations, or embed credentials', () => {
  const script = readFileSync(new URL('../../scripts/geo/import-official-production.ts', import.meta.url), 'utf8');
  const repository = readFileSync(new URL('../../lib/geo/import/supabaseProductionRepository.ts', import.meta.url), 'utf8');
  assert.match(script, /const apply = process\.argv\.includes\('--apply'\)/);
  assert.doesNotMatch(script + repository, /(?:delete\s*\(|\.delete\s*\(|is_active|CONFIRM_REQUIRED|service[_-]?role.{0,20}['"][A-Za-z0-9])/i);
  assert.doesNotMatch(script + repository, /geo_area_names|legacy_geo_area_mappings|regions|provinces|municipalities|location_children|profiles|profile_preferences|opportunities|applications/i);
  assert.doesNotMatch(script + repository, /supabase\/migrations|insert into/i);
});
