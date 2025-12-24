import React, { useState } from 'react';
import { ConversationSettings } from '@/types';
import { useI18n } from '@/i18n';
import { useConversationSettingsDialog, useStorySettingsViewDialog } from '@/hooks/useDialog';
import { useConversationManagement } from '@/hooks/useConversationManagement';
import styles from './StorySettingsSidebar.module.scss';

interface StorySettingsSidebarProps {
  settings: ConversationSettings | null;
  onToggle: () => void;
  collapsed?: boolean;
}

const StorySettingsSidebar: React.FC<StorySettingsSidebarProps> = ({
  settings,
  onToggle,
  collapsed = false,
}) => {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);
  const settingsDialog = useConversationSettingsDialog();
  const viewDialog = useStorySettingsViewDialog();
  const { activeConversationId, currentSettings } = useConversationManagement();

  const handleEdit = () => {
    if (activeConversationId) {
      settingsDialog.open(activeConversationId, {
        settings: currentSettings,
      });
    }
  };

  const handleViewSettings = () => {
    if (activeConversationId && currentSettings) {
      viewDialog.open(activeConversationId, currentSettings);
    }
  };

  if (!settings) {
    return null;
  }

  const hasContent =
    settings.background || settings.characters?.length || settings.outline;

  return (
    <div className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.header}>
        <h3>{t('storySettings.title')}</h3>
        <div className={styles.headerActions}>
          {activeConversationId && currentSettings && (
            <button
              onClick={handleViewSettings}
              className={styles.viewButton}
              title={t('conversation.viewSettings')}
            >
              {t('conversation.viewSettings')}
            </button>
          )}
          <button
            onClick={handleEdit}
            className={styles.editButton}
            title={t('storySettings.editSettings')}
          >
            {t('storySettings.edit')}
          </button>
          <button
            onClick={onToggle}
            className={styles.toggleButton}
            title={collapsed ? t('common.expand') : t('common.collapse')}
          >
            {collapsed ? '▶' : '▼'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className={styles.content}>
          {!hasContent ? (
            <div className={styles.empty}>
              <p>{t('storySettings.noSettings')}</p>
              <button
                onClick={handleEdit}
                className={styles.addButton}
              >
                {t('storySettings.addSettings')}
              </button>
            </div>
          ) : (
            <>
              {settings.background && (
                <div className={styles.section}>
                  <h4>{t('storySettings.backgroundShort')}</h4>
                  <p className={styles.textContent}>
                    {isExpanded || settings.background.length <= 100
                      ? settings.background
                      : `${settings.background.substring(0, 100)}...`}
                  </p>
                  {settings.background.length > 100 && (
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className={styles.expandButton}
                    >
                      {isExpanded
                        ? t('storySettings.collapse')
                        : t('storySettings.expand')}
                    </button>
                  )}
                </div>
              )}

              {settings.characters && settings.characters.length > 0 && (
                <div className={styles.section}>
                  <h4>{t('storySettings.characters')}</h4>
                  <div className={styles.charactersList}>
                    {settings.characters.slice(0, 3).map((char, index) => (
                      <div
                        key={index}
                        className={styles.characterItem}
                      >
                        <strong>{char}</strong>
                        {settings.character_personality?.[char] && (
                          <span className={styles.personality}>
                            {settings.character_personality[char].length > 30
                              ? `${settings.character_personality[
                                  char
                                ].substring(0, 30)}...`
                              : settings.character_personality[char]}
                          </span>
                        )}
                      </div>
                    ))}
                    {settings.characters.length > 3 && (
                      <div className={styles.moreCharacters}>
                        {t('storySettings.moreCharacters', {
                          count: settings.characters.length - 3,
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {settings.outline && (
                <div className={styles.section}>
                  <h4>{t('storySettings.outlineShort')}</h4>
                  <p className={styles.textContent}>
                    {isExpanded || settings.outline.length <= 150
                      ? settings.outline
                      : `${settings.outline.substring(0, 150)}...`}
                  </p>
                  {settings.outline.length > 150 && (
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className={styles.expandButton}
                    >
                      {isExpanded
                        ? t('storySettings.collapse')
                        : t('storySettings.expand')}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default StorySettingsSidebar;

