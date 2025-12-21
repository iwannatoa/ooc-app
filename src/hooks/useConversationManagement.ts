/*
 * Copyright © 2016-2025 Patrick Zhang.
 * All Rights Reserved.
 */
import {
  ChatMessage,
  ConversationSettings,
  ConversationWithSettings,
} from '@/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAiClient } from './useAiClient';
import { useChatState } from './useChatState';
import { useConversationClient } from './useConversationClient';
import { useSettingsState } from './useSettingsState';

export const useConversationManagement = () => {
  const [conversations, setConversations] = useState<
    ConversationWithSettings[]
  >([]);
  const [showSettingsForm, setShowSettingsForm] = useState(false);
  const [isNewConversation, setIsNewConversation] = useState(false);
  const [pendingConversationId, setPendingConversationId] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [showSummaryPrompt, setShowSummaryPrompt] = useState(false);
  const [summaryMessageCount, setSummaryMessageCount] = useState(0);

  const {
    activeConversationId,
    setActiveConversation,
    setMessages,
    removeConversation,
    messages,
  } = useChatState();

  // Use ref to store latest messages for callback
  const messagesRef = useRef<ChatMessage[]>(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const { settings } = useSettingsState();
  const { sendMessageStream } = useAiClient(settings);
  const conversationClient = useConversationClient();

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const list = await conversationClient.getConversationsList();
      setConversations(list);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationClient]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const list = await conversationClient.getConversationsList();
        if (mounted) {
          setConversations(list);
        }
      } catch (error) {
        console.error('Failed to load conversations:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleNewConversation = useCallback(() => {
    const newId = `conv_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    setPendingConversationId(newId);
    setIsNewConversation(true);
    setShowSettingsForm(true);
  }, []);

  const handleSelectConversation = useCallback(
    async (conversationId: string) => {
      try {
        setLoading(true);
        setActiveConversation(conversationId);
        const messages = await conversationClient.getConversationMessages(
          conversationId
        );
        setMessages(messages);
      } catch (error) {
        console.error('Failed to load conversation:', error);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    },
    [conversationClient, setMessages, setActiveConversation]
  );

  const handleSaveSettings = useCallback(
    async (settingsData: Partial<ConversationSettings>) => {
      try {
        setLoading(true);
        await conversationClient.createOrUpdateSettings(settingsData);
        setShowSettingsForm(false);
        setIsNewConversation(false);

        if (isNewConversation && settingsData.conversation_id) {
          setPendingConversationId(null);
          setActiveConversation(settingsData.conversation_id);
          setMessages([]);
        }

        await loadConversations();
      } catch (error) {
        console.error('Failed to save settings:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [
      conversationClient,
      isNewConversation,
      setActiveConversation,
      setMessages,
      loadConversations,
      settings,
    ]
  );

  const handleDeleteConversation = useCallback(
    async (conversationId: string) => {
      try {
        await conversationClient.deleteConversation(conversationId);
        removeConversation(conversationId);
        if (activeConversationId === conversationId) {
          setActiveConversation(null);
          setMessages([]);
        }
        await loadConversations();
      } catch (error) {
        console.error('Failed to delete conversation:', error);
      }
    },
    [
      conversationClient,
      removeConversation,
      activeConversationId,
      setActiveConversation,
      setMessages,
      loadConversations,
    ]
  );

  // Edit story settings
  const handleEditSettings = useCallback((conversationId: string) => {
    setPendingConversationId(conversationId);
    setIsNewConversation(false);
    setShowSettingsForm(true);
  }, []);

  const handleSendMessage = useCallback(
    async (message: string) => {
      let convId = activeConversationId;

      // If no active story, create new story and show settings form
      if (!convId) {
        handleNewConversation();
        return; // Wait for user to complete settings before sending message
      }

      try {
        // Use streaming interface to send message
        let assistantMessageId: string | null = null;

        const aiMessage = await sendMessageStream(
          message,
          convId,
          (_: string, accumulated: string) => {
            // Get current message list (use ref to get latest value)
            const currentMessages = messagesRef.current;
            const lastMessage = currentMessages[currentMessages.length - 1];

            if (lastMessage && lastMessage.role === 'assistant') {
              // Update existing message - create new object instead of modifying existing one
              assistantMessageId =
                lastMessage.id || `msg_${Date.now()}_${Math.random()}`;
              const updatedMessages = currentMessages.map((msg, index) =>
                index === currentMessages.length - 1
                  ? { ...msg, content: accumulated }
                  : msg
              );
              setMessages(updatedMessages);
            } else {
              // Add new message
              assistantMessageId = `msg_${Date.now()}_${Math.random()}`;
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
        );

        // Message has been saved by backend (think part filtered), reload messages
        await handleSelectConversation(convId);

        // Check if summary is needed
        if (aiMessage.needsSummary && aiMessage.messageCount) {
          setSummaryMessageCount(aiMessage.messageCount);
          setShowSummaryPrompt(true);
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        throw error;
      }
    },
    [
      activeConversationId,
      sendMessageStream,
      handleNewConversation,
      handleSelectConversation,
      setMessages,
    ]
  );

  // Generate summary
  const handleGenerateSummary = useCallback(async (): Promise<string> => {
    if (!activeConversationId) {
      throw new Error('No active conversation');
    }
    const provider = settings.ai.provider;
    const config = settings.ai[provider];
    return await conversationClient.generateSummary(
      activeConversationId,
      provider,
      config.model
    );
  }, [activeConversationId, conversationClient, settings]);

  // Save summary
  const handleSaveSummary = useCallback(
    async (summary: string): Promise<void> => {
      if (!activeConversationId) {
        throw new Error('No active conversation');
      }
      await conversationClient.saveSummary(activeConversationId, summary);
      setShowSummaryPrompt(false);
    },
    [activeConversationId, conversationClient]
  );

  return {
    conversations,
    activeConversationId,
    showSettingsForm,
    isNewConversation,
    pendingConversationId,
    loading,
    showSummaryPrompt,
    summaryMessageCount,
    handleNewConversation,
    handleSelectConversation,
    handleDeleteConversation,
    handleSaveSettings,
    handleEditSettings,
    handleSendMessage,
    handleGenerateSummary,
    handleSaveSummary,
    setShowSettingsForm,
    setShowSummaryPrompt,
    loadConversations,
  };
};
