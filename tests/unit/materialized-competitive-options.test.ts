import assert from 'node:assert/strict';
import test from 'node:test';

import { MaterializedCompetitiveOptionRepository, type MaterializedCompetitiveOptionDataSource, type OrganizationCategoryOption } from '../../lib/taxonomy/materializedCompetitiveOptions.server';

const id = (digit: string) => `${digit.repeat(8)}-${digit.repeat(4)}-4${digit.repeat(3)}-8${digit.repeat(3)}-${digit.repeat(12)}`;
const ids = { country: id('1'), sport: id('2'), organization: id('3'), discipline: id('4'), variant: id('5') };
const category = (digit: string, name: string, code: string): OrganizationCategoryOption =>
  ({ kind: 'organization_category', id: id(digit), code, officialName: name });
class Source implements MaterializedCompetitiveOptionDataSource {
  country = { id: ids.country, isActive: true, isSupported: true };
  sport = { id: ids.sport, isActive: true };
  available = true;
  disciplines: Array<{id:string;sportId:string;isActive:boolean}> = [];
  variants: Array<{id:string;disciplineId:string;isActive:boolean}> = [];
  categories: OrganizationCategoryOption[] = [];
  calls: unknown[] = [];
  async getCountry() { return this.country; }
  async getSport() { return this.sport; }
  async getDiscipline() { return { id: ids.discipline, sportId: ids.sport, isActive: true }; }
  async getVariant() { return { id: ids.variant, disciplineId: ids.discipline, isActive: true }; }
  async listActiveDisciplines() { return this.disciplines; }
  async listActiveVariants() { return this.variants; }
  async isOrganizationAvailable() { return this.available; }
  async listCategories(query: unknown) { this.calls.push(query); return this.categories; }
}
const base = { countryId: ids.country, sportId: ids.sport, organizationId: ids.organization, asOf: '2026-09-14' };
const setup = () => { const source = new Source(); return { source, repository: new MaterializedCompetitiveOptionRepository(source) }; };

test('rejects malformed IDs, dates, limits and variant without discipline', async () => {
  for (const query of [{ ...base, countryId: '' }, { ...base, organizationId: 'LND' }, { ...base, asOf: '2026-02-30' },
    { ...base, variantId: ids.variant }, ...[0, 201, 1.5].map((limit) => ({ ...base, limit }))]) {
    assert.equal((await setup().repository.list(query)).status, 'invalid_query');
  }
});

test('rejects unavailable parents, organization, and ambiguous scope', async () => {
  let state = setup(); state.source.country.isSupported = false; assert.equal((await state.repository.list(base)).status, 'unsupported_country');
  state = setup(); state.source.sport.isActive = false; assert.equal((await state.repository.list(base)).status, 'inactive_sport');
  state = setup(); state.source.available = false; assert.equal((await state.repository.list(base)).status, 'unavailable_organization');
  state = setup(); state.source.disciplines = [{ id: ids.discipline, sportId: ids.sport, isActive: true }, { id: id('9'), sportId: ids.sport, isActive: true }];
  assert.equal((await state.repository.list(base)).status, 'invalid_scope');
});

test('returns zero, one or three stable organization categories in datasource order', async () => {
  let state = setup(); assert.deepEqual(await state.repository.list(base), { status: 'ok', organizationId: ids.organization, options: [] });
  state = setup(); state.source.categories = [category('6', 'Serie A', 'c8_serie_a')];
  assert.equal((await state.repository.list({ ...base, disciplineId: ids.discipline, variantId: ids.variant })).options.length, 1);
  state.source.categories = [category('6', 'Serie A', 'c8_serie_a'), category('7', 'Serie A2', 'c8_serie_a2'), category('8', 'Serie B', 'c8_serie_b')];
  const result = await state.repository.list({ ...base, disciplineId: ids.discipline, variantId: ids.variant });
  assert.deepEqual(result.status === 'ok' && result.options.map(({ kind, code, officialName }) => ({ kind, code, officialName })), [
    { kind: 'organization_category', code: 'c8_serie_a', officialName: 'Serie A' },
    { kind: 'organization_category', code: 'c8_serie_a2', officialName: 'Serie A2' },
    { kind: 'organization_category', code: 'c8_serie_b', officialName: 'Serie B' },
  ]);
  assert.deepEqual(state.source.calls.at(-1), { countryId: ids.country, sportId: ids.sport, organizationId: ids.organization, disciplineId: ids.discipline, variantId: ids.variant, fetchLimit: 101 });
});

test('fails closed without returning a partial category list on overflow', async () => {
  const state = setup(); state.source.categories = [category('6', 'Serie A', 'c8_serie_a'), category('7', 'Serie A2', 'c8_serie_a2')];
  assert.deepEqual(await state.repository.list({ ...base, limit: 1 }), { status: 'overflow', options: [] });
});

test('the public option has only kind, id, code and unchanged officialName', async () => {
  const state = setup(); state.source.categories = [category('6', 'Série Élite', 'serie_elite')];
  const result = await state.repository.list(base);
  assert.deepEqual(result.status === 'ok' && result.options[0], {
    kind: 'organization_category', id: id('6'), code: 'serie_elite', officialName: 'Série Élite',
  });
});
