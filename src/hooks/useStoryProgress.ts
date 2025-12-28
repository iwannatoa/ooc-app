/**
 * Hook for managing story progress
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { StoryProgress } from '@/types';
import { useConversationClient } from './useConversationClient';
import { useChatState } from './useChatState';

// 全局请求缓存，用于去重
const progressCache = new Map<string, {
  promise: Promise<StoryProgress | null>;
  timestamp: number;
  data: StoryProgress | null;
}>();

// 缓存过期时间（毫秒）
const CACHE_TTL = 1000; // 1秒内的重复请求会被合并

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

    // 检查是否有正在进行的请求
    const cached = progressCache.get(activeConversationId);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      // 如果有缓存的请求且未过期，等待该请求完成
      try {
        setLoading(true);
        const progressData = await cached.promise;
        if (mountedRef.current) {
          setProgress(progressData);
        }
      } catch (error) {
        console.error('Failed to load story progress:', error);
        if (mountedRef.current) {
          setProgress(null);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
      return;
    }

    // 创建新的请求
    const promise = (async () => {
      try {
        const progressData = await conversationClient.getProgress(activeConversationId);
        return progressData;
      } catch (error) {
        console.error('Failed to load story progress:', error);
        return null;
      }
    })();

    // 缓存请求
    progressCache.set(activeConversationId, {
      promise,
      timestamp: now,
      data: null,
    });

    try {
      setLoading(true);
      const progressData = await promise;
      
      // 更新缓存数据
      const cached = progressCache.get(activeConversationId);
      if (cached) {
        cached.data = progressData;
      }
      
      if (mountedRef.current) {
        setProgress(progressData);
      }
    } catch (error) {
      console.error('Failed to load story progress:', error);
      if (mountedRef.current) {
        setProgress(null);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      // 清理过期的缓存
      setTimeout(() => {
        const cached = progressCache.get(activeConversationId);
        if (cached && (Date.now() - cached.timestamp) > CACHE_TTL * 10) {
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

  return {
    progress,
    loading,
    refresh: loadProgress,
  };
};

