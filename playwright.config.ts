import { defineConfig } from '@playwright/test';

const baseURL =
  process.env.PW_BASE_URL ||
  process.env.BASE_URL ||
  'http://127.0.0.1:3010';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  use: {
    baseURL,
    trace: 'on-first-retry',
    headless: true,
  },
  webServer: {
    command: 'pnpm run dev',
    url: 'http://127.0.0.1:3010',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { PORT: '3010', HOSTNAME: '127.0.0.1' },
  },
});
