/**
 * Hook for managing AI generation in conversation settings form (Redux version)
 *
 * Encapsulates character and outline generation logic using Redux state.
 */

import { useCallback } from 'react';
import { useConversationClient } from './useConversationClient';
import { useSettingsState } from './useSettingsState';
import { useToast } from './useToast';
import { useI18n } from '@/i18n/i18n';
import { useConversationSettingsForm } from './useConversationSettingsForm';

/**
 * Hook for managing AI generation in conversation settings (Redux version)
 */
export const useConversationSettingsGeneration = () => {
  const conversationClient = useConversationClient();
  const { settings: appSettings } = useSettingsState();
  const { showError, showWarning } = useToast();
  const { t } = useI18n();
  const {
    formData,
    conversationId,
    isGeneratingCharacter,
    isGeneratingOutline,
    setGeneratingCharacter,
    setGeneratingOutline,
    updateFields,
    updateField,
  } = useConversationSettingsForm();

  const generateCharacter = useCallback(
    async (characterGenerationHints: string) => {
      if (!formData.background.trim()) {
        showWarning(t('conversationSettingsForm.backgroundRequired'));
        return null;
      }

      if (!conversationId) {
        showError(t('common.error'));
        return null;
      }

      setGeneratingCharacter(true);
      try {
        const provider = appSettings.ai.provider;
        const config = appSettings.ai[provider];

        const result = await conversationClient.generateCharacter(
          conversationId,
          provider,
          config.model,
          characterGenerationHints.trim() || undefined,
          formData.background,
          formData.characters.filter((c) => c.trim()),
          formData.characterPersonality
        );

        const generatedCharacters =
          (result as any).characters ||
          ((result as any).character ? [(result as any).character] : []);

        if (generatedCharacters.length === 0) {
          throw new Error('No characters generated');
        }

        return generatedCharacters;
      } catch (error) {
        console.error('Failed to generate character:', error);
        showError(
          t('conversationSettingsForm.generateCharacterFailed', {
            error: t('common.error'),
          })
        );
        return null;
      } finally {
        setGeneratingCharacter(false);
      }
    },
    [
      formData.background,
      formData.characters,
      formData.characterPersonality,
      conversationId,
      conversationClient,
      appSettings,
      showWarning,
      showError,
      t,
      setGeneratingCharacter,
    ]
  );

  const generateOutline = useCallback(
    async (
      onChunk?: (chunk: string, accumulated: string) => void
    ): Promise<string | null> => {
      if (!formData.background.trim()) {
        showWarning(t('conversationSettingsForm.backgroundRequired'));
        return null;
      }

      const validCharacters = formData.characters.filter(
        (c) => c.trim() !== ''
      );
      if (validCharacters.length === 0) {
        showWarning(t('conversationSettingsForm.atLeastOneCharacter'));
        return null;
      }

      if (!conversationId) {
        showError(t('common.error'));
        return null;
      }

      setGeneratingOutline(true);
      try {
        const validPersonality: Record<string, string> = {};
        validCharacters.forEach((char) => {
          if (formData.characterPersonality[char]) {
            validPersonality[char] = formData.characterPersonality[char];
          }
        });

        const provider = appSettings.ai.provider;
        const config = appSettings.ai[provider];

        const generated = await conversationClient.generateOutline(
          formData.background.trim(),
          validCharacters,
          validPersonality,
          conversationId,
          provider,
          config.model,
          onChunk
        );

        return generated;
      } catch (error) {
        console.error('Failed to generate outline:', error);
        showError(
          t('conversationSettingsForm.generateOutlineFailed', {
            error: t('common.error'),
          })
        );
        return null;
      } finally {
        setGeneratingOutline(false);
      }
    },
    [
      formData.background,
      formData.characters,
      formData.characterPersonality,
      conversationId,
      conversationClient,
      appSettings,
      showWarning,
      showError,
      t,
      setGeneratingOutline,
    ]
  );

  return {
    generateCharacter,
    generateOutline,
    isGeneratingCharacter,
    isGeneratingOutline,
  };
};
