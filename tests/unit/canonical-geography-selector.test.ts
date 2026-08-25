import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { GeoAreaRead } from '../../lib/geo/areas';
import type { CanonicalCountryRead } from '../../lib/geo/countryCatalog';
import type { CanonicalGeographyLoader } from '../../components/geo/canonicalGeographyContracts';
import { applyCanonicalLevelSelection, loadCanonicalHierarchy } from '../../components/geo/canonicalGeographySelectorModel';

const country = (id: string, iso2: string): CanonicalCountryRead => ({ id, iso2, iso3: null, officialName: iso2, isSupported: true, isActive: true, displayOrder: 0 });
const area = (id: string, country_id: string, parent_id: string | null, area_type: string, level: number): GeoAreaRead => ({ id, country_id, parent_id, code: null, code_authority: null, official_name: id, short_name: null, area_type, level, is_active: true, display_order: 0, centroid_lat: null, centroid_lng: null, min_lat: null, min_lng: null, max_lat: null, max_lng: null, geo_area_names: [] });
const fr = country('country-fr', 'FR'); const ch = country('country-ch', 'CH'); const si = country('country-si', 'SI');
const frRoot = area('fr-root', fr.id, null, 'REGION', 1); const frDepartment = area('fr-dept', fr.id, frRoot.id, 'DEPARTMENT', 2); const frCommune = area('fr-city', fr.id, frDepartment.id, 'COMMUNE', 3);
const chRoot = area('ch-root', ch.id, null, 'CANTON', 1); const chCity = area('ch-city', ch.id, chRoot.id, 'MUNICIPALITY', 2);
const siRoot = area('si-root', si.id, null, 'STATISTICAL_REGION', 1);
const records = [frRoot, frDepartment, frCommune, chRoot, chCity, siRoot];
const loader = (overrides: Partial<CanonicalGeographyLoader> = {}): CanonicalGeographyLoader => ({
  countries: async () => [fr, ch, si], roots: async (iso2) => records.filter((item) => item.parent_id === null && ({ FR: fr.id, CH: ch.id, SI: si.id } as Record<string, string>)[iso2] === item.country_id),
  children: async (_iso2, parentId) => records.filter((item) => item.parent_id === parentId),
  ancestry: async (id) => { const selected = records.find((item) => item.id === id)!; const ancestors = id === frCommune.id ? [frRoot, frDepartment] : id === chCity.id ? [chRoot] : []; return { area: selected, ancestors }; }, ...overrides,
});

test('controlled selector has no implicit Italy default and loads canonical countries', async () => {
  assert.deepEqual((await loader().countries()).map((item) => item.iso2), ['FR', 'CH', 'SI']);
  const levels = await loadCanonicalHierarchy(loader(), fr, null);
  assert.equal(levels[0].selectedId, null); assert.deepEqual(levels[0].options.map((item) => item.id), [frRoot.id]);
});

test('initial canonical value reconstructs root, children and variable-depth ancestors', async () => {
  const levels = await loadCanonicalHierarchy(loader(), fr, frCommune.id);
  assert.deepEqual(levels.map((level) => level.selectedId), [frRoot.id, frDepartment.id, frCommune.id]);
});

test('optional intermediate level supports Swiss municipality directly below canton', async () => {
  const levels = await loadCanonicalHierarchy(loader(), ch, chCity.id);
  assert.deepEqual(levels.map((level) => level.selectedId), [chRoot.id, chCity.id]);
});

test('empty roots are represented explicitly', async () => {
  assert.deepEqual(await loadCanonicalHierarchy(loader({ roots: async () => [] }), si, null), [{ options: [], selectedId: null }]);
});

test('country/area mismatch is rejected', async () => {
  await assert.rejects(() => loadCanonicalHierarchy(loader(), fr, chCity.id), /non appartiene al Paese/);
});

test('changing a higher level truncates descendants and reset restores parent value', () => {
  const levels = [{ options: [frRoot], selectedId: frRoot.id }, { options: [frDepartment], selectedId: frDepartment.id }, { options: [frCommune], selectedId: frCommune.id }];
  const changed = applyCanonicalLevelSelection(levels, 0, null); assert.equal(changed.levels.length, 1); assert.equal(changed.value, null);
  const resetChild = applyCanonicalLevelSelection(levels, 2, null); assert.equal(resetChild.levels.length, 3); assert.equal(resetChild.value, frDepartment.id);
});

test('loader errors propagate for loading error and retry orchestration', async () => {
  await assert.rejects(() => loadCanonicalHierarchy(loader({ roots: async () => { throw new Error('network'); } }), fr, null), /network/);
  assert.equal((await loadCanonicalHierarchy(loader(), fr, null))[0].options.length, 1);
});

test('component exposes controlled, disabled, required, loading, empty, retry and accessible labels', () => {
  const source = readFileSync(new URL('../../components/geo/CanonicalGeographySelector.tsx', import.meta.url), 'utf8');
  for (const pattern of [/countryId: string \| null/, /geoAreaId: string \| null/, /onCountryChange/, /onGeoAreaChange/, /disabled\?: boolean/, /required\?: boolean/, /role="status"/, /role="alert"/, /htmlFor=/, /aria-busy=/, /aria-invalid=/, /labels\.retry/, /labels\.empty/]) assert.match(source, pattern);
  assert.doesNotMatch(source, /\?\?\s*['"]IT['"]|useState\(['"]IT['"]\)/);
});
