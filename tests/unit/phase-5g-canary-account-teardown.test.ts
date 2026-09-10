import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const script=readFileSync('scripts/run-phase-5g-canary-account-teardown.sh','utf8');

test('5G account teardown validates both sessions and empty Application views before deletion',()=>{
  const applicantAuth=script.indexOf('APPLICANT_AUTH_STATUS=');
  const clubAuth=script.indexOf('CLUB_AUTH_STATUS=');
  const applicantDelete=script.indexOf('APPLICANT_DELETE_STATUS=');
  assert.ok(applicantAuth >= 0 && clubAuth > applicantAuth && applicantDelete > clubAuth);
  assert.equal((script.match(/length==0/g)??[]).length,2);
});

test('5G account teardown performs only two authorized account deletes and clears tokens',()=>{
  assert.equal((script.match(/-X DELETE/g)??[]).length,2);
  assert.equal((script.match(/\/api\/account\/delete/g)??[]).length,2);
  assert.match(script,/unset CLUB_CANARY_TOKEN APPLICANT_CANARY_TOKEN/);
  assert.match(script,/PHASE_5G_CANARY_ACCOUNT_TEARDOWN_PASS/);
  assert.doesNotMatch(script,/--retry|\bpsql\b/);
});
