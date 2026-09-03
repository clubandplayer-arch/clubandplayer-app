import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const runbook = readFileSync('supabase/runbooks/manual/delete_four_misclassified_accounts.sql', 'utf8');

test('manual account deletion is atomic and targets exactly the four supplied identities', () => {
  assert.match(runbook, /^begin;/m);
  assert.match(runbook, /^commit;/m);
  assert.equal(runbook.match(/@gmail\.com/g)?.length, 4);
  assert.equal(runbook.match(/'[0-9a-f]{8}-[0-9a-f-]{27}'/g)?.length, 4);
});

test('manual account deletion fails closed on identity/type mismatches and verifies removal', () => {
  assert.match(runbook, /lower\(u\.email\) = lower\(t\.email\)/);
  assert.match(runbook, /expected_account_type/);
  assert.match(runbook, /raise exception 'Deletion aborted; target verification failed/);
  assert.match(runbook, /delete from public\.profiles/);
  assert.match(runbook, /delete from auth\.users/);
  assert.match(runbook, /one or more target accounts still exist/);
});
