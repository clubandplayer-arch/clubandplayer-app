import { test, expect } from '@playwright/test';

test.describe('Clubs (read-only)', () => {
  test('apre /clubs e non mostra il bottone di creazione (oppure chiede login)', async ({ page }) => {
    await page.goto('/clubs');

    // Se siamo stati rimandati al login, consideriamo valido (API richiede auth)
    if (page.url().includes('/login')) {
      await expect(page).toHaveURL(/\/login/);
      return;
    }

    // Altrimenti siamo sulla pagina clubs: verifica intestazione
    await expect(page.getByRole('heading', { name: /clubs/i })).toBeVisible();

    // In read-only non deve esserci il bottone "+ Nuovo club"
    const createBtn = page.getByRole('button', { name: /\+\s*nuovo club/i });
    await expect(createBtn).toHaveCount(0);
  });
});
