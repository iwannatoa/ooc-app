/**
 * Chat area controls bar component
 * Displays model selector, conversation title, etc.
 */
import React, { useCallback } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { useI18n } from '@/i18n';
import { useConversationManagement } from '@/hooks/useConversationManagement';
import { useChatState } from '@/hooks/useChatState';
import { useChatActions } from '@/hooks/useChatActions';
import { useSettingsState } from '@/hooks/useSettingsState';
import { useUIState } from '@/hooks/useUIState';
import { useStoryProgress } from '@/hooks/useStoryProgress';
import { useToast } from '@/hooks/useToast';
import ModelSelector from './ModelSelector';
import styles from '../../styles.module.scss';

interface ChatControlsProps {
  // Optional props for backward compatibility, but component will use hooks directly
  conversationListCollapsed?: never;
  settingsSidebarCollapsed?: never;
  activeConversationId?: never;
  currentSettings?: never;
  appSettings?: never;
  models?: never;
  currentModel?: never;
  onModelChange?: never;
  onExpandConversationList?: never;
  onNewConversation?: never;
  onExpandSettingsSidebar?: never;
}

export const ChatControls: React.FC<ChatControlsProps> = () => {
  const { t } = useI18n();
  const { activeConversationId, currentSettings, handleNewConversation } =
    useConversationManagement();
  const { models, messages } = useChatState();
  const { handleModelChange, getCurrentModel } = useChatActions();
  const { settings } = useSettingsState();
  const { progress } = useStoryProgress();
  const { showError, showSuccess } = useToast();
  const {
    conversationListCollapsed,
    settingsSidebarCollapsed,
    setConversationListCollapsed,
    setSettingsSidebarCollapsed,
  } = useUIState();

  const currentModel = getCurrentModel();

  const handleExportStory = useCallback(async () => {
    if (!activeConversationId || !messages.length) {
      return;
    }

    try {
      // Get story title
      const storyTitle =
        currentSettings?.title || t('conversation.unnamedConversation');

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
    currentSettings,
    progress,
    t,
    showError,
    showSuccess,
  ]);

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
      {activeConversationId && currentSettings && (
        <div className={styles.storyInfo}>
          <span className={styles.storyTitle}>
            {currentSettings.title || t('conversation.unnamedConversation')}
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
      {activeConversationId && currentSettings && messages.length > 0 && (
        <button
          onClick={handleExportStory}
          className={styles.exportButton}
          title={t('chat.exportStory')}
          style={{ marginLeft: 'auto' }}
        >
          {t('chat.export')}
        </button>
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
      {activeConversationId && currentSettings && settingsSidebarCollapsed && (
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
