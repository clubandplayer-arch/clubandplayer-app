import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildResidenceDualWritePlan,
  parseResidencePatch,
  ResidenceContractError,
  type CanonicalToItalyLegacyMapping,
  type ResidenceCountry,
  type ResidenceWriteContext,
} from '../../lib/geo/profileResidenceWriteContract';
import type { ProfileGeoArea } from '../../lib/geo/profileGeography';

const ids = {
  it: '10000000-0000-4000-8000-000000000001', fr: '10000000-0000-4000-8000-000000000002', ch: '10000000-0000-4000-8000-000000000003',
  root: '20000000-0000-4000-8000-000000000001', middle: '20000000-0000-4000-8000-000000000002', leaf: '20000000-0000-4000-8000-000000000003',
};
const country = (id: string, iso2: string, overrides: Partial<ResidenceCountry> = {}): ResidenceCountry => ({ id, iso2, isSupported: true, isActive: true, ...overrides });
const area = (id: string, countryId: string, iso2: string, parentId: string | null, name: string, areaType: string, level: number): ProfileGeoArea => ({ id, countryId, countryIso2: iso2, parentId, officialName: name, areaType, level });
const context = (value: Partial<ResidenceWriteContext>): ResidenceWriteContext => ({ country: null, area: null, ancestors: [], ...value });
const full = (countryId = ids.fr, areaId = ids.leaf) => parseResidencePatch({ geography: { residenceCountryId: countryId, residenceGeoAreaId: areaId } });

test('geography contract distinguishes absent, reset, country-only and full residence', () => {
  assert.deepEqual(parseResidencePatch({ display_name: 'No geography' }), { kind: 'absent' });
  assert.equal(parseResidencePatch({ geography: { residenceCountryId: null, residenceGeoAreaId: null } }).kind, 'reset');
  assert.equal(parseResidencePatch({ geography: { residenceCountryId: ids.fr, residenceGeoAreaId: null } }).kind, 'country_only');
  assert.equal(full().kind, 'full');
});

test('contract rejects partial geography objects, invalid UUIDs and area without country', () => {
  for (const payload of [
    { geography: {} },
    { geography: { residenceCountryId: ids.fr } },
    { geography: { residenceCountryId: null, residenceGeoAreaId: ids.leaf } },
    { geography: { residenceCountryId: 'FR', residenceGeoAreaId: null } },
    { geography: { residenceCountryId: ids.fr, residenceGeoAreaId: 'Paris' } },
  ]) assert.throws(() => parseResidencePatch(payload), ResidenceContractError);
});

test('country must exist and be supported and active', () => {
  const patch = parseResidencePatch({ geography: { residenceCountryId: ids.fr, residenceGeoAreaId: null } });
  for (const candidate of [null, country(ids.fr, 'FR', { isSupported: false }), country(ids.fr, 'FR', { isActive: false }), country(ids.it, 'IT')]) {
    assert.throws(() => buildResidenceDualWritePlan(patch, context({ country: candidate })), (error: unknown) => error instanceof ResidenceContractError && error.code === 'COUNTRY_NOT_AVAILABLE');
  }
});

test('country-only writes canonical country, clears legacy residence and accepts no area chain', () => {
  const patch = parseResidencePatch({ geography: { residenceCountryId: ids.fr, residenceGeoAreaId: null } });
  const plan = buildResidenceDualWritePlan(patch, context({ country: country(ids.fr, 'FR') }));
  assert.deepEqual(plan, { kind: 'country_only', preferences: { residence_country_id: ids.fr, residence_geo_area_id: null }, legacyProfile: { region: null, province: null, city: null, residence_region_id: null, residence_province_id: null, residence_municipality_id: null } });
  assert.throws(() => buildResidenceDualWritePlan(patch, context({ country: country(ids.fr, 'FR'), area: area(ids.leaf, ids.fr, 'FR', null, 'Paris', 'COMMUNE', 3) })), /country-only/);
});

test('absent produces no write while reset explicitly clears canonical and legacy residence only', () => {
  assert.equal(buildResidenceDualWritePlan({ kind: 'absent' }, context({})), null);
  const reset = buildResidenceDualWritePlan(parseResidencePatch({ geography: { residenceCountryId: null, residenceGeoAreaId: null } }), context({}));
  assert.equal(reset?.kind, 'reset'); assert.deepEqual(reset?.preferences, { residence_country_id: null, residence_geo_area_id: null });
  assert.equal(Object.keys(reset?.legacyProfile ?? {}).some((key) => key.startsWith('interest_')), false);
});

test('full residence rejects missing area, country mismatch and incoherent hierarchy', () => {
  const fr = country(ids.fr, 'FR');
  assert.throws(() => buildResidenceDualWritePlan(full(), context({ country: fr })), (error: unknown) => error instanceof ResidenceContractError && error.code === 'AREA_NOT_FOUND');
  const root = area(ids.root, ids.it, 'IT', null, 'Lazio', 'REGION', 1);
  const leaf = area(ids.leaf, ids.it, 'IT', ids.root, 'Roma', 'MUNICIPALITY', 3);
  assert.throws(() => buildResidenceDualWritePlan(full(), context({ country: fr, area: leaf, ancestors: [root] })), (error: unknown) => error instanceof ResidenceContractError && error.code === 'COUNTRY_AREA_MISMATCH');
  const frRoot = area(ids.root, ids.fr, 'FR', null, 'Île-de-France', 'REGION', 1);
  const badLeaf = area(ids.leaf, ids.fr, 'FR', ids.middle, 'Paris', 'COMMUNE', 3);
  assert.throws(() => buildResidenceDualWritePlan(full(), context({ country: fr, area: badLeaf, ancestors: [frRoot] })), (error: unknown) => error instanceof ResidenceContractError && error.code === 'INVALID_HIERARCHY');
});

test('Italy canonical residence maps every present level to a verified legacy ID', () => {
  const root = area(ids.root, ids.it, 'IT', null, 'Sicilia', 'REGION', 1);
  const province = area(ids.middle, ids.it, 'IT', ids.root, 'Catania', 'PROVINCE', 2);
  const city = area(ids.leaf, ids.it, 'IT', ids.middle, 'Catania', 'MUNICIPALITY', 3);
  const mappings: CanonicalToItalyLegacyMapping[] = [
    { geoAreaId: root.id, entityType: 'region', legacyId: 19 },
    { geoAreaId: province.id, entityType: 'province', legacyId: '87' },
    { geoAreaId: city.id, entityType: 'municipality', legacyId: 87015 },
  ];
  const plan = buildResidenceDualWritePlan(full(ids.it), context({ country: country(ids.it, 'IT'), area: city, ancestors: [root, province], italyMappings: mappings }));
  assert.deepEqual(plan?.legacyProfile, { region: 'Sicilia', province: 'Catania', city: 'Catania', residence_region_id: 19, residence_province_id: 87, residence_municipality_id: 87015 });
  assert.deepEqual(plan?.preferences, { residence_country_id: ids.it, residence_geo_area_id: ids.leaf });
});

test('Italy missing or ambiguous mappings fail before a plan can be produced', () => {
  const root = area(ids.root, ids.it, 'IT', null, 'Sicilia', 'REGION', 1);
  const patch = full(ids.it, ids.root);
  const base = context({ country: country(ids.it, 'IT'), area: root });
  assert.throws(() => buildResidenceDualWritePlan(patch, base), (error: unknown) => error instanceof ResidenceContractError && error.code === 'ITALY_MAPPING_MISSING');
  const duplicate: CanonicalToItalyLegacyMapping[] = [{ geoAreaId: root.id, entityType: 'region', legacyId: 1 }, { geoAreaId: root.id, entityType: 'region', legacyId: 2 }];
  assert.throws(() => buildResidenceDualWritePlan(patch, { ...base, italyMappings: duplicate }), (error: unknown) => error instanceof ResidenceContractError && error.code === 'ITALY_MAPPING_AMBIGUOUS');
});

const projectionCase = (iso2: string, types: string[], names: string[], expected: [string | null, string | null, string | null]) => {
  const countryId = ids.fr;
  const chain = types.map((type, index) => area([ids.root, ids.middle, ids.leaf][index], countryId, iso2, index ? [ids.root, ids.middle][index - 1] : null, names[index], type, index + 1));
  const plan = buildResidenceDualWritePlan(full(countryId, chain.at(-1)!.id), context({ country: country(countryId, iso2), area: chain.at(-1)!, ancestors: chain.slice(0, -1) }));
  assert.deepEqual([plan?.legacyProfile.region, plan?.legacyProfile.province, plan?.legacyProfile.city], expected);
  assert.deepEqual([plan?.legacyProfile.residence_region_id, plan?.legacyProfile.residence_province_id, plan?.legacyProfile.residence_municipality_id], [null, null, null]);
};

test('foreign canonical chains project country-aware text and always clear Italy IDs', () => {
  projectionCase('FR', ['REGION', 'DEPARTMENT', 'COMMUNE'], ['Île-de-France', 'Paris', 'Paris'], ['Île-de-France', 'Paris', 'Paris']);
  projectionCase('ES', ['AUTONOMOUS_COMMUNITY', 'PROVINCE', 'MUNICIPALITY'], ['Madrid, Comunidad de', 'Madrid', 'Alcalá de Henares'], ['Madrid, Comunidad de', 'Madrid', 'Alcalá de Henares']);
  projectionCase('SI', ['STATISTICAL_REGION', 'MUNICIPALITY'], ['Osrednjeslovenska', 'Ljubljana'], ['Osrednjeslovenska', null, 'Ljubljana']);
  projectionCase('PL', ['VOIVODESHIP', 'POWIAT', 'GMINA'], ['Mazowieckie', 'Warszawa', 'Warszawa'], ['Mazowieckie', 'Warszawa', 'Warszawa']);
});

test('Switzerland supports both district depths', () => {
  projectionCase('CH', ['CANTON', 'DISTRICT', 'MUNICIPALITY'], ['Ticino', 'Lugano', 'Lugano'], ['Ticino', 'Lugano', 'Lugano']);
  projectionCase('CH', ['CANTON', 'MUNICIPALITY'], ['Genève', 'Genève'], ['Genève', null, 'Genève']);
});

test('write contract never emits or consumes interests, nationality, birth country or relocation', () => {
  const source = readFileSync(new URL('../../lib/geo/profileResidenceWriteContract.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /interest_country|interest_region|interest_province|interest_city|birth_country|open_to_relocation/);
  const plan = buildResidenceDualWritePlan(parseResidencePatch({ geography: { residenceCountryId: ids.fr, residenceGeoAreaId: null }, interest_country: 'IT' }), context({ country: country(ids.fr, 'FR') }));
  assert.equal(Object.keys(plan ?? {}).some((key) => key.includes('interest')), false);
});

test('/api/profiles/me preserves absent interest_country instead of defaulting to Italy', () => {
  const source = readFileSync(new URL('../../app/api/profiles/me/route.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /updates\.interest_country\s*===\s*undefined[^\n]*['"]IT['"]/);
});
