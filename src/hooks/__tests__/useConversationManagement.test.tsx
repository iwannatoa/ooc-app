import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useConversationManagement } from '../useConversationManagement';
import { createTestStore } from '@/test/utils';
import { ConversationWithSettings, ChatMessage } from '@/types';

// Mock dependencies
vi.mock('../useAiClient', () => ({
  useAiClient: vi.fn(),
}));

vi.mock('../useChatState', () => ({
  useChatState: vi.fn(),
}));

vi.mock('../useConversationClient', () => ({
  useConversationClient: vi.fn(),
}));

vi.mock('../useSettingsState', () => ({
  useSettingsState: vi.fn(),
}));

vi.mock('../useUIState', () => ({
  useUIState: vi.fn(),
}));

vi.mock('../useDialog', () => ({
  useConversationSettingsDialog: vi.fn(),
  useSummaryPromptDialog: vi.fn(),
}));

vi.mock('@/services/confirmDialogService', () => ({
  confirmDialog: vi.fn(),
}));

vi.mock('@/i18n/i18n', () => ({
  useI18n: vi.fn(),
}));

import { useAiClient } from '../useAiClient';
import { useChatState } from '../useChatState';
import { useConversationClient } from '../useConversationClient';
import { useSettingsState } from '../useSettingsState';
import { useUIState } from '../useUIState';
import {
  useConversationSettingsDialog,
  useSummaryPromptDialog,
} from '../useDialog';
import { confirmDialog } from '@/services/confirmDialogService';
import { useI18n } from '@/i18n/i18n';

const createWrapper = (store: ReturnType<typeof createTestStore>) => {
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
};

describe('useConversationManagement', () => {
  const mockGetConversationsList = vi.fn();
  const mockGetConversationMessages = vi.fn();
  const mockCreateOrUpdateSettings = vi.fn();
  const mockDeleteConversation = vi.fn();
  const mockSendMessageStream = vi.fn();
  const mockSetActiveConversation = vi.fn();
  const mockSetMessages = vi.fn();
  const mockRemoveConversation = vi.fn();
  const mockSetIsNewConversation = vi.fn();
  const mockSetPendingConversationId = vi.fn();
  const mockSettingsDialogOpen = vi.fn();
  const mockSettingsDialogClose = vi.fn();
  const mockSummaryDialogOpen = vi.fn();
  const mockSummaryDialogClose = vi.fn();
  const mockT = vi.fn((key: string) => key);

  beforeEach(() => {
    vi.clearAllMocks();

    (useConversationClient as any).mockReturnValue({
      getConversationsList: mockGetConversationsList,
      getConversationMessages: mockGetConversationMessages,
      createOrUpdateSettings: mockCreateOrUpdateSettings,
      deleteConversation: mockDeleteConversation,
      generateSummary: vi.fn(),
      saveSummary: vi.fn(),
    });

    (useChatState as any).mockReturnValue({
      activeConversationId: null,
      messages: [],
      setActiveConversation: mockSetActiveConversation,
      setMessages: mockSetMessages,
      removeConversation: mockRemoveConversation,
    });

    (useSettingsState as any).mockReturnValue({
      settings: {
        ai: {
          provider: 'deepseek',
          deepseek: {
            model: 'deepseek-chat',
          },
        },
      },
    });

    (useAiClient as any).mockReturnValue({
      sendMessageStream: mockSendMessageStream,
    });

    (useUIState as any).mockReturnValue({
      isNewConversation: false,
      pendingConversationId: null,
      setIsNewConversation: mockSetIsNewConversation,
      setPendingConversationId: mockSetPendingConversationId,
    });

    (useConversationSettingsDialog as any).mockReturnValue({
      open: mockSettingsDialogOpen,
      close: mockSettingsDialogClose,
    });

    (useSummaryPromptDialog as any).mockReturnValue({
      open: mockSummaryDialogOpen,
      close: mockSummaryDialogClose,
    });

    (useI18n as any).mockReturnValue({
      t: mockT,
    });
  });

  it('should return initial state', async () => {
    mockGetConversationsList.mockResolvedValueOnce([]);

    const store = createTestStore();
    const { result } = renderHook(() => useConversationManagement(), {
      wrapper: createWrapper(store),
    });

    // Wait for initial render to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current).toHaveProperty('conversations');
    expect(result.current).toHaveProperty('activeConversationId');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('handleNewConversation');
    expect(result.current).toHaveProperty('handleSelectConversation');
    expect(result.current).toHaveProperty('handleDeleteConversation');
    expect(result.current).toHaveProperty('handleSaveSettings');
    expect(result.current).toHaveProperty('handleSendMessage');
  });

  it('should load conversations on mount', async () => {
    const mockConversations: ConversationWithSettings[] = [
      {
        id: 'conv_001',
        title: 'Test Conversation',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    mockGetConversationsList.mockResolvedValueOnce(mockConversations);

    const store = createTestStore();
    const { result } = renderHook(() => useConversationManagement(), {
      wrapper: createWrapper(store),
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.conversations).toHaveLength(1);
    expect(mockGetConversationsList).toHaveBeenCalled();
  });

  it('should handle new conversation', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useConversationManagement(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.handleNewConversation();
    });

    expect(mockSetPendingConversationId).toHaveBeenCalled();
    expect(mockSetIsNewConversation).toHaveBeenCalledWith(true);
    expect(mockSettingsDialogOpen).toHaveBeenCalled();
  });

  it('should select conversation', async () => {
    const mockMessages: ChatMessage[] = [
      {
        id: 'msg1',
        role: 'user',
        content: 'Hello',
      },
    ];

    mockGetConversationMessages.mockResolvedValueOnce(mockMessages);
    mockGetConversationsList.mockResolvedValueOnce([]);

    const store = createTestStore();
    const { result } = renderHook(() => useConversationManagement(), {
      wrapper: createWrapper(store),
    });

    // Wait for initial render
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.handleSelectConversation('conv_001');
    });

    expect(mockSetActiveConversation).toHaveBeenCalledWith('conv_001');
    expect(mockGetConversationMessages).toHaveBeenCalledWith('conv_001');
    expect(mockSetMessages).toHaveBeenCalledWith(mockMessages);
  });

  it('should handle conversation selection error', async () => {
    mockGetConversationMessages.mockRejectedValueOnce(
      new Error('Failed to load')
    );
    mockGetConversationsList.mockResolvedValueOnce([]);

    const store = createTestStore();
    const { result } = renderHook(() => useConversationManagement(), {
      wrapper: createWrapper(store),
    });

    // Wait for initial render
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.handleSelectConversation('conv_001');
    });

    expect(mockSetMessages).toHaveBeenCalledWith([]);
  });

  it('should save settings for new conversation', async () => {
    const mockSettings = {
      conversation_id: 'conv_new',
      title: 'New Conversation',
    };

    const mockSavedSettings = {
      ...mockSettings,
      id: 1,
    };

    mockCreateOrUpdateSettings.mockResolvedValueOnce(mockSavedSettings);
    // Mock both the initial load and the reload in handleSaveSettings
    mockGetConversationsList
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    (useUIState as any).mockReturnValue({
      isNewConversation: true,
      pendingConversationId: 'conv_new',
      setIsNewConversation: mockSetIsNewConversation,
      setPendingConversationId: mockSetPendingConversationId,
    });

    const store = createTestStore();
    const { result } = renderHook(() => useConversationManagement(), {
      wrapper: createWrapper(store),
    });

    // Wait for initial render
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.handleSaveSettings(mockSettings);
    });

    expect(mockCreateOrUpdateSettings).toHaveBeenCalledWith(mockSettings);
    expect(mockSettingsDialogClose).toHaveBeenCalled();
    expect(mockSetIsNewConversation).toHaveBeenCalledWith(false);
    expect(mockSetPendingConversationId).toHaveBeenCalledWith(null);
    expect(mockSetActiveConversation).toHaveBeenCalledWith('conv_new');
    expect(mockSetMessages).toHaveBeenCalledWith([]);
  });

  it('should save settings for existing conversation', async () => {
    const mockSettings = {
      conversation_id: 'conv_001',
      title: 'Updated Title',
    };

    mockCreateOrUpdateSettings.mockResolvedValueOnce(mockSettings);
    // Mock both the initial load and the reload in handleSaveSettings
    mockGetConversationsList
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    (useUIState as any).mockReturnValue({
      isNewConversation: false,
      pendingConversationId: null,
      setIsNewConversation: mockSetIsNewConversation,
      setPendingConversationId: mockSetPendingConversationId,
    });

    const store = createTestStore();
    const { result } = renderHook(() => useConversationManagement(), {
      wrapper: createWrapper(store),
    });

    // Wait for initial render
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.handleSaveSettings(mockSettings);
    });

    expect(mockCreateOrUpdateSettings).toHaveBeenCalledWith(mockSettings);
    expect(mockSettingsDialogClose).toHaveBeenCalled();
  });

  it('should handle save settings error', async () => {
    const mockSettings = {
      conversation_id: 'conv_001',
      title: 'Test',
    };

    mockCreateOrUpdateSettings.mockRejectedValueOnce(new Error('Save failed'));
    mockGetConversationsList.mockResolvedValueOnce([]);

    const store = createTestStore();
    const { result } = renderHook(() => useConversationManagement(), {
      wrapper: createWrapper(store),
    });

    // Wait for initial render
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await expect(
      act(async () => {
        await result.current.handleSaveSettings(mockSettings);
      })
    ).rejects.toThrow();
  });

  it('should delete conversation after confirmation', async () => {
    (confirmDialog as any).mockResolvedValueOnce(true);
    mockDeleteConversation.mockResolvedValueOnce(true);
    // Mock both the initial load and the reload in handleDeleteConversation
    mockGetConversationsList
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    (useChatState as any).mockReturnValue({
      activeConversationId: 'conv_001',
      messages: [],
      setActiveConversation: mockSetActiveConversation,
      setMessages: mockSetMessages,
      removeConversation: mockRemoveConversation,
    });

    (useUIState as any).mockReturnValue({
      isNewConversation: false,
      pendingConversationId: null,
      setIsNewConversation: mockSetIsNewConversation,
      setPendingConversationId: mockSetPendingConversationId,
    });

    const store = createTestStore();
    const { result } = renderHook(() => useConversationManagement(), {
      wrapper: createWrapper(store),
    });

    // Wait for initial render
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.handleDeleteConversation('conv_001');
    });

    expect(confirmDialog).toHaveBeenCalled();
    expect(mockDeleteConversation).toHaveBeenCalledWith('conv_001');
    expect(mockRemoveConversation).toHaveBeenCalledWith('conv_001');
    expect(mockSetActiveConversation).toHaveBeenCalledWith(null);
    expect(mockSetMessages).toHaveBeenCalledWith([]);
  });

  it('should not delete conversation if cancelled', async () => {
    (confirmDialog as any).mockResolvedValueOnce(false);
    mockGetConversationsList.mockResolvedValueOnce([]);

    const store = createTestStore();
    const { result } = renderHook(() => useConversationManagement(), {
      wrapper: createWrapper(store),
    });

    // Wait for initial render
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.handleDeleteConversation('conv_001');
    });

    expect(mockDeleteConversation).not.toHaveBeenCalled();
  });

  it('should handle delete conversation error', async () => {
    (confirmDialog as any).mockResolvedValueOnce(true);
    mockDeleteConversation.mockRejectedValueOnce(new Error('Delete failed'));
    mockGetConversationsList.mockResolvedValueOnce([]);

    const store = createTestStore();
    const { result } = renderHook(() => useConversationManagement(), {
      wrapper: createWrapper(store),
    });

    // Wait for initial render
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.handleDeleteConversation('conv_001');
    });

    expect(mockDeleteConversation).toHaveBeenCalled();
  });

  it('should send message when conversation exists', async () => {
    const mockAiMessage: ChatMessage = {
      id: 'ai_msg1',
      role: 'assistant',
      content: 'AI response',
      needsSummary: false,
    };

    mockSendMessageStream.mockResolvedValueOnce(mockAiMessage);
    mockGetConversationMessages.mockResolvedValueOnce([]);
    mockGetConversationsList.mockResolvedValueOnce([]);

    (useChatState as any).mockReturnValue({
      activeConversationId: 'conv_001',
      messages: [],
      setActiveConversation: mockSetActiveConversation,
      setMessages: mockSetMessages,
      removeConversation: mockRemoveConversation,
    });

    const store = createTestStore();
    const { result } = renderHook(() => useConversationManagement(), {
      wrapper: createWrapper(store),
    });

    // Wait for initial render
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.handleSendMessage('Hello');
    });

    expect(mockSendMessageStream).toHaveBeenCalledWith(
      'Hello',
      'conv_001',
      expect.any(Function)
    );
  });

  it('should create new conversation when sending message without active conversation', async () => {
    mockGetConversationsList.mockResolvedValueOnce([]);

    const store = createTestStore();
    const { result } = renderHook(() => useConversationManagement(), {
      wrapper: createWrapper(store),
    });

    // Wait for initial render
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    act(() => {
      result.current.handleSendMessage('Hello');
    });

    expect(mockSetPendingConversationId).toHaveBeenCalled();
    expect(mockSetIsNewConversation).toHaveBeenCalledWith(true);
    expect(mockSettingsDialogOpen).toHaveBeenCalled();
    expect(mockSendMessageStream).not.toHaveBeenCalled();
  });

  it('should handle message streaming updates', async () => {
    const mockAiMessage: ChatMessage = {
      id: 'ai_msg1',
      role: 'assistant',
      content: 'AI response',
      needsSummary: false,
    };

    let onChunkCallback: ((chunk: string, accumulated: string) => void) | null =
      null;

    mockSendMessageStream.mockImplementation(
      (message: string, convId: string, onChunk: any) => {
        onChunkCallback = onChunk;
        return Promise.resolve(mockAiMessage);
      }
    );

    mockGetConversationMessages.mockResolvedValueOnce([]);
    mockGetConversationsList.mockResolvedValueOnce([]);

    const currentMessages: ChatMessage[] = [];

    (useChatState as any).mockReturnValue({
      activeConversationId: 'conv_001',
      messages: currentMessages,
      setActiveConversation: mockSetActiveConversation,
      setMessages: (newMessages: ChatMessage[]) => {
        currentMessages.length = 0;
        currentMessages.push(...newMessages);
      },
      removeConversation: mockRemoveConversation,
    });

    const store = createTestStore();
    const { result } = renderHook(() => useConversationManagement(), {
      wrapper: createWrapper(store),
    });

    // Wait for initial render
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.handleSendMessage('Hello');
    });

    // Simulate streaming chunks
    if (onChunkCallback) {
      act(() => {
        onChunkCallback('Hello', 'Hello');
      });
      act(() => {
        onChunkCallback(' World', 'Hello World');
      });
    }

    expect(mockSendMessageStream).toHaveBeenCalled();
  });

  it('should open summary dialog when message needs summary', async () => {
    const mockAiMessage: ChatMessage = {
      id: 'ai_msg1',
      role: 'assistant',
      content: 'AI response',
      needsSummary: true,
      messageCount: 50,
    };

    mockSendMessageStream.mockResolvedValueOnce(mockAiMessage);
    mockGetConversationMessages.mockResolvedValueOnce([]);
    mockGetConversationsList.mockResolvedValueOnce([]);

    (useChatState as any).mockReturnValue({
      activeConversationId: 'conv_001',
      messages: [],
      setActiveConversation: mockSetActiveConversation,
      setMessages: mockSetMessages,
      removeConversation: mockRemoveConversation,
    });

    const store = createTestStore();
    const { result } = renderHook(() => useConversationManagement(), {
      wrapper: createWrapper(store),
    });

    // Wait for initial render
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.handleSendMessage('Hello');
    });

    expect(mockSummaryDialogOpen).toHaveBeenCalledWith('conv_001', 50);
  });

  it('should handle send message error', async () => {
    mockSendMessageStream.mockRejectedValueOnce(new Error('Send failed'));
    mockGetConversationsList.mockResolvedValueOnce([]);

    (useChatState as any).mockReturnValue({
      activeConversationId: 'conv_001',
      messages: [],
      setActiveConversation: mockSetActiveConversation,
      setMessages: mockSetMessages,
      removeConversation: mockRemoveConversation,
    });

    const store = createTestStore();
    const { result } = renderHook(() => useConversationManagement(), {
      wrapper: createWrapper(store),
    });

    // Wait for initial render
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await expect(
      act(async () => {
        await result.current.handleSendMessage('Hello');
      })
    ).rejects.toThrow();
  });

  it('should generate summary', async () => {
    const mockSummary = 'Generated summary text';

    (useConversationClient as any).mockReturnValue({
      getConversationsList: mockGetConversationsList,
      getConversationMessages: mockGetConversationMessages,
      createOrUpdateSettings: mockCreateOrUpdateSettings,
      deleteConversation: mockDeleteConversation,
      generateSummary: vi.fn().mockResolvedValueOnce(mockSummary),
      saveSummary: vi.fn(),
    });

    (useChatState as any).mockReturnValue({
      activeConversationId: 'conv_001',
      messages: [],
      setActiveConversation: mockSetActiveConversation,
      setMessages: mockSetMessages,
      removeConversation: mockRemoveConversation,
    });

    mockGetConversationsList.mockResolvedValueOnce([]);

    const store = createTestStore();
    const { result } = renderHook(() => useConversationManagement(), {
      wrapper: createWrapper(store),
    });

    // Wait for initial render
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    let summary: string | undefined;

    await act(async () => {
      summary = await result.current.handleGenerateSummary();
    });

    expect(summary).toBe(mockSummary);
  });

  it('should throw error when generating summary without active conversation', async () => {
    mockGetConversationsList.mockResolvedValueOnce([]);

    const store = createTestStore();
    const { result } = renderHook(() => useConversationManagement(), {
      wrapper: createWrapper(store),
    });

    // Wait for initial render
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await expect(
      act(async () => {
        await result.current.handleGenerateSummary();
      })
    ).rejects.toThrow('No active conversation');
  });

  it('should save summary', async () => {
    const mockSaveSummary = vi.fn().mockResolvedValueOnce({
      conversation_id: 'conv_001',
      summary: 'Saved summary',
    });

    (useConversationClient as any).mockReturnValue({
      getConversationsList: mockGetConversationsList,
      getConversationMessages: mockGetConversationMessages,
      createOrUpdateSettings: mockCreateOrUpdateSettings,
      deleteConversation: mockDeleteConversation,
      generateSummary: vi.fn(),
      saveSummary: mockSaveSummary,
    });

    (useChatState as any).mockReturnValue({
      activeConversationId: 'conv_001',
      messages: [],
      setActiveConversation: mockSetActiveConversation,
      setMessages: mockSetMessages,
      removeConversation: mockRemoveConversation,
    });

    mockGetConversationsList.mockResolvedValueOnce([]);

    const store = createTestStore();
    const { result } = renderHook(() => useConversationManagement(), {
      wrapper: createWrapper(store),
    });

    // Wait for initial render
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.handleSaveSummary('Summary text');
    });

    expect(mockSaveSummary).toHaveBeenCalledWith('conv_001', 'Summary text');
    expect(mockSummaryDialogClose).toHaveBeenCalled();
  });

  it('should throw error when saving summary without active conversation', async () => {
    mockGetConversationsList.mockResolvedValueOnce([]);

    const store = createTestStore();
    const { result } = renderHook(() => useConversationManagement(), {
      wrapper: createWrapper(store),
    });

    // Wait for initial render
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await expect(
      act(async () => {
        await result.current.handleSaveSummary('Summary text');
      })
    ).rejects.toThrow('No active conversation');
  });

  it('should load conversations manually', async () => {
    const mockConversations: ConversationWithSettings[] = [
      {
        id: 'conv_001',
        title: 'Test',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    mockGetConversationsList
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(mockConversations);

    const store = createTestStore();
    const { result } = renderHook(() => useConversationManagement(), {
      wrapper: createWrapper(store),
    });

    // Wait for initial render
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.loadConversations();
    });

    expect(result.current.conversations).toEqual(mockConversations);
  });

  it('should handle load conversations error', async () => {
    mockGetConversationsList
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('Load failed'));

    const store = createTestStore();
    const { result } = renderHook(() => useConversationManagement(), {
      wrapper: createWrapper(store),
    });

    // Wait for initial render
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.loadConversations();
    });

    // Should not throw, just log error
    expect(mockGetConversationsList).toHaveBeenCalled();
  });
});
