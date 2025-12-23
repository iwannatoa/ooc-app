import { useConversationClient } from '@/hooks/useConversationClient';
import { useSettingsState } from '@/hooks/useSettingsState';
import { useToast } from '@/hooks/useToast';
import { useI18n } from '@/i18n';
import { ConversationSettings } from '@/types';
import React, { useState } from 'react';
import {
  StoryBasicInfo,
  CharacterManagement,
  OutlineGeneration,
  AutoGenerationOptions,
} from './index';
import styles from './ConversationSettingsForm.module.scss';

interface ConversationSettingsFormProps {
  conversationId: string;
  settings?: ConversationSettings;
  onSave: (settings: Partial<ConversationSettings>) => void;
  onCancel: () => void;
  isNewConversation?: boolean;
}

/**
 * Conversation Settings Form Component
 *
 * Main form for editing conversation/story settings including:
 * - Basic story information (title, background, supplement)
 * - Character management and AI generation
 * - Story outline and AI generation
 * - Auto-generation options
 */
const ConversationSettingsForm: React.FC<ConversationSettingsFormProps> = ({
  conversationId,
  settings,
  onSave,
  onCancel,
  isNewConversation = false,
}) => {
  const [title, setTitle] = useState(settings?.title || '');
  const [background, setBackground] = useState(settings?.background || '');
  const [supplement, setSupplement] = useState(
    settings?.additional_settings?.supplement || ''
  );
  const [characters, setCharacters] = useState<string[]>(
    settings?.characters || ['']
  );
  const [characterPersonality, setCharacterPersonality] = useState<
    Record<string, string>
  >(settings?.character_personality || {});
  const [characterIsMain, setCharacterIsMain] = useState<
    Record<string, boolean>
  >(settings?.character_is_main || {});
  const [outline, setOutline] = useState(settings?.outline || '');
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [generatedOutline, setGeneratedOutline] = useState<string | null>(null);
  const [outlineConfirmed, setOutlineConfirmed] = useState(false);
  const [isGeneratingCharacter, setIsGeneratingCharacter] = useState(false);
  const [characterGenerationHints, setCharacterGenerationHints] = useState('');
  const [allowAutoGenerateCharacters, setAllowAutoGenerateCharacters] =
    useState(settings?.allow_auto_generate_characters !== false);
  const [allowAutoGenerateMainCharacters, setAllowAutoGenerateMainCharacters] =
    useState(
      settings?.additional_settings?.allow_auto_generate_main_characters !==
        false
    );

  const conversationClient = useConversationClient();
  const { settings: appSettings } = useSettingsState();
  const { t } = useI18n();
  const { showError, showWarning } = useToast();

  const handleAddCharacter = () => {
    setCharacters([...characters, '']);
  };

  const handleRemoveCharacter = (index: number) => {
    const newCharacters = [...characters];
    const removedChar = newCharacters[index];
    newCharacters.splice(index, 1);
    setCharacters(newCharacters);

    if (removedChar) {
      const newPersonality = { ...characterPersonality };
      const newIsMain = { ...characterIsMain };
      delete newPersonality[removedChar];
      delete newIsMain[removedChar];
      setCharacterPersonality(newPersonality);
      setCharacterIsMain(newIsMain);
    }
  };

  const handleCharacterChange = (index: number, value: string) => {
    const newCharacters = [...characters];
    const oldChar = newCharacters[index];
    newCharacters[index] = value;
    setCharacters(newCharacters);

    if (oldChar && oldChar !== value) {
      const newPersonality = { ...characterPersonality };
      const newIsMain = { ...characterIsMain };
      if (newPersonality[oldChar]) {
        newPersonality[value] = newPersonality[oldChar];
        delete newPersonality[oldChar];
      }
      if (newIsMain[oldChar] !== undefined) {
        newIsMain[value] = newIsMain[oldChar];
        delete newIsMain[oldChar];
      }
      setCharacterPersonality(newPersonality);
      setCharacterIsMain(newIsMain);
    }
  };

  const handlePersonalityChange = (characterName: string, value: string) => {
    setCharacterPersonality({
      ...characterPersonality,
      [characterName]: value,
    });
  };

  const handleIsMainChange = (characterName: string, isMain: boolean) => {
    setCharacterIsMain({
      ...characterIsMain,
      [characterName]: isMain,
    });
  };

  const handleGenerateCharacter = async () => {
    if (!background.trim()) {
      showWarning(t('conversationSettingsForm.backgroundRequired'));
      return;
    }

    setIsGeneratingCharacter(true);
    try {
      const provider = appSettings.ai.provider;
      const config = appSettings.ai[provider];

      const result = await conversationClient.generateCharacter(
        conversationId,
        provider,
        config.model,
        characterGenerationHints.trim() || undefined,
        background,
        characters.filter((c) => c.trim()),
        characterPersonality
      );

      const generatedCharacters =
        (result as any).characters ||
        ((result as any).character ? [(result as any).character] : []);

      if (generatedCharacters.length === 0) {
        throw new Error('No characters generated');
      }

      const newCharacters = [...characters];
      const newPersonality = { ...characterPersonality };

      const lastEmptyIndex =
        newCharacters.length > 0 &&
        newCharacters[newCharacters.length - 1] === ''
          ? newCharacters.length - 1
          : -1;

      if (lastEmptyIndex >= 0) {
        newCharacters.splice(lastEmptyIndex, 1);
      }

      for (const generated of generatedCharacters) {
        if (generated.name) {
          newCharacters.push(generated.name);
          if (generated.personality) {
            newPersonality[generated.name] = generated.personality;
          }
        }
      }
      setCharacters(newCharacters);
      setCharacterPersonality(newPersonality);
      setCharacterGenerationHints('');
    } catch (error) {
      console.error('Failed to generate character:', error);
      showError(
        t('conversationSettingsForm.generateCharacterFailed', {
          error: t('common.error'),
        })
      );
    } finally {
      setIsGeneratingCharacter(false);
    }
  };

  const handleGenerateOutline = async () => {
    if (!background.trim()) {
      showWarning(t('conversationSettingsForm.backgroundRequired'));
      return;
    }

    const validCharacters = characters.filter((c) => c.trim() !== '');
    if (validCharacters.length === 0) {
      showWarning(t('conversationSettingsForm.atLeastOneCharacter'));
      return;
    }

    setIsGeneratingOutline(true);
    setGeneratedOutline('');
    try {
      const validPersonality: Record<string, string> = {};
      validCharacters.forEach((char) => {
        if (characterPersonality[char]) {
          validPersonality[char] = characterPersonality[char];
        }
      });

      const provider = appSettings.ai.provider;
      const config = appSettings.ai[provider];

      const generated = await conversationClient.generateOutline(
        background.trim(),
        validCharacters,
        validPersonality,
        conversationId,
        provider,
        config.model,
        (_: string, accumulated: string) => {
          setGeneratedOutline(accumulated);
        }
      );

      setGeneratedOutline(generated);
      setOutlineConfirmed(false);
    } catch (error) {
      console.error('Failed to generate outline:', error);
      showError(
        t('conversationSettingsForm.generateOutlineFailed', {
          error: t('common.error'),
        })
      );
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const handleConfirmOutline = () => {
    if (generatedOutline) {
      setOutline(generatedOutline);
      setOutlineConfirmed(true);
      setGeneratedOutline(null);
    }
  };

  const handleRegenerateOutline = () => {
    setGeneratedOutline(null);
    setOutlineConfirmed(false);
    handleGenerateOutline();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalOutline = outline.trim();
    if (!finalOutline && isNewConversation) {
      try {
        setIsGeneratingOutline(true);
        const validCharacters = characters.filter((c) => c.trim() !== '');
        const validPersonality: Record<string, string> = {};
        validCharacters.forEach((char) => {
          if (characterPersonality[char]) {
            validPersonality[char] = characterPersonality[char];
          }
        });

        const provider = appSettings.ai.provider;
        const config = appSettings.ai[provider];

        finalOutline = await conversationClient.generateOutline(
          background.trim(),
          validCharacters,
          validPersonality,
          conversationId,
          provider,
          config.model
        );
      } catch (error) {
        console.error('Failed to generate outline:', error);
        showError(
          t('conversationSettingsForm.autoGenerateOutlineFailed', {
            error: t('common.error'),
          })
        );
        setIsGeneratingOutline(false);
        return;
      } finally {
        setIsGeneratingOutline(false);
      }
    }

    const validCharacters = characters.filter((c) => c.trim() !== '');
    const validPersonality: Record<string, string> = {};
    validCharacters.forEach((char) => {
      if (characterPersonality[char]) {
        validPersonality[char] = characterPersonality[char];
      }
    });

    try {
      const validIsMain: Record<string, boolean> = {};
      validCharacters.forEach((char) => {
        if (characterIsMain[char]) {
          validIsMain[char] = characterIsMain[char];
        }
      });

      await onSave({
        conversation_id: conversationId,
        title: title.trim() || undefined,
        background: background.trim() || undefined,
        characters: validCharacters.length > 0 ? validCharacters : undefined,
        character_personality:
          Object.keys(validPersonality).length > 0
            ? validPersonality
            : undefined,
        character_is_main:
          Object.keys(validIsMain).length > 0 ? validIsMain : undefined,
        outline: finalOutline || undefined,
        allow_auto_generate_characters: allowAutoGenerateCharacters,
        additional_settings: {
          allow_auto_generate_main_characters: allowAutoGenerateMainCharacters,
          supplement: supplement.trim() || undefined,
        },
      });

      if (finalOutline && (outlineConfirmed || generatedOutline)) {
        try {
          await conversationClient.confirmOutline(conversationId);
        } catch (error) {
          console.error('Failed to confirm outline:', error);
        }
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  };

  return (
    <div className={styles.overlay}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2>
            {isNewConversation
              ? t('conversationSettingsForm.newConversationTitle')
              : t('conversationSettingsForm.editConversationTitle')}
          </h2>
          <button
            className={styles.closeButton}
            onClick={onCancel}
          >
            ×
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          className={styles.form}
        >
          <StoryBasicInfo
            title={title}
            background={background}
            supplement={supplement}
            onTitleChange={setTitle}
            onBackgroundChange={setBackground}
            onSupplementChange={setSupplement}
            t={t}
          />

          <CharacterManagement
            characters={characters}
            characterPersonality={characterPersonality}
            characterIsMain={characterIsMain}
            characterGenerationHints={characterGenerationHints}
            isGeneratingCharacter={isGeneratingCharacter}
            onAddCharacter={handleAddCharacter}
            onRemoveCharacter={handleRemoveCharacter}
            onCharacterChange={handleCharacterChange}
            onPersonalityChange={handlePersonalityChange}
            onIsMainChange={handleIsMainChange}
            onGenerateCharacter={handleGenerateCharacter}
            onGenerationHintsChange={setCharacterGenerationHints}
            t={t}
          />

          <OutlineGeneration
            outline={outline}
            generatedOutline={generatedOutline}
            isGeneratingOutline={isGeneratingOutline}
            outlineConfirmed={outlineConfirmed}
            onOutlineChange={(value) => {
              setOutline(value);
              setOutlineConfirmed(true);
            }}
            onGenerateOutline={handleGenerateOutline}
            onConfirmOutline={handleConfirmOutline}
            onRegenerateOutline={handleRegenerateOutline}
            t={t}
          />

          <AutoGenerationOptions
            allowAutoGenerateCharacters={allowAutoGenerateCharacters}
            allowAutoGenerateMainCharacters={allowAutoGenerateMainCharacters}
            onAllowAutoGenerateCharactersChange={(value) => {
              setAllowAutoGenerateCharacters(value);
              if (!value) {
                setAllowAutoGenerateMainCharacters(false);
              }
            }}
            onAllowAutoGenerateMainCharactersChange={
              setAllowAutoGenerateMainCharacters
            }
            t={t}
          />

          <div className={styles.actions}>
            <button
              type='button'
              onClick={onCancel}
              className={styles.cancelButton}
            >
              {t('conversationSettingsForm.cancel')}
            </button>
            <button
              type='submit'
              className={styles.submitButton}
            >
              {t('conversationSettingsForm.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConversationSettingsForm;
