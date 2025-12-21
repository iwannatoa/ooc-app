import React from 'react';
import styles from './ConversationSettingsForm.module.scss';

interface CharacterManagementProps {
  characters: string[];
  characterPersonality: Record<string, string>;
  characterIsMain: Record<string, boolean>;
  characterGenerationHints: string;
  isGeneratingCharacter: boolean;
  onAddCharacter: () => void;
  onRemoveCharacter: (index: number) => void;
  onCharacterChange: (index: number, value: string) => void;
  onPersonalityChange: (characterName: string, value: string) => void;
  onIsMainChange: (characterName: string, isMain: boolean) => void;
  onGenerateCharacter: () => void;
  onGenerationHintsChange: (hints: string) => void;
  t: (key: string) => string;
}

/**
 * Character Management Section
 *
 * Handles character list, personality settings, and AI character generation.
 */
export const CharacterManagement: React.FC<CharacterManagementProps> = ({
  characters,
  characterPersonality,
  characterIsMain,
  characterGenerationHints,
  isGeneratingCharacter,
  onAddCharacter,
  onRemoveCharacter,
  onCharacterChange,
  onPersonalityChange,
  onIsMainChange,
  onGenerateCharacter,
  onGenerationHintsChange,
  t,
}) => {
  return (
    <div className={styles.field}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <label style={{ margin: 0 }}>
          {t('conversationSettingsForm.characters')} *
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type='button'
            onClick={onAddCharacter}
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
            onChange={(e) => onCharacterChange(index, e.target.value)}
            placeholder={t('conversationSettingsForm.characterNamePlaceholder')}
            className={styles.characterInput}
          />
          {char && (
            <>
              <input
                type='text'
                value={characterPersonality[char] || ''}
                onChange={(e) => onPersonalityChange(char, e.target.value)}
                placeholder={t(
                  'conversationSettingsForm.characterSettingPlaceholder'
                )}
                className={styles.personalityInput}
              />
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                  fontSize: '12px',
                  cursor: 'pointer',
                  marginLeft: '8px',
                }}
              >
                <input
                  type='checkbox'
                  checked={characterIsMain[char] || false}
                  onChange={(e) => onIsMainChange(char, e.target.checked)}
                />
                {t('conversationSettingsForm.mainCharacter')}
              </label>
            </>
          )}
          {characters.length > 1 && (
            <button
              type='button'
              onClick={() => onRemoveCharacter(index)}
              className={styles.removeButton}
            >
              {t('conversationSettingsForm.remove')}
            </button>
          )}
        </div>
      ))}
      <div
        style={{
          marginTop: '8px',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        <input
          type='text'
          value={characterGenerationHints}
          onChange={(e) => onGenerationHintsChange(e.target.value)}
          placeholder={t(
            'conversationSettingsForm.characterGenerationHintsPlaceholder'
          )}
          className={styles.characterHintsInput}
          disabled={isGeneratingCharacter}
          style={{ flex: 1 }}
        />
        <button
          type='button'
          onClick={onGenerateCharacter}
          disabled={isGeneratingCharacter}
          className={styles.generateButton}
        >
          {isGeneratingCharacter ? (
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
