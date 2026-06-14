/**
 * Chat area controls bar component
 * Displays model selector, conversation title, etc.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { e2ePickSavePath, e2eWriteBinary, e2eWriteText } from '@/utils/e2eTauriShims';
import { useI18n } from '@/i18n/i18n';
import { useConversationManagement } from '@/hooks/useConversationManagement';
import { useChatState } from '@/hooks/useChatState';
import { useChatActions } from '@/hooks/useChatActions';
import { useSettingsState } from '@/hooks/useSettingsState';
import { useUIState } from '@/hooks/useUIState';
import { useStoryProgress } from '@/hooks/useStoryProgress';
import { useToast } from '@/hooks/useToast';
import { useConversationClient } from '@/hooks/useConversationClient';
import ModelSelector from './ModelSelector';
import styles from '../../styles.module.scss';


export const ChatControls: React.FC = () => {
  const { t } = useI18n();
  const { activeConversationId, conversationSettings, handleNewConversation } =
    useConversationManagement();
  const { models, messages, setMessages } = useChatState();
  const { handleModelChange, getCurrentModel } = useChatActions();
  const { settings } = useSettingsState();
  const { progress } = useStoryProgress();
  const conversationClient = useConversationClient();
  const { showError, showSuccess } = useToast();
  const {
    conversationListCollapsed,
    settingsSidebarCollapsed,
    setConversationListCollapsed,
    setSettingsSidebarCollapsed,
  } = useUIState();

  const currentModel = getCurrentModel();
  const [variantDiffOpen, setVariantDiffOpen] = useState(false);
  const [variantRows, setVariantRows] = useState<
    Array<{
      id: number;
      content: string;
      model?: string;
      provider?: string;
      created_at?: string;
    }>
  >([]);
  const [leftVariantId, setLeftVariantId] = useState<number | null>(null);
  const [rightVariantId, setRightVariantId] = useState<number | null>(null);
  const [rollbackTargetId, setRollbackTargetId] = useState<number | null>(null);
  const variantPanelRef = useRef<HTMLDivElement | null>(null);
  const leftVariantSelectRef = useRef<HTMLSelectElement | null>(null);

  const handleExportMarkdown = useCallback(async () => {
    if (!activeConversationId || !messages.length) {
      return;
    }
    try {
      const storyTitle =
        conversationSettings?.title || t('conversation.unnamedConversation');
      const chapterNumber =
        progress?.current_section !== undefined
          ? progress.current_section + 1
          : 1;
      const lines = messages.map((msg) => {
        const role = msg.role === 'assistant' ? 'Assistant' : 'User';
        return `## ${role}\n\n${msg.content}\n`;
      });
      const md = `# ${storyTitle}\n\n_${t('chat.chapter', { number: chapterNumber })}${progress?.total_sections ? ` / ${progress.total_sections}` : ''}_\n\n${lines.join('\n')}`;
      const sanitizedTitle = storyTitle.replace(/[<>:"/\\|?*]/g, '_');
      const filePath = await save({
        defaultPath: `${sanitizedTitle}.md`,
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      });
      if (filePath) {
        await writeTextFile(filePath, md);
        showSuccess(t('chat.exportSuccess'));
      }
    } catch (error) {
      console.error('Failed to export markdown:', error);
      showError(t('chat.exportFailed'));
    }
  }, [
    activeConversationId,
    messages,
    conversationSettings,
    progress,
    t,
    showError,
    showSuccess,
  ]);

  const handleExportStory = useCallback(async () => {
    if (!activeConversationId || !messages.length) {
      return;
    }

    try {
      // Get story title
      const storyTitle =
        conversationSettings?.title || t('conversation.unnamedConversation');

      // Get current chapter number
      const chapterNumber =
        progress?.current_section !== undefined
          ? progress.current_section + 1
          : 1;

      // Collect all assistant messages (story content)
      const storyContent = messages
        .filter((msg) => msg.role === 'assistant')
        .map((msg) => msg.content)
        .join('\n\n');

      // Create export content with better formatting
      const exportContent = `${storyTitle}\n${'='.repeat(
        storyTitle.length
      )}\n\n${t('chat.chapter', { number: chapterNumber })}${
        progress?.total_sections ? ` / ${progress.total_sections}` : ''
      }\n\n${storyContent}`;

      // Sanitize filename (remove invalid characters)
      const sanitizedTitle = storyTitle.replace(/[<>:"/\\|?*]/g, '_');
      const defaultFileName = `${sanitizedTitle}_${t('chat.chapter', {
        number: chapterNumber,
      })}.txt`;

      // Show save dialog
      const filePath = await save({
        defaultPath: defaultFileName,
        filters: [
          {
            name: 'Text Files',
            extensions: ['txt'],
          },
        ],
      });

      if (filePath) {
        // Write file using Tauri API
        // Note: The file path from save dialog is automatically allowed for writing
        await writeTextFile(filePath, exportContent);
        showSuccess(t('chat.exportSuccess') || '故事已成功导出');
      }
    } catch (error) {
      console.error('Failed to export story:', error);
      showError(t('chat.exportFailed') || '导出故事失败');
    }
  }, [
    activeConversationId,
    messages,
    conversationSettings,
    progress,
    t,
    showError,
    showSuccess,
  ]);

  const handleExportPdf = useCallback(async () => {
    if (!activeConversationId) return;
    try {
      const storyTitle =
        conversationSettings?.title || t('conversation.unnamedConversation');
      const pdf = await conversationClient.exportStoryPdf(
        activeConversationId,
        storyTitle
      );
      const sanitizedTitle = storyTitle.replace(/[<>:"/\\|?*]/g, '_');
      const filePath = await e2ePickSavePath({
        defaultPath: pdf.filename || `${sanitizedTitle}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
      if (!filePath) return;
      const binary = Uint8Array.from(atob(pdf.pdf_base64), (char) =>
        char.charCodeAt(0)
      );
      await e2eWriteBinary(filePath, binary);
      showSuccess('PDF exported');
    } catch (error) {
      console.error('Failed to export PDF:', error);
      showError('Failed to export PDF');
    }
  }, [
    activeConversationId,
    conversationClient,
    conversationSettings,
    showError,
    showSuccess,
    t,
  ]);

  const handleRollbackVariant = useCallback(async () => {
    if (!activeConversationId) return;
    try {
      const variants =
        await conversationClient.getAssistantVariants(activeConversationId);
      if (variants.length < 2) {
        showError('No previous variant available for rollback');
        return;
      }
      const ordered = [...variants];
      const left = ordered[0]?.id ?? null;
      const right = ordered[1]?.id ?? null;
      setVariantRows(ordered);
      setLeftVariantId(left);
      setRightVariantId(right);
      setRollbackTargetId(right);
      setVariantDiffOpen(true);
    } catch (error) {
      console.error('Failed to rollback variant:', error);
      showError('Failed to rollback variant');
    }
  }, [
    activeConversationId,
    conversationClient,
    showError,
  ]);

  const leftVariant = useMemo(
    () => variantRows.find((row) => row.id === leftVariantId) || null,
    [leftVariantId, variantRows]
  );
  const rightVariant = useMemo(
    () => variantRows.find((row) => row.id === rightVariantId) || null,
    [rightVariantId, variantRows]
  );

  const handleConfirmRollbackVariant = useCallback(async () => {
    if (!activeConversationId || rollbackTargetId == null) return;
    try {
      const ok = await conversationClient.restoreAssistantVariant(
        activeConversationId,
        rollbackTargetId
      );
      if (!ok) {
        showError('Failed to rollback variant');
        return;
      }
      const refreshed = await conversationClient.getConversationMessages(
        activeConversationId
      );
      setMessages(refreshed);
      setVariantDiffOpen(false);
      showSuccess('Rolled back to selected variant');
    } catch (error) {
      console.error('Failed to rollback variant:', error);
      showError('Failed to rollback variant');
    }
  }, [
    activeConversationId,
    conversationClient,
    rollbackTargetId,
    setMessages,
    showError,
    showSuccess,
  ]);

  useEffect(() => {
    if (!variantDiffOpen) {
      return;
    }
    leftVariantSelectRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setVariantDiffOpen(false);
      }
      if (event.key !== 'Tab' || !variantPanelRef.current) {
        return;
      }
      const focusable = variantPanelRef.current.querySelectorAll<HTMLElement>(
        'button, select, input, textarea, [href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) {
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [variantDiffOpen]);

  const handleExportProjectBundle = useCallback(async () => {
    if (!activeConversationId || !messages.length) {
      return;
    }
    try {
      const storyTitle =
        conversationSettings?.title || t('conversation.unnamedConversation');
      const filePath = await e2ePickSavePath({
        defaultPath: `${storyTitle.replace(/[<>:"/\\|?*]/g, '_')}.ooc-project.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (!filePath) {
        return;
      }
      const exported = await conversationClient.exportProjectBundle(
        activeConversationId,
        storyTitle
      );
      await e2eWriteText(filePath, JSON.stringify(exported.bundle, null, 2));
      showSuccess('Project bundle exported');
    } catch (error) {
      console.error('Failed to export project bundle:', error);
      showError(t('chat.exportFailed'));
    }
  }, [
    activeConversationId,
    conversationSettings,
    messages,
    progress,
    showError,
    showSuccess,
    t,
  ]);

  const handleCreateBranch = useCallback(async () => {
    if (!activeConversationId) return;
    const label = window.prompt('Branch label (optional)') || undefined;
    try {
      await conversationClient.createStoryBranch(activeConversationId, { label });
      showSuccess('Branch created');
    } catch (error) {
      console.error('Failed to create branch:', error);
      showError('Failed to create branch');
    }
  }, [activeConversationId, conversationClient, showError, showSuccess]);

  const handleCreateSavepoint = useCallback(async () => {
    if (!activeConversationId) return;
    const label = window.prompt('Savepoint label (optional)') || undefined;
    try {
      await conversationClient.createStorySavepoint(activeConversationId, { label });
      showSuccess('Savepoint created');
    } catch (error) {
      console.error('Failed to create savepoint:', error);
      showError('Failed to create savepoint');
    }
  }, [activeConversationId, conversationClient, showError, showSuccess]);

  const handleRestoreSavepoint = useCallback(async () => {
    if (!activeConversationId) return;
    try {
      const savepoints =
        await conversationClient.getStorySavepoints(activeConversationId);
      if (!savepoints.length) {
        showError('No savepoint available');
        return;
      }
      const choices = savepoints
        .map((sp) => `${sp.savepoint_id}${sp.label ? ` (${sp.label})` : ''}`)
        .join('\n');
      const selected = window.prompt(
        `Select savepoint id to restore:\n${choices}`,
        savepoints[savepoints.length - 1]?.savepoint_id || ''
      );
      if (!selected?.trim()) return;
      const ok = await conversationClient.restoreStorySavepoint(
        activeConversationId,
        selected.trim()
      );
      if (!ok) {
        showError('Failed to restore savepoint');
        return;
      }
      const refreshed = await conversationClient.getConversationMessages(
        activeConversationId
      );
      setMessages(refreshed);
      showSuccess('Savepoint restored');
    } catch (error) {
      console.error('Failed to restore savepoint:', error);
      showError('Failed to restore savepoint');
    }
  }, [activeConversationId, conversationClient, setMessages, showError, showSuccess]);

  const handleViewBranchTree = useCallback(async () => {
    if (!activeConversationId) return;
    try {
      const branches = await conversationClient.getStoryBranches(activeConversationId);
      const savepoints =
        await conversationClient.getStorySavepoints(activeConversationId);
      const branchLines = branches.map(
        (b) => `Branch ${b.branch_id} <- message ${b.parent_message_id ?? '-'}`
      );
      const savepointLines = savepoints.map(
        (s) => `Savepoint ${s.savepoint_id} @ message ${s.message_id ?? '-'}`
      );
      window.alert(
        `Branches:\n${branchLines.join('\n') || '(none)'}\n\nSavepoints:\n${savepointLines.join('\n') || '(none)'}`
      );
    } catch (error) {
      console.error('Failed to load branch tree:', error);
      showError('Failed to load branch tree');
    }
  }, [activeConversationId, conversationClient, showError]);

  const handleMarkEnding = useCallback(async () => {
    if (!activeConversationId) return;
    const endingTag = window.prompt('Ending tag (required, e.g. good_end)');
    if (!endingTag?.trim()) return;
    try {
      await conversationClient.markStoryEnding(activeConversationId, {
        ending_tag: endingTag.trim(),
      });
      showSuccess('Ending marked');
    } catch (error) {
      console.error('Failed to mark ending:', error);
      showError('Failed to mark ending');
    }
  }, [activeConversationId, conversationClient, showError, showSuccess]);

  return (
    <div className={styles.controls}>
      {/* Expand conversation list button */}
      {conversationListCollapsed && (
        <button
          onClick={() => setConversationListCollapsed(false)}
          className={styles.expandButton}
          title={t('common.expand') + ' ' + t('conversation.title')}
        >
          ▶ {t('conversation.titleShort')}
        </button>
      )}

      {/* Model selector or model info */}
      {settings.ai.provider === 'ollama' ? (
        <ModelSelector
          models={models}
          selectedModel={currentModel}
          onModelChange={handleModelChange}
          disabled={models.length === 0}
        />
      ) : (
        <div className={styles.modelInfo}>
          {t('settingsPanel.currentModel')}: {currentModel}
        </div>
      )}

      {/* Story title and chapter info */}
      {activeConversationId && conversationSettings && (
        <div className={styles.storyInfo}>
          <span className={styles.storyTitle}>
            {conversationSettings.title ||
              t('conversation.unnamedConversation')}
          </span>
          {progress && progress.current_section !== undefined && (
            <span className={styles.storyChapter}>
              {t('chat.chapter', { number: progress.current_section + 1 })}
              {progress.total_sections && ` / ${progress.total_sections}`}
            </span>
          )}
        </div>
      )}

      {/* Export button - positioned on the right */}
      {activeConversationId && conversationSettings && messages.length > 0 && (
        <>
          <button
            onClick={handleExportMarkdown}
            className={styles.exportButton}
            title={t('chat.exportMarkdown')}
            style={{ marginLeft: 'auto' }}
          >
            {t('chat.exportMd')}
          </button>
          <button
            onClick={handleExportStory}
            className={styles.exportButton}
            title={t('chat.exportStory')}
          >
            {t('chat.export')}
          </button>
          <button
            onClick={handleExportPdf}
            className={styles.exportButton}
            title='Export PDF'
          >
            PDF
          </button>
          <button
            onClick={handleRollbackVariant}
            className={styles.exportButton}
            title='Rollback to previous variant'
          >
            Rollback
          </button>
          <button
            onClick={handleExportProjectBundle}
            className={styles.exportButton}
            title='Export project bundle JSON'
          >
            Bundle
          </button>
          <button
            onClick={handleCreateBranch}
            className={styles.exportButton}
            title='Create story branch'
          >
            Branch
          </button>
          <button
            onClick={handleCreateSavepoint}
            className={styles.exportButton}
            title='Create savepoint'
          >
            Savepoint
          </button>
          <button
            onClick={handleRestoreSavepoint}
            className={styles.exportButton}
            title='Restore from savepoint'
          >
            Restore
          </button>
          <button
            onClick={handleViewBranchTree}
            className={styles.exportButton}
            title='View branches and savepoints'
          >
            Tree
          </button>
          <button
            onClick={handleMarkEnding}
            className={styles.exportButton}
            title='Mark ending'
          >
            Ending
          </button>
        </>
      )}

      {/* Show new button when collapsed */}
      {conversationListCollapsed && !activeConversationId && (
        <button
          onClick={handleNewConversation}
          className={styles.newButton}
          title={t('conversation.newConversation')}
        >
          + {t('common.new')}
        </button>
      )}

      {/* Expand settings sidebar button */}
      {activeConversationId &&
        conversationSettings &&
        settingsSidebarCollapsed && (
          <button
            onClick={() => setSettingsSidebarCollapsed(false)}
            className={styles.expandButton}
            title={t('common.expand') + ' ' + t('storySettings.title')}
          >
            ▶ {t('storySettings.titleShort')}
          </button>
        )}
      {variantDiffOpen && (
        <div
          ref={variantPanelRef}
          role='dialog'
          aria-modal='true'
          aria-label='variant-diff-panel'
          style={{
            marginTop: 8,
            padding: 8,
            border: '1px solid #444',
            borderRadius: 6,
            width: '100%',
            display: 'grid',
            gap: 8,
          }}
        >
          <strong>Variant Diff</strong>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select
              ref={leftVariantSelectRef}
              aria-label='left-variant'
              value={leftVariantId ?? ''}
              onChange={(e) => setLeftVariantId(Number(e.target.value))}
            >
              {variantRows.map((row) => (
                <option key={`left-${row.id}`} value={row.id}>
                  {row.id} {row.model || ''} {row.provider || ''}
                </option>
              ))}
            </select>
            <select
              aria-label='right-variant'
              value={rightVariantId ?? ''}
              onChange={(e) => setRightVariantId(Number(e.target.value))}
            >
              {variantRows.map((row) => (
                <option key={`right-${row.id}`} value={row.id}>
                  {row.id} {row.model || ''} {row.provider || ''}
                </option>
              ))}
            </select>
            <select
              aria-label='rollback-target'
              value={rollbackTargetId ?? ''}
              onChange={(e) => setRollbackTargetId(Number(e.target.value))}
            >
              {variantRows.map((row) => (
                <option key={`target-${row.id}`} value={row.id}>
                  Target {row.id}
                </option>
              ))}
            </select>
            <button onClick={() => void handleConfirmRollbackVariant()}>
              Confirm Rollback
            </button>
            <button onClick={() => setVariantDiffOpen(false)}>Close</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {leftVariant?.content || ''}
            </pre>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {rightVariant?.content || ''}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatControls;
