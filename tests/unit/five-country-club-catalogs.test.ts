import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20261216120000_five_country_club_catalogs.sql', 'utf8');
const createRoute = readFileSync('app/api/clubs/registrations/route.ts', 'utf8');
const updateRoute = readFileSync('app/api/clubs/registrations/[id]/route.ts', 'utf8');
const membershipApi = readFileSync('app/api/sports/organization-memberships/route.ts', 'utf8');

const categorySeed = migration
  .split('with seed(iso2,sport_key,org_code,code,name,ord) as (values', 2)[1]
  .split('), scope as (', 1)[0];
const categoryRows = [...categorySeed.matchAll(/\('([A-Z]{2})','([^']+)','([^']+)','([^']+)','((?:[^']|'')+)',(\d+)\)/g)]
  .map((match) => ({ country: match[1], sport: match[2], organization: match[3], code: match[4], name: match[5] }));

test('imports exactly the five closed section-5 catalogues', () => {
  const expected = { FR: 71, ES: 60, CH: 48, SI: 30, PL: 49 };
  for (const [country, count] of Object.entries(expected)) {
    assert.equal(categoryRows.filter((row) => row.country === country).length, count, country);
  }
  assert.equal(categoryRows.length, 258);
  assert.equal(new Set(categoryRows.map((row) => `${row.country}:${row.sport}:${row.organization}:${row.code}`)).size, 258);
});

test('preserves country isolation, youth scopes and reduced-football variants', () => {
  const expectations = {
    FR: { sports: 14, organizations: 11, youth: 2 }, ES: { sports: 13, organizations: 11, youth: 3 },
    CH: { sports: 9, organizations: 8, youth: 1 }, SI: { sports: 14, organizations: 12, youth: 2 },
    PL: { sports: 14, organizations: 12, youth: 2 },
  };
  for (const [country, expected] of Object.entries(expectations)) {
    const rows = categoryRows.filter((row) => row.country === country);
    assert.equal(new Set(rows.map((row) => row.sport)).size, expected.sports);
    assert.equal(new Set(rows.map((row) => row.organization)).size, expected.organizations);
    assert.equal(rows.filter((row) => row.code === 'giovanili').length, expected.youth);
  }
  assert.match(migration, /'six_a_side','6-a-side',6/);
  assert.match(migration, /'seven_a_side','7-a-side',7/);
  assert.ok(categoryRows.some((row) => row.country === 'FR' && row.sport === 'calcio_a_8'));
  assert.ok(categoryRows.some((row) => row.country === 'PL' && row.sport === 'calcio_a_6'));
  assert.ok(categoryRows.some((row) => row.country === 'CH' && row.sport === 'calcio_a_7'));
  assert.ok(categoryRows.some((row) => row.country === 'SI' && row.sport === 'calcio_a_7'));
  assert.ok(categoryRows.some((row) => row.country === 'CH' && row.sport === 'floorball'));
  assert.ok(!categoryRows.some((row) => ['sci', 'biathlon', 'tennis'].includes(row.sport)));
});

test('new choices are country scoped on reads and both server validation layers', () => {
  assert.match(membershipApi, /\.eq\('country_id', countryId\)/);
  assert.match(createRoute, /countryId:club\.countryId/);
  assert.match(updateRoute, /countryId/);
  assert.match(migration, /c\.country_id=coalesce\(pp\.residence_country_id,lcm\.country_id\)/);
  assert.match(migration, /tg_op='INSERT'/);
  assert.match(migration, /not coalesce\(old\.is_active,false\)/);
});

test('French replacement retires obsolete choices without deleting history', () => {
  assert.match(migration, /update public\.sports_organization_categories c set is_active=false/);
  assert.match(migration, /country\.iso2='FR'/);
  assert.doesNotMatch(migration, /delete from public\.sports_organization_categories/);
  for (const excluded of ['Arkema Première Ligue', 'Seconde Ligue', 'D1 Futsal', 'Marmara SpikeLigue', 'Top 14']) {
    assert.ok(!categoryRows.some((row) => row.country === 'FR' && row.name === excluded), excluded);
  }
});
