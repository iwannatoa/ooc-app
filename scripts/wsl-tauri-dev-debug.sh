#!/usr/bin/env bash
set -euo pipefail
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
nvm use 20
source "$HOME/.cargo/env"
cd /mnt/e/project/ooc-app
export DESKTOP_TRAY_ENABLED=false DESKTOP_SHORTCUT_ENABLED=false DESKTOP_UPDATER_ENABLED=false
export TAURI_PLAYWRIGHT_SOCKET=/tmp/tauri-playwright.sock
timeout 180 npm run tauri:dev -- --features e2e-testing 2>&1 | tail -100
