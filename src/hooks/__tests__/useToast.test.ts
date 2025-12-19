import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from '../useToast';

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with empty toasts', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.toasts).toEqual([]);
  });

  it('should show a toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showInfo('Test message');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('Test message');
    expect(result.current.toasts[0].type).toBe('info');
  });

  it('should show success toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showSuccess('Success message');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].type).toBe('success');
  });

  it('should show error toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showError('Error message');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].type).toBe('error');
  });

  it('should remove toast after duration', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showInfo('Test message');
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('should manually remove toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showInfo('Test message');
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      result.current.removeToast(result.current.toasts[0].id);
    });

    expect(result.current.toasts).toHaveLength(0);
  });
});

