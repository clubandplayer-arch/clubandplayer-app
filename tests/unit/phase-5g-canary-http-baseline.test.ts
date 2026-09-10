import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const script=readFileSync('scripts/run-phase-5g-canary-http-baseline.sh','utf8');

test('5G baseline performs only the three bounded GET requests without retries',()=>{
  assert.match(script,/\/api\/env/);
  assert.match(script,/\/api\/applications\/me\?status=all/);
  assert.match(script,/\/api\/applications\/received\?status=all/);
  assert.doesNotMatch(script,/-X\s+(POST|PATCH|PUT|DELETE)|--retry/);
});

test('5G baseline pins release, empty baselines and does not print tokens',()=>{
  assert.match(script,/PHASE_5G_EXPECTED_RELEASE_SHA/);
  assert.match(script,/cdb84458c61e72b75ee42a9327cd6510f357887e/);
  assert.match(script,/type=="array" and length==0/g);
  assert.match(script,/PHASE_5G_CANARY_HTTP_BASELINE_PASS/);
  assert.doesNotMatch(script,/printf[^\n]*(CLUB_CANARY_TOKEN|APPLICANT_CANARY_TOKEN)/);
  assert.doesNotMatch(script,/set -e|set -u/);
});
