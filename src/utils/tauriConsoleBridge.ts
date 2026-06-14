import { invoke } from '@tauri-apps/api/core';

type LogLevel = 'error' | 'warn';

const MAX_MESSAGE_LENGTH = 12000;
let installed = false;

const safeStringify = (value: unknown): string => {
  if (value instanceof Error) {
    const stack = value.stack ? `\n${value.stack}` : '';
    return `${value.name}: ${value.message}${stack}`;
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const composeMessage = (parts: unknown[]): string =>
  parts
    .map((part) => safeStringify(part))
    .join(' ')
    .slice(0, MAX_MESSAGE_LENGTH);

const sendToRustLog = (level: LogLevel, message: string): void => {
  if (!message.trim()) {
    return;
  }
  void invoke('frontend_log', { level, message }).catch(() => {
    // Keep console bridge best-effort; avoid recursion by not logging here.
  });
};

export const installTauriConsoleBridge = (): void => {
  if (installed) {
    return;
  }
  const isTauri = typeof window !== 'undefined' && Boolean(window.__TAURI__);
  if (!isTauri) {
    return;
  }
  installed = true;

  const originalError = console.error.bind(console);
  const originalWarn = console.warn.bind(console);

  console.error = (...args: unknown[]) => {
    originalError(...args);
    sendToRustLog('error', `[console.error] ${composeMessage(args)}`);
  };

  console.warn = (...args: unknown[]) => {
    originalWarn(...args);
    sendToRustLog('warn', `[console.warn] ${composeMessage(args)}`);
  };

  window.addEventListener(
    'error',
    (event) => {
      const errorEvent = event as ErrorEvent;
      const target = errorEvent.target as (EventTarget & {
        src?: string;
        href?: string;
      }) | null;
      const source = target?.src || target?.href || errorEvent.filename || 'unknown';
      const stack = errorEvent.error?.stack ? `\n${errorEvent.error.stack}` : '';
      const detail = `[window.error] ${errorEvent.message || 'window error'} @ ${source}:${errorEvent.lineno || 0}:${errorEvent.colno || 0}${stack}`;
      sendToRustLog('error', detail);
    },
    true
  );

  window.addEventListener('unhandledrejection', (event) => {
    const reason = safeStringify(event.reason);
    const stack =
      event.reason instanceof Error && event.reason.stack
        ? `\n${event.reason.stack}`
        : '';
    sendToRustLog('error', `[unhandledrejection] ${reason}${stack}`);
  });

  const originalOnError = window.onerror;
  window.onerror = (...args) => {
    const [message, source, lineno, colno, error] = args;
    const stack = error?.stack ? `\n${error.stack}` : '';
    const detail = `[window.onerror] ${String(message)} @ ${String(source)}:${lineno || 0}:${colno || 0}${stack}`;
    sendToRustLog('error', detail);
    if (typeof originalOnError === 'function') {
      return originalOnError(...args);
    }
    return false;
  };
};
