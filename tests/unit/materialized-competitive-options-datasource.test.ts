import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseMaterializedCompetitiveOptionDataSource } from '../../lib/taxonomy/materializedCompetitiveOptions.server';

type Call = { table: string; method: string; args: unknown[] };
class Query {
  constructor(private table: string, private calls: Call[], private data: unknown[]) {}
  private call(method: string, ...args: unknown[]) { this.calls.push({ table: this.table, method, args }); return this; }
  select(...a: unknown[]) { return this.call('select', ...a); } eq(...a: unknown[]) { return this.call('eq', ...a); }
  is(...a: unknown[]) { return this.call('is', ...a); } order(...a: unknown[]) { return this.call('order', ...a); }
  limit(...a: unknown[]) { return this.call('limit', ...a); }
  then(resolve: (result: {data:unknown[];error:null}) => unknown) { return Promise.resolve({ data: this.data, error: null }).then(resolve); }
}
const setup = (data: unknown[] = []) => { const calls: Call[] = []; const client = { from: (table: string) => new Query(table, calls, data) } as unknown as SupabaseClient; return { calls, source: new SupabaseMaterializedCompetitiveOptionDataSource(client) }; };

test('category query uses only the category table and exact structural scope', async () => {
  const { calls, source } = setup([{ id: 'category', code: 'c8_serie_a', canonical_name: 'Serie A' }]);
  assert.deepEqual(await source.listCategories({ countryId: 'it', sportId: 'football', organizationId: 'c8', disciplineId: 'association', variantId: 'eight', fetchLimit: 201 }), [
    { kind: 'organization_category', id: 'category', code: 'c8_serie_a', officialName: 'Serie A' },
  ]);
  assert.deepEqual(new Set(calls.map((call) => call.table)), new Set(['sports_organization_categories']));
  for (const [field, value] of [['organization_id', 'c8'], ['country_id', 'it'], ['sport_id', 'football'], ['discipline_id', 'association'], ['variant_id', 'eight'], ['is_active', true]] as const) {
    assert.equal(calls.some((call) => call.method === 'eq' && call.args[0] === field && call.args[1] === value), true, field);
  }
  assert.deepEqual(calls.filter((call) => call.method === 'order').map((call) => call.args[0]), ['display_order', 'canonical_name', 'id']);
  assert.equal(calls.some((call) => call.method === 'limit' && call.args[0] === 201), true);
});

test('category query requires null discipline and variant for an unscoped request', async () => {
  const { calls, source } = setup();
  await source.listCategories({ countryId: 'it', sportId: 'football', organizationId: 'org', disciplineId: null, variantId: null, fetchLimit: 2 });
  assert.equal(calls.some((call) => call.method === 'is' && call.args[0] === 'discipline_id' && call.args[1] === null), true);
  assert.equal(calls.some((call) => call.method === 'is' && call.args[0] === 'variant_id' && call.args[1] === null), true);
});
