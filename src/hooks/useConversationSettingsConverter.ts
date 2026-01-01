/**
 * Hook for converting between form data and API format
 * 
 * Handles data transformation between the form's internal state
 * and the API's expected format.
 */

import { useCallback } from 'react';
import { ConversationSettings } from '@/types';
import type { ConversationSettingsFormData } from '@/store/slices/conversationSettingsFormSlice';

/**
 * Hook for converting conversation settings data formats
 */
export const useConversationSettingsConverter = () => {
  /**
   * Convert form data to API format
   */
  const toApiFormat = useCallback(
    (
      formData: ConversationSettingsFormData,
      conversationId: string
    ): Partial<ConversationSettings> => {
      const validCharacters = formData.characters.filter((c) => c.trim() !== '');
      const validPersonality: Record<string, string> = {};
      const validIsMain: Record<string, boolean> = {};

      validCharacters.forEach((char) => {
        if (formData.characterPersonality[char]) {
          validPersonality[char] = formData.characterPersonality[char];
        }
        if (formData.characterIsMain[char]) {
          validIsMain[char] = formData.characterIsMain[char];
        }
      });

      return {
        conversation_id: conversationId,
        title: formData.title.trim() || undefined,
        background: formData.background.trim() || undefined,
        characters: validCharacters.length > 0 ? validCharacters : undefined,
        character_personality:
          Object.keys(validPersonality).length > 0 ? validPersonality : undefined,
        character_is_main:
          Object.keys(validIsMain).length > 0 ? validIsMain : undefined,
        outline: formData.outline.trim() || undefined,
        allow_auto_generate_characters: formData.allowAutoGenerateCharacters,
        additional_settings: {
          allow_auto_generate_main_characters:
            formData.allowAutoGenerateMainCharacters,
          supplement: formData.supplement.trim() || undefined,
        },
      };
    },
    []
  );

  /**
   * Convert API format to form data
   */
  const fromApiFormat = useCallback(
    (settings?: ConversationSettings): ConversationSettingsFormData => {
      return {
        title: settings?.title || '',
        background: settings?.background || '',
        supplement: settings?.additional_settings?.supplement || '',
        characters: settings?.characters || [''],
        characterPersonality: settings?.character_personality || {},
        characterIsMain: settings?.character_is_main || {},
        characterGenerationHints: '',
        outline: settings?.outline || '',
        generatedOutline: null,
        outlineConfirmed: false,
        allowAutoGenerateCharacters:
          settings?.allow_auto_generate_characters !== false,
        allowAutoGenerateMainCharacters:
          settings?.additional_settings?.allow_auto_generate_main_characters !==
          false,
      };
    },
    []
  );

  return {
    toApiFormat,
    fromApiFormat,
  };
};

