#!/usr/bin/env bash
set -euo pipefail

ROOT="/mnt/e/project/ooc-app"
cd "$ROOT"

export DESKTOP_TRAY_ENABLED=false
export DESKTOP_SHORTCUT_ENABLED=false
export DESKTOP_UPDATER_ENABLED=false

export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1090
source "$NVM_DIR/nvm.sh"
nvm use 20
# shellcheck disable=SC1090
source "$HOME/.cargo/env"

npx playwright install chromium
xvfb-run -a npm run test:e2e:tauri
