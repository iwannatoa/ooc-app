import { createTauriTest } from '@srsholmes/tauri-playwright';
const repoRoot = process.cwd();

export const { test, expect } = createTauriTest({
  devUrl: 'http://localhost:1420/',
  // Match tauri-fixtures.mjs: `npm run` avoids `npm exec` CI failures on Linux.
  tauriCommand:
    process.platform === 'win32'
      ? 'cmd.exe /c npm.cmd run tauri:dev --'
      : 'npm run tauri:dev --',
  tauriCwd: repoRoot,
  tauriFeatures: ['e2e-testing'],
  startTimeout: 180,
});
