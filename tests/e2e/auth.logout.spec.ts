// tests/e2e/auth.logout.spec.ts
import { test, expect } from '@playwright/test';

/**
 * Auth smoke:
 * - /logout risponde 200 (pagina esiste)
 * - /feed da guest porta alla pagina di Login (gating attivo)
 *
 * Test robusti: non dipendono da cookie/sessione preesistente.
 */
test.describe('Auth smoke', () => {
  test('GET /logout -> 200', async ({ request }) => {
    const resp = await request.get('/logout');
    expect(resp.ok()).toBeTruthy();
  });

  test('guest che apre /feed vede la pagina di Login', async ({ page }) => {
    const resp = await page.goto('/feed', { waitUntil: 'domcontentloaded' });
    expect(resp?.ok()).toBeTruthy();

    // Verifichiamo che sia la Login page:
    // accettiamo due segnali stabili: titolo "Login" o il pulsante "Entra"
    const sawLoginTitle = await page.getByRole('heading', { name: /login/i }).first().isVisible().catch(() => false);
const sawEntraBtn = await page.getByRole('button', { name: /entra/i }).first().isVisible().catch(() => false);
expect(sawLoginTitle || sawEntraBtn).toBeTruthy();
  });
});
