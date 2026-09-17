import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { middleware } from '../../middleware';

test('child safety remains public on both hosts when the auth service fails', async (t) => {
  const auth = t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('Auth service unavailable');
  });

  for (const host of ['clubandplayer.com', 'www.clubandplayer.com']) {
    for (const path of ['/legal/child-safety', '/legal/child-safety/']) {
      for (const cookie of ['', 'session=existing-session']) {
        const response = await middleware(new NextRequest(`https://${host}${path}`, { headers: { cookie } }));
        assert.equal(response.headers.get('x-middleware-next'), '1');
        assert.equal(response.headers.get('location'), null);
      }
    }
  }
  assert.equal(auth.mock.callCount(), 0);
});

test('the public exception does not bypass protected admin routes', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ user: null }));
  const response = await middleware(new NextRequest('https://www.clubandplayer.com/admin/reports'));
  assert.equal(new URL(response.headers.get('location')!).pathname, '/login');
});

test('other routes still enforce profile completion', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({
    user: { id: 'test-user' },
    role: 'athlete',
    profile: { is_complete: false, completion_path: '/player/profile' },
  }));
  const response = await middleware(new NextRequest('https://www.clubandplayer.com/feed'));
  assert.equal(new URL(response.headers.get('location')!).pathname, '/player/profile');
});
