import { ChatMessage, AppSettings } from '@/types';
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

  const mockSettings: AppSettings = {
    general: {
      language: 'en',
      autoStart: false,
      minimizeToTray: false,
      startWithSystem: false,
    },
    appearance: {
      theme: 'dark',
      fontSize: 'medium',
      fontFamily: 'system-ui',
    },
    ai: {
      provider: 'deepseek',
      deepseek: {
        provider: 'deepseek',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-chat',
        timeout: 60000,
        maxTokens: 2048,
        temperature: 0.7,
        apiKey: '',
      },
      ollama: {
        provider: 'ollama',
        baseUrl: 'http://localhost:11434',
        model: 'llama2',
        timeout: 120000,
        maxTokens: 2048,
        temperature: 0.7,
      },
    },
    advanced: {
      enableStreaming: false,
      apiTimeout: 120000,
      maxRetries: 3,
      logLevel: 'info',
      enableDiagnostics: false,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    vi.mocked(useStoryClient.useStoryClient).mockReturnValue({
      generateStory: mockGenerateStory,
      confirmSection: mockConfirmSection,
      rewriteSection: mockRewriteSection,
      modifySection: mockModifySection,
      loading: false,
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

  it('should handle generateStory failure response', async () => {
    mockGenerateStory.mockResolvedValue({
      success: false,
      error: 'Generation failed',
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
      await result.current.handleGenerateStory();
    });

    expect(mockShowError).toHaveBeenCalledWith('Generation failed');
  });

  it('should handle generateStory with no response', async () => {
    mockGenerateStory.mockResolvedValue({
      success: true,
      response: null,
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
      await result.current.handleGenerateStory();
    });

    expect(mockShowError).toHaveBeenCalledWith('Failed to generate story');
  });

  it('should handle generateStory when last message is assistant', async () => {
    const messagesWithAssistant: ChatMessage[] = [
      {
        id: '1',
        role: 'user',
        content: 'Test message',
        timestamp: Date.now(),
      },
      {
        id: '2',
        role: 'assistant',
        content: 'Previous response',
        timestamp: Date.now(),
      },
    ];

    mockGenerateStory.mockImplementation(
      async (
        _: string,
        onChunk?: (chunk: string, accumulated: string) => void
      ) => {
        if (onChunk) {
          onChunk('chunk1', 'chunk1');
        }
        return { success: true, response: 'chunk1' };
      }
    );

    const mockSetMessagesWithState = vi.fn((updater) => {
      if (typeof updater === 'function') {
        const newMessages = updater(messagesWithAssistant);
        messagesWithAssistant.length = 0;
        messagesWithAssistant.push(...newMessages);
      }
    });

    const { result } = renderHook(() =>
      useStoryActions({
        activeConversationId: 'conv_001',
        messages: messagesWithAssistant,
        setMessages: mockSetMessagesWithState,
        settings: mockSettings,
        showError: mockShowError,
        onConversationSelect: mockOnConversationSelect,
      })
    );

    await act(async () => {
      await result.current.handleGenerateStory();
    });

    expect(mockGenerateStory).toHaveBeenCalled();
    expect(mockSetMessagesWithState).toHaveBeenCalled();
  });

  it('should handle generateStory when no last message', async () => {
    const emptyMessages: ChatMessage[] = [];

    mockGenerateStory.mockImplementation(
      async (
        _: string,
        onChunk?: (chunk: string, accumulated: string) => void
      ) => {
        if (onChunk) {
          onChunk('chunk1', 'chunk1');
        }
        return { success: true, response: 'chunk1' };
      }
    );

    const mockSetMessagesWithState = vi.fn((updater) => {
      if (typeof updater === 'function') {
        const newMessages = updater(emptyMessages);
        emptyMessages.length = 0;
        emptyMessages.push(...newMessages);
      }
    });

    const { result } = renderHook(() =>
      useStoryActions({
        activeConversationId: 'conv_001',
        messages: emptyMessages,
        setMessages: mockSetMessagesWithState,
        settings: mockSettings,
        showError: mockShowError,
        onConversationSelect: mockOnConversationSelect,
      })
    );

    await act(async () => {
      await result.current.handleGenerateStory();
    });

    expect(mockGenerateStory).toHaveBeenCalled();
    expect(mockSetMessagesWithState).toHaveBeenCalled();
  });

  it('should handle generateStory with non-Error exception', async () => {
    mockGenerateStory.mockRejectedValue('String error');

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
      'Failed to generate story: Unknown error'
    );
  });

  it('should not confirm section when activeConversationId is null', async () => {
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
      await result.current.handleConfirmSection();
    });

    expect(mockConfirmSection).not.toHaveBeenCalled();
  });

  it('should handle confirmSection failure response', async () => {
    mockConfirmSection.mockResolvedValue({
      success: false,
      error: 'Confirmation failed',
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

    expect(mockShowError).toHaveBeenCalledWith('Confirmation failed');
  });

  it('should handle confirmSection error', async () => {
    const error = new Error('Confirm failed');
    mockConfirmSection.mockRejectedValue(error);

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

    expect(mockShowError).toHaveBeenCalledWith(
      'Failed to confirm section: Confirm failed'
    );
  });

  it('should handle confirmSection with non-Error exception', async () => {
    mockConfirmSection.mockRejectedValue('String error');

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

    expect(mockShowError).toHaveBeenCalledWith(
      'Failed to confirm section: Unknown error'
    );
  });

  it('should not rewrite section when activeConversationId is null', async () => {
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
      const promise = result.current.handleRewriteSection('feedback');
      await vi.advanceTimersByTimeAsync(300);
      await promise;
    });

    expect(mockRewriteSection).not.toHaveBeenCalled();
  });

  it('should handle rewriteSection failure response', async () => {
    mockRewriteSection.mockResolvedValue({
      success: false,
      error: 'Rewrite failed',
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

    expect(mockShowError).toHaveBeenCalledWith('Rewrite failed');
  });

  it('should handle rewriteSection error', async () => {
    const error = new Error('Rewrite failed');
    mockRewriteSection.mockRejectedValue(error);

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

    expect(mockShowError).toHaveBeenCalledWith(
      'Failed to rewrite section: Rewrite failed'
    );
  });

  it('should handle rewriteSection with non-Error exception', async () => {
    mockRewriteSection.mockRejectedValue('String error');

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

    expect(mockShowError).toHaveBeenCalledWith(
      'Failed to rewrite section: Unknown error'
    );
  });

  it('should not modify section when activeConversationId is null', async () => {
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
      const promise = result.current.handleModifySection('feedback');
      await vi.advanceTimersByTimeAsync(300);
      await promise;
    });

    expect(mockModifySection).not.toHaveBeenCalled();
  });

  it('should handle modifySection failure response', async () => {
    mockModifySection.mockResolvedValue({
      success: false,
      error: 'Modify failed',
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

    expect(mockShowError).toHaveBeenCalledWith('Modify failed');
  });

  it('should handle modifySection error', async () => {
    const error = new Error('Modify failed');
    mockModifySection.mockRejectedValue(error);

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

    expect(mockShowError).toHaveBeenCalledWith(
      'Failed to modify section: Modify failed'
    );
  });

  it('should handle modifySection with non-Error exception', async () => {
    mockModifySection.mockRejectedValue('String error');

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

    expect(mockShowError).toHaveBeenCalledWith(
      'Failed to modify section: Unknown error'
    );
  });
});
