/**
 * Story API Client
 * 
 * Handles all story-related API calls:
 * - Generate story
 * - Confirm section
 * - Rewrite section
 * - Modify section
 */

import { BaseApiClient } from './base';
import type { GetApiUrlFn } from './base';
import { AppSettings } from '@/types';
import { stripThinkContent } from '@/utils/stripThinkContent';

export interface StoryActionResponse {
  success: boolean;
  response?: string;
  error?: string;
  story_progress?: any;
}

export class StoryApi extends BaseApiClient {
  private settings: AppSettings;

  constructor(getApiUrl: GetApiUrlFn, settings: AppSettings) {
    super(getApiUrl);
    this.settings = settings;
  }

  /**
   * Update settings (for when settings change)
   */
  updateSettings(settings: AppSettings) {
    this.settings = settings;
  }

  /**
   * Generate story (streaming)
   */
  async generateStory(
    conversationId: string,
    onChunk: (chunk: string, accumulated: string) => void
  ): Promise<StoryActionResponse> {
    const provider = this.settings.ai.provider;
    const config = this.settings.ai[provider];

    const accumulated = await this.stream(
      '/api/story/generate-stream',
      {
        conversation_id: conversationId,
        provider: provider,
        model: config.model,
      },
      onChunk
    );

    return {
      success: true,
      response: stripThinkContent(accumulated),
    };
  }

  /**
   * Confirm section
   */
  async confirmSection(conversationId: string): Promise<StoryActionResponse> {
    const provider = this.settings.ai.provider;
    const config = this.settings.ai[provider];

    const data = await this.post<StoryActionResponse>('/api/story/confirm', {
      conversation_id: conversationId,
      provider: provider,
      model: config.model,
    });

    return data;
  }

  /**
   * Rewrite section
   */
  async rewriteSection(
    conversationId: string,
    feedback: string
  ): Promise<StoryActionResponse> {
    const provider = this.settings.ai.provider;
    const config = this.settings.ai[provider];

    const data = await this.post<StoryActionResponse>('/api/story/rewrite', {
      conversation_id: conversationId,
      feedback: feedback,
      provider: provider,
      model: config.model,
    });

    return data;
  }

  /**
   * Modify section
   */
  async modifySection(
    conversationId: string,
    feedback: string
  ): Promise<StoryActionResponse> {
    const provider = this.settings.ai.provider;
    const config = this.settings.ai[provider];

    const data = await this.post<StoryActionResponse>('/api/story/modify', {
      conversation_id: conversationId,
      feedback: feedback,
      provider: provider,
      model: config.model,
    });

    return data;
  }
}

