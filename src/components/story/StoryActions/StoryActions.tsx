import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useI18n } from '@/i18n/i18n';
import { useAppLogic } from '@/hooks/useAppLogic';
import { useConversationSettingsDialog } from '@/hooks/useDialog';
import { useConversationManagement } from '@/hooks/useConversationManagement';
import { useChatState } from '@/hooks/useChatState';
import { useStoryProgress } from '@/hooks/useStoryProgress';
import { useToast } from '@/hooks/useToast';
import { confirmDialog } from '@/services/confirmDialogService';
import { FeedbackDialog } from './FeedbackDialog';
import styles from './StoryActions.module.scss';

const StoryActions: React.FC = () => {
  const { t } = useI18n();
  const { isSending, storyOperation, messages } = useChatState();
  const { activeConversationId, conversationSettings } =
    useConversationManagement();
  const settingsDialog = useConversationSettingsDialog();
  const { progress } = useStoryProgress();
  const { showSuccess, showWarning } = useToast();

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
    latestContextTrace,
  } = useAppLogic();

  const loading = isSending;
  const disabled = !activeConversationId;

  const [showRewriteDialog, setShowRewriteDialog] = useState(false);
  const [showModifyDialog, setShowModifyDialog] = useState(false);
  const [feedback, setFeedback] = useState('');

  const loadingLabelFor = useCallback(
    (op: typeof storyOperation, labelIdle: string) => {
      if (!loading || storyOperation !== op) return labelIdle;
      if (op === 'generate') return t('storyActions.loadingGenerate');
      if (op === 'confirm') return t('storyActions.loadingConfirm');
      if (op === 'rewrite') return t('storyActions.loadingRewrite');
      if (op === 'modify') return t('storyActions.loadingModify');
      if (op === 'chat_stream') return t('storyActions.loadingChatStream');
      return t('storyActions.generating');
    },
    [loading, storyOperation, t]
  );

  const contextLine = useMemo(() => {
    if (!activeConversationId) return null;
    const parts: string[] = [];
    if (progress && progress.current_section !== undefined) {
      parts.push(
        t('storyContext.section', {
          number: String(progress.current_section + 1),
        })
      );
    }
    if (progress) {
      parts.push(
        progress.outline_confirmed
          ? t('storyContext.outlineOk')
          : t('storyContext.outlinePending')
      );
      const sk = `storyContext.status_${progress.status}` as const;
      const statusText = t(sk);
      if (statusText !== sk) {
        parts.push(t('storyContext.progressStatus', { status: statusText }));
      }
    }
    return parts.length ? parts.join(' · ') : null;
  }, [activeConversationId, progress, t]);

  const handleAddSettings = () => {
    if (activeConversationId) {
      settingsDialog.open(activeConversationId, {
        settings: conversationSettings,
      });
    }
  };

  const handleRewrite = async () => {
    if (!feedback.trim()) return;
    const ok = await confirmDialog({
      message: t('storyActions.confirmDestructiveRewrite'),
      confirmText: t('storyActions.confirmRewrite'),
      cancelText: t('common.cancel'),
      confirmButtonStyle: 'danger',
    });
    if (!ok) return;
    await handleRewriteSection(feedback);
    setFeedback('');
    setShowRewriteDialog(false);
  };

  const handleModify = async () => {
    if (!feedback.trim()) return;
    const ok = await confirmDialog({
      message: t('storyActions.confirmDestructiveModify'),
      confirmText: t('storyActions.confirmModify'),
      cancelText: t('common.cancel'),
      confirmButtonStyle: 'danger',
    });
    if (!ok) return;
    await handleModifySection(feedback);
    setFeedback('');
    setShowModifyDialog(false);
  };

  const handleCancelRewrite = () => {
    setShowRewriteDialog(false);
    setFeedback('');
  };

  const handleCancelModify = () => {
    setShowModifyDialog(false);
    setFeedback('');
  };

  const handleCopyLastAssistant = useCallback(async () => {
    const last = [...messages].reverse().find((m) => m.role === 'assistant');
    const text = last?.content?.trim();
    if (!text) {
      showWarning(t('storyActions.copyLastAssistantEmpty'));
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showSuccess(t('storyActions.copyLastAssistantSuccess'));
    } catch {
      showWarning(t('storyActions.copyLastAssistantEmpty'));
    }
  }, [messages, showSuccess, showWarning, t]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest('textarea, input, [contenteditable="true"]')) return;
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key !== 'Enter') return;
      if (loading || disabled) return;
      if (!canGenerate) return;
      e.preventDefault();
      void handleGenerateStory();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [loading, disabled, canGenerate, handleGenerateStory]);

  return (
    <div className={styles.storyActions}>
      {contextLine && (
        <div className={styles.contextBar} title={contextLine}>
          {contextLine}
        </div>
      )}
      {latestContextTrace && (
        <div className={styles.contextTracePanel}>
          <strong>Context Trace</strong>
          <div className={styles.contextTraceRow}>
            Budget: {latestContextTrace.budgetUsed?.usedTokens ?? 0}/
            {latestContextTrace.budgetUsed?.totalBudget ?? 0}
          </div>
          <div className={styles.contextTraceRow}>
            Layers: recent {latestContextTrace.budgetUsed?.usedByLayer?.recent ?? 0}
            , history {latestContextTrace.budgetUsed?.usedByLayer?.history ?? 0},
            summary {latestContextTrace.budgetUsed?.usedByLayer?.summary ?? 0},
            system {latestContextTrace.budgetUsed?.usedByLayer?.system ?? 0}
          </div>
          <div className={styles.contextTraceRow}>
            Selected: {(latestContextTrace.selectedSources || []).join(', ') || '-'}
          </div>
          <div className={styles.contextTraceRow}>
            Trim: {(latestContextTrace.trimReasons || []).join(', ') || '-'}
          </div>
        </div>
      )}
      <div className={styles.actionButtons}>
        {canGenerate && (
          <button
            onClick={() => void handleGenerateStory()}
            disabled={loading || disabled}
            className={styles.actionButton}
            title={
              isFirstChapter
                ? t('storyActions.generateFirstChapterTooltip')
                : t('storyActions.generateCurrentTooltip')
            }
          >
            {loadingLabelFor(
              'generate',
              isFirstChapter
                ? t('storyActions.generateFirstChapter')
                : t('storyActions.generateCurrent')
            )}
          </button>
        )}

        {canConfirm && (
          <button
            onClick={() => void handleConfirmSection()}
            disabled={loading || disabled}
            className={styles.actionButton}
            title={t('storyActions.nextChapterTooltip')}
          >
            {loadingLabelFor('confirm', t('storyActions.nextChapter'))}
          </button>
        )}

        <button
          onClick={() => setShowRewriteDialog(true)}
          disabled={loading || disabled}
          className={styles.actionButton}
          title={t('storyActions.rewriteTooltip')}
        >
          {loadingLabelFor('rewrite', t('storyActions.rewrite'))}
        </button>

        <button
          onClick={() => setShowModifyDialog(true)}
          disabled={loading || disabled}
          className={styles.actionButton}
          title={t('storyActions.modifyTooltip')}
        >
          {loadingLabelFor('modify', t('storyActions.modify'))}
        </button>

        <button
          onClick={handleAddSettings}
          disabled={loading || disabled}
          className={styles.actionButton}
          title={t('storyActions.addSettingsTooltip')}
        >
          {t('storyActions.addSettings')}
        </button>

        <button
          type="button"
          onClick={() => void handleCopyLastAssistant()}
          disabled={loading || disabled}
          className={styles.secondaryButton}
          title={t('storyActions.copyLastAssistant')}
        >
          {t('storyActions.copyLastAssistant')}
        </button>

        {canDeleteLast && handleDeleteLastMessage && (
          <button
            onClick={() => void handleDeleteLastMessage()}
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
        onConfirm={() => void handleRewrite()}
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
        onConfirm={() => void handleModify()}
        onCancel={handleCancelModify}
      />
    </div>
  );
};

export default StoryActions;
