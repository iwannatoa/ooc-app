#!/usr/bin/env bash
set -euo pipefail

# Prerequisite (run once as root in WSL):
#   apt-get install -y build-essential curl libssl-dev libgtk-3-dev \
#     libayatana-appindicator3-dev librsvg2-dev libglib2.0-dev pkg-config \
#     libwebkit2gtk-4.1-dev xvfb python3-pip
ROOT="/mnt/e/project/ooc-app"
cd "$ROOT"

export DESKTOP_TRAY_ENABLED=false
export DESKTOP_SHORTCUT_ENABLED=false
export DESKTOP_UPDATER_ENABLED=false

# Node 20 via nvm
export NVM_DIR="$HOME/.nvm"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi
# shellcheck disable=SC1090
source "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20

# Rust toolchain
if [ ! -x "$HOME/.cargo/bin/cargo" ]; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
fi
# shellcheck disable=SC1090
source "$HOME/.cargo/env"

echo "node: $(node -v)"
echo "cargo: $(cargo -V)"

# Python sidecar
cd "$ROOT/server"
python3 -m pip install --user -r requirements.txt
python3 build.py --current-platform-only

# Frontend deps
cd "$ROOT"
npm ci
# System libs (webkit/gtk/xvfb) must be installed once via root apt — see CI job.
# Do not use `--with-deps` here: it invokes sudo and hangs in WSL without passwordless sudo.
npx playwright install chromium

# Run desktop E2E (same as CI)
xvfb-run -a npm run test:e2e:tauri
