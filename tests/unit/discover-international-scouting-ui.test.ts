import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const discover = readFileSync('app/(dashboard)/discover/page.tsx', 'utf8');
const route = readFileSync('app/api/follows/suggestions/route.ts', 'utf8');
const validation = readFileSync('lib/validation/follow.ts', 'utf8');

test('D6 Discover uses canonical country/area selector with URL-stable scouting IDs', () => {
  assert.match(discover, /CanonicalGeographySelector/);
  assert.match(discover, /searchParams\.get\('countryId'\)/);
  assert.match(discover, /searchParams\.get\('geoAreaId'\)/);
  assert.match(discover, /params\.set\('countryId', countryId\)/);
  assert.match(discover, /params\.set\('geoAreaId', geoAreaId\)/);
  assert.match(discover, /router\.replace/);
  assert.doesNotMatch(discover, /Tutta Italia/);
});

test('D6 suggestions validates canonical scouting filters and keeps queries country bounded', () => {
  assert.match(validation, /countryId: z\.string\(\)\.uuid\(\)\.optional\(\)/);
  assert.match(validation, /geoAreaId: z\.string\(\)\.uuid\(\)\.optional\(\)/);
  assert.match(route, /parseSearchGeography\(url\.searchParams\)/);
  assert.match(route, /resolveCanonicalSearchGeography/);
  assert.match(route, /expandDescendants: false/);
  assert.match(route, /country\.ilike/);
  assert.match(route, /canonicalAreaLegacyField/);
  assert.match(route, /scoutingCountryId/);
  assert.match(route, /scoutingGeoAreaId/);
});

test('D6 copy is localized, accessible and exposes only non-sensitive reason labels', () => {
  assert.match(discover, /aria-pressed=\{activeTab === tab\.key\}/);
  assert.match(discover, /discover\.reasonScoutingArea/);
  assert.match(discover, /discover\.reasonPersonalized/);
  for (const locale of ['it', 'en', 'fr', 'es']) {
    const messages = readFileSync(`lib/i18n/messages/operations/${locale}.ts`, 'utf8');
    assert.match(messages, /discover\.scoutingArea/);
    assert.match(messages, /discover\.reasonScoutingArea/);
    assert.match(messages, /discover\.reasonPersonalized/);
  }
  assert.doesNotMatch(discover, /canonical_area|relocation_compatible|interestPriority|rankingVersion/);
});
