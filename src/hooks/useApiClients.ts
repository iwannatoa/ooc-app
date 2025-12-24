/**
 * useApiClients Hook
 *
 * Provides API client instances for use in components and other hooks.
 * Handles the creation and management of API clients with proper dependencies.
 */

import { useMemo, useEffect } from 'react';
import { useFlaskPort } from './useFlaskPort';
import { useMockMode } from './useMockMode';
import { useSettingsState } from './useSettingsState';
import { useI18n } from '@/i18n';
import { isMockMode } from '@/mock';
import {
  ApiClientFactory,
  ConversationApi,
  AiApi,
  StoryApi,
  SettingsApi,
} from '@/api';
import { mockConversationClient, mockAiClient, mockStoryClient } from '@/mock';

export const useApiClients = () => {
  const { waitForPort } = useFlaskPort();
  const { mockModeEnabled } = useMockMode();
  const { settings } = useSettingsState();
  const { t } = useI18n();

  // Create getApiUrl function
  const getApiUrl = useMemo(() => {
    return async (): Promise<string> => {
      if (mockModeEnabled || isMockMode()) {
        return 'http://localhost:5000'; // Mock mode doesn't need real port
      }
      return await waitForPort();
    };
  }, [waitForPort, mockModeEnabled]);

  // Create API client factory
  const apiFactory = useMemo(() => {
    if (mockModeEnabled || isMockMode()) {
      // Return mock clients in mock mode
      return null;
    }
    return new ApiClientFactory(getApiUrl, t, settings);
  }, [getApiUrl, t, settings, mockModeEnabled]);

  // Create API clients
  const conversationApi = useMemo(() => {
    if (mockModeEnabled || isMockMode()) {
      return mockConversationClient;
    }
    return apiFactory?.createConversationApi() as ConversationApi;
  }, [apiFactory, mockModeEnabled]);

  const aiApi = useMemo(() => {
    if (mockModeEnabled || isMockMode()) {
      return mockAiClient;
    }
    return apiFactory?.createAiApi() as AiApi;
  }, [apiFactory, mockModeEnabled]);

  const storyApi = useMemo(() => {
    if (mockModeEnabled || isMockMode()) {
      return mockStoryClient;
    }
    return apiFactory?.createStoryApi() as StoryApi;
  }, [apiFactory, mockModeEnabled]);

  const settingsApi = useMemo(() => {
    if (mockModeEnabled || isMockMode()) {
      // Mock settings API (if needed)
      return null;
    }
    return apiFactory?.createSettingsApi() as SettingsApi;
  }, [apiFactory, mockModeEnabled]);

  // Update API clients when settings change
  useEffect(() => {
    if (apiFactory && !mockModeEnabled && !isMockMode()) {
      apiFactory.updateSettings(settings);
      // Update AI and Story APIs with new settings
      if (aiApi instanceof AiApi) {
        aiApi.updateSettings(settings);
      }
      if (storyApi instanceof StoryApi) {
        storyApi.updateSettings(settings);
      }
    }
  }, [settings, apiFactory, aiApi, storyApi, mockModeEnabled]);

  return {
    conversationApi,
    aiApi,
    storyApi,
    settingsApi,
    apiFactory,
  };
};
