import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const report = readFileSync('scripts/sports/reports/phase-5f-canary-teardown-verification-read-only.sql', 'utf8');

test('5F teardown verification is parameterized, read-only and fail-closed', () => {
  assert.match(report, /begin transaction read only;/i);
  assert.match(report, /rollback;/i);
  assert.match(report, /:'canary_user_id'::uuid/);
  assert.match(report, /:'canary_profile_id'::uuid/);
  assert.match(report, /auth\.users/);
  assert.match(report, /public\.profiles/);
  assert.match(report, /public\.athlete_experiences/);
  assert.match(report, /PASS_PHASE_5F_CANARY_TEARDOWN_VERIFIED/);
  assert.doesNotMatch(report, /\b(?:insert|update|delete|alter|create|drop|truncate)\b/i);
});
