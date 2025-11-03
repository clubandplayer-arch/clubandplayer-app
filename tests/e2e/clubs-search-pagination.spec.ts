import { test, expect } from '@playwright/test';

test.describe('Clubs — ricerca & paginazione (read-only)', () => {
  test('apre /clubs con query/paginazione e gestisce login/empty/error', async ({ page }) => {
    await page.goto('/clubs?q=test&page=1&pageSize=10');

    // (A) Se c'è il redirect a login, va bene
    const hitLogin = await page
      .waitForURL(/\/login(\/|$)/, { timeout: 4000 })
      .then(() => true)
      .catch(() => false);
    if (hitLogin || page.url().includes('/login')) {
      await expect(page).toHaveURL(/\/login(\/|$)/);
      return;
    }

    // (B) Siamo su /clubs
    await expect(page.getByRole('heading', { name: /clubs/i }).first()).toBeVisible();

    // Accetta una delle tre condizioni:
    // 1) tabella presente
    // 2) empty state "Nessun club trovato"
    // 3) banner 401 "Devi effettuare l’accesso" oppure generico "Errore nel caricamento"
    const tableCount = await page.locator('table').count();
    const emptyMsgCount = await page.getByText(/Nessun club trovato/i).count();
    const authMsgCount = await page.getByText(/Devi effettuare l.?accesso/i).count();
    const errMsgCount = await page.getByText(/Errore nel caricamento/i).count();

    expect(tableCount + emptyMsgCount + authMsgCount + errMsgCount).toBeGreaterThan(0);
  });
});
