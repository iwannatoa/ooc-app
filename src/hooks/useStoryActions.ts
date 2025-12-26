/**
 * Hook for managing story actions
 *
 * Encapsulates all story-related actions and state to reduce prop drilling.
 * This hook provides a clean interface for story action operations.
 *
 * Note: This is a wrapper hook that groups props for components.
 * The actual business logic is in useAppLogic.
 */

import { useCallback } from 'react';
import { ChatMessage } from '@/types';
import { AppSettings } from '@/types';
import { useStoryClient } from './useStoryClient';

export interface UseStoryActionsParams {
  activeConversationId: string | null;
  messages: ChatMessage[];
  setMessages: (
    messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])
  ) => void;
  settings: AppSettings;
  showError: (message: string) => void;
  onConversationSelect: (conversationId: string) => Promise<void>;
}

export interface UseStoryActionsReturn {
  handleGenerateStory: () => Promise<void>;
  handleConfirmSection: () => Promise<void>;
  handleRewriteSection: (feedback: string) => Promise<void>;
  handleModifySection: (feedback: string) => Promise<void>;
}

/**
 * Hook for managing story actions
 *
 * Provides handlers for story generation, confirmation, rewriting, and modification.
 *
 * @param params - Story action parameters
 * @returns Story action handlers
 */
export const useStoryActions = (
  params: UseStoryActionsParams
): UseStoryActionsReturn => {
  const {
    activeConversationId,
    setMessages,
    settings,
    showError,
    onConversationSelect,
  } = params;
  const storyClient = useStoryClient(settings);

  const handleGenerateStory = useCallback(async () => {
    if (!activeConversationId) {
      return;
    }

    try {
      const onChunk = (_chunk: string, accumulated: string) => {
        // Update messages with streaming content
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            // Update existing assistant message
            return [
              ...prev.slice(0, -1),
              {
                ...lastMessage,
                content: accumulated,
              },
            ];
          } else {
            // Create new assistant message
            return [
              ...prev,
              {
                id: `msg_${Date.now()}`,
                role: 'assistant',
                content: accumulated,
                timestamp: Date.now(),
              },
            ];
          }
        });
      };

      const result = await storyClient.generateStory(
        activeConversationId,
        onChunk
      );

      if (result.success && result.response) {
        // Final update with stripped content
        const finalContent = result.response;
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            return [
              ...prev.slice(0, -1),
              {
                ...lastMessage,
                content: finalContent,
              },
            ];
          } else {
            return [
              ...prev,
              {
                id: `msg_${Date.now()}`,
                role: 'assistant',
                content: finalContent,
                timestamp: Date.now(),
              },
            ];
          }
        });
        await onConversationSelect(activeConversationId);
      } else {
        showError(result.error || 'Failed to generate story');
      }
    } catch (error) {
      console.error('Failed to generate story:', error);
      showError(
        'Failed to generate story: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }, [
    activeConversationId,
    setMessages,
    storyClient,
    showError,
    onConversationSelect,
  ]);

  const handleConfirmSection = useCallback(async () => {
    if (!activeConversationId) {
      return;
    }

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
      } else {
        showError(result.error || 'Failed to confirm section');
      }
    } catch (error) {
      console.error('Failed to confirm section:', error);
      showError(
        'Failed to confirm section: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }, [
    activeConversationId,
    setMessages,
    storyClient,
    showError,
    onConversationSelect,
  ]);

  const handleRewriteSection = useCallback(
    async (feedback: string) => {
      if (!activeConversationId) {
        return;
      }

      try {
        // Add a small delay to allow UI to update
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
        } else {
          showError(result.error || 'Failed to rewrite section');
        }
      } catch (error) {
        console.error('Failed to rewrite section:', error);
        showError(
          'Failed to rewrite section: ' +
            (error instanceof Error ? error.message : 'Unknown error')
        );
      }
    },
    [
      activeConversationId,
      setMessages,
      storyClient,
      showError,
      onConversationSelect,
    ]
  );

  const handleModifySection = useCallback(
    async (feedback: string) => {
      if (!activeConversationId) {
        return;
      }

      try {
        // Add a small delay to allow UI to update
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
        } else {
          showError(result.error || 'Failed to modify section');
        }
      } catch (error) {
        console.error('Failed to modify section:', error);
        showError(
          'Failed to modify section: ' +
            (error instanceof Error ? error.message : 'Unknown error')
        );
      }
    },
    [
      activeConversationId,
      setMessages,
      storyClient,
      showError,
      onConversationSelect,
    ]
  );

  return {
    handleGenerateStory,
    handleConfirmSection,
    handleRewriteSection,
    handleModifySection,
  };
};

