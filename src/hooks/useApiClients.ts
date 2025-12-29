/**
 * useApiClients Hook
 *
 * Provides API client instances for use in components and other hooks.
 * Handles the creation and management of API clients with proper dependencies.
 */

import { useMemo, useEffect } from 'react';
import { useFlaskPort } from './useFlaskPort';
import { useSettingsState } from './useSettingsState';
import { useI18n } from '@/i18n/i18n';
import { isMockMode } from '@/mock';
import { ApiClientFactory, AiApi, StoryApi } from '@/api';

export const useApiClients = () => {
  const { waitForPort } = useFlaskPort();
  const { settings } = useSettingsState();
  const { t } = useI18n();

  // Create getApiUrl function
  const getApiUrl = useMemo(() => {
    return async (): Promise<string> => {
      if (isMockMode()) {
        return 'http://localhost:5000';
      }
      return await waitForPort();
    };
  }, [waitForPort]);

  // Create API client factory
  const apiFactory = useMemo(() => {
    return new ApiClientFactory(getApiUrl, t, settings);
  }, [getApiUrl, t, settings]);

  // Create API clients (router handles mock mode automatically)
  const conversationApi = useMemo(() => {
    return apiFactory.createConversationApi();
  }, [apiFactory]);

  const aiApi = useMemo(() => {
    return apiFactory.createAiApi();
  }, [apiFactory]);

  const storyApi = useMemo(() => {
    return apiFactory.createStoryApi();
  }, [apiFactory]);

  const settingsApi = useMemo(() => {
    return apiFactory.createSettingsApi();
  }, [apiFactory]);

  const serverApi = useMemo(() => {
    return apiFactory.createServerApi();
  }, [apiFactory]);

  // Update API clients when settings change
  useEffect(() => {
    if (!isMockMode()) {
      apiFactory.updateSettings(settings);
      if (aiApi instanceof AiApi) {
        aiApi.updateSettings(settings);
      }
      if (storyApi instanceof StoryApi) {
        storyApi.updateSettings(settings);
      }
    }
  }, [settings, apiFactory, aiApi, storyApi]);

  return {
    conversationApi,
    aiApi,
    storyApi,
    settingsApi,
    serverApi,
    apiFactory,
  };
};
