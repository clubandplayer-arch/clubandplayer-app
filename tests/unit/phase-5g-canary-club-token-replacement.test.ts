import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const script=readFileSync('scripts/replace-phase-5g-canary-club-token.sh','utf8');

test('Club token replacement is source-only, hidden and local-only',()=>{
  assert.match(script,/source_this_script/);
  assert.match(script,/read -rsp 'Nuovo Club canary access token/);
  assert.doesNotMatch(script,/\bcurl\b|\bwget\b|\bpsql\b/);
  assert.doesNotMatch(script,/set -e|set -u/);
});

test('Club token replacement validates identity and expiry before export',()=>{
  assert.match(script,/870bb095-9f8b-4800-a8b9-3e137714e8d0/);
  assert.ok(script.indexOf('replacement_club_subject_mismatch') < script.indexOf('export CLUB_CANARY_TOKEN'));
  assert.ok(script.indexOf('replacement_club_token_expired') < script.indexOf('export CLUB_CANARY_TOKEN'));
  assert.match(script,/PHASE_5G_CANARY_CLUB_TOKEN_REPLACED/);
  assert.doesNotMatch(script,/echo[^\n]*(NEW_CLUB_CANARY_TOKEN|CLUB_CANARY_TOKEN)/);
});
