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
import { useUIState } from './useUIState';
import { useConversationSettingsDialog, useSummaryPromptDialog } from './useDialog';
import { confirmDialog } from '@/services/confirmDialogService';
import { useI18n } from '@/i18n/i18n';

export const useConversationManagement = () => {
  const [conversations, setConversations] = useState<
    ConversationWithSettings[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [summaryMessageCount, setSummaryMessageCount] = useState(0);
  
  // Use Redux for UI state
  const uiState = useUIState();
  const {
    isNewConversation,
    pendingConversationId,
    setIsNewConversation,
    setPendingConversationId,
  } = uiState;

  // Use dialog hooks
  const settingsDialog = useConversationSettingsDialog();
  const summaryDialog = useSummaryPromptDialog();

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
  const { t } = useI18n();

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
    // Open settings dialog for new conversation
    settingsDialog.open(newId, {
      isNewConversation: true,
    });
  }, [setPendingConversationId, setIsNewConversation, settingsDialog]);

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
        settingsDialog.close();
        setIsNewConversation(false);

        if (isNewConversation && settingsData.conversation_id) {
          setPendingConversationId(null);
          setActiveConversation(settingsData.conversation_id);
          setMessages([]);
          
          // Immediately add the new conversation to the list for instant feedback
          const newConversation: ConversationWithSettings = {
            id: settingsData.conversation_id,
            title: settingsData.title || t('conversation.unnamedConversation'),
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            settings: settingsData as ConversationSettings,
          };
          
          setConversations((prev) => {
            // Remove if already exists (shouldn't happen, but just in case)
            const filtered = prev.filter((c) => c.id !== newConversation.id);
            // Add to the beginning of the list
            return [newConversation, ...filtered];
          });
        }

        // Reload conversations to get the latest data from backend
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
      settingsDialog,
      setIsNewConversation,
      setPendingConversationId,
      setConversations,
      t,
    ]
  );

  const handleDeleteConversation = useCallback(
    async (conversationId: string) => {
      // Show confirmation dialog
      const confirmed = await confirmDialog({
        message: t('conversation.confirmDeleteConversation'),
        confirmText: t('common.confirm'),
        cancelText: t('common.cancel'),
        confirmButtonStyle: 'danger',
      });

      if (!confirmed) return;

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
      t,
    ]
  );

  // Edit story settings
  const handleEditSettings = useCallback((conversationId: string) => {
    setPendingConversationId(conversationId);
    setIsNewConversation(false);
    // Get current settings for this conversation
    const conversation = conversations.find(c => c.id === conversationId);
    settingsDialog.open(conversationId, {
      settings: conversation?.settings,
      isNewConversation: false,
    });
  }, [conversations, settingsDialog]);

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
          if (convId) {
            summaryDialog.open(convId, aiMessage.messageCount);
          }
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
      summaryDialog.close();
    },
    [activeConversationId, conversationClient, summaryDialog]
  );

  // Get current settings for active conversation
  const conversationSettings = conversations.find(
    (c) => c.id === (pendingConversationId || activeConversationId)
  )?.settings;

  return {
    conversations,
    activeConversationId,
    conversationSettings,
    isNewConversation,
    pendingConversationId,
    loading,
    summaryMessageCount,
    handleNewConversation,
    handleSelectConversation,
    handleDeleteConversation,
    handleSaveSettings,
    handleEditSettings,
    handleSendMessage,
    handleGenerateSummary,
    handleSaveSummary,
    loadConversations,
  };
};
