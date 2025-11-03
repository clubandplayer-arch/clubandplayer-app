import { test, expect } from '@playwright/test';

test.describe('Auth smoke', () => {
  test('GET /logout -> 200', async ({ request }) => {
    const res = await request.get('/logout');
    expect(res.status()).toBe(200);
  });

  test('guest che apre /feed: redirect a /login OPPURE feed visibile', async ({ page }) => {
    await page.goto('/feed');

    // Accetta entrambe le policy del progetto:
    // - redirect a /login
    // - feed pubblico (heading "Feed")
    const redirected = await page
      .waitForURL(/\/login(\/|$)/, { timeout: 4000 })
      .then(() => true)
      .catch(() => false);

    if (!redirected) {
      await expect(page.getByRole('heading', { name: /feed/i }).first()).toBeVisible();
    }
  });
});
