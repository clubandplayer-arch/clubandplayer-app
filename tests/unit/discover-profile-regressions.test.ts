import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { isProfileEligibleForPublicDiscovery } from "../../lib/profiles/completion";

const suggestions = readFileSync(
  "app/api/follows/suggestions/route.ts",
  "utf8",
);
const profileForm = readFileSync(
  "components/profiles/ProfileEditForm.tsx",
  "utf8",
);
const canonicalGeographyAdapter = readFileSync(
  "lib/search/canonicalGeography.server.ts",
  "utf8",
);
const discoverPage = readFileSync(
  "app/(dashboard)/discover/page.tsx",
  "utf8",
);
const followValidation = readFileSync("lib/validation/follow.ts", "utf8");

test("Discover separates organization headquarters from Player and Staff interest areas", () => {
  assert.match(
    suggestions,
    /loadOrganizationIdsForCanonicalScope/,
  );
  assert.match(suggestions, /loadPeopleIdsForInterestScope/);
  assert.match(
    suggestions,
    /filters\.push\(\[\(query\) => query\.in\('id', ids\), \.\.\.sportFilter\]\)/,
  );
  assert.match(suggestions, /filters\.push\(\[\.\.\.sportFilter\]\)/);
  assert.match(suggestions, /profile_country_interests/);
  assert.match(suggestions, /profile_geo_area_interests/);
  assert.match(suggestions, /interest_\$\{canonicalAreaLegacyField/);
  assert.match(suggestions, /forOrganizations \? explicitOrganizationIds : explicitPeopleIds/);
  assert.match(suggestions, /expandDescendants: true/);
  assert.doesNotMatch(suggestions, /\.in\('geo_area_id', scope\.areaIds\)/);
  assert.match(canonicalGeographyAdapter, /parents\.slice\(offset, offset \+ 100\)/);
});

test("Discover retains published legacy people that predate newer completion fields", () => {
  assert.equal(isProfileEligibleForPublicDiscovery({
    account_type: "staff",
    full_name: "Gabriele Basso",
    country: "IT",
  }), true);
  assert.equal(isProfileEligibleForPublicDiscovery({
    account_type: "athlete",
    full_name: "Gaetano Baratta",
  }), true);
  assert.equal(isProfileEligibleForPublicDiscovery({
    account_type: "staff",
    full_name: "invalid@example.com",
  }), false);
});

test("Discover global suggestions include foreign historical profiles but exclude followed profiles", () => {
  assert.match(discoverPage, /limit: '200'/);
  assert.match(followValidation, /numberFromParam\(4, 1, 200\)/);
  assert.doesNotMatch(discoverPage, /includeFollowed/);
  assert.doesNotMatch(followValidation, /includeFollowed/);
  assert.match(suggestions, /const alreadyFollowing = new Set\(excludedUuid\)/);
  assert.match(suggestions, /alreadyFollowing\.add\(profileId\)/);
  assert.match(discoverPage, /selectCountry: t\('map\.allCountries'\)/);
  assert.match(suggestions, /An empty country means every country/);
  assert.doesNotMatch(suggestions, /suggestionFiltersForScope\(geographyPlan, geoScope\)/);
  assert.match(suggestions, /isProfileEligibleForPublicDiscovery/);
});

test("Players and staff can remove their only past experience", () => {
  assert.match(profileForm, /useState<PastExperience\[\]>\(\[\]\)/);
  assert.match(profileForm, /setPastExperiences\(normalized\)/);
  assert.match(
    profileForm,
    /prev\.filter\(\(_, currentIndex\) => currentIndex !== index\)/,
  );
  assert.doesNotMatch(profileForm, /pastExperiences\.length > 1 &&/);
});
