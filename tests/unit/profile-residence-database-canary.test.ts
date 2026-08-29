import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync(
  new URL('../../supabase/migrations/20261204121500_profile_residence_database_canary.sql', import.meta.url),
  'utf8',
);
const rollback = readFileSync(
  new URL('../../supabase/rollbacks/20261204121500_profile_residence_database_canary.sql', import.meta.url),
  'utf8',
);
const harness = readFileSync(
  new URL('../../scripts/test-profile-residence-rpc-runtime.sh', import.meta.url),
  'utf8',
);
const seed = readFileSync(
  new URL('../integration/sql/profile-residence-canary-runtime-seed.sql', import.meta.url),
  'utf8',
);

test('database canary is empty by default, RLS-protected and user-managed writes are denied', () => {
  assert.match(sql, /create table public\.profile_residence_write_canary_users/i);
  assert.match(sql, /user_id uuid primary key references auth\.users\(id\) on delete cascade/i);
  assert.match(sql, /alter table public\.profile_residence_write_canary_users enable row level security/i);
  assert.match(sql, /for select\s+to authenticated\s+using \(user_id = auth\.uid\(\)\)/i);
  assert.match(sql, /revoke all on table public\.profile_residence_write_canary_users from authenticated/i);
  assert.match(sql, /grant select on table public\.profile_residence_write_canary_users to authenticated/i);
  assert.doesNotMatch(sql, /grant (?:insert|update|delete|all)[\s\S]*profile_residence_write_canary_users[\s\S]*to authenticated/i);
  assert.doesNotMatch(sql, /insert into public\.profile_residence_write_canary_users/i);
});

test('RPC checks auth uid membership before profile lookup and keeps execution disabled', () => {
  const membershipCheck = sql.indexOf('from public.profile_residence_write_canary_users canary');
  const profileLookup = sql.indexOf('from public.profiles p');
  assert.ok(membershipCheck > 0 && membershipCheck < profileLookup);
  assert.match(sql, /where canary\.user_id = v_uid/i);
  assert.match(sql, /profile residence write is not enabled for authenticated user/i);
  assert.match(sql, /security invoker/i);
  assert.match(sql, /revoke all on function public\.update_my_profile_residence\(uuid, uuid\) from authenticated/i);
  assert.doesNotMatch(sql, /grant execute[\s\S]*to authenticated/i);
});

test('repository migration has no production UUID seed and runtime memberships are synthetic fixtures only', () => {
  assert.doesNotMatch(sql, /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
  assert.match(seed, /Synthetic runtime-only memberships/);
  assert.match(seed, /40000000-0000-0000-0000-000000000001/);
});


test('runtime installs and seeds the canary before activation, with a fail-closed rollback artifact', () => {
  const install = harness.indexOf('20261204121500_profile_residence_database_canary.sql');
  const seedStep = harness.indexOf('profile-residence-canary-runtime-seed.sql');
  const activation = harness.indexOf('supabase/runbooks/manual/20261204122000_enable_profile_residence_rpc.sql');
  assert.ok(install > 0 && install < seedStep && seedStep < activation);
  assert.match(rollback, /revoke all on function public\.update_my_profile_residence\(uuid, uuid\) from authenticated/i);
  assert.match(rollback, /drop function if exists public\.update_my_profile_residence\(uuid, uuid\)/i);
  assert.match(rollback, /drop table if exists public\.profile_residence_write_canary_users/i);
  assert.doesNotMatch(rollback, /insert\s+into|update\s+public\.|delete\s+from/i);
});
