import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useServerState } from '../useServerState';
import { createTestStore } from '@/test/utils';

const createWrapper = (store: ReturnType<typeof createTestStore>) => {
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
};

describe('useServerState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return server state and setters', () => {
    const store = createTestStore({
      server: {
        pythonServerStatus: 'running',
        ollamaStatus: 'connected',
        isServerLoading: false,
        serverError: null,
        flaskPort: 5000,
        apiUrl: 'http://localhost:5000',
      },
    });

    const { result } = renderHook(() => useServerState(), {
      wrapper: createWrapper(store),
    });

    expect(result.current.pythonServerStatus).toBe('running');
    expect(result.current.ollamaStatus).toBe('connected');
    expect(result.current.isServerLoading).toBe(false);
    expect(result.current.serverError).toBeNull();
    expect(result.current.setPythonServerStatus).toBeDefined();
    expect(result.current.setOllamaStatus).toBeDefined();
    expect(result.current.setLoading).toBeDefined();
    expect(result.current.setError).toBeDefined();
    expect(result.current.clearError).toBeDefined();
  });

  it('should set Python server status', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useServerState(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.setPythonServerStatus('error');
    });

    expect(result.current.pythonServerStatus).toBe('error');
  });

  it('should set Ollama status', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useServerState(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.setOllamaStatus('disconnected');
    });

    expect(result.current.ollamaStatus).toBe('disconnected');
  });

  it('should set loading state', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useServerState(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.setLoading(true);
    });

    expect(result.current.isServerLoading).toBe(true);

    act(() => {
      result.current.setLoading(false);
    });

    expect(result.current.isServerLoading).toBe(false);
  });

  it('should set error', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useServerState(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.setError('Server connection failed');
    });

    expect(result.current.serverError).toBe('Server connection failed');
  });

  it('should clear error', () => {
    const store = createTestStore({
      server: {
        pythonServerStatus: 'running',
        ollamaStatus: 'connected',
        isServerLoading: false,
        serverError: 'Some error',
        flaskPort: 5000,
        apiUrl: 'http://localhost:5000',
      },
    });

    const { result } = renderHook(() => useServerState(), {
      wrapper: createWrapper(store),
    });

    expect(result.current.serverError).toBe('Some error');

    act(() => {
      result.current.clearError();
    });

    expect(result.current.serverError).toBeNull();
  });

  it('should set error to null', () => {
    const store = createTestStore({
      server: {
        pythonServerStatus: 'running',
        ollamaStatus: 'connected',
        isServerLoading: false,
        serverError: 'Some error',
        flaskPort: 5000,
        apiUrl: 'http://localhost:5000',
      },
    });

    const { result } = renderHook(() => useServerState(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.setError(null);
    });

    expect(result.current.serverError).toBeNull();
  });
});
