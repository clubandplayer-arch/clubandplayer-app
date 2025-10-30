import { test, expect } from '@playwright/test';

test('home risponde (eventuale redirect al login)', async ({ page }) => {
  const resp = await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(resp?.ok()).toBeTruthy(); // dopo eventuale redirect deve essere 200
});

test('login pagina raggiungibile', async ({ page }) => {
  const resp = await page.goto('/login', { waitUntil: 'domcontentloaded' });
  expect(resp?.status()).toBe(200);
});

test('/clubs restituisce 404 (route disabilitata)', async ({ page }) => {
  const resp = await page.goto('/clubs', { waitUntil: 'domcontentloaded' });
  // Next.js notFound() risponde 404
  expect(resp?.status()).toBe(404);
});

test('API health risponde 200', async ({ request }) => {
  const resp = await request.get('/api/health', { failOnStatusCode: false });
  expect(resp.status()).toBe(200);
});
