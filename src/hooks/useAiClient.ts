import { useState, useCallback } from 'react';
import {
  AppSettings,
  ChatMessage,
  DeepSeekConfig,
} from '@/types';
import { ENV_CONFIG } from '@/types/constants';

export const useAiClient = (settings: AppSettings) => {
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(
    async (message: string): Promise<ChatMessage> => {
      setLoading(true);

      try {
        const provider = settings.ai.provider;
        const config = settings.ai[provider];

        // 所有请求都通过 Flask 后端
        const response = await fetch(`${ENV_CONFIG.VITE_FLASK_API_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: provider,
            model: config.model,
            message: message,
            apiKey: provider === 'deepseek' ? (config as DeepSeekConfig).apiKey : '',
            baseUrl: config.baseUrl,
            maxTokens: config.maxTokens,
            temperature: config.temperature,
          }),
        });

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || '请求失败');
        }

        return {
          role: 'assistant',
          content: data.response,
          model: data.model || config.model,
          timestamp: Date.now(),
        };
      } finally {
        setLoading(false);
      }
    },
    [settings]
  );

  return { sendMessage, loading };
};
