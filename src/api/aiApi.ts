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
    const hasLocalFiles = Boolean(
      options?.messageParts?.some((part) => Boolean(part.localFile))
    );

    const response = hasLocalFiles
      ? await this.postForm<ChatResponse>(
          '/api/chat',
          this.buildMultipartPayload({
            provider,
            model: config.model,
            message,
            conversationId,
            inputMode: options?.inputMode || 'freeChat',
            messageParts: options?.messageParts || [],
          })
        )
      : await this.post<ChatResponse>('/api/chat', {
          provider: provider,
          model: config.model,
          message: message,
          conversation_id: conversationId,
          message_parts: this.serializeMessageParts(options?.messageParts),
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
    const hasLocalFiles = Boolean(
      options?.messageParts?.some((part) => Boolean(part.localFile))
    );

    const capabilityNoticeCollector: string[] = [];
    const accumulated = hasLocalFiles
      ? await this.streamFormData(
          '/api/chat-stream',
          this.buildMultipartPayload({
            provider,
            model: config.model,
            message,
            conversationId,
            inputMode: options?.inputMode || 'freeChat',
            messageParts: options?.messageParts || [],
          }),
          onChunk,
          undefined,
          {
            capabilityNoticeCollector,
          }
        )
      : await this.stream(
          '/api/chat-stream',
          {
            provider: provider,
            model: config.model,
            message: message,
            conversation_id: conversationId,
            message_parts: this.serializeMessageParts(options?.messageParts),
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

  private serializeMessageParts(
    messageParts?: ChatMessagePart[]
  ): ChatMessagePart[] | undefined {
    if (!messageParts || messageParts.length === 0) {
      return undefined;
    }
    return messageParts.map((part) => ({
      type: part.type,
      content: part.content,
      name: part.name,
      mimeType: part.mimeType,
      sizeBytes: part.sizeBytes,
      assetRef: part.assetRef,
      storagePath: part.storagePath,
    }));
  }

  private buildMultipartPayload(params: {
    provider: string;
    model: string;
    message: string;
    conversationId?: string;
    inputMode: 'storyAction' | 'freeChat';
    messageParts: ChatMessagePart[];
  }): FormData {
    const formData = new FormData();
    formData.set('provider', params.provider);
    formData.set('model', params.model);
    formData.set('message', params.message);
    if (params.conversationId) {
      formData.set('conversation_id', params.conversationId);
    }
    formData.set('input_mode', params.inputMode);
    formData.set(
      'message_parts',
      JSON.stringify(this.serializeMessageParts(params.messageParts) || [])
    );
    for (const part of params.messageParts) {
      if (part.localFile) {
        formData.append('files', part.localFile, part.localFile.name);
      }
    }
    return formData;
  }
}

