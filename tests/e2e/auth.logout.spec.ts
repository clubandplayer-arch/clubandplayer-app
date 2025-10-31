// tests/e2e/auth.logout.spec.ts
import { test, expect } from '@playwright/test';

const BASE =
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.BASE_URL ||
  'http://localhost:3010';

test.describe('Auth smoke', () => {
  test('GET /logout -> 200', async ({ request }) => {
    const resp = await request.get(`${BASE}/logout`);
    expect(resp.ok()).toBeTruthy();
  });

  test('guest che apre /feed vede la pagina di Login', async ({ page }) => {
    const resp = await page.goto(`${BASE}/feed`, { waitUntil: 'domcontentloaded' });
    expect(resp?.ok()).toBeTruthy();

    // Verifica redirect alla login
    await expect(page).toHaveURL(/\/login(\?|$)/i);
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
  });
});
