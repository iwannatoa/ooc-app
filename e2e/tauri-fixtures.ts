import { execSync } from 'node:child_process';
import { createTauriTest } from '@srsholmes/tauri-playwright';
const repoRoot = process.cwd();

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
  tauriCommand:
    process.platform === 'win32'
      ? 'cmd.exe /c npm.cmd run tauri:dev --'
      : 'npm run tauri:dev --',
  tauriCwd: repoRoot,
  tauriFeatures: ['e2e-testing'],
  startTimeout: 240,
});

export const test = baseTest.extend({
  _tauriE2eCleanup: [
    async ({}, use) => {
      await use();
      cleanupTauriE2eSidecars();
    },
    { auto: true },
  ],
  tauriPage: async ({ tauriPage }, use) => {
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
