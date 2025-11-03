import { test, expect } from '@playwright/test';

test.describe('Clubs — ricerca & paginazione (read-only)', () => {
  test('apre /clubs con query/paginazione e gestisce eventuale login', async ({ page }) => {
    await page.goto('/clubs?q=test&page=1&pageSize=10');

    // Attendi o redirect a /login o intestazione "Clubs"
    const first = await Promise.race([
      page.waitForURL(/\/login(\/|$)/, { timeout: 7000 }).then(() => 'login').catch(() => null),
      page.getByRole('heading', { name: /clubs/i }).first().waitFor({ state: 'visible', timeout: 7000 }).then(() => 'clubs').catch(() => null),
    ]);

    if (first === 'login' || page.url().includes('/login')) {
      await expect(page).toHaveURL(/\/login(\/|$)/);
      return; // ok anche se l’API richiede login
    }

    // Siamo su /clubs
    await expect(page.getByRole('heading', { name: /clubs/i }).first()).toBeVisible();

    // In read-only: nessun bottone di creazione
    await expect(page.getByRole('button', { name: /\+\s*nuovo club/i })).toHaveCount(0);

    // Tabella presente (non vincoliamo ai dati reali)
    await expect(page.locator('table')).toHaveCount(1);
  });
});
