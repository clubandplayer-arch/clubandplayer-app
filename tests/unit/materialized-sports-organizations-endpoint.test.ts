import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { createSportsOrganizationsGetHandler } from '../../app/api/taxonomy/sports-organizations/route';
import type { MaterializedSportsOrganizationQuery, MaterializedSportsOrganizationResult } from '../../lib/taxonomy/materializedSportsOrganizations.server';

const countryId = '11111111-1111-4111-8111-111111111111';
const sportId = '33333333-3333-4333-8333-333333333333';
const disciplineId = '44444444-4444-4444-8444-444444444444';
const variantId = '55555555-5555-4555-8555-555555555555';
class Reader {
  calls: MaterializedSportsOrganizationQuery[] = [];
  result: MaterializedSportsOrganizationResult = { status: 'ok', derivation: 'materialized_options', organizations: [] };
  error: Error | null = null;
  async list(query: MaterializedSportsOrganizationQuery) { this.calls.push(query); if (this.error) throw this.error; return this.result; }
}
const setup = () => { const reader = new Reader(); return { reader, handler: createSportsOrganizationsGetHandler(async () => reader) }; };
const request = (query = '') => new Request(`http://localhost/api/taxonomy/sports-organizations${query}`);

test('requires country and sport and rejects empty optional parameters', async () => {
  for (const query of ['', `?countryId=${countryId}`, `?sportId=${sportId}`, `?countryId=${countryId}&sportId=${sportId}&limit=`]) {
    const { handler } = setup(); assert.equal((await handler(request(query))).status, 400);
  }
});

test('forwards all query parameters and returns derivation with an empty result', async () => {
  const { handler, reader } = setup();
  const response = await handler(request(`?countryId=${countryId}&sportId=${sportId}&asOf=2026-09-12&limit=200`));
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(reader.calls, [{ countryId, sportId, asOf: '2026-09-12', limit: 200 }]);
  assert.deepEqual(await response.json(), { ok: true, derivation: 'materialized_options', organizations: [] });
});

test('forwards discipline and variant scope without deriving it from labels', async () => {
  const { handler, reader } = setup();
  const response = await handler(request(`?countryId=${countryId}&sportId=${sportId}&disciplineId=${disciplineId}&variantId=${variantId}`));
  assert.equal(response.status, 200);
  assert.deepEqual(reader.calls, [{ countryId, sportId, disciplineId, variantId }]);
});

test('returns one or many organizations with official names unchanged', async () => {
  const organizations = [
    { id: 'one', code: 'eifa', officialName: 'E.I.F.A.', organizationType: 'league', parentId: null,
      primaryCountryId: countryId, countryIds: [countryId], validFrom: null, validTo: null },
    { id: 'two', code: 'lnd', officialName: 'Lega Nazionale Dilettanti', organizationType: 'league', parentId: null,
      primaryCountryId: countryId, countryIds: [countryId], validFrom: null, validTo: null },
  ];
  for (const expected of [organizations.slice(0, 1), organizations]) {
    const state = setup(); state.reader.result = { status: 'ok', derivation: 'materialized_options', organizations: expected };
    const response = await state.handler(request(`?countryId=${countryId}&sportId=${sportId}`));
    assert.deepEqual((await response.json()).organizations, expected);
  }
});

test('passes malformed UUID, date, variant-only and numeric limit edge cases to fail-closed validation', async () => {
  const queries = [
    `?countryId=IT&sportId=${sportId}`, `?countryId=${countryId}&sportId=football`,
    `?countryId=${countryId}&sportId=${sportId}&disciplineId=nope`,
    `?countryId=${countryId}&sportId=${sportId}&variantId=${variantId}`,
    `?countryId=${countryId}&sportId=${sportId}&asOf=2026-02-30`,
    ...['0', '201', '1.5', 'many'].map((limit) => `?countryId=${countryId}&sportId=${sportId}&limit=${limit}`),
  ];
  for (const query of queries) {
    const state = setup(); state.reader.result = { status: 'invalid_query', organizations: [] };
    assert.equal((await state.handler(request(query))).status, 400);
  }
  for (const limit of ['1', '200']) {
    const state = setup(); await state.handler(request(`?countryId=${countryId}&sportId=${sportId}&limit=${limit}`));
    assert.equal(state.reader.calls[0]?.limit, Number(limit));
  }
});

test('maps invalid scope, unavailable parents and overflow to stable statuses', async () => {
  for (const [status, expected] of [['invalid_query', 400], ['invalid_scope', 400], ['unsupported_country', 404], ['inactive_sport', 404], ['overflow', 409]] as const) {
    const state = setup(); state.reader.result = { status, organizations: [] };
    const response = await state.handler(request(`?countryId=${countryId}&sportId=${sportId}`));
    assert.equal(response.status, expected); assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});

test('sanitizes datasource failures', async () => {
  const { handler, reader } = setup(); reader.error = new Error('secret postgres details');
  const response = await handler(request(`?countryId=${countryId}&sportId=${sportId}`));
  assert.equal(response.status, 500); const body = await response.text();
  assert.equal(body.includes('secret postgres'), false); assert.match(body, /Impossibile caricare le organizzazioni sportive/);
});

test('route is GET-only, no-store, anon/session and contains no mutation surface', () => {
  const route = readFileSync(new URL('../../app/api/taxonomy/sports-organizations/route.ts', import.meta.url), 'utf8');
  const repository = readFileSync(new URL('../../lib/taxonomy/materializedSportsOrganizations.server.ts', import.meta.url), 'utf8');
  assert.match(route, /export const GET =/); assert.match(route, /getSupabaseServerClient\(\)/); assert.match(route, /force-no-store/);
  assert.doesNotMatch(route + repository, /service.?role|SUPABASE_SERVICE|\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/i);
  assert.doesNotMatch(route, /export (?:async function|const) (?:POST|PUT|PATCH|DELETE)/);
});
