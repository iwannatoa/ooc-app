import React, { useState } from 'react';
import { useI18n } from '@/i18n';
import styles from './StoryActions.module.scss';

interface StoryActionsProps {
  onGenerate: () => void;
  onConfirm: () => void;
  onRewrite: (feedback: string) => void;
  onModify: (feedback: string) => void;
  onAddSettings: () => void;
  onDeleteLastMessage?: () => void;
  loading?: boolean;
  disabled?: boolean;
  canConfirm?: boolean;
  canGenerate?: boolean;
  canDeleteLast?: boolean;
}

const StoryActions: React.FC<StoryActionsProps> = ({
  onGenerate,
  onConfirm,
  onRewrite,
  onModify,
  onAddSettings,
  onDeleteLastMessage,
  loading = false,
  disabled = false,
  canConfirm = false,
  canGenerate = true,
  canDeleteLast = false,
}) => {
  const { t } = useI18n();
  const [showRewriteDialog, setShowRewriteDialog] = useState(false);
  const [showModifyDialog, setShowModifyDialog] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleRewrite = () => {
    if (feedback.trim()) {
      onRewrite(feedback);
      setFeedback('');
      setShowRewriteDialog(false);
    }
  };

  const handleModify = () => {
    if (feedback.trim()) {
      onModify(feedback);
      setFeedback('');
      setShowModifyDialog(false);
    }
  };

  return (
    <div className={styles.storyActions}>
      <div className={styles.actionButtons}>
        {canGenerate && (
          <button
            onClick={onGenerate}
            disabled={loading || disabled}
            className={styles.actionButton}
            title={t('storyActions.generateCurrentTooltip')}
          >
            {loading
              ? t('storyActions.generating')
              : t('storyActions.generateCurrent')}
          </button>
        )}

        {canConfirm && (
          <button
            onClick={onConfirm}
            disabled={loading || disabled}
            className={styles.actionButton}
            title={t('storyActions.nextChapterTooltip')}
          >
            {loading
              ? t('storyActions.generating')
              : t('storyActions.nextChapter')}
          </button>
        )}

        <button
          onClick={() => setShowRewriteDialog(true)}
          disabled={loading || disabled}
          className={styles.actionButton}
          title={t('storyActions.rewriteTooltip')}
        >
          {t('storyActions.rewrite')}
        </button>

        <button
          onClick={() => setShowModifyDialog(true)}
          disabled={loading || disabled}
          className={styles.actionButton}
          title={t('storyActions.modifyTooltip')}
        >
          {t('storyActions.modify')}
        </button>

        <button
          onClick={onAddSettings}
          disabled={loading || disabled}
          className={styles.actionButton}
          title={t('storyActions.addSettingsTooltip')}
        >
          {t('storyActions.addSettings')}
        </button>

        {canDeleteLast && onDeleteLastMessage && (
          <button
            onClick={onDeleteLastMessage}
            disabled={loading || disabled}
            className={styles.actionButton}
            title={t('storyActions.deleteLastMessageTooltip')}
          >
            {t('storyActions.deleteLastMessage')}
          </button>
        )}
      </div>

      {showRewriteDialog && (
        <div className={styles.dialogOverlay}>
          <div className={styles.dialog}>
            <h3>{t('storyActions.rewriteTitle')}</h3>
            <p>{t('storyActions.rewritePrompt')}</p>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={t('storyActions.rewritePlaceholder')}
              rows={4}
              className={styles.feedbackInput}
            />
            <div className={styles.dialogActions}>
              <button
                onClick={() => {
                  setShowRewriteDialog(false);
                  setFeedback('');
                }}
                className={styles.cancelButton}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleRewrite}
                disabled={!feedback.trim()}
                className={styles.confirmButton}
              >
                {t('storyActions.confirmRewrite')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModifyDialog && (
        <div className={styles.dialogOverlay}>
          <div className={styles.dialog}>
            <h3>{t('storyActions.modifyTitle')}</h3>
            <p>{t('storyActions.modifyPrompt')}</p>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={t('storyActions.modifyPlaceholder')}
              rows={4}
              className={styles.feedbackInput}
            />
            <div className={styles.dialogActions}>
              <button
                onClick={() => {
                  setShowModifyDialog(false);
                  setFeedback('');
                }}
                className={styles.cancelButton}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleModify}
                disabled={!feedback.trim()}
                className={styles.confirmButton}
              >
                {t('storyActions.confirmModify')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryActions;
