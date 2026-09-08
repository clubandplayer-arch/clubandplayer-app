import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const plan = readFileSync(new URL('../../docs/european-expansion/phase-5f-f-profile-primary-sport-canary-plan.md', import.meta.url), 'utf8');

test('5F-F canary plan is fail-closed before deploy and remote write', () => {
  for (const prerequisite of ['deploy', 'account canary', 'snapshot', 'ripristino', 'autorizzazione esplicita']) {
    assert.match(plan, new RegExp(prerequisite, 'i'));
  }
  assert.match(plan, /READY_FOR_EXPLICIT_REMOTE_AUTHORIZATION/);
  assert.match(plan, /NESSUNA OPERAZIONE REMOTA ESEGUITA/);
});

test('5F-F selects Production and pins the reviewed runtime revision', () => {
  assert.match(plan, /ambiente proposto è \*\*Production\*\*/);
  assert.match(plan, /72b8f1e242a9a4dab81c5770ad0090585e2097fa/);
  assert.match(plan, /merge-base --is-ancestor/);
  assert.match(plan, /Preview resta non verificato/);
});

test('5F-F uses only a disposable profile and accounts for trigger side effects', () => {
  assert.match(plan, /profilo di test dedicato e disposable/);
  assert.match(plan, /profilo reale.*è escluso/);
  for (const effect of ['updated_at', 'profile_visibility_status', 'notifica', 'role', 'location', 'moderazione']) {
    assert.match(plan, new RegExp(effect, 'i'));
  }
  assert.match(plan, /nove trigger/);
  assert.match(plan, /teardown/);
});

test('5F-F defines executable commands and stop conditions without executing them', () => {
  for (const command of ['git status --short', 'curl --fail-with-body', '-X PATCH']) assert.ok(plan.includes(command));
  assert.match(plan, /Fermarsi senza retry/);
  assert.match(plan, /non usare `supabase db push`, migration repair/);
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
  assert.match(plan, /sport="Calcio".*riferimenti canonici null/);
  assert.match(plan, /profilo.*disposable/i);
  assert.match(plan, /non sarà eseguito alcun backfill/i);
});
