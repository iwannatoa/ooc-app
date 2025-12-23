import React, { useEffect, useState } from 'react';
import { AppSettings } from '@/types';
import { useSettingsState } from '@/hooks/useSettingsState';
import { useI18n } from '@/i18n';
import { useApiClients } from '@/hooks/useApiClients';
import {
  SettingsTabs,
  type SettingsTab,
  GeneralSettings,
  AppearanceSettings,
  AISettings,
  AdvancedSettings,
} from './settings';
import styles from './SettingsPanel.module.scss';

interface SettingsPanelProps {
  // Optional props for backward compatibility, but component will use hooks directly
  settings?: never;
  onSettingsChange?: never;
  onClose: () => void;
  open: boolean;
}

/**
 * Settings Panel Component
 *
 * Main settings dialog that allows users to configure:
 * - General settings (language, etc.)
 * - AI provider settings (Ollama, DeepSeek)
 * - Appearance settings (theme, font)
 * - Advanced settings (streaming, logging)
 *
 * The component uses local state for unsaved changes and syncs with Redux
 * store only when the user clicks "Save".
 */
const SettingsPanel: React.FC<SettingsPanelProps> = ({
  onClose,
  open,
}) => {
  const { t } = useI18n();
  const { settings, updateSettings, updateAppearanceSettings } = useSettingsState();
  const { settingsApi } = useApiClients();

  const [currentTab, setCurrentTab] = useState<SettingsTab>('general');
  const [localSettings, setLocalSettings] = useState(settings);

  // Sync localSettings with Redux store when settings prop changes
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  /**
   * Handle saving settings to Redux store and backend
   */
  const handleSave = async () => {
    try {
      // Remove compactMode from appearance settings before saving
      const settingsToSave = {
        ...localSettings,
        appearance: {
          ...localSettings.appearance,
        },
      };

      // Ensure compactMode is removed
      if ('compactMode' in settingsToSave.appearance) {
        delete (settingsToSave.appearance as any).compactMode;
      }

      // Save to Redux store (this will trigger appearance updates)
      updateSettings(settingsToSave);
      // Also explicitly update appearance settings in Redux to ensure useAppearance hook picks it up
      updateAppearanceSettings(settingsToSave.appearance);

      // Save to backend using API client
      if (settingsApi) {
        try {
          await settingsApi.updateAppSettings(settingsToSave);
        } catch (error) {
          console.error('Failed to save settings to backend:', error);
          // Continue even if backend save fails
        }
      }

      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
      // Still close the panel even if save fails
      onClose();
    }
  };

  /**
   * Handle cancel - reset local state and Redux store to original values
   */
  const handleCancel = () => {
    // Reset local settings to original values
    setLocalSettings(settings);
    // Reset Redux store to original appearance settings
    updateAppearanceSettings(settings.appearance);
    onClose();
  };

  /**
   * Handle appearance settings changes (only update local state, not Redux)
   */
  const handleAppearanceChange = {
    theme: (theme: 'light' | 'dark' | 'auto') => {
      setLocalSettings({
        ...localSettings,
        appearance: {
          ...localSettings.appearance,
          theme,
        },
      });
    },
    fontSize: (fontSize: 'small' | 'medium' | 'large') => {
      setLocalSettings({
        ...localSettings,
        appearance: {
          ...localSettings.appearance,
          fontSize,
        },
      });
    },
    fontFamily: (fontFamily: string) => {
      setLocalSettings({
        ...localSettings,
        appearance: {
          ...localSettings.appearance,
          fontFamily,
        },
      });
    },
  };

  if (!open) return null;

  return (
    <div
      className={styles.settingsPanelOverlay}
      onClick={onClose}
    >
      <div
        className={styles.settingsPanel}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.settingsHeader}>
          <h2>{t('settingsPanel.title')}</h2>
          <button
            onClick={onClose}
            className={styles.closeButton}
          >
            ×
          </button>
        </div>

        <SettingsTabs
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          t={t}
        />

        <div className={styles.settingsContent}>
          {currentTab === 'general' && (
            <GeneralSettings
              settings={localSettings}
              t={t}
            />
          )}

          {currentTab === 'ai' && (
            <AISettings
              settings={localSettings}
              t={t}
            />
          )}

          {currentTab === 'appearance' && (
            <AppearanceSettings
              settings={localSettings.appearance}
              onThemeChange={handleAppearanceChange.theme}
              onFontSizeChange={handleAppearanceChange.fontSize}
              onFontFamilyChange={handleAppearanceChange.fontFamily}
              t={t}
            />
          )}

          {currentTab === 'advanced' && (
            <AdvancedSettings
              settings={localSettings}
              t={t}
            />
          )}
        </div>

        <div className={styles.settingsActions}>
          <button onClick={handleCancel}>{t('common.cancel')}</button>
          <button
            onClick={handleSave}
            className={styles.primary}
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
