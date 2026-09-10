import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const script=readFileSync('scripts/diagnose-phase-5g-canary-opportunity-create.sh','utf8');

test('Opportunity diagnostic consumes only preserved local evidence',()=>{
  assert.match(script,/phase-5g-canary-opportunity-payload\.json/);
  assert.match(script,/phase-5g-canary-opportunity-create\.json/);
  assert.doesNotMatch(script,/\bcurl\b|\bwget\b|\bpsql\b/);
});

test('Opportunity diagnostic bounds error output and detects only ID presence',()=>{
  assert.ok(script.includes('.[0:80]'));
  assert.ok(script.includes('.[0:160]'));
  assert.match(script,/response_id/);
  assert.match(script,/payload_sha256/);
  assert.match(script,/response_sha256/);
  assert.doesNotMatch(script,/cat\s+.*(PAYLOAD|RESPONSE)|set -e|set -u/);
});
