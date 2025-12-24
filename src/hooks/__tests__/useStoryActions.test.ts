import { ChatMessage } from '@/types';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStoryActions } from '../useStoryActions';
import * as useStoryClient from '../useStoryClient';

// Mock dependencies
vi.mock('../useStoryClient');

describe('useStoryActions', () => {
  const mockShowError = vi.fn();
  const mockSetMessages = vi.fn();
  const mockOnConversationSelect = vi.fn().mockResolvedValue(undefined);
  const mockGenerateStory = vi.fn();
  const mockConfirmSection = vi.fn();
  const mockRewriteSection = vi.fn();
  const mockModifySection = vi.fn();

  const mockMessages: ChatMessage[] = [
    {
      id: '1',
      role: 'user',
      content: 'Test message',
      timestamp: Date.now(),
    },
  ];

  const mockSettings = {
    ai: {
      provider: 'deepseek',
      deepseek: { model: 'deepseek-chat' },
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    (useStoryClient.useStoryClient as any).mockReturnValue({
      generateStory: mockGenerateStory,
      confirmSection: mockConfirmSection,
      rewriteSection: mockRewriteSection,
      modifySection: mockModifySection,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return story action handlers', () => {
    const { result } = renderHook(() =>
      useStoryActions({
        activeConversationId: 'conv_001',
        messages: mockMessages,
        setMessages: mockSetMessages,
        settings: mockSettings,
        showError: mockShowError,
        onConversationSelect: mockOnConversationSelect,
      })
    );

    expect(result.current.handleGenerateStory).toBeDefined();
    expect(result.current.handleConfirmSection).toBeDefined();
    expect(result.current.handleRewriteSection).toBeDefined();
    expect(result.current.handleModifySection).toBeDefined();
  });

  it('should not generate story when activeConversationId is null', async () => {
    const { result } = renderHook(() =>
      useStoryActions({
        activeConversationId: null,
        messages: mockMessages,
        setMessages: mockSetMessages,
        settings: mockSettings,
        showError: mockShowError,
        onConversationSelect: mockOnConversationSelect,
      })
    );

    await act(async () => {
      await result.current.handleGenerateStory();
    });

    expect(mockGenerateStory).not.toHaveBeenCalled();
  });

  it('should handle generateStory success', async () => {
    mockGenerateStory.mockImplementation(
      async (
        _: string,
        onChunk?: (chunk: string, accumulated: string) => void
      ) => {
        if (onChunk) {
          onChunk('chunk1', 'chunk1');
          onChunk('chunk2', 'chunk1chunk2');
        }
        return { success: true, response: 'chunk1chunk2' };
      }
    );

    const { result } = renderHook(() =>
      useStoryActions({
        activeConversationId: 'conv_001',
        messages: mockMessages,
        setMessages: mockSetMessages,
        settings: mockSettings,
        showError: mockShowError,
        onConversationSelect: mockOnConversationSelect,
      })
    );

    await act(async () => {
      await result.current.handleGenerateStory();
    });

    expect(mockGenerateStory).toHaveBeenCalledWith(
      'conv_001',
      expect.any(Function)
    );
    expect(mockSetMessages).toHaveBeenCalled();
  });

  it('should handle generateStory error', async () => {
    const error = new Error('Generation failed');
    mockGenerateStory.mockRejectedValue(error);

    const { result } = renderHook(() =>
      useStoryActions({
        activeConversationId: 'conv_001',
        messages: mockMessages,
        setMessages: mockSetMessages,
        settings: mockSettings,
        showError: mockShowError,
        onConversationSelect: mockOnConversationSelect,
      })
    );

    await act(async () => {
      await result.current.handleGenerateStory();
    });

    expect(mockShowError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to generate story')
    );
  });

  it('should handle confirmSection success', async () => {
    mockConfirmSection.mockResolvedValue({
      success: true,
      response: 'Confirmed content',
    });

    const { result } = renderHook(() =>
      useStoryActions({
        activeConversationId: 'conv_001',
        messages: mockMessages,
        setMessages: mockSetMessages,
        settings: mockSettings,
        showError: mockShowError,
        onConversationSelect: mockOnConversationSelect,
      })
    );

    await act(async () => {
      await result.current.handleConfirmSection();
    });

    expect(mockConfirmSection).toHaveBeenCalledWith('conv_001');
    expect(mockSetMessages).toHaveBeenCalled();
  });

  it('should handle rewriteSection success', async () => {
    mockRewriteSection.mockResolvedValue({
      success: true,
      response: 'Rewritten content',
    });

    const { result } = renderHook(() =>
      useStoryActions({
        activeConversationId: 'conv_001',
        messages: mockMessages,
        setMessages: mockSetMessages,
        settings: mockSettings,
        showError: mockShowError,
        onConversationSelect: mockOnConversationSelect,
      })
    );

    await act(async () => {
      const promise = result.current.handleRewriteSection('feedback');
      await vi.advanceTimersByTimeAsync(300);
      await promise;
    });

    expect(mockRewriteSection).toHaveBeenCalledWith('conv_001', 'feedback');
    expect(mockOnConversationSelect).toHaveBeenCalledWith('conv_001');
  });

  it('should handle modifySection success', async () => {
    mockModifySection.mockResolvedValue({
      success: true,
      response: 'Modified content',
    });

    const { result } = renderHook(() =>
      useStoryActions({
        activeConversationId: 'conv_001',
        messages: mockMessages,
        setMessages: mockSetMessages,
        settings: mockSettings,
        showError: mockShowError,
        onConversationSelect: mockOnConversationSelect,
      })
    );

    await act(async () => {
      const promise = result.current.handleModifySection('feedback');
      await vi.advanceTimersByTimeAsync(300);
      await promise;
    });

    expect(mockModifySection).toHaveBeenCalledWith('conv_001', 'feedback');
    expect(mockOnConversationSelect).toHaveBeenCalledWith('conv_001');
  });
});
