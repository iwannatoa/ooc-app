import { execSync } from 'node:child_process';
import { createTauriTest } from '@srsholmes/tauri-playwright';

const repoRoot = process.cwd();

// Ensure spawned `tauri dev` inherits headless-safe desktop defaults on Linux CI/WSL.
if (process.platform !== 'win32') {
  for (const key of [
    'DESKTOP_TRAY_ENABLED',
    'DESKTOP_SHORTCUT_ENABLED',
    'DESKTOP_UPDATER_ENABLED',
  ]) {
    if (!process.env[key]) {
      process.env[key] = 'false';
    }
  }
}

const tauriCommand =
  process.platform === 'win32'
    ? 'cmd.exe /c npm.cmd run tauri:dev --'
    : 'npm run tauri:dev --';

/** Release vite port / playwright socket between per-test Tauri spawns (Linux E2E). */
function cleanupTauriE2eSidecars() {
  if (process.platform === 'win32') return;
  try {
    execSync('rm -f /tmp/tauri-playwright.sock', { stdio: 'ignore' });
  } catch {
    // ignore
  }
  try {
    execSync('fuser -k 1420/tcp 2>/dev/null || true', {
      stdio: 'ignore',
      shell: '/bin/bash',
    });
  } catch {
    // ignore
  }
}

const { test: baseTest, expect } = createTauriTest({
  // Omit devUrl: tauri.conf.json already loads http://localhost:1420 in dev.
  // Re-navigating via the harness clears tauri-plugin-playwright injection (__PW_ACTIVE__).
  tauriCommand,
  tauriCwd: repoRoot,
  tauriFeatures: ['e2e-testing'],
  startTimeout: 240,
});

export const test = baseTest.extend({
  // Tear down vite/playwright artifacts after each test (test 2 needs a free port).
  _tauriE2eCleanup: [
    async ({}, use) => {
      await use();
      cleanupTauriE2eSidecars();
    },
    { auto: true },
  ],
  tauriPage: async ({ tauriPage }, use) => {
    // Socket readiness precedes webview registration on cold CI; retry until main is drivable.
    await expect(async () => {
      await tauriPage.waitForFunction(
        'document.readyState === "complete" && !!window.__PW_ACTIVE__',
        20_000
      );
    }).toPass({ timeout: 180_000 });
    await use(tauriPage);
  },
});

export { expect };
