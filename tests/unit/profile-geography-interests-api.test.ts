import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync('app/api/profile-geography/interests/route.ts', 'utf8');
const form = readFileSync('components/profiles/GeographicInterestsForm.tsx', 'utf8');
const settings = readFileSync('app/settings/page.tsx', 'utf8');

test('geography interests endpoint is owner-scoped and reads all three B6 concepts separately', () => {
  assert.match(source, /\.eq\(['"]user_id['"], userId\)\.maybeSingle\(\)/);
  assert.match(source, /profile_country_interests/);
  assert.match(source, /profile_geo_area_interests/);
  assert.match(source, /open_to_relocation/);
});

test('each PATCH performs exactly one narrow operation', () => {
  assert.match(source, /operations\.length !== 1 \|\| Object\.keys\(body\)\.length !== 1/);
  assert.match(source, /openToRelocation must be boolean/);
  assert.match(source, /Invalid country interest/);
  assert.match(source, /Invalid geo-area interest/);
});

test('canonical interests accept only active supported catalog entries', () => {
  assert.match(source, /countries['"]\)\.select\(['"]id['"]\).*\.eq\(['"]is_supported['"], true\)\.eq\(['"]is_active['"], true\)/s);
  assert.match(source, /geo_areas['"]\).*\.eq\(['"]is_active['"], true\).*\.eq\(['"]country\.is_supported['"], true\).*\.eq\(['"]country\.is_active['"], true\)/s);
});

test('B6 writes never mutate residence, legacy interests, or organization location', () => {
  assert.doesNotMatch(source, /residence_country_id|residence_geo_area_id|interest_country|interest_region|interest_province|interest_city|organization_location/);
  assert.doesNotMatch(source, /\.from\(['"]profiles['"]\)\.(?:update|upsert|delete|insert)/);
});

test('settings integrates the canonical B6 UI through the narrow endpoint', () => {
  assert.match(settings, /<GeographicInterestsForm \/>/);
  assert.match(form, /CanonicalGeographySelector/);
  assert.match(form, /fetch\(['"]\/api\/profile-geography\/interests['"]/);
  assert.match(form, /countryInterest: \{ countryId, selected: true \}/);
  assert.match(form, /geoAreaInterest: \{ geoAreaId, selected: true \}/);
  assert.match(form, /openToRelocation: event\.target\.checked/);
});

test('B6 UI copy keeps interests, relocation, residence and public headquarters distinct', () => {
  assert.match(form, /geoInterests\.help/);
  assert.match(form, /geoInterests\.relocationHelp/);
  assert.doesNotMatch(form, /interest_country|interest_region|interest_province|interest_city/);
});
