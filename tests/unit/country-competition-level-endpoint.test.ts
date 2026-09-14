import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { createCompetitionLevelsGetHandler } from '../../app/api/taxonomy/competition-levels/route';
import {
  CountryCompetitionLevelRepository,
  type CompetitionLevelDataSource,
  CompetitionLevelOption,
  CompetitionLevelQuery,
  CompetitionLevelQueryResult,
} from '../../lib/taxonomy/countryCompetitionLevels.server';

const ids = {
  country: '11111111-1111-4111-8111-111111111111',
  sport: '33333333-3333-4333-8333-333333333333',
  organization: '44444444-4444-4444-8444-444444444444',
  level: '55555555-5555-4555-8555-555555555555',
};

const level: CompetitionLevelOption = {
  id: ids.level,
  code: 'promotion',
  officialName: 'Promozione',
  levelRank: 6,
  organizationId: ids.organization,
  countryId: ids.country,
  validFrom: '2026-07-01',
  validTo: '2027-06-30',
};

class FakeReader {
  calls: CompetitionLevelQuery[] = [];
  result: CompetitionLevelQueryResult = { status: 'ok', options: [level] };
  error: Error | null = null;

  async list(query: CompetitionLevelQuery): Promise<CompetitionLevelQueryResult> {
    this.calls.push(query);
    if (this.error) throw this.error;
    return this.result;
  }
}

const request = (query = '') => new Request(`http://localhost/api/taxonomy/competition-levels${query}`);

const setup = () => {
  const reader = new FakeReader();
  let factoryCalls = 0;
  const handler = createCompetitionLevelsGetHandler(async () => {
    factoryCalls += 1;
    return reader;
  });
  return { handler, reader, factoryCalls: () => factoryCalls };
};

const setupWithRepository = () => {
  const source: CompetitionLevelDataSource = {
    getCountry: async (id) => ({ id, isActive: true, isSupported: true }),
    getSport: async (id) => ({ id, isActive: true }),
    getOrganization: async (id) => ({ id, isActive: true, primaryCountryId: ids.country, countryIds: [] }),
    listActiveLevels: async () => [level],
  };
  const repository = new CountryCompetitionLevelRepository(source);
  return { handler: createCompetitionLevelsGetHandler(async () => repository) };
};

test('requires countryId and sportId and preserves no-store on validation errors', async () => {
  for (const query of ['', `?countryId=${ids.country}`, `?sportId=${ids.sport}`]) {
    const { handler } = setupWithRepository();
    const response = await handler(request(query));
    assert.equal(response.status, 400);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await response.json()).code, 'INVALID_PAYLOAD');
  }
});

test('rejects invalid UUIDs for country, sport and organization', async () => {
  const invalidQueries = [
    `?countryId=IT&sportId=${ids.sport}`,
    `?countryId=${ids.country}&sportId=football`,
    `?countryId=${ids.country}&sportId=${ids.sport}&organizationId=FIGC`,
    `?countryId=${ids.country}&sportId=${ids.sport}&organizationId=`,
  ];
  for (const query of invalidQueries) {
    const { handler } = setupWithRepository();
    assert.equal((await handler(request(query))).status, 400);
  }
});

test('rejects invalid dates', async () => {
  for (const asOf of ['2026-02-30', '12-09-2026', '']) {
    const { handler } = setupWithRepository();
    assert.equal((await handler(request(`?countryId=${ids.country}&sportId=${ids.sport}&asOf=${asOf}`))).status, 400);
  }
});

test('accepts only integer limits from 1 through 200', async () => {
  for (const limit of ['0', '201', '1.5', 'many', '']) {
    const { handler } = setupWithRepository();
    assert.equal((await handler(request(`?countryId=${ids.country}&sportId=${ids.sport}&limit=${limit}`))).status, 400);
  }

  for (const limit of ['1', '200']) {
    const { handler, reader } = setup();
    assert.equal((await handler(request(`?countryId=${ids.country}&sportId=${ids.sport}&limit=${limit}`))).status, 200);
    assert.equal(reader.calls[0]?.limit, Number(limit));
  }
});

test('passes the complete query to the read-only repository and preserves officialName', async () => {
  const { handler, reader } = setup();
  const response = await handler(request(
    `?countryId=${ids.country}&sportId=${ids.sport}&organizationId=${ids.organization}&asOf=2026-09-12&limit=20`,
  ));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(reader.calls, [{
    countryId: ids.country,
    sportId: ids.sport,
    organizationId: ids.organization,
    asOf: '2026-09-12',
    limit: 20,
  }]);
  assert.deepEqual(await response.json(), { ok: true, options: [level] });
});

test('returns an empty options array as a successful catalogue result', async () => {
  const { handler, reader } = setup();
  reader.result = { status: 'ok', options: [] };
  const response = await handler(request(`?countryId=${ids.country}&sportId=${ids.sport}`));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, options: [] });
});

test('maps unavailable catalogue parents to sanitized not-found responses', async () => {
  const statuses = ['unsupported_country', 'inactive_sport', 'organization_not_in_country'] as const;
  for (const status of statuses) {
    const { handler, reader } = setup();
    reader.result = { status, options: [] };
    const response = await handler(request(`?countryId=${ids.country}&sportId=${ids.sport}`));
    assert.equal(response.status, 404);
    const body = await response.json();
    assert.equal(body.code, 'NOT_FOUND');
    assert.equal(JSON.stringify(body).includes('database'), false);
  }
});

test('fails closed with conflict when the bounded result overflows', async () => {
  const { handler, reader } = setup();
  reader.result = { status: 'overflow', options: [] };
  const response = await handler(request(`?countryId=${ids.country}&sportId=${ids.sport}&limit=1`));
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    ok: false,
    code: 'INVALID_PAYLOAD',
    message: 'Il catalogo supera il limite richiesto.',
  });
});

test('sanitizes data-source errors without exposing their details', async () => {
  const { handler, reader } = setup();
  reader.error = new Error('postgres secret relation and connection details');
  const response = await handler(request(`?countryId=${ids.country}&sportId=${ids.sport}`));
  assert.equal(response.status, 500);
  const rawBody = await response.text();
  assert.equal(rawBody.includes('postgres secret'), false);
  assert.deepEqual(JSON.parse(rawBody), {
    ok: false,
    code: 'DB_ERROR',
    message: 'Impossibile caricare i livelli competitivi.',
  });
});

test('route is GET-only, uses the anon/session server client and contains no mutation surface', () => {
  const source = readFileSync(new URL('../../app/api/taxonomy/competition-levels/route.ts', import.meta.url), 'utf8');
  assert.match(source, /export const GET =/);
  assert.match(source, /getSupabaseServerClient\(\)/);
  assert.match(source, /CountryCompetitionLevelRepository/);
  assert.match(source, /SupabaseCompetitionLevelDataSource/);
  assert.match(source, /fetchCache = 'force-no-store'/);
  assert.doesNotMatch(source, /service.?role|SUPABASE_SERVICE|\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/i);
  assert.doesNotMatch(source, /export (?:async function|const) (?:POST|PUT|PATCH|DELETE)/);
});
