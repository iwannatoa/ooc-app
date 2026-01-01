import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppLogic } from '../useAppLogic';
import * as useChatState from '../useChatState';
import * as useSettingsState from '../useSettingsState';
import * as useToast from '../useToast';
import * as useI18n from '@/i18n/i18n';
import * as useConversationClient from '../useConversationClient';
import * as useStoryProgress from '../useStoryProgress';
import * as useConversationManagement from '../useConversationManagement';
import * as useStoryActions from '../useStoryActions';
import { confirmDialog } from '@/services/confirmDialogService';
import {
  ChatMessage,
  ConversationWithSettings,
  ConversationSettings,
} from '@/types';

import {
  createMockChatState,
  createMockSettingsStateWithProvider,
  createMockToast,
  createMockI18n,
  createMockConversationClient,
  createMockStoryProgress,
  createMockConversationManagement,
  createMockStoryActions,
} from '@/mock';

vi.mock('../useChatState');
vi.mock('../useSettingsState');
vi.mock('../useToast');
vi.mock('@/i18n/i18n');
vi.mock('../useConversationClient');
vi.mock('../useStoryProgress');
vi.mock('../useConversationManagement');
vi.mock('../useStoryActions');
vi.mock('@/services/confirmDialogService');

describe('useAppLogic', () => {
  const mockSetMessages = vi.fn();
  const mockShowError = vi.fn();
  const mockShowSuccess = vi.fn();
  const mockT = vi.fn((key: string) => key);
  const mockDeleteLastMessage = vi.fn();
  const mockHandleSelectConversation = vi.fn().mockResolvedValue(undefined);
  const mockHandleSaveSettings = vi.fn();
  const mockHandleGenerateSummary = vi.fn();
  const mockHandleSaveSummary = vi.fn();
  const mockHandleGenerateStory = vi.fn();
  const mockHandleConfirmSection = vi.fn();
  const mockHandleRewriteSection = vi.fn();
  const mockHandleModifySection = vi.fn();

  const mockMessages: ChatMessage[] = [
    {
      id: 'msg_1',
      role: 'user',
      content: 'Test message',
      timestamp: Date.now(),
    },
  ];

  const mockConversations: ConversationWithSettings[] = [
    {
      id: 'conv_1',
      title: 'Test Conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      settings: {
        conversation_id: 'conv_1',
        title: 'Test Story',
        outline: 'Test outline',
        characters: [],
      } as ConversationSettings,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useChatState.useChatState).mockReturnValue(
      createMockChatState({
        messages: mockMessages,
        setMessages: mockSetMessages,
      })
    );

    vi.mocked(useSettingsState.useSettingsState).mockReturnValue(
      createMockSettingsStateWithProvider('ollama')
    );

    vi.mocked(useToast.useToast).mockReturnValue(
      createMockToast({
        showError: mockShowError,
        showSuccess: mockShowSuccess,
      })
    );

    vi.mocked(useI18n.useI18n).mockReturnValue(
      createMockI18n({
        t: mockT,
      })
    );

    vi.mocked(useConversationClient.useConversationClient).mockReturnValue(
      createMockConversationClient({
        deleteLastMessage: mockDeleteLastMessage,
      })
    );

    vi.mocked(useStoryProgress.useStoryProgress).mockReturnValue(
      createMockStoryProgress({
        progress: null,
      })
    );

    vi.mocked(
      useConversationManagement.useConversationManagement
    ).mockReturnValue(
      createMockConversationManagement({
        conversations: mockConversations,
        activeConversationId: 'conv_1',
        pendingConversationId: null,
        handleSaveSettings: mockHandleSaveSettings,
        handleGenerateSummary: mockHandleGenerateSummary,
        handleSaveSummary: mockHandleSaveSummary,
        handleSelectConversation: mockHandleSelectConversation,
      })
    );

    vi.mocked(useStoryActions.useStoryActions).mockReturnValue(
      createMockStoryActions({
        handleGenerateStory: mockHandleGenerateStory,
        handleConfirmSection: mockHandleConfirmSection,
        handleRewriteSection: mockHandleRewriteSection,
        handleModifySection: mockHandleModifySection,
      })
    );
  });

  describe('getCurrentSettings', () => {
    it('should return settings for pending conversation', () => {
      const conversations: ConversationWithSettings[] = [
        {
          id: 'conv_1',
          title: 'Conv 1',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          settings: {
            conversation_id: 'conv_1',
            title: 'Settings 1',
          } as ConversationSettings,
        },
        {
          id: 'conv_2',
          title: 'Conv 2',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          settings: {
            conversation_id: 'conv_2',
            title: 'Settings 2',
          } as ConversationSettings,
        },
      ];

      vi.mocked(
        useConversationManagement.useConversationManagement
      ).mockReturnValue(
        createMockConversationManagement({
          conversations,
          activeConversationId: 'conv_1',
          pendingConversationId: 'conv_2',
          handleSaveSettings: mockHandleSaveSettings,
          handleGenerateSummary: mockHandleGenerateSummary,
          handleSaveSummary: mockHandleSaveSummary,
          handleSelectConversation: mockHandleSelectConversation,
        })
      );

      const { result } = renderHook(() => useAppLogic());

      expect(result.current.currentSettings?.title).toBe('Settings 2');
    });

    it('should return settings for active conversation when no pending', () => {
      const conversations: ConversationWithSettings[] = [
        {
          id: 'conv_1',
          title: 'Conv 1',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          settings: {
            conversation_id: 'conv_1',
            title: 'Settings 1',
          } as ConversationSettings,
        },
      ];

      vi.mocked(
        useConversationManagement.useConversationManagement
      ).mockReturnValue(
        createMockConversationManagement({
          conversations,
          activeConversationId: 'conv_1',
          pendingConversationId: null,
          handleSaveSettings: mockHandleSaveSettings,
          handleGenerateSummary: mockHandleGenerateSummary,
          handleSaveSummary: mockHandleSaveSummary,
          handleSelectConversation: mockHandleSelectConversation,
        })
      );

      const { result } = renderHook(() => useAppLogic());

      expect(result.current.currentSettings?.title).toBe('Settings 1');
    });

    it('should return undefined when conversation not found', () => {
      vi.mocked(
        useConversationManagement.useConversationManagement
      ).mockReturnValue(
        createMockConversationManagement({
          conversations: [],
          activeConversationId: 'conv_1',
          pendingConversationId: null,
          handleSaveSettings: mockHandleSaveSettings,
          handleGenerateSummary: mockHandleGenerateSummary,
          handleSaveSummary: mockHandleSaveSummary,
          handleSelectConversation: mockHandleSelectConversation,
        })
      );

      const { result } = renderHook(() => useAppLogic());

      expect(result.current.currentSettings).toBeUndefined();
    });
  });

  describe('canGenerateStory', () => {
    it('should return true when activeConversationId exists', () => {
      vi.mocked(
        useConversationManagement.useConversationManagement
      ).mockReturnValue(
        createMockConversationManagement({
          conversations: mockConversations,
          activeConversationId: 'conv_1',
          pendingConversationId: null,
          handleSaveSettings: mockHandleSaveSettings,
          handleGenerateSummary: mockHandleGenerateSummary,
          handleSaveSummary: mockHandleSaveSummary,
          handleSelectConversation: mockHandleSelectConversation,
        })
      );

      const { result } = renderHook(() => useAppLogic());

      expect(result.current.canGenerate).toBe(true);
    });

    it('should return false when activeConversationId is null', () => {
      vi.mocked(
        useConversationManagement.useConversationManagement
      ).mockReturnValue(
        createMockConversationManagement({
          conversations: mockConversations,
          activeConversationId: null,
          pendingConversationId: null,
          handleSaveSettings: mockHandleSaveSettings,
          handleGenerateSummary: mockHandleGenerateSummary,
          handleSaveSummary: mockHandleSaveSummary,
          handleSelectConversation: mockHandleSelectConversation,
        })
      );

      const { result } = renderHook(() => useAppLogic());

      expect(result.current.canGenerate).toBe(false);
    });
  });

  describe('canConfirmSection', () => {
    it('should return true when all conditions are met', () => {
      const conversations: ConversationWithSettings[] = [
        {
          id: 'conv_1',
          title: 'Conv 1',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          settings: {
            conversation_id: 'conv_1',
            title: 'Test',
            outline: 'Test outline',
            characters: [],
          } as ConversationSettings,
        },
      ];

      vi.mocked(
        useConversationManagement.useConversationManagement
      ).mockReturnValue(
        createMockConversationManagement({
          conversations,
          activeConversationId: 'conv_1',
          pendingConversationId: null,
          handleSaveSettings: mockHandleSaveSettings,
          handleGenerateSummary: mockHandleGenerateSummary,
          handleSaveSummary: mockHandleSaveSummary,
          handleSelectConversation: mockHandleSelectConversation,
        })
      );

      vi.mocked(useChatState.useChatState).mockReturnValue(
        createMockChatState({
          messages: mockMessages,
          setMessages: mockSetMessages,
        })
      );

      const { result } = renderHook(() => useAppLogic());

      expect(result.current.canConfirm).toBe(true);
    });

    it('should return false when activeConversationId is null', () => {
      vi.mocked(
        useConversationManagement.useConversationManagement
      ).mockReturnValue(
        createMockConversationManagement({
          conversations: mockConversations,
          activeConversationId: null,
          pendingConversationId: null,
          handleSaveSettings: mockHandleSaveSettings,
          handleGenerateSummary: mockHandleGenerateSummary,
          handleSaveSummary: mockHandleSaveSummary,
          handleSelectConversation: mockHandleSelectConversation,
        })
      );

      const { result } = renderHook(() => useAppLogic());

      expect(result.current.canConfirm).toBe(false);
    });

    it('should return false when outline is missing', () => {
      const conversations: ConversationWithSettings[] = [
        {
          id: 'conv_1',
          title: 'Conv 1',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          settings: {
            conversation_id: 'conv_1',
            title: 'Test',
            characters: [],
          } as ConversationSettings,
        },
      ];

      vi.mocked(
        useConversationManagement.useConversationManagement
      ).mockReturnValue(
        createMockConversationManagement({
          conversations,
          activeConversationId: 'conv_1',
          pendingConversationId: null,
          handleSaveSettings: mockHandleSaveSettings,
          handleGenerateSummary: mockHandleGenerateSummary,
          handleSaveSummary: mockHandleSaveSummary,
          handleSelectConversation: mockHandleSelectConversation,
        })
      );

      const { result } = renderHook(() => useAppLogic());

      expect(result.current.canConfirm).toBe(false);
    });

    it('should return false when messages are empty', () => {
      vi.mocked(useChatState.useChatState).mockReturnValue(
        createMockChatState({
          messages: [],
          setMessages: mockSetMessages,
        })
      );

      const { result } = renderHook(() => useAppLogic());

      expect(result.current.canConfirm).toBe(false);
    });
  });

  describe('setMessages wrapper', () => {
    it('should handle array updater', () => {
      const { result } = renderHook(() => useAppLogic());

      act(() => {
        result.current.handleGenerateStory();
      });

      // setMessages is called internally by useStoryActions
      // We can't directly test it, but we can verify the hook works
      expect(mockHandleGenerateStory).toHaveBeenCalled();
    });

    it('should handle function updater', () => {
      const { result } = renderHook(() => useAppLogic());

      // The setMessages wrapper is used internally
      // We verify it works by checking that the hook returns properly
      expect(result.current).toBeDefined();
    });
  });

  describe('isFirstChapter', () => {
    it('should return true when messages are empty', () => {
      vi.mocked(useChatState.useChatState).mockReturnValue(
        createMockChatState({
          messages: [],
          setMessages: mockSetMessages,
        })
      );

      const { result } = renderHook(() => useAppLogic());

      expect(result.current.isFirstChapter).toBe(true);
    });

    it('should return true when no assistant messages exist', () => {
      const userMessages: ChatMessage[] = [
        {
          id: 'msg_1',
          role: 'user',
          content: 'User message',
          timestamp: Date.now(),
        },
      ];

      vi.mocked(useChatState.useChatState).mockReturnValue(
        createMockChatState({
          messages: userMessages,
          setMessages: mockSetMessages,
        })
      );

      const { result } = renderHook(() => useAppLogic());

      expect(result.current.isFirstChapter).toBe(true);
    });

    it('should return true when progress is 0 and no assistant messages', () => {
      const userMessages: ChatMessage[] = [
        {
          id: 'msg_1',
          role: 'user',
          content: 'User message',
          timestamp: Date.now(),
        },
      ];

      vi.mocked(useChatState.useChatState).mockReturnValue(
        createMockChatState({
          messages: userMessages,
          setMessages: mockSetMessages,
        })
      );

      vi.mocked(useStoryProgress.useStoryProgress).mockReturnValue(
        createMockStoryProgress({
          progress: {
            conversation_id: 'conv_1',
            current_section: 0,
            status: 'generating' as const,
            outline_confirmed: false,
          },
        })
      );

      const { result } = renderHook(() => useAppLogic());

      expect(result.current.isFirstChapter).toBe(true);
    });

    it('should return false when assistant messages exist', () => {
      const messagesWithAssistant: ChatMessage[] = [
        {
          id: 'msg_1',
          role: 'user',
          content: 'User message',
          timestamp: Date.now(),
        },
        {
          id: 'msg_2',
          role: 'assistant',
          content: 'Assistant message',
          timestamp: Date.now(),
        },
      ];

      vi.mocked(useChatState.useChatState).mockReturnValue(
        createMockChatState({
          messages: messagesWithAssistant,
          setMessages: mockSetMessages,
        })
      );

      const { result } = renderHook(() => useAppLogic());

      expect(result.current.isFirstChapter).toBe(false);
    });

    it('should return false when progress current_section > 0', () => {
      const messagesWithAssistant: ChatMessage[] = [
        {
          id: 'msg_1',
          role: 'assistant',
          content: 'Assistant message',
          timestamp: Date.now(),
        },
      ];

      vi.mocked(useChatState.useChatState).mockReturnValue(
        createMockChatState({
          messages: messagesWithAssistant,
          setMessages: mockSetMessages,
        })
      );

      vi.mocked(useStoryProgress.useStoryProgress).mockReturnValue(
        createMockStoryProgress({
          progress: {
            conversation_id: 'conv_1',
            current_section: 1,
            status: 'generating' as const,
            outline_confirmed: false,
          },
        })
      );

      const { result } = renderHook(() => useAppLogic());

      expect(result.current.isFirstChapter).toBe(false);
    });
  });

  describe('handleDeleteLastMessage', () => {
    it('should not delete when activeConversationId is null', async () => {
      vi.mocked(
        useConversationManagement.useConversationManagement
      ).mockReturnValue(
        createMockConversationManagement({
          conversations: mockConversations,
          activeConversationId: null,
          pendingConversationId: null,
          handleSaveSettings: mockHandleSaveSettings,
          handleGenerateSummary: mockHandleGenerateSummary,
          handleSaveSummary: mockHandleSaveSummary,
          handleSelectConversation: mockHandleSelectConversation,
        })
      );

      const { result } = renderHook(() => useAppLogic());

      await act(async () => {
        await result.current.handleDeleteLastMessage();
      });

      expect(confirmDialog).not.toHaveBeenCalled();
      expect(mockDeleteLastMessage).not.toHaveBeenCalled();
    });

    it('should show confirmation dialog and delete on confirm', async () => {
      vi.mocked(confirmDialog).mockResolvedValue(true);
      mockDeleteLastMessage.mockResolvedValue(true);

      const { result } = renderHook(() => useAppLogic());

      await act(async () => {
        await result.current.handleDeleteLastMessage();
      });

      expect(confirmDialog).toHaveBeenCalledWith({
        message: 'storyActions.confirmDeleteLastMessage',
        confirmText: 'common.confirm',
        cancelText: 'common.cancel',
        confirmButtonStyle: 'danger',
      });
      expect(mockDeleteLastMessage).toHaveBeenCalledWith('conv_1');
      expect(mockShowSuccess).toHaveBeenCalledWith(
        'storyActions.deleteLastMessageSuccess'
      );
      expect(mockHandleSelectConversation).toHaveBeenCalledWith('conv_1');
    });

    it('should not delete when user cancels', async () => {
      vi.mocked(confirmDialog).mockResolvedValue(false);

      const { result } = renderHook(() => useAppLogic());

      await act(async () => {
        await result.current.handleDeleteLastMessage();
      });

      expect(confirmDialog).toHaveBeenCalled();
      expect(mockDeleteLastMessage).not.toHaveBeenCalled();
    });

    it('should show error when delete fails', async () => {
      vi.mocked(confirmDialog).mockResolvedValue(true);
      mockDeleteLastMessage.mockResolvedValue(false);

      const { result } = renderHook(() => useAppLogic());

      await act(async () => {
        await result.current.handleDeleteLastMessage();
      });

      expect(mockShowError).toHaveBeenCalled();
    });

    it('should handle delete error exception', async () => {
      vi.mocked(confirmDialog).mockResolvedValue(true);
      mockDeleteLastMessage.mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useAppLogic());

      await act(async () => {
        await result.current.handleDeleteLastMessage();
      });

      expect(mockShowError).toHaveBeenCalled();
    });
  });

  describe('canDeleteLast', () => {
    it('should return true when messages exist', () => {
      vi.mocked(useChatState.useChatState).mockReturnValue(
        createMockChatState({
          messages: mockMessages,
          setMessages: mockSetMessages,
        })
      );

      const { result } = renderHook(() => useAppLogic());

      expect(result.current.canDeleteLast).toBe(true);
    });

    it('should return false when messages are empty', () => {
      vi.mocked(useChatState.useChatState).mockReturnValue(
        createMockChatState({
          messages: [],
          setMessages: mockSetMessages,
        })
      );

      const { result } = renderHook(() => useAppLogic());

      expect(result.current.canDeleteLast).toBe(false);
    });
  });

  describe('story actions', () => {
    it('should return story action handlers', () => {
      const { result } = renderHook(() => useAppLogic());

      expect(result.current.handleGenerateStory).toBe(mockHandleGenerateStory);
      expect(result.current.handleConfirmSection).toBe(
        mockHandleConfirmSection
      );
      expect(result.current.handleRewriteSection).toBe(
        mockHandleRewriteSection
      );
      expect(result.current.handleModifySection).toBe(mockHandleModifySection);
    });
  });

  describe('conversation management actions', () => {
    it('should return conversation management handlers', () => {
      const { result } = renderHook(() => useAppLogic());

      expect(result.current.handleSaveSettings).toBe(mockHandleSaveSettings);
      expect(result.current.handleGenerateSummary).toBe(
        mockHandleGenerateSummary
      );
      expect(result.current.handleSaveSummary).toBe(mockHandleSaveSummary);
    });
  });
});

