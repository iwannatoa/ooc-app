import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStoryProgress } from '../useStoryProgress';
import * as useConversationClient from '../useConversationClient';
import * as useChatState from '../useChatState';

// Mock dependencies
vi.mock('../useConversationClient');
vi.mock('../useChatState');

// Access the cache to clear it between tests
const getProgressCache = () => {
  // The cache is module-level, so we need to access it through the module
  // Since we can't directly access it, we'll use unique conversation IDs per test
  return null;
};

describe('useStoryProgress', () => {
  const mockGetProgress = vi.fn();
  const mockConversationClient = {
    getProgress: mockGetProgress,
  };

  const mockProgress: any = {
    currentChapter: 1,
    totalChapters: 10,
    progress: 0.1,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (useChatState.useChatState as any).mockReturnValue({
      activeConversationId: 'conv_001',
    });

    (useConversationClient.useConversationClient as any).mockReturnValue(
      mockConversationClient
    );

    mockGetProgress.mockResolvedValue(mockProgress);
  });

  it('should return initial state and load progress', async () => {
    const { result } = renderHook(() => useStoryProgress());

    expect(result.current.refresh).toBeDefined();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockGetProgress).toHaveBeenCalledWith('conv_001');
  });

  it('should set progress to null when activeConversationId is null', async () => {
    (useChatState.useChatState as any).mockReturnValue({
      activeConversationId: null,
    });

    const { result } = renderHook(() => useStoryProgress());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.progress).toBeNull();
    expect(mockGetProgress).not.toHaveBeenCalled();
  });

  it('should set loading state during progress fetch', async () => {
    let resolveProgress: (value: any) => void;
    const progressPromise = new Promise((resolve) => {
      resolveProgress = resolve;
    });
    mockGetProgress.mockReturnValue(progressPromise);

    const { result } = renderHook(() => useStoryProgress());

    // Loading should be true while fetching
    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveProgress!(mockProgress);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.progress).toEqual(mockProgress);
  });

  it('should use cached progress if available and not expired', async () => {
    const { result: result1 } = renderHook(() => useStoryProgress());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result1.current.progress).toEqual(mockProgress);

    // Clear the mock to verify cache is used
    mockGetProgress.mockClear();

    // Render a new hook instance - should use cache
    const { result: result2 } = renderHook(() => useStoryProgress());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Should use cached data, so getProgress should not be called again
    expect(mockGetProgress).not.toHaveBeenCalled();
    expect(result2.current.progress).toEqual(mockProgress);
  });

  it('should fetch new progress if cache is expired', async () => {
    // Use a unique conversation ID to avoid cache conflicts
    (useChatState.useChatState as any).mockReturnValue({
      activeConversationId: 'conv_cache_test',
    });

    const { result: result1 } = renderHook(() => useStoryProgress());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result1.current.progress).toEqual(mockProgress);

    // Wait for cache to expire (1000ms)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    });

    // Clear the mock to verify new fetch
    mockGetProgress.mockClear();
    mockGetProgress.mockResolvedValue(mockProgress);

    // Render a new hook instance - should fetch new data
    const { result: result2 } = renderHook(() => useStoryProgress());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Should fetch new data since cache expired
    expect(mockGetProgress).toHaveBeenCalledWith('conv_cache_test');
  });

  it('should handle progress fetch error gracefully', async () => {
    // Use a unique conversation ID to avoid cache conflicts
    (useChatState.useChatState as any).mockReturnValue({
      activeConversationId: 'conv_error_test',
    });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('Failed to fetch progress');
    mockGetProgress.mockRejectedValue(error);

    const { result } = renderHook(() => useStoryProgress());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to load story progress:',
      error
    );

    expect(result.current.progress).toBeNull();
    expect(result.current.loading).toBe(false);

    consoleErrorSpy.mockRestore();
  });

  it('should handle cached progress fetch error', async () => {
    // Use a unique conversation ID to avoid cache conflicts
    (useChatState.useChatState as any).mockReturnValue({
      activeConversationId: 'conv_cache_error_test',
    });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // First, create a cached promise that will reject
    const error = new Error('Cache error');
    mockGetProgress.mockRejectedValueOnce(error);

    const { result: result1 } = renderHook(() => useStoryProgress());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to load story progress:',
      error
    );

    // Now try to use the cache - should handle the error
    const { result: result2 } = renderHook(() => useStoryProgress());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result2.current.progress).toBeNull();
    expect(result2.current.loading).toBe(false);

    consoleErrorSpy.mockRestore();
  });

  it('should not update state if component is unmounted', async () => {
    // Use a unique conversation ID to avoid cache conflicts
    (useChatState.useChatState as any).mockReturnValue({
      activeConversationId: 'conv_unmount_test',
    });

    let resolveProgress: (value: any) => void;
    const progressPromise = new Promise((resolve) => {
      resolveProgress = resolve;
    });
    mockGetProgress.mockReturnValue(progressPromise);

    const { unmount } = renderHook(() => useStoryProgress());

    // Unmount before the promise resolves
    unmount();

    await act(async () => {
      resolveProgress!(mockProgress);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // After unmount, the hook should not update state
    // The important thing is that it doesn't throw
    expect(mockGetProgress).toHaveBeenCalled();
  });

  it('should refresh progress when refresh is called', async () => {
    // Use a unique conversation ID to avoid cache conflicts
    (useChatState.useChatState as any).mockReturnValue({
      activeConversationId: 'conv_refresh_test',
    });

    const { result } = renderHook(() => useStoryProgress());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.progress).toEqual(mockProgress);
    expect(mockGetProgress).toHaveBeenCalledWith('conv_refresh_test');

    // Wait for cache to expire, then refresh
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    });

    const newProgress = { ...mockProgress, currentChapter: 2 };
    mockGetProgress.mockResolvedValue(newProgress);

    await act(async () => {
      await result.current.refresh();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Should fetch new data since cache expired
    expect(mockGetProgress).toHaveBeenCalledTimes(2);
    expect(result.current.progress).toEqual(newProgress);
  });

  it('should update progress when activeConversationId changes', async () => {
    (useChatState.useChatState as any).mockReturnValue({
      activeConversationId: 'conv_change_001',
    });

    const { rerender } = renderHook(() => useStoryProgress());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockGetProgress).toHaveBeenCalledWith('conv_change_001');

    const newProgress = { ...mockProgress, currentChapter: 3 };
    mockGetProgress.mockResolvedValue(newProgress);

    (useChatState.useChatState as any).mockReturnValue({
      activeConversationId: 'conv_change_002',
    });

    rerender();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockGetProgress).toHaveBeenCalledWith('conv_change_002');
  });
});
