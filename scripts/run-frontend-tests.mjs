import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const extraArgs = process.argv.slice(2);

function normalizeWindowsDriveLetter(p) {
  if (process.platform !== 'win32' || p.length < 2 || p[1] !== ':') {
    return p;
  }
  return p[0].toUpperCase() + p.slice(1);
}

if (process.platform === 'win32') {
  const dir = normalizeWindowsDriveLetter(repoRoot);
  const drive = dir.slice(0, 2);
  const vitestArgs = ['run', '--coverage', ...extraArgs];
  const vitestCmd = vitestArgs.map((a) => (/\s/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a)).join(' ');
  const result = spawnSync('cmd.exe', ['/d', '/c', `${drive} && cd /d ${dir} && npx vitest ${vitestCmd}`], {
    stdio: 'inherit',
    env: process.env,
  });
  process.exit(result.status === null ? 1 : result.status);
}

const vitestEntry = resolve(repoRoot, 'node_modules', 'vitest', 'vitest.mjs');
const result = spawnSync(process.execPath, [vitestEntry, 'run', '--coverage', ...extraArgs], {
  stdio: 'inherit',
  cwd: repoRoot,
  env: process.env,
});

process.exit(result.status === null ? 1 : result.status);
