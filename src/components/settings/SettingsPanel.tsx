import React, { useEffect, useState, useRef } from 'react';
import { AppSettings } from '@/types';
import { useSettingsState } from '@/hooks/useSettingsState';
import { useI18n, type Locale } from '@/i18n/i18n';
import { useApiClients } from '@/hooks/useApiClients';
import {
  SettingsTabs,
  SettingsTabPane,
  GeneralSettings,
  GeneralSettingsRef,
  AppearanceSettings,
  AppearanceSettingsRef,
  AISettings,
  AISettingsRef,
  AdvancedSettings,
  AdvancedSettingsRef,
} from './index';
import styles from './SettingsPanel.module.scss';

interface SettingsPanelProps {
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
const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose, open }) => {
  const { t, setLocale } = useI18n();
  const { settings, updateSettings, updateAppearanceSettings } =
    useSettingsState();
  const { settingsApi } = useApiClients();

  const [localSettings, setLocalSettings] = useState(settings);
  const generalSettingsRef = useRef<GeneralSettingsRef>(null);
  const aiSettingsRef = useRef<AISettingsRef>(null);
  const appearanceSettingsRef = useRef<AppearanceSettingsRef>(null);
  const advancedSettingsRef = useRef<AdvancedSettingsRef>(null);

  // Sync localSettings with Redux store when settings prop changes
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  /**
   * Collect current settings from all child components
   */
  const collectCurrentSettings = (): AppSettings => {
    const currentSettings = { ...localSettings };

    // Collect general settings from GeneralSettings component
    if (generalSettingsRef.current) {
      currentSettings.general = generalSettingsRef.current.getCurrentSettings();
    }

    // Collect AI settings from AISettings component
    if (aiSettingsRef.current) {
      currentSettings.ai = aiSettingsRef.current.getCurrentSettings();
    }

    // Collect appearance settings from AppearanceSettings component
    if (appearanceSettingsRef.current) {
      currentSettings.appearance =
        appearanceSettingsRef.current.getCurrentSettings();
    }

    // Collect advanced settings from AdvancedSettings component
    if (advancedSettingsRef.current) {
      currentSettings.advanced =
        advancedSettingsRef.current.getCurrentSettings();
    }

    return currentSettings;
  };

  /**
   * Handle saving settings to Redux store and backend
   * Collects current settings from all child components before saving
   */
  const handleSave = async () => {
    try {
      // Collect current settings from all child components
      const settingsToSave = collectCurrentSettings();
      console.log('settingsToSave', settingsToSave);

      // Remove compactMode from appearance settings before saving
      if ('compactMode' in settingsToSave.appearance) {
        delete settingsToSave.appearance.compactMode;
      }

      // Apply language change if it was modified
      if (settingsToSave.general.language !== settings.general.language) {
        await setLocale(settingsToSave.general.language as Locale);
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
   * Handle tab change - collect current settings from all tabs before switching
   * This ensures we don't lose any changes made in the current tab
   */
  const handleTabChange = () => {
    // Collect current settings from all child components before tab switch
    const currentSettings = collectCurrentSettings();
    setLocalSettings(currentSettings);
  };

  if (!open) return null;

  return (
    <div className={styles.settingsPanelOverlay}>
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

        <SettingsTabs onChange={handleTabChange}>
          <SettingsTabPane
            tab='general'
            label={t('settingsPanel.tabs.general')}
          >
            <GeneralSettings
              ref={generalSettingsRef}
              settings={localSettings.general}
            />
          </SettingsTabPane>

          <SettingsTabPane
            tab='ai'
            label={t('settingsPanel.tabs.ai')}
          >
            <AISettings
              ref={aiSettingsRef}
              settings={localSettings.ai}
            />
          </SettingsTabPane>

          <SettingsTabPane
            tab='appearance'
            label={t('settingsPanel.tabs.appearance')}
          >
            <AppearanceSettings
              ref={appearanceSettingsRef}
              settings={localSettings.appearance}
            />
          </SettingsTabPane>

          <SettingsTabPane
            tab='advanced'
            label={t('settingsPanel.tabs.advanced')}
          >
            <AdvancedSettings
              ref={advancedSettingsRef}
              settings={localSettings.advanced}
            />
          </SettingsTabPane>
        </SettingsTabs>

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
