/**
 * Compare locale JSON files: en.json is the canonical key set vs zh.json.
 * Exits 1 if any key path exists in one file but not the other.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = join(__dirname, '..', 'src', 'i18n', 'locales');

function leafPaths(obj, prefix = '') {
  const paths = [];
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return paths;
  }
  for (const key of Object.keys(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      paths.push(...leafPaths(value, path));
    } else {
      paths.push(path);
    }
  }
  return paths;
}

function main() {
  const enPath = join(localesDir, 'en.json');
  const zhPath = join(localesDir, 'zh.json');
  const en = JSON.parse(readFileSync(enPath, 'utf8'));
  const zh = JSON.parse(readFileSync(zhPath, 'utf8'));

  const enKeys = new Set(leafPaths(en));
  const zhKeys = new Set(leafPaths(zh));

  const onlyEn = [...enKeys].filter((k) => !zhKeys.has(k)).sort();
  const onlyZh = [...zhKeys].filter((k) => !enKeys.has(k)).sort();

  if (onlyEn.length === 0 && onlyZh.length === 0) {
    console.log('i18n: en.json and zh.json keys match.');
    process.exit(0);
  }

  if (onlyEn.length > 0) {
    console.error('Keys in en.json missing from zh.json:');
    onlyEn.forEach((k) => console.error(`  - ${k}`));
  }
  if (onlyZh.length > 0) {
    console.error('Keys in zh.json missing from en.json:');
    onlyZh.forEach((k) => console.error(`  - ${k}`));
  }
  process.exit(1);
}

main();
