import { AppSettings } from '@/types';
import { useCallback, useState, useEffect } from 'react';
import { useApiClients } from './useApiClients';
import { StoryActionResponse } from '@/api';

// Re-export StoryActionResponse type for backward compatibility
export type { StoryActionResponse };

/**
 * Hook for story client operations
 */
export const useStoryClient = (settings: AppSettings) => {
  const [loading, setLoading] = useState(false);
  const { storyApi } = useApiClients();

  // Update Story API settings when settings change
  useEffect(() => {
    if (storyApi && 'updateSettings' in storyApi) {
      storyApi.updateSettings(settings);
    }
  }, [storyApi, settings]);

  const generateStory = useCallback(
    async (
      conversationId: string,
      onChunk?: (chunk: string, accumulated: string) => void
    ): Promise<StoryActionResponse> => {
      setLoading(true);
      try {
        return await storyApi.generateStory(
          conversationId,
          onChunk || (() => {})
        );
      } finally {
        setLoading(false);
      }
    },
    [storyApi]
  );

  const confirmSection = useCallback(
    async (conversationId: string): Promise<StoryActionResponse> => {
      setLoading(true);
      try {
        return await storyApi.confirmSection(conversationId);
      } finally {
        setLoading(false);
      }
    },
    [storyApi]
  );

  const rewriteSection = useCallback(
    async (
      conversationId: string,
      feedback: string
    ): Promise<StoryActionResponse> => {
      setLoading(true);
      try {
        return await storyApi.rewriteSection(conversationId, feedback);
      } finally {
        setLoading(false);
      }
    },
    [storyApi]
  );

  const modifySection = useCallback(
    async (
      conversationId: string,
      feedback: string
    ): Promise<StoryActionResponse> => {
      setLoading(true);
      try {
        return await storyApi.modifySection(conversationId, feedback);
      } finally {
        setLoading(false);
      }
    },
    [storyApi]
  );

  return {
    generateStory,
    confirmSection,
    rewriteSection,
    modifySection,
    loading,
  };
};
