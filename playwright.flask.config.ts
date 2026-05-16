import { defineConfig, devices } from '@playwright/test';

const previewPort = Number(process.env.PLAYWRIGHT_PREVIEW_PORT) || 4173;
const flaskPort = (process.env.FLASK_E2E_PORT || '18765').trim();
const baseURL = `http://127.0.0.1:${previewPort}`;
const flaskBaseURL = `http://127.0.0.1:${flaskPort}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/flask-integration.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node scripts/e2e-flask-webserver.mjs',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: {
      FLASK_E2E_PORT: flaskPort,
      PLAYWRIGHT_PREVIEW_PORT: String(previewPort),
      VITE_FLASK_BASE_URL: flaskBaseURL,
    },
  },
});
