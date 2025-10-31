import { test, expect } from '@playwright/test';

const BASE = process.env.BASE ?? 'http://127.0.0.1:3010';

test.describe('Auth smoke', () => {
  test('GET /logout -> 200', async ({ request }) => {
    const resp = await request.get(`${BASE}/logout`);
    expect(resp.ok()).toBeTruthy();
  });

  test('guest che apre /feed viene mandato alla Login', async ({ page }) => {
    // Mi assicuro di essere guest
    await page.goto(`${BASE}/logout`);
    await page.context().clearCookies();

    // Apro /feed (server risponde 200, poi AuthGuard fa redirect client-side)
    const resp = await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded' });
    expect(resp?.ok()).toBeTruthy();

    // ✅ Attendo la URL /login (redirect client-side) e la verifico
    await page.waitForURL(/\/login(?:$|\?)/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/login(?:$|\?)/);
  });
});
