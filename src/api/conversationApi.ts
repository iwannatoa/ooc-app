/**
 * Conversation API Client
 * 
 * Handles all conversation-related API calls:
 * - List conversations
 * - Get conversation messages
 * - Get/Update conversation settings
 * - Delete conversations
 * - Generate outline
 * - Summary management
 * - Character management
 */

import { BaseApiClient } from './base';
import type { GetApiUrlFn } from './base';
import {
  ConversationWithSettings,
  ConversationSettings,
  ConversationSummary,
  StoryProgress,
  CharacterRecord,
  ChatMessage,
} from '@/types';

export type TranslationFn = (key: string, params?: Record<string, any>) => string;

export class ConversationApi extends BaseApiClient {
  private t: TranslationFn;

  constructor(getApiUrl: GetApiUrlFn, t: TranslationFn) {
    super(getApiUrl);
    this.t = t;
  }

  /**
   * Get list of all conversations
   */
  async getConversationsList(): Promise<ConversationWithSettings[]> {
    const response = await this.get<{ conversations: any[] }>('/api/conversations/list');
    
    return response.conversations.map((conv: any) => ({
      id: conv.conversation_id,
      title: conv.title || this.t('conversation.unnamedConversation'),
      messages: [],
      createdAt: conv.created_at
        ? new Date(conv.created_at).getTime()
        : Date.now(),
      updatedAt: conv.updated_at
        ? new Date(conv.updated_at).getTime()
        : Date.now(),
      settings: {
        ...conv,
        characters: conv.characters || [],
        character_personality: conv.character_personality || {},
      },
    }));
  }

  /**
   * Get conversation settings
   */
  async getConversationSettings(
    conversationId: string
  ): Promise<ConversationSettings | null> {
    try {
      const response = await this.get<{ settings: ConversationSettings }>(
        `/api/conversation/settings?conversation_id=${conversationId}`
      );
      return {
        ...response.settings,
        characters: response.settings.characters || [],
        character_personality: response.settings.character_personality || {},
      };
    } catch (error) {
      if ((error as any).status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create or update conversation settings
   */
  async createOrUpdateSettings(
    settings: Partial<ConversationSettings>
  ): Promise<ConversationSettings> {
    const settingsToSend: any = {
      conversation_id: settings.conversation_id,
      title: settings.title,
      background: settings.background,
      characters: settings.characters,
      character_personality: settings.character_personality,
      outline: settings.outline,
    };

    const response = await this.post<{ settings: ConversationSettings }>(
      '/api/conversation/settings',
      settingsToSend
    );

    return {
      ...response.settings,
      characters: response.settings.characters || [],
      character_personality: response.settings.character_personality || {},
    };
  }

  /**
   * Get conversation messages
   */
  async getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
    const response = await this.get<{ messages: any[] }>(
      `/api/conversation?conversation_id=${conversationId}`
    );

    return (response.messages || []).map((msg: any) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.created_at
        ? new Date(msg.created_at).getTime()
        : Date.now(),
      id: msg.id?.toString() || `msg_${Date.now()}_${Math.random()}`,
    }));
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    const response = await this.delete<{ success: boolean }>('/api/conversation', {
      conversation_id: conversationId,
    });
    return response.success;
  }

  /**
   * Generate outline (non-streaming)
   */
  async generateOutline(
    background: string,
    options: {
      characters?: string[];
      characterPersonality?: Record<string, string>;
      conversationId?: string;
      provider?: string;
      model?: string;
    }
  ): Promise<string> {
    const response = await this.post<{ outline: string }>(
      '/api/conversation/generate-outline',
      {
        conversation_id: options.conversationId,
        background,
        characters: options.characters,
        character_personality: options.characterPersonality,
        provider: options.provider,
        model: options.model,
      }
    );
    return response.outline;
  }

  /**
   * Generate outline (streaming)
   */
  async generateOutlineStream(
    background: string,
    options: {
      characters?: string[];
      characterPersonality?: Record<string, string>;
      conversationId?: string;
      provider?: string;
      model?: string;
    },
    onChunk: (chunk: string, accumulated: string) => void
  ): Promise<string> {
    return this.stream(
      '/api/conversation/generate-outline-stream',
      {
        conversation_id: options.conversationId,
        background,
        characters: options.characters,
        character_personality: options.characterPersonality,
        provider: options.provider,
        model: options.model,
      },
      onChunk
    );
  }

  /**
   * Get conversation summary
   */
  async getSummary(conversationId: string): Promise<ConversationSummary | null> {
    try {
      const response = await this.get<{ summary: ConversationSummary }>(
        `/api/conversation/summary?conversation_id=${conversationId}`
      );
      return response.summary;
    } catch (error) {
      if ((error as any).status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Generate summary
   */
  async generateSummary(
    conversationId: string,
    provider: string,
    model?: string
  ): Promise<string> {
    const response = await this.post<{ summary: string }>(
      '/api/conversation/summary/generate',
      {
        conversation_id: conversationId,
        provider,
        model,
      }
    );
    return response.summary;
  }

  /**
   * Save summary
   */
  async saveSummary(
    conversationId: string,
    summary: string
  ): Promise<ConversationSummary> {
    const response = await this.post<{ summary: ConversationSummary }>(
      '/api/conversation/summary',
      {
        conversation_id: conversationId,
        summary,
      }
    );
    return response.summary;
  }

  /**
   * Get story progress
   */
  async getProgress(conversationId: string): Promise<StoryProgress | null> {
    const response = await this.get<{ progress: StoryProgress }>(
      `/api/conversation/progress?conversation_id=${conversationId}`
    );
    return response.progress || null;
  }

  /**
   * Confirm outline
   */
  async confirmOutline(conversationId: string): Promise<boolean> {
    const response = await this.post<{ success: boolean }>(
      '/api/conversation/progress/confirm-outline',
      {
        conversation_id: conversationId,
      }
    );
    return response.success;
  }

  /**
   * Update progress
   */
  async updateProgress(
    conversationId: string,
    progress: Partial<StoryProgress>
  ): Promise<StoryProgress> {
    const response = await this.post<{ progress: StoryProgress }>(
      '/api/conversation/progress',
      {
        conversation_id: conversationId,
        ...progress,
      }
    );
    return response.progress;
  }

  /**
   * Get characters
   */
  async getCharacters(
    conversationId: string,
    includeUnavailable = true
  ): Promise<CharacterRecord[]> {
    const response = await this.get<{ characters: CharacterRecord[] }>(
      `/api/conversation/characters?conversation_id=${conversationId}&include_unavailable=${includeUnavailable}`
    );
    return response.characters || [];
  }

  /**
   * Update character
   */
  async updateCharacter(
    conversationId: string,
    name: string,
    updates: {
      is_main?: boolean;
      is_unavailable?: boolean;
      notes?: string;
    }
  ): Promise<CharacterRecord> {
    const response = await this.post<{ character: CharacterRecord }>(
      '/api/conversation/characters/update',
      {
        conversation_id: conversationId,
        name,
        ...updates,
      }
    );
    return response.character;
  }

  /**
   * Generate character
   */
  async generateCharacter(
    conversationId: string,
    provider: string,
    options: {
      model?: string;
      characterHints?: string;
      background?: string;
      characters?: string[];
      characterPersonality?: Record<string, string>;
    }
  ): Promise<{
    characters?: Array<{ name: string; personality: string }>;
    character?: { name: string; personality: string };
  }> {
    const body: Record<string, unknown> = {
      conversation_id: conversationId,
      provider,
      model: options.model,
      character_hints: options.characterHints,
    };

    if (options.background) body.background = options.background;
    if (options.characters) body.characters = options.characters;
    if (options.characterPersonality) {
      body.character_personality = options.characterPersonality;
    }

    const response = await this.post<{
      characters?: Array<{ name: string; personality: string }>;
      character?: { name: string; personality: string };
    }>('/api/conversation/characters/generate', body);

    return {
      characters: response.characters,
      character: response.character,
    };
  }

  /**
   * Delete last message
   */
  async deleteLastMessage(conversationId: string): Promise<boolean> {
    const response = await this.post<{ success: boolean }>(
      '/api/conversation/delete-last-message',
      {
        conversation_id: conversationId,
      }
    );
    return response.success;
  }
}

