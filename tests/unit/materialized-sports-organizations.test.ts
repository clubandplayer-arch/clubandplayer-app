import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MaterializedSportsOrganizationRepository,
  type MaterializedSportsOrganizationDataSource,
  type MaterializedSportsOrganization,
} from '../../lib/taxonomy/materializedSportsOrganizations.server';

const id = (digit: string) => `${digit.repeat(8)}-${digit.repeat(4)}-4${digit.repeat(3)}-8${digit.repeat(3)}-${digit.repeat(12)}`;
const ids = { country: id('1'), secondCountry: id('2'), sport: id('3'), basket: id('a'), discipline: id('4'), variant: id('5'), otherVariant: id('6'), lnd: id('7'), eifa: id('8'), fip: id('9') };

const organization = (organizationId: string, officialName: string, countries = [ids.country]): MaterializedSportsOrganization => ({
  id: organizationId, code: officialName.toLowerCase().replaceAll(/\W+/g, '_'), officialName,
  organizationType: 'federation', parentId: null, primaryCountryId: countries[0] ?? null,
  countryIds: countries, validFrom: null, validTo: null,
});

class FakeSource implements MaterializedSportsOrganizationDataSource {
  categoryIds: string[] = [];
  categoryIdsBySport = new Map<string, string[]>();
  categoryOverflow = false;
  disciplines: Array<{ id: string; sportId: string; isActive: boolean }> = [];
  variants: Array<{ id: string; disciplineId: string; isActive: boolean }> = [];
  organizations = new Map<string, MaterializedSportsOrganization>();
  excludedOrganizationIds = new Set<string>();
  calls = { categories: 0 };
  country = { id: ids.country, isActive: true, isSupported: true };
  sport = { id: ids.sport, isActive: true };
  discipline = { id: ids.discipline, sportId: ids.sport, isActive: true };
  variant = { id: ids.variant, disciplineId: ids.discipline, isActive: true };
  async getCountry() { return this.country; }
  async getSport() { return this.sport; }
  async getDiscipline() { return this.discipline; }
  async getVariant() { return this.variant; }
  async listActiveDisciplines() { return this.disciplines; }
  async listActiveVariants() { return this.variants; }
  async listCategoryOrganizationIds(query: { sportId: string }) {
    this.calls.categories++;
    return { organizationIds: this.categoryIdsBySport.get(query.sportId) ?? this.categoryIds, overflow: this.categoryOverflow };
  }
  async listActiveOrganizations(candidateIds: string[], countryId: string) {
    return candidateIds.flatMap((candidate) => {
      const item = this.organizations.get(candidate);
      return item && !this.excludedOrganizationIds.has(candidate) &&
        (item.primaryCountryId === countryId || item.countryIds.includes(countryId)) ? [item] : [];
    });
  }
}

const setup = () => { const source = new FakeSource(); return { source, repository: new MaterializedSportsOrganizationRepository(source) }; };
const base = { countryId: ids.country, sportId: ids.sport, asOf: '2026-09-12' };

test('rejects malformed UUID, date, limit and variant without discipline', async () => {
  const invalid = [
    { ...base, countryId: 'IT' }, { ...base, sportId: 'football' }, { ...base, disciplineId: 'football' },
    { ...base, variantId: ids.variant }, { ...base, asOf: '2026-02-30' },
    { ...base, limit: 0 }, { ...base, limit: 201 }, { ...base, limit: 1.5 },
  ];
  for (const query of invalid) assert.equal((await setup().repository.list(query)).status, 'invalid_query');
});

test('rejects unavailable parents and incompatible discipline/variant scopes', async () => {
  let state = setup(); state.source.country = { ...state.source.country, isSupported: false };
  assert.equal((await state.repository.list(base)).status, 'unsupported_country');
  state = setup(); state.source.sport = { ...state.source.sport, isActive: false };
  assert.equal((await state.repository.list(base)).status, 'inactive_sport');
  state = setup(); state.source.discipline = { ...state.source.discipline, sportId: id('a') };
  assert.equal((await state.repository.list({ ...base, disciplineId: ids.discipline })).status, 'invalid_scope');
  state = setup(); state.source.variant = { ...state.source.variant, disciplineId: id('a') };
  assert.equal((await state.repository.list({ ...base, disciplineId: ids.discipline, variantId: ids.variant })).status, 'invalid_scope');
});

test('deduplicates category-derived organizations deterministically', async () => {
  const { source, repository } = setup();
  source.categoryIds = [ids.lnd, ids.eifa, ids.lnd];
  source.organizations.set(ids.lnd, organization(ids.lnd, 'Lega Nazionale Dilettanti'));
  source.organizations.set(ids.eifa, organization(ids.eifa, 'E.I.F.A.'));
  const result = await repository.list(base);
  assert.equal(result.status, 'ok');
  assert.deepEqual(result.status === 'ok' && result.organizations.map((item) => item.id), [ids.eifa, ids.lnd]);
  assert.equal(result.status === 'ok' && result.derivation, 'materialized_options');
});

test('Lega Calcio a 8 is excluded from incompatible variants because category queries use the exact structural scope', async () => {
  const { source, repository } = setup();
  source.categoryIds = [ids.eifa];
  source.organizations.set(ids.eifa, organization(ids.eifa, 'E.I.F.A.'));
  const result = await repository.list({ ...base, disciplineId: ids.discipline, variantId: ids.variant });
  assert.equal(result.status, 'ok');
  assert.deepEqual(result.status === 'ok' && result.organizations.map((item) => item.id), [ids.eifa]);
  assert.deepEqual(source.calls, { categories: 1 });
});

test('requires discipline or variant from stable taxonomy cardinality, independently of materialized categories', async () => {
  let state = setup(); state.source.disciplines = [state.source.discipline, { ...state.source.discipline, id: id('a') }];
  assert.equal((await state.repository.list(base)).status, 'invalid_scope');
  state = setup(); state.source.variants = [state.source.variant, { ...state.source.variant, id: ids.otherVariant }];
  assert.equal((await state.repository.list({ ...base, disciplineId: ids.discipline })).status, 'invalid_scope');
});

test('returns zero, one and multiple organizations while preserving native names and multi-country matches', async () => {
  let state = setup();
  assert.deepEqual(await state.repository.list(base), { status: 'ok', derivation: 'materialized_options', organizations: [] });
  state = setup(); state.source.categoryIds = [ids.lnd];
  state.source.organizations.set(ids.lnd, organization(ids.lnd, 'Lega Nazionale Dilettanti', [ids.secondCountry, ids.country]));
  let result = await state.repository.list(base);
  assert.deepEqual(result.status === 'ok' && result.organizations.map((item) => item.officialName), ['Lega Nazionale Dilettanti']);
  state.source.categoryIds = [ids.lnd, ids.eifa]; state.source.organizations.set(ids.eifa, organization(ids.eifa, 'Élite Française'));
  result = await state.repository.list(base);
  assert.deepEqual(result.status === 'ok' && result.organizations.map((item) => item.officialName), ['Élite Française', 'Lega Nazionale Dilettanti']);
});

test('excludes inactive or expired organizations returned by an option source', async () => {
  const { source, repository } = setup(); source.categoryIds = [ids.lnd, ids.fip];
  source.organizations.set(ids.lnd, organization(ids.lnd, 'LND'));
  source.organizations.set(ids.fip, organization(ids.fip, 'Federazione Italiana Pallacanestro'));
  // The datasource applies is_active and asOf before returning organizations.
  source.excludedOrganizationIds.add(ids.fip);
  const result = await repository.list(base);
  assert.deepEqual(result.status === 'ok' && result.organizations.map((item) => item.id), [ids.lnd]);
});

test('derives E.I.F.A. for Football and FIP only for Basket, while ELITE is never invented as an organizer', async () => {
  const { source, repository } = setup();
  source.categoryIdsBySport.set(ids.sport, [ids.eifa]);
  source.categoryIdsBySport.set(ids.basket, [ids.fip]);
  source.organizations.set(ids.fip, organization(ids.fip, 'Federazione Italiana Pallacanestro'));
  source.organizations.set(ids.eifa, organization(ids.eifa, 'E.I.F.A.'));
  let result = await repository.list(base);
  assert.deepEqual(result.status === 'ok' && result.organizations.map((item) => item.officialName), ['E.I.F.A.']);
  source.sport = { id: ids.basket, isActive: true };
  result = await repository.list({ ...base, sportId: ids.basket });
  assert.deepEqual(result.status === 'ok' && result.organizations.map((item) => item.officialName), ['Federazione Italiana Pallacanestro']);
  assert.equal(result.status === 'ok' && result.organizations.some((item) => item.officialName === 'ELITE'), false);
});

test('fails closed when distinct category-derived organizations exceed the requested limit', async () => {
  const state = setup(); state.source.categoryIds = [ids.lnd, ids.eifa];
  assert.equal((await state.repository.list({ ...base, limit: 1 })).status, 'overflow');
});

test('fails closed when duplicate category rows exhaust the bounded scan before another organization', async () => {
  const state = setup();
  state.source.categoryIds = Array.from({ length: 200 }, () => ids.lnd);
  state.source.categoryOverflow = true;
  assert.deepEqual(await state.repository.list({ ...base, limit: 200 }), { status: 'overflow', organizations: [] });
});
