import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import { setFlaskPort } from '@/store/slices/serverSlice';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { store } from '@/store';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

let portFetchPromise: Promise<void> | null = null;
let eventListenerSetup = false;
let globalInitialized = false;

const MAX_WAIT_TIME = 10000; // 10 seconds

export const useFlaskPort = () => {
  const dispatch = useAppDispatch();
  const { flaskPort, apiUrl } = useAppSelector((state) => state.server);

  const fetchPort = useCallback(async () => {
    if (portFetchPromise) {
      return portFetchPromise;
    }

    portFetchPromise = (async () => {
      try {
        const response = await invoke<ApiResponse<number>>('get_flask_port');
        if (response.success && response.data) {
          dispatch(setFlaskPort(response.data));
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes('Tauri')) {
          dispatch(setFlaskPort(5000));
        }
      } finally {
        portFetchPromise = null;
      }
    })();

    return portFetchPromise;
  }, [dispatch]);

  // Wait for port to be ready, with maximum wait time of 10 seconds
  const waitForPort = useCallback(async (): Promise<string> => {
    // If port is already available, return apiUrl immediately
    if (flaskPort) {
      return `http://localhost:${flaskPort}`;
    }

    // First, try to fetch port immediately
    await fetchPort();

    // Wait for port to be ready, with timeout
    const startTime = Date.now();
    const checkInterval = 100; // Check every 100ms

    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | null = null;
      let unsubscribe: (() => void) | null = null;
      
      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
      };
      
      // Subscribe to store changes
      unsubscribe = store.subscribe(() => {
        const state = store.getState();
        const currentPort = state.server?.flaskPort;
        
        if (currentPort) {
          cleanup();
          resolve(`http://localhost:${currentPort}`);
          return;
        }

        const elapsed = Date.now() - startTime;
        if (elapsed >= MAX_WAIT_TIME) {
          cleanup();
          // Timeout reached, try to fetch port once more
          fetchPort().then(() => {
            // Check again after fetch
            setTimeout(() => {
              const finalState = store.getState();
              const finalPort = finalState.server?.flaskPort;
              if (finalPort) {
                resolve(`http://localhost:${finalPort}`);
              } else {
                reject(new Error('Failed to get Flask port after 10 seconds'));
              }
            }, 100);
          }).catch(() => {
            reject(new Error('Failed to get Flask port after 10 seconds'));
          });
        }
      });

      // Also check immediately
      const state = store.getState();
      const currentPort = state.server?.flaskPort;
      if (currentPort) {
        cleanup();
        resolve(`http://localhost:${currentPort}`);
        return;
      }

      // Set timeout to cleanup subscription
      timeoutId = setTimeout(() => {
        cleanup();
      }, MAX_WAIT_TIME + 1000);
    });
  }, [flaskPort, fetchPort]);

  useEffect(() => {
    if (globalInitialized) {
      return;
    }
    globalInitialized = true;

    if (!eventListenerSetup) {
      eventListenerSetup = true;
      (async () => {
        try {
          await listen<number>('flask-port-ready', (event) => {
            dispatch(setFlaskPort(event.payload));
          });
        } catch (err) {
          eventListenerSetup = false;
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
