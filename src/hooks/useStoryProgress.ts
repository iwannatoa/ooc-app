/**
 * Hook for managing story progress
 */
import { useState, useEffect, useCallback } from 'react';
import { StoryProgress } from '@/types';
import { useConversationClient } from './useConversationClient';
import { useChatState } from './useChatState';

export const useStoryProgress = () => {
  const { activeConversationId } = useChatState();
  const conversationClient = useConversationClient();
  const [progress, setProgress] = useState<StoryProgress | null>(null);
  const [loading, setLoading] = useState(false);

  const loadProgress = useCallback(async () => {
    if (!activeConversationId) {
      setProgress(null);
      return;
    }

    try {
      setLoading(true);
      const progressData = await conversationClient.getProgress(activeConversationId);
      setProgress(progressData);
    } catch (error) {
      console.error('Failed to load story progress:', error);
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, [activeConversationId, conversationClient]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  return {
    progress,
    loading,
    refresh: loadProgress,
  };
};

