/**
 * Chat area controls bar component
 * Displays model selector, conversation title, etc.
 */
import React, { useCallback } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
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

  const handleRollbackVariant = useCallback(async () => {
    if (!activeConversationId) return;
    try {
      const variants =
        await conversationClient.getAssistantVariants(activeConversationId);
      if (variants.length < 2) {
        showError('No previous variant available for rollback');
        return;
      }
      const latestAssistant = [...messages]
        .reverse()
        .find((m) => m.role === 'assistant' || m.role === 'ai');
      const latestId = latestAssistant?.id ? Number(latestAssistant.id) : NaN;
      const target =
        variants.find((v) => v.id !== latestId) ||
        variants[1];
      const ok = await conversationClient.restoreAssistantVariant(
        activeConversationId,
        target.id
      );
      if (!ok) {
        showError('Failed to rollback variant');
        return;
      }
      const refreshed = await conversationClient.getConversationMessages(
        activeConversationId
      );
      setMessages(refreshed);
      showSuccess('Rolled back to a previous variant');
    } catch (error) {
      console.error('Failed to rollback variant:', error);
      showError('Failed to rollback variant');
    }
  }, [
    activeConversationId,
    conversationClient,
    messages,
    setMessages,
    showError,
    showSuccess,
  ]);

  const handleExportProjectBundle = useCallback(async () => {
    if (!activeConversationId || !messages.length) {
      return;
    }
    try {
      const storyTitle =
        conversationSettings?.title || t('conversation.unnamedConversation');
      const sanitizedTitle = storyTitle.replace(/[<>:"/\\|?*]/g, '_');
      const filePath = await save({
        defaultPath: `${sanitizedTitle}.ooc-project.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (!filePath) {
        return;
      }
      const bundle = {
        version: 2,
        exported_at: new Date().toISOString(),
        conversation_id: activeConversationId,
        settings: conversationSettings || null,
        progress: progress || null,
        messages,
        integrity: {
          message_count: messages.length,
          has_settings: Boolean(conversationSettings),
        },
      };
      await writeTextFile(filePath, JSON.stringify(bundle, null, 2));
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
    </div>
  );
};

export default ChatControls;
