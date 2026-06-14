import { execSync } from 'node:child_process';
import { createTauriTest } from '@srsholmes/tauri-playwright';

const repoRoot = process.cwd();

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
  startTimeout: 180,
});

export const test = baseTest.extend({
  // Runs before each test's tauriPage spawn so the second test gets a free dev port.
  _tauriE2eCleanup: [
    async ({}, use) => {
      cleanupTauriE2eSidecars();
      await use();
      cleanupTauriE2eSidecars();
    },
    { auto: true },
  ],
  tauriPage: async ({ tauriPage }, use) => {
    await tauriPage.waitForFunction(
      'document.readyState === "complete" && !!window.__PW_ACTIVE__',
      120_000
    );
    await use(tauriPage);
  },
});

export { expect };
