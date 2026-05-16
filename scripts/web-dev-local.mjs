#!/usr/bin/env node
import { spawn } from 'node:child_process';

const apiBaseUrl =
  process.env.VITE_FLASK_BASE_URL?.trim() || 'http://127.0.0.1:5000';

const child = spawn('npx', ['vite'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    VITE_FLASK_BASE_URL: apiBaseUrl,
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
