import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const route = readFileSync('app/api/env/route.ts', 'utf8');

test('environment diagnostic reports refs, source, SHA and mode without secrets', () => {
  for (const field of [
    'publicProjectRef', 'serverProjectRef', 'serverUrlSource', 'projectRefsMatch',
    'anonKeysMatch', 'serviceRoleConfigured', 'sha', 'mode',
  ]) assert.match(route, new RegExp(field));
  assert.match(route, /SUPABASE_URL' : 'NEXT_PUBLIC_SUPABASE_URL_FALLBACK/);
  assert.match(route, /VERCEL_GIT_COMMIT_SHA/);
  assert.doesNotMatch(route, /serviceRole:\s*process\.env|anonKey:\s*process\.env|connectionString/i);
});

test('project refs are accepted only from canonical Supabase hosts', () => {
  assert.match(route, /\^\(\[a-z0-9\]\+\)\\\.supabase\\\.co\$/);
  assert.match(route, /new URL\(value\)\.hostname/);
});
