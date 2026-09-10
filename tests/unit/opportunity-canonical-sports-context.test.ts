import assert from 'node:assert/strict';
import test from 'node:test';

import {
  OpportunityCanonicalContextError,
  parseOpportunityRoleReference,
  projectOpportunityCanonicalContext,
  resolveOpportunityRoleColumns,
} from '../../lib/opportunities/canonicalSportsContext.server';

const PLAYER_POSITION_ID = '11111111-1111-4111-8111-111111111111';
const STAFF_ROLE_ID = '22222222-2222-4222-8222-222222222222';

test('accepts only the canonical role reference matching role_group', () => {
  assert.deepEqual(parseOpportunityRoleReference({ playerPositionId: PLAYER_POSITION_ID }, 'player'), {
    playerPositionId: PLAYER_POSITION_ID,
    staffRoleId: null,
    hasExplicit: true,
  });
  assert.deepEqual(parseOpportunityRoleReference({ staffRoleId: STAFF_ROLE_ID }, 'staff'), {
    playerPositionId: null,
    staffRoleId: STAFF_ROLE_ID,
    hasExplicit: true,
  });
  assert.throws(
    () => parseOpportunityRoleReference({ staffRoleId: STAFF_ROLE_ID }, 'player'),
    (error) => error instanceof OpportunityCanonicalContextError && error.code === 'invalid_role_reference',
  );
});

test('rejects conflicting references and permits an explicit nullable reset', () => {
  assert.throws(
    () => parseOpportunityRoleReference({ playerPositionId: PLAYER_POSITION_ID, staffRoleId: STAFF_ROLE_ID }, 'player'),
    (error) => error instanceof OpportunityCanonicalContextError && error.code === 'conflicting_role_reference',
  );
  assert.deepEqual(parseOpportunityRoleReference({ playerPositionId: null }, 'player'), {
    playerPositionId: null,
    staffRoleId: null,
    hasExplicit: true,
  });
});

test('projects additive canonical context while retaining database fields', () => {
  assert.deepEqual(projectOpportunityCanonicalContext({
    sport_id: PLAYER_POSITION_ID,
    sport_discipline_id: null,
    sport_variant_id: null,
    player_position_id: STAFF_ROLE_ID,
    staff_role_id: null,
    gender_code: 'mixed',
  }), {
    primarySport: { sportId: PLAYER_POSITION_ID, disciplineId: null, variantId: null },
    playerPositionId: STAFF_ROLE_ID,
    staffRoleId: null,
    genderCode: 'mixed',
  });
});

test('validates an explicit player position against the exact canonical scope', async () => {
  const query = (row: unknown) => {
    const chain: any = {
      select: () => chain, eq: () => chain, is: () => chain,
      maybeSingle: async () => ({ data: row }),
      limit: async () => ({ data: row ? [row] : [] }),
    };
    return chain;
  };
  const sport = {
    sport: 'Calcio', sport_id: PLAYER_POSITION_ID,
    sport_discipline_id: STAFF_ROLE_ID, sport_variant_id: null,
  };
  assert.deepEqual(await resolveOpportunityRoleColumns({
    supabase: { from: () => query({ position_id: PLAYER_POSITION_ID }) },
    body: { playerPositionId: PLAYER_POSITION_ID }, roleGroup: 'player',
    legacyRole: null, sport,
  }), { player_position_id: PLAYER_POSITION_ID, staff_role_id: null });
  await assert.rejects(resolveOpportunityRoleColumns({
    supabase: { from: () => query(null) },
    body: { playerPositionId: PLAYER_POSITION_ID }, roleGroup: 'player',
    legacyRole: null, sport,
  }), (error) => error instanceof OpportunityCanonicalContextError && error.code === 'invalid_role_reference');
});
