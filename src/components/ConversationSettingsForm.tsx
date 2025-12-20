import { useConversationClient } from '@/hooks/useConversationClient';
import { useSettingsState } from '@/hooks/useSettingsState';
import { useToast } from '@/hooks/useToast';
import { useI18n } from '@/i18n';
import { ConversationSettings } from '@/types';
import React, { useEffect, useRef, useState } from 'react';
import styles from './ConversationSettingsForm.module.scss';

interface ConversationSettingsFormProps {
  conversationId: string;
  settings?: ConversationSettings;
  onSave: (settings: Partial<ConversationSettings>) => void;
  onCancel: () => void;
  isNewConversation?: boolean;
}

const ConversationSettingsForm: React.FC<ConversationSettingsFormProps> = ({
  conversationId,
  settings,
  onSave,
  onCancel,
  isNewConversation = false,
}) => {
  const [title, setTitle] = useState(settings?.title || '');
  const [background, setBackground] = useState(settings?.background || '');
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

  const generatedContentRef = useRef<HTMLDivElement>(null);

  const conversationClient = useConversationClient();
  const { settings: appSettings } = useSettingsState();
  const { t } = useI18n();
  const { showError, showWarning } = useToast();

  // Auto-scroll to bottom when generatedOutline updates during streaming
  useEffect(() => {
    if (
      generatedContentRef.current &&
      generatedOutline &&
      isGeneratingOutline
    ) {
      generatedContentRef.current.scrollTop =
        generatedContentRef.current.scrollHeight;
    }
  }, [generatedOutline, isGeneratingOutline]);

  const handleAddCharacter = () => {
    setCharacters([...characters, '']);
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

      const generated = await conversationClient.generateCharacter(
        conversationId,
        provider,
        config.model,
        undefined, // characterHints
        background, // background
        characters.filter((c) => c.trim()), // characters (filter out empty strings)
        characterPersonality // characterPersonality
      );

      // Add the generated character
      const newCharacters = [...characters];
      if (newCharacters[newCharacters.length - 1] === '') {
        // Replace the last empty character
        newCharacters[newCharacters.length - 1] = generated.name;
      } else {
        // Add new character
        newCharacters.push(generated.name);
      }
      setCharacters(newCharacters);

      // Set personality if provided
      if (generated.personality) {
        setCharacterPersonality({
          ...characterPersonality,
          [generated.name]: generated.personality,
        });
      }
    } catch (error) {
      console.error('Failed to generate character:', error);
      showError(
        t('conversationSettingsForm.generateCharacterFailed', {
          error:
            error instanceof Error
              ? error.message
              : t('common.error', { defaultValue: '未知错误' }),
        })
      );
    } finally {
      setIsGeneratingCharacter(false);
    }
  };

  const handleRemoveCharacter = (index: number) => {
    const newCharacters = characters.filter((_, i) => i !== index);
    setCharacters(newCharacters);
    const characterName = characters[index];
    if (characterName) {
      if (characterPersonality[characterName]) {
        const newPersonality = { ...characterPersonality };
        delete newPersonality[characterName];
        setCharacterPersonality(newPersonality);
      }
      if (characterIsMain[characterName]) {
        const newIsMain = { ...characterIsMain };
        delete newIsMain[characterName];
        setCharacterIsMain(newIsMain);
      }
    }
  };

  const handleCharacterChange = (index: number, value: string) => {
    const newCharacters = [...characters];
    const oldName = newCharacters[index];
    newCharacters[index] = value;

    if (oldName) {
      if (characterPersonality[oldName]) {
        const newPersonality = { ...characterPersonality };
        if (value) {
          newPersonality[value] = newPersonality[oldName];
        }
        if (oldName !== value) {
          delete newPersonality[oldName];
        }
        setCharacterPersonality(newPersonality);
      }
      if (characterIsMain[oldName]) {
        const newIsMain = { ...characterIsMain };
        if (value) {
          newIsMain[value] = newIsMain[oldName];
        }
        if (oldName !== value) {
          delete newIsMain[oldName];
        }
        setCharacterIsMain(newIsMain);
      }
    }

    setCharacters(newCharacters);
  };

  const handlePersonalityChange = (characterName: string, value: string) => {
    setCharacterPersonality({
      ...characterPersonality,
      [characterName]: value,
    });
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
    setGeneratedOutline(''); // Clear previous outline
    try {
      const validPersonality: Record<string, string> = {};
      validCharacters.forEach((char) => {
        if (characterPersonality[char]) {
          validPersonality[char] = characterPersonality[char];
        }
      });

      const provider = appSettings.ai.provider;
      const config = appSettings.ai[provider];

      // Use streaming version with onChunk callback for real-time updates
      const generated = await conversationClient.generateOutline(
        background.trim(),
        validCharacters,
        validPersonality,
        conversationId,
        provider,
        config.model,
        (_: string, accumulated: string) => {
          // Update outline in real-time as chunks arrive
          setGeneratedOutline(accumulated);
        }
      );

      setGeneratedOutline(generated);
      setOutlineConfirmed(false);
    } catch (error) {
      console.error('Failed to generate outline:', error);
      showError(
        t('conversationSettingsForm.generateOutlineFailed', {
          error:
            error instanceof Error
              ? error.message
              : t('common.error', { defaultValue: '未知错误' }),
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
            error:
              error instanceof Error
                ? error.message
                : t('common.error', { defaultValue: '未知错误' }),
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
    <div
      className={styles.overlay}
      onClick={onCancel}
    >
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
          <div className={styles.field}>
            <label htmlFor='title'>
              {t('conversationSettingsForm.storyTitle')}
            </label>
            <input
              id='title'
              type='text'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('conversationSettingsForm.storyTitlePlaceholder')}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor='background'>
              {t('conversationSettingsForm.background')} *
            </label>
            <textarea
              id='background'
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              placeholder={t('conversationSettingsForm.backgroundPlaceholder')}
              rows={4}
              required={isNewConversation}
            />
          </div>

          <div className={styles.field}>
            <label>
              {t('conversationSettingsForm.characters')} *
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type='button'
                  onClick={handleAddCharacter}
                  className={styles.addButton}
                >
                  {t('conversationSettingsForm.addCharacter')}
                </button>
                <button
                  type='button'
                  onClick={handleGenerateCharacter}
                  disabled={!background.trim() || isGeneratingCharacter}
                  className={styles.generateButton}
                  title={
                    !background.trim()
                      ? t('conversationSettingsForm.backgroundRequired')
                      : undefined
                  }
                >
                  {isGeneratingCharacter
                    ? t('conversationSettingsForm.generatingCharacter')
                    : t('conversationSettingsForm.generateCharacter')}
                </button>
              </div>
            </label>
            {characters.map((char, index) => (
              <div
                key={index}
                className={styles.characterRow}
              >
                <input
                  type='text'
                  value={char}
                  onChange={(e) => handleCharacterChange(index, e.target.value)}
                  placeholder={t(
                    'conversationSettingsForm.characterNamePlaceholder'
                  )}
                  required={isNewConversation && index === 0}
                  className={styles.characterInput}
                />
                {char && (
                  <>
                    <input
                      type='text'
                      value={characterPersonality[char] || ''}
                      onChange={(e) =>
                        handlePersonalityChange(char, e.target.value)
                      }
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
                        onChange={(e) => {
                          setCharacterIsMain({
                            ...characterIsMain,
                            [char]: e.target.checked,
                          });
                        }}
                      />
                      {t('conversationSettingsForm.mainCharacter', {
                        defaultValue: '主要',
                      })}
                    </label>
                  </>
                )}
                {characters.length > 1 && (
                  <button
                    type='button'
                    onClick={() => handleRemoveCharacter(index)}
                    className={styles.removeButton}
                  >
                    {t('conversationSettingsForm.remove')}
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className={styles.field}>
            <label htmlFor='outline'>
              {t('conversationSettingsForm.outline')}
              {background.trim() && characters.some((c) => c.trim()) && (
                <button
                  type='button'
                  onClick={handleGenerateOutline}
                  disabled={isGeneratingOutline}
                  className={styles.generateButton}
                >
                  {isGeneratingOutline
                    ? t('conversationSettingsForm.generating')
                    : t('conversationSettingsForm.generateOutline')}
                </button>
              )}
            </label>

            {generatedOutline && !outlineConfirmed && (
              <div className={styles.generatedOutline}>
                <div className={styles.generatedHeader}>
                  <span>
                    {t('conversationSettingsForm.aiGeneratedOutline')}
                  </span>
                  <div className={styles.generatedActions}>
                    <button
                      type='button'
                      onClick={handleConfirmOutline}
                      className={styles.confirmButton}
                    >
                      {t('conversationSettingsForm.confirmOutline')}
                    </button>
                    <button
                      type='button'
                      onClick={handleRegenerateOutline}
                      disabled={isGeneratingOutline}
                      className={styles.regenerateButton}
                    >
                      {t('conversationSettingsForm.regenerateOutline')}
                    </button>
                  </div>
                </div>
                <div
                  ref={generatedContentRef}
                  className={styles.generatedContent}
                >
                  {generatedOutline}
                </div>
              </div>
            )}

            <textarea
              id='outline'
              value={outline}
              onChange={(e) => {
                setOutline(e.target.value);
                setOutlineConfirmed(true);
              }}
              placeholder={
                isNewConversation && !outline.trim()
                  ? t('conversationSettingsForm.outlinePlaceholderAuto')
                  : t('conversationSettingsForm.outlinePlaceholder')
              }
              rows={5}
            />
          </div>

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
