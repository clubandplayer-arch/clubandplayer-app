import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const script = readFileSync('scripts/prepare-phase-5g-canary-secrets.sh','utf8');

test('5G secret loader is source-only, hidden and performs no network operation', () => {
  assert.match(script,/source_this_script/);
  assert.match(script,/read -rsp 'Club canary access token/);
  assert.match(script,/read -rsp 'Applicant canary access token/);
  assert.doesNotMatch(script,/\bcurl\b|\bwget\b|https?:\/\/.*api\//);
  assert.doesNotMatch(script,/set -e|set -u/);
});

test('5G secret loader validates both subjects and expiration without printing tokens', () => {
  assert.match(script,/CLUB_SUB.*CLUB_CANARY_USER_ID/);
  assert.match(script,/APPLICANT_SUB.*APPLICANT_CANARY_USER_ID/);
  assert.match(script,/token_subject_mismatch/);
  assert.match(script,/token_expired/);
  assert.doesNotMatch(script,/printf[^\n]*(CLUB_CANARY_TOKEN|APPLICANT_CANARY_TOKEN)/);
  assert.match(script,/PHASE_5G_EXPECTED_RELEASE_SHA='cdb84458c61e72b75ee42a9327cd6510f357887e'/);
});
