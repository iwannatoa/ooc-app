/**
 * Hook for managing story actions
 *
 * Encapsulates all story-related actions and state to reduce prop drilling.
 * The actual business logic is in useAppLogic.
 */

import { useCallback } from 'react';
import { ChatMessage } from '@/types';
import { AppSettings } from '@/types';
import { useStoryClient } from './useStoryClient';
import { useI18n } from '@/i18n/i18n';
import { useChatState } from './useChatState';
import { reportApiFailureToToast } from '@/utils/reportApiFailure';

export interface UseStoryActionsParams {
  activeConversationId: string | null;
  messages: ChatMessage[];
  setMessages: (
    messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])
  ) => void;
  settings: AppSettings;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  onConversationSelect: (conversationId: string) => Promise<void>;
}

export interface UseStoryActionsReturn {
  handleGenerateStory: () => Promise<void>;
  handleConfirmSection: () => Promise<void>;
  handleRewriteSection: (feedback: string) => Promise<void>;
  handleModifySection: (feedback: string) => Promise<void>;
}

export const useStoryActions = (
  params: UseStoryActionsParams
): UseStoryActionsReturn => {
  const {
    activeConversationId,
    setMessages,
    settings,
    showError,
    showWarning,
    onConversationSelect,
  } = params;
  const storyClient = useStoryClient(settings);
  const { t } = useI18n();
  const { setSending, setStoryOperation, applyStreamingAssistantChunk } =
    useChatState();

  /** Toast when `<CHARACTERS>` parse was imperfect; copy follows current i18n locale (zh/en). */
  const maybeWarnCharacterParse = useCallback(
    (parseWarnings?: string[]) => {
      if (parseWarnings?.length) {
        showWarning(t('storyWarnings.characterParseNotice'));
      }
    },
    [showWarning, t]
  );

  const handleGenerateStory = useCallback(async () => {
    if (!activeConversationId) {
      return;
    }

    setStoryOperation('generate');
    setSending(true);
    try {
      const onChunk = (_chunk: string, accumulated: string) => {
        applyStreamingAssistantChunk(accumulated);
      };

      const result = await storyClient.generateStory(
        activeConversationId,
        onChunk
      );

      if (result.success && result.response) {
        applyStreamingAssistantChunk(result.response);
        await onConversationSelect(activeConversationId);
        maybeWarnCharacterParse(result.parse_warnings);
      } else {
        showError(
          t('storyErrors.generateFailedDetail', {
            detail: result.error || t('storyErrors.unknownDetail'),
          })
        );
      }
    } catch (error) {
      console.error('Failed to generate story:', error);
      reportApiFailureToToast(error, {
        t,
        showError,
        showWarning,
        detailKey: 'storyErrors.generateFailedDetail',
        hintNamespace: 'storyErrors',
      });
    } finally {
      setSending(false);
    }
  }, [
    activeConversationId,
    storyClient,
    showError,
    showWarning,
    maybeWarnCharacterParse,
    onConversationSelect,
    t,
    applyStreamingAssistantChunk,
    setSending,
    setStoryOperation,
  ]);

  const handleConfirmSection = useCallback(async () => {
    if (!activeConversationId) {
      return;
    }

    setStoryOperation('confirm');
    setSending(true);
    try {
      const result = await storyClient.confirmSection(activeConversationId);

      if (result.success && result.response) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: result.response!,
            timestamp: Date.now(),
          },
        ]);
        await onConversationSelect(activeConversationId);
        maybeWarnCharacterParse(result.parse_warnings);
      } else {
        showError(
          t('storyErrors.confirmFailedDetail', {
            detail: result.error || t('storyErrors.unknownDetail'),
          })
        );
      }
    } catch (error) {
      console.error('Failed to confirm section:', error);
      reportApiFailureToToast(error, {
        t,
        showError,
        detailKey: 'storyErrors.confirmFailedDetail',
        hintNamespace: 'storyErrors',
      });
    } finally {
      setSending(false);
    }
  }, [
    activeConversationId,
    setMessages,
    storyClient,
    showError,
    maybeWarnCharacterParse,
    onConversationSelect,
    t,
    setSending,
    setStoryOperation,
  ]);

  const handleRewriteSection = useCallback(
    async (feedback: string) => {
      if (!activeConversationId) {
        return;
      }

      setStoryOperation('rewrite');
      setSending(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 300));

        const result = await storyClient.rewriteSection(
          activeConversationId,
          feedback
        );

        if (result.success && result.response) {
          setMessages((prev) => [
            ...prev,
            {
              id: `msg_${Date.now()}`,
              role: 'assistant',
              content: result.response!,
              timestamp: Date.now(),
            },
          ]);
          await onConversationSelect(activeConversationId);
          maybeWarnCharacterParse(result.parse_warnings);
        } else {
          showError(
            t('storyErrors.rewriteFailedDetail', {
              detail: result.error || t('storyErrors.unknownDetail'),
            })
          );
        }
      } catch (error) {
        console.error('Failed to rewrite section:', error);
        reportApiFailureToToast(error, {
          t,
          showError,
          detailKey: 'storyErrors.rewriteFailedDetail',
          hintNamespace: 'storyErrors',
        });
      } finally {
        setSending(false);
      }
    },
    [
      activeConversationId,
      setMessages,
      storyClient,
      showError,
      maybeWarnCharacterParse,
      onConversationSelect,
      t,
      setSending,
      setStoryOperation,
    ]
  );

  const handleModifySection = useCallback(
    async (feedback: string) => {
      if (!activeConversationId) {
        return;
      }

      setStoryOperation('modify');
      setSending(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 300));

        const result = await storyClient.modifySection(
          activeConversationId,
          feedback
        );

        if (result.success && result.response) {
          setMessages((prev) => [
            ...prev,
            {
              id: `msg_${Date.now()}`,
              role: 'assistant',
              content: result.response!,
              timestamp: Date.now(),
            },
          ]);
          await onConversationSelect(activeConversationId);
          maybeWarnCharacterParse(result.parse_warnings);
        } else {
          showError(
            t('storyErrors.modifyFailedDetail', {
              detail: result.error || t('storyErrors.unknownDetail'),
            })
          );
        }
      } catch (error) {
        console.error('Failed to modify section:', error);
        reportApiFailureToToast(error, {
          t,
          showError,
          detailKey: 'storyErrors.modifyFailedDetail',
          hintNamespace: 'storyErrors',
        });
      } finally {
        setSending(false);
      }
    },
    [
      activeConversationId,
      setMessages,
      storyClient,
      showError,
      maybeWarnCharacterParse,
      onConversationSelect,
      t,
      setSending,
      setStoryOperation,
    ]
  );

  return {
    handleGenerateStory,
    handleConfirmSection,
    handleRewriteSection,
    handleModifySection,
  };
};
