import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const script=readFileSync('scripts/resume-phase-5g-canary-application-club-read.sh','utf8');

test('5G Application recovery preserves completed create and performs one Club GET',()=>{
  assert.doesNotMatch(script,/--data-binary|\/api\/applications"|-X\s+(POST|PATCH|PUT|DELETE)|--retry/);
  assert.equal((script.match(/\bcurl\b/g)??[]).length,1);
  assert.match(script,/application-create\.json/);
  assert.match(script,/application-me\.json/);
  assert.match(script,/application-received-401\.json/);
  assert.match(script,/\/api\/applications\/received/);
});

test('5G Application recovery validates preserved and replacement canonical reads',()=>{
  assert.match(script,/preserved_release_drift/);
  assert.match(script,/preserved_applicant_read_drift/);
  assert.match(script,/replacement_club_read_contract_drift/);
  assert.equal((script.match(/genderCode=="male"/g)??[]).length,2);
  assert.match(script,/PHASE_5G_CANARY_APPLICATION_PASS/);
});
