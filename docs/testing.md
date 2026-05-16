# Testing

This repository uses layered testing: frontend unit/integration, backend unit/integration, and E2E (web + desktop).

## Command matrix

| Area | Command | Purpose |
| --- | --- | --- |
| Type safety | `npm run type-check` | TypeScript compile-time checks |
| Frontend lint | `npm run lint:eslint` | React/TS linting |
| i18n parity | `npm run lint:i18n` | Translation key consistency |
| Python lint | `npm run lint:python` | flake8 checks for backend |
| Frontend tests | `npm test` | Vitest run (coverage-enabled script) |
| Frontend watch | `npm run test:watch` | Fast local test loop |
| Python tests | `npm run test:python` | pytest suite |
| Python coverage | `npm run test:python:coverage` | pytest coverage output |
| Web E2E | `npm run test:e2e` | Playwright against `vite preview` |
| Desktop E2E | `npm run test:e2e:tauri` | Playwright + real Tauri runtime |
| Full baseline | `npm run check` | lint + python tests |

## Frontend testing strategy

- Use Vitest + React Testing Library for component and hook behavior.
- Prefer behavior assertions over implementation snapshots.
- Keep tests near the code they validate (`__tests__` or `*.test.ts(x)`).
- Use shared testing utilities under `src/test/`.

Detailed guide: [`../src/test/README.md`](../src/test/README.md)

## Backend testing strategy

- Use pytest for controller/service/repository tests.
- Reuse fixtures from `server/tests/conftest.py`.
- Mock external AI/provider dependencies for deterministic tests.
- Cover both success and error paths when changing endpoint logic.

Detailed guide: [`../server/tests/README.md`](../server/tests/README.md)

## E2E strategy

### Web E2E

- Config: [`../playwright.config.ts`](../playwright.config.ts)
- Runs against built frontend + preview server.
- Excludes desktop-specific spec by default.

### Desktop E2E

- Config: [`../playwright.tauri.config.ts`](../playwright.tauri.config.ts)
- Uses `tauri-plugin-playwright` in `e2e-testing` mode.
- Validates integration where Rust host and Python sidecar are both active.

## Suggested pre-PR checklist

1. Run focused tests for changed areas.
2. Run lint/type checks for touched languages.
3. Run at least one relevant E2E path for integration changes.
4. Run `npm run check` for broader confidence when feasible.

## CI parity notes

- CI includes additional matrix and platform validation in [`../.github/workflows/ci.yml`](../.github/workflows/ci.yml).
- If a local environment cannot run full desktop tests, call out what was validated locally.
