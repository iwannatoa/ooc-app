import React, { useState } from 'react';
import { useI18n } from '@/i18n/i18n';
import { useAppLogic } from '@/hooks/useAppLogic';
import { useConversationSettingsDialog } from '@/hooks/useDialog';
import { useConversationManagement } from '@/hooks/useConversationManagement';
import { useChatState } from '@/hooks/useChatState';
import { FeedbackDialog } from './FeedbackDialog';
import styles from './StoryActions.module.scss';

/**
 * Story Actions Component
 *
 * Displays action buttons for story generation, confirmation, rewriting, and modification.
 * Uses hooks to get all necessary handlers and state, eliminating prop drilling.
 */
const StoryActions: React.FC = () => {
  const { t } = useI18n();
  const { isSending } = useChatState();
  const { activeConversationId, conversationSettings } =
    useConversationManagement();
  const settingsDialog = useConversationSettingsDialog();

  const {
    handleGenerateStory,
    handleConfirmSection,
    handleRewriteSection,
    handleModifySection,
    handleDeleteLastMessage,
    canConfirm,
    canGenerate,
    canDeleteLast,
    isFirstChapter,
  } = useAppLogic();

  const loading = isSending;
  const disabled = !activeConversationId;
  const [showRewriteDialog, setShowRewriteDialog] = useState(false);
  const [showModifyDialog, setShowModifyDialog] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleAddSettings = () => {
    if (activeConversationId) {
      settingsDialog.open(activeConversationId, {
        settings: conversationSettings,
      });
    }
  };

  const handleRewrite = () => {
    if (feedback.trim()) {
      handleRewriteSection(feedback);
      setFeedback('');
      setShowRewriteDialog(false);
    }
  };

  const handleModify = () => {
    if (feedback.trim()) {
      handleModifySection(feedback);
      setFeedback('');
      setShowModifyDialog(false);
    }
  };

  const handleCancelRewrite = () => {
    setShowRewriteDialog(false);
    setFeedback('');
  };

  const handleCancelModify = () => {
    setShowModifyDialog(false);
    setFeedback('');
  };

  return (
    <div className={styles.storyActions}>
      <div className={styles.actionButtons}>
        {canGenerate && (
          <button
            onClick={handleGenerateStory}
            disabled={loading || disabled}
            className={styles.actionButton}
            title={
              isFirstChapter
                ? t('storyActions.generateFirstChapterTooltip')
                : t('storyActions.generateCurrentTooltip')
            }
          >
            {loading
              ? t('storyActions.generating')
              : isFirstChapter
              ? t('storyActions.generateFirstChapter')
              : t('storyActions.generateCurrent')}
          </button>
        )}

        {canConfirm && (
          <button
            onClick={handleConfirmSection}
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
          onClick={handleAddSettings}
          disabled={loading || disabled}
          className={styles.actionButton}
          title={t('storyActions.addSettingsTooltip')}
        >
          {t('storyActions.addSettings')}
        </button>

        {canDeleteLast && handleDeleteLastMessage && (
          <button
            onClick={handleDeleteLastMessage}
            disabled={loading || disabled}
            className={styles.actionButton}
            title={t('storyActions.deleteLastMessageTooltip')}
          >
            {t('storyActions.deleteLastMessage')}
          </button>
        )}
      </div>

      <FeedbackDialog
        isOpen={showRewriteDialog}
        title={t('storyActions.rewriteTitle')}
        prompt={t('storyActions.rewritePrompt')}
        placeholder={t('storyActions.rewritePlaceholder')}
        confirmText={t('storyActions.confirmRewrite')}
        feedback={feedback}
        onFeedbackChange={setFeedback}
        onConfirm={handleRewrite}
        onCancel={handleCancelRewrite}
      />

      <FeedbackDialog
        isOpen={showModifyDialog}
        title={t('storyActions.modifyTitle')}
        prompt={t('storyActions.modifyPrompt')}
        placeholder={t('storyActions.modifyPlaceholder')}
        confirmText={t('storyActions.confirmModify')}
        feedback={feedback}
        onFeedbackChange={setFeedback}
        onConfirm={handleModify}
        onCancel={handleCancelModify}
      />
    </div>
  );
};

export default StoryActions;

