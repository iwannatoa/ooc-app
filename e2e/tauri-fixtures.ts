import { createTauriTest } from '@srsholmes/tauri-playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export const { test, expect } = createTauriTest({
  devUrl: 'http://localhost:1420/',
  tauriCommand: 'npm exec tauri dev',
  tauriCwd: repoRoot,
  tauriFeatures: ['e2e-testing'],
  startTimeout: 180,
});
