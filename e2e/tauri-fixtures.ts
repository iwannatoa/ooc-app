import { createTauriTest } from '@srsholmes/tauri-playwright';
const repoRoot = process.cwd();

export const { test, expect } = createTauriTest({
  devUrl: 'http://localhost:1420/',
  tauriCommand: 'npm exec tauri dev',
  tauriCwd: repoRoot,
  tauriFeatures: ['e2e-testing'],
  startTimeout: 180,
});
