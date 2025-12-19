/*
 * Copyright © 2016-2025 Patrick Zhang.
 * All Rights Reserved.
 */
declare module '@tauri-apps/api/core' {
  export interface InvokeArgs {
    [key: string]: any;
  }

  export function invoke<T>(cmd: string, args?: InvokeArgs): Promise<T>;
}

interface Window {
  __TAURI__?: {
    invoke: <T>(cmd: string, args?: any) => Promise<T>;
    event: {
      listen: <T>(event: string, handler: (event: { payload: T }) => void) => Promise<() => void>;
    };
  };
}

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_APP_DESCRIPTION: string;
  readonly VITE_FLASK_API_URL: string;
  readonly VITE_OLLAMA_BASE_URL: string;
  readonly VITE_DEV_MODE: string;
  readonly VITE_DEBUG: string;
  readonly VITE_LOG_LEVEL: string;
  readonly VITE_DEFAULT_MODEL: string;
  readonly VITE_API_TIMEOUT: string;
  readonly VITE_HEALTH_CHECK_TIMEOUT: string;
  readonly VITE_MAX_MESSAGE_LENGTH: string;
  readonly VITE_ENABLE_STREAMING: string;
  readonly VITE_ENABLE_MODEL_MANAGEMENT: string;
  readonly VITE_ENABLE_CHAT_HISTORY: string;
  readonly VITE_ENABLE_DEV_TOOLS: string;
  readonly VITE_ENABLE_HOT_RELOAD: string;
  readonly VITE_ENABLE_CONSOLE_LOGS: string;
  readonly VITE_ENABLE_COMPRESSION: string;
  readonly VITE_ENABLE_CACHE: string;
  readonly VITE_USE_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
