import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCanonicalSportRequestFields,
  buildExperienceFormPayload,
} from '../../lib/taxonomy/canonicalSportFormPayload';
import { planProfilePrimarySportRequest } from '../../lib/taxonomy/profilePrimarySportRuntimeContract';
import { planExperienceSportRequest } from '../../lib/taxonomy/experienceSportRuntimeContract';

const value = {
  sportId: '11111111-1111-4111-8111-111111111111',
  disciplineId: '22222222-2222-4222-8222-222222222222',
  variantId: '33333333-3333-4333-8333-333333333333',
  legacySport: 'football',
};

const expectedCanonical = {
  sportId: value.sportId,
  disciplineId: value.disciplineId,
  variantId: value.variantId,
};

async function assertAcceptedByApiContract(payload: Record<string, unknown>) {
  let plannerPayload: unknown;
  const planned = await planProfilePrimarySportRequest(payload, {
    plan: async (input) => {
      plannerPayload = input;
      return {
        action: 'write' as const,
        source: 'canonical' as const,
        sportId: value.sportId,
        disciplineId: value.disciplineId,
        variantId: value.variantId,
        legacyValue: 'Calcio',
      };
    },
  });
  assert.deepEqual(plannerPayload, { canonical: expectedCanonical });
  assert.equal('sport' in payload, false);
  assert.deepEqual(planned, {
    sport: 'Calcio',
    sport_id: value.sportId,
    sport_discipline_id: value.disciplineId,
    sport_variant_id: value.variantId,
  });
}

test('Profile and Opportunity client payloads are accepted by their shared API contract', async () => {
  const fields = buildCanonicalSportRequestFields(value);
  await assertAcceptedByApiContract({ full_name: 'Test Player', ...fields });
  await assertAcceptedByApiContract({ title: 'Test Opportunity', ...fields });
});

test('Experience client payload removes conflicting legacy sport and is accepted by the API contract', async () => {
  const payload = buildExperienceFormPayload({
    season: '2025/26',
    club: 'Test Club',
    sport: value.legacySport,
    role: 'Portiere',
    category: 'Altro',
    primarySport: expectedCanonical,
  });
  assert.equal(payload.season, '2025/26');
  let plannerPayload: unknown;
  const planned = await planExperienceSportRequest(payload, {
    plan: async (input) => {
      plannerPayload = input;
      return {
        action: 'write' as const,
        source: 'canonical' as const,
        sportId: value.sportId,
        disciplineId: value.disciplineId,
        variantId: value.variantId,
        legacyValue: 'Calcio',
      };
    },
  });
  assert.deepEqual(plannerPayload, { canonical: expectedCanonical });
  assert.equal('sport' in payload, false);
  assert.equal(planned.sport_id, value.sportId);
});

test('legacy-only forms keep the mutually exclusive legacy contract', async () => {
  const fields = buildCanonicalSportRequestFields({ ...value, sportId: '', disciplineId: '', variantId: '' });
  assert.deepEqual(fields, { sport: 'football' });
  assert.equal('primarySport' in fields, false);
});

test('the superseded client payload shapes fail exactly as diagnosed', async () => {
  const planner = { plan: async () => ({ action: 'no_change' as const }) };
  await assert.rejects(
    planProfilePrimarySportRequest({ sport: 'football', primarySport: expectedCanonical }, planner),
    /conflicting_input/,
  );
  await assert.rejects(
    planProfilePrimarySportRequest({ primarySport: expectedCanonical }, planner),
    /invalid_input/,
  );
});
