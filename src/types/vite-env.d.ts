/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly VITE_USE_MOCK?: string;
  /** Same value as server `FLASK_API_TOKEN` when API auth is enabled (Vite exposes this to the client). */
  readonly VITE_FLASK_API_TOKEN?: string;
  /** Optional manual "releases" page for the desktop title bar (no auto-updater). */
  readonly VITE_RELEASES_PAGE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
