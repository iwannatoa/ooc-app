import { RootState } from '@/store';
import { setFlaskPort } from '@/store/slices/serverSlice';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect } from 'react';
import { useStore } from 'react-redux';
import { useAppDispatch, useAppSelector } from './redux';
import { discoverFlaskPortBrowser } from '@/utils/discoverFlaskPortBrowser';

/**
 * Flask port lifecycle: `fetchPort` invokes `get_flask_port` (Tauri) and dispatches
 * `setFlaskPort`. `waitForPort` is used by API clients to block until a URL exists.
 * The `flask-port-ready` event also updates the store. Prefer `refetch` after
 * `start_python_server` rather than duplicating probe logic in UI.
 */

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const tryStartPythonServer = async (): Promise<void> => {
  try {
    await invoke<ApiResponse<string>>('start_python_server');
  } catch (err) {
    console.error('Failed to start Python server:', err);
  }
};

// Module state management
class FlaskPortManager {
  private portFetchPromise: Promise<void> | null = null;
  private eventListenerSetup = false;
  private globalInitialized = false;
  private unsubscribeListener: (() => void) | null = null;
  private lastStartAttemptAt = 0;

  getPortFetchPromise(): Promise<void> | null {
    return this.portFetchPromise;
  }

  setPortFetchPromise(promise: Promise<void> | null): void {
    this.portFetchPromise = promise;
  }

  isEventListenerSetup(): boolean {
    return this.eventListenerSetup;
  }

  setEventListenerSetup(value: boolean): void {
    this.eventListenerSetup = value;
  }

  isGlobalInitialized(): boolean {
    return this.globalInitialized;
  }

  setGlobalInitialized(value: boolean): void {
    this.globalInitialized = value;
  }

  setUnsubscribeListener(unsubscribe: (() => void) | null): void {
    this.unsubscribeListener = unsubscribe;
  }

  canStartPythonServer(cooldownMs: number): boolean {
    return Date.now() - this.lastStartAttemptAt >= cooldownMs;
  }

  markStartPythonServerAttempt(): void {
    this.lastStartAttemptAt = Date.now();
  }

  cleanup(): void {
    if (this.unsubscribeListener) {
      this.unsubscribeListener();
      this.unsubscribeListener = null;
    }
  }

  // Reset all state (for testing)
  reset(): void {
    this.portFetchPromise = null;
    this.eventListenerSetup = false;
    this.globalInitialized = false;
    this.lastStartAttemptAt = 0;
    this.cleanup();
  }
}

const FLASK_PORT_MANAGER_KEY = '__OOC_FLASK_PORT_MANAGER__';
const globalScope = globalThis as typeof globalThis & {
  [FLASK_PORT_MANAGER_KEY]?: FlaskPortManager;
};
const flaskPortManager =
  globalScope[FLASK_PORT_MANAGER_KEY] ??
  (globalScope[FLASK_PORT_MANAGER_KEY] = new FlaskPortManager());
const MAX_WAIT_TIME = 10000; // 10 seconds
const START_SERVER_COOLDOWN_MS = 15000;

// Export reset function for testing
export const resetFlaskPortManager = () => {
  flaskPortManager.reset();
};

export const useFlaskPort = () => {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const { flaskPort, apiUrl } = useAppSelector((state) => state.server);
  const isTauriRuntime =
    typeof window !== 'undefined' && Boolean(window.__TAURI__);
  const directApiBaseUrl =
    (import.meta.env.VITE_FLASK_BASE_URL as string | undefined)?.trim() || '';
  const directApiPort = (() => {
    if (!directApiBaseUrl) return null;
    try {
      const parsed = new URL(directApiBaseUrl);
      return parsed.port ? Number(parsed.port) : null;
    } catch {
      return null;
    }
  })();

  const fetchPort = useCallback(async () => {
    if (directApiPort) {
      dispatch(setFlaskPort(directApiPort));
      return;
    }

    if (!isTauriRuntime) {
      const discoveredPort = await discoverFlaskPortBrowser();
      if (discoveredPort) {
        dispatch(setFlaskPort(discoveredPort));
      }
      return;
    }

    const existingPromise = flaskPortManager.getPortFetchPromise();
    if (existingPromise) {
      return existingPromise;
    }

    const promise = (async () => {
      try {
        const response = await invoke<ApiResponse<number>>('get_flask_port');

        if (response.success && response.data) {
          dispatch(setFlaskPort(response.data));
        }
      } catch (err) {
        // Don't set fallback port, let it remain null so we can retry
        console.error('Failed to fetch Flask port:', err);
      } finally {
        flaskPortManager.setPortFetchPromise(null);
      }
    })();

    flaskPortManager.setPortFetchPromise(promise);
    return promise;
  }, [directApiPort, dispatch, isTauriRuntime]);

  // Wait for port to be ready, with maximum wait time of 10 seconds
  const waitForPort = useCallback(async (): Promise<string> => {
    if (directApiBaseUrl) {
      return directApiBaseUrl;
    }

    if (!isTauriRuntime) {
      if (flaskPort) {
        return `http://localhost:${flaskPort}`;
      }
      const discoveredPort = await discoverFlaskPortBrowser();
      if (!discoveredPort) {
        throw new Error('Failed to discover Flask port in browser mode');
      }
      dispatch(setFlaskPort(discoveredPort));
      return `http://localhost:${discoveredPort}`;
    }

    // If port is already available, return apiUrl immediately
    if (flaskPort) {
      return `http://localhost:${flaskPort}`;
    }

    // Try to fetch port immediately
    await fetchPort();

    // Check if port is available after fetch
    const portAfterFetch = store.getState().server?.flaskPort;
    if (portAfterFetch) {
      return `http://localhost:${portAfterFetch}`;
    }

    // Poll for port with timeout
    const startTime = Date.now();
    const pollInterval = 100; // Check every 100ms

    return new Promise((resolve, reject) => {
      const checkPort = () => {
        const currentPort = store.getState().server?.flaskPort;
        const elapsed = Date.now() - startTime;

        if (currentPort) {
          resolve(`http://localhost:${currentPort}`);
          return;
        }

        if (elapsed >= MAX_WAIT_TIME) {
          const canStart = flaskPortManager.canStartPythonServer(
            START_SERVER_COOLDOWN_MS
          );
          const recovery = canStart
            ? (async () => {
                flaskPortManager.markStartPythonServerAttempt();
                await tryStartPythonServer();
                await fetchPort();
              })()
            : fetchPort();

          recovery
            .then(() => {
              const finalPort = store.getState().server?.flaskPort;
              if (finalPort) {
                resolve(`http://localhost:${finalPort}`);
                return;
              }
              reject(new Error('Failed to get Flask port after 10 seconds'));
            })
            .catch(() => {
              reject(new Error('Failed to get Flask port after 10 seconds'));
            });
          return;
        }

        // Continue polling
        setTimeout(checkPort, pollInterval);
      };

      // Start polling immediately
      checkPort();
    });
  }, [directApiBaseUrl, dispatch, flaskPort, fetchPort, isTauriRuntime, store]);

  useEffect(() => {
    if (directApiPort) {
      dispatch(setFlaskPort(directApiPort));
      return;
    }

    if (!isTauriRuntime) {
      if (!flaskPort) {
        void fetchPort();
      }
      return;
    }

    if (flaskPortManager.isGlobalInitialized()) {
      return;
    }
    flaskPortManager.setGlobalInitialized(true);

    if (!flaskPortManager.isEventListenerSetup()) {
      flaskPortManager.setEventListenerSetup(true);
      (async () => {
        try {
          const unsubscribe = await listen<number>(
            'flask-port-ready',
            (event) => {
              dispatch(setFlaskPort(event.payload));
            }
          );
          flaskPortManager.setUnsubscribeListener(unsubscribe);
        } catch {
          flaskPortManager.setEventListenerSetup(false);
        }
      })();
    }

    if (!flaskPort) {
      const timeoutId = setTimeout(() => {
        fetchPort();
      }, 100);
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [directApiPort, dispatch, fetchPort, flaskPort, isTauriRuntime]);

  return {
    port: flaskPort,
    apiUrl,
    refetch: fetchPort,
    waitForPort,
  };
};
