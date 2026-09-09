import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync('scripts/sports/reports/phase-5g-opportunity-canonical-sports-preflight-read-only.sql', 'utf8');
const runner = readFileSync('scripts/run-phase-5g-production-preflight.sh', 'utf8');

test('5G preflight is read-only and distinguishes clean, applied and partial states', () => {
  assert.match(sql, /begin transaction read only/i);
  assert.match(sql, /rollback;/i);
  assert.match(sql, /PASS_READY_FOR_EXCLUSIVE_APPLY/);
  assert.match(sql, /PASS_ALREADY_APPLIED/);
  assert.match(sql, /BLOCKED_PARTIAL_OR_HISTORY_DRIFT/);
  assert.doesNotMatch(sql, /\b(insert|update|delete|alter|create|drop|truncate)\b/i);
});

test('5G runner keeps credentials hidden and reports blockers before exiting non-zero', () => {
  assert.match(runner, /set -eo pipefail/);
  assert.doesNotMatch(runner, /set -u(?:o)?\b/);
  assert.match(runner, /read -rsp/);
  assert.match(runner, /psql "\$PRODUCTION_DATABASE_URL" -W/);
  assert.ok(runner.indexOf('jq -r') < runner.indexOf('case "$CLASSIFICATION"'));
});

