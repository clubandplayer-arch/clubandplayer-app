import assert from 'node:assert/strict';
import test from 'node:test';

import { MaterializedCompetitiveOptionRepository, type CompetitionLevelOption, type CompetitionOption, type MaterializedCompetitiveOptionDataSource } from '../../lib/taxonomy/materializedCompetitiveOptions.server';

const id = (digit: string) => `${digit.repeat(8)}-${digit.repeat(4)}-4${digit.repeat(3)}-8${digit.repeat(3)}-${digit.repeat(12)}`;
const ids = { country: id('1'), sport: id('2'), organization: id('3'), discipline: id('4'), variant: id('5'), level: id('6'), competition: id('7') };
const level = (overrides: Partial<CompetitionLevelOption> = {}): CompetitionLevelOption => ({ kind: 'competition_level', id: ids.level, code: 'elite', officialName: 'Élite', organizationId: ids.organization, sportId: ids.sport, countryId: ids.country, levelRank: 2, validFrom: null, validTo: null, displayOrder: 4, ...overrides });
const competition = (overrides: Partial<CompetitionOption> = {}): CompetitionOption => ({ kind: 'competition', id: ids.competition, code: 'cup_name', officialName: 'Coppa Nazionale', organizationId: ids.organization, sportId: ids.sport, disciplineId: ids.discipline, variantId: ids.variant, competitionType: null, primaryCountryId: ids.country, countryIds: [ids.country], territorialScopeCode: 'national', geoAreaIds: [], activeEditionIds: [id('8')], ...overrides });
class Source implements MaterializedCompetitiveOptionDataSource {
  country = { id: ids.country, isActive: true, isSupported: true }; sport = { id: ids.sport, isActive: true };
  disciplines: Array<{id:string;sportId:string;isActive:boolean}> = []; variants: Array<{id:string;disciplineId:string;isActive:boolean}> = [];
  available = true; direct: CompetitionLevelOption[] = []; linked: CompetitionLevelOption[] = []; batch = { options: [] as CompetitionOption[], linkedLevelIds: [] as string[], overflow: false };
  batchesBySport = new Map<string, typeof this.batch>(); calls = { direct: 0, linked: 0, competitionScopes: [] as Array<{ sportId: string; disciplineId: string | null; variantId: string | null }> };
  async getCountry() { return this.country; } async getSport() { return this.sport; }
  async getDiscipline() { return { id: ids.discipline, sportId: ids.sport, isActive: true }; }
  async getVariant() { return { id: ids.variant, disciplineId: ids.discipline, isActive: true }; }
  async listActiveDisciplines() { return this.disciplines; } async listActiveVariants() { return this.variants; }
  async isOrganizationAvailable() { return this.available; }
  async listDirectLevels() { this.calls.direct++; return this.direct; }
  async listLevelsByIds() { this.calls.linked++; return this.linked; }
  async listCompetitions(query: { sportId: string; disciplineId: string | null; variantId: string | null }) { this.calls.competitionScopes.push(query); return this.batchesBySport.get(query.sportId) ?? this.batch; }
}
const base = { countryId: ids.country, sportId: ids.sport, organizationId: ids.organization, asOf: '2026-09-13' };
const setup = () => { const source = new Source(); return { source, repository: new MaterializedCompetitiveOptionRepository(source) }; };

test('rejects missing/malformed IDs, dates, limits and variant without discipline', async () => {
  for (const query of [{ ...base, countryId: '' }, { ...base, organizationId: 'LND' }, { ...base, asOf: '2026-02-30' }, { ...base, variantId: ids.variant }, ...[0, 201, 1.5].map((limit) => ({ ...base, limit }))])
    assert.equal((await setup().repository.list(query)).status, 'invalid_query');
});
test('rejects unavailable country, sport, organization and incompatible or ambiguous scope', async () => {
  let state = setup(); state.source.country.isSupported = false; assert.equal((await state.repository.list(base)).status, 'unsupported_country');
  state = setup(); state.source.sport.isActive = false; assert.equal((await state.repository.list(base)).status, 'inactive_sport');
  state = setup(); state.source.available = false; assert.equal((await state.repository.list(base)).status, 'unavailable_organization');
  state = setup(); state.source.disciplines = [{ id: ids.discipline, sportId: ids.sport, isActive: true }, { id: id('9'), sportId: ids.sport, isActive: true }]; assert.equal((await state.repository.list(base)).status, 'invalid_scope');
});
test('returns empty, direct unscoped levels, and linked-only levels for scoped competitions', async () => {
  let state = setup(); assert.deepEqual(await state.repository.list(base), { status: 'ok', organizationId: ids.organization, options: [] });
  state = setup(); state.source.direct = [level()]; let result = await state.repository.list(base); assert.equal(result.status === 'ok' && result.options[0]?.kind, 'competition_level'); assert.equal(state.source.calls.direct, 1); assert.equal(state.source.calls.linked, 0);
  state = setup(); state.source.batch = { options: [competition()], linkedLevelIds: [ids.level], overflow: false }; state.source.linked = [level()];
  result = await state.repository.list({ ...base, disciplineId: ids.discipline, variantId: ids.variant }); assert.equal(state.source.calls.direct, 0); assert.equal(state.source.calls.linked, 1); assert.equal(result.status === 'ok' && result.options.length, 2);
});
test('deduplicates kind/id and orders kind then native officialName then id while preserving level fields', async () => {
  const state = setup(); const other = competition({ id: id('9'), officialName: 'E.I.F.A.' }); state.source.direct = [level(), level()]; state.source.batch.options = [competition(), other, competition()];
  const result = await state.repository.list(base); assert.equal(result.status, 'ok');
  assert.deepEqual(result.status === 'ok' && result.options.map((item) => `${item.kind}:${item.officialName}`), ['competition:Coppa Nazionale', 'competition:E.I.F.A.', 'competition_level:Élite']);
  assert.equal(result.status === 'ok' && result.options[2]?.kind === 'competition_level' && result.options[2].displayOrder, 4);
  assert.equal(result.status === 'ok' && result.options[0]?.kind === 'competition' && result.options[0].competitionType, null);
});
test('fails closed on competition, level, linked-id or union overflow', async () => {
  let state = setup(); state.source.batch.overflow = true; assert.equal((await state.repository.list(base)).status, 'overflow');
  state = setup(); state.source.direct = [level(), level({ id: id('9') })]; assert.equal((await state.repository.list({ ...base, limit: 1 })).status, 'overflow');
  state = setup(); state.source.direct = [level()]; state.source.batch.options = [competition()]; assert.equal((await state.repository.list({ ...base, limit: 1 })).status, 'overflow');
  state = setup(); state.source.batch.linkedLevelIds = [ids.level, id('9')]; assert.equal((await state.repository.list({ ...base, disciplineId: ids.discipline, variantId: ids.variant, limit: 1 })).status, 'overflow');
});

test('E.I.F.A. is Football-only, FIP is Basket-only, and C8 options require their exact variant', async () => {
  const basket = id('a'); const otherVariant = id('b'); const state = setup();
  state.source.batchesBySport.set(ids.sport, { options: [competition({ officialName: 'E.I.F.A.' })], linkedLevelIds: [], overflow: false });
  state.source.batchesBySport.set(basket, { options: [competition({ id: id('9'), sportId: basket, officialName: 'Federazione Italiana Pallacanestro', disciplineId: null, variantId: null })], linkedLevelIds: [], overflow: false });
  let result = await state.repository.list({ ...base, disciplineId: ids.discipline, variantId: ids.variant });
  assert.deepEqual(result.status === 'ok' && result.options.map((item) => item.officialName), ['E.I.F.A.']);
  state.source.sport = { id: basket, isActive: true }; result = await state.repository.list({ ...base, sportId: basket });
  assert.deepEqual(result.status === 'ok' && result.options.map((item) => item.officialName), ['Federazione Italiana Pallacanestro']);
  state.source.sport = { id: ids.sport, isActive: true };
  state.source.batchesBySport.set(ids.sport, { options: [], linkedLevelIds: [], overflow: false });
  result = await state.repository.list({ ...base, disciplineId: ids.discipline, variantId: otherVariant });
  assert.deepEqual(result.status === 'ok' && result.options, []);
  const lastScope = state.source.calls.competitionScopes.at(-1)!;
  assert.deepEqual({ sportId: lastScope.sportId, disciplineId: lastScope.disciplineId, variantId: lastScope.variantId },
    { sportId: ids.sport, disciplineId: ids.discipline, variantId: otherVariant });
});
test('domain identities remain structural: E.I.F.A./FIP/C8 are datasource scoped and ELITE is only a name', async () => {
  const state = setup(); state.source.batch.options = [competition({ officialName: 'Serie A d’ELITE “Lorenzo Cesari”' })];
  const result = await state.repository.list(base); assert.equal(result.status === 'ok' && result.options[0]?.kind, 'competition'); assert.equal(result.status === 'ok' && result.options[0]?.id, ids.competition);
  assert.equal(JSON.stringify(result).includes('league'), false); assert.equal(JSON.stringify(result).includes('tournament'), false);
});
