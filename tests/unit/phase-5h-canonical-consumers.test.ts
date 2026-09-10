import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const search = readFileSync("app/api/search/route.ts", "utf8");
const discover = readFileSync("app/api/follows/suggestions/route.ts", "utf8");
const who = readFileSync("app/api/suggestions/who-to-follow/route.ts", "utf8");

test("global search validates canonical sport filters and preserves legacy fallback", () => {
  assert.match(search, /parseCanonicalSportFilters/);
  assert.match(search, /applyCanonicalSportFilters/);
  assert.match(search, /else if \(options\?\.allowSport && filters\.sport\)/);
  assert.match(search, /sportId: filters\.canonicalSport\?\.sportId/);
  assert.match(search, /canonicalProfiles/);
});

test("Discover and WhoToFollow prefer viewer canonical sport with legacy fallback", () => {
  assert.match(discover, /viewerSportId/);
  assert.match(discover, /applyCanonicalSportFilters/);
  assert.match(discover, /sportId: viewerSportId/);
  assert.match(discover, /profile\.sport/);
  assert.match(discover, /else if \(sportScope === 'mine' && profile\.sport\)/);
  assert.match(who, /sportQuery = profile\.sport_id/);
  assert.match(who, /sportQuery\.eq\('sport_id', profile\.sport_id\)/);
  assert.match(who, /sportQuery\.eq\('sport', profile\.sport\)/);
});
