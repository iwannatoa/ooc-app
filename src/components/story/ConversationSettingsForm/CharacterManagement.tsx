import React from 'react';
import { useI18n } from '@/i18n';
import { useConversationSettingsForm } from '@/hooks/useConversationSettingsForm';
import { useConversationSettingsGeneration } from '@/hooks/useConversationSettingsGeneration';
import styles from './ConversationSettingsForm.module.scss';

/**
 * Character Management Section
 *
 * Handles character list, personality settings, and AI character generation.
 * Uses Redux to manage state directly.
 */
export const CharacterManagement: React.FC = () => {
  const { t } = useI18n();
  const {
    formData,
    isGeneratingCharacter,
    updateFields,
    addCharacter,
    removeCharacter,
    updateCharacter,
    updateCharacterPersonality,
    updateCharacterIsMain,
  } = useConversationSettingsForm();
  const { generateCharacter } = useConversationSettingsGeneration();

  const {
    characters,
    characterPersonality,
    characterIsMain,
    characterGenerationHints,
  } = formData;
  const isGenerating = isGeneratingCharacter;

  // Handle character generation
  const handleGenerate = async () => {
    const generated = await generateCharacter(characterGenerationHints);
    if (!generated) return;

    const newCharacters = [...characters];
    const newPersonality = { ...characterPersonality };

    // Remove last empty character if exists
    const lastEmptyIndex =
      newCharacters.length > 0 && newCharacters[newCharacters.length - 1] === ''
        ? newCharacters.length - 1
        : -1;
    if (lastEmptyIndex >= 0) {
      newCharacters.splice(lastEmptyIndex, 1);
    }

    // Add generated characters
    for (const char of generated) {
      if (char.name) {
        newCharacters.push(char.name);
        if (char.personality) {
          newPersonality[char.name] = char.personality;
        }
      }
    }

    updateFields({
      characters: newCharacters,
      characterPersonality: newPersonality,
      characterGenerationHints: '',
    });
  };
  return (
    <div className={styles.field}>
      <div className={styles.fieldHeader}>
        <label className={styles.fieldLabel}>
          {t('conversationSettingsForm.characters')} *
        </label>
        <div className={styles.fieldActions}>
          <button
            type='button'
            onClick={addCharacter}
            className={styles.addButton}
          >
            {t('conversationSettingsForm.addCharacter')}
          </button>
        </div>
      </div>
      {characters.map((char, index) => (
        <div
          key={index}
          className={styles.characterRow}
        >
          <input
            type='text'
            value={char}
            onChange={(e) => updateCharacter(index, e.target.value)}
            placeholder={t('conversationSettingsForm.characterNamePlaceholder')}
            className={styles.characterInput}
          />
          {char && (
            <>
              <input
                type='text'
                value={characterPersonality[char] || ''}
                onChange={(e) =>
                  updateCharacterPersonality(char, e.target.value)
                }
                placeholder={t(
                  'conversationSettingsForm.characterSettingPlaceholder'
                )}
                className={styles.personalityInput}
              />
              <label className={styles.characterMainLabel}>
                <input
                  type='checkbox'
                  checked={characterIsMain[char] || false}
                  onChange={(e) =>
                    updateCharacterIsMain(char, e.target.checked)
                  }
                />
                {t('conversationSettingsForm.mainCharacter')}
              </label>
            </>
          )}
          {characters.length > 1 && (
            <button
              type='button'
              onClick={() => removeCharacter(index)}
              className={styles.removeButton}
            >
              {t('conversationSettingsForm.remove')}
            </button>
          )}
        </div>
      ))}
      <div className={styles.characterHintsContainer}>
        <input
          type='text'
          value={characterGenerationHints}
          onChange={(e) =>
            updateFields({ characterGenerationHints: e.target.value })
          }
          placeholder={t(
            'conversationSettingsForm.characterGenerationHintsPlaceholder'
          )}
          className={`${styles.characterHintsInput} ${styles.characterHintsInputFlex}`}
          disabled={isGenerating}
        />
        <button
          type='button'
          onClick={handleGenerate}
          disabled={isGenerating}
          className={styles.generateButton}
        >
          {isGenerating ? (
            <span className={styles.loadingContainer}>
              <span className={styles.spinner}></span>
              {t('conversationSettingsForm.generatingCharacter')}
            </span>
          ) : (
            t('conversationSettingsForm.generateCharacter')
          )}
        </button>
      </div>
    </div>
  );
};

