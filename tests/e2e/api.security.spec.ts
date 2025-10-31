import { test, expect } from '@playwright/test';

test.describe('API security - non authenticated', () => {
  test('GET /api/clubs → 401', async ({ request }) => {
    const r = await request.get('/api/clubs');
    expect(r.status()).toBe(401);
    const j = await r.json().catch(() => ({}));
    expect(j?.error ?? '').toMatch(/unauthorized/i);
  });

  test('GET /api/clubs/[id] → 401', async ({ request }) => {
    const r = await request.get('/api/clubs/some-id');
    expect(r.status()).toBe(401);
  });

  test('POST /api/clubs → 401', async ({ request }) => {
    const r = await request.post('/api/clubs', {
      data: { name: 'Test Club' },
    });
    expect(r.status()).toBe(401);
  });
});
