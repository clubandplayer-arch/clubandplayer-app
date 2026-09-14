import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import { SupabaseMaterializedSportsOrganizationDataSource } from '../../lib/taxonomy/materializedSportsOrganizations.server';

type Result = { data: unknown[] | null; error: null };
type Call = { table: string; method: string; args: unknown[] };

class Query {
  constructor(private table: string, private calls: Call[], private results: Record<string, Result>) {}
  private call(method: string, ...args: unknown[]) { this.calls.push({ table: this.table, method, args }); return this; }
  select(...args: unknown[]) { return this.call('select', ...args); }
  eq(...args: unknown[]) { return this.call('eq', ...args); }
  neq(...args: unknown[]) { return this.call('neq', ...args); }
  is(...args: unknown[]) { return this.call('is', ...args); }
  in(...args: unknown[]) { return this.call('in', ...args); }
  or(...args: unknown[]) { return this.call('or', ...args); }
  order(...args: unknown[]) { return this.call('order', ...args); }
  limit(...args: unknown[]) { return this.call('limit', ...args); }
  maybeSingle() { this.call('maybeSingle'); return Promise.resolve(this.results[this.table] ?? { data: null, error: null }); }
  then(resolve: (result: Result) => unknown) { return Promise.resolve(this.results[this.table] ?? { data: [], error: null }).then(resolve); }
}

const setup = (results: Record<string, Result>) => {
  const calls: Call[] = [];
  const client = { from: (table: string) => new Query(table, calls, results) } as unknown as SupabaseClient;
  return { calls, source: new SupabaseMaterializedSportsOrganizationDataSource(client) };
};
const has = (calls: Call[], table: string, method: string, first: unknown) =>
  calls.some((call) => call.table === table && call.method === method && call.args[0] === first);

test('category query uses only exact country, sport, discipline and variant scope', async () => {
  const { source, calls } = setup({ sports_organization_categories: { data: [{ organization_id: 'o1' }], error: null } });
  assert.deepEqual(await source.listCategoryOrganizationIds({
    countryId: 'country', sportId: 'sport', disciplineId: 'd1', variantId: 'v1',
  }), { organizationIds: ['o1'], overflow: false });
  assert.deepEqual(new Set(calls.map((call) => call.table)), new Set(['sports_organization_categories']));
  for (const [field, value] of [['country_id', 'country'], ['sport_id', 'sport'], ['discipline_id', 'd1'], ['variant_id', 'v1'], ['is_active', true]] as const)
    assert.equal(calls.some((call) => call.method === 'eq' && call.args[0] === field && call.args[1] === value), true, field);
  assert.equal(calls.some((call) => call.method === 'limit' && call.args[0] === 201), true);
});

test('category query enforces null discipline and variant for an unscoped request', async () => {
  const { source, calls } = setup({ sports_organization_categories: { data: [], error: null } });
  await source.listCategoryOrganizationIds({ countryId: 'country', sportId: 'sport', disciplineId: null, variantId: null });
  assert.equal(calls.some((call) => call.method === 'is' && call.args[0] === 'discipline_id' && call.args[1] === null), true);
  assert.equal(calls.some((call) => call.method === 'is' && call.args[0] === 'variant_id' && call.args[1] === null), true);
});

test('category scan fails closed at its hard row cap before de-duplication', async () => {
  const rows = Array.from({ length: 201 }, () => ({ organization_id: 'first-organization' }));
  const { source } = setup({ sports_organization_categories: { data: rows, error: null } });
  assert.deepEqual(await source.listCategoryOrganizationIds({
    countryId: 'country', sportId: 'sport', disciplineId: 'discipline', variantId: 'variant',
  }), { organizationIds: [], overflow: true });
});

test('organization loading applies activity and validity and returns primary plus every linked country', async () => {
  const { source, calls } = setup({
    sports_organizations: { data: [{ id: 'o1', code: 'lnd', canonical_name: 'LND', organization_type: 'league', parent_id: null,
      primary_country_id: 'it', valid_from: null, valid_to: null }], error: null },
    sports_organization_countries: { data: [{ organization_id: 'o1', country_id: 'fr' }, { organization_id: 'o1', country_id: 'it' }], error: null },
  });
  const organizations = await source.listActiveOrganizations(['o1'], 'it', '2026-09-12');
  assert.deepEqual(organizations[0]?.countryIds, ['fr', 'it']);
  assert.equal(has(calls, 'sports_organizations', 'eq', 'is_active'), true);
  assert.equal(calls.some((call) => call.method === 'or' && String(call.args[0]).includes('valid_from.lte.2026-09-12')), true);
  assert.equal(calls.some((call) => call.method === 'or' && String(call.args[0]).includes('valid_to.gte.2026-09-12')), true);
  assert.equal(has(calls, 'sports_organization_countries', 'eq', 'organization_id'), true);
});

test('taxonomy scope discovery is active, ordered and bounded', async () => {
  const { source, calls } = setup({ sport_disciplines: { data: [], error: null }, sport_variants: { data: [], error: null } });
  await source.listActiveDisciplines('sport', 2); await source.listActiveVariants('discipline', 2);
  assert.equal(has(calls, 'sport_disciplines', 'eq', 'sport_id'), true);
  assert.equal(has(calls, 'sport_disciplines', 'eq', 'is_independently_selectable'), true);
  assert.equal(has(calls, 'sport_variants', 'eq', 'discipline_id'), true);
  assert.equal(calls.filter((call) => call.method === 'eq' && call.args[0] === 'is_active').length, 2);
  assert.equal(calls.filter((call) => call.method === 'limit' && call.args[0] === 2).length, 2);
});
