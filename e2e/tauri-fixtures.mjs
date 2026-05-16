import { createTauriTest } from '@srsholmes/tauri-playwright';

const repoRoot = process.cwd();

// Use npm scripts (not `npm exec`): tauri-playwright spawns without a shell,
// and `npm exec` can exit non‑zero under Linux CI whereas `npm run … --`
// reliably forwards `--features …` added by the harness.
const tauriCommand =
  process.platform === 'win32'
    ? 'cmd.exe /c npm.cmd run tauri:dev --'
    : 'npm run tauri:dev --';

export const { test, expect } = createTauriTest({
  devUrl: 'http://localhost:1420/',
  tauriCommand,
  tauriCwd: repoRoot,
  tauriFeatures: ['e2e-testing'],
  startTimeout: 180,
});
