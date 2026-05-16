# OOC Docs

This folder contains contributor-focused documentation that complements the top-level project guides.
Use these docs for architecture, local workflows, release flow, and operational troubleshooting.

## Primary entry points

- Product and full-stack overview: [`../README.md`](../README.md)
- Frontend structure notes: [`../src/README.md`](../src/README.md)
- Backend overview: [`../server/README.md`](../server/README.md)
- Frontend test notes: [`../src/test/README.md`](../src/test/README.md)
- Backend test notes: [`../server/tests/README.md`](../server/tests/README.md)

## Product backlog

- Product backlog (**pending REQ-style items only**): [`../todo.md`](../todo.md) (cross-check with **SQLite schema versioning and chat extensions** in [`architecture.md`](./architecture.md)).

## Handbook pages

- System architecture and runtime boundaries: [`architecture.md`](./architecture.md)
- Local development setup and debug workflow: [`development.md`](./development.md)
- Testing strategy and command matrix: [`testing.md`](./testing.md)
- Build and release flow for desktop artifacts: [`build-and-release.md`](./build-and-release.md)
- Localization and translation key workflow: [`i18n.md`](./i18n.md)
- Security and configuration handling: [`security-and-config.md`](./security-and-config.md)
- Frequent failures and triage guide: [`troubleshooting.md`](./troubleshooting.md)

## Start here by role

### UI contributor

1. Read [`development.md`](./development.md) for local modes.
2. Read [`testing.md`](./testing.md) for Vitest and E2E expectations.
3. Read [`i18n.md`](./i18n.md) before adding user-facing strings.

### Backend contributor

1. Read [`architecture.md`](./architecture.md) for layer boundaries.
2. Read [`development.md`](./development.md) for Python runtime behavior.
3. Read [`testing.md`](./testing.md) for pytest and lint commands.

### Desktop/release maintainer

1. Read [`build-and-release.md`](./build-and-release.md) for sidecar and Tauri packaging.
2. Read [`security-and-config.md`](./security-and-config.md) for token and CSP handling.
3. Read [`troubleshooting.md`](./troubleshooting.md) for CI and packaging failures.

## Documentation principles in this folder

- **Language**: keep all prose in this directory in **English** (the root [`todo.md`](../todo.md) may use another language for the pending backlog).
- Keep examples aligned with current `package.json` scripts.
- Link to existing README sections rather than duplicating long command blocks.
- Explain why a workflow exists, not only the command to run.
- Update these docs when workflow or architecture changes.
