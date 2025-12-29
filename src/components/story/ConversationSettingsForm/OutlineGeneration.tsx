import React, { useRef, useEffect } from 'react';
import { useI18n } from '@/i18n';
import { useConversationSettingsForm } from '@/hooks/useConversationSettingsForm';
import { useConversationSettingsGeneration } from '@/hooks/useConversationSettingsGeneration';
import styles from './ConversationSettingsForm.module.scss';

/**
 * Outline Generation Section
 *
 * Handles story outline input and AI-powered outline generation.
 * Uses Redux to manage state directly.
 */
export const OutlineGeneration: React.FC = () => {
  const { t } = useI18n();
  const {
    formData,
    isGeneratingOutline,
    updateFields,
    confirmOutline,
  } = useConversationSettingsForm();
  const { generateOutline } = useConversationSettingsGeneration();

  const { outline, generatedOutline, outlineConfirmed } = formData;
  const isGenerating = isGeneratingOutline;
  const generatedContentRef = useRef<HTMLDivElement>(null);

  // Handle outline generation
  const handleGenerate = async () => {
    const generated = await generateOutline(
      (_: string, accumulated: string) => {
        updateFields({ generatedOutline: accumulated });
      }
    );

    if (generated) {
      updateFields({
        generatedOutline: generated,
        outlineConfirmed: false,
      });
    }
  };

  // Handle outline regeneration
  const handleRegenerate = async () => {
    updateFields({
      generatedOutline: null,
      outlineConfirmed: false,
    });
    await handleGenerate();
  };

  // Auto-scroll to bottom when generatedOutline updates during streaming
  useEffect(() => {
    if (
      generatedContentRef.current &&
      generatedOutline &&
      isGenerating
    ) {
      generatedContentRef.current.scrollTop =
        generatedContentRef.current.scrollHeight;
    }
  }, [generatedOutline, isGenerating]);

  return (
    <div className={styles.field}>
      <label htmlFor='outline'>
        {t('conversationSettingsForm.outline')}
        <button
          type='button'
          onClick={handleGenerate}
          disabled={isGenerating}
          className={styles.generateButton}
        >
          {isGenerating ? (
            <span className={styles.loadingContainer}>
              <span className={styles.spinner}></span>
              {t('conversationSettingsForm.generating')}
            </span>
          ) : (
            t('conversationSettingsForm.generateOutline')
          )}
        </button>
      </label>

      {generatedOutline && !outlineConfirmed && (
        <div className={styles.generatedOutline}>
          <div className={styles.generatedHeader}>
            <span>{t('conversationSettingsForm.aiGeneratedOutline')}</span>
            <div className={styles.generatedActions}>
              <button
                type='button'
                onClick={confirmOutline}
                className={styles.confirmButton}
              >
                {t('conversationSettingsForm.confirmOutline')}
              </button>
              <button
                type='button'
                onClick={handleRegenerate}
                disabled={isGenerating}
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
        onChange={(e) =>
          updateFields({
            outline: e.target.value,
            outlineConfirmed: true,
          })
        }
        placeholder={t('conversationSettingsForm.outlinePlaceholder')}
        rows={5}
      />
    </div>
  );
};

