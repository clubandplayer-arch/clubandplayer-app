import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const verifier = readFileSync(new URL('../../scripts/verify-phase-5f-runtime-release.sh', import.meta.url), 'utf8');

test('5F release verifier requires both immutable runtime ancestors', () => {
  assert.match(verifier, /ad9862991d9d6d3c8992796c976601e6e3f917ea/);
  assert.match(verifier, /c65da3e070c1274049b9ebc2382884fd10e7f909/);
  assert.match(verifier, /merge-base --is-ancestor/);
});

test('5F release verifier inspects both routes from the candidate tree', () => {
  assert.match(verifier, /app\/api\/profiles\/me\/route\.ts/);
  assert.match(verifier, /app\/api\/profiles\/me\/experiences\/route\.ts/);
  assert.match(verifier, /planExperienceSportRequest/);
  assert.match(verifier, /replace_my_athlete_experiences/);
  assert.match(verifier, /PHASE_5F_RUNTIME_RELEASE_PASS/);
});
