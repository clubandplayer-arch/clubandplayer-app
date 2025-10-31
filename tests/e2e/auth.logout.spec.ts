// tests/e2e/auth.logout.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Auth smoke', () => {
  test('GET /logout -> 200', async ({ request }) => {
    const resp = await request.get('/logout');
    expect(resp.ok()).toBeTruthy();
  });

  test('guest che apre /feed vede la pagina di Login', async ({ page }) => {
    const resp = await page.goto('/feed', { waitUntil: 'domcontentloaded' });
    expect(resp?.ok()).toBeTruthy();

    // L’header "Login" è presente nella tua pagina di login
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
  });
});
