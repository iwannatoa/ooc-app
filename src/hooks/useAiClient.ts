import { useState, useCallback, useEffect } from 'react';
import { AppSettings, ChatMessage } from '@/types';
import { useApiClients } from './useApiClients';

/**
 * Hook for AI client operations
 */
export const useAiClient = (settings: AppSettings) => {
  const [loading, setLoading] = useState(false);
  const { aiApi } = useApiClients();

  // Update AI API settings when settings change
  useEffect(() => {
    if (
      aiApi &&
      'updateSettings' in aiApi &&
      typeof (aiApi as { updateSettings?: (settings: AppSettings) => void })
        .updateSettings === 'function'
    ) {
      (
        aiApi as { updateSettings: (settings: AppSettings) => void }
      ).updateSettings(settings);
    }
  }, [aiApi, settings]);

  const sendMessage = useCallback(
    async (message: string, conversationId?: string): Promise<ChatMessage> => {
      setLoading(true);

      try {
        return await aiApi.sendMessage(message, conversationId);
      } finally {
        setLoading(false);
      }
    },
    [aiApi]
  );

  const sendMessageStream = useCallback(
    async (
      message: string,
      conversationId: string,
      onChunk?: (chunk: string, accumulated: string) => void
    ): Promise<ChatMessage> => {
      setLoading(true);

      try {
        return await aiApi.sendMessageStream(
          message,
          conversationId,
          onChunk || (() => {})
        );
      } finally {
        setLoading(false);
      }
    },
    [aiApi]
  );

  return { sendMessage, sendMessageStream, loading };
};
