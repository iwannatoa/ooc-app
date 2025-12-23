/**
 * Chat area controls bar component
 * Displays model selector, conversation title, etc.
 */
import React from 'react';
import { useI18n } from '@/i18n';
import { useConversationManagement } from '@/hooks/useConversationManagement';
import { useChatState } from '@/hooks/useChatState';
import { useChatActions } from '@/hooks/useChatActions';
import { useSettingsState } from '@/hooks/useSettingsState';
import { useUIState } from '@/hooks/useUIState';
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
  const { activeConversationId, currentSettings, handleNewConversation } = useConversationManagement();
  const { models } = useChatState();
  const { handleModelChange, getCurrentModel } = useChatActions();
  const { settings } = useSettingsState();
  const {
    conversationListCollapsed,
    settingsSidebarCollapsed,
    setConversationListCollapsed,
    setSettingsSidebarCollapsed,
  } = useUIState();
  
  const currentModel = getCurrentModel();

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

      {/* Show conversation title when collapsed */}
      {conversationListCollapsed && activeConversationId && currentSettings && (
        <div className={styles.conversationTitle}>
          {currentSettings.title || t('conversation.unnamedConversation')}
        </div>
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
