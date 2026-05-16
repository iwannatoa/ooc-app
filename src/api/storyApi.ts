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
import { AppSettings, StoryProgress } from '@/types';
import { stripThinkContent } from '@/utils/parseThinkContent';

export interface StoryActionResponse {
  success: boolean;
  response?: string;
  error?: string;
  story_progress?: StoryProgress;
  /** Server-side `<CHARACTERS>` parse anomaly codes (optional, backward compatible). */
  parse_warnings?: string[];
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

  protected getCorrelationHeaders(
    method: string,
    endpoint: string
  ): Record<string, string> {
    const headers = super.getCorrelationHeaders(method, endpoint);
    const profileId = this.settings.activeProfileId?.trim();
    if (profileId) {
      headers['X-OOC-Profile-Id'] = profileId;
    }
    return headers;
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

    const parseWarningsCollector: string[] = [];
    const accumulated = await this.stream(
      '/api/story/generate-stream',
      {
        conversation_id: conversationId,
        provider: provider,
        model: config.model,
      },
      onChunk,
      {},
      { parseWarningsCollector }
    );

    return {
      success: true,
      response: stripThinkContent(accumulated),
      parse_warnings:
        parseWarningsCollector.length > 0
          ? parseWarningsCollector
          : undefined,
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
      /** UI「改写」入口：显式传 rewrite，服务端跳过关键词推断（与 /modify 对称）。 */
      feedback_operation: 'rewrite',
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

  /**
   * Append a user-authored note to the conversation transcript (no AI round-trip).
   */
  async saveUserNote(conversationId: string, text: string): Promise<{
    success: boolean;
    message?: { id: number; role: string; content: string };
    error?: string;
  }> {
    return this.post('/api/story/user-note', {
      conversation_id: conversationId,
      text,
    });
  }
}

