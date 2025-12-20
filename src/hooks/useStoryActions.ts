import { AppSettings, ChatMessage } from '@/types';
import { useCallback, useEffect, useRef } from 'react';
import { useStoryClient } from './useStoryClient';

interface UseStoryActionsParams {
  activeConversationId: string | null;
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  settings: AppSettings;
  showError: (message: string) => void;
  onConversationSelect?: (conversationId: string) => Promise<void>;
}

export const useStoryActions = ({
  activeConversationId,
  messages,
  setMessages,
  settings,
  showError,
  onConversationSelect,
}: UseStoryActionsParams) => {
  const storyClient = useStoryClient(settings);

  // Use ref to store latest messages for callback
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const handleGenerateStory = useCallback(async () => {
    if (!activeConversationId) return;
    try {
      // Immediately add a loading message
      const loadingMessageId = `loading_${Date.now()}_${Math.random()}`;
      const currentMessages = messagesRef.current;
      setMessages([
        ...currentMessages,
        {
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          id: loadingMessageId,
        },
      ]);

      let assistantMessageId: string | null = loadingMessageId;
      let isFirstChunk = true;

      await storyClient.generateStory(
        activeConversationId,
        (_chunk: string, accumulated: string) => {
          // Update message content in real-time
          // Get current message list (use ref to get latest value)
          const currentMessages = messagesRef.current;

          if (isFirstChunk) {
            // Use pre-created loading message, update its content
            const updatedMessages = currentMessages.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: accumulated }
                : msg
            );
            setMessages(updatedMessages);
            isFirstChunk = false;
          } else {
            // Subsequent chunks, find assistant message and update
            if (assistantMessageId) {
              const assistantIndex = currentMessages.findIndex(
                (msg) => msg.id === assistantMessageId
              );
              if (assistantIndex !== -1) {
                // Update found message - create new object
                const updatedMessages = currentMessages.map((msg, index) =>
                  index === assistantIndex
                    ? { ...msg, content: accumulated }
                    : msg
                );
                setMessages(updatedMessages);
              } else {
                // If not found, try to use last assistant message
                const lastAssistantIndex = currentMessages
                  .map((msg, idx) => (msg.role === 'assistant' ? idx : -1))
                  .filter((idx) => idx !== -1)
                  .pop();

                if (
                  lastAssistantIndex !== undefined &&
                  lastAssistantIndex !== -1
                ) {
                  assistantMessageId =
                    currentMessages[lastAssistantIndex].id ||
                    assistantMessageId;
                  const updatedMessages = currentMessages.map((msg, index) =>
                    index === lastAssistantIndex
                      ? { ...msg, content: accumulated }
                      : msg
                  );
                  setMessages(updatedMessages);
                } else {
                  // If still not found, add new message
                  setMessages([
                    ...currentMessages,
                    {
                      role: 'assistant',
                      content: accumulated,
                      timestamp: Date.now(),
                      id: assistantMessageId,
                    },
                  ]);
                }
              }
            }
          }
        }
      );
      // Note: We don't need to reload messages here because streaming already updated them
      // handleSelectConversation would overwrite the streamed updates
    } catch (error) {
      console.error('Failed to generate story:', error);
      showError(
        'Failed to generate story: ' +
          (error instanceof Error ? error.message : String(error))
      );
    }
  }, [activeConversationId, storyClient, setMessages, showError]);

  const handleConfirmSection = useCallback(async () => {
    if (!activeConversationId) return;
    try {
      // Immediately add a loading message
      const loadingMessageId = `loading_${Date.now()}_${Math.random()}`;
      const currentMessages = messagesRef.current;
      setMessages([
        ...currentMessages,
        {
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          id: loadingMessageId,
        },
      ]);

      const result = await storyClient.confirmSection(activeConversationId);

      if (result.success && result.response) {
        // Update loading message content
        const finalMessages = messagesRef.current;
        const updatedMessages = finalMessages.map((msg) =>
          msg.id === loadingMessageId
            ? { ...msg, content: result.response || '' }
            : msg
        );
        setMessages(updatedMessages);
      }
    } catch (error) {
      console.error('Failed to confirm section:', error);
      showError(
        'Failed to confirm section: ' +
          (error instanceof Error ? error.message : String(error))
      );
    }
  }, [activeConversationId, storyClient, setMessages, showError]);

  const handleRewriteSection = useCallback(
    async (feedback: string) => {
      if (!activeConversationId || !onConversationSelect) return;
      try {
        const result = await storyClient.rewriteSection(
          activeConversationId,
          feedback
        );
        if (result.success && result.response) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          await onConversationSelect(activeConversationId);
        }
      } catch (error) {
        console.error('Failed to rewrite section:', error);
      }
    },
    [activeConversationId, storyClient, onConversationSelect]
  );

  const handleModifySection = useCallback(
    async (feedback: string) => {
      if (!activeConversationId || !onConversationSelect) return;
      try {
        const result = await storyClient.modifySection(
          activeConversationId,
          feedback
        );
        if (result.success && result.response) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          await onConversationSelect(activeConversationId);
        }
      } catch (error) {
        console.error('Failed to modify section:', error);
      }
    },
    [activeConversationId, storyClient, onConversationSelect]
  );

  return {
    handleGenerateStory,
    handleConfirmSection,
    handleRewriteSection,
    handleModifySection,
  };
};
