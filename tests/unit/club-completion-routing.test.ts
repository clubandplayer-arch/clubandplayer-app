import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { NextRequest } from 'next/server';

import { middleware } from '../../middleware';

test('whoami hydrates canonical Club residence before calculating completion', () => {
  const route = readFileSync('app/api/auth/whoami/route.ts', 'utf8');
  assert.match(route, /select\('id,account_type,type,status/);
  assert.match(route, /if \(accountType === 'club' && completionProfile\?\.id\)/);
  assert.match(route, /from\('profile_preferences'\)/);
  assert.match(route, /select\('residence_country_id,residence_geo_area_id'\)/);
  assert.match(route, /completionProfile = \{ \.\.\.completionProfile, \.\.\.\(preference \?\? \{\}\) \}/);
});

test('an incomplete authenticated Club can always reach logout', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    user: { id: 'club-user' },
    role: 'club',
    profile: { is_complete: false, completion_path: '/club/profile' },
  }), { status: 200, headers: { 'content-type': 'application/json' } });

  try {
    const response = await middleware(new NextRequest('https://www.clubandplayer.com/logout'));
    assert.equal(response.headers.get('x-middleware-next'), '1');
    assert.equal(response.headers.get('location'), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('an incomplete Club is still redirected from protected pages to its completion form', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    user: { id: 'club-user' },
    role: 'club',
    profile: { is_complete: false, completion_path: '/club/profile' },
  }), { status: 200, headers: { 'content-type': 'application/json' } });

  try {
    const response = await middleware(new NextRequest('https://www.clubandplayer.com/feed'));
    assert.equal(response.headers.get('location'), 'https://www.clubandplayer.com/club/profile');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
