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
  AppSettings,
  ChatAttachment,
  ConversationWithSettings,
  ConversationSettings,
  ConversationSummary,
  StoryProgress,
  CharacterRecord,
  ChatMessage,
} from '@/types';

/** Row shape from GET /api/conversations/list (fields merged into `settings` client-side). */
interface ConversationsListRow {
  conversation_id: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
  characters?: string[];
  character_personality?: Record<string, string>;
  [key: string]: unknown;
}

/** Message row from GET /api/conversation */
interface ConversationMessageRow {
  role: ChatMessage['role'];
  content: string;
  created_at?: string;
  id?: string | number;
  content_type?: 'text' | 'multimodal';
  attachments?: ChatAttachment[];
  parts?: ChatMessage['parts'];
  provider_capability_notice?: string;
}

export type TranslationFn = (
  key: string,
  params?: Record<string, string | number>
) => string;

export interface StoryTemplateItem {
  id: string;
  title: string;
  background?: string;
  outline_hint?: string;
  characters?: string[];
  character_personality?: Record<string, string>;
  additional_settings?: Record<string, unknown>;
}

export interface StoryBranch {
  branch_id: string;
  parent_message_id?: number;
  label?: string;
  created_at?: string;
}

export interface StorySavepoint {
  savepoint_id: string;
  message_id?: number;
  label?: string;
  created_at?: string;
}

export interface StoryEnding {
  branch_id?: string;
  ending_tag: string;
  message_id?: number;
  created_at?: string;
}

export interface StoryPdfExport {
  pdf_base64: string;
  filename?: string;
}

export interface ProjectBundleExport {
  bundle: Record<string, unknown>;
  filename?: string;
}

export class ConversationApi extends BaseApiClient {
  private t: TranslationFn;
  private settings: AppSettings;

  constructor(getApiUrl: GetApiUrlFn, t: TranslationFn, settings: AppSettings) {
    super(getApiUrl);
    this.t = t;
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
   * Get list of all conversations
   */
  async getConversationsList(): Promise<ConversationWithSettings[]> {
    const response = await this.get<{ conversations: ConversationsListRow[] }>(
      '/api/conversations/list'
    );

    return response.conversations.map((conv) => ({
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
   * Get built-in story templates
   */
  async getStoryTemplates(): Promise<StoryTemplateItem[]> {
    const response = await this.get<{ templates: StoryTemplateItem[] }>(
      '/api/story-templates'
    );
    return response.templates || [];
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
      if (error && typeof error === 'object' && 'status' in error && (error as { status: unknown }).status === 404) {
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
    const settingsToSend: Record<string, unknown> = {
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
    const response = await this.get<{ messages: ConversationMessageRow[] }>(
      `/api/conversation?conversation_id=${conversationId}`
    );

    return (response.messages || []).map((msg) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.created_at
        ? new Date(msg.created_at).getTime()
        : Date.now(),
      id: msg.id?.toString() || `msg_${Date.now()}_${Math.random()}`,
      contentType: msg.content_type,
      attachments: msg.attachments,
      parts: msg.parts,
      providerCapabilityNotice: msg.provider_capability_notice,
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
      if (error && typeof error === 'object' && 'status' in error && (error as { status: unknown }).status === 404) {
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

  async getAssistantVariants(
    conversationId: string
  ): Promise<
    Array<{
      id: number;
      content: string;
      model?: string;
      provider?: string;
      created_at?: string;
      variant_group_id?: string;
      parent_message_id?: number;
    }>
  > {
    const response = await this.get<{
      variants: Array<{
        id: number;
        content: string;
        model?: string;
        provider?: string;
        created_at?: string;
        variant_group_id?: string;
        parent_message_id?: number;
      }>;
    }>(`/api/conversation/assistant-variants?conversation_id=${conversationId}`);
    return response.variants || [];
  }

  async restoreAssistantVariant(
    conversationId: string,
    messageId: number
  ): Promise<boolean> {
    const response = await this.post<{ success: boolean }>(
      '/api/conversation/assistant-variants/restore',
      {
        conversation_id: conversationId,
        message_id: messageId,
      }
    );
    return Boolean(response.success);
  }

  async getStoryBranches(conversationId: string): Promise<StoryBranch[]> {
    const response = await this.get<{ branches: StoryBranch[] }>(
      `/api/story/branches?conversation_id=${conversationId}`
    );
    return response.branches || [];
  }

  async createStoryBranch(
    conversationId: string,
    payload: { parent_message_id?: number; label?: string; branch_id?: string }
  ): Promise<StoryBranch> {
    const response = await this.post<{ branch: StoryBranch }>(
      '/api/story/branches',
      {
        conversation_id: conversationId,
        ...payload,
      }
    );
    return response.branch;
  }

  async getStorySavepoints(conversationId: string): Promise<StorySavepoint[]> {
    const response = await this.get<{ savepoints: StorySavepoint[] }>(
      `/api/story/savepoint?conversation_id=${conversationId}`
    );
    return response.savepoints || [];
  }

  async createStorySavepoint(
    conversationId: string,
    payload: { message_id?: number; label?: string; savepoint_id?: string }
  ): Promise<StorySavepoint> {
    const response = await this.post<{ savepoint: StorySavepoint }>(
      '/api/story/savepoint',
      {
        conversation_id: conversationId,
        ...payload,
      }
    );
    return response.savepoint;
  }

  async restoreStorySavepoint(
    conversationId: string,
    savepointId: string
  ): Promise<boolean> {
    const response = await this.post<{ success: boolean }>(
      '/api/story/savepoint/restore',
      {
        conversation_id: conversationId,
        savepoint_id: savepointId,
      }
    );
    return Boolean(response.success);
  }

  async getStoryEndings(conversationId: string): Promise<StoryEnding[]> {
    const response = await this.get<{ endings: StoryEnding[] }>(
      `/api/story/ending?conversation_id=${conversationId}`
    );
    return response.endings || [];
  }

  async markStoryEnding(
    conversationId: string,
    payload: { ending_tag: string; branch_id?: string; message_id?: number }
  ): Promise<StoryEnding> {
    const response = await this.post<{ ending: StoryEnding }>(
      '/api/story/ending',
      {
        conversation_id: conversationId,
        ...payload,
      }
    );
    return response.ending;
  }

  async exportStoryPdf(
    conversationId: string,
    title?: string
  ): Promise<StoryPdfExport> {
    const response = await this.post<{
      pdf_base64: string;
      filename?: string;
    }>('/api/export/pdf', {
      conversation_id: conversationId,
      title,
    });
    return {
      pdf_base64: response.pdf_base64,
      filename: response.filename,
    };
  }

  async exportProjectBundle(
    conversationId: string,
    title?: string
  ): Promise<ProjectBundleExport> {
    const response = await this.post<{
      bundle: Record<string, unknown>;
      filename?: string;
    }>('/api/export/project-bundle', {
      conversation_id: conversationId,
      title,
    });
    return { bundle: response.bundle, filename: response.filename };
  }

  async validateProjectBundle(bundle: Record<string, unknown>): Promise<boolean> {
    const response = await this.post<{ success: boolean; valid?: boolean }>(
      '/api/import/project-bundle/validate',
      { bundle }
    );
    return Boolean(response.success && (response.valid ?? true));
  }
}

