import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const script=readFileSync('scripts/replace-phase-5g-canary-applicant-token.sh','utf8');

test('Applicant token replacement is source-only, hidden and local-only',()=>{
  assert.match(script,/source_this_script/);
  assert.match(script,/read -rsp 'Nuovo Applicant canary access token/);
  assert.doesNotMatch(script,/\bcurl\b|\bwget\b|set -e|set -u/);
  assert.doesNotMatch(script,/echo[^\n]*(NEW_APPLICANT_CANARY_TOKEN|APPLICANT_CANARY_TOKEN)/);
});

test('Applicant token replacement validates identity and expiry before export',()=>{
  assert.match(script,/2c988bc3-5245-45dc-8184-8582ab3b0e5a/);
  assert.match(script,/replacement_applicant_subject_mismatch/);
  assert.match(script,/replacement_applicant_token_expired/);
  assert.match(script,/export APPLICANT_CANARY_TOKEN/);
  assert.match(script,/PHASE_5G_CANARY_APPLICANT_TOKEN_REPLACED/);
});
