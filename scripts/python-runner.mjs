#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const cliArgs = process.argv.slice(2);
if (cliArgs.length === 0) {
  console.error('Usage: node scripts/python-runner.mjs <python args...>');
  process.exit(1);
}

const candidates = [];
const customPython = process.env.PYTHON_BIN?.trim();
if (customPython) {
  candidates.push({ command: customPython, preArgs: [] });
}

if (process.platform === 'win32') {
  candidates.push(
    { command: 'python', preArgs: [] },
    { command: 'py', preArgs: ['-3'] }
  );
} else {
  candidates.push(
    { command: 'python3', preArgs: [] },
    { command: 'python', preArgs: [] }
  );
}

function probe(candidate) {
  const result = spawnSync(candidate.command, [...candidate.preArgs, '--version'], {
    stdio: 'ignore',
    shell: false,
  });
  return result.status === 0;
}

const selected = candidates.find(probe);
if (!selected) {
  console.error(
    'No usable Python interpreter found. Set PYTHON_BIN or install python3/python.'
  );
  process.exit(1);
}

const result = spawnSync(
  selected.command,
  [...selected.preArgs, ...cliArgs],
  {
    stdio: 'inherit',
    shell: false,
    env: process.env,
  }
);

if (typeof result.status === 'number') {
  process.exit(result.status);
}
process.exit(1);
