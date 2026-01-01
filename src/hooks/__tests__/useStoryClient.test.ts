import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStoryClient } from '../useStoryClient';
import * as useApiClients from '../useApiClients';

// Mock dependencies
vi.mock('../useApiClients');

describe('useStoryClient', () => {
  const mockGenerateStory = vi.fn();
  const mockConfirmSection = vi.fn();
  const mockRewriteSection = vi.fn();
  const mockModifySection = vi.fn();
  const mockUpdateSettings = vi.fn();

  const mockStoryApi = {
    generateStory: mockGenerateStory,
    confirmSection: mockConfirmSection,
    rewriteSection: mockRewriteSection,
    modifySection: mockModifySection,
    updateSettings: mockUpdateSettings,
  };

  const mockSettings = {
    ai: {
      provider: 'deepseek',
      deepseek: {
        model: 'deepseek-chat',
      },
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();

    (useApiClients.useApiClients as any).mockReturnValue({
      storyApi: mockStoryApi,
    });
  });

  it('should return story client methods and loading state', () => {
    const { result } = renderHook(() => useStoryClient(mockSettings));

    expect(result.current.generateStory).toBeDefined();
    expect(result.current.confirmSection).toBeDefined();
    expect(result.current.rewriteSection).toBeDefined();
    expect(result.current.modifySection).toBeDefined();
    expect(result.current.loading).toBe(false);
  });

  it('should update story API settings when settings change', async () => {
    const { rerender } = renderHook(
      ({ settings }) => useStoryClient(settings),
      {
        initialProps: { settings: mockSettings },
      }
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockUpdateSettings).toHaveBeenCalledWith(mockSettings);

    const newSettings = {
      ai: {
        provider: 'ollama',
        ollama: { model: 'llama2' },
      },
    };

    rerender({ settings: newSettings });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockUpdateSettings).toHaveBeenCalledWith(newSettings);
  });

  it('should not update settings if storyApi does not have updateSettings method', () => {
    (useApiClients.useApiClients as any).mockReturnValue({
      storyApi: {
        generateStory: mockGenerateStory,
        confirmSection: mockConfirmSection,
        rewriteSection: mockRewriteSection,
        modifySection: mockModifySection,
        // No updateSettings method
      },
    });

    renderHook(() => useStoryClient(mockSettings));

    expect(mockUpdateSettings).not.toHaveBeenCalled();
  });

  it('should call generateStory and set loading state', async () => {
    const mockResponse = {
      success: true,
      response: 'Generated story',
    };
    mockGenerateStory.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useStoryClient(mockSettings));

    expect(result.current.loading).toBe(false);

    const onChunk = vi.fn();
    let generatePromise: Promise<any>;

    await act(async () => {
      generatePromise = result.current.generateStory('conv_001', onChunk);
      // Loading should be true during the call
    });

    await act(async () => {
      await generatePromise!;
    });

    expect(mockGenerateStory).toHaveBeenCalledWith('conv_001', onChunk);
    expect(result.current.loading).toBe(false);
  });

  it('should handle generateStory without onChunk callback', async () => {
    const mockResponse = {
      success: true,
      response: 'Generated story',
    };
    mockGenerateStory.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useStoryClient(mockSettings));

    await act(async () => {
      await result.current.generateStory('conv_001');
    });

    expect(mockGenerateStory).toHaveBeenCalledWith('conv_001', expect.any(Function));
  });

  it('should handle generateStory error and reset loading', async () => {
    const error = new Error('Generation failed');
    mockGenerateStory.mockRejectedValue(error);

    const { result } = renderHook(() => useStoryClient(mockSettings));

    await act(async () => {
      try {
        await result.current.generateStory('conv_001');
      } catch (e) {
        // Expected error
      }
    });

    expect(result.current.loading).toBe(false);
  });

  it('should call confirmSection and set loading state', async () => {
    const mockResponse = {
      success: true,
      response: 'Section confirmed',
    };
    mockConfirmSection.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useStoryClient(mockSettings));

    await act(async () => {
      await result.current.confirmSection('conv_001');
    });

    expect(mockConfirmSection).toHaveBeenCalledWith('conv_001');
    expect(result.current.loading).toBe(false);
  });

  it('should handle confirmSection error and reset loading', async () => {
    const error = new Error('Confirm failed');
    mockConfirmSection.mockRejectedValue(error);

    const { result } = renderHook(() => useStoryClient(mockSettings));

    await act(async () => {
      try {
        await result.current.confirmSection('conv_001');
      } catch (e) {
        // Expected error
      }
    });

    expect(result.current.loading).toBe(false);
  });

  it('should call rewriteSection and set loading state', async () => {
    const mockResponse = {
      success: true,
      response: 'Section rewritten',
    };
    mockRewriteSection.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useStoryClient(mockSettings));

    await act(async () => {
      await result.current.rewriteSection('conv_001', 'Make it more exciting');
    });

    expect(mockRewriteSection).toHaveBeenCalledWith(
      'conv_001',
      'Make it more exciting'
    );
    expect(result.current.loading).toBe(false);
  });

  it('should handle rewriteSection error and reset loading', async () => {
    const error = new Error('Rewrite failed');
    mockRewriteSection.mockRejectedValue(error);

    const { result } = renderHook(() => useStoryClient(mockSettings));

    await act(async () => {
      try {
        await result.current.rewriteSection('conv_001', 'feedback');
      } catch (e) {
        // Expected error
      }
    });

    expect(result.current.loading).toBe(false);
  });

  it('should call modifySection and set loading state', async () => {
    const mockResponse = {
      success: true,
      response: 'Section modified',
    };
    mockModifySection.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useStoryClient(mockSettings));

    await act(async () => {
      await result.current.modifySection('conv_001', 'Add more details');
    });

    expect(mockModifySection).toHaveBeenCalledWith(
      'conv_001',
      'Add more details'
    );
    expect(result.current.loading).toBe(false);
  });

  it('should handle modifySection error and reset loading', async () => {
    const error = new Error('Modify failed');
    mockModifySection.mockRejectedValue(error);

    const { result } = renderHook(() => useStoryClient(mockSettings));

    await act(async () => {
      try {
        await result.current.modifySection('conv_001', 'feedback');
      } catch (e) {
        // Expected error
      }
    });

    expect(result.current.loading).toBe(false);
  });

  it('should handle multiple concurrent calls', async () => {
    mockGenerateStory.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ success: true }), 100)
        )
    );
    mockConfirmSection.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ success: true }), 50)
        )
    );

    const { result } = renderHook(() => useStoryClient(mockSettings));

    await act(async () => {
      const promise1 = result.current.generateStory('conv_001');
      const promise2 = result.current.confirmSection('conv_001');
      await Promise.all([promise1, promise2]);
    });

    expect(mockGenerateStory).toHaveBeenCalled();
    expect(mockConfirmSection).toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });
});

