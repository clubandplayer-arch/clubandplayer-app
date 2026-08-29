import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  GeoReadError,
  assertUuid,
  getCountryGeoAreaChildren,
  getGeoAreaAncestors,
  getRootGeoAreas,
  normalizeCountryIso2,
  type GeoAreaRead,
} from '../../lib/geo/areas';
import { getSupportedCountries } from '../../lib/geo/countryCatalog';
import { getProfileGeography, resolveProfileResidenceGeography, type ProfileGeographySnapshot } from '../../lib/geo/profileGeography';

const ids = {
  itRoot: '10000000-0000-4000-8000-000000000001',
  frRoot: '10000000-0000-4000-8000-000000000002',
  esRoot: '10000000-0000-4000-8000-000000000003',
  chRoot: '10000000-0000-4000-8000-000000000004',
  siRoot: '10000000-0000-4000-8000-000000000005',
  plRoot: '10000000-0000-4000-8000-000000000006',
  chMunicipality: '20000000-0000-4000-8000-000000000001',
  frDepartment: '20000000-0000-4000-8000-000000000002',
  frCommune: '30000000-0000-4000-8000-000000000001',
};

const countryIds = Object.fromEntries(['IT', 'FR', 'ES', 'CH', 'SI', 'PL'].map((iso2, index) => [iso2, `40000000-0000-4000-8000-00000000000${index + 1}`]));
const area = (id: string, iso2: string, parent_id: string | null, area_type: string, level: number): GeoAreaRead => ({
  id, country_id: countryIds[iso2], parent_id, code: null, code_authority: null, official_name: `${iso2}-${area_type}`,
  short_name: null, area_type, level, is_active: true, display_order: 0, centroid_lat: null, centroid_lng: null,
  min_lat: null, min_lng: null, max_lat: null, max_lng: null, country: { iso2 }, geo_area_names: [],
});
const areas = [
  area(ids.itRoot, 'IT', null, 'REGION', 1), area(ids.frRoot, 'FR', null, 'REGION', 1),
  area(ids.esRoot, 'ES', null, 'AUTONOMOUS_COMMUNITY', 1), area(ids.chRoot, 'CH', null, 'CANTON', 1),
  area(ids.siRoot, 'SI', null, 'STATISTICAL_REGION', 1), area(ids.plRoot, 'PL', null, 'VOIVODESHIP', 1),
  area(ids.chMunicipality, 'CH', ids.chRoot, 'MUNICIPALITY', 2),
  area(ids.frDepartment, 'FR', ids.frRoot, 'DEPARTMENT', 2), area(ids.frCommune, 'FR', ids.frDepartment, 'COMMUNE', 3),
];

class Query implements PromiseLike<{ data: unknown; error: null }> {
  private filters: Array<(row: any) => boolean> = [];
  private single = false;
  constructor(private readonly rows: any[]) {}
  select() { return this; }
  eq(key: string, value: unknown) { this.filters.push((row) => key === 'countries.iso2' ? row.country?.iso2 === value : row[key] === value); return this; }
  is(key: string, value: unknown) { this.filters.push((row) => row[key] === value); return this; }
  order() { return this; }
  maybeSingle() { this.single = true; return this; }
  then<TResult1 = { data: unknown; error: null }, TResult2 = never>(onfulfilled?: ((value: { data: unknown; error: null }) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null): PromiseLike<TResult1 | TResult2> {
    const matches = this.rows.filter((row) => this.filters.every((filter) => filter(row)));
    return Promise.resolve({ data: this.single ? matches[0] ?? null : matches, error: null }).then(onfulfilled, onrejected);
  }
}
const client = (tables: Record<string, any[]>) => ({ from: (table: string) => new Query(tables[table] ?? []) }) as unknown as SupabaseClient;

test('supported countries contract reads the six active canonical rows without a static default', async () => {
  const countries = Object.entries(countryIds).map(([iso2, id], display_order) => ({ id, iso2, iso3: `${iso2}X`, official_name: iso2, is_supported: true, is_active: true, display_order }));
  const result = await getSupportedCountries(client({ countries }));
  assert.deepEqual(result.map((country) => country.iso2), ['IT', 'FR', 'ES', 'CH', 'SI', 'PL']);
  assert.equal(result.every((country) => country.id && country.isActive && country.isSupported), true);
});

test('root contracts support every initial country and heterogeneous root types', async () => {
  const db = client({ geo_areas: areas });
  const expected = { IT: 'REGION', FR: 'REGION', ES: 'AUTONOMOUS_COMMUNITY', CH: 'CANTON', SI: 'STATISTICAL_REGION', PL: 'VOIVODESHIP' } as const;
  for (const [iso2, areaType] of Object.entries(expected)) {
    const roots = await getRootGeoAreas(db, iso2);
    assert.deepEqual(roots.map((root) => root.area_type), [areaType]);
  }
});

test('children are country-aware and support a Swiss municipality without a district', async () => {
  const db = client({ geo_areas: areas });
  assert.deepEqual((await getCountryGeoAreaChildren(db, 'CH', ids.chRoot)).map((child) => child.id), [ids.chMunicipality]);
  await assert.rejects(() => getCountryGeoAreaChildren(db, 'FR', ids.chRoot), (error: unknown) => error instanceof GeoReadError && error.code === 'COUNTRY_PARENT_MISMATCH');
});

test('ancestors return root-to-parent order for variable depths and report missing areas', async () => {
  const db = client({ geo_areas: areas });
  assert.deepEqual((await getGeoAreaAncestors(db, ids.frCommune)).map((ancestor) => ancestor.id), [ids.frRoot, ids.frDepartment]);
  assert.deepEqual((await getGeoAreaAncestors(db, ids.chMunicipality)).map((ancestor) => ancestor.id), [ids.chRoot]);
  await assert.rejects(() => getGeoAreaAncestors(db, '50000000-0000-4000-8000-000000000001'), (error: unknown) => error instanceof GeoReadError && error.code === 'AREA_NOT_FOUND');
});

test('country and UUID validation reject invalid parameters without defaulting to Italy', () => {
  assert.equal(normalizeCountryIso2(' fr '), 'FR');
  assert.throws(() => normalizeCountryIso2(''), (error: unknown) => error instanceof GeoReadError && error.code === 'INVALID_COUNTRY');
  assert.throws(() => assertUuid('not-a-uuid'), (error: unknown) => error instanceof GeoReadError && error.code === 'INVALID_UUID');
});

const snapshot = (overrides: Partial<ProfileGeographySnapshot> = {}): ProfileGeographySnapshot => ({
  residenceCountryId: null, residenceCountryIso2: null, residenceGeoAreaId: null, residenceArea: null,
  residenceAncestors: [], openToRelocation: false, countryInterests: [], geoAreaInterests: [], legacy: {}, italyLegacyMappings: [], ...overrides,
});

test('profile contract keeps canonical residence, interests and relocation separate', async () => {
  const canonicalArea = { id: ids.frCommune, countryId: countryIds.FR, countryIso2: 'FR', parentId: ids.frDepartment, officialName: 'Paris', areaType: 'COMMUNE', level: 3 };
  const result = await getProfileGeography({ load: async () => snapshot({
    residenceCountryId: countryIds.FR, residenceCountryIso2: 'FR', residenceGeoAreaId: canonicalArea.id, residenceArea: canonicalArea,
    openToRelocation: true, countryInterests: [{ countryId: countryIds.ES, iso2: 'ES', priority: 1 }], geoAreaInterests: [{ area: { ...canonicalArea, id: ids.chMunicipality, countryIso2: 'CH' }, priority: 1 }],
  }) }, 'profile');
  assert.equal(result.residence.source, 'canonical'); assert.equal(result.residence.countryIso2, 'FR');
  assert.deepEqual(result.countryInterests.map((interest) => interest.iso2), ['ES']);
  assert.deepEqual(result.geoAreaInterests.map((interest) => interest.area.countryIso2), ['CH']);
  assert.equal(result.openToRelocation, true);
});

test('safe Italy residence mapping, textual fallback and unavailable profile are explicit', () => {
  const mapped = { id: ids.itRoot, countryId: countryIds.IT, countryIso2: 'IT', parentId: null, officialName: 'Lazio', areaType: 'REGION', level: 1 };
  assert.equal(resolveProfileResidenceGeography(snapshot({ legacy: { residenceRegionId: 7, interestRegionId: 99 }, italyLegacyMappings: [{ entityType: 'region', legacyId: '7', area: mapped, ancestors: [] }] })).source, 'italy_legacy_mapping');
  assert.equal(resolveProfileResidenceGeography(snapshot({ legacy: { country: 'FR', city: 'Paris' } })).source, 'legacy_text');
  assert.equal(resolveProfileResidenceGeography(snapshot()).source, 'none');
});

test('private profile geography repository relies on caller Supabase client and existing owner/admin RLS', () => {
  const repository = readFileSync(new URL('../../lib/geo/profileGeography.server.ts', import.meta.url), 'utf8');
  const preferencesMigration = readFileSync(new URL('../../supabase/migrations/20260822130000_european_profile_preferences.sql', import.meta.url), 'utf8');
  const geographyMigration = readFileSync(new URL('../../supabase/migrations/20261203120000_profile_canonical_geography.sql', import.meta.url), 'utf8');
  assert.doesNotMatch(repository, /service.?role|createClient\s*\(/i);
  assert.match(preferencesMigration, /profile_preferences_select_own_or_admin[\s\S]*for select to authenticated/i);
  assert.match(preferencesMigration, /profile_country_interests_select_own_or_admin[\s\S]*for select to authenticated/i);
  assert.match(geographyMigration, /profile_geo_area_interests_select_own_or_admin[\s\S]*for select to authenticated/i);
});
