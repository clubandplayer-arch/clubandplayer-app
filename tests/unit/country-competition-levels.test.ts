import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CountryCompetitionLevelRepository,
  type CompetitionLevelDataSource,
  type CompetitionLevelOption,
} from '../../lib/taxonomy/countryCompetitionLevels.server';

const ids = {
  country: '11111111-1111-4111-8111-111111111111',
  otherCountry: '22222222-2222-4222-8222-222222222222',
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

class FakeSource implements CompetitionLevelDataSource {
  calls: string[] = [];
  country = { id: ids.country, isActive: true, isSupported: true };
  sport = { id: ids.sport, isActive: true };
  organization = { id: ids.organization, isActive: true, primaryCountryId: ids.country, countryIds: [] as string[] };
  levels = [level];

  async getCountry(id: string) {
    this.calls.push(`country:${id}`);
    return id === this.country.id ? this.country : null;
  }
  async getSport(id: string) {
    this.calls.push(`sport:${id}`);
    return id === this.sport.id ? this.sport : null;
  }
  async getOrganization(id: string) {
    this.calls.push(`organization:${id}`);
    return id === this.organization.id ? this.organization : null;
  }
  async listActiveLevels(query: Parameters<CompetitionLevelDataSource['listActiveLevels']>[0]) {
    this.calls.push(`levels:${query.countryId}:${query.sportId}:${query.organizationId}:${query.asOf}:${query.limit}`);
    return this.levels;
  }
}

test('returns official names without accepting a locale or translating the catalogue', async () => {
  const source = new FakeSource();
  const repository = new CountryCompetitionLevelRepository(source);
  const result = await repository.list({
    countryId: ids.country,
    sportId: ids.sport,
    organizationId: ids.organization,
    asOf: '2026-09-10',
    limit: 10,
  });
  assert.deepEqual(result, { status: 'ok', options: [level] });
  assert.deepEqual(source.calls, [
    `country:${ids.country}`,
    `sport:${ids.sport}`,
    `organization:${ids.organization}`,
    `levels:${ids.country}:${ids.sport}:${ids.organization}:2026-09-10:11`,
  ]);
});

test('rejects malformed input before touching the data source', async () => {
  const source = new FakeSource();
  const repository = new CountryCompetitionLevelRepository(source);
  assert.equal((await repository.list({ countryId: 'IT', sportId: ids.sport })).status, 'invalid_query');
  assert.equal((await repository.list({ countryId: ids.country, sportId: ids.sport, asOf: '2026-02-30' })).status, 'invalid_query');
  assert.equal((await repository.list({ countryId: ids.country, sportId: ids.sport, limit: 201 })).status, 'invalid_query');
  assert.deepEqual(source.calls, []);
});

test('fails closed for unsupported country and inactive sport', async () => {
  const source = new FakeSource();
  const repository = new CountryCompetitionLevelRepository(source);
  source.country.isSupported = false;
  assert.equal((await repository.list({ countryId: ids.country, sportId: ids.sport })).status, 'unsupported_country');
  assert.equal(source.calls.some((call) => call.startsWith('sport:')), false);

  source.calls = [];
  source.country.isSupported = true;
  source.sport.isActive = false;
  assert.equal((await repository.list({ countryId: ids.country, sportId: ids.sport })).status, 'inactive_sport');
  assert.equal(source.calls.some((call) => call.startsWith('levels:')), false);
});

test('requires an active organization assigned to the selected country', async () => {
  const source = new FakeSource();
  const repository = new CountryCompetitionLevelRepository(source);
  source.organization.primaryCountryId = ids.otherCountry;
  assert.equal((await repository.list({
    countryId: ids.country,
    sportId: ids.sport,
    organizationId: ids.organization,
  })).status, 'organization_not_in_country');
  assert.equal(source.calls.some((call) => call.startsWith('levels:')), false);

  source.calls = [];
  source.organization.countryIds = [ids.country];
  assert.equal((await repository.list({
    countryId: ids.country,
    sportId: ids.sport,
    organizationId: ids.organization,
    asOf: '2026-09-10',
  })).status, 'ok');
});

test('detects result overflow instead of returning a truncated catalogue', async () => {
  const source = new FakeSource();
  source.levels = Array.from({ length: 3 }, (_, index) => ({ ...level, id: `${index}` }));
  const repository = new CountryCompetitionLevelRepository(source);
  assert.deepEqual(await repository.list({
    countryId: ids.country,
    sportId: ids.sport,
    asOf: '2026-09-10',
    limit: 2,
  }), { status: 'overflow', options: [] });
});
