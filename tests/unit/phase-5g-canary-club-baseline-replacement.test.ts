import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const script=readFileSync('scripts/run-phase-5g-canary-club-baseline-after-token-replacement.sh','utf8');

test('replacement baseline preserves 401 evidence and performs exactly one GET',()=>{
  assert.match(script,/club-received-401\.json/);
  assert.equal((script.match(/\bcurl\b/g)??[]).length,2); // command check plus one invocation
  assert.match(script,/\/api\/applications\/received\?status=all/);
  assert.doesNotMatch(script,/\/api\/env"\)|\/api\/applications\/me\?|--retry|-X\s+(POST|PATCH|PUT|DELETE)/);
});

test('replacement baseline requires all three empty/deployment invariants',()=>{
  assert.match(script,/preserved_release_drift/);
  assert.match(script,/preserved_applicant_baseline_drift/);
  assert.match(script,/replacement_club_baseline_drift/);
  assert.match(script,/PHASE_5G_CANARY_HTTP_BASELINE_PASS/);
  assert.doesNotMatch(script,/printf[^\n]*CLUB_CANARY_TOKEN/);
});
