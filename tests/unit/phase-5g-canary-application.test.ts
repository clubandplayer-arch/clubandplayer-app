import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const script=readFileSync('scripts/run-phase-5g-canary-application.sh','utf8');

test('5G Application canary performs one create and owner-scoped reads',()=>{
  assert.equal((script.match(/--data-binary/g)??[]).length,1);
  assert.match(script,/Bearer \$APPLICANT_CANARY_TOKEN/);
  assert.match(script,/\/api\/applications\/me/);
  assert.match(script,/Bearer \$CLUB_CANARY_TOKEN/);
  assert.match(script,/\/api\/applications\/received/);
  assert.match(script,/opportunity_id=\$OPPORTUNITY_ID/);
});

test('5G Application canary verifies release and projected canonical context fail closed',()=>{
  assert.match(script,/cdb84458c61e72b75ee42a9327cd6510f357887e/);
  assert.match(script,/genderCode=="male"/);
  assert.match(script,/primarySport\.sportId/);
  assert.match(script,/playerPositionId/);
  assert.match(script,/staffRoleId==null/);
  assert.match(script,/PHASE_5G_CANARY_APPLICATION_PASS/);
  assert.doesNotMatch(script,/--retry|-X\s+(PATCH|PUT|DELETE)/);
});
