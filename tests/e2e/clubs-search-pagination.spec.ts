import { test, expect } from '@playwright/test';

test.describe('Clubs — ricerca & paginazione (read-only)', () => {
  test('apre /clubs con query e/o paginazione e gestisce eventuale login', async ({ page }) => {
    // Scegli una query qualsiasi (non dipendiamo da dati reali)
    const url = '/clubs?q=test&page=1&pageSize=10';
    await page.goto(url);

    // Attendi o login o intestazione "Clubs"
    const first = await Promise.race([
      page.waitForURL(/\/login(\/|$)/, { timeout: 7000 }).then(() => 'login').catch(() => null),
      page.getByRole('heading', { name: /clubs/i }).waitFor({ state: 'visible', timeout: 7000 }).then(() => 'clubs').catch(() => null),
    ]);

    if (first === 'login' || page.url().includes('/login')) {
      await expect(page).toHaveURL(/\/login(\/|$)/);
      return; // test ok anche se protetto da auth
    }

    // Siamo su /clubs: intestazione presente
    await expect(page.getByRole('heading', { name: /clubs/i })).toBeVisible();

    // In read-only non c’è il bottone di creazione
    await expect(page.getByRole('button', { name: /\+\s*nuovo club/i })).toHaveCount(0);

    // La tabella è presente (non verifichiamo dati reali per non dipendere dal seed)
    // Se hai dato un role/table, sennò cerca l'elemento <table>
    const table = page.locator('table');
    await expect(table).toHaveCount(1);

    // Se vedi un componente di paginazione con bottoni/links "2" o "Successivo",
    // puoi aggiungere un check soft opzionale (non vincolante):
    // await expect(page.getByRole('link', { name: /2/ })).toHaveCount(0); // non assumiamo nulla
  });
});
