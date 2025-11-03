import { test, expect } from '@playwright/test';

test.describe('Clubs — read-only', () => {
  test('nessun bottone +Nuovo club e nessuna colonna Azioni', async ({ page }) => {
    await page.goto('/clubs');

    // Se l’API richiede auth e redirige a /login, va bene lo stesso
    if (page.url().includes('/login')) {
      await expect(page).toHaveURL(/\/login/);
      return;
    }

    // Intestazione
    await expect(page.getByRole('heading', { name: /clubs/i })).toBeVisible();

    // Bottone di creazione assente
    await expect(page.getByRole('button', { name: /\+\s*nuovo club/i })).toHaveCount(0);

    // La colonna "Azioni" non è presente
    await expect(page.getByRole('columnheader', { name: /azioni/i })).toHaveCount(0);
  });
});
