import { useState, useCallback } from 'react';
import { AppSettings, ChatMessage, ChatResponse } from '@/types';
import { isMockMode, mockAiClient } from '@/mock';
import { useFlaskPort } from '@/hooks/useFlaskPort';
import { stripThinkContent } from '@/utils/stripThinkContent';
import { useI18n } from '@/i18n';

export const useAiClient = (settings: AppSettings) => {
  const [loading, setLoading] = useState(false);
  const { apiUrl, waitForPort } = useFlaskPort();
  const { t } = useI18n();

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

        const url = await waitForPort();
        const response = await fetch(
          `${url}/api/chat`,
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
          throw new Error(data.error || t('common.requestFailed'));
        }

        // Strip think content from response
        const cleanContent = stripThinkContent(data.response);

        return {
          role: 'assistant',
          content: cleanContent,
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
    [settings, waitForPort]
  );

  const sendMessageStream = useCallback(
    async (
      message: string,
      conversationId: string,
      onChunk?: (chunk: string, accumulated: string) => void
    ): Promise<ChatMessage> => {
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

        const url = await waitForPort();
        const response = await fetch(
          `${url}/api/chat-stream`,
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

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to start stream' }));
          throw new Error(errorData.error || 'Failed to start chat stream');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        if (!reader) {
          throw new Error('Stream reader not available');
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.slice(6);
                try {
                  const data = JSON.parse(dataStr);
                  if (data.error) {
                    throw new Error(data.error);
                  }
                  if (data.done) {
                    // Stream finished, return accumulated content
                    const finalContent = stripThinkContent(accumulated);
                    return {
                      role: 'assistant',
                      content: finalContent,
                      model: config.model,
                      timestamp: Date.now(),
                    };
                  }
                } catch (e) {
                  // If JSON parse fails, treat as plain text chunk
                  if (!(e instanceof SyntaxError)) {
                    throw e;
                  }
                  // Plain text chunk
                  accumulated += dataStr;
                  // Pass raw accumulated content (with think tags) to onChunk for real-time display
                  // Think content will be parsed and displayed in MessageList component
                  onChunk?.(dataStr, accumulated);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        // Fallback if stream ends without done message
        const finalContent = stripThinkContent(accumulated);
        return {
          role: 'assistant',
          content: finalContent,
          model: config.model,
          timestamp: Date.now(),
        };
      } finally {
        setLoading(false);
      }
    },
    [settings, apiUrl]
  );

  return { sendMessage, sendMessageStream, loading };
};
