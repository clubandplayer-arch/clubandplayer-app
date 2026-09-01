import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const route = readFileSync('app/api/search/route.ts', 'utf8');
const adapter = readFileSync('lib/search/canonicalGeography.server.ts', 'utf8');

test('Search API parses canonical aliases and validates them before running result/count queries', () => {
  assert.match(route, /parseSearchGeography\(url\.searchParams\)/);
  assert.match(route, /resolveCanonicalSearchGeography/);
  assert.match(route, /new SupabaseSearchGeographyCatalog\(supabase\)/);
  assert.match(route, /SearchGeographyContractError/);
});

test('Opportunity result and count queries share direct canonical country and descendant filters', () => {
  assert.match(route, /canonicalLocation\?: 'profile' \| 'opportunity'/);
  assert.match(route, /nextQuery = nextQuery\.eq\('country_id', filters\.canonical\.countryId\)/);
  assert.match(route, /nextQuery = nextQuery\.in\('geo_area_id', filters\.canonical\.areaIds\)/);
  assert.match(route, /canonicalLocation: 'opportunity'/);
});

test('profile and post-author queries use canonical labels projected onto legacy public location fields', () => {
  assert.match(route, /applyCanonicalProfileFilters/);
  assert.match(route, /getCountryName\(scope\.countryIso2\)/);
  assert.match(route, /country\.ilike\.\$\{toIlikeExact\(value\)\}/);
  assert.match(route, /canonicalAreaLegacyField\(scope\.geoAreaType\)/);
  assert.match(route, /hasProfileFilters[\s\S]*filters\.canonical/);
});

test('catalog adapter is read-only, country-scoped and bounded for descendants', () => {
  assert.match(adapter, /\.from\('countries'\)[\s\S]*\.select\('id,iso2,official_name,is_active,is_supported'\)/);
  assert.match(adapter, /\.from\('geo_areas'\)/);
  assert.match(adapter, /\.eq\('country_id', countryId\)/);
  assert.match(adapter, /depth < 16/);
  assert.doesNotMatch(adapter, /\.insert\(|\.update\(|\.upsert\(|\.delete\(|getSupabaseAdminClient|service_role/);
});

test('Search response exposes selected canonical IDs without leaking expanded internal scope', () => {
  assert.match(route, /countryId: filters\.canonical\?\.countryId \?\? null/);
  assert.match(route, /geoAreaId: filters\.canonical\?\.geoAreaId \?\? null/);
  assert.doesNotMatch(route, /areaIds: filters\.canonical/);
});
