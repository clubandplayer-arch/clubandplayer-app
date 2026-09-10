import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const club=readFileSync('scripts/run-phase-5g-canary-club-account-teardown.sh','utf8');
const applicant=readFileSync('scripts/run-phase-5g-canary-applicant-account-teardown.sh','utf8');

test('split account teardown deletes only the currently authenticated Club first',()=>{
  assert.equal((club.match(/-X DELETE/g)??[]).length,1);
  assert.match(club,/applications\/received\?status=all/);
  assert.doesNotMatch(club,/APPLICANT_CANARY_TOKEN|--retry/);
  assert.match(club,/PHASE_5G_CANARY_CLUB_ACCOUNT_TEARDOWN_PASS/);
});

test('Applicant teardown requires Club deletion evidence and deletes only Applicant',()=>{
  assert.match(applicant,/club_delete_evidence_drift/);
  assert.ok(applicant.indexOf('club_delete_evidence_drift') < applicant.indexOf('APPLICANT_DELETE_STATUS='));
  assert.equal((applicant.match(/-X DELETE/g)??[]).length,1);
  assert.match(applicant,/applications\/me\?status=all/);
  assert.doesNotMatch(applicant,/CLUB_CANARY_TOKEN|--retry/);
  assert.match(applicant,/PHASE_5G_CANARY_ACCOUNT_TEARDOWN_PASS/);
});
