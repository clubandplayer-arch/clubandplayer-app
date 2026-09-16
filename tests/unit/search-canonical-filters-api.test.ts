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

test('Opportunity result and count queries share canonical country and bounded area projection filters', () => {
  assert.match(route, /canonicalLocation\?: 'profile' \| 'opportunity'/);
  assert.match(route, /nextQuery = nextQuery\.eq\('country_id', filters\.canonical\.countryId\)/);
  assert.match(route, /canonicalAreaLegacyField\(filters\.canonical\.geoAreaType\)/);
  assert.match(route, /canonicalLocation: 'opportunity'/);
  assert.match(route, /\{ expandDescendants: false \}/);
  assert.doesNotMatch(route, /\.in\('geo_area_id', filters\.canonical\.areaIds\)/);
});

test('profile and post-author queries use canonical labels projected onto legacy public location fields', () => {
  assert.match(route, /applyCanonicalProfileFilters/);
  assert.match(route, /getCountryName\(scope\.countryIso2\)/);
  assert.match(route, /country\.ilike\.\$\{toIlikeExact\(value\)\}/);
  assert.match(route, /canonicalAreaLegacyField\(scope\.geoAreaType\)/);
  assert.match(route, /hasProfileFilters[\s\S]*filters\.canonical/);
});

test('Club search filters and result countries use canonical profile preferences instead of stale legacy fields', () => {
  assert.match(route, /loadClubIdsForCanonicalScope/);
  assert.match(route, /\.from\('profile_preferences'\)[\s\S]*\.not\('residence_country_id', 'is', null\)/);
  assert.match(route, /row\.residence_country_id === scope\.countryId/);
  assert.match(route, /matchingLegacyOnlyIds/);
  assert.match(route, /!canonicalProfileIds\.has\(id\)/);
  assert.match(route, /query = query\.in\('id', canonicalClubIds\)/);
  assert.match(route, /loadCanonicalClubCountries/);
  assert.match(route, /country: canonicalCountry/);
  assert.match(route, /filters\.canonical \? \{ \.\.\.filters, canonical: null \} : filters/);
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
