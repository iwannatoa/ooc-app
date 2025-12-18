/*
 * Copyright © 2016-2025 Patrick Zhang.
 * All Rights Reserved.
 */
import { useState, useEffect, useCallback } from 'react';
import { useChatState } from './useChatState';
import { useConversationClient } from './useConversationClient';
import {
  ConversationWithSettings,
  ConversationSettings,
  StoryActionType,
} from '@/types';
import { useAiClient } from './useAiClient';
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
  } = useChatState();

  const { settings } = useSettingsState();
  const { sendMessage: sendAIMessage } = useAiClient(settings);
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
    loadConversations();
  }, [loadConversations]);

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
        const messages = await conversationClient.getConversationMessages(
          conversationId
        );
        setMessages(messages);
        setActiveConversation(conversationId);
      } catch (error) {
        console.error('Failed to load conversation:', error);
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
        await conversationClient.createOrUpdateSettings(settingsData, settings);
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

  // 编辑会话设置
  const handleEditSettings = useCallback((conversationId: string) => {
    setPendingConversationId(conversationId);
    setIsNewConversation(false);
    setShowSettingsForm(true);
  }, []);

  const handleSendMessage = useCallback(
    async (message: string, actionType?: StoryActionType) => {
      let convId = activeConversationId;

      // 如果没有活动会话，先创建新会话并显示设置表单
      if (!convId) {
        handleNewConversation();
        return; // 等待用户完成设置后再发送消息
      }

      try {
        const aiMessage = await sendAIMessage(message, convId, actionType);
        // 消息已通过后端保存，重新加载消息
        await handleSelectConversation(convId);

        // 检查是否需要总结
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
      sendAIMessage,
      handleNewConversation,
      handleSelectConversation,
    ]
  );

  // 生成总结
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

  // 保存总结
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
