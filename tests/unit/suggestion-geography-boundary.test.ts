import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildSuggestionGeographyPlan,
  rankSuggestionCandidates,
  suggestionFiltersForScope,
  type SuggestionGeographyPlanInput,
} from '../../lib/search/suggestionGeography';

const italy = { iso2: 'IT', officialName: 'Italy', localizedName: 'Italia' };
const france = { iso2: 'FR', officialName: 'France', localizedName: 'Francia' };

function input(overrides: Partial<SuggestionGeographyPlanInput> = {}): SuggestionGeographyPlanInput {
  return {
    countryInterests: [], areaInterests: [], residenceCountry: null, residenceArea: null,
    openToRelocation: false, legacyInterest: {}, legacyResidence: {}, ...overrides,
  };
}

test('canonical viewer interests precede legacy interests and residence without using target interests', () => {
  const plan = buildSuggestionGeographyPlan(input({
    areaInterests: [{ area: { officialName: 'Auvergne-Rhône-Alpes', areaType: 'REGION', country: france }, priority: 1 }],
    countryInterests: [{ country: italy, priority: 2 }],
    legacyInterest: { province: 'RM' },
    residenceCountry: france,
    legacyResidence: { city: 'Roma' },
  }));
  assert.deepEqual(plan.filters.map((filter) => [filter.source, filter.field]), [
    ['canonical_area_interest', 'region'],
    ['canonical_area_interest', 'country'],
    ['canonical_country_interest', 'country'],
    ['legacy_interest', 'province'],
    ['legacy_residence', 'city'],
  ]);
  assert.equal(plan.hasCanonicalInterests, true);
});

test('country aliases are explicit and duplicate canonical/residence scopes are removed', () => {
  const plan = buildSuggestionGeographyPlan(input({
    countryInterests: [{ country: italy, priority: 0 }],
    residenceCountry: italy,
  }));
  assert.deepEqual(plan.filters, [{
    field: 'country', values: ['IT', 'Italy', 'Italia'], source: 'canonical_country_interest', priority: 0,
  }]);
});

test('legacy-only viewers retain specific-to-broad fallback and relocation stays metadata', () => {
  const plan = buildSuggestionGeographyPlan(input({
    openToRelocation: true,
    legacyInterest: { country: 'IT', region: 'Lazio', province: 'RM', city: 'Roma' },
    legacyResidence: { country: 'FR' },
  }));
  assert.deepEqual(plan.filters.map((filter) => filter.field), ['city', 'province', 'region', 'country', 'country']);
  assert.equal(plan.openToRelocation, true);
  assert.equal(plan.hasCanonicalInterests, false);
});

test('scope selection preserves shared plan order', () => {
  const plan = buildSuggestionGeographyPlan(input({
    countryInterests: [{ country: france, priority: 1 }],
    legacyInterest: { country: 'IT', city: 'Roma' },
  }));
  assert.deepEqual(suggestionFiltersForScope(plan, 'country').map((item) => item.source), [
    'canonical_country_interest', 'legacy_interest',
  ]);
  assert.deepEqual(suggestionFiltersForScope(plan, 'city').map((item) => item.values), [['Roma']]);
});

test('D5 ranks canonical area, country, legacy and sport signals deterministically', () => {
  const plan = buildSuggestionGeographyPlan(input({
    areaInterests: [{ area: { officialName: 'Lazio', areaType: 'REGION', country: italy }, priority: 1 }],
    countryInterests: [{ country: france, priority: 2 }],
    legacyResidence: { country: 'IT' },
  }));
  const ranked = rankSuggestionCandidates([
    { id: 'legacy', country: 'IT', region: 'Lombardia', sport: 'Calcio', updated_at: '2026-09-01' },
    { id: 'country', country: 'FR', region: 'Bretagne', sport: 'Volley', updated_at: '2026-08-01' },
    { id: 'area', country: 'IT', region: 'Lazio', sport: 'Calcio', updated_at: '2026-07-01' },
  ], plan, 'Calcio');
  assert.deepEqual(ranked.map((candidate) => candidate.id), ['area', 'legacy', 'country']);
});

test('relocation boosts only explicit foreign interests with a known residence country', () => {
  const plan = buildSuggestionGeographyPlan(input({
    openToRelocation: true,
    countryInterests: [{ country: france, priority: 1 }],
    residenceCountry: italy,
  }));
  const ranked = rankSuggestionCandidates([
    { id: 'home', country: 'IT', updated_at: '2026-09-02' },
    { id: 'foreign-interest', country: 'FR', updated_at: '2026-09-01' },
    { id: 'unrelated', country: 'ES', updated_at: '2026-09-03' },
  ], plan);
  assert.deepEqual(ranked.map((candidate) => candidate.id), ['foreign-interest', 'home', 'unrelated']);
});

test('missing canonical geography is never penalized and stable ties use recency then ID', () => {
  const plan = buildSuggestionGeographyPlan(input({}));
  const ranked = rankSuggestionCandidates([
    { id: 'b', updated_at: '2026-09-01' },
    { id: 'c', updated_at: '2026-09-02' },
    { id: 'a', updated_at: '2026-09-01' },
  ], plan);
  assert.deepEqual(ranked.map((candidate) => candidate.id), ['c', 'a', 'b']);
});

test('server boundary reads only viewer-owned preferences and both endpoints consume it', () => {
  const server = readFileSync('lib/search/suggestionGeography.server.ts', 'utf8');
  const follows = readFileSync('app/api/follows/suggestions/route.ts', 'utf8');
  const alternate = readFileSync('app/api/suggestions/who-to-follow/route.ts', 'utf8');
  assert.match(server, /\.eq\('profile_id', profile\.id\)/);
  assert.match(server, /profile_country_interests/);
  assert.match(server, /profile_geo_area_interests/);
  assert.match(server, /open_to_relocation/);
  assert.doesNotMatch(server, /getSupabaseAdminClient|service_role/);
  assert.match(follows, /loadViewerSuggestionGeography/);
  assert.match(alternate, /loadViewerSuggestionGeography/);
  assert.match(alternate, /if \(debugMode\)/);
  assert.match(alternate, /totalResult\.error \? null/);
  assert.match(alternate, /\.filter\(\(id\) => UUID_RE\.test\(id\)\)/);
  assert.match(follows, /rankSuggestionCandidates/);
  assert.match(alternate, /rankSuggestionCandidates/);
  assert.doesNotMatch(follows, /interest_city\.ilike/);
  assert.doesNotMatch(alternate, /profile\.interest_city \|\| profile\.city/);
});
