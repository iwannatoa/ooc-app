/**
 * Hook for conversation client operations
 */

import { useMemo } from 'react';
import {
  ConversationSettings,
  ConversationSummary,
  ConversationWithSettings,
  StoryProgress,
  CharacterRecord,
} from '@/types';
import { useApiClients } from './useApiClients';

export const useConversationClient = () => {
  const { conversationApi } = useApiClients();

  return useMemo(() => {
    return {
      getConversationsList: async (): Promise<ConversationWithSettings[]> => {
        return await conversationApi.getConversationsList();
      },

      getConversationSettings: async (
        conversationId: string
      ): Promise<ConversationSettings | null> => {
        return await conversationApi.getConversationSettings(conversationId);
      },

      getStoryTemplates: async () => {
        return await conversationApi.getStoryTemplates();
      },

      createOrUpdateSettings: async (
        settings: Partial<ConversationSettings>
      ): Promise<ConversationSettings> => {
        return await conversationApi.createOrUpdateSettings(settings);
      },

      getConversationMessages: async (
        conversationId: string
      ): Promise<ChatMessage[]> => {
        return await conversationApi.getConversationMessages(conversationId);
      },

      deleteConversation: async (conversationId: string): Promise<boolean> => {
        return await conversationApi.deleteConversation(conversationId);
      },

      generateOutline: async (
        background: string,
        characters?: string[],
        characterPersonality?: Record<string, string>,
        conversationId?: string,
        provider?: string,
        model?: string,
        onChunk?: (chunk: string, accumulated: string) => void
      ): Promise<string> => {
        if (onChunk) {
          return await conversationApi.generateOutlineStream(
            background,
            {
              characters,
              characterPersonality,
              conversationId,
              provider,
              model,
            },
            onChunk
          );
        }
        return await conversationApi.generateOutline(background, {
          characters,
          characterPersonality,
          conversationId,
          provider,
          model,
        });
      },

      getSummary: async (
        conversationId: string
      ): Promise<ConversationSummary | null> => {
        return await conversationApi.getSummary(conversationId);
      },

      generateSummary: async (
        conversationId: string,
        provider: string,
        model?: string
      ): Promise<string> => {
        return await conversationApi.generateSummary(
          conversationId,
          provider,
          model
        );
      },

      saveSummary: async (
        conversationId: string,
        summary: string
      ): Promise<ConversationSummary> => {
        return await conversationApi.saveSummary(conversationId, summary);
      },

      getProgress: async (
        conversationId: string
      ): Promise<StoryProgress | null> => {
        return await conversationApi.getProgress(conversationId);
      },

      confirmOutline: async (conversationId: string): Promise<boolean> => {
        return await conversationApi.confirmOutline(conversationId);
      },

      updateProgress: async (
        conversationId: string,
        progress: Partial<StoryProgress>
      ): Promise<StoryProgress> => {
        return await conversationApi.updateProgress(conversationId, progress);
      },

      getCharacters: async (
        conversationId: string,
        includeUnavailable: boolean = true
      ): Promise<CharacterRecord[]> => {
        return await conversationApi.getCharacters(
          conversationId,
          includeUnavailable
        );
      },

      updateCharacter: async (
        conversationId: string,
        name: string,
        updates: {
          is_main?: boolean;
          is_unavailable?: boolean;
          notes?: string;
        }
      ): Promise<CharacterRecord> => {
        return await conversationApi.updateCharacter(
          conversationId,
          name,
          updates
        );
      },

      generateCharacter: async (
        conversationId: string,
        provider: string,
        model?: string,
        characterHints?: string,
        background?: string,
        characters?: string[],
        characterPersonality?: Record<string, string>
      ): Promise<{
        characters?: Array<{ name: string; personality: string }>;
        character?: { name: string; personality: string };
      }> => {
        return await conversationApi.generateCharacter(
          conversationId,
          provider,
          {
            model,
            characterHints,
            background,
            characters,
            characterPersonality,
          }
        );
      },

      deleteLastMessage: async (conversationId: string): Promise<boolean> => {
        return await conversationApi.deleteLastMessage(conversationId);
      },

      getAssistantVariants: async (conversationId: string) => {
        return await conversationApi.getAssistantVariants(conversationId);
      },

      restoreAssistantVariant: async (
        conversationId: string,
        messageId: number
      ): Promise<boolean> => {
        return await conversationApi.restoreAssistantVariant(
          conversationId,
          messageId
        );
      },

      getStoryBranches: async (conversationId: string) => {
        return await conversationApi.getStoryBranches(conversationId);
      },

      createStoryBranch: async (
        conversationId: string,
        payload: { parent_message_id?: number; label?: string; branch_id?: string }
      ) => {
        return await conversationApi.createStoryBranch(conversationId, payload);
      },

      getStorySavepoints: async (conversationId: string) => {
        return await conversationApi.getStorySavepoints(conversationId);
      },

      createStorySavepoint: async (
        conversationId: string,
        payload: { message_id?: number; label?: string; savepoint_id?: string }
      ) => {
        return await conversationApi.createStorySavepoint(conversationId, payload);
      },

      restoreStorySavepoint: async (
        conversationId: string,
        savepointId: string
      ): Promise<boolean> => {
        return await conversationApi.restoreStorySavepoint(
          conversationId,
          savepointId
        );
      },

      markStoryEnding: async (
        conversationId: string,
        payload: { ending_tag: string; branch_id?: string; message_id?: number }
      ) => {
        return await conversationApi.markStoryEnding(conversationId, payload);
      },

      exportStoryPdf: async (conversationId: string, title?: string) => {
        return await conversationApi.exportStoryPdf(conversationId, title);
      },

      exportProjectBundle: async (conversationId: string, title?: string) => {
        return await conversationApi.exportProjectBundle(conversationId, title);
      },

      validateProjectBundle: async (bundle: Record<string, unknown>) => {
        return await conversationApi.validateProjectBundle(bundle);
      },
    };
  }, [conversationApi]);
};
