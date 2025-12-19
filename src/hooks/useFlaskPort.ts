import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import { setFlaskPort } from '@/store/slices/serverSlice';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

let portFetchPromise: Promise<void> | null = null;
let eventListenerSetup = false;
let globalInitialized = false;

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
  };
};
