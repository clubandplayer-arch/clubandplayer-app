import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(path, 'utf8');

test('B7 launch-country regression matrix covers IT FR ES CH SI and PL', () => {
  const residenceTests = read('tests/unit/profile-residence-write-contract.test.ts');
  for (const iso2 of ['IT', 'FR', 'ES', 'CH', 'SI', 'PL']) assert.match(residenceTests, new RegExp(`['"]${iso2}['"]`));
  assert.match(residenceTests, /Switzerland supports both district depths/);
});

test('canonical-first and explicit Italy legacy residence fallback remain ordered', () => {
  const geography = read('lib/geo/profileGeography.ts');
  const canonical = geography.indexOf("source: 'canonical'");
  const italyLegacy = geography.indexOf("source: 'italy_legacy_mapping'");
  const legacyText = geography.indexOf("source: hasLegacyText(preservedLegacy) ? 'legacy_text' : 'none'");
  assert.ok(canonical >= 0 && italyLegacy > canonical && legacyText > italyLegacy);
  assert.doesNotMatch(geography.slice(geography.indexOf('const candidates'), geography.indexOf('return { source: hasLegacyText')), /interestRegionId|interestProvinceId|interestMunicipalityId/);
});

test('B5/B6 account-type matrix keeps organizations, people and mobility semantics separate', () => {
  const onboarding = read('app/api/onboarding/role/route.ts');
  const interests = read('app/api/profile-geography/interests/route.ts');
  const settings = read('app/settings/page.tsx');
  assert.match(onboarding, /institution.*club.*athlete.*staff.*fan/);
  assert.match(interests, /new Set\(\[['"]athlete['"], ['"]staff['"]\]\)/);
  assert.match(settings, /accountType === ['"]athlete['"] \|\| accountType === ['"]staff['"]/);
});

test('signup and APIs introduce no implicit Italy geography regression', () => {
  assert.doesNotMatch(read('app/api/profiles/bootstrap/route.ts'), /interest_country\s*:\s*['"]IT['"]/);
  assert.doesNotMatch(read('app/signup/SignupClient.tsx'), /interest_country|residence_country|residence_geo/i);
  assert.doesNotMatch(read('app/api/profile-geography/interests/route.ts'), /residence_country_id|residence_geo_area_id|interest_country/);
});
