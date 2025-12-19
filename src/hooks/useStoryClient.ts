import { useState, useCallback } from 'react';
import { AppSettings } from '@/types';
import { isMockMode, mockStoryClient } from '@/mock';
import { useFlaskPort } from '@/hooks/useFlaskPort';

export interface StoryActionResponse {
  success: boolean;
  response?: string;
  error?: string;
  story_progress?: any;
}

export const useStoryClient = (settings: AppSettings) => {
  const [loading, setLoading] = useState(false);
  const { apiUrl } = useFlaskPort();

  const generateStory = useCallback(
    async (conversationId: string): Promise<StoryActionResponse> => {
      setLoading(true);
      try {
        if (isMockMode()) {
          return await mockStoryClient.generateStory(conversationId);
        }

        const provider = settings.ai.provider;
        const config = settings.ai[provider];

        const response = await fetch(`${apiUrl}/api/story/generate`, {
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
    [settings, apiUrl]
  );

  const confirmSection = useCallback(
    async (conversationId: string): Promise<StoryActionResponse> => {
      setLoading(true);
      try {
        if (isMockMode()) {
          return await mockStoryClient.confirmSection(conversationId);
        }

        const provider = settings.ai.provider;
        const config = settings.ai[provider];

        const response = await fetch(`${apiUrl}/api/story/confirm`, {
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
    [settings, apiUrl]
  );

  const rewriteSection = useCallback(
    async (
      conversationId: string,
      feedback: string
    ): Promise<StoryActionResponse> => {
      setLoading(true);
      try {
        if (isMockMode()) {
          return await mockStoryClient.rewriteSection(conversationId, feedback);
        }

        const provider = settings.ai.provider;
        const config = settings.ai[provider];

        const response = await fetch(`${apiUrl}/api/story/rewrite`, {
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
    [settings, apiUrl]
  );

  const modifySection = useCallback(
    async (
      conversationId: string,
      feedback: string
    ): Promise<StoryActionResponse> => {
      setLoading(true);
      try {
        if (isMockMode()) {
          return await mockStoryClient.modifySection(conversationId, feedback);
        }

        const provider = settings.ai.provider;
        const config = settings.ai[provider];

        const response = await fetch(`${apiUrl}/api/story/modify`, {
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
    [settings, apiUrl]
  );

  return {
    generateStory,
    confirmSection,
    rewriteSection,
    modifySection,
    loading,
  };
};

