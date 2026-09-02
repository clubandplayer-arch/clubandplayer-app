import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const client = readFileSync('app/(dashboard)/opportunities/OpportunitiesClient.tsx', 'utf8');
const route = readFileSync('app/api/opportunities/route.ts', 'utf8');
const geography = readFileSync('lib/opportunities/geography.ts', 'utf8');

test('opportunity filters use canonical selector and URL-stable canonical IDs', () => {
  assert.match(client, /<CanonicalGeographySelector/);
  assert.match(client, /countryId=\{filterCountryId\}/);
  assert.match(client, /geoAreaId=\{filterGeoAreaId\}/);
  assert.match(client, /p\.set\('countryId', countryId\)/);
  assert.match(client, /p\.set\('geoAreaId', geoAreaId\)/);
  assert.doesNotMatch(client, /useGeo|COUNTRIES\.map/);
});

test('API gives canonical filters precedence while retaining legacy fallback', () => {
  assert.match(route, /if \(countryId \|\| geoAreaId\)/);
  assert.match(route, /query = query\.eq\('country_id', countryId\)/);
  assert.match(route, /query = query\.in\('geo_area_id', areaScope\)/);
  assert.match(route, /else \{[\s\S]*query\.eq\('country', country\)/);
});

test('area filter validates canonical geography and includes active descendants', () => {
  assert.match(geography, /getOpportunityGeoAreaFilterScope/);
  assert.match(geography, /await loadCountry\(client, canonicalCountryId, true\)/);
  assert.match(geography, /await loadAreaChain\(client, selectedAreaId, canonicalCountryId, true\)/);
  assert.match(geography, /\.in\('parent_id', parents\)/);
  assert.match(geography, /new Set<string>\(\[selectedAreaId\]\)/);
});
