import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const script=readFileSync('scripts/resume-phase-5g-canary-opportunity-teardown.sh','utf8');

test('5G teardown recovery preserves Application deletion and deletes only Opportunity',()=>{
  assert.match(script,/application_delete_evidence_drift/);
  assert.match(script,/\.ok==true/);
  assert.equal((script.match(/-X DELETE/g)??[]).length,1);
  assert.match(script,/\/api\/opportunities\/\$OPPORTUNITY_ID/);
  assert.doesNotMatch(script,/\/api\/applications\/\$APPLICATION_ID|--retry|\/api\/account\/delete/);
});

test('5G teardown recovery verifies release, delete contract and public absence',()=>{
  assert.match(script,/cdb84458c61e72b75ee42a9327cd6510f357887e/);
  assert.match(script,/\.success==true/);
  assert.match(script,/OPPORTUNITY_AFTER_STATUS/);
  assert.match(script,/= 404/);
  assert.match(script,/PHASE_5G_CANARY_DATA_TEARDOWN_PASS/);
});
