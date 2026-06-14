#!/usr/bin/env node
import { spawn } from 'node:child_process';

const port = process.env.FLASK_PORT?.trim() || '5000';

const child = spawn(
  process.execPath,
  ['scripts/python-runner.mjs', 'server/run.py'],
  {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      FLASK_PORT: port,
      FLASK_ENV: process.env.FLASK_ENV || 'development',
      LOG_LEVEL_DEBUG: process.env.LOG_LEVEL_DEBUG || 'true',
    },
  }
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
