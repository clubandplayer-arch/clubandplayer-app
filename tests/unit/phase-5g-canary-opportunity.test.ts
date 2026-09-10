import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const script=readFileSync('scripts/run-phase-5g-canary-opportunity.sh','utf8');

test('5G Opportunity canary performs one write followed by detail and canonical filter reads',()=>{
  assert.equal((script.match(/--data-binary/g)??[]).length,1);
  assert.match(script,/primarySport:\{canonical:/);
  assert.match(script,/playerPositionId:\$c\.player_position_id/);
  assert.match(script,/requiredCategory:"goalkeeper"/);
  assert.match(script,/\/api\/opportunities\/\$OPPORTUNITY_ID/);
  for (const filter of ['sportId','disciplineId','variantId','playerPositionId','genderCode']) assert.match(script,new RegExp(`data-urlencode ["']${filter}`));
});

test('5G Opportunity canary pins baselines and stops without retry or Application writes',()=>{
  assert.match(script,/EXPECTED_RELEASE_SHA/);
  assert.match(script,/\.sha==\$sha and \.mode=="production"/);
  assert.match(script,/release_sha_drift/);
  assert.match(script,/8fe32e407a1038ee38753b70e5374b3a46d6ae9d5f16cd5b73c53abaca8f5ed0/);
  assert.match(script,/qualification_drift/);
  assert.match(script,/opportunity_create_contract_drift/);
  assert.match(script,/PHASE_5G_CANARY_OPPORTUNITY_PASS/);
  assert.doesNotMatch(script,/--retry|\/api\/applications/);
  assert.doesNotMatch(script,/-X\s+(PATCH|PUT|DELETE)/);
});
