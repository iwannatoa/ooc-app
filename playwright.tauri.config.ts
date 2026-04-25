import { defineConfig } from '@playwright/test';

/** Desktop E2E: spawns real Tauri + system webview via tauri-plugin-playwright (see e2e/tauri-fixtures.ts). */
export default defineConfig({
  testDir: './e2e',
  testMatch: 'tauri-desktop.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 0 : 0,
  workers: 1,
  timeout: 240_000,
  expect: { timeout: 60_000 },
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    trace: 'on-first-retry',
  },
  projects: [{ name: 'tauri-desktop', use: { mode: 'tauri' as const } }],
});
