import { ENV_CONFIG } from '@/types/constants';
import {
  ConversationSettings,
  ConversationSummary,
  ConversationWithSettings,
  StoryProgress,
} from '@/types';
import { isMockMode, mockConversationClient } from '@/mock';

const API_BASE_URL = ENV_CONFIG.VITE_FLASK_API_URL;

export const useConversationClient = () => {
  if (isMockMode()) {
    return mockConversationClient;
  }
  const getConversationsList = async (): Promise<
    ConversationWithSettings[]
  > => {
    const response = await fetch(`${API_BASE_URL}/api/conversations/list`);
    const data = await response.json();
    if (data.success) {
      return data.conversations.map((conv: any) => ({
        id: conv.conversation_id,
        title: conv.title || '未命名会话',
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
    throw new Error(data.error || 'Failed to fetch conversations');
  };

  const getConversationSettings = async (
    conversationId: string
  ): Promise<ConversationSettings | null> => {
    const response = await fetch(
      `${API_BASE_URL}/api/conversation/settings?conversation_id=${conversationId}`
    );
    const data = await response.json();
    if (data.success) {
      return {
        ...data.settings,
        characters: data.settings.characters || [],
        character_personality: data.settings.character_personality || {},
      };
    }
    if (response.status === 404) {
      return null;
    }
    throw new Error(data.error || 'Failed to fetch settings');
  };

  const createOrUpdateSettings = async (
    settings: Partial<ConversationSettings>,
    appSettings?: any
  ): Promise<ConversationSettings> => {
    const settingsToSend: any = { ...settings };

    if (appSettings) {
      const provider = appSettings.ai.provider;
      const config = appSettings.ai[provider];

      settingsToSend.ai_provider = provider;
      settingsToSend.ai_model = config.model;
      settingsToSend.base_url = config.baseUrl;
      settingsToSend.max_tokens = config.maxTokens;
      settingsToSend.temperature = config.temperature;

      if (provider === 'deepseek' && config.apiKey) {
        settingsToSend.api_key = config.apiKey;
      }
    }

    const response = await fetch(`${API_BASE_URL}/api/conversation/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settingsToSend),
    });
    const data = await response.json();
    if (data.success) {
      return {
        ...data.settings,
        characters: data.settings.characters || [],
        character_personality: data.settings.character_personality || {},
      };
    }
    throw new Error(data.error || 'Failed to save settings');
  };

  const getConversationMessages = async (
    conversationId: string
  ): Promise<any[]> => {
    const response = await fetch(
      `${API_BASE_URL}/api/conversation?conversation_id=${conversationId}`
    );
    const data = await response.json();
    if (data.success) {
      return data.messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at
          ? new Date(msg.created_at).getTime()
          : Date.now(),
        id: msg.id?.toString(),
      }));
    }
    throw new Error(data.error || 'Failed to fetch messages');
  };

  const deleteConversation = async (
    conversationId: string
  ): Promise<boolean> => {
    const response = await fetch(`${API_BASE_URL}/api/conversation`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversation_id: conversationId }),
    });
    const data = await response.json();
    return data.success;
  };

  const generateOutline = async (
    background: string,
    characters?: string[],
    characterPersonality?: Record<string, string>,
    conversationId?: string,
    provider?: string,
    model?: string,
    apiKey?: string,
    baseUrl?: string,
    maxTokens?: number,
    temperature?: number
  ): Promise<string> => {
    const response = await fetch(
      `${API_BASE_URL}/api/conversation/generate-outline`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          background,
          characters,
          character_personality: characterPersonality,
          ...(conversationId
            ? {}
            : {
                provider,
                model,
                apiKey,
                baseUrl,
                maxTokens,
                temperature,
              }),
        }),
      }
    );
    const data = await response.json();
    if (data.success) {
      return data.outline;
    }
    throw new Error(data.error || 'Failed to generate outline');
  };

  const getSummary = async (
    conversationId: string
  ): Promise<ConversationSummary | null> => {
    const response = await fetch(
      `${API_BASE_URL}/api/conversation/summary?conversation_id=${conversationId}`
    );
    const data = await response.json();
    if (data.success) {
      return data.summary;
    }
    if (response.status === 404) {
      return null;
    }
    throw new Error(data.error || 'Failed to fetch summary');
  };

  const generateSummary = async (
    conversationId: string,
    provider: string,
    model?: string
  ): Promise<string> => {
    const response = await fetch(
      `${API_BASE_URL}/api/conversation/summary/generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          provider,
          model,
        }),
      }
    );
    const data = await response.json();
    if (data.success) {
      return data.summary;
    }
    throw new Error(data.error || 'Failed to generate summary');
  };

  const saveSummary = async (
    conversationId: string,
    summary: string
  ): Promise<ConversationSummary> => {
    const response = await fetch(`${API_BASE_URL}/api/conversation/summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        summary,
      }),
    });
    const data = await response.json();
    if (data.success) {
      return data.summary;
    }
    throw new Error(data.error || 'Failed to save summary');
  };

  const getProgress = async (
    conversationId: string
  ): Promise<StoryProgress | null> => {
    const response = await fetch(
      `${API_BASE_URL}/api/conversation/progress?conversation_id=${conversationId}`
    );
    const data = await response.json();
    if (data.success) {
      return data.progress;
    }
    throw new Error(data.error || 'Failed to fetch progress');
  };

  const confirmOutline = async (conversationId: string): Promise<boolean> => {
    const response = await fetch(
      `${API_BASE_URL}/api/conversation/progress/confirm-outline`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: conversationId,
        }),
      }
    );
    const data = await response.json();
    if (data.success) {
      return true;
    }
    throw new Error(data.error || 'Failed to confirm outline');
  };

  const updateProgress = async (
    conversationId: string,
    progress: Partial<StoryProgress>
  ): Promise<StoryProgress> => {
    const response = await fetch(`${API_BASE_URL}/api/conversation/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        ...progress,
      }),
    });
    const data = await response.json();
    if (data.success) {
      return data.progress;
    }
    throw new Error(data.error || 'Failed to update progress');
  };

  return {
    getConversationsList,
    getConversationSettings,
    createOrUpdateSettings,
    getConversationMessages,
    deleteConversation,
    generateOutline,
    getSummary,
    generateSummary,
    saveSummary,
    getProgress,
    confirmOutline,
    updateProgress,
  };
};
