import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const verifier = readFileSync('scripts/verify-phase-5g-runtime-release.sh', 'utf8');

test('5G runtime verifier pins the shared implementation ancestor and deployed schema checksum', () => {
  assert.match(verifier, /RUNTIME_REVISION='905763b8'/);
  assert.match(verifier, /Usage: %s <remote-candidate-sha>/);
  assert.match(verifier, /CANDIDATE="\$1"/);
  assert.doesNotMatch(verifier, /CANDIDATE="\$\{1:-HEAD\}"/);
  assert.match(verifier, /RUNTIME_COMMIT="\$\(git rev-parse --verify/);
  assert.match(verifier, /git merge-base --is-ancestor/);
  assert.match(verifier, /bf6eb4a7f8bc202c78ab3759c3b1b5ea80610db276672dd6d3719792b4ab7c9f/);
  assert.match(verifier, /git show "\$COMMIT:\$MIGRATION" \| sha256sum/);
});

test('5G runtime verifier inspects both Opportunity routes and both Application reads', () => {
  for (const path of [
    'app/api/opportunities/route.ts',
    'app/api/opportunities/[id]/route.ts',
    'app/api/applications/me/route.ts',
    'app/api/applications/received/route.ts',
  ]) assert.ok(verifier.includes(path));
  assert.match(verifier, /PHASE_5G_RUNTIME_RELEASE_PASS/);
  assert.match(verifier, /toOpportunityDbValue\(normalized, 'fallback'\)/);
  assert.match(verifier, /update\.gender_code = genderCode/);
});
