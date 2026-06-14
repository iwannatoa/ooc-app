import React from 'react';
import { useI18n } from '@/i18n/i18n';
import styles from './StoryActions.module.scss';

interface FeedbackDialogProps {
  isOpen: boolean;
  title: string;
  prompt: string;
  placeholder: string;
  confirmText: string;
  feedback: string;
  onFeedbackChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Feedback Dialog Component
 *
 * Reusable dialog for collecting user feedback (used for rewrite and modify actions).
 */
export const FeedbackDialog: React.FC<FeedbackDialogProps> = ({
  isOpen,
  title,
  prompt,
  placeholder,
  confirmText,
  feedback,
  onFeedbackChange,
  onConfirm,
  onCancel,
}) => {
  const { t } = useI18n();

  if (!isOpen) return null;

  return (
    <div className={styles.dialogOverlay}>
      <div className={styles.dialog}>
        <h3>{title}</h3>
        <p>{prompt}</p>
        <textarea
          value={feedback}
          onChange={(e) => onFeedbackChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className={styles.feedbackInput}
        />
        <div className={styles.dialogActions}>
          <button
            onClick={onCancel}
            className={styles.cancelButton}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={!feedback.trim()}
            className={styles.confirmButton}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

