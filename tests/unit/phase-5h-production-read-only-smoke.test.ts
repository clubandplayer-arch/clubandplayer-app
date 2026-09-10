import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const runner = readFileSync('scripts/run-phase-5h-production-read-only-smoke.sh', 'utf8');

test('5H Production smoke is release-gated, read-only, and covers all consumers', () => {
  assert.match(runner, /PHASE_5H_EXPECTED_RELEASE_SHA/);
  assert.match(runner, /\.sha==\$sha and \.mode=="production"/);
  assert.match(runner, /api\/profiles\/me/);
  assert.match(runner, /sportId=\$SPORT_ID/);
  assert.match(runner, /sport=\$LEGACY_SPORT/);
  assert.match(runner, /invalid_sport_id/);
  assert.match(runner, /api\/follows\/suggestions\?limit=5&sportScope=mine/);
  assert.match(runner, /api\/suggestions\/who-to-follow\?limit=5/);
  assert.match(runner, /PHASE_5H_PRODUCTION_READ_ONLY_SMOKE_PASS/);
  assert.doesNotMatch(runner, /curl[^\n]*(?:-X|--request)\s*(?:POST|PATCH|PUT|DELETE)/i);
  assert.doesNotMatch(runner, /--data(?:-raw|-binary)?(?:=|\s)/);
});
