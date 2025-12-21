/**
 * Custom Hook: Encapsulates the main business logic of the App component
 * Improves readability of App.tsx by separating complex logic from the component
 */
import { useCallback, useMemo } from 'react';
import { useChatState } from './useChatState';
import { useConversationClient } from './useConversationClient';
import { useConversationManagement } from './useConversationManagement';
import { useStoryActions } from './useStoryActions';
import { useSettingsState } from './useSettingsState';
import { useToast } from './useToast';
import { useI18n } from '@/i18n';
import {
  ConversationWithSettings,
  ConversationSettings,
  ChatMessage,
} from '@/types';

/**
 * Calculate the current conversation's settings
 */
function getCurrentSettings(
  conversations: ConversationWithSettings[],
  pendingConversationId: string | null,
  activeConversationId: string | null
): ConversationSettings | undefined {
  if (pendingConversationId) {
    return conversations.find((c) => c.id === pendingConversationId)?.settings;
  }
  return conversations.find((c) => c.id === activeConversationId)?.settings;
}

/**
 * Check if story generation is possible
 */
function canGenerateStory(activeConversationId: string | null): boolean {
  return !!activeConversationId;
}

/**
 * Check if section confirmation is possible
 */
function canConfirmSection(
  activeConversationId: string | null,
  currentSettings: ConversationSettings | undefined,
  messagesLength: number
): boolean {
  return !!(
    activeConversationId &&
    currentSettings?.outline &&
    messagesLength > 0
  );
}

/**
 * Main business logic Hook for App component
 */
export const useAppLogic = () => {
  // ===== State Management Hooks =====
  const { messages, setMessages: setMessagesRedux } = useChatState();
  const { settings } = useSettingsState();
  const { showError, showSuccess } = useToast();
  const { t } = useI18n();
  const conversationClient = useConversationClient();

  // ===== Wrapper for setMessages to support function updater =====
  const setMessages = useCallback(
    (
      messagesOrUpdater:
        | ChatMessage[]
        | ((prev: ChatMessage[]) => ChatMessage[])
    ) => {
      if (typeof messagesOrUpdater === 'function') {
        const newMessages = messagesOrUpdater(messages);
        setMessagesRedux(newMessages);
      } else {
        setMessagesRedux(messagesOrUpdater);
      }
    },
    [messages, setMessagesRedux]
  );

  // ===== Conversation Management Logic =====
  const conversationManagement = useConversationManagement();
  const {
    conversations,
    activeConversationId,
    showSettingsForm,
    isNewConversation,
    pendingConversationId,
    showSummaryPrompt,
    summaryMessageCount,
    handleNewConversation,
    handleSelectConversation,
    handleDeleteConversation: deleteConversationInternal,
    handleSaveSettings,
    handleGenerateSummary,
    handleSaveSummary,
    setShowSettingsForm,
    setShowSummaryPrompt,
    loadConversations,
  } = conversationManagement;

  // ===== Calculate Derived State =====
  const currentSettings = useMemo(
    () =>
      getCurrentSettings(
        conversations,
        pendingConversationId,
        activeConversationId
      ),
    [conversations, pendingConversationId, activeConversationId]
  );

  const canGenerate = useMemo(
    () => canGenerateStory(activeConversationId),
    [activeConversationId]
  );

  const canConfirm = useMemo(
    () =>
      canConfirmSection(activeConversationId, currentSettings, messages.length),
    [activeConversationId, currentSettings, messages.length]
  );

  // ===== Story Action Logic =====
  const storyActions = useStoryActions({
    activeConversationId,
    messages,
    setMessages,
    settings,
    showError,
    onConversationSelect: handleSelectConversation,
  });

  const {
    handleGenerateStory,
    handleConfirmSection,
    handleRewriteSection,
    handleModifySection,
  } = storyActions;

  // ===== Delete Last Message Logic =====
  const handleDeleteLastMessage = useCallback(async () => {
    if (!activeConversationId) return;

    try {
      const success = await conversationClient.deleteLastMessage(
        activeConversationId
      );
      if (success) {
        showSuccess(t('storyActions.deleteLastMessageSuccess'));
        await handleSelectConversation(activeConversationId);
      } else {
        showError(
          t('storyActions.deleteLastMessageFailed', {
            error: t('common.error'),
          })
        );
      }
    } catch (error) {
      console.error('Failed to delete last message:', error);
      showError(
        t('storyActions.deleteLastMessageFailed', {
          error: t('common.error'),
        })
      );
    }
  }, [
    activeConversationId,
    conversationClient,
    handleSelectConversation,
    showError,
    showSuccess,
    t,
  ]);

  return {
    // State
    messages,
    conversations,
    activeConversationId,
    currentSettings,
    settings,
    showSettingsForm,
    isNewConversation,
    pendingConversationId,
    showSummaryPrompt,
    summaryMessageCount,
    canGenerate,
    canConfirm,
    canDeleteLast: messages.length > 0,

    // Conversation Management Actions
    handleNewConversation,
    handleSelectConversation,
    handleDeleteConversation: deleteConversationInternal,
    handleSaveSettings,
    handleGenerateSummary,
    handleSaveSummary,
    setShowSettingsForm,
    setShowSummaryPrompt,
    loadConversations,

    // Story Actions
    handleGenerateStory,
    handleConfirmSection,
    handleRewriteSection,
    handleModifySection,
    handleDeleteLastMessage,

    // Others
    t,
  };
};
