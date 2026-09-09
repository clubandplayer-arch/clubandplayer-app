import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const wrapper = readFileSync('scripts/verify-phase-5f-canary-teardown.sh', 'utf8');

test('5F teardown wrapper cannot terminate the caller and preserves private failure evidence', () => {
  assert.match(wrapper, /set \+e/);
  assert.match(wrapper, /read -rsp/);
  assert.match(wrapper, /2>"\$TEARDOWN_STDERR"/);
  assert.match(wrapper, /PHASE_5F_CANARY_STOP/);
  assert.match(wrapper, /PHASE_5F_CANARY_TEARDOWN_VERIFIED/);
  assert.doesNotMatch(wrapper, /set -e|set -x|echo "\$PRODUCTION_DATABASE_URL"/);
});
