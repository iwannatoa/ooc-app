import { RootState } from '@/store';
import { setFlaskPort } from '@/store/slices/serverSlice';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect } from 'react';
import { useStore } from 'react-redux';
import { useAppDispatch, useAppSelector } from './redux';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Module state management
class FlaskPortManager {
  private portFetchPromise: Promise<void> | null = null;
  private eventListenerSetup = false;
  private globalInitialized = false;
  private unsubscribeListener: (() => void) | null = null;

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
    this.cleanup();
  }
}

const flaskPortManager = new FlaskPortManager();
const MAX_WAIT_TIME = 10000; // 10 seconds

// Export reset function for testing
export const resetFlaskPortManager = () => {
  flaskPortManager.reset();
};

export const useFlaskPort = () => {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const { flaskPort, apiUrl } = useAppSelector((state) => state.server);

  const fetchPort = useCallback(async () => {
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
  }, [dispatch]);

  // Wait for port to be ready, with maximum wait time of 10 seconds
  const waitForPort = useCallback(async (): Promise<string> => {
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
          // Final attempt to fetch before rejecting
          fetchPort()
            .then(() => {
              const finalPort = store.getState().server?.flaskPort;
              if (finalPort) {
                resolve(`http://localhost:${finalPort}`);
              } else {
                reject(new Error('Failed to get Flask port after 10 seconds'));
              }
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
  }, [flaskPort, fetchPort, store]);

  useEffect(() => {
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
        } catch (err) {
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
  }, [dispatch, flaskPort, fetchPort]);

  return {
    port: flaskPort,
    apiUrl,
    refetch: fetchPort,
    waitForPort,
  };
};
