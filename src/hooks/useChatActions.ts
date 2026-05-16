import { useCallback } from 'react';
import { useChatState } from './useChatState';
import { useSettingsState } from './useSettingsState';
import { useAiClient } from './useAiClient';
import { trackTelemetryEvent } from '@/services/telemetryService';

export const useChatActions = () => {
  const { sendMessage, clearMessages } = useChatState();
  const {
    settings,
    updateActiveAiProviderConfig,
  } = useSettingsState();
  const { sendMessage: sendAIMessage } = useAiClient(settings);

  const handleSendMessage = useCallback(
    (messageText: string) => {
      sendMessage(messageText, sendAIMessage);
      void trackTelemetryEvent('chat_message_sent', {
        provider: settings.ai.provider,
      });
    },
    [sendMessage, sendAIMessage, settings.ai.provider]
  );

  const handleModelChange = useCallback(
    (model: string) => {
      updateActiveAiProviderConfig({ model });
    },
    [updateActiveAiProviderConfig]
  );

  const getCurrentModel = useCallback((): string => {
    return settings.ai[settings.ai.provider].model;
  }, [settings.ai]);

  return {
    handleSendMessage,
    handleModelChange,
    getCurrentModel,
    clearMessages,
  };
};
