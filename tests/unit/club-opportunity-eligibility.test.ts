import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const eligibility = readFileSync('lib/opportunities/clubOpportunityEligibility.server.ts', 'utf8');
const createRoute = readFileSync('app/api/opportunities/route.ts', 'utf8');
const updateRoute = readFileSync('app/api/opportunities/[id]/route.ts', 'utf8');

test('Club opportunity eligibility requires canonical geography, matching country/area and active registration', () => {
  assert.match(eligibility, /club_canonical_geography_required/);
  assert.match(eligibility, /opportunity_country_must_match_club/);
  assert.match(eligibility, /opportunity_area_outside_club_scope/);
  assert.match(eligibility, /active_club_registration_required/);
  assert.match(eligibility, /club_registration_country_mismatch/);
  assert.match(eligibility, /isWithinArea/);
  assert.match(eligibility, /\.eq\('club_profile_id', input\.clubProfileId\)\.eq\('is_active', true\)/);
});

test('create and update both fail closed through the shared eligibility boundary', () => {
  assert.match(createRoute, /canonical_opportunity_geography_required/);
  assert.match(createRoute, /assertClubOpportunityEligibility/);
  assert.match(updateRoute, /assertClubOpportunityEligibility/);
  assert.match(updateRoute, /invalid_club_registration/);
});
