import { useState, useCallback } from 'react';
import { AppSettings } from '@/types';
import { isMockMode, mockStoryClient } from '@/mock';
import { useFlaskPort } from '@/hooks/useFlaskPort';
import { useMockMode } from '@/hooks/useMockMode';
import { stripThinkContent } from '@/utils/stripThinkContent';

export interface StoryActionResponse {
  success: boolean;
  response?: string;
  error?: string;
  story_progress?: any;
}

export const useStoryClient = (settings: AppSettings) => {
  const [loading, setLoading] = useState(false);
  const { apiUrl, waitForPort } = useFlaskPort();
  const { mockModeEnabled } = useMockMode();

  const generateStory = useCallback(
    async (
      conversationId: string,
      onChunk?: (chunk: string, accumulated: string) => void
    ): Promise<StoryActionResponse> => {
      setLoading(true);
      try {
        if (mockModeEnabled || isMockMode()) {
          return await mockStoryClient.generateStory(conversationId);
        }

        const provider = settings.ai.provider;
        const config = settings.ai[provider];

        // Use streaming endpoint
        const url = await waitForPort();
        const response = await fetch(`${url}/api/story/generate-stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: conversationId,
            provider: provider,
            model: config.model,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to start stream' }));
          throw new Error(errorData.error || 'Failed to start story generation stream');
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
                    return {
                      success: true,
                      response: stripThinkContent(accumulated),
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

          // Fallback if stream ends without done message
          return {
            success: true,
            response: stripThinkContent(accumulated),
          };
        } finally {
          reader.releaseLock();
        }
      } finally {
        setLoading(false);
      }
    },
    [settings, waitForPort, mockModeEnabled]
  );

  const confirmSection = useCallback(
    async (conversationId: string): Promise<StoryActionResponse> => {
      setLoading(true);
      try {
        if (mockModeEnabled || isMockMode()) {
          return await mockStoryClient.confirmSection(conversationId);
        }

        const provider = settings.ai.provider;
        const config = settings.ai[provider];

        const url = await waitForPort();
        const response = await fetch(`${url}/api/story/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: conversationId,
            provider: provider,
            model: config.model,
          }),
        });

        const data = await response.json();
        return data;
      } finally {
        setLoading(false);
      }
    },
    [settings, waitForPort, mockModeEnabled]
  );

  const rewriteSection = useCallback(
    async (
      conversationId: string,
      feedback: string
    ): Promise<StoryActionResponse> => {
      setLoading(true);
      try {
        if (mockModeEnabled || isMockMode()) {
          return await mockStoryClient.rewriteSection(conversationId, feedback);
        }

        const provider = settings.ai.provider;
        const config = settings.ai[provider];

        const url = await waitForPort();
        const response = await fetch(`${url}/api/story/rewrite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: conversationId,
            feedback: feedback,
            provider: provider,
            model: config.model,
          }),
        });

        const data = await response.json();
        return data;
      } finally {
        setLoading(false);
      }
    },
    [settings, waitForPort, mockModeEnabled]
  );

  const modifySection = useCallback(
    async (
      conversationId: string,
      feedback: string
    ): Promise<StoryActionResponse> => {
      setLoading(true);
      try {
        if (mockModeEnabled || isMockMode()) {
          return await mockStoryClient.modifySection(conversationId, feedback);
        }

        const provider = settings.ai.provider;
        const config = settings.ai[provider];

        const url = await waitForPort();
        const response = await fetch(`${url}/api/story/modify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: conversationId,
            feedback: feedback,
            provider: provider,
            model: config.model,
          }),
        });

        const data = await response.json();
        return data;
      } finally {
        setLoading(false);
      }
    },
    [settings, waitForPort, mockModeEnabled]
  );

  return {
    generateStory,
    confirmSection,
    rewriteSection,
    modifySection,
    loading,
  };
};

