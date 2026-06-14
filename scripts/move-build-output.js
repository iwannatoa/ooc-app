const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '../src-tauri/target/release/bundle');
const targetDir = path.join(__dirname, '../release');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`Source directory does not exist: ${src}`);
    process.exit(1);
  }

  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }

  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  console.log(`Copying build output from ${sourceDir} to ${targetDir}...`);
  copyDir(sourceDir, targetDir);
  console.log('Build output copied successfully!');
} catch (error) {
  console.error('Error copying build output:', error);
  process.exit(1);
}
