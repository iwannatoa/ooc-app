import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue({ success: true }),
}));

type WindowWithTauri = Window & {
  __TAURI__?: unknown;
};

const getWindow = (): WindowWithTauri => window as WindowWithTauri;

describe('tauriConsoleBridge', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.mocked(invoke).mockResolvedValue({ success: true });
  });

  afterEach(() => {
    delete getWindow().__TAURI__;
    vi.restoreAllMocks();
  });

  it('should not install bridge outside tauri runtime', async () => {
    delete getWindow().__TAURI__;
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { installTauriConsoleBridge } = await import('../tauriConsoleBridge');
    installTauriConsoleBridge();

    console.error('browser-only error');
    expect(errorSpy).toHaveBeenCalledWith('browser-only error');
    expect(invoke).not.toHaveBeenCalled();
  });

  it('should forward console.error and console.warn to frontend_log', async () => {
    getWindow().__TAURI__ = {};
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { installTauriConsoleBridge } = await import('../tauriConsoleBridge');
    installTauriConsoleBridge();

    console.error('error payload');
    console.warn('warn payload');

    expect(invoke).toHaveBeenCalledWith('frontend_log', {
      level: 'error',
      message: expect.stringContaining('[console.error] error payload'),
    });
    expect(invoke).toHaveBeenCalledWith('frontend_log', {
      level: 'warn',
      message: expect.stringContaining('[console.warn] warn payload'),
    });
  });

  it('should forward window.onerror details to frontend_log', async () => {
    getWindow().__TAURI__ = {};
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { installTauriConsoleBridge } = await import('../tauriConsoleBridge');
    installTauriConsoleBridge();

    const error = new Error('fatal boom');
    window.onerror?.('fatal boom', 'app.ts', 12, 34, error);

    expect(invoke).toHaveBeenCalledWith('frontend_log', {
      level: 'error',
      message: expect.stringContaining('[window.onerror] fatal boom @ app.ts:12:34'),
    });
  });

  it('should forward window error event details to frontend_log', async () => {
    getWindow().__TAURI__ = {};
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { installTauriConsoleBridge } = await import('../tauriConsoleBridge');
    installTauriConsoleBridge();

    const event = new ErrorEvent('error', {
      message: 'event boom',
      filename: 'event.ts',
      lineno: 3,
      colno: 9,
      error: new Error('event boom'),
    });
    window.dispatchEvent(event);

    expect(invoke).toHaveBeenCalledWith('frontend_log', {
      level: 'error',
      message: expect.stringContaining('[window.error] event boom @ event.ts:3:9'),
    });
  });

  it('should forward unhandledrejection reason to frontend_log', async () => {
    getWindow().__TAURI__ = {};
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { installTauriConsoleBridge } = await import('../tauriConsoleBridge');
    installTauriConsoleBridge();

    const rejectionEvent = new Event('unhandledrejection') as Event & {
      reason?: unknown;
    };
    rejectionEvent.reason = new Error('async boom');
    window.dispatchEvent(rejectionEvent);

    expect(invoke).toHaveBeenCalledWith('frontend_log', {
      level: 'error',
      message: expect.stringContaining('[unhandledrejection] Error: async boom'),
    });
  });
});
