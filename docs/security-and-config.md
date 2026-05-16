# Security and Configuration

This document captures operational safety practices for local desktop + sidecar architecture.

## Secret handling

- Never commit real API keys or environment secrets.
- Use `.env.example` as a schema reference, not as a secret store.
- Keep sensitive values out of logs, screenshots, and test fixtures.

## API authentication and ownership controls

- Backend auth/token behavior is initialized in `server/src/app.py`.
- Production mode should require explicit API token configuration.
- Instance-ownership checks (for example shutdown routes) must not be bypassed.

## CORS and local API surface

- CORS is scoped to API routes and configured from backend settings.
- Keep origins explicit when CORS is enabled.
- Avoid broad wildcard policy changes unless there is a documented requirement.

## Desktop runtime considerations

- Tauri webview and Rust host can access local sidecar APIs.
- Keep sidecar process lifecycle controlled by the host.
- Avoid introducing unauthenticated external exposure for local-only endpoints.

## Logging hygiene

- Log enough context for diagnostics, but never tokens or credentials.
- Prefer structured, actionable error messages over noisy stack dumps in user flows.
- Keep debug-level verbosity bounded in production builds.
- Correlation headers use `X-OOC-Profile-Id` and `X-OOC-Client-Request-Id`; if you override `CORS_ALLOW_HEADERS`, keep both values.
- Diagnostic bundles must persist only profile fingerprints (hashed/shortened), never raw profile identifiers.

## Attachments, multimodal, and backups (in progress)

These areas are still being productized; before changing behavior, align with [`todo.md`](../todo.md) and the HTTP contract notes under [`architecture.md`](./architecture.md).

- **Attachments**: define allowlists for MIME types/extensions, per-file size, count per request, and retention; store files under an isolated path under the user data root, not arbitrary filesystem locations.
- **Diagnostic bundles**: redact or hash filenames, directory paths, and profile identifiers in exports (same spirit as **Logging hygiene** above).
- **Encrypted backups**: record algorithm and parameter versions in package metadata; wrong passwords and corrupt packages should return stable, testable error codes without silently overwriting good data.

After implementation lands, extend this section with concrete module paths and configuration keys.

## Configuration touchpoints

- Frontend build/runtime env: `.env*` files + Vite/Tauri config.
- Backend runtime env: Flask configuration and service provider settings.
- Desktop packaging/runtime: `src-tauri/tauri.conf.json` and Rust startup modules.

## Security review checklist for changes

1. Does this change expose or persist sensitive data?
2. Does this change alter auth, token, or ownership validation paths?
3. Does this change broaden network/API access unexpectedly?
4. Does this change leak secrets in logs or diagnostics?

If any answer is yes, include explicit mitigation and test coverage in the change.
