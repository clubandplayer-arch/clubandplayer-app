import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const script=readFileSync('scripts/diagnose-phase-5g-canary-http-baseline.sh','utf8');

test('5G baseline diagnostic reuses preserved evidence without network or writes',()=>{
  assert.match(script,/phase-5g-canary-club-received-before\.json/);
  assert.match(script,/sha256sum/);
  assert.doesNotMatch(script,/\bcurl\b|\bwget\b|\bpsql\b/);
  assert.doesNotMatch(script,/-X\s+(POST|PATCH|PUT|DELETE)/);
});

test('5G diagnostic reports bounded token state without printing the token',()=>{
  assert.match(script,/token_state='expired'/);
  assert.match(script,/token_state='unexpired'/);
  assert.match(script,/seconds_remaining/);
  assert.match(script,/club_shape/);
  assert.doesNotMatch(script,/echo[^\n]*CLUB_CANARY_TOKEN|printf\s+['"]?\$CLUB_CANARY_TOKEN/);
  assert.doesNotMatch(script,/set -e|set -u/);
});
