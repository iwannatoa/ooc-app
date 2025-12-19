import { useState, useCallback } from 'react';
import { AppSettings, ChatMessage, ChatResponse } from '@/types';
import { isMockMode, mockAiClient } from '@/mock';
import { useFlaskPort } from '@/hooks/useFlaskPort';

export const useAiClient = (settings: AppSettings) => {
  const [loading, setLoading] = useState(false);
  const { apiUrl } = useFlaskPort();

  const sendMessage = useCallback(
    async (message: string, conversationId?: string): Promise<ChatMessage> => {
      setLoading(true);

      try {
        if (isMockMode()) {
          const result = await mockAiClient.sendMessage(
            message,
            conversationId
          );
          return result;
        }

        const provider = settings.ai.provider;
        const config = settings.ai[provider];

        const response = await fetch(
          `${apiUrl}/api/chat`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider: provider,
              model: config.model,
              message: message,
              conversation_id: conversationId,
            }),
          }
        );

        const data: ChatResponse = await response.json();

        if (!data.success) {
          throw new Error(data.error || '请求失败');
        }

        return {
          role: 'assistant',
          content: data.response,
          model: data.model || config.model,
          timestamp: Date.now(),
          needsSummary: data.needs_summary,
          messageCount: data.message_count,
          storyProgress: data.story_progress,
        };
      } finally {
        setLoading(false);
      }
    },
    [settings, apiUrl]
  );

  return { sendMessage, loading };
};
