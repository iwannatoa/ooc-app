# Development

This guide explains how to work locally in web-only, backend-only, and full desktop modes.

## Prerequisites

- Node.js 18+ (aligned with CI setup).
- Python 3.9+ for backend scripts.
- Rust stable toolchain for Tauri builds.

See baseline setup in [`../README.md`](../README.md).

## Environment file workflow

- Development defaults: `.env.development`
- Production template: `.env.production`
- Example template: `.env.example`

Use project scripts:

- `npm run env:dev`
- `npm run env:prod`
- `npm run env:example`

Do not commit real secrets to `.env`.

## Local run modes

### 1) UI-only mode

Use when you are iterating quickly on React UI behavior.

```bash
npm run dev
```

Notes:

- Starts Vite dev server.
- Useful for component/hook iteration and styling.
- Backend-dependent screens still need API availability or mocks.

### 2) Backend-only mode

Use when working on Flask endpoints or repository/service behavior.

```bash
npm run server:dev
```

Notes:

- Uses `scripts/python-runner.mjs` to resolve Python runtime.
- In dev mode, backend may default to local DB under `server/data/local/`.

### 3) Full desktop mode

Use when validating real Tauri + sidecar interaction.

```bash
npm run tauri:dev
```

Notes:

- Tauri config points to `devUrl` (`http://localhost:1420`) for webview loading.
- Rust host manages Python sidecar lifecycle.
- This is the most realistic local runtime.

## Suggested daily workflow

1. Start in UI-only or backend-only mode for fast feedback.
2. Switch to full desktop mode before final verification.
3. Run focused tests for touched area.
4. Run broader checks (`npm run check`) before merge when practical.

## Debugging tips

### Frontend issues

- Browser dev tools in web mode.
- Tauri devtools in desktop debug builds.
- Validate Redux state transitions and hook effects first.

### Backend issues

- Watch server logs and API response payloads.
- Confirm Python dependencies and interpreter resolution.
- Validate DB path and file permissions.

### SQLite migrations

- Chat database schema level is tracked with **`SCHEMA_USER_VERSION`** and `PRAGMA user_version` in `server/src/infrastructure/schema_migrations.py`; `apply_schema_migrations` runs at startup from `server/src/app.py`.
- When adding a step: bump `SCHEMA_USER_VERSION`, append `(version, callable)` to `SCHEMA_MIGRATIONS`, and keep the step **idempotent** (`IF NOT EXISTS`, detect missing columns before `ALTER TABLE`).
- If `chat.db` has a **higher** `user_version` than the app’s `SCHEMA_USER_VERSION`, migrations are skipped (open the DB with a newer app build, or follow ops/backup procedures). A formal **down migration** path is not the default today; the mainline is forward-only upgrades.

### Desktop integration issues

- Check whether sidecar executable was built/available.
- Confirm local API reachable from webview context.
- Verify shutdown behavior if app hangs on close.

## Related docs

- System boundaries: [`architecture.md`](./architecture.md)
- Test commands and expectations: [`testing.md`](./testing.md)
- Build and packaging: [`build-and-release.md`](./build-and-release.md)
