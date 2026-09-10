import assert from "node:assert/strict";
import test from "node:test";

import {
  CanonicalSportFilterError,
  parseCanonicalSportFilters,
} from "../../lib/search/canonicalSportFilters";

const SPORT = "11111111-1111-4111-8111-111111111111";
const DISCIPLINE = "22222222-2222-4222-8222-222222222222";
const VARIANT = "33333333-3333-4333-8333-333333333333";

test("canonical sport search accepts camel and snake case complete chains", () => {
  assert.deepEqual(
    parseCanonicalSportFilters(
      new URLSearchParams({
        sportId: SPORT,
        disciplineId: DISCIPLINE,
        variantId: VARIANT,
      }),
    ),
    {
      sportId: SPORT,
      disciplineId: DISCIPLINE,
      variantId: VARIANT,
    },
  );
  assert.deepEqual(
    parseCanonicalSportFilters(new URLSearchParams({ sport_id: SPORT })),
    {
      sportId: SPORT,
      disciplineId: null,
      variantId: null,
    },
  );
});

test("canonical sport search rejects malformed and partial chains", () => {
  assert.throws(
    () =>
      parseCanonicalSportFilters(
        new URLSearchParams({ disciplineId: DISCIPLINE }),
      ),
    CanonicalSportFilterError,
  );
  assert.throws(
    () =>
      parseCanonicalSportFilters(
        new URLSearchParams({ sportId: SPORT, variantId: VARIANT }),
      ),
    CanonicalSportFilterError,
  );
  assert.throws(
    () =>
      parseCanonicalSportFilters(new URLSearchParams({ sportId: "football" })),
    /invalid_sport_id/,
  );
});
