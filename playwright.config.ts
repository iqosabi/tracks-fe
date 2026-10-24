import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 240_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    actionTimeout: 30_000,
    navigationTimeout: 15_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
          args: ['--no-sandbox', '--disable-dev-shm-usage'],
        }
      : {},
  },
  webServer: {
    command: 'npm start',
    port: 4173,
    reuseExistingServer: false,
    env: {
      PORT: '4173',
      CARTO_API_KEY: 'cb1_e2e_config',
      API_BASE_URL: 'https://tracksmon-dev-api.aestaworks.com/api/v1',
    },
  },
});
