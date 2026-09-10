import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const script=readFileSync('scripts/run-phase-5g-canary-data-teardown.sh','utf8');

test('5G data teardown deletes Application before Opportunity and verifies absence',()=>{
  const applicationDelete=script.indexOf('/api/applications/$APPLICATION_ID');
  const opportunityDelete=script.indexOf('/api/opportunities/$OPPORTUNITY_ID');
  assert.ok(applicationDelete >= 0 && opportunityDelete > applicationDelete);
  assert.equal((script.match(/-X DELETE/g)??[]).length,2);
  assert.match(script,/OPPORTUNITY_AFTER_STATUS/);
  assert.match(script,/= 404/);
  assert.match(script,/PHASE_5G_CANARY_DATA_TEARDOWN_PASS/);
});

test('5G data teardown is evidence and release pinned without retries or account deletion',()=>{
  assert.match(script,/phase-5g-canary-application-create\.json/);
  assert.match(script,/cdb84458c61e72b75ee42a9327cd6510f357887e/);
  assert.doesNotMatch(script,/--retry|\/api\/account\/delete/);
});
