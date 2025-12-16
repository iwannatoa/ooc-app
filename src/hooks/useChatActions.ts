import { useCallback } from 'react';
import { useChatState } from './useChatState';
import { useSettingsState } from './useSettingsState';
import { useAiClient } from './useAiClient';

export const useChatActions = () => {
  const { sendMessage, clearMessages } = useChatState();
  const {
    settings,
    updateOllamaConfig,
    updateDeepSeekConfig,
    updateOpenAIConfig,
    updateAnthropicConfig,
    updateCustomConfig,
  } = useSettingsState();
  const { sendMessage: sendAIMessage } = useAiClient(settings);

  const handleSendMessage = useCallback(
    (messageText: string) => {
      sendMessage(messageText, sendAIMessage);
    },
    [sendMessage, sendAIMessage]
  );

  const handleModelChange = useCallback(
    (model: string) => {
      const provider = settings.ai.provider;
      const updateActions = {
        ollama: updateOllamaConfig,
        deepseek: updateDeepSeekConfig,
        openai: updateOpenAIConfig,
        anthropic: updateAnthropicConfig,
        custom: updateCustomConfig,
      };

      updateActions[provider]?.({ model });
    },
    [
      settings.ai.provider,
      updateOllamaConfig,
      updateDeepSeekConfig,
      updateOpenAIConfig,
      updateAnthropicConfig,
      updateCustomConfig,
    ]
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
