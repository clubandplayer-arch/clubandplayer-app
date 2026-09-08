import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const plan = readFileSync(new URL('../../docs/european-expansion/phase-5f-f-profile-primary-sport-canary-plan.md', import.meta.url), 'utf8');

test('5F-F canary plan is fail-closed before deploy and remote write', () => {
  for (const prerequisite of ['deploy', 'account canary', 'snapshot', 'ripristino', 'autorizzazione esplicita']) {
    assert.match(plan, new RegExp(prerequisite, 'i'));
  }
  assert.match(plan, /READY_FOR_HUMAN_REVIEW/);
  assert.match(plan, /DEPLOY E WRITE REMOTE NON ESEGUITI/);
});

test('5F-F scopes the canary to the atomic primary-sport group and stable errors', () => {
  for (const field of ['sport', 'sport_id', 'sport_discipline_id', 'sport_variant_id']) {
    assert.ok(plan.includes(field));
  }
  for (const code of ['invalid_reference', '400', '403', '500']) assert.ok(plan.includes(code));
  assert.match(plan, /owner-scoped/);
});

test('5F-F does not mistake reset for restoration of a legacy-only baseline', () => {
  assert.match(plan, /reset API come rollback/i);
  assert.match(plan, /sport="Calcio".*ID null/);
  assert.match(plan, /profilo disposable|ripristino amministrativo/i);
  assert.match(plan, /non autorizza a trasformarlo né costituisce un backfill/i);
});
