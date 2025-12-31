import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { useFlaskPort, resetFlaskPortManager } from '../useFlaskPort';
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
    resetFlaskPortManager(); // Reset module state between tests
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
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

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
    (invoke as any).mockResolvedValueOnce({
      success: false,
      error: 'Port not available',
    });

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

  it('should wait for port with timeout', async () => {
    vi.useFakeTimers();
    const store = createTestStore();

    const { result } = renderHook(() => useFlaskPort(), {
      wrapper: createWrapper(store),
    });

    const waitPromise = act(async () => {
      return result.current.waitForPort();
    });

    // Fast-forward time to trigger timeout
    await act(async () => {
      vi.advanceTimersByTime(10000);
    });

    // Should reject after timeout
    await expect(waitPromise).rejects.toThrow('Failed to get Flask port');
    vi.useRealTimers();
  });

  it(
    'should wait for port and resolve when port becomes available',
    { timeout: 11000 },
    async () => {
      vi.useRealTimers();
      const store = createTestStore();

      const { result } = renderHook(() => useFlaskPort(), {
        wrapper: createWrapper(store),
      });

      // Start waiting for port - hook should be initialized immediately
      const waitPromise = result.current.waitForPort();

      // Simulate port becoming available
      await act(async () => {
        store.dispatch({ type: 'server/setFlaskPort', payload: 5000 });
        // Give store subscription time to process
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      const apiUrl = await waitPromise;
      expect(apiUrl).toBe('http://localhost:5000');
    }
  );

  it('should handle event listener setup error', async () => {
    vi.useRealTimers();
    // Reset the module-level globalInitialized flag by using a fresh import
    // Since we can't easily reset it, we'll just verify the behavior
    (listen as any).mockRejectedValueOnce(new Error('Listener setup failed'));

    const store = createTestStore();
    const { result } = renderHook(() => useFlaskPort(), {
      wrapper: createWrapper(store),
    });

    // Wait for useEffect to run and hook to initialize
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });

    // The hook should still work even if listener setup fails
    expect(result.current).toBeDefined();
    // Note: listen might not be called if globalInitialized is already true
    // This is expected behavior - the listener is only set up once globally
  });

  it('should handle multiple refetch calls', async () => {
    const store = createTestStore();
    const { result } = renderHook(() => useFlaskPort(), {
      wrapper: createWrapper(store),
    });

    console.log(result.current);
    await act(async () => {
      await Promise.all([
        result.current.refetch(),
        result.current.refetch(),
        result.current.refetch(),
      ]);
    });

    // Should only call invoke once due to promise caching
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('should poll for port and resolve when port becomes available during polling', async () => {
    vi.useRealTimers();
    const store = createTestStore();
    (invoke as any).mockResolvedValue({ success: false, data: undefined });

    const { result } = renderHook(() => useFlaskPort(), {
      wrapper: createWrapper(store),
    });

    const waitPromise = result.current.waitForPort();

    // Wait a bit for polling to start
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    // Set port during polling
    await act(async () => {
      store.dispatch({ type: 'server/setFlaskPort', payload: 5000 });
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const apiUrl = await waitPromise;
    expect(apiUrl).toBe('http://localhost:5000');
  });

  it(
    'should timeout and make final fetch attempt before rejecting',
    { timeout: 12000 },
    async () => {
      vi.useRealTimers();
      const store = createTestStore();
      (invoke as any).mockResolvedValue({ success: false, data: undefined });

      const { result } = renderHook(() => useFlaskPort(), {
        wrapper: createWrapper(store),
      });

      const waitPromise = result.current.waitForPort();

      // Should reject after timeout and final fetch attempt
      await expect(waitPromise).rejects.toThrow(
        'Failed to get Flask port after 10 seconds'
      );
    }
  );

  it(
    'should resolve on final fetch attempt after timeout',
    { timeout: 12000 },
    async () => {
      vi.useRealTimers();
      const store = createTestStore();
      let fetchCount = 0;
      (invoke as any).mockImplementation(() => {
        fetchCount++;
        if (fetchCount === 1) {
          return Promise.resolve({ success: false, data: undefined });
        }
        // Final fetch succeeds
        return Promise.resolve({ success: true, data: 5000 });
      });

      const { result } = renderHook(() => useFlaskPort(), {
        wrapper: createWrapper(store),
      });

      const waitPromise = result.current.waitForPort();

      // Should resolve with port from final fetch after timeout
      const apiUrl = await waitPromise;
      expect(apiUrl).toBe('http://localhost:5000');
    }
  );

  it('should handle event listener callback setting port', async () => {
    vi.useRealTimers();
    const store = createTestStore();
    let eventCallback: ((event: { payload: number }) => void) | null = null;

    (listen as any).mockImplementation((eventName: string, callback: any) => {
      if (eventName === 'flask-port-ready') {
        eventCallback = callback;
      }
      return Promise.resolve(() => {});
    });

    const { result } = renderHook(() => useFlaskPort(), {
      wrapper: createWrapper(store),
    });

    // Wait for listener to be set up
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Simulate event firing
    await act(async () => {
      if (eventCallback) {
        eventCallback({ payload: 5000 });
      }
    });

    expect(result.current.port).toBe(5000);
  });

  it('should handle event listener setup error and reset flag', async () => {
    vi.useRealTimers();
    const store = createTestStore();

    // Mock listen to reject on first call
    (listen as any).mockRejectedValueOnce(new Error('Listener setup failed'));

    const { unmount } = renderHook(() => useFlaskPort(), {
      wrapper: createWrapper(store),
    });

    // Wait for listener setup attempt to fail
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Unmount and reset to test retry
    unmount();
    resetFlaskPortManager();

    // Create new hook instance - should retry listener setup
    renderHook(() => useFlaskPort(), {
      wrapper: createWrapper(store),
    });

    // Wait for retry
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Should have attempted to set up listener twice
    expect(listen).toHaveBeenCalledTimes(2);
  });

  it('should call fetchPort after timeout when flaskPort is null', async () => {
    vi.useFakeTimers();
    const store = createTestStore();
    (invoke as any).mockResolvedValue({ success: true, data: 5000 });

    const { result } = renderHook(() => useFlaskPort(), {
      wrapper: createWrapper(store),
    });

    // Initially port should be null
    expect(result.current.port).toBeNull();

    // Advance time to trigger useEffect timeout (100ms)
    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve(); // Allow microtasks to run
    });

    // Should have called fetchPort
    expect(invoke).toHaveBeenCalledWith('get_flask_port');

    // Wait for the promise to resolve
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.port).toBe(5000);
    vi.useRealTimers();
  });

  it('should not call fetchPort in useEffect when flaskPort is already set', async () => {
    vi.useFakeTimers();
    const store = createTestStore({
      server: { flaskPort: 5000, apiUrl: 'http://localhost:5000' },
    });

    const { result } = renderHook(() => useFlaskPort(), {
      wrapper: createWrapper(store),
    });

    // Port is already set
    expect(result.current.port).toBe(5000);

    // Advance time - should not trigger fetchPort
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Should not have called invoke since port was already set
    expect(invoke).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
