#!/usr/bin/env node
/**
 * Playwright webServer entry: start Flask on a fixed port, wait for /api/health,
 * build the web bundle with VITE_FLASK_BASE_URL, then run `vite preview`.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const flaskPort = (process.env.FLASK_E2E_PORT || '18765').trim();
const previewPort = (process.env.PLAYWRIGHT_PREVIEW_PORT || '4173').trim();
const flaskBase = `http://127.0.0.1:${flaskPort}`;

const runCmd = async (command, args, options) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
    });
    child.on('error', reject);
  });

const waitForHealth = async (base, maxAttempts = 90) => {
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const res = await fetch(`${base}/api/health`);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Flask not healthy at ${base}/api/health`);
};

const flask = spawn(process.execPath, ['scripts/python-runner.mjs', 'server/run.py'], {
  cwd: root,
  env: {
    ...process.env,
    FLASK_PORT: flaskPort,
    FLASK_ENV: 'development',
  },
  stdio: 'inherit',
});

const shutdown = () => {
  try {
    flask.kill('SIGTERM');
  } catch {
    /* ignore */
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

try {
  await waitForHealth(flaskBase);
  await runCmd('npm', ['run', 'build'], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, VITE_FLASK_BASE_URL: flaskBase },
  });

  const preview = spawn(
    'npx',
    ['vite', 'preview', '--host', '127.0.0.1', '--port', previewPort, '--strictPort'],
    {
      cwd: root,
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, VITE_FLASK_BASE_URL: flaskBase },
    }
  );

  preview.on('exit', (code) => {
    shutdown();
    process.exit(code ?? 1);
  });
} catch (err) {
  console.error(err);
  shutdown();
  process.exit(1);
}
