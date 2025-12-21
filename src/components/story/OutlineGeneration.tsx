import React, { useRef, useEffect } from 'react';
import styles from './ConversationSettingsForm.module.scss';

interface OutlineGenerationProps {
  outline: string;
  generatedOutline: string | null;
  isGeneratingOutline: boolean;
  outlineConfirmed: boolean;
  onOutlineChange: (outline: string) => void;
  onGenerateOutline: () => void;
  onConfirmOutline: () => void;
  onRegenerateOutline: () => void;
  t: (key: string) => string;
}

/**
 * Outline Generation Section
 *
 * Handles story outline input and AI-powered outline generation.
 */
export const OutlineGeneration: React.FC<OutlineGenerationProps> = ({
  outline,
  generatedOutline,
  isGeneratingOutline,
  outlineConfirmed,
  onOutlineChange,
  onGenerateOutline,
  onConfirmOutline,
  onRegenerateOutline,
  t,
}) => {
  const generatedContentRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className={styles.field}>
      <label htmlFor='outline'>
        {t('conversationSettingsForm.outline')}
        <button
          type='button'
          onClick={onGenerateOutline}
          disabled={isGeneratingOutline}
          className={styles.generateButton}
        >
          {isGeneratingOutline ? (
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
                onClick={onConfirmOutline}
                className={styles.confirmButton}
              >
                {t('conversationSettingsForm.confirmOutline')}
              </button>
              <button
                type='button'
                onClick={onRegenerateOutline}
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
        onChange={(e) => onOutlineChange(e.target.value)}
        placeholder={t('conversationSettingsForm.outlinePlaceholder')}
        rows={5}
      />
    </div>
  );
};
