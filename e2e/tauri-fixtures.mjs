import { createTauriTest } from '@srsholmes/tauri-playwright';

const repoRoot = process.cwd();

const tauriCommand =
  process.platform === 'win32'
    ? 'cmd.exe /c npm.cmd exec tauri dev'
    : 'npm exec tauri dev';

export const { test, expect } = createTauriTest({
  devUrl: 'http://localhost:1420/',
  tauriCommand,
  tauriCwd: repoRoot,
  tauriFeatures: ['e2e-testing'],
  startTimeout: 180,
});
