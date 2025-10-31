// playwright.config.ts
import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.PORT || 3000);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: 'tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: BASE_URL, // necessario per request.get('/...') & page.goto('/...')
    trace: 'on-first-retry',
  },
  webServer: {
    // ❗ Avvia Next direttamente, così possiamo passare --port in modo affidabile
    command: `pnpm exec next dev --port ${PORT} --turbopack`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { ...process.env, PORT: String(PORT) },
  },
});

