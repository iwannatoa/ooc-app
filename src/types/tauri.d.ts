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
  readonly VITE_USE_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
