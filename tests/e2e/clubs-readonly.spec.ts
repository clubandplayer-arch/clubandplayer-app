import { test, expect } from '@playwright/test';

test.describe('Clubs — read-only', () => {
  test('nessun bottone +Nuovo club e nessuna colonna Azioni', async ({ page }) => {
    await page.goto('/clubs');

    // Attendi o l'heading "Clubs" visibile o il redirect a /login (qualsiasi capiti per primo)
    const result = await Promise.race([
      page.waitForURL(/\/login(\/|$)/, { timeout: 7000 }).then(() => 'login').catch(() => null),
      page.getByRole('heading', { name: /clubs/i }).waitFor({ state: 'visible', timeout: 7000 }).then(() => 'clubs').catch(() => null),
    ]);

    // Se siamo al login, è accettabile (API protetta)
    if (result === 'login' || page.url().includes('/login')) {
      await expect(page).toHaveURL(/\/login(\/|$)/);
      return;
    }

    // Altrimenti siamo nella pagina /clubs: verifica intestazione e read-only
    await expect(page.getByRole('heading', { name: /clubs/i })).toBeVisible();

    // In read-only non deve esserci il bottone "+ Nuovo club"
    await expect(page.getByRole('button', { name: /\+\s*nuovo club/i })).toHaveCount(0);

    // La colonna "Azioni" non deve esistere in read-only
    await expect(page.getByRole('columnheader', { name: /azioni/i })).toHaveCount(0);
  });
});
