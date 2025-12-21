import React, { useState } from 'react';
import { useI18n } from '@/i18n';
import { useToast } from '@/hooks/useToast';
import styles from './SummaryPrompt.module.scss';

interface SummaryPromptProps {
  conversationId: string;
  messageCount: number;
  onGenerate: () => Promise<string>;
  onSave: (summary: string) => Promise<void>;
  onCancel: () => void;
}

const SummaryPrompt: React.FC<SummaryPromptProps> = ({
  messageCount,
  onGenerate,
  onSave,
  onCancel,
}) => {
  const { t } = useI18n();
  const { showError, showWarning } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState<string | null>(null);
  const [summary, setSummary] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const generated = await onGenerate();
      setGeneratedSummary(generated);
      setSummary(generated);
    } catch (error) {
      console.error('Failed to generate summary:', error);
      showError(t('summaryPrompt.generateFailed', {
        error: t('common.error')
      }));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!summary.trim()) {
      showWarning(t('summaryPrompt.summaryRequired'));
      return;
    }
    setIsSaving(true);
    try {
      await onSave(summary.trim());
    } catch (error) {
      console.error('Failed to save summary:', error);
        showError(t('summaryPrompt.saveFailed', {
          error: t('common.error')
        }));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{t('summaryPrompt.title')}</h2>
          <button className={styles.closeButton} onClick={onCancel}>
            ×
          </button>
        </div>
        <div className={styles.content}>
          <div className={styles.info}>
            <p>
              {t('summaryPrompt.message', { count: messageCount })}
              {' '}{t('summaryPrompt.messageNote')}
            </p>
            <p className={styles.note}>
              {t('summaryPrompt.note')}
            </p>
          </div>

          <div className={styles.actions}>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={styles.generateButton}
            >
              {isGenerating ? t('summaryPrompt.generating') : t('summaryPrompt.generate')}
            </button>
          </div>

          {generatedSummary && (
            <div className={styles.generatedSection}>
              <div className={styles.generatedHeader}>
                <span>{t('summaryPrompt.aiGeneratedSummary')}</span>
                <button
                  onClick={() => {
                    setGeneratedSummary(null);
                    setSummary('');
                  }}
                  className={styles.clearButton}
                >
                  {t('summaryPrompt.clear')}
                </button>
              </div>
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="summary">{t('summaryPrompt.summaryLabel')}</label>
            <textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={t('summaryPrompt.summaryPlaceholder')}
              rows={10}
              required
            />
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              onClick={onCancel}
              className={styles.cancelButton}
              disabled={isSaving}
            >
              {t('summaryPrompt.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={!summary.trim() || isSaving}
              className={styles.saveButton}
            >
              {isSaving ? t('summaryPrompt.saving') : t('summaryPrompt.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryPrompt;

