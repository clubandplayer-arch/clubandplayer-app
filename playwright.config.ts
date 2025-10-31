// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.PORT ?? '3010';
// Usa 127.0.0.1 per evitare problemi IPv6 (::1)
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },

  // Avvia Next in dev e riusa il server se è già su quella porta
  webServer: {
    command: `pnpm exec next dev -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: true,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 120_000,
    env: {
      NEXT_TELEMETRY_DISABLED: '1',
      NODE_ENV: 'development',
    },
  },

  // facoltativo: profilo Chromium base
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
