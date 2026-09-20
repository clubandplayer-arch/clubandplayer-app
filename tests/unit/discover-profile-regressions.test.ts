import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const suggestions = readFileSync(
  "app/api/follows/suggestions/route.ts",
  "utf8",
);
const profileForm = readFileSync(
  "components/profiles/ProfileEditForm.tsx",
  "utf8",
);

test("Discover broadens personalized results and resolves explicit areas for every profile type", () => {
  assert.match(
    suggestions,
    /explicitProfileIds = await loadClubIdsForCanonicalScope/,
  );
  assert.match(
    suggestions,
    /filters\.push\(\[\(query\) => query\.in\('id', ids\), \.\.\.sportFilter\]\)/,
  );
  assert.match(suggestions, /filters\.push\(\[\.\.\.sportFilter\]\)/);
  assert.match(suggestions, /!preference\.residence_geo_area_id/);
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
