/*
 * Copyright © 2016-2025 Patrick Zhang.
 * All Rights Reserved.
 */
import {
  ChatMessagePart,
  ChatMessage,
  ConversationSettings,
  ConversationWithSettings,
} from '@/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import {
  setConversationListLoading,
  setConversationListSuccess,
  setConversationListFailure,
  prependConversation,
} from '@/store/slices/conversationsSlice';
import { useAiClient } from './useAiClient';
import { useChatState } from './useChatState';
import { useConversationClient } from './useConversationClient';
import { useSettingsState } from './useSettingsState';
import { useUIState } from './useUIState';
import {
  useConversationSettingsDialog,
  useSummaryPromptDialog,
} from './useDialog';
import { confirmDialog } from '@/services/confirmDialogService';
import { useI18n } from '@/i18n/i18n';
import { useToast } from '@/hooks/useToast';
import { reportApiFailureToToast } from '@/utils/reportApiFailure';

const CONVERSATION_LIST_MIN_INTERVAL_MS = 1500;
const CONVERSATION_LIST_LOAD_MANAGER_KEY = '__OOC_CONVERSATION_LIST_LOAD_MANAGER__';

class ConversationListLoadManager {
  inFlight: Promise<void> | null = null;
  lastLoadedAt = 0;
  bootstrapped = false;
}

const globalScope = globalThis as typeof globalThis & {
  [CONVERSATION_LIST_LOAD_MANAGER_KEY]?: ConversationListLoadManager;
};
const conversationListLoadManager =
  globalScope[CONVERSATION_LIST_LOAD_MANAGER_KEY] ??
  (globalScope[CONVERSATION_LIST_LOAD_MANAGER_KEY] =
    new ConversationListLoadManager());

export const resetConversationListLoadManagerForTest = (): void => {
  conversationListLoadManager.inFlight = null;
  conversationListLoadManager.lastLoadedAt = 0;
  conversationListLoadManager.bootstrapped = false;
};

export const useConversationManagement = () => {
  const dispatch = useAppDispatch();
  const conversations = useAppSelector((s) => s.conversations?.items ?? []);
  const listStatus = useAppSelector(
    (s) => s.conversations?.listStatus ?? 'idle'
  );

  const [summaryMessageCount, setSummaryMessageCount] = useState(0);
  /** List fetch uses Redux listStatus; this covers select/save/delete blocking UI. */
  const [interactionLoading, setInteractionLoading] = useState(false);

  const uiState = useUIState();
  const {
    isNewConversation,
    pendingConversationId,
    setIsNewConversation,
    setPendingConversationId,
  } = uiState;

  const settingsDialog = useConversationSettingsDialog();
  const summaryDialog = useSummaryPromptDialog();

  const {
    activeConversationId,
    setActiveConversation,
    setMessages,
    removeConversation,
    messages,
    setSending,
    setStoryOperation,
    applyStreamingAssistantChunk,
  } = useChatState();

  const messagesRef = useRef<ChatMessage[]>(messages);
  const selectGenerationRef = useRef(0);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const { settings } = useSettingsState();
  const { sendMessageStream } = useAiClient(settings);
  const conversationClient = useConversationClient();
  const { t } = useI18n();
  const { showError, showWarning } = useToast();

  const loading = listStatus === 'loading' || interactionLoading;

  const runLoadConversations = useCallback(
    async (force: boolean) => {
      if (conversationListLoadManager.inFlight) {
        await conversationListLoadManager.inFlight;
        return;
      }

      const now = Date.now();
      if (
        !force &&
        now - conversationListLoadManager.lastLoadedAt <
          CONVERSATION_LIST_MIN_INTERVAL_MS
      ) {
        return;
      }

      const request = (async () => {
        dispatch(setConversationListLoading());
        try {
          const list = await conversationClient.getConversationsList();
          dispatch(setConversationListSuccess(list));
          conversationListLoadManager.lastLoadedAt = Date.now();
        } catch (error) {
          console.error('Failed to load conversations:', error);
          dispatch(
            setConversationListFailure(
              error instanceof Error ? error.message : undefined
            )
          );
          reportApiFailureToToast(error, {
            t,
            showError,
            detailKey: 'conversation.loadFailedDetail',
            hintNamespace: 'storyErrors',
          });
        }
      })();

      conversationListLoadManager.inFlight = request;
      try {
        await request;
      } finally {
        if (conversationListLoadManager.inFlight === request) {
          conversationListLoadManager.inFlight = null;
        }
      }
    },
    [conversationClient, dispatch, showError, t]
  );

  const loadConversations = useCallback(async () => {
    await runLoadConversations(false);
  }, [runLoadConversations]);

  const forceLoadConversations = useCallback(async () => {
    await runLoadConversations(true);
  }, [runLoadConversations]);

  useEffect(() => {
    if (conversationListLoadManager.bootstrapped) {
      return;
    }
    conversationListLoadManager.bootstrapped = true;
    void forceLoadConversations();
  }, [forceLoadConversations]);

  const handleNewConversation = useCallback(() => {
    const newId = `conv_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    setPendingConversationId(newId);
    setIsNewConversation(true);
    settingsDialog.open(newId, {
      isNewConversation: true,
    });
  }, [setPendingConversationId, setIsNewConversation, settingsDialog]);

  const handleSelectConversation = useCallback(
    async (conversationId: string) => {
      const gen = ++selectGenerationRef.current;
      try {
        setInteractionLoading(true);
        setActiveConversation(conversationId);
        const loaded = await conversationClient.getConversationMessages(
          conversationId
        );
        if (gen !== selectGenerationRef.current) return;
        setMessages(loaded);
      } catch (error) {
        console.error('Failed to load conversation:', error);
        if (gen === selectGenerationRef.current) {
          setMessages([]);
        }
      } finally {
        if (gen === selectGenerationRef.current) {
          setInteractionLoading(false);
        }
      }
    },
    [conversationClient, setMessages, setActiveConversation]
  );

  const handleSaveSettings = useCallback(
    async (settingsData: Partial<ConversationSettings>) => {
      try {
        setInteractionLoading(true);
        await conversationClient.createOrUpdateSettings(settingsData);
        settingsDialog.close();
        setIsNewConversation(false);

        if (isNewConversation && settingsData.conversation_id) {
          setPendingConversationId(null);
          setActiveConversation(settingsData.conversation_id);
          setMessages([]);

          const newConversation: ConversationWithSettings = {
            id: settingsData.conversation_id,
            title: settingsData.title || t('conversation.unnamedConversation'),
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            settings: settingsData as ConversationSettings,
          };

          dispatch(prependConversation(newConversation));
        }

        await forceLoadConversations();
      } catch (error) {
        console.error('Failed to save settings:', error);
        throw error;
      } finally {
        setInteractionLoading(false);
      }
    },
    [
      conversationClient,
      isNewConversation,
      setActiveConversation,
      setMessages,
      forceLoadConversations,
      settingsDialog,
      setIsNewConversation,
      setPendingConversationId,
      dispatch,
      t,
    ]
  );

  const handleDeleteConversation = useCallback(
    async (conversationId: string) => {
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
        await forceLoadConversations();
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
      forceLoadConversations,
      t,
    ]
  );

  const handleEditSettings = useCallback(
    (conversationId: string) => {
      setPendingConversationId(conversationId);
      setIsNewConversation(false);
      const conversation = conversations.find((c) => c.id === conversationId);
      settingsDialog.open(conversationId, {
        settings: conversation?.settings,
        isNewConversation: false,
      });
    },
    [conversations, settingsDialog, setPendingConversationId, setIsNewConversation]
  );

  const handleSendMessage = useCallback(
    async (
      message: string,
      options?: {
        messageParts?: ChatMessagePart[];
        inputMode?: 'storyAction' | 'freeChat';
      }
    ) => {
      const convId = activeConversationId;

      if (!convId) {
        handleNewConversation();
        return;
      }

      setStoryOperation('chat_stream');
      setSending(true);
      try {
        const aiMessage = await sendMessageStream(
          message,
          convId,
          (_: string, accumulated: string) => {
            applyStreamingAssistantChunk(accumulated);
          },
          options
        );
        if (aiMessage.providerCapabilityNotice) {
          showWarning(aiMessage.providerCapabilityNotice);
        }

        await handleSelectConversation(convId);

        if (aiMessage.needsSummary && aiMessage.messageCount) {
          setSummaryMessageCount(aiMessage.messageCount);
          if (convId) {
            summaryDialog.open(convId, aiMessage.messageCount);
          }
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        reportApiFailureToToast(error, {
          t,
          showError,
          showWarning,
          detailKey: 'chat.sendMessageFailedDetail',
          hintNamespace: 'storyErrors',
        });
        throw error;
      } finally {
        setSending(false);
      }
    },
    [
      activeConversationId,
      sendMessageStream,
      handleNewConversation,
      handleSelectConversation,
      setSending,
      setStoryOperation,
      showError,
      showWarning,
      t,
      applyStreamingAssistantChunk,
      summaryDialog,
    ]
  );

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
