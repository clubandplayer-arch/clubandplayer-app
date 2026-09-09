import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const verifier = readFileSync('scripts/verify-phase-5g-runtime-release.sh', 'utf8');

test('5G runtime verifier pins the implementation ancestor and deployed schema checksum', () => {
  assert.match(verifier, /RUNTIME_REVISION='2943f2b'/);
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
});
