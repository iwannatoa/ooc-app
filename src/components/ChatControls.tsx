/**
 * Chat area controls bar component
 * Displays model selector, conversation title, etc.
 */
import React from 'react';
import { useI18n } from '@/i18n';
import { AppSettings, ConversationSettings, OllamaModel } from '@/types';
import ModelSelector from './ModelSelector';
import styles from '../styles.module.scss';

interface ChatControlsProps {
  /** Whether the conversation list is collapsed */
  conversationListCollapsed: boolean;
  /** Whether the settings sidebar is collapsed */
  settingsSidebarCollapsed: boolean;
  /** Currently active conversation ID */
  activeConversationId: string | null;
  /** Current settings */
  currentSettings: ConversationSettings | undefined;
  /** Application settings */
  appSettings: AppSettings;
  /** Model list */
  models: OllamaModel[];
  /** Currently selected model */
  currentModel: string;
  /** Handle model change */
  onModelChange: (model: string) => void;
  /** Expand conversation list */
  onExpandConversationList: () => void;
  /** Create new conversation */
  onNewConversation: () => void;
  /** Expand settings sidebar */
  onExpandSettingsSidebar: () => void;
}

export const ChatControls: React.FC<ChatControlsProps> = ({
  conversationListCollapsed,
  settingsSidebarCollapsed,
  activeConversationId,
  currentSettings,
  appSettings,
  models,
  currentModel,
  onModelChange,
  onExpandConversationList,
  onNewConversation,
  onExpandSettingsSidebar,
}) => {
  const { t } = useI18n();

  return (
    <div className={styles.controls}>
      {/* Expand conversation list button */}
      {conversationListCollapsed && (
        <button
          onClick={onExpandConversationList}
          className={styles.expandButton}
          title={t('common.expand') + ' ' + t('conversation.title')}
        >
          ▶ {t('conversation.titleShort')}
        </button>
      )}

      {/* Model selector or model info */}
      {appSettings.ai.provider === 'ollama' ? (
        <ModelSelector
          models={models}
          selectedModel={currentModel}
          onModelChange={onModelChange}
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
          onClick={onNewConversation}
          className={styles.newButton}
          title={t('conversation.newConversation')}
        >
          + {t('common.new')}
        </button>
      )}

      {/* Expand settings sidebar button */}
      {activeConversationId && currentSettings && settingsSidebarCollapsed && (
        <button
          onClick={onExpandSettingsSidebar}
          className={styles.expandButton}
          title={t('common.expand') + ' ' + t('storySettings.title')}
        >
          ▶ {t('storySettings.titleShort')}
        </button>
      )}
    </div>
  );
};
