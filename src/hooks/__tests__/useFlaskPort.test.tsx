import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { useFlaskPort } from '../useFlaskPort';
import serverReducer from '@/store/slices/serverSlice';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

vi.mock('@tauri-apps/api/core');
vi.mock('@tauri-apps/api/event');

const createTestStore = (initialState: any = {}) => {
  return configureStore({
    reducer: {
      server: serverReducer,
    } as any,
    preloadedState: initialState,
  });
};

const createWrapper = (store: ReturnType<typeof createTestStore>) => {
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
};

describe('useFlaskPort', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (invoke as any).mockResolvedValue({ success: true, data: 5000 });
    (listen as any).mockResolvedValue(() => {});
  });

  it('should get Flask port', async () => {
    const store = createTestStore();
    const { result } = renderHook(() => useFlaskPort(), {
      wrapper: createWrapper(store),
    });

    // Manually trigger fetch since globalInitialized might be true from previous tests
    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.port).toBe(5000);
  });

  it('should return API URL', async () => {
    const store = createTestStore({
      server: { flaskPort: 5000, apiUrl: 'http://localhost:5000' },
    });
    const { result } = renderHook(() => useFlaskPort(), {
      wrapper: createWrapper(store),
    });

    expect(result.current.apiUrl).toBe('http://localhost:5000');
  });

  it('should wait for port ready', async () => {
    const store = createTestStore();
    const { result } = renderHook(() => useFlaskPort(), {
      wrapper: createWrapper(store),
    });

    // Fetch port first
    await act(async () => {
      await result.current.refetch();
    });

    // Now waitForPort should return immediately since port is set
    const apiUrl = await act(async () => {
      return await result.current.waitForPort();
    });

    expect(apiUrl).toContain('http://localhost');
    expect(apiUrl).toContain('5000');
  });

  it('should be able to refetch port', async () => {
    const store = createTestStore();
    const { result } = renderHook(() => useFlaskPort(), {
      wrapper: createWrapper(store),
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(invoke).toHaveBeenCalledWith('get_flask_port');
  });

  it('should handle fetch port error', async () => {
    (invoke as any).mockRejectedValueOnce(new Error('Failed to fetch port'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const store = createTestStore();
    const { result } = renderHook(() => useFlaskPort(), {
      wrapper: createWrapper(store),
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should handle fetch port with unsuccessful response', async () => {
    (invoke as any).mockResolvedValueOnce({ success: false, error: 'Port not available' });

    const store = createTestStore();
    const { result } = renderHook(() => useFlaskPort(), {
      wrapper: createWrapper(store),
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.port).toBeNull();
  });

  it('should handle fetch port with no data', async () => {
    (invoke as any).mockResolvedValueOnce({ success: true, data: undefined });

    const store = createTestStore();
    const { result } = renderHook(() => useFlaskPort(), {
      wrapper: createWrapper(store),
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.port).toBeNull();
  });

  it('should handle fetch port error', async () => {
    (invoke as any).mockRejectedValueOnce(new Error('Failed to fetch port'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const store = createTestStore();
    const { result } = renderHook(() => useFlaskPort(), {
      wrapper: createWrapper(store),
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should handle fetch port with unsuccessful response', async () => {
    (invoke as any).mockResolvedValueOnce({ success: false, error: 'Port not available' });

    const store = createTestStore();
    const { result } = renderHook(() => useFlaskPort(), {
      wrapper: createWrapper(store),
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.port).toBeNull();
  });

  it('should handle fetch port with no data', async () => {
    (invoke as any).mockResolvedValueOnce({ success: true, data: undefined });

    const store = createTestStore();
    const { result } = renderHook(() => useFlaskPort(), {
      wrapper: createWrapper(store),
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.port).toBeNull();
  });
});
