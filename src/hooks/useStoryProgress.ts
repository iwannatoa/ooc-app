/**
 * Hook for managing story progress
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { StoryProgress } from '@/types';
import { useConversationClient } from './useConversationClient';
import { useChatState } from './useChatState';

const progressCache = new Map<
  string,
  { promise: Promise<StoryProgress | null>; timestamp: number }
>();
const CACHE_TTL = 1000;

export const useStoryProgress = () => {
  const { activeConversationId } = useChatState();
  const conversationClient = useConversationClient();
  const [progress, setProgress] = useState<StoryProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  const loadProgress = useCallback(async () => {
    if (!activeConversationId) {
      setProgress(null);
      return;
    }

    const cached = progressCache.get(activeConversationId);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_TTL) {
      try {
        setLoading(true);
        const data = await cached.promise;
        if (mountedRef.current) setProgress(data);
      } catch (error) {
        console.error('Failed to load story progress:', error);
        if (mountedRef.current) setProgress(null);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
      return;
    }

    const promise = conversationClient
      .getProgress(activeConversationId)
      .catch((error) => {
        console.error('Failed to load story progress:', error);
        return null;
      });

    progressCache.set(activeConversationId, { promise, timestamp: now });

    try {
      setLoading(true);
      const data = await promise;
      if (mountedRef.current) setProgress(data);
    } finally {
      if (mountedRef.current) setLoading(false);
      setTimeout(() => {
        const cached = progressCache.get(activeConversationId);
        if (cached && Date.now() - cached.timestamp > CACHE_TTL * 10) {
          progressCache.delete(activeConversationId);
        }
      }, CACHE_TTL * 10);
    }
  }, [activeConversationId, conversationClient]);

  useEffect(() => {
    mountedRef.current = true;
    loadProgress();
    return () => {
      mountedRef.current = false;
    };
  }, [loadProgress]);

  return { progress, loading, refresh: loadProgress };
};
