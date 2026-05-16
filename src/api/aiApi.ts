/**
 * AI API Client
 * 
 * Handles all AI-related API calls:
 * - Send chat messages
 * - Stream chat responses
 */

import { BaseApiClient } from './base';
import type { GetApiUrlFn } from './base';
import {
  AppSettings,
  ChatMessage,
  ChatMessagePart,
  ChatResponse,
} from '@/types';
import { stripThinkContent } from '@/utils/parseThinkContent';

export class AiApi extends BaseApiClient {
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
   * Send a chat message (non-streaming)
   */
  async sendMessage(
    message: string,
    conversationId?: string,
    options?: {
      messageParts?: ChatMessagePart[];
      inputMode?: 'storyAction' | 'freeChat';
    }
  ): Promise<ChatMessage> {
    const provider = this.settings.ai.provider;
    const config = this.settings.ai[provider];

    const response = await this.post<ChatResponse>('/api/chat', {
      provider: provider,
      model: config.model,
      message: message,
      conversation_id: conversationId,
      message_parts: options?.messageParts,
      input_mode: options?.inputMode || 'freeChat',
    });

    // Strip think content from response
    const cleanContent = stripThinkContent(response.response);

    return {
      role: 'assistant',
      content: cleanContent,
      model: response.model || config.model,
      timestamp: Date.now(),
      providerCapabilityNotice: response.provider_capability_notice,
      needsSummary: response.needs_summary,
      messageCount: response.message_count,
      storyProgress: response.story_progress,
    };
  }

  /**
   * Send a chat message (streaming)
   */
  async sendMessageStream(
    message: string,
    conversationId: string,
    onChunk: (chunk: string, accumulated: string) => void,
    options?: {
      messageParts?: ChatMessagePart[];
      inputMode?: 'storyAction' | 'freeChat';
    }
  ): Promise<ChatMessage> {
    const provider = this.settings.ai.provider;
    const config = this.settings.ai[provider];

    const capabilityNoticeCollector: string[] = [];
    const accumulated = await this.stream(
      '/api/chat-stream',
      {
        provider: provider,
        model: config.model,
        message: message,
        conversation_id: conversationId,
        message_parts: options?.messageParts,
        input_mode: options?.inputMode || 'freeChat',
      },
      onChunk,
      undefined,
      {
        capabilityNoticeCollector,
      }
    );

    // Strip think content from final response
    const finalContent = stripThinkContent(accumulated);

    return {
      role: 'assistant',
      content: finalContent,
      model: config.model,
      timestamp: Date.now(),
      providerCapabilityNotice: capabilityNoticeCollector.join('\n').trim() || undefined,
    };
  }
}

