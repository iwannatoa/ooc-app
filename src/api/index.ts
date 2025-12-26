/**
 * API Client Module
 * 
 * Centralized export point for all API clients.
 * Provides factory functions to create API client instances.
 */

import type { GetApiUrlFn } from './base';
import { ConversationApi, TranslationFn } from './conversationApi';
import { AiApi } from './aiApi';
import { StoryApi } from './storyApi';
import { SettingsApi } from './settingsApi';
import { AppSettings } from '@/types';

// Export base classes and types
export { BaseApiClient, createApiError } from './base';
export type { ApiError, RequestConfig, GetApiUrlFn } from './base';
export { ConversationApi } from './conversationApi';
export type { TranslationFn } from './conversationApi';
export { AiApi } from './aiApi';
export { StoryApi } from './storyApi';
export type { StoryActionResponse } from './storyApi';
export { SettingsApi } from './settingsApi';

/**
 * API Client Factory
 * Creates API client instances with proper dependencies
 */
export class ApiClientFactory {
  private getApiUrl: GetApiUrlFn;
  private t: TranslationFn;
  private settings: AppSettings;

  constructor(
    getApiUrl: GetApiUrlFn,
    t: TranslationFn,
    settings: AppSettings
  ) {
    this.getApiUrl = getApiUrl;
    this.t = t;
    this.settings = settings;
  }

  /**
   * Create conversation API client
   */
  createConversationApi(): ConversationApi {
    return new ConversationApi(this.getApiUrl, this.t);
  }

  /**
   * Create AI API client
   */
  createAiApi(): AiApi {
    return new AiApi(this.getApiUrl, this.settings);
  }

  /**
   * Create story API client
   */
  createStoryApi(): StoryApi {
    return new StoryApi(this.getApiUrl, this.settings);
  }

  /**
   * Create settings API client
   */
  createSettingsApi(): SettingsApi {
    return new SettingsApi(this.getApiUrl);
  }

  /**
   * Update settings (affects AI and Story APIs)
   */
  updateSettings(settings: AppSettings) {
    this.settings = settings;
  }
}


