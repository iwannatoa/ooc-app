import { useMemo } from 'react';
import {
  ConversationSettings,
  ConversationSummary,
  ConversationWithSettings,
  StoryProgress,
  CharacterRecord,
} from '@/types';
import { isMockMode, mockConversationClient } from '@/mock';
import { useFlaskPort } from '@/hooks/useFlaskPort';

export const useConversationClient = () => {
  const { apiUrl } = useFlaskPort();

  const API_BASE_URL = useMemo(() => apiUrl, [apiUrl]);

  if (isMockMode()) {
    return mockConversationClient;
  }

  return useMemo(() => {
    const getConversationsList = async (): Promise<
      ConversationWithSettings[]
    > => {
      const response = await fetch(`${API_BASE_URL}/api/conversations/list`);
      const data = await response.json();
      if (data.success) {
        return data.conversations.map((conv: any) => ({
          id: conv.conversation_id,
          title: conv.title || '未命名故事',
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
      settings: Partial<ConversationSettings>
    ): Promise<ConversationSettings> => {
      const settingsToSend: any = {
        conversation_id: settings.conversation_id,
        title: settings.title,
        background: settings.background,
        characters: settings.characters,
        character_personality: settings.character_personality,
        outline: settings.outline,
      };

      const response = await fetch(
        `${API_BASE_URL}/api/conversation/settings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(settingsToSend),
        }
      );
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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        const messages = data.messages || [];
        const formattedMessages = messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.created_at
            ? new Date(msg.created_at).getTime()
            : Date.now(),
          id: msg.id?.toString() || `msg_${Date.now()}_${Math.random()}`,
        }));
        return formattedMessages;
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
      model?: string
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
            provider,
            model,
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
      const response = await fetch(
        `${API_BASE_URL}/api/conversation/progress`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversation_id: conversationId,
            ...progress,
          }),
        }
      );
      const data = await response.json();
      if (data.success) {
        return data.progress;
      }
      throw new Error(data.error || 'Failed to update progress');
    };

    const getCharacters = async (
      conversationId: string,
      includeUnavailable: boolean = true
    ): Promise<CharacterRecord[]> => {
      const response = await fetch(
        `${API_BASE_URL}/api/conversation/characters?conversation_id=${conversationId}&include_unavailable=${includeUnavailable}`
      );
      const data = await response.json();
      if (data.success) {
        return data.characters || [];
      }
      throw new Error(data.error || 'Failed to fetch characters');
    };

    const updateCharacter = async (
      conversationId: string,
      name: string,
      updates: {
        is_main?: boolean;
        is_unavailable?: boolean;
        notes?: string;
      }
    ): Promise<CharacterRecord> => {
      const response = await fetch(
        `${API_BASE_URL}/api/conversation/characters/update`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversation_id: conversationId,
            name,
            ...updates,
          }),
        }
      );
      const data = await response.json();
      if (data.success) {
        return data.character;
      }
      throw new Error(data.error || 'Failed to update character');
    };

    const generateCharacter = async (
      conversationId: string,
      provider: string,
      model?: string,
      characterHints?: string
    ): Promise<{ name: string; personality: string }> => {
      const response = await fetch(
        `${API_BASE_URL}/api/conversation/characters/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversation_id: conversationId,
            provider,
            model,
            character_hints: characterHints,
          }),
        }
      );
      const data = await response.json();
      if (data.success) {
        return data.character;
      }
      throw new Error(data.error || 'Failed to generate character');
    };

    const deleteLastMessage = async (
      conversationId: string
    ): Promise<boolean> => {
      const response = await fetch(
        `${API_BASE_URL}/api/conversation/delete-last-message`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ conversation_id: conversationId }),
        }
      );
      const data = await response.json();
      return data.success;
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
      getCharacters,
      updateCharacter,
      generateCharacter,
      deleteLastMessage,
    };
  }, [API_BASE_URL]);
};
