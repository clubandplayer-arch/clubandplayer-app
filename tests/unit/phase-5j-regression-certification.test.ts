import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const runner = readFileSync(
  'scripts/verify-phase-5j-regression-certification.sh',
  'utf8',
);
const runbook = readFileSync(
  'docs/european-expansion/phase-5j-final-certification.md',
  'utf8',
);

test('5J repository gate covers canonical and legacy contracts without remote writes', () => {
  assert.match(runner, /canonical-sports-compatibility\.test\.ts/);
  assert.match(runner, /canonical-sport-search-filters\.test\.ts/);
  assert.match(runner, /phase-5i-form-payload-contract\.test\.ts/);
  assert.match(runner, /profile-primary-sport-runtime-contract\.test\.ts/);
  assert.match(runner, /phase-5h-canonical-consumers\.test\.ts/);
  assert.match(runner, /phase-5h-suggestion-bearer-auth\.test\.ts/);
  assert.match(runner, /i18n\.test\.ts/);
  assert.match(runner, /pnpm typecheck/);
  assert.match(runner, /eslint --max-warnings=0/);
  assert.match(runner, /PHASE_5J_REPOSITORY_REGRESSION_PASS/);
  assert.doesNotMatch(
    runner,
    /\b(?:curl|psql|supabase\s+db|POST|PATCH|PUT|DELETE)\b/,
  );
});

test('5J final runbook reuses accepted evidence and keeps Mobile a separate handoff', () => {
  assert.match(runbook, /d69768bb2df05bb8fb7ead409cba83e806b4c76b/);
  assert.match(runbook, /PHASE_5I_PRODUCTION_PASS/);
  assert.match(runbook, /classification=PASS/);
  assert.match(runbook, /Italia legacy/);
  assert.match(runbook, /canonical-first/);
  assert.match(runbook, /old client/i);
  assert.match(runbook, /RLS\/ownership/);
  assert.match(runbook, /performance/);
  assert.match(runbook, /Mobile.*separat/is);
  assert.match(runbook, /PHASE_5J_FINAL_CERTIFICATION_PASS/);
  assert.match(
    runbook,
    /Non rieseguire migration,\s*seed, backfill, history repair/i,
  );
});
