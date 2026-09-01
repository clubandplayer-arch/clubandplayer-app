import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildSuggestionGeographyPlan,
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
  assert.doesNotMatch(follows, /interest_city\.ilike/);
  assert.doesNotMatch(alternate, /profile\.interest_city \|\| profile\.city/);
});
