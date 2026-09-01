import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildSuggestionGeographyPlan,
  rankSuggestionCandidates,
  type SuggestionCanonicalCountry,
} from '../../lib/search/suggestionGeography';

const launchCountries: SuggestionCanonicalCountry[] = [
  { iso2: 'IT', officialName: 'Italy', localizedName: 'Italia' },
  { iso2: 'FR', officialName: 'France', localizedName: 'Francia' },
  { iso2: 'ES', officialName: 'Spain', localizedName: 'Spagna' },
  { iso2: 'CH', officialName: 'Switzerland', localizedName: 'Svizzera' },
  { iso2: 'SI', officialName: 'Slovenia', localizedName: 'Slovenia' },
  { iso2: 'PL', officialName: 'Poland', localizedName: 'Polonia' },
];

test('D7 launch-country aliases rank canonical interests without penalizing legacy candidates', () => {
  for (const country of launchCountries) {
    const plan = buildSuggestionGeographyPlan({
      countryInterests: [{ country, priority: 1 }], areaInterests: [], residenceCountry: null,
      residenceArea: null, openToRelocation: false, legacyInterest: {}, legacyResidence: {},
    });
    for (const alias of [country.iso2, country.officialName, country.localizedName]) {
      const ranked = rankSuggestionCandidates([
        { id: 'legacy-no-geo', updated_at: '2026-09-02' },
        { id: 'canonical-match', country: alias, updated_at: '2026-09-01' },
      ], plan);
      assert.equal(ranked[0].id, 'canonical-match', `${country.iso2} alias ${alias}`);
      assert.equal(ranked.length, 2, 'legacy candidate remains eligible');
    }
  }
});

test('D7 both suggestion endpoints share visibility, self/follow exclusions and bounded pools', () => {
  const follows = readFileSync('app/api/follows/suggestions/route.ts', 'utf8');
  const alternate = readFileSync('app/api/suggestions/who-to-follow/route.ts', 'utf8');
  for (const source of [follows, alternate]) {
    assert.match(source, /applyPublicProfileVisibilityFilters/);
    assert.match(source, /alreadyFollowing\.add\(profile(?:Id|\.id)\)/);
    assert.match(source, /target_profile_id/);
    assert.match(source, /\.limit\(/);
    assert.doesNotMatch(source, /interest_city\.ilike|interest_country\.ilike/);
  }
  assert.match(alternate, /UUID_RE\.test/);
  assert.doesNotMatch(alternate, /status\.eq\.pending|status\.is\.null/);
});

test('D7 canonical scouting remains fail-closed, bounded and separate from private preferences', () => {
  const discover = readFileSync('app/(dashboard)/discover/page.tsx', 'utf8');
  const route = readFileSync('app/api/follows/suggestions/route.ts', 'utf8');
  const boundary = readFileSync('lib/search/suggestionGeography.server.ts', 'utf8');
  assert.match(route, /SearchGeographyContractError/);
  assert.match(route, /expandDescendants: false/);
  assert.match(route, /return validationError/);
  assert.match(discover, /countryId/);
  assert.match(discover, /geoAreaId/);
  assert.doesNotMatch(boundary, /getSupabaseAdminClient|service_role/);
  assert.doesNotMatch(discover, /relocation_compatible|interestPriority|profile_country_interests/);
});

test('D7 account-type and localization surfaces remain complete', () => {
  const discover = readFileSync('app/(dashboard)/discover/page.tsx', 'utf8');
  for (const kind of ['institution', 'club', 'player', 'staff']) {
    assert.match(discover, new RegExp(`key: '${kind}'`));
  }
  for (const locale of ['it', 'en', 'fr', 'es']) {
    const messages = readFileSync(`lib/i18n/messages/operations/${locale}.ts`, 'utf8');
    const completion = readFileSync(`lib/i18n/messages/completion/${locale}.ts`, 'utf8');
    assert.match(messages, /discover\.scoutingArea/);
    assert.match(completion, /discover\.noSuggestions/);
  }
});
