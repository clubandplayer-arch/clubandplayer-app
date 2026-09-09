import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync('scripts/sports/reports/phase-5g-canary-accounts-qualification-read-only.sql','utf8');
const runner = readFileSync('scripts/run-phase-5g-canary-qualification.sh','utf8');

test('5G canary qualification is read-only, two-party and contains no PII output', () => {
  assert.match(sql,/begin transaction read only/i);
  assert.match(sql,/rollback;/i);
  assert.match(sql,/BLOCKED_IDENTITIES_NOT_DISTINCT/);
  assert.match(sql,/BLOCKED_NON_EMPTY_BASELINE/);
  assert.match(sql,/PASS_READ_ONLY_TECHNICAL_QUALIFICATION_DISPOSABLE_ATTESTATION_PENDING/);
  assert.match(sql,/'containsPii',false/);
  assert.doesNotMatch(sql,/jsonb_build_object\([^;]*(email|full_name|display_name|note|title)/is);
  assert.doesNotMatch(sql,/\b(insert|update|delete|alter|create|drop|truncate)\b/i);
});

test('5G qualification runner pins both candidates and protects database credentials', () => {
  assert.match(runner,/870bb095-9f8b-4800-a8b9-3e137714e8d0/);
  assert.match(runner,/2c988bc3-5245-45dc-8184-8582ab3b0e5a/);
  assert.match(runner,/set -eo pipefail/);
  assert.doesNotMatch(runner,/set -u(?:o)?\b/);
  assert.match(runner,/read -rsp/);
  assert.match(runner,/psql "\$PRODUCTION_DATABASE_URL" -W/);
});
