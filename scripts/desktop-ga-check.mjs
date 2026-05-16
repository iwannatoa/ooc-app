#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const resourcesDir = path.join(root, 'src-tauri', 'resources');
const tauriConfigPath = path.join(root, 'src-tauri', 'tauri.conf.json');

if (!existsSync(tauriConfigPath)) {
  console.error(`Missing tauri config: ${tauriConfigPath}`);
  process.exit(1);
}

if (!existsSync(resourcesDir)) {
  console.error(`Missing resources directory: ${resourcesDir}`);
  process.exit(1);
}

const files = await readdir(resourcesDir);
const sidecars = files.filter((name) => name.startsWith('flask-api'));

if (sidecars.length === 0) {
  console.error('No Flask sidecar artifacts found under src-tauri/resources.');
  process.exit(1);
}

console.log('Desktop GA smoke check passed.');
console.log(`Detected sidecar artifacts: ${sidecars.join(', ')}`);
