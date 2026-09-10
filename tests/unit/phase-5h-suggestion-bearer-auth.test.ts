import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const auth = readFileSync('lib/api/auth.ts', 'utf8');
const discover = readFileSync('app/api/follows/suggestions/route.ts', 'utf8');
const whoToFollow = readFileSync('app/api/suggestions/who-to-follow/route.ts', 'utf8');

test('optional auth supports cookie and bearer clients without changing anonymous behavior', () => {
  assert.match(auth, /export async function resolveAuthContext/);
  assert.match(auth, /getSupabaseServerClientWithAccessToken\(bearerToken\)/);
  assert.match(auth, /const ctx = await resolveAuthContext\(req\)/);
  assert.match(discover, /const auth = await resolveAuthContext\(req\)/);
  assert.match(discover, /code: 'AUTH_REQUIRED'/);
  assert.match(whoToFollow, /const auth = await resolveAuthContext\(req\)/);
  assert.match(whoToFollow, /return successResponse\(\{ suggestions: \[\] as Suggestion\[\] \}\)/);
});
