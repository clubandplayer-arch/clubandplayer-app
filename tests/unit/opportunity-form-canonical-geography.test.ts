import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const form = readFileSync('components/opportunities/OpportunityForm.tsx', 'utf8');

test('OpportunityForm uses the reusable canonical selector without an implicit Italy default', () => {
  assert.match(form, /import CanonicalGeographySelector/);
  assert.match(form, /<CanonicalGeographySelector/);
  assert.match(form, /countryId=\{countryId\}/);
  assert.match(form, /geoAreaId=\{geoAreaId\}/);
  assert.doesNotMatch(form, /\?\.code \?\? 'IT'|countryCode|COUNTRIES|location_children|from\('regions'\)|from\('provinces'\)|from\('municipalities'\)/);
});

test('new and untouched legacy Opportunities omit geography while explicit changes send canonical IDs', () => {
  assert.match(form, /const \[geographyTouched, setGeographyTouched\] = useState\(false\)/);
  assert.match(
    form,
    /if \(geographyTouched\) \{\s*payload\.country_id = countryId;\s*payload\.geo_area_id = geoAreaId;\s*\}/,
  );
  assert.doesNotMatch(form, /payload[\s\S]{0,200}country:\s*effectiveCountry|region:\s*region|province:\s*countryCode|city:\s*\(city/);
});

test('legacy edit is preserved until replacement and exposes an explicit reset', () => {
  assert.match(form, /const hasLegacyOnlyLocation = !initialCountryId && Boolean\(legacyLocation\)/);
  assert.match(form, /hasLegacyOnlyLocation && !geographyTouched/);
  assert.match(
    form,
    /setCountryId\(null\);\s*setGeoAreaId\(null\);\s*setGeographyTouched\(true\);/,
  );
});

test('canonical edit initializes IDs from flat and resolved API shapes', () => {
  assert.match(form, /initial\?\.country_id \?\? initial\?\.geography\?\.countryId \?\? null/);
  assert.match(form, /initial\?\.geo_area_id \?\? initial\?\.geography\?\.geoAreaId \?\? null/);
});

test('country and area interactions are controlled, optional and field-aware', () => {
  assert.match(form, /onCountryChange=\{\(nextCountryId\) =>/);
  assert.match(form, /if \(!nextCountryId\) setGeoAreaId\(null\)/);
  assert.match(form, /onGeoAreaChange=\{\(nextGeoAreaId\) =>/);
  assert.match(form, /disabled=\{saving\}/);
  assert.doesNotMatch(form, /<CanonicalGeographySelector[\s\S]{0,500}required=\{true\}/);
});
