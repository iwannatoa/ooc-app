# Troubleshooting

This page lists common local and CI failures and where to investigate first.

## 1) Python backend does not start

### Symptoms

- `npm run server:dev` exits early.
- UI cannot reach API health endpoint.

### Checks

1. Confirm Python dependencies are installed in `server/`.
2. Run `node scripts/python-runner.mjs --version` to verify interpreter resolution.
3. Check whether DB path is writable (especially custom `DB_PATH`).
4. Inspect backend logs and traceback output.

## 2) Frontend cannot connect to local API

### Symptoms

- Connection banner remains disconnected.
- Story actions fail quickly with network errors.

### Checks

1. Confirm backend is running and health endpoint responds.
2. Verify current port and host assumptions in runtime state.
3. Check Tauri/webview console for request failures.
4. Validate CORS/auth configuration when endpoint behavior changed.

## 3) Tauri build fails due to sidecar issues

### Symptoms

- Desktop build fails near packaging.
- Runtime launch fails because sidecar executable cannot be found.

### Checks

1. Run `npm run build:python`.
2. Run `npm run check:desktop-ga`.
3. Verify sidecar mapping in `src-tauri/tauri.conf.json` (`externalBin`).
4. Confirm platform-specific artifact naming matches expected pattern.

## 4) E2E tests are flaky or failing

### Web E2E checks

- Ensure `npm run build` succeeds before `vite preview`.
- Confirm Playwright browser install state (`npm run test:e2e:install`).
- Replace fixed sleeps with explicit Playwright expectations where possible.

### Desktop E2E checks

- Ensure sidecar build completed first.
- Confirm desktop test uses `playwright.tauri.config.ts`.
- Check CI Linux dependencies for WebKitGTK and xvfb jobs.

## 5) CI passes locally but fails remotely

### Checks

1. Compare commands with [`../.github/workflows/ci.yml`](../.github/workflows/ci.yml).
2. Check OS-specific package/toolchain requirements.
3. Re-run closest local equivalent scripts from `package.json`.
4. Review uploaded artifacts (Playwright reports, logs) when available.

## Quick recovery checklist

- Reinstall dependencies (`npm ci`, backend pip deps).
- Rebuild sidecar.
- Re-run focused tests first, then broader checks.
- Validate environment assumptions (`.env`, port availability, permissions).

## Related docs

- Local setup modes: [`development.md`](./development.md)
- Build flow: [`build-and-release.md`](./build-and-release.md)
- Test strategy: [`testing.md`](./testing.md)
