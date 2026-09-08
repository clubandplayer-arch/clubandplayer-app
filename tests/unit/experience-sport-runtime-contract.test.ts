import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { planExperienceSportRequest, projectExperiencePrimarySport } from '../../lib/taxonomy/experienceSportRuntimeContract';

const writePlan = {
  action: 'write' as const,
  source: 'legacy_mapped' as const,
  legacyValue: 'Calcio',
  sportId: 'sport-id',
  disciplineId: 'discipline-id',
  variantId: 'variant-id',
};

test('experience legacy sport reuses the canonical planner contract', async () => {
  const result = await planExperienceSportRequest({ sport: 'calcio' }, { plan: async () => writePlan });
  assert.deepEqual(result, {
    sport: 'Calcio', sport_id: 'sport-id', sport_discipline_id: 'discipline-id', sport_variant_id: 'variant-id',
  });
});

test('experience rejects reset/no-change and conflicting sport shapes', async () => {
  await assert.rejects(() => planExperienceSportRequest({ sport: null }, { plan: async () => ({ action: 'write', source: 'reset', legacyValue: null, sportId: null, disciplineId: null, variantId: null }) }), /experience_sport_required/);
  await assert.rejects(() => planExperienceSportRequest({ sport: 'Calcio', primarySport: {} }, { plan: async () => writePlan }), /conflicting_input/);
});

test('GET projection is additive and null for legacy rows', () => {
  assert.equal(projectExperiencePrimarySport({ sport_id: null }), null);
  assert.deepEqual(projectExperiencePrimarySport({ sport_id: 's', sport_discipline_id: 'd', sport_variant_id: null }), {
    sportId: 's', disciplineId: 'd', variantId: null,
  });
});

test('experience route uses one atomic RPC instead of delete then insert', () => {
  const route = readFileSync(new URL('../../app/api/profiles/me/experiences/route.ts', import.meta.url), 'utf8');
  assert.match(route, /rpc\('replace_my_athlete_experiences'/);
  assert.doesNotMatch(route, /from\('athlete_experiences'\)\s*\.delete/);
  assert.match(route, /planExperienceSportRequest/);
  assert.match(route, /rawExperiences\.length > MAX_EXPERIENCES/);
});
